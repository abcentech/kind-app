// complete-rank: geometry probe. Loads every case at the given device(s), waits for the choreography to rest and prints
// what overflows, what overlaps CONTINUE, and what text is clipped. No screenshots.   node playground/complete-rank.probe.mjs [lowend|iphone|se] [lite]
import { open } from '../tools/browser.mjs'

const device = process.argv[2] || 'lowend'
const lite = process.argv.includes('lite')
const base = 'http://localhost:5183/playground/complete-rank.html'
const cases = ['rank', 'up-steward', 'up-pathfinder', 'up-pioneer', 'medal-1', 'medals-3', 'medals-rare', 'patch-stewardship', 'patch-longevity']
const b = await open({ url: `${base}?case=rank&bare=1${lite ? '&fx=lite' : ''}`, device, dpr: 2 })
const out = []
for (const c of cases) {
  await b.page.goto(`${base}?case=${c}&bare=1${lite ? '&fx=lite' : ''}`, { waitUntil: 'networkidle' })
  const waitMs = c.startsWith('medal') ? 1400 : 3200
  await b.page.waitForTimeout(waitMs)
  // medals-3: step to the summary too
  const probe = () => b.page.evaluate(() => {
    const W = innerWidth, H = innerHeight
    const beat = document.querySelector('.cmk-beat')
    if (!beat) return { error: 'no beat' }
    const r = (el) => { const x = el.getBoundingClientRect(); return { t: Math.round(x.top), b: Math.round(x.bottom), l: Math.round(x.left), r: Math.round(x.right), w: Math.round(x.width), h: Math.round(x.height) } }
    const foot = beat.querySelector('.cmk-foot'), body = beat.querySelector('.cmk-body')
    const cta = beat.querySelector('.k-btn')
    const kids = [...body.querySelectorAll('h2, p, figure, .cmk-band, .cmk-xp, .cmk-up__next, .cmk-eyebrow, .cmk-medal__art, .cmk-up__ins, .cmk-patch__art, .cmk-sum__grid, .cmk-bar__ins')]
      .filter((e) => getComputedStyle(e).display !== 'none')
    const last = kids.reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom), 0)
    const first = kids.reduce((m, e) => Math.min(m, e.getBoundingClientRect().top), 1e9)
    const wide = kids.filter((e) => { const x = e.getBoundingClientRect(); return x.right > W + 0.5 || x.left < -0.5 }).map((e) => e.className || e.tagName)
    const clip = kids.filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map((e) => e.className)
    const name = beat.querySelector('.cmk-up__name, .cmk-patch__name, .cmk-medal__title, .cmk-bar__name')
    const nameBox = name ? { ...r(name), fs: getComputedStyle(name).fontSize, lines: Math.round(name.getBoundingClientRect().height / parseFloat(getComputedStyle(name).lineHeight)) } : null
    const styleOf = (sel, prop) => { const e = beat.querySelector(sel); return e ? getComputedStyle(e)[prop] : null }
    return {
      vp: [W, H], top: Math.round(first), contentBottom: Math.round(last), footTop: foot ? Math.round(foot.getBoundingClientRect().top) : null,
      gapToFoot: foot ? Math.round(foot.getBoundingClientRect().top - last) : null, cta: cta ? r(cta) : null, wide, clip, name: nameBox,
      attrs: beat.getAttributeNames().filter((a) => a.startsWith('data-')).join(' '),
      footVisible: foot ? getComputedStyle(foot).visibility : null,
      fonts: { display: document.fonts.check('700 32px "Barlow Condensed"'), serif: document.fonts.check('italic 20px "Newsreader Variable"') },
    }
  })
  let res = await probe()
  if (c === 'medals-3') {
    const first = res
    await b.page.waitForTimeout(8800)           // auto-advance through three medals into the stack
    const stack = await b.page.evaluate(() => ({ stack: !!document.querySelector('.cmk-sum'), items: document.querySelectorAll('.cmk-sum__item').length, nexts: window.__nexts() }))
    res = { first, afterAuto: stack, summary: await probe() }
  }
  out.push([c, res])
}
for (const [c, r] of out) console.log(c, JSON.stringify(r))
console.log('errors', b.errors)
await b.close()
