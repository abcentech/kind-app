import { chromium } from 'playwright-core'
import { DEVICES, OUT } from '../tools/browser.mjs'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--hide-scrollbars'] })
async function open({ url, device }) {
  const d = DEVICES[device]
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark', serviceWorkers: 'block' })
  const page = await ctx.newPage(); const errors = []
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(url, { waitUntil: 'load', timeout: 20000 }); await page.waitForSelector('.shs'); await page.evaluate(() => document.fonts.ready)
  return { page, errors, shot: async (n, o = {}) => { await page.waitForTimeout(o.settle || 300); await page.screenshot({ path: OUT + '/' + n + '.png' }) }, close: () => ctx.close() }
}
const base = 'http://localhost:5183/playground/shorts-story.html'
const R = {}
const audit = (p) => p.evaluate(() => {
  const r = document.querySelector('.shs'), f = document.querySelector('.shs__fit'), pg = document.querySelector('.shs__page').getBoundingClientRect(), rb = r.getBoundingClientRect()
  const kids = [...document.querySelectorAll('.shs__page > *')].map((e) => e.getBoundingClientRect())
  return { page: r.dataset.page, auto: r.dataset.auto, fs: f && getComputedStyle(f).fontSize, over: f ? [f.scrollHeight - f.clientHeight, f.scrollWidth - f.clientWidth] : null, inView: kids.every((k) => k.top >= 0 && k.bottom <= rb.bottom + 1 && k.right <= rb.right + 1), docOver: document.documentElement.scrollWidth - innerWidth }
})
// 1. long text, lite (tap-only), 360x640 and 390x844
for (const [dev, key] of [['lowend', 'lite360'], ['iphone', 'lite390']]) {
  const b = await open({ url: base + '?n=11&long=1&fx=lite', device: dev })
  const p = b.page
  R[key] = []
  await p.waitForTimeout(400)
  R[key].push(await audit(p))
  await p.waitForTimeout(1500); R[key + 'NoAuto'] = await p.evaluate(() => document.querySelector('.shs').dataset.progress + ' ' + document.querySelector('.shs').dataset.page)
  if (key === 'lite360') await b.shot('shs-long-lite', { settle: 300 })
  for (let i = 0; i < 3; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(500); R[key].push(await audit(p)) }
  if (key === 'lite360') await b.shot('shs-cta', { settle: 500 })
  R[key + 'Seg'] = await p.evaluate(() => [...document.querySelectorAll('.shs__fill')].map((e) => getComputedStyle(e).transform))
  R.errs = (R.errs || []).concat(b.errors)
  await b.close()
}
// 2. series 2 + visibility + share + fx full long hook
const b = await open({ url: base + '?n=11&series=secrets-of-longevity&long=1', device: 'lowend' })
const p = b.page
await p.waitForTimeout(400); R.s2 = [await audit(p)]
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400); R.s2.push(await audit(p))
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400); R.s2.push(await audit(p))
await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300)
await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')) })
await p.waitForTimeout(200); const a = await p.evaluate(() => document.querySelector('.shs').dataset.progress); await p.waitForTimeout(600)
R.hidden = { running: await p.evaluate(() => document.querySelector('.shs').dataset.running), a, b: await p.evaluate(() => document.querySelector('.shs').dataset.progress) }
await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')) })
await p.waitForTimeout(300); R.visible = await p.evaluate(() => document.querySelector('.shs').dataset.running)
await p.keyboard.press('Space'); await p.waitForTimeout(200); R.space = await p.evaluate(() => document.querySelector('.shs').dataset.paused)
await p.keyboard.press('Space'); await p.waitForTimeout(200); R.space2 = await p.evaluate(() => document.querySelector('.shs').dataset.paused || null)
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300)
await p.click('.shs__share'); R.share = await p.textContent('[data-testid=shell-log]'); R.afterShare = await p.evaluate(() => document.querySelector('.shs').dataset.paused)
await p.evaluate(() => document.fonts.ready)
R.errs = (R.errs || []).concat(b.errors)
// inactive
await b.close()
const c = await open({ url: base + '?n=3&active=0', device: 'lowend' })
await c.page.waitForTimeout(1200); R.inactive = await c.page.evaluate(() => document.querySelector('.shs').dataset.running + ' ' + document.querySelector('.shs').dataset.progress)
R.errs = R.errs.concat(c.errors); await c.close()
console.log(JSON.stringify(R)); await browser.close()
