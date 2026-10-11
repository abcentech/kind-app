// KIND copy · core. What the eager screens (shell, Learn, HUD, launch bar, Ignition) need on first paint, plus the plumbing everything shares.
// Split out of copy.js so the lesson / complete / objectives / locker / me / share strings stay in the lazy chunk (copy/more.js). Do not import more.js from here.

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

export const rng = (seed) => {                       // mulberry32
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const orders = new Map()
export function order(n, key) {                      // a seeded permutation of 0..n-1, cached (lists are tiny)
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
/** pick(list, seed): the same seed always gives the same entry. `seed` is a string, a number, or seq(key, i). */
export function pick(list, seed = '') {
  const n = list ? list.length : 0
  if (!n) return undefined
  if (seed && typeof seed === 'object') return list[order(n, seed.key)[((seed.i % n) + n) % n]]
  return list[hash(seed) % n]
}

export const plural = (n, one, many = one + 's') => (n === 1 ? one : many)

/* Entries in a pool are plain strings or Lines ({ text, ref }). Tokens: {name} (only ever after ", "), {n}, {day} … */
export const needs = (s) => { const out = []; String(s).replace(/\{(\w+)\}/g, (_, k) => out.push(k)); return out }
export const textOf = (e) => (typeof e === 'string' ? e : e.text)
export const has = (v) => v != null && v !== '' && !(typeof v === 'number' && Number.isNaN(v))
export const usable = (e, c) => needs(textOf(e)).every((k) => k === 'name' || has(c[k]))
export function fill(s, c = {}) {
  let out = String(s)
  if (!c.name) out = out.replace(/,\s*\{name\}/g, '').replace(/\s*\{name\}/g, '')
  return out.replace(/\{(\w+)\}/g, (_, k) => (c[k] == null ? '' : c[k]))
}
/** Choose from a pool (skipping entries whose tokens the context cannot fill) and return a Line. */
export function choose(pool, seed, c = {}) {
  const ok = pool.filter((e) => usable(e, c))
  const e = pick(ok.length ? ok : pool, seed)
  return typeof e === 'string' ? { text: fill(e, c) } : { text: fill(e.text, c), ref: e.ref }
}
export const say = (l) => (l.ref ? `${l.text} ${l.ref}.` : l.text)
/** Flatten a Line for a share sheet, an aria-label or a clipboard: “text” — ref (KJV). */
export const plain = (l) => (l.ref ? `“${l.text}” — ${l.ref} (${BIBLE_VERSION})` : l.text)

/* ── formatting: telemetry, dates, clocks. All pure; pass dates in. ────── */

export const fmtNum = (n) => {
  const v = Math.round(Number(n) || 0)
  return (v < 0 ? '-' : '') + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** Wed 12 Aug */
export const fmtDate = (d) => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`
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
export const stageTag = (n) => `Stage ${String(n).padStart(2, '0')}`                     // Stage 02
export const daysWord = (n) => `${fmtNum(n)} ${plural(n, 'day')}`                         // 1 day · 12 days

/* ── 2. The Word: a bank of short, accurate KJV quotations ─────────────── */
// Every entry is checked against the library's KJV text by tools/test-copy.mjs where the library has the
// verse, and against bible-api.com with `node tools/test-copy.mjs --verify-kjv` for the rest. References are
// written without the translation tag; BIBLE_VERSION is shown once in About and on share cards.

export const BIBLE_VERSION = 'KJV'
export const W_wellDone = { text: 'Well done, thou good and faithful servant.', ref: 'Matthew 25:21' }
export const W_fewThings = { text: 'Thou hast been faithful over a few things.', ref: 'Matthew 25:21' }
export const W_joyOfLord = { text: 'Enter thou into the joy of thy lord.', ref: 'Matthew 25:21' }
export const W_veryLittle = { text: 'Because thou hast been faithful in a very little.', ref: 'Luke 19:17' }
export const W_heartily = { text: 'Whatsoever ye do, do it heartily, as to the Lord, and not unto men.', ref: 'Colossians 3:23' }
export const W_withMight = { text: 'Whatsoever thy hand findeth to do, do it with thy might.', ref: 'Ecclesiastes 9:10' }
export const W_smallThings = { text: 'For who hath despised the day of small things?', ref: 'Zechariah 4:10' }
export const W_faithfulMan = { text: 'A faithful man shall abound with blessings.', ref: 'Proverbs 28:20' }
export const W_diligent = { text: 'The thoughts of the diligent tend only to plenteousness.', ref: 'Proverbs 21:5' }
export const W_byLabour = { text: 'He that gathereth by labour shall increase.', ref: 'Proverbs 13:11' }
export const W_wiseHear = { text: 'A wise man will hear, and will increase learning.', ref: 'Proverbs 1:5' }
export const W_profiting = { text: 'That thy profiting may appear to all.', ref: '1 Timothy 4:15' }
export const W_pondered = { text: 'Ponder the path of thy feet, and let all thy ways be established.', ref: 'Proverbs 4:26' }
export const W_fallRise = { text: 'A just man falleth seven times, and riseth up again.', ref: 'Proverbs 24:16' }
export const W_newMorning = { text: 'They are new every morning: great is thy faithfulness.', ref: 'Lamentations 3:23' }
export const W_stirUp = { text: 'Stir up the gift of God, which is in thee.', ref: '2 Timothy 1:6' }
export const W_heavens = { text: 'The heavens declare the glory of God.', ref: 'Psalm 19:1' }
export const W_arise = { text: 'Arise, shine; for thy light is come.', ref: 'Isaiah 60:1' }
export const W_thisDay = { text: 'This is the day which the LORD hath made; we will rejoice and be glad in it.', ref: 'Psalm 118:24' }
export const W_doers = { text: 'Be ye doers of the word, and not hearers only.', ref: 'James 1:22' }
export const W_sleep = { text: 'So he giveth his beloved sleep.', ref: 'Psalm 127:2' }
export const W_lieDown = { text: 'I will both lay me down in peace, and sleep.', ref: 'Psalm 4:8' }
export const W_teachChild = { text: 'Train up a child in the way he should go.', ref: 'Proverbs 22:6' }
export const W_house = { text: 'As for me and my house, we will serve the LORD.', ref: 'Joshua 24:15' }
export const W_blade = { text: 'First the blade, then the ear, after that the full corn in the ear.', ref: 'Mark 4:28' }
export const W_bread = { text: 'Man shall not live by bread alone.', ref: 'Matthew 4:4' }
export const W_rise = { text: 'When I fall, I shall arise.', ref: 'Micah 7:8' }
export const W_earlySeek = { text: 'Early will I seek thee.', ref: 'Psalm 63:1' }
export const W_beauty = { text: 'Establish thou the work of our hands upon us.', ref: 'Psalm 90:17' }
export const PRAISE = {
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

export const LOST = [
  'Streak ended at {n}. Day 1 starts now.', '{n} days are behind you. Day 1 starts now.', 'The streak rests at {n}. Launch today and begin again.',
  'Streak ended at {n}. The Word is still here.', 'That was {n} days. Begin the next count today.', 'Streak ended at {n}. Come back and light it again.',
  W_newMorning, W_fallRise,
]
export const LOST_SHORT = ['Day 1 starts again today.', 'A fresh start. Launch today.', 'Begin again today.', W_newMorning]
export const SHIELD = {
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

/** rewardCopy({ xp:150, shield:1, fragments:1 })  ->  '+150 XP · Shield · Patch fragment'  (objective and chest rewards) */
export function rewardCopy(r = {}) {
  const parts = []
  if (r.xp) parts.push(xpDelta(r.xp))
  if (r.shield) parts.push(r.shield > 1 ? `${r.shield} Shields` : 'Shield')
  if (r.fragments) parts.push(r.fragments > 1 ? `${r.fragments} patch fragments` : 'Patch fragment')
  return parts.join(' · ')
}
export const CHEST = [
  'Today’s chest. Well earned.', 'Three rings closed, one chest opened.', 'The reward for a full day.',
  'A full day, paid out.', 'Closed all three rings. This is the reward.', 'The day’s work, rewarded.',
]
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

export const BAR = {
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
export const BAR_STATES = ['ready', 'progress', 'waiting', 'locked', 'archive', 'missed', 'atRisk', 'first', 'upcoming', 'complete', 'selah']
export const BAR_ALIAS = { done: 'waiting' }

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

export const LOCKED = [
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

export const NOTICE_GRACE = ['Selah kept your streak.', 'A rest day. Your streak rested too.', 'Selah day: no shield needed.']
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

export const REMINDER_BODY = [
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
export const REM_TITLE = 'When should we remind you?'
export const REM_ADD = 'Add to my calendar'
export const REM_SKIP = 'Skip for now'
export const REM_HOW = 'KIND adds a daily event with an alert to your calendar. No notifications to allow.'
export const REM_DONE = 'Open the file to add it to your calendar.'
export const SHARE = {
  verse: ['Today’s Word.', 'Held on to this today.', 'Reading this slowly today.', 'For anyone who needs it today.', 'The line for today.', 'Sitting with this one.', 'This stopped me today.'],
  card: ['Code unlocked.', 'New card in the Locker.', 'Collected: code {no}.', 'Another one for the Locker.', 'Cracked this one today.', 'Added to my Locker.'],
  gold: ['Gold card.', 'A gold one.', 'Gold. Earned, not given.', 'Caught a gold card.'],
  streak: [
    '{n} days in a row with the Word. Join me.', '{n}-day streak. A few minutes a day with the Word.', '{n} days. One lesson a day, no day off the Word.',
    'Still burning: {n} days in a row on KIND.', '{n} days. Scripture, one truth and a declaration, every day.', 'Faithful in little: {n} days and counting.',
    'A few minutes a day with the Word. Join me on KIND.', 'No day off the Word. Join me on KIND.', 'Still burning on KIND. Join me.',
  ],
  month: ['Mission complete. {title}: {days} days with the Word.', 'Finished {title} on KIND. {days} days.', 'Orbit reached. {days} days of {title}, done.', 'Mission complete. A whole month with the Word.', 'Orbit reached. Every day of the mission, done.', 'Finished a whole mission on KIND.'],
  monthPart: ['{days} of {total} days of {title} flown so far.', 'Flying {title} on KIND: {days} of {total} days in.', '{days} days into {title}. Still going.', 'Part-way through {title} on KIND. One day at a time.'],
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
    // "Mission complete" is only true when every day is flown; a part-way share says where you are, honestly
    const whole = d.complete ?? (d.total ? d.days >= d.total : true)
    title = whole ? 'Mission complete' : 'Mission report'
    lead = choose(whole ? SHARE.month : SHARE.monthPart, sd, { title: st || 'the mission', days: d.days, total: d.total }).text
    body = d.declaration ? `“${d.declaration}”` : TAGLINE
    alt = `${whole ? 'Mission complete' : 'Mission report'} card.${st ? ' ' + st + (d.days ? ', ' + d.days + (whole ? '' : ' of ' + d.total) + ' days.' : '.') : ''}`
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

export const TOAST = {
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
export function toastCopy(id, ctx = {}, seed = '') {
  const f = TOAST[id]
  return { tone: 'default', ...(f ? f(ctx, seed) : { title: 'Done', icon: 'check' }) }
}

export const ERROR = {
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

export const dayWord = (n) => `Day ${n}`
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


