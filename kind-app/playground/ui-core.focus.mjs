// Real keyboard focus (Tab) on each focusable family: outline colour/offset + a screenshot of the ring.
//   node playground/ui-core.focus.mjs
import { open } from './ui-core.open.mjs'
const b = await open({ url: 'http://localhost:5183/playground/ui-core.html', device: 'desktop', w: 390, h: 900, dpr: 3, state: null })
const { page } = b
await page.waitForTimeout(500)
const targets = [
  ['btn', '#sec-button .k-btn[data-v="primary"]:not([data-state]):not(:disabled):not([data-loading])'],
  ['iconbtn', '#sec-iconbutton .k-iconbtn[data-v="plate"]:not([data-state]):not(:disabled)'],
  ['chip', '#sec-chip .k-chip:not([data-state]):not(:disabled)'],
  ['row', '#sec-row button.k-row:not([data-state]):not(:disabled)'],
  ['switch', '#sec-switch .k-switch__input:not(:disabled)'],
  ['seg', '#sec-seg .k-seg [role=radio][tabindex="0"]'],
  ['slider', '#sec-slider [role=slider]'],
  ['panel', '#sec-panel button.k-panel:not([data-cut]):not([data-state])'],
  ['panelcut', '#sec-panel button.k-panel[data-cut]:not([data-state])'],
]
for (const [name, sel] of targets) {
  await page.evaluate(() => document.activeElement?.blur()); await page.mouse.move(0, 0)
  const el = page.locator(sel).first()
  await el.scrollIntoViewIfNeeded()
  const handle = await el.elementHandle()
  let hit = false
  // start tabbing from just before the element so it takes few presses
  await page.evaluate((h) => { const prev = h; prev.focus(); prev.blur() }, handle)
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab')
  hit = await page.evaluate((h) => document.activeElement === h, handle)
  if (!hit) { for (let i = 0; i < 4 && !hit; i++) { await page.keyboard.press('Tab'); hit = await page.evaluate((h) => document.activeElement === h, handle) } }
  await page.waitForTimeout(260)
  const info = await handle.evaluate((e) => { const c = getComputedStyle(e); return { fv: e.matches(':focus-visible'), outline: `${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor}`, off: c.outlineOffset, ring: e.querySelector?.('.k-btn__ring, .k-panel__ring') ? getComputedStyle(e.querySelector('.k-btn__ring, .k-panel__ring')).opacity : '-' } })
  console.log(name.padEnd(9), hit ? 'focused' : 'NOT-FOCUSED', JSON.stringify(info))
  const bb = await handle.boundingBox(); const sy = await page.evaluate(() => scrollY)
  await page.screenshot({ path: `tools/out/ui-core/focus-${name}.png`, clip: { x: Math.max(0, bb.x - 14), y: Math.max(0, bb.y + sy - 14), width: Math.min(390, bb.width + 28), height: bb.height + 28 }, fullPage: true })
}
console.log('errors:', b.errors.length ? b.errors : 'none')
await b.close()
