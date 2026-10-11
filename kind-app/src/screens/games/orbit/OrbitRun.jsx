// KIND v7 · Game Day · ORBIT RUN. A one-thumb vertical ascent: steer, collect the week's values, dodge doubt, ignite.
// Shape (games contract): { theme:{accent}, words:[string], facts:[{q,options,answer}], lite, onFinish({score,stars,best}), onExit() }
// The sim and the canvas live in ./engine.js; this file is the shell: loop, input, sound/haptics, overlays, best score.
import { useEffect, useRef, useState } from 'react'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { useReducedMotion } from '../../../fx/motion.js'
import * as E from './engine.js'
import './orbit.css'

const BEST_KEY = 'kind-orbit-best'
const STAR = '12,1 15,9 23.5,9 16.6,14.2 19.2,22.5 12,17.5 4.8,22.5 7.4,14.2 0.5,9 9,9'
const TITLES = ['Keep climbing', 'Good climb', 'High orbit', 'Deep space']
const fmt = (n) => Math.round(n).toLocaleString('en-NG')

function readBest() {
  try { const v = Number(localStorage.getItem(BEST_KEY)); return Number.isFinite(v) && v > 0 ? v : 0 } catch { return 0 }
}
function writeBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)) } catch { /* private window: best just does not persist */ }
}
const newSeed = () => ((Date.now() ^ (Math.random() * 0x7fffffff)) | 0) || 7

export default function OrbitRun({ theme, words, facts, lite, onFinish, onExit }) {
  const reduced = useReducedMotion()
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const simRef = useRef(null)
  const viewRef = useRef(null)
  const ctl = useRef({})
  const uiRef = useRef('count')
  const pausedRef = useRef(false)
  const props = useRef(null)
  props.current = { onFinish, onExit }
  const [ui, setUiState] = useState('count')   // count · play · gate · over
  const [paused, setPaused] = useState(false)
  const [ready, setReady] = useState(false)
  const [gate, setGate] = useState(null)
  const [result, setResult] = useState(null)
  const [live, setLive] = useState('')
  const resumeRef = useRef(null)
  const againRef = useRef(null)
  const setUi = (v) => { uiRef.current = v; setUiState(v) }

  useEffect(() => { if (viewRef.current) viewRef.current.reduced = reduced }, [reduced])

  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    const root = document.documentElement
    const css = getComputedStyle(root)
    const isLite = !!lite || root.dataset.fx === 'lite'
    const view = E.createView(canvas, {
      accent: theme?.accent || css.getPropertyValue('--ignite-flat').trim() || '#ff7a1a',
      lite: isLite,
      reduced: !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
      fonts: { display: css.getPropertyValue('--font-display').trim() || undefined, mono: css.getPropertyValue('--font-mono').trim() || undefined },
    })
    const s = E.createSim({ seed: newSeed(), words, facts })
    if (isLite) s.pCap = 110
    simRef.current = s
    viewRef.current = view
    if (import.meta.env?.DEV) canvas.__orbit = { s, E, view }   // dev-only handle for tools/ QA runs
    let alive = true

    const finish = () => {
      const sc = E.score(s)
      const prev = readBest()
      const top = Math.max(prev, sc)
      if (top > prev) writeBest(top)
      const stars = E.starsFor(sc)
      setResult({ score: sc, alt: Math.floor(s.alt / 10) * 10, stars, best: top, record: sc > prev && sc > 0, tokens: s.tokens, near: s.near, combo: s.bestCombo, gates: s.gatesRight })
      setUi('over')
      setReady(false)
      setLive(`Run over. Score ${fmt(sc)}. ${stars} of 3 stars.`)
      sound.play('complete')
      haptic.cue('complete')
      setTimeout(() => { if (alive && uiRef.current === 'over') ctl.current.stop() }, 1400)
      props.current.onFinish?.({ score: sc, stars, best: top })
    }

    s.emit = (type, a) => {
      switch (type) {
        case 'count': sound.play('countdown'); break
        case 'go': sound.play('go'); haptic.cue('go'); setUi('play'); setLive('Lift off. Drag to steer.'); break
        case 'collect': sound.play('xp', { step: Math.min(9, (a - 1) % 10), gain: .7 }); break
        case 'combo': sound.play('combo', { step: Math.min(9, a) }); haptic.select(); break
        case 'near': sound.play('detent', { step: 7, gain: .8 }); break
        case 'smash': sound.play('detent', { step: 9 }); break
        case 'hit': sound.play('wrong'); haptic.error(); setLive(`Hit. ${a} ${a === 1 ? 'shield' : 'shields'} left.`); break
        case 'ready': setReady(true); sound.play('unlock'); haptic.success(); setLive('Boost full. Tap to ignite.'); break
        case 'ignite': setReady(false); sound.play('ignite'); haptic.heavy(); break
        case 'gate': {
          const f = s.facts[a]
          setGate({ q: f.q, a: f.opts[s.gateA], b: f.opts[s.gateB], n: s.factI })
          setUi('gate'); sound.play('open'); setLive(`Fact gate. ${f.q}`)
          break
        }
        case 'gate-right': setGate(null); setUi('play'); sound.play('correct'); haptic.cue('correct'); setLive('Correct. Bonus boost.'); break
        case 'gate-wrong': setGate(null); setUi('play'); sound.play('deselect'); setLive('Not quite. Keep climbing.'); break
        case 'gate-timeout': setGate(null); setUi('play'); break
        case 'dead': setReady(false); sound.play('error'); haptic.cue('error'); break
        case 'over': finish(); break
        default:
      }
    }

    const fit = () => {
      const r = stage.getBoundingClientRect()
      if (r.width < 10 || r.height < 10) return
      E.setView(s, E.resizeView(view, r.width, r.height, window.devicePixelRatio, s.words))
      E.draw(view, s)
    }
    fit()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    ro?.observe(stage)
    document.fonts?.ready.then(() => { if (alive) fit() })

    // fixed-timestep loop with a clamped delta
    let raf = 0, last = 0, acc = 0
    const frame = (ts) => {
      raf = requestAnimationFrame(frame)
      const dt = last ? Math.min(E.MAX_DT, (ts - last) / 1000) : 0
      last = ts
      acc += dt
      while (acc >= E.STEP) { E.step(s, E.STEP); acc -= E.STEP }
      E.draw(view, s)
    }
    ctl.current.start = () => { if (!raf) { last = 0; acc = 0; raf = requestAnimationFrame(frame) } }
    ctl.current.stop = () => { cancelAnimationFrame(raf); raf = 0; E.draw(view, s) }
    ctl.current.start()

    const onVis = () => { if (document.hidden && uiRef.current !== 'over') ctl.current.pause(true) }
    document.addEventListener('visibilitychange', onVis)

    // keyboard: arrows / A D steer · Space, Up, W ignite · Esc, P pause · 1 2 (or left/right) answer a gate
    const held = { l: false, r: false }
    const sync = () => { s.keyDir = (held.r ? 1 : 0) - (held.l ? 1 : 0) }
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const k = e.key, down = e.type === 'keydown'
      const u = uiRef.current
      if (u === 'over') return
      if (down && (k === 'Escape' || k === 'p' || k === 'P')) { e.preventDefault(); ctl.current.pause(!pausedRef.current); return }
      if (pausedRef.current) return
      const left = k === 'ArrowLeft' || k === 'a' || k === 'A', right = k === 'ArrowRight' || k === 'd' || k === 'D'
      if (u === 'gate') {
        if (down && (left || k === '1')) { e.preventDefault(); E.answerGate(s, 0) }
        else if (down && (right || k === '2')) { e.preventDefault(); E.answerGate(s, 1) }
        return
      }
      if (left) { e.preventDefault(); held.l = down; sync() }
      else if (right) { e.preventDefault(); held.r = down; sync() }
      else if (down && (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W')) {
        if (t && t.tagName === 'BUTTON' && k === ' ') return   // let a focused button take its own Space
        e.preventDefault(); E.requestIgnite(s)
      }
    }
    const onBlur = () => { held.l = held.r = false; sync() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('blur', onBlur)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro?.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('blur', onBlur)
    }
    // mount once: the week's words and facts are fixed for a session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  ctl.current.pause = (on) => {
    if (uiRef.current === 'over' || on === pausedRef.current) return
    pausedRef.current = on
    setPaused(on)
    const s = simRef.current
    if (s) s.keyDir = 0
    if (on) { ctl.current.stop?.(); sound.play('close') } else { ctl.current.start?.(); sound.play('open') }
  }

  useEffect(() => { if (paused) resumeRef.current?.focus() }, [paused])
  useEffect(() => { if (result) againRef.current?.focus() }, [result])

  // pointer: drag anywhere to steer (relative, so the thumb never covers the rocket); a quick tap ignites
  const drag = useRef({ id: -1, x: 0, sx: 0, t: 0, moved: false })
  const onDown = (e) => {
    if (pausedRef.current || uiRef.current === 'over' || uiRef.current === 'gate') return
    const d = drag.current
    d.id = e.pointerId; d.x = d.sx = e.clientX; d.t = performance.now(); d.moved = false
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    const d = drag.current
    if (e.pointerId !== d.id) return
    const s = simRef.current, v = viewRef.current
    E.steerBy(s, ((e.clientX - d.x) / v.scale) * 1.3)
    d.x = e.clientX
    if (Math.abs(e.clientX - d.sx) > 10) d.moved = true
  }
  const onUp = (e) => {
    const d = drag.current
    if (e.pointerId !== d.id) return
    d.id = -1
    if (!d.moved && performance.now() - d.t < 320 && simRef.current) E.requestIgnite(simRef.current)
  }

  const ignite = () => { if (simRef.current) E.requestIgnite(simRef.current) }
  const answer = (side) => { if (simRef.current) E.answerGate(simRef.current, side) }
  const again = () => {
    const s = simRef.current
    E.reset(s, newSeed())
    setResult(null); setGate(null); setReady(false); setLive('')
    pausedRef.current = false; setPaused(false)
    setUi('count')
    ctl.current.start()
    sound.play('tap')
  }
  const restart = () => { pausedRef.current = false; setPaused(false); again() }
  const exit = () => { ctl.current.stop?.(); props.current.onExit?.() }

  return (
    <section className="orbit" data-ui={ui} data-paused={paused || undefined} aria-label="Orbit Run" aria-roledescription="game">
      <div className="orbit-stage" ref={stageRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <canvas className="orbit-canvas" ref={canvasRef} aria-hidden="true" />
      </div>

      <button type="button" className="orbit-pause" onClick={() => ctl.current.pause(!pausedRef.current)} aria-label={paused ? 'Resume' : 'Pause'} hidden={ui === 'over'}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
      </button>

      {ui === 'count' && !paused && (
        <p className="orbit-hint" aria-hidden="true"><span>Drag to steer</span><span>Collect values</span><span>Dodge doubt</span></p>
      )}

      {ready && ui === 'play' && !paused && (
        <button type="button" className="orbit-ignite" onClick={ignite}>Ignite</button>
      )}

      {gate && (
        <div className="orbit-gate" role="group" aria-label="Fact gate" data-paused={paused || undefined} key={gate.n}>
          <p className="orbit-label">Fact gate · bonus boost</p>
          <p className="orbit-gate__q">{gate.q}</p>
          <div className="orbit-gate__opts">
            <button type="button" className="orbit-gate__opt" onClick={() => answer(0)}><kbd aria-hidden="true">1</kbd>{gate.a}</button>
            <button type="button" className="orbit-gate__opt" onClick={() => answer(1)}><kbd aria-hidden="true">2</kbd>{gate.b}</button>
          </div>
          <span className="orbit-gate__timer" data-motion="essential" aria-hidden="true" />
        </div>
      )}

      {paused && (
        <div className="orbit-sheet" role="dialog" aria-modal="true" aria-labelledby="orbit-paused">
          <div className="orbit-card">
            <p className="orbit-label">Hold</p>
            <h2 id="orbit-paused" className="orbit-card__title">Paused</h2>
            <button type="button" ref={resumeRef} className="orbit-btn orbit-btn--go" onClick={() => ctl.current.pause(false)}>Resume</button>
            <button type="button" className="orbit-btn" onClick={restart}>Restart</button>
            <button type="button" className="orbit-btn orbit-btn--ghost" onClick={exit}>Exit</button>
          </div>
        </div>
      )}

      {result && (
        <div className="orbit-sheet orbit-sheet--end" role="dialog" aria-modal="true" aria-labelledby="orbit-end">
          <div className="orbit-card orbit-card--end">
            <p className="orbit-label">Mission report</p>
            <h2 id="orbit-end" className="orbit-card__title">{result.record ? 'New best' : TITLES[result.stars]}</h2>
            <div className="orbit-stars" role="img" aria-label={`${result.stars} of 3 stars`}>
              {[0, 1, 2].map((i) => (
                <svg key={i} viewBox="0 0 24 24" className={i < result.stars ? 'is-on' : ''} style={{ '--i': i }} aria-hidden="true"><polygon points={STAR} /></svg>
              ))}
            </div>
            <dl className="orbit-stats">
              <div><dt>Altitude</dt><dd>{fmt(result.alt)} m</dd></div>
              <div className="is-main"><dt>Score</dt><dd>{fmt(result.score)}</dd></div>
              <div><dt>Best</dt><dd>{fmt(result.best)}</dd></div>
            </dl>
            <p className="orbit-mini">
              <span>{result.tokens} values</span><span>{result.near} near misses</span><span>x{Math.min(5, 1 + Math.floor(result.combo / 4))} top combo</span>
            </p>
            {result.stars < 3 && <p className="orbit-next">Next star at {fmt(E.STAR_AT[result.stars])}</p>}
            <button type="button" ref={againRef} className="orbit-btn orbit-btn--go" onClick={again}>Play again</button>
            <button type="button" className="orbit-btn orbit-btn--ghost" onClick={exit}>Done</button>
          </div>
        </div>
      )}

      <p className="orbit-sr" aria-live="polite">{live}</p>
    </section>
  )
}
