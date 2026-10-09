// complete-rank: the handful of screenshots that matter. node playground/complete-rank.shots.mjs <set>
import { open } from '../tools/browser.mjs'
const base = 'http://localhost:5183/playground/complete-rank.html'
const set = process.argv[2] || 'a'
const only = process.argv[3]
const jobs = {
  // [name, device, query, ms after replay]
  a: [['up-steward-390', 'iphone', 'case=up-steward', 2900], ['patch-mid-360', 'lowend', 'case=patch-stewardship', 1050], ['patch-done-360', 'lowend', 'case=patch-stewardship', 3400]],
  b: [['rank-390', 'iphone', 'case=rank', 2600], ['medal-gold-360', 'lowend', 'case=medals-rare', 1500], ['summary-390', 'iphone', 'case=medals-3', 'summary']],
  c: [['up-pathfinder-lite-360', 'lowend', 'case=up-pathfinder&fx=lite', 900], ['up-steward-mid-390', 'iphone', 'case=up-steward', 900]],
}[set]
for (const [name, device, qs, ms] of jobs.filter((j) => !only || j[0].includes(only))) {
  const b = await open({ url: `${base}?${qs}&bare=1`, device, dpr: 2 })
  await b.page.evaluate(() => { window.__dts = []; let l = performance.now(); const f = (t) => { window.__dts.push(t - l); l = t; if (window.__dts.length < 400) requestAnimationFrame(f) }; requestAnimationFrame(f); window.__replay() })
  if (ms === 'summary') {
    for (let k = 0; k < 3; k++) { await b.page.waitForTimeout(700); await b.page.click('.k-btn') }
    await b.page.waitForTimeout(1500)
  } else await b.page.waitForTimeout(ms)
  const dts = await b.page.evaluate(() => { const d = window.__dts.slice(2, 120); return { n: d.length, avg: +(d.reduce((a, x) => a + x, 0) / d.length).toFixed(1), max: Math.round(Math.max(...d)) } })
  const t0 = Date.now()
  await b.page.screenshot({ path: `tools/out/complete-rank/${name}.png`, timeout: 60000 })
  console.log(name, 'frames', JSON.stringify(dts), 'shot ms', Date.now() - t0)
  console.log(name, b.errors.length ? b.errors : 'ok')
  await b.close()
}
