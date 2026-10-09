// Ignition — the cold-open splash.   <Ignition first onDone />
//
// first=true   Black stage, a 60-tick instrument ring (dormant) and, at its centre, a hex START button under a hinged
//              smoked-glass guard. Tap 1 lifts the guard (it folds down into the open gap of the 270° dial). Tap 2 presses the
//              button: sound.unlock() + sound.play('splash'), haptic.heavy, the needle sweeps to redline and settles, the ring
//              lights tick by tick, K I N D tracks in from wide to tight, an ember pops, the tagline fades in, onDone().
//              Audio can only start on a gesture, so the press IS the gesture. Keyboard: Enter / Space lifts, then presses.
// first=false  ~0.6 s, silent, no interaction: the wordmark and a faint ring fade in and out, then onDone().
// lite/reduced A clean 300 ms fade of <Mark>. First run still asks for one tap (a plain START) so audio can unlock.
//
// Timing is derived, not declared: the needle, wordmark and ember land on sound.marks('splash') (the same numbers the synth
// schedules from); every other duration is a token read at runtime. The needle and the tick lighting are written imperatively
// from ONE tween, so there are no React renders in the frame path and the ring can never drift from the needle.
// Not a Router screen: App mounts it before any context exists, so it reads nothing from useShell().
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Mark, Wordmark, Starfield } from '../art/index.js'
import { Button } from '../ui/index.js'
import { readEase, readMs, tween } from '../ui/Counter.jsx'
import { sound } from '../fx/sound.js'
import { haptic } from '../fx/haptics.js'
import { fx } from '../fx/fx.js'
import { stagger, useFxLevel, useReducedMotion } from '../fx/motion.js'
import { onboardCopy } from '../copy.js'

// Strings copy.js does not own (the control legends). The tagline, letters and aria label come from onboardCopy.splash.
const COPY = {
  lift: 'Lift cover',
  start: 'Start',
  prompt: ['LIFT COVER', 'PRESS TO START'],
  state: { idle: 'STANDBY', open: 'ARMED', firing: 'IGNITION', done: 'NOMINAL' },
  say: { idle: '', open: 'Cover lifted. Press start.', firing: 'Ignition.', done: 'Systems nominal.' },
}
const SPLASH = onboardCopy.splash
const MARKS_FALLBACK = { redline: 0.86, wordmark: 0.78, ember: 1.04 }   // used only if the sound module cannot say

/* ── geometry ────────────────────────────────────────────────────────────── */
const N = 60, A0 = 135, SPAN = 270            // 60 ticks across a 270° dial that opens at the bottom
const RED = 50                                // redline zone: ticks 50..59
const REST = 0.5                              // the needle settles pointing straight up
const R_OUT = 92
const rad = (d) => (d * Math.PI) / 180
const pt = (r, deg) => [100 + r * Math.cos(rad(deg)), 100 + r * Math.sin(rad(deg))]
const f2 = (n) => +n.toFixed(2)
const arcPath = (r, a1, a2) => {
  const [x1, y1] = pt(r, a1), [x2, y2] = pt(r, a2)
  return `M${f2(x1)} ${f2(y1)}A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${f2(x2)} ${f2(y2)}`
}
const TICKS = Array.from({ length: N }, (_, i) => {
  const f = i / (N - 1), a = A0 + SPAN * f, major = i % 10 === 0 || i === N - 1
  const [x1, y1] = pt(R_OUT, a), [x2, y2] = pt(R_OUT - (major ? 9 : 4.5), a)
  return { i, major, x1: f2(x1), y1: f2(y1), x2: f2(x2), y2: f2(y2), f1: f2(Math.min(1, f * 2)), f2: f2(Math.max(0, f * 2 - 1)) }
})
const ARC = { track: arcPath(96.5, A0, A0 + SPAN), red: arcPath(96.5, A0 + (SPAN * RED) / (N - 1), A0 + SPAN) }

// hub: a flat-top hexagon (flat edges top and bottom, so the guard can hinge on the bottom one), viewBox 140 × 121.24
const HW = 140, HH = 121.24, CX = 70, CY = 60.62
const hexPts = (a) => {
  const R = a / 0.8660254
  return [[CX + R, CY], [CX + R / 2, CY + a], [CX - R / 2, CY + a], [CX - R, CY], [CX - R / 2, CY - a], [CX + R / 2, CY - a]]
    .map((p) => p.map(f2).join(',')).join(' ')
}
const HEX = { rim: hexPts(60.62), rimIn: hexPts(59.7), step: hexPts(56), stepIn: hexPts(55.3), well: hexPts(51.6), wellIn: hexPts(51), arm: hexPts(48.6),
  face: hexPts(45.5), faceIn: hexPts(45.1), engrave: hexPts(37.5), lid: hexPts(57.5), lidIn: hexPts(54.6), lidBack: hexPts(50) }
const SHEEN = (() => {
  const a = 44, R = a / 0.8660254
  return `M${f2(CX - R)} ${CY} L${f2(CX - R / 2)} ${f2(CY - a)} L${f2(CX + R / 2)} ${f2(CY - a)} L${f2(CX + R)} ${CY} Q${CX} ${f2(CY + 11)} ${f2(CX - R)} ${CY} Z`
})()
const SCREWS = (() => { const a = 57.8, R = a / 0.8660254; return [[CX + R, CY], [CX - R, CY], [CX + R / 2, CY + a], [CX - R / 2, CY + a], [CX + R / 2, CY - a], [CX - R / 2, CY - a]] })()

/* ── hooks ───────────────────────────────────────────────────────────────── */
function useLite() {
  const level = useFxLevel(), reduced = useReducedMotion()
  return level === 'lite' || reduced || (typeof document !== 'undefined' && document.documentElement.dataset.fx === 'lite')
}
/** onDone behind a latch: a double tap, a StrictMode remount or a late timer can never call it twice. */
function useDone(onDone) {
  const cb = useRef(onDone)
  cb.current = onDone
  const fired = useRef(false)
  return useCallback(() => { if (fired.current) return; fired.current = true; if (cb.current) cb.current() }, [])
}
/** Enter / Space anywhere that is not itself a control: advance the sequence (lift, then press). */
function useAdvanceKey(advance) {
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key !== 'Enter' && e.key !== ' ') || e.repeat || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.target instanceof Element && e.target.closest('button, a, input, textarea, select, [role="button"]')) return
      e.preventDefault()
      advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance])
}
const noop = () => {}                                  // a touchstart listener makes :active fire on iOS Safari
const tagline = () => { const [pre, post] = SPLASH.tagline.split('goDs'); return <p className="ign-tag">{pre}<b>goDs</b>{post}</p> }
const uid = (raw) => 'ign' + String(raw).replace(/[^a-zA-Z0-9]/g, '')

/* ── the dial ────────────────────────────────────────────────────────────── */
function Dial({ id, live, r, still }) {
  return (
    <svg className={'ign-ring' + (still ? ' ign-ring--still' : '')} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id + 'n'} gradientUnits="userSpaceOnUse" x1="112" y1="0" x2="182" y2="0">
          <stop className="ign-st-ig1" offset="0" /><stop className="ign-st-ig2" offset=".55" /><stop className="ign-st-ig3" offset="1" />
        </linearGradient>
      </defs>
      <path className="ign-track" d={ARC.track} />
      <path className="ign-red" ref={live ? (el) => { r.red = el } : undefined} d={ARC.red} />
      <g>
        {TICKS.map((t) => (
          <line key={t.i} className="ign-d" data-major={t.major ? '' : undefined} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} style={still ? undefined : stagger(t.i, 11, 80)} />
        ))}
      </g>
      {live && (
        <>
          <g className="ign-lit">
            {TICKS.map((t) => (
              <line key={t.i} ref={(el) => { r.ticks[t.i] = el }} className="ign-l" data-l="0" data-major={t.major ? '' : undefined}
                x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} style={{ '--f1': t.f1, '--f2': t.f2 }} />
            ))}
          </g>
          <g className="ign-needle" ref={(el) => { r.needle = el }} style={{ transform: `rotate(${A0}deg)` }}>
            <path className="ign-nc" d="M86 99.2L112 98.4L178 99.55L181 100L112 100L86 100Z" />
            <path className="ign-nc ign-nc--lo" d="M86 100.8L112 101.6L178 100.45L181 100L112 100L86 100Z" />
            <g className="ign-nh">
              <path d="M86 99.2L112 98.4L178 99.55L181 100L112 100L86 100Z" fill={`url(#${id}n)`} />
              <path className="ign-nh--lo" d="M86 100.8L112 101.6L178 100.45L181 100L112 100L86 100Z" fill={`url(#${id}n)`} />
            </g>
          </g>
        </>
      )}
    </svg>
  )
}

/* ── the hardware ────────────────────────────────────────────────────────── */
const Stops = ({ list }) => list.map(([c, o, a], i) => <stop key={i} className={'ign-st-' + c} offset={o} stopOpacity={a} />)

function Bezel({ id }) {
  const u = (s) => `url(#${id}${s})`
  return (
    <svg className="ign-bezel" viewBox={`0 0 ${HW} ${HH}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id + 'a'} x1="0" y1="0" x2="0" y2="1"><Stops list={[['ti1', 0], ['ti2', .34], ['ti4', .66], ['ti3', 1]]} /></linearGradient>
        <linearGradient id={id + 'b'} x1="0" y1="0" x2="0" y2="1"><Stops list={[['ti4', 0], ['c3', 1]]} /></linearGradient>
        <linearGradient id={id + 'e'} x1="0" y1="0" x2="0" y2="1"><Stops list={[['ink', 0, .8], ['ink', .45, 0], ['void', 1, .7]]} /></linearGradient>
        <linearGradient id={id + 's'} x1="0" y1="0" x2="0" y2="1"><Stops list={[['void', 0, .9], ['void', .55, 0], ['ti1', 1, .28]]} /></linearGradient>
        <radialGradient id={id + 'w'} cx=".5" cy=".3" r=".75"><Stops list={[['c2', 0], ['void', 1]]} /></radialGradient>
      </defs>
      <polygon points={HEX.rim} fill={u('a')} />
      <polygon points={HEX.rimIn} fill="none" stroke={u('e')} strokeWidth="1.2" />
      <polygon points={HEX.step} fill={u('b')} />
      <polygon points={HEX.stepIn} fill="none" stroke={u('s')} strokeWidth=".8" />
      <polygon points={HEX.well} fill={u('w')} />
      <polygon points={HEX.wellIn} fill="none" stroke={u('s')} strokeWidth="2.4" />
      <polygon className="ign-armring" points={HEX.arm} fill="none" />
      {SCREWS.map(([x, y], i) => <circle key={i} className="ign-screw" cx={f2(x)} cy={f2(y)} r="1.5" />)}
    </svg>
  )
}

function Face({ id, faceRef }) {
  const u = (s) => `url(#${id}${s})`
  return (
    <svg className="ign-face" ref={faceRef} viewBox={`0 0 ${HW} ${HH}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id + 'g'} x1=".25" y1="1" x2=".75" y2="0"><Stops list={[['ig1', 0], ['ig2', .56], ['ig3', 1]]} /></linearGradient>
        <linearGradient id={id + 'h'} x1="0" y1="0" x2="0" y2="1"><Stops list={[['ink', 0, .46], ['ink', 1, 0]]} /></linearGradient>
        <linearGradient id={id + 'b'} x1="0" y1="0" x2="0" y2="1"><Stops list={[['void', .42, 0], ['void', 1, .36]]} /></linearGradient>
        <linearGradient id={id + 'r'} x1="0" y1="0" x2="0" y2="1"><Stops list={[['ink', 0, .75], ['ink', .45, 0], ['void', 1, .4]]} /></linearGradient>
      </defs>
      <polygon points={HEX.face} fill={u('g')} />
      <polygon points={HEX.face} fill={u('b')} />
      <path d={SHEEN} fill={u('h')} />
      <polygon points={HEX.faceIn} fill="none" stroke={u('r')} strokeWidth="1" />
      <polygon className="ign-engrave" points={HEX.engrave} />
    </svg>
  )
}

// The guard: smoked glass front (the lit button glows through it), carbon back. Hinged on the bottom flat edge (y 118.1 of 121.24).
function Lid({ id }) {
  const u = (s) => `url(#${id}${s})`
  return (
    <>
      <svg className="ign-lid-front" viewBox={`0 0 ${HW} ${HH}`} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={id + 'g'} x1="0" y1="0" x2="0" y2="1"><Stops list={[['ti1', 0, .2], ['c1', .35, .55], ['c0', 1, .72]]} /></linearGradient>
          <linearGradient id={id + 'l'} x1="0" y1="0" x2="1" y2="1"><Stops list={[['ink', .26, 0], ['ink', .4, .14], ['ink', .5, 0], ['ink', .62, .06], ['ink', .7, 0]]} /></linearGradient>
          <radialGradient id={id + 'u'} cx=".5" cy=".82" r=".5"><Stops list={[['ig1', 0, .3], ['ig1', 1, 0]]} /></radialGradient>
          <linearGradient id={id + 'm'} x1="0" y1="0" x2="0" y2="1"><Stops list={[['ti1', 0], ['ti3', .5], ['ti4', 1]]} /></linearGradient>
        </defs>
        <polygon points={HEX.lid} fill={u('g')} />
        <polygon points={HEX.lid} fill={u('u')} />
        <polygon points={HEX.lid} fill={u('l')} />
        <polygon points={HEX.lidIn} fill="none" stroke={u('m')} strokeOpacity=".35" strokeWidth=".6" />
        <polygon points={HEX.lid} fill="none" stroke={u('m')} strokeWidth="2.4" strokeLinejoin="miter" />
        <path d="M47 3.6L51 -3.4L89 -3.4L93 3.6Z" fill={u('m')} />
        <path className="ign-grip" d="M60 -1.4V1.6M65 -1.4V1.6M70 -1.4V1.6M75 -1.4V1.6M80 -1.4V1.6" />
      </svg>
      <svg className="ign-lid-back" viewBox={`0 0 ${HW} ${HH}`} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={id + 'k'} x1="0" y1="0" x2="0" y2="1"><Stops list={[['c3', 0], ['c1', 1]]} /></linearGradient>
          <linearGradient id={id + 'q'} x1="0" y1="0" x2="0" y2="1"><Stops list={[['ti1', 0], ['ti3', .5], ['ti4', 1]]} /></linearGradient>
        </defs>
        <polygon points={HEX.lid} fill={u('k')} />
        <polygon points={HEX.lidBack} fill="none" className="ign-filament" />
        <polygon points={HEX.lid} fill="none" stroke={u('q')} strokeWidth="2.4" />
      </svg>
    </>
  )
}

function Knuckles({ id }) {
  return (
    <svg className="ign-knuckles" viewBox={`0 0 ${HW} ${HH}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id + 'k'} x1="0" y1="0" x2="1" y2="0"><Stops list={[['ti4', 0], ['ti1', .35], ['ti3', .7], ['ti4', 1]]} /></linearGradient>
      </defs>
      {[44, 82].map((x) => <rect key={x} x={x} y="113.4" width="14" height="9.4" rx="3" fill={`url(#${id}k)`} />)}
      <path className="ign-seam" d="M44 118.1H58M82 118.1H96" />
    </svg>
  )
}

/* ── first run ───────────────────────────────────────────────────────────── */
function FullFirst({ onDone }) {
  const finish = useDone(onDone)
  const id = uid(useId())
  const [phase, setPhase] = useState('idle')                          // idle → open → firing
  const [fl, setFl] = useState({})                                    // word · tag · ember · settled · exit
  const ph = useRef('idle')
  const r = useRef({ ticks: [], needle: null, red: null, clock: null, start: null, hub: null }).current
  const cancel = useRef([])

  const lift = useCallback(() => {
    if (ph.current !== 'idle') return
    ph.current = 'open'
    setPhase('open')
    sound.unlock(); sound.play('check'); haptic.select()               // 'check' is the arming cue
  }, [])

  const press = useCallback(() => {
    if (ph.current !== 'open') return
    ph.current = 'firing'
    setPhase('firing')
    sound.unlock(); sound.play('splash'); haptic.heavy()               // the press is the gesture that lets audio start

    const M = { ...MARKS_FALLBACK, ...(sound.marks ? sound.marks('splash') : null) }
    const ms = (s) => Math.round(s * 1000)
    const eio = readEase('--ease-io'), eout = readEase('--ease-out')
    const t0 = performance.now()
    const restTick = Math.floor(REST * (N - 1))
    let hi = -1, cool = -1
    const mark = (o) => setFl((s) => ({ ...s, ...o }))
    const later = (d, fn) => { const t = setTimeout(fn, d); cancel.current.push(() => clearTimeout(t)) }
    const run = (cfg) => { const t = tween(cfg); cancel.current.push(t.cancel) }

    // one place writes the needle, the lit ticks, the redline and the T+ clock
    const draw = (v) => {
      if (r.needle) r.needle.style.transform = `rotate(${(A0 + SPAN * v).toFixed(2)}deg)`
      const n = Math.min(N - 1, Math.floor(v * (N - 1) + 1e-6))
      for (let i = hi + 1; i <= n; i++) if (r.ticks[i]) r.ticks[i].setAttribute('data-l', '2')
      if (n > hi) hi = n
      // falling: the ring cools behind the needle, top down, to an ember; below the rest mark it stays lit
      while (cool > restTick && cool > n) { if (r.ticks[cool]) r.ticks[cool].setAttribute('data-l', '1'); cool-- }
      if (n >= RED && r.red && !r.red.hasAttribute('data-hot')) r.red.setAttribute('data-hot', '1')
      if (r.clock) r.clock.textContent = 'T+' + ((performance.now() - t0) / 1000).toFixed(2)
    }

    // 0 → redline (lands on the audio mark); a beat at the limiter, the whole ring lit; then down past rest by a hair and home
    run({ ms: ms(M.redline), ease: eio, onUpdate: draw, onDone: () => {
      run({ ms: readMs('--t-fast'), onUpdate: (_, p) => draw(1 + 0.007 * Math.sin(p * Math.PI * 10) * (1 - p)), onDone: () => {
        cool = N - 1
        if (r.red) r.red.setAttribute('data-hot', '0')
        run({ from: 1, to: REST - 0.04, ms: readMs('--t-slow'), ease: eout, onUpdate: draw, onDone: () => {
          run({ from: REST - 0.04, to: REST, ms: readMs('--t-base'), ease: eout, onUpdate: draw, onDone: () => mark({ settled: true }) })
        } })
      } })
    } })

    later(ms(M.wordmark), () => mark({ word: true }))                  // K I N D tracks in (the noise sweep in the cue)
    later(ms(M.ember), () => {                                         // the ember
      mark({ ember: true })
      if (r.hub) {
        const p = fx.at(r.hub)
        fx.sparks({ x: p.x, y: p.y, n: 30, power: 0.95, spread: 150, angle: -90, gravity: 0.5, life: 1000 })
        fx.shockwave({ x: p.x, y: p.y, color: 'ignite', size: 230, ms: 640, width: 1.5 })
      }
      haptic.tap()
    })
    const tagAt = ms(M.ember) + readMs('--t-fast')                     // the tagline follows the ember by one beat
    later(tagAt, () => mark({ tag: true }))
    const total = tagAt + readMs('--t-slow') + readMs('--t-slower')    // the sequence (~1.6 s) + a beat to read the tagline
    later(total - readMs('--t-base'), () => mark({ exit: true }))
    later(total, finish)
  }, [finish])

  const advance = useCallback(() => { if (ph.current === 'idle') lift(); else press() }, [lift, press])
  useAdvanceKey(advance)
  useEffect(() => () => { cancel.current.forEach((f) => f()); cancel.current = [] }, [])
  useEffect(() => { if (phase === 'open' && r.start) r.start.focus({ preventScroll: true }) }, [phase, r])   // keyboard: Enter again presses

  const state = fl.settled ? 'done' : phase
  const flag = (k) => (fl[k] ? '' : undefined)
  return (
    <div className="ign" onClick={() => { if (ph.current === 'idle') lift() }} data-first="" data-phase={phase} data-state={state} data-word={flag('word')} data-tag={flag('tag')} data-ember={flag('ember')} data-exit={flag('exit')}
      role="group" aria-label={SPLASH.aria}>
      <div className="ign-sky"><Starfield density={0.7} seed={11} /></div>
      <div className="ign-bloom" />
      <header className="ign-top" aria-hidden="true">
        <span>KIND · ASCENT</span>
        <span className="ign-clock" ref={(el) => { r.clock = el }}>T+0.00</span>
        <span className="ign-state"><i className="ign-led" /><span key={state} className="ign-statetxt">{COPY.state[state]}</span></span>
      </header>

      <div className="ign-cluster">
        <Dial id={id} live r={r} />
        <div className="ign-hub" ref={(el) => { r.hub = el }}>
          <div className="ign-halo" />
          <div className="ign-flare" />
          <Bezel id={id + 'z'} />
          <div className="u-cut-frame ign-btnwrap">
            <button type="button" className="ign-btn" ref={(el) => { r.start = el }} disabled={phase === 'idle'} onClick={press} onTouchStart={noop} aria-label={COPY.start}>
              <span className="ign-faceset">
                <Face id={id + 'f'} />
                <span className="ign-btn-label" aria-hidden="true">{COPY.start}</span>
              </span>
            </button>
          </div>
          <div className="u-cut-frame ign-lidwrap">
            <button type="button" className="ign-hit" hidden={phase !== 'idle'} onClick={lift} onTouchStart={noop} aria-label={COPY.lift} aria-expanded={phase !== 'idle'} />
            <div className="ign-lid"><Lid id={id + 'l'} /></div>
            <Knuckles id={id + 'k'} />
          </div>
        </div>
      </div>

      <div className="ign-cap">
        <p className="ign-prompt" aria-hidden="true">
          <span className="ign-p ign-p--lift">{COPY.prompt[0]}</span> · <span className="ign-p ign-p--go">{COPY.prompt[1]}</span>
        </p>
        <div className="ign-lock">
          <div className="ign-word" role="img" aria-label="KIND">
            {SPLASH.letters.map((ch, k) => <span key={k} className="ign-ltr" style={{ '--k': k }} aria-hidden="true">{ch}</span>)}
          </div>
          {tagline()}
        </div>
      </div>
      <p className="u-sr" role="status" aria-live="polite">{COPY.say[state]}</p>
    </div>
  )
}

// lite / reduced motion: the Mark fades in over 300 ms; one plain START unlocks audio; the tagline fades; done.
function LiteFirst({ onDone }) {
  const finish = useDone(onDone)
  const [on, setOn] = useState(false)
  const [phase, setPhase] = useState('idle')
  const ph = useRef('idle')
  const timer = useRef(0)
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)))
    return () => cancelAnimationFrame(raf)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  const press = useCallback(() => {
    if (ph.current !== 'idle') return
    ph.current = 'firing'
    setPhase('firing')
    sound.unlock(); sound.play('splash'); haptic.heavy()
    const fade = readMs('--t-base') + readMs('--t-instant') * 0.75      // 300 ms
    timer.current = setTimeout(finish, fade * 3)                        // the tagline fades in, then a beat to read it
  }, [finish])
  const advance = useCallback(() => press(), [press])
  useAdvanceKey(advance)
  return (
    <div className="ign ign-lite" data-first="" data-phase={phase} data-in={on ? '' : undefined} data-tag={phase === 'firing' ? '' : undefined}
      role="group" aria-label={SPLASH.aria}>
      <div className="ign-lite-stack">
        <div className="ign-lite-mark" data-motion="essential"><Mark size={112} glow={phase === 'firing' ? 0.5 : 0} /></div>
        <Button variant="primary" size="lg" silent className="ign-lite-go" onClick={press}>{COPY.start}</Button>
      </div>
      <div data-motion="essential">{tagline()}</div>
      <p className="u-sr" role="status" aria-live="polite">{phase === 'firing' ? COPY.say.firing : ''}</p>
    </div>
  )
}

/* ── returning ───────────────────────────────────────────────────────────── */
function Returning({ lite, onDone }) {
  const finish = useDone(onDone)
  const id = uid(useId())
  const [on, setOn] = useState(false)
  const [out, setOut] = useState(false)
  useEffect(() => {
    const fade = lite ? readMs('--t-base') + readMs('--t-instant') * 0.75 : readMs('--t-base')   // lite: 300 in, 300 out; full: 240 in, 140 hold, 240 out
    const hold = lite ? 0 : readMs('--t-fast')
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)))
    const t1 = setTimeout(() => setOut(true), fade + hold)
    const t2 = setTimeout(finish, fade * 2 + hold)
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2) }
  }, [lite, finish])
  const shown = on && !out ? '' : undefined
  if (lite) {
    return (
      <div className="ign ign-lite ign-ret" data-in={shown} role="group" aria-label={SPLASH.aria}>
        <div className="ign-lite-stack"><div className="ign-lite-mark" data-motion="essential"><Mark size={112} /></div></div>
      </div>
    )
  }
  return (
    <div className="ign ign-ret" data-in={shown} role="group" aria-label={SPLASH.aria}>
      <div className="ign-cluster">
        <Dial id={id} still />
        <div className="ign-retword"><Wordmark size={44} tone="metal" /></div>
      </div>
    </div>
  )
}

export default function Ignition({ first = false, onDone }) {
  const lite = useLite()
  if (first) return lite ? <LiteFirst onDone={onDone} /> : <FullFirst onDone={onDone} />
  return <Returning lite={lite} onDone={onDone} />
}
