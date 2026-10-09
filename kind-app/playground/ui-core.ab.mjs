// A/B scroll cost of the Button's new material layers (grain + cursor spot + keylines), alternating so machine load cancels.
//   node playground/ui-core.ab.mjs [rounds=2]
import { open } from './ui-core.open.mjs'
const rounds = Number(process.argv[2] || 2)
const BARE = `.k-btn__fill::after, .k-btn__spot, .k-btn__sheen::before, .k-btn__sheen::after { display: none !important; }`
async function run(bare) {
  const b = await open({ url: 'http://localhost:5183/playground/ui-core.html', device: 'lowend', state: null })
  const { page, ctx } = b
  if (bare) await page.addStyleTag({ content: BARE })
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.waitForTimeout(1200)
  const r = await page.evaluate(async () => {
    const times = []; let last = performance.now(), run = true
    const tick = (t) => { times.push(t - last); last = t; if (run) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
    const el = document.querySelector('#sec-button'); const y0 = el.getBoundingClientRect().top + scrollY, y1 = y0 + el.offsetHeight - innerHeight
    const t0 = performance.now()
    await new Promise((res) => { const step = () => { const p = Math.min(1, (performance.now() - t0) / 4000); scrollTo(0, y0 + (y1 - y0) * p); p < 1 ? requestAnimationFrame(step) : res() }; step() })
    run = false
    const s = times.slice(2).sort((a, c) => a - c); const q = (x) => s[Math.floor(s.length * x)]
    return { frames: s.length, p50: +q(0.5).toFixed(1), p90: +q(0.9).toFixed(1), worst: +s[s.length - 1].toFixed(0) }
  })
  await b.close()
  return r
}
for (let i = 0; i < rounds; i++) {
  console.log('bare', JSON.stringify(await run(true)))
  console.log('full', JSON.stringify(await run(false)))
}
