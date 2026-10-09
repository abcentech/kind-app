// Content + calendar logic. Pure functions over the library (and, where noted, a progress state `st`).
// Nothing here writes anything and nothing reads `new Date()`: every "what time is it" comes from now.js, and every
// function that depends on the clock takes an optional `at` so it can be tested at any instant.
// Persistence, streaks, XP and achievements live in store.js — see docs/STORE-API.md for the whole surface.
import library from './content/library.json'
import { now, today } from './now.js'

export const seriesIds = library.order
export const allSeries = seriesIds.map((id) => library.series[id])
export const getSeries = (id) => library.series[id] || library.series[library.activeId]

/* ---- lazy lesson bodies --------------------------------------------------------------------------------------------
 * In the Vite build (__KIND_SPLIT__) the library import is the small "core": titles, scriptures, truths, hooks, the calendar.
 * Lesson text, short bodies and Sunday guides live in one chunk per series, fetched on idle after first paint and awaited
 * (ensureContent) before a lesson or the reel opens. Node (tests, tools) imports the full JSON, so everything is "ready".
 * s.meta carries lesson minutes + deck length precomputed from the full content, so the Launch Bar never changes when the chunk lands. */
const SPLIT = typeof __KIND_SPLIT__ !== 'undefined'
const heavyLoads = new Map()
const heavyDone = new Set()
const contentSubs = new Set()
export const contentReady = (id) => !SPLIT || heavyDone.has(getSeries(id).id)
export const subscribeContent = (fn) => (contentSubs.add(fn), () => contentSubs.delete(fn))
export function ensureContent(id) {
  const s = getSeries(id)
  if (!SPLIT || heavyDone.has(s.id)) return Promise.resolve(s)
  if (!heavyLoads.has(s.id)) {
    heavyLoads.set(s.id, import('virtual:kind-heavy').then((m) => m.default[s.id]()).then((m) => {
      const h = m.default
      for (const [k, v] of Object.entries(h.episodes)) if (s.episodes[k]) Object.assign(s.episodes[k], v)
      for (const [k, v] of Object.entries(h.sundays)) if (s.sundays[k]) Object.assign(s.sundays[k], v)
      h.shorts.forEach((v, i) => s.shorts[i] && Object.assign(s.shorts[i], v))
      heavyDone.add(s.id)
      contentSubs.forEach((fn) => fn())
      return s
    }).catch((err) => { heavyLoads.delete(s.id); throw err }))
  }
  return heavyLoads.get(s.id)
}

/* ---- dates -------------------------------------------------------------- */
// A "key" is a local calendar day as 'YYYY-MM-DD'. All day arithmetic goes through UTC day-numbers so DST can never
// make a day 23 or 25 hours long.
const pad = (n) => String(n).padStart(2, '0')
const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
export const isKey = (x) => typeof x === 'string' && KEY_RE.test(x)
export const dateKey = (d = now()) => today(d)
export const keyToDate = (k, h = 0, m = 0) => {
  const [y, mo, d] = k.split('-').map(Number)
  return new Date(y, mo - 1, d, h, m, 0, 0)
}
export const dayIndex = (k) => {
  const [y, m, d] = k.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 864e5)
}
/** Whole days from key a to key b (b - a). */
export const diffDays = (a, b) => dayIndex(b) - dayIndex(a)
export const addDays = (k, n) => {
  const t = new Date(dayIndex(k) * 864e5 + n * 864e5)
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}
/** 0 = Sunday … 6 = Saturday, for a key. */
export const weekdayOf = (k) => new Date(dayIndex(k) * 864e5).getUTCDay()
/** Milliseconds from `at` until the next local midnight. */
export const msToMidnight = (at = now()) => {
  const next = new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1, 0, 0, 0, 0)
  return next - at
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** 'Wed 12 Aug' — hand-built so it reads the same on every device (no ICU variance). */
export const fmtKey = (k) => {
  const [y, m, d] = k.split('-').map(Number)
  return `${WEEKDAYS[weekdayOf(k)]} ${d} ${MONTHS[m - 1]}`
}
export const fmtDay = (s, n) => fmtKey(keyOfDay(s, n))
/** '02:14:09' (hours unbounded under 100 h; beyond that '4d 03h'). With { prefix: 'T-' } → 'T-02:14:09'. */
export function fmtCountdown(ms, { prefix = '' } = {}) {
  const t = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(t / 3600)
  if (h >= 100) return `${prefix}${Math.floor(h / 24)}d ${pad(h % 24)}h`
  return `${prefix}${pad(h)}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`
}
export function greeting(at = now()) {
  const h = at.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/* ---- the series calendar: modes, today, unlocking ----------------------- */
export const UNLOCK_HOUR = 6 // a live day unlocks at 06:00 local on its own date

export const seriesStart = (s) => new Date(s.year, s.monthNum - 1, 1)
export const seriesEnd = (s) => new Date(s.year, s.monthNum, 1) // exclusive
export const keyOfDay = (s, day) => `${s.year}-${pad(s.monthNum)}-${pad(day)}`
/** The day number a date key falls on inside this series' month, or null if it is outside it. */
export function dayOfKey(s, key) {
  const m = KEY_RE.exec(key || '')
  if (!m || +m[1] !== s.year || +m[2] !== s.monthNum || +m[3] > s.calendar.length) return null
  return +m[3]
}

/** 'upcoming' (month not started) · 'live' (we are inside its month) · 'archive' (month over: every day open). */
export const modeOf = (s, at = now()) => (at < seriesStart(s) ? 'upcoming' : at < seriesEnd(s) ? 'live' : 'archive')
export const isLive = (s, at = now()) => modeOf(s, at) === 'live'

/** The series the app opens on: the live one; else the newest finished one; else the soonest upcoming. */
export function activeSeriesId(at = now()) {
  const live = allSeries.find((s) => modeOf(s, at) === 'live')
  if (live) return live.id
  const past = allSeries.filter((s) => modeOf(s, at) === 'archive').sort((a, b) => seriesEnd(b) - seriesEnd(a))
  if (past[0]) return past[0].id
  const next = allSeries.filter((s) => modeOf(s, at) === 'upcoming').sort((a, b) => seriesStart(a) - seriesStart(b))
  return (next[0] || library.series[library.activeId]).id
}

export const dayInfo = (s, n) => s.calendar[Math.min(Math.max(1, n), s.calendar.length) - 1]
export const epOf = (s, d) => (d.episode ? s.episodes[d.episode] : d.type === 'intro' ? s.intro : null)
export const shortFor = (s, d) => (d.episode ? s.shorts.find((x) => x.n === d.episode) || null : null)
export const codeFor = (s, day) => s.codes.find((c) => c.day === day) || null
/** A 'rest' day has no content to learn; it is never required (but can still be opened). */
export const isPlayable = (s, day) => dayInfo(s, day).type !== 'rest'
/** False for a teaching day whose episode is not in the library yet ("Coming soon"). */
export function hasContent(s, day) {
  const d = dayInfo(s, day)
  if (d.type === 'teaching' || d.type === 'intro') return Boolean(epOf(s, d))
  return true
}

const doneMap = (st, s) => st?.series?.[s.id]?.done || {}

/** Legacy v6 name: today's day number, or the last day once the month is over. Prefer currentDay(). */
export function todayNumber(s, at = now()) {
  return isLive(s, at) ? Math.min(at.getDate(), s.calendar.length) : s.calendar.length
}

/**
 * The day the app should point at.
 *   live     today's day number (capped to the month length)
 *   upcoming day 1
 *   archive  the first unfinished day (rest days skipped); the last day once everything is done
 */
export function currentDay(s, st, at = now()) {
  const n = s.calendar.length
  const mode = modeOf(s, at)
  if (mode === 'live') return Math.min(at.getDate(), n)
  if (mode === 'upcoming') return 1
  const done = doneMap(st, s)
  const first = s.calendar.find((d) => d.type !== 'rest' && !done[d.day])
  return first ? first.day : n
}

/** The instant a day unlocks (06:00 local on its date), or null when it is already open / the series is archived. */
export function nextUnlockAt(s, day, at = now()) {
  if (modeOf(s, at) === 'archive') return null
  if (day < 1 || day > s.calendar.length) return null
  const t = new Date(s.year, s.monthNum - 1, day, UNLOCK_HOUR, 0, 0, 0)
  return t > at ? t : null
}

/** archive: everything open · upcoming: nothing · live: a day opens at 06:00 on its date (and stays open). */
export function isUnlocked(s, day, st, at = now()) {
  if (day < 1 || day > s.calendar.length) return false
  const mode = modeOf(s, at)
  if (mode === 'archive') return true
  if (mode === 'upcoming') return false
  return nextUnlockAt(s, day, at) === null
}

/* ---- stages (a stage = a week of the series) ---------------------------- */
// Calendar days that sit between weeks (Aug day 2, July day 1) carry no `week`; they join the nearest stage so every
// day belongs to exactly one.
export function stageOf(s, day) {
  const cal = s.calendar
  const i = Math.min(Math.max(1, day), cal.length) - 1
  const last = Math.max(0, s.weeks.length - 1)
  if (cal[i].week != null) return Math.min(cal[i].week, last)
  for (let k = i - 1; k >= 0; k--) if (cal[k].week != null) return Math.min(cal[k].week, last)
  for (let k = i + 1; k < cal.length; k++) if (cal[k].week != null) return Math.min(cal[k].week, last)
  return 0
}
export const weekOf = (s, d) => (d ? s.weeks[stageOf(s, d.day)] || null : null)

const stageDayCache = new WeakMap()
/** [[day numbers of stage 0], [stage 1], …] */
export function stageDays(s) {
  let hit = stageDayCache.get(s)
  if (!hit) {
    hit = s.weeks.map(() => [])
    s.calendar.forEach((d) => hit[stageOf(s, d.day)].push(d.day))
    stageDayCache.set(s, hit)
  }
  return hit
}

/** The hue slot (1–5) for a stage: use as `var(--stage-N)`. */
export const stageSlot = (index) => (index % 5) + 1

/**
 * Everything the UI needs about one stage.
 * state: 'cleared' (every playable day done) · 'current' (holds currentDay) · 'open' · 'locked' (live/upcoming, not yet reachable)
 */
export function stageStats(s, st, index, at = now()) {
  const days = stageDays(s)[index] || []
  const w = s.weeks[index] || { f: '', title: '', question: '', passage: '' }
  const done = doneMap(st, s)
  const playable = days.filter((n) => isPlayable(s, n))
  const nDone = playable.filter((n) => done[n]).length
  const total = playable.length
  const cleared = total > 0 && nDone === total
  const cur = currentDay(s, st, at)
  const holdsCurrent = days.includes(cur)
  const first = days[0]
  const locked = first != null && !isUnlocked(s, first, st, at)
  return {
    index, n: index + 1, slot: stageSlot(index),
    f: w.f, name: cap(w.f), title: w.title, question: w.question, passage: w.passage,
    days, first, last: days[days.length - 1], total, done: nDone,
    pct: total ? nDone / total : 0,
    cleared,
    rare: days.filter((n) => codeFor(s, n)?.rare).length,
    state: cleared ? 'cleared' : locked ? 'locked' : holdsCurrent ? 'current' : 'open',
  }
}
export const stages = (s, st, at = now()) => s.weeks.map((_, i) => stageStats(s, st, i, at))

/** How far through the series you are. */
export function seriesProgress(s, st) {
  const done = doneMap(st, s)
  const playable = s.calendar.filter((d) => d.type !== 'rest')
  const nDone = playable.filter((d) => done[d.day]).length
  const have = new Set(st?.series?.[s.id]?.cards || [])
  const rare = s.codes.filter((c) => c.rare)
  return {
    done: nDone, total: playable.length, pct: playable.length ? nDone / playable.length : 0,
    complete: playable.length > 0 && nDone === playable.length,
    cards: s.codes.filter((c) => have.has(c.no)).length, cardsTotal: s.codes.length,
    rareCards: rare.filter((c) => have.has(c.no)).length, rareTotal: rare.length,
    stagesCleared: stages(s, st).filter((x) => x.cleared).length, stagesTotal: s.weeks.length,
  }
}

/**
 * One day, described for the trajectory.
 *   state  'done' · 'current' (today / first unfinished) · 'open' (reachable, not done) · 'locked'
 *   rare   this day mints a gold code card (Learn paints the node gold)
 */
export function dayState(s, day, st, at = now()) {
  const d = dayInfo(s, day)
  const done = Boolean(doneMap(st, s)[d.day])
  const unlocked = isUnlocked(s, d.day, st, at)
  const current = !done && d.day === currentDay(s, st, at) && unlocked
  const code = codeFor(s, d.day)
  return {
    day: d.day, type: d.type, stage: stageOf(s, d.day),
    title: dayLabel(s, d.day), eyebrow: dayEyebrow(s, d.day),
    done, unlocked, current, published: hasContent(s, d.day),
    state: done ? 'done' : !unlocked ? 'locked' : current ? 'current' : 'open',
    rare: Boolean(code?.rare), code,
    key: keyOfDay(s, d.day), unlockAt: nextUnlockAt(s, d.day, at),
  }
}

/** The whole Ascent in one call: mode, today, and every stage with its days. Day 1 is `stages[0].days[0]`. */
export function journey(s, st, at = now()) {
  const stg = stages(s, st, at).map((x) => ({ ...x, nodes: x.days.map((n) => dayState(s, n, st, at)) }))
  return { id: s.id, mode: modeOf(s, at), currentDay: currentDay(s, st, at), stages: stg, progress: seriesProgress(s, st) }
}

/* ---- the deck: one thought per card ------------------------------------- */
const words = (t) => (t || '').split(/\s+/).filter(Boolean).length
/** Seconds a person needs for a card: reading at a thoughtful pace, plus a beat per card; writing/speaking cards cost more. */
function secsFor(c) {
  const w = words([c.body, c.title, c.prompt, ...(c.lines || []), ...(c.extra || [])].join(' '))
  switch (c.kind) {
    case 'open': return 4
    case 'watch': return 0 // optional viewing; not counted in the estimate
    case 'verse': return Math.round(w / 2.4 + 4)
    case 'ask': return Math.round(w / 3 + 40)
    case 'pray': return Math.round(w / 2.6 + 8)
    case 'declare': return Math.max(1, c.lines?.length || 1) * 5 + 8
    default: return Math.round(w / 3 + 3)
  }
}
const cardsOfDeck = (list) => {
  const used = new Set()
  return list.map((c) => {
    const { id, ...rest } = c
    let key = id || c.kind
    for (let k = 2; used.has(key); k++) key = `${id || c.kind}-${k}`
    used.add(key)
    return { id: key, ...rest, secs: c.secs ?? secsFor(c) }
  })
}
const stageLines = (s, from = 0) =>
  s.weeks.slice(from).map((w, i) => `Stage ${from + i + 1} · ${cap(w.f)} — ${w.title}`).join('\n')
const firstLine = (t) => (t || '').split('\n')[0].trim()

/**
 * The lesson's reading deck. Every card has a stable `id` (semantic: 'open', 'verse', 'p1', 'declare' … never a position)
 * and `secs` (an honest reading-time estimate). The declaration is always the last card.
 * kinds: open · watch · read · verse · truth · point · do · ask · pray · quote · declare
 * Returns a fresh array each call (callers may pop/splice it).
 */
export function deckFor(s, day) {
  const d = dayInfo(s, day)
  const n = d.day
  const wk = weekOf(s, d)
  const stg = stageOf(s, n)
  const cards = []
  const push = (c) => cards.push(c)
  const ref = { day: n, stage: stg }

  if (d.type === 'selah') {
    const su = s.sundays?.[d.sunday]
    push({
      kind: 'open', icon: 'moon', ...ref,
      eyebrow: `Day ${n} · Selah`, title: title(su?.title) || 'Selah — rest and review', tag: 'No new episode today',
    })
    if (su?.recap) push({ kind: 'read', id: 'recap', label: 'This week', body: md(su.recap) })
    else {
      // The legacy (July) dialect has no Sunday guides: build the recap from the week's own episodes.
      const lines = stageDays(s)[stg]
        .map((x) => dayInfo(s, x))
        .filter((x) => x.episode && s.episodes[x.episode])
        .map((x) => `- ${title(s.episodes[x.episode].title)} — ${firstSentence(s.episodes[x.episode].truth)}`)
      if (lines.length) push({ kind: 'read', id: 'recap', label: 'This week', body: lines.join('\n') })
    }
    if (su?.reading) push({ kind: 'read', id: 'reading', label: 'Bible reading', body: md(su.reading) })
    push({
      kind: 'ask', label: 'Talk about it',
      prompt: su?.questions?.[0] || wk?.question || 'What stood out most this week?',
      extra: su?.questions?.slice(1) || [],
    })
    if (su?.prayer) push({ kind: 'pray', label: 'Pray together', body: su.prayer })
    push({ kind: 'declare', label: 'Declare together', lines: (su?.declaration || s.declaration.join('\n')).split('\n').filter(Boolean) })
    return cardsOfDeck(cards)
  }

  if (d.type === 'rest' || d.type === 'review') {
    push({ kind: 'open', icon: 'moon', ...ref, eyebrow: `Day ${n}`, title: 'A quiet day', tag: 'No episode scheduled' })
    push({ kind: 'read', id: 'journey', label: 'The journey so far', body: stageLines(s) })
    push({ kind: 'ask', id: 'look-back', label: 'Look back', prompt: 'Which day of this month has changed something in you?', extra: [] })
    push({ kind: 'declare', label: 'Say it anyway', lines: s.declaration })
    return cardsOfDeck(cards)
  }

  const ep = epOf(s, d)
  // A celebration day with no episode of its own (July) closes the month out of what the month already gave you.
  if (!ep) {
    const finale = d.type === 'celebration'
    push({
      kind: 'open', icon: finale ? 'trophy' : 'hourglass', ...ref,
      eyebrow: finale ? `Day ${n} · Orbit` : `Day ${n}`,
      title: finale ? 'You finished the month' : 'Coming soon',
      tag: finale ? s.title : 'This day is not published yet',
    })
    if (!finale) return cardsOfDeck(cards)
    push({ kind: 'read', id: 'climb', label: 'The whole climb', body: stageLines(s) })
    push({ kind: 'verse', label: 'Theme scripture', body: s.themeScripture.text, ref: s.themeScripture.ref })
    push({ kind: 'ask', id: 'testimony', label: 'Testimony', prompt: 'What did God do in you this month?', extra: [] })
    push({ kind: 'declare', label: 'The final declaration', lines: s.declaration })
    return cardsOfDeck(cards)
  }

  const finale = d.type === 'celebration'
  push({
    kind: 'open', ...ref,
    icon: finale ? 'trophy' : d.type === 'intro' ? 'rocket' : 'book',
    eyebrow: d.type === 'intro' ? `Day ${n} · Launch`
      : finale ? `Day ${n} · Orbit`
      : `Day ${n} · Stage ${stg + 1}${wk ? ' · ' + cap(wk.f) : ''}`,
    title: title(ep.title),
    tag: ep.scripture?.ref || '',
  })
  const vid = videoOf(s, d)
  if (vid) {
    push({
      kind: 'watch', label: 'Tonight’s episode', videoId: vid, title: title(ep.title),
      url: `https://www.youtube.com/watch?v=${vid}`, thumb: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
    })
  }
  if (ep.hook) push({ kind: 'read', id: 'hook', label: 'Start here', body: ep.hook })
  if (ep.scripture?.text) push({ kind: 'verse', label: 'The Word', body: ep.scripture.text, ref: ep.scripture.ref })
  if (ep.truth) push({ kind: 'truth', label: 'The one thing', body: ep.truth })
  // Series that only give us point *titles* (no body) get one summary card instead of three near-empty ones.
  const pts = ep.points.filter((p) => p.title || p.body)
  if (pts.length && pts.every((p) => !p.body))
    push({ kind: 'read', id: 'points', label: 'What today covers', body: pts.map((p) => '- ' + title(p.title)).join('\n') })
  else
    pts.forEach((p, i) =>
      push({ kind: 'point', id: 'p' + (i + 1), label: `Truth ${i + 1} of ${pts.length}`, title: title(p.title), body: p.body })
    )
  if (ep.illustration) push({ kind: 'read', id: 'picture', label: 'Picture this', body: ep.illustration })
  ;(ep.supporting || []).slice(0, 1).forEach((v, i) =>
    push({ kind: 'verse', id: 'sv' + (i + 1), label: 'Also written', body: v.text, ref: v.ref })
  )
  if (ep.challenge) push({ kind: 'do', id: 'move', label: 'Your move today', body: ep.challenge })
  if (ep.apply?.length) push({ kind: 'do', id: 'apply', label: 'Do this today', body: ep.apply.map((a) => '- ' + a).join('\n') })
  push({
    kind: 'ask', label: 'Your answer',
    prompt: ep.talk || ep.questions?.[0] || wk?.question || 'Where does this land in your life today?',
    extra: ep.questions?.slice(1) || [],
  })
  if (ep.prayer) push({ kind: 'pray', label: 'Pray', body: ep.prayer })
  const sh = shortFor(s, d)
  if (sh?.quote) push({ kind: 'quote', label: '60-second short', body: sh.quote, sub: sh.challenge })
  push({
    kind: 'declare', label: finale ? 'The final declaration' : 'Say it out loud',
    lines: (ep.declaration || s.declaration.join('\n')).split('\n').filter(Boolean),
  })
  return cardsOfDeck(cards)
}

/** The YouTube id for a day's episode: the calendar's own mapping first, then an optional `videos` override map. */
export const videoOf = (s, d) => d.videoId || s.videos?.[d.day] || null

/* ---- planning helpers --------------------------------------------------- */
/** Check questions in a lesson (quiz.js's default) and the seconds each takes; estimateMinutes assumes them. */
export const QUIZ_COUNT = 4
const QUIZ_SECS = 16
/** Number of lesson cards for a day (the Launch Bar's "step n of N"): precomputed in the split build so it needs no lesson text. */
export const deckLength = (s, day) => (s.meta ? s.meta.steps[Math.min(Math.max(1, day), s.calendar.length) - 1] : deckFor(s, day).length)
const minutesMemo = new Map()
/** Honest minutes for the Launch Bar ("~6 min"): reading time of the deck + a few seconds per check question. 2–12. */
export function estimateMinutes(s, day) {
  if (s.meta) return s.meta.mins[Math.min(Math.max(1, day), s.calendar.length) - 1]
  const key = `${s.id}:${day}`
  let m = minutesMemo.get(key)
  if (m == null) {
    const secs = deckFor(s, day).reduce((a, c) => a + c.secs, 0) + QUIZ_COUNT * QUIZ_SECS
    m = Math.max(2, Math.min(12, Math.round(secs / 60)))
    minutesMemo.set(key, m)
  }
  return m
}

/** Cut `text` to one line: whole sentences up to `max` chars; failing that one whole sentence up to 1.25 × max; else a clause/word cut with an ellipsis. */
export function oneLine(text, max = 90) {
  const para = md(text).split('\n').map((l) => l.replace(/^[-•]\s*/, '').trim()).find(Boolean) || ''
  const flat = para.replace(/\s+/g, ' ')
  if (flat.length <= max) return flat
  const sentences = flat.match(/[^.!?]+[.!?]+["”’']?\s*/g) || [flat]
  let out = ''
  for (const x of sentences) {
    if ((out + x).trim().length > max) break
    out += x
  }
  if (out.trim().length >= Math.min(24, max / 2)) return out.trim()
  if (sentences[0].trim().length <= Math.round(max * 1.25)) return sentences[0].trim() // one whole sentence beats a clipped one
  const cut = flat.slice(0, max - 1)
  const clause = Math.max(cut.lastIndexOf(','), cut.lastIndexOf(';'), cut.lastIndexOf(' —'))
  const stop = clause >= max * 0.6 ? clause : cut.lastIndexOf(' ') > 24 ? cut.lastIndexOf(' ') : cut.length
  return cut.slice(0, stop).replace(/[,;:\s—–-]+$/, '') + '…'
}

/** One line of hook for the Launch Bar (≈ 90 chars, never above 112; no markdown, no orphan words). */
export function teaserFor(s, day) {
  const d = dayInfo(s, day)
  if (d.type === 'selah') return 'Look back over the week, then say the code together.'
  if (d.type === 'rest' || d.type === 'review') return 'Nothing new today — keep the declaration going.'
  const ep = epOf(s, d)
  if (!ep) return d.type === 'celebration' ? 'The whole climb, in one last look.' : 'This day is not published yet.'
  return oneLine(shortFor(s, d)?.hook || ep.hook || ep.truth || ep.scripture?.text || '', 90)
}

/* ---- text helpers ------------------------------------------------------- */
export const cap = (s) => (s || '').charAt(0) + (s || '').slice(1).toLowerCase()
const SMALL = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'of', 'in', 'on', 'at', 'to', 'by', 'with', 'as', 'from', 'into'])
const ACRONYMS = new Set(['KJV', 'NKJV', 'NIV', 'ESV', 'NLT', 'AMP', 'MSG', 'TV', 'ATM', 'SMS', 'DNA', 'USA', 'UK', 'OK', 'NGN', 'ID', 'PIN'])
/** ALL-CAPS titles read as shouting in the UI: title-case them ('FAITHFUL IN LITTLE' → 'Faithful in Little'). Mixed-case is untouched. */
export function title(s) {
  const str = s || ''
  return str.replace(/[A-Z][A-Z’'\-]+/g, (w, off) => {
    if (ACRONYMS.has(w)) return w
    const lower = w.toLowerCase()
    const opens = off === 0 || /[:.!?—–]\s*$/.test(str.slice(0, off))
    const closes = off + w.length >= str.length
    return !opens && !closes && SMALL.has(lower) ? lower : cap(w)
  })
}
/** strip the markdown emphasis we don't render */
export const md = (s) => (s || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(\S[^*]*?)\*/g, '$1')
const firstSentence = (t) => {
  const f = md(firstLine(t))
  const m = f.match(/^.+?[.!?](?=\s|$)/)
  return m ? m[0] : f
}

export function dayLabel(s, n) {
  const d = dayInfo(s, n)
  if (d.type === 'selah') return title(s.sundays?.[d.sunday]?.title) || 'Selah'
  if (d.type === 'rest' || d.type === 'review') return 'A quiet day'
  const ep = epOf(s, d)
  if (ep) return title(ep.title)
  return d.type === 'celebration' ? 'You finished the month' : 'Coming soon'
}
export function dayEyebrow(s, n) {
  const d = dayInfo(s, n)
  const wk = weekOf(s, d)
  if (d.type === 'intro') return 'Launch'
  if (d.type === 'celebration') return 'Orbit'
  if (d.type === 'selah') return 'Selah · rest & review'
  if (d.type === 'rest' || d.type === 'review') return 'No episode'
  return wk ? `Stage ${stageOf(s, d.day) + 1} · ${cap(wk.f)}` : `Episode ${d.episode}`
}
export function dayHookline(s, n) {
  return teaserFor(s, n)
}
