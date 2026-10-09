import { open } from '../tools/browser.mjs'
const b = await open({ url: 'http://localhost:5183/playground/locker-cards.html?seed=12', w: 360, h: 640, dpr: 2, device: 'lowend', now: '2026-08-12' })
await b.page.waitForTimeout(1500)
await b.page.evaluate(() => document.querySelector('.lcc-card:not([data-owned])').scrollIntoView({ block: 'start' }))
await b.page.waitForTimeout(500)
await b.shot('locker-cards/locked-360', { settle: 100 })
console.log(b.errors)
await b.close()
