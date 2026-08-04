// Parses the gDx Monthly Devotional markdown into src/content/library.json.
// Multi-series: every month in SERIES below becomes its own journey in the app.
// Usage: node scripts/build-content.mjs  (runs automatically via npm run dev/build)
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..', 'series')
const OUT = join(here, '..', 'src', 'content', 'library.json')

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
    accent: '#c8901f',
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
    accent: '#2e7d4f',
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
    month: cfg.month, year: cfg.year, monthNum: cfg.monthNum, accent: cfg.accent,
    themeScripture: cfg.themeScripture, declaration: cfg.declaration,
    weeks: cfg.weeks.map(({ f, title, emoji, question, passage }) => ({ f, title, emoji, question: question || '', passage: passage || '' })),
    channel: CHANNEL,
    shortsUrl: CHANNEL + '/shorts',
    calendar, episodes, sundays, shorts, codes, intro,
    shortsVideos: videos.shorts || [],
    shortsPlaylist: videos.shortsPlaylist || null,
  }
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
