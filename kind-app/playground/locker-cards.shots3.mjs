import { open } from '../tools/browser.mjs'
const U = 'http://localhost:5183/playground/locker-cards.html'
const log = {}
let b = await open({ url: U + '?seed=0', w: 360, h: 640, dpr: 2, device: 'lowend', now: '2026-08-12' })
await b.page.waitForTimeout(1600)
log.empty = await b.page.evaluate(() => ({ title: document.querySelector('.k-empty__title')?.textContent, btn: document.querySelector('.lcc-empty button')?.textContent, head: document.querySelector('.lcc-head').innerText.replace(/\n+/g, ' ') }))
await b.shot('locker-cards/empty-360', { settle: 100 })
await b.close()
b = await open({ url: U + '?seed=12&fx=lite', device: 'iphone', dpr: 2, now: '2026-08-12' })
const p = b.page
await p.waitForTimeout(1500)
log.lite = await p.evaluate(() => ({ fx: document.documentElement.dataset.fx, shine: document.querySelectorAll('.lcc-shine').length && getComputedStyle(document.querySelector('.lcc-shine')).display, cellT: getComputedStyle(document.querySelectorAll('.lcc-cell')[1]).transform }))
await p.click('.lcc-card[data-owned]'); await p.waitForTimeout(700)
const r = await p.evaluate(() => { const t = document.querySelector('[data-active] .lcc-tilt'); return { tf: getComputedStyle(t).transform, spec: getComputedStyle(t.querySelector('.lcc-spec')).display } })
log.liteViewer = r
await b.shot('locker-cards/viewer-lite-390', { settle: 100 })
console.log(JSON.stringify(log, null, 1), b.errors)
await b.close()
