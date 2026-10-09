// KIND v7 · sound — the app's voice. Synthesised in WebAudio, no audio files. Contract: docs/V7-CONTRACT.md §3.1, design §5.
//
//   sound.unlock()                 first user gesture (this module also listens for one itself, so a forgotten call is harmless)
//   sound.play('correct')          opts: { gain=1, rate=1, delay=0 (ms) }  + cue extras: step (climb the scale), on (toggle), final (countdown), tier (medal), pan (-1..1)
//                                  returns true when the cue was scheduled (false: muted, locked, debounced or shed)
//   sound.marks('launch')          → { lift: 1.95 } seconds into the cue where the picture should land (see sound-marks.js)
//   sound.duck(ms)                 pull everything else down for a long moment
//   sound.stop(ms)                 fade out whatever is playing (a launch that was cancelled)
//   sound.ready                    unlocked, running and the synth is loaded
//   sound.onUnlock(fn)             fn() once, the first time audio is actually running (App shows its one-off "Sound on" toast here); returns an unsubscribe
//
// Which cue for which moment (every confirming sound has a matching haptic; the cues share one key, D major pentatonic, so any two may overlap):
//   press      tap (buttons, rows, panels) · select / deselect (chips, answer plates, segments) · toggle {on} (switches) · detent {step 0-9} (slider, picker wheel) · nav (dock tab; pan it to the tab)
//   layers     open / close (sheets, dialogs) · next (a lesson slide) · check (CHECK pressed) · unlock (a locked day opens)
//   verdicts   correct / wrong · error (a failed action) · combo {step} (consecutive rights) · xp {step} (the +XP counter) · ring {step 0-2} (a ring closes)
//   rewards    streak (day kept) · shield · chest (opens) · reveal (a card flips) · rare (a gold card) · medal {tier} · rankup
//   launch     ignite (on press of the start button) then launch (the lesson rises; flash on marks('launch').lift) · countdown (T-3, T-2, T-1) then go at zero; countdown {final} is the zero pip when there is no go (they share D5 and A5: never both)
//   moments    splash (cold start) · complete (orbit insertion; the big bell is marks('complete').hit)
//
// The DSP and the cues live in ./sound-synth.js, a lazy chunk (first load pays for neither). It is warmed at idle and on unlock.
// Respects prefs `sound` + `volume`, read on every play; data-fx="lite" plays the same tunes with a third fewer oscillators.
// iOS Safari mutes WebAudio while the ringer switch is silent — we leave that alone on purpose.
import { prefs } from '../prefs.js'
import { marksOf } from './sound-marks.js'

export const CUES = ['tap', 'select', 'deselect', 'toggle', 'detent', 'nav', 'open', 'close', 'next', 'check', 'correct', 'wrong', 'combo',
  'xp', 'streak', 'shield', 'chest', 'reveal', 'rare', 'unlock', 'ignite', 'launch', 'complete', 'rankup', 'medal', 'error', 'countdown', 'go', 'ring', 'splash']
const KNOWN = new Set(CUES)

const DEBOUNCE = 60       // ms — an identical cue never starts within 60 ms of itself (wall clock: the audio clock can tick in coarse buffer-sized steps)
const QUEUE_MAX_AGE = 400 // ms — a cue asked for while the context was waking is dropped if it would arrive stale
const UI_VOICE_CAP = 12   // audible cues at once beyond which micro UI sounds are shed (rewards and heroes are never shed)

let ctx = null, master = null, synth = null, loading = null, building = false
let unlocked = false, announced = false, seed = 1, played = 0, dropped = 0
const shed = {}           // cue → how many of its plays were dropped (debounce, voice cap, error)
const unlockCbs = new Set()
const queue = []          // [{ cue, opts, at }]
const last = new Map()    // cue → wall-clock start (ms) of its latest play
const live = new Set()    // { cue, end, busy, bus }   end: reverb fully out · busy: the audible body is over

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))
const enabled = () => prefs.get('sound') !== false
const lite = () => typeof document !== 'undefined' && document.documentElement.dataset.fx === 'lite'
const drop = (cue) => { dropped++; shed[cue] = (shed[cue] || 0) + 1; return false }

function getCtx() {
  if (ctx) return ctx
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC) return null
  try { ctx = new AC({ latencyHint: 'interactive' }) } catch { return null }
  ctx.addEventListener?.('statechange', () => { if (ctx.state === 'running') { announce(); flush() } })
  return ctx
}

function loadSynth() {
  if (!loading) {
    loading = import('./sound-synth.js').then((m) => { synth = m; build(); warmUp(); return m }).catch(() => { loading = null })
  }
  return loading
}

/** Before anyone has touched the screen there is no context to build on, but the noise and impulse responses do not need one: make them now, in idle slices
 *  (at 48 kHz, the usual device rate), so the first tap only has the graph and two convolver loads left. Stops the moment a context exists (it takes over). */
function warmUp() {
  if (typeof window === 'undefined') return
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 120))
  const step = (d) => {
    if (ctx || !synth) return
    try { if (!synth.prewarm(48000, Math.max(4, Math.min(12, d?.timeRemaining?.() ?? 8)))) idle(step) } catch { /* the first tap builds it instead */ }
  }
  idle(step)
}

function announce() {
  if (announced) return
  announced = true
  for (const f of unlockCbs) { try { f() } catch { /* a listener must not break audio */ } }
  unlockCbs.clear()
}

/** The master chain is built a slice at a time (noise, impulse responses, convolvers) so the tap that unlocks audio never freezes the screen; cues asked for meanwhile are queued. */
async function build() {
  if (!ctx || !synth || master || building) return
  building = true
  try { master = await synth.createMasterAsync(ctx, { volume: prefs.get('volume') }) } catch { master = null } finally { building = false }
  flush()
}

/** Ask the context to run. Deliberately not guarded by "a resume is already pending": on iOS the promise from a gesture that did not count
 *  (pointerdown) can stay pending, and the next gesture (touchend, click) must still be allowed to try. resume() is idempotent. */
function kick() {
  if (!ctx || ctx.state === 'running' || !enabled()) return
  try { const p = ctx.resume(); if (p && p.then) p.then(flush, () => {}) } catch { /* not allowed yet: the next gesture retries */ }
}

function flush() {
  if (!ready()) return
  const now = performance.now()
  for (const q of queue.splice(0)) { if (now - q.at < QUEUE_MAX_AGE) start(q.cue, q.opts); else drop(q.cue) }
}

const ready = () => !!ctx && !!master && ctx.state === 'running'

function prune(t) {
  for (const v of live) if (v.end < t) { v.bus.dispose(); live.delete(v) }
}
const audible = (t) => { let n = 0; for (const v of live) if (v.busy > t) n++; return n }

function start(cue, opts) {
  const meta = synth.CUE_META[cue]
  const vol = clamp(+prefs.get('volume') || 0, 0, 1)
  if (vol <= 0 && !opts.force) return false
  const rate = clamp(+opts.rate || 1, .5, 2)
  const delay = clamp(+opts.delay || 0, 0, 5000)
  const wall = performance.now() + delay
  const prev = last.get(cue)
  if (prev !== undefined && Math.abs(wall - prev) < DEBOUNCE) return drop(cue)
  const at = ctx.currentTime + .006 + delay / 1000
  prune(ctx.currentTime)
  if (meta.kind === 'ui' && audible(ctx.currentTime) >= UI_VOICE_CAP) return drop(cue)
  master.setVolume(vol)
  let v
  try { v = synth.schedule(ctx, master, cue, at, { lite: lite(), ...opts, seed: seed++ }) } catch { return drop(cue) }
  last.set(cue, wall)
  v.cue = cue
  live.add(v)
  setTimeout(() => { v.bus.dispose(); live.delete(v) }, Math.max(0, (v.end - ctx.currentTime) * 1000) + 150)
  played++
  return true
}

export const sound = {
  unlock() {
    const c = getCtx()
    if (!c) return
    unlocked = true
    loadSynth()
    build()                                                   // the idle preload may have finished before there was a context to build on (async: returns at once)
    if (c.state !== 'running') {
      kick()
      try { const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, c.sampleRate); s.connect(c.destination); s.start(0) } catch { /* iOS wake-up blip, best effort */ }
    }
  },

  play(cue, opts = {}) {
    if (!KNOWN.has(cue)) return false
    if (!opts.force && !enabled()) return false
    if (!ctx) return false                                    // nobody has touched the screen yet: still locked
    if (ready()) return start(cue, opts)
    if (!unlocked) return false
    queue.push({ cue, opts, at: performance.now() })          // waking up (first tap, iOS interruption): play it if it is still fresh
    if (queue.length > 12) drop(queue.shift().cue)
    loadSynth(); build(); kick()
    return false
  },

  /** Moments inside a cue the picture should land on, in seconds from its start at `rate`: sound.marks('launch') → { lift }. Available before audio is. */
  marks: marksOf,

  duck(ms = 1000, depth = .4) { if (ready()) master.duck(clamp(depth, .05, 1), clamp(ms, 0, 8000) / 1000, ctx.currentTime) },

  stop(ms = 120) {
    queue.length = 0
    for (const v of live) v.bus.fade(ms / 1000)
  },

  /** The output meter: { left, right, comp } (AnalyserNodes + the compressor), or null while locked. For the playground; nothing in the app calls it. */
  probe() { return ready() ? master.probe() : null },

  /** { ready, state, sampleRate, played, dropped, active, shed:{cue:n} } — for the playground and for tests. */
  stats() { return { ready: ready(), state: ctx ? ctx.state : 'none', sampleRate: ctx ? ctx.sampleRate : 0, played, dropped, active: ctx ? audible(ctx.currentTime) : 0, shed: { ...shed } } },

  onUnlock(fn) { if (announced) { fn(); return () => {} } unlockCbs.add(fn); return () => unlockCbs.delete(fn) },

  get ready() { return ready() },
}

if (typeof window !== 'undefined') {
  // Self-unlock on the first real gesture (also re-wakes after an iOS interruption). Capture phase: we run before the handler that wants to play.
  const onGesture = () => { if (!unlocked) sound.unlock(); else kick() }
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(ev, onGesture, { capture: true, passive: true })

  // Sound off → suspend the context (no idle audio hardware); on → wake it. Volume follows the slider live.
  prefs.subscribe(() => {
    if (!ctx) return
    if (!enabled()) { sound.stop(60); ctx.suspend?.().catch?.(() => {}) }
    else { if (master) master.setVolume(prefs.get('volume')); kick() }
  })
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) ctx.suspend?.().catch?.(() => {})
    else kick()
  })

  // Warm the synth chunk once the app is idle so the very first cue is not waiting on the network.
  if (enabled()) (window.requestIdleCallback || ((f) => setTimeout(f, 2500)))(() => { loadSynth() })

  import.meta.hot?.dispose(() => { try { ctx?.close() } catch { /* fine */ } })
}
