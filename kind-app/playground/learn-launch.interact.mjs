// node playground/learn-launch.interact.mjs — behaviour checks: taps, haptics, state flip at zero, focus ring, lite + reduced motion
import { chromium } from 'playwright-core'
const BASE = 'http://localhost:5183/playground/learn-launch.html'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const out = []
const log = (k, v) => { out.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`); console.log(out[out.length - 1]) }
async function visit(q, { w = 390, h = 844, reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: 'dark', serviceWorkers: 'block', reducedMotion: reduced ? 'reduce' : 'no-preference' })
  await ctx.addInitScript(() => { window.__vib = []; navigator.vibrate = (p) => { window.__vib.push(p); return true } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(`${BASE}?${q}`, { waitUntil: 'domcontentloaded', timeout: 150000 })
  await page.waitForSelector(".launch-cta", { timeout: 60000 })
  await page.waitForTimeout(900)
  return { page, ctx, errors }
}
const shellLog = (page) => page.evaluate(() => document.querySelector('[data-testid=shell-log]')?.textContent || '')

if (!process.argv.includes('--rest')) {
// 1 · ready: tap launches openDay(12) with the launch haptic (23-entry ramp)
{
  const { page, ctx, errors } = await visit('scn=ready')
  await page.click('.launch-cta')
  await page.waitForTimeout(400)
  const vib = await page.evaluate(() => window.__vib.map((p) => (Array.isArray(p) ? p.length : p)))
  log('ready tap', { shell: await shellLog(page), vib, errors })
  await ctx.close()
}
// 2 · locked: disabled; flips to ready at 06:00 with the unlock haptic and a polite announcement
{
  const { page, ctx, errors } = await visit('scn=locked&now=2026-08-12T05:59:53')
  const before = await page.evaluate(() => ({ s: document.querySelector('.launch').dataset.state, dis: document.querySelector('.launch-cta').disabled, live: document.querySelector('[role=status]').textContent.slice(0, 50) }))
  await page.click('.launch-cta', { force: true, timeout: 1500 }).catch(() => {})
  log('locked before', { ...before, shellAfterTap: await shellLog(page) })
  await page.waitForFunction(() => document.querySelector('.launch')?.dataset.state !== 'waiting' && document.querySelector('.launch')?.dataset.state !== 'locked', null, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(500)
  const after = await page.evaluate(() => ({ s: document.querySelector('.launch').dataset.state, cta: document.querySelector('.launch-cta').textContent, live: document.querySelector('[role=status]').textContent.slice(0, 60), vib: window.__vib.map((p) => (Array.isArray(p) ? p.join('-') : p)), h: document.documentElement.style.getPropertyValue('--launch-h') }))
  log('locked after zero', { ...after, errors })
  await ctx.close()
}
}
// 3 · keyboard: Tab reaches the control; its focus ring lights; Enter launches
{
  const { page, ctx } = await visit('scn=archive')
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const on = await page.evaluate(() => document.activeElement?.classList.contains('launch-cta'))
    if (on) break
  }
  await page.waitForTimeout(450)
  const ring = await page.evaluate(() => { const b = document.activeElement; return { onCta: b.classList.contains('launch-cta'), ringOpacity: getComputedStyle(b.querySelector('.k-btn__ring')).opacity, label: b.getAttribute('aria-label') } })
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  log('keyboard', { ...ring, shell: await shellLog(page) })
  await ctx.close()
}
// 4 · catch-up chip opens the missed day; a11y: chip is a plain button (no aria-pressed)
{
  const { page, ctx } = await visit('scn=catchup')
  await page.click('.launch-chip')
  await page.waitForTimeout(300)
  log('chip', { shell: await shellLog(page), pressed: await page.evaluate(() => document.querySelector('.launch-chip').getAttribute('aria-pressed')) })
  await ctx.close()
}
// 5 · lite + reduced motion
for (const [name, q, red] of [['lite', 'scn=atRisk&fx=lite', false], ['reduced', 'scn=atRisk', true], ['full', 'scn=atRisk', false]]) {
  const { page, ctx } = await visit(q, { reduced: red })
  const r = await page.evaluate(() => {
    const cs = (s, p) => getComputedStyle(document.querySelector(s), p)
    return {
      fx: document.documentElement.dataset.fx, enter: cs('.launch').animationName, aura: cs('.launch-aura').display,
      glassBlur: cs('.launch-slab', '::before').backdropFilter, stripAnim: cs('.launch-strip > i').animationName, led: cs('.launch-eyebrow .k-label__led').animationName,
    }
  })
  log(`fx ${name}`, r)
  await ctx.close()
}
await browser.close()
