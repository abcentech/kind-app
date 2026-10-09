import { open } from '../tools/browser.mjs'
const b = await open({ url: `http://localhost:5183/playground/locker.html?seed=mid&seg=medals&now=2026-08-12`, device: 'lowend', dpr: 2, state: null })
const { page } = b
await page.waitForTimeout(500)
await page.evaluate(() => { const n = [...document.querySelectorAll('.lck-new')]; const last = n[n.length - 1]; last.closest('.lck-medal').scrollIntoView({ block: 'center' }) })
await page.waitForTimeout(400)
console.log(await b.shot('locker-medals-new'))
const o = await page.evaluate(() => [...document.querySelectorAll('.lck-filters > .k-chip')].map((c) => { const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), c.scrollWidth > c.clientWidth] }))
console.log(JSON.stringify(o), b.errors)
await b.close()
