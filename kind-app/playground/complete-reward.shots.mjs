// Several scenarios, ONE browser (the shared dev server is slow when thirty people use it, and tools/browser.mjs waits for networkidle).
//   node playground/complete-reward.shots.mjs gold:iphone:4200:shot=gold  xp:lowend:600:click=.cmr-drop__tap:shot=drop-open  normal:iphone:3600:lite
// spec = case:device:waitMs[:lite][:shot=name][:clip=x,y,w,h][:click=selector][:eval=js]    Prints layout facts per scenario, never a wall of pixels.
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync } from 'node:fs'
import { DEVICES } from '../tools/browser.mjs'

const CHROMES = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']
const OUT = 'tools/out/complete-reward'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROMES.find(existsSync), headless: true, args: ['--hide-scrollbars'] })

for (const raw of process.argv.slice(2)) {
  const [cs, device = 'iphone', wait = '3600', ...opts] = raw.split(':')
  const o = Object.fromEntries(opts.map((x) => { const i = x.indexOf('='); return i < 0 ? [x, true] : [x.slice(0, i), x.slice(i + 1)] }))
  const d = DEVICES[device] || DEVICES.iphone
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2, isMobile: d.mobile, hasTouch: d.mobile, colorScheme: 'dark' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  if (o.hold) { await page.clock.install({ time: 0 }); await page.clock.pauseAt(1000) }   // hold=ms: freeze the JS timeline (CSS keeps running) so a mid-sequence state can be photographed on a slow machine
  await page.goto(`http://localhost:5183/playground/complete-reward.html?case=${cs}${o.lite ? '&fx=lite' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForSelector('.cmr-beat, [data-testid=stage]', { timeout: 120000 })
  if (o.click) { await page.waitForTimeout(500); await page.click(o.click) }
  if (o.press) { await page.waitForTimeout(500); await page.keyboard.press(o.press) }
  await page.waitForTimeout(Number(wait))
  if (o.hold && Number(o.hold) > 0) { await page.clock.runFor(Number(o.hold)); await page.waitForTimeout(150) }

  const facts = await page.evaluate(() => {
    const r = (el) => { if (!el) return null; const x = el.getBoundingClientRect(); return [Math.round(x.left), Math.round(x.top), Math.round(x.width), Math.round(x.height), Math.round(x.bottom)].join(',') }
    const q = (s) => document.querySelector(s)
    const beat = q('.cmr-beat')
    const out = {
      vp: `${innerWidth}x${innerHeight}`, scrollW: document.documentElement.scrollWidth,
      'beat x,y,w,h,bottom': r(beat), stage: r(q('.cmr-card__stage')), tilt: r(q('.cmr-card__tilt')), meta: r(q('.cmr-card__meta')),
      bay: r(q('.cmr-drop__bay')), box: r(q('.cmr-drop__box')), item: r(q('.cmr-drop__item')), info: r(q('.cmr-drop__info')), reveal: r(q('.cmr-drop__reveal')), foot: r(q('.cmr-foot')),
      state: ['face', 'phase', 'kind', 'tone'].map((k) => k + '=' + (beat?.dataset[k] ?? '')).join(' ') + ' ready=' + (beat?.hasAttribute('data-ready') ?? false),
      focus: (document.activeElement?.className?.toString() || document.activeElement?.tagName || '').slice(0, 40),
      status: q('.cmr-vh')?.textContent, hint: q('.cmr-card__hint')?.textContent, reveal_text: q('.cmr-drop__reveal')?.textContent, log: q('[data-testid=pg-log]')?.textContent,
    }
    // anything of ours that spills outside the beat's box horizontally (decorative clipped layers excluded by name)
    out.spill = [...document.querySelectorAll('.cmr-beat *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1) && !/halo|glint|sheen|spill|sweep|glare|foil|k-btn__/.test(e.className?.toString() || '') }).slice(0, 5).map((e) => (e.className?.toString() || e.tagName).slice(0, 40))
    return out
  })
  if (o.then) { await page.keyboard.press(o.then); await page.waitForTimeout(200); facts.afterThen = await page.evaluate(() => document.querySelector('[data-testid=pg-log]')?.textContent) }
  if (o.replay) { await page.click('.pg-bar button'); await page.waitForTimeout(Number(o.replay)); facts.afterReplay = await page.evaluate(() => { const b = document.querySelector('.cmr-beat'); return b ? ['face', 'phase'].map((k) => k + '=' + (b.dataset[k] ?? '')).join(' ') + ' ready=' + b.hasAttribute('data-ready') : 'none' }) }
  if (o.eval) { facts.eval = await page.evaluate(o.eval) }
  console.log(`\n=== ${raw}`)
  console.log(JSON.stringify(facts, null, 1))
  if (o.shot) {
    const path = `${OUT}/${o.shot}.png`
    if (o.clip) { const [x, y, width, height] = o.clip.split(',').map(Number); await page.screenshot({ path, clip: { x, y, width, height } }) } else await page.screenshot({ path })
    console.log('shot', path)
  }
  if (errors.length) console.log('ERRORS', JSON.stringify(errors))
  await ctx.close().catch(() => {})
}
console.log('done')
process.exit(0)
