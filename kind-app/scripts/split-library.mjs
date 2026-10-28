// Splits src/content/library.json into a small "core" (everything the first screens paint with) and a per-series "heavy"
// payload (lesson bodies, short bodies, Sunday guides) that the app fetches in parallel with first paint and awaits before a
// lesson / the reel opens. Also precomputes lesson minutes and step counts so the Launch Bar is identical before and after
// the heavy chunk lands. Used by vite.config.js (kindContent); Node-side tests keep importing the full JSON untouched.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const EP_HEAVY = ['points', 'supporting', 'illustration', 'challenge', 'prayer', 'declaration', 'transition', 'questions', 'apply', 'talk']
const GUIDE_HEAVY = ['truth', 'hook', 'scripture', 'mirrors', 'christ', 'rhyme', 'code', 'quiz', 'commission']
const SUN_LIGHT = ['n', 'date', 'title']
const SHORT_LIGHT = ['n', 'title', 'hook']

const pick = (o, keep) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => keep.includes(k)))
const omit = (o, drop) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !drop.includes(k)))

/** Lesson minutes + deck length per day, computed by the real lib.js in a child process (it needs the JSON loader node lacks). */
export function lessonMeta() {
  const out = execFileSync(process.execPath, [fileURLToPath(new URL('./lesson-meta.mjs', import.meta.url))], { encoding: 'utf8', maxBuffer: 1 << 24 })
  return JSON.parse(out.trim().split('\n').pop())
}

/**
 * The core ships in the main bundle, so fields the app can re-derive are dropped from it when (and only when) they equal the
 * derived value; src/lib.js `inflate` puts them back at import. Must stay in step with that function.
 */
export function compactSeries(s) {
  const eps = s.episodes || {}
  const cal = new Map((s.calendar || []).map((d) => [d.day, d]))
  const calendar = (s.calendar || []).map((d) => (d.videoId === null ? omit(d, ['videoId']) : d))
  const episodes = Object.fromEntries(Object.entries(eps).map(([k, e]) => [k, omit(e, [e.num === +k && 'num', e.date === +k && 'date'].filter(Boolean))]))
  const codes = (s.codes || []).map((c, i) => omit(c, [
    c.no === i + 1 && 'no', c.rare === ((i + 1) % 7 === 0) && 'rare', c.episode === c.day && 'episode',
    c.week === (cal.get(c.day)?.week ?? 0) && 'week', eps[c.episode]?.title === c.title && 'title',
  ].filter(Boolean)))
  return { ...s, calendar, episodes, codes }
}

export function splitLibrary(libFile) {
  const lib = JSON.parse(readFileSync(libFile, 'utf8'))
  const meta = lessonMeta()
  const core = { activeId: lib.activeId, order: lib.order, series: {} }
  const heavy = {}
  for (const [id, s] of Object.entries(lib.series)) {
    const eps = Object.entries(s.episodes || {})
    // A light series' truth is its code-card line word for word: the core keeps it once (codes), the lesson chunk the rest.
    // A guide series (Sep/Oct) also keeps its long-form fields and quiz in the chunk; its card line is codes[].line.
    const heavyKeys = s.kind === 'light' ? [...EP_HEAVY, 'truth'] : s.kind === 'guide' ? [...EP_HEAVY, ...GUIDE_HEAVY] : EP_HEAVY
    const lean = compactSeries({ ...s, episodes: Object.fromEntries(eps.map(([k, e]) => [k, omit(e, heavyKeys)])) })
    core.series[id] = {
      ...omit(lean, ['sundays', 'shorts']),
      sundays: Object.fromEntries(Object.entries(s.sundays || {}).map(([k, u]) => [k, pick(u, SUN_LIGHT)])),
      shorts: (s.shorts || []).map((x) => pick(x, SHORT_LIGHT)),
      meta: meta[id],
    }
    heavy[id] = {
      episodes: Object.fromEntries(eps.map(([k, e]) => [k, pick(e, heavyKeys)])),
      sundays: Object.fromEntries(Object.entries(s.sundays || {}).map(([k, u]) => [k, omit(u, SUN_LIGHT)])),
      shorts: (s.shorts || []).map((x) => omit(x, SHORT_LIGHT)),
    }
  }
  return { core, heavy }
}
