// slides-declare verification: node playground/slides-declare.test.mjs [shots]
import { open } from '../tools/browser.mjs'
const BASE = 'http://localhost:5183/playground/slides-declare.html'
const SHOTS = process.argv.includes('shots')
const log = (...a) => console.log(...a)
const state = (page) => page.evaluate(() => {
  const q = (s) => document.querySelector(s)
  const lines = [...document.querySelectorAll('.sld-line, .sld-tag')]
  return {
    footer: q('[data-testid=footer]')?.textContent, footerDisabled: q('[data-testid=footer]')?.disabled,
    p: +getComputedStyle(q('.sld-ctl')).getPropertyValue('--sld-p'),
    states: lines.map((l) => l.dataset.state).join(','),
    declared: q('.sld')?.hasAttribute('data-declared'),
    cap: q('.sld-cap')?.textContent, plain: !!q('.sld-plain'), hint: q('.sld-hint')?.textContent,
    say: q('.sld-sr[role=status]')?.textContent, holdAttr: q('.sld-ctl')?.hasAttribute('data-hold'),
  }
})
const centre = (page) => page.evaluate(() => { const r = document.querySelector('.sld-dial').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
const hold = async (page, ms) => { const c = await centre(page); await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); return c }
const fresh = async (opts = {}, qs = '?n=7') => {
  let b
  for (let i = 0; i < 3 && !b; i++) { try { b = await open({ url: BASE + qs, device: 'lowend', state: null, ...opts }) } catch (e) { console.log('retry open', String(e.message).slice(0, 80)) } }
  await b.page.evaluate(() => { try { sessionStorage.clear() } catch {} })
  await b.page.reload({ waitUntil: 'networkidle' }); await b.page.waitForTimeout(400)
  return b
}

// 1. layout at 360x640, 7 long lines
if (!process.argv.includes('rest')) {
  const b = await fresh()
  const { page } = b
  log('initial', await state(page))
  const geo = await page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s).getBoundingClientRect(); return { l: Math.round(e.left), r: Math.round(e.right), t: Math.round(e.top), b: Math.round(e.bottom) } }
    const lines = [...document.querySelectorAll('.sld-line')].map((l) => parseFloat(getComputedStyle(l).fontSize))
    const slide = document.querySelector('.lesson-slide')
    return { dial: r('.sld-dial'), hold: r('.sld-hold'), dock: r('.sld-dock'), fonts: lines, tag: parseFloat(getComputedStyle(document.querySelector('.sld-tag')).fontSize),
      scrollW: slide.scrollWidth, clientW: slide.clientWidth, scrollH: slide.scrollHeight, clientH: slide.clientHeight, vw: innerWidth, vh: innerHeight, docOverflow: document.documentElement.scrollWidth > innerWidth }
  })
  log('geometry', JSON.stringify(geo))
  if (SHOTS) await b.shot('slides-declare/360-idle-7lines')
  // 600 ms resets
  await hold(page, 600)
  await page.waitForTimeout(900)
  log('after 600ms hold + 900ms:', await state(page))
  // 1500 ms completes
  await hold(page, 1500)
  await page.waitForTimeout(250)
  log('after 1500ms hold (+250):', await state(page))
  await page.waitForTimeout(1200)
  log('settled:', await state(page))
  if (SHOTS) await b.shot('slides-declare/360-declared-7lines')
  // revisit: reload within same session -> declared remembered
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500)
  log('revisit:', await state(page))
  log('errors', b.errors)
  await b.close()
}

// 2. mid-hold shot + hint/readout at 390x844
if (SHOTS && !process.argv.includes('rest')) {
  const b = await fresh({ device: 'iphone' }, '?day=12')
  await b.shot('slides-declare/390-idle')
  const c = await centre(b.page)
  await b.page.mouse.move(c.x, c.y); await b.page.mouse.down(); await b.page.waitForTimeout(800)
  await b.shot('slides-declare/390-hold-mid', { settle: 0 })
  log('mid-hold', await state(b.page))
  await b.page.mouse.up(); await b.page.waitForTimeout(900)
  log('errors', b.errors); await b.close()
}

// 3. two early releases -> plain button; it declares at once
{
  const b = await fresh()
  const { page } = b
  await hold(page, 250); await page.waitForTimeout(700)
  log('after 1 fail:', await state(page))
  await hold(page, 300); await page.waitForTimeout(700)
  log('after 2 fails:', await state(page))
  await page.click('.sld-plain'); await page.waitForTimeout(400)
  log('after plain click:', await state(page))
  log('errors', b.errors); await b.close()
}

// 4. lite: hold completes, no filters
{
  const b = await fresh({}, '?n=7&fx=lite')
  const { page } = b
  await hold(page, 1500); await page.waitForTimeout(700)
  log('lite:', await state(page), await page.evaluate(() => ({ fx: document.documentElement.dataset.fx, anim: getComputedStyle(document.querySelector('.sld-line')).animationName })))
  if (SHOTS) await b.shot('slides-declare/360-lite-declared')
  log('errors', b.errors); await b.close()
}

// 5. keyboard: hold Space 500 ms resets; Enter 1550 ms completes
{
  const b = await fresh({}, '?n=5')
  const { page } = b
  await page.focus('.sld-hold')
  await page.keyboard.down('Space'); await page.waitForTimeout(500); await page.keyboard.up('Space'); await page.waitForTimeout(800)
  log('kbd 500ms:', (await state(page)).p, (await state(page)).footer)
  await page.keyboard.down('Enter'); await page.waitForTimeout(1550); await page.keyboard.up('Enter'); await page.waitForTimeout(300)
  log('kbd Enter 1550ms:', await state(page))
  log('errors', b.errors); await b.close()
}

// 6. touch hold through CDP (touch-action none, no context menu, no selection)
{
  const b = await fresh({}, '?n=4')
  const { page, ctx } = b
  const c = await centre(page)
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] })
  await page.waitForTimeout(700)
  const mid = await state(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(900)
  log('touch 700ms mid:', mid.p, mid.holdAttr, ' after release:', (await state(page)).p)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] })
  await page.waitForTimeout(1550)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(300)
  log('touch 1550ms:', await state(page))
  log('errors', b.errors); await b.close()
}

// 7. reduced motion: plain button only
{
  const b = await fresh({ reduceMotion: true }, '?n=3')
  const { page } = b
  log('reduced:', await state(page), await page.evaluate(() => ({ holdBtn: !!document.querySelector('button.sld-hold'), plain: document.querySelector('.sld-plain')?.textContent })))
  await page.click('.sld-plain'); await page.waitForTimeout(500)
  log('reduced after click:', await state(page))
  if (SHOTS) await b.shot('slides-declare/360-reduced')
  log('errors', b.errors); await b.close()
}

// 8. assistive activation: a click with no pointer/key precursor declares at once
{
  const b = await fresh({}, '?n=3')
  await b.page.evaluate(() => document.querySelector('.sld-hold').click())
  await b.page.waitForTimeout(900)
  log('assist click:', await state(b.page))
  log('errors', b.errors); await b.close()
}
