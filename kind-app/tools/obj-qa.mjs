import { open } from './browser.mjs'
const small = process.argv[2] === 'small'
const dims = small ? { w: 360, h: 640 } : {}
const b = await open({ url: 'http://localhost:5183/?fast=1&tab=objectives&now=2026-08-12', ...dims, dpr: 1 })
const p = b.page
const go = async (q, setup) => {
  await p.goto('http://localhost:5183/?fast=1&tab=objectives' + q, { waitUntil: 'load' })
  await p.waitForTimeout(600)
  if (setup) { await p.evaluate(setup); await p.waitForTimeout(500) }
}
const probe = () => p.evaluate(() => {
  const over = [...document.querySelectorAll('.obj-page *')].filter(e => { if (e.closest('.k-prog')||e.classList.contains('k-btn__glint')) return false; const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1) }).slice(0, 6).map(e => e.className + ':' + Math.round(e.getBoundingClientRect().right))
  const clipped = [...document.querySelectorAll('.obj-page *')].filter(e => e.children.length===0 && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow!=='visible').slice(0,5).map(e=>e.className+':'+e.textContent.slice(0,30))
  return { sw: document.documentElement.scrollWidth, iw: innerWidth, over, clipped, text: document.querySelector('.obj-page')?.innerText.replace(/\n+/g, ' | ') }
})
const S = "window.__kind.seed"
const two = `(async()=>{const m=await import('/src/store.js'); window.__kind.seed('mid'); const sid=m.snapshot? null:null; for(let i=0;i<4;i++) m.scoreAnswer(true,{}) })()`
const list = [
  ['mid-2rings', '&now=2026-08-12', two],
  ['done+chest', '&now=2026-08-12', `(async()=>{const m=await import('/src/store.js'); window.__kind.seed('done-today'); for(let i=0;i<4;i++) m.scoreAnswer(true,{}) })()`],
  ['vet', '&now=2026-08-12', `window.__kind.seed('veteran')`],
  ['lost', '&now=2026-08-12', `window.__kind.seed('lost')`],
  ['sat', '&now=2026-08-15', `window.__kind.seed('mid')`],
  ['end', '&now=2026-08-31', `window.__kind.seed('veteran')`],
  ['archive', '', `window.__kind.seed('veteran')`],
  ['july', '&series=secrets-of-longevity&now=2026-07-12', `window.__kind.seed('mid')`],
  ['fresh', '&now=2026-08-12', `window.__kind.seed('fresh')`],
]
const only = process.argv[3]
for (const [name, q, setup] of list) {
  if (only && !only.split(',').includes(name)) continue
  b.errors.length = 0
  try { await go(q, setup); const r = await probe(); console.log('==', name, JSON.stringify(r)); } catch (e) { console.log('==', name, 'FAIL', e.message.slice(0, 100)) }
  console.log('errors', b.errors)
}
await b.close()
