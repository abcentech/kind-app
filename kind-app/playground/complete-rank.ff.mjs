import { open } from '../tools/browser.mjs'
const base = 'http://localhost:5183/playground/complete-rank.html'
for (const c of ['up-steward', 'patch-stewardship']) {
  const b = await open({ url: `${base}?case=${c}&bare=1`, device: 'lowend', dpr: 1 })
  await b.page.waitForSelector('.cmk-beat[data-in]')
  const t0 = Date.now()
  await b.page.mouse.click(180, 330)
  const at = (ms) => b.page.waitForTimeout(ms).then(() => b.page.evaluate(() => document.querySelector('.cmk-beat').getAttributeNames().filter((a) => a.startsWith('data-')).join(' ')))
  console.log(c, 'tap at', Date.now() - t0, '+120ms:', await at(120))
  console.log(c, 'band label:', await b.page.evaluate(() => document.querySelector('.k-btn')?.textContent))
  await b.close()
}
const b = await open({ url: `${base}?case=rank&bare=1`, device: 'lowend', dpr: 1 })
await b.page.waitForTimeout(2400)
console.log('band aria', await b.page.evaluate(() => document.querySelector('.cmk-band').getAttribute('aria-label')))
await b.close()
