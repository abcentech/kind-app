// Foundation poster tests (real browser).  node playground/foundation.test.mjs
// Zero console errors · self-check all green · nav auto-hide · keyboard focus ring on every focusable · lite / contrast+ / reduced-motion
// switches do what base.css says · no sideways scroll at 360/375/390/412/820/1440 · 48 px targets in the nav.
import { open } from '../tools/browser.mjs'

const URL = 'http://localhost:5183/playground/foundation.html'
let fails = 0
const ok = (name, cond, got = '') => { if (!cond) fails++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${got !== '' ? '  [' + got + ']' : ''}`) }

// 1. phone: errors, self-check, nav, targets, switches
{
  const b = await open({ url: URL, device: 'iphone', state: null }); const { page } = b
  await page.waitForTimeout(1500)
  const sum = await page.evaluate(() => document.querySelector('.pf-self__head .pf-badge')?.textContent)
  ok('self-check badge is all green', /^(\d+)\/\1PASS$/.test((sum || '').replace(/\s/g, '')), sum)
  const hidden0 = await page.evaluate(() => document.querySelector('.pf-nav').dataset.hidden || 'no')
  ok('nav is visible at the top', hidden0 === 'no', hidden0)
  await page.mouse.move(100, 400)
  for (let i = 0; i < 6; i++) { await page.evaluate(() => scrollBy(0, 320)); await page.waitForTimeout(120) }
  await page.waitForTimeout(600)
  ok('nav slides away while reading down', await page.evaluate(() => document.querySelector('.pf-nav').dataset.hidden === 'true'))
  const y = await page.evaluate(() => document.querySelector('.pf-nav').getBoundingClientRect().bottom)
  ok('and is fully off-screen', y <= 1, Math.round(y))
  await page.evaluate(() => scrollBy(0, -140)); await page.waitForTimeout(700)
  ok('nav returns on scroll up', await page.evaluate(() => !document.querySelector('.pf-nav').dataset.hidden))
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(500)
  // hit targets: the 4 px above and below a nav control still hit that control
  const hit = await page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('.pf-nav .pf-seg button, .pf-nav .pf-toggle, .pf-nav .pf-link')) {
      const r = el.getBoundingClientRect(); if (!r.width || r.left < 0 || r.right > innerWidth) continue
      const cx = r.left + r.width / 2
      const up = document.elementFromPoint(cx, r.top - 3); const dn = document.elementFromPoint(cx, r.bottom + 3)
      out.push(el.contains(up) && el.contains(dn))
    }
    return out
  })
  ok('nav controls have a 48 px hit area', hit.length >= 4 && hit.every(Boolean), `${hit.filter(Boolean).length}/${hit.length}`)
  // the cluster replays its ignition sweep when tapped
  await page.evaluate(() => { document.querySelector('.pf-hero__gauge-m .g-needle').__old = true })
  await page.click('.pf-hero__gauge-m .pf-ti__btn'); await page.waitForTimeout(200)
  ok('hero gauge: a tap replays the sweep (needle remounts and animates)', await page.evaluate(() => { const n = document.querySelector('.pf-hero__gauge-m .g-needle'); return !n.__old && getComputedStyle(n).animationName === 'pf-sweep' }))
  // Lite
  await page.click('.pf-seg button:nth-child(2)'); await page.waitForTimeout(300)
  const lite = await page.evaluate(() => {
    const cs = (e, p) => getComputedStyle(e, p)
    const probe = document.createElement('i'); probe.style.cssText = 'animation: pf-fill 2s infinite; transition: transform 600ms'; document.body.appendChild(probe)
    return { fx: document.documentElement.dataset.fx, nav: cs(document.querySelector('.pf-nav')).backdropFilter, grain: cs(document.body, '::after').display, dur: cs(probe).animationDuration, iter: cs(probe).animationIterationCount }
  })
  ok('lite: data-fx=lite', lite.fx === 'lite')
  ok('lite: nav backdrop blur removed', lite.nav === 'none', lite.nav)
  ok('lite: grain removed', lite.grain === 'none')
  ok('lite: loops stop, animations jump to the end', parseFloat(lite.dur) < 0.001 && lite.iter === '1', `${lite.dur} x${lite.iter}`)
  await page.click('.pf-seg button:nth-child(1)')
  // Contrast+
  await page.click('.pf-toggle[aria-label="Contrast plus"]'); await page.waitForTimeout(200)
  const hc = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ring-w').trim())
  ok('contrast+: focus ring thickens to 3 px', hc === '3px', hc)
  await page.click('.pf-toggle[aria-label="Contrast plus"]')
  ok('no console errors (phone)', b.errors.length === 0, b.errors.join(' | '))
  await b.close()
}

// 2. keyboard: Tab from the top, every stop must show a visible indicator
{
  const b = await open({ url: URL, device: 'desktop', state: null }); const { page } = b
  await page.waitForTimeout(1200)
  const seen = []
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab'); await page.waitForTimeout(40)
    seen.push(await page.evaluate(() => {
      const a = document.activeElement; if (!a || a === document.body) return null
      const cs = getComputedStyle(a); const frame = a.closest('.u-cut-frame'); const ff = frame ? getComputedStyle(frame).filter : ''
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2
      const ring = !!frame && (ff.match(/drop-shadow/g) || []).length >= 8
      const tag = a.tagName.toLowerCase() + (a.className && typeof a.className === 'string' ? '.' + a.className.split(' ')[0] : '')
      return { tag, vis: outline || ring, kind: ring ? 'frame' : outline ? 'outline' : 'NONE' }
    }))
  }
  const stops = seen.filter(Boolean)
  const bad = stops.filter((s) => !s.vis)
  ok(`keyboard: ${stops.length} tab stops, every one shows a ring`, stops.length > 12 && bad.length === 0, bad.map((s) => s.tag).join(', '))
  // jump straight to the focus lab for the chamfer / hex parts
  const frames = await page.evaluate(() => {
    const out = []
    for (const btn of document.querySelectorAll('.u-cut-frame button')) {
      btn.focus({ focusVisible: true })
      const f = getComputedStyle(btn.closest('.u-cut-frame')).filter
      out.push((f.match(/drop-shadow/g) || []).length >= 8 && getComputedStyle(btn).outlineStyle === 'none')
      btn.blur()
    }
    return out
  })
  ok('keyboard: chamfer / hex parts get the silhouette ring from .u-cut-frame', frames.length >= 3 && frames.every(Boolean), `${frames.filter(Boolean).length}/${frames.length}`)
  ok('no console errors (desktop)', b.errors.length === 0, b.errors.join(' | '))
  await b.close()
}

// 3. reduced motion from the OS
{
  const b = await open({ url: URL, device: 'iphone', state: null, reduceMotion: true }); const { page } = b
  await page.waitForTimeout(900)
  const r = await page.evaluate(() => { const p = document.createElement('i'); p.style.cssText = 'animation: pf-fill 2s infinite'; document.body.appendChild(p); const c = getComputedStyle(p); return { dur: c.animationDuration, iter: c.animationIterationCount, needle: getComputedStyle(document.querySelector('.g-needle')).animationDuration } })
  ok('prefers-reduced-motion: animations collapse', parseFloat(r.dur) < 0.001 && r.iter === '1', `${r.dur} x${r.iter}`)
  ok('prefers-reduced-motion: the needle just sits at its value', parseFloat(r.needle) < 0.001, r.needle)
  await b.close()
}

// 4. no sideways scroll, any width (the six viewports run side by side: the dev server is shared and slow to hand out modules)
const widths = [['lowend', 360, 640], ['se', 375, 667], ['iphone', 390, 844], ['pixel', 412, 915], ['tablet', 820, 1180], ['desktop', 1440, 900]]
const rows = await Promise.all(widths.map(async ([dev, w, h]) => {
  const b = await open({ url: URL, device: dev, state: null }); await b.page.waitForTimeout(700)
  const m = await b.page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    wide: [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && !e.closest('.pf-mx, .u-scroll-x, .pf-scroller, .pf-sky') }).slice(0, 3).map((e) => String(e.className || e.tagName)),
  }))
  await b.close()
  return [w, h, m]
}))
for (const [w, h, m] of rows) ok(`${w}x${h}: no horizontal overflow`, m.sw <= m.cw && m.wide.length === 0, m.wide.join(' ') || `${m.sw}/${m.cw}`)
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
