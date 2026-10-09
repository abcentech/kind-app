// Real-pixel screenshots of the art-scenes specimen (own opener: tools/browser.mjs waits for 'networkidle', which the
// Vite HMR socket makes very slow on a busy machine; a plain 'load' + fonts.ready is enough here).
//
//   node playground/art-scenes.shot.mjs <name> [--url U] [--device iphone|lowend|se|pixel|tablet|desktop] [--w N --h N] [--dpr N]
//        [--fx lite] [--reduce] [--now 2026-08-12] [--wait ms] [--full] [--clip x,y,w,h] [--sel css] [--eval "js run before shot"]
//   several shots from one page load:  --batch "nameA|x,y,w,h;nameB|css-selector;nameC|full"
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '..', 'tools', 'out')
const DEVICES = {
  iphone: { w: 390, h: 844, dpr: 3, mobile: true }, se: { w: 375, h: 667, dpr: 2, mobile: true }, pixel: { w: 412, h: 915, dpr: 2.625, mobile: true },
  lowend: { w: 360, h: 640, dpr: 2, mobile: true }, tablet: { w: 820, h: 1180, dpr: 2, mobile: true }, desktop: { w: 1440, h: 900, dpr: 1, mobile: false },
}
const a = process.argv.slice(2)
const get = (f, d) => { const i = a.indexOf(f); return i > -1 ? a[i + 1] : d }
const has = (f) => a.includes(f)
const name = a[0] && !a[0].startsWith('--') ? a[0] : 'art-scenes/probe'
const d = DEVICES[get('--device', 'iphone')] || DEVICES.iphone
let url = get('--url', 'http://localhost:5183/playground/art-scenes.html')
if (get('--now')) url += (url.includes('?') ? '&' : '?') + 'now=' + get('--now')
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)

const L0 = Date.now(); const lap = (s) => process.env.TIMING && console.log(s, Date.now() - L0)
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--hide-scrollbars'] })
const ctx = await browser.newContext({
  viewport: { width: Number(get('--w', d.w)), height: Number(get('--h', d.h)) }, deviceScaleFactor: Number(get('--dpr', d.dpr)),
  isMobile: d.mobile, hasTouch: d.mobile, colorScheme: 'dark', reducedMotion: has('--reduce') ? 'reduce' : 'no-preference', serviceWorkers: 'block',
})
lap('ctx'); const page = await ctx.newPage(); lap('page')
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })
await page.goto(url, { waitUntil: 'load' }); lap('loaded')
const T0 = Date.now(); await page.evaluate(() => Promise.race([document.fonts ? document.fonts.ready : 0, new Promise((r) => setTimeout(r, 6000))])); if (process.env.TIMING) console.log('fonts', Date.now() - T0)
if (get('--fx')) await page.evaluate((v) => { document.documentElement.dataset.fx = v }, get('--fx'))
if (get('--eval')) await page.evaluate(get('--eval'))
await page.waitForTimeout(Number(get('--wait', 700)))

async function shoot(nm, spec) {
  const file = join(OUT, nm.endsWith('.png') ? nm : nm + '.png')
  mkdirSync(dirname(file), { recursive: true })
  if (spec && /^\d/.test(spec)) {
    const [x, y, w, h] = spec.split(',').map(Number)
    await page.screenshot({ path: file, clip: { x, y, width: w, height: h } })
  } else if (spec && spec !== 'full') {
    const el = page.locator(spec).first()
    await el.scrollIntoViewIfNeeded()
    await page.waitForTimeout(150)
    await el.screenshot({ path: file })
  } else await page.screenshot({ path: file, fullPage: spec === 'full' || has('--full') })
  console.log(file)
}
if (get('--batch')) for (const it of get('--batch').split(';')) { const [n, s] = it.split('|'); await shoot(n, s) }
else await shoot(name, get('--clip') || get('--sel'))
lap('shot')
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'))
await browser.close()
