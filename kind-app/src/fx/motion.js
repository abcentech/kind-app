// Motion runtime — the one rAF loop, the fx level, and the hooks that need to talk to the frame clock.
//   import { raf, useFxLevel, useCountUp, usePointerTilt, useScrollVar, useInView, wait, stagger } from './fx/motion.js'
//
// Everything here is inert until used: no listener is attached and no frame is requested until a
// caller asks for one. The shared loop sleeps whenever nothing is subscribed or the tab is hidden.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { prefs } from '../prefs.js'

const DOC = typeof document !== 'undefined'
const root = DOC ? document.documentElement : null

/* ═════════════════════════ the shared rAF loop ═════════════════════════ */

const fns = []          // slots; a removed slot is nulled and compacted after the frame
let rafId = 0
let lastT = 0
let holes = 0
let ticking = false

function frame(t) {
  rafId = 0
  if (DOC && document.hidden) { lastT = 0; return }
  // Clamp: a tab restored after minutes must not hand 90 000 ms to a physics step.
  const dt = lastT ? (t - lastT > 64 ? 64 : t - lastT) : 16.7
  lastT = t
  ticking = true
  const n = fns.length                  // callbacks added during this frame run on the next one
  for (let i = 0; i < n; i++) {
    const f = fns[i]
    if (!f) continue
    try { f(dt, t) } catch (err) { if (fns[i]) { fns[i] = null; holes++ } console.error('[raf] callback removed after throwing', err) }
  }
  ticking = false
  if (holes) {
    let w = 0
    for (let i = 0; i < fns.length; i++) if (fns[i]) fns[w++] = fns[i]
    fns.length = w
    holes = 0
  }
  if (fns.length) rafId = requestAnimationFrame(frame)
  else lastT = 0
}

function wake() { if (!rafId && fns.length && !(DOC && document.hidden)) rafId = requestAnimationFrame(frame) }

if (DOC) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = 0; lastT = 0 }
    else wake()
  })
}

/** The app's single frame clock. Callbacks get `(dtMs, timestamp)`; `dtMs` is clamped to 64. */
export const raf = {
  /** Subscribe `fn`. Idempotent. Returns an unsubscribe function. */
  add(fn) {
    if (fns.indexOf(fn) < 0) fns.push(fn)
    wake()
    return () => raf.remove(fn)
  },
  remove(fn) {
    const i = fns.indexOf(fn)
    if (i < 0) return
    if (ticking) { fns[i] = null; holes++ } else fns.splice(i, 1)
  },
  get size() { return fns.length - holes },
  get running() { return rafId !== 0 },
}

/* ═════════════════════════ fx level: full | lite ═════════════════════════ */

const mqReduce = DOC && typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
const IOS = DOC && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

let level = 'full'
let reason = 'auto'
const levelSubs = new Set()

// One pure function so the answer is identical at module load and after any change.
//   'lite' pref  → lite.   'full' pref → full, even over OS reduced-motion: it is an explicit,
//   informed choice made in our own Settings, and the only way to get effects back on a device
//   we guessed wrong about.   'auto' → reduced-motion, Data Saver or a weak device → lite.
function compute() {
  const p = prefs.get('fx')
  if (p === 'lite') return ['lite', 'user']
  if (p === 'full') return ['full', 'user']
  if (mqReduce && mqReduce.matches) return ['lite', 'reduced-motion']
  if (DOC) {
    const n = navigator
    if (n.connection && n.connection.saveData) return ['lite', 'save-data']
    if (n.deviceMemory && n.deviceMemory <= 2) return ['lite', 'low-memory']
    // iPhones report 2–6 cores to Safari for fingerprint reasons, yet every iOS 16+ device is fast:
    // the core-count heuristic is Android-only.
    if (!IOS && n.hardwareConcurrency && n.hardwareConcurrency <= 4) return ['lite', 'few-cores']
  }
  return ['full', 'auto']
}

function setLevel(next, why) {
  reason = why
  if (next === level) return
  level = next
  levelSubs.forEach((f) => f())
}

// The attribute is the source of truth for CSS, so JS follows it when someone else writes it
// (a playground booting with data-fx="lite", a QA script). Our own writes land here as no-ops.
const attrLevel = () => {
  const v = root && root.getAttribute('data-fx')
  return v === 'lite' || v === 'full' ? v : null
}
{
  const [l, why] = compute()
  level = attrLevel() || l
  reason = attrLevel() ? 'attribute' : why
}

let installed = false
function install() {
  installed = true
  const again = () => { const [l, why] = compute(); if (root) root.dataset.fx = l; setLevel(l, why) }
  prefs.subscribe(again)
  if (mqReduce) (mqReduce.addEventListener ? mqReduce.addEventListener('change', again) : mqReduce.addListener(again))
  if (DOC && navigator.connection && navigator.connection.addEventListener) navigator.connection.addEventListener('change', again)
  new MutationObserver(() => { const a = attrLevel(); if (a && a !== level) setLevel(a, 'attribute') })
    .observe(root, { attributes: true, attributeFilter: ['data-fx'] })
}

/** Sets `<html data-fx>` from prefs.fx + reduced-motion + device heuristics, and keeps it current. Call once at boot. */
export function applyFxLevel() {
  if (!DOC) return level
  if (!installed) install()
  const [l, why] = compute()
  root.dataset.fx = l
  setLevel(l, why)
  return level
}

/** Synchronous level for non-React code (the canvas engine, stagger()). */
export const getFxLevel = () => level
/** Why the level is what it is: 'user' | 'reduced-motion' | 'save-data' | 'low-memory' | 'few-cores' | 'attribute' | 'auto'. */
export const getFxReason = () => reason
export const subscribeFxLevel = (f) => { levelSubs.add(f); return () => levelSubs.delete(f) }

export const useFxLevel = () => useSyncExternalStore(subscribeFxLevel, getFxLevel, () => 'full')

const subMotion = (f) => {
  if (!mqReduce) return () => {}
  if (mqReduce.addEventListener) { mqReduce.addEventListener('change', f); return () => mqReduce.removeEventListener('change', f) }
  mqReduce.addListener(f); return () => mqReduce.removeListener(f)
}
/** The OS-level preference, reactive. (For "is the app animating?" use useFxLevel.) */
export const useReducedMotion = () => useSyncExternalStore(subMotion, () => !!(mqReduce && mqReduce.matches), () => false)

/* ═════════════════════════ small helpers ═════════════════════════ */

export const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** Inline style for the i-th child of a staggered entrance. Lite collapses every delay to 0. */
export const stagger = (i, step = 50, base = 0) => {
  const d = level === 'lite' ? 0 : base + i * step
  return { transitionDelay: `${d}ms`, animationDelay: `${d}ms` }
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

export const EASE = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) },
}

/* ═════════════════════════ useCountUp ═════════════════════════ */

/**
 * Animated number. Returns the value to render; pair with `.fx-num` (tabular figures) so digits do not jitter.
 * A new `to` continues from wherever the number currently is. Lite jumps straight to the target.
 */
export function useCountUp(to, { from = 0, duration = 900, ease = 'outExpo', start = true, round = true } = {}) {
  const target = Number.isFinite(to) ? to : 0
  // Lite (or no duration) never animates: start on the answer, so the first paint is not a flash of `from`.
  const cur = useRef(start && (getFxLevel() === 'lite' || duration <= 0) ? target : from)
  const [shown, setShown] = useState(cur.current)

  useEffect(() => {
    if (!start) return undefined
    if (getFxLevel() === 'lite' || duration <= 0 || cur.current === target) {
      cur.current = target
      setShown(target)
      return undefined
    }
    const a = cur.current
    const f = typeof ease === 'function' ? ease : EASE[ease] || EASE.outExpo
    let t0 = -1
    let last = NaN
    const step = (_dt, t) => {
      if (t0 < 0) t0 = t
      const k = clamp((t - t0) / duration, 0, 1)
      const v = a + (target - a) * f(k)
      cur.current = v
      const out = round ? Math.round(v) : v
      if (out !== last) { last = out; setShown(out) }
      if (k >= 1) { cur.current = target; raf.remove(step) }
    }
    raf.add(step)
    return () => raf.remove(step)
    // `from` deliberately omitted: it seeds the first run only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, start, duration, ease, round])

  return round ? Math.round(shown) : shown
}

/* ═════════════════════════ useInView ═════════════════════════ */

export function useInView(ref, { once = true, margin = '0px', threshold = 0 } = {}) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return undefined }
    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1]
      if (e.isIntersecting) { setInView(true); if (once) io.disconnect() }
      else if (!once) setInView(false)
    }, { rootMargin: margin, threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, once, margin, threshold])
  return inView
}

/* ═════════════════════════ useScrollVar ═════════════════════════ */

/**
 * Writes scroll progress (0..1, unitless) to a CSS variable. Passive listener, one write per frame at most.
 *   ref     the scroller (pass document.documentElement's ref, or any element with overflow)
 *   invert  1 - p. Learn starts at the bottom and climbs, so it wants invert:true to get 0 on the pad, 1 in orbit.
 *   target  where the variable lands: 'self' (default, the scroller) | 'root' (<html>) | an element | a ref
 * In lite the variable updates in 2 % steps: the information survives, the style churn does not.
 */
export function useScrollVar(ref, name = '--scroll', { invert = false, target = 'self' } = {}) {
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const isDoc = el === document.documentElement || el === document.body
    const src = isDoc ? window : el
    const out = target === 'root' ? root : target === 'self' ? el : target && target.current ? target.current : target
    if (!out || !out.style) return undefined
    let last = -1
    let queued = false

    const measure = () => {
      const top = isDoc ? window.scrollY : el.scrollTop
      const max = isDoc ? root.scrollHeight - window.innerHeight : el.scrollHeight - el.clientHeight
      let p = max > 0 ? clamp(top / max, 0, 1) : 0
      if (invert) p = 1 - p
      const eps = level === 'lite' ? 0.02 : 0.0005
      if (last < 0 || Math.abs(p - last) >= eps || ((p === 0 || p === 1) && p !== last)) {
        last = p
        out.style.setProperty(name, p.toFixed(4))
      }
    }
    const tick = () => { raf.remove(tick); queued = false; measure() }
    const kick = () => { if (!queued) { queued = true; raf.add(tick) } }

    measure()
    src.addEventListener('scroll', kick, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(kick) : null
    if (ro) { ro.observe(el); if (el.firstElementChild) ro.observe(el.firstElementChild) }
    return () => {
      src.removeEventListener('scroll', kick)
      if (ro) ro.disconnect()
      raf.remove(tick)
      out.style.removeProperty(name)
    }
  }, [ref, name, invert, target])
}

/* ═════════════════════════ usePointerTilt ═════════════════════════ */
//
// Writes, on the element:   --rx --ry   degrees, with units   (rotateX(var(--rx)) rotateY(var(--ry)))
//                           --gx --gy   glare position, %      (radial-gradient(at var(--gx) var(--gy), …))
//                           --tilt-on   0..1  glare strength
// plus data-tilting while it is moving (so `will-change` exists only then).
// Convention: the side under the finger/cursor sinks away (tvOS-style). The gyro behaves like a virtual
// pointer: the card stays put in the world while the phone moves around it.
//
// Input:  mouse/pen → hover;  touch → press and drag;  phones → DeviceOrientation, relative to a slowly
// drifting baseline so how you happen to hold the phone is "level" (iOS asks for permission on first tap).

const GYRO_RANGE = 24      // degrees of phone tilt that map to full card tilt
const GYRO_BASE_TAU = 1800 // ms: how fast "the way I'm holding it" becomes neutral
const gyro = { status: 'idle', px: 0, py: 0, baseB: null, baseG: null, lastT: 0, kx: 0, ky: 0 }
const gyroUsers = new Set()
const hasOrientation = DOC && 'DeviceOrientationEvent' in window
const needsPermission = hasOrientation && typeof window.DeviceOrientationEvent.requestPermission === 'function'
const coarse = () => DOC && typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
let gyroListening = false

const wrap180 = (d) => (d > 180 ? d - 360 : d < -180 ? d + 360 : d)

function onOrient(e) {
  if (e.beta == null || e.gamma == null) return
  // A real sensor reading is proof of access, whatever the platform's permission story says.
  if (gyro.status === 'idle' || gyro.status === 'pending') { gyro.status = 'on'; gyroUsers.forEach((t) => t.kick()) }
  if (gyro.baseB === null) { gyro.baseB = e.beta; gyro.baseG = e.gamma; gyro.lastT = e.timeStamp; return }
  const db = wrap180(e.beta - gyro.baseB)
  const dg = e.gamma - gyro.baseG
  const k = 1 - Math.exp(-(e.timeStamp - gyro.lastT) / GYRO_BASE_TAU)
  gyro.lastT = e.timeStamp
  gyro.baseB += db * k
  gyro.baseG += dg * k
  gyro.px = clamp(-dg / GYRO_RANGE, -1, 1)
  gyro.py = clamp(-db / GYRO_RANGE, -1, 1)
  if (Math.abs(gyro.px - gyro.kx) > 0.004 || Math.abs(gyro.py - gyro.ky) > 0.004) {
    gyro.kx = gyro.px; gyro.ky = gyro.py
    gyroUsers.forEach((t) => { if (t.visible) t.kick() })   // a Locker of 31 cards: only the ones on screen do any work
  }
}
function syncGyroListener() {
  // Listen whenever someone could use it: iOS stays silent until permission is granted, Android needs none.
  const want = gyro.status !== 'denied' && gyroUsers.size > 0
  if (want && !gyroListening) { window.addEventListener('deviceorientation', onOrient, { passive: true }); gyroListening = true }
  else if (!want && gyroListening) { window.removeEventListener('deviceorientation', onOrient); gyroListening = false; gyro.baseB = null }
}
function setGyro(status) { gyro.status = status; syncGyroListener(); if (status !== 'on') { gyro.px = gyro.py = gyro.kx = gyro.ky = 0 } gyroUsers.forEach((t) => t.kick()) }

/** 'idle' | 'pending' | 'on' | 'denied' | 'unsupported' */
export const gyroStatus = () => (hasOrientation && coarse() ? gyro.status : 'unsupported')
/**
 * Ask for motion access. Must run inside a tap handler on iOS (a Settings toggle, an onboarding step);
 * tilt elements also ask on their own first tap. Resolves to the resulting gyroStatus().
 */
export function requestGyro() {
  if (!hasOrientation || !coarse()) return Promise.resolve('unsupported')
  if (gyro.status === 'on' || gyro.status === 'pending' || gyro.status === 'denied') return Promise.resolve(gyro.status)
  if (!needsPermission) { setGyro('on'); return Promise.resolve('on') }
  setGyro('pending')
  return window.DeviceOrientationEvent.requestPermission().then(
    (r) => { setGyro(r === 'granted' ? 'on' : 'denied'); return gyro.status },
    () => { setGyro('denied'); return 'denied' },
  )
}

const tiltIO = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver((entries) => {
      for (let i = 0; i < entries.length; i++) { const t = entries[i].target.__tilt; if (t) { t.visible = entries[i].isIntersecting; if (t.visible) t.kick() } }
    })
  : null

class Tilt {
  constructor(el, { max, glare, gyro: useGyro }) {
    this.el = el
    this.max = max
    this.glare = glare
    this.useGyro = useGyro && hasOrientation && coarse()
    this.cx = 0; this.cy = 0; this.vx = 0; this.vy = 0     // spring state, -1..1
    this.g = 0                                              // glare strength
    this.px = 0; this.py = 0                                // pointer target
    this.down = false; this.hover = false
    this.visible = true; this.queued = false; this.moving = false
    this.w = 1; this.h = 1; this.ox = 0; this.oy = 0
    this.w_rx = NaN; this.w_ry = NaN; this.w_gx = NaN; this.w_gy = NaN; this.w_g = NaN
    el.__tilt = this

    this.step = (dtMs) => {
      const s = (dtMs > 40 ? 40 : dtMs) / 1000
      let tx = 0, ty = 0, gt = 0
      const hold = this.hover || this.down
      if (hold) { tx = this.px; ty = this.py; gt = 1 }
      else if (this.useGyro && gyro.status === 'on' && this.visible) {
        tx = gyro.px; ty = gyro.py
        gt = 0.5 + 0.5 * clamp(Math.sqrt(tx * tx + ty * ty) * 1.5, 0, 1)
      }
      // A spring with a little overshoot on release (ζ≈.7), critically damped while following the finger.
      const kS = 240, c = 2 * Math.sqrt(kS) * (hold ? 1 : 0.7)
      this.vx += (kS * (tx - this.cx) - c * this.vx) * s
      this.vy += (kS * (ty - this.cy) - c * this.vy) * s
      this.cx += this.vx * s
      this.cy += this.vy * s
      this.g += (gt - this.g) * (1 - Math.exp(-s / 0.09))
      // Asleep when at rest on its target; any pointer move or gyro change wakes it through kick().
      if (Math.abs(this.cx - tx) < 0.0015 && Math.abs(this.cy - ty) < 0.0015 && Math.abs(this.vx) < 0.01
        && Math.abs(this.vy) < 0.01 && Math.abs(this.g - gt) < 0.004) {
        this.cx = tx; this.cy = ty; this.g = gt; this.vx = this.vy = 0
        this.write()
        this.sleep()
        return
      }
      this.write()
    }

    this.rect = () => {
      const r = el.getBoundingClientRect()
      // Width/height from layout (untransformed) so tilting never shifts its own hit-mapping.
      this.w = el.offsetWidth || r.width || 1
      this.h = el.offsetHeight || r.height || 1
      this.ox = r.left + r.width / 2
      this.oy = r.top + r.height / 2
    }
    this.aim = (e) => {
      this.px = clamp((e.clientX - this.ox) / (this.w / 2), -1, 1)
      this.py = clamp((e.clientY - this.oy) / (this.h / 2), -1, 1)
      this.kick()
    }
    this.onEnter = (e) => { if (e.pointerType === 'touch') return; this.rect(); this.hover = true; this.aim(e) }
    this.onMove = (e) => { if (e.pointerType === 'touch' ? this.down : this.hover) this.aim(e) }
    this.onLeave = () => { this.hover = false; this.kick() }
    this.onDown = (e) => { if (e.pointerType !== 'touch') return; this.rect(); this.down = true; this.aim(e) }
    this.onUp = () => { this.down = false; this.kick() }
    this.onFirstTap = () => { el.removeEventListener('click', this.onFirstTap, true); requestGyro() }

    el.addEventListener('pointerenter', this.onEnter)
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerleave', this.onLeave)
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointercancel', this.onUp)

    if (this.useGyro) {
      gyroUsers.add(this)
      if (needsPermission && gyro.status === 'idle') el.addEventListener('click', this.onFirstTap, true)   // iOS: permission needs a tap
      else if (gyro.status === 'idle') requestGyro()                                                       // Android: just listen
      syncGyroListener()
      if (tiltIO) tiltIO.observe(el)
    }
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--gx', '50%'); el.style.setProperty('--gy', '50%'); el.style.setProperty('--tilt-on', '0')
    this.kick()
  }

  kick() {
    if (!this.queued) {
      this.queued = true
      raf.add(this.step)
      if (!this.moving) { this.moving = true; this.el.setAttribute('data-tilting', '') }
    }
  }
  sleep() {
    raf.remove(this.step)
    this.queued = false
    if (this.moving) { this.moving = false; this.el.removeAttribute('data-tilting') }
  }

  write() {
    const m = this.max
    const rx = Math.round(clamp(-this.cy * m, -m * 1.2, m * 1.2) * 100) / 100
    const ry = Math.round(clamp(this.cx * m, -m * 1.2, m * 1.2) * 100) / 100
    const st = this.el.style
    if (rx !== this.w_rx) { this.w_rx = rx; st.setProperty('--rx', rx + 'deg') }
    if (ry !== this.w_ry) { this.w_ry = ry; st.setProperty('--ry', ry + 'deg') }
    if (this.glare) {
      const gx = Math.round((50 + this.cx * 60) * 10) / 10
      const gy = Math.round((50 + this.cy * 60) * 10) / 10
      const g = Math.round(clamp(this.g, 0, 1) * 100) / 100
      if (gx !== this.w_gx) { this.w_gx = gx; st.setProperty('--gx', gx + '%') }
      if (gy !== this.w_gy) { this.w_gy = gy; st.setProperty('--gy', gy + '%') }
      if (g !== this.w_g) { this.w_g = g; st.setProperty('--tilt-on', String(g)) }
    }
  }

  destroy() {
    const el = this.el
    this.sleep()
    el.removeEventListener('pointerenter', this.onEnter)
    el.removeEventListener('pointermove', this.onMove)
    el.removeEventListener('pointerleave', this.onLeave)
    el.removeEventListener('pointerdown', this.onDown)
    el.removeEventListener('pointerup', this.onUp)
    el.removeEventListener('pointercancel', this.onUp)
    el.removeEventListener('click', this.onFirstTap, true)
    if (this.useGyro) { gyroUsers.delete(this); syncGyroListener(); if (tiltIO) tiltIO.unobserve(el) }
    for (const p of ['--rx', '--ry', '--gx', '--gy', '--tilt-on']) el.style.removeProperty(p)
    delete el.__tilt
  }
}

export function usePointerTilt(ref, { max = 10, glare = true, gyro: useGyro = true } = {}) {
  const lvl = useFxLevel()
  useEffect(() => {
    const el = ref.current
    if (!el || lvl === 'lite') return undefined
    const t = new Tilt(el, { max, glare, gyro: useGyro })
    return () => t.destroy()
  }, [ref, max, glare, useGyro, lvl])
}
