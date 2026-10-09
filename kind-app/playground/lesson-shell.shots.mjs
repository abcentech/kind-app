// lesson-shell shots + mode checks:  node playground/lesson-shell.shots.mjs
//   A  long slide scrolled (top fade, text under the glass footer) @360x640
//   B  mid-swipe (the next slide peeking in) @390x844
//   C  lite mode: nav + swipe cross-fade, one layer after settle
//   D  real modules (stubs): the card-text fallback, zero errors
import { open } from '../tools/browser.mjs'
const base = 'http://localhost:5183/playground/lesson-shell.html'
let fails = 0
const ok = (c, m, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m + (x ? '  ' + x : '')) }
const settle = (page) => page.waitForFunction(() => document.querySelectorAll('.lesson-layer').length === 1, null, { timeout: 8000 }).catch(() => {})
const done = async (b) => { await Promise.race([b.close().catch(() => {}), new Promise((r) => setTimeout(r, 4000))]) }
const only = process.argv[2]

if (!only || only === 'A') {
  const b = await open({ url: base + '?day=12&long=1', device: 'lowend', dpr: 2 })
  await b.page.waitForTimeout(1300)
  for (let i = 0; i < 2; i++) { await b.page.keyboard.press('Enter'); await b.page.waitForTimeout(100); await settle(b.page); await b.page.waitForTimeout(150) }
  await b.page.evaluate(() => { const s = document.querySelector('.lesson-layer:not([aria-hidden]) .lesson-slide'); s.scrollTop = 120 })
  await b.page.waitForTimeout(300)
  const a = await b.page.evaluate(() => { const s = document.querySelector('.lesson-layer:not([aria-hidden]) .lesson-slide'); return { up: s.hasAttribute('data-up'), down: s.hasAttribute('data-down'), tab: s.tabIndex, mask: getComputedStyle(s).maskImage !== 'none' || getComputedStyle(s).webkitMaskImage !== 'none' } })
  ok(a.up && a.down && a.tab === 0 && a.mask, 'long slide: up+down edges, focusable, masked', JSON.stringify(a))
  console.log(await b.shot('lesson-shell/long-360', { settle: 150 }))
  ok(b.errors.length === 0, 'A: no errors', JSON.stringify(b.errors))
  await done(b)
}

if (!only || only === 'B') {
  const b = await open({ url: base + '?day=12', device: 'iphone', dpr: 1 })
  const p = b.page
  await p.waitForTimeout(1300)
  await p.keyboard.press('Enter'); await p.waitForTimeout(100); await settle(p)
  await p.mouse.move(320, 420); await p.mouse.down()
  for (let i = 1; i <= 8; i++) { await p.mouse.move(320 - i * 16, 421); await p.waitForTimeout(16) }
  await p.waitForTimeout(120)
  const mid = await p.evaluate(() => [...document.querySelectorAll('.lesson-layer')].map((l) => Math.round(l.getBoundingClientRect().x)))
  ok(mid.length === 2 && mid[0] < 0 && mid[1] > 0 && mid[1] < 390, 'mid-swipe: two layers, next slide peeking in from the right', JSON.stringify(mid))
  console.log(await b.shot('lesson-shell/mid-swipe-390', { settle: 100 }))
  await p.mouse.up(); await settle(p)
  const r = await p.evaluate(() => document.querySelector('.lesson-count').textContent)
  ok(r === '03/17', 'released past the threshold: paged forward', r)
  ok(b.errors.length === 0, 'B: no errors', JSON.stringify(b.errors))
  await done(b)
}

if (!only || only === 'C') {
  const b = await open({ url: base + '?day=12&fx=lite', device: 'lowend', dpr: 1, reduceMotion: true })
  const p = b.page
  await p.waitForTimeout(1200)
  const fx = await p.evaluate(() => document.documentElement.dataset.fx)
  await p.keyboard.press('Enter'); await p.waitForTimeout(60); await settle(p)
  let c = await p.evaluate(() => document.querySelector('.lesson-count').textContent)
  ok(fx === 'lite' && c === '02/17', 'lite: Enter advances (cross-fade)', c)
  await p.mouse.move(300, 300); await p.mouse.down()
  for (let i = 1; i <= 8; i++) { await p.mouse.move(300 - i * 28, 301); await p.waitForTimeout(12) }
  await p.mouse.up(); await p.waitForTimeout(60); await settle(p)
  c = await p.evaluate(() => document.querySelector('.lesson-count').textContent)
  ok(c === '03/17', 'lite: swipe pages with a fade', c)
  const t = await p.evaluate(() => getComputedStyle(document.querySelector('.lesson')).animationDuration)
  ok(parseFloat(t) < 0.05, 'lite: entry animation collapses', t)
  ok(b.errors.length === 0, 'C: no errors', JSON.stringify(b.errors))
  await done(b)
}

if (!only || only === 'D') {
  let b = await open({ url: base + '?day=12&blank=1', device: 'lowend', dpr: 1 })
  let p = b.page
  await p.waitForTimeout(1400)
  const d = await p.evaluate(() => ({ fb: !!document.querySelector('.lesson-fallback'), txt: document.querySelector('.lesson-fallback')?.textContent?.slice(0, 60) || '' }))
  ok(d.fb && d.txt.length > 0, 'blank slide: the shell shows the card text instead of a black screen', JSON.stringify(d))
  await done(b)
  // the real slide + exercise modules: walk every reading card to the first check
  b = await open({ url: base + '?day=12&real=1', device: 'lowend', dpr: 2 })
  p = b.page
  await p.waitForTimeout(1500)
  let guard = 0
  while (guard++ < 20 && !(await p.evaluate(() => !!document.querySelector('.lesson-foot[data-off]')))) { await p.keyboard.press('Enter'); await p.waitForTimeout(120); await settle(p); await p.waitForTimeout(120) }
  const e = await p.evaluate(() => ({ count: document.querySelector('.lesson-count').textContent, ex: !!document.querySelector('.lesson-layer .lesson-ex *'), h: Math.round(document.querySelector('.lesson-ex').getBoundingClientRect().height), stage: Math.round(document.querySelector('.lesson-stage').getBoundingClientRect().height) }))
  ok(e.ex && e.h === e.stage, 'real exercise step fills the whole stage', JSON.stringify(e))
  console.log(await b.shot('lesson-shell/real-check-360', { settle: 400 }))
  ok(b.errors.length === 0, 'D: no errors', JSON.stringify(b.errors))
  await done(b)
}
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
