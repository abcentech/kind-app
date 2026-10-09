import { open } from '../tools/browser.mjs'
const U = 'http://localhost:5183/playground/locker-cards.html'
async function run(label, css, seed) {
  const b = await open({ url: U + '?seed=' + seed, w: 360, h: 640, dpr: 2, device: 'lowend', now: '2026-08-12' })
  const p = b.page
  if (css) await p.addStyleTag({ content: css })
  await p.waitForTimeout(2200)
  const cdp = await p.context().newCDPSession(p)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const r = await p.evaluate(async () => {
    const sc = document.querySelector('.shell-screen'); const max = sc.scrollHeight - sc.clientHeight
    const ft = []; let last = 0; let y = 0
    return await new Promise((res) => { const step = (t) => { if (last) ft.push(t - last); last = t; y += 14; sc.scrollTop = y; if (y < max) requestAnimationFrame(step); else { const s = ft.slice(2).sort((a, b) => a - b); res({ frames: s.length, avg: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1), p95: +s[Math.floor(s.length * .95)].toFixed(1), worst: +s[s.length - 1].toFixed(1) }) } }; requestAnimationFrame(step) })
  })
  console.log(label, seed, JSON.stringify(r), b.errors.length)
  await b.close()
}
await run('as-is', '', 'all')
await run('cv-visible', '.lcc-face .art-codecard{content-visibility:visible !important}', 'all')
await run('as-is', '', '12')
await run('no-promote', '.lcc-face{transform:none !important}', 'all')
