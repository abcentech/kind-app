// KIND v7 "Ascent" · copy.js — the app's voice.
//
// Reverent, confident, spare. Short declaratives. Praise comes from the Word, not from a cartoon.
// Nigerian English (labour, colour, honour, programme) and West Africa Time: times are the device clock,
// written "8:00 pm", with "WAT" appended only when the device really is on UTC+1 (see zoneTag).
//
// HOW THIS FILE WORKS
//   • Pure. No React, no store, no clock: callers pass in everything (use now() from ./now.js, never new Date()).
//   • Deterministic. Anything that varies is picked by pick(list, seed): the same seed always returns the same
//     line, so text never flickers on a re-render. Pass seq(key, i) as the seed to walk a list with no repeat
//     inside one cycle (e.g. seq(`${series.id}:${day}`, exerciseIndex) for answer verdicts).
//   • A "Line" is { text, ref? }. When `ref` is present, `text` is a Bible quotation: set it in the serif face
//     and put the reference beneath it in mono. Everything else is plain.
//   • Functions that fill a slot return plain objects of strings, never JSX, so any screen can lay them out.
//   • Rules (enforced by tools/test-copy.mjs): no emoji; no "!!"; "!" only on genuine milestones; no ALL-CAPS
//     body copy (write sentence case: the Label component uppercases labels in CSS); no shaming words.
//   • Typographic punctuation throughout (’ “ ” — …). Never straight quotes.

/* ── 1. Plumbing ───────────────────────────────────────────────────────── */

/** 32-bit string hash (FNV-1a plus a murmur finaliser): stable in every engine, well spread on short seeds. */
export function hash(str) {
  let h = 0x811c9dc5
  const s = String(str)
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

const rng = (seed) => {                       // mulberry32
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const orders = new Map()
function order(n, key) {                      // a seeded permutation of 0..n-1, cached (lists are tiny)
  const k = key + '#' + n
  let o = orders.get(k)
  if (!o) {
    o = Array.from({ length: n }, (_, i) => i)
    const r = rng(hash(k))
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = o[i]; o[i] = o[j]; o[j] = t }
    if (orders.size > 200) orders.clear()
    orders.set(k, o)
  }
  return o
}

/** Join seed parts into one string seed: seedOf(series.id, day, 'verdict') -> 'stewardship-code|12|verdict'. */
export const seedOf = (...parts) => parts.filter((p) => p != null && p !== '').join('|')
/** Sequence seed: successive `i` walk the list in a seeded shuffled order, never repeating within one cycle. */
export const seq = (key, i = 0) => ({ key: String(key), i: i | 0 })
const keyOf = (seed) => (seed && typeof seed === 'object' ? `${seed.key}#${seed.i}` : String(seed ?? ''))

/** pick(list, seed): the same seed always gives the same entry. `seed` is a string, a number, or seq(key, i). */
export function pick(list, seed = '') {
  const n = list ? list.length : 0
  if (!n) return undefined
  if (seed && typeof seed === 'object') return list[order(n, seed.key)[((seed.i % n) + n) % n]]
  return list[hash(seed) % n]
}

const plural = (n, one, many = one + 's') => (n === 1 ? one : many)

/* Entries in a pool are plain strings or Lines ({ text, ref }). Tokens: {name} (only ever after ", "), {n}, {day} … */
const needs = (s) => { const out = []; String(s).replace(/\{(\w+)\}/g, (_, k) => out.push(k)); return out }
const textOf = (e) => (typeof e === 'string' ? e : e.text)
const has = (v) => v != null && v !== '' && !(typeof v === 'number' && Number.isNaN(v))
const usable = (e, c) => needs(textOf(e)).every((k) => k === 'name' || has(c[k]))
function fill(s, c = {}) {
  let out = String(s)
  if (!c.name) out = out.replace(/,\s*\{name\}/g, '').replace(/\s*\{name\}/g, '')
  return out.replace(/\{(\w+)\}/g, (_, k) => (c[k] == null ? '' : c[k]))
}
/** Choose from a pool (skipping entries whose tokens the context cannot fill) and return a Line. */
function choose(pool, seed, c = {}) {
  const ok = pool.filter((e) => usable(e, c))
  const e = pick(ok.length ? ok : pool, seed)
  return typeof e === 'string' ? { text: fill(e, c) } : { text: fill(e.text, c), ref: e.ref }
}
const lineOf = (e, c) => (typeof e === 'string' ? { text: fill(e, c) } : { text: fill(e.text, c), ref: e.ref })
const say = (l) => (l.ref ? `${l.text} ${l.ref}.` : l.text)
/** Flatten a Line for a share sheet, an aria-label or a clipboard: “text” — ref (KJV). */
export const plain = (l) => (l.ref ? `“${l.text}” — ${l.ref} (${BIBLE_VERSION})` : l.text)

/* ── formatting: telemetry, dates, clocks. All pure; pass dates in. ────── */

export const fmtNum = (n) => {
  const v = Math.round(Number(n) || 0)
  return (v < 0 ? '-' : '') + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** Wed 12 Aug */
export const fmtDate = (d) => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`
/** Wednesday 12 August */
export const fmtDateLong = (d) => `${DOW_LONG[d.getDay()]} ${d.getDate()} ${MON_LONG[d.getMonth()]}`
/** 8:00 pm  ·  pass { zone: zoneTag(now()) } to append "WAT" when the device is on West Africa Time. */
export function fmtClock(hour, min = 0, { zone = '' } = {}) {
  const h = ((hour % 24) + 24) % 24
  return `${h % 12 || 12}:${String(min).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}${zone ? ' ' + zone : ''}`
}
/** 'WAT' when the device clock is UTC+1 (Lagos, Abuja, Accra is not: it is UTC+0), otherwise ''. */
export const zoneTag = (date) => (date && -date.getTimezoneOffset() === 60 ? 'WAT' : '')
/** Telemetry countdown: T-02:14:09 (hours climb past 99 as T-4d 06:00). */
export function tMinus(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const p = (x) => String(x).padStart(2, '0')
  if (h >= 100) return `T-${Math.floor(h / 24)}d ${p(h % 24)}:${p(m)}`
  return `T-${p(h)}:${p(m)}:${p(sec)}`
}
/** Elapsed telemetry: T+08:30 (minutes:seconds). */
export function tPlus(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const p = (x) => String(x).padStart(2, '0')
  return `T+${p(Math.floor(s / 60))}:${p(s % 60)}`
}
/** A countdown in words for screen readers and sentences: "2 hours 14 minutes", "45 minutes", "under a minute". */
export function wordsDuration(ms) {
  const m = Math.max(0, Math.round(ms / 60000))
  if (m < 1) return 'under a minute'
  const h = Math.floor(m / 60), r = m % 60
  const hs = h ? `${h} ${plural(h, 'hour')}` : ''
  const ms_ = r ? `${r} ${plural(r, 'minute')}` : ''
  return [hs, ms_].filter(Boolean).join(' ')
}
/** Loose time-left for sentences ("3 hours", "an hour", "40 minutes"): write "About {left} left". Takes hours (may be fractional). */
export function timeLeft(hours) {
  const h = Math.max(0, hours)
  if (h >= 1.5) return `${Math.round(h)} hours`
  if (h >= 0.75) return 'an hour'
  const m = Math.max(5, Math.round((h * 60) / 5) * 5)
  return `${m} minutes`
}
export const minsLabel = (m) => `~${Math.max(1, Math.round(m))} min`           // ~6 min (telemetry)
export const minsWords = (m) => `about ${Math.max(1, Math.round(m))} ${plural(Math.round(m), 'minute')}`
export const xpDelta = (n) => `${n < 0 ? '-' : '+'}${fmtNum(Math.abs(n))} XP`    // +40 XP
export const xpTotal = (n) => `${fmtNum(n)} XP`                                    // 1,240 XP
export const dayTag = (day, total) => (total ? `Day ${day} / ${total}` : `Day ${day}`)   // Day 12 / 31
export const stageTag = (n) => `Stage ${String(n).padStart(2, '0')}`                     // Stage 02
export const daysWord = (n) => `${fmtNum(n)} ${plural(n, 'day')}`                         // 1 day · 12 days

/* ── 2. The Word: a bank of short, accurate KJV quotations ─────────────── */
// Every entry is checked against the library's KJV text by tools/test-copy.mjs where the library has the
// verse, and against bible-api.com with `node tools/test-copy.mjs --verify-kjv` for the rest. References are
// written without the translation tag; BIBLE_VERSION is shown once in About and on share cards.

export const BIBLE_VERSION = 'KJV'
const W_wellDone = { text: 'Well done, thou good and faithful servant.', ref: 'Matthew 25:21' }
const W_fewThings = { text: 'Thou hast been faithful over a few things.', ref: 'Matthew 25:21' }
const W_joyOfLord = { text: 'Enter thou into the joy of thy lord.', ref: 'Matthew 25:21' }
const W_veryLittle = { text: 'Because thou hast been faithful in a very little.', ref: 'Luke 19:17' }
const W_least = { text: 'He that is faithful in that which is least is faithful also in much.', ref: 'Luke 16:10' }
const W_found = { text: 'It is required in stewards, that a man be found faithful.', ref: '1 Corinthians 4:2' }
const W_notVain = { text: 'Your labour is not in vain in the Lord.', ref: '1 Corinthians 15:58' }
const W_firstfruits = { text: 'Honour the LORD with thy substance, and with the firstfruits of all thine increase.', ref: 'Proverbs 3:9' }
const W_heartily = { text: 'Whatsoever ye do, do it heartily, as to the Lord, and not unto men.', ref: 'Colossians 3:23' }
const W_withMight = { text: 'Whatsoever thy hand findeth to do, do it with thy might.', ref: 'Ecclesiastes 9:10' }
const W_smallThings = { text: 'For who hath despised the day of small things?', ref: 'Zechariah 4:10' }
const W_faithfulMan = { text: 'A faithful man shall abound with blessings.', ref: 'Proverbs 28:20' }
const W_diligent = { text: 'The thoughts of the diligent tend only to plenteousness.', ref: 'Proverbs 21:5' }
const W_byLabour = { text: 'He that gathereth by labour shall increase.', ref: 'Proverbs 13:11' }
const W_kings = { text: 'Seest thou a man diligent in his business? he shall stand before kings.', ref: 'Proverbs 22:29' }
const W_wiseHear = { text: 'A wise man will hear, and will increase learning.', ref: 'Proverbs 1:5' }
const W_profiting = { text: 'That thy profiting may appear to all.', ref: '1 Timothy 4:15' }
const W_pondered = { text: 'Ponder the path of thy feet, and let all thy ways be established.', ref: 'Proverbs 4:26' }
const W_hidWord = { text: 'Thy word have I hid in mine heart, that I might not sin against thee.', ref: 'Psalm 119:11' }
const W_lamp = { text: 'Thy word is a lamp unto my feet, and a light unto my path.', ref: 'Psalm 119:105' }
const W_entrance = { text: 'The entrance of thy words giveth light.', ref: 'Psalm 119:130' }
const W_fallRise = { text: 'A just man falleth seven times, and riseth up again.', ref: 'Proverbs 24:16' }
const W_newMorning = { text: 'They are new every morning: great is thy faithfulness.', ref: 'Lamentations 3:23' }
const W_stirUp = { text: 'Stir up the gift of God, which is in thee.', ref: '2 Timothy 1:6' }
const W_weary = { text: 'Let us not be weary in well doing: for in due season we shall reap, if we faint not.', ref: 'Galatians 6:9' }
const W_shining = { text: 'The path of the just is as the shining light, that shineth more and more unto the perfect day.', ref: 'Proverbs 4:18' }
const W_tree = { text: 'He shall be like a tree planted by the rivers of water, that bringeth forth his fruit in his season.', ref: 'Psalm 1:3' }
const W_course = { text: 'I have finished my course, I have kept the faith.', ref: '2 Timothy 4:7' }
const W_race = { text: 'Let us run with patience the race that is set before us.', ref: 'Hebrews 12:1' }
const W_mark = { text: 'I press toward the mark for the prize of the high calling of God in Christ Jesus.', ref: 'Philippians 3:14' }
const W_teachOthers = { text: 'Commit thou to faithful men, who shall be able to teach others also.', ref: '2 Timothy 2:2' }
const W_number = { text: 'So teach us to number our days, that we may apply our hearts unto wisdom.', ref: 'Psalm 90:12' }
const W_eagles = { text: 'They shall mount up with wings as eagles; they shall run, and not be weary.', ref: 'Isaiah 40:31' }
const W_heavens = { text: 'The heavens declare the glory of God.', ref: 'Psalm 19:1' }
const W_arise = { text: 'Arise, shine; for thy light is come.', ref: 'Isaiah 60:1' }
const W_thisDay = { text: 'This is the day which the LORD hath made; we will rejoice and be glad in it.', ref: 'Psalm 118:24' }
const W_hereAmI = { text: 'Here am I; send me.', ref: 'Isaiah 6:8' }
const W_doers = { text: 'Be ye doers of the word, and not hearers only.', ref: 'James 1:22' }
const W_sleep = { text: 'So he giveth his beloved sleep.', ref: 'Psalm 127:2' }
const W_lieDown = { text: 'I will both lay me down in peace, and sleep.', ref: 'Psalm 4:8' }
const W_earth = { text: 'The earth is the LORD’S, and the fulness thereof.', ref: 'Psalm 24:1' }
const W_ownGiven = { text: 'Of thine own have we given thee.', ref: '1 Chronicles 29:14' }
const W_account = { text: 'So then every one of us shall give account of himself to God.', ref: 'Romans 14:12' }
const W_write = { text: 'Write the vision, and make it plain.', ref: 'Habakkuk 2:2' }
const W_light = { text: 'Let your light so shine before men.', ref: 'Matthew 5:16' }
const W_teachChild = { text: 'Train up a child in the way he should go.', ref: 'Proverbs 22:6' }
const W_house = { text: 'As for me and my house, we will serve the LORD.', ref: 'Joshua 24:15' }
const W_blade = { text: 'First the blade, then the ear, after that the full corn in the ear.', ref: 'Mark 4:28' }
const W_workmanship = { text: 'We are his workmanship, created in Christ Jesus unto good works.', ref: 'Ephesians 2:10' }
const W_bread = { text: 'Man shall not live by bread alone.', ref: 'Matthew 4:4' }
const W_rise = { text: 'When I fall, I shall arise.', ref: 'Micah 7:8' }
const W_earlySeek = { text: 'Early will I seek thee.', ref: 'Psalm 63:1' }
const W_beauty = { text: 'Establish thou the work of our hands upon us.', ref: 'Psalm 90:17' }
const W_seek = { text: 'Seek, and ye shall find.', ref: 'Matthew 7:7' }
const W_build = { text: 'Let us rise up and build.', ref: 'Nehemiah 2:18' }
const W_dressKeep = { text: 'To dress it and to keep it.', ref: 'Genesis 2:15' }
const W_courage = { text: 'Be strong and of a good courage; be not afraid, neither be thou dismayed.', ref: 'Joshua 1:9' }
const W_newThing = { text: 'Behold, I will do a new thing; now it shall spring forth.', ref: 'Isaiah 43:19' }
const W_longLife = { text: 'With long life will I satisfy him, and shew him my salvation.', ref: 'Psalm 91:16' }
const W_masters = { text: 'Ye cannot serve God and mammon.', ref: 'Luke 16:13' }
const W_occupy = { text: 'Occupy till I come.', ref: 'Luke 19:13' }
const W_breath = { text: 'Breathed into his nostrils the breath of life; and man became a living soul.', ref: 'Genesis 2:7' }
const W_byFaith = { text: 'Now the just shall live by faith.', ref: 'Hebrews 10:38' }
const W_renewing = { text: 'Be ye transformed by the renewing of your mind.', ref: 'Romans 12:2' }
const W_temple = { text: 'Know ye not that your body is the temple of the Holy Ghost which is in you?', ref: '1 Corinthians 6:19' }
export const WORD = {
  wellDone: W_wellDone,
  fewThings: W_fewThings,
  joyOfLord: W_joyOfLord,
  veryLittle: W_veryLittle,
  least: W_least,
  found: W_found,
  notVain: W_notVain,
  firstfruits: W_firstfruits,
  heartily: W_heartily,
  withMight: W_withMight,
  smallThings: W_smallThings,
  faithfulMan: W_faithfulMan,
  diligent: W_diligent,
  byLabour: W_byLabour,
  kings: W_kings,
  wiseHear: W_wiseHear,
  profiting: W_profiting,
  pondered: W_pondered,
  hidWord: W_hidWord,
  lamp: W_lamp,
  entrance: W_entrance,
  fallRise: W_fallRise,
  newMorning: W_newMorning,
  stirUp: W_stirUp,
  weary: W_weary,
  shining: W_shining,
  tree: W_tree,
  course: W_course,
  race: W_race,
  mark: W_mark,
  teachOthers: W_teachOthers,
  number: W_number,
  eagles: W_eagles,
  heavens: W_heavens,
  arise: W_arise,
  thisDay: W_thisDay,
  hereAmI: W_hereAmI,
  doers: W_doers,
  sleep: W_sleep,
  lieDown: W_lieDown,
  earth: W_earth,
  ownGiven: W_ownGiven,
  account: W_account,
  write: W_write,
  light: W_light,
  teachChild: W_teachChild,
  house: W_house,
  blade: W_blade,
  workmanship: W_workmanship,
  bread: W_bread,
  rise: W_rise,
  earlySeek: W_earlySeek,
  beauty: W_beauty,
  seek: W_seek,
  build: W_build,
  dressKeep: W_dressKeep,
  courage: W_courage,
  newThing: W_newThing,
  masters: W_masters,
  occupy: W_occupy,
  breath: W_breath,
  byFaith: W_byFaith,
  renewing: W_renewing,
  temple: W_temple,
  longLife: W_longLife,
}

/* ── 3. Greetings (time-aware, WAT-friendly) ───────────────────────────── */
// Nigerian usage: "Good evening" holds until bedtime; "Good night" is a farewell, so it only appears after midnight.

export const partOfDay = (hour) => {
  const h = ((hour % 24) + 24) % 24
  return h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'late'
}

const GREETING = {
  morning: [
    'Good morning, {name}.',
    'Morning, {name}. The day is open.',
    'Good morning, {name}. Begin with the Word.',
    'Early start, {name}. Well begun.',
    'Morning, {name}. First things first.',
    'Good morning, {name}. Today’s launch is ready.',
    'A new day, {name}. Take it to the Word first.',
  ],
  afternoon: [
    'Good afternoon, {name}.',
    'Afternoon, {name}. Still time to launch.',
    'Good afternoon, {name}. A few minutes, well spent.',
    'Afternoon, {name}. Keep the Word in the middle of the day.',
    'Good afternoon, {name}. The Word is ready.',
    'Midday, {name}. A good moment to stop and look up.',
    'Good afternoon, {name}. Take a short break with the Word.',
  ],
  evening: [
    'Good evening, {name}.',
    'Evening, {name}. Close the day on the Word.',
    'Good evening, {name}. Today’s launch is ready.',
    'Evening, {name}. Set the day down and look up.',
    'Good evening, {name}. Plenty of time left tonight.',
    'The day is nearly done, {name}. Finish it well.',
    'Good evening, {name}. Bring the day to the Word.',
  ],
  late: [
    'Good evening, {name}.',
    'Still time tonight, {name}.',
    'The day is not over yet, {name}.',
    'Before you sleep, {name}. One lesson.',
    'Good evening, {name}. Finish before midnight.',
    'Winding down, {name}? Bring the day to the Word.',
    'Late, {name}. Keep it short and finish well.',
  ],
  night: [
    'Late night, {name}. Sleep matters too.',
    'Up late, {name}. The Word keeps all hours.',
    'Good night, {name}. This can wait for morning.',
    'Quiet hours, {name}. Take it slowly.',
    'Rest is a gift too, {name}.',
    'Midnight hour, {name}. Go gently, and be quick.',
  ],
}
const GREETING_DAY = {
  0: ['Happy Sunday, {name}.', 'Happy Sunday, {name}. A day for rest and the Word.', 'Sunday, {name}. A good day to look back and look up.', 'Good Sunday to you, {name}.'],
  1: ['Happy new week, {name}.', 'A new week, {name}. Begin it with the Word.', 'Happy new week, {name}. One launch at a time.', 'Monday, {name}. Start the week on the Word.'],
  5: ['Happy Friday, {name}.', 'Friday, {name}. Finish the week well.', 'Happy Friday, {name}. End the week on the Word.'],
  6: ['Happy Saturday, {name}.', 'Saturday, {name}. Make room for the Word.', 'Happy weekend, {name}. No rush today.'],
}
const SEASON = {
  newYear: ['Happy New Year, {name}.', 'Happy New Year, {name}. Begin it with the Word.', 'A new year, {name}. One launch at a time.'],
  childrensDay: ['Happy Children’s Day, {name}.', 'Happy Children’s Day, {name}. You are loved.', 'Today belongs to you, {name}. Happy Children’s Day.'],
  independence: ['Happy Independence Day, {name}.', 'Happy Independence Day, {name}. Raising goDs, building nations.', 'Happy Independence Day. Build what you pray for, {name}.'],
  christmas: ['Merry Christmas, {name}.', 'Merry Christmas, {name}. Take a quiet moment with the Word.', 'Happy Christmas, {name}. Slow down and look up.'],
  goodFriday: ['Good Friday, {name}. A quiet day for the Word.', 'Blessed Good Friday, {name}.', 'Good Friday, {name}. Remember the cross.'],
  easter: ['Happy Easter, {name}. He is risen.', 'Blessed Easter, {name}.', 'Happy Easter, {name}. Begin with the Word.'],
  easterMonday: ['Happy Easter Monday, {name}.', 'Easter Monday, {name}. A day to rest and rejoice.', 'Easter Monday, {name}. The joy carries on.'],
}
function easterOf(y) {                         // Gregorian Easter Sunday (anonymous algorithm) -> [month 1-12, day]
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const x = h + l - 7 * m + 114
  return [Math.floor(x / 31), (x % 31) + 1]
}
/** seasonOf(now(), zoneTag(now()))  ->  'newYear' | 'childrensDay' (27 May) | 'independence' (1 Oct, on a WAT clock) | 'christmas' (24-26 Dec) | 'goodFriday' | 'easter' | 'easterMonday' | null */
export function seasonOf(d, zone = '') {
  const m = d.getMonth() + 1, day = d.getDate(), y = d.getFullYear()
  if (m === 1 && day === 1) return 'newYear'
  if (m === 5 && day === 27) return 'childrensDay'
  if (m === 10 && day === 1 && zone === 'WAT') return 'independence'
  if (m === 12 && day >= 24 && day <= 26) return 'christmas'
  const [em, ed] = easterOf(y)
  const diff = Math.round((new Date(y, m - 1, day) - new Date(y, em - 1, ed)) / 864e5)
  return diff === -2 ? 'goodFriday' : diff === 0 ? 'easter' : diff === 1 ? 'easterMonday' : null
}
// The hour is the one thing that must not flicker mid-session, so the seed is name + part of day (+ optional date).
/**
 * greeting('Ada', 20)  ->  'Evening, Ada. Close the day on the Word.'
 * Pass a daily `seed` (e.g. today()) for a new line each day, and { weekday: now().getDay() } for the Nigerian week
 * ("Happy new week" on Mondays, "Happy Sunday", "Happy Friday"): the weekday lines replace the usual ones about half the time.
 * Pass { date: now(), zone: zoneTag(now()) } and the calendar speaks too: New Year, Children's Day (27 May), Independence Day (1 Oct, WAT),
 * Christmas, Good Friday, Easter. A holiday line takes over about two greetings in three that day.
 */
export function greeting(name, hour, seed = '', opts = {}) {
  const part = partOfDay(hour)
  const sd = seedOf(name, part, seed)
  const day = opts.weekday != null && part !== 'night' ? GREETING_DAY[opts.weekday] : null
  const season = opts.date ? SEASON[seasonOf(opts.date, opts.zone)] : null
  const pool = season && hash(sd + ':ss') % 100 < 67 ? season : day && hash(sd + ':wd') % 100 < 45 ? day : GREETING[part]
  return choose(pool, sd, { name: (name || '').trim() }).text
}

/* ── 4. Praise ─────────────────────────────────────────────────────────── */
// praise({ kind, seed, name?, day?, goal?, ring?, n? }) -> Line
//   kind: answer | lesson | perfect | recovered | first | selah | return | goal | ring | combo

const PRAISE = {
  answer: [
    'Faithful in little.', 'Held.', 'Right. Keep that.', 'That is it.', 'Exactly right.', 'Clean.',
    'Well held.', 'On the mark.', 'That one is yours now.', 'Steady.', 'Locked in.', 'You had that.', 'Sharp.', 'Well seen.', 'That is the one.', 'You know this.',
    W_wellDone, W_fewThings, W_veryLittle, W_wiseHear, W_profiting, W_heartily,
    W_diligent, W_byLabour, W_faithfulMan,
  ],
  combo: [
    '{n} in a row.', '{n} straight.', '{n} clean answers.', '{n} without a miss.', 'Burning steady: {n} right.',
    'A run of {n} answers.', '{n} right, back to back.',
  ],
  recycled: [
    'Second time, and yours.', 'There it is.', 'Learnt and kept.', 'That is how it sticks.',
    'Back again, and held.', 'Now it stays.', 'You went back for it. Well done.',
  ],
  lesson: [
    'Faithful in little.', 'Another day kept.', 'Day {day} is done.', 'Done, and done well.',
    'You showed up. That is most of it.', 'The Word went in. Now carry it out.', 'A good day’s work.',
    'That is how a steward finishes.', W_fewThings, W_profiting, W_heartily, W_withMight, W_doers,
  ],
  perfect: [
    'Every answer right.', 'A clean flight.', 'Not one missed. Well done.', 'A perfect run.', 'Full marks.',
    'Nothing missed. Give thanks and go on.', W_wellDone, W_wiseHear, W_joyOfLord,
  ],
  recovered: [
    'You went back for the ones you missed. That is how it sticks.', 'Missed some, finished all. That is the real thing.',
    'It took a second pass. It stayed.', 'The line is clearer than when you began.', 'Finished beats flawless.',
    'Some lines take two tries. You made them yours.', W_fallRise, W_rise,
  ],
  first: [
    'Day 1 done. The climb has begun.', 'First launch complete. Welcome aboard.', 'One lesson in. Come back tomorrow.',
    'The first step is behind you.', 'You have started. That counts.', 'That is how it begins. Come back tomorrow.',
    W_veryLittle, W_smallThings, W_blade,
  ],
  late: [
    'Late, and still showing up. Sleep well.', 'The day ends on the Word. Sleep well.', 'A good last thing to do today. Rest now.',
    'Done for the day. Rest well.', 'Finished before sleep. A good way to end a day.', W_lieDown, W_sleep, W_beauty,
  ],
  early: [
    'First thing in the morning. That is how to start.', 'The Word before the world. A strong start.', 'Early, and already ahead.',
    'A good morning begins like this.', 'Before the day begins, you have started well.', W_earlySeek, W_arise, W_thisDay,
  ],
  practice: [
    'Practice is how it sinks in.', 'Again, and deeper.', 'The second reading goes deeper than the first.',
    'Back through it. Well kept.', 'Practice counts.', 'The Word is worth a second look.',
  ],
  leader: [
    'You led them well today.', 'They saw you open the Word. That teaches more than words.', 'Another day of leading well.',
    'That is how a household is built.', 'Well done leading them, {name}.', 'They will remember that you sat down with them.',
    W_teachChild, W_house,
  ],
  selah: [
    'Rested and reviewed.', 'Looked back. Looking up.', 'A good Selah.', 'Selah kept.', 'Rest counts too.',
    'Paused, pondered, ready.', W_pondered,
  ],
  return: [
    'Welcome back.', 'Good to see you again.', 'You came back. That is what matters.', 'Pick it up from here.',
    'There is nothing to catch up on. Just today.', 'Back on the pad.', W_newMorning, W_stirUp,
  ],
  goal: [
    'Daily goal reached.', 'Goal met: {goal} XP.', '{goal} XP. Target hit.', 'Today’s target, cleared.',
    'Goal reached. Everything past it is a bonus.', 'You set {goal} XP. You kept your word.', W_heartily,
  ],
  ring: [
    '{ring} ring closed.', 'Closed: {ring}.', '{ring} complete.', '{ring} — done.', 'That ring is full.',
    'Ring closed.', 'Another ring home.',
  ],
}

/** praise({ kind:'lesson', seed, day }) -> { text, ref? }. Unknown kinds fall back to a lesson line. */
export function praise(ctx = {}) {
  const kind = PRAISE[ctx.kind] ? ctx.kind : 'lesson'
  return choose(PRAISE[kind], ctx.seed ?? '', ctx)
}

/* ── 5. Go / No-Go: answer verdicts ────────────────────────────────────── */
// A Verdict is { tone:'go'|'nogo', status, head, text, ref?, note?, cta, aria }
//   status = the telemetry word beside the LED ("Go" / "No-go"), head = the plain word for a 12-year-old
//   ("Correct" / "Not yet"). Never colour alone: the screen shows the LED, the icon and both words.

const THEME_DONE = {
  'stewardship-code': ['Another day, managed well.', 'Faithful with today’s portion.', 'Today’s account, kept in order.', 'You managed today well.'],
  'secrets-of-longevity': ['Another day, well lived.', 'A day given, and kept.', 'A day well spent.', 'Today, lived for Him.'],
}
const THEME_RIGHT = {
  'stewardship-code': ['Good steward.', 'Managed well.', 'Accounted for.', 'That is stewardship.', 'Faithful with what you know.', 'Kept in order.', W_firstfruits, W_ownGiven, W_account, W_earth],
  'secrets-of-longevity': ['Good ground gained.', 'A day well kept.', 'Strong and steady.', 'That will carry you far.', 'Built to last.', 'Well kept.', W_longLife, W_number, W_workmanship],
}
const SOURCE_RIGHT = {
  scripture: ['The Word, held.', 'That verse is yours.', 'Written on the heart.', W_hidWord],
  truth: ['The one thing, held.', 'That is the centre of it.', 'That is the whole day in a line.'],
  point: ['Point taken and kept.', 'You followed the thread.', 'That point is yours now.'],
  code: ['Code cracked.', 'Card line, held.', 'That is the code.'],
  declaration: ['Said and settled.', 'That is the declaration.', 'Now say it out loud.'],
  week: ['That is the stage in one question.', 'Stage question, answered.', 'You see the whole stage.'],
}
const TYPE_RIGHT = {
  blank: ['The missing word, found.', 'Gap closed.', 'The word fits.'],
  order: ['In order.', 'Line by line, built.', 'Rightly ordered.'],
  match: ['Every pair true.', 'All paired.', 'Each one in its place.'],
  tf: ['Sound judgement.', 'You can tell true from false.', 'You spotted it.'],
}
const COMBO_AT = [3, 5, 8, 12, 20]

const WRONG = {
  line: [
    'Here’s the line.', 'Read it once more.', 'Here is how it goes.', 'Take the line as it stands.',
    'The line is below.', 'Mark it and move on.', 'Look at it again.', W_entrance, W_fallRise, W_pondered, W_wiseHear,
  ],
  twice: [
    'Still hard. Keep the line with you.', 'Hard one. Carry the line with you.', 'That one is stubborn. Take the line with you.',
    'You will meet it again.', 'Give it a day. It will settle.', 'Some lines take a few passes.', W_rise,
  ],
  note: [
    'This one comes back at the end.', 'It returns once, at the end.', 'You will see this one again at the end.',
  ],
}
const asLine = (e, c) => lineOf(e, c)
const seedKey = (seed) => keyOf(seed)

/**
 * verdictRight(ex, series, seed, opts?)  ex = quiz Exercise; series = library series (its themeScripture joins the pool)
 * opts: { combo, recycled }
 */
export function verdictRight(ex = {}, series = {}, seed = '', opts = {}) {
  const combo = opts.combo | 0
  let l
  if (opts.recycled) l = choose(PRAISE.recycled, seed)
  else if (COMBO_AT.includes(combo)) l = choose(PRAISE.combo, seed, { n: combo })
  else {
    const ov = [
      ...(THEME_RIGHT[series.id] || []), ...(SOURCE_RIGHT[ex.source] || []), ...(TYPE_RIGHT[ex.type] || []),
      ...(series.themeScripture ? [{ text: series.themeScripture.text, ref: String(series.themeScripture.ref).replace(/\s*\(KJV\)$/, '') }] : []),
    ]
    // Roughly a third of verdicts speak to the day's own material; the rest walk the general pool in order.
    l = ov.length && hash(seedKey(seed) + ':ov') % 100 < 36 ? asLine(pick(ov, seed)) : choose(PRAISE.answer, seed)
  }
  return { tone: 'go', status: 'Go', head: 'Correct', text: l.text, ...(l.ref ? { ref: l.ref } : null), cta: 'Continue', aria: `Correct. ${say(l)}` }
}

/** verdictWrong(ex, seed, opts?)  opts: { recycled } (true when this is the second showing of the question) */
export function verdictWrong(ex = {}, seed = '', opts = {}) {
  const l = choose(opts.recycled ? WRONG.twice : WRONG.line, seed)
  const note = opts.recycled ? '' : pick(WRONG.note, seed)
  return {
    tone: 'nogo', status: 'No-go', head: 'Not yet', text: l.text, ...(l.ref ? { ref: l.ref } : null),
    ...(note ? { note } : null), cta: 'Continue', aria: `Not yet. ${say(l)}${note ? ' ' + note : ''}`,
  }
}

/** The label above the correct answer on a No-go sheet. */
export const answerLabel = (ex = {}) =>
  ({ choice: 'The answer', blank: 'The missing word', order: 'The line reads', match: 'The pairs', tf: 'The truth' })[ex.type] || 'The answer'

/* ── 6. The lesson (flight sequence) chrome ────────────────────────────── */

export const lessonCopy = {
  phases: { ignition: 'Ignition', ascent: 'Ascent', check: 'Check', orbit: 'Orbit insertion' },
  cta: { next: 'Continue', check: 'Check', prayer: 'Amen', declare: 'I declare it', finish: 'Complete lesson', start: 'Begin', gotIt: 'Got it' },
  close: { title: 'Leave this lesson?', body: 'Your place is saved. Pick it up from the Launch Bar.', confirm: 'Leave', cancel: 'Keep going', aria: 'Close lesson' },
  /** Why CHECK is disabled, per exercise type (also its accessible description). */
  checkHint: {
    choice: 'Choose an answer to check it.', blank: 'Choose a word to fill the gap.', order: 'Put the words in order to check.',
    match: 'Match every pair to check.', tf: 'Choose true or false to check.',
  },
  exercise: { choice: 'Choose one.', blank: 'Fill the gap.', order: 'Put the words in order.', match: 'Match the pairs.', tf: 'True or false?' },
  keys: 'Press 1 to 4 to choose, Enter to check, Escape to close.',
  /** Eyebrow above each reading slide. Use slideLabel(kind, { i, n }). */
  slide: {
    ignition: 'Ignition', watch: 'Tonight’s episode', hook: 'Start here', verse: 'The Word', supporting: 'Also written',
    truth: 'The one thing', point: 'Truth {i} of {n}', illustration: 'Picture this', challenge: 'Your move today',
    apply: 'Do this today', ask: 'Your answer', prayer: 'Pray', short: 'Sixty seconds', declaration: 'Say it out loud',
    finalDeclaration: 'The final declaration', recap: 'This week', reading: 'Bible reading', talk: 'Talk about it',
    testimony: 'Testimony', journey: 'The whole climb', theme: 'Theme scripture', check: 'Check',
    askKids: 'Ask your children', family: 'Talk about it together',
  },
  watch: { hint: 'Watch it, then carry on.', offline: 'Video needs a connection.', youtube: 'Watch on YouTube', play: 'Play episode', facade: 'Tap to load the video from YouTube.' },
  /** Journal placeholder variants (the prompt itself comes from the episode). */
  journal: [
    'Write it in your own words.', 'What does this mean for you today?', 'Say it your way.',
    'Be honest. No one else will read this.', 'One or two sentences is plenty.', 'Start with: Today I will…',
    'Write what you want to remember.',
  ],
  declare: [
    'Out loud counts. Say it once, slowly.', 'If someone is near, say it together.', 'Say it with your voice, not just your eyes.',
    'Say it slowly. Mean every word.',
  ],
  pray: 'Pray it, or say it in your own words.',
  journalHelp: 'Saved on this device. Only you can read it.',
  journalSaved: 'Saved to your Journal.',
}
/** The three beats of the Launch transition (a mono readout while the lesson rises). */
export const launchSequence = ['All systems go', 'Ignition', 'Liftoff']
const CALLOUTS = [[0, 'Liftoff'], [25, 'Climbing'], [50, 'Halfway'], [75, 'Final stretch'], [100, 'Orbit insertion']]
/** flightCallout(0.5)  ->  'Halfway'   (progress 0..1 through the lesson; the mono caption beside T+02:10) */
export const flightCallout = (progress) => {
  const p = Math.max(0, Math.min(1, progress)) * 100
  return CALLOUTS.reduce((out, [at, word]) => (p >= at ? word : out), 'Liftoff')
}
export const slideLabel = (kind, c = {}) => fill(lessonCopy.slide[kind] || lessonCopy.slide.check, c)
export const journalPlaceholder = (seed = '') => pick(lessonCopy.journal, seed)
/** Short disabled-state description for the CHECK button. */
export const checkHint = (type) => lessonCopy.checkHint[type] || lessonCopy.checkHint.choice

/* ── 7. Streak, shields, milestones, ranks ─────────────────────────────── */

const STREAK = {
  t0: ['Day 1 starts now.', 'Nothing yet. Launch today.', 'The count starts with one lesson.'],
  t1: ['Day 1. Ignition.', 'Day 1. The flame is lit.', 'Day 1. It starts here.', 'One day down. Come back tomorrow.', 'Lit. Now keep it burning.', 'Day 1. Every long climb begins here.'],
  t2: ['2 days. Ignition holding.', '2 in a row. Keep the burn going.', '2 days. The habit is forming.', '2 days. Tomorrow makes three.', '2 days. Steady.', '2 days. Come back tomorrow.'],
  m3: ['3 days. Ignition holding.', '3 days. A pattern is forming.', '3 days. Well started.'],
  t4: ['{n} days. Ignition holding.', '{n} days. Burn steady.', '{n} in a row. Keep it lit.', '{n} days. A week is in sight.', '{n} days. Steady climb.', '{n} days and counting.'],
  m7: ['7 days. Ignition holding.', 'A full week. 7 days.', '7 days. One week, kept.'],
  t8: ['{n} days. Still lit.', '{n} days in a row.', '{n} days. Two weeks is the next mark.', '{n} days. This is a habit now.', '{n} days. Past the first week.', '{n} days. The flame is holding.'],
  m14: ['14 days. Two weeks, kept.', '14 days. Burning steady.', '14 days. A rhythm now.'],
  t15: ['{n} days. Holding altitude.', '{n} days. Three weeks is the next mark.', '{n} days. Steady and sure.', '{n} days. The climb is paying.', '{n} in a row. Keep going.', '{n} days. Holding course.'],
  m21: ['21 days. Three weeks, kept.', '21 days. Pattern set.', '21 days. Rooted.'],
  t22: ['{n} days. Almost in orbit.', '{n} days. Orbit is close.', '{n} days. Hold the line.', '{n} days. Hold the burn.', '{n} days. Nearly there.', '{n} days. Do not ease off now.'],
  m31: ['31 days. In orbit.', '31 days. A full month, held.', '31 days. Orbit.'],
  t32: ['{n} days. In orbit.', '{n} days. Holding orbit.', '{n} days. Past the month and still burning.', '{n} days. Steady in orbit.', '{n} days. Faithful in the long run.', '{n} days. Burning clean.'],
}
const streakTier = (n) =>
  n <= 0 ? 't0' : n === 1 ? 't1' : n === 2 ? 't2' : n === 3 ? 'm3' : n <= 6 ? 't4' : n === 7 ? 'm7' : n <= 13 ? 't8'
  : n === 14 ? 'm14' : n <= 20 ? 't15' : n === 21 ? 'm21' : n <= 30 ? 't22' : n === 31 ? 'm31' : 't32'

/** streakLine(7)  ->  '7 days. Ignition holding.'  Plain string; the HUD tooltip, the Objectives header, the Launch Bar note. */
export const streakLine = (n, seed = '') => choose(STREAK[streakTier(n)], seedOf(n, seed), { n }).text

/** Mirrors the store's MILESTONES (tools/test-copy.mjs asserts they match). */
export const MILESTONES = [3, 7, 14, 21, 31, 50, 75, 100, 150, 200, 365]
export const isMilestone = (n) => MILESTONES.includes(n)
const MILESTONE = {
  3: {
    lines: [
      { title: 'Ignition holding.', text: 'Three launches in a row.' },
      { title: 'Three days.', text: 'It is becoming a pattern.' },
      { title: 'Well started.', text: 'Three days with the Word, one after another.' },
    ], word: W_shining,
  },
  7: {
    lines: [
      { title: 'One full week!', text: 'Seven launches in seven days.' },
      { title: 'A week, kept.', text: 'Seven days with the Word, one after another.' },
      { title: 'Seven days.', text: 'A full week. The flame is holding.' },
    ], word: W_weary,
  },
  14: {
    lines: [
      { title: 'Two weeks.', text: 'Fourteen days. Burning steady.' },
      { title: 'Fourteen days.', text: 'This is a rhythm now, not a mood.' },
      { title: 'Two weeks, kept.', text: 'Fourteen days of showing up.' },
    ], word: W_notVain,
  },
  21: {
    lines: [
      { title: 'Three weeks.', text: 'Twenty-one days. A pattern set.' },
      { title: 'Day 21.', text: 'You are rooted now.' },
      { title: 'Three weeks, kept.', text: 'The habit has roots.' },
    ], word: W_tree,
  },
  31: {
    lines: [
      { title: 'In orbit.', text: 'Thirty-one days. A full month, held.' },
      { title: 'Orbit reached.', text: 'Thirty-one days with the Word.' },
      { title: 'A full month.', text: 'Thirty-one days, one after another.' },
    ], word: W_course,
  },
  50: {
    lines: [
      { title: 'Fifty days.', text: 'Past a month, and still lit.' },
      { title: 'Half a hundred.', text: 'Fifty days. Still burning.' },
      { title: 'Fifty.', text: 'Fifty days of showing up.' },
    ], word: W_race,
  },
  75: {
    lines: [
      { title: 'Three quarters.', text: 'Seventy-five days, and still lit.' },
      { title: 'Day 75.', text: 'Seventy-five days with the Word.' },
      { title: 'Seventy-five.', text: 'This is who you are now.' },
    ], word: W_eagles,
  },
  100: {
    lines: [
      { title: 'One hundred days!', text: 'A hundred launches. Faithful in the long run.' },
      { title: 'A hundred days.', text: 'This is no longer a streak. It is a way of life.' },
      { title: 'Day 100.', text: 'One hundred days with the Word.' },
    ], word: W_mark,
  },
  150: {
    lines: [
      { title: 'One hundred and fifty days.', text: 'Nearly half a year, and still showing up.' },
      { title: 'Day 150.', text: 'A hundred and fifty launches.' },
      { title: 'One fifty.', text: 'Nearly five months with the Word.' },
    ], word: W_number,
  },
  200: {
    lines: [
      { title: 'Two hundred days.', text: 'Two hundred days of showing up.' },
      { title: 'Day 200.', text: 'Two hundred launches, one after another.' },
      { title: 'Two hundred.', text: 'The habit has become the person.' },
    ], word: W_faithfulMan,
  },
  365: {
    lines: [
      { title: 'One full year!', text: 'Three hundred and sixty-five days with the Word.' },
      { title: 'A whole year.', text: 'A year of daily launches.' },
      { title: 'Day 365.', text: 'A year ago, this was Day 1.' },
    ], word: W_newMorning,
  },
}
/**
 * milestoneCopy(7, { shield:true, xp:30, seed })  ->  { n, eyebrow, title, text, word:Line, bonus?, reward?, cta, shareCta, aria } | null
 * The full-bleed streak moment (<= 4 s, skippable). `bonus` appears when ctx.shield is true (every 7th day earns a Shield);
 * `reward` is the milestone XP ("+30 XP") when ctx.xp is given (result.xp.lines has it as { id:'milestone' }).
 */
export function milestoneCopy(n, ctx = {}) {
  const m = MILESTONE[n]
  if (!m) return null
  const l = pick(m.lines, seedOf(n, ctx.seed))
  const bonus = ctx.shield ? shieldLine('earned', {}, seedOf('ms', n, ctx.seed)) : ''
  return {
    n, eyebrow: `${n}-day streak`, title: l.title, text: l.text, word: m.word, ...(bonus ? { bonus } : null), ...(ctx.xp ? { reward: xpDelta(ctx.xp) } : null),
    cta: 'Continue', shareCta: 'Share streak', aria: `${n}-day streak. ${l.title} ${l.text} ${say(m.word)}`,
  }
}

const LOST = [
  'Streak ended at {n}. Day 1 starts now.', '{n} days are behind you. Day 1 starts now.', 'The streak rests at {n}. Launch today and begin again.',
  'Streak ended at {n}. The Word is still here.', 'That was {n} days. Begin the next count today.', 'Streak ended at {n}. Come back and light it again.',
  W_newMorning, W_fallRise,
]
const LOST_SHORT = ['Day 1 starts again today.', 'A fresh start. Launch today.', 'Begin again today.', W_newMorning]
/** streakLostCopy(12, seed)  ->  Line  ('Streak ended at 12. Day 1 starts now.') */
export const streakLostCopy = (prev, seed = '') => choose(prev >= 2 ? LOST : LOST_SHORT, seedOf('lost', prev, seed), { n: prev })

const SHIELD = {
  used: [
    'A shield held your streak.', 'A shield took the miss. Streak intact at {n}.', 'Yesterday slipped. A shield held the line.',
    'Shield spent. {n} days still standing.', 'The shield did its work. Streak: {n}.', 'You missed a day. A shield covered it.',
    'A shield stood in for yesterday.',
  ],
  earned: [
    'Shield earned. It covers one missed day.', 'A shield is yours. It covers one missed day.', 'New shield. One missed day, covered.',
    'Shield earned for seven days faithful.', 'You have earned a shield.', 'A shield for the road ahead.',
  ],
  drop: ['A shield came in the supply drop.', 'Supply drop: one shield.', 'Shield in the drop. Keep it for a hard day.', 'A shield, found in the drop.'],
  max: ['Your shield bay is full.', 'Shields full. No room for more.', 'Already carrying every shield you can hold.'],
  low: ['One shield left.', 'Last shield. Use today well.', 'One shield in reserve.'],
  none: ['No shields. Today counts.', 'No shield in reserve. Launch today.', 'No shields left. Show up today.'],
  overflow: ['Shields full. The extra became XP.', 'You already hold two shields. This one became XP.', 'No room for another shield, so it became XP.'],
  next: [
    'Next shield in {n} days.', 'A shield is {n} days of streak away.', '{n} more days to your next shield.',
    'You earn a shield at every 7-day mark.', 'Seven days in a row earns a shield.', 'Reach 7 and a shield is yours.',
  ],
  cover: ['Your shield would cover a miss. Launch and keep it.', 'A shield is in reserve. Launch tonight and keep it.', 'You have a shield, but launching is better.'],
}
/** shieldLine('used', { n:12 }, seed)  kinds: used | earned | drop | max | overflow | low | none | cover | next ({ n: days to go })  ->  plain string */
export const shieldLine = (kind, c = {}, seed = '') => {
  if (kind === 'next' && c.n === 1) return 'One more day to your next shield.'
  return choose(SHIELD[kind] || SHIELD.earned, seedOf(kind, seed), c.n === 1 ? { ...c, n: null } : c).text
}

const RANK_BY_ID = {
  seeker: { texts: ['Your first rank. Everyone starts here.', 'The first rung. The climb starts here.', 'Cleared for the climb.'], word: W_seek },
  steward: { texts: ['You manage what you were given. That is a steward.', 'A steward keeps what belongs to Another. So do you.', 'Faithful in the small, trusted with the next.'], word: W_found },
  builder: { texts: ['You are building now, not just learning.', 'Stone by stone, lesson by lesson.', 'One lesson at a time, a wall goes up.'], word: W_build },
  keeper: { texts: ['You keep what you have been given.', 'Dressed and kept. That is the work.', 'Faithful with the garden you were handed.'], word: W_dressKeep },
  pathfinder: { texts: ['You found the path. Now light it for others.', 'Where the Word leads, you go first.', 'You know the way now.'], word: W_lamp },
  commander: { texts: ['You lead by example now.', 'Steady under pressure. That is leadership.', 'Command begins with being under command.'], word: W_courage },
  pioneer: { texts: ['The top rank. A pioneer of the Word!', 'Few get this far. You are first to many places.', 'A new thing, and you are in it.'], word: W_newThing },
}
// If the ranks are ever renamed, the ladder still has something true to say at every rung.
const RANK_BY_INDEX = [
  { texts: ['A first rank, and a first step.', 'The ladder starts here.', 'Welcome to the climb.'], word: W_hereAmI },
  { texts: ['Small things, counted. You have started well.', 'You are no longer just visiting.', 'The first step up. More ahead.'], word: W_smallThings },
  { texts: ['Faithful in the least. On to the much.', 'You kept the little. Now the much.', 'Trust is built a lesson at a time.'], word: W_least },
  { texts: ['Trusted with more because you kept what you had.', 'You are becoming dependable.', 'Reliable is a high compliment. It is yours.'], word: W_found },
  { texts: ['Your pace has become your character.', 'Diligence, visible now.', 'You are known by what you keep doing.'], word: W_kings },
  { texts: ['Few get this far. Lead by being faithful.', 'Pass it on. Someone is watching you stay faithful.', 'You have something to teach now.'], word: W_teachOthers },
  { texts: ['The top of the ladder. Well done!', 'Every rung climbed. Well done.', 'You kept the faith, one lesson at a time.'], word: W_wellDone },
]
/**
 * rankUpCopy(rank, seed)  rank = the store's rankFor(xp) object ({ index, id, name }) or just an index
 *  ->  { index, eyebrow:'Rank 3', title:<rank name>, text, word:Line, cta, shareCta, aria }
 */
export function rankUpCopy(rank, seed = '') {
  const o = rank && typeof rank === 'object' ? rank : {}
  const index = Math.max(0, (typeof rank === 'number' ? rank : o.index) | 0)
  const name = o.name || `Rank ${index + 1}`
  const r = RANK_BY_ID[o.id] || RANK_BY_INDEX[Math.min(index, RANK_BY_INDEX.length - 1)]
  const text = pick(r.texts, seedOf('rank', o.id || index, seed))
  return {
    index, eyebrow: `Rank ${index + 1}`, title: name, text, word: r.word, cta: 'Continue', shareCta: 'Share rank',
    aria: `New rank: ${name}. ${text} ${say(r.word)}`,
  }
}

/* ── 8. Completion: orbit insertion, supply drops, month complete ──────── */

/**
 * completionCopy({ day, kind, first, perfect, recovered, again, comeback, hour, role, series, seed, name })
 *  ->  { eyebrow:'Orbit insertion', title:'Day 12 complete', text:Line, cta, shareCta, aria }
 * From finishDay's result: first = r.first, perfect = r.perfect, recovered = (r.asked > r.right && !r.perfect), again = r.again,
 * comeback = r.streak.comeback; hour = the finishing hour (a late or early finish is acknowledged about half the time).
 * kind: 'teaching' | 'selah' | 'intro' (celebration days use monthCompleteCopy). role: 'parent' gets lines about leading.
 */
export function completionCopy(ctx = {}) {
  const kind = ctx.again ? 'practice' : ctx.first ? 'first' : ctx.perfect ? 'perfect' : ctx.recovered ? 'recovered' : ctx.comeback ? 'return'
    : ctx.kind === 'selah' ? 'selah' : ctx.role === 'parent' ? 'leader' : 'lesson'
  const sd = seedOf('done', ctx.day, ctx.seed)
  const themed = THEME_DONE[ctx.series?.id || ctx.seriesId]
  const h = ctx.hour
  const timed = kind === 'lesson' || kind === 'leader' ? (h >= 21 || h < 4 ? 'late' : h >= 4 && h < 7 ? 'early' : null) : null
  const l = timed && hash(sd + ':hr') % 100 < 50 ? choose(PRAISE[timed], sd)
    : kind === 'lesson' && themed && hash(sd + ':th') % 100 < 35 ? { text: pick(themed, sd) } : choose(PRAISE[kind], sd, ctx)
  const eyebrow = ctx.again ? 'Practice complete' : ctx.kind === 'selah' ? 'Selah kept' : 'Orbit insertion'
  const title = `Day ${ctx.day} complete`
  return { eyebrow, title, text: l, cta: 'Continue', shareCta: 'Share', aria: `${eyebrow}. ${title}. ${say(l)}` }
}

const XP_LABELS = {
  lesson: 'Correct answers', complete: 'Lesson complete', rare: 'Gold card bonus', perfect: 'Perfect lesson', milestone: 'Streak milestone',
  'shield-overflow': 'Shield converted', drop: 'Supply drop', total: 'Total',
}
/**
 * ledgerCopy(result.xp)  ->  [{ id, label, value }]   the XP breakdown on the completion screen, ending with the total:
 *   [{ id:'lesson', label:'Correct answers', value:'+30 XP' }, { id:'complete', … '+20 XP' }, …, { id:'total', label:'Total', value:'+75 XP' }]
 */
export function ledgerCopy(xp = {}) {
  const rows = []
  if (xp.lesson) rows.push({ id: 'lesson', label: XP_LABELS.lesson, value: xpDelta(xp.lesson) })
  for (const l of xp.lines || []) rows.push({ id: l.id, label: XP_LABELS[l.id] || l.id, value: xpDelta(l.xp) })
  if (xp.drop) rows.push({ id: 'drop', label: XP_LABELS.drop, value: xpDelta(xp.drop) })
  const total = xp.total != null ? xp.total : rows.reduce((a, r) => a + (parseInt(r.value.replace(/[^0-9-]/g, ''), 10) || 0), 0)
  rows.push({ id: 'total', label: XP_LABELS.total, value: xpDelta(total) })
  return rows
}
/** rewardCopy({ xp:150, shield:1, fragments:1 })  ->  '+150 XP · Shield · Patch fragment'  (objective and chest rewards) */
export function rewardCopy(r = {}) {
  const parts = []
  if (r.xp) parts.push(xpDelta(r.xp))
  if (r.shield) parts.push(r.shield > 1 ? `${r.shield} Shields` : 'Shield')
  if (r.fragments) parts.push(r.fragments > 1 ? `${r.fragments} patch fragments` : 'Patch fragment')
  return parts.join(' · ')
}
const CHEST = [
  'Today’s chest. Well earned.', 'Three rings closed, one chest opened.', 'The reward for a full day.',
  'A full day, paid out.', 'Closed all three rings. This is the reward.', 'The day’s work, rewarded.',
]
/** chestCopy({ xp:25 }, seed)  ->  { eyebrow:'Daily chest', title:'+25 XP', text, aria } */
export function chestCopy(reward = {}, seed = '') {
  const title = reward.xp ? xpDelta(reward.xp) : 'Opened'
  const text = pick(CHEST, seedOf('chest', reward.xp, seed))
  return { eyebrow: 'Daily chest', title, text, aria: `Daily chest. ${title}. ${text}` }
}

const DROP = {
  xp: ['Bonus fuel from the supply drop.', 'Extra XP, straight from the drop.', 'A supply drop. Extra XP.', 'The drop was fuel this time.', 'Bonus XP. Well earned.', 'Extra fuel for tomorrow’s climb.'],
  fragment: ['A piece of a mission patch. Collect them to complete it.', 'A fragment of a patch. More to find.', 'Part of a stage patch, found in the drop.', 'A patch fragment. Keep collecting.'],
}
/** dropCopy(result.drop, seed)  { kind:'xp'|'shield'|'fragment', xp|amount, converted? }  ->  { eyebrow:'Supply drop', title, text, aria } */
export function dropCopy(drop = {}, seed = '') {
  const kind = (DROP[drop.kind] || drop.kind === 'shield') ? drop.kind : 'xp'
  const title = kind === 'xp' ? xpDelta(drop.amount ?? drop.xp ?? 0) : kind === 'shield' ? 'A Shield' : 'Patch fragment'
  const text = kind === 'shield' ? shieldLine(drop.converted ? 'overflow' : 'drop', {}, seed) : pick(DROP[kind], seedOf('drop', kind, seed))
  return { eyebrow: 'Supply drop', title, text, aria: `Supply drop. ${title}. ${text}` }
}
export const dropChrome = { closed: 'Supply drop', hint: 'Tap to open.', open: 'Open the drop', aria: 'Supply drop, closed. Tap to open.' }

const MONTH = [
  'You reached orbit. {days} days with the Word.', 'Mission complete. You finished what you began!', 'A whole month, kept. Well done.',
  'Orbit reached. The Word went in, and it stayed.', '{days} days, one declaration, and you said it to the end.',
]
/**
 * monthCompleteCopy(series, { days, seed })  ->  { eyebrow, title, text, word:Line, declaration:[string], cta, shareCta, aria }
 * The grand moment: the series' own theme scripture and its closing declaration.
 */
export function monthCompleteCopy(series = {}, ctx = {}) {
  const text = choose(MONTH, seedOf('month', series.id, ctx.seed), { days: ctx.days || (series.calendar ? series.calendar.length : 31) }).text
  const word = series.themeScripture ? { text: series.themeScripture.text, ref: String(series.themeScripture.ref).replace(/\s*\(KJV\)$/, '') } : W_course
  const title = `${series.title || 'The mission'} complete`
  return {
    eyebrow: 'Orbit reached', title, text, word, declaration: series.declaration || [], cta: 'Continue', shareCta: 'Share your mission',
    aria: `Orbit reached. ${title}. ${text} ${say(word)}`,
  }
}

const STAGE_TEXT = [
  'Every day of the stage, done.', 'The patch is stitched.', 'One stage behind you, and more above.',
  'Stage cleared. The patch is yours.', 'You finished what the stage asked.', 'Another stage cleared. Keep climbing.',
]
const STAGE_WORD = {
  'stewardship-code': [W_earth, W_least, W_masters, W_occupy],
  'secrets-of-longevity': [W_breath, W_byFaith, W_renewing, W_temple, W_course],
}
const STAGE_WORD_ANY = [W_least, W_withMight, W_weary, W_race, W_course, W_light]
/**
 * stageClearCopy(result.stage, series, seed)  ->  { eyebrow:'Stage 2 clear', title:'Patch earned', text, word:Line, stageTitle, cta, shareCta, aria }
 * Shown when result.stage.clearedNow. Each stage of the two shipped missions carries a verse about that stage's theme.
 */
export function stageClearCopy(stage = {}, series = {}, seed = '') {
  const n = stage.n != null ? stage.n : (stage.index | 0) + 1
  const words = STAGE_WORD[series.id] || STAGE_WORD_ANY
  const word = words[(n - 1) % words.length]
  const text = pick(STAGE_TEXT, seedOf('stage', series.id, n, seed))
  const eyebrow = `Stage ${n} clear`
  return { eyebrow, title: 'Patch earned', text, word, stageTitle: stage.title || '', cta: 'Continue', shareCta: 'Share patch', aria: `${eyebrow}. Patch earned. ${text} ${say(word)}` }
}

const NEXT_UP = [
  'Next up: {title}.', 'Coming up: {title}.', 'Day {day} is next: {title}.', 'Come back for {title}.', 'Next launch: {title}.',
  'Another launch is waiting.', 'There is more to come.', 'Come back for the next one.',
]
/**
 * nextUpCopy({ day, title, unlockAt, now, zone }, seed)  ->  { eyebrow, title, sub, when, aria }
 * The hook at the end of a completed day (result.next = { day, unlockAt }): what is next, and exactly when it opens.
 * Pass `now` (a Date) so "tomorrow" can be said; omit result.next in archive mode, where the next day is already open.
 */
export function nextUpCopy(ctx = {}, seed = '') {
  const u = ctx.unlockAt instanceof Date ? ctx.unlockAt : null
  const at = fmtClock(u ? u.getHours() : UNLOCK_HOUR, u ? u.getMinutes() : 0, { zone: ctx.zone || '' })
  const tomorrow = u && ctx.now instanceof Date && Math.round((new Date(u.getFullYear(), u.getMonth(), u.getDate()) - new Date(ctx.now.getFullYear(), ctx.now.getMonth(), ctx.now.getDate())) / 864e5) === 1
  const when = u ? `Opens ${tomorrow ? 'tomorrow' : fmtDate(u)} at ${at}` : ''
  const sub = choose(NEXT_UP, seedOf('next', ctx.day, seed), { day: ctx.day, title: ctx.title }).text
  const eyebrow = ctx.day ? `Day ${ctx.day}` : 'Next launch'
  return { eyebrow, title: ctx.title || '', sub, when, aria: [eyebrow, ctx.title, sub, when].filter(Boolean).map((x) => x.replace(/\.+$/, '')).join('. ') + '.' }
}

/* ── 9. Rings & objectives ─────────────────────────────────────────────── */

/** rankLine(rankFor(xp))  ->  'Steward · 120 XP to Builder'   (or 'Pioneer. The top rank.') */
export function rankLine(info = {}) {
  if (info.max) return `${info.name}. The top rank.`
  return info.next ? `${info.name} · ${fmtNum(info.toNext)} XP to ${info.next.name}` : info.name || ''
}
export const ringLabels = { lesson: 'Lesson', xp: 'XP', right: 'Accuracy' }
/** ringCopy({ id, now, goal })  ->  { label, sub, aria }  ("Lesson", "24 / 40 XP", "XP ring: 24 of 40") */
export function ringCopy(r = {}) {
  const label = ringLabels[r.id] || 'Ring'
  const done = r.goal > 0 && r.now >= r.goal
  const sub = r.id === 'lesson' ? (done ? 'Done' : 'Finish today’s lesson')
    : r.id === 'xp' ? `${fmtNum(r.now)} / ${fmtNum(r.goal)} XP`
    : `${fmtNum(r.now)} / ${fmtNum(r.goal)} correct`
  const aria = r.id === 'lesson' ? `Lesson ring: ${done ? 'done' : 'not done yet'}.`
    : r.id === 'xp' ? `XP ring: ${fmtNum(r.now)} of ${fmtNum(r.goal)}.` : `Accuracy ring: ${fmtNum(r.now)} of ${fmtNum(r.goal)} correct.`
  return { label, sub, aria, done }
}
export const objectives = {
  lesson: () => 'Finish today’s lesson',
  xp: (goal) => `Earn ${fmtNum(goal)} XP`,
  right: (goal) => `Get ${fmtNum(goal)} answers right`,
  allDays: (total) => `Finish all ${total} days`,
  allCards: () => 'Collect every code card',
  allStages: () => 'Clear every stage',
  week: () => 'Hold a 7-day streak',
  gold: () => 'Earn a gold code card',
  chest: { closed: 'Chest', ready: 'Open the chest', opened: 'Chest opened' },
}

/* ── 10. The Launch Bar ────────────────────────────────────────────────── */
// One glass slab above the dock. launchBarCopy returns every string the slab needs for the state it is in.
// Feed it the store's launchState(...) object (add streakInfo bits for atRisk / missed; docs/COPY.md has the mapping).
//   state: ready | progress | waiting (the store says 'done') | locked | archive | missed | atRisk | first | upcoming | complete | selah
//   `kind` = 'teaching' | 'selah' | 'intro' | 'celebration' refines ready / first so a finale does not read like a Tuesday.

/** A live day opens at 06:00 local on its own date. Mirrors lib.UNLOCK_HOUR (tools/test-copy.mjs asserts they match). */
export const UNLOCK_HOUR = 6

const BAR = {
  readyEyebrow: ['Cleared for launch', 'Ready to launch', 'Pad is clear', 'Go for launch'],
  ready: [
    'Scripture, one truth, a short check, a declaration.', 'Find a quiet spot and begin.', 'One truth for the day.', 'The Word first. Everything else after.',
    'A short lesson, well spent.', 'Put everything else down and begin.', 'Take a breath, then launch.', 'Read it slowly. Say the declaration out loud.', 'Ready when you are.',
  ],
  readyParent: [
    'Read it aloud together.', 'Take turns reading with the children.', 'Gather the children and begin.', 'Lead them in the Word.', 'A family lesson, led by you.',
    'Call the children over.', 'Let the youngest read the verse.', 'Ask each child one question when you finish.', 'Read the verse first, then ask what they heard.',
  ],
  note: [
    'Launch keeps your streak at {streak}.', 'Your {streak}-day streak continues here.', '{streak} days. Make it {next}.',
    'Day {next} of your streak starts here.', 'Keep the {streak}-day streak burning.', 'The {streak}-day streak runs through this lesson.',
  ],
  progress: [
    'Pick up where you stopped.', 'Step {step} of {steps}. Carry on.', 'You are {pct}% through. Finish it.', 'About {left} min left.',
    'Almost there. Step {step} of {steps}.', 'Back on the pad. Resume.', 'Your place is saved. Carry on.',
  ],
  waiting: [
    'Day {next} opens at {at}.', 'Rest well. Day {next} opens at {at}.', 'Day {next} unlocks at {at}.', 'Come back at {at} for Day {next}.',
    'Hold on to today’s Word. Day {next} opens at {at}.', 'Day {next} is next, from {at}.',
    'The next day opens at {at}.', 'Rest well. The next day opens at {at}.', 'Hold on to today’s Word.',
  ],
  soon: ['Day {next} opens in {when}.', 'Almost time. Day {next} opens in {when}.', '{when} to Day {next}.', 'The next day opens in {when}.'],
  locked: [
    'Rest a little longer.', 'Today’s launch is not open yet.', 'The pad is not open yet.', 'Almost time. Come back then.',
    'Not yet. The Word will be here.', 'The pad opens soon.',
  ],
  away: [
    'It has been a few days. The Word kept your place.', 'Welcome back. Start with today.', 'The door was open all along. Come in.',
    'Good to have you back. Launch today.', 'Pick it up from here. One lesson is enough.', 'The Word kept your place. Begin with today.',
  ],
  archive: [
    'Every day is open. This is the first one you have not finished.', '{done} of {total} done. Pick up here.', 'No countdown. Take it at your pace.',
    'The mission is over. The Word is not. Pick up here.', 'Open any day. This is where you left off.', 'No clock on this one.',
  ],
  missedShield: [
    'A shield covered yesterday. Launch today to keep your streak.', 'Yesterday slipped; a shield held. Launch today.',
    'Shield spent. Your {streak}-day streak lives. Launch today.', 'A shield held the line. Today is yours.',
    'Your streak is safe, for now. Launch today.', 'The shield did its work. Now do today’s lesson.',
  ],
  missedLost: [
    'Yesterday was missed. Today is a clean start.', 'A missed day is not the end. Launch today.', 'The streak ended. The mission did not.',
    'Yesterday is behind you. Launch today.', 'Start again. One lesson is enough.', 'Day 1 starts now. Launch today.',
  ],
  atRisk: [
    'About {left} left. Launch to keep it burning.', 'Your streak ends in about {left}. One lesson saves it.',
    'It is {left} to midnight. {mins} minutes is all it takes.', 'Do not let the flame go out. About {left} left.',
    'Tonight keeps it. About {left} left.', '{streak} days is worth {mins} minutes tonight.',
    'The day is nearly done. Launch to keep the streak.', 'One lesson keeps it going.', 'Midnight is coming. Launch now.',
  ],
  first: ['No account. No sign-up. Just begin.', 'Nothing to set up. Just begin.', 'Your first launch.', 'Your first lesson. Take it slowly.', 'Start here. Everything else follows.', 'It is short, and it is yours.'],
  upcoming: ['Day 1 opens at {at}. Check back then.', 'Pre-flight is done. The launch window opens at {at}.', 'Set a reminder and be here when it opens.', 'The mission has not started. Check back soon.'],
  complete: ['You finished {title}. Review any day, any time.', 'Every day is done. Open any of them again.', 'The month is yours. Revisit the Word any time.', 'Every day is done. Review any of them.'],
  selah: [
    'Look back, then look up.', 'Rest and review. Skipping Selah will not break your streak.', 'Look back over the week, then say the code together.',
    'A lighter day. Rest and review.', 'No new episode today. Review and rest.', 'Selah: pause and think on it.',
  ],
  finale: ['The last day. Finish what you started.', 'Final launch. Make it count.', 'One more launch to orbit.', 'The last day of the mission. Finish well.'],
  intro: ['The mission starts here.', 'Begin at the beginning.', 'Day 1 sets the course for everything after.', 'The briefing comes first. Begin here.'],
  catchUp: [
    'Day {catchUp} is still open. Pick it up when you can.', 'You are {behind} days behind. No rush: start with Day {catchUp}.', 'Open days are waiting. Start with Day {catchUp}.',
    'Day {catchUp} is open. One lesson at a time.', 'Catch up at your own pace, starting with Day {catchUp}.',
    'An earlier day is still open. Pick it up when you can.', 'Open days are waiting. Pick one up.', 'Catch up at your own pace.',
  ],
}
const BAR_STATES = ['ready', 'progress', 'waiting', 'locked', 'archive', 'missed', 'atRisk', 'first', 'upcoming', 'complete', 'selah']
const BAR_ALIAS = { done: 'waiting' }

/**
 * launchBarCopy({ state, day, title, mins, countdown, streak, hoursLeft, … })
 *   day, title, mins            the lesson (title = lesson title, mins = minutes)
 *   kind, role                  kind: 'teaching' | 'selah' | 'intro' | 'celebration'; role: 'parent' gets family lines
 *   countdown (ms), unlockAt    waiting / locked / upcoming: time until it opens, and the Date it opens (06:00); atRisk: ms to midnight
 *   streak, shields, hoursLeft  atRisk (and the ready note): the streak, shields held, hours until midnight
 *   step, steps, pct (0-100)    progress
 *   done, total                 archive
 *   shieldUsed (bool), gapDays  missed: a shield covered yesterday (otherwise the streak ended); gapDays >= 3 reads as a welcome back, not a scolding
 *   next                        waiting: the day number that opens next (default day + 1)
 *   seriesTitle, opens (Date)   upcoming / complete
 *   zone                        zoneTag(now()) so times read "6:00 am WAT" on a Lagos clock
 *   seed                        a stable per-day seed (e.g. today()) so the line changes daily but never flickers
 * ->  { state, eyebrow, title, meta, sub, note, readout, cta, ctaAria, tone, disabled, aria }
 *   eyebrow = the mono line ("Day 12 · Cleared for launch"); title = the lesson; meta = "~6 min"; sub = one sentence;
 *   note = optional streak line; readout = telemetry ("T-02:14:09"); tone = 'ignite' | 'tele' | 'go' | 'warn'; disabled = locked.
 */
export function launchBarCopy(ctx = {}) {
  const asked = BAR_ALIAS[ctx.state] || ctx.state
  const state = BAR_STATES.includes(asked) ? asked : 'ready'
  const day = ctx.day != null ? Number(ctx.day) : 0
  const mins = ctx.mins != null ? Math.max(1, Math.round(ctx.mins)) : null
  const kind = ctx.kind || 'teaching'
  const title = ctx.title || ''
  const ms = ctx.countdown
  const u = ctx.unlockAt instanceof Date ? ctx.unlockAt : null
  const at = fmtClock(u ? u.getHours() : UNLOCK_HOUR, u ? u.getMinutes() : 0, { zone: ctx.zone || '' })
  const dayLabel = day ? `Day ${day}` : 'Today'
  const sd = seedOf('bar', state, kind, day, ctx.seed)
  const named = (verb) => `${verb} ${dayLabel}${title ? ': ' + title : ''}`
  const o = { state, eyebrow: '', title, meta: mins ? minsLabel(mins) : '', sub: '', note: '', readout: '', cta: 'Launch', ctaAria: '', tone: 'ignite', disabled: false }

  if (state === 'ready' || state === 'first') {
    const finale = kind === 'celebration', intro = kind === 'intro', selah = kind === 'selah'
    const pool = state === 'first' ? BAR.first : finale ? BAR.finale : intro ? BAR.intro : selah ? BAR.selah : ctx.role === 'parent' ? BAR.readyParent : BAR.ready
    const eye = state === 'first' ? 'First launch' : finale ? 'Final launch' : intro ? 'Series launch' : selah ? 'Selah' : pick(BAR.readyEyebrow, sd)
    o.eyebrow = `${dayLabel} · ${eye}`
    o.sub = choose(pool, sd, { mins }).text
    if (state === 'ready' && ctx.streak >= 2) o.note = choose(BAR.note, seedOf(sd, 'note'), { streak: ctx.streak, next: ctx.streak + 1 }).text
    if (selah) { o.cta = 'Begin'; o.tone = 'tele' }
    o.ctaAria = named(o.cta)
  } else if (state === 'selah') {
    o.eyebrow = `${dayLabel} · Selah`
    o.title = title || 'Rest and review'
    o.sub = choose(BAR.selah, sd, { mins }).text
    o.cta = 'Begin'; o.tone = 'tele'
    o.ctaAria = `Begin ${dayLabel}: ${o.title}`
  } else if (state === 'progress') {
    const pct = ctx.pct != null ? Math.round(ctx.pct) : ctx.step && ctx.steps ? Math.round((ctx.step / ctx.steps) * 100) : null
    const left = mins && pct != null ? Math.max(1, Math.round(mins * (1 - pct / 100))) : null
    o.eyebrow = `${dayLabel} · In flight`
    o.sub = choose(BAR.progress, sd, { step: ctx.step, steps: ctx.steps, pct, left }).text
    o.cta = 'Resume'
    o.ctaAria = named('Resume')
  } else if (state === 'waiting') {
    const next = ctx.next ?? (day ? day + 1 : null)
    o.eyebrow = `${dayLabel} complete`
    o.title = 'Next launch'
    o.meta = ''
    o.sub = choose(ms != null && ms < 3600e3 ? BAR.soon : BAR.waiting, sd, { next, at, when: ms != null ? wordsDuration(ms) : null }).text
    if (ms != null) o.readout = tMinus(ms)
    o.cta = 'Review'; o.tone = 'tele'
    o.ctaAria = named('Review')
  } else if (state === 'locked') {
    o.eyebrow = `${dayLabel} · Locked`
    o.sub = choose(BAR.locked, sd, {}).text
    if (ms != null) o.readout = tMinus(ms)
    o.cta = `Opens at ${at}`; o.tone = 'tele'; o.disabled = true
    o.ctaAria = `${dayLabel} is locked and opens at ${at}`
  } else if (state === 'archive') {
    o.eyebrow = `Archive · ${dayLabel}`
    o.sub = choose(BAR.archive, sd, { done: ctx.done, total: ctx.total, mins }).text
    o.ctaAria = named('Launch')
  } else if (state === 'missed') {
    const away = ctx.gapDays >= 3 && !ctx.shieldUsed
    o.eyebrow = away ? `${dayLabel} · Welcome back` : `${dayLabel} · Back on the pad`
    o.sub = choose(away ? BAR.away : ctx.shieldUsed ? BAR.missedShield : BAR.missedLost, sd, { streak: ctx.streak }).text
    o.cta = 'Launch today'; o.tone = ctx.shieldUsed ? 'tele' : 'ignite'
    o.ctaAria = `Launch today, ${dayLabel}${title ? ': ' + title : ''}`
  } else if (state === 'atRisk') {
    const left = timeLeft(ctx.hoursLeft != null ? ctx.hoursLeft : ms != null ? ms / 3600e3 : 3)
    o.eyebrow = 'Streak at risk'
    o.title = ctx.streak ? `${ctx.streak}-day streak` : title
    o.sub = ctx.shields > 0 && hash(sd + ':cover') % 4 === 0
      ? shieldLine('cover', {}, sd)
      : choose(BAR.atRisk, sd, { left, mins: mins || 5, streak: ctx.streak >= 2 ? ctx.streak : null }).text
    if (ms != null) o.readout = tMinus(ms)
    o.cta = 'Launch now'; o.tone = 'warn'
    o.ctaAria = ctx.streak ? `Launch now to keep your ${ctx.streak}-day streak` : 'Launch now'
  } else if (state === 'upcoming') {
    const opens = ctx.opens instanceof Date ? ctx.opens : u
    o.eyebrow = `Mission opens ${opens ? fmtDate(opens) : typeof ctx.opens === 'string' ? ctx.opens : 'soon'}`
    o.title = ctx.seriesTitle || title
    o.meta = ''
    o.sub = choose(BAR.upcoming, sd, { at }).text
    if (ms != null) o.readout = tMinus(ms)
    o.cta = 'Set a reminder'; o.tone = 'tele'
    o.ctaAria = `Set a reminder for ${o.title || 'the mission'}`
  } else if (state === 'complete') {
    o.eyebrow = 'Orbit reached'
    o.title = 'Mission complete'
    o.meta = ''
    o.sub = choose(BAR.complete, sd, { title: ctx.seriesTitle || title }).text
    o.cta = 'Review'; o.tone = 'go'
    o.ctaAria = 'Review any day of the mission'
  }

  const spoken = ms == null ? '' : state === 'waiting' ? `Next launch in ${wordsDuration(ms)}` : state === 'atRisk' ? `${wordsDuration(ms)} until midnight`
    : state === 'locked' || state === 'upcoming' ? `Opens in ${wordsDuration(ms)}` : ''
  const spokenMins = mins && o.meta ? minsWords(mins) : ''
  o.aria = [o.eyebrow, o.title, spokenMins, o.sub, spoken].filter(Boolean).map((x) => x.replace(/\s·\s/g, '. ').replace(/\.+$/, '')).map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join('. ') + '.'
  return o
}

/** catchUpCopy({ catchUp, behind, title })  ->  { eyebrow, title, sub, cta, ctaAria }   the small chip offered when live days behind you are still open */
export function catchUpCopy(ctx = {}, seed = '') {
  const n = ctx.catchUp
  return {
    eyebrow: n ? `Catch up · Day ${n}` : 'Catch up',
    title: ctx.title || '',
    sub: choose(BAR.catchUp, seedOf('catch', n, seed), { catchUp: n, behind: ctx.behind >= 2 ? ctx.behind : null }).text,
    cta: 'Catch up',
    ctaAria: n ? `Catch up with Day ${n}${ctx.title ? ': ' + ctx.title : ''}` : 'Catch up',
  }
}

const LOCKED = [
  'Not yet. Day {day} opens {date} at {at}.', 'Day {day} opens {date} at {at}.', 'Day {day} unlocks {date} at {at}. Not before.',
  'Locked until {date}, {at}.', 'Day {day} is not open yet. It opens {date} at {at}.', 'Day {day} has to wait until {date}.',
  'Not open yet.', 'This day is locked.', 'Locked for now.',
]
/**
 * What a tap on a locked node says: 'Not yet. Day 14 opens Fri 14 Aug at 6:00 am.'   (plain string)
 * lockedCopy({ day, unlockAt })   unlockAt = the node's unlock Date (lib.nextUnlockAt); or pass a preformatted `date` string.
 * Pass zone: zoneTag(now()) so a Lagos clock reads "6:00 am WAT".
 */
export function lockedCopy({ day, date, unlockAt, zone = '', seed = '' } = {}) {
  const u = unlockAt instanceof Date ? unlockAt : null
  const when = date != null ? date : u
  return choose(LOCKED, seedOf('lock', day, seed), {
    day, date: when instanceof Date ? fmtDate(when) : when, at: fmtClock(u ? u.getHours() : UNLOCK_HOUR, u ? u.getMinutes() : 0, { zone }),
  }).text
}

/* ── The streak, as the HUD flame shows it ─────────────────────────────── */

const STATUS = {
  none: ['Finish a lesson to light your streak.', 'Your streak starts with one lesson.', 'No streak yet. Today can be Day 1.'],
  done: ['Done for today. Come back tomorrow.', 'Today is kept. See you tomorrow.', 'Today’s lesson is done. The flame holds.'],
  rest: ['Selah. Your streak rests today.', 'A rest day. Your streak is safe.', 'Selah day: nothing to protect today.'],
  risk: ['Launch today to keep it burning.', 'Today’s lesson keeps it going.', 'One lesson keeps the streak alive.'],
  soon: ['About {left} left today. Launch to keep it.', 'Midnight is about {left} away. One lesson saves it.', 'About {left} to go. Launch to keep it burning.'],
}
const NEXT_MARK = [
  '{togo} to the {at}-day mark. +{xp} XP.', 'Next mark: day {at}, {togo} away. +{xp} XP.', 'The {at}-day mark is {togo} away.',
]
/** nextMilestoneCopy(streakInfo.next)  ({ at, daysTo, xp })  ->  '6 days to the 14-day mark. +50 XP.' */
export function nextMilestoneCopy(next, seed = '') {
  if (!next) return ''
  return choose(NEXT_MARK, seedOf('mark', next.at, seed), { at: next.at, togo: daysWord(next.daysTo), xp: next.xp }).text
}
/**
 * streakStatus(streakInfo(st, now()), seed)  ->  { title, sub, note, tone, aria }
 * The streak sheet / HUD popover: state 'none' | 'done' | 'rest' | 'at-risk' | 'lost' from the store's streakInfo.
 */
export function streakStatus(info = {}, seed = '') {
  const n = info.count | 0
  const sd = seedOf('status', info.state, n, seed)
  const note = nextMilestoneCopy(info.next, sd)
  let r
  if (info.state === 'done') r = { title: daysWord(n), sub: choose(STATUS.done, sd).text, note, tone: 'go' }
  else if (info.state === 'rest') r = { title: daysWord(n), sub: choose(STATUS.rest, sd).text, note, tone: 'tele' }
  else if (info.state === 'at-risk') {
    const soon = info.hoursLeft != null && info.hoursLeft <= 6
    r = { title: daysWord(n), sub: choose(soon ? STATUS.soon : STATUS.risk, sd, { left: timeLeft(info.hoursLeft ?? 6) }).text, note, tone: 'warn' }
  } else if (info.state === 'lost') {
    const l = streakLostCopy(info.lostFrom | 0, sd)
    r = { title: 'Streak ended', sub: l.text, ...(l.ref ? { ref: l.ref } : null), note: '', tone: 'tele' }
  } else r = { title: 'No streak yet', sub: choose(STATUS.none, sd).text, note: '', tone: 'tele' }
  return { ...r, aria: `${r.title}. ${r.sub}${r.ref ? ' ' + r.ref + '.' : ''}${r.note ? ' ' + r.note : ''}` }
}

const NOTICE_GRACE = ['Selah kept your streak.', 'A rest day. Your streak rested too.', 'Selah day: no shield needed.']
/**
 * noticeCopy(event, ctx, seed)  event = one of the store's notices { type:'grace'|'shield'|'lost', from? }  ->  a toast spec
 * { title, body, icon, tone }  (the lost line never carries Scripture here: it is a toast, so it stays one plain sentence)
 */
export function noticeCopy(ev = {}, ctx = {}, seed = '') {
  if (ev.type === 'shield') return { title: 'Shield used', body: shieldLine('used', { n: ctx.n }, seed), icon: 'shield', tone: 'tele' }
  if (ev.type === 'lost') {
    const plainLost = (ev.from >= 2 ? LOST : LOST_SHORT).filter((e) => typeof e === 'string')
    return { title: 'Streak ended', body: choose(plainLost, seedOf('notice', ev.from, seed), { n: ev.from }).text, icon: 'flame', tone: 'default' }
  }
  return { title: 'Selah', body: pick(NOTICE_GRACE, seedOf('notice', 'grace', seed)), icon: 'moon', tone: 'default' }
}

/* ── 11. Reminders (the .ics) ──────────────────────────────────────────── */

const REMINDER_BODY = [
  'A few minutes with the Word. Scripture, one truth, a few questions and a declaration.',
  'Your daily launch is ready: Scripture, one truth, a short check, a declaration.',
  'Take a few minutes before the day gets away. Open KIND and launch.',
  'One lesson, one truth, one declaration. Keep your streak burning.',
  'Faithful in little. Open KIND and take today’s lesson.',
  'The Word first. Open KIND for today’s lesson.',
  'Raising goDs. Building nations. Today’s lesson is ready.',
  'Today’s launch is ready, {name}. It only takes a few minutes.',
  W_bread, W_earlySeek,
]
export const reminderPresets = [
  { id: 'before-school', label: 'Before school', hour: 6, min: 30 },
  { id: 'after-school', label: 'After school', hour: 16, min: 0 },
  { id: 'evening', label: 'Evening', hour: 20, min: 0 },
  { id: 'before-bed', label: 'Before bed', hour: 21, min: 30 },
]
export const DEFAULT_REMINDER = { hour: 20, min: 0 }
/**
 * reminderCopy({ name, hour, min, url, zone, seed })
 *  ->  { title, body, alarm, confirm }   — pass title/body straight to makeReminderICS (it escapes commas/newlines).
 * The event is recurring, so title and body are fixed at creation; `seed` picks the body once.
 */
export function reminderCopy(ctx = {}) {
  const { name = '', hour = DEFAULT_REMINDER.hour, min = DEFAULT_REMINDER.min, url = '', zone = '', seed = '' } = ctx
  const l = choose(REMINDER_BODY, seedOf('rem', name, seed), { name: name.trim() })
  const body = l.ref ? `“${l.text}” — ${l.ref}` : l.text
  return {
    title: 'KIND · Today’s launch is ready.',
    body: url ? `${body}\n${url}` : body,
    alarm: 'Today’s launch is ready.',
    confirm: `Daily reminder set for ${fmtClock(hour, min, { zone })}.`,
  }
}
const REM_TITLE = 'When should we remind you?'
const REM_ADD = 'Add to my calendar'
const REM_SKIP = 'Skip for now'
const REM_HOW = 'KIND adds a daily event with an alert to your calendar. No notifications to allow.'
const REM_DONE = 'Open the file to add it to your calendar.'
const REM_CHANGE = 'To change the time, delete the old event in your calendar and add a new one.'
export const reminderChrome = { title: REM_TITLE, add: REM_ADD, skip: REM_SKIP, time: 'Time', custom: 'Or choose a time', how: REM_HOW, done: REM_DONE, change: REM_CHANGE }

/* ── 12. Share captions ────────────────────────────────────────────────── */

const SHARE = {
  verse: ['Today’s Word.', 'Held on to this today.', 'Reading this slowly today.', 'For anyone who needs it today.', 'The line for today.', 'Sitting with this one.', 'This stopped me today.'],
  card: ['Code unlocked.', 'New card in the Locker.', 'Collected: code {no}.', 'Another one for the Locker.', 'Cracked this one today.', 'Added to my Locker.'],
  gold: ['Gold card.', 'A gold one.', 'Gold. Earned, not given.', 'Caught a gold card.'],
  streak: [
    '{n} days in a row with the Word. Join me.', '{n}-day streak. A few minutes a day with the Word.', '{n} days. One lesson a day, no day off the Word.',
    'Still burning: {n} days in a row on KIND.', '{n} days. Scripture, one truth and a declaration, every day.', 'Faithful in little: {n} days and counting.',
    'A few minutes a day with the Word. Join me on KIND.', 'No day off the Word. Join me on KIND.', 'Still burning on KIND. Join me.',
  ],
  month: ['Mission complete. {title}: {days} days with the Word.', 'Finished {title} on KIND. {days} days.', 'Orbit reached. {days} days of {title}, done.', 'Mission complete. A whole month with the Word.', 'Orbit reached. Every day of the mission, done.', 'Finished a whole mission on KIND.'],
  rank: ['New rank on KIND: {rank}.', 'Rank up: {rank}. One lesson at a time.', '{rank} now. Still climbing.', 'A new rank on KIND. One lesson at a time.', 'Rank up. Still climbing.', 'Climbed a rank on KIND.'],
  invite: [
    'I’m doing a daily devotional called KIND. A few minutes a day, free, and it works without data. Join me:',
    'Come and do this with me. KIND: Scripture, one truth, a short check and a declaration. Free.',
    'A friend told me about KIND, so I’m telling you. A few minutes a day with the Word:',
    'Want to build the habit together? KIND is free and works offline:',
    'This is how I’m keeping the Word daily: KIND. Try it with me:',
    'For teens and families: a daily launch into the Word. Free. Join me on KIND:',
  ],
}
export const SHARE_TAGS = ['KIND', 'KidsInspiringNation']
export const TAGLINE = 'Raising goDs. Building nations.'
/**
 * shareCaption(kind, data, seed)  kind: verse | card | streak | month | rank | invite
 *   data: { verse:{text,ref}, day, series:{title}, code:{no,line,rare}, total, n, days, declaration, rank, url }
 *  ->  { title, text, url, tags, alt, full }   `full` = text + url, ready for the clipboard or navigator.share({ text: full }).
 */
export function shareCaption(kind, d = {}, seed = '') {
  const sd = seedOf('share', kind, d.day ?? d.n ?? d.code?.no ?? d.rank, seed)
  const url = d.url || ''
  const st = d.series?.title || ''
  let title, lead, body = '', alt
  if (kind === 'verse' && d.verse) {
    title = 'Today’s Word'
    lead = choose(SHARE.verse, sd).text
    body = `“${d.verse.text}”\n${d.verse.ref} (${BIBLE_VERSION})` + (d.day && st ? `\n\nDay ${d.day} of ${st} on KIND.` : '')
    alt = `Scripture card. “${d.verse.text}” ${d.verse.ref}.`
  } else if (kind === 'card' && d.code) {
    title = 'New code card'
    lead = choose(d.code.rare ? SHARE.gold : SHARE.card, sd, { no: d.code.no }).text
    body = `“${d.code.line}”\nCode ${d.code.no}${d.total ? ' of ' + d.total : ''}${d.code.rare ? ' · Gold' : ''}` + (st ? `\n${st}${d.day ? ' · Day ' + d.day : ''}` : '')
    alt = `${d.code.rare ? 'Gold code card' : 'Code card'} ${d.code.no}. “${d.code.line}”`
  } else if (kind === 'streak') {
    title = d.n ? `${d.n}-day streak` : 'My streak'
    lead = choose(SHARE.streak, sd, { n: d.n }).text
    body = TAGLINE
    alt = d.n ? `Streak card. ${d.n} days in a row on KIND.` : 'Streak card.'
  } else if (kind === 'month') {
    title = 'Mission complete'
    lead = choose(SHARE.month, sd, { title: st, days: d.days }).text
    body = d.declaration ? `“${d.declaration}”` : TAGLINE
    alt = `Mission complete card.${st ? ' ' + st + (d.days ? ', ' + d.days + ' days.' : '.') : ''}`
  } else if (kind === 'rank') {
    title = 'New rank'
    lead = choose(SHARE.rank, sd, { rank: d.rank }).text
    body = TAGLINE
    alt = `Rank card. ${d.rank || 'New rank'}.`
  } else {
    title = 'Join me on KIND'
    lead = choose(SHARE.invite, sd, { name: d.name }).text
    body = ''
    alt = 'KIND, a daily devotional.'
  }
  const text = [lead, body].filter(Boolean).join('\n\n')
  return { title, text, url, tags: SHARE_TAGS, alt, full: url ? `${text}\n${url}` : text }
}

/* ── 13. Empty states ──────────────────────────────────────────────────── */

const EMPTY = {
  journal: { art: 'journal', word: W_write, action: 'Launch today’s lesson', list: [
    { title: 'Nothing written yet.', body: 'Each lesson asks for your own words. They collect here, kept on this device.' },
    { title: 'Your Journal is empty.', body: 'Answer the question at the end of a lesson and it is kept here, for you alone.' },
    { title: 'A blank page.', body: 'Your own words from each lesson gather here. Start with today’s.' },
  ] },
  cards: { art: 'card', action: 'Launch today’s lesson', list: [
    { title: 'No cards yet.', body: 'Finish a lesson to be dealt your first code card.' },
    { title: 'The Locker is empty.', body: 'Every lesson you finish deals one code card. Every seventh is gold.' },
    { title: 'Nothing collected.', body: 'Your first card arrives the moment you finish a lesson.' },
  ] },
  patches: { art: 'patch', action: '', list: [
    { title: 'No patches yet.', body: 'Clear a stage to earn its mission patch.' },
    { title: 'Patches are earned.', body: 'Finish every day of a stage and its patch is stitched.' },
    { title: 'Nothing stitched yet.', body: 'Complete a stage and its patch appears here.' },
  ] },
  medals: { art: 'medal', word: W_workmanship, action: '', list: [
    { title: 'No medals yet.', body: 'They come from habits: a streak, a perfect lesson, a finished stage.' },
    { title: 'The case is empty.', body: 'Medals are earned by what you keep doing.' },
    { title: 'Not yet.', body: 'Keep launching and the first medal will come.' },
  ] },
  kids: { art: 'family', word: W_teachChild, action: 'Add a child', list: [
    { title: 'No children added.', body: 'Add your children to lead the lessons together.' },
    { title: 'Your crew is empty.', body: 'Add a child’s name to learn alongside them.' },
    { title: 'Nobody here yet.', body: 'Add your children. Their names stay on this device.' },
  ] },
  heatmap: { art: 'calendar', word: W_number, action: '', list: [
    { title: 'A blank month.', body: 'Each lesson lights a flame on its day.' },
    { title: 'Nothing lit yet.', body: 'Finish a lesson and today’s flame comes on.' },
    { title: 'The month is waiting.', body: 'Every finished lesson lights its day.' },
  ] },
  shortsOffline: { art: 'wifiOff', action: 'Watch on YouTube', list: [
    { title: 'Shorts need a connection.', body: 'Everything else works offline. Shorts return when you are back online.' },
    { title: 'No connection.', body: 'Shorts stream from YouTube. The rest of KIND still works.' },
    { title: 'Offline for now.', body: 'Reconnect to watch Shorts. Your lessons are all still here.' },
  ] },
  shortsNone: { art: 'shorts', action: 'Watch on YouTube', list: [
    { title: 'No Shorts for this mission.', body: 'You can watch the full episodes on YouTube.' },
    { title: 'Shorts are coming.', body: 'This mission has none yet. The full episodes are on YouTube.' },
    { title: 'Nothing to scroll yet.', body: 'The Shorts for this mission are not published here yet.' },
  ] },
  allClear: { art: 'checkCircle', word: W_sleep, action: '', list: [
    { title: 'All clear for today.', body: 'Three rings closed. Rest, and come back tomorrow.' },
    { title: 'Today’s objectives are done.', body: 'Nothing left to launch today. Rest well.' },
    { title: 'Rings closed.', body: 'You have done what today asked. See you tomorrow.' },
  ] },
  journalDay: { art: 'pen', action: 'Write an answer', list: [
    { title: 'No answer for this day.', body: 'You can still write one. It stays on this device.' },
    { title: 'Nothing written here.', body: 'This day has no answer yet. Add one in your own words.' },
    { title: 'A day without words.', body: 'Open the day again and answer its question when you are ready.' },
  ] },
}
/** emptyCopy('journal', seed)  ->  { kind, art, title, body, action, word? }  (art = icon name for <Empty art=…>; word = an optional Line to set under the body) */
export function emptyCopy(kind, seed = '') {
  const e = EMPTY[kind] || EMPTY.heatmap
  const l = pick(e.list, seedOf('empty', kind, seed))
  return { kind, art: e.art, title: l.title, body: l.body, action: e.action, ...(e.word ? { word: e.word } : null) }
}

/* ── 14. Pre-flight: onboarding, five beats ────────────────────────────── */
// splash → pad → crew → name → goal → reminder → launch. One decision per beat; value inside sixty seconds.

export const GOALS = [
  { id: 'casual', label: 'Casual', mins: 3, xp: 20, blurb: 'A light start. One short lesson most days.' },
  { id: 'regular', label: 'Regular', mins: 5, xp: 40, blurb: 'The steady pace. One lesson, done properly.' },
  { id: 'serious', label: 'Serious', mins: 10, xp: 60, blurb: 'For those who like a challenge. A higher bar each day.' },
]
/** goalCopy(40) -> { id:'regular', label:'Regular', mins:5, xp:40, blurb, meta:'5 min a day · 40 XP' } */
export const goalCopy = (xp) => {
  const g = GOALS.find((x) => x.xp === xp) || GOALS[1]
  return { ...g, meta: `${g.mins} min a day · ${g.xp} XP` }
}

export const onboardCopy = {
  steps: 5,
  progress: (i) => `Step ${i} of 5`,
  chrome: { back: 'Back', next: 'Continue', skip: 'Skip', tapToSkip: 'Tap to skip' },
  splash: {
    letters: ['K', 'I', 'N', 'D'], tagline: TAGLINE, org: 'Kids Inspiring Nation', returning: 'Welcome back',
    aria: 'KIND. Raising goDs. Building nations.',
  },
  pad: {
    eyebrow: 'Pre-flight', title: TAGLINE, word: W_heavens,
    body: 'A few minutes a day with the Word. Scripture, one truth, a short check and a declaration to say out loud.',
    cta: 'Begin pre-flight', foot: 'Free. Works offline. Nothing leaves this device.',
    alt: 'A rocket on a launch pad at dusk, the sky turning from orange to dark.',
  },
  crew: {
    eyebrow: 'Crew', title: 'Who’s flying?', body: 'This sets how KIND speaks to you. You can change it later.',
    teen: { title: 'I’m a teen', sub: 'Daily Word, built for you.' },
    parent: { title: 'I’m a parent', sub: 'Flying with my children.' },
  },
  name: {
    eyebrow: 'Crew', title: 'What should we call you?', placeholder: 'First name', help: 'Stays on this device.',
    error: 'Add a name to continue.', cta: 'Continue', familyLabel: 'Family name', familyPlaceholder: 'Family name (optional)',
  },
  kids: {
    title: 'Who’s learning with you?', placeholder: 'Add a child’s name', add: 'Add', skip: 'Add them later',
    help: 'Optional. Their names stay on this device.', remove: (name) => `Remove ${name}`,
  },
  goal: {
    eyebrow: 'Commitment', title: 'Your daily commitment', body: 'Pick what you will actually keep. Small and kept beats big and dropped.',
    recommended: 'regular', tag: 'Recommended', cta: 'Set my goal',
    foot: 'This sets your daily XP goal. Change it any time in Me.',
  },
  remind: {
    eyebrow: 'Reminder', title: REM_TITLE, body: REM_HOW, add: REM_ADD, skip: REM_SKIP,
    foot: 'Reminders live in your calendar, not on our servers.',
  },
  finish: {
    launching: (day) => `Pre-flight complete. Launching Day ${day}.`,
    opening: (day) => `Pre-flight complete. Opening Day ${day}.`,
    cta: 'Launch',
  },
}

/* ── 15. Settings (Me) ─────────────────────────────────────────────────── */

export const settingsHelp = {
  sections: { experience: 'Experience', commitment: 'Your commitment', reminder: 'Reminder', family: 'Family', install: 'Install', about: 'About', data: 'Your data' },
  sound: { label: 'Sound', help: 'Short cues for taps, answers and launches. Follows the volume below.', on: 'On', off: 'Off' },
  volume: { label: 'Volume', help: 'Changes KIND’s own sounds only, not your phone’s volume.' },
  haptics: { label: 'Haptics', help: 'Small taps and buzzes with every action. Not every phone supports them.', on: 'On', off: 'Off' },
  effects: {
    label: 'Effects', help: 'Motion, sparks and glow. Auto turns them down on slower phones and when your phone asks for reduced motion.',
    options: { auto: 'Auto', full: 'Full', lite: 'Lite' },
    optionHelp: { auto: 'KIND decides for this phone.', full: 'All the motion and light.', lite: 'Calm and quick. Easier on the battery.' },
  },
  textSize: { label: 'Text size', help: 'Scales the reading screens. Scripture stays the star.', sample: 'Faithful in little, faithful in much.' },
  reminder: { label: 'Daily reminder', help: 'Adds a repeating event with an alert to your calendar. To change the time, delete the old event in your calendar and add a new one.', add: 'Add to my calendar' },
  goal: { label: 'Daily goal', help: 'The XP you aim for each day. It sets the middle ring on Objectives.' },
  role: { label: 'Who’s flying', help: 'Teen or parent. This only changes how KIND speaks to you.' },
  name: { label: 'Name', help: 'Shown on your pilot card. Stays on this device.' },
  family: { label: 'Family', help: 'Add your children to lead lessons together.', familyName: 'Family name', addKid: 'Add a child' },
  missions: { label: 'Missions', help: 'Switch between months. Your progress is kept for each one.' },
  install: { label: 'Install KIND', help: 'Add KIND to your home screen. Full screen, and it works without data.' },
  about: {
    label: 'About KIND', help: 'A daily devotional from Kids Inspiring Nation. Scripture quotations are from the King James Version.',
    version: (v) => `Version ${v}`, links: 'Kids Inspiring Nation',
  },
  privacy: {
    line: 'Nothing leaves this device.',
    detail: 'No account, no tracking. Your streak, XP and Journal are kept in this browser on this device. Shorts load from YouTube only after you tap play.',
    warn: 'Clearing your browser data erases your progress.',
  },
  reset: {
    label: 'Reset everything', help: 'Erases your streak, XP, cards and Journal from this device.',
    title: 'Erase everything on this device?', body: 'Your streak, XP, cards, patches and Journal will be deleted. This cannot be undone.',
    confirm: 'Erase everything', cancel: 'Keep my progress',
  },
  help: { label: 'What do these words mean?', title: 'The words we use' },
}

/** The launch vocabulary in plain words, for the Me → "What do these words mean?" sheet. */
export const glossary = [
  { id: 'mission', term: 'Mission', plain: 'A month-long series. Each mission has its own stages and its own declaration.' },
  { id: 'stage', term: 'Stage', plain: 'One week of a mission. Clear every day of a stage to earn its patch.' },
  { id: 'launch', term: 'Launch', plain: 'Starting a lesson. Press the big button and you are on your way.' },
  { id: 'orbit', term: 'Orbit', plain: 'Finishing a lesson reaches orbit insertion. Finish every day of a mission and you reach full orbit.' },
  { id: 'streak', term: 'Streak', plain: 'The number of days in a row you finish a lesson. Miss a day and it resets, unless a shield covers it.' },
  { id: 'shield', term: 'Shield', plain: 'Covers one missed day so your streak does not break. Earn one every 7 days, or find one in a supply drop. You can hold two.' },
  { id: 'xp', term: 'XP', plain: 'Experience points. You earn them for right answers and finished lessons, and they raise your rank.' },
  { id: 'rank', term: 'Rank', plain: 'Your level, set by your total XP. Each rank has its own insignia.' },
  { id: 'card', term: 'Code card', plain: 'One card for every lesson you finish, carrying that day’s code line. Every seventh card is gold.' },
  { id: 'patch', term: 'Patch', plain: 'Earned when you clear every day of a stage. It stays grey until then.' },
  { id: 'journal', term: 'Journal', plain: 'Every answer you wrote, kept together on this device.' },
  { id: 'selah', term: 'Selah', plain: 'A day of rest and review. Skipping one will not break your streak.' },
  { id: 'drop', term: 'Supply drop', plain: 'A surprise after a lesson: bonus XP, a shield or a patch fragment.' },
  { id: 'rings', term: 'Rings', plain: 'Three rings for the day: finish the lesson, reach your XP goal, and get three answers right.' },
]

/* ── 16. Toasts & errors ───────────────────────────────────────────────── */
// toastCopy(id, ctx, seed) -> a ready toast spec: toast({ ...spec, action: spec.action && { ...spec.action, onClick } })
//   { title, body?, icon (Icon name), tone, key?, action?: { label }, duration? }   duration 0 = stays until dismissed.

const TOAST = {
  soundOn: () => ({ title: 'Sound on', icon: 'soundOn', key: 'sound', action: { label: 'Mute' } }),
  soundOff: () => ({ title: 'Sound off', body: 'Haptics and visuals still work.', icon: 'soundOff', key: 'sound' }),
  hapticsOn: () => ({ title: 'Haptics on', icon: 'vibrate', key: 'haptics' }),
  hapticsOff: () => ({ title: 'Haptics off', icon: 'vibrate', key: 'haptics' }),
  journalSaved: () => ({ title: 'Saved to your Journal', icon: 'journal', tone: 'go', key: 'journal' }),
  copied: () => ({ title: 'Copied', icon: 'copy', key: 'copy' }),
  copiedLink: () => ({ title: 'Link copied', icon: 'link', key: 'copy' }),
  copiedCaption: () => ({ title: 'Caption copied', body: 'Paste it wherever you like.', icon: 'copy', key: 'copy' }),
  calendarReady: () => ({ title: 'Reminder file ready', body: REM_DONE, icon: 'calendar', tone: 'go' }),
  reminderSet: (c) => ({ title: `Reminder set for ${fmtClock(c.hour ?? 20, c.min ?? 0, { zone: c.zone || '' })}`, body: 'You can change it in Me.', icon: 'bell', tone: 'go' }),
  xp: (c) => ({ title: xpDelta(c.amount || 0), icon: 'bolt', tone: 'tele', key: 'xp' }),
  goalReached: (c) => ({ title: 'Daily goal reached', body: `${fmtNum(c.goal || 0)} XP, as you committed.`, icon: 'target', tone: 'go' }),
  ringClosed: (c) => ({ title: `${c.ring || 'Ring'} ring closed`, icon: 'checkCircle', tone: 'go', key: 'ring' }),
  shieldEarned: (c, s) => ({ title: 'Shield earned', body: shieldLine('earned', c, s), icon: 'shield', tone: 'tele' }),
  shieldUsed: (c, s) => ({ title: 'Shield used', body: shieldLine('used', c, s), icon: 'shield', tone: 'tele' }),
  medalEarned: (c) => ({ title: 'Medal earned', body: c.title || '', icon: 'medal', tone: 'default' }),
  cardEarned: (c) => ({ title: `Code card ${c.no || ''} added to your Locker`.replace('  ', ' '), icon: 'card', tone: 'default' }),
  patchEarned: (c) => ({ title: `Stage ${c.stage || ''} patch earned`.replace('  ', ' '), icon: 'patch', tone: 'default' }),
  rankUp: (c) => ({ title: `Rank up: ${c.rank || 'new rank'}`, icon: 'trophy', tone: 'default' }),
  locked: (c, s) => ({ title: lockedCopy({ day: c.day, date: c.date, unlockAt: c.unlockAt, zone: c.zone, seed: s }), icon: 'lock' }),
  chestOpened: (c, s) => ({ title: 'Chest opened', body: `${c.xp ? xpDelta(c.xp) + '. ' : ''}${pick(CHEST, seedOf('chest', c.xp, s))}`, icon: 'chest', tone: 'go' }),
  objectiveClaimed: (c) => ({ title: 'Objective claimed', body: rewardCopy(c.reward || {}) || c.title || '', icon: 'checkCircle', tone: 'go' }),
  offline: () => ({ title: 'You are offline', body: 'Everything you have opened still works.', icon: 'wifiOff', key: 'net' }),
  online: () => ({ title: 'Back online', icon: 'signal', key: 'net' }),
  updateReady: () => ({ title: 'New version ready', body: 'Refresh to get the latest KIND.', icon: 'refresh', duration: 0, key: 'sw', action: { label: 'Refresh' } }),
  updated: () => ({ title: 'KIND is up to date', icon: 'checkCircle', key: 'sw' }),
  installed: () => ({ title: 'KIND is on your home screen', body: 'Launch it from there next time.', icon: 'install', tone: 'go' }),
  installLater: () => ({ title: 'Okay. You can install from Me any time.', icon: 'install' }),
  nameSaved: () => ({ title: 'Name saved', icon: 'user', key: 'profile' }),
  kidAdded: (c) => ({ title: `${c.name || 'Child'} added`, icon: 'family', key: 'kids' }),
  kidRemoved: (c) => ({ title: `${c.name || 'Child'} removed`, icon: 'family', key: 'kids', action: { label: 'Undo' } }),
  goalSet: (c) => ({ title: `Daily goal set to ${fmtNum(c.goal || 0)} XP`, icon: 'target', key: 'goal' }),
  welcomeBack: (c, s) => { const l = praise({ kind: 'return', seed: s }); return { title: c.name ? `Welcome back, ${c.name}` : 'Welcome back', body: l.text, icon: 'rocket' } },
  fxLite: () => ({ title: 'Effects reduced', body: 'KIND turned effects down to run smoothly on this phone. You can change this in Me.', icon: 'sliders', key: 'fx' }),
  placeSaved: () => ({ title: 'Place saved', body: 'Pick it up from the Launch Bar.', icon: 'bookmark' }),
  selahSafe: () => ({ title: 'Selah day', body: 'Skipping it will not break your streak.', icon: 'moon' }),
  reset: () => ({ title: 'Everything on this device was erased', icon: 'trash' }),
}
/** Every toast id (the test walks them; screens never need this). */
export const toastIds = () => Object.keys(TOAST)
export function toastCopy(id, ctx = {}, seed = '') {
  const f = TOAST[id]
  return { tone: 'default', ...(f ? f(ctx, seed) : { title: 'Done', icon: 'check' }) }
}

const ERROR = {
  offline: [
    { title: 'You are offline.', body: 'This needs a connection. Everything else still works.' },
    { title: 'No connection right now.', body: 'Try again when you are back online.' },
    { title: 'Offline for now.', body: 'Your progress is safe. Try this again later.' },
  ],
  load: [
    { title: 'That did not load.', body: 'Check your connection and try again.' },
    { title: 'Could not load this.', body: 'Give it a moment, then try again.' },
    { title: 'Still not here.', body: 'Try again. Your progress is safe.' },
  ],
  share: [
    { title: 'That did not share.', body: 'Try again, or copy the caption instead.' },
    { title: 'Sharing did not finish.', body: 'You can copy the caption and post it yourself.' },
    { title: 'No share sheet here.', body: 'Copy the caption instead.' },
  ],
  copy: [
    { title: 'Could not copy.', body: 'Your browser blocked it. Press and hold the text to copy it.' },
    { title: 'Copy did not work.', body: 'Press and hold the text, then choose Copy.' },
    { title: 'Not copied.', body: 'Select the text and copy it by hand.' },
  ],
  ics: [
    { title: 'The reminder file did not download.', body: 'Try again, or set a daily alarm on your phone.' },
    { title: 'No reminder file.', body: 'Your browser may have blocked the download. Try again.' },
    { title: 'Reminder not added.', body: 'Set a daily alarm on your phone instead.' },
  ],
  storage: [
    { title: 'Progress cannot be saved.', body: 'This browser is blocking storage, so your streak will not be kept. Leave private browsing to fix it.' },
    { title: 'Storage is blocked.', body: 'KIND cannot keep your progress here. Open it in a normal browser window.' },
    { title: 'Not saving.', body: 'Your browser will not let KIND keep your progress. Check its site settings.' },
  ],
  video: [
    { title: 'The video did not load.', body: 'Watch it on YouTube instead.', action: 'Watch on YouTube' },
    { title: 'Video unavailable.', body: 'It needs a connection. You can watch it on YouTube later.', action: 'Watch on YouTube' },
    { title: 'Could not play this.', body: 'Open it on YouTube to watch.', action: 'Watch on YouTube' },
  ],
  update: [
    { title: 'The update did not finish.', body: 'Close KIND and open it again.' },
    { title: 'Still on the old version.', body: 'Close KIND and open it again to update.' },
    { title: 'Update paused.', body: 'It will finish next time you open KIND online.' },
  ],
  notPublished: [
    { title: 'This day is not ready yet.', body: 'It has not been published. Check back soon.' },
    { title: 'Coming soon.', body: 'This day is still being prepared. Try another day.' },
    { title: 'Not published yet.', body: 'The Word is on its way. Check back soon.' },
  ],
  notFound: [
    { title: 'That day is not here.', body: 'Go back to the Ascent and pick another.' },
    { title: 'Nothing at that address.', body: 'Return to the Ascent to carry on.' },
    { title: 'Lost the trail.', body: 'Head back to the Ascent and pick up from there.' },
  ],
  generic: [
    { title: 'Something did not go through.', body: 'Your progress is safe. Try again.' },
    { title: 'That did not work.', body: 'Try once more. Your progress is safe.' },
    { title: 'Not this time.', body: 'Give it a moment and try again.' },
  ],
}
/** errorCopy('storage', seed)  ->  { kind, title, body, action, icon, tone }   Calm, plain, no blame. */
export function errorCopy(kind, seed = '') {
  const list = ERROR[kind] || ERROR.generic
  const e = pick(list, seedOf('err', kind, seed))
  const icon = { offline: 'wifiOff', storage: 'warning', video: 'video', share: 'share', copy: 'copy', ics: 'calendar', update: 'refresh' }[kind] || 'info'
  return { kind, title: e.title, body: e.body, action: e.action || '', icon, tone: kind === 'offline' ? 'default' : 'nogo' }
}

/* ── 17. Install ───────────────────────────────────────────────────────── */

const INSTALL_PROMPT = [
  { title: 'Keep KIND one tap away', body: 'Add it to your home screen. Full screen, and it works without data.' },
  { title: 'Make KIND your launch pad', body: 'Install it for a one-tap start every day, even offline.' },
  { title: 'Put KIND on your home screen', body: 'Open it like any app. It keeps your streak and works without data.' },
  { title: 'Install KIND', body: 'Full screen, always one tap away, and it works without data.' },
]
/**
 * installCopy(platform, seed)  platform: ios | android | desktop | inapp | standalone
 *  ->  { title, body, steps:[{ icon, text }], cta, dismiss, success, note }
 * The prompt card is shown after the first completed lesson; the iOS guide has the three steps from Share.
 */
export function installCopy(platform, seed = '') {
  const p = pick(INSTALL_PROMPT, seedOf('install', platform, seed))
  const base = { title: p.title, body: p.body, steps: [], cta: 'Add to home screen', dismiss: 'Not now', success: 'KIND is on your home screen.', note: '' }
  if (platform === 'ios') {
    return {
      ...base, cta: 'Show me how',
      steps: [
        { icon: 'share', text: 'Tap the Share button, the square with an arrow, in Safari’s toolbar.' },
        { icon: 'plus', text: 'Scroll down and tap Add to Home Screen.' },
        { icon: 'check', text: 'Tap Add. KIND opens full screen from your home screen.' },
      ],
      note: 'Safari is the surest way on iPhone. Not in Safari? Open this page there first.',
    }
  }
  if (platform === 'android') {
    return {
      ...base, cta: 'Install',
      steps: [
        { icon: 'more', text: 'Open your browser menu, the three dots.' },
        { icon: 'install', text: 'Tap Install app, or Add to Home screen.' },
        { icon: 'check', text: 'Confirm. KIND appears with your other apps.' },
      ],
      note: 'If you see an Install button here, that is the quickest way.',
    }
  }
  if (platform === 'desktop') {
    return { ...base, cta: 'Install', steps: [{ icon: 'install', text: 'Choose Install from the icon at the right of the address bar.' }], note: 'KIND opens in its own window.' }
  }
  if (platform === 'inapp') {
    return {
      ...base, title: 'Open KIND in your browser', body: 'This window inside another app cannot install KIND. Open the link in Safari or Chrome first.',
      cta: 'Copy link', steps: [{ icon: 'link', text: 'Copy the link and paste it in Safari or Chrome.' }],
    }
  }
  if (platform === 'standalone') return { ...base, title: 'KIND is installed', body: 'Launch it from your home screen any time.', cta: '', dismiss: '', steps: [] }
  return base
}

/** First-run coach marks: a title and one or two short sentences each. Show once, anchored to the thing they describe. */
export const coach = {
  launch: { title: 'Your launch pad', body: 'Press Launch to start today’s lesson. It only takes a few minutes.' },
  streak: { title: 'Your streak', body: 'Finish a lesson each day to keep the flame lit. Tap it to see where you stand.' },
  shield: { title: 'Shields', body: 'A shield covers one missed day. You earn one every 7 days.' },
  rings: { title: 'Three rings', body: 'Finish the lesson, reach your XP goal and get three answers right.' },
  chest: { title: 'The daily chest', body: 'Close all three rings and the day’s chest opens.' },
  stage: { title: 'Stages', body: 'Each week is a stage. Clear every day to earn its patch.' },
  locker: { title: 'Your Locker', body: 'Code cards, patches and your Journal collect here.' },
  shorts: { title: 'Shorts', body: 'Sixty seconds on the day’s truth. Swipe up for the next.' },
}
/** missionMeta({ month, year, audience, done, total })  ->  'August 2026 · Teens & families · 8 of 31 done' */
export function missionMeta(m = {}) {
  const parts = [[m.month, m.year].filter(Boolean).join(' '), m.audience, m.total ? (m.done ? `${m.done} of ${m.total} done` : `${m.total} lessons`) : ''].filter(Boolean)
  return parts.join(' · ')
}

/* ── 18. Labels & accessibility ────────────────────────────────────────── */

export const labels = {
  app: { name: 'KIND', tagline: TAGLINE, org: 'Kids Inspiring Nation' },
  tabs: { learn: 'Learn', objectives: 'Objectives', shorts: 'Shorts', locker: 'Locker', me: 'Me' },
  hud: { streak: 'Streak', xp: 'XP', shields: 'Shields' },
  stats: { xp: 'XP', accuracy: 'Accuracy', streak: 'Streak', time: 'Time', answers: 'Answers', cards: 'Cards', rank: 'Rank' },
  learn: { title: 'Learn', ascent: 'The Ascent', today: 'Today', done: 'Done', locked: 'Locked', stage: 'Stage', mission: 'Mission', pad: 'Launch pad', orbit: 'In orbit', selah: 'Selah', finale: 'Final launch', intro: 'Series launch' },
  objectives: { title: 'Objectives', today: 'Today', month: 'This month', rings: 'Today’s rings', medals: 'Medals', rank: 'Rank', calendar: 'Your month', next: (name) => `Next rank: ${name}`, toGo: (xp) => `${fmtNum(xp)} XP to go` },
  locker: { title: 'Locker', cards: 'Cards', patches: 'Patches', journal: 'Journal', gold: 'Gold', locked: 'Locked', earned: 'Earned', share: 'Share card', practise: 'Practise this day again', unlocksWith: (day) => `Unlocks with Day ${day}`, clearToEarn: (stage) => `Clear Stage ${stage} to earn this patch.` },
  shorts: { title: 'Shorts', play: 'Play', youtube: 'Watch on YouTube', next: 'Next Short', swipe: 'Swipe up for the next Short', loading: 'Loading', length: 'About 60 seconds' },
  me: { title: 'Me', pilot: 'Pilot card', instruments: 'Instruments', settings: 'Settings', missions: 'Missions', family: 'Family', university: 'goDs University', links: 'Kids Inspiring Nation', active: 'Active', since: (d) => `Flying since ${d}` },
  links: { site: 'Our website', youtube: 'YouTube channel', gu: 'goDs University', give: 'Give', whatsapp: 'WhatsApp channel', telegram: 'Telegram', instagram: 'Instagram', feedback: 'Send feedback' },
  rotate: { title: 'Turn your phone upright', body: 'KIND is built for portrait.' },
  verbs: { share: 'Share', copy: 'Copy', save: 'Save', cancel: 'Cancel', close: 'Close', done: 'Done', add: 'Add', remove: 'Remove', undo: 'Undo', retry: 'Try again', back: 'Back', open: 'Open', continue: 'Continue' },
  state: { on: 'On', off: 'Off', loading: 'Loading', saving: 'Saving', saved: 'Saved' },
}

const dayWord = (n) => `Day ${n}`
/** Accessible names. Every one is a full sentence a screen reader can speak as-is. */
export const aria = {
  /** aria.day({ day, title, state:'done'|'today'|'open'|'locked'|'rare', date }) */
  day: ({ day, title, state, date }) => {
    const t = title ? `${dayWord(day)}, ${title}.` : `${dayWord(day)}.`
    const s = { done: 'Completed.', today: 'Today. Ready to launch.', open: 'Open.', locked: `Locked.${date ? ' Opens ' + (date instanceof Date ? fmtDate(date) : date) + '.' : ''}`, rare: 'Gold card day.' }[state] || ''
    return `${t} ${s}`.trim()
  },
  stage: ({ n, title, pct }) => `Stage ${n}${title ? ', ' + title : ''}. ${Math.round(pct || 0)} percent complete.`,
  streak: (n) => (n > 0 ? `Streak: ${daysWord(n)}.` : 'No streak yet.'),
  xp: (n) => `${fmtNum(n)} XP.`,
  shields: (n, max = 2) => `${n} of ${max} shields.`,
  ring: (r) => ringCopy(r).aria,
  option: (i, text) => `Option ${i}: ${text}`,
  step: (i, n) => `Step ${i} of ${n}.`,
  countdown: (ms) => `Next launch in ${wordsDuration(ms)}.`,
  launch: ({ day, title }) => `Launch ${dayWord(day)}${title ? ': ' + title : ''}`,
  tab: (id, active) => `${labels.tabs[id] || id}${active ? ', current tab' : ''}`,
  rank: ({ name, index, pct }) => `Rank ${index + 1}, ${name}. ${Math.round(pct || 0)} percent to the next rank.`,
  card: ({ no, line, rare, earned }) => (earned ? `${rare ? 'Gold ' : ''}code card ${no}: ${line}` : `Code card ${no}, locked.`),
  patch: ({ stage, earned }) => `Stage ${stage} patch, ${earned ? 'earned' : 'locked'}.`,
  medal: ({ title, earned, tier }) => `${title}${tier ? ', ' + tier : ''}, ${earned ? 'earned' : 'not yet earned'}.`,
  heat: ({ date, lessons }) => `${date instanceof Date ? fmtDate(date) : date}: ${lessons ? `${lessons} ${plural(lessons, 'lesson')} finished` : 'no lessons'}.`,
  sheet: (title) => `${title}. Swipe down or press Escape to close.`,
  verdict: (v) => v.aria,
  close: 'Close',
  grabber: 'Drag to resize or close',
  skip: 'Skip',
  sound: (on) => `Sound is ${on ? 'on' : 'off'}.`,
  progress: (pct) => `${Math.round(pct)} percent.`,
}


/* ── 19. Registry (for tools/test-copy.mjs and docs; screens never import this) ───────────────── */
export const POOLS = {
  greeting: GREETING, greetingDay: GREETING_DAY, praise: PRAISE, wrong: WRONG, themeRight: THEME_RIGHT, sourceRight: SOURCE_RIGHT, typeRight: TYPE_RIGHT,
  themeDone: THEME_DONE, season: SEASON, stageClear: { text: STAGE_TEXT }, nextUp: { text: NEXT_UP }, streak: STREAK, milestone: MILESTONE, lost: { long: LOST, short: LOST_SHORT }, shield: SHIELD, rank: RANK_BY_ID,
  rankFallback: RANK_BY_INDEX, drop: DROP, chest: { text: CHEST }, month: { text: MONTH }, bar: BAR, locked: { text: LOCKED }, status: STATUS,
  nextMark: { text: NEXT_MARK }, notice: { grace: NOTICE_GRACE }, reminder: { body: REMINDER_BODY }, share: SHARE, empty: EMPTY, error: ERROR,
  install: { prompt: INSTALL_PROMPT },
}
