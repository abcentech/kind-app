// locker-core playground — the Locker in the real shell frame, HUD + dock on.
//   /playground/locker.html?seed=empty|mid|full   (re-seeds localStorage on load)   &now=2026-08-12   &fx=lite   &seg=patches|medals   &series=secrets-of-longevity
import { mountScreen } from './_shell.jsx'
import { reload } from '../src/store.js'
import { ACHIEVEMENTS } from '../src/store.js'
import { allSeries } from '../src/lib.js'
import Locker from '../src/screens/Locker.jsx'
import Hud from '../src/screens/Hud.jsx'

const q = new URLSearchParams(location.search)
const pad = (n) => String(n).padStart(2, '0')

/** A save at one of three points: empty, mid-game (a stage and a half, 14 medals, 2 unseen), everything earned. */
export function seedState(kind) {
  const base = { v: 6, onboarded: true, name: 'Ada', role: 'teen', salt: 'locker-pg' }
  if (kind === 'empty') return base
  const full = kind === 'full'
  const series = {}
  for (const s of allSeries) {
    const upto = full ? 99 : s.id === 'stewardship-code' ? 12 : 0
    const done = {}
    for (const d of s.calendar) if (d.day <= upto) done[d.day] = `2026-08-${pad(Math.min(28, d.day))}`
    series[s.id] = { done, pos: {}, notes: {}, notesAt: {}, cards: [], results: {}, drops: {} }
  }
  const ids = ACHIEVEMENTS.map((a) => a.id)
  const mid = ['preflight', 'first-launch', 'perfect-day', 'lessons-10', 'streak-3', 'streak-7', 'early-bird', 'night-owl', 'sharp-100', 'stage-1', 'relic-found', 'lessons-25', 'streak-14', 'scripture-scholar'].filter((i) => ids.includes(i))
  const have = full ? ids : mid
  const achievements = Object.fromEntries(have.map((id, i) => [id, `2026-08-${pad(2 + (i % 20))}`]))
  const achSeen = full ? ids : have.filter((id) => !['streak-7', 'stage-1'].includes(id))
  return { ...base, xp: full ? 4200 : 640, streak: full ? 31 : 12, best: full ? 31 : 12, lastDone: '2026-08-12', fragments: full ? 12 : 3, shields: 1, series, achievements, achSeen }
}

const seed = q.get('seed')
if (seed) { localStorage.setItem('kind-app-v4', JSON.stringify(seedState(seed))); reload() }
if (q.get('seg')) sessionStorage.setItem('kind-locker-seg', q.get('seg'))

mountScreen(<Locker />, { hud: Hud, dock: true, tab: 'locker' })
