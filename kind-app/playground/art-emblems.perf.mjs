// art-emblems performance probe.
//   node playground/art-emblems.perf.mjs [--only patch] [--throttle 4] [--fx lite]
// Reports DOM weight per component and scroll frame times under CPU throttle (software raster = pessimistic, relative numbers matter).
import { open } from '../tools/browser.mjs'

const a = process.argv.slice(2)
const get = (f, d) => { const i = a.indexOf(f); return i > -1 ? a[i + 1] : d }
const qs = new URLSearchParams()
if (get('--only')) qs.set('only', get('--only'))
if (get('--fx')) qs.set('fx', get('--fx'))
const b = await open({
  url: `http://localhost:5183/playground/art-emblems.html${[...qs].length ? '?' + qs : ''}`,
  device: 'lowend', state: null,
})
const { page, ctx } = b
const cdp = await ctx.newCDPSession(page)
await page.waitForTimeout(800)

const weight = await page.evaluate(() => {
  const out = {}
  for (const sel of ['svg.art-patch', 'svg.art-medal', 'svg.art-rank', 'svg.art-shieldmark', 'svg.art-chest', 'svg.art-trophy', 'svg.art-flamemark', '.art-codecard']) {
    const els = [...document.querySelectorAll(sel)]
    if (!els.length) continue
    const nodes = els.map((e) => e.querySelectorAll('*').length)
    const html = els.map((e) => e.outerHTML.length)
    out[sel] = { count: els.length, avgNodes: Math.round(nodes.reduce((x, y) => x + y, 0) / els.length), maxNodes: Math.max(...nodes), avgKB: +(html.reduce((x, y) => x + y, 0) / els.length / 1024).toFixed(1) }
  }
  out.pageNodes = document.querySelectorAll('*').length
  return out
})
console.table(weight)

const rate = Number(get('--throttle', 4))
await cdp.send('Emulation.setCPUThrottlingRate', { rate })
await page.evaluate(() => { window.__d = []; let last = performance.now(); const tick = (t) => { window.__d.push(t - last); last = t; requestAnimationFrame(tick) }; requestAnimationFrame(tick) })
const H = await page.evaluate(() => document.documentElement.scrollHeight)
const steps = 40
for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, Math.ceil(H / steps)); await page.waitForTimeout(40) }
await page.waitForTimeout(300)
const d = await page.evaluate(() => window.__d.slice(5))
d.sort((x, y) => x - y)
const pct = (p) => d[Math.min(d.length - 1, Math.floor(d.length * p))].toFixed(1)
console.log(`scroll @ ${rate}x throttle, page height ${H}px, ${d.length} frames: p50 ${pct(0.5)}ms  p90 ${pct(0.9)}ms  p99 ${pct(0.99)}ms  max ${d[d.length - 1].toFixed(1)}ms  >33ms: ${d.filter((x) => x > 33).length}`)
console.log('errors:', b.errors.length ? b.errors : 'none')
await b.close()
