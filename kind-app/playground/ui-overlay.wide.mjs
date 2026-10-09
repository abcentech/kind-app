// node playground/ui-overlay.wide.mjs  — tablet + desktop: the sheet / dialog / dock must hold a centred phone column.
import { open } from '../tools/browser.mjs'
for (const device of ['tablet', 'desktop']) {
  const b = await open({ url: 'http://localhost:5183/playground/ui-overlay.html', device, state: null })
  const { page } = b
  await page.waitForTimeout(1000)
  const dir = `ui-overlay/v2/wide-${device}`
  const btn = (t) => page.locator('.pg-bar .pg-btn', { hasText: t }).first()
  await btn('Sheet · footer').click(); await page.waitForTimeout(1500)
  await b.shot(`${dir}-01-sheet`, { settle: 200 })
  const geo = await page.evaluate(() => { const r = document.querySelector('.k-sheet').getBoundingClientRect(); return { x: Math.round(r.left), w: Math.round(r.width), vw: innerWidth } })
  console.log(device, 'sheet', JSON.stringify(geo), Math.abs(geo.x * 2 + geo.w - geo.vw) <= 2 && geo.w <= 480 ? 'PASS centred, <= 480' : 'FAIL')
  await page.keyboard.press('Escape'); await page.waitForTimeout(800)
  await btn('Danger').click(); await page.waitForTimeout(900)
  await b.shot(`${dir}-02-danger`, { settle: 200 })
  await page.keyboard.press('Escape'); await page.waitForTimeout(600)
  await btn('Toast').click(); await page.waitForTimeout(800)
  await b.shot(`${dir}-03-toast`, { settle: 100 })
  console.log(device, 'errors:', b.errors.length ? b.errors : 'none')
  await b.close().catch(() => {})
}
process.exit(0)
