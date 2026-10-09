import { open } from '../tools/browser.mjs'
const b = await open({ url: `http://localhost:5183/playground/locker.html?seed=mid&seg=medals&now=2026-08-12`, device: 'lowend', dpr: 1, state: null })
const { page } = b
const t0 = Date.now()
for (let i = 0; i < 8; i++) {
  console.log(Date.now() - t0, await page.evaluate(() => [JSON.parse(localStorage.getItem('kind-app-v4')).achSeen.length, document.querySelectorAll('.lck-new').length, document.visibilityState, document.querySelectorAll('.lck-dot').length]))
  await page.waitForTimeout(500)
}
console.log(b.errors)
await b.close()
