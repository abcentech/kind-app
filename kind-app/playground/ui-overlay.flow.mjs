// node playground/ui-overlay.flow.mjs [tag] [device]  — opens every overlay and shoots it, plus mid-drag frames driven by real CDP touch.
import { open } from '../tools/browser.mjs'
const tag = process.argv[2] || 'a'
const device = process.argv[3] || 'iphone'
const URL = 'http://localhost:5183/playground/ui-overlay.html'
const b = await open({ url: URL, device, state: null })
const { page, ctx } = b
await page.waitForTimeout(700)
const cdp = await ctx.newCDPSession(page)
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] })
const dir = `ui-overlay/v2/${tag}-${device}-f`
const btn = (t) => page.locator('.pg-bar .pg-btn', { hasText: t }).first()
const pan = () => page.locator('.k-sheet').last()

// 1. auto sheet
await btn('Sheet · auto').click()
await page.waitForTimeout(900)
await b.shot(`${dir}-01-sheet-auto`, { settle: 200 })
// mid-drag with real touch on the grabber
let box = await pan().boundingBox()
const gx = box.x + box.width / 2, gy = box.y + 14
await touch('touchStart', gx, gy)
for (let i = 1; i <= 8; i++) { await touch('touchMove', gx, gy + i * 14); await page.waitForTimeout(16) }
await b.shot(`${dir}-02-sheet-middrag`, { settle: 0 })
await touch('touchEnd')
await page.waitForTimeout(900)
console.log('after short drag, sheet open?', await page.locator('.k-sheet').count())
// 2. half+full
if (await page.locator('.k-sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(700) }
await btn('half+full').click()
await page.waitForTimeout(900)
await b.shot(`${dir}-03-sheet-half`, { settle: 200 })
box = await pan().boundingBox()
await touch('touchStart', box.x + box.width / 2, box.y + 14)
for (let i = 1; i <= 10; i++) { await touch('touchMove', box.x + box.width / 2, box.y + 14 - i * 22); await page.waitForTimeout(16) }
await touch('touchEnd')
await page.waitForTimeout(900)
await b.shot(`${dir}-04-sheet-full`, { settle: 200 })
await page.keyboard.press('Escape'); await page.waitForTimeout(700)
// 3. dialogs
await btn('Dialog').click(); await page.waitForTimeout(700); await b.shot(`${dir}-05-dialog`, { settle: 200 })
await page.keyboard.press('Escape'); await page.waitForTimeout(500)
await btn('Danger').click(); await page.waitForTimeout(700); await b.shot(`${dir}-06-danger`, { settle: 200 })
await page.keyboard.press('Escape'); await page.waitForTimeout(500)
// 4. toasts
await btn('Toast').click(); await page.waitForTimeout(900); await b.shot(`${dir}-07-toast`, { settle: 100 })
await btn('Action').click(); await page.waitForTimeout(900); await b.shot(`${dir}-08-toast-action`, { settle: 100 })
await btn('Stack').click(); await page.waitForTimeout(1100); await b.shot(`${dir}-09-toast-stack`, { settle: 100 })
console.log('errors:', b.errors.length ? b.errors : 'none')
await b.close()
