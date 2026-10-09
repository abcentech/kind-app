// Dependency-free test for src/store.js + src/lib.js.   node tools/test-store.mjs [--once] [--verbose]
//
// Fakes localStorage, patches Date.now() as the injectable clock (now.js is built on it), and registers a tiny loader so
// node can import the library JSON the way Vite does. By default the suite re-runs itself under four time zones
// (Lagos, New York — which changes DST on 1 Nov 2026 — Auckland, UTC); --once runs the current zone only.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { register } from 'node:module'
import assert from 'node:assert/strict'

const VERBOSE = process.argv.includes('--verbose')
if (!process.env.KIND_TEST_CHILD && !process.argv.includes('--once')) {
  let bad = 0
  for (const tz of ['Africa/Lagos', 'America/New_York', 'Pacific/Auckland', 'UTC']) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
      env: { ...process.env, TZ: tz, KIND_TEST_CHILD: '1' }, stdio: 'inherit',
    })
    if (r.status) bad++
  }
  console.log(bad ? `\nFAILED in ${bad} time zone(s)` : '\nall time zones green')
  process.exit(bad ? 1 : 0)
}

register('data:text/javascript,' + encodeURIComponent(`
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) return { format: 'module', source: 'export default ' + readFileSync(fileURLToPath(url), 'utf8'), shortCircuit: true }
  return nextLoad(url, context)
}`), import.meta.url)

/* ---- the fake world ------------------------------------------------------ */
const mem = new Map()
let writes = 0
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { if (k === 'kind-app-v4') writes++; mem.set(k, String(v)) },
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
}
const realNow = Date.now.bind(Date)
let fake = null
Date.now = () => (fake ?? realNow())
const clock = (iso) => { fake = new Date(iso.length <= 10 ? iso + 'T09:00:00' : iso).getTime() }
const ATIME = (key, hhmm = '19:00') => clock(`${key}T${hhmm}:00`)

const S = await import('../src/store.js')
const L = await import('../src/lib.js')
const React = await import('react')
const { renderToString } = await import('react-dom/server')
const C = await import('../src/copy.js').catch(() => null) // the copy module, when it exists: shapes are checked against it
const AUG = 'stewardship-code'
const JUL = 'secrets-of-longevity'
const augS = L.getSeries(AUG)
const julS = L.getSeries(JUL)
const KEY = 'kind-app-v4'

/* ---- harness ------------------------------------------------------------- */
let passed = 0
const failures = []
const notes = []
function t(name, fn) {
  try { fn(); passed++; if (VERBOSE) console.log('  ok  ' + name) } catch (e) { failures.push({ name, e }) }
}
const note = (s) => notes.push(s)
const addDays = L.addDays

/** Start from a brand-new install with the clock at `iso`. */
function begin(iso = '2026-10-02T09:00', { goal = 40, salt = 'test', onboard = true } = {}) {
  clock(iso)
  mem.clear()
  S.reload()
  S.dev.set({ salt })
  if (onboard) S.completeOnboarding({ name: 'Test', role: 'teen', dailyGoal: goal })
  writes = 0
}
/** Answer `asked` questions (the first `right` correctly) and finish the day, on the current clock. */
function play(sid, day, { right = 4, asked = 4 } = {}) {
  let xp = 0
  for (let i = 0; i < asked; i++) xp += S.scoreAnswer(i < right, { seriesId: sid, day })
  return S.finishDay(sid, day, xp, { right, asked })
}
const playOn = (key, sid, day, opts, hhmm = '19:00') => { ATIME(key, hhmm); return play(sid, day, opts) }
/** Pre-persist plain-XP drops for these days (a stored drop always wins), so shield/fragment counts are exactly what the test sets up. */
function quiet(sid, days) {
  const st = S.snapshot()
  const sb = st.series[sid] || { done: {}, pos: {}, notes: {}, notesAt: {}, cards: [], results: {}, drops: {} }
  const drops = { ...sb.drops }
  for (const d of days) drops[d] = { kind: 'xp', xp: 10, rarity: 'common' }
  S.dev.set({ series: { ...st.series, [sid]: { ...sb, drops } } })
}
const saltWith = (kind, sid, day) => {
  for (let i = 0; i < 20000; i++) { const salt = 'k' + i; if (S.rollDrop(S.dropSeedFor({ salt }, sid, day)).kind === kind) return salt }
  throw new Error('no salt for ' + kind)
}
const OCT = (n) => `2026-10-${String(n).padStart(2, '0')}`
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

/* ======================================================================== *
 *  lib: dates, modes, current day, unlocking
 * ======================================================================== */
t('date keys: add/diff/weekday are DST-proof', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(L.diffDays('2026-10-31', '2026-11-02'), 2) // New York falls back on 1 Nov
  assert.equal(L.diffDays('2026-03-07', '2026-03-09'), 2)
  assert.equal(L.weekdayOf('2026-08-02'), 0) // the first Selah is a Sunday
  assert.equal(L.weekdayOf('2026-10-02'), 5)
  assert.equal(L.fmtKey('2026-08-12'), 'Wed 12 Aug')
  assert.equal(L.fmtDay(augS, 2), 'Sun 2 Aug')
})
t('fmtCountdown', () => {
  assert.equal(L.fmtCountdown(8049000), '02:14:09')
  assert.equal(L.fmtCountdown(8049000, { prefix: 'T-' }), 'T-02:14:09')
  assert.equal(L.fmtCountdown(0), '00:00:00')
  assert.equal(L.fmtCountdown(-5), '00:00:00')
  assert.equal(L.fmtCountdown(5 * 864e5 + 3 * 36e5), '5d 03h')
  assert.equal(L.fmtCountdown(99 * 36e5), '99:00:00')
})
t('modeOf: upcoming / live / archive at the month edges', () => {
  const m = (iso, s = augS) => L.modeOf(s, new Date(iso))
  assert.equal(m('2026-07-31T23:59:59'.replace('Z', '')), 'upcoming')
  assert.equal(L.modeOf(augS, new Date(2026, 6, 31, 23, 59, 59)), 'upcoming')
  assert.equal(L.modeOf(augS, new Date(2026, 7, 1, 0, 0, 0)), 'live')
  assert.equal(L.modeOf(augS, new Date(2026, 7, 31, 23, 59, 59)), 'live')
  assert.equal(L.modeOf(augS, new Date(2026, 8, 1, 0, 0, 0)), 'archive')
  assert.equal(L.modeOf(julS, new Date(2026, 9, 2, 9)), 'archive')
  assert.equal(L.modeOf(augS, new Date(2026, 9, 2, 9)), 'archive')
  assert.equal(L.modeOf(julS, new Date(2026, 7, 12, 9)), 'archive')
})
t('activeSeriesId follows the calendar', () => {
  assert.equal(L.activeSeriesId(new Date(2026, 9, 2, 9)), AUG)
  assert.equal(L.activeSeriesId(new Date(2026, 7, 12, 9)), AUG)
  assert.equal(L.activeSeriesId(new Date(2026, 6, 15, 9)), JUL)
  assert.equal(L.activeSeriesId(new Date(2026, 5, 1, 9)), JUL) // nothing live yet: the soonest upcoming
  assert.equal(L.activeSeriesId(new Date(2027, 0, 1, 9)), AUG) // nothing live: the newest finished
})
t('currentDay: live = today (capped), upcoming = 1', () => {
  const none = { series: {} }
  assert.equal(L.currentDay(augS, none, new Date(2026, 7, 12, 9)), 12)
  assert.equal(L.currentDay(augS, none, new Date(2026, 7, 31, 23, 59)), 31)
  assert.equal(L.currentDay(augS, none, new Date(2026, 7, 1, 0, 0)), 1)
  assert.equal(L.currentDay(augS, none, new Date(2026, 6, 15, 9)), 1)
  assert.equal(L.currentDay(julS, none, new Date(2026, 6, 31, 12)), 31)
})
t('currentDay: archive = first unfinished day, last day when all done — both series', () => {
  const arch = new Date(2026, 9, 2, 9)
  for (const s of [augS, julS]) {
    const mk = (days) => ({ series: { [s.id]: { done: Object.fromEntries(days.map((d) => [d, '2026-09-01'])) } } })
    assert.equal(L.currentDay(s, mk([]), arch), 1)
    assert.equal(L.currentDay(s, mk([1, 2, 3, 4, 5]), arch), 6)
    assert.equal(L.currentDay(s, mk([1, 2, 4, 5]), arch), 3) // first gap, not last+1
    assert.equal(L.currentDay(s, mk(range(1, 30)), arch), 31)
    assert.equal(L.currentDay(s, mk(range(1, 31)), arch), 31)
  }
  // rest days are never required
  const withRest = { ...augS, calendar: augS.calendar.map((d) => (d.day === 3 ? { ...d, type: 'rest', episode: undefined } : d)) }
  const st = { series: { [AUG]: { done: { 1: 'x', 2: 'x' } } } }
  assert.equal(L.currentDay(withRest, st, arch), 4)
})
t('isUnlocked / nextUnlockAt: live days open at 06:00 on their own date', () => {
  const none = { series: {} }
  const before = new Date(2026, 7, 12, 5, 59, 59)
  const at6 = new Date(2026, 7, 12, 6, 0, 0)
  assert.equal(L.isUnlocked(augS, 11, none, before), true)
  assert.equal(L.isUnlocked(augS, 12, none, before), false)
  assert.equal(L.isUnlocked(augS, 12, none, at6), true)
  assert.equal(L.isUnlocked(augS, 13, none, at6), false)
  assert.deepEqual(L.nextUnlockAt(augS, 13, at6), new Date(2026, 7, 13, 6, 0, 0))
  assert.equal(L.nextUnlockAt(augS, 12, at6), null)
  assert.equal(L.isUnlocked(augS, 0, none, at6), false)
  assert.equal(L.isUnlocked(augS, 32, none, at6), false)
})
t('isUnlocked: archive opens everything, upcoming opens nothing', () => {
  const none = { series: {} }
  const arch = new Date(2026, 9, 2, 9)
  for (const d of [1, 15, 31]) { assert.equal(L.isUnlocked(augS, d, none, arch), true); assert.equal(L.nextUnlockAt(augS, d, arch), null) }
  const up = new Date(2026, 6, 15, 9)
  assert.equal(L.isUnlocked(augS, 1, none, up), false)
  assert.deepEqual(L.nextUnlockAt(augS, 1, up), new Date(2026, 7, 1, 6, 0, 0))
})

/* ---- stages ---------------------------------------------------------------- */
t('stages: every day belongs to exactly one stage; null-week days join their neighbour', () => {
  assert.equal(L.stageOf(augS, 2), 0)
  assert.equal(L.stageOf(julS, 1), 0)
  assert.deepEqual(L.stageDays(augS).map((d) => d.length), [9, 7, 7, 8])
  assert.deepEqual(L.stageDays(julS).map((d) => d.length), [5, 6, 6, 6, 8])
  for (const s of [augS, julS]) {
    const all = L.stageDays(s).flat().sort((a, b) => a - b)
    assert.deepEqual(all, range(1, 31))
    assert.equal(L.stageDays(s).length, s.weeks.length)
  }
})
t('stageStats: cleared / current / locked / open', () => {
  const at = new Date(2026, 7, 12, 9)
  const done = Object.fromEntries(range(1, 9).map((d) => [d, '2026-08-01']))
  const st = { series: { [AUG]: { done } } }
  const all = L.stages(augS, st, at)
  assert.equal(all[0].cleared, true); assert.equal(all[0].state, 'cleared'); assert.equal(all[0].pct, 1)
  assert.equal(all[1].state, 'current'); assert.equal(all[1].done, 0); assert.equal(all[1].total, 7)
  assert.equal(all[2].state, 'locked') // starts Aug 17
  assert.equal(all[3].state, 'locked')
  assert.equal(all[0].name, 'Ownership'); assert.equal(all[0].n, 1); assert.equal(all[0].slot, 1)
  const arch = L.stages(augS, { series: {} }, new Date(2026, 9, 2, 9))
  assert.deepEqual(arch.map((x) => x.state), ['current', 'open', 'open', 'open'])
})
t('journey / dayState describe the Ascent', () => {
  const at = new Date(2026, 7, 12, 9)
  const j = L.journey(augS, { series: { [AUG]: { done: { 1: 'x', 3: 'x' } } } }, at)
  assert.equal(j.mode, 'live'); assert.equal(j.currentDay, 12); assert.equal(j.stages.length, 4)
  const byDay = Object.fromEntries(j.stages.flatMap((x) => x.nodes).map((n) => [n.day, n]))
  assert.equal(byDay[1].state, 'done'); assert.equal(byDay[2].state, 'open'); assert.equal(byDay[12].state, 'current')
  assert.equal(byDay[13].state, 'locked'); assert.ok(byDay[13].unlockAt instanceof Date)
  assert.equal(byDay[8].rare, true) // code card 7 is gold
  assert.equal(Object.keys(byDay).length, 31)
})

/* ---- deck, minutes, teaser, titles --------------------------------------- */
t('deckFor: stable unique ids, declaration last, no emoji, fresh arrays — every day of both series', () => {
  const EMOJI = /[\p{Extended_Pictographic}️]/u
  for (const s of [augS, julS]) {
    for (const d of s.calendar) {
      const a = L.deckFor(s, d.day)
      const b = L.deckFor(s, d.day)
      assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id), `ids stable ${s.id} d${d.day}`)
      assert.equal(new Set(a.map((c) => c.id)).size, a.length, `ids unique ${s.id} d${d.day}`)
      assert.equal(a[0].kind, 'open'); assert.equal(a.at(-1).kind, 'declare', `declaration last ${s.id} d${d.day}`)
      assert.ok(a.at(-1).lines.length >= 1)
      for (const c of a) {
        assert.ok(typeof c.id === 'string' && c.id, 'id'); assert.ok(Number.isFinite(c.secs) && c.secs >= 0, 'secs')
        assert.ok(!('emoji' in c), 'no emoji field'); assert.ok(!EMOJI.test(JSON.stringify(c)), `no emoji glyphs ${s.id} d${d.day} ${c.id}`)
      }
      a.pop(); assert.equal(L.deckFor(s, d.day).length, b.length, 'a returned deck is a copy')
    }
  }
})
t('deckFor: the watch card resolves the videoId when the day has one', () => {
  let watched = 0
  for (const s of [augS, julS]) for (const d of s.calendar) {
    const watch = L.deckFor(s, d.day).find((c) => c.kind === 'watch')
    if (d.videoId && L.epOf(s, d)) { assert.equal(watch?.videoId, d.videoId); assert.match(watch.url, /watch\?v=/); watched++ }
    else assert.equal(watch, undefined)
  }
  assert.ok(watched >= 5, 'July has mapped episodes')
  // an override map resolves too
  // (a day's own mapped video wins; the override map fills days that have none)
  const bare = augS.calendar.find((d) => !d.videoId && L.epOf(augS, d))
  if (bare) {
    const patched = { ...augS, videos: { [bare.day]: 'abcDEF12345' } }
    assert.equal(L.deckFor(patched, bare.day).find((c) => c.kind === 'watch')?.videoId, 'abcDEF12345')
  }
})
t('deckFor: July Selah days recap the week from its episodes', () => {
  const deck = L.deckFor(julS, 5)
  assert.ok(deck.some((c) => c.id === 'recap' && /Life Is Authored by God/.test(c.body)))
})
t('estimateMinutes: honest and bounded', () => {
  for (const s of [augS, julS]) for (const d of s.calendar) {
    const m = L.estimateMinutes(s, d.day)
    assert.ok(Number.isInteger(m) && m >= 2 && m <= 12, `${s.id} d${d.day} → ${m}`)
  }
  const teach = [3, 4, 5, 6, 7, 10, 11, 12].map((d) => L.estimateMinutes(augS, d))
  assert.ok(teach.every((m) => m >= 3 && m <= 8), 'teaching days land near the 5–6 min promised: ' + teach)
})
t('teaserFor: one clean line for every day', () => {
  for (const s of [augS, julS]) for (const d of s.calendar) {
    const x = L.teaserFor(s, d.day)
    assert.ok(x && x.length >= 12 && x.length <= 112, `${s.id} d${d.day}: "${x}"`)
    assert.ok(!/\*|\n/.test(x))
  }
  assert.match(L.teaserFor(augS, 3), /^Your name is on the phone\./)
})
t('title(): ALL-CAPS → title case, small words down, mixed case untouched', () => {
  assert.equal(L.title('FAITHFUL IN LITTLE'), 'Faithful in Little')
  assert.equal(L.title('NEEDS, WANTS AND PRESSURE'), 'Needs, Wants and Pressure')
  assert.equal(L.title('CRACK THE STEWARDSHIP CODE'), 'Crack the Stewardship Code')
  assert.equal(L.title('MULTIPLY, DON’T CONSUME EVERYTHING'), 'Multiply, Don’t Consume Everything')
  assert.equal(L.title('Life Is Authored by God'), 'Life Is Authored by God')
  assert.equal(L.title('A NOTE ON THE KJV'), 'A Note on the KJV')
  assert.equal(L.dayLabel(augS, 8), 'The Ownership Covenant')
  assert.equal(L.dayLabel(augS, 10), 'Faithful in Little')
})

/* ======================================================================== *
 *  Ranks
 * ======================================================================== */
t('RANKS: ≥ 7, strictly increasing, rankFor edges', () => {
  assert.ok(S.RANKS.length >= 7)
  assert.equal(S.RANKS[0].xp, 0)
  for (let i = 1; i < S.RANKS.length; i++) assert.ok(S.RANKS[i].xp > S.RANKS[i - 1].xp)
  assert.deepEqual(S.RANKS.map((r) => r.name).slice(0, 7), ['Seeker', 'Steward', 'Builder', 'Keeper', 'Pathfinder', 'Commander', 'Pioneer'])
  const r0 = S.rankFor(0)
  assert.equal(r0.index, 0); assert.equal(r0.pct, 0); assert.equal(r0.toNext, S.RANKS[1].xp); assert.equal(r0.next.name, 'Steward')
  const edge = S.RANKS[1].xp
  assert.equal(S.rankFor(edge - 1).index, 0); assert.equal(S.rankFor(edge - 1).toNext, 1)
  assert.equal(S.rankFor(edge).index, 1); assert.equal(S.rankFor(edge).pct, 0)
  const top = S.rankFor(10 ** 7)
  assert.equal(top.index, S.RANKS.length - 1); assert.equal(top.next, null); assert.equal(top.pct, 1); assert.equal(top.toNext, 0); assert.equal(top.max, true)
  assert.equal(S.rankFor(-5).index, 0); assert.equal(S.rankFor('x').index, 0); assert.equal(S.rankFor(undefined).xp, 0)
  const mid = S.rankFor((S.RANKS[2].xp + S.RANKS[3].xp) / 2)
  assert.ok(Math.abs(mid.pct - 0.5) < 0.01)
})

/* ======================================================================== *
 *  Streaks, shields, Selah grace
 * ======================================================================== */
t('streak: consecutive days climb; a second lesson the same day does not', () => {
  begin(); quiet(AUG, [1, 2, 3, 4])
  const a = playOn(OCT(2), AUG, 1)
  assert.deepEqual([a.streak.from, a.streak.to, a.streak.extended], [0, 1, true])
  const b = playOn(OCT(2), AUG, 2) // same date, another lesson
  assert.deepEqual([b.streak.from, b.streak.to, b.streak.extended], [1, 1, false])
  const c = playOn(OCT(3), AUG, 3)
  assert.deepEqual([c.streak.from, c.streak.to], [1, 2])
  const d = playOn(OCT(4), AUG, 4)
  assert.equal(d.streak.to, 3); assert.equal(d.streak.milestone, 3)
  const st = S.snapshot()
  assert.equal(st.streak, 3); assert.equal(st.best, 3); assert.equal(st.lastDone, OCT(4)); assert.equal(st.covered, OCT(4))
})
t('streak: a missed day with no shield ends it — day 1 starts again, best is kept', () => {
  begin(); quiet(AUG, [1, 2, 3])
  playOn(OCT(5), AUG, 1); playOn(OCT(6), AUG, 2) // Mon, Tue
  const r = playOn(OCT(8), AUG, 3) // Wed 7 Oct missed (not a rest day)
  assert.equal(r.streak.broke, true); assert.equal(r.streak.lostFrom, 2)
  assert.deepEqual([r.streak.from, r.streak.to], [0, 1])
  assert.equal(S.snapshot().best, 2); assert.equal(S.snapshot().streak, 1)
})
t('streak: Selah grace in archive — a missed Sunday is free', () => {
  begin(); quiet(AUG, [1, 2])
  playOn(OCT(3), AUG, 1) // Sat
  const r = playOn(OCT(5), AUG, 2) // Mon; Sun 4 Oct skipped
  assert.deepEqual([r.streak.from, r.streak.to, r.streak.shieldUsed, r.streak.graced], [1, 2, 0, 1])
  assert.equal(S.snapshot().saves[OCT(4)], 'selah')
})
t('streak: Selah grace in a live month follows the series calendar (Aug 9 is Selah)', () => {
  begin('2026-08-08T19:00'); quiet(AUG, [8, 10, 3, 5])
  playOn('2026-08-08', AUG, 8)
  const r = playOn('2026-08-10', AUG, 10) // Sun 9 Aug = Selah
  assert.deepEqual([r.streak.to, r.streak.graced, r.streak.shieldUsed], [2, 1, 0])
  // …but a missed teaching day breaks it
  begin('2026-08-03T19:00'); quiet(AUG, [3, 5])
  playOn('2026-08-03', AUG, 3)
  const b = playOn('2026-08-05', AUG, 5) // Tue 4 Aug is a teaching day
  assert.equal(b.streak.broke, true); assert.equal(b.streak.to, 1)
})
t('streak: July Selah days are NOT Sundays — the calendar decides, and a Sunday teaching day is not free', () => {
  begin('2026-07-10T19:00'); quiet(JUL, [10, 12, 11, 13])
  playOn('2026-07-10', JUL, 10)
  const r = playOn('2026-07-12', JUL, 12) // Sat 11 Jul = day 11 = Selah
  assert.deepEqual([r.streak.to, r.streak.graced], [2, 1])
  begin('2026-07-11T19:00'); quiet(JUL, [11, 13])
  playOn('2026-07-11', JUL, 11)
  const b = playOn('2026-07-13', JUL, 13) // Sun 12 Jul = day 12 = teaching: missed, no shield
  assert.equal(b.streak.broke, true)
})
t('shields: +1 at every 7-day streak, max 2, the 3rd converts to XP', () => {
  begin(); quiet(AUG, range(1, 22))
  const out = {}
  for (let i = 1; i <= 22; i++) out[i] = playOn(OCT(1 + i), AUG, i)
  assert.equal(out[6].streak.shields, 0)
  assert.equal(out[7].streak.shieldEarned, 'shield'); assert.equal(out[7].streak.shields, 1)
  assert.equal(out[13].streak.shields, 1)
  assert.equal(out[14].streak.shieldEarned, 'shield'); assert.equal(out[14].streak.shields, 2)
  assert.equal(out[21].streak.shieldEarned, 'xp'); assert.equal(out[21].streak.shields, 2)
  assert.ok(out[21].xp.lines.some((l) => l.id === 'shield-overflow' && l.xp === S.XP.shieldOverflow))
  assert.equal(out[8].streak.shieldEarned, null)
  assert.equal(S.snapshot().shields, 2)
})
t('shields: auto-spent on a missed day; the streak carries on, the day is marked', () => {
  begin(); quiet(AUG, range(1, 9))
  for (let i = 1; i <= 7; i++) playOn(OCT(1 + i), AUG, i) // 2–8 Oct, streak 7, 1 shield
  assert.equal(S.snapshot().shields, 1)
  ATIME(OCT(10)) // Fri 9 Oct missed → shield
  const info = S.streakInfo(S.snapshot(), new Date(2026, 9, 10, 19, 0))
  assert.equal(info.count, 7); assert.equal(info.alive, true); assert.deepEqual(info.pending, { shield: 1, grace: 0 }); assert.equal(info.shields, 0); assert.equal(info.held, 1)
  assert.equal(S.snapshot().shields, 1, 'peeking does not spend')
  const r = playOn(OCT(10), AUG, 8)
  assert.deepEqual([r.streak.from, r.streak.to, r.streak.shieldUsed, r.streak.broke], [7, 8, 1, false])
  assert.equal(S.snapshot().shields, 0); assert.equal(S.snapshot().saves[OCT(9)], 'shield'); assert.equal(S.snapshot().stats.shieldsUsed, 1)
  assert.ok(r.achievements.includes('shield-saver'))
})
t('shields: one shield cannot cover two missed days', () => {
  begin(); quiet(AUG, range(1, 9))
  for (let i = 1; i <= 7; i++) playOn(OCT(1 + i), AUG, i)
  const r = playOn(OCT(11), AUG, 8) // missed Fri 9 (shield) and Sat 10 (nothing left)
  assert.equal(r.streak.broke, true); assert.equal(r.streak.lostFrom, 7); assert.equal(r.streak.to, 1)
  assert.equal(r.streak.shieldUsed, 0, 'a shield that cannot save the streak is not spent'); assert.equal(S.snapshot().shields, 1); assert.equal(S.snapshot().stats.shieldsUsed, 0)
})
t('shields: two shields cover two missed days, a third ends it', () => {
  begin(); quiet(AUG, range(1, 16))
  for (let i = 1; i <= 14; i++) playOn(OCT(1 + i), AUG, i) // 2–15 Oct, 2 shields
  assert.equal(S.snapshot().shields, 2)
  const ok = playOn(OCT(18), AUG, 15) // missed Fri 16, Sat 17
  assert.deepEqual([ok.streak.to, ok.streak.shieldUsed], [15, 2]); assert.equal(S.snapshot().shields, 0)
  begin(); quiet(AUG, range(1, 16))
  for (let i = 1; i <= 14; i++) playOn(OCT(1 + i), AUG, i)
  const bad = playOn(OCT(19), AUG, 15) // missed Fri 16, Sat 17, Sun 18 (grace) → grace is free, so still fine!
  assert.deepEqual([bad.streak.to, bad.streak.shieldUsed, bad.streak.graced], [15, 2, 1])
  const worse = (() => { begin(); quiet(AUG, range(1, 16)); for (let i = 1; i <= 14; i++) playOn(OCT(1 + i), AUG, i); return playOn(OCT(20), AUG, 15) })() // Mon 19 missed too
  assert.equal(worse.streak.broke, true); assert.equal(worse.streak.shieldUsed, 0); assert.equal(S.snapshot().shields, 2, 'both shields kept for the next streak')
})
t('shields: grace is tried BEFORE a shield, so a free Sunday never wastes one', () => {
  begin(); quiet(AUG, range(1, 12))
  for (let i = 1; i <= 9; i++) playOn(OCT(1 + i), AUG, i) // 2–10 Oct: streak 9, 1 shield
  assert.equal(S.snapshot().shields, 1)
  const r = playOn(OCT(12), AUG, 10) // Sun 11 Oct skipped
  assert.deepEqual([r.streak.to, r.streak.graced, r.streak.shieldUsed], [10, 1, 0])
  assert.equal(S.snapshot().shields, 1)
})
t('shields: the cap is 2 for every source (drop shield at the cap becomes XP)', () => {
  const salt = saltWith('shield', AUG, 1)
  begin(); S.dev.set({ salt, shields: 2 })
  const r = playOn(OCT(2), AUG, 1)
  assert.equal(r.drop.kind, 'shield'); assert.equal(r.drop.converted, true); assert.equal(r.xp.drop, S.XP.shieldOverflow); assert.equal(S.snapshot().shields, 2)
  begin(); S.dev.set({ salt, shields: 1 })
  const r2 = playOn(OCT(2), AUG, 1)
  assert.equal(r2.drop.kind, 'shield'); assert.ok(!r2.drop.converted); assert.equal(r2.xp.drop, 0); assert.equal(S.snapshot().shields, 2)
})
t('settleStreak: materialises the spend once and queues notices; a lost streak is announced once', () => {
  begin(); quiet(AUG, range(1, 8))
  for (let i = 1; i <= 7; i++) playOn(OCT(1 + i), AUG, i)
  ATIME(OCT(10), '08:00')
  const ev = S.settleStreak()
  assert.deepEqual(ev.map((e) => e.type), ['shield']); assert.equal(S.snapshot().shields, 0); assert.equal(S.snapshot().streak, 7)
  assert.equal(S.notices(S.snapshot())[0].type, 'shield')
  assert.deepEqual(S.settleStreak(), [], 'idempotent')
  ATIME(OCT(12), '08:00') // Sat 10 lost
  const ev2 = S.settleStreak()
  assert.equal(ev2[0].type, 'lost'); assert.equal(ev2[0].from, 7)
  assert.equal(S.snapshot().streak, 0); assert.equal(S.snapshot().best, 7)
  assert.deepEqual(S.settleStreak(), [])
  const n = S.notices(S.snapshot()).map((x) => x.type)
  assert.deepEqual(n, ['shield', 'lost'])
  S.ackNotices(); assert.equal(S.notices(S.snapshot()).length, 0)
  const r = playOn(OCT(12), AUG, 8)
  assert.deepEqual([r.streak.from, r.streak.to, r.streak.broke], [0, 1, false])
})
t('streakInfo: none → at-risk → done → rest → lost, with the countdown to midnight', () => {
  begin(); quiet(AUG, [1, 2])
  assert.equal(S.streakInfo(S.snapshot(), new Date(2026, 9, 2, 21)).state, 'none')
  playOn(OCT(2), AUG, 1, undefined, '19:00')
  const done = S.streakInfo(S.snapshot(), new Date(2026, 9, 2, 20))
  assert.equal(done.state, 'done'); assert.equal(done.doneToday, true); assert.equal(done.atRisk, false)
  const risk = S.streakInfo(S.snapshot(), new Date(2026, 9, 3, 21, 0, 0)) // Sat 3 Oct, 21:00
  assert.equal(risk.state, 'at-risk'); assert.equal(risk.atRisk, true); assert.equal(Math.round(risk.hoursLeft * 100) / 100, 3)
  const rest = S.streakInfo(S.snapshot(), new Date(2026, 9, 4, 12)) // Sunday: Saturday was missed → lost; check a Sunday that follows a done day instead
  assert.equal(rest.state, 'lost'); assert.equal(rest.lostFrom, 1); assert.equal(rest.count, 0)
  begin(); playOn(OCT(3), AUG, 1) // Sat done
  const sun = S.streakInfo(S.snapshot(), new Date(2026, 9, 4, 12))
  assert.equal(sun.state, 'rest'); assert.equal(sun.restDay, true); assert.equal(sun.atRisk, false); assert.equal(sun.count, 1)
  const mon = S.streakInfo(S.snapshot(), new Date(2026, 9, 5, 12))
  assert.equal(mon.state, 'at-risk'); assert.equal(mon.count, 1)
  assert.equal(mon.next.at, 3); assert.equal(mon.shieldIn, 6)
})
t('streak: midnight roll-over — 23:59 then 00:01 is two consecutive days', () => {
  begin(); quiet(AUG, [1, 2])
  playOn(OCT(5), AUG, 1, undefined, '23:59')
  const r = playOn(OCT(6), AUG, 2, undefined, '00:01')
  assert.equal(r.streak.to, 2)
})
t('streak: across the New York DST change (1 Nov 2026) three days are still three days', () => {
  begin('2026-10-31T19:00'); quiet(AUG, [1, 2, 3])
  const a = playOn('2026-10-31', AUG, 1, undefined, '23:30')
  const b = playOn('2026-11-01', AUG, 2, undefined, '00:30')
  const c = playOn('2026-11-02', AUG, 3, undefined, '23:59')
  assert.deepEqual([a.streak.to, b.streak.to, c.streak.to], [1, 2, 3])
})
t('streak: a device clock set backwards neither punishes nor rewards', () => {
  begin(); quiet(AUG, [1, 2])
  playOn(OCT(5), AUG, 1)
  const r = playOn(OCT(3), AUG, 2)
  assert.deepEqual([r.streak.from, r.streak.to, r.streak.extended], [1, 1, false])
  assert.equal(S.snapshot().lastDone, OCT(5))
})
t('streak: a comeback after 4+ days is recorded without shame', () => {
  begin(); quiet(AUG, [1, 2])
  playOn(OCT(2), AUG, 1)
  const r = playOn(OCT(9), AUG, 2)
  assert.equal(r.streak.comeback, true); assert.equal(r.streak.to, 1); assert.ok(r.achievements.includes('comeback'))
  assert.equal(S.snapshot().stats.comebacks, 1)
})
t('streak: replaying a finished day keeps the day alive (no bonus, no drop, no code)', () => {
  begin(); quiet(AUG, [1])
  const first = playOn(OCT(2), AUG, 1)
  const xp1 = S.snapshot().xp
  const again = playOn(OCT(3), AUG, 1, { right: 4, asked: 4 })
  assert.equal(again.again, true); assert.equal(again.streak.to, 2); assert.equal(again.xp.bonus, 0); assert.equal(again.drop, null); assert.equal(again.code.isNew, false)
  assert.equal(again.xp.lesson, 4 * S.XP.practice, 'practice answers pay 2 each')
  assert.equal(S.snapshot().xp, xp1 + again.xp.total)
  assert.equal(Object.keys(S.snapshot().series[AUG].done).length, 1)
  assert.deepEqual(S.snapshot().series[AUG].results[1], first && S.snapshot().series[AUG].results[1])
})
t('streak: milestones pay their XP (3 → 15, 7 → 30)', () => {
  begin(); quiet(AUG, range(1, 8))
  const out = []
  for (let i = 1; i <= 7; i++) out.push(playOn(OCT(1 + i), AUG, i))
  assert.equal(out[2].streak.milestone, 3); assert.ok(out[2].xp.lines.some((l) => l.id === 'milestone' && l.xp === 15))
  assert.equal(out[6].streak.milestone, 7); assert.ok(out[6].xp.lines.some((l) => l.id === 'milestone' && l.xp === 30))
  assert.equal(out[3].streak.milestone, null)
})

/* ======================================================================== *
 *  XP, rings, daily goal
 * ======================================================================== */
t('scoreAnswer: 10 / 0 / retry 5 / practice 2 capped at 20 a day', () => {
  begin()
  assert.equal(S.scoreAnswer(true), 10); assert.equal(S.scoreAnswer(false), 0); assert.equal(S.scoreAnswer(true, { retry: true }), 5)
  assert.equal(S.snapshot().xp, 15); assert.equal(S.todayTally(S.snapshot()).right, 2); assert.equal(S.todayTally(S.snapshot()).asked, 3)
  S.dev.set({ series: { [AUG]: { done: { 1: OCT(1) }, pos: {}, notes: {}, notesAt: {}, cards: [], results: {}, drops: {} } } })
  let got = 0
  for (let i = 0; i < 20; i++) got += S.scoreAnswer(true, { seriesId: AUG, day: 1 })
  assert.equal(got, S.XP.practiceCap)
  assert.equal(S.scoreAnswer(true, { seriesId: AUG, day: 1 }), 0)
  assert.equal(S.scoreAnswer(true, { seriesId: AUG, day: 2 }), 10, 'an unfinished day pays full price')
})
t('fuzz: the streak engine agrees with an independent model across 120 random lives (and two time zones of DST)', () => {
  // The model is deliberately naive: plain Date objects and arrays, one decision per missed day, written separately from the engine.
  const sun = (d) => d.getDay() === 0 // archive rule: Sunday is Selah
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const nextDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  const project = (m, T) => { // what would the streak be on date T (no play)? → { alive, streak, shields }
    if (!m.alive) return { alive: false, streak: 0, shields: m.shields }
    let shields = m.shields
    for (let d = nextDay(m.covered); d < T; d = nextDay(d)) {
      if (sun(d)) continue
      if (shields > 0) { shields--; continue }
      return { alive: false, streak: 0, shields: m.shields }
    }
    return { alive: true, streak: m.streak, shields }
  }
  for (let life = 0; life < 120; life++) {
    const rnd = S.rng('fuzz|' + life)
    const p = [0.95, 0.8, 0.6, 0.4][life % 4]
    begin(OCT(2) + 'T09:00'); S.dev.set({ salt: 'fz' })
    const days = range(1, 31); quiet(AUG, days)
    let model = { alive: false, streak: 0, shields: 0, covered: null, best: 0 }
    let date = new Date(2026, 9, 2)
    let plays = 0
    for (let n = 0; n < 150; n++, date = nextDay(date)) {
      const key = ymd(date)
      // a read-only check at a random hour on every day
      ATIME(key, '12:00')
      const info = S.streakInfo(S.snapshot(), new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12))
      const proj = project(model, date)
      assert.equal(info.count, proj.streak, `life ${life} ${key}: displayed streak`); assert.equal(info.alive, proj.alive); assert.equal(info.shields, proj.shields, `life ${life} ${key}: displayed shields`)
      if (rnd() > p) continue
      const hhmm = rnd() < 0.2 ? '00:05' : rnd() < 0.2 ? '23:55' : '19:00'
      ATIME(key, hhmm)
      play(AUG, 1 + (plays++ % 31), { right: 4, asked: 4 })
      // model: settle the gap, then extend
      const pr = project(model, date)
      if (pr.alive) { model = { ...model, shields: pr.shields } } else model = { ...model, alive: false, streak: 0 }
      if (model.covered && ymd(model.covered) === key) { /* already played today */ } else {
        model.streak = model.alive ? model.streak + 1 : 1
        model.alive = true; model.covered = new Date(date)
        if (model.streak % 7 === 0 && model.shields < 2) model.shields++
        model.best = Math.max(model.best, model.streak)
      }
      const st = S.snapshot()
      assert.equal(st.streak, model.streak, `life ${life} ${key}: streak after play`); assert.equal(st.shields, model.shields, `life ${life} ${key}: shields after play`); assert.equal(st.best, model.best)
    }
  }
})
t('mission rewards: Orbit pays a shield (XP at the cap), All Gold pays a fragment', () => {
  begin(); S.dev.set({ salt: 'orb' })
  const sb = { done: Object.fromEntries(range(1, 31).map((d) => [d, '2026-09-01'])), pos: {}, notes: {}, notesAt: {}, cards: augS.codes.map((c) => c.no), results: {}, drops: {} }
  S.dev.set({ series: { [AUG]: sb }, shields: 1 })
  const m = (id) => S.objectives(S.snapshot(), AUG).mission.find((x) => x.id === `m:${AUG}:${id}`)
  assert.equal(m('orbit').state, 'ready'); assert.equal(m('gold').state, 'ready'); assert.equal(m('half').state, 'ready'); assert.equal(m('perfect').state, 'locked')
  const g = S.claimObjective(m('gold').id); assert.deepEqual(g.reward, { xp: 60, fragments: 1 }); assert.equal(S.snapshot().fragments, 1)
  const o = S.claimObjective(m('orbit').id); assert.equal(o.reward.shield, 1); assert.equal(S.snapshot().shields, 2)
  assert.ok(o.achievements.includes('fully-shielded'))
  S.dev.set({ claims: {} , shields: 2 })
  const o2 = S.claimObjective(m('orbit').id); assert.equal(o2.reward.shield, 0); assert.equal(o2.reward.xp, 150 + S.XP.shieldOverflow); assert.equal(S.snapshot().shields, 2)
})
t('hooks render (server-side), and a failing localStorage never stops the app', () => {
  begin('2026-10-02T09:00'); S.dev.set({ salt: 'hk' }); quiet(AUG, [1]); playOn(OCT(2), AUG, 1)
  function Probe() {
    const st = S.useStore(); const k = S.useStreak(); const l = S.useLaunch(augS); const d = S.useToday()
    return React.createElement('p', null, [st.xp, k.state, k.count, l.state, l.day, d].join('|'))
  }
  const html = renderToString(React.createElement(Probe))
  assert.match(html, /|done|1|archive|2|2026-10-02/)
  const real = globalThis.localStorage
  globalThis.localStorage = { getItem() { throw new Error('denied') }, setItem() { throw new Error('quota') }, removeItem() { throw new Error('denied') } }
  try {
    assert.doesNotThrow(() => S.reload()); assert.equal(S.snapshot().xp, 0)
    assert.doesNotThrow(() => S.completeOnboarding({ name: 'Ada', dailyGoal: 40 })); assert.equal(S.snapshot().name, 'Ada')
    assert.doesNotThrow(() => playOn(OCT(2), AUG, 1)); assert.equal(S.snapshot().streak, 1, 'progress keeps working in memory')
  } finally { globalThis.localStorage = real }
})
t('scoreAnswer with an exercise id counts once (double-invoked updaters, re-renders, same-evening replays)', () => {
  begin(); S.dev.set({ salt: 'dup' })
  const a = { seriesId: AUG, day: 1, id: 'ex1' }
  assert.equal(S.scoreAnswer(true, a), 10); assert.equal(S.scoreAnswer(true, a), 0); assert.equal(S.snapshot().xp, 10); assert.equal(S.todayTally(S.snapshot()).right, 1)
  assert.equal(S.scoreAnswer(false, { ...a, id: 'ex2' }), 0); assert.equal(S.scoreAnswer(true, { ...a, id: 'ex2', retry: true }), 5, 'a wrong first try then a right retry are different answers')
  assert.equal(S.scoreAnswer(true, { ...a, id: 'ex2', retry: true }), 0)
  assert.equal(S.scoreAnswer(true, { seriesId: AUG, day: 1 }), 10, 'no id → no dedupe (v5 behaviour)')
  assert.equal(S.todayTally(S.snapshot()).asked, 4)
  clock('2026-10-03T09:00'); assert.equal(S.scoreAnswer(true, a), 10, 'a new day resets it')
  S.reload(); assert.equal(S.scoreAnswer(true, a), 0, 'and it survives a reload mid-lesson')
})
t('patchShelf and completionBeats', () => {
  begin(); quiet(AUG, range(1, 12))
  for (let i = 1; i <= 9; i++) playOn(OCT(1 + i), AUG, i)
  const shelf = S.patchShelf(S.snapshot())
  assert.equal(shelf.length, 4 + 5); const a = shelf.filter((p) => p.seriesId === AUG)
  assert.deepEqual(a.map((p) => p.earned), [true, false, false, false]); assert.equal(a[0].on, OCT(10)); assert.equal(a[0].name, 'Ownership'); assert.equal(a[1].done, 0); assert.equal(a[1].total, 7)
  assert.ok(shelf.filter((p) => p.seriesId === JUL).every((p) => !p.earned))
  begin(); quiet(AUG, [1])
  const r = playOn(OCT(2), AUG, 1)
  const beats = S.completionBeats(r)
  assert.equal(beats[0], 'xp'); assert.equal(beats.at(-1), 'actions'); assert.ok(beats.includes('streak') && beats.includes('card') && beats.includes('drop') && beats.includes('medals') && beats.includes('rank'))
  assert.ok(beats.indexOf('rings') < beats.indexOf('streak') && beats.indexOf('streak') < beats.indexOf('card') && beats.indexOf('card') < beats.indexOf('drop') && beats.indexOf('drop') < beats.indexOf('rank'))
  const again = playOn(OCT(2), AUG, 1)
  assert.ok(!S.completionBeats(again).includes('card') && !S.completionBeats(again).includes('drop') && !S.completionBeats(again).includes('streak'))
})
t('finishDay: xp.total is exactly what changed in the bank, and the lines add up', () => {
  begin(); S.dev.set({ salt: 'a' })
  const before = S.snapshot().xp
  const r = playOn(OCT(2), AUG, 8, { right: 4, asked: 4 }) // day 8 = gold card
  assert.equal(r.xp.lesson, 40)
  assert.equal(r.xp.total, r.xp.lesson + r.xp.bonus + r.xp.drop)
  assert.equal(r.xp.bonus, r.xp.lines.reduce((a, l) => a + l.xp, 0))
  assert.equal(S.snapshot().xp - before, r.xp.total)
  const ids = r.xp.lines.map((l) => l.id)
  assert.ok(ids.includes('complete') && ids.includes('rare') && ids.includes('perfect'))
  assert.equal(r.code.rare, true); assert.equal(r.code.isNew, true); assert.equal(r.perfect, true)
  const imperfect = (() => { begin(); S.dev.set({ salt: 'a' }); return playOn(OCT(2), AUG, 3, { right: 3, asked: 4 }) })()
  assert.equal(imperfect.perfect, false); assert.ok(!imperfect.xp.lines.some((l) => l.id === 'perfect'))
})
t('rings: three of them, tallies reset at midnight, goal follows the chosen commitment', () => {
  for (const goal of [20, 40, 60]) {
    begin('2026-10-02T09:00', { goal })
    assert.equal(S.dailyGoalXp(S.snapshot()), goal)
    const r = S.rings(S.snapshot())
    assert.deepEqual(r.map((x) => x.id), ['lesson', 'xp', 'right']); assert.equal(r[1].goal, goal); assert.equal(r[2].goal, 3)
    assert.ok(r.every((x) => x.value === 0 && !x.done))
  }
  begin(); quiet(AUG, [1])
  playOn(OCT(2), AUG, 1, { right: 4, asked: 4 })
  const done = S.rings(S.snapshot(), OCT(2))
  assert.ok(done.every((x) => x.done), 'a clean lesson closes all three rings'); assert.ok(done.every((x) => x.value === 1))
  const next = S.rings(S.snapshot(), OCT(3))
  assert.ok(next.every((x) => x.now === 0), 'stale tallies read as zero tomorrow')
  assert.equal(S.questState(S.snapshot(), OCT(2)).every((q) => q.done), true)
  assert.equal(S.questState(S.snapshot(), OCT(2))[1].label, 'Earn 40 XP')
  S.setDailyGoal('serious'); assert.equal(S.questState(S.snapshot(), OCT(3))[1].label, 'Earn 60 XP')
  assert.equal(S.QUESTS.length, 3)
})
t('finishDay: rings before/after and which closed', () => {
  begin('2026-10-02T09:00', { goal: 60 }); quiet(AUG, [1])
  const r = playOn(OCT(2), AUG, 1, { right: 4, asked: 4 })
  assert.deepEqual(r.rings.before.map((x) => x.now), [0, 0, 0])
  assert.equal(r.rings.after[0].now, 1); assert.equal(r.rings.after[2].now, 4)
  assert.ok(r.rings.closed.includes('lesson') && r.rings.closed.includes('right'))
  assert.equal(r.goal.goal, 60); assert.equal(r.goal.met, r.xp.total >= 60); assert.equal(r.goal.justMet, r.goal.met)
  // a second lesson in the day: "before" is what the day looked like when THAT lesson began
  const r2 = playOn(OCT(2), AUG, 2, { right: 2, asked: 4 })
  assert.equal(r2.rings.before[0].now, 1); assert.equal(r2.rings.before[2].now, 4)
  assert.deepEqual(r2.rings.closed.includes('lesson'), false)
})

/* ======================================================================== *
 *  Drops
 * ======================================================================== */
t('rollDrop: deterministic, distributed ≈ 60 / 25 / 15, xp 10–30', () => {
  assert.deepEqual(S.rollDrop('abc'), S.rollDrop('abc'))
  assert.notDeepEqual(S.rollDrop('abc'), S.rollDrop('abd'))
  const n = 20000
  const kinds = { xp: 0, shield: 0, fragment: 0 }
  let sum = 0
  for (let i = 0; i < n; i++) {
    const d = S.rollDrop('seed' + i)
    kinds[d.kind]++
    if (d.kind === 'xp') { assert.ok([10, 15, 20, 25, 30].includes(d.xp)); sum += d.xp }
    else assert.equal(d.xp, undefined)
  }
  const pct = (k) => (kinds[k] / n) * 100
  assert.ok(Math.abs(pct('xp') - 60) < 1.5, 'xp ' + pct('xp'))
  assert.ok(Math.abs(pct('shield') - 25) < 1.5, 'shield ' + pct('shield'))
  assert.ok(Math.abs(pct('fragment') - 15) < 1.5, 'fragment ' + pct('fragment'))
  const mean = sum / kinds.xp
  assert.ok(mean > 15 && mean < 19, 'mean xp drop ' + mean)
  for (let i = 0; i < 200; i++) { const c = S.rollChest('c' + i); assert.ok([10, 15, 20, 25].includes(c.xp)) }
})
t('drops are persisted at finishDay and a reload can never re-roll them', () => {
  begin(); S.dev.set({ salt: 'persist' })
  const r = playOn(OCT(2), AUG, 1)
  const expected = S.rollDrop(S.dropSeedFor(S.snapshot(), AUG, 1))
  assert.equal(r.drop.kind, expected.kind)
  assert.equal(S.dropFor(S.snapshot(), AUG, 1).kind, expected.kind)
  const before = JSON.stringify(S.dropFor(S.snapshot(), AUG, 1))
  S.reload()
  assert.equal(JSON.stringify(S.dropFor(S.snapshot(), AUG, 1)), before)
  // a fresh install (new salt) with the same day gets its own roll — but within one install it is fixed
  const again = playOn(OCT(3), AUG, 1)
  assert.equal(again.drop, null)
  assert.equal(JSON.stringify(S.dropFor(S.snapshot(), AUG, 1)), before)
  // a stored drop wins over a re-derived one even if the salt changed under it
  S.dev.set({ salt: 'other' }); assert.equal(JSON.stringify(S.dropFor(S.snapshot(), AUG, 1)), before)
})
t('drops: a fragment adds to the patch counter; five make a patch', () => {
  const salt = saltWith('fragment', AUG, 1)
  begin(); S.dev.set({ salt })
  const r = playOn(OCT(2), AUG, 1)
  assert.equal(r.drop.kind, 'fragment'); assert.equal(r.drop.fragment.total, 1); assert.equal(r.drop.fragment.of, 5); assert.equal(r.xp.drop, 0)
  assert.equal(S.fragmentState(S.snapshot()).count, 1); assert.equal(S.fragmentState(S.snapshot()).patches, 0)
  assert.ok(r.achievements.includes('relic-found'))
  S.dev.set({ fragments: 4 })
  assert.deepEqual([S.fragmentState(S.snapshot()).patches, S.fragmentState(S.snapshot()).toward], [0, 4])
  S.dev.set({ fragments: 5 })
  assert.deepEqual([S.fragmentState(S.snapshot()).patches, S.fragmentState(S.snapshot()).toward], [1, 0])
  assert.ok(S.snapshot().achievements['patch-assembled'], 'writes sweep medals themselves')
})

/* ======================================================================== *
 *  finishDay: the rich result, atomicity, stage/month completion
 * ======================================================================== */
t('finishDay: one commit, one storage write, and the result has every field the contract promises', () => {
  begin(); S.dev.set({ salt: 'shape' })
  let xp = 0
  for (let i = 0; i < 4; i++) xp += S.scoreAnswer(true, { seriesId: AUG, day: 1 })
  writes = 0
  ATIME(OCT(2))
  const r = S.finishDay(AUG, 1, xp, { right: 4, asked: 4 })
  assert.equal(writes, 1, 'exactly one write to storage')
  for (const k of ['seriesId', 'day', 'date', 'again', 'first', 'xp', 'streak', 'code', 'drop', 'rank', 'achievements', 'rings', 'goal', 'stage', 'month', 'next'])
    assert.ok(k in r, 'result.' + k)
  for (const k of ['lesson', 'bonus', 'drop', 'total', 'lines']) assert.ok(k in r.xp)
  for (const k of ['from', 'to', 'shieldUsed', 'milestone', 'extended', 'shieldEarned', 'broke']) assert.ok(k in r.streak)
  assert.ok(typeof r.rank.from.name === 'string' && typeof r.rank.to.index === 'number' && typeof r.rank.up === 'boolean')
  assert.equal(r.rings.before.length, 3); assert.equal(r.rings.after.length, 3)
  assert.equal(r.first, true); assert.equal(r.firstOfSeries, true); assert.ok(r.achievements.includes('first-launch') && r.achievements.includes('perfect-day'))
  assert.equal(r.code.no, 1); assert.equal(r.day, 1); assert.equal(r.stage.index, 0)
  assert.equal(JSON.parse(mem.get(KEY)).v, 6)
  assert.equal(S.finishDay('nope', 1, 0), null); assert.equal(S.finishDay(AUG, 99, 0), null); assert.equal(S.finishDay(AUG, 0, 0), null)
  const second = playOn(OCT(3), AUG, 3)
  assert.equal(second.first, false)
})
t('finishDay: rank-up is reported with both ranks', () => {
  begin(); quiet(AUG, range(1, 8))
  let up = null
  for (let i = 1; i <= 8 && !up; i++) { const r = playOn(OCT(1 + i), AUG, i); if (r.rank.up) up = { r, i } }
  assert.ok(up, 'a daily user is promoted within 8 days')
  assert.equal(up.r.rank.from.name, 'Seeker'); assert.equal(up.r.rank.to.name, 'Steward'); assert.ok(up.r.achievements.includes('rank-1'))
})
t('finishDay: clearing a stage and a whole mission are flagged', () => {
  begin(); quiet(AUG, range(1, 31))
  let r
  for (let i = 1; i <= 9; i++) r = playOn(OCT(1 + i), AUG, i)
  assert.equal(r.stage.cleared, true); assert.equal(r.stage.clearedNow, true); assert.equal(r.month.complete, false)
  assert.ok(r.achievements.includes('stage-1'))
  const mid = playOn(OCT(11), AUG, 10)
  assert.equal(mid.stage.clearedNow, false)
  for (let i = 11; i <= 31; i++) r = playOn(OCT(1 + i), AUG, i)
  assert.equal(r.month.complete, true); assert.equal(r.month.completeNow, true); assert.equal(r.month.done, 31); assert.equal(r.next.day, null)
  assert.ok(r.achievements.includes('full-month') || S.snapshot().achievements['full-month'])
  assert.ok(S.snapshot().achievements['all-gold'] && S.snapshot().achievements['stage-4'])
})
t('archive currentDay advances as days are finished — on both series', () => {
  for (const sid of [AUG, JUL]) {
    begin(); quiet(sid, [1, 2, 3, 4])
    const s = L.getSeries(sid)
    assert.equal(L.currentDay(s, S.snapshot(), new Date(2026, 9, 2, 9)), 1)
    playOn(OCT(2), sid, 1); playOn(OCT(3), sid, 2); playOn(OCT(5), sid, 4)
    assert.equal(L.currentDay(s, S.snapshot(), new Date(2026, 9, 5, 20)), 3, 'the first unfinished day, not the last')
    assert.equal(S.launchState(s, S.snapshot(), new Date(2026, 9, 5, 20)).day, 3)
  }
})

/* ======================================================================== *
 *  Launch Bar
 * ======================================================================== */
t('launchState: ready → done (countdown) → locked → upcoming → archive → complete', () => {
  begin('2026-08-12T09:00'); quiet(AUG, [12])
  const ready = S.launchState(augS, S.snapshot(), new Date(2026, 7, 12, 9))
  assert.equal(ready.state, 'ready'); assert.equal(ready.day, 12); assert.equal(ready.mode, 'live')
  assert.ok(ready.mins >= 3 && ready.mins <= 8); assert.ok(ready.teaser.length > 10); assert.equal(ready.title, 'Plan Before You Spend'); assert.equal(ready.behind, 11); assert.equal(ready.catchUp, 1)
  assert.equal(ready.atRisk, false); assert.equal(ready.streak, 0)
  playOn('2026-08-12', AUG, 12, undefined, '19:00')
  const done = S.launchState(augS, S.snapshot(), new Date(2026, 7, 12, 19, 0))
  assert.equal(done.state, 'done'); assert.equal(done.next, 13); assert.deepEqual(done.unlockAt, new Date(2026, 7, 13, 6, 0))
  assert.equal(done.countdown, 11 * 36e5); assert.equal(done.doneToday, true); assert.equal(done.streak, 1)
  const locked = S.launchState(augS, S.snapshot(), new Date(2026, 7, 13, 5, 30))
  assert.equal(locked.state, 'locked'); assert.equal(locked.day, 13); assert.equal(locked.countdown, 30 * 6e4)
  const up = S.launchState(augS, S.snapshot(), new Date(2026, 6, 20, 9))
  assert.equal(up.state, 'upcoming'); assert.deepEqual(up.unlockAt, new Date(2026, 7, 1, 6, 0))
  const arch = S.launchState(augS, { ...S.snapshot(), series: {} }, new Date(2026, 9, 2, 9))
  assert.equal(arch.state, 'archive'); assert.equal(arch.day, 1); assert.equal(arch.remaining, 31)
  const alldone = { series: { [AUG]: { done: Object.fromEntries(range(1, 31).map((d) => [d, '2026-09-01'])) } }, streak: 0, best: 0, shields: 0, lastDone: null, log: {}, saves: {}, stats: {}, claims: {} }
  assert.equal(S.launchState(augS, alldone, new Date(2026, 9, 2, 9)).state, 'complete')
})
t('launchState: at-risk streak feeds the loss-aversion line', () => {
  begin(); quiet(AUG, [1])
  playOn(OCT(2), AUG, 1)
  const night = S.launchState(augS, S.snapshot(), new Date(2026, 9, 3, 21, 0))
  assert.equal(night.atRisk, true); assert.equal(Math.round(night.hoursLeft), 3); assert.equal(night.streak, 1)
})

t('launchBarContext: every state copy.launchBarCopy knows, reached for the right reason', () => {
  const ctx = (st, at, s = augS) => S.launchBarContext(s, st, at)
  const A = (d, h = 9, m = 0) => new Date(2026, 7, d, h, m)
  // first launch
  begin('2026-08-12T09:00'); quiet(AUG, [10, 11, 12])
  assert.equal(ctx(S.snapshot(), A(12)).state, 'first'); assert.equal(ctx(S.snapshot(), A(12)).kind, 'teaching')
  // ready (streak alive but plenty of day left) → atRisk in the last 6 hours
  playOn('2026-08-11', AUG, 11)
  assert.equal(ctx(S.snapshot(), A(12, 9)).state, 'ready'); assert.equal(ctx(S.snapshot(), A(12, 9)).streak, 1)
  const late = ctx(S.snapshot(), A(12, 19, 30)); assert.equal(late.state, 'atRisk'); assert.equal(Math.round(late.hoursLeft * 10), 45); assert.equal(late.countdown, 4.5 * 36e5)
  // progress: you stopped part-way
  S.setPos(AUG, 12, 3)
  const pr = ctx(S.snapshot(), A(12, 9)); assert.equal(pr.state, 'progress'); assert.equal(pr.step, 3); assert.ok(pr.steps > 8 && pr.pct > 0 && pr.pct < 100)
  // waiting: today is done
  clock('2026-08-12T19:00'); play(AUG, 12)
  const w = ctx(S.snapshot(), A(12, 20)); assert.equal(w.state, 'waiting'); assert.equal(w.next, 13); assert.equal(w.countdown, 10 * 36e5)
  const w2 = ctx(S.snapshot(), A(13, 5, 30)); assert.equal(w2.state, 'waiting'); assert.equal(w2.countdown, 30 * 6e4) // before 06:00 the new day is still locked
  // selah (Aug 9) after a done Saturday: the streak rests, nothing is at risk
  begin('2026-08-08T19:00'); quiet(AUG, [8]); playOn('2026-08-08', AUG, 8)
  const se = ctx(S.snapshot(), A(9, 21)); assert.equal(se.state, 'selah'); assert.equal(se.kind, 'selah')
  // missed: a shield covered yesterday / the streak ended
  begin('2026-10-02T09:00'); quiet(AUG, range(1, 9))
  for (let i = 1; i <= 7; i++) playOn(OCT(1 + i), AUG, i)
  const sh = ctx(S.snapshot(), new Date(2026, 9, 10, 8)); assert.equal(sh.state, 'missed'); assert.equal(sh.shieldUsed, true)
  clock('2026-10-10T08:00'); S.settleStreak() // after the spend is materialised it still reads the same
  assert.equal(ctx(S.snapshot(), new Date(2026, 9, 10, 8)).shieldUsed, true)
  const lost = ctx(S.snapshot(), new Date(2026, 9, 13, 8)); assert.equal(lost.state, 'missed'); assert.equal(lost.shieldUsed, false)
  // archive / upcoming / complete
  begin('2026-10-02T09:00')
  S.completeOnboarding({ name: 'T', dailyGoal: 40 }); quiet(AUG, [1]); playOn(OCT(2), AUG, 1)
  const ar = ctx(S.snapshot(), new Date(2026, 9, 2, 20)); assert.equal(ar.state, 'archive'); assert.equal(ar.done, 1); assert.equal(ar.total, 31)
  assert.equal(ar.seriesTitle, 'The Stewardship Code')
  const up = ctx(S.snapshot(), new Date(2026, 6, 20, 9)); assert.equal(up.state, 'upcoming'); assert.ok(up.opens instanceof Date)
  const all = { ...S.snapshot(), series: { [AUG]: { done: Object.fromEntries(range(1, 31).map((d) => [d, '2026-09-01'])), cards: [], pos: {}, results: {}, drops: {} } } }
  assert.equal(ctx(all, new Date(2026, 9, 2, 9)).state, 'complete')
  // …and the copy module accepts every one of them
  if (C) for (const c of [late, pr, w, w2, se, sh, lost, ar, up, ctx(all, new Date(2026, 9, 2, 9)), ctx(S.snapshot(), new Date(2026, 9, 2, 9), julS)]) {
    const o = C.launchBarCopy(c)
    assert.equal(o.state, c.state); assert.ok(o.cta && o.eyebrow, c.state)
  }
})
t('result shapes feed copy.js directly (ledger, drop, rank-up, completion, chest, reward)', () => {
  if (!C) return
  begin('2026-10-02T09:00', { goal: 20 }); S.dev.set({ salt: 'copy' })
  const r = playOn(OCT(2), AUG, 8, { right: 3, asked: 4 })
  const rows = C.ledgerCopy(r.xp)
  assert.equal(rows.at(-1).id, 'total'); assert.equal(rows.at(-1).value, `+${r.xp.total} XP`)
  assert.deepEqual(rows.slice(0, -1).map((x) => x.id).filter((id) => id !== 'drop' && id !== 'lesson'), r.xp.lines.map((l) => l.id))
  assert.ok(C.dropCopy(r.drop).title)
  assert.equal(C.rankUpCopy(r.rank.to).title, r.rank.to.name)
  const done = C.completionCopy({ day: r.day, first: r.first, perfect: r.perfect, recovered: r.asked > r.right && !r.perfect, again: r.again })
  assert.equal(done.title, 'Day 8 complete')
  playOn(OCT(2), AUG, 9, { right: 4, asked: 4 })
  const o = S.objectives(S.snapshot(), AUG)
  assert.equal(o.daily.chest.state, 'ready')
  const c = S.claimObjective(o.daily.chest.id)
  assert.equal(C.chestCopy(c.reward).title, `+${c.reward.xp} XP`); assert.equal(C.rewardCopy(c.reward), `+${c.reward.xp} XP`)
  for (const ring of S.rings(S.snapshot())) assert.ok(C.ringCopy(ring).label)
  assert.deepEqual(C.GOALS.map((g) => g.xp), S.GOALS.map((g) => g.xp)); assert.deepEqual(C.MILESTONES, S.MILESTONES)
  assert.equal(C.rewardCopy({ xp: 150, shield: 1, fragments: 1 }), '+150 XP · Shield · Patch fragment')
})

/* ======================================================================== *
 *  Achievements
 * ======================================================================== */
t('ACHIEVEMENTS: ≥ 24, unique, tiered, tested, with icons from the icon set', () => {
  assert.ok(S.ACHIEVEMENTS.length >= 24)
  assert.equal(new Set(S.ACHIEVEMENTS.map((a) => a.id)).size, S.ACHIEVEMENTS.length)
  const ICONS = new Set('learn objectives shorts locker me flame bolt shield chest rocket star trophy flag lock unlock check checkCircle close medal card patch target sparkle crown heart gift key chevronRight plus minus book verse quote pen journal mic play pause video clock calendar bell moon users user home family orbit satellite stage signal radar thruster countdown refresh gauge'.split(' '))
  const tiers = new Set()
  const fresh = S.freshState('x')
  for (const a of S.ACHIEVEMENTS) {
    assert.ok(a.title && a.desc && S.TIERS.includes(a.tier), a.id); tiers.add(a.tier)
    assert.ok(ICONS.has(a.icon), `${a.id}: icon ${a.icon}`); assert.equal(typeof a.test, 'function'); assert.equal(typeof a.test(fresh), 'boolean')
    if (a.progress) { const p = a.progress(fresh); assert.ok(p.goal > 0 && p.now >= 0 && p.now <= p.goal) }
  }
  assert.deepEqual([...tiers].sort(), ['bronze', 'gold', 'silver', 'ti'])
  for (const id of ['first-launch', 'perfect-day', 'streak-3', 'streak-7', 'streak-14', 'streak-21', 'streak-31', 'early-bird', 'night-owl', 'scripture-scholar', 'shield-saver', 'full-month', 'all-gold'])
    assert.ok(S.ACHIEVEMENTS.some((a) => a.id === id), id)
  assert.equal(S.ACHIEVEMENTS.some((a) => a.test(fresh)), false, 'a brand-new install has earned nothing')
})
t('medals: Early Bird before 07:00, Night Owl after 21:00, neither at noon', () => {
  begin(); quiet(AUG, [1, 2, 3])
  const noon = playOn(OCT(2), AUG, 1, undefined, '12:00')
  assert.ok(!noon.achievements.includes('early-bird') && !noon.achievements.includes('night-owl'))
  const early = playOn(OCT(3), AUG, 2, undefined, '06:59')
  assert.ok(early.achievements.includes('early-bird'))
  const late = playOn(OCT(4), AUG, 3, undefined, '21:00')
  assert.ok(late.achievements.includes('night-owl'))
  begin(); quiet(AUG, [1])
  const edge = playOn(OCT(2), AUG, 1, undefined, '07:00')
  assert.ok(!edge.achievements.includes('early-bird'))
})
t('medals: Scripture Scholar needs 10 perfect lessons; Perfect Day only counts first-try', () => {
  begin(); quiet(AUG, range(1, 12))
  let r
  for (let i = 1; i <= 9; i++) { r = playOn(OCT(1 + i), AUG, i); assert.ok(!r.achievements.includes('scripture-scholar')) }
  r = playOn(OCT(11), AUG, 10)
  assert.ok(r.achievements.includes('scripture-scholar'))
  begin(); quiet(AUG, [1, 2])
  const a = playOn(OCT(2), AUG, 1, { right: 3, asked: 4 })
  assert.ok(!a.achievements.includes('perfect-day'))
  const b = playOn(OCT(3), AUG, 2, { right: 4, asked: 4 })
  assert.ok(b.achievements.includes('perfect-day'))
})
t('medals: Flawless Five needs five perfect lessons in a row (a miss resets the run)', () => {
  begin(); quiet(AUG, range(1, 12))
  for (let i = 1; i <= 4; i++) playOn(OCT(1 + i), AUG, i)
  playOn(OCT(6), AUG, 5, { right: 3, asked: 4 })
  for (let i = 6; i <= 9; i++) { const r = playOn(OCT(1 + i), AUG, i); assert.ok(!r.achievements.includes('flawless-5')) }
  const r = playOn(OCT(11), AUG, 10)
  assert.ok(r.achievements.includes('flawless-5'))
})
t('journal: notes earn First Words and Journal ×10; blank clears; entries list newest first', () => {
  begin(); S.dev.set({ salt: 'j' })
  S.saveNote(AUG, 1, 'God owns it all.')
  assert.equal(S.noteFor(S.snapshot(), AUG, 1), 'God owns it all.'); assert.ok(S.snapshot().achievements['first-words'])
  for (let d = 2; d <= 10; d++) S.saveNote(AUG, d, 'note ' + d)
  assert.ok(S.snapshot().achievements['journal-10'])
  S.saveNote(AUG, 10, '   '); assert.equal(S.noteFor(S.snapshot(), AUG, 10), '')
  const j = S.journalEntries(S.snapshot())
  assert.equal(j.length, 9); assert.ok(j.every((e) => e.title && e.prompt))
  assert.equal(S.journalEntries(S.snapshot(), JUL).length, 0)
  clock('2026-10-05T09:00'); S.saveNote(AUG, 11, 'later')
  assert.equal(S.journalEntries(S.snapshot())[0].day, 11)
})
t('checkAchievements is idempotent and dates medals by the clock', () => {
  begin(); S.dev.set({ salt: 'c' })
  S.updateProfile({ kids: ['Tobi'] })
  assert.equal(S.snapshot().achievements.crew, '2026-10-02')
  assert.deepEqual(S.checkAchievements(), [])
  assert.ok(S.unseenMedals(S.snapshot()).includes('crew'))
  S.markSeen(S.unseenMedals(S.snapshot())); assert.deepEqual(S.unseenMedals(S.snapshot()), [])
  S.markSeen([]); assert.deepEqual(S.unseenMedals(S.snapshot()), [])
  const m = S.medals(S.snapshot())
  assert.equal(m.length, S.ACHIEVEMENTS.length); assert.ok(m.find((x) => x.id === 'crew').earned); assert.equal(m.find((x) => x.id === 'streak-7').progress.goal, 7)
  assert.ok(S.nextMedals(S.snapshot(), 3).length === 3)
})
t('every medal can be earned: a thorough player sweeps the board (and we say what is missing)', () => {
  begin('2026-10-02T06:30', { salt: 'sweep' })
  S.updateProfile({ kids: ['Tobi'] })
  let day = '2026-10-02'
  const claim = () => {
    const o = S.objectives(S.snapshot(), AUG)
    if (o.daily.chest.state === 'ready') S.claimObjective(o.daily.chest.id)
    for (const m of [...S.objectives(S.snapshot(), AUG).mission, ...S.objectives(S.snapshot(), JUL).mission]) if (m.state === 'ready') S.claimObjective(m.id)
  }
  // 3 lessons, then 5 days away (a comeback), then a long unbroken run with one skipped weekday (a shield) and replays once the library is exhausted
  const order = [...range(1, 31).map((d) => [AUG, d]), ...range(1, 31).map((d) => [JUL, d])]
  let cursor = 0
  const next = () => (cursor < order.length ? order[cursor++] : [AUG, 1 + (cursor++ % 31)])
  const doOne = (hhmm, perfect = true) => {
    const [sid, d] = next()
    ATIME(day, hhmm)
    const opts = perfect ? { right: 4, asked: 4 } : { right: 3, asked: 4 }
    // practice runs top up the right-answer tally cheaply
    play(sid, d, opts)
    if (cursor <= order.length) S.saveNote(sid, d, 'reflection ' + d)
    claim()
  }
  for (let i = 0; i < 3; i++) { doOne(i === 0 ? '06:30' : '21:30'); day = addDays(day, 1) }
  day = addDays(day, 5) // away
  let skipped = false
  for (let n = 0; n < 125; n++) {
    const wd = L.weekdayOf(day)
    if (!skipped && n >= 8 && wd !== 0 && wd !== 6 && S.snapshot().shields >= 1) { skipped = true; day = addDays(day, 1); continue }
    doOne(n % 3 === 0 ? '07:15' : '12:05')
    day = addDays(day, 1)
  }
  const st = S.snapshot()
  const missing = S.ACHIEVEMENTS.filter((a) => !st.achievements[a.id]).map((a) => a.id)
  note(`sweep: ${S.ACHIEVEMENTS.length - missing.length}/${S.ACHIEVEMENTS.length} medals · streak ${st.streak} best ${st.best} · xp ${st.xp} · rank ${S.rankFor(st.xp).name} · fragments ${st.fragments} · shields used ${st.stats.shieldsUsed}`)
  assert.deepEqual(missing, [])
})

/* ======================================================================== *
 *  Activity, calendar, objectives
 * ======================================================================== */
t('activityByDate: lessons and xp per day (two lessons one day, one the next)', () => {
  begin(); quiet(AUG, [1, 2, 3])
  const a = playOn(OCT(2), AUG, 1); const b = playOn(OCT(2), AUG, 2); const c = playOn(OCT(3), AUG, 3)
  const act = S.activityByDate(S.snapshot())
  assert.equal(act[OCT(2)].lessons, 2); assert.equal(act[OCT(3)].lessons, 1)
  assert.equal(act[OCT(2)].xp, a.xp.total + b.xp.total); assert.equal(act[OCT(3)].xp, c.xp.total)
  assert.equal(act[OCT(2)].goal, true)
})
t('calendarMonth: a Monday-first grid with flames, saves and rest days', () => {
  begin(); quiet(AUG, range(1, 8))
  for (let i = 1; i <= 7; i++) playOn(OCT(1 + i), AUG, i)
  playOn(OCT(10), AUG, 8) // skipped Oct 9 → shield
  const m = S.calendarMonth(S.snapshot(), 2026, 10, { at: new Date(2026, 9, 12, 9) })
  assert.equal(m.cells.length, 31); assert.equal(m.label, 'October 2026')
  assert.equal(m.weeks[0].length, 7); assert.equal(m.weeks[0].findIndex(Boolean), 3, 'Thu 1 Oct is the 4th column when Monday is first')
  assert.ok(m.weeks.every((w) => w.length === 7))
  const c = Object.fromEntries(m.cells.map((x) => [x.day, x]))
  assert.equal(c[2].flame, true); assert.ok(c[2].level >= 1); assert.equal(c[1].flame, false)
  assert.equal(c[9].save, 'shield'); assert.equal(c[4].rest, true); assert.equal(c[12].today, true); assert.equal(c[13].future, true)
  assert.equal(m.activeDays, 8)
})
t('objectives: the daily chest opens once, only after all three rings close', () => {
  begin('2026-10-02T09:00', { goal: 60 }); quiet(AUG, [1, 2])
  let o = S.objectives(S.snapshot(), AUG)
  assert.equal(o.daily.chest.state, 'locked'); assert.equal(S.claimObjective(o.daily.chest.id), null)
  playOn(OCT(2), AUG, 1, { right: 4, asked: 4 })
  o = S.objectives(S.snapshot(), AUG)
  assert.equal(o.daily.chest.state, o.daily.rings.every((r) => r.done) ? 'ready' : 'locked')
  if (o.daily.chest.state === 'locked') playOn(OCT(2), AUG, 2, { right: 4, asked: 4 })
  o = S.objectives(S.snapshot(), AUG)
  assert.equal(o.daily.chest.state, 'ready'); assert.equal(o.daily.chest.reward, null, 'the reward is a surprise until opened')
  const xp0 = S.snapshot().xp
  const c = S.claimObjective(o.daily.chest.id)
  assert.ok(c.reward.xp >= 10 && c.reward.xp <= 25); assert.equal(S.snapshot().xp, xp0 + c.reward.xp)
  assert.equal(S.claimObjective(o.daily.chest.id), null, 'once')
  assert.equal(S.objectives(S.snapshot(), AUG).daily.chest.state, 'opened'); assert.equal(S.objectives(S.snapshot(), AUG).daily.chest.reward.xp, c.reward.xp)
  assert.equal(S.claimObjective('chest:2026-10-01'), null, 'yesterday’s chest is gone')
  assert.ok(S.snapshot().achievements['chest-1'])
})
t('objectives: mission goals unlock as the series is walked, and pay once', () => {
  begin(); quiet(AUG, range(1, 10))
  const stage1 = () => S.objectives(S.snapshot(), AUG).mission.find((m) => m.id === `m:${AUG}:stage-1`)
  assert.equal(stage1().state, 'locked'); assert.equal(stage1().goal, 9)
  for (let i = 1; i <= 9; i++) playOn(OCT(1 + i), AUG, i)
  assert.equal(stage1().state, 'ready'); assert.equal(stage1().pct, 1)
  const xp0 = S.snapshot().xp
  const c = S.claimObjective(stage1().id)
  assert.equal(c.reward.xp, 40); assert.equal(S.snapshot().xp, xp0 + 40); assert.equal(stage1().state, 'claimed'); assert.equal(S.claimObjective(stage1().id), null)
  assert.equal(S.claimObjective(`m:${AUG}:orbit`), null, 'not ready')
  assert.equal(S.claimObjective('m:nope:x'), null)
  const o = S.objectives(S.snapshot(), JUL)
  assert.ok(o.mission.length >= 7 && o.mission.every((m) => m.goal > 0))
})

/* ======================================================================== *
 *  Migration & persistence
 * ======================================================================== */
const V5 = () => ({
  v: 5, name: 'Ada', role: 'family', emoji: '🙂', familyName: 'Okoro', kids: [{ name: 'Tobi' }, { name: 'Ife' }], onboarded: true, reminderHour: 19,
  streak: 9, best: 12, lastDone: '2026-10-01', gems: 130, xp: 640,
  daily: { date: '2026-10-01', xp: 70, right: 3, lessons: 1 },
  series: {
    [AUG]: {
      done: { 1: '2026-09-23', 2: '2026-09-24', 3: '2026-09-25', 8: '2026-10-01' },
      pos: { 3: 2, 9: 5 }, notes: { 1: 'God owns it all.', 3: 'My phone.' }, cards: [1, 2, 3, 7],
    },
    [JUL]: { done: { 1: '2026-09-23' }, pos: {}, notes: {}, cards: [] },
  },
})
t('migration v5 → v6 loses nothing and derives the new layers', () => {
  clock('2026-10-02T09:00'); mem.clear()
  mem.set(KEY, JSON.stringify(V5()))
  const st = S.reload()
  assert.equal(st.v, 6); assert.equal(st.xp, 640); assert.equal(st.streak, 9); assert.equal(st.best, 12); assert.equal(st.lastDone, '2026-10-01'); assert.equal(st.gems, 130)
  assert.deepEqual(st.series[AUG].cards, [1, 2, 3, 7]); assert.deepEqual(st.series[AUG].pos, { 3: 2, 9: 5 })
  assert.equal(st.series[AUG].notes[3], 'My phone.'); assert.equal(Object.keys(st.series[AUG].done).length, 4); assert.equal(st.series[AUG].done[8], '2026-10-01')
  assert.deepEqual(st.kids, [{ name: 'Tobi' }, { name: 'Ife' }]); assert.equal(st.familyName, 'Okoro'); assert.equal(st.role, 'family'); assert.equal(st.reminderHour, 19)
  assert.equal(st.dailyGoalXp, 40); assert.equal(st.shields, 1, 'a 9-day streak had earned one shield'); assert.equal(st.covered, '2026-10-01')
  assert.equal(st.log['2026-09-23'].lessons, 2); assert.equal(st.log['2026-10-01'].lessons, 1); assert.ok(st.log['2026-10-01'].xp >= 70)
  for (const id of ['preflight', 'first-launch', 'streak-7', 'crew', 'first-words', 'rare-card', 'wide-orbit']) assert.ok(st.achievements[id], 'retro medal ' + id)
  assert.ok(!st.achievements['streak-14']); assert.deepEqual(S.unseenMedals(st), [], 'retro medals are history, not news')
  assert.ok(mem.get(KEY + ':pre-v6'), 'the old save is kept beside the new one'); assert.equal(JSON.parse(mem.get(KEY)).v, 6)
  assert.equal(S.streakInfo(st, new Date(2026, 9, 2, 9)).state, 'at-risk'); assert.equal(S.streakInfo(st, new Date(2026, 9, 2, 9)).count, 9)
  // loading what we just saved changes nothing
  const again = S.reload()
  assert.deepEqual(again, st)
})
t('migrate is idempotent; partial seeds and garbage never throw', () => {
  const a = S.migrate({ ...V5(), salt: 'fixed' }, new Date(2026, 9, 2, 9))
  assert.deepEqual(S.migrate(a, new Date(2026, 9, 2, 9)), a)
  const seed = S.migrate({ onboarded: true, name: 'Ada', role: 'teen' })
  assert.equal(seed.v, 6); assert.equal(seed.onboarded, true); assert.equal(seed.xp, 0); assert.equal(seed.dailyGoalXp, 40); assert.deepEqual(seed.series, {})
  for (const junk of [null, undefined, 'x', 5, [], {}, { v: 99, xp: 'abc', streak: -4, series: 7, daily: 'no' }, { series: { [AUG]: { done: 'no', cards: 'no', pos: [1] } } },
    { streak: 5, lastDone: 'yesterday' }, { series: { [AUG]: { done: { 1: true, x: 'y', 99999: '2026-01-01' } } }, lastDone: '2026-10-01' }]) {
    const m = S.migrate(junk)
    assert.equal(m.v, 6); assert.ok(Number.isInteger(m.xp) && m.xp >= 0); assert.ok(m.streak >= 0); assert.ok(typeof m.series === 'object')
    S.rankFor(m.xp); S.rings(m); S.streakInfo(m)
  }
  assert.equal(S.migrate({ series: { [AUG]: { done: { 1: true } }, } , lastDone: '2026-10-01' }).series[AUG].done[1], '2026-10-01')
  clock('2026-10-02T09:00'); mem.clear(); mem.set(KEY, 'not json {{{'); assert.doesNotThrow(() => S.reload()); assert.equal(S.snapshot().xp, 0)
})
t('persistence: a write lands under kind-app-v4 as schema 6 and survives a reload', () => {
  begin(); S.dev.set({ salt: 'p' })
  S.completeOnboarding({ name: ' Ada ', role: 'parent', familyName: 'Okoro', kids: ['Tobi', { name: ' Ife ' }, ''], dailyGoal: 'serious' })
  const raw = JSON.parse(mem.get(KEY))
  assert.equal(raw.v, 6); assert.equal(raw.name, 'Ada'); assert.equal(raw.role, 'parent'); assert.deepEqual(raw.kids, [{ name: 'Tobi' }, { name: 'Ife' }]); assert.equal(raw.dailyGoalXp, 60); assert.equal(raw.onboarded, true)
  playOn(OCT(2), AUG, 1)
  const snap = S.snapshot()
  assert.deepEqual(S.reload(), snap)
  S.addKid('Zed'); assert.equal(S.snapshot().kids.length, 3); S.removeKid(0); assert.equal(S.snapshot().kids[0].name, 'Ife')
  S.updateProfile({ xp: 99999, name: 'B' }); assert.equal(S.snapshot().xp, snap.xp, 'updateProfile is whitelisted'); assert.equal(S.snapshot().name, 'B')
  S.setPos(AUG, 2, 3); S.setPos(AUG, 2, 1); assert.equal(S.posFor(S.snapshot(), AUG, 2), 3, 'resume position only moves forward'); S.resetPos(AUG, 2); assert.equal(S.posFor(S.snapshot(), AUG, 2), 0)
  S.resetAll(); assert.equal(S.snapshot().xp, 0); assert.equal(S.snapshot().onboarded, false)
})
t('live mode: a locked day cannot be finished; a catch-up lesson points at tomorrow and the next missed day', () => {
  begin('2026-08-12T09:00'); quiet(AUG, [3, 4, 12])
  clock('2026-08-12T09:00')
  assert.equal(S.finishDay(AUG, 13, 0), null, 'tomorrow is locked'); assert.equal(S.finishDay(AUG, 31, 0), null)
  assert.equal(S.snapshot().xp, 0)
  const c = play(AUG, 3) // a catch-up day, played today
  assert.equal(c.next.day, 13); assert.deepEqual(c.next.unlockAt, new Date(2026, 7, 13, 6, 0)); assert.equal(c.next.catchUp, 1, 'days 1, 2 and 4–11 are still waiting; the first is offered')
  clock('2026-07-20T09:00'); assert.equal(S.finishDay(AUG, 1, 0), null, 'upcoming: nothing opens')
  begin('2026-10-02T09:00'); quiet(AUG, [1])
  const a = play(AUG, 1); assert.equal(a.next.day, 2); assert.equal(a.next.unlockAt, null); assert.equal(a.next.catchUp, null)
})
t('onboarding and journal writes report the medals they earned; instruments and habits', () => {
  clock('2026-10-02T09:00'); mem.clear(); S.reload()
  assert.deepEqual(S.completeOnboarding({ name: 'Ada', role: 'teen', dailyGoal: 40 }), ['preflight'])
  assert.deepEqual(S.saveNote(AUG, 1, 'hello'), ['first-words']); assert.deepEqual(S.saveNote(AUG, 1, 'hello'), [])
  assert.deepEqual(S.addKid('Tobi'), ['crew'])
  assert.equal(S.usualTime(S.snapshot()), null)
  S.dev.set({ salt: 'u' }); quiet(AUG, [1, 2, 3, 4])
  playOn(OCT(2), AUG, 1, undefined, '19:10'); playOn(OCT(3), AUG, 2, undefined, '19:30'); playOn(OCT(5), AUG, 3, undefined, '07:20'); playOn(OCT(6), AUG, 4, undefined, '19:50')
  assert.deepEqual(S.usualTime(S.snapshot()), { hour: 19, min: 20, n: 4 }) // median of 07:20, 19:10, 19:30, 19:50
  const life = S.lifetimeStats(S.snapshot())
  assert.equal(life.lessons, 4); assert.equal(life.accuracy, 1); assert.equal(life.asked, 16); assert.equal(life.journal, 1); assert.equal(life.medalsTotal, S.ACHIEVEMENTS.length); assert.equal(life.since, '2026-10-02')
  clock('2026-10-06T21:00')
  const strip = S.weekStrip(S.snapshot())
  assert.equal(strip.length, 7); assert.equal(strip.at(-1).today, true); assert.equal(strip.at(-1).key, OCT(6)); assert.deepEqual(strip.map((x) => x.flame), [false, false, true, true, false, true, true])
  assert.equal(strip[4].rest, true, 'Sun 4 Oct rests'); assert.equal(strip.at(-1).label, 'T')
})
t('shareData: verse, card, streak and month are plain, complete and honest', () => {
  begin(); S.dev.set({ salt: 'sh' }); quiet(AUG, [1, 3])
  playOn(OCT(2), AUG, 1)
  const v = S.shareData('verse', S.snapshot(), AUG, 3)
  assert.equal(v.kind, 'verse'); assert.match(v.ref, /Luke|Psalm|Proverbs|Matthew|1 Chronicles|Romans|Deuteronomy|James/); assert.ok(v.text.length > 20); assert.equal(v.title, 'The Owner'); assert.equal(v.day, 3)
  assert.equal(S.shareData('verse', S.snapshot(), AUG, 2), null, 'Selah has no verse card')
  const c = S.shareData('card', S.snapshot(), AUG, 1)
  assert.deepEqual([c.no, c.owned, c.rare, c.title, c.on], [1, true, false, 'Crack the Stewardship Code', OCT(2)])
  assert.equal(S.shareData('card', S.snapshot(), AUG, 3).owned, false)
  const sk = S.shareData('streak', S.snapshot(), AUG, undefined, new Date(2026, 9, 2, 20))
  assert.equal(sk.count, 1); assert.equal(sk.strip.length, 7); assert.equal(sk.state, 'done')
  const m = S.shareData('month', S.snapshot(), AUG)
  assert.equal(m.done, 1); assert.equal(m.total, 31); assert.equal(m.patches.length, 4); assert.deepEqual(m.declaration, augS.declaration); assert.equal(S.shareData('nope', S.snapshot(), AUG), null)
})
t('flags and backup: one-time marks persist; a backup round-trips; junk is refused', () => {
  begin(); S.dev.set({ salt: 'bk' }); quiet(AUG, [1, 2])
  assert.equal(S.hasFlag(S.snapshot(), 'tip:shield'), false)
  S.setFlag('tip:shield'); assert.equal(S.hasFlag(S.snapshot(), 'tip:shield'), true); assert.equal(S.snapshot().flags['tip:shield'], '2026-10-02')
  writes = 0; S.setFlag('tip:shield'); assert.equal(writes, 0, 'idempotent')
  S.setFlag('tip:shield', false); assert.equal(S.hasFlag(S.snapshot(), 'tip:shield'), false)
  S.setFlag('tip:rank'); S.saveNote(AUG, 1, 'x'.repeat(5000)); assert.equal(S.noteFor(S.snapshot(), AUG, 1).length, S.NOTE_MAX)
  playOn(OCT(2), AUG, 1); playOn(OCT(3), AUG, 2)
  const text = S.exportProgress()
  const snap = S.snapshot()
  S.resetAll(); assert.equal(S.snapshot().xp, 0)
  const res = S.importProgress(text)
  assert.equal(res.ok, true); assert.equal(res.lessons, 2); assert.equal(res.xp, snap.xp)
  assert.deepEqual(S.snapshot().series, snap.series); assert.equal(S.snapshot().salt, snap.salt); assert.ok(S.hasFlag(S.snapshot(), 'tip:rank'))
  assert.deepEqual(S.importProgress('nope'), { ok: false, error: 'bad-json' })
  assert.deepEqual(S.importProgress('{"a":1}'), { ok: false, error: 'not-a-kind-backup' })
  assert.equal(S.snapshot().xp, snap.xp, 'a refused backup changes nothing')
})
t('reads: doneDays, weekProgress, perfectWeeks, missedDays, lockerCards', () => {
  begin('2026-08-12T09:00'); quiet(AUG, range(1, 12))
  for (const d of range(1, 9)) playOn(`2026-08-${String(d).padStart(2, '0')}`, AUG, d)
  const st = S.snapshot()
  assert.deepEqual(S.doneDays(st, AUG), range(1, 9)); assert.equal(S.isDayDone(st, AUG, 3), true); assert.equal(S.isDayDone(st, AUG, 10), false)
  assert.deepEqual(S.weekProgress(st, AUG), [1, 0, 0, 0]); assert.equal(S.perfectWeeks(st, AUG), 1)
  clock('2026-08-12T09:00'); assert.deepEqual(S.missedDays(st, AUG), [10, 11]); assert.deepEqual(S.missedDays(st, AUG, 5), [])
  clock('2026-10-02T09:00'); assert.deepEqual(S.missedDays(st, AUG), [], 'no "missed" in archive')
  const cards = S.lockerCards(st, AUG)
  assert.equal(cards.length, 26); assert.equal(cards.filter((c) => c.owned).length, 7, 'days 2 and 9 are Selah: no code card'); assert.equal(cards[0].on, '2026-08-01'); assert.equal(cards[0].title, 'Crack the Stewardship Code')
  assert.equal(S.unlockedCards(st, AUG).length, 7)
})
t('dev seeder: believable states on any clock', () => {
  for (const [iso, sid] of [['2026-10-02T10:00', AUG], ['2026-08-12T10:00', AUG], ['2026-07-20T10:00', JUL]]) {
    clock(iso)
    const at = new Date(iso)
    for (const name of ['new', 'fresh', 'mid', 'done-today', 'veteran', 'lost']) {
      const st = S.demoState(name, { at })
      assert.equal(st.v, 6, name)
      if (name === 'mid') { const i = S.streakInfo(st, at); assert.ok(i.alive && i.state === 'at-risk' && i.count >= 1, `${iso} mid ${JSON.stringify(i)}`) }
      if (name === 'done-today') assert.equal(S.streakInfo(st, at).state, 'done')
      if (name === 'lost') assert.equal(S.streakInfo(st, at).state, 'lost')
      if (name === 'veteran' && iso.startsWith('2026-10')) assert.ok(seriesDoneAll(st, sid))
    }
  }
})
function seriesDoneAll(st, sid) { return L.seriesProgress(L.getSeries(sid), st).complete }

/* ======================================================================== *
 *  The economy: how fast does a daily player climb?
 * ======================================================================== */
t('economy: a daily player (80 % accuracy, claims chests) is promoted every 3–6 days early on, then slower', () => {
  const results = []
  for (const salt of ['e1', 'e2', 'e3', 'e4', 'e5', 'e6']) {
    begin('2026-10-02T09:00', { salt })
    const reached = {}
    const xpAt = {}
    let n = 0
    for (const sid of [AUG, JUL]) for (let d = 1; d <= 31; d++) {
      n++
      const rnd = S.rng(`acc|${salt}|${n}`)
      let right = 0
      for (let q = 0; q < 4; q++) if (rnd() < 0.8) right++
      ATIME(addDays('2026-10-02', n - 1), '19:30')
      play(sid, d, { right, asked: 4 })
      const o = S.objectives(S.snapshot(), sid)
      if (o.daily.chest.state === 'ready') S.claimObjective(o.daily.chest.id)
      const idx = S.rankFor(S.snapshot().xp).index
      if (reached[idx] == null) reached[idx] = n
      xpAt[n] = S.snapshot().xp
    }
    results.push({ reached, xp: xpAt })
  }
  const avg = (i) => results.reduce((a, r) => a + (r.reached[i] ?? 99), 0) / results.length
  const table = [1, 2, 3, 4, 5, 6].map((i) => `${S.RANKS[i].name} d${avg(i).toFixed(1)}`).join(' · ')
  note('economy (avg day each rank is reached by a daily player): ' + table)
  note('cumulative XP by day: ' + [4, 9, 15, 24, 31, 37, 45, 58, 62].map((d) => `d${d} ${Math.round(results.reduce((a, r) => a + r.xp[d], 0) / results.length)}`).join(' · '))
  assert.ok(avg(1) >= 3 && avg(1) <= 5.5, 'first promotion: ' + avg(1))
  assert.ok(avg(2) - avg(1) >= 3 && avg(2) - avg(1) <= 6.5, 'second promotion gap: ' + (avg(2) - avg(1)))
  assert.ok(avg(3) - avg(2) >= 4 && avg(3) - avg(2) <= 9, 'third gap: ' + (avg(3) - avg(2)))
  for (let i = 3; i <= 6; i++) assert.ok(avg(i) - avg(i - 1) >= avg(i - 1) - avg(i - 2) - 0.5, `gaps never shrink (rank ${i})`)
  assert.ok(avg(6) <= 62, 'Pioneer is reachable by finishing both missions: ' + avg(6))
})

/* ---- report ---------------------------------------------------------------- */
const tz = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone
if (failures.length) {
  console.log(`\n✗ ${tz}: ${failures.length} failed, ${passed} passed`)
  for (const { name, e } of failures) console.log(`\n  ✗ ${name}\n    ${String(e.message || e).split('\n').slice(0, 14).join('\n    ')}`)
  for (const n of notes) console.log('  · ' + n)
  process.exit(1)
}
console.log(`✓ ${tz}: ${passed} tests passed`)
for (const n of notes) if (VERBOSE || tz === 'Africa/Lagos' || process.argv.includes('--once')) console.log('  · ' + n)
