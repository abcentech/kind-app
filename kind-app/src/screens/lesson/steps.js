// lesson-shell · the flight plan. Pure: a day -> the ordered steps of one lesson, plus the little bits of bookkeeping
// that make a lesson resumable.
//
//   buildSteps(s, day)     deck leaves (minus the declare card) + the check exercises + the declare card, always last
//   withRetries(base, rs)  the same plan with recycled questions slotted in just before the declaration
//   retryOf(step)          the recycled copy of a missed exercise
//
// A step is { id, type:'card', kind, card } or { id, type:'ex', ex, retry }. Ids are unique within a lesson.
//
// The store keeps *where you were* (setPos / posFor, indices into the plan without retries). What it cannot keep is the
// running tally of the checks (xp earned, answers right on the first try, which misses are still owed a retry), and
// finishDay needs it. That lives in sessionStorage for the length of the session: a lesson closed and relaunched the
// same evening resumes exactly; one resumed after the app was killed rewinds to the first check (see Lesson.jsx).
import { deckFor } from '../../lib.js'
import { quizFor } from '../../quiz.js'

export function buildSteps(s, day) {
  const deck = deckFor(s, day)
  const declare = deck.filter((c) => c.kind === 'declare').pop() || null
  const cards = deck.filter((c) => c.kind !== 'declare').map((card) => ({ id: 'c:' + card.id, type: 'card', kind: card.kind, card }))
  let exs = []
  try { exs = quizFor(s, day) || [] } catch (err) { console.error('[kind] quizFor failed — lesson runs without checks', err) }
  const checks = exs.map((ex, i) => ({ id: 'x:' + (ex.id ?? i), type: 'ex', ex, retry: false }))
  const end = declare ? [{ id: 'c:' + declare.id, type: 'card', kind: 'declare', card: declare }] : []
  return [...cards, ...checks, ...end]
}

export const retryOf = (step) => ({ id: step.id + '~r', type: 'ex', ex: step.ex, retry: true })

/** `base` with `retries` inserted before the declaration (or at the end if the plan has none). */
export function withRetries(base, retries) {
  if (!retries.length) return base
  const last = base[base.length - 1]
  return last && last.kind === 'declare' ? [...base.slice(0, -1), ...retries, last] : [...base, ...retries]
}

/** The position the store should remember for display index `i`: indices at or past the first retry all collapse to the declaration. */
export const savedPos = (i, base) => Math.min(i, Math.max(0, base.length - 1))

/* ---- the running tally ------------------------------------------------- */
// { xp, right, seen:[exercise id], missed:[id], retried:[id] }   asked = seen.length
const key = (sid, day) => `kind-lesson:${sid}:${day}`
export const freshTally = () => ({ xp: 0, right: 0, seen: [], missed: [], retried: [] })

export function loadTally(sid, day) {
  try {
    const t = JSON.parse(sessionStorage.getItem(key(sid, day)))
    if (!t || !Array.isArray(t.seen)) return null
    const ids = (a) => (Array.isArray(a) ? a.map(String) : [])
    return { xp: Math.max(0, Number(t.xp) || 0), right: Math.max(0, Number(t.right) || 0), seen: ids(t.seen), missed: ids(t.missed), retried: ids(t.retried) }
  } catch { return null }
}
export function saveTally(sid, day, t) { try { sessionStorage.setItem(key(sid, day), JSON.stringify(t)) } catch { /* private mode: resume just rewinds */ } }
export function clearTally(sid, day) { try { sessionStorage.removeItem(key(sid, day)) } catch { /* nothing to clear */ } }

/** The retries still owed after a resume: missed on the first try, not yet answered again. */
export function pendingRetries(base, tally) {
  if (!tally) return []
  return base.filter((st) => st.type === 'ex' && tally.missed.includes(String(st.ex.id)) && !tally.retried.includes(String(st.ex.id))).map(retryOf)
}
