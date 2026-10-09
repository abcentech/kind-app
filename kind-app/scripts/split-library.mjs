// Splits src/content/library.json into a small "core" (everything the first screens paint with) and a per-series "heavy"
// payload (lesson bodies, short bodies, Sunday guides) that the app fetches in parallel with first paint and awaits before a
// lesson / the reel opens. Also precomputes lesson minutes and step counts so the Launch Bar is identical before and after
// the heavy chunk lands. Used by vite.config.js (kindContent); Node-side tests keep importing the full JSON untouched.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const EP_HEAVY = ['points', 'supporting', 'illustration', 'challenge', 'prayer', 'declaration', 'transition', 'questions', 'apply', 'talk']
const SUN_LIGHT = ['n', 'date', 'title']
const SHORT_LIGHT = ['n', 'title', 'hook']

const pick = (o, keep) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => keep.includes(k)))
const omit = (o, drop) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !drop.includes(k)))

/** Lesson minutes + deck length per day, computed by the real lib.js in a child process (it needs the JSON loader node lacks). */
export function lessonMeta() {
  const out = execFileSync(process.execPath, [fileURLToPath(new URL('./lesson-meta.mjs', import.meta.url))], { encoding: 'utf8', maxBuffer: 1 << 24 })
  return JSON.parse(out.trim().split('\n').pop())
}

export function splitLibrary(libFile) {
  const lib = JSON.parse(readFileSync(libFile, 'utf8'))
  const meta = lessonMeta()
  const core = { activeId: lib.activeId, order: lib.order, series: {} }
  const heavy = {}
  for (const [id, s] of Object.entries(lib.series)) {
    const eps = Object.entries(s.episodes || {})
    core.series[id] = {
      ...omit(s, ['episodes', 'sundays', 'shorts']),
      episodes: Object.fromEntries(eps.map(([k, e]) => [k, omit(e, EP_HEAVY)])),
      sundays: Object.fromEntries(Object.entries(s.sundays || {}).map(([k, u]) => [k, pick(u, SUN_LIGHT)])),
      shorts: (s.shorts || []).map((x) => pick(x, SHORT_LIGHT)),
      meta: meta[id],
    }
    heavy[id] = {
      episodes: Object.fromEntries(eps.map(([k, e]) => [k, pick(e, EP_HEAVY)])),
      sundays: Object.fromEntries(Object.entries(s.sundays || {}).map(([k, u]) => [k, omit(u, SUN_LIGHT)])),
      shorts: (s.shorts || []).map((x) => omit(x, SHORT_LIGHT)),
    }
  }
  return { core, heavy }
}
