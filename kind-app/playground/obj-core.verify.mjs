// node playground/obj-core.verify.mjs  — drives the four seeds, asserts via evaluate, takes a handful of shots under tools/out/obj-core/
import { open } from '../tools/browser.mjs'
const base = 'http://localhost:5183/playground/obj-core.html'
const probe = () => {
  const q = (s) => document.querySelector(s)
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } }
  const over = [...document.querySelectorAll('.obj-page *')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map((e) => e.className).slice(0, 5)
  const wide = [...document.querySelectorAll('.obj-leg-name, .obj-leg-val')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent)
  return {
    docOverflowX: document.documentElement.scrollWidth - innerWidth, over, wide,
    num: q('.obj-num')?.textContent, of: q('.obj-of')?.textContent, state: q('.obj-rings')?.dataset.state,
    chest: q('.obj-chest')?.dataset.state, chestTitle: q('.obj-chest-title')?.textContent, reset: q('.obj-reset time')?.textContent,
    legend: [...document.querySelectorAll('.obj-leg')].map((e) => e.getAttribute('aria-label')),
    chip: r(q('.k-chip')), chipText: q('.k-chip')?.textContent, bezel: r(q('.obj-bezel')), page: r(q('.obj-page')),
    lit: document.querySelectorAll('.obj-tick.is-lit').length,
    flags: Object.keys(JSON.parse(localStorage.getItem('kind-app-v4') || '{}').flags || {}),
  }
}
const run = async (name, qs, opt = {}) => {
  let b
  for (let i = 0; i < 3 && !b; i++) { try { b = await open({ url: base + qs, device: opt.device || 'lowend', state: null, now: opt.now, reduceMotion: !!opt.reduce }) } catch (e) { console.log('retry', e.message.slice(0, 60)) } }
  await b.page.waitForTimeout(1600)
  const out = await b.page.evaluate(probe)
  console.log(name, JSON.stringify(out))
  return b
}
const which = process.argv[2] || 'all'
if (which === 'mid') {
  const b = await run('mid360', '?seed=mid')
  await b.page.screenshot({ path: 'tools/out/obj-core/mid-360.png' })
  console.log(b.errors); await b.close()
}
if (which === 'new') {
  const b = await run('new390', '?seed=new', { device: 'iphone' })
  await b.page.screenshot({ path: 'tools/out/obj-core/new-390.png' })
  console.log(b.errors); await b.close()
}
if (which === 'all' || which === 'closed') {
  const b = await run('closed390', '?seed=closed', { device: 'iphone' })
  await b.page.screenshot({ path: 'tools/out/obj-core/closed-390.png' })
  await b.page.click('.obj-chest')
  await b.page.waitForTimeout(1200)
  console.log('after claim', JSON.stringify(await b.page.evaluate(probe)))
  await b.page.screenshot({ path: 'tools/out/obj-core/claimed-390.png' })
  console.log(b.errors); await b.close()
}
if (which === 'all' || which === 'opened') {
  const b = await run('opened360lite', '?seed=opened&fx=lite', { reduce: true })
  await b.page.screenshot({ path: 'tools/out/obj-core/opened-360-lite.png' })
  console.log(b.errors); await b.close()
}
