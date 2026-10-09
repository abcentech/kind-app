import { open } from './browser.mjs'
// usage: node obj-shot.mjs <prefix> <q> <setup-js> <device> <sel1,sel2|sel3...>   groups separated by |, each group = from..to selectors
const [prefix, q, setup, device, groups] = process.argv.slice(2)
const b = await open({ url: 'http://localhost:5183/?fast=1&tab=objectives' + q, device: device || 'iphone', dpr: 2 })
const p = b.page
await p.waitForTimeout(500)
if (setup) { await p.evaluate(setup); await p.waitForTimeout(2200) }
const info = await p.evaluate(() => { const s = getComputedStyle(document.scrollingElement); return [document.scrollingElement.scrollHeight, innerHeight, [...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+200 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map(e=>e.className).slice(0,3)] })
console.log(info)
let i = 0
for (const g of groups.split('|')) {
  const [a, z] = g.split('..')
  const clip = await p.evaluate(([a, z]) => {
    const A = document.querySelector(a), Z = document.querySelector(z || a)
    A.scrollIntoView({ block: 'start' })
    const ra = A.getBoundingClientRect(), rz = Z.getBoundingClientRect()
    return { x: 0, y: Math.max(0, ra.top - 4), width: innerWidth, height: Math.min(innerHeight - Math.max(0, ra.top - 4), rz.bottom - ra.top + 8) }
  }, [a, z])
  await p.waitForTimeout(300)
  await p.screenshot({ path: `tools/out/${prefix}-${i++}.png`, clip })
  console.log('shot', i - 1, JSON.stringify(clip))
}
console.log(b.errors)
await b.close()
