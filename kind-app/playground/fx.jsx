// FX lab — fire every effect, tilt the card, count up, flip the level, watch the frame budget.
//   http://localhost:5183/playground/fx.html            (?fx=lite to start in lite · ?renderer=2d for the Canvas 2D fallback)
// window.fx / window.lab are exposed so a headless script can fire effects and read stats.
import { useEffect, useMemo, useRef, useState } from 'react'
import { mount } from './_boot.jsx'
import FxLayer from '../src/fx/FxLayer.jsx'
import { fx } from '../src/fx/fx.js'
import { haptic } from '../src/fx/haptics.js'
import {
  applyFxLevel, getFxLevel, getFxReason, gyroStatus, raf, requestGyro, stagger, useCountUp, useFxLevel, useInView,
  usePointerTilt, useReducedMotion, useScrollVar,
} from '../src/fx/motion.js'
import { prefs, usePrefs } from '../src/prefs.js'

const EFFECTS = {
  sparks: (p) => fx.sparks({ ...p, n: 30 }),
  embers: (p) => fx.embers({ ...p, w: 200, n: 18 }),
  confetti: (p) => fx.confetti({ ...p, n: 44 }),
  shock: (p) => fx.shockwave({ ...p, size: 300 }),
  flash: (p) => fx.flash('ignite', 360, { ...p, peak: 0.5 }),
  pop: (p) => fx.pop(p, { color: 'gold' }),
  ignite: (p) => fx.ignite(p),
  launch: (p) => fx.launch(p),
  orbit: (p) => fx.celebrate(p),
  rankup: (p) => fx.celebrate(p, { big: true }),
}

/** A roving-tabindex radio group: one tab stop, arrows move the choice. */
function Radio({ options, value, onChange, label, className = 'row' }) {
  const refs = useRef([])
  const onKey = (e, i) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = (i + d + options.length) % options.length
    onChange(options[n])
    if (refs.current[n]) refs.current[n].focus()
  }
  return (
    <div className={className} role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button key={o} ref={(el) => { refs.current[i] = el }} className="chip" role="radio" aria-checked={value === o} data-on={value === o}
          tabIndex={value === o ? 0 : -1} onClick={() => onChange(o)} onKeyDown={(e) => onKey(e, i)}>{o}</button>
      ))}
    </div>
  )
}

/** Engine stats + a measured fps, refreshed twice a second off the shared rAF loop. */
function useStats() {
  const [s, setS] = useState(fx.stats())
  const fps = useRef({ n: 0, t: 0, v: 0 })
  useEffect(() => {
    const f = (_dt, t) => {
      const m = fps.current
      m.n++
      if (!m.t) m.t = t
      if (t - m.t >= 500) { m.v = Math.round((m.n * 1000) / (t - m.t)); m.n = 0; m.t = t; setS({ ...fx.stats(), meter: m.v }) }
    }
    raf.add(f)
    return () => raf.remove(f)
  }, [])
  return s
}

function Hud() {
  const level = useFxLevel()
  const s = useStats()
  const lite = level === 'lite'
  return (
    <div className="lab-hud" role="group" aria-label="Frame budget">
      <div role="status"><span className="mono">fps</span><b data-warn={s.meter && s.meter < 50 ? '' : undefined}>{s.meter ?? '—'}</b></div>
      <div><span className="mono">live</span><b><i className="led" data-on={s.live > 0} />{s.live}</b></div>
      <div><span className="mono">quality</span><b>{s.quality.toFixed(2)}</b></div>
      <div><span className="mono">tick ms</span><b>{s.tickMs.toFixed(2)}</b></div>
      <button type="button" data-lite={lite} onClick={() => { haptic.select(); prefs.set('fx', lite ? 'full' : 'lite') }} aria-label={`Effects level ${level}. Press to switch to ${lite ? 'full' : 'lite'}.`}>
        <span className="mono">level</span><b>{level}</b>
      </button>
    </div>
  )
}

function Clock() {
  const [t, setT] = useState(0)
  useEffect(() => { const id = setInterval(() => setT((v) => v + 1), 1000); return () => clearInterval(id) }, [])
  const mm = String(Math.floor(t / 60)).padStart(2, '0'), ss = String(t % 60).padStart(2, '0')
  return <span className="mono clock" aria-hidden="true">T+ {mm}:{ss}</span>
}

function Section({ n, title, aside, children }) {
  return (
    <section className="sec">
      <header><h2><i>{n}</i>{title}</h2><span className="mono">{aside}</span></header>
      {children}
    </section>
  )
}

function TapField() {
  const [which, setWhich] = useState('sparks')
  const [shot, setShot] = useState(null)
  const field = useRef(null)
  const fire = (p) => { EFFECTS[which](p); setShot({ x: Math.round(p.x), y: Math.round(p.y), n: (shot ? shot.n : 0) + 1 }) }
  const track = (e) => {
    const el = field.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--px', e.clientX - r.left + 'px')
    el.style.setProperty('--py', e.clientY - r.top + 'px')
  }
  return (
    <Section n="01" title="Tap field" aside="from the touch point · ←→ to pick">
      <div className="panel">
        <Radio options={Object.keys(EFFECTS)} value={which} onChange={(k) => { setWhich(k); haptic.select() }} label="Effect" />
        <div ref={field} className="field" role="button" tabIndex={0} aria-label={`Fire ${which}. Press Enter or Space to fire at the centre.`}
          onPointerDown={(e) => { track(e); fire(fx.at(e)) }}
          onPointerMove={(e) => { if (e.pointerType !== 'touch') track(e) }}
          onPointerEnter={(e) => { if (e.pointerType !== 'touch') { track(e); e.currentTarget.dataset.in = 'true' } }}
          onPointerLeave={(e) => { e.currentTarget.dataset.in = 'false' }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(fx.at(e.currentTarget)) } }}>
          <i className="br tl" /><i className="br tr" /><i className="br bl" /><i className="br bb" />
          <i className="ret" />
          <span className="mono hint-c">tap anywhere<br />{which}</span>
          <span className="mono ro" aria-hidden="true"><span>x {shot ? String(shot.x).padStart(3, '0') : '---'}  y {shot ? String(shot.y).padStart(3, '0') : '---'}</span><span>shot {shot ? String(shot.n).padStart(2, '0') : '00'}</span></span>
        </div>
      </div>
    </Section>
  )
}

function Moments() {
  const plate = useRef(null)
  const pill = useRef(null)
  const [xp, setXp] = useState(1240)
  const shown = useCountUp(xp, { duration: 600 })
  const [stress, setStress] = useState(false)
  useEffect(() => {
    if (!stress) return undefined
    const go = () => { fx.cannons(); fx.celebrate({ x: window.innerWidth / 2, y: window.innerHeight * 0.45 }, { big: true }) }
    go()
    const id = setInterval(go, 1100)
    return () => { clearInterval(id); fx.clear() }
  }, [stress])
  return (
    <Section n="02" title="Moments" aside="composed once, used everywhere">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-3)' }}>
          <span className="mono">hud · xp</span>
          <span ref={pill} className="mono fx-num" style={{ color: 'var(--tele)', fontSize: 'var(--fs-sm)' }}>{shown.toLocaleString('en-US')} XP</span>
        </div>
        <div className="grid2">
          <button className="btn btn--hot" onPointerDown={(e) => { haptic.launch(); fx.launch(fx.at(e)) }}>Launch</button>
          <button className="btn" onPointerDown={(e) => { haptic.cue('complete'); fx.celebrate(fx.at(e)) }}>Orbit reached</button>
          <button className="btn" onPointerDown={(e) => { haptic.cue('rankup'); fx.celebrate(fx.at(e), { big: true }) }}>Rank up</button>
          <button className="btn btn--go" onPointerDown={(e) => { haptic.cue('correct'); fx.go(fx.at(e)) }}>Go</button>
          <button className="btn btn--no" onPointerDown={() => { haptic.cue('wrong'); fx.nogo(plate) }}>No-go</button>
          <button className="btn" onPointerDown={(e) => { fx.fly({ from: fx.at(e), to: pill, n: 6, onDone: () => { setXp((v) => v + 40); haptic.tap() } }) }}>+40 XP flies</button>
        </div>
        <div className="grid2" style={{ marginTop: 'var(--s-2)' }}>
          <button className="btn" onPointerDown={(e) => { haptic.cue('streak'); fx.ignite(fx.at(e)) }}>Streak ignites</button>
          <button className="btn" onPointerDown={(e) => { haptic.cue('ring'); fx.pop(fx.at(e), { color: 'tele' }) }}>Ring closes</button>
        </div>
        <button className="btn" style={{ width: '100%', marginTop: 'var(--s-2)' }} onPointerDown={() => { haptic.heavy(); fx.cannons() }}>Month complete · cannons</button>
        <button className="btn" style={{ width: '100%', marginTop: 'var(--s-2)' }} aria-pressed={stress} onClick={() => setStress((v) => !v)}>{stress ? 'Stop stress test' : 'Stress test · 150 live'}</button>
        <div ref={plate} className="plate" style={{ marginTop: 'var(--s-3)' }}><kbd>B</kbd><span>Faithful in little</span></div>
      </div>
    </Section>
  )
}

const SCALES = { S: 0.7, M: 1, L: 1.6 }
function Exhaust() {
  const marker = useRef(null)
  const [on, setOn] = useState(false)
  const [size, setSize] = useState('M')
  useEffect(() => {
    const el = marker.current
    if (!on || !el) return undefined
    const a = el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-150px)' }], { duration: 2400, direction: 'alternate', iterations: Infinity, easing: 'cubic-bezier(.65,0,.35,1)' })
    const t = fx.trail(el, { scale: SCALES[size] })
    return () => { a.cancel(); t.stop() }
  }, [on, size])
  return (
    <Section n="03" title="Exhaust trail" aside="fx.trail(el, { scale })">
      <div className="panel">
        <div className="stage"><div ref={marker} className="marker" /></div>
        <div className="row" style={{ marginTop: 'var(--s-3)', alignItems: 'center' }}>
          <button className="btn btn--hot" onClick={() => setOn((v) => !v)} aria-pressed={on}>{on ? 'Cut engine' : 'Ignite'}</button>
          <Radio options={Object.keys(SCALES)} value={size} onChange={setSize} label="Plume scale" />
        </div>
      </div>
    </Section>
  )
}

function Card() {
  const ref = useRef(null)
  usePointerTilt(ref, { max: 12 })
  const [g, setG] = useState(gyroStatus())
  const [tone, setTone] = useState('gold')
  const [vars, setVars] = useState('')
  useEffect(() => {
    const id = setInterval(() => {
      const st = ref.current && ref.current.style
      if (st) setVars(`rx ${st.getPropertyValue('--rx') || '0'}  ry ${st.getPropertyValue('--ry') || '0'}  glare ${st.getPropertyValue('--tilt-on') || '0'}`)
    }, 120)
    return () => clearInterval(id)
  }, [])
  const ticks = useMemo(() => Array.from({ length: 60 }, (_, i) => i), [])
  return (
    <Section n="04" title="Tilt + glare" aside={`usePointerTilt · gyro ${g}`}>
      <div className="panel">
        <Radio options={['gold', 'ti']} value={tone} onChange={setTone} label="Card material" />
        <div className="tilt-zone">
          <div ref={ref} className="fx-tilt card" data-tone={tone} role="img" aria-label="Code card 07, Faithful in little. Tilts with the pointer.">
            <div className="card__face">
              <div className="card__top"><span className="mono">code 07</span><span className="mono">{tone === 'gold' ? 'gold' : 'standard'}</span></div>
              <div className="card__art">
                <svg viewBox="0 0 120 120" width="120" height="120" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
                  <circle cx="60" cy="60" r="52" strokeWidth=".8" opacity=".5" />
                  <circle cx="60" cy="60" r="34" strokeWidth="1.2" />
                  <circle cx="60" cy="60" r="12" strokeWidth="1.6" />
                  {ticks.map((i) => { const a = (i / 60) * Math.PI * 2; const L = i % 5 ? 3 : 7; return <line key={i} x1={60 + Math.cos(a) * 52} y1={60 + Math.sin(a) * 52} x2={60 + Math.cos(a) * (52 - L)} y2={60 + Math.sin(a) * (52 - L)} strokeWidth={i % 5 ? '.6' : '1.1'} /> })}
                  <path d="M60 24 L66 60 L60 96 L54 60 Z" strokeWidth="1.1" />
                </svg>
              </div>
              <h3>Faithful in little</h3>
              <p>Luke 16:10 · Day 07</p>
            </div>
            <i className="fx-tilt__glare" />
            <i className="fx-tilt__sheen" />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="mono">{vars}</span>
          {g !== 'unsupported' && <button className="chip" onClick={() => requestGyro().then(setG)}>Enable motion</button>}
        </div>
        <p className="hint">Hover (mouse), press and drag (touch) or tilt the phone. The light follows; the side under your finger sinks.</p>
      </div>
    </Section>
  )
}

function Counter({ to, ease }) {
  const v = useCountUp(to, { duration: 1400, ease })
  return <div className="big fx-num" aria-label={`${to} XP`}>{v.toLocaleString('en-US')}<small>XP</small></div>
}
function CountUp() {
  const [run, setRun] = useState(0)
  const [ease, setEase] = useState('outExpo')
  return (
    <Section n="05" title="Count-up" aside="useCountUp · tabular figures">
      <div className="panel">
        <Counter key={run + ease} to={1240} ease={ease} />
        <div className="row" style={{ marginTop: 'var(--s-4)' }}>
          <Radio options={['outExpo', 'outCubic', 'outBack', 'linear']} value={ease} onChange={setEase} label="Easing" />
          <button className="chip" onClick={() => setRun((r) => r + 1)}>Replay</button>
        </div>
      </div>
    </Section>
  )
}

function ScrollDemo() {
  const scroller = useRef(null)
  const wrap = useRef(null)
  useScrollVar(scroller, '--demo-scroll', { target: wrap })
  return (
    <Section n="06" title="Scroll var + in-view" aside="useScrollVar · useInView">
      <div className="panel" ref={wrap}>
        <div className="scroller" ref={scroller} tabIndex={0} role="region" aria-label="Scroll demo">
          <ul>{Array.from({ length: 14 }, (_, i) => <Row key={i} i={i} />)}</ul>
        </div>
        <div className="meter"><i /></div>
        <span className="mono">--scroll drives this bar · rows reveal on entry, staggered</span>
      </div>
    </Section>
  )
}
function Row({ i }) {
  const ref = useRef(null)
  const seen = useInView(ref, { margin: '0px 0px -8% 0px' })
  return <li ref={ref} className="fx-reveal" data-in={seen} style={stagger(i % 4, 70)}><span>Stage {String(Math.floor(i / 4) + 1).padStart(2, '0')}</span><span className="mono">T+{String(i + 1).padStart(2, '0')}</span></li>
}

function Level() {
  const [p, setPref] = usePrefs()
  const level = useFxLevel()
  const reduced = useReducedMotion()
  const st = useStats()
  const n = navigator
  return (
    <Section n="07" title="Effects level" aside={`${level} · ${getFxReason()}`}>
      <div className="panel">
        <Radio options={['auto', 'full', 'lite']} value={p.fx} onChange={(k) => setPref('fx', k)} label="Effects" />
        <dl className="kv">
          <dt>prefers-reduced</dt><dd>{String(reduced)}</dd>
          <dt>device memory</dt><dd>{n.deviceMemory ?? 'n/a'}</dd>
          <dt>cores</dt><dd>{n.hardwareConcurrency ?? 'n/a'}</dd>
          <dt>save-data</dt><dd>{String(!!(n.connection && n.connection.saveData))}</dd>
          <dt>data-fx</dt><dd>{document.documentElement.dataset.fx}</dd>
          <dt>renderer</dt><dd>{st.renderer}{st.shrunk ? ' · released' : ''}</dd>
        </dl>
      </div>
    </Section>
  )
}

function Haptics() {
  const [p, setPref] = usePrefs()
  const names = ['tap', 'select', 'success', 'warning', 'error', 'heavy', 'launch']
  return (
    <Section n="08" title="Haptics" aside={`${haptic.platform}`}>
      <div className="panel">
        <div className="row">{names.map((k) => <button key={k} className="chip" onPointerDown={() => haptic[k]()}>{k}</button>)}</div>
        <div className="row" style={{ marginTop: 'var(--s-2)' }}>
          {['complete', 'rankup'].map((k) => <button key={k} className="chip" onPointerDown={() => haptic.cue(k)}>{k}</button>)}
          <button className="chip" data-on={p.haptics} role="switch" aria-checked={p.haptics} onClick={() => setPref('haptics', !p.haptics)}>haptics {p.haptics ? 'on' : 'off'}</button>
        </div>
        <p className="hint">{haptic.supported ? 'This device can buzz.' : 'No vibration motor here (desktop). Android: navigator.vibrate patterns. iPhone: switch-tick, iOS 17.4+.'}</p>
      </div>
    </Section>
  )
}

function OneShots() {
  const [n, setN] = useState(0)
  return (
    <Section n="09" title="CSS one-shots" aside=".fx-shock · .fx-sweep · no JS">
      <div className="panel">
        <div className="shots">
          <div className="shot-hex" key={'h' + n}><i className="fx-shock" /><span className="mono">ring</span></div>
          <div className="plate fx-sweep" key={'p' + n}><kbd>↵</kbd><span>Claim</span></div>
        </div>
        <div className="row"><button className="chip" onClick={() => { haptic.tap(); setN((v) => v + 1) }}>Replay</button></div>
      </div>
    </Section>
  )
}

function Cheat() {
  const L = ({ children }) => <div>{children}</div>
  return (
    <Section n="10" title="Cheat sheet" aside="import { fx } from 'src/fx/fx.js'">
      <div className="panel">
        <div className="cheat">
          <L><b>fx.launch</b>(where)  <i>wash · rings · sparks</i></L>
          <L><b>fx.celebrate</b>(where, {'{ big }'})</L>
          <L><b>fx.cannons</b>()  <i>month complete</i></L>
          <L><b>fx.go</b>(where)  <b>fx.nogo</b>(el)</L>
          <L><b>fx.pop</b>(where, {'{ color, size }'})</L>
          <L><b>fx.ignite</b>(where)  <i>streak flame</i></L>
          <L><b>fx.fly</b>({'{ from, to, n, onArrive, onDone }'})</L>
          <L><b>fx.trail</b>(el, {'{ scale, rate, dir }'})  <i>{'→ { stop() }'}</i></L>
          <L><b>fx.sparks</b> · <b>embers</b> · <b>confetti</b> · <b>shockwave</b> · <b>flash</b> · <b>shake</b></L>
          <L><i>where = element · ref · event · {'{ x, y }'}</i></L>
        </div>
      </div>
    </Section>
  )
}

function Lab() {
  return (
    <>
      <FxLayer />
      <main className="lab">
        <Hud />
        <div className="lab-title">
          <span className="eyebrow">KIND v7 · fx</span>
          <Clock />
          <h1>Effects bench</h1>
          <p>Particles, rings, flash, shake, exhaust; tilt, count-up, scroll and level. Every one degrades under Lite.</p>
        </div>
        <TapField />
        <Moments />
        <Exhaust />
        <Card />
        <CountUp />
        <ScrollDemo />
        <Level />
        <Haptics />
        <OneShots />
        <Cheat />
      </main>
    </>
  )
}

const params = new URLSearchParams(location.search)
const q = params.get('fx')
if (q === 'lite' || q === 'full' || q === 'auto') prefs.set('fx', q)
if (params.get('renderer')) fx.setRenderer(params.get('renderer'))   // ?renderer=2d to see the fallback
mount(<Lab />)
applyFxLevel()
window.fx = fx
window.lab = { prefs, raf, haptic, level: () => ({ level: getFxLevel(), reason: getFxReason() }) }
