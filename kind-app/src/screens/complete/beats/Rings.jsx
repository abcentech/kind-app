// Rings beat — the day's three rings in a titanium bezel, sweeping from where the day stood to where it ended.
// A radar hand makes one turn while the arcs move; each ring that closes is staged 300 ms after the last. <Ring> itself plays
// sound 'ring' (a rung higher per ring), haptic.success and its CSS star burst when an arc crosses 1, so this beat only
// schedules the value changes and adds the canvas sparkle (fx.sparks) from the onComplete hook: one sound per close, never two.
//
// Also hosts the little kit Streak.jsx shares (useBeatRun, useVp, BeatFoot): they belong to this role, not to the shell.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Counter, Label, Rings as RingSet } from '../../../ui/index.js'
import { readMs } from '../../../ui/Counter.jsx'
import { Icon } from '../../../icons.jsx'
import { fx } from '../../../fx/fx.js'
import { labels, ringCopy, toastCopy } from '../../../copy.js'

/* ── kit shared with Streak.jsx ─────────────────────────────────────────── */

/** Reads a px token ('--gutter') from :root. */
export const tokenPx = (name, fallback) => {
  if (typeof document === 'undefined') return fallback
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))
  return Number.isFinite(v) ? v : fallback
}

/** Viewport size, reactive. Beats size their hero from it (the rings need a numeric px size). */
export function useVp() {
  const read = () => (typeof window === 'undefined' ? { w: 390, h: 844 } : { w: Math.min(window.innerWidth, tokenPx('--app-max', 480)), h: window.innerHeight })
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const on = () => setVp(read())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

/**
 * The beat clock. `script(at, { advance, held })` runs on activation (and again for a replay): `at(ms, fn)` schedules a step,
 * `advance()` calls next() once. Everything is a timeout owned by the effect, so a StrictMode double mount, a replay or an unmount
 * can never fire a sound or call next() twice. `hold` goes on the beat root: a touch or focus inside the beat means the user has
 * taken over, so the auto-advance stands down (they have CONTINUE).
 */
export function useBeatRun(active, next, script, key) {
  const nextRef = useRef(next)
  nextRef.current = next
  const ended = useRef(false)
  const held = useRef(false)
  const advance = useCallback(() => {
    if (ended.current) return
    ended.current = true
    nextRef.current && nextRef.current()
  }, [])
  const scriptRef = useRef(script)
  scriptRef.current = script

  useEffect(() => {
    if (!active) return undefined
    ended.current = false
    held.current = false
    const ids = []
    const at = (ms, fn) => { ids.push(setTimeout(fn, ms)) }
    const off = scriptRef.current(at, { advance, held })
    return () => { ids.forEach(clearTimeout); if (typeof off === 'function') off() }
  }, [active, key, advance])

  const hold = useMemo(() => ({
    onPointerDownCapture: () => { held.current = true },
    onFocusCapture: () => { held.current = true },
  }), [])
  return { advance, hold, held }
}

/** The one footer both beats share: the same primary CONTINUE every Orbit-insertion beat ends on (one idiom across the sequence). */
export function BeatFoot({ onContinue, row, children }) {
  return (
    <footer className="cms-foot" data-row={row || undefined}>
      {children}
      <Button variant="primary" size="lg" full onClick={onContinue}>{labels.verbs.continue}</Button>
    </footer>
  )
}

/* ── the rings ──────────────────────────────────────────────────────────── */

const TONE = { lesson: 'ignite', xp: 'tele', right: 'go' }
const ICON = { lesson: 'book', xp: 'bolt', right: 'check' }
const SLOT = 300          // ms between one ring closing and the next (brief)
const BOOT = 450          // bezel settles, then the hand starts
const HOLD = 1300         // read time after the legend lands, before auto-advancing

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const TICKS = Array.from({ length: 60 }, (_, i) => i)

function dialSize({ w, h }) {
  const gutter = tokenPx('--gutter', 20)
  return Math.round(Math.max(190, Math.min((w - gutter * 2) / 1.2, h * 0.33, 292)))   // dial = rings x 1.2 (inset + bezel)
}

export default function Rings({ result, active = true, next }) {
  const vp = useVp()
  const size = dialSize(vp)
  const stroke = Math.round(size * 0.072)
  const gap = Math.max(3, Math.round(size * 0.024))
  const faceRef = useRef(null)

  const runKey = `${result.seriesId}|${result.day}|${result.date}|${result.time}`
  const before = result.rings.before
  const after = result.rings.after
  const closedNow = useMemo(() => new Set(result.rings.closed), [result])
  const ids = after.map((a) => a.id)
  const beforeVals = ids.map((id) => clamp01(before.find((b) => b.id === id)?.value ?? 0))
  const afterVals = after.map((a) => clamp01(a.value))
  const startClosed = () => new Set(ids.filter((id, i) => beforeVals[i] >= 1))

  const [phase, setPhase] = useState('boot')              // boot -> sweep -> done
  const [vals, setVals] = useState(beforeVals)
  const [closed, setClosed] = useState(startClosed)

  // Only rings whose arc actually moves take a slot, so a ring that sat still does not cost the others 300 ms.
  const slots = ids.map((_, i) => i).filter((i) => afterVals[i] !== beforeVals[i])
  const tween = readMs('--t-slower', 700)
  const sweep = tween + Math.max(0, slots.length - 1) * SLOT
  const doneAt = BOOT + sweep + 150

  const { advance, hold } = useBeatRun(active, next, (at, { advance: go, held }) => {
    setPhase('boot'); setVals(beforeVals); setClosed(startClosed())
    at(BOOT, () => setPhase('sweep'))
    slots.forEach((i, k) => at(BOOT + k * SLOT, () => setVals((v) => v.map((x, j) => (j === i ? afterVals[j] : x)))))
    at(doneAt, () => setPhase('done'))
    at(doneAt + HOLD, () => { if (!held.current) go() })
  }, runKey)

  const step = stroke + gap
  const onClosed = useCallback((id) => {
    setClosed((c) => new Set(c).add(id))
    const i = ids.indexOf(id)
    const f = faceRef.current
    if (i < 0 || !f) return
    const r = f.getBoundingClientRect()
    const radius = (size - stroke) / 2 - i * step
    fx.sparks({ x: r.left + r.width / 2, y: r.top + r.height / 2 - radius, n: 16, power: 0.75, spread: 110, angle: -90, colors: [TONE[id] || 'ignite'], gravity: 0.65, life: 820 })
  }, [ids.join(), size, stroke, step])

  const rings = after.map((a, i) => ({ id: a.id, value: vals[i], tone: TONE[a.id] || 'ignite', icon: ICON[a.id] || 'check', label: ringCopy(a).label }))
  const rows = after.map((a) => ({ a, c: ringCopy(a), now: closedNow.has(a.id) }))
  const allClosed = after.every((a, i) => afterVals[i] >= 1)
  const goalLine = result.goal && result.goal.justMet ? toastCopy('goalReached', { goal: result.goal.goal }).title : ''
  const spoken = phase === 'done'
    ? [...rows.filter((r) => r.now).map((r) => toastCopy('ringClosed', { ring: r.c.label }).title + '.'), ...rows.map((r) => r.c.aria), goalLine ? goalLine + '.' : ''].join(' ')
    : ''

  return (
    <section className="cms-beat" data-beat="rings" data-phase={phase} data-all={allClosed || undefined} aria-label={labels.objectives.rings} {...hold}>
      <div className="cms-main">
        <Label mono tone="tele" dot className="cms-eyebrow">{labels.objectives.rings}</Label>

        <div className="cms-dial" style={{ '--cms-size': size + 'px', '--cms-sweep': sweep + 'ms' }}>
          <div className="cms-bezel" aria-hidden="true">
            <i className="cms-pip" />
            <i className="cms-glint" />
          </div>
          <div className="cms-face" ref={faceRef}>
            <svg className="cms-ticks" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
              {TICKS.map((i) => (
                <line key={i} className="cms-tick" data-major={i % 5 === 0 || undefined} x1="50" y1={i % 5 === 0 ? 0.6 : 1.5} x2="50" y2="3.4"
                  transform={`rotate(${i * 6} 50 50)`} style={{ '--i': i }} />
              ))}
            </svg>
            <RingSet
              rings={rings} size={size} stroke={stroke} gap={gap} animate={phase !== 'boot'} stagger={false}
              label={labels.objectives.rings} onComplete={onClosed}
            >
              <span className="cms-count" aria-hidden="true">
                <Counter value={closed.size} roll animate={false} className="cms-count-n" />
                <span className="cms-count-of">/{after.length}</span>
              </span>
            </RingSet>
            <i className="cms-hand" aria-hidden="true" />
          </div>
        </div>

        <ul className="cms-legend">
          {rows.map(({ a, c, now }, i) => (
            <li key={a.id} className="cms-lg" data-tone={TONE[a.id]} data-now={now || undefined} data-done={c.done || undefined} style={{ '--i': i }}>
              <i className="cms-led" aria-hidden="true" />
              <span className="cms-lg-label">{c.label}</span>
              <span className="cms-lg-sub">{c.sub}</span>
              <span className="cms-lg-tick" aria-hidden="true">{now ? <Icon name="check" size={16} weight="solid" /> : null}</span>
            </li>
          ))}
        </ul>

        {goalLine && <Label mono tone="go" dot className="cms-goal" data-on={phase === 'done' || undefined}>{goalLine}</Label>}
        <p className="cms-sr" role="status">{spoken}</p>
      </div>
      <BeatFoot onContinue={advance} />
    </section>
  )
}
