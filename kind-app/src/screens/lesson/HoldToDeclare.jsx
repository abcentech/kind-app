// HoldToDeclare — the lesson's holiest control. Press and hold ~1.4 s: the ring fills with ignition light, a haptic ramp
// builds under the finger, and on the last tick the declaration is lit (that part lives in slides/Declare.jsx).
//
//   <HoldToDeclare done holdable plain hint duration onDeclare onAttempt onProgress />
//     done        the declaration is already made (ring full, caption "Declared", inert)
//     holdable    false → the dial is decoration and only the plain button declares (reduced motion)
//     plain       also show the plain "I declare it" button (after failed attempts, or reduced motion)
//     hint        the quiet line under the dial (a readout takes its place while you hold)
//     onDeclare({ source })  'hold' | 'plain' | 'assist'     fires once; sparks + haptic.success are already spent
//     onAttempt({ progress, ms })   a release before the ring closed (never punitive: the fill springs home)
//     onProgress(p)               every frame while it moves, 0..1 (Declare warms the dim lines with it)
//
// Input: pointer (mouse + touch, captured), and Space / Enter held on the keyboard. A `click` that arrives with no pointer or
// key press before it is an assistive-tech activation (a screen reader's double-tap has no "hold"), so it declares at once.
// Progress is read off performance.now(), not counted per frame, so a dropped frame never costs the user time.
// Everything that moves is written straight to the DOM (CSS var + SVG dash), never through React state.
import { useEffect, useId, useRef } from 'react'
import { Icon } from '../../icons.jsx'
import { Button } from '../../ui/index.js'
import { haptic } from '../../fx/haptics.js'
import { sound } from '../../fx/sound.js'
import { fx } from '../../fx/fx.js'
import { lessonCopy } from '../../copy.js'

export const HOLD_MS = 1400

// UI strings the control owns until copy.js grows slots for them (see REQUESTS in the report).
const T = {
  cap: 'Hold to declare',
  done: 'Declared',
  readout: 'Ignition',
  assist: 'Press and hold the button, or hold Space or Enter. With a screen reader, activate it once to declare.',
}

/* ── remembered declarations: "declared" survives swiping away and back, within one lesson sitting ── */
const MEM = new Map()
const SS_KEY = 'kind-declared'
const TTL = 45 * 60 * 1000        // a lesson is ~6 min; a replay later the same day must be earned again
const readSS = () => { try { return JSON.parse(sessionStorage.getItem(SS_KEY) || '{}') } catch { return {} } }
export function wasDeclared(key) {
  const at = MEM.get(key) ?? readSS()[key]
  return typeof at === 'number' && Date.now() - at < TTL
}
export function markDeclared(key) {
  const at = Date.now()
  MEM.set(key, at)
  try { const o = readSS(); o[key] = at; sessionStorage.setItem(SS_KEY, JSON.stringify(o)) } catch { /* private mode */ }
}
/** The lesson shell may call this after finishDay so a later replay starts un-declared. */
export function clearDeclared(key) {
  MEM.delete(key)
  try { const o = readSS(); delete o[key]; sessionStorage.setItem(SS_KEY, JSON.stringify(o)) } catch { /* private mode */ }
}

/* ── geometry (viewBox units, 160 square) ── */
const C = 80, R = 54, STROKE = 9
const TICKS = 60, SEGS = 48
const f2 = (n) => +n.toFixed(2)
const f4 = (n) => +n.toFixed(4)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const polar = (r, deg) => [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)]
const arc = (a1, a2) => {
  const [x1, y1] = polar(R, a1), [x2, y2] = polar(R, a2)
  return `M${f2(x1)} ${f2(y1)}A${R} ${R} 0 0 1 ${f2(x2)} ${f2(y2)}`
}
// ignition gradient along the sweep: ember → orange → gold (SVG has no conic gradient, so 48 coloured arcs under one dash mask)
const hue = (f) => (f < 0.5
  ? `color-mix(in oklab, var(--ignite-1) ${f2((1 - f * 2) * 100)}%, var(--ignite-2))`
  : `color-mix(in oklab, var(--ignite-2) ${f2((1 - (f - 0.5) * 2) * 100)}%, var(--ignite-3))`)

const SEG_NODES = Array.from({ length: SEGS }, (_, i) => (
  <path
    key={i} d={arc(-90 + (360 * i) / SEGS - 0.8, -90 + (360 * (i + 1)) / SEGS + 0.8)} fill="none" strokeWidth={STROKE + 1.5}
    style={{ stroke: hue((i + 0.5) / SEGS) }}
  />
))
const TICK_BASE = [], TICK_LIT = []
for (let i = 0; i < TICKS; i++) {
  const a = -90 + (360 * i) / TICKS, major = i % 5 === 0
  const [x1, y1] = polar(major ? 62.5 : 65.5, a), [x2, y2] = polar(71, a)
  const d = { x1: f2(x1), y1: f2(y1), x2: f2(x2), y2: f2(y2) }
  TICK_BASE.push(<line key={i} {...d} className="sld-tick" data-major={major ? '' : undefined} />)
  TICK_LIT.push(<line key={i} {...d} className="sld-tick-lit" style={{ stroke: hue(i / TICKS) }} />)
}

/** Android pattern for the remaining hold: pulses lengthen 10→40 ms while the gaps close 120→24 ms (an engine spooling up). */
function ramp(p0, dur) {
  const out = []
  let t = 0
  const total = (1 - p0) * dur
  while (t < total - 40) {
    const q = p0 + t / dur
    const on = Math.round(10 + q * 30), off = Math.round(120 - q * 96)
    out.push(on, off)
    t += on + off
  }
  return out.length ? out : [10]
}

export default function HoldToDeclare({
  done = false, holdable = true, plain = false, hint, duration = HOLD_MS,
  onDeclare, onAttempt, onProgress, className = '',
}) {
  const uid = 'h' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const N = useRef({})
  const E = useRef({ p: 0, v: 0, holding: false, done: false, t0: 0, last: 0, raf: 0, step: 0, src: '', pressAt: 0, seen: false, pct: -1 })
  const cb = useRef({})
  cb.current = { onDeclare, onAttempt, onProgress, duration, holdable }

  const paint = (p) => {
    const n = N.current
    if (!n.root) return
    n.root.style.setProperty('--sld-p', String(f4(p)))
    const dash = `${f2(p * 100)} 100`
    n.arc.style.strokeDasharray = dash
    n.arc.style.visibility = p < 0.003 ? 'hidden' : 'visible'
    const lit = Math.ceil(p * TICKS - 1e-6)                  // ticks light one at a time, like a gauge
    n.ticks.style.strokeDasharray = `${lit <= 0 ? 0 : lit >= TICKS ? 100 : f2(((lit - 0.5) * 100) / TICKS)} 100`
    n.head.style.transform = `rotate(${f2(p * 360)}deg)`
    n.head.style.visibility = p < 0.003 ? 'hidden' : 'visible'
    n.headDot.style.fill = `color-mix(in oklab, ${hue(p)} 86%, var(--ink))`
    const pct = Math.round(p * 100)
    if (pct !== E.current.pct && n.read) { E.current.pct = pct; n.read.textContent = `${T.readout} ${String(pct).padStart(3, '0')}%` }
    cb.current.onProgress && cb.current.onProgress(p)
  }

  const finish = (src) => {
    const e = E.current, n = N.current
    if (e.done) return
    e.done = true; e.holding = false; e.p = 1; e.v = 0
    if (n.root) n.root.removeAttribute('data-hold')
    paint(1)
    haptic.cancel()
    haptic.success()
    if (n.dial) { n.dial.removeAttribute('data-pop'); void n.dial.getBoundingClientRect(); n.dial.setAttribute('data-pop', '') }
    const at = fx.at(n.dial)
    fx.sparks({ ...at, n: 32, power: 1.05, spread: 360, gravity: 0.55 })
    fx.shockwave({ ...at, color: 'ignite', size: 240, ms: 640, width: 1.5 })
    cb.current.onDeclare && cb.current.onDeclare({ source: src })
  }

  const frame = (now) => {
    const e = E.current
    e.raf = 0
    if (e.holding) {
      const p = clamp((now - e.t0) / cb.current.duration, 0, 1)
      e.p = p
      paint(p)
      const st = Math.floor(p * 10)                          // a detent click per tenth: the ring ratchets up the scale
      if (st > e.step && st < 10) { e.step = st; sound.play('detent', { step: st - 1, gain: 0.7 }) }
      if (p >= 1) { finish('hold'); return }
    } else {
      // released early: a lightly-damped spring carries the fill home (a touch of the finger's momentum first)
      const dt = clamp((now - e.last) / 1000, 0.001, 0.034)
      const k = 170, c = 2 * 0.9 * Math.sqrt(k)
      e.v += (-k * e.p - c * e.v) * dt
      e.p = Math.min(e.p + e.v * dt, 0.995)
      if (e.p <= 0) { e.p = 0; e.v = 0 }
      paint(e.p)
      if (e.p < 0.0008 && Math.abs(e.v) < 0.02) { e.p = 0; e.v = 0; paint(0); return }
    }
    e.last = now
    e.raf = requestAnimationFrame(frame)
  }
  const kick = () => { if (!E.current.raf) E.current.raf = requestAnimationFrame(frame) }

  const press = (src) => {
    const e = E.current
    if (e.holding || e.done || !cb.current.holdable) return
    e.holding = true; e.src = src; e.seen = true
    e.pressAt = performance.now()
    e.t0 = e.pressAt - e.p * cb.current.duration            // pressing again mid-spring resumes from where the fill is
    e.step = Math.floor(e.p * 10)
    if (N.current.root) N.current.root.setAttribute('data-hold', '')
    sound.play('tap', { gain: 0.8 })
    haptic.pattern(ramp(e.p, cb.current.duration))
    kick()
  }

  const release = () => {
    const e = E.current
    if (!e.holding) return
    e.holding = false
    const ms = performance.now() - e.pressAt
    haptic.cancel()
    if (N.current.root) N.current.root.removeAttribute('data-hold')
    e.last = performance.now(); e.v = 0.3
    setTimeout(() => { e.seen = false }, 80)                // the click that follows a real press is not an assistive activation
    cb.current.onAttempt && cb.current.onAttempt({ progress: e.p, ms })
    kick()
  }

  useEffect(() => {
    const e = E.current
    if (done && !e.done) { e.done = true; e.holding = false; e.p = 1; e.v = 0; paint(1) }
    else if (!done && e.done) { e.done = false; e.p = 0; paint(0) }
    else if (!done && !e.holding && !e.raf) paint(e.p)
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    const e = E.current
    if (e.raf) cancelAnimationFrame(e.raf)
    e.raf = 0
    if (e.holding) { e.holding = false; haptic.cancel() }
  }, [])

  const keyIsHold = (ev) => ev.key === ' ' || ev.key === 'Enter' || ev.code === 'Space'
  const live = holdable && !done
  const handlers = live ? {
    onPointerDown: (ev) => {
      if ((ev.pointerType === 'mouse' && ev.button !== 0) || ev.isPrimary === false) return
      ev.stopPropagation()                                  // the shell's swipe must not take this finger
      try { ev.currentTarget.setPointerCapture(ev.pointerId) } catch { /* synthetic pointer */ }
      press('pointer')
    },
    onPointerUp: () => release(),
    onPointerCancel: () => release(),
    onLostPointerCapture: () => release(),
    onKeyDown: (ev) => {
      if (!keyIsHold(ev)) return
      ev.preventDefault(); ev.stopPropagation()             // the shell binds Enter/Space to Continue; here they mean "hold"
      if (!ev.repeat) press('key')
    },
    onKeyUp: (ev) => {
      if (!keyIsHold(ev)) return
      ev.preventDefault(); ev.stopPropagation()
      if (E.current.src === 'key') release()
    },
    onBlur: () => release(),
    onClick: () => { if (!E.current.seen && !E.current.done) finish('assist') },
    onContextMenu: (ev) => ev.preventDefault(),
    onDragStart: (ev) => ev.preventDefault(),
  } : { onContextMenu: (ev) => ev.preventDefault() }

  const dial = (
    <>
      <span className="sld-bloom" aria-hidden="true" />
      <svg className="sld-svg" viewBox="0 0 160 160" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${uid}-ti`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--ti-1)' }} />
            <stop offset=".42" style={{ stopColor: 'var(--ti-3)' }} />
            <stop offset=".62" style={{ stopColor: 'var(--ti-4)' }} />
            <stop offset="1" style={{ stopColor: 'var(--ti-2)' }} />
          </linearGradient>
          <radialGradient id={`${uid}-face`} cx=".5" cy=".3" r=".85">
            <stop offset="0" style={{ stopColor: 'var(--carbon-4)' }} />
            <stop offset=".6" style={{ stopColor: 'var(--carbon-2)' }} />
            <stop offset="1" style={{ stopColor: 'var(--carbon-1)' }} />
          </radialGradient>
          <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--rim-hi)' }} />
            <stop offset=".5" style={{ stopColor: 'var(--rim-lo)' }} />
            <stop offset="1" style={{ stopColor: 'var(--line)' }} />
          </linearGradient>
          <radialGradient id={`${uid}-warm`} cx=".5" cy=".55" r=".6">
            <stop offset="0" style={{ stopColor: 'var(--ignite-glow)' }} />
            <stop offset="1" style={{ stopColor: 'var(--ignite-wash)' }} />
          </radialGradient>
          <g id={`${uid}-segs`}>{SEG_NODES}</g>
          <mask id={`${uid}-arc`} maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
            <circle
              ref={(el) => { N.current.arc = el }} cx={C} cy={C} r={R} pathLength="100" fill="none" stroke="white"
              strokeWidth={STROKE} strokeLinecap="round" transform={`rotate(-90 ${C} ${C})`} style={{ strokeDasharray: '0 100', visibility: 'hidden' }}
            />
          </mask>
          <mask id={`${uid}-tk`} maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
            <circle
              ref={(el) => { N.current.ticks = el }} cx={C} cy={C} r="67" pathLength="100" fill="none" stroke="white"
              strokeWidth="18" transform={`rotate(-90 ${C} ${C})`} style={{ strokeDasharray: '0 100' }}
            />
          </mask>
        </defs>

        <circle cx={C} cy={C} r="78" className="sld-bezel" fill="none" stroke={`url(#${uid}-ti)`} strokeWidth="1.6" />
        <g>{TICK_BASE}</g>
        <g mask={`url(#${uid}-tk)`} className="sld-ticks-lit">{TICK_LIT}</g>

        <circle cx={C} cy={C} r={R} className="sld-groove" fill="none" strokeWidth={STROKE} />
        <circle cx={C} cy={C} r={R + STROKE / 2 + 0.5} className="sld-groove-rim" fill="none" strokeWidth="1" />
        <circle cx={C} cy={C} r={R - STROKE / 2 - 0.5} className="sld-groove-rim" fill="none" strokeWidth="1" />
        <g mask={`url(#${uid}-arc)`}>
          <g className="sld-glow" style={{ filter: 'blur(4px)' }}><use href={`#${uid}-segs`} /></g>
          <use href={`#${uid}-segs`} />
          <circle cx={C} cy={C - R} r={STROKE / 2 + 0.4} className="sld-arc-start" />
        </g>
        <g ref={(el) => { N.current.head = el }} style={{ transformOrigin: `${C}px ${C}px`, visibility: 'hidden' }}>
          <circle cx={C} cy={C - R} r="8" className="sld-head-bloom" style={{ filter: 'blur(3.5px)' }} />
          <circle ref={(el) => { N.current.headDot = el }} cx={C} cy={C - R} r={STROKE / 2} />
        </g>

        <g className="sld-face">
          <circle cx={C} cy={C} r="43" fill={`url(#${uid}-face)`} />
          <circle cx={C} cy={C} r="43" className="sld-warm" fill={`url(#${uid}-warm)`} />
          <circle cx={C} cy={C} r="42.5" fill="none" stroke={`url(#${uid}-rim)`} strokeWidth="1" />
          <ellipse cx={C} cy="52" rx="26" ry="9" className="sld-sheen" />
        </g>
      </svg>
      <span className="sld-icon" aria-hidden="true"><Icon name="flame" size={32} weight="solid" /></span>
    </>
  )

  return (
    <div
      ref={(el) => { N.current.root = el }} className={'sld-ctl ' + className}
      data-done={done ? '' : undefined} data-holdable={holdable ? '' : undefined}
    >
      {holdable ? (
        <button
          type="button" className="sld-hold" aria-describedby={`${uid}-d`} aria-disabled={done ? 'true' : undefined}
          aria-keyshortcuts="Space Enter" data-noswipe="" {...handlers}
        >
          <span className="sld-dial" ref={(el) => { N.current.dial = el }}>{dial}</span>
          <span className="sld-cap">{done ? T.done : T.cap}</span>
        </button>
      ) : (
        <div className="sld-hold" aria-hidden="true" {...handlers}>
          <span className="sld-dial" ref={(el) => { N.current.dial = el }}>{dial}</span>
        </div>
      )}
      <span id={`${uid}-d`} className="sld-sr">{T.assist}</span>
      <div className="sld-hint-wrap" aria-hidden={done ? 'true' : undefined}>
        <p className="sld-hint">{done ? '' : hint}</p>
        <p className="sld-read" aria-hidden="true" ref={(el) => { N.current.read = el }} />
      </div>
      {plain && !done ? (
        <Button className="sld-plain" variant="primary" size="lg" silent onClick={() => finish('plain')}>
          {lessonCopy.cta.declare}
        </Button>
      ) : null}
    </div>
  )
}
