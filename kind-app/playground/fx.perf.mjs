// Per-frame garbage + CPU budget for the fx engine.  node playground/fx.perf.mjs
//   1. HeapProfiler allocation sampling (incl. objects already collected) for 3 s of the heaviest scene, then attribute bytes to src/fx/*.
//   2. 4x CPU throttle: the same scene, tick cost (ms of JS per frame) and the governor's reaction.
import { chromium } from 'playwright-core'
import { DEVICES } from '../tools/browser.mjs'

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars', '--enable-precise-memory-info'] })
const d = DEVICES.lowend
const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true })
await ctx.addInitScript(() => { const R = window.WebSocket; window.WebSocket = function (u, p) { if (p === 'vite-hmr') return Object.assign(new EventTarget(), { send() {}, close() {}, readyState: 3 }); return new R(u, p) } })
const p = await ctx.newPage()
const errors = []
p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await p.goto('http://localhost:5183/playground/fx.html', { waitUntil: 'load', timeout: 90000 })
await p.waitForTimeout(1500)
const cdp = await ctx.newCDPSession(p)

// a scene that keeps ~150 live: cannons + big celebrate + a trail, re-fired so the pool stays full
const scene = `(() => {
  window.__t = fx.trail(document.querySelector('.marker') || document.body, { rate: 120 })
  const go = () => { fx.cannons(); fx.celebrate({ x: 180, y: 300 }, { big: true }); fx.sparks({ x: 180, y: 420, n: 60 }) }
  go(); window.__iv = setInterval(go, 900)
})()`
const stop = `(() => { clearInterval(window.__iv); window.__t && window.__t.stop(); fx.clear() })()`

// ── 1. allocation sampling
// warm up first: V8 only unboxes doubles once a function has tiered up, and the first seconds are not steady state
await p.evaluate(scene); await p.waitForTimeout(6000); await p.evaluate(stop); await p.waitForTimeout(400)
await cdp.send('HeapProfiler.enable')
await cdp.send('HeapProfiler.collectGarbage')
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 256, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true })
await p.evaluate(scene)
await p.waitForTimeout(3500)
const stats1 = await p.evaluate('fx.stats()')
const { profile } = await cdp.send('HeapProfiler.stopSampling')
await p.evaluate(stop)
const by = new Map()
let total = 0
const walk = (n) => {
  const url = n.callFrame.url || ''
  const tag = /\/src\/fx\/fx\.js/.test(url) ? 'fx.js' : /\/src\/fx\/motion\.js/.test(url) ? 'motion.js' : /react/i.test(url) ? 'react' : /fx\.jsx/.test(url) ? 'lab' : 'other'
  if (n.selfSize) { total += n.selfSize; const k = tag + ' · ' + (n.callFrame.functionName || '(anon)'); by.set(k, (by.get(k) || 0) + n.selfSize) }
  n.children.forEach(walk)
}
walk(profile.head)
const rows = [...by.entries()].sort((a, b) => b[1] - a[1])
const fxBytes = rows.filter(([k]) => k.startsWith('fx.js') || k.startsWith('motion.js')).reduce((a, [, v]) => a + v, 0)
console.log('— allocation sampling, 3.5 s, live particles ~' + stats1.live + ', renderer ' + stats1.renderer)
console.log('total sampled', (total / 1024).toFixed(1), 'KB   fx.js+motion.js', (fxBytes / 1024).toFixed(1), 'KB  (' + (fxBytes / 3.5 / 1024).toFixed(2) + ' KB/s, ~' + (fxBytes / (3.5 * 60)).toFixed(0) + ' B/frame)')
rows.filter(([k]) => k.startsWith('fx.js') || k.startsWith('motion.js')).slice(0, 8).forEach(([k, v]) => console.log('  ', (v / 1024).toFixed(2).padStart(7), 'KB', k))
console.log('   other top:'); rows.filter(([k]) => !(k.startsWith('fx.js') || k.startsWith('motion.js'))).slice(0, 4).forEach(([k, v]) => console.log('  ', (v / 1024).toFixed(2).padStart(7), 'KB', k))

// ── 2. 4x CPU throttle
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
await p.evaluate('fx.setQuality("auto")')
await p.evaluate(scene)
const samples = []
for (let i = 0; i < 8; i++) { await p.waitForTimeout(500); samples.push(await p.evaluate('fx.stats()')) }
await p.evaluate(stop)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
console.log('— 4x CPU throttle (software GL in headless: GPU numbers are not representative, tick ms is the JS cost)')
console.log(samples.map((s) => `live ${String(s.live).padStart(3)}  q ${s.quality.toFixed(2)}  tick ${s.tickMs.toFixed(2)}ms  frame ${s.frameMs}ms`).join('\n'))
console.log('errors', errors)
await browser.close()
