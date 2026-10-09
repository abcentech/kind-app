// complete-rank: does the stitch head ride the same clock as the stitch? Samples computed dashoffsets while the patch sews.
import { open } from '../tools/browser.mjs'
const b = await open({ url: 'http://localhost:5183/playground/complete-rank.html?case=patch-stewardship&bare=1', device: 'lowend', dpr: 2 })
await b.page.evaluate(() => {
  window.__rows = []
  const t0 = performance.now()
  const f = () => {
    const rev = document.querySelector('.cmk-patch__reveal'), head = document.querySelector('.cmk-patch__head:not(.is-glow)'), beat = document.querySelector('.cmk-patch')
    if (rev && head) window.__rows.push([Math.round(performance.now() - t0), parseFloat(getComputedStyle(rev).strokeDashoffset), parseFloat(getComputedStyle(head).strokeDashoffset), +getComputedStyle(head).opacity, beat.hasAttribute('data-sew') ? 1 : 0, beat.hasAttribute('data-done') ? 1 : 0])
  }
  window.__replay(); window.__iv = setInterval(f, 40); setTimeout(() => clearInterval(window.__iv), 5000)
})
await b.page.waitForTimeout(5600)
const rows = await b.page.evaluate(() => window.__rows)
const pick = rows.filter((r, i) => i % 4 === 0)
for (const [t, rev, head, op, sew, done] of pick) console.log(String(t).padStart(5), 'reveal p=', (1 - rev / 100).toFixed(2), 'head p=', (-head / 100).toFixed(2), 'op', op.toFixed(2), 'sew', sew, 'done', done)
console.log('errors', b.errors)
await b.close()
