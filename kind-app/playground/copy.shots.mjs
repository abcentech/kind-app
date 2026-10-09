// copy specimen screenshots (scratch tool for the copy role): node playground/copy.shots.mjs <device> [fx]
import { open } from '../tools/browser.mjs'
const dev = process.argv[2] || 'iphone'
const fx = process.argv[3] === 'lite' ? '&fx=lite' : ''
const plan = { bar: 1, verdict: 1, moments: 6, streak: 1, greet: 1, onboard: 1, share: 1, empty: 1, coach: 2 }
const b = await open({ url: `http://localhost:5183/playground/copy.html?seed=ada${fx}`, device: dev, dpr: 2, state: null })
await b.page.waitForTimeout(1200)
const vh = await b.page.evaluate(() => innerHeight)
const out = []
for (const [id, n] of Object.entries(plan)) {
  const top = await b.page.evaluate((i) => { const el = document.getElementById(i); return el ? el.getBoundingClientRect().top + scrollY : null }, id)
  if (top == null) { console.log('no section', id); continue }
  for (let k = 0; k < n; k++) {
    await b.page.evaluate((y) => window.scrollTo(0, y), top - 8 + k * (vh - 120))
    out.push(await b.shot(`copy/${dev}${fx ? '-lite' : ''}-${id}-${k + 1}`, { settle: 300 }))
  }
}
// toasts: fire three and look at the stack
const top = await b.page.evaluate(() => document.getElementById('toast').getBoundingClientRect().top + scrollY)
await b.page.evaluate((y) => window.scrollTo(0, y - 8), top)
for (const id of ['shieldUsed', 'updateReady', 'soundOn']) { await b.page.getByRole('button', { name: id, exact: true }).click(); await b.page.waitForTimeout(250) }
out.push(await b.shot(`copy/${dev}${fx ? '-lite' : ''}-toasts`, { settle: 700 }))
console.log(out.join('\n'))
console.log('errors', JSON.stringify(b.errors))
await b.close()
