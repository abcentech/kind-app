// node playground/ui-overlay.zoom.mjs <tag> <selector[:index]> ...   element close-ups at DPR 3 (quiet the fx first)
import { open } from '../tools/browser.mjs'
const [tag, ...sels] = process.argv.slice(2)
const b = await open({ url: 'http://localhost:5183/playground/ui-overlay.html', device: 'iphone', dpr: 3, state: null })
const { page } = b
await page.waitForTimeout(1800)
let n = 0
for (const spec of sels) {
  const [sel, idx = '0'] = spec.split('@')
  const el = page.locator(sel).nth(+idx)
  await el.scrollIntoViewIfNeeded()
  await page.evaluate(() => { const bar = document.querySelector('.pg-bar'); if (bar) bar.style.display = 'none' })
  await page.waitForTimeout(500)
  const file = `tools/out/ui-overlay/v2/z-${tag}-${String(++n).padStart(2, '0')}.png`
  await el.screenshot({ path: file })
  console.log(file)
}
console.log('errors:', b.errors.filter((e) => !/404/.test(e)))
await b.close().catch(() => {})
process.exit(0)
