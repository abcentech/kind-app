// obj-month verification: seeds, DOM assertions, a handful of screenshots.   node playground/obj-month.shots.mjs [only]
import { open } from '../tools/browser.mjs'
import { createRequire } from 'node:module'
const lib = createRequire(import.meta.url)('../src/content/library.json')
const SID = 'stewardship-code'
const S = lib.series[SID]
const URL0 = 'http://localhost:5183/playground/obj-month.html'
const key = (m, d) => `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

function seed({ upto = 15, claimed = [], all = false, sat = true } = {}) {
  const done = {}, results = {}, notes = {}, log = {}
  const n = all ? 31 : upto
  for (let d = 1; d <= n; d++) {
    done[d] = key(8, d)
    results[d] = { date: key(8, d), time: '07:10', right: d % 3 ? 5 : 4, asked: 5, perfect: d % 3 !== 0 && d < 7, xp: 60 }
    log[key(8, d)] = { lessons: 1, xp: 20 + ((d * 17) % 70), right: 5, goal: d % 2 === 0 }
  }
  for (let d = 1; d <= (all ? 6 : 5); d++) notes[d] = 'a note ' + d
  const claims = {}
  for (const id of claimed) claims[id] = key(8, n)
  return {
    v: 6, onboarded: true, name: 'Ada', role: 'teen', onboardedAt: key(8, 1), dailyGoalXp: 40,
    xp: 640, streak: n, best: n, lastDone: key(8, n), shields: 1, fragments: 1, claims,
    log, series: { [SID]: { done, results, notes, cards: all ? S.codes.map((c) => c.no) : [1, 2, 3], pos: {}, notesAt: {}, drops: {} } },
    achievements: { preflight: key(8, 1), 'first-launch': key(8, 2), 'streak-3': key(8, 4), 'streak-7': key(8, 8) }, achSeen: ['preflight', 'first-launch', 'streak-3', 'streak-7'],
  }
}
const allIds = [`m:${SID}:stage-1`, `m:${SID}:stage-2`, `m:${SID}:stage-3`, `m:${SID}:stage-4`, `m:${SID}:half`, `m:${SID}:perfect`, `m:${SID}:journal`, `m:${SID}:gold`, `m:${SID}:orbit`]

const only = process.argv[2]
const out = []
const say = (...a) => { out.push(a.join(' ')); console.log(...a) }

async function run(name, o, fn) {
  if (only && only !== name) return
  const b = await open({ url: URL0, ...o })
  await b.page.waitForSelector('.obm-month')
  await b.page.waitForTimeout(1500)
  say(`\n== ${name}`)
  await fn(b)
  if (b.errors.length) say('ERRORS', JSON.stringify(b.errors))
  await b.close()
}

const probe = (page) => page.evaluate(() => {
  const q = (s) => [...document.querySelectorAll(s)]
  const sc = document.querySelector('.shell-screen')
  return {
    overflowX: sc.scrollWidth - sc.clientWidth,
    rows: q('.obm-row').map((r) => ({ t: r.querySelector('.obm-title').textContent, st: r.dataset.st, frac: r.querySelector('.obm-frac')?.textContent || '', claim: !!r.querySelector('.obm-claim') })),
    tally: q('.obm-month .obm-tally')[0]?.textContent,
    sub: q('.obm-month .obm-sub')[0]?.textContent,
    medalTally: q('.obm-medals .obm-tally')[0]?.textContent,
    shelf: q('.obm-medal').length, next: q('.obm-up').map((u) => u.textContent),
    recapOpen: document.querySelector('.obm-recap')?.hasAttribute('data-open'), recapSum: document.querySelector('.obm-recap-sum')?.textContent,
    recapH: document.querySelector('.obm-recap-h')?.textContent,
    stats: q('.obm-stats .k-stat').map((s) => s.textContent),
    best: document.querySelector('.obm-best')?.textContent,
    small: q('.obm-sec *').filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 }).length,
  }
})

await run('sat-mid', { now: '2026-08-15', state: seed(), device: 'iphone', dpr: 2 }, async (b) => {
  const p = b.page
  say(JSON.stringify(await probe(p), null, 1))
  say(await b.shot('obj-month/mid-top', { settle: 200 }).then((f) => 'shot ' + f))
  // claim flow: first ready row
  await p.click('.obm-claim')
  await p.waitForTimeout(500)
  say('after claim:', JSON.stringify((await probe(p)).rows.map((r) => r.t + ':' + r.st)))
  say('toast:', await p.evaluate(() => document.querySelector('.k-toast')?.textContent))
  say('live:', await p.evaluate(() => document.querySelector('.obm-month .u-sr')?.textContent))
  say('check fresh:', await p.evaluate(() => !!document.querySelector('.obm-row[data-fresh] .obm-check')))
  await p.evaluate(() => document.querySelector('.obm-medals').scrollIntoView({ block: 'start' }))
  await p.waitForTimeout(1400)
  say(await b.shot('obj-month/mid-medals', { settle: 200 }).then((f) => 'shot ' + f))
  await p.click('.obm-all')
  say('goTab:', await p.evaluate(() => [document.querySelector('[data-testid=shell-log]')?.textContent, sessionStorage.getItem('kind-locker-seg')].join(' | ')))
  await p.evaluate(() => document.querySelector('.obm-recap').scrollIntoView({ block: 'end' }))
  await p.waitForTimeout(1400)
  say(await b.shot('obj-month/sat-recap', { settle: 200 }).then((f) => 'shot ' + f))
  // keyboard: toggle recap with Enter
  await p.focus('.obm-recap-btn'); await p.keyboard.press('Enter'); await p.waitForTimeout(600)
  say('recap after Enter open?', await p.evaluate(() => document.querySelector('.obm-recap').hasAttribute('data-open') + ' expanded=' + document.querySelector('.obm-recap-btn').getAttribute('aria-expanded')))
})

await run('tue', { now: '2026-08-11', state: seed({ upto: 10 }), device: 'iphone', dpr: 2 }, async (b) => {
  say(JSON.stringify(await probe(b.page)))
  await b.page.evaluate(() => document.querySelector('.obm-recap').scrollIntoView({ block: 'end' }))
  await b.page.waitForTimeout(400)
  say(await b.shot('obj-month/tue-recap', { settle: 200 }).then((f) => 'shot ' + f))
})

await run('new', { now: '2026-08-12', state: { onboarded: true, name: 'Ada', role: 'teen' }, device: 'lowend', dpr: 2 }, async (b) => {
  say(JSON.stringify(await probe(b.page)))
  say(await b.shot('obj-month/new-360', { settle: 200 }).then((f) => 'shot ' + f))
})

await run('complete', { now: '2026-08-31', state: seed({ all: true, claimed: allIds }), device: 'lowend', dpr: 2 }, async (b) => {
  say(JSON.stringify(await probe(b.page)))
  await b.page.evaluate(() => document.querySelector('.obm-finale').scrollIntoView({ block: 'end' }))
  await b.page.waitForTimeout(400)
  say(await b.shot('obj-month/complete-360', { settle: 200 }).then((f) => 'shot ' + f))
})

await run('series2', { now: '2026-08-15', state: seed(), url: URL0 + '?series=secrets-of-longevity&fx=lite', device: 'lowend', dpr: 2 }, async (b) => {
  say(JSON.stringify(await probe(b.page)))
})
