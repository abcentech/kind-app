import { open } from '../tools/browser.mjs'
const U = 'http://localhost:5183/playground/locker-cards.html'
const log = {}
let b = await open({ url: U + '?seed=all', w: 360, h: 640, dpr: 2, device: 'lowend', now: '2026-08-12' })
const p = b.page
await p.waitForTimeout(1500)
log.all = await p.evaluate(() => ({ head: document.querySelector('.lcc-head').innerText.replace(/\n+/g, ' '), locked: document.querySelectorAll('.lcc-card:not([data-owned])').length }))
// perf at 4x
const cdp = await p.context().newCDPSession(p)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
log.perf = await p.evaluate(async () => {
  const sc = document.querySelector('.shell-screen'); const max = sc.scrollHeight - sc.clientHeight
  const ft = []; let last = performance.now(); let y = 0; const dir = 1
  return await new Promise((res) => { const step = (t) => { ft.push(t - last); last = t; y += 26; sc.scrollTop = y; if (y < max) requestAnimationFrame(step); else res({ max, frames: ft.length, avg: +(ft.reduce((a, b) => a + b, 0) / ft.length).toFixed(1), p95: +ft.sort((a, b) => a - b)[Math.floor(ft.length * .95)].toFixed(1), worst: +Math.max(...ft).toFixed(1) }) }; requestAnimationFrame(step) })
})
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
// viewer: open card 1 (top), swipe, keys
await p.evaluate(() => { document.querySelector('.shell-screen').scrollTop = 0 })
await p.waitForTimeout(300)
await p.click('.lcc-card[data-owned]')
await p.waitForTimeout(900)
const cnt = () => p.evaluate(() => document.querySelector('.lcc-vcount').textContent)
log.open = await cnt()
log.active = await p.evaluate(() => document.activeElement.getAttribute('aria-label'))
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700); log.right = await cnt()
await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(700); log.left = await cnt()
await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(500); log.leftEdge = await cnt()
// swipe via touch-like mouse drag
await p.mouse.move(280, 250); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(280 - i * 28, 252); await p.waitForTimeout(16) } await p.mouse.up()
await p.waitForTimeout(800); log.swipeLeft = await cnt()
await p.mouse.move(80, 250); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(80 + i * 28, 252); await p.waitForTimeout(16) } await p.mouse.up()
await p.waitForTimeout(800); log.swipeRight = await cnt()
// small drag springs back
await p.mouse.move(200, 250); await p.mouse.down(); await p.mouse.move(230, 251, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(800); log.smallDrag = await cnt()
log.trackT = await p.evaluate(() => document.querySelector('.lcc-track').style.transform)
// tab trap
for (let i = 0; i < 7; i++) await p.keyboard.press('Tab')
log.focusInLayer = await p.evaluate(() => !!document.activeElement.closest('.lcc-viewer'))
// Esc closes, focus returns to tile
await p.keyboard.press('Escape'); await p.waitForTimeout(700)
log.closed = await p.evaluate(() => ({ layer: !!document.querySelector('.lcc-viewer'), focus: document.activeElement.className }))
// go to day
await p.click('.lcc-card[data-owned]'); await p.waitForTimeout(800)
await p.click('text=Go to day'); await p.waitForTimeout(500)
log.goDay = await p.evaluate(() => ({ layer: !!document.querySelector('.lcc-viewer'), shell: document.querySelector('[data-testid=shell-log]')?.textContent }))
await p.click('.lcc-card[data-owned]'); await p.waitForTimeout(800)
await p.click('button:has-text("Share")'); await p.waitForTimeout(300)
log.share = await p.evaluate(() => document.querySelector('[data-testid=shell-log]')?.textContent)
// history back closes
await p.goBack(); await p.waitForTimeout(500)
log.back = await p.evaluate(() => ({ layer: !!document.querySelector('.lcc-viewer'), url: location.pathname }))
await b.shot('locker-cards/all-top', { settle: 100 })
console.log(JSON.stringify(log, null, 1), b.errors)
await b.close()
