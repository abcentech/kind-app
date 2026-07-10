// Parses the gDx Monthly Devotional markdown into src/content/series.json.
// Usage: node scripts/build-content.mjs  (also runs automatically via npm run dev/build)
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SERIES_DIR = join(here, '..', '..', 'series', 'secrets-of-longevity')
const OUT = join(here, '..', 'src', 'content', 'series.json')

const WEEKS = [
  { f: 'FOUNDATION', title: 'Life Begins with God', emoji: '🌱', episodes: [1, 2, 3] },
  { f: 'FAITH', title: 'Strengthening the Spirit', emoji: '🛡️', episodes: [4, 5, 6, 7, 8] },
  { f: 'FOCUS', title: 'Renewing the Mind', emoji: '🧠', episodes: [9, 10, 11, 12, 13] },
  { f: 'FITNESS', title: 'Stewarding the Body', emoji: '💪', episodes: [14, 15, 16, 17, 18] },
  { f: 'FINISHING', title: 'Leaving a Legacy', emoji: '🏁', episodes: [19, 20, 21, 22, 23] },
]

// ---- markdown helpers ----------------------------------------------------
const sections = (md) => {
  const out = {}
  const parts = md.split(/\n### +/)
  for (const p of parts.slice(1)) {
    const nl = p.indexOf('\n')
    out[p.slice(0, nl).trim().replace(/[*#]+/g, '').trim()] = p.slice(nl + 1).split(/\n---/)[0].trim()
  }
  return out
}
const unquote = (s) => s.replace(/^> ?/gm, '').trim()
const firstQuote = (s) => {
  const m = s.match(/^(?:> .*\n?)+/m)
  return m ? unquote(m[0]) : ''
}
const scriptureOf = (block) => {
  const q = firstQuote(block)
  const refMatch = q.match(/[—–-]\s*([A-Z0-9][^"\n]*?)\s*$/m)
  const ref = refMatch ? refMatch[1].replace(/[*]/g, '').trim() : ''
  const text = q.replace(/[—–-]\s*[A-Z0-9][^"\n]*?\s*$/m, '').replace(/[*]/g, '').replace(/\s+/g, ' ').trim().replace(/^["“”']+|["“”']+$/g, '')
  return { text, ref }
}
const bullets = (s) =>
  s.split('\n').filter((l) => /^\s*[-•]\s/.test(l)).map((l) => l.replace(/^\s*[-•]\s*/, '').trim())
const clean = (s) => s.replace(/\n{3,}/g, '\n\n').trim()

// ---- parse an episode ------------------------------------------------------
function parseEpisode(md) {
  const num = +md.match(/^# EPISODE (\d+)/m)[1]
  const title = md.match(/^## (.+)$/m)[1].trim()
  const sec = sections(md)
  const scripture = scriptureOf(sec['Key Scripture'] || '')
  const hook = clean(sec['Hook'] || '')
  const bigIdea = unquote(firstQuote(sec['Big Idea'] || '')).replace(/[*]/g, '')
  const why = clean(sec['Why This Matters'] || '')
  const teachingPoints = [...(sec['Teaching'] || '').matchAll(/^#### \d+\. (.+)$/gm)].map((m) => m[1].trim())
  const appl = bullets((sec['Application'] || '').split(/\*\*What should I do today\?\*\*/i).pop() || '')
  const reflection = bullets(sec['Reflection Questions'] || '')
  const prayer = clean(sec['Prayer'] || '')
  const challenge = clean(sec['Weekly Challenge'] || '')
  const insight = unquote(sec['Longevity Insight'] || '')
  const talk = (md.match(/\*\*Discussion prompt:\*\*\s*(.+)/) || [])[1]?.trim() || ''
  const shortHook = (md.match(/\*\*🎯 Hook:\*\*\s*([\s\S]*?)\n\n/) || [])[1]?.replace(/\s+/g, ' ').trim() || ''
  const quote = (md.match(/\*\*Quote graphic:\*\*\s*"?(.+?)"?\s*$/m) || [])[1]?.trim() || ''
  return { num, title, scripture, hook, bigIdea, why, teachingPoints, application: appl, reflection, prayer, challenge, insight, talk, shortHook, quote }
}

function parseIntro(md) {
  const sec = sections(md)
  const scripture = scriptureOf(sec['Theme Scripture'] || '')
  return {
    title: 'The Gift of Long Life',
    scripture,
    hook: clean((sec['The Opener'] || '').split('\n\n').slice(0, 6).join('\n\n')),
    bigIdea: "God's desire is not merely that you live long — but that you live long for Him.",
    why: clean(sec["God's Vision"] || ''),
    prayer: clean(sec['Prayer'] || ''),
    talk: (md.match(/\*\*Discussion prompt:\*\*\s*(.+)/) || [])[1]?.trim() || '',
    shortHook: (md.match(/\*\*🎯 Hook:\*\*\s*([\s\S]*?)\n\n/) || [])[1]?.replace(/\s+/g, ' ').trim() || '',
  }
}

// ---- build the month calendar ---------------------------------------------
// Rule: Day 1 intro · teaching episodes per series week · one Selah after each
// week · leftover days become Review days · last day is Celebration.
function buildCalendar(totalDays) {
  const days = [{ type: 'intro' }]
  WEEKS.forEach((w, wi) => {
    w.episodes.forEach((ep) => days.push({ type: 'teaching', episode: ep, week: wi }))
    days.push({ type: 'selah', week: wi })
  })
  while (days.length < totalDays - 1) days.push({ type: 'review', week: WEEKS.length - 1 })
  while (days.length > totalDays - 1) {
    const i = days.map((d) => d.type).lastIndexOf('selah')
    days.splice(i, 1)
  }
  days.push({ type: 'celebration', week: WEEKS.length - 1 })
  return days.map((d, i) => ({ day: i + 1, ...d }))
}

// ---- run -------------------------------------------------------------------
if (!existsSync(SERIES_DIR)) {
  if (existsSync(OUT)) {
    console.log('content: series markdown not found; keeping committed series.json')
    process.exit(0)
  }
  console.error('content: no series markdown and no committed series.json — cannot build')
  process.exit(1)
}

const episodes = {}
for (const dir of readdirSync(SERIES_DIR)) {
  if (!dir.startsWith('week-')) continue
  for (const f of readdirSync(join(SERIES_DIR, dir))) {
    if (!f.startsWith('episode-')) continue
    const ep = parseEpisode(readFileSync(join(SERIES_DIR, dir, f), 'utf8'))
    episodes[ep.num] = ep
  }
}
const intro = parseIntro(readFileSync(join(SERIES_DIR, '00-introduction.md'), 'utf8'))
const year = 2026, month = 7
const totalDays = new Date(year, month, 0).getDate()

// Optional hand-maintained video map: scripts/videos.json
// { "days": { "1": "videoId", ... }, "shorts": [{ "videoId": "...", "title": "...", "day": 2 }], "shortsPlaylist": "PL..." }
const VIDEOS = join(here, 'videos.json')
const videos = existsSync(VIDEOS) ? JSON.parse(readFileSync(VIDEOS, 'utf8')) : { days: {}, shorts: [] }

const data = {
  series: {
    title: 'Secrets of Longevity',
    subtitle: 'Seven Decades of Serving God',
    month: 'July', year, monthNum: month,
    themeScripture: { text: 'With long life will I satisfy him, and shew him my salvation.', ref: 'Psalm 91:16 (KJV)' },
    treeVerse: { text: 'For as the days of a tree are the days of my people.', ref: 'Isaiah 65:22' },
    weeks: WEEKS.map(({ f, title, emoji }) => ({ f, title, emoji })),
    channel: 'https://www.youtube.com/@KidsInspiringNation',
    shortsUrl: 'https://www.youtube.com/@KidsInspiringNation/shorts',
    streamsUrl: 'https://www.youtube.com/@KidsInspiringNation/streams',
  },
  calendar: buildCalendar(totalDays).map((d) => ({ ...d, videoId: videos.days?.[d.day] || null })),
  intro,
  episodes,
  shorts: videos.shorts || [],
  shortsPlaylist: videos.shortsPlaylist || null,
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(data, null, 1))
const epCount = Object.keys(episodes).length
console.log(`content: ${epCount} episodes, ${data.calendar.length}-day calendar → src/content/series.json`)
if (epCount !== 23) console.warn(`WARNING: expected 23 episodes, found ${epCount}`)
