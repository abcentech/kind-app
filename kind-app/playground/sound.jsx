// Sound mixing desk — specimen + test bench for src/fx/sound.js.
//   live buttons drive the REAL engine (unlock, debounce, ducking, prefs, lite voicing); the scope draws an OFFLINE render of the same cue through
//   the same master chain, so what you see is what the audit measured. Measured numbers come from tools/out/sound/_report.json (node tools/audio-render.mjs).
//   Mobile: the deck (name, mini waveform, Play) sticks to the top while you scroll the cue grid. Desktop: pick on the left, read the scope on the right.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mount } from './_boot.jsx'
import './sound.css'
import { sound, CUES } from '../src/fx/sound.js'
import { prefs, usePrefs } from '../src/prefs.js'
import { renderCue, CUE_META } from '../src/fx/sound-synth.js'
import { MARKS } from '../src/fx/sound-marks.js'
import { FLOWS } from './sound.flows.js'

// ── colour: everything is read from the design tokens at draw time ─────────────────────────────
const tok = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
const rgb = (hex) => { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const rampStops = () => ['--carbon-0', '--carbon-3', '--ignite-1', '--ignite-2', '--ignite-3', '--ink'].map((n) => rgb(tok(n)))
const lerpRamp = (stops, t) => { t = Math.max(0, Math.min(1, t)); const x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), u = x - i; return stops[i].map((c, j) => c + (stops[i + 1][j] - c) * u) }
const palette = () => ({ mono: tok('--font-mono'), ignite: tok('--ignite-2'), line: tok('--line-2'), line2: tok('--line'), dim: tok('--ink-3'), ink: tok('--ink'), nogo: tok('--nogo'), tele: tok('--tele'),
  teleA: tok('--tele') + 'c0', ignite2a: tok('--ignite-2') + '88', go: tok('--go'), warn: tok('--warn'), bg: tok('--carbon-1') })

// ── analysis (in-page; the heavy numbers come from the audit report) ───────────────────────────
function fft(re, im) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a)
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr; re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr } }
  }
}
const dB = (x) => 20 * Math.log10(Math.max(x, 1e-9))

function measure(buf) {
  const L = buf.getChannelData(0), R = buf.getChannelData(1), sr = buf.sampleRate
  let pk = 0
  for (let i = 0; i < L.length; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]))
  const last = (thr) => { for (let i = L.length - 1; i >= 0; i--) if (Math.abs(L[i]) > thr || Math.abs(R[i]) > thr) return (i + 1) / sr; return 0 }
  return { peak: dB(pk), body: last(pk * 10 ** (-35 / 20)), tail: last(10 ** (-60 / 20)), dur: L.length / sr }
}

/** The cue's marks as x-positions: the render starts the cue 20 ms in (renderCue), and rate squeezes time. */
const markList = (cue, rate, dur) => Object.entries(MARKS[cue] || {}).map(([name, at]) => ({ name, t: at / rate, x: (0.02 + at / rate) / dur }))
/** The part of the render worth drawing: up to the cue's own -60 dBFS point plus a breath, not the whole window (which is padded for the reverb). */
const viewOf = (buf) => Math.min(buf.duration, Math.max(0.25, measure(buf).tail + 0.12))

function drawWave(canvas, buf, T, { cue, rate = 1, mini = false } = {}) {
  const dpr = Math.min(devicePixelRatio || 1, 3), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr)
  if (!w || !h) return
  canvas.width = w; canvas.height = h
  const g = canvas.getContext('2d'), mid = h / 2, L = buf.getChannelData(0), R = buf.getChannelData(1), dur = viewOf(buf), per = (dur * buf.sampleRate) / w
  g.clearRect(0, 0, w, h)
  if (mini) {                                                       // one merged envelope: the shape of the cue at a glance
    g.fillStyle = T.tele
    for (let x = 0; x < w; x += 2) {
      let m = 0
      for (let i = Math.floor(x * per), e = Math.min(L.length, Math.floor((x + 2) * per)); i < e; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]))
      const a = Math.min(1, m) ** 0.6 * mid * 0.92
      g.globalAlpha = 0.55 + 0.45 * Math.min(1, m * 3)
      g.fillRect(x, mid - a, Math.max(1, dpr), Math.max(dpr, a * 2))
    }
    g.globalAlpha = 1
    return
  }
  g.lineWidth = dpr; g.font = `${10 * dpr}px ${T.mono}`
  // guides: -3 dBFS ceiling (the audit's hard limit), -12, -24 and the centre line
  for (const [db, label, col, dash] of [[-3, '-3', T.ignite, [6 * dpr, 4 * dpr]], [-12, '-12', T.line, [2 * dpr, 4 * dpr]], [-24, '-24', T.line, [2 * dpr, 4 * dpr]]]) {
    const a = 10 ** (db / 20), y1 = mid - a * mid * 0.94, y2 = mid + a * mid * 0.94
    g.strokeStyle = col; g.setLineDash(dash); g.beginPath(); g.moveTo(0, y1); g.lineTo(w, y1); g.moveTo(0, y2); g.lineTo(w, y2); g.stroke()
    g.fillStyle = T.dim; g.textAlign = 'right'; g.fillText(label + ' dBFS', w - 6 * dpr, y1 - 3 * dpr); g.textAlign = 'left'
  }
  g.setLineDash([]); g.strokeStyle = T.line2; g.beginPath(); g.moveTo(0, mid); g.lineTo(w, mid); g.stroke()
  for (const [ch, col] of [[R, T.ignite2a], [L, T.teleA]]) {
    g.fillStyle = col
    for (let x = 0; x < w; x++) {
      let m = 0
      for (let i = Math.floor(x * per), e = Math.min(ch.length, Math.floor((x + 1) * per)); i < e; i++) { const v = Math.abs(ch[i]); if (v > m) m = v }
      const a = Math.min(1, m) * mid * 0.94
      g.fillRect(x, mid - a, 1, Math.max(1, a * 2))
    }
  }
  g.fillStyle = T.dim
  for (let t = 0; t <= dur; t += dur > 3 ? 0.5 : dur > 1.2 ? 0.25 : 0.1) g.fillText(t.toFixed(t % 1 ? 2 : 0) + 's', (t / dur) * w + 3 * dpr, h - 4 * dpr)
  // marks: where the picture should land (sound.marks)
  g.setLineDash([3 * dpr, 3 * dpr]); g.textBaseline = 'top'
  for (const m of markList(cue, rate, dur)) {
    const x = Math.round(m.x * w)
    g.strokeStyle = T.tele; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke()
    const label = `${m.name} ${m.t.toFixed(2)}s`, tw = g.measureText(label).width + 8 * dpr, lx = Math.min(x + 3 * dpr, w - tw)
    g.fillStyle = T.bg; g.fillRect(lx, 2 * dpr, tw, 14 * dpr); g.fillStyle = T.tele; g.fillText(label, lx + 4 * dpr, 4 * dpr)
  }
  g.setLineDash([]); g.textBaseline = 'alphabetic'
}

function drawSpec(canvas, buf, T, { cue, rate = 1 } = {}) {
  const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr)
  if (!w || !h) return
  canvas.width = w; canvas.height = h
  const g = canvas.getContext('2d'), N = 1024, hop = 256, sr = buf.sampleRate
  const L = buf.getChannelData(0), R = buf.getChannelData(1), view = viewOf(buf), viewN = Math.min(L.length, Math.round(view * sr)), frames = Math.max(1, Math.floor((viewN - N) / hop))
  const FMIN = 60, FMAX = 12000, RANGE = 78
  const hann = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N))
  const re = new Float64Array(N), im = new Float64Array(N), mags = new Float32Array(frames * (N / 2))
  let gmax = 1e-9
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < N; i++) { re[i] = (L[f * hop + i] + R[f * hop + i]) * 0.5 * hann[i]; im[i] = 0 }
    fft(re, im)
    for (let k = 0; k < N / 2; k++) { const m = Math.hypot(re[k], im[k]); mags[f * (N / 2) + k] = m; if (m > gmax) gmax = m }
  }
  const stops = rampStops(), img = g.createImageData(w, h)
  const bin = (r) => (FMIN * Math.pow(FMAX / FMIN, r / h) * N) / sr
  for (let x = 0; x < w; x++) {
    const f = Math.min(frames - 1, Math.floor((x / w) * frames))
    for (let y = 0; y < h; y++) {
      const r = h - 1 - y, lo = bin(r), hi = Math.max(lo + 1e-6, bin(r + 1))
      let m = 0
      for (let k = Math.floor(lo); k <= Math.min(N / 2 - 1, Math.ceil(hi)); k++) m = Math.max(m, mags[f * (N / 2) + k])
      const c = lerpRamp(stops, 1 + dB(m / gmax) / RANGE), o = (y * w + x) * 4
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  const yOf = (f) => h - 1 - (Math.log(f / FMIN) / Math.log(FMAX / FMIN)) * h
  g.font = `${10 * dpr}px ${T.mono}`; g.lineWidth = dpr
  for (const [f, lab] of [[146.83, 'D3'], [293.66, 'D4'], [587.33, 'D5'], [1174.66, 'D6'], [2349.3, 'D7']]) {
    g.strokeStyle = T.line2; g.setLineDash([2 * dpr, 5 * dpr]); g.beginPath(); g.moveTo(0, yOf(f)); g.lineTo(w, yOf(f)); g.stroke()
    g.fillStyle = T.dim; g.fillText(lab, 5 * dpr, yOf(f) - 3 * dpr)
  }
  g.strokeStyle = T.nogo; g.setLineDash([6 * dpr, 4 * dpr]); g.beginPath(); g.moveTo(0, yOf(6000)); g.lineTo(w, yOf(6000)); g.stroke()
  g.fillStyle = T.nogo; g.fillText('6 kHz', 5 * dpr, yOf(6000) - 3 * dpr)
  g.strokeStyle = T.tele; g.setLineDash([3 * dpr, 3 * dpr])
  for (const m of markList(cue, rate, view)) { const x = Math.round(m.x * w); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
  g.setLineDash([])
}

/** Live output meter: two peak bars with ballistics and hold, and the compressor's gain reduction. Reads the engine's own probe (sound.probe()). */
function drawMeter(canvas, T, st) {
  const dpr = Math.min(devicePixelRatio || 1, 3), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr)
  if (!w || !h) return
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
  const g = canvas.getContext('2d'), FLOOR = -54, gut = 16 * dpr, bw = w - gut, bh = Math.round(h * 0.2), gap = Math.round(h * 0.04)
  g.clearRect(0, 0, w, h)
  const X = (db) => gut + Math.max(0, Math.min(1, (db - FLOOR) / -FLOOR)) * bw
  g.font = `${9 * dpr}px ${T.mono}`; g.textBaseline = 'middle'
  const bar = (i, name, level, hold) => {
    const y = i * (bh + gap)
    g.fillStyle = T.dim; g.fillText(name, 0, y + bh / 2)
    g.fillStyle = T.line2; g.fillRect(gut, y, bw, bh)
    const x = X(level), g1 = X(-12), g2 = X(-3)
    g.fillStyle = T.go; g.fillRect(gut, y, Math.min(x, g1) - gut, bh)
    if (x > g1) { g.fillStyle = T.warn; g.fillRect(g1, y, Math.min(x, g2) - g1, bh) }
    if (x > g2) { g.fillStyle = T.nogo; g.fillRect(g2, y, x - g2, bh) }
    g.fillStyle = T.ink; g.fillRect(Math.min(w - 2 * dpr, X(hold)), y, 2 * dpr, bh)
  }
  bar(0, 'L', st.l, st.lh); bar(1, 'R', st.r, st.rh)
  const y = 2 * (bh + gap)
  g.fillStyle = T.dim; g.fillText('GR', 0, y + bh / 2)
  g.fillStyle = T.line2; g.fillRect(gut, y, bw, bh)
  g.fillStyle = T.ignite; g.fillRect(gut, y, Math.min(bw, (Math.min(12, -st.gr) / 12) * bw), bh)
  // ruler: ticks every step, labels where they fit
  const ry = 3 * (bh + gap)
  g.strokeStyle = T.dim; g.lineWidth = dpr; g.fillStyle = T.dim; g.textBaseline = 'top'
  for (const db of [-48, -36, -24, -18, -12, -6, -3, 0]) {
    const x = Math.round(X(db)) - dpr / 2
    g.beginPath(); g.moveTo(x, ry); g.lineTo(x, ry + 4 * dpr); g.stroke()
    if ([-48, -24, -12, -3].includes(db)) { const t = String(db), tw = g.measureText(t).width; g.fillText(t, Math.min(w - tw, x - tw / 2), ry + 6 * dpr) }
  }
}

// ── what a cue takes ───────────────────────────────────────────────────────────────────────────
const GROUPS = [
  { id: 'ui', title: 'UI micro', hint: 'tight room · 40-250 ms', cues: CUES.filter((c) => CUE_META[c].kind === 'ui') },
  { id: 'reward', title: 'Verdicts and rewards', hint: 'plate reverb · 0.4-2.4 s', cues: CUES.filter((c) => CUE_META[c].kind === 'reward') },
  { id: 'hero', title: 'Hero moments', hint: 'ducks everything else · ≤ 3 s', cues: CUES.filter((c) => CUE_META[c].kind === 'hero') },
]
const STEPPED = ['combo', 'xp', 'ring', 'detent']
const optsFor = (cue, o) => {
  const out = {}
  if (o.rate !== 1) out.rate = o.rate
  if (o.pan) out.pan = o.pan
  if (STEPPED.includes(cue)) out.step = o.step
  if (cue === 'toggle') out.on = o.on
  if (cue === 'countdown') out.final = o.final
  if (cue === 'medal') out.tier = o.tier
  return out
}
const f1 = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '-')
const flowSecs = (f) => Math.max(...f.steps.map(([c, at, o]) => at / 1000 + CUE_META[c].body / (o?.rate || 1)))

// ── the desk ───────────────────────────────────────────────────────────────────────────────────
function Desk() {
  const [p, setPref] = usePrefs()
  const [cue, setCue] = useState('correct')
  const [o, setO] = useState({ rate: 1, pan: 0, step: 0, on: true, final: false, tier: 'ti' })
  const [lite, setLite] = useState(() => new URLSearchParams(location.search).get('fx') === 'lite')     // ?fx=lite opens in lite voicing
  const [buf, setBuf] = useState(null)
  const [meas, setMeas] = useState(null)
  const [report, setReport] = useState({})
  const [flowRep, setFlowRep] = useState({})
  const [stats, setStats] = useState(sound.stats())
  const [flash, setFlash] = useState(null)
  const [busy, setBusy] = useState(false)
  const [redraw, setRedraw] = useState(0)
  const [running, setRunning] = useState(null)
  const waveRef = useRef(null), specRef = useRef(null), miniRef = useRef(null), meterRef = useRef(null), scopeRef = useRef(null)
  const phRefs = useRef([]), cache = useRef(new Map()), play0 = useRef({ t: 0, dur: 0 }), view = useRef(1)
  const peak = useRef({ l: -90, r: -90, lh: -90, rh: -90, gr: 0, hold: 0 })

  const loadReport = useCallback(() => {
    fetch('/tools/out/sound/_report.json?' + Date.now()).then((r) => (r.ok ? r.json() : [])).then((a) => setReport(Object.fromEntries(a.map((r) => [r.name, r])))).catch(() => {})
    fetch('/tools/out/sound/_flows.json?' + Date.now()).then((r) => (r.ok ? r.json() : [])).then((a) => setFlowRep(Object.fromEntries(a.map((r) => [r.name, r])))).catch(() => {})
  }, [])
  useEffect(loadReport, [loadReport])
  useEffect(() => { const t = setInterval(() => setStats(sound.stats()), 250); return () => clearInterval(t) }, [])
  useEffect(() => { document.documentElement.dataset.fx = lite ? 'lite' : 'full' }, [lite])

  // offline render of the selected cue (cached per cue + opts + voicing)
  const cueOpts = useMemo(() => optsFor(cue, o), [cue, o])
  useEffect(() => {
    let dead = false
    const key = cue + JSON.stringify(cueOpts) + lite
    setBusy(true)
    const get = cache.current.has(key) ? Promise.resolve(cache.current.get(key)) : renderCue(cue, { ...cueOpts, lite }).then((b) => (cache.current.set(key, b), b))
    get.then((b) => { if (!dead) { setBuf(b); setMeas(measure(b)); setBusy(false) } })
    return () => { dead = true }
  }, [cue, cueOpts, lite])
  useEffect(() => {
    if (!buf) return
    const T = palette(), ro = { cue, rate: o.rate }
    view.current = viewOf(buf)
    if (waveRef.current) drawWave(waveRef.current, buf, T, ro)
    if (specRef.current) drawSpec(specRef.current, buf, T, ro)
    if (miniRef.current) drawWave(miniRef.current, buf, T, { ...ro, mini: true })
  }, [buf, redraw, cue, o.rate])
  useEffect(() => {                                        // redraw on resize (the canvases are drawn at device pixels)
    let t
    const on = () => { clearTimeout(t); t = setTimeout(() => setRedraw((n) => n + 1), 150) }
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('resize', on); clearTimeout(t) }
  }, [])

  // playhead + live meter: one rAF loop
  useEffect(() => {
    let raf, last = 0
    const T = palette(), data = new Float32Array(1024)
    const tick = (now) => {
      const pl = play0.current, dur = buf ? view.current : 1
      const x = ((now - pl.t) / 1000 + 0.02) / dur, on = pl.dur > 0 && x >= 0 && x <= 1
      for (const el of phRefs.current) if (el) { el.style.left = (on ? x * 100 : -5) + '%'; el.style.opacity = on ? 1 : 0 }
      if (now - last > 33 && meterRef.current) {
        last = now
        const pr = sound.probe(), s = peak.current
        let l = -90, r = -90, gr = 0
        if (pr) {
          for (const [an, k] of [[pr.left, 'l'], [pr.right, 'r']]) { an.getFloatTimeDomainData(data); let m = 0; for (let i = 0; i < data.length; i++) m = Math.max(m, Math.abs(data[i])); const d = dB(m); if (k === 'l') l = d; else r = d }
          gr = typeof pr.comp.reduction === 'number' ? pr.comp.reduction : pr.comp.reduction.value
        }
        s.l = Math.max(l, s.l - 1.2); s.r = Math.max(r, s.r - 1.2); s.gr = gr
        if (s.l >= s.lh || s.r >= s.rh || now - s.hold > 1200) { s.lh = s.l; s.rh = s.r; s.hold = now }
        drawMeter(meterRef.current, T, s)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [buf])

  const fire = useCallback((c, op = {}, delay = 0) => sound.play(c, { ...op, delay }), [])
  const playSel = useCallback(() => {
    sound.unlock()
    play0.current = { t: performance.now() + 8, dur: 1 }
    fire(cue, cueOpts)
  }, [cue, cueOpts, fire])
  const pick = useCallback((c) => {
    sound.unlock()
    setCue(c); setFlash(c); setTimeout(() => setFlash(null), 240)
    play0.current = { t: performance.now() + 8, dur: 1 }
    fire(c, optsFor(c, o))
  }, [o, fire])
  const runFlow = (flow) => {
    sound.unlock()
    for (const [c, at, op] of flow.steps) fire(c, op || {}, at)
    setRunning({ id: flow.id, k: Date.now() })
  }
  const hammer = () => { sound.unlock(); for (let i = 0; i < 12; i++) fire('tap', {}, i * 30) }

  useEffect(() => {
    const on = (e) => {
      if (e.target.closest?.('input, textarea')) return
      const i = CUES.indexOf(cue)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); pick(CUES[(i + 1) % CUES.length]) }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); pick(CUES[(i - 1 + CUES.length) % CUES.length]) }
      else if (e.key === ' ' && !e.target.closest?.('button')) { e.preventDefault(); playSel() }
      else if (e.key.toLowerCase() === 'm') setPref('sound', !prefs.get('sound'))
      else if (e.key.toLowerCase() === 'l') setLite((v) => !v)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [cue, pick, playSel, setPref])

  const meta = CUE_META[cue], rep = report[cue]
  const state = stats.state === 'running' ? 'go' : stats.state === 'none' ? 'nogo' : 'tele'
  const tone = (ok, warn) => (ok ? 'go' : warn ? 'warn' : 'nogo')
  const volPct = Math.round(p.volume * 100)
  const marks = markList(cue, o.rate, 1)
  const shedN = Object.values(stats.shed || {}).reduce((a, b) => a + b, 0)

  return (
    <div className="snd">
      <div className="snd-wrap">
        <header className="snd-head">
          <div>
            <div className="snd-eyebrow"><b>KIND v7</b> · src/fx/sound.js · D major pentatonic · no audio files</div>
            <h1 className="snd-title">Sound <i>/</i> Mixing desk</h1>
            <p className="snd-sub">{CUES.length} cues synthesised in WebAudio. Buttons play the live engine; the scope is an offline render of the same cue through the same master chain. Tap anything to unlock audio.</p>
          </div>
          <div className="snd-status" aria-live="polite">
            <span><i className="snd-led" data-on={state} />ctx {stats.state}</span>
            <span>{stats.sampleRate ? (stats.sampleRate / 1000).toFixed(1) + ' kHz' : '-'}</span>
            <span>played {stats.played}</span><span>shed {shedN}</span><span>live {stats.active}</span>
          </div>
        </header>

        <div className="snd-deck" role="region" aria-label={`Selected cue: ${meta.label}`}>
          <button className="snd-deck-name" onClick={() => scopeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} aria-label={`${meta.label}: show the scope`}>
            <span className="snd-eyebrow">{meta.kind}</span>
            <span className="snd-deck-l">{meta.label}</span>
          </button>
          <div className="snd-mini" aria-hidden="true">
            <canvas ref={miniRef} />
            <div className="snd-ph" ref={(el) => { phRefs.current[0] = el }}><i /></div>
          </div>
          <button className="snd-btn snd-play" onClick={playSel} aria-label={`Play ${meta.label}`}><i className="snd-tri" aria-hidden="true" /></button>
        </div>

        <section className="snd-master" aria-label="Master">
          <div className="snd-ctl snd-ctl-wide">
            <div className="snd-ctl-row"><label className="snd-eyebrow" htmlFor="vol">Volume · prefs</label><span className="snd-val">{volPct}%</span></div>
            <input id="vol" className="snd-range" type="range" min="0" max="100" value={volPct} style={{ '--p': volPct + '%' }} onChange={(e) => setPref('volume', e.target.value / 100)} />
          </div>
          <div className="snd-ctl">
            <div className="snd-ctl-row"><label className="snd-eyebrow" htmlFor="rate">Rate</label><span className="snd-val">{o.rate.toFixed(2)}×</span></div>
            <input id="rate" className="snd-range" type="range" min="50" max="200" step="5" value={Math.round(o.rate * 100)} style={{ '--p': ((o.rate - 0.5) / 1.5) * 100 + '%' }} onChange={(e) => setO({ ...o, rate: e.target.value / 100 })} />
          </div>
          <div className="snd-ctl">
            <div className="snd-ctl-row"><label className="snd-eyebrow" htmlFor="pan">Pan</label><span className="snd-val">{o.pan === 0 ? 'C' : (o.pan < 0 ? 'L' : 'R') + Math.round(Math.abs(o.pan) * 100)}</span></div>
            <input id="pan" className="snd-range snd-range-c" type="range" min="-100" max="100" step="5" value={Math.round(o.pan * 100)} style={{ '--p': (o.pan + 1) * 50 + '%' }} onChange={(e) => setO({ ...o, pan: e.target.value / 100 })} onDoubleClick={() => setO({ ...o, pan: 0 })} />
          </div>
          <div className="snd-ctl snd-ctl-meter">
            <div className="snd-ctl-row"><span className="snd-eyebrow">Live output · peak L R · compressor GR</span><span className="snd-val snd-dim">dBFS</span></div>
            <div className="snd-meter-live"><canvas ref={meterRef} aria-label="Live output meter" /></div>
          </div>
          <div className="snd-btnrow">
            <button className="snd-btn" data-pressed={!p.sound} aria-pressed={!p.sound} onClick={() => setPref('sound', !p.sound)}>{p.sound ? 'Mute' : 'Muted'}</button>
            <button className="snd-btn" data-pressed={lite} aria-pressed={lite} onClick={() => setLite(!lite)} title="data-fx=lite: the same tunes with a third fewer oscillators (L)">Lite voicing</button>
            <button className="snd-btn" onClick={hammer} title="12 taps, 30 ms apart: the 60 ms debounce should pass about half">Hammer ×12</button>
            <button className="snd-btn" onClick={() => sound.stop(150)}>Stop</button>
          </div>
        </section>

        <div className="snd-cols">
          <div className="snd-col-pick">
            <section className="snd-group" aria-label="Sequences">
              <h2>Sequences <span>how screens fire cues, through the live engine with opts.delay</span></h2>
              <div className="snd-flows">
                {FLOWS.map((f) => { const r = flowRep[f.id]; return (
                  <button key={f.id} className="snd-flow" onClick={() => runFlow(f)} title={f.hint + (r ? ` · momentary loudness, ${r.nodes.peak} voices at the busiest` : '')}>
                    <span className="snd-cue-l">{f.label}</span>
                    <span className="snd-cue-m">{r ? `${f1(r.peak, 0)} dBFS · ${f1(r.lufsM, 0)} LUFS` : f.hint}</span>
                    {running && running.id === f.id && <i key={running.k} className="snd-run" style={{ '--dur': flowSecs(f) + 's' }} />}
                  </button>) })}
              </div>
            </section>

            {GROUPS.map((gr) => (
              <section className="snd-group" key={gr.id} aria-label={gr.title}>
                <h2>{gr.title} <span>{gr.hint}</span></h2>
                <div className="snd-grid">
                  {gr.cues.map((c) => (
                    <button key={c} className="snd-cue" data-kind={gr.id} data-flash={flash === c} aria-pressed={cue === c} onClick={() => pick(c)}>
                      <span className="snd-cue-l">{CUE_META[c].label}</span>
                      <span className="snd-cue-m">{report[c] ? `${f1(report[c].peak, 0)} dBFS · ${f1(report[c].body, 2)} s` : `${CUE_META[c].body} s`}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="snd-scope" aria-label={`Scope: ${cue}`} ref={scopeRef}>
            <div className="snd-scope-head">
              <div>
                <div className="snd-eyebrow">{meta.kind} · {meta.pitched ? 'pitched' : 'unpitched'} · level ×{f1(meta.level, 2)}{lite ? ' · lite' : ''}</div>
                <div className="snd-cue-name">{meta.label}</div>
                <div className="snd-cue-note">{meta.note}</div>
              </div>
              <button className="snd-btn snd-play snd-play-lg" onClick={playSel}><span>Play</span><i className="snd-tri" aria-hidden="true" /></button>
            </div>

            <div className="snd-opts">
              {STEPPED.includes(cue) && (
                <span className="snd-eyebrow">step <span className="snd-seg" role="group" aria-label="step">{(cue === 'detent' ? [0, 1, 3, 5, 7, 9] : [0, 1, 2, 3, 4]).map((s) => <button key={s} aria-pressed={o.step === s} onClick={() => setO({ ...o, step: s })}>{s}</button>)}</span></span>
              )}
              {cue === 'toggle' && <span className="snd-eyebrow">state <span className="snd-seg" role="group" aria-label="toggle state">{[true, false].map((s) => <button key={String(s)} aria-pressed={o.on === s} onClick={() => setO({ ...o, on: s })}>{s ? 'ON' : 'OFF'}</button>)}</span></span>}
              {cue === 'countdown' && <span className="snd-eyebrow">zero <span className="snd-seg" role="group" aria-label="final tick">{[false, true].map((s) => <button key={String(s)} aria-pressed={o.final === s} onClick={() => setO({ ...o, final: s })}>{s ? 'FINAL' : 'TICK'}</button>)}</span></span>}
              {cue === 'medal' && <span className="snd-eyebrow">tier <span className="snd-seg" role="group" aria-label="medal tier">{['bronze', 'silver', 'ti', 'gold'].map((s) => <button key={s} aria-pressed={o.tier === s} onClick={() => setO({ ...o, tier: s })}>{s}</button>)}</span></span>}
              <span className="snd-eyebrow snd-keys">← → cue · space plays · M mute · L lite</span>
            </div>

            <div>
              <div className="snd-head-lab snd-eyebrow"><span>Waveform · L tele / R ignite · dashed: sound.marks</span><span>{busy ? 'rendering…' : buf ? f1(view.current, 2) + ' s window' : ''}</span></div>
              <div className="snd-canvas-box snd-wave"><canvas ref={waveRef} aria-label={`Waveform of ${cue}`} /><div className="snd-ph" aria-hidden="true" ref={(el) => { phRefs.current[1] = el }}><i /></div></div>
            </div>
            <div>
              <div className="snd-head-lab snd-eyebrow"><span>Spectrogram · log 60 Hz-12 kHz · D guides · 6 kHz line</span></div>
              <div className="snd-canvas-box snd-spec"><canvas ref={specRef} aria-label={`Spectrogram of ${cue}`} /><div className="snd-ph" aria-hidden="true" ref={(el) => { phRefs.current[2] = el }}><i /></div></div>
            </div>

            <div className="snd-meters">
              <Meter label="Peak" tone={meas && tone(meas.peak <= -3, meas.peak <= -2)} value={meas && f1(meas.peak)} unit="dBFS · limit -3" />
              <Meter label={meta.kind === 'hero' ? 'Loudness · loudest 400 ms' : 'Loudness · active'} tone={rep && tone(Math.abs(rep.lufs - meta.lufs) <= 3, Math.abs(rep.lufs - meta.lufs) <= 5)} value={rep ? f1(rep.lufs) : '-'} unit={`LUFS · target ${meta.lufs}`} />
              <Meter label="Body (-35 dB)" tone={meas && tone(meas.body <= meta.body, meas.body <= meta.body * 1.15)} value={meas && f1(meas.body, 2)} unit={`s · budget ${meta.body}`} />
              <Meter label="Rings to -60 dBFS" tone={meas && tone(meas.tail <= meta.len, false)} value={meas && f1(meas.tail, 2)} unit={`s · len ${meta.len}`} />
              <Meter label="Spectral centroid" value={rep ? Math.round(rep.centroid) : '-'} unit="Hz" />
              <Meter label=">6 kHz energy" tone={rep && tone(rep.hf <= 0.02, rep.hf <= 0.05)} value={rep ? f1(rep.hf * 100) : '-'} unit="% · limit 5" />
              <Meter label="On a phone speaker" tone={rep && tone(rep.phoneDrop <= 7, rep.phoneDrop <= 11)} value={rep ? '−' + f1(rep.phoneDrop, 0) : '-'} unit="LU vs full range" />
              <Meter label="Mono fold-down" tone={rep && tone(rep.mono <= 4.5, rep.mono <= 9)} value={rep ? '−' + f1(Math.max(0, rep.mono), 1) : '-'} unit="LU on one speaker" />
              <Meter label="Voices at once" tone={rep && rep.nodes && tone(rep.nodes.peak <= 120, rep.nodes.peak <= 160)} value={rep && rep.nodes ? rep.nodes.peak : '-'} unit={rep && rep.nodes ? `sources · ${rep.nodes.sources} made` : 'sources'} />
              <Meter label="On D pentatonic" value={rep && Number.isFinite(rep.fit) ? f1(rep.fit * 100, 0) : '-'} unit="% of tonal energy" />
            </div>
            {marks.length > 0 && (
              <p className="snd-marks"><span className="snd-eyebrow">sound.marks('{cue}')</span>{marks.map((m) => <code key={m.name}>{m.name} <b>{m.t.toFixed(2)} s</b></code>)}</p>
            )}
            {!rep && <p className="snd-note">No audit numbers yet. Run <code>node tools/audio-render.mjs</code> to write tools/out/sound/_report.json.</p>}
          </section>
        </div>

        <section className="snd-group" aria-label="Audit">
          <h2>Audit <span>tools/audio-render.mjs</span> <button className="snd-link" onClick={loadReport}>reload numbers</button></h2>
          <p className="snd-note">Fails: peak &gt; -3 dBFS, clipping, silence, &gt; 6 kHz energy &gt; 5 %, body or tail over budget, mono phase cancellation, a stacked flow above -1 dBFS, a master that is not transparent.</p>
          <div className="snd-scroll">
            <table className="snd-table">
              <thead><tr><th>cue</th><th>kind</th><th>peak</th><th>lufs</th><th>target</th><th>phone</th><th>mono</th><th>body</th><th>budget</th><th>tail</th><th>centroid</th><th>&gt;6k %</th><th>d-pent %</th><th>voices</th></tr></thead>
              <tbody>
                {CUES.map((c) => { const r = report[c], m = CUE_META[c]; return (
                  <tr key={c} data-sel={cue === c} onClick={() => pick(c)}>
                    <td>{c}</td><td>{m.kind}</td>
                    <td className={r ? (r.peak <= -3 ? 'ok' : 'bad') : ''}>{r ? f1(r.peak) : '-'}</td>
                    <td className={r ? (Math.abs(r.lufs - m.lufs) <= 3 ? 'ok' : 'warn') : ''}>{r ? f1(r.lufs) : '-'}</td><td>{m.lufs}</td>
                    <td className={r ? (r.phoneDrop <= (m.kind === 'hero' ? 11 : 7) ? 'ok' : 'warn') : ''}>{r ? '−' + f1(r.phoneDrop, 0) : '-'}</td>
                    <td className={r ? (r.mono <= 4.5 ? 'ok' : r.mono <= 9 ? 'warn' : 'bad') : ''}>{r ? '−' + f1(Math.max(0, r.mono), 1) : '-'}</td>
                    <td className={r ? (r.body <= m.body ? 'ok' : 'bad') : ''}>{r ? f1(r.body, 2) : '-'}</td><td>{m.body}</td>
                    <td className={r ? (r.tail <= m.len ? 'ok' : 'bad') : ''}>{r ? f1(r.tail, 2) : '-'}</td>
                    <td>{r ? Math.round(r.centroid) : '-'}</td>
                    <td className={r ? (r.hf <= 0.02 ? 'ok' : r.hf <= 0.05 ? 'warn' : 'bad') : ''}>{r ? f1(r.hf * 100) : '-'}</td>
                    <td>{r && Number.isFinite(r.fit) ? f1(r.fit * 100, 0) : '-'}</td>
                    <td className={r && r.nodes ? (r.nodes.peak <= 120 ? 'ok' : 'warn') : ''}>{r && r.nodes ? r.nodes.peak : '-'}</td>
                  </tr>) })}
              </tbody>
            </table>
          </div>
          <p className="snd-note">Loudness is K-weighted (BS.1770): active region for UI and rewards, loudest 400 ms for heroes (they build and release). “Phone” is the drop in loudness through a 300 Hz roll-off, a mid-range Android speaker: a cue that loses much more than 7 LU there cannot be heard on the devices our users own. “Mono” is the loss when left and right are folded to one speaker. “Voices” is the most oscillators and noise players sounding at once.</p>
        </section>
      </div>
    </div>
  )
}

function Meter({ label, value, unit, tone }) {
  return (
    <div className="snd-meter" data-tone={tone || undefined}>
      <span className="snd-eyebrow">{label}</span>
      <b>{value ?? '-'}</b>
      <small>{unit}</small>
    </div>
  )
}

window.__sound = sound; window.__prefs = prefs          // test hooks: the page's own instances (a fresh import() may resolve to a different module instance after an HMR update)
mount(<Desk />)
