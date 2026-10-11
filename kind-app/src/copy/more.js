// KIND copy · more. Strings for the lazy screens (lesson, complete, objectives, locker, me, share). Pulls shared helpers from core.js.
import { BAR, CHEST, ERROR, LOCKED, LOST, LOST_SHORT, NOTICE_GRACE, PRAISE, REMINDER_BODY, REM_ADD, REM_DONE, REM_HOW, REM_SKIP, REM_TITLE, SHARE, SHIELD, TOAST, UNLOCK_HOUR, W_arise, W_beauty, W_blade, W_bread, W_byLabour, W_diligent, W_doers, W_earlySeek, W_faithfulMan, W_fallRise, W_fewThings, W_heartily, W_heavens, W_house, W_joyOfLord, W_lieDown, W_newMorning, W_pondered, W_profiting, W_rise, W_sleep, W_smallThings, W_stirUp, W_teachChild, W_thisDay, W_veryLittle, W_wellDone, W_wiseHear, W_withMight, aria, choose, daysWord, fill, fmtClock, fmtDate, fmtNum, has, hash, needs, objectives, order, pick, plain, praise, say, seedOf, shieldLine, timeLeft, toastCopy, xpDelta, zoneTag } from './core.js'

export const keyOf = (seed) => (seed && typeof seed === 'object' ? `${seed.key}#${seed.i}` : String(seed ?? ''))

export const lineOf = (e, c) => (typeof e === 'string' ? { text: fill(e, c) } : { text: fill(e.text, c), ref: e.ref })
export const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** Wednesday 12 August */
export const fmtDateLong = (d) => `${DOW_LONG[d.getDay()]} ${d.getDate()} ${MON_LONG[d.getMonth()]}`
/** Elapsed telemetry: T+08:30 (minutes:seconds). */
export function tPlus(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const p = (x) => String(x).padStart(2, '0')
  return `T+${p(Math.floor(s / 60))}:${p(s % 60)}`
}
export const xpTotal = (n) => `${fmtNum(n)} XP`                                    // 1,240 XP
export const dayTag = (day, total) => (total ? `Day ${day} / ${total}` : `Day ${day}`)   // Day 12 / 31
export const W_least = { text: 'He that is faithful in that which is least is faithful also in much.', ref: 'Luke 16:10' }
export const W_found = { text: 'It is required in stewards, that a man be found faithful.', ref: '1 Corinthians 4:2' }
export const W_notVain = { text: 'Your labour is not in vain in the Lord.', ref: '1 Corinthians 15:58' }
export const W_firstfruits = { text: 'Honour the LORD with thy substance, and with the firstfruits of all thine increase.', ref: 'Proverbs 3:9' }
export const W_kings = { text: 'Seest thou a man diligent in his business? he shall stand before kings.', ref: 'Proverbs 22:29' }
export const W_hidWord = { text: 'Thy word have I hid in mine heart, that I might not sin against thee.', ref: 'Psalm 119:11' }
export const W_lamp = { text: 'Thy word is a lamp unto my feet, and a light unto my path.', ref: 'Psalm 119:105' }
export const W_entrance = { text: 'The entrance of thy words giveth light.', ref: 'Psalm 119:130' }
export const W_weary = { text: 'Let us not be weary in well doing: for in due season we shall reap, if we faint not.', ref: 'Galatians 6:9' }
export const W_shining = { text: 'The path of the just is as the shining light, that shineth more and more unto the perfect day.', ref: 'Proverbs 4:18' }
export const W_tree = { text: 'He shall be like a tree planted by the rivers of water, that bringeth forth his fruit in his season.', ref: 'Psalm 1:3' }
export const W_course = { text: 'I have finished my course, I have kept the faith.', ref: '2 Timothy 4:7' }
export const W_race = { text: 'Let us run with patience the race that is set before us.', ref: 'Hebrews 12:1' }
export const W_mark = { text: 'I press toward the mark for the prize of the high calling of God in Christ Jesus.', ref: 'Philippians 3:14' }
export const W_teachOthers = { text: 'Commit thou to faithful men, who shall be able to teach others also.', ref: '2 Timothy 2:2' }
export const W_number = { text: 'So teach us to number our days, that we may apply our hearts unto wisdom.', ref: 'Psalm 90:12' }
export const W_eagles = { text: 'They shall mount up with wings as eagles; they shall run, and not be weary.', ref: 'Isaiah 40:31' }
export const W_hereAmI = { text: 'Here am I; send me.', ref: 'Isaiah 6:8' }
export const W_earth = { text: 'The earth is the LORD’S, and the fulness thereof.', ref: 'Psalm 24:1' }
export const W_ownGiven = { text: 'Of thine own have we given thee.', ref: '1 Chronicles 29:14' }
export const W_account = { text: 'So then every one of us shall give account of himself to God.', ref: 'Romans 14:12' }
export const W_write = { text: 'Write the vision, and make it plain.', ref: 'Habakkuk 2:2' }
export const W_light = { text: 'Let your light so shine before men.', ref: 'Matthew 5:16' }
export const W_workmanship = { text: 'We are his workmanship, created in Christ Jesus unto good works.', ref: 'Ephesians 2:10' }
export const W_seek = { text: 'Seek, and ye shall find.', ref: 'Matthew 7:7' }
export const W_build = { text: 'Let us rise up and build.', ref: 'Nehemiah 2:18' }
export const W_dressKeep = { text: 'To dress it and to keep it.', ref: 'Genesis 2:15' }
export const W_courage = { text: 'Be strong and of a good courage; be not afraid, neither be thou dismayed.', ref: 'Joshua 1:9' }
export const W_newThing = { text: 'Behold, I will do a new thing; now it shall spring forth.', ref: 'Isaiah 43:19' }
export const W_longLife = { text: 'With long life will I satisfy him, and shew him my salvation.', ref: 'Psalm 91:16' }
export const W_masters = { text: 'Ye cannot serve God and mammon.', ref: 'Luke 16:13' }
export const W_occupy = { text: 'Occupy till I come.', ref: 'Luke 19:13' }
export const W_breath = { text: 'Breathed into his nostrils the breath of life; and man became a living soul.', ref: 'Genesis 2:7' }
export const W_byFaith = { text: 'Now the just shall live by faith.', ref: 'Hebrews 10:38' }
export const W_renewing = { text: 'Be ye transformed by the renewing of your mind.', ref: 'Romans 12:2' }
export const W_temple = { text: 'Know ye not that your body is the temple of the Holy Ghost which is in you?', ref: '1 Corinthians 6:19' }
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

export const GREETING = {
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
export const GREETING_DAY = {
  0: ['Happy Sunday, {name}.', 'Happy Sunday, {name}. A day for rest and the Word.', 'Sunday, {name}. A good day to look back and look up.', 'Good Sunday to you, {name}.'],
  1: ['Happy new week, {name}.', 'A new week, {name}. Begin it with the Word.', 'Happy new week, {name}. One launch at a time.', 'Monday, {name}. Start the week on the Word.'],
  5: ['Happy Friday, {name}.', 'Friday, {name}. Finish the week well.', 'Happy Friday, {name}. End the week on the Word.'],
  6: ['Happy Saturday, {name}.', 'Saturday, {name}. Make room for the Word.', 'Happy weekend, {name}. No rush today.'],
}
export const SEASON = {
  newYear: ['Happy New Year, {name}.', 'Happy New Year, {name}. Begin it with the Word.', 'A new year, {name}. One launch at a time.'],
  childrensDay: ['Happy Children’s Day, {name}.', 'Happy Children’s Day, {name}. You are loved.', 'Today belongs to you, {name}. Happy Children’s Day.'],
  independence: ['Happy Independence Day, {name}.', 'Happy Independence Day, {name}. Raising goDs, building nations.', 'Happy Independence Day. Build what you pray for, {name}.'],
  christmas: ['Merry Christmas, {name}.', 'Merry Christmas, {name}. Take a quiet moment with the Word.', 'Happy Christmas, {name}. Slow down and look up.'],
  goodFriday: ['Good Friday, {name}. A quiet day for the Word.', 'Blessed Good Friday, {name}.', 'Good Friday, {name}. Remember the cross.'],
  easter: ['Happy Easter, {name}. He is risen.', 'Blessed Easter, {name}.', 'Happy Easter, {name}. Begin with the Word.'],
  easterMonday: ['Happy Easter Monday, {name}.', 'Easter Monday, {name}. A day to rest and rejoice.', 'Easter Monday, {name}. The joy carries on.'],
}
export function easterOf(y) {                         // Gregorian Easter Sunday (anonymous algorithm) -> [month 1-12, day]
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

export const THEME_DONE = {
  'stewardship-code': ['Another day, managed well.', 'Faithful with today’s portion.', 'Today’s account, kept in order.', 'You managed today well.'],
  'secrets-of-longevity': ['Another day, well lived.', 'A day given, and kept.', 'A day well spent.', 'Today, lived for Him.'],
}
export const THEME_RIGHT = {
  'stewardship-code': ['Good steward.', 'Managed well.', 'Accounted for.', 'That is stewardship.', 'Faithful with what you know.', 'Kept in order.', W_firstfruits, W_ownGiven, W_account, W_earth],
  'secrets-of-longevity': ['Good ground gained.', 'A day well kept.', 'Strong and steady.', 'That will carry you far.', 'Built to last.', 'Well kept.', W_longLife, W_number, W_workmanship],
}
export const SOURCE_RIGHT = {
  scripture: ['The Word, held.', 'That verse is yours.', 'Written on the heart.', W_hidWord],
  truth: ['The one thing, held.', 'That is the centre of it.', 'That is the whole day in a line.'],
  point: ['Point taken and kept.', 'You followed the thread.', 'That point is yours now.'],
  code: ['Code cracked.', 'Card line, held.', 'That is the code.'],
  declaration: ['Said and settled.', 'That is the declaration.', 'Now say it out loud.'],
  week: ['That is the stage in one question.', 'Stage question, answered.', 'You see the whole stage.'],
}
export const TYPE_RIGHT = {
  blank: ['The missing word, found.', 'Gap closed.', 'The word fits.'],
  order: ['In order.', 'Line by line, built.', 'Rightly ordered.'],
  match: ['Every pair true.', 'All paired.', 'Each one in its place.'],
  tf: ['Sound judgement.', 'You can tell true from false.', 'You spotted it.'],
}
export const COMBO_AT = [3, 5, 8, 12, 20]

export const WRONG = {
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
export const asLine = (e, c) => lineOf(e, c)
export const seedKey = (seed) => keyOf(seed)

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
    ignition: 'Ignition', watch: 'Tonight’s episode', watchArchive: 'Watch the episode', hook: 'Start here', verse: 'The Word', supporting: 'Also written',
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
export const CALLOUTS = [[0, 'Liftoff'], [25, 'Climbing'], [50, 'Halfway'], [75, 'Final stretch'], [100, 'Orbit insertion']]
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

export const STREAK = {
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
export const streakTier = (n) =>
  n <= 0 ? 't0' : n === 1 ? 't1' : n === 2 ? 't2' : n === 3 ? 'm3' : n <= 6 ? 't4' : n === 7 ? 'm7' : n <= 13 ? 't8'
  : n === 14 ? 'm14' : n <= 20 ? 't15' : n === 21 ? 'm21' : n <= 30 ? 't22' : n === 31 ? 'm31' : 't32'

/** streakLine(7)  ->  '7 days. Ignition holding.'  Plain string; the HUD tooltip, the Objectives header, the Launch Bar note. */
export const streakLine = (n, seed = '') => choose(STREAK[streakTier(n)], seedOf(n, seed), { n }).text

/** Mirrors the store's MILESTONES (tools/test-copy.mjs asserts they match). */
export const MILESTONES = [3, 7, 14, 21, 31, 50, 75, 100, 150, 200, 365]
export const isMilestone = (n) => MILESTONES.includes(n)
export const MILESTONE = {
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

/** streakLostCopy(12, seed)  ->  Line  ('Streak ended at 12. Day 1 starts now.') */
export const streakLostCopy = (prev, seed = '') => choose(prev >= 2 ? LOST : LOST_SHORT, seedOf('lost', prev, seed), { n: prev })

export const RANK_BY_ID = {
  seeker: { texts: ['Your first rank. Everyone starts here.', 'The first rung. The climb starts here.', 'Cleared for the climb.'], word: W_seek },
  steward: { texts: ['You manage what you were given. That is a steward.', 'A steward keeps what belongs to Another. So do you.', 'Faithful in the small, trusted with the next.'], word: W_found },
  builder: { texts: ['You are building now, not just learning.', 'Stone by stone, lesson by lesson.', 'One lesson at a time, a wall goes up.'], word: W_build },
  keeper: { texts: ['You keep what you have been given.', 'Dressed and kept. That is the work.', 'Faithful with the garden you were handed.'], word: W_dressKeep },
  pathfinder: { texts: ['You found the path. Now light it for others.', 'Where the Word leads, you go first.', 'You know the way now.'], word: W_lamp },
  commander: { texts: ['You lead by example now.', 'Steady under pressure. That is leadership.', 'Command begins with being under command.'], word: W_courage },
  pioneer: { texts: ['The top rank. A pioneer of the Word!', 'Few get this far. You are first to many places.', 'A new thing, and you are in it.'], word: W_newThing },
}
// If the ranks are ever renamed, the ladder still has something true to say at every rung.
export const RANK_BY_INDEX = [
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

export const XP_LABELS = {
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
/** chestCopy({ xp:25 }, seed)  ->  { eyebrow:'Daily chest', title:'+25 XP', text, aria } */
export function chestCopy(reward = {}, seed = '') {
  const title = reward.xp ? xpDelta(reward.xp) : 'Opened'
  const text = pick(CHEST, seedOf('chest', reward.xp, seed))
  return { eyebrow: 'Daily chest', title, text, aria: `Daily chest. ${title}. ${text}` }
}

export const DROP = {
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

export const MONTH = [
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

export const STAGE_TEXT = [
  'Every day of the stage, done.', 'The patch is stitched.', 'One stage behind you, and more above.',
  'Stage cleared. The patch is yours.', 'You finished what the stage asked.', 'Another stage cleared. Keep climbing.',
]
export const STAGE_WORD = {
  'stewardship-code': [W_earth, W_least, W_masters, W_occupy],
  'secrets-of-longevity': [W_breath, W_byFaith, W_renewing, W_temple, W_course],
}
export const STAGE_WORD_ANY = [W_least, W_withMight, W_weary, W_race, W_course, W_light]
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

export const NEXT_UP = [
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
export const STATUS = {
  none: ['Finish a lesson to light your streak.', 'Your streak starts with one lesson.', 'No streak yet. Today can be Day 1.'],
  done: ['Done for today. Come back tomorrow.', 'Today is kept. See you tomorrow.', 'Today’s lesson is done. The flame holds.'],
  rest: ['Selah. Your streak rests today.', 'A rest day. Your streak is safe.', 'Selah day: nothing to protect today.'],
  risk: ['Launch today to keep it burning.', 'Today’s lesson keeps it going.', 'One lesson keeps the streak alive.'],
  soon: ['About {left} left today. Launch to keep it.', 'Midnight is about {left} away. One lesson saves it.', 'About {left} to go. Launch to keep it burning.'],
}
export const NEXT_MARK = [
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

export const reminderPresets = [
  { id: 'before-school', label: 'Before school', hour: 6, min: 30 },
  { id: 'after-school', label: 'After school', hour: 16, min: 0 },
  { id: 'evening', label: 'Evening', hour: 20, min: 0 },
  { id: 'before-bed', label: 'Before bed', hour: 21, min: 30 },
]
export const REM_CHANGE = 'To change the time, delete the old event in your calendar and add a new one.'
export const reminderChrome = { title: REM_TITLE, add: REM_ADD, skip: REM_SKIP, time: 'Time', custom: 'Or choose a time', how: REM_HOW, done: REM_DONE, change: REM_CHANGE }

/* ── 12. Share captions ────────────────────────────────────────────────── */

export const EMPTY = {
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

/** Every toast id (the test walks them; screens never need this). */
export const toastIds = () => Object.keys(TOAST)
export const INSTALL_PROMPT = [
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

/* ── 19. Registry (for tools/test-copy.mjs and docs; screens never import this) ───────────────── */
export const POOLS = {
  greeting: GREETING, greetingDay: GREETING_DAY, praise: PRAISE, wrong: WRONG, themeRight: THEME_RIGHT, sourceRight: SOURCE_RIGHT, typeRight: TYPE_RIGHT,
  themeDone: THEME_DONE, season: SEASON, stageClear: { text: STAGE_TEXT }, nextUp: { text: NEXT_UP }, streak: STREAK, milestone: MILESTONE, lost: { long: LOST, short: LOST_SHORT }, shield: SHIELD, rank: RANK_BY_ID,
  rankFallback: RANK_BY_INDEX, drop: DROP, chest: { text: CHEST }, month: { text: MONTH }, bar: BAR, locked: { text: LOCKED }, status: STATUS,
  nextMark: { text: NEXT_MARK }, notice: { grace: NOTICE_GRACE }, reminder: { body: REMINDER_BODY }, share: SHARE, empty: EMPTY, error: ERROR,
  install: { prompt: INSTALL_PROMPT },
}

