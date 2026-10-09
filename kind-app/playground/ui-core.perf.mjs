// Scroll-smoothness probe: CPU 4× throttle, scroll the whole specimen sheet, report rAF frame times.
//   node playground/ui-core.perf.mjs [lite]
import { open } from './ui-core.open.mjs'
const fx = process.argv[2] === 'lite' ? 'lite' : 'full'
const b = await open({ url: `http://localhost:5183/playground/ui-core.html?fx=${fx}`, device: 'lowend', state: null })
const { page, ctx } = b
const cdp = await ctx.newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
await page.waitForTimeout(800)
const stats = await page.evaluate(async () => {
  const times = []
  let last = performance.now(), run = true
  const tick = (t) => { times.push(t - last); last = t; if (run) requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
  const H = document.documentElement.scrollHeight - innerHeight
  const t0 = performance.now()
  await new Promise((res) => { const step = () => { const p = Math.min(1, (performance.now() - t0) / 6000); scrollTo(0, H * p); p < 1 ? requestAnimationFrame(step) : res() }; step() })
  run = false
  const s = times.slice(2).sort((a, c) => a - c)
  const q = (x) => s[Math.floor(s.length * x)]
  return { frames: s.length, p50: +q(0.5).toFixed(1), p90: +q(0.9).toFixed(1), p99: +q(0.99).toFixed(1), over33: s.filter((x) => x > 33.4).length, over50: s.filter((x) => x > 50).length }
})
console.log(fx, '4x CPU throttle, 360x640, whole sheet scroll →', JSON.stringify(stats))
await b.close()
