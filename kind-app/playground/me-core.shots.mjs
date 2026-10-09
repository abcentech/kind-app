// node playground/me-core.shots.mjs  — the few shots that matter (region crops, dpr 2)
import { open } from '../tools/browser.mjs'
const U = 'http://localhost:5183/playground/me-core.html'
const run = async (seed, dev, name, fn, q = '') => {
  const b = await open({ url: `${U}?seed=${seed}${q}`, device: dev, dpr: 2, state: null })
  await b.page.waitForSelector('.me-pilot', { timeout: 20000 })
  await b.page.waitForTimeout(1800)
  await fn(b)
  console.log(name, b.errors)
  await b.close()
}
const region = (sel1, sel2) => async (b) => {
  const r = await b.page.evaluate(([a, c]) => {
    const A = document.querySelector(a).getBoundingClientRect(), C = document.querySelector(c).getBoundingClientRect()
    return { x: 0, y: Math.max(0, A.top - 8), width: innerWidth, height: Math.min(innerHeight - Math.max(0, A.top - 8), C.bottom - A.top + 16) }
  }, [sel1, sel2])
  await b.page.screenshot({ path: `tools/out/me-core/${b.__n}.png`, clip: r })
}
const arg = process.argv[2]
if (!arg || arg === 'top-360') await run('parent', 'lowend', 'top-360', async (b) => { await b.page.screenshot({ path: 'tools/out/me-core/top-360.png' }) })
if (!arg || arg === 'mid-390') await run('parent', 'iphone', 'mid-390', async (b) => {
  await b.page.evaluate(() => document.querySelector('#me-missions-h').scrollIntoView({ block: 'start' }))
  await b.page.waitForTimeout(300)
  await b.page.screenshot({ path: 'tools/out/me-core/mid-390.png' })
})
