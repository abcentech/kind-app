// complete-shell · Complete — "ORBIT INSERTION". The sequencer.
//
//   <Complete s day result onClose />   result = the finishDay object (STORE-API §9). Rendered by the lesson shell over everything.
//
// It derives the beat list with completionBeats(result) (a practice run, result.again, gets a reduced list), mounts ONE
// beat at a time from BEATS[id] on the shared <Stage>, and owns every input so beats stay dumb:
//   tap / click / Space / Enter   advance (not on a button, link or field; those keep their own taps). A beat may first
//                                 intercept the tap (Xp fast-forwards its choreography; the next tap advances).
//   Esc or SKIP                   jump to the last beat (the summary). Never past it: only CONTINUE closes.
//   a short dwell after each beat swallows the accidental double-tap that would otherwise skip an entrance.
// Beats that render nothing (or throw) are dropped from the sequence on mount, so a missing beat can never strand the player.
// The beat contract is docs/V7-WAVE2.md §2:  BeatX({ result, s, day, active, next, skip, share }).
import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useShell } from '../shell.jsx'
import { completionBeats, useStore } from '../store.js'
import { Button } from '../ui/index.js'
import { sound } from '../fx/sound.js'
import { haptic } from '../fx/haptics.js'
import { useFxLevel, useReducedMotion } from '../fx/motion.js'
import Stage, { momentFor } from './complete/Stage.jsx'
import { BEATS } from './complete/beats/index.js'

const DWELL = 450       // ms after a beat appears before a tap can advance it
const HINT = 1500       // ms before "Tap to continue" shows
const FADE = 220        // ms a leaving beat stays mounted to cross-fade out (> --t-fast)
const INTERACTIVE = 'button, a, input, textarea, select, summary, label, [role="button"], [role="slider"], [role="switch"], [data-cmp-own]'
// AUTOPLAY. Nobody has to touch the screen: each beat gets a slot, then the sequencer taps for them (through the beat's
// intercept, so a crate is opened and a card turned before the beat is left). The whole flight aims at BUDGET ms; a long
// day shares it out, but never below a beat's floor. A press-and-hold pauses (Stories rules), a sheet on top or a hidden
// tab holds it, and it stands down for reduced motion and for anyone driving with the keyboard. CONTINUE always works.
const BUDGET = 12000
const SLOT = { xp: 3500, rings: 2400, streak: 2300, shield: 2200, milestone: 2600, card: 2800, drop: 3100, rank: 2200, 'rank-up': 3400, medals: 2600, patch: 2600, month: 3600 }
const FLOOR = { xp: 3300, card: 2550, drop: 2800, 'rank-up': 2800, month: 3000, medals: 1900, patch: 2000 }
const FIRST = { drop: 550 }    // the crate opens itself early: the prize is the point
const FOLLOW = 950             // after an auto-tap a beat swallowed (it fast-forwarded), the next one comes this much later
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** The beats to play, in order: completionBeats(result), minus beats with no component; a practice run drops the rank tick. */
export function planBeats(result) {
  let ids
  try { ids = completionBeats(result) } catch (e) { console.error('[complete] bad result', e); ids = ['xp', 'actions'] }
  if (result.again) ids = ids.filter((id) => id !== 'rank')
  return ids.filter((id) => BEATS[id])
}

class Guard extends Component {
  state = { bad: false }
  static getDerivedStateFromError() { return { bad: true } }
  componentDidCatch(err) { console.error('[complete] beat failed:', this.props.id, err); this.props.onEmpty(this.props.id) }
  render() { return this.state.bad ? null : this.props.children }
}

function BeatHost({ id, active, beat, onEmpty }) {
  const Comp = BEATS[id]
  const ref = useRef(null)
  useLayoutEffect(() => { if (active && ref.current && !ref.current.firstChild) onEmpty(id) }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={ref} className="cmp-beat" data-beat={id} data-leaving={active ? undefined : ''}>
      <Guard id={id} onEmpty={onEmpty}><Comp {...beat} beat={id} active={active} /></Guard>
    </div>
  )
}

export default function Complete({ s, day, result, onClose }) {
  const shell = useShell() || {}
  const st = useStore()
  useFxLevel()                                                  // re-render if the effects level flips mid-flight

  const plan0 = useMemo(() => planBeats(result), [result])
  const [dead, setDead] = useState(() => new Set())
  const deadRef = useRef(dead)
  const plan = useMemo(() => plan0.filter((id) => !dead.has(id)), [plan0, dead])
  const planRef = useRef(plan); planRef.current = plan
  const [view, setView] = useState(() => ({ cur: plan0[0] ?? null, leaving: null }))
  const { cur, leaving } = view
  const curRef = useRef(cur); curRef.current = cur
  const lastId = plan[plan.length - 1]

  const rootRef = useRef(null)
  const dockRef = useRef(null)
  const interceptRef = useRef(null)
  const armedAt = useRef(performance.now() + DWELL)

  const advance = useCallback((from) => setView((v) => {
    if (from && from !== v.cur) return v                        // a stale call from an earlier beat: ignore (beats may call next() twice)
    const p = planRef.current
    const nx = p[Math.min(p.length - 1, p.indexOf(v.cur) + 1)]
    return !nx || nx === v.cur ? v : { cur: nx, leaving: v.cur }
  }), [])
  const skipToEnd = useCallback(() => setView((v) => {
    const p = planRef.current
    const last = p[p.length - 1]
    return last && last !== v.cur ? { cur: last, leaving: v.cur } : v
  }), [])
  const markEmpty = useCallback((id) => {
    if (deadRef.current.has(id)) return
    deadRef.current = new Set(deadRef.current).add(id)
    setDead(deadRef.current)
    setView((v) => {
      if (v.cur !== id) return v
      const alive = (x) => !deadRef.current.has(x)
      const after = plan0.slice(plan0.indexOf(id) + 1).find(alive)           // the next beat that is still in the sequence…
      const last = [...plan0].reverse().find(alive)                           // …else whatever is left (never strand the player)
      return { cur: after ?? last ?? null, leaving: null }
    })
  }, [plan0])

  /* ── cross-fade: the previous beat stays mounted for FADE ms ── */
  useEffect(() => {
    if (!leaving) return undefined
    const t = setTimeout(() => setView((v) => (v.leaving === leaving ? { ...v, leaving: null } : v)), FADE)
    return () => clearTimeout(t)
  }, [leaving])

  /* ── per-beat housekeeping: dwell guard, hint, focus ── */
  const [hintOn, setHintOn] = useState(false)
  useEffect(() => {
    armedAt.current = performance.now() + DWELL
    setHintOn(false)
    const t = setTimeout(() => setHintOn(true), HINT)
    const root = rootRef.current
    const a = document.activeElement
    if (root && (!a || a === document.body || !root.contains(a) || a.closest?.('[data-leaving]'))) root.focus({ preventScroll: true })
    return () => clearTimeout(t)
  }, [cur])

  /* ── input ── */
  // → 'held' (the beat swallowed it: a fast-forward, whose own cue is the sound), 'moved', or undefined (nothing to do)
  const tap = (auto = false) => {
    if (!auto && performance.now() < armedAt.current) return undefined
    if (interceptRef.current && interceptRef.current() === true) { if (!auto) haptic.select(); return 'held' }
    if (!curRef.current || curRef.current === planRef.current[planRef.current.length - 1]) return undefined
    if (!auto) { sound.play('next'); haptic.tap() }
    advance(curRef.current)
    return 'moved'
  }
  const tapRef = useRef(tap); tapRef.current = tap

  /* ── autoplay ── */
  const reduced = useReducedMotion()
  const manualRef = useRef(false)                               // a keyboard driver, or reduced motion: autoplay off for good
  const heldRef = useRef(false)                                 // a finger is down on the stage
  const t0 = useRef(performance.now())
  useEffect(() => {
    const p = planRef.current
    if (!cur || cur === p[p.length - 1] || reduced) return undefined
    const left = p.slice(p.indexOf(cur), -1)                      // this beat and the ones still to come (not the summary)
    const spent = performance.now() - t0.current
    const share = (BUDGET - spent) / Math.max(1, left.reduce((a, id) => a + (SLOT[id] || 2400), 0))
    const slot = Math.round(Math.max(FLOOR[cur] || 1400, Math.min(SLOT[cur] || 2400, (SLOT[cur] || 2400) * share)))
    let id = 0, early = FIRST[cur] != null
    const fire = (ms) => { id = setTimeout(() => {
      const modals = document.querySelectorAll('[aria-modal="true"]')
      const blocked = heldRef.current || document.hidden || (modals.length && modals[modals.length - 1] !== rootRef.current)
      if (manualRef.current) return
      if (blocked) { fire(600); return }
      if (tapRef.current(true) !== 'held') return
      fire(early ? Math.max(FOLLOW, slot - FIRST[cur]) : FOLLOW)   // after an early tap (the crate), let it play out to the slot
      early = false
    }, ms) }
    fire(FIRST[cur] ?? slot)
    return () => clearTimeout(id)
  }, [cur, reduced])
  const skip = () => { if (curRef.current !== planRef.current[planRef.current.length - 1]) { sound.play('close'); haptic.tap(); skipToEnd() } }
  const keyRef = useRef(null)
  keyRef.current = (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
    const root = rootRef.current
    const modals = document.querySelectorAll('[aria-modal="true"]')
    if (modals.length && modals[modals.length - 1] !== root) return           // a sheet (Share Studio) is on top: it owns the keys
    if (e.key === 'Tab' || e.key === 'Escape' || e.key === ' ' || e.key === 'Enter' || e.key.startsWith('Arrow')) manualRef.current = true
    if (e.key === 'Tab' && root) {
      const f = [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.tabIndex >= 0 && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[data-leaving]'))
      if (!f.length) { e.preventDefault(); root.focus(); return }
      const first = f[0], last = f[f.length - 1], a = document.activeElement
      if (e.shiftKey && (a === first || a === root)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus() }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); skip(); return }
    if ((e.key === ' ' || e.key === 'Enter') && !e.target?.closest?.(INTERACTIVE)) { e.preventDefault(); tap() }
  }
  useEffect(() => {
    const on = (e) => keyRef.current(e)
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  /* ── what the stage shows ── */
  const moment = useMemo(() => momentFor(result, s, day, st), [result, s, day, st.role])      // eslint-disable-line react-hooks/exhaustive-deps
  const [phase0, setPhase] = useState(() => (plan0[0] === 'xp' && !result.again && document.documentElement.dataset.fx !== 'lite' ? 'pad' : 'orbit'))
  const phase = cur === 'xp' ? phase0 : 'orbit'

  // The XP bank chip is the HUD corner. Drop XP stays unrevealed until the drop beat has been and gone (a variable reward must stay a surprise).
  const [xpBanked, setXpBanked] = useState(false)
  const before = result.rank?.from?.xp ?? 0
  const final = result.rank?.to?.xp ?? before + (result.xp?.total || 0)
  const hold = plan0.includes('drop') ? result.xp?.drop || 0 : 0
  const at = plan.indexOf(cur), atDrop = plan.indexOf('drop')
  const dropSeen = !hold || cur == null || atDrop < 0 || at > atDrop
  const banked = xpBanked || cur !== 'xp'
  const bank = { from: before, value: !banked ? before : dropSeen ? final : final - hold }

  const ctx = useMemo(() => ({
    dockRef, setPhase, holdDrop: hold > 0,
    bankDone: () => setXpBanked(true),
    intercept: (fn) => { interceptRef.current = fn; return () => { if (interceptRef.current === fn) interceptRef.current = null } },
  }), [hold])

  const share = useCallback((req) => { if (shell.share) shell.share(req); else console.log('[complete] share', req) }, [shell])
  const beatProps = { result, s, day, share, onClose }      // onClose is an extra: only the Actions beat needs it
  const hosts = []
  if (leaving && leaving !== cur) hosts.push(<BeatHost key={leaving} id={leaving} active={false} onEmpty={markEmpty} beat={{ ...beatProps, next: () => {}, skip: () => {} }} />)
  if (cur) hosts.push(<BeatHost key={cur} id={cur} active onEmpty={markEmpty} beat={{ ...beatProps, next: () => advance(cur), skip: skipToEnd }} />)

  return (
    <Stage
      rootRef={rootRef} ctx={ctx} label={`Day ${day} · ${moment.eyebrow}`} total={Math.max(1, plan.length)} index={Math.max(0, at)}
      phase={phase} beatId={cur} bank={bank} hintOn={hintOn} canSkip={!!cur && cur !== lastId} onSkip={skip}
      role="dialog" aria-modal="true" aria-label={`${moment.eyebrow}. ${moment.title}`}
      onClick={(e) => { if (!e.target.closest(INTERACTIVE)) tap() }}
      onPointerDown={() => { heldRef.current = true }}
      onPointerUp={() => { heldRef.current = false }}
      onPointerCancel={() => { heldRef.current = false }}
    >
      <div className="cmp-views" aria-live="polite">{hosts}</div>
      {!cur && <div className="cmp-beat"><Button variant="primary" full onClick={onClose}>{moment.cta || 'Continue'}</Button></div>}
    </Stage>
  )
}
