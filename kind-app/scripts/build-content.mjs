// Parses the gDx Monthly Devotional markdown into src/content/library.json.
// Multi-series: every month in SERIES below becomes its own journey in the app.
// Usage: node scripts/build-content.mjs  (runs automatically via npm run dev/build)
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..', 'series')
const OUT = process.env.KIND_CONTENT_OUT || join(here, '..', 'src', 'content', 'library.json') // override: dry runs

const CHANNEL = 'https://www.youtube.com/@KidsInspiringNation'

/* ---------------------------------------------------------------------------
 * Series registry — newest first. `calendar: 'dated'` reads the real dates out
 * of the episode headers; 'synthetic' spreads episodes + Selah days over the
 * month (used by July, whose episodes carry no dates).
 * ------------------------------------------------------------------------- */
const SERIES = [
  {
    id: 'stewardship-code',
    dir: 'stewardship-code',
    title: 'The Stewardship Code',
    subtitle: 'Secrets to Managing Money',
    tagline: 'Christ my Master, money my servant.',
    audience: 'Teens & families',
    month: 'August', year: 2026, monthNum: 8,
    calendar: 'dated',
    accent: '#a8791f', accentDark: '#d9a441',
    themeScripture: {
      text: 'He that is faithful in that which is least is faithful also in much.',
      ref: 'Luke 16:10 (KJV)',
    },
    declaration: [
      'God owns everything.',
      'I am only a steward.',
      'I will give an account.',
      'Money is a tool, never my master.',
      'Christ my Master — money my servant.',
    ],
    weeks: [
      { f: 'OWNERSHIP', title: 'God Owns It; I Manage It', emoji: '👑', question: 'Whose money, time and talents am I managing?', passage: 'Luke 16:1–2', dir: 'week-1-ownership-code' },
      { f: 'FAITHFULNESS', title: 'Manage Little Before More', emoji: '🔑', question: 'Can God trust me with what is already in my hands?', passage: 'Luke 16:10–12', dir: 'week-2-faithfulness-code' },
      { f: 'MASTERY', title: 'Christ My Master, Money My Servant', emoji: '⛓️‍💥', question: 'Do I control money, or has money begun to control me?', passage: 'Luke 16:9–13', dir: 'week-3-mastery-code' },
      { f: 'MULTIPLICATION', title: 'Build It, Grow It, Send It Ahead', emoji: '📈', question: 'What am I doing to increase what God placed in my hands?', passage: 'Luke 19:11–26', dir: 'week-4-multiplication-code' },
    ],
    extraEpisodes: ['00-series-launch.md', '99-grand-finale.md'],
    finaleEpisode: 26,
  },
  {
    id: 'secrets-of-longevity',
    dir: 'secrets-of-longevity',
    title: 'Secrets of Longevity',
    subtitle: 'Seven Decades of Serving God',
    tagline: 'Live long — and live long for Him.',
    audience: 'Families with kids',
    month: 'July', year: 2026, monthNum: 7,
    calendar: 'synthetic',
    accent: '#25704a', accentDark: '#4fbf85',
    themeScripture: {
      text: 'With long life will I satisfy him, and shew him my salvation.',
      ref: 'Psalm 91:16 (KJV)',
    },
    declaration: [
      'My days are authored by God.',
      'I will guard my faith, my mind and my body.',
      'I will finish my course with joy.',
    ],
    weeks: [
      { f: 'FOUNDATION', title: 'Life Begins with God', emoji: '🌱', episodes: [1, 2, 3] },
      { f: 'FAITH', title: 'Strengthening the Spirit', emoji: '🛡️', episodes: [4, 5, 6, 7, 8] },
      { f: 'FOCUS', title: 'Renewing the Mind', emoji: '🧠', episodes: [9, 10, 11, 12, 13] },
      { f: 'FITNESS', title: 'Stewarding the Body', emoji: '💪', episodes: [14, 15, 16, 17, 18] },
      { f: 'FINISHING', title: 'Leaving a Legacy', emoji: '🏁', episodes: [19, 20, 21, 22, 23] },
    ],
  },
]

/* ---- markdown helpers --------------------------------------------------- */
const headSections = (md, level) => {
  const out = {}
  const parts = md.split(new RegExp(`\\n#{${level}} +`))
  for (const p of parts.slice(1)) {
    const nl = p.indexOf('\n')
    const key = (nl === -1 ? p : p.slice(0, nl)).trim().replace(/[*#]+/g, '').trim()
    out[key] = (nl === -1 ? '' : p.slice(nl + 1)).split(/\n---/)[0].trim()
  }
  return out
}
const unquote = (s) => s.replace(/^> ?/gm, '').replace(/[*]/g, '').trim()
const firstQuote = (s) => {
  const m = (s || '').match(/^(?:>.*\n?)+/m)
  return m ? unquote(m[0]) : ''
}
const tidy = (s) => (s || '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '').trim()
const bullets = (s) =>
  (s || '').split('\n').filter((l) => /^\s*[-•]\s/.test(l)).map((l) => l.replace(/^\s*[-•]\s*/, '').trim())
const prose = (s) => tidy((s || '').split('\n').filter((l) => !/^\s*[-•]\s/.test(l)).join('\n'))
const scriptureOf = (block) => {
  const q = firstQuote(block)
  const refMatch = q.match(/[—–-]\s*([A-Z0-9][^"\n]*?)\s*$/m)
  const ref = refMatch ? refMatch[1].trim() : ''
  const text = q
    .replace(/[—–-]\s*[A-Z0-9][^"\n]*?\s*$/m, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["“”']+|["“”']+$/g, '')
  return { text, ref }
}
const inline = (md, label) => {
  const m = md.match(new RegExp(`\\*\\*${label}[:\\*]*\\*\\*\\s*([\\s\\S]*?)(?:\\n\\n|$)`))
  return m ? m[1].replace(/\s+/g, ' ').replace(/[*]/g, '').trim() : ''
}
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const dateIn = (s) => {
  const m = (s || '').match(new RegExp(`(${MONTHS.join('|')}|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\\w*\\.?,?\\s+(\\d{1,2})`, 'i'))
  return m ? +m[2] : null
}

/* ---- episode normalisers ------------------------------------------------ */
// Both series get flattened into one shape the app understands:
//  { num, title, date, scripture, truth, hook, points[], illustration,
//    challenge, prayer, declaration, questions[], apply[], quote }

function parseEpisodeDated(md) {
  const h1 = md.match(/^# EPISODE (\d+)(.*)$/m) || []
  const num = +h1[1]
  const title = (md.match(/^## (.+)$/m) || [, ''])[1].trim()
  const sec = headSections(md, 3)
  const points = Object.keys(sec)
    .filter((k) => /^Teaching Point \d/i.test(k))
    .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]))
    .map((k) => ({ title: k.replace(/^Teaching Point \d+:?\s*/i, ''), body: tidy(sec[k]) }))
  const supporting = Object.keys(sec)
    .filter((k) => /^Supporting Scripture/i.test(k))
    .map((k) => scriptureOf(sec[k]))
    .filter((s) => s.text)
  const challengeKey = Object.keys(sec).find((k) => /Challenge|Assignment|Exercise/i.test(k))
  return {
    num,
    title,
    date: dateIn(h1[2]) ?? dateIn(md.slice(0, 400)),
    scripture: scriptureOf(sec[Object.keys(sec).find((k) => /^Main Scripture/i.test(k))] || ''),
    truth: tidy(sec['Central Truth'] || ''),
    hook: '',
    points,
    supporting,
    illustration: tidy(sec['Illustration'] || ''),
    challenge: tidy(sec[challengeKey] || ''),
    prayer: tidy(sec['Prayer'] || ''),
    declaration: firstQuote(sec['Daily Declaration'] || ''),
    transition: tidy(sec['Transition'] || ''),
    questions: bullets(sec['Reflection Questions'] || ''),
    apply: [],
  }
}

function parseEpisodeLegacy(md) {
  const num = +(md.match(/^# EPISODE (\d+)/m) || [, 0])[1]
  const title = (md.match(/^## (.+)$/m) || [, ''])[1].trim()
  const sec = headSections(md, 3)
  return {
    num,
    title,
    date: null,
    scripture: scriptureOf(sec['Key Scripture'] || ''),
    truth: unquote(firstQuote(sec['Big Idea'] || '')),
    hook: tidy(sec['Hook'] || ''),
    points: [...(sec['Teaching'] || '').matchAll(/^#### \d+\. (.+)$/gm)].map((m) => ({ title: m[1].trim(), body: '' })),
    supporting: [],
    illustration: tidy(sec['Why This Matters'] || ''),
    challenge: tidy(sec['Weekly Challenge'] || ''),
    prayer: tidy(sec['Prayer'] || ''),
    // The Big Idea is one line, so it works as the day's declaration/code card.
    declaration: unquote(firstQuote(sec['Big Idea'] || '')) || unquote(sec['Longevity Insight'] || ''),
    transition: '',
    questions: bullets(sec['Reflection Questions'] || ''),
    apply: bullets((sec['Application'] || '').split(/\*\*What should I do today\?\*\*/i).pop() || ''),
    talk: inline(md, 'Discussion prompt'),
  }
}

function parseSunday(md, file) {
  const sec = headSections(md, 2)
  const n = +(file.match(/sunday-(\d+)/) || [, 0])[1]
  return {
    n,
    date: dateIn((md.match(/^>.*$/m) || [''])[0]),
    title: (md.match(/^# (.+)$/m) || [, ''])[1].replace(/^SUNDAY GUIDE \d+\s*[—-]\s*/i, '').trim(),
    recap: tidy(sec["This Week's Journey"] || sec['This Week’s Journey'] || ''),
    reading: tidy(sec['Bible Reading'] || ''),
    questions: (sec['Talk About It'] || '').split('\n').filter((l) => /^\s*\d+\./.test(l))
      .map((l) => l.replace(/^\s*\d+\.\s*/, '').trim())
      .concat([]),
    prayer: tidy(sec['Pray Together'] || ''),
    declaration: firstQuote(sec['Declare Together'] || ''),
  }
}

function parseShort(md, file) {
  return {
    n: +(file.match(/short-(\d+)/) || [, 0])[1],
    title: (md.match(/^# SHORT \d+\s*[—-]\s*(.+)$/m) || [, ''])[1].trim(),
    hook: inline(md, '🎯 Hook'),
    scripture: inline(md, '📖 Scripture'),
    truth: inline(md, '💡 Truth'),
    challenge: inline(md, '🚀 Challenge'),
    quote: inline(md, 'Quote graphic').replace(/^["“]|["”]$/g, ''),
  }
}

/* ---- calendars ---------------------------------------------------------- */
function datedCalendar(cfg, episodes, sundays, total) {
  const byDate = {}
  for (const ep of Object.values(episodes)) if (ep.date) byDate[ep.date] = ep
  const sunByDate = {}
  for (const s of Object.values(sundays)) if (s.date) sunByDate[s.date] = s
  const out = []
  for (let day = 1; day <= total; day++) {
    const ep = byDate[day]
    const su = sunByDate[day]
    if (ep) {
      const type = ep.num === 1 ? 'intro' : ep.num === cfg.finaleEpisode ? 'celebration' : 'teaching'
      out.push({ day, type, episode: ep.num, week: ep.week ?? null })
    } else if (su) {
      out.push({ day, type: 'selah', sunday: su.n, week: su.n ? su.n - 1 : null })
    } else {
      out.push({ day, type: 'rest', week: null })
    }
  }
  return out
}

function syntheticCalendar(cfg, total) {
  const days = [{ type: 'intro' }]
  cfg.weeks.forEach((w, wi) => {
    ;(w.episodes || []).forEach((ep) => days.push({ type: 'teaching', episode: ep, week: wi }))
    days.push({ type: 'selah', week: wi })
  })
  while (days.length < total - 1) days.push({ type: 'review', week: cfg.weeks.length - 1 })
  while (days.length > total - 1) days.splice(days.map((d) => d.type).lastIndexOf('selah'), 1)
  days.push({ type: 'celebration', week: cfg.weeks.length - 1 })
  return days.map((d, i) => ({ day: i + 1, ...d }))
}

/* ---- build one series --------------------------------------------------- */
function buildSeries(cfg, videos) {
  const dir = join(ROOT, cfg.dir)
  if (!existsSync(dir)) return null
  const dated = cfg.calendar === 'dated'
  const parseEp = dated ? parseEpisodeDated : parseEpisodeLegacy

  const episodes = {}
  cfg.weeks.forEach((w, wi) => {
    const wdir = w.dir ? join(dir, w.dir) : null
    if (!wdir || !existsSync(wdir)) return
    for (const f of readdirSync(wdir)) {
      if (!f.startsWith('episode-')) continue
      const ep = parseEp(readFileSync(join(wdir, f), 'utf8'))
      ep.week = wi
      episodes[ep.num] = ep
    }
  })
  if (!dated) {
    for (const d of readdirSync(dir)) {
      if (!d.startsWith('week-') || !statSync(join(dir, d)).isDirectory()) continue
      for (const f of readdirSync(join(dir, d))) {
        if (!f.startsWith('episode-')) continue
        const ep = parseEp(readFileSync(join(dir, d, f), 'utf8'))
        ep.week = cfg.weeks.findIndex((w) => (w.episodes || []).includes(ep.num))
        episodes[ep.num] = ep
      }
    }
  }
  for (const f of cfg.extraEpisodes || []) {
    if (!existsSync(join(dir, f))) continue
    const ep = parseEp(readFileSync(join(dir, f), 'utf8'))
    ep.week = ep.num === 1 ? 0 : cfg.weeks.length - 1
    episodes[ep.num] = ep
  }

  const sundays = {}
  const sdir = join(dir, 'sundays')
  if (existsSync(sdir)) for (const f of readdirSync(sdir)) {
    const s = parseSunday(readFileSync(join(sdir, f), 'utf8'), f)
    sundays[s.n] = s
  }

  const shorts = []
  const shdir = join(dir, 'shorts')
  if (existsSync(shdir)) for (const f of readdirSync(shdir).sort()) shorts.push(parseShort(readFileSync(join(shdir, f), 'utf8'), f))

  // Legacy July intro lives in its own file, not the week folders.
  let intro = null
  if (!dated && existsSync(join(dir, '00-introduction.md'))) {
    const md = readFileSync(join(dir, '00-introduction.md'), 'utf8')
    const sec = headSections(md, 3)
    intro = {
      num: 0, week: 0, date: null,
      title: 'The Gift of Long Life',
      scripture: scriptureOf(sec['Theme Scripture'] || ''),
      truth: "God's desire is not merely that you live long — but that you live long for Him.",
      hook: tidy((sec['The Opener'] || '').split('\n\n').slice(0, 5).join('\n\n')),
      points: [], supporting: [],
      illustration: tidy(sec["God's Vision"] || ''),
      challenge: '', prayer: tidy(sec['Prayer'] || ''),
      declaration: cfg.declaration[0], transition: '',
      questions: [], apply: [], talk: inline(md, 'Discussion prompt'),
    }
  }

  const total = new Date(cfg.year, cfg.monthNum, 0).getDate()
  const calendar = (dated ? datedCalendar(cfg, episodes, sundays, total) : syntheticCalendar(cfg, total))
    .map((d) => ({ ...d, videoId: videos.days?.[d.day] || null }))

  // Every episode day mints one collectible Code Card.
  const codes = calendar
    .filter((d) => d.episode && episodes[d.episode])
    .map((d, i) => {
      const ep = episodes[d.episode]
      return {
        no: i + 1, day: d.day, episode: d.episode, week: ep.week ?? 0,
        title: ep.title,
        line: (ep.declaration || ep.truth || '').split('\n')[0].trim(),
        rare: (i + 1) % 7 === 0,
      }
    })

  return {
    id: cfg.id,
    title: cfg.title, subtitle: cfg.subtitle, tagline: cfg.tagline, audience: cfg.audience,
    month: cfg.month, year: cfg.year, monthNum: cfg.monthNum,
    accent: cfg.accent, accentDark: cfg.accentDark || cfg.accent,
    themeScripture: cfg.themeScripture, declaration: cfg.declaration,
    weeks: cfg.weeks.map(({ f, title, emoji, question, passage }) => ({ f, title, emoji, question: question || '', passage: passage || '' })),
    channel: CHANNEL,
    shortsUrl: CHANNEL + '/shorts',
    calendar, episodes, sundays, shorts, codes, intro,
    shortsVideos: videos.shorts || [],
    shortsPlaylist: videos.shortsPlaylist || null,
  }
}

/* ---- archive-light series ------------------------------------------------
 * Months we have no scripts for, only the public YouTube playlist (scripts/year-series.json) and the copy the team wrote per
 * video (scripts/year-copy/<id>.json: { declaration:[3], days:[{ n, takeaway, reflect, doToday, scripture?:{ref,text?} }] }).
 * Each becomes a "Watch and Reflect" series (kind:'light'): one lesson per episode, stages of seven days, no quiz.
 * The live month (October) is a dated series of daily trailers: day N = the trailer for October N; days without one are
 * left unpublished ("Coming soon") and open at 06:00 on their date like any live day. Missing copy never breaks the build:
 * every field falls back to the video title and the month theme.
 * ------------------------------------------------------------------------- */
const YEAR = join(here, 'year-series.json')
const YEAR_COPY = join(here, 'year-copy')
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const LIGHT = {
  'daniel-fast-giving-praying-fasting': {
    subtitle: 'The Daniel Fast', tagline: 'Give, pray and fast in secret.', accent: '#8a5a2b', accentDark: '#d4a373',
    themeScripture: { text: 'That thine alms may be in secret: and thy Father which seeth in secret himself shall reward thee openly.', ref: 'Matthew 6:4 (KJV)' },
  },
  'rhythm-of-a-praying-life': {
    subtitle: 'Prayer as breathing', tagline: 'Pray with boldness, keys and rhythm.', accent: '#3b5ba5', accentDark: '#7fa0ec',
    themeScripture: { text: 'Pray without ceasing.', ref: '1 Thessalonians 5:17 (KJV)' },
  },
  'the-voice-of-influence': {
    subtitle: 'How influence is built', tagline: 'Value others. Use words that build.', accent: '#9b3d6e', accentDark: '#e07ab0',
    themeScripture: { text: 'Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.', ref: 'Matthew 5:16 (KJV)' },
  },
  'power-of-positive-habits': {
    subtitle: 'Godly habits that hold', tagline: 'Replace the pattern, one day at a time.', accent: '#2f7d6d', accentDark: '#5cc9b1',
    themeScripture: { text: 'Be not conformed to this world: but be ye transformed by the renewing of your mind.', ref: 'Romans 12:2 (KJV)' },
  },
  'the-genius-code': {
    subtitle: 'The mind under God', tagline: 'Prepare, decide, excel.', accent: '#6b4fb3', accentDark: '#a38cf0',
    themeScripture: { text: 'For the LORD giveth wisdom: out of his mouth cometh knowledge and understanding.', ref: 'Proverbs 2:6 (KJV)' },
  },
  'faith-in-his-name': {
    subtitle: 'Faith and healing', tagline: 'One word from God changes everything.', accent: '#b5452f', accentDark: '#ef8a6f',
    themeScripture: { text: 'I am the LORD that healeth thee.', ref: 'Exodus 15:26 (KJV)' },
  },
  'building-capacity': {
    subtitle: 'Before your Goliath', tagline: 'Sharpen your tools in private.', accent: '#5b6b2a', accentDark: '#a8c25a',
    themeScripture: { text: 'The LORD that delivered me out of the paw of the lion, and out of the paw of the bear, he will deliver me out of the hand of this Philistine.', ref: '1 Samuel 17:37 (KJV)' },
  },
  'building-nigeria-trailers': {
    subtitle: 'Ordinary Nigerians who built', tagline: 'Arise and build.', accent: '#1f7a3a', accentDark: '#3fcf6e', live: true,
    themeScripture: { text: 'The God of heaven, he will prosper us; therefore we his servants will arise and build.', ref: 'Nehemiah 2:20 (KJV)' },
  },
}
const STAGE_NAMES = ['IGNITION', 'LIFTOFF', 'ASCENT', 'ORBIT', 'HORIZON', 'DEEP SPACE']
const TRAILER_MAX_SECS = 180

// YouTube titles carry hashtags, emoji and the odd stray space; the lesson title is the words alone.
const cleanVideoTitle = (t) => (t || '')
  .replace(/#[\p{L}\p{N}_]+/gu, '')
  .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
  .replace(/\s+([?!.,:])/g, '$1')
  .replace(/\s{2,}/g, ' ')
  .trim()
  .replace(/[\s|:\-–—]+$/, '')
const str = (x) => (typeof x === 'string' ? x.trim() : '')

function readCopy(id) {
  const f = join(YEAR_COPY, id + '.json')
  if (!existsSync(f)) return { declaration: [], days: {} }
  try {
    const j = JSON.parse(readFileSync(f, 'utf8'))
    const days = {}
    for (const d of Array.isArray(j.days) ? j.days : []) if (d && Number.isInteger(+d.n)) days[+d.n] = d
    return { declaration: (Array.isArray(j.declaration) ? j.declaration : []).map(str).filter(Boolean), days }
  } catch (err) {
    console.warn(`content: ${id} — year-copy unreadable (${err.message}); using fallbacks`)
    return { declaration: [], days: {} }
  }
}

function buildLightSeries(m, year) {
  const cfg = LIGHT[m.id] || {}
  const copy = readCopy(m.id)
  const total = new Date(year, m.month, 0).getDate()
  const live = Boolean(cfg.live)
  const shortsAll = (m.shorts || []).filter((v) => v && v.id)
  // Lesson videos: the long-form episodes in order; for the live month, the daily trailers on their own dates.
  let lessons
  if (live) {
    const trailers = shortsAll.filter((v) => !v.secs || v.secs <= TRAILER_MAX_SECS)
    const byDay = new Map()
    let next = 1
    for (const v of trailers) {
      const named = +((v.title || '').match(/october\s+(\d{1,2})\b/i) || [])[1]
      const day = named >= 1 && named <= total ? named : next
      if (!byDay.has(day)) byDay.set(day, v)
      next = Math.max(next, day + 1)
    }
    lessons = [...byDay].filter(([d]) => d <= total).sort((a, b) => a[0] - b[0]).map(([day, v]) => ({ day, ...v }))
  } else {
    lessons = (m.episodes || []).filter((v) => v && v.id).slice(0, total).map((v, i) => ({ day: i + 1, ...v }))
  }
  const len = live ? total : lessons.length
  if (!len) return null
  const nStages = Math.ceil(len / 7)
  const theme = str(m.theme)
  const firstThemeSentence = (theme.match(/^.+?[.!?](?=\s|$)/) || [theme])[0]
  const declaration = copy.declaration.length ? copy.declaration : [cfg.tagline || m.title]
  // Stage lines: the month's theme opens, then one declaration line per stage (the divider falls back to "Days a–b").
  const weeks = Array.from({ length: nStages }, (_, i) => {
    const a = i * 7 + 1, b = Math.min(len, a + 6)
    const question = i === 0 ? firstThemeSentence : copy.declaration[i - 1] || ''
    return { f: STAGE_NAMES[i] || `STAGE ${i + 1}`, title: `Days ${a}–${b}`, emoji: '', question, passage: '' }
  })
  const seen = new Map()

  const episodes = {}
  const calendar = []
  const byDay = new Map(lessons.map((v) => [v.day, v]))
  for (let day = 1; day <= len; day++) {
    const v = byDay.get(day)
    const week = Math.floor((day - 1) / 7)
    if (!v) { calendar.push({ day, type: 'teaching', week, videoId: null }); continue }
    const n = live ? day : v.n || day
    const c = copy.days[n] || {}
    let name = cleanVideoTitle(v.title) || `${m.title} · Day ${day}`
    const k = name.toLowerCase(); seen.set(k, (seen.get(k) || 0) + 1)
    if (seen.get(k) > 1) name += ` (${seen.get(k)})` // two uploads under one title (the October launch trailers)
    const sc = c.scripture && typeof c.scripture === 'object' ? { text: str(c.scripture.text), ref: str(c.scripture.ref) } : { text: '', ref: '' }
    episodes[day] = {
      num: day, title: name, date: live ? day : null, week, secs: +v.secs || 0,
      scripture: sc,
      truth: str(c.takeaway) || firstThemeSentence,
      hook: '', points: [], supporting: [], illustration: '',
      challenge: str(c.doToday) || 'Tell one person the line from today’s video that stayed with you.',
      prayer: '', declaration: '', transition: '',
      questions: [str(c.reflect) || `What does “${name}” say to you about ${m.title.toLowerCase().startsWith('the ') ? m.title : 'the ' + m.title} this week?`],
      apply: [],
    }
    calendar.push({ day, type: 'teaching', episode: day, week, videoId: v.id })
  }
  const codes = calendar.filter((d) => d.episode).map((d, i) => ({
    no: i + 1, day: d.day, episode: d.episode, week: d.week,
    title: episodes[d.episode].title, line: firstLine(episodes[d.episode].truth), rare: (i + 1) % 7 === 0,
  }))
  // Shorts that ride with the month: spread across its lessons (or, live, each trailer on its own day).
  const extra = live ? lessons : shortsAll
  const shortsVideos = extra.map((v, i) => ({
    day: live ? v.day : Math.min(len, Math.max(1, Math.round(((i + 0.5) * len) / extra.length))),
    videoId: v.id, title: cleanVideoTitle(v.title),
  }))
  return {
    id: m.id, kind: 'light',
    title: m.title, subtitle: cfg.subtitle || '', tagline: cfg.tagline || firstThemeSentence, theme,
    audience: 'Teens & families',
    month: MONTH_NAMES[m.month - 1], year, monthNum: m.month,
    accent: cfg.accent || '#5a6b8c', accentDark: cfg.accentDark || cfg.accent || '#8fa3c8',
    themeScripture: cfg.themeScripture || { text: firstThemeSentence, ref: '' },
    declaration,
    weeks, channel: CHANNEL, shortsUrl: CHANNEL + '/shorts',
    calendar, episodes, sundays: {}, shorts: [], codes, intro: null,
    shortsVideos, shortsPlaylist: null,
  }
}
function firstLine(t) { return (t || '').split('\n')[0].trim() }

/* ---- guide series ----------------------------------------------------------
 * Months the founder wrote a full teaching guide for (series/<dir>/teaching-guide.md), parsed into
 * scripts/year-copy/<id>.json: { title, tagline, bigIdea, openLine?, closeLine?, declaration[], weeks|parts[{n,name,power|value,days[]}],
 * days[{ n, date, kind:'episode'|'discussion', title, scripture, psalm?, hook, story, points[{head,body}], mirrors?, christ?,
 * challenge, prayer, declaration?, rhyme?, centralTruth, codeLine, quiz[] }] }. A guide supersedes the light build of its month.
 * Dated like August: the calendar day is the day's own date; discussion days are Selah (rest + family talk); a day of the month
 * the guide leaves empty is the finale when it is the last one, otherwise a rest day. Videos map conservatively: September's
 * playlist by order only when its count equals the guide's episodes; October's trailers only by an exact title match.
 * ------------------------------------------------------------------------- */
const GUIDES = {
  9: {
    id: 'capacity-superpowers', title: 'Capacity — Developing SuperPowers', subtitle: 'Developing SuperPowers', tagline: 'Don’t wait for your Goliath to start developing your sling.',
    accent: '#5b6b2a', accentDark: '#a8c25a', passage: '1 Samuel 17',
    themeScripture: { text: 'The LORD that delivered me out of the paw of the lion, and out of the paw of the bear, he will deliver me out of the hand of this Philistine.', ref: '1 Samuel 17:37 (KJV)' },
  },
  10: {
    id: 'building-nigeria', title: 'Building the Nigeria God Intends', subtitle: '30 days of nation-building', tagline: 'Righteousness exalts a nation.',
    accent: '#1f7a3a', accentDark: '#3fcf6e', passage: 'Psalm 119',
    themeScripture: { text: 'Righteousness exalteth a nation: but sin is a reproach to any people.', ref: 'Proverbs 14:34 (KJV)' },
  },
}
const normTitle = (t) => cleanVideoTitle(t).toLowerCase().replace(/[’'"“”]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const lines = (x) => (Array.isArray(x) ? x : [x]).map(str).filter(Boolean).join('\n')
// Guides shout the week names in their declarations ("I will build in THE CAVE"); the app sets them in its own type: "The Cave".
const decaps = (t) => t.replace(/\b(?!LORD\b|GOD\b)[A-Z]{2,}\b/g, (w) => w[0] + w.slice(1).toLowerCase())
const titleCase = (t) => str(t).toLowerCase().replace(/(^|[\s&(“"-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())

function readGuide(id) {
  const f = join(process.env.KIND_GUIDE_DIR || YEAR_COPY, id + '.json')
  if (!existsSync(f)) return null
  try {
    const g = JSON.parse(readFileSync(f, 'utf8'))
    return Array.isArray(g.days) && g.days.length ? g : null
  } catch (err) { console.warn(`content: ${id} — guide unreadable (${err.message}); keeping the light build`); return null }
}

function buildGuideSeries(m, g, cfg, year) {
  const total = new Date(year, m.month, 0).getDate()
  const groups = (g.weeks || g.parts || []).filter((w) => w && Array.isArray(w.days))
  const isParts = !g.weeks && Boolean(g.parts)
  const weeks = groups.map((w) => {
    const name = str(w.name).replace(/^the\s+/i, ''), power = str(w.power || w.value)
    const same = name.toLowerCase() === power.toLowerCase()
    return {
      f: (isParts ? power.split(/\s*&\s*/)[0] : name).toUpperCase() || 'STAGE',
      title: isParts || same ? power : `${titleCase(name)} · ${power}`,
      emoji: '',
      // The stage question is quiz material, so a template repeated across stages would make ambiguous checks: the guides
      // give none, so it stays empty and the reflective prompt lives in `ask`.
      question: '', ask: isParts ? `Where can you practise ${power.toLowerCase()} this week?` : `Where is God building ${power.toLowerCase()} in you right now?`,
      passage: cfg.passage || '',
      rhyme: lines(w.rhyme), declaration: decaps(lines(w.declaration)),
    }
  })
  // weeks[].days count episodes (September's Sundays are not numbered in them), so a day's week is found by its episode ordinal.
  const weekOfN = (k) => { const i = groups.findIndex((w) => w.days.map(Number).includes(k)); return i < 0 ? null : i }
  // September's guide words its devotional "prayer" as a question for the child: that belongs on the answer card, not the prayer card.
  const asQuestion = (t) => /\?[”"]?\s*(\([^)]*\))?\s*$/.test(str(t))
  // Calendar day for each guide day: its date when it has one in this month, else its order.
  const byDay = new Map()
  g.days.forEach((d, i) => {
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(d.date))
    const day = dm && +dm[1] === year && +dm[2] === m.month ? +dm[3] : i + 1
    if (day >= 1 && day <= total && !byDay.has(day)) byDay.set(day, d)
  })
  // A discussion day is a Sunday talk guide with no teaching of its own; a "discussion" that carries a full hook is a teaching day.
  const isTalk = (d) => d.kind === 'discussion' && !str(d.hook)
  const epDays = [...byDay].filter(([, d]) => !isTalk(d)).sort((a, b) => a[0] - b[0])
  // Videos: September's long-form playlist by order (only when it lines up 1:1); October's trailers by exact title.
  const vids = new Map()
  const eps = (m.episodes || []).filter((v) => v && v.id)
  if (eps.length && eps.length === epDays.length) epDays.forEach(([day], i) => vids.set(day, eps[i]))
  // Trailers come out one a day in order: the first whose title is a guide day's title anchors the run, and the ones after it
  // follow day by day (October: "The Ones Who Showed Up" = day 3, then Innoson = Nnewi on day 7, Ajaokuta = the furnace on day 9).
  const trailers = (m.shorts || []).filter((v) => v && v.id && (!v.secs || v.secs <= TRAILER_MAX_SECS))
  const series = normTitle(g.title)
  if (epDays.length && trailers[0] && normTitle(trailers[0].title) === series) vids.set(epDays[0][0], trailers[0]) // the series trailer opens day 1
  const at = trailers.findIndex((v) => epDays.some(([, d]) => normTitle(d.title) === normTitle(v.title)))
  if (at >= 0) {
    let k = epDays.findIndex(([, d]) => normTitle(d.title) === normTitle(trailers[at].title))
    for (const v of trailers.slice(at)) { if (k >= epDays.length) break; if (!vids.has(epDays[k][0])) vids.set(epDays[k][0], v); k++ }
  }

  const episodes = {}, sundays = {}, calendar = []
  let lastWeek = null, nSun = 0, nEp = 0
  const lastGuideDay = Math.max(0, ...byDay.keys())
  for (let day = 1; day <= total; day++) {
    const d = byDay.get(day)
    if (!d) {
      calendar.push(day > lastGuideDay && day === total ? { day, type: 'celebration', week: lastWeek, videoId: null } : { day, type: 'rest', week: lastWeek, videoId: null })
      continue
    }
    const sc = d.scripture && typeof d.scripture === 'object' ? { text: str(d.scripture.text), ref: str(d.scripture.ref) } : { text: '', ref: '' }
    const pts = (Array.isArray(d.points) ? d.points : []).map((p) => ({ title: str(p?.head || p?.title), body: str(p?.body) })).filter((p) => p.title || p.body)
    if (isTalk(d)) {
      const n = ++nSun
      const q = asQuestion(d.prayer)
      sundays[n] = {
        n, date: day, title: titleCase(str(d.title)) || `Discussion ${n}`,
        recap: [lines([d.hook, d.story]) || str(d.centralTruth), pts.map((p) => `- ${p.title}${p.body ? ': ' + p.body : ''}`).join('\n')].filter(Boolean).join('\n\n'),
        reading: sc.ref ? `${sc.text ? sc.text + ' ' : ''}(${sc.ref})` : '',
        questions: [...(Array.isArray(d.questions) ? d.questions : []), q ? d.prayer : ''].map(str).filter(Boolean),
        prayer: q ? '' : str(d.prayer), declaration: decaps(lines(d.declaration)),
      }
      calendar.push({ day, type: 'selah', sunday: n, week: lastWeek, videoId: null })
      continue
    }
    const wk = weekOfN(++nEp)
    if (wk != null) lastWeek = wk
    const v = vids.get(day)
    const quiz = (Array.isArray(d.quiz) ? d.quiz : []).filter((q) => q && str(q.q) && (
      (q.type === 'tf' && typeof q.answer === 'boolean') ||
      (Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length &&
        new Set(q.options.map((o) => str(o).toLowerCase())).size === q.options.length && q.options.every((o) => str(o)))
    )).map((q) => (q.type === 'tf' ? { type: 'tf', q: str(q.q), answer: q.answer } : { type: 'choice', q: str(q.q), options: q.options.map(str), answer: q.answer }))
    const psalm = d.psalm && str(d.psalm.ref) ? { text: str(d.psalm.text), ref: str(d.psalm.ref) } : null
    episodes[day] = {
      num: day, title: str(d.title) || `Day ${day}`, date: day, week: wk, secs: v ? +v.secs || 0 : 0,
      scripture: sc, truth: str(d.centralTruth), hook: str(d.hook),
      points: pts, supporting: psalm ? [psalm] : [], illustration: str(d.story),
      challenge: str(d.challenge), prayer: asQuestion(d.prayer) ? '' : str(d.prayer), declaration: decaps(lines(d.declaration)), transition: '',
      questions: asQuestion(d.prayer) ? [str(d.prayer)] : [], apply: [],
      mirrors: d.mirrors && (str(d.mirrors.ot) || str(d.mirrors.nt)) ? { ot: str(d.mirrors.ot), nt: str(d.mirrors.nt) } : null,
      christ: str(d.christ), rhyme: /^stanza/i.test(str(d.rhyme)) ? '' : lines(d.rhyme), code: str(d.codeLine), quiz,
    }
    calendar.push({ day, type: 'teaching', episode: day, week: wk, videoId: v ? v.id : null })
  }
  const codes = calendar.filter((d) => d.episode).map((d, i) => {
    const ep = episodes[d.episode]
    return { no: i + 1, day: d.day, episode: d.episode, week: d.week ?? 0, title: ep.title, line: firstLine(ep.code || ep.truth || ep.title), rare: (i + 1) % 7 === 0 }
  })
  const declaration = (Array.isArray(g.declaration) ? g.declaration : [g.declaration]).flatMap((x) => str(x).split('\n')).map((x) => decaps(str(x))).filter(Boolean)
  const shortsVideos = [...vids].filter(([, v]) => !v.secs || v.secs <= TRAILER_MAX_SECS).map(([day, v]) => ({ day, videoId: v.id, title: cleanVideoTitle(v.title) }))
  return {
    id: cfg.id, kind: 'guide', stageWord: isParts ? 'Part' : 'Week',
    title: cfg.title || titleCase(str(g.title)).replace(/\s+—\s+/, ' — ') || m.title,
    subtitle: cfg.subtitle || '', tagline: cfg.tagline || str(g.bigIdea), bigIdea: str(g.bigIdea),
    openLine: str(g.openLine), closeLine: str(g.closeLine),
    audience: 'Teens & families',
    month: MONTH_NAMES[m.month - 1], year, monthNum: m.month,
    accent: cfg.accent, accentDark: cfg.accentDark,
    themeScripture: cfg.themeScripture,
    declaration: declaration.length ? declaration : [cfg.tagline],
    weeks, channel: CHANNEL, shortsUrl: CHANNEL + '/shorts',
    calendar, episodes, sundays, shorts: [], codes, intro: null,
    shortsVideos, shortsPlaylist: null,
  }
}

function buildYear(skip) {
  if (!existsSync(YEAR)) return []
  let y
  try { y = JSON.parse(readFileSync(YEAR, 'utf8')) } catch (err) { console.warn('content: year-series.json unreadable — ' + err.message); return [] }
  const year = y.year || 2026
  return (y.months || [])
    .filter((m) => m && m.id && !skip.has(m.month))
    .map((m) => {
      const cfg = GUIDES[m.month], g = cfg && readGuide(cfg.id)
      return g ? buildGuideSeries(m, g, cfg, year) : buildLightSeries(m, year)
    })
    .filter(Boolean)
}

/* ---- run ---------------------------------------------------------------- */
const VIDEOS = join(here, 'videos.json')
const rawVideos = existsSync(VIDEOS) ? JSON.parse(readFileSync(VIDEOS, 'utf8')) : {}
// videos.json is either { "<seriesId>": {days,shorts} } or the old flat July shape.
const videosFor = (id) =>
  rawVideos[id] || (id === 'secrets-of-longevity' && rawVideos.days ? rawVideos : { days: {}, shorts: [] })

const built = SERIES.map((cfg) => buildSeries(cfg, videosFor(cfg.id))).filter(Boolean)
if (!built.length) {
  if (existsSync(OUT)) {
    console.log('content: series markdown not found; keeping committed library.json')
    process.exit(0)
  }
  console.error('content: no series markdown and no committed library.json — cannot build')
  process.exit(1)
}
// The scripted months win over a light build of the same month; then everything newest first.
built.push(...buildYear(new Set(built.map((s) => s.monthNum))))
built.sort((a, b) => b.year - a.year || b.monthNum - a.monthNum)

const library = {
  activeId: built[0].id,
  order: built.map((s) => s.id),
  series: Object.fromEntries(built.map((s) => [s.id, s])),
}
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(library))
for (const s of built) {
  const eps = Object.keys(s.episodes).length
  const gaps = s.calendar.filter((d) => d.type === 'rest').length
  console.log(
    `content: ${s.id} — ${eps} episodes, ${Object.keys(s.sundays).length} Sunday guides, ` +
    `${s.shorts.length} shorts, ${s.codes.length} code cards, ${s.calendar.length}-day calendar` +
    (gaps ? ` (${gaps} rest days)` : '')
  )
}
