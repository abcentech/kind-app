import { open } from '../tools/browser.mjs'
const U = 'http://localhost:5183/playground/locker-cards.html'
const out = {}
// 1. grid, 12 cards, iphone 390x844
let b = await open({ url: U + '?seed=12', device: 'iphone', dpr: 2, now: '2026-08-12' })
await b.page.waitForTimeout(1800)
out.text = await b.page.evaluate(() => document.querySelector('.lcc-head').innerText)
out.counts = await b.page.evaluate(() => ({ tiles: document.querySelectorAll('.lcc-cell').length, owned: document.querySelectorAll('.lcc-card[data-owned]').length, rare: document.querySelectorAll('.lcc-card[data-rare][data-owned]').length }))
await b.shot('locker-cards/grid-12', { settle: 200 })
console.log(JSON.stringify(out), b.errors)
await b.close()
