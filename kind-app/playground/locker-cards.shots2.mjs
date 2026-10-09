import { open } from '../tools/browser.mjs'
const U = 'http://localhost:5183/playground/locker-cards.html'
const log = {}
let b = await open({ url: U + '?seed=12', w: 360, h: 640, dpr: 2, device: 'lowend', now: '2026-08-12' })
await b.page.waitForTimeout(1500)
// scroll so a gold + locked cards show
const sc = await b.page.evaluate(() => { const g = document.querySelector('.lcc-card[data-rare][data-owned]'); g.scrollIntoView({ block: 'center' }); return g.closest('.lcc-cell').dataset.no })
await b.page.waitForTimeout(500)
await b.shot('locker-cards/grid-360-gold', { settle: 300 })
// locked tap
await b.page.click('.lcc-card:not([data-owned])')
await b.page.waitForTimeout(250)
log.toast = await b.page.evaluate(() => document.body.innerText.includes('Finish Day'))
log.shake = await b.page.evaluate(() => !!document.querySelector('.lcc-card.is-shake'))
// open gold viewer
await b.page.evaluate(() => document.querySelector('.lcc-card[data-rare][data-owned]').scrollIntoView({ block: 'center' }))
await b.page.waitForTimeout(300)
await b.page.click('.lcc-card[data-rare][data-owned]')
await b.page.waitForTimeout(1300)
const r = await b.page.evaluate(() => { const t = document.querySelector('[data-active] .lcc-tilt').getBoundingClientRect(); const v = document.querySelector('.lcc-col').getBoundingClientRect(); const q = document.querySelector('.lcc-quote').getBoundingClientRect(); const a = document.querySelector('.lcc-actions').getBoundingClientRect(); return { card: [t.x, t.y, t.width, t.height].map(Math.round), quote: [q.top, q.bottom].map(Math.round), actions: [a.top, a.bottom].map(Math.round), vh: innerHeight, title: document.querySelector('.lcc-vtitle').textContent, count: document.querySelector('.lcc-vcount').textContent } })
log.viewer = r
await b.page.mouse.move(r.card[0] + r.card[2] * 0.25, r.card[1] + r.card[3] * 0.2)
await b.page.waitForTimeout(700)
log.tiltVars = await b.page.evaluate(() => { const e = document.querySelector('[data-active] .lcc-tilt'); return [e.style.getPropertyValue('--rx'), e.style.getPropertyValue('--ry'), e.style.getPropertyValue('--gx'), e.style.getPropertyValue('--tilt-on')] })
await b.shot('locker-cards/viewer-gold-tilt', { settle: 100 })
console.log(JSON.stringify(log), b.errors)
await b.close()
