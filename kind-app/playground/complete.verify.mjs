// complete-shell verification: node playground/complete.verify.mjs [smoke|seq|shots]
import { open as open0, DEVICES } from '../tools/browser.mjs'
import { chromium } from 'playwright-core'
import { existsSync } from 'node:fs'

const BASE = 'http://localhost:5183/playground/complete.html'
const mode = process.argv[2] || 'smoke'
const beatId = (page) => page.evaluate(() => document.querySelector('.cmp-beat:not([data-leaving])')?.dataset.beat || null)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function smoke() {
  const b = await open({ url: `${BASE}?preset=streak7`, device: 'iphone', dpr: 1 })
  await sleep(800)
  const info = await b.page.evaluate(() => ({
    plan: window.__pg.plan(), beat: document.querySelector('.cmp-beat')?.dataset.beat, label: document.querySelector('.cmp-label')?.textContent,
    bank: document.querySelector('.cmp-bank')?.textContent, html: document.querySelector('.cmp')?.outerHTML.length,
  }))
  console.log(JSON.stringify(info))
  console.log('errors:', b.errors)
  await b.close()
}

async function seq() {
  // fake beats: rings plain · streak auto (double next) · shield plain · milestone plain · card null · drop plain · rank-up/rank plain · medals throws · patch plain
  const b = await open({ url: `${BASE}?preset=month&fake=1`, device: 'iphone', dpr: 1 })
  await sleep(700)
  const plan = await b.page.evaluate(() => window.__pg.plan())
  console.log('plan', plan.join(' > '))
  const seen = []
  for (let i = 0; i < 24; i++) {
    const id = await beatId(b.page)
    if (!id) break
    if (seen[seen.length - 1] !== id) seen.push(id)
    if (id === 'actions') break
    await sleep(600)                                           // past the 450 ms dwell
    await b.page.keyboard.press(id === 'xp' ? 'Space' : 'Enter')
    await sleep(380)                                           // let the 220 ms cross-fade finish
  }
  console.log('walked', seen.join(' > '))
  // Esc jumps to the last beat
  await b.page.reload({ waitUntil: 'networkidle' }); await sleep(700)
  await b.page.keyboard.press('Escape'); await sleep(400)
  console.log('after Esc:', await beatId(b.page))
  // taps inside the dwell are swallowed
  await b.page.reload({ waitUntil: 'commit' }); await b.page.waitForSelector('.cmp-beat')
  await b.page.mouse.click(190, 400); await b.page.mouse.click(190, 400); await b.page.keyboard.press('Space')
  await sleep(250)
  console.log('taps inside the dwell stay on xp:', await beatId(b.page))
  await sleep(500); await b.page.mouse.click(190, 400)
  console.log('first tap after dwell fast-forwards (still xp, step 2):', await beatId(b.page), await b.page.evaluate(() => document.querySelector('.cmp-xp')?.dataset.step))
  await sleep(300); await b.page.mouse.click(190, 400); await sleep(300)
  console.log('second tap advances:', await beatId(b.page))
  console.log('errors:', b.errors.filter((e) => !/fake beat failure|beat failed|<Fake>/.test(e)))
  console.log('expected-error lines:', b.errors.filter((e) => /fake beat failure|beat failed|<Fake>/.test(e)).length)
  await b.close()
}

async function again() {
  const b = await open({ url: `${BASE}?preset=again`, device: 'iphone', dpr: 1 })
  await sleep(600)
  console.log('again plan:', (await b.page.evaluate(() => window.__pg.plan())).join(' > '))
  console.log('errors:', b.errors)
  await b.close()
}

if (mode === 'smoke') await smoke()
if (mode === 'seq') await seq()
if (mode === 'again') await again()

const SHOT = (name) => `complete-shell/${name}`
async function stepIs(page, n) { await page.waitForFunction((k) => document.querySelector('.cmp-xp')?.dataset.step === String(k), n, { timeout: 15000 }) }
async function walkTo(page, target) {
  for (let i = 0; i < 30; i++) {
    const id = await beatId(page)
    if (id === target) return id
    await sleep(600); await page.keyboard.press('Space'); await sleep(380)
  }
  return beatId(page)
}
async function shots() {
  let b = await open({ url: `${BASE}?preset=streak7`, device: 'iphone', dpr: 2 })
  await stepIs(b.page, 0); await sleep(900)
  console.log(await b.shot(SHOT('xp-climb-390'), { settle: 250 }))
  await stepIs(b.page, 2); await sleep(1500)
  console.log(await b.shot(SHOT('xp-landed-390'), { settle: 100 }))
  console.log('errors', b.errors); await b.close()

  b = await open({ url: `${BASE}?preset=perfect`, device: 'lowend', dpr: 2 })
  await stepIs(b.page, 2); await sleep(1500)
  console.log(await b.shot(SHOT('xp-landed-360'), { settle: 100 }))
  await b.page.keyboard.press('Escape'); await sleep(1500)
  console.log(await b.shot(SHOT('actions-360'), { settle: 100 }))
  console.log('errors', b.errors); await b.close()

  b = await open({ url: `${BASE}?preset=month&fake=1`, device: 'iphone', dpr: 2 })
  await walkTo(b.page, 'month'); await sleep(3600)
  console.log(await b.shot(SHOT('month-390'), { settle: 100 }))
  console.log('errors', b.errors.filter((e) => !/<Fake>|fake beat|beat failed/.test(e))); await b.close()
}
if (mode === 'shots') await shots()

async function act() {
  const b = await open({ url: `${BASE}?preset=perfect&now=2026-08-12T19:00`, device: 'lowend', dpr: 2 })
  await sleep(800)
  await b.page.keyboard.press('Escape'); await sleep(1600)
  console.log('beat', await beatId(b.page), 'body len', await b.page.evaluate(() => document.body.innerText.length))
  console.log(await b.shot(SHOT('actions-360'), { settle: 100 }))
  console.log('errors', b.errors); await b.close()
}
async function climb() {
  const b = await open({ url: `${BASE}?preset=streak7`, device: 'iphone', dpr: 2 })
  await sleep(500)
  await b.page.evaluate(() => window.__pg.restart())
  await sleep(150)
  console.log(await b.shot(SHOT('xp-pad-390'), { settle: 0 }))
  await sleep(1000)
  console.log(await b.shot(SHOT('xp-climb-390'), { settle: 0 }))
  console.log('errors', b.errors); await b.close()
}
if (mode === 'act') await act()
if (mode === 'climb') await climb()

// one contact sheet = one image to review: [climb start] [month 390] [month 360x640] [lite landed 390]
async function sheet() {
  const { default: sharp } = await import('sharp')
  const frames = []
  const grab = async (b, label) => { const buf = await b.page.screenshot({ type: 'jpeg', quality: 72 }); frames.push({ buf, label }) }
  let b = await open({ url: `${BASE}?preset=streak7`, device: 'iphone', dpr: 1 })
  await sleep(400); await b.page.evaluate(() => window.__pg.restart()); await grab(b, 'climb')
  console.log('climb errors', b.errors); await b.close()

  b = await open({ url: `${BASE}?preset=month&fake=1`, device: 'iphone', dpr: 1 })
  console.log('walk ->', await walkTo(b.page, 'month')); await sleep(3200)
  const m = await b.page.evaluate(() => { const r = document.querySelector('.cmp-mo'); return { sh: r.scrollHeight, ch: r.clientHeight, patches: document.querySelectorAll('.cmp-mo__patch[data-on]').length } })
  console.log('month 390', JSON.stringify(m)); await grab(b, 'month390')
  console.log('month errors', b.errors.filter((e) => !/<Fake>|fake beat|beat failed/.test(e))); await b.close()

  b = await open({ url: `${BASE}?preset=month&fake=1`, device: 'lowend', dpr: 1 })
  await walkTo(b.page, 'month'); await sleep(3200)
  const m2 = await b.page.evaluate(() => { const r = document.querySelector('.cmp-mo'); return { sh: r.scrollHeight, ch: r.clientHeight } })
  console.log('month 360', JSON.stringify(m2)); await grab(b, 'month360'); await b.close()

  b = await open({ url: `${BASE}?preset=streak7&fx=lite`, device: 'iphone', dpr: 1 })
  await sleep(900); await b.page.evaluate(() => window.__pg.restart()); await sleep(900); await grab(b, 'lite')
  console.log('lite', JSON.stringify(await b.page.evaluate(() => ({ fx: document.documentElement.dataset.fx, rocket: !!document.querySelector('.cmp-xp__rocket'), step: document.querySelector('.cmp-xp')?.dataset.step })))); await b.close()

  const W = 390, H = 844
  const out = sharp({ create: { width: W * frames.length, height: H, channels: 3, background: '#000' } })
  const layers = await Promise.all(frames.map(async (f, i) => ({ input: await sharp(f.buf).resize({ width: W, height: H, fit: 'contain', background: '#000' }).jpeg().toBuffer(), left: i * W, top: 0 })))
  await out.composite(layers).png().toFile('tools/out/complete-shell/sheet.png')
  console.log('sheet saved')
}
if (mode === 'sheet') await sheet()

// tools/browser.mjs waits for the window 'load' event, which waits for the shared dev server to serve the font files.
// With 30 agents on one Vite that can exceed 30 s, so the sheet opens pages itself and waits for the stage instead.
async function open(o) {
  if (o.device === 'xx') return open0(o)
  const d = DEVICES[o.device] || DEVICES.iphone
  const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--hide-scrollbars'] })
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: o.dpr || d.dpr, isMobile: d.mobile, hasTouch: d.mobile, colorScheme: 'dark', serviceWorkers: 'block', reducedMotion: o.reduce ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })
  await page.goto(o.url, { waitUntil: 'commit' })
  await page.waitForSelector('.cmp', { timeout: 60000 })
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
  return { page, errors, close: () => browser.close(), shot: async (name, opts = {}) => { const f = `tools/out/${name}.png`; await page.waitForTimeout(opts.settle ?? 250); await page.screenshot({ path: f }); return f } }
}

async function geom() {
  // 1. actions at 360x640: fit, focus, trap
  let b = await open({ url: `${BASE}?preset=streak7&now=2026-08-12T19:00`, device: 'lowend', dpr: 1 })
  await sleep(700); await b.page.keyboard.press('Escape'); await sleep(1500)
  const a = await b.page.evaluate(() => {
    const sc = document.querySelector('.cmp-act__scroll'), foot = document.querySelector('.cmp-act__foot'), bar = document.querySelector('.cmp-bar')
    const r = (el) => { const x = el.getBoundingClientRect(); return [Math.round(x.top), Math.round(x.bottom)] }
    return { scroll: [sc.scrollHeight, sc.clientHeight], scrollBox: r(sc), foot: r(foot), bar: r(bar), active: document.activeElement?.textContent?.trim(), vh: innerHeight,
      continueH: Math.round(document.querySelector('.cmp-act__foot .k-btn').getBoundingClientRect().height) }
  })
  console.log('actions 360', JSON.stringify(a))
  const order = []
  for (let i = 0; i < 5; i++) { await b.page.keyboard.press('Tab'); order.push(await b.page.evaluate(() => (document.activeElement?.textContent || document.activeElement?.tagName || '').trim().slice(0, 14))) }
  console.log('tab order (trapped, cycles):', order.join(' | '))
  console.log('errors', b.errors); await b.close()

  // 2. xp at 360x640: nothing overlaps (total vs hint vs rows)
  b = await open({ url: `${BASE}?preset=perfect`, device: 'lowend', dpr: 1 })
  await b.page.waitForFunction(() => document.querySelector('.cmp-xp')?.dataset.step === '2', null, { timeout: 20000 }); await sleep(1400)
  const x = await b.page.evaluate(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return null; const x = e.getBoundingClientRect(); return [Math.round(x.top), Math.round(x.bottom)] }
    return { bar: r('.cmp-bar'), head: r('.cmp-xp__head'), rows: r('.cmp-xp__rows'), total: r('.cmp-xp__total'), hint: r('.cmp-hint'), skip: r('.cmp-skip'), vh: innerHeight } })
  console.log('xp 360', JSON.stringify(x))
  console.log('errors', b.errors); await b.close()

  // 3. reduced motion => lite, no rocket
  b = await open({ url: `${BASE}?preset=streak7`, device: 'iphone', dpr: 1, reduce: true })
  await sleep(500)
  console.log('reduced-motion', JSON.stringify(await b.page.evaluate(() => ({ fx: document.documentElement.dataset.fx, rocket: !!document.querySelector('.cmp-xp__rocket'), step: document.querySelector('.cmp-xp')?.dataset.step, anim: getComputedStyle(document.querySelector('.cmp-xp__row')).animationName }))))
  await b.close()

  // 4. the supply drop stays a surprise: XP beat total and the bank chip exclude the drop until the drop beat has passed
  b = await open({ url: `${BASE}?preset=perfect&fake=1`, device: 'iphone', dpr: 1 })
  await b.page.evaluate(() => { const r = structuredClone(window.__pg.result); r.xp.drop = 20; r.xp.total += 20; r.rank.to.xp += 20; r.drop = { kind: 'xp', xp: 20, rarity: 'common' }; window.__pg.apply(JSON.stringify(r)) })
  await sleep(500)
  const bank = () => b.page.evaluate(() => document.querySelector('.cmp-bank .k-counter-final')?.textContent)
  const before = await bank()
  await b.page.waitForFunction(() => document.querySelector('.cmp-xp')?.dataset.step === '2', null, { timeout: 20000 }); await sleep(1500)
  const num = await b.page.evaluate(() => document.querySelector('.cmp-xp__num .k-counter-final')?.textContent)
  const res = await b.page.evaluate(() => ({ total: window.__pg.result.xp.total, final: window.__pg.result.rank.to.xp, from: window.__pg.result.rank.from.xp }))
  await b.page.waitForFunction(() => document.querySelector('.cmp-xp__total')?.hasAttribute('data-fly'), null, { timeout: 20000 })
  const t0 = Date.now(); let docked = await bank(); while (docked === before && Date.now() - t0 < 6000) { await sleep(100); docked = await bank() }
  console.log('bank ticked after', Date.now() - t0, 'ms')
  console.log('drop held: bank before', before, '| numeral', num, '| bank docked', docked, '| result', JSON.stringify(res))
  let seenDrop = false
  for (let i = 0; i < 12; i++) {
    const id = await beatId(b.page)
    if (id === 'drop' && !seenDrop) { seenDrop = true; console.log('at drop beat, bank =', await bank()) }
    if (id === 'rank' || id === 'rank-up') { console.log('after drop, bank =', await bank()); break }
    await sleep(600); await b.page.keyboard.press('Space'); await sleep(450)
  }
  console.log('errors', b.errors.filter((e) => !/<Fake>|fake beat|beat failed/.test(e))); await b.close()
}
if (mode === 'geom') await geom()

async function actions() {
  // share + continue + keyboard, on the real Actions beat; then the month share; then lite + again
  let b = await open({ url: `${BASE}?preset=streak7`, device: 'iphone', dpr: 1 })
  await sleep(500); await b.page.click('.cmp-skip'); await sleep(1400)
  console.log('skip button -> ', await beatId(b.page), '| skip hidden on last:', await b.page.evaluate(() => getComputedStyle(document.querySelector('.cmp-skip')).visibility))
  await b.page.click('.cmp-act__foot .k-btn[data-v="secondary"]'); await sleep(200)
  console.log('share ->', await b.page.evaluate(() => document.body.dataset.shared))
  await b.page.evaluate(() => { document.body.dataset.shared = '' })
  await b.page.mouse.click(195, 300); await sleep(200)
  console.log('tap on the last beat does not close:', await b.page.evaluate(() => window.__pg.log.length))
  await b.page.keyboard.press('Enter'); await sleep(300)
  console.log('Enter on focused Continue -> log:', await b.page.evaluate(() => window.__pg.log.join(',')))
  console.log('errors', b.errors); await b.close()

  b = await open({ url: `${BASE}?preset=month&fake=1`, device: 'iphone', dpr: 1 })
  await walkTo(b.page, 'month'); await sleep(1200)
  await b.page.click('.cmp-mo .k-btn'); await sleep(200)
  console.log('month share ->', await b.page.evaluate(() => document.body.dataset.shared))
  console.log('errors', b.errors.filter((e) => !/<Fake>|fake beat|beat failed/.test(e))); await b.close()

  b = await open({ url: `${BASE}?preset=again&fx=lite`, device: 'lowend', dpr: 1 })
  await sleep(500)
  console.log('again+lite plan', (await b.page.evaluate(() => window.__pg.plan())).join('>'), '| rocket', await b.page.evaluate(() => !!document.querySelector('.cmp-xp__rocket')), '| label', await b.page.evaluate(() => document.querySelector('.cmp-label').textContent))
  await b.page.keyboard.press('Escape'); await sleep(900)
  console.log('again actions title:', await b.page.evaluate(() => document.querySelector('.cmp-act__title')?.textContent), '| errors', b.errors); await b.close()
}
if (mode === 'actions') await actions()
