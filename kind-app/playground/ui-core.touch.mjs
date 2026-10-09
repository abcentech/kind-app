// touch / 360px checks: node playground/ui-core.touch.mjs
import { open } from './ui-core.open.mjs'
const b = await open({ url: 'http://localhost:5183/playground/ui-core.html', device: 'lowend', state: null })
const { page } = b
await page.waitForTimeout(500)
const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
console.log('overflow @360:', JSON.stringify(overflow), overflow.sw <= overflow.cw ? 'PASS' : 'FAIL')
const wide = await page.evaluate(() => [...document.querySelectorAll('.pg *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.k-btn__halo')).slice(0, 8).map((e) => e.className + ' ' + Math.round(e.getBoundingClientRect().right)))
console.log('elements past the right edge:', wide.length ? wide : 'none')
// tap a chip and a segmented option with real touch
const chip = page.locator('#sec-chip .k-chip', { hasText: 'This week' })
await chip.scrollIntoViewIfNeeded(); await chip.tap()
console.log('chip tap → pressed:', await chip.getAttribute('aria-pressed'))
const seg = page.locator('#sec-seg .k-seg').first(); await seg.scrollIntoViewIfNeeded()
await seg.locator('[role=radio]').nth(2).tap()
console.log('segmented tap → checked:', await seg.locator('[aria-checked=true]').innerText())
const sw = page.locator('#sec-switch .k-switch__input').first(); await sw.scrollIntoViewIfNeeded()
const was = await sw.isChecked(); await page.locator('#sec-switch .k-switch').first().tap()
console.log('switch tap toggles:', (await sw.isChecked()) !== was ? 'PASS' : 'FAIL')
// hover must not stick after a tap on touch
const btn = page.locator('#sec-button-b .k-btn[data-v="primary"]').first(); await btn.scrollIntoViewIfNeeded(); await btn.tap(); await page.waitForTimeout(300)
console.log('button hv after tap:', await btn.evaluate((e) => getComputedStyle(e).getPropertyValue('--k-hv')), '(want 0)')
console.log('errors:', b.errors.length ? b.errors : 'none')
await b.close()
