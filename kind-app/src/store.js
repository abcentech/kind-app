// Progress, and the whole stickiness loop that hangs off it. Schema v6, persisted under 'kind-app-v4' (the key never changed,
// so nobody loses anything when the schema moves). Full reference: docs/STORE-API.md.
//
//   · Every date comes from now() (now.js). Writers pull the clock once and hand it to pure functions that take `at`.
//   · Every write is ONE commit(): state is rebuilt immutably, achievements are swept into the same object, then it is
//     persisted and subscribers are told. Nothing persists half a lesson.
//   · Selectors are pure (state in, value out) — screens call them during render and never write.
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  allSeries, getSeries, codeFor, dayInfo, epOf, stageOf, stageDays, stageStats, seriesProgress, modeOf, currentDay, isUnlocked,
  nextUnlockAt, estimateMinutes, teaserFor, dayLabel, dayEyebrow, keyOfDay, dayOfKey, addDays, diffDays, weekdayOf,
  isKey, msToMidnight, isPlayable, keyToDate, title as sentence, deckFor, deckLength, activeSeriesId, hasContent, QUIZ_COUNT,
} from './lib.js'
import { now, today } from './now.js'
import { reportCheckin } from './api.js'

export const KEY = 'kind-app-v4'
export const SCHEMA = 6

/* ======================================================================== *
 *  Rules of the game — every number the economy runs on, in one place.
 * ======================================================================== */
export const SHIELD_MAX = 2        // you can hold two; a third converts to XP
export const SHIELD_EVERY = 7      // +1 shield each time a streak reaches a multiple of 7
export const FRAGMENTS_PER_PATCH = 5
export const RIGHT_GOAL = 3        // the Accuracy ring: three correct answers a day
export const XP = {
  answer: 10,          // a correct answer, first try
  retry: 5,            // a correct answer on a recycled (second-chance) question
  practice: 2,         // a correct answer on a day you already finished (replays teach, they don't farm)
  practiceCap: 20,     // …and at most this much practice XP per day
  complete: 20,        // finishing a new day
  rare: 20,            // …whose code card is gold
  perfect: 10,         // …with every check right first time
  shieldOverflow: 25,  // a shield earned while holding the maximum becomes this much XP instead
}
export const MILESTONES = [3, 7, 14, 21, 31, 50, 75, 100, 150, 200, 365]
export const MILESTONE_XP = { 3: 15, 7: 30, 14: 50, 21: 75, 31: 120, 50: 150, 75: 200, 100: 300, 150: 400, 200: 500, 365: 1000 }
/** The commitment device chosen in pre-flight. `xp` is the daily XP ring. */
export const GOALS = [
  { id: 'casual', xp: 20, mins: 3, label: 'Casual' },
  { id: 'regular', xp: 40, mins: 5, label: 'Regular' },
  { id: 'serious', xp: 60, mins: 10, label: 'Serious' },
]
export const DEFAULT_GOAL_XP = 40
export const NOTE_MAX = 4000 // characters kept per journal entry

/**
 * Ranks. Thresholds are tuned against tools/test-store.mjs, which plays a daily 80 %-accuracy player who opens every chest
 * (≈ 95 XP a day): Steward ≈ day 4, Builder ≈ 9, Keeper ≈ 15, Pathfinder ≈ 24, Commander ≈ 37, Pioneer ≈ 55 — i.e. every 4–6 days at first,
 * then 9, 13, 18. A flawless August lands on Pathfinder; Pioneer is what finishing both missions earns.
 */
export const RANKS = [
  { index: 0, id: 'seeker', name: 'Seeker', xp: 0, ref: 'Matthew 7:7' },
  { index: 1, id: 'steward', name: 'Steward', xp: 300, ref: '1 Corinthians 4:2' },
  { index: 2, id: 'builder', name: 'Builder', xp: 800, ref: 'Nehemiah 2:18' },
  { index: 3, id: 'keeper', name: 'Keeper', xp: 1400, ref: 'Genesis 2:15' },
  { index: 4, id: 'pathfinder', name: 'Pathfinder', xp: 2250, ref: 'Psalm 119:105' },
  { index: 5, id: 'commander', name: 'Commander', xp: 3500, ref: 'Joshua 1:9' },
  { index: 6, id: 'pioneer', name: 'Pioneer', xp: 5200, ref: 'Isaiah 43:19' },
]
const rankLite = (r) => (r ? { index: r.index, id: r.id, name: r.name, xp: r.xp, ref: r.ref } : null)
/** → { index, id, name, ref, xp (what you passed in), floor, ceil, next:{index,id,name,xp}|null, toNext, pct (0..1 inside the band), max } */
export function rankFor(xp) {
  const n = Math.max(0, Math.floor(Number(xp) || 0))
  let i = 0
  for (let k = 0; k < RANKS.length; k++) if (n >= RANKS[k].xp) i = k
  const cur = RANKS[i]
  const nxt = RANKS[i + 1] || null
  return {
    index: i, id: cur.id, name: cur.name, ref: cur.ref, xp: n, floor: cur.xp, ceil: nxt ? nxt.xp : null,
    next: rankLite(nxt), toNext: nxt ? nxt.xp - n : 0, pct: nxt ? (n - cur.xp) / (nxt.xp - cur.xp) : 1, max: !nxt,
  }
}

/* ======================================================================== *
 *  State shape + migration
 * ======================================================================== */
const EMPTY_SUB = Object.freeze({ done: {}, pos: {}, notes: {}, notesAt: {}, cards: [], results: {}, drops: {} })
const emptySeries = () => ({ done: {}, pos: {}, notes: {}, notesAt: {}, cards: [], results: {}, drops: {} })
const zeroTally = (date) => ({ date, xp: 0, right: 0, asked: 0, lessons: 0, practice: 0, scored: [] })
const emptyStats = () => ({ right: 0, asked: 0, comebacks: 0, shieldsUsed: 0, shieldsEarned: 0, graced: 0, perfectRun: 0, bestPerfectRun: 0 })
const newSalt = () => Math.random().toString(36).slice(2, 10) + now().getTime().toString(36).slice(-3)

export function freshState(salt) {
  return {
    v: SCHEMA, salt: salt || newSalt(),
    // who
    name: '', role: 'teen', emoji: '', familyName: '', kids: [], onboarded: false, onboardedAt: null,
    dailyGoalXp: DEFAULT_GOAL_XP, reminderHour: 20,
    // the loop
    xp: 0, streak: 0, best: 0, lastDone: null, covered: null, lost: null, shields: 0, fragments: 0, gems: 0,
    daily: zeroTally(null), log: {}, saves: {}, stats: emptyStats(),
    achievements: {}, achSeen: [], claims: {}, notices: [], flags: {},
    series: {},
  }
}

const int = (x, lo = 0, hi = Infinity, def = 0) => {
  const n = Math.floor(Number(x))
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def
}
const str = (x, def = '') => (typeof x === 'string' ? x : def)
const key_ = (x) => (isKey(x) ? x : null)
const plain = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {})
const dayKeyed = (obj, fn) => {
  const out = {}
  for (const [k, v] of Object.entries(plain(obj))) {
    const d = Number(k)
    if (!Number.isInteger(d) || d < 1 || d > 366) continue
    const r = fn(v, d)
    if (r !== undefined) out[d] = r
  }
  return out
}

function cleanSub(raw, fallbackKey) {
  const r = plain(raw)
  const sub = emptySeries()
  sub.done = dayKeyed(r.done, (v) => (isKey(v) ? v : v ? fallbackKey : undefined))
  sub.pos = dayKeyed(r.pos, (v) => int(v))
  sub.notes = dayKeyed(r.notes, (v) => (typeof v === 'string' ? v : undefined))
  sub.notesAt = dayKeyed(r.notesAt, (v) => key_(v) || undefined)
  sub.cards = [...new Set((Array.isArray(r.cards) ? r.cards : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))]
  sub.results = dayKeyed(r.results, (v) => {
    const o = plain(v)
    return { date: key_(o.date), time: /^\d{2}:\d{2}$/.test(o.time || '') ? o.time : null, right: int(o.right), asked: int(o.asked), perfect: Boolean(o.perfect), xp: int(o.xp) }
  })
  sub.drops = dayKeyed(r.drops, (v) => {
    const o = plain(v)
    return ['xp', 'shield', 'fragment'].includes(o.kind) ? { ...o } : undefined
  })
  return sub
}

/**
 * Anything → a valid v6 state. Idempotent. Accepts v5 (and thinner) saves, partial seeds ({ onboarded, name }) and garbage.
 * Upgrading from < v6: nothing is lost (XP, streak, cards, notes, done days all carry over) and the new layers are derived —
 * the heat-map log from finished dates, one shield per completed 7-day block of the existing streak, retroactive medals (marked seen).
 */
export function migrate(raw, at = now()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return freshState()
  const fromV = Number(raw.v) || 0
  const keyNow = today(at)
  const st = freshState(typeof raw.salt === 'string' && raw.salt ? raw.salt : undefined)

  st.name = str(raw.name).slice(0, 60)
  st.role = ['teen', 'parent', 'family'].includes(raw.role) ? raw.role : 'teen'
  st.emoji = str(raw.emoji)
  st.familyName = str(raw.familyName).slice(0, 60)
  st.kids = (Array.isArray(raw.kids) ? raw.kids : [])
    .map((k) => ({ name: str(typeof k === 'string' ? k : k?.name).trim().slice(0, 40) }))
    .filter((k) => k.name)
  st.onboarded = Boolean(raw.onboarded)
  st.onboardedAt = key_(raw.onboardedAt)
  st.dailyGoalXp = GOALS.some((g) => g.xp === Number(raw.dailyGoalXp)) ? Number(raw.dailyGoalXp) : DEFAULT_GOAL_XP
  st.reminderHour = int(raw.reminderHour, 0, 23, 20)

  st.xp = int(raw.xp)
  st.streak = int(raw.streak)
  st.best = Math.max(int(raw.best), st.streak)
  st.lastDone = key_(raw.lastDone)
  st.gems = int(raw.gems) // legacy v5 currency: preserved, never awarded again
  st.fragments = int(raw.fragments)
  st.shields = int(raw.shields, 0, SHIELD_MAX)
  st.covered = st.streak > 0 ? key_(raw.covered) || st.lastDone : null
  if (st.streak > 0 && !st.lastDone) st.streak = 0
  const lost = plain(raw.lost)
  st.lost = lost.from ? { from: int(lost.from), on: key_(lost.on) } : null

  const d = plain(raw.daily)
  st.daily = { ...zeroTally(key_(d.date)), xp: int(d.xp), right: int(d.right), asked: int(d.asked), lessons: int(d.lessons), practice: int(d.practice), scored: (Array.isArray(d.scored) ? d.scored : []).filter((x) => typeof x === 'string').slice(-200) }
  for (const [k, v] of Object.entries(plain(raw.log))) {
    if (!isKey(k)) continue
    const o = plain(v)
    st.log[k] = { lessons: int(o.lessons), xp: int(o.xp), right: int(o.right), goal: Boolean(o.goal) }
  }
  for (const [k, v] of Object.entries(plain(raw.saves))) if (isKey(k) && (v === 'shield' || v === 'selah')) st.saves[k] = v
  const sx = plain(raw.stats)
  for (const k of Object.keys(st.stats)) st.stats[k] = int(sx[k])
  for (const [k, v] of Object.entries(plain(raw.achievements))) if (isKey(v)) st.achievements[k] = v
  st.achSeen = (Array.isArray(raw.achSeen) ? raw.achSeen : []).filter((x) => typeof x === 'string')
  for (const [k, v] of Object.entries(plain(raw.claims))) if (isKey(v)) st.claims[k] = v
  st.notices = (Array.isArray(raw.notices) ? raw.notices : []).filter((n) => n && typeof n.type === 'string').slice(-12)
  for (const [k, v] of Object.entries(plain(raw.flags))) if (typeof k === 'string' && k.length <= 60 && (v === true || isKey(v))) st.flags[k] = v

  for (const [id, sub] of Object.entries(plain(raw.series))) st.series[id] = cleanSub(sub, st.lastDone || keyNow)

  if (fromV < SCHEMA) {
    // derive the heat-map log from finished dates (a lower bound: every finished day paid at least the completion bonus)
    for (const sub of Object.values(st.series))
      for (const k of Object.values(sub.done)) {
        const e = st.log[k] || { lessons: 0, xp: 0, right: 0, goal: false }
        st.log[k] = { ...e, lessons: e.lessons + 1, xp: e.xp + XP.complete }
      }
    if (st.daily.date) {
      const e = st.log[st.daily.date] || { lessons: 0, xp: 0, right: 0, goal: false }
      st.log[st.daily.date] = { lessons: Math.max(e.lessons, st.daily.lessons), xp: Math.max(e.xp, st.daily.xp), right: Math.max(e.right, st.daily.right), goal: e.goal || st.daily.xp >= st.dailyGoalXp }
    }
    // a streak that already ran for 7 days would have earned a shield; honour that retroactively (never above the cap)
    st.shields = Math.max(st.shields, Math.min(SHIELD_MAX, Math.floor(st.streak / SHIELD_EVERY)))
    if (st.onboarded && !st.onboardedAt) st.onboardedAt = keyNow
    const swept = sweep(st, keyNow)
    st.achievements = swept.st.achievements
    st.achSeen = Object.keys(st.achievements) // retro medals are history, not news
  }
  st.v = SCHEMA
  return st
}

/* ======================================================================== *
 *  Store: persistence, subscription, the single commit()
 * ======================================================================== */
function readStorage() {
  try { return localStorage.getItem(KEY) } catch { return null }
}
function persist(st) {
  try { localStorage.setItem(KEY, JSON.stringify(st)) } catch { /* private mode / quota: keep running in memory */ }
}
function parse(text) {
  if (!text) return null
  try { return JSON.parse(text) } catch { return null }
}

let state
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())
function boot() {
  const text = readStorage()
  const raw = parse(text)
  state = migrate(raw)
  if (raw && Number(raw.v) !== SCHEMA) {
    // one-time safety net: keep the pre-migration save next to the new one
    try { if (!localStorage.getItem(KEY + ':pre-v6')) localStorage.setItem(KEY + ':pre-v6', text) } catch { /* ignore */ }
    persist(state)
  }
}
/** Re-read localStorage (another tab wrote, or a test seeded it). */
export function reload() {
  boot()
  notify()
  return state
}
/**
 * The one door every write goes through. Sweeps achievements into the same state, persists once, notifies once. Returns the ids earned by this write.
 * { sweep: false } is for mid-lesson answers: medals are awarded at moments of ceremony (finishDay, a claim, a profile edit), so the
 * completion screen can present everything the lesson earned in one go.
 */
function commit(next, { sweep: doSweep = true } = {}) {
  const { st, earned } = doSweep ? sweep(next, today(now())) : { st: next, earned: [] }
  if (st === state) return earned
  state = st
  persist(state)
  notify()
  return earned
}

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export const snapshot = () => state
/** The reactive state. Re-renders on every commit. */
export function useStore() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
/** A Date that re-renders its component every `ms` (and when the tab becomes visible again). For countdowns and the midnight roll-over. */
export function useClock(ms = 1000) {
  const [t, setT] = useState(() => now())
  useEffect(() => {
    const tick = () => setT(now())
    const id = setInterval(tick, ms)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [ms])
  return t
}
/** 'YYYY-MM-DD' of today, re-evaluated every 30 s so a screen left open rolls over at midnight. */
export const useToday = () => today(useClock(30000))
/** The streak as it should be shown right now (streakInfo, live-updating). Never read `st.streak` for display: it goes stale overnight. */
export function useStreak() {
  const st = useStore()
  return streakInfo(st, useClock(30000))
}
/** launchState for a series, ticking every `ms` (default 1 s so the countdown moves). */
export function useLaunch(s, ms = 1000) {
  const st = useStore()
  return launchState(s, st, useClock(ms))
}

/* ======================================================================== *
 *  Basic reads (kept from v5)
 * ======================================================================== */
export const sub = (st, id) => st.series[id] || EMPTY_SUB
export const isDayDone = (st, id, day) => Boolean(sub(st, id).done[day])
export const noteFor = (st, id, day) => sub(st, id).notes[day] || ''
export const posFor = (st, id, day) => sub(st, id).pos[day] || 0
export const unlockedCards = (st, id) => sub(st, id).cards
export const doneDays = (st, id) => Object.keys(sub(st, id).done).map(Number).sort((a, b) => a - b)
export const dailyGoalXp = (st) => st.dailyGoalXp || DEFAULT_GOAL_XP

/** Progress through each stage, 0..1, in stage order. */
export function weekProgress(st, id) {
  const s = getSeries(id)
  const done = sub(st, id).done
  return stageDays(s).map((days) => {
    const play = days.filter((d) => isPlayable(s, d))
    return play.length ? play.filter((d) => done[d]).length / play.length : 0
  })
}
export const perfectWeeks = (st, id) => weekProgress(st, id).filter((p) => p >= 1).length

/** Live mode only: past days you have not done. (Archive has no "missed", only "not yet".) */
export function missedDays(st, id, todayNo, at = now()) {
  const s = getSeries(id)
  if (modeOf(s, at) !== 'live') return []
  const t = todayNo ?? currentDay(s, st, at)
  return s.calendar.filter((d) => d.day < t && d.type !== 'rest' && !sub(st, id).done[d.day]).map((d) => d.day)
}

/* ======================================================================== *
 *  Today: tally, rings, daily quests
 * ======================================================================== */
/** Today's tally. A stale day reads as zero, never yesterday's. */
export const todayTally = (st, k = today()) => (st.daily?.date === k ? st.daily : zeroTally(k))

const ring = (id, label, n, goal) => ({ id, label, now: n, goal, value: Math.min(1, n / goal), done: n >= goal })
const ringsOf = (goalXp, t) => [ring('lesson', 'Lesson', t.lessons, 1), ring('xp', 'XP', t.xp, goalXp), ring('right', 'Accuracy', t.right, RIGHT_GOAL)]
/** The three daily rings: [{ id:'lesson'|'xp'|'right', label, value:0..1, now, goal, done }]. */
export const rings = (st, k = today()) => ringsOf(dailyGoalXp(st), todayTally(st, k))
export const ringsClosed = (st, k = today()) => rings(st, k).filter((r) => r.done).length

/** v5's quest board, preserved. The XP quest follows the daily goal the player chose. */
export const QUESTS = [
  { id: 'lesson', label: 'Finish today’s lesson', goal: 1, of: (t) => t.lessons },
  { id: 'xp', label: 'Earn 40 XP', goal: 40, of: (t) => t.xp },
  { id: 'right', label: 'Get 3 answers right', goal: RIGHT_GOAL, of: (t) => t.right },
]
export function questState(st, k = today()) {
  const t = todayTally(st, k)
  return QUESTS.map((q) => {
    const goal = q.id === 'xp' ? dailyGoalXp(st) : q.goal
    const label = q.id === 'xp' ? `Earn ${goal} XP` : q.label
    return { ...q, goal, label, at: Math.min(q.of(t), goal), done: q.of(t) >= goal }
  })
}

/* ======================================================================== *
 *  Seeded randomness + supply drops
 * ======================================================================== */
const hash32 = (text) => {
  let h = 1779033703 ^ text.length
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
/** A deterministic PRNG for any string seed: `const r = rng('x'); r() → [0,1)`. */
export const rng = (seed) => mulberry32(hash32(String(seed)))
const weighted = (rnd, table) => {
  let x = rnd() * table.reduce((a, [, w]) => a + w, 0)
  for (const [v, w] of table) { x -= w; if (x < 0) return v }
  return table[table.length - 1][0]
}
const DROP_XP = [[10, 30], [15, 28], [20, 20], [25, 13], [30, 9]]   // mean ≈ 17
const CHEST_XP = [[10, 35], [15, 30], [20, 22], [25, 13]]           // mean ≈ 16

/**
 * The post-lesson supply drop for a seed. Pure and deterministic: the same seed always rolls the same drop.
 * ≈60 % xp (10–30) · 25 % shield · 15 % patch fragment.  → { kind, rarity:'common'|'rare'|'epic', xp?, roll }
 */
export function rollDrop(seed) {
  const rnd = rng(`drop|${seed}`)
  const pick = rnd()
  if (pick < 0.6) {
    const xp = weighted(rnd, DROP_XP)
    return { kind: 'xp', xp, rarity: xp >= 25 ? 'rare' : 'common', roll: pick }
  }
  if (pick < 0.85) return { kind: 'shield', rarity: 'rare', roll: pick }
  return { kind: 'fragment', rarity: 'epic', roll: pick }
}
/** The daily chest reward for a seed: always XP, 10–25. */
export const rollChest = (seed) => ({ kind: 'xp', xp: weighted(rng(`chest|${seed}`), CHEST_XP), rarity: 'rare' })
/** The seed finishDay rolls a day's drop with: `${install salt}|${seriesId}|${day}`. Exposed so tests (and curious UIs) can predict it. */
export const dropSeedFor = (st, seriesId, day) => `${st.salt}|${seriesId}|${day}`

/** The drop persisted for (series, day), or null. It is written once, at finishDay, and never re-rolled. */
export const dropFor = (st, seriesId, day) => sub(st, seriesId).drops[day] || null
/** → { count, needed, patches (assembled), toward (0..needed-1), pct } */
export const fragmentState = (st) => ({
  count: st.fragments, needed: FRAGMENTS_PER_PATCH, patches: Math.floor(st.fragments / FRAGMENTS_PER_PATCH),
  toward: st.fragments % FRAGMENTS_PER_PATCH, pct: (st.fragments % FRAGMENTS_PER_PATCH) / FRAGMENTS_PER_PATCH,
})

/* ======================================================================== *
 *  XP bookkeeping (pure)
 * ======================================================================== */
function addXp(st, amount, k, { right = 0, asked = 0, lessons = 0, practice = 0 } = {}) {
  const t = todayTally(st, k)
  const daily = { ...t, date: k, xp: t.xp + amount, right: t.right + right, asked: t.asked + asked, lessons: t.lessons + lessons, practice: t.practice + practice }
  const e = st.log[k] || { lessons: 0, xp: 0, right: 0, goal: false }
  const log = { ...st.log, [k]: { lessons: e.lessons + lessons, xp: e.xp + amount, right: e.right + right, goal: e.goal || daily.xp >= dailyGoalXp(st) } }
  return { ...st, xp: st.xp + amount, daily, log }
}

/** Shield bookkeeping: +1 up to the cap; at the cap the shield becomes XP. → { st, kind:'shield'|'xp', xp } */
function grantShield(st) {
  if (st.shields < SHIELD_MAX)
    return { st: { ...st, shields: st.shields + 1, stats: { ...st.stats, shieldsEarned: st.stats.shieldsEarned + 1 } }, kind: 'shield', xp: 0 }
  return { st, kind: 'xp', xp: XP.shieldOverflow }
}

/* ======================================================================== *
 *  The streak engine
 * ======================================================================== */
const GRACE_TYPES = new Set(['selah', 'rest', 'review'])
/**
 * Is this calendar date a rest day that can never break a streak? Inside a series' month the series calendar decides
 * (Selah / rest / review days). Outside every month (archive) Sunday is Selah — the same rule the August calendar follows.
 */
export function graceKind(k) {
  const hit = allSeries.find((s) => dayOfKey(s, k) != null)
  if (hit) return GRACE_TYPES.has(dayInfo(hit, dayOfKey(hit, k)).type) ? 'selah' : null
  return weekdayOf(k) === 0 ? 'selah' : null
}

/**
 * Bring the streak up to date for `k` (today) by walking every day you missed since the last covered one.
 * For each missed day: a rest day (Selah grace) is forgiven for free; otherwise a shield is spent; otherwise the streak ends there.
 * Grace is tried BEFORE shields so a free pass never wastes one you earned. Shields are all-or-nothing: if the gap cannot be bridged
 * in full the streak ends and **no shield is consumed** (a shield that holds nothing is not spent).
 * → { st, events:[{type:'grace'|'shield'|'lost', date, from?}] }   (st === input when nothing changed)
 */
export function settlePure(st, k) {
  if (st.streak <= 0 || !st.lastDone) return { st, events: [] }
  let covered = st.covered || st.lastDone
  if (covered >= k) return { st, events: [] }
  const { streak, lost } = st
  let shields = st.shields
  const saves = { ...st.saves }
  const stats = { ...st.stats }
  const events = []
  let guard = 0
  for (let d = addDays(covered, 1); d < k && guard++ < 400; d = addDays(d, 1)) {
    if (graceKind(d)) {
      saves[d] = 'selah'; stats.graced++; events.push({ type: 'grace', date: d }); covered = d
    } else if (shields > 0) {
      shields--; saves[d] = 'shield'; stats.shieldsUsed++; events.push({ type: 'shield', date: d }); covered = d
    } else {
      // the gap cannot be bridged: keep the shields (and the book-keeping) exactly as they were
      const from = st.streak
      return { st: { ...st, streak: 0, covered: null, lost: { from, on: d } }, events: [{ type: 'lost', date: d, from }] }
    }
  }
  if (!events.length) return { st, events }
  return { st: { ...st, streak, shields, covered, lost, saves, stats }, events }
}

const nextMilestone = (n) => {
  const at = MILESTONES.find((m) => m > n)
  return at ? { at, daysTo: at - n, xp: MILESTONE_XP[at] } : null
}

/**
 * The streak as the UI should show it right now — without writing anything.
 * state: 'none' (never started) · 'done' (finished today) · 'rest' (today is a Selah day; the streak rests) · 'at-risk' (alive, today's lesson still to do) · 'lost'
 * `shields` is what you will have after any shield a missed day is about to spend (`pending.shield`).
 */
export function streakInfo(st, at = now()) {
  const k = today(at)
  const { st: s1, events } = settlePure(st, k)
  const alive = s1.streak > 0
  const doneToday = st.lastDone === k
  const restDay = Boolean(graceKind(k))
  const msLeft = msToMidnight(at)
  const lostEv = events.find((e) => e.type === 'lost')
  const pending = { shield: events.filter((e) => e.type === 'shield').length, grace: events.filter((e) => e.type === 'grace').length }
  return {
    state: !alive ? (st.best > 0 ? 'lost' : 'none') : doneToday ? 'done' : restDay ? 'rest' : 'at-risk',
    count: s1.streak, best: st.best, alive, doneToday, atRisk: alive && !doneToday && !restDay, restDay: alive && !doneToday && restDay,
    msLeft, hoursLeft: msLeft / 3.6e6,
    shields: s1.shields, held: st.shields, max: SHIELD_MAX, pending, shielded: pending.shield > 0,
    lostFrom: alive ? 0 : lostEv?.from ?? st.lost?.from ?? 0,
    next: nextMilestone(s1.streak), shieldIn: SHIELD_EVERY - (s1.streak % SHIELD_EVERY),
    lastDone: st.lastDone,
  }
}

/**
 * Materialise any shield spends / grace days / a lost streak into state, once, and queue notices for the UI.
 * Call on boot, on visibilitychange and when the date rolls over. Idempotent. Returns the events it applied.
 */
export function settleStreak() {
  const { st, events } = settlePure(state, today(now()))
  if (!events.length) return []
  const notices = [...st.notices, ...events.map((e) => ({ id: `${e.type}:${e.date}`, ...e }))].slice(-12)
  commit({ ...st, notices })
  return events
}
export const notices = (st) => st.notices
/** Dismiss notices (all, or just the given ids). */
export function ackNotices(ids) {
  if (!state.notices.length) return
  commit({ ...state, notices: ids ? state.notices.filter((n) => !ids.includes(n.id)) : [] })
}

/* ======================================================================== *
 *  Achievements (medals)
 * ======================================================================== */
const factCache = new WeakMap()
/** Everything the medal tests need, derived from the state (so a v5 save earns what it already deserved). Cached per state object. */
function factsOf(st) {
  let f = factCache.get(st)
  if (f) return f
  f = {
    lessons: 0, perfect: 0, early: 0, late: 0, journal: 0, cards: 0, rare: 0, selah: 0, missions: 0, goldSets: 0, seriesStarted: 0,
    stageClears: new Set(), stagesCleared: 0,
    goalDays: Object.values(st.log).filter((l) => l.goal).length,
    chests: Object.keys(st.claims).filter((id) => id.startsWith('chest:')).length,
  }
  for (const s of allSeries) {
    const sb = st.series[s.id]
    if (!sb) continue
    const days = Object.keys(sb.done).map(Number).filter((d) => d >= 1 && d <= s.calendar.length)
    if (days.length) f.seriesStarted++
    f.lessons += days.length
    f.selah += days.filter((d) => dayInfo(s, d).type === 'selah').length
    f.journal += Object.values(sb.notes).filter((t) => t && t.trim()).length
    for (const r of Object.values(sb.results)) {
      if (r.perfect) f.perfect++
      if (r.time && r.time < '07:00') f.early++
      if (r.time && r.time >= '21:00') f.late++
    }
    const have = new Set(sb.cards)
    f.cards += s.codes.filter((c) => have.has(c.no)).length
    const rare = s.codes.filter((c) => c.rare)
    const rareHave = rare.filter((c) => have.has(c.no)).length
    f.rare += rareHave
    if (rare.length && rareHave === rare.length) f.goldSets++
    const play = s.calendar.filter((d) => d.type !== 'rest')
    if (play.length && play.every((d) => sb.done[d.day])) f.missions++
    stageDays(s).forEach((ds, i) => {
      const p = ds.filter((d) => isPlayable(s, d))
      if (p.length && p.every((d) => sb.done[d])) { f.stageClears.add(i); f.stagesCleared++ }
    })
  }
  factCache.set(st, f)
  return f
}
const at_least = (get, goal) => ({
  test: (st) => get(st) >= goal,
  progress: (st) => ({ now: Math.min(get(st), goal), goal }),
})
const F = (key) => (st) => factsOf(st)[key]
const S = (key) => (st) => st.stats[key]
const medal = (id, title, desc, tier, icon, rule) => ({ id, title, desc, tier, icon, ...rule })
const plainRule = (test) => ({ test, progress: null })

/** Tiers, lowest to highest. */
export const TIERS = ['bronze', 'silver', 'gold', 'ti']
/**
 * The medals. { id, title, desc, tier:'bronze'|'silver'|'gold'|'ti', icon (an icons.jsx name), test(st) → boolean, progress(st) → {now,goal}|null }
 * Order is the display order of the Locker.
 */
export const ACHIEVEMENTS = [
  medal('preflight', 'Pre-flight Complete', 'Finish setup and choose your daily goal.', 'bronze', 'check', plainRule((st) => st.onboarded)),
  medal('first-launch', 'First Launch', 'Finish your first lesson.', 'bronze', 'rocket', at_least(F('lessons'), 1)),
  medal('perfect-day', 'Perfect Day', 'Answer every check right on the first try.', 'bronze', 'target', at_least(F('perfect'), 1)),
  medal('lessons-10', 'Ten Launches', 'Finish 10 lessons.', 'bronze', 'flag', at_least(F('lessons'), 10)),
  medal('lessons-25', 'Twenty-five Flights', 'Finish 25 lessons.', 'silver', 'flag', at_least(F('lessons'), 25)),
  medal('lessons-50', 'Half-century', 'Finish 50 lessons.', 'gold', 'flag', at_least(F('lessons'), 50)),

  medal('streak-3', 'Ignition Holding', 'Reach a 3-day streak.', 'bronze', 'flame', at_least((st) => st.best, 3)),
  medal('streak-7', 'Seven Days Aloft', 'Reach a 7-day streak.', 'silver', 'flame', at_least((st) => st.best, 7)),
  medal('streak-14', 'Two Weeks Strong', 'Reach a 14-day streak.', 'silver', 'flame', at_least((st) => st.best, 14)),
  medal('streak-21', 'Habit Forged', 'Reach a 21-day streak.', 'gold', 'flame', at_least((st) => st.best, 21)),
  medal('streak-31', 'Full Orbit', 'Reach a 31-day streak.', 'gold', 'flame', at_least((st) => st.best, 31)),
  medal('streak-100', 'Centurion', 'Reach a 100-day streak.', 'ti', 'flame', at_least((st) => st.best, 100)),

  medal('early-bird', 'Early Bird', 'Finish a lesson before 7:00.', 'bronze', 'sparkle', at_least(F('early'), 1)),
  medal('night-owl', 'Night Owl', 'Finish a lesson after 9 pm.', 'bronze', 'moon', at_least(F('late'), 1)),

  medal('scripture-scholar', 'Scripture Scholar', 'Finish 10 perfect lessons.', 'silver', 'book', at_least(F('perfect'), 10)),
  medal('flawless-5', 'Flawless Five', 'Five perfect lessons in a row.', 'gold', 'target', at_least(S('bestPerfectRun'), 5)),
  medal('sharp-100', 'Sharpshooter', 'Answer 100 checks correctly.', 'bronze', 'check', at_least(S('right'), 100)),
  medal('sharp-250', 'Dead Centre', 'Answer 250 checks correctly.', 'silver', 'check', at_least(S('right'), 250)),

  medal('first-words', 'First Words', 'Write your first journal entry.', 'bronze', 'pen', at_least(F('journal'), 1)),
  medal('journal-10', 'Journal ×10', 'Write 10 journal entries.', 'silver', 'journal', at_least(F('journal'), 10)),
  medal('journal-25', 'Chronicler', 'Write 25 journal entries.', 'gold', 'journal', at_least(F('journal'), 25)),

  medal('shield-saver', 'Shield Saver', 'Let a shield save your streak.', 'bronze', 'shield', at_least(S('shieldsUsed'), 1)),
  medal('fully-shielded', 'Fully Shielded', 'Hold two shields at once.', 'silver', 'shield', plainRule((st) => st.shields >= SHIELD_MAX)),

  medal('stage-1', 'Stage 1 Clear', 'Clear the first stage of a mission.', 'bronze', 'patch', plainRule((st) => factsOf(st).stageClears.has(0))),
  medal('stage-2', 'Stage 2 Clear', 'Clear the second stage of a mission.', 'silver', 'patch', plainRule((st) => factsOf(st).stageClears.has(1))),
  medal('stage-3', 'Stage 3 Clear', 'Clear the third stage of a mission.', 'silver', 'patch', plainRule((st) => factsOf(st).stageClears.has(2))),
  medal('stage-4', 'Stage 4 Clear', 'Clear the fourth stage of a mission.', 'gold', 'patch', plainRule((st) => factsOf(st).stageClears.has(3))),
  medal('full-month', 'Full Month', 'Finish every day of a mission.', 'gold', 'trophy', at_least(F('missions'), 1)),
  medal('all-gold', 'All Gold', 'Collect every gold code card of a mission.', 'gold', 'card', at_least(F('goldSets'), 1)),
  medal('double-mission', 'Double Mission', 'Finish every day of two missions.', 'ti', 'crown', at_least(F('missions'), 2)),

  medal('rare-card', 'Gold Foil', 'Earn your first gold code card.', 'silver', 'card', at_least(F('rare'), 1)),
  medal('collector-10', 'Collector', 'Hold 10 code cards.', 'bronze', 'card', at_least(F('cards'), 10)),
  medal('collector-25', 'Curator', 'Hold 25 code cards.', 'silver', 'card', at_least(F('cards'), 25)),

  medal('xp-500', 'First Burn', 'Earn 500 XP.', 'bronze', 'bolt', at_least((st) => st.xp, 500)),
  medal('xp-1500', 'Climbing Power', 'Earn 1,500 XP.', 'silver', 'bolt', at_least((st) => st.xp, 1500)),
  medal('xp-3000', 'Full Thrust', 'Earn 3,000 XP.', 'gold', 'bolt', at_least((st) => st.xp, 3000)),
  medal('rank-1', `Rank: ${RANKS[1].name}`, `Reach the rank of ${RANKS[1].name}.`, 'bronze', 'star', plainRule((st) => rankFor(st.xp).index >= 1)),
  medal('rank-3', `Rank: ${RANKS[3].name}`, `Reach the rank of ${RANKS[3].name}.`, 'silver', 'star', plainRule((st) => rankFor(st.xp).index >= 3)),
  medal('rank-6', `Rank: ${RANKS[6].name}`, `Reach the rank of ${RANKS[6].name}.`, 'ti', 'crown', plainRule((st) => rankFor(st.xp).index >= 6)),

  medal('goal-getter', 'Goal Getter', 'Reach your daily XP goal on 7 days.', 'silver', 'target', at_least(F('goalDays'), 7)),
  medal('relic-found', 'Relic Found', 'Find a patch fragment in a supply drop.', 'bronze', 'sparkle', at_least((st) => st.fragments, 1)),
  medal('patch-assembled', 'Patch Assembled', `Collect ${FRAGMENTS_PER_PATCH} fragments to build a rare patch.`, 'gold', 'patch', at_least((st) => st.fragments, FRAGMENTS_PER_PATCH)),
  medal('comeback', 'Back on the Pad', 'Return after 3 or more days away.', 'bronze', 'refresh', at_least(S('comebacks'), 1)),
  medal('selah-keeper', 'Selah Keeper', 'Finish 3 Selah days.', 'bronze', 'heart', at_least(F('selah'), 3)),
  medal('crew', 'Crew Assembled', 'Add a family member to your crew.', 'bronze', 'users', plainRule((st) => st.kids.length >= 1)),
  medal('wide-orbit', 'Wide Orbit', 'Finish a lesson in two different missions.', 'bronze', 'orbit', at_least(F('seriesStarted'), 2)),
  medal('chest-1', 'First Chest', 'Open a daily chest.', 'bronze', 'chest', at_least(F('chests'), 1)),
  medal('chest-7', 'Seven Chests', 'Open 7 daily chests.', 'silver', 'chest', at_least(F('chests'), 7)),
]

/** Adds any newly satisfied medals (dated k) to the state. → { st, earned:[ids] }; st is the same object when nothing was earned. */
function sweep(st, k) {
  let earned
  for (const a of ACHIEVEMENTS) {
    if (st.achievements[a.id]) continue
    let ok = false
    try { ok = a.test(st) } catch { ok = false }
    if (ok) (earned ||= []).push(a.id)
  }
  if (!earned) return { st, earned: [] }
  const achievements = { ...st.achievements }
  for (const id of earned) achievements[id] = k
  return { st: { ...st, achievements }, earned }
}

/** Every medal with its status: { …medal, earned, on:'YYYY-MM-DD'|null, isNew, progress:{now,goal}|null } (no test fn). */
export function medals(st) {
  return ACHIEVEMENTS.map(({ test, progress, ...a }) => {
    const on = st.achievements[a.id] || null
    return { ...a, earned: Boolean(on), on, isNew: Boolean(on) && !st.achSeen.includes(a.id), progress: on ? null : progress ? safe(() => progress(st)) : null }
  })
}
const safe = (fn) => { try { return fn() } catch { return null } }
export const earnedMedals = (st) => medals(st).filter((m) => m.earned)
/** The `n` unearned medals closest to done (by progress), for "next up" shelves. */
export function nextMedals(st, n = 3) {
  return medals(st)
    .filter((m) => !m.earned && m.progress)
    .map((m) => ({ ...m, ratio: m.progress.now / m.progress.goal }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, n)
}
/** Medals earned but never shown (Locker badge / toast). finishDay's result lists its own; the completion screen should markSeen them. */
export const unseenMedals = (st) => Object.keys(st.achievements).filter((id) => !st.achSeen.includes(id))
export function markSeen(ids) {
  const list = ids ?? unseenMedals(state)
  const fresh = list.filter((id) => !state.achSeen.includes(id))
  if (fresh.length) commit({ ...state, achSeen: [...state.achSeen, ...fresh] })
}
/** Run the medal tests now (e.g. after content changed). Returns the ids newly earned. Every write already does this itself. */
export const checkAchievements = () => commit(state)

/* ======================================================================== *
 *  Heat-map & calendar
 * ======================================================================== */
/** { 'YYYY-MM-DD': { lessons, xp, right, goal } } — everything you did, by day. Finished days with no log (old saves) are filled in. */
export function activityByDate(st) {
  const out = {}
  for (const [k, v] of Object.entries(st.log)) out[k] = { lessons: v.lessons, xp: v.xp, right: v.right, goal: v.goal }
  const seen = {}
  for (const sb of Object.values(st.series)) for (const k of Object.values(sb.done)) seen[k] = (seen[k] || 0) + 1
  for (const [k, n] of Object.entries(seen)) {
    if (!out[k]) out[k] = { lessons: n, xp: n * XP.complete, right: 0, goal: false }
    else if (out[k].lessons < 1) out[k] = { ...out[k], lessons: 1 }
  }
  return out
}
const pad2 = (n) => String(n).padStart(2, '0')
const levelOf = (a, goal) => (!a || (!a.lessons && !a.xp) ? 0 : a.xp >= goal * 2 ? 4 : a.xp >= goal * 1.5 ? 3 : a.xp >= goal ? 2 : 1)
/**
 * A month grid for the flame calendar. weeks[] hold 7 cells (null padding), Monday first unless `weekStart` = 0.
 * cell: { key, day, lessons, xp, level:0..4, flame, goal, save:'shield'|'selah'|null, rest, today, future }
 */
export function calendarMonth(st, year, month, { at = now(), weekStart = 1 } = {}) {
  const act = activityByDate(st)
  const t = today(at)
  const n = new Date(year, month, 0).getDate()
  const goal = dailyGoalXp(st)
  const cells = []
  for (let d = 1; d <= n; d++) {
    const k = `${year}-${pad2(month)}-${pad2(d)}`
    const a = act[k]
    cells.push({
      key: k, day: d, lessons: a?.lessons || 0, xp: a?.xp || 0, level: levelOf(a, goal), flame: Boolean(a?.lessons),
      goal: Boolean(a?.goal), save: st.saves[k] || null, rest: Boolean(graceKind(k)), today: k === t, future: k > t,
    })
  }
  const lead = (weekdayOf(cells[0].key) - weekStart + 7) % 7
  const padded = [...Array(lead).fill(null), ...cells]
  while (padded.length % 7) padded.push(null)
  const weeks = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))
  return {
    year, month, weeks, cells, lessons: cells.reduce((a, c) => a + c.lessons, 0), activeDays: cells.filter((c) => c.flame).length,
    label: `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month - 1]} ${year}`,
  }
}

/** The last 7 days ending today, oldest first, for the HUD strip: [{ key, label:'M'…'S', lessons, flame, save, rest, today }]. */
export function weekStrip(st, at = now()) {
  const act = activityByDate(st)
  const t = today(at)
  return Array.from({ length: 7 }, (_, i) => {
    const k = addDays(t, i - 6)
    return { key: k, label: 'SMTWTFS'[weekdayOf(k)], lessons: act[k]?.lessons || 0, flame: Boolean(act[k]?.lessons), save: st.saves[k] || null, rest: Boolean(graceKind(k)), today: k === t }
  })
}

/**
 * When you usually launch: the median clock time of your last 14 finished lessons → { hour, min, n } (null before 3 lessons).
 * The reminder picker can offer it ("You usually launch around 7:30 pm").
 */
export function usualTime(st) {
  const rows = []
  for (const sb of Object.values(st.series)) for (const r of Object.values(sb.results)) if (r.date && r.time) rows.push(r)
  rows.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  const mins = rows.slice(0, 14).map((r) => Number(r.time.slice(0, 2)) * 60 + Number(r.time.slice(3))).sort((a, b) => a - b)
  if (mins.length < 3) return null
  const m = mins.length % 2 ? mins[(mins.length - 1) / 2] : Math.round((mins[mins.length / 2 - 1] + mins[mins.length / 2]) / 2)
  return { hour: Math.floor(m / 60), min: m % 60, n: mins.length }
}

/** The Me screen's instruments, all lifetime. accuracy is 0..1 (null before the first answer). */
export function lifetimeStats(st) {
  const f = factsOf(st)
  return {
    xp: st.xp, rank: rankFor(st.xp), lessons: f.lessons, perfect: f.perfect, right: st.stats.right, asked: st.stats.asked,
    accuracy: st.stats.asked ? st.stats.right / st.stats.asked : null, best: st.best, journal: f.journal, cards: f.cards, rare: f.rare,
    stagesCleared: f.stagesCleared, missions: f.missions, medals: Object.keys(st.achievements).length, medalsTotal: ACHIEVEMENTS.length,
    fragments: st.fragments, patches: Math.floor(st.fragments / FRAGMENTS_PER_PATCH), shieldsUsed: st.stats.shieldsUsed, comebacks: st.stats.comebacks,
    daysActive: Object.values(st.log).filter((l) => l.lessons > 0).length, goalDays: f.goalDays, since: st.onboardedAt,
  }
}

/* ======================================================================== *
 *  Objectives: daily chest + mission goals
 * ======================================================================== */
const missionRewards = (s) => {
  const total = s.calendar.filter((d) => d.type !== 'rest').length
  const rareTotal = s.codes.filter((c) => c.rare).length
  const items = s.weeks.map((w, i) => ({
    id: `m:${s.id}:stage-${i + 1}`, kind: 'stage', stage: i, title: `Clear Stage ${i + 1}`, desc: `${sentence(w.f)} — ${w.title}`,
    icon: 'patch', reward: { xp: 40 + i * 10 },
  }))
  items.push(
    { id: `m:${s.id}:half`, kind: 'lessons', title: 'Halfway', desc: `Finish ${Math.ceil(total / 2)} days`, icon: 'flag', goal: Math.ceil(total / 2), reward: { xp: 50 } },
    { id: `m:${s.id}:perfect`, kind: 'perfect', title: 'Sharp Shooter', desc: 'Three perfect lessons', icon: 'target', goal: 3, reward: { xp: 40 } },
    { id: `m:${s.id}:journal`, kind: 'journal', title: 'In Your Words', desc: 'Write five journal entries', icon: 'pen', goal: 5, reward: { xp: 30 } },
  )
  if (rareTotal) items.push({ id: `m:${s.id}:gold`, kind: 'gold', title: 'All Gold', desc: `Collect all ${rareTotal} gold cards`, icon: 'card', goal: rareTotal, reward: { xp: 60, fragments: 1 } })
  items.push({ id: `m:${s.id}:orbit`, kind: 'lessons', title: 'Orbit', desc: 'Finish every day', icon: 'trophy', goal: total, reward: { xp: 150, shield: 1 } })
  return items
}
function missionProgress(s, st, it) {
  const sb = st.series[s.id] || EMPTY_SUB
  if (it.kind === 'stage') {
    const p = stageDays(s)[it.stage].filter((d) => isPlayable(s, d))
    return { now: p.filter((d) => sb.done[d]).length, goal: p.length }
  }
  const have = new Set(sb.cards)
  const now_ =
    it.kind === 'lessons' ? s.calendar.filter((d) => d.type !== 'rest' && sb.done[d.day]).length
    : it.kind === 'perfect' ? Object.values(sb.results).filter((r) => r.perfect).length
    : it.kind === 'journal' ? Object.values(sb.notes).filter((t) => t && t.trim()).length
    : s.codes.filter((c) => c.rare && have.has(c.no)).length
  return { now: Math.min(now_, it.goal), goal: it.goal }
}
/**
 * The Objectives screen's data.
 *   daily    { date, rings:[3], closed, chest:{ id, state:'locked'|'ready'|'opened', reward? } }
 *   mission  [{ id, title, desc, icon, kind, now, goal, pct, state:'locked'|'ready'|'claimed', reward:{xp,shield?,fragments?} }]
 * Claim with claimObjective(id).
 */
export function objectives(st, seriesId, at = now()) {
  const k = today(at)
  const rs = rings(st, k)
  const chestId = `chest:${k}`
  const opened = Boolean(st.claims[chestId])
  const closed = rs.every((r) => r.done)
  const s = getSeries(seriesId)
  return {
    daily: {
      date: k, rings: rs, closed: rs.filter((r) => r.done).length,
      chest: { id: chestId, state: opened ? 'opened' : closed ? 'ready' : 'locked', reward: opened ? rollChest(`${st.salt}|${k}`) : null },
    },
    mission: missionRewards(s).map((it) => {
      const p = missionProgress(s, st, it)
      const claimed = Boolean(st.claims[it.id])
      return { ...it, now: p.now, goal: p.goal, pct: p.goal ? p.now / p.goal : 0, state: claimed ? 'claimed' : p.now >= p.goal ? 'ready' : 'locked' }
    }),
  }
}
/** Open today's chest or claim a mission objective. → { id, reward:{xp,shield?,fragments?}, rank:{from,to,up}, achievements:[ids] } or null if it is not claimable. */
export function claimObjective(id) {
  const at = now()
  const k = today(at)
  if (state.claims[id]) return null
  let reward
  if (id === `chest:${k}`) {
    if (!rings(state, k).every((r) => r.done)) return null
    reward = { xp: rollChest(`${state.salt}|${k}`).xp }
  } else {
    const m = /^m:([^:]+):/.exec(id)
    const s = m && allSeries.find((x) => x.id === m[1])
    const it = s && objectives(state, s.id, at).mission.find((x) => x.id === id)
    if (!it || it.state !== 'ready') return null
    reward = it.reward
  }
  let st = { ...state, claims: { ...state.claims, [id]: k } }
  const out = { ...reward }
  let xp = reward.xp || 0
  if (reward.shield) {
    const g = grantShield(st)
    st = g.st; xp += g.xp
    out.shield = g.kind === 'shield' ? 1 : 0
    if (g.kind === 'xp') out.xp = (out.xp || 0) + g.xp
  }
  if (reward.fragments) st = { ...st, fragments: st.fragments + reward.fragments }
  st = addXp(st, xp, k)
  const rank = { from: rankFor(state.xp), to: rankFor(st.xp) }
  rank.up = rank.to.index > rank.from.index
  const achievements = commit(st)
  return { id, reward: out, rank, achievements }
}

/* ======================================================================== *
 *  Writes: lessons
 * ======================================================================== */
export function setPos(id, day, pos) {
  const cur = sub(state, id)
  if ((cur.pos[day] || 0) >= pos) return
  commit({ ...state, series: { ...state.series, [id]: { ...cur, pos: { ...cur.pos, [day]: pos } } } })
}
export function resetPos(id, day) {
  const cur = sub(state, id)
  if (!cur.pos[day]) return
  const pos = { ...cur.pos }
  delete pos[day]
  commit({ ...state, series: { ...state.series, [id]: { ...cur, pos } } })
}

/** Save (or clear, if blank) the written answer for a day. Returns the medal ids that write earned (usually []). */
export function saveNote(id, day, text) {
  const cur = sub(state, id)
  const clean = String(text ?? '').slice(0, NOTE_MAX)
  if ((cur.notes[day] || '') === clean) return []
  const notes = { ...cur.notes }
  const notesAt = { ...cur.notesAt }
  if (clean.trim()) { notes[day] = clean; notesAt[day] = today(now()) } else { delete notes[day]; delete notesAt[day] }
  return commit({ ...state, series: { ...state.series, [id]: { ...cur, notes, notesAt } } })
}

function scorePure(st, right, { seriesId, day, retry = false, id } = {}, k) {
  // an answer is counted once: the same exercise `id` on the same day (React double-invokes, a re-render, a replay the same evening) pays nothing twice
  const token = id != null ? `${seriesId}|${day}|${id}|${retry ? 'r' : 'a'}` : null
  const t0 = todayTally(st, k)
  if (token && t0.scored.includes(token)) return { next: st, gain: 0 }
  const practice = seriesId != null && day != null && Boolean(sub(st, seriesId).done[day])
  let gain = right ? (practice ? XP.practice : retry ? XP.retry : XP.answer) : 0
  if (practice) gain = Math.max(0, Math.min(gain, XP.practiceCap - todayTally(st, k).practice))
  let next = addXp(st, gain, k, { right: right ? 1 : 0, asked: 1, practice: practice ? gain : 0 })
  if (token) next = { ...next, daily: { ...next.daily, scored: [...next.daily.scored, token] } }
  next = { ...next, stats: { ...next.stats, right: next.stats.right + (right ? 1 : 0), asked: next.stats.asked + 1 } }
  return { next, gain }
}
/**
 * Every answer inside a lesson. Returns the XP it earned (so callers can fly "+10" to the HUD).
 *   scoreAnswer(true)                       10 XP
 *   scoreAnswer(true, { retry: true })      5 XP  (a recycled question)
 *   scoreAnswer(true, { seriesId, day })    2 XP if that day is already finished (practice), capped at 20/day
 *   scoreAnswer(true, { seriesId, day, id }) …and counted once per (day, exercise id, first/retry): a duplicate call returns 0
 */
export function scoreAnswer(right, opts = {}) {
  const { next, gain } = scorePure(state, right, opts, today(now()))
  commit(next, { sweep: false })
  return gain
}

const hhmm = (at) => `${pad2(at.getHours())}:${pad2(at.getMinutes())}`

/**
 * The pure core of finishDay: (state, args, instant) → { next, result } | null.  Exported so tests and the dev seeder can
 * run history on any clock without touching storage.
 */
export function finishPure(st0, { seriesId, day, lessonXp = 0, meta = {} }, at) {
  const s = allSeries.find((x) => x.id === seriesId)
  if (!s || !Number.isInteger(day) || day < 1 || day > s.calendar.length) return null
  if (!isUnlocked(s, day, st0, at)) return null // a live day that has not opened yet cannot be finished
  const k = today(at)
  const lessonXpN = Math.max(0, Math.round(Number(lessonXp) || 0))
  const cur0 = sub(st0, s.id)
  const again = Boolean(cur0.done[day])
  const right = int(meta.right ?? Math.round(lessonXpN / XP.answer))
  const asked = int(meta.asked)
  const perfect = Boolean(meta.perfect ?? (asked > 0 && right >= asked))

  // "before": the state of the day as it was when the lesson began (this lesson's answers are already in the tally)
  const t0 = todayTally(st0, k)
  const goalXp = dailyGoalXp(st0)
  const ringsBefore = ringsOf(goalXp, { ...t0, xp: Math.max(0, t0.xp - lessonXpN), right: Math.max(0, t0.right - right) })
  const rankFrom = rankFor(Math.max(0, st0.xp - lessonXpN))
  const lifetimeBefore = Object.values(st0.series).reduce((a, sb) => a + Object.keys(sb.done).length, 0)

  // streak
  const settled = settlePure(st0, k)
  let st = settled.st
  const shieldUsed = settled.events.filter((e) => e.type === 'shield').length
  const graced = settled.events.filter((e) => e.type === 'grace').length
  const lostEv = settled.events.find((e) => e.type === 'lost')
  const streakFrom = st.streak
  const gap = st.lastDone ? diffDays(st.lastDone, k) : null
  const backwards = st.lastDone != null && k < st.lastDone // device clock went back: never punish, never reward
  let to = streakFrom
  let extended = false
  if (!backwards && st.lastDone !== k) {
    to = st.streak > 0 && st.covered && diffDays(st.covered, k) === 1 ? st.streak + 1 : 1
    extended = true
  }
  const comeback = extended && gap != null && gap >= 4
  const milestone = extended && MILESTONES.includes(to) ? to : null
  let shieldEarned = null
  if (extended) {
    st = { ...st, streak: to, best: Math.max(st.best, to), lastDone: k, covered: k, lost: null, stats: { ...st.stats, comebacks: st.stats.comebacks + (comeback ? 1 : 0) } }
    if (to % SHIELD_EVERY === 0) {
      const g = grantShield(st)
      st = g.st
      shieldEarned = g.kind
    }
  }

  // the bonus ledger
  const code = codeFor(s, day)
  const lines = []
  if (!again) {
    lines.push({ id: 'complete', xp: XP.complete })
    if (code?.rare) lines.push({ id: 'rare', xp: XP.rare })
    if (perfect) lines.push({ id: 'perfect', xp: XP.perfect })
  }
  if (milestone) lines.push({ id: 'milestone', xp: MILESTONE_XP[milestone] })
  if (shieldEarned === 'xp') lines.push({ id: 'shield-overflow', xp: XP.shieldOverflow })

  // the supply drop (new days only; persisted so a reload can never re-roll it)
  let drop = null
  let dropXp = 0
  if (!again) {
    const rolled = cur0.drops[day] || rollDrop(dropSeedFor(st0, s.id, day))
    drop = { ...rolled }
    if (rolled.kind === 'xp') dropXp = rolled.xp
    else if (rolled.kind === 'shield') {
      const g = grantShield(st)
      st = g.st
      if (g.kind === 'xp') { dropXp = g.xp; drop = { ...drop, converted: true, xp: g.xp } }
    } else {
      st = { ...st, fragments: st.fragments + 1 }
      drop = { ...drop, fragment: { index: (st.fragments - 1) % FRAGMENTS_PER_PATCH, of: FRAGMENTS_PER_PATCH, total: st.fragments, patchReady: st.fragments % FRAGMENTS_PER_PATCH === 0 } }
    }
  }

  const bonus = lines.reduce((a, l) => a + l.xp, 0)
  st = addXp(st, bonus + dropXp, k, { lessons: 1 })

  // progress records
  const sb = { ...cur0 }
  if (!again) {
    sb.done = { ...cur0.done, [day]: k }
    if (code && !cur0.cards.includes(code.no)) sb.cards = [...cur0.cards, code.no]
    sb.results = { ...cur0.results, [day]: { date: k, time: hhmm(at), right, asked, perfect, xp: lessonXpN + bonus + dropXp } }
    sb.drops = { ...cur0.drops, [day]: drop }
    const run = perfect ? st.stats.perfectRun + 1 : 0
    st = { ...st, stats: { ...st.stats, perfectRun: run, bestPerfectRun: Math.max(st.stats.bestPerfectRun, run) } }
  }
  st = { ...st, series: { ...st.series, [s.id]: sb } }

  // medals
  const swept = sweep(st, k)
  const next = swept.st

  const total = lessonXpN + bonus + dropXp
  const stageIdx = stageOf(s, day)
  const stBefore = stageStats(s, st0, stageIdx, at)
  const stAfter = stageStats(s, next, stageIdx, at)
  const progBefore = seriesProgress(s, st0)
  const prog = seriesProgress(s, next)
  const rankTo = rankFor(next.xp)
  const ringsAfter = rings(next, k)
  const live = modeOf(s, at) === 'live'
  const todayNo = currentDay(s, next, at) // live: today's number; archive: the first unfinished day
  // live: the next *unlock* is tomorrow (whatever you just finished — a catch-up day included); archive: simply the next unfinished day
  const nextDay = live ? (todayNo < s.calendar.length ? todayNo + 1 : null) : prog.complete ? null : todayNo
  const catchUp = live ? missedDays(next, s.id, todayNo, at)[0] ?? null : null
  const result = {
    seriesId: s.id, day, date: k, time: hhmm(at), again, first: !again && lifetimeBefore === 0, firstOfSeries: !again && Object.keys(cur0.done).length === 0,
    right, asked, perfect,
    xp: { lesson: lessonXpN, bonus, drop: dropXp, total, lines },
    streak: {
      from: streakFrom, to, extended, shieldUsed, graced, shieldEarned, shields: next.shields, milestone,
      broke: Boolean(lostEv), lostFrom: lostEv ? lostEv.from : 0, best: next.best, newBest: extended && to > st0.best, comeback,
    },
    code: code ? { ...code, title: sentence(code.title), isNew: !again && !cur0.cards.includes(code.no) } : null,
    drop,
    rank: { from: rankFrom, to: rankTo, up: rankTo.index > rankFrom.index },
    achievements: swept.earned,
    rings: { before: ringsBefore, after: ringsAfter, closed: ringsAfter.filter((r, i) => r.done && !ringsBefore[i].done).map((r) => r.id) },
    goal: { xp: next.daily.xp, goal: goalXp, met: next.daily.xp >= goalXp, justMet: ringsBefore[1].now < goalXp && next.daily.xp >= goalXp },
    stage: { index: stageIdx, n: stageIdx + 1, name: stAfter.name, title: stAfter.title, done: stAfter.done, total: stAfter.total, cleared: stAfter.cleared, clearedNow: !again && !stBefore.cleared && stAfter.cleared },
    month: { done: prog.done, total: prog.total, pct: prog.pct, complete: prog.complete, completeNow: !again && !progBefore.complete && prog.complete },
    next: { day: nextDay, unlockAt: nextDay ? nextUnlockAt(s, nextDay, at) : null, mode: modeOf(s, at), catchUp },
  }
  return { next, result }
}

/**
 * Finish a day (the lesson ended on its declaration). `lessonXp` is what the lesson's answers already paid out via scoreAnswer;
 * `meta` = { right, asked, perfect? } (right = correct on the first try).
 * Returns the one object the completion screen animates from — see docs/STORE-API.md §finishDay. Finishing a day you already
 * finished is a practice run: it keeps the day's streak alive but pays no bonus, code or drop (`again: true`). null for an unknown series/day or a
 * live day that has not unlocked yet. (A double-tapped Finish button therefore returns a second, `again` result — disable the button after the first.)
 */
export function finishDay(seriesId, day, lessonXp = 0, meta = {}) {
  const out = finishPure(state, { seriesId, day, lessonXp, meta }, now())
  if (!out) return null
  commit(out.next)
  if (!out.result.again) {
    try { reportCheckin({ series: seriesId, day, streak: out.next.streak, gems: out.next.xp }) } catch { /* the lesson is saved; the ping is best-effort */ }
  }
  return out.result
}

/* ======================================================================== *
 *  Launch Bar
 * ======================================================================== */
/**
 * What the Launch Bar should say, in one object.
 * state: 'ready' (today's lesson is open) · 'done' (today's finished; countdown to the next unlock) · 'locked' (today unlocks at 06:00)
 *        · 'upcoming' (series not started) · 'archive' (the month is over: offers the first unfinished day) · 'complete' (everything done)
 * → { state, mode, seriesId, day, title, eyebrow, teaser, mins, key, published, unlockAt, countdown (ms), next, catchUp (a missed day, live only),
 *     remaining, behind, streak, atRisk, hoursLeft, msLeft, doneToday, shields }
 */
export function launchState(s, st, at = now()) {
  const mode = modeOf(s, at)
  const info = streakInfo(st, at)
  const prog = seriesProgress(s, st)
  const n = s.calendar.length
  const cur = currentDay(s, st, at)
  const missed = missedDays(st, s.id, cur, at)
  const mk = (state, day, extra = {}) => ({
    state, mode, seriesId: s.id, day, title: dayLabel(s, day), eyebrow: dayEyebrow(s, day), teaser: teaserFor(s, day), mins: estimateMinutes(s, day),
    key: keyOfDay(s, day), published: hasContent(s, day), unlockAt: null, countdown: null, next: null, catchUp: missed[0] ?? null, remaining: prog.total - prog.done, behind: missed.length,
    streak: info.count, atRisk: info.atRisk, hoursLeft: info.hoursLeft, msLeft: info.msLeft, doneToday: info.doneToday, shields: info.shields, ...extra,
  })
  const wait = (state, day, nextDay) => {
    const u = nextUnlockAt(s, nextDay, at)
    return mk(state, day, { unlockAt: u, countdown: u ? u - at : 0, next: nextDay })
  }
  if (mode === 'upcoming') return wait('upcoming', 1, 1)
  if (mode === 'archive') return prog.complete ? mk('complete', n) : mk('archive', cur)
  if (!isUnlocked(s, cur, st, at)) return wait('locked', cur, cur)
  if (!sub(st, s.id).done[cur]) return mk('ready', cur)
  if (prog.complete) return mk('complete', cur)
  if (cur >= n) return mk('done', cur)
  return wait('done', cur, cur + 1)
}

export const AT_RISK_HOURS = 6 // inside this window an alive, unfinished streak is "at risk"
/**
 * launchState translated for copy.launchBarCopy: the exact context it takes, with its state vocabulary
 *   ready | progress | waiting | archive | missed | atRisk | first | upcoming | complete | selah
 * Precedence on a day that is open (live or archive): first (nothing ever finished) > missed (a shield covered yesterday / the streak ended) > progress (you are
 * mid-lesson) > atRisk (streak alive, today undone, ≤ AT_RISK_HOURS to midnight) > archive > selah > ready. A finished day / a locked one is 'waiting'. `steps` is an estimate (deck cards + checks); the Lesson owns the real count.
 * → { state, kind:'teaching'|'selah'|'intro'|'celebration', day, title, mins, countdown, streak, shields, hoursLeft, step, steps, pct, done, total, shieldUsed, next, seriesTitle, opens, seed }
 */
export function launchBarContext(s, st, at = now()) {
  const L = launchState(s, st, at)
  const info = streakInfo(st, at)
  const type = dayInfo(s, L.day).type
  const kind = type === 'selah' || type === 'rest' || type === 'review' ? 'selah' : type === 'intro' ? 'intro' : type === 'celebration' ? 'celebration' : 'teaching'
  const prog = seriesProgress(s, st)
  const k = today(at)
  const pos = posFor(st, s.id, L.day)
  const steps = deckLength(s, L.day) + QUIZ_COUNT
  const resumable = pos > 0 && !sub(st, s.id).done[L.day]
  const shieldUsed = info.alive && (info.pending.shield > 0 || st.saves[addDays(k, -1)] === 'shield') // a shield only "saved" a streak that is still alive
  const missed = !info.doneToday && (shieldUsed || (info.state === 'lost' && info.lostFrom > 0))
  let state
  if (L.state === 'upcoming') state = 'upcoming'
  else if (L.state === 'complete') state = 'complete'
  else if (L.state === 'done' || L.state === 'locked') state = 'waiting'
  else if (factsOf(st).lessons === 0) state = 'first'
  else if (missed) state = 'missed'
  else if (resumable) state = 'progress'
  else if (info.atRisk && info.hoursLeft <= AT_RISK_HOURS) state = 'atRisk'
  else if (L.state === 'archive') state = 'archive'
  else if (kind === 'selah') state = 'selah'
  else state = 'ready'
  const countdown = state === 'atRisk' ? info.msLeft : L.countdown
  return {
    state, kind, day: L.day, title: L.title, mins: L.mins, countdown, streak: info.count, shields: info.shields, hoursLeft: info.hoursLeft,
    step: resumable ? pos : null, steps, pct: resumable ? Math.min(99, Math.round((pos / steps) * 100)) : null,
    done: prog.done, total: prog.total, shieldUsed, next: L.next, seriesTitle: s.title, opens: L.unlockAt, seed: k,
  }
}

/* ======================================================================== *
 *  Collections: locker, journal
 * ======================================================================== */
/** The code-card grid for a series: [{ ...code, title (sentence-cased), owned, on:'YYYY-MM-DD'|null, stage }]. */
export function lockerCards(st, seriesId) {
  const s = getSeries(seriesId)
  const sb = sub(st, s.id)
  const have = new Set(sb.cards)
  return s.codes.map((c) => ({ ...c, title: sentence(c.title), owned: have.has(c.no), on: sb.done[c.day] || null, stage: stageOf(s, c.day) }))
}
/**
 * Every mission patch across every series, for the Locker shelf: [{ seriesId, seriesTitle, stage, n, name, title, earned, on, done, total }].
 * A patch is earned when every playable day of the stage is done; `on` is the date the last one was finished.
 */
export function patchShelf(st) {
  const out = []
  for (const s of allSeries) {
    const sb = sub(st, s.id)
    stageDays(s).forEach((days, i) => {
      const play = days.filter((d) => isPlayable(s, d))
      const doneDays_ = play.filter((d) => sb.done[d])
      const earned = play.length > 0 && doneDays_.length === play.length
      out.push({
        seriesId: s.id, seriesTitle: s.title, stage: i, n: i + 1, name: sentence(s.weeks[i].f), title: s.weeks[i].title, earned,
        on: earned ? doneDays_.map((d) => sb.done[d]).sort().pop() : null, done: doneDays_.length, total: play.length,
      })
    })
  }
  return out
}

/**
 * What the Share Studio draws, per kind — plain data, no copy (captions come from copy.shareCaption).
 *   'verse'   { text, ref, title, day, seriesTitle }            the day's Scripture (default: the current day)
 *   'card'    { no, day, title, line, rare, stage, owned, on, seriesTitle }   a code card
 *   'streak'  { count, best, shields, state, strip:[7 cells], rank }
 *   'month'   { seriesTitle, declaration, themeScripture, done, total, pct, complete, cards, cardsTotal, rareCards, rareTotal, patches:[…], xp, rank, lessons }
 * → null when there is nothing to share (e.g. a day with no verse).
 */
export function shareData(kind, st, seriesId, day, at = now()) {
  const s = getSeries(seriesId)
  const d = day ?? currentDay(s, st, at)
  if (kind === 'verse') {
    const v = deckFor(s, d).find((c) => c.kind === 'verse')
    return v ? { kind, text: v.body, ref: v.ref, title: dayLabel(s, d), day: d, seriesTitle: s.title } : null
  }
  if (kind === 'card') {
    const c = lockerCards(st, s.id).find((x) => x.day === d)
    return c ? { kind, no: c.no, day: c.day, title: c.title, line: c.line, rare: c.rare, stage: c.stage, owned: c.owned, on: c.on, seriesTitle: s.title } : null
  }
  if (kind === 'streak') {
    const k = streakInfo(st, at)
    return { kind, count: k.count, best: k.best, shields: k.shields, state: k.state, strip: weekStrip(st, at), rank: rankFor(st.xp) }
  }
  if (kind === 'month') {
    return {
      kind, seriesTitle: s.title, declaration: s.declaration, themeScripture: s.themeScripture, ...seriesProgress(s, st),
      patches: patchShelf(st).filter((p) => p.seriesId === s.id), xp: st.xp, rank: rankFor(st.xp), lessons: factsOf(st).lessons,
    }
  }
  return null
}

/**
 * The order the Orbit-insertion moment should play a finishDay result in (design §4.5): the ids of the beats that apply.
 *   xp → rings → streak → shield (earned / used) → milestone → card → drop → rank (rank-up when promoted) → medals → patch → month → actions
 * Screens may skip beats; they should not reorder them — the order is the dramatic arc (small → large, ending on the Word).
 */
export function completionBeats(r) {
  const b = ['xp']
  if (r.rings.closed.length) b.push('rings')
  if (r.streak.extended) b.push('streak')
  if (r.streak.shieldUsed || r.streak.shieldEarned === 'shield') b.push('shield')
  if (r.streak.milestone) b.push('milestone')
  if (r.code?.isNew) b.push('card')
  if (r.drop) b.push('drop')
  b.push(r.rank.up ? 'rank-up' : 'rank')
  if (r.achievements.length) b.push('medals')
  if (r.stage.clearedNow) b.push('patch')
  if (r.month.completeNow) b.push('month')
  b.push('actions')
  return b
}

/** Every journal entry you wrote, newest first: [{ seriesId, day, text, date, title, ref, prompt }]. Pass a seriesId to filter. */
export function journalEntries(st, seriesId) {
  const out = []
  for (const s of allSeries) {
    if (seriesId && s.id !== seriesId) continue
    const sb = st.series[s.id]
    if (!sb) continue
    for (const [d, text] of Object.entries(sb.notes)) {
      if (!text || !text.trim()) continue
      const day = Number(d)
      out.push({
        seriesId: s.id, day, text, date: sb.notesAt[day] || sb.done[day] || null, title: dayLabel(s, day),
        ref: epOf(s, dayInfo(s, day))?.scripture?.ref || '', prompt: deckFor(s, day).find((c) => c.kind === 'ask')?.prompt || '',
      })
    }
  }
  return out.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.day - a.day)
}

/* ======================================================================== *
 *  Profile
 * ======================================================================== */
export const goalXpOf = (g) => {
  if (typeof g === 'string') return GOALS.find((x) => x.id === g)?.xp ?? DEFAULT_GOAL_XP
  return GOALS.some((x) => x.xp === Number(g)) ? Number(g) : DEFAULT_GOAL_XP
}
const cleanKids = (kids) =>
  (Array.isArray(kids) ? kids : []).map((k) => ({ name: str(typeof k === 'string' ? k : k?.name).trim().slice(0, 40) })).filter((k) => k.name)
const roleOf = (r, fallback = 'teen') => (['teen', 'parent', 'family'].includes(r) ? r : fallback)

/** End of pre-flight. `dailyGoal` is 20 | 40 | 60 or 'casual' | 'regular' | 'serious'. Returns the medal ids earned (['preflight'] — the first one, inside a minute). */
export function completeOnboarding({ name = '', role, emoji = '', familyName = '', kids = [], dailyGoal } = {}) {
  return commit({
    ...state, name: str(name).trim().slice(0, 60), role: roleOf(role), emoji: str(emoji), familyName: str(familyName).trim().slice(0, 60),
    kids: cleanKids(kids), dailyGoalXp: goalXpOf(dailyGoal), onboarded: true, onboardedAt: state.onboardedAt || today(now()),
  })
}
/** Whitelisted profile edits: name, role, emoji, familyName, kids, reminderHour, dailyGoal (alias of dailyGoalXp). */
export function updateProfile(fields = {}) {
  const f = { ...fields }
  const next = { ...state }
  if ('name' in f) next.name = str(f.name).trim().slice(0, 60)
  if ('role' in f) next.role = roleOf(f.role, state.role)
  if ('emoji' in f) next.emoji = str(f.emoji)
  if ('familyName' in f) next.familyName = str(f.familyName).trim().slice(0, 60)
  if ('kids' in f) next.kids = cleanKids(f.kids)
  if ('reminderHour' in f) next.reminderHour = int(f.reminderHour, 0, 23, state.reminderHour)
  if ('dailyGoal' in f || 'dailyGoalXp' in f) next.dailyGoalXp = goalXpOf(f.dailyGoal ?? f.dailyGoalXp)
  return commit(next)
}
export const setDailyGoal = (g) => updateProfile({ dailyGoal: g })
export function addKid(kid) {
  const k = cleanKids([kid])
  return k.length ? commit({ ...state, kids: [...state.kids, ...k] }) : []
}
export function removeKid(i) {
  commit({ ...state, kids: state.kids.filter((_, x) => x !== i) })
}
/** Wipe all progress on this device (the caller confirms first). */
export function resetAll() {
  commit(freshState())
}

/* ======================================================================== *
 *  One-time flags (coach marks, "you've seen this moment") and backup
 * ======================================================================== */
/** True once a flag has been set: `hasFlag(st, 'tip:shield')`. Use for coach marks and one-time moments; stored with the date it was set. */
export const hasFlag = (st, id) => Boolean(st.flags[id])
/** Set (or with false, clear) a flag. Idempotent; a no-op write when nothing changes. */
export function setFlag(id, on = true) {
  if (hasFlag(state, id) === Boolean(on)) return
  const flags = { ...state.flags }
  if (on) flags[id] = today(now()); else delete flags[id]
  commit({ ...state, flags })
}

/**
 * The whole save as a string the player can keep (Me → Back up progress). Nothing leaves the device unless they send the file.
 * Restore with importProgress(text).
 */
export function exportProgress() {
  return JSON.stringify({ app: 'kind', schema: SCHEMA, exportedAt: now().toISOString(), state }, null, 1)
}
/** Replace this device's progress with a backup. → { ok:true, xp, streak, lessons } | { ok:false, error:'bad-json'|'not-a-kind-backup' }. The UI confirms first. */
export function importProgress(text) {
  const raw = parse(text)
  if (!raw) return { ok: false, error: 'bad-json' }
  if (raw.app !== 'kind' || !raw.state || typeof raw.state !== 'object') return { ok: false, error: 'not-a-kind-backup' }
  const next = migrate(raw.state)
  commit(next)
  settleStreak()
  return { ok: true, xp: state.xp, streak: streakInfo(state).count, lessons: factsOf(state).lessons }
}

/* ======================================================================== *
 *  Dev & test support: seed believable states without clicking through 40 lessons.
 *  In the browser: __kind.seed('mid')  (also __kind.reset(), __kind.snapshot(), __kind.set({…}))
 * ======================================================================== */
const LESSON_SCORES = [4, 4, 3, 4, 4, 2, 4, 4, 4, 3] // right-first-time out of 4, cycled
/** Play a lesson through the real engine at instant `at`: answers, then finishPure. → { next, result }. */
export function playLessonPure(st, seriesId, day, at, { right = 4, asked = 4, perfect } = {}) {
  const k = today(at)
  let cur = st
  for (let i = 0; i < asked; i++) cur = scorePure(cur, i < right, { seriesId, day }, k).next
  return finishPure(cur, { seriesId, day, lessonXp: right * XP.answer, meta: { right, asked, perfect } }, at)
}

/**
 * Build a state for a named scenario, relative to now(), on the active series (or opts.seriesId).
 *   'new'         not onboarded
 *   'fresh'       onboarded, nothing done
 *   'mid'         the default: opts.days lessons (10) finished on consecutive evenings ending YESTERDAY → today's lesson pending, streak at risk
 *   'done-today'  'mid' plus today's lesson
 *   'veteran'     the whole series done, streak and shields high
 *   'lost'        'mid' but the last lesson was 5 days ago (streak ended)
 */
export function demoState(name = 'mid', opts = {}) {
  const at = opts.at || now()
  const sid = opts.seriesId || activeSeriesId(at)
  const s = getSeries(sid)
  let st = freshState('demo')
  st = { ...st, name: 'Ada', role: 'teen', onboarded: true, onboardedAt: addDays(today(at), -60), dailyGoalXp: opts.goal || DEFAULT_GOAL_XP, kids: opts.kids || [] }
  if (name === 'new') return { ...freshState('demo') }
  if (name === 'fresh') return st
  const todayKey = today(at)
  const n = s.calendar.length
  const live = modeOf(s, at) === 'live'
  const days = []
  const want = name === 'veteran' ? n : Math.min(opts.days ?? (live ? n : 10), n)
  // end on yesterday (5 days ago for 'lost'). A live series maps date → day number; an archived one walks days 1… on consecutive dates.
  const endOffset = name === 'lost' ? 5 : 1
  if (live) {
    const last = dayOfKey(s, todayKey) - endOffset
    for (let d = Math.max(1, last - want + 1); d <= last; d++) days.push({ day: d, date: keyOfDay(s, d) })
  } else {
    for (let i = 0; i < want; i++) days.push({ day: i + 1, date: addDays(todayKey, -(want - 1 - i) - endOffset) })
  }
  days.forEach(({ day, date }, i) => {
    const when = keyToDate(date, i % 4 === 3 ? 6 : i % 7 === 5 ? 21 : 19, 20 + (i % 30))
    const right = LESSON_SCORES[i % LESSON_SCORES.length]
    const out = playLessonPure(st, s.id, day, when, { right, asked: 4 })
    if (out) {
      st = out.next
      if (i % 3 === 0) {
        const sb = sub(st, s.id)
        st = { ...st, series: { ...st.series, [s.id]: { ...sb, notes: { ...sb.notes, [day]: 'God owns it all, and I am only managing it for Him.' }, notesAt: { ...sb.notesAt, [day]: date } } } }
      }
    }
  })
  if (name === 'done-today' || name === 'veteran') {
    const next = name === 'veteran' ? null : currentDay(s, st, at)
    if (next && !sub(st, s.id).done[next]) {
      const out = playLessonPure(st, s.id, next, at, { right: 4, asked: 4 })
      if (out) st = out.next
    }
  }
  st = sweep(st, todayKey).st
  st.achSeen = Object.keys(st.achievements).slice(0, -2) // leave the last couple "new" so badges have something to show
  return st
}
export const dev = {
  snapshot,
  reset: resetAll,
  reload,
  set: (patch) => commit({ ...state, ...patch }),
  seed(name = 'mid', opts) {
    const st = demoState(name, opts)
    state = st
    persist(state)
    notify()
    return state
  },
  settle: settleStreak,
}
if (typeof window !== 'undefined') window.__kind = dev

/* ======================================================================== *
 *  Boot — last on purpose: migrate() sweeps medals, so every const above must exist first.
 * ======================================================================== */
boot()
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('storage', (e) => { if (e.key === KEY && e.newValue != null) reload() })
}
// In a browser the store looks after its own clock: it settles missed days now, whenever the tab returns, and just after each local
// midnight — so a shield spend or a lost streak is already in state (with a queued notice) by the time any screen renders it.
if (typeof document !== 'undefined') {
  const settle = () => { try { settleStreak() } catch { /* never block the app on housekeeping */ } }
  const arm = () => setTimeout(() => { settle(); arm() }, msToMidnight() + 1500)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) settle() })
  settle()
  arm()
}
