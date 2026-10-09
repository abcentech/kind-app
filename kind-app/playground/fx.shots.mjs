// Visual QA for the fx lab.   node playground/fx.shots.mjs [pages|fire|<moment>|tilt|trail|tour|lite]   (shots → tools/out/fx2/)
//   env: DEV=iphone|lowend|se|pixel   EXTRA=?fx=lite
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { DEVICES, OUT } from '../tools/browser.mjs'

const URL = 'http://localhost:5183/playground/fx.html'
const want = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const run = (n) => !want.length || want.includes(n)
const EXE = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)

// Like tools/browser.mjs open(), minus Vite HMR: ~14 agents share this dev server and a stray full-reload would kill a run.
async function open({ url, device = 'iphone', reduceMotion = false, args = [] }) {
  const d = DEVICES[device]
  const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--hide-scrollbars', ...args] })
  const ctx = await browser.newContext({
    viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, isMobile: d.mobile, hasTouch: d.mobile,
    colorScheme: 'dark', reducedMotion: reduceMotion ? 'reduce' : 'no-preference', serviceWorkers: 'block',
  })
  await ctx.addInitScript(() => {
    const Real = window.WebSocket
    window.WebSocket = function (u, p) { if (p === 'vite-hmr' || (typeof u === 'string' && u.includes('vite'))) return Object.assign(new EventTarget(), { send() {}, close() {}, readyState: 3 }); return new Real(u, p) }
    window.WebSocket.prototype = Real.prototype
    Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 })
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })
  await page.goto(url, { waitUntil: 'load', timeout: 90000 })
  await page.evaluate(() => document.fonts && document.fonts.ready)
  const shot = async (name, opts = {}) => {
    const file = join(OUT, name.endsWith('.png') ? name : name + '.png')
    mkdirSync(dirname(file), { recursive: true })
    await page.waitForTimeout(opts.settle ?? 350)
    await page.screenshot({ path: resolve(file), fullPage: !!opts.full })
    return resolve(file)
  }
  return { browser, ctx, page, errors, shot, close: () => browser.close() }
}

async function page(device, extra = '', o = {}) {
  const b = await open({ url: URL + extra, device, ...o })
  await b.page.waitForTimeout(500)
  return b
}

if (run('pages')) {
  for (const [dev, tag] of [['iphone', '390'], ['lowend', '360']]) {
    const b = await page(dev)
    await b.shot(`fx2/page-${tag}-top`, { settle: 500 })
    await b.shot(`fx2/page-${tag}-full`, { full: true, settle: 200 })
    console.log(dev, 'errors', b.errors)
    await b.close()
  }
}

// Deterministic mid-flight frames: Playwright's fake clock drives rAF + performance.now, so "260 ms in" is exactly 260 ms in.
// One browser for every scenario (the shared dev server is slow to hand out new pages).
const MOMENTS = {
  launch: ['fx.launch({x:195,y:640})', [60, 160, 320, 600]],
  orbit: ['fx.celebrate({x:195,y:420})', [120, 300, 700, 1400]],
  rank: ['fx.celebrate({x:195,y:420},{big:true})', [120, 340, 900, 1800]],
  cannons: ['fx.cannons()', [200, 520, 1100, 2000]],
  go: ['fx.go({x:195,y:420})', [100, 260, 500]],
  nogo: ['fx.nogo(document.querySelector(".plate"))', [60, 140, 260]],
  sparks: ['fx.sparks({x:195,y:420,n:40})', [80, 240, 500]],
  embers: ['fx.embers({x:195,y:700,w:260,n:22})', [900, 1800, 2800]],
  shock: ['fx.shockwave({x:195,y:420,size:300})', [60, 200, 500]],
  fly: ['fx.fly({from:{x:60,y:760},to:{x:330,y:60},n:6})', [150, 320, 500]],
  confetti: ['fx.confetti({x:195,y:520,n:44})', [250, 600, 1200, 2000]],
  pop: ['fx.pop({x:195,y:420},{color:"gold"})', [80, 220, 460]],
  ignite: ['fx.ignite({x:195,y:520})', [80, 200, 420, 800]],
}
const names = Object.keys(MOMENTS).filter((n) => run('fire') || run(n))
if (names.length) {
  const b = await page(process.env.DEV || 'iphone', process.env.EXTRA || '')
  const p = b.page
  await p.clock.install({ time: 0 })
  await p.clock.pauseAt(1000)          // frozen: screenshots no longer let time flow
  for (const name of names) {
    const [js, times] = MOMENTS[name]
    await p.evaluate('fx.clear()')
    await p.clock.runFor(60)
    await p.evaluate(js)
    await p.evaluate('document.getAnimations().forEach((a) => a.pause())')
    let t = 0
    for (const w of times) {
      await p.clock.runFor(w - t); t = w
      await p.evaluate((ms) => document.getAnimations().forEach((a) => { a.currentTime = ms }), w)   // WAAPI (flash, shake) is not on the fake clock
      await b.shot(`fx2/${name}-${w}`, { settle: 0 })
    }
    console.log(name, JSON.stringify(await p.evaluate('fx.stats()')))
  }
  console.log('errors', b.errors)
  await b.close()
}

// -- real-time scenarios (tilt, trail) --
if (run('tilt') || run('trail')) {
  const b = await page(process.env.DEV || 'iphone', process.env.EXTRA || '')
  const p = b.page
  const el = (sel) => p.locator(sel).first()
  if (run('tilt')) {
    await el('.card').scrollIntoViewIfNeeded()
    await p.waitForTimeout(300)
    const box = await el('.tilt-zone').boundingBox()
    const clip = { x: box.x - 6, y: box.y - 6, width: box.width + 12, height: box.height + 12 }
    const grab = async (name, pos) => {
      if (pos) await p.mouse.move(box.x + box.width * pos[0], box.y + box.height * pos[1], { steps: 6 })
      await p.waitForTimeout(700)
      await p.screenshot({ path: join(OUT, `fx2/${name}.png`), clip })
    }
    await p.mouse.move(2, 2)
    await grab('tilt-rest')
    await grab('tilt-tr', [0.82, 0.18])
    await grab('tilt-bl', [0.22, 0.86])
    await grab('tilt-c', [0.5, 0.5])
    console.log('tilt vars', await p.evaluate(() => document.querySelector('.card').style.cssText))
  }
  if (run('trail')) {
    await el('.stage').scrollIntoViewIfNeeded()
    await el('text=Ignite').click()
    for (const ms of [500, 1300]) {
      await p.waitForTimeout(ms)
      const box = await el('.stage').boundingBox()
      await p.screenshot({ path: join(OUT, `fx2/trail-${ms}.png`), clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 } })
    }
    console.log('trail', JSON.stringify(await p.evaluate('fx.stats()')))
  }
  console.log('errors', b.errors)
  await b.close()
}

// -- tour: every section, in the viewport, at both phone sizes --
if (run('tour')) {
  for (const [dev, tag] of [['iphone', '390'], ['lowend', '360']]) {
    const b = await page(dev)
    const p = b.page
    const n = await p.locator('.sec').count()
    for (let i = 0; i < n; i++) {
      await p.locator('.sec').nth(i).evaluate((el) => { window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 64) })
      await b.shot(`fx2/tour-${tag}-${String(i + 1).padStart(2, '0')}`, { settle: 350 })
    }
    console.log(dev, 'errors', b.errors)
    await b.close()
  }
}
