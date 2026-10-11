// FX engine — one fixed canvas, one pool, nothing allocated per frame.
//   import { fx } from './fx/fx.js'      (FxLayer.jsx mounts the canvas; with none mounted fx makes its own)
//
//   fx.sparks  fx.embers  fx.confetti  fx.shockwave  fx.flash  fx.shake  fx.trail  fx.at        (contract §3.4)
//   fx.fly  fx.launch  fx.celebrate  fx.cannons  fx.go  fx.nogo  fx.pop  fx.ignite  fx.clear  fx.stats  fx.setQuality   (the moments, composed once)
//
// How it is built
//   · SIMULATION  150 particles + 10 rings, struct-of-arrays in typed arrays. A burst that would overflow steals the
//     oldest particle instead of dropping the new one: the effect at your fingertip always wins.
//   · RENDERER    WebGL: every shape (glow, spark filament, ring, foil, exhaust node) is a quad shaded procedurally by one
//     fragment shader, all vertices written into one Float32Array and uploaded once per frame (2 draw calls). No textures,
//     no per-particle API calls. Canvas 2D is the automatic fallback when WebGL is missing; it looks the same.
//     The context is made lazily (idle time after mount, or the first effect), without MSAA (a full-screen 4x buffer is
//     ~20 MB on a phone that has 2 GB): every edge is antialiased in the shader instead. After 8 s idle the backing
//     store shrinks to 1x1 and grows back on the next effect.
//     Why not Canvas 2D first: V8 boxes every fractional argument to a DOM binding (~50 B per drawImage/lineTo call,
//     measured), so 230 calls a frame is ~12 KB/frame of garbage. Through a typed-array buffer it is zero.
//   · NO GARBAGE  numbers never travel through JS call arguments in the frame path (that boxes them too): spawn()
//     takes ints and the caller fills typed arrays; the quad writer reads a Float64Array register file.
//   · COLOUR      read once from the :root design tokens. Each palette is a 12-step ramp (hot to cool).
//   · LIFECYCLE   canvas is display:none unless something is alive; the shared rAF loop sleeps with it.
//     Everything is a no-op in lite. A rolling frame-time governor sheds particles on a slow GPU.
import { raf, getFxLevel, subscribeFxLevel } from './motion.js'

const CAP = 150          // live particles
const RCAP = 10          // live shockwave rings
const RAMP = 12          // colour steps per palette
const SHADES = 12        // foil brightness steps
const MAXPAL = 24
const TAU = Math.PI * 2
const D2R = Math.PI / 180
const FLASH_GAP = 340    // ms between full-screen flashes: stays under WCAG 2.3.1's three-per-second

const K_SPARK = 1, K_EMBER = 2, K_FOIL = 3, K_PUFF = 4, K_COMET = 5, K_DIAM = 6   // K_DIAM: a 2-frame bloom/shock-diamond (exhaust, muzzle flare)

/* ═════════════════════════ pool (struct of arrays) ═════════════════════════ */

const kind = new Uint8Array(CAP)
const pal = new Uint8Array(CAP)
const X = new Float32Array(CAP), Y = new Float32Array(CAP)
const VX = new Float32Array(CAP), VY = new Float32Array(CAP)
const AGE = new Float32Array(CAP), LIFE = new Float32Array(CAP)    // ms; a negative age is a start delay
const SIZE = new Float32Array(CAP)
const ROT = new Float32Array(CAP), VROT = new Float32Array(CAP)
const PH = new Float32Array(CAP), VPH = new Float32Array(CAP)      // flicker / flip / sway phase
const G = new Float32Array(CAP), DRAG = new Float32Array(CAP)
const EX = new Float32Array(CAP)    // foil: skew · ember/puff: sway · comet: end x · diamond: half-length
const EY = new Float32Array(CAP)    // comet: end y · diamond: half-width
const CX = new Float32Array(CAP), CY = new Float32Array(CAP)       // foil: flutter (CX) · comet: bezier control · diamond: ramp step (CY)
const SX = new Float32Array(CAP), SY = new Float32Array(CAP)       // comet: start · puff/diamond: unit axis
const cbs = new Array(CAP).fill(null)
const free = new Uint8Array(CAP)
let freeN = 0
for (let i = CAP - 1; i >= 0; i--) free[freeN++] = i
let live = 0

const RX = new Float32Array(RCAP), RY = new Float32Array(RCAP)
const RAGE = new Float32Array(RCAP), RDUR = new Float32Array(RCAP)  // RDUR 0 = free
const RSIZE = new Float32Array(RCAP), RW = new Float32Array(RCAP)
const RPAL = new Uint8Array(RCAP)
let ringsLive = 0

const trails = []

// Scalar state that changes every frame lives in a typed array: a `let` holding a double allocates a box per write.
const S = new Float64Array(8)
const S_FRAME = 0, S_FPS = 1, S_TICK = 2, S_BX = 3, S_BY = 4, S_DT = 5, S_E = 6
S[S_FRAME] = 16.7; S[S_FPS] = 60

function grab() {
  if (freeN > 0) { live++; return free[--freeN] }
  // Pool full: reuse the particle nearest the end of its life (never a comet: someone is waiting on it).
  let best = -1, bt = -2
  for (let i = 0; i < CAP; i++) {
    if (kind[i] && kind[i] !== K_COMET) { const t = AGE[i] / LIFE[i]; if (t > bt) { bt = t; best = i } }
  }
  return best
}
function kill(i) { kind[i] = 0; cbs[i] = null; free[freeN++] = i; live-- }

/** Claim a slot (ints only: no number is boxed). The caller fills X Y VX VY AGE(-delay) LIFE SIZE and the extras. */
function spawn(k, p) {
  const i = grab()
  if (i < 0) return -1
  kind[i] = k; pal[i] = p
  ROT[i] = 0; VROT[i] = 0; PH[i] = 0; VPH[i] = 0
  G[i] = 0; DRAG[i] = 0; EX[i] = 0; EY[i] = 0; CX[i] = 0; CY[i] = 0; SX[i] = 0; SY[i] = 0; VX[i] = 0; VY[i] = 0; AGE[i] = 0
  cbs[i] = null
  return i
}

/* ═════════════════════════ colour: tokens → palettes ═════════════════════════ */

// xorshift32 over a typed array: inlines into the callers and returns an unboxed double, where Math.random() allocates one.
const RS = new Uint32Array(1)
RS[0] = (Math.random() * 4294967296) >>> 0 || 1
function rand() {
  let x = RS[0]
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5
  RS[0] = x
  return RS[0] * 2.3283064365386963e-10
}
let T = null                    // token colours, [r,g,b] 0..255
let easeOut = 'cubic-bezier(.16, 1, .3, 1)'
let normCtx = null

function parseColor(str) {
  const s = (str || '').trim()
  if (!s) return null
  let m
  if ((m = /^#([0-9a-f]{3,8})$/i.exec(s))) {
    let h = m[1]
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  if ((m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s))) return [+m[1], +m[2], +m[3]]
  if (s.startsWith('var(')) { // var(--tele) → resolve against :root
    const n = /var\(\s*(--[\w-]+)/.exec(s)
    return n ? parseColor(getComputedStyle(document.documentElement).getPropertyValue(n[1])) : null
  }
  // Anything else the browser understands (named, hsl, color-mix…): let a canvas normalise it to #rrggbb / rgba().
  if (!normCtx) normCtx = document.createElement('canvas').getContext('2d')
  normCtx.fillStyle = '#010203'          // sentinel: an unparseable string leaves it untouched
  normCtx.fillStyle = s
  const n = normCtx.fillStyle
  return n === '#010203' ? null : parseColor(n)
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const BLACK = [0, 0, 0]
const rgb = (c) => 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'
const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'

function readTokens() {
  if (T) return true
  if (typeof document === 'undefined') return false
  const cs = getComputedStyle(document.documentElement)
  const g = (n) => parseColor(cs.getPropertyValue(n))
  const t = {
    i1: g('--ignite-1'), i2: g('--ignite-2'), i3: g('--ignite-3'),
    g1: g('--gold-1'), g2: g('--gold-2'), g3: g('--gold-3'),
    t1: g('--ti-1'), t2: g('--ti-2'), t3: g('--ti-3'),
    tele: g('--tele'), tele2: g('--tele-2'), go: g('--go'), nogo: g('--nogo'),
  }
  for (const k in t) if (!t[k]) return false      // stylesheet not loaded yet: try again on the next call
  T = t
  easeOut = cs.getPropertyValue('--ease-out').trim() || easeOut
  return true
}

// Stops run hot → cool across a particle's life.
const NAMED = {
  fire:   () => [mix(T.i3, T.t1, 0.7), T.i3, T.i2, T.i1, mix(T.i1, BLACK, 0.6)],
  ignite: () => [T.i3, T.i2, T.i1, mix(T.i1, BLACK, 0.55)],
  gold:   () => [mix(T.g1, T.t1, 0.5), T.g1, T.g2, T.g3],
  ti:     () => [T.t1, T.t2, T.t3],
  tele:   () => [mix(T.tele, T.t1, 0.65), T.tele, T.tele2],
  go:     () => [mix(T.go, T.t1, 0.6), T.go, mix(T.go, BLACK, 0.5)],
  nogo:   () => [mix(T.nogo, T.t1, 0.6), T.nogo, mix(T.nogo, BLACK, 0.5)],
}
const FOIL_BASE = { ti: () => T.t2, gold: () => T.g2, ignite: () => T.i2, tele: () => T.tele2, go: () => T.go, nogo: () => T.nogo }

const pals = []                 // palette objects (strings for the 2D renderer), indexed by pal[]
const palIndex = new Map()
const PAL = new Float32Array(MAXPAL * RAMP * 3)       // ramp colours 0..1, for the GL renderer
const FOILT = new Float32Array(MAXPAL * SHADES * 3)   // foil body shades
const FOILH = new Float32Array(MAXPAL * SHADES * 3)   // foil crease shades

function ramp(stops) {
  const out = new Array(RAMP), cols = new Array(RAMP)
  for (let i = 0; i < RAMP; i++) {
    const f = (i / (RAMP - 1)) * (stops.length - 1)
    const k = Math.min(stops.length - 2, f | 0)
    const c = mix(stops[k], stops[k + 1], f - k)
    cols[i] = c; out[i] = rgb(c)
  }
  return { ramp: out, cols }
}

function foilShades(base) {
  const body = new Array(SHADES), hi = new Array(SHADES), bc = new Array(SHADES), hc = new Array(SHADES)
  for (let i = 0; i < SHADES; i++) {
    const f = i / (SHADES - 1)
    // dark steel → the metal itself → near-white flash
    const c = f < 0.55 ? mix(mix(base, BLACK, 0.8), base, f / 0.55) : mix(base, T.t1, (f - 0.55) / 0.45 * 0.92)
    const h = mix(c, T.t1, 0.4)
    body[i] = rgb(c); hi[i] = rgb(h); bc[i] = c; hc[i] = h
  }
  return { body, hi, bc, hc }
}

function makePalette(key, slot) {
  let stops, foilBase
  if (NAMED[key]) { stops = NAMED[key](); foilBase = (FOIL_BASE[key] || (() => NAMED[key]()[1]))() }
  else {
    const c = parseColor(key)
    if (!c) return null
    stops = [mix(c, T.t1, 0.55), c, mix(c, BLACK, 0.55)]; foilBase = c
  }
  const r = ramp(stops)
  const f = foilShades(foilBase)
  for (let i = 0; i < RAMP; i++) for (let c = 0; c < 3; c++) PAL[(slot * RAMP + i) * 3 + c] = r.cols[i][c] / 255
  for (let i = 0; i < SHADES; i++) {
    for (let c = 0; c < 3; c++) {
      FOILT[(slot * SHADES + i) * 3 + c] = f.bc[i][c] / 255
      FOILH[(slot * SHADES + i) * 3 + c] = f.hc[i][c] / 255
    }
  }
  return { key, ramp: r.ramp, cols: r.cols, glow: null, foil: f.body, foilHi: f.hi }
}

/** Palette index for a token name ('fire'|'ignite'|'gold'|'ti'|'tele'|'go'|'nogo') or any CSS colour. */
function palette(key) {
  if (!readTokens()) return 0
  let i = palIndex.get(key)
  if (i === undefined) {
    if (pals.length >= MAXPAL) return palette('fire')
    const p = makePalette(key, pals.length)
    if (!p) { i = palette('fire'); palIndex.set(key, i); return i }      // unparseable colour: fall back, and remember
    i = pals.length; pals.push(p); palIndex.set(key, i)
  }
  return i
}

/** "ignite" | ["gold","ti"] | undefined → array of palette indices */
function paletteList(colors, fallback) {
  if (!colors || !colors.length) return [palette(fallback)]
  const list = Array.isArray(colors) ? colors : [colors]
  const out = []
  for (let i = 0; i < list.length; i++) out.push(palette(list[i]))
  return out
}

/* ═════════════════════════ canvas lifecycle ═════════════════════════ */

let canvas = null, flashEl = null
let ctx = null                  // 2D context (fallback renderer)
let gl = null                   // WebGL context (primary renderer)
let glLost = false
let inited = false              // the rendering context exists (made lazily: idle after mount, or the first effect)
let shrunk = false              // backing store is 1x1 while idle
let owned = false               // true when fx made the canvas itself (no <FxLayer/> mounted)
let W = 0, H = 0, dpr = 1
let running = false
let quality = 1, qualityLocked = false
let slow = 0, fast = 0
let idleT = 0, warmT = 0
let broken = false              // the renderer threw: effects go quiet for the session instead of taking the rAF loop with them
let forced = 'auto'             // 'auto' | 'webgl' | '2d': read when the context is made, i.e. set it before the first effect (tests)

const IDLE_SHRINK = 8000        // ms of nothing alive before the backing store is released
const isLite = () => getFxLevel() === 'lite'

function size() {
  if (!canvas || !inited) return
  const w = window.innerWidth, h = window.innerHeight
  const d = Math.min(window.devicePixelRatio || 1, 2)
  if (!shrunk && w === W && h === H && d === dpr) return
  W = w; H = h; dpr = d; shrunk = false
  canvas.width = Math.round(w * d)
  canvas.height = Math.round(h * d)
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  if (gl && !glLost) { gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(U_RES, W, H) }
  if (ctx) ctx.lineCap = 'round'     // resizing a canvas resets its context state
}

/** Make the rendering context. Cheap to skip: nothing is allocated until an effect, or the idle prewarm, asks. */
function init() {
  if (inited || !canvas) return
  inited = true
  gl = ctx = null; glLost = false
  if (forced !== '2d' && probeGL()) { try { initGL(canvas) } catch { gl = null } }
  if (!gl) ctx = canvas.getContext('2d')
  W = H = 0
  size()
}

// Shader compile + context creation is 10–40 ms on a 2 GB Android: keep it off the boot path, but done before the first tap.
let warmIdle = false
function cancelPrewarm() {
  if (warmIdle) { if (typeof cancelIdleCallback === 'function') cancelIdleCallback(warmT) } else clearTimeout(warmT)
  warmT = 0
}
function prewarm() {
  cancelPrewarm()
  // Two steps, so the capability probe (throwaway context + shader compile) and the real context + second compile are separate tasks.
  const go = () => {
    warmT = 0
    if (!canvas || inited || isLite()) return
    if (forced !== '2d') probeGL()
    warmIdle = false
    warmT = setTimeout(() => { warmT = 0; if (canvas && !inited && !isLite()) init() }, 60)
  }
  warmIdle = typeof requestIdleCallback === 'function'
  warmT = warmIdle ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 1500)
}

function shrink() {
  idleT = 0
  if (running || !canvas || !inited || shrunk || glLost) return
  canvas.width = canvas.height = 1
  canvas.style.width = canvas.style.height = '1px'
  W = H = 0; shrunk = true
}

function attachLayer(c, f) {
  if (owned) { if (canvas) canvas.remove(); if (flashEl) flashEl.remove(); owned = false }
  canvas = c; flashEl = f
  inited = false; shrunk = false
  gl = ctx = null; glLost = false
  W = H = 0
  window.addEventListener('resize', size)
  window.addEventListener('orientationchange', size)
  if (running) { init(); c.setAttribute('data-live', '') } else prewarm()
  return detachLayer
}
function detachLayer() {
  window.removeEventListener('resize', size)
  window.removeEventListener('orientationchange', size)
  clearTimeout(idleT); idleT = 0; cancelPrewarm()
  clear()
  if (canvas && gl) {
    canvas.removeEventListener('webglcontextlost', onGLLost); canvas.removeEventListener('webglcontextrestored', onGLRestored)
    if (!glLost) { gl.deleteProgram(glProg); gl.deleteBuffer(glBuf) }   // React may re-attach this same element (StrictMode): leave it clean
  }
  glProg = glBuf = null
  canvas = ctx = gl = flashEl = null
  inited = false
}

function ensure() {
  if (canvas) return true
  if (typeof document === 'undefined' || !document.body || !readTokens()) return false
  // No <FxLayer/> yet (a playground, a test): make our own so fx never silently does nothing.
  const c = document.createElement('canvas')
  c.className = 'fx-layer'
  c.setAttribute('aria-hidden', 'true')
  c.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:var(--z-fx,95)'
  const f = document.createElement('div')
  f.className = 'fx-flash'
  f.setAttribute('aria-hidden', 'true')
  f.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0;z-index:var(--z-fx,95)'
  document.body.append(c, f)
  attachLayer(c, f)
  owned = true
  return true
}

function start() {
  if (running || !canvas) return
  running = true
  clearTimeout(idleT); idleT = 0
  if (!inited) init(); else if (shrunk) size()
  canvas.setAttribute('data-live', '')
  raf.add(tick)
}
function stop() {
  if (!running) return
  running = false
  raf.remove(tick)
  if (gl && !glLost) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT) }
  else if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height) }
  if (canvas) canvas.removeAttribute('data-live')
  clearTimeout(idleT)
  idleT = setTimeout(shrink, IDLE_SHRINK)
}

function ready() { return !broken && !isLite() && ensure() && readTokens() }

/* ═════════════════════════ simulation (shared by both renderers) ═════════════════════════ */

// Comets ease out of the HUD slowly and accelerate into the target: e = smoothstep(u)·.35 + u²·.65.
// bez() reads the eased progress from S[S_E] and writes the point to S_BX/S_BY, so no double crosses a call.
function bez(i) {
  const e = S[S_E], u = 1 - e
  S[S_BX] = u * u * SX[i] + 2 * u * e * CX[i] + e * e * EX[i]
  S[S_BY] = u * u * SY[i] + 2 * u * e * CY[i] + e * e * EY[i]
}
// The exhaust. A real plume is not a fuzzy ball: it is a hot, narrow throat; a column that swells a little and tapers to
// nothing; a few faint bright shock diamonds in the first third; and a glow cast on whatever is around it.
//   · puffs   born at the throat, fast and lightly damped so the column is ~110 px long at scale 1, sway sideways a touch
//   · diamonds  re-born every frame at fixed distances down the axis (two frames of life): they flicker like the real thing
//   · bloom   one soft ellipse at the throat, the light the engine throws
const PLUME = 108
function emitTrail(tr) {
  const dt = S[S_DT]
  const r = tr.el.getBoundingClientRect()     // the one DOMRect per frame per live trail: the DOM offers no other way to follow a transform
  const ax = r.left + r.width * 0.5 + tr.dx
  const ay = (tr.where === 'center' ? r.top + r.height * 0.5 : tr.where === 'top' ? r.top : r.bottom) + tr.dy
  if (!tr.has) { tr.lx = ax; tr.ly = ay; tr.has = true }
  tr.acc += dt * 0.001 * tr.rate * quality
  const sc = tr.scale
  const throat = Math.min(r.width, 48) * 0.1 * sc
  const cd = tr.cd, sd = tr.sd
  while (tr.acc >= 1) {
    tr.acc -= 1
    const u = rand()                          // spread along the path moved since last frame: no gaps when it travels fast
    const sp = (250 + rand() * 180) * sc
    const lat = rand() + rand() - 1           // triangular: denser along the axis than at the lips
    const i = spawn(K_PUFF, tr.pal)
    if (i >= 0) {
      X[i] = tr.lx + (ax - tr.lx) * u - sd * lat * throat; Y[i] = tr.ly + (ay - tr.ly) * u + cd * lat * throat
      VX[i] = cd * sp + (rand() - 0.5) * 22 * sc; VY[i] = sd * sp + (rand() - 0.5) * 22 * sc
      LIFE[i] = 320 + rand() * 300; SIZE[i] = (2.1 + rand() * 1.9) * sc; DRAG[i] = 1.7
      PH[i] = rand() * TAU; VPH[i] = 7 + rand() * 8; EX[i] = 10 + rand() * 24; SX[i] = -sd; SY[i] = cd
    }
    if (rand() < 0.12) {                      // the odd spark thrown off the plume
      const a = tr.dir + (rand() - 0.5) * 1.1, v = (160 + rand() * 200) * sc
      const j = spawn(K_SPARK, tr.pal)
      if (j >= 0) {
        X[j] = tr.lx + (ax - tr.lx) * u; Y[j] = tr.ly + (ay - tr.ly) * u
        VX[j] = Math.cos(a) * v; VY[j] = Math.sin(a) * v
        LIFE[j] = 480 + rand() * 360; SIZE[j] = 1 + rand() * 1.1; G[j] = 520; DRAG[j] = 1.7; VPH[j] = 18 + rand() * 14; PH[j] = rand() * TAU
      }
    }
  }
  if (quality > 0.5) {
    const L = PLUME * sc
    for (let k = 0; k < 3; k++) {
      const d = (0.17 + k * 0.2) * L
      const i = spawn(K_DIAM, tr.pal)
      if (i < 0) break
      X[i] = ax + cd * d; Y[i] = ay + sd * d; SX[i] = cd; SY[i] = sd
      EX[i] = (6.4 - k * 1.5) * sc; EY[i] = (3.1 - k * 0.7) * sc * (0.8 + 0.4 * rand())
      LIFE[i] = 34; SIZE[i] = (0.95 - k * 0.2) * (0.55 + 0.45 * rand()); CY[i] = 0
    }
    // the flame itself: two nested tongues along the axis (yellow core, orange body) and the light the engine throws
    const t1 = spawn(K_DIAM, tr.pal)
    if (t1 >= 0) {
      X[t1] = ax + cd * 0.3 * L; Y[t1] = ay + sd * 0.3 * L; SX[t1] = cd; SY[t1] = sd
      EX[t1] = 0.2 * L; EY[t1] = 0.036 * L; LIFE[t1] = 34; SIZE[t1] = 0.5 + rand() * 0.14; CY[t1] = 1
    }
    const t2 = spawn(K_DIAM, tr.pal)
    if (t2 >= 0) {
      X[t2] = ax + cd * 0.42 * L; Y[t2] = ay + sd * 0.42 * L; SX[t2] = cd; SY[t2] = sd
      EX[t2] = 0.3 * L; EY[t2] = 0.058 * L; LIFE[t2] = 34; SIZE[t2] = 0.3 + rand() * 0.1; CY[t2] = 3
    }
    const g = spawn(K_DIAM, tr.pal)
    if (g >= 0) {
      X[g] = ax + cd * 0.08 * L; Y[g] = ay + sd * 0.08 * L; SX[g] = cd; SY[g] = sd
      EX[g] = 0.3 * L; EY[g] = 0.16 * L; LIFE[g] = 34; SIZE[g] = 0.16 + rand() * 0.05; CY[g] = 4
    }
  }
  tr.lx = ax; tr.ly = ay
}

function update() {
  const dt = S[S_DT], s = dt * 0.001

  for (let k = trails.length - 1; k >= 0; k--) {
    const tr = trails[k]
    if (!tr.on || !tr.el.isConnected) { tr.on = false; trails.splice(k, 1); continue }
    emitTrail(tr)
  }

  for (let i = 0; i < CAP; i++) {
    const k = kind[i]
    if (!k) continue
    const age = AGE[i] + dt
    AGE[i] = age
    if (age < 0) continue
    if (age >= LIFE[i]) {
      if (k === K_COMET) { arrive(i); continue }
      kill(i); continue
    }
    switch (k) {
      case K_SPARK: case K_PUFF: {
        const d = Math.exp(-DRAG[i] * s)
        VX[i] *= d; VY[i] = VY[i] * d + G[i] * s
        X[i] += VX[i] * s; Y[i] += VY[i] * s
        PH[i] += VPH[i] * s
        if (k === K_PUFF) { const w = Math.sin(PH[i]) * EX[i] * s * (AGE[i] / LIFE[i]); X[i] += SX[i] * w; Y[i] += SY[i] * w }   // sway grows down the plume
        break
      }
      case K_EMBER: {
        PH[i] += VPH[i] * s
        X[i] += (VX[i] + Math.sin(PH[i]) * EX[i]) * s
        Y[i] += VY[i] * s
        VY[i] *= Math.exp(-0.25 * s)
        break
      }
      case K_FOIL: {
        const d = Math.exp(-DRAG[i] * s)
        VX[i] *= d; VY[i] = VY[i] * d + G[i] * s
        PH[i] += VPH[i] * s
        ROT[i] += VROT[i] * s
        X[i] += (VX[i] + Math.sin(PH[i] * 0.5) * CX[i]) * s
        Y[i] += VY[i] * s
        if (Y[i] > H + 40) kill(i)
        break
      }
      case K_COMET: {
        const u = age / LIFE[i]
        S[S_E] = u * u * (3 - 2 * u) * 0.35 + u * u * 0.65
        bez(i)
        X[i] = S[S_BX]; Y[i] = S[S_BY]
        break
      }
      default: break
    }
  }

  for (let r = 0; r < RCAP; r++) {
    if (!RDUR[r]) continue
    RAGE[r] += dt
    if (RAGE[r] >= RDUR[r]) { RDUR[r] = 0; ringsLive-- }
  }
}

function arrive(i) {
  const cb = cbs[i], ex = EX[i], ey = EY[i], p = pal[i]
  kill(i)
  for (let j = 0; j < 5; j++) {
    const a = rand() * TAU, sp = (90 + rand() * 260) * 0.38
    const n = spawn(K_SPARK, p)
    if (n >= 0) {
      X[n] = ex; Y[n] = ey; VX[n] = Math.cos(a) * sp; VY[n] = Math.sin(a) * sp
      LIFE[n] = 380 + rand() * 360; SIZE[n] = 1 + rand() * 1.2; G[n] = 360; DRAG[n] = 2.2; VPH[n] = 16 + rand() * 18; PH[n] = rand() * TAU
    }
  }
  if (cb) cb()
}

/* ═════════════════════════ renderer: WebGL ═════════════════════════ */
//
// One vertex = 11 floats: pos(2) loc(2) col(4) prm(3). Quads are 6 vertices, no index buffer. `loc` and `prm` feed the
// fragment shader, which draws by mode:  0 glow · 1 foil · 2 hairline ring · 3 spark filament · 4 soft ring (bloom) · 5 ellipse glow.
// Additive modes output (rgb·I, I) under blendFunc(ONE, ONE), the same arithmetic as Canvas 2D's 'lighter'.

const STRIDE = 11
const MAXV = 6144
const CHUNK = 256                                   // upload granularity (vertices): pre-made views, so no subarray() per frame
const VB = new Float32Array(MAXV * STRIDE)
const VIEWS = []
for (let k = 1; k <= MAXV / CHUNK; k++) VIEWS.push(VB.subarray(0, k * CHUNK * STRIDE))
let nv = 0
let U_RES = null
let glProg = null, glBuf = null

const Q = new Float64Array(16)                      // quad register file: set, then flushQuad()
const Q_CX = 0, Q_CY = 1, Q_UX = 2, Q_UY = 3, Q_HX = 4, Q_HY = 5, Q_OX = 6, Q_OY = 7
const Q_R = 8, Q_G = 9, Q_B = 10, Q_A = 11, Q_M = 12, Q_P1 = 13, Q_P2 = 14
const CORN = new Int8Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1])

const VS = `attribute vec2 a_pos;attribute vec2 a_loc;attribute vec4 a_col;attribute vec3 a_prm;
uniform vec2 u_res;varying vec2 v_loc;varying vec4 v_col;varying vec3 v_prm;
void main(){vec2 c=a_pos/u_res*2.0-1.0;gl_Position=vec4(c.x,-c.y,0.0,1.0);v_loc=a_loc;v_col=a_col;v_prm=a_prm;}`

const FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_loc;varying vec4 v_col;varying vec3 v_prm;
void main(){
  float m=v_prm.x;float I=0.0;vec3 c=v_col.rgb;
  if(m<0.5){                       /* glow: p1 = radius */
    float d=length(v_loc)/v_prm.y;
    I=exp(-d*d*5.5)*(1.0-d*d);I=max(I,0.0);
    c=mix(c,vec3(1.0),0.35*I*I*I);
  }else if(m<1.5){                 /* foil, premultiplied. loc = sheet coords -1..1, p1/p2 = half size in device px: a 1 px soft edge in place of MSAA */
    float e=clamp((1.0-abs(v_loc.x))*v_prm.y,0.0,1.0)*clamp((1.0-abs(v_loc.y))*v_prm.z,0.0,1.0);
    float g=0.84+0.3*(0.5+0.5*v_loc.x)*(0.72+0.28*v_loc.y);   /* brushed-metal ramp across the sheet */
    float a=v_col.a*e;
    gl_FragColor=vec4(c*g*a,a);return;
  }else if(m<2.5){                 /* hairline ring: p1 = radius, p2 = half-width */
    float d=abs(length(v_loc)-v_prm.y);
    I=1.0-smoothstep(v_prm.z-0.7,v_prm.z+0.7,d);
  }else if(m<3.5){                 /* filament: p1 = length, p2 = half-width; tail at x=0, head at x=p1 */
    float dx=max(max(-v_loc.x,v_loc.x-v_prm.y),0.0);
    float d=length(vec2(dx,v_loc.y));
    float core=1.0-smoothstep(v_prm.z-0.6,v_prm.z+0.6,d);
    float bloom=exp(-d*d/(v_prm.z*v_prm.z*8.0+0.001))*0.4;
    I=(core+bloom)*mix(0.42,1.0,clamp(v_loc.x/max(v_prm.y,0.001),0.0,1.0));
  }else if(m<4.5){                 /* soft ring (bloom): p1 = radius, p2 = half-width */
    float d=abs(length(v_loc)-v_prm.y);
    float f=1.0-clamp(d/v_prm.z,0.0,1.0);I=f*f;
  }else{                           /* ellipse glow: p1/p2 = semi-axes along the quad's x/y */
    float d=length(v_loc/vec2(v_prm.y,v_prm.z));
    I=exp(-d*d*5.5)*(1.0-d*d);I=max(I,0.0);
    c=mix(c,vec3(1.0),0.4*I*I);
  }
  I*=v_col.a;
  gl_FragColor=vec4(c*I,I);
}`

function compile(g, type, src) {
  const sh = g.createShader(type)
  g.shaderSource(sh, src); g.compileShader(sh)
  if (!g.getShaderParameter(sh, g.COMPILE_STATUS)) { const e = g.getShaderInfoLog(sh); g.deleteShader(sh); throw new Error('fx shader: ' + e) }
  return sh
}
function link(g) {
  const p = g.createProgram()
  g.attachShader(p, compile(g, g.VERTEX_SHADER, VS)); g.attachShader(p, compile(g, g.FRAGMENT_SHADER, FS))
  g.bindAttribLocation(p, 0, 'a_pos'); g.bindAttribLocation(p, 1, 'a_loc'); g.bindAttribLocation(p, 2, 'a_col'); g.bindAttribLocation(p, 3, 'a_prm')
  g.linkProgram(p)
  if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error('fx program: ' + g.getProgramInfoLog(p))
  return p
}

let glProbe = null
/** Can this browser run our shader? Tested on a throwaway canvas so a failure never strands the real one. */
function probeGL() {
  if (glProbe !== null) return glProbe
  try {
    const g = document.createElement('canvas').getContext('webgl')
    if (!g) return (glProbe = false)
    link(g)
    const lose = g.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext()
    glProbe = true
  } catch { glProbe = false }
  return glProbe
}

function buildGL() {
  const prog = glProg = link(gl)
  gl.useProgram(prog)
  U_RES = gl.getUniformLocation(prog, 'u_res')
  const buf = glBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, VB.byteLength, gl.DYNAMIC_DRAW)
  const B = 4
  const layout = [[0, 2, 0], [1, 2, 2], [2, 4, 4], [3, 3, 8]]
  for (let i = 0; i < layout.length; i++) {
    gl.enableVertexAttribArray(layout[i][0])
    gl.vertexAttribPointer(layout[i][0], layout[i][1], gl.FLOAT, false, STRIDE * B, layout[i][2] * B)
  }
  gl.disable(gl.DEPTH_TEST)
  gl.enable(gl.BLEND)
  gl.clearColor(0, 0, 0, 0)
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.uniform2f(U_RES, W, H)
}
function initGL(c) {
  gl = c.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' })
  if (!gl) throw new Error('no webgl')
  c.addEventListener('webglcontextlost', onGLLost)
  c.addEventListener('webglcontextrestored', onGLRestored)
  W = H = 0
  buildGL()
}
function onGLLost(e) { e.preventDefault(); glLost = true }
function onGLRestored() { glLost = false; try { buildGL(); size() } catch { glLost = true } }

function flushQuad() {
  if (nv + 6 > MAXV) return
  const cx = Q[Q_CX], cy = Q[Q_CY], ux = Q[Q_UX], uy = Q[Q_UY], hx = Q[Q_HX], hy = Q[Q_HY], ox = Q[Q_OX], oy = Q[Q_OY]
  const r = Q[Q_R], g = Q[Q_G], b = Q[Q_B], a = Q[Q_A], m = Q[Q_M], p1 = Q[Q_P1], p2 = Q[Q_P2]
  let o = nv * STRIDE
  for (let c = 0; c < 12; c += 2) {
    const lx = CORN[c] * hx, ly = CORN[c + 1] * hy
    VB[o] = cx + lx * ux - ly * uy; VB[o + 1] = cy + lx * uy + ly * ux
    VB[o + 2] = lx + ox; VB[o + 3] = ly + oy
    VB[o + 4] = r; VB[o + 5] = g; VB[o + 6] = b; VB[o + 7] = a
    VB[o + 8] = m; VB[o + 9] = p1; VB[o + 10] = p2
    o += STRIDE
  }
  nv += 6
}
function setRamp(p, ci) { const k = (p * RAMP + ci) * 3; Q[Q_R] = PAL[k]; Q[Q_G] = PAL[k + 1]; Q[Q_B] = PAL[k + 2] }
/** Glow disc. Set Q_CX, Q_CY, Q_P1 (radius), Q_A and a colour first. */
function glowQuad() {
  Q[Q_HX] = Q[Q_P1]; Q[Q_HY] = Q[Q_P1]
  Q[Q_UX] = 1; Q[Q_UY] = 0; Q[Q_OX] = 0; Q[Q_OY] = 0; Q[Q_M] = 0; Q[Q_P2] = 0
  flushQuad()
}
/** Ring quad. Set Q_CX, Q_CY, Q_P1 (radius), Q_P2 (half-width), Q_A, a colour and Q_M (2 hairline / 4 bloom) first. */
function ringQuad() {
  const ext = Q[Q_P1] + Q[Q_P2] + 3
  Q[Q_HX] = ext; Q[Q_HY] = ext
  Q[Q_UX] = 1; Q[Q_UY] = 0; Q[Q_OX] = 0; Q[Q_OY] = 0
  flushQuad()
}

const LP = new Float64Array(10)                     // foil local points
const PP = new Float64Array(10)                     // …transformed
const TRI_BODY = new Uint8Array([0, 1, 2, 0, 2, 3])
const TRI_HI = new Uint8Array([0, 1, 4])
const UV = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1, -1, 0.1])   // sheet coordinates of the five foil points

function glFoil(i) {
  if (nv + 9 > MAXV) return
  const t = AGE[i] / LIFE[i]
  const flip = Math.cos(PH[i])
  const af = flip < 0 ? -flip : flip
  let sh = (af * 0.65 + 0.35 * (0.5 + 0.5 * Math.sin(ROT[i] * 2 + PH[i] * 0.5))) * (SHADES - 1)
  if (af < 0.16) sh = SHADES - 1                 // edge-on: the foil catches the light
  else if (flip < 0) sh *= 0.62                  // back face runs darker
  const si = sh | 0
  const rot = ROT[i], c = Math.cos(rot), s = Math.sin(rot)
  const v = af < 0.07 ? 0.07 : af                // never collapses to nothing: a hairline remains
  const w = SIZE[i] * 0.5, h = SIZE[i] * 1.35, k = EX[i]
  // a sheared sheet: x shifts by -k·y/h, so the 5th point sits on the left edge at y = 0.1h (and sheet coords stay exact per triangle)
  LP[0] = -w + k; LP[1] = -h; LP[2] = w + k; LP[3] = -h; LP[4] = w - k; LP[5] = h; LP[6] = -w - k; LP[7] = h; LP[8] = -w - k * 0.1; LP[9] = h * 0.1
  for (let n = 0; n < 10; n += 2) { PP[n] = X[i] + c * LP[n] - s * v * LP[n + 1]; PP[n + 1] = Y[i] + s * LP[n] + c * v * LP[n + 1] }
  const aw = w * dpr, ah = (h * v > 0.9 ? h * v : 0.9) * dpr
  const fade = (1 - t) * 4 > 1 ? 1 : (1 - t) * 4
  const ci = (pal[i] * SHADES + si) * 3
  let o = nv * STRIDE
  for (let n = 0; n < 6; n++) {                  // body
    const q = TRI_BODY[n], p = q * 2
    VB[o] = PP[p]; VB[o + 1] = PP[p + 1]; VB[o + 2] = UV[p]; VB[o + 3] = UV[p + 1]
    VB[o + 4] = FOILT[ci]; VB[o + 5] = FOILT[ci + 1]; VB[o + 6] = FOILT[ci + 2]; VB[o + 7] = fade
    VB[o + 8] = 1; VB[o + 9] = aw; VB[o + 10] = ah
    o += STRIDE
  }
  for (let n = 0; n < 3; n++) {                  // crease: the sheet is not flat
    const p = TRI_HI[n] * 2
    VB[o] = PP[p]; VB[o + 1] = PP[p + 1]; VB[o + 2] = UV[p]; VB[o + 3] = UV[p + 1]
    VB[o + 4] = FOILH[ci]; VB[o + 5] = FOILH[ci + 1]; VB[o + 6] = FOILH[ci + 2]; VB[o + 7] = fade
    VB[o + 8] = 1; VB[o + 9] = aw; VB[o + 10] = ah
    o += STRIDE
  }
  nv += 9
}

function glLight(i) {
  const k = kind[i]
  const t = AGE[i] / LIFE[i]
  const p = pal[i]
  switch (k) {
    case K_FOIL: {                               // the glint: foil flashes as it turns edge-on to the light
      const af = Math.abs(Math.cos(PH[i]))
      if (af < 0.26) {
        Q[Q_CX] = X[i]; Q[Q_CY] = Y[i]; Q[Q_P1] = SIZE[i] * 2.3
        Q[Q_A] = (1 - af / 0.26) * ((1 - t) * 4 > 1 ? 1 : (1 - t) * 4) * 0.95
        setRamp(p, 1); glowQuad()
      }
      break
    }
    case K_SPARK: {
      const ci = (t * (RAMP - 1)) | 0
      const a = (1 - t) * (1 - t) * (0.72 + 0.28 * Math.sin(PH[i]))
      const vx = VX[i], vy = VY[i]
      const sp = Math.sqrt(vx * vx + vy * vy) + 0.001
      const len = (sp * 0.032 > 26 ? 26 : sp * 0.032) + 1
      const w = SIZE[i] * (1 - t * 0.5)
      const ux = vx / sp, uy = vy / sp
      Q[Q_CX] = X[i] - ux * len * 0.5; Q[Q_CY] = Y[i] - uy * len * 0.5
      Q[Q_UX] = ux; Q[Q_UY] = uy
      Q[Q_HX] = len * 0.5 + w * 2.5; Q[Q_HY] = w * 2.5
      Q[Q_OX] = len * 0.5; Q[Q_OY] = 0
      Q[Q_M] = 3; Q[Q_P1] = len; Q[Q_P2] = w * 0.62; Q[Q_A] = a
      setRamp(p, ci); flushQuad()                                              // the filament, with its own bloom
      Q[Q_CX] = X[i]; Q[Q_CY] = Y[i]; Q[Q_P1] = SIZE[i] * 4.0; Q[Q_A] = a * 0.6
      setRamp(p, ci); glowQuad()                                               // luminous head
      if (t < 0.4) { Q[Q_P1] = SIZE[i] * 1.6; Q[Q_A] = a * 0.8; setRamp(p, 0); glowQuad() }   // white-hot while young
      break
    }
    case K_EMBER: {
      const env = t < 0.14 ? t / 0.14 : t > 0.55 ? (1 - t) / 0.45 : 1
      const fl = 0.7 + 0.3 * Math.sin(PH[i] * 3.1 + i)
      Q[Q_CX] = X[i]; Q[Q_CY] = Y[i]; Q[Q_P1] = SIZE[i] * 3.5; Q[Q_A] = env * fl * 0.85
      setRamp(p, (2 + t * (RAMP - 3)) | 0); glowQuad()
      break
    }
    case K_PUFF: {
      const ci = (t * (RAMP - 1)) | 0
      const sz = SIZE[i] * (1 + 0.9 * t - 1.5 * t * t) * 5      // swells a little off the throat, tapers to nothing
      const a = (1 - t) * (1 - t * 0.35) * 0.8
      Q[Q_CX] = X[i]; Q[Q_CY] = Y[i]; Q[Q_P1] = sz * 0.5; Q[Q_A] = a
      setRamp(p, ci); glowQuad()
      if (t < 0.2) { Q[Q_P1] = sz * 0.17; Q[Q_A] = a * 0.65; setRamp(p, 0); glowQuad() }   // white-hot only at the throat
      break
    }
    case K_DIAM: {                                // shock diamond / muzzle flare / engine bloom: an ellipse along (SX,SY)
      const hx = EX[i] * 2.2, hy = EY[i] * 2.2
      Q[Q_CX] = X[i]; Q[Q_CY] = Y[i]; Q[Q_UX] = SX[i]; Q[Q_UY] = SY[i]
      Q[Q_HX] = hx; Q[Q_HY] = hy; Q[Q_OX] = 0; Q[Q_OY] = 0
      Q[Q_M] = 5; Q[Q_P1] = hx; Q[Q_P2] = hy; Q[Q_A] = SIZE[i] * (1 - t)
      setRamp(p, CY[i] | 0); flushQuad()
      break
    }
    case K_COMET: {
      const e = t * t * (3 - 2 * t) * 0.35 + t * t * 0.65
      const a = t < 0.1 ? t / 0.1 : 1
      Q[Q_CX] = X[i]; Q[Q_CY] = Y[i]; Q[Q_P1] = SIZE[i] * 1.3; Q[Q_A] = a
      setRamp(p, 0); glowQuad()
      Q[Q_P1] = SIZE[i] * 3.25; Q[Q_A] = a * 0.55
      setRamp(p, 3); glowQuad()
      for (let g = 1; g <= 6; g++) {             // ghost samples back along the curve
        S[S_E] = e > g * 0.03 ? e - g * 0.03 : 0
        bez(i)
        Q[Q_CX] = S[S_BX]; Q[Q_CY] = S[S_BY]; Q[Q_P1] = SIZE[i] * (5.5 - g * 0.6) * 0.5; Q[Q_A] = a * (0.5 - g * 0.07)
        setRamp(p, g < 5 ? g + 2 : 7); glowQuad()
      }
      break
    }
    default: break
  }
}

function glRing(r) {
  const u = RAGE[r] / RDUR[r]
  const e = 1 - Math.pow(2, -10 * u)               // expo out: all the speed in the first frames
  const rad = RSIZE[r] * 0.5 * e
  const a = (1 - u) * (1 - u)
  const p = RPAL[r]
  Q[Q_CX] = RX[r]; Q[Q_CY] = RY[r]; Q[Q_P1] = rad
  Q[Q_M] = 4; Q[Q_P2] = RW[r] * 3 * (1 - u * 0.6); Q[Q_A] = a * 0.2; setRamp(p, 4); ringQuad()                       // bloom
  const hw = Math.max(0.3, RW[r] * (1 - u) * 0.5)
  Q[Q_M] = 2; Q[Q_P2] = hw; Q[Q_A] = a * 0.95; setRamp(p, 1); ringQuad()                                              // hairline
  if (rad > 14) { Q[Q_P1] = rad * 0.82; Q[Q_P2] = 0.3; Q[Q_A] = a * 0.34; setRamp(p, 3); ringQuad() }                 // echo
}

function drawGL() {
  nv = 0
  for (let i = 0; i < CAP; i++) if (kind[i] === K_FOIL && AGE[i] >= 0) glFoil(i)
  const nFoil = nv
  for (let i = 0; i < CAP; i++) if (kind[i] && AGE[i] >= 0) glLight(i)
  for (let r = 0; r < RCAP; r++) if (RDUR[r] && RAGE[r] >= 0) glRing(r)
  gl.clear(gl.COLOR_BUFFER_BIT)
  if (nv === 0) return
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, VIEWS[((nv + CHUNK - 1) / CHUNK | 0) - 1])
  if (nFoil) { gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.drawArrays(gl.TRIANGLES, 0, nFoil) }
  if (nv > nFoil) { gl.blendFunc(gl.ONE, gl.ONE); gl.drawArrays(gl.TRIANGLES, nFoil, nv - nFoil) }
}

/* ═════════════════════════ renderer: Canvas 2D (fallback) ═════════════════════════ */

const GLOW2D = 64
function buildGlow(P) {
  P.glow = new Array(RAMP)
  for (let i = 0; i < RAMP; i++) {
    const c = document.createElement('canvas')
    c.width = c.height = GLOW2D
    const x = c.getContext('2d')
    const g = x.createRadialGradient(GLOW2D / 2, GLOW2D / 2, 0, GLOW2D / 2, GLOW2D / 2, GLOW2D / 2)
    const col = P.cols[i]
    g.addColorStop(0, rgba(mix(col, T.t1, 0.35), 1))
    g.addColorStop(0.18, rgba(col, 0.78))
    g.addColorStop(0.45, rgba(col, 0.22))
    g.addColorStop(1, rgba(col, 0))
    x.fillStyle = g
    x.fillRect(0, 0, GLOW2D, GLOW2D)
    P.glow[i] = c
  }
}
function glow2d(P, ci, x, y, s, a) {
  if (a <= 0.01) return
  if (!P.glow) buildGlow(P)
  ctx.globalAlpha = a > 1 ? 1 : a
  ctx.drawImage(P.glow[ci], x - s * 0.5, y - s * 0.5, s, s)
}

function foil2d(i, t) {
  const P = pals[pal[i]]
  const flip = Math.cos(PH[i])
  const af = flip < 0 ? -flip : flip
  let sh = (af * 0.65 + 0.35 * (0.5 + 0.5 * Math.sin(ROT[i] * 2 + PH[i] * 0.5))) * (SHADES - 1)
  if (af < 0.16) sh = SHADES - 1
  else if (flip < 0) sh *= 0.62
  const si = sh | 0
  const rot = ROT[i], c = Math.cos(rot), s = Math.sin(rot)
  const v = af < 0.07 ? 0.07 : af
  const w = SIZE[i] * 0.5, h = SIZE[i] * 1.35, k = EX[i]
  ctx.globalAlpha = (1 - t) * 4 > 1 ? 1 : (1 - t) * 4
  ctx.setTransform(c * dpr, s * dpr, -s * v * dpr, c * v * dpr, X[i] * dpr, Y[i] * dpr)
  ctx.fillStyle = P.foil[si]
  ctx.beginPath()
  ctx.moveTo(-w + k, -h); ctx.lineTo(w + k, -h); ctx.lineTo(w - k, h); ctx.lineTo(-w - k, h)
  ctx.closePath(); ctx.fill()
  ctx.fillStyle = P.foilHi[si]
  ctx.beginPath()
  ctx.moveTo(-w + k, -h); ctx.lineTo(w + k, -h); ctx.lineTo(-w - k * 0.2, h * 0.1)
  ctx.closePath(); ctx.fill()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function draw2d() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)
  ctx.globalCompositeOperation = 'source-over'
  for (let i = 0; i < CAP; i++) if (kind[i] === K_FOIL && AGE[i] >= 0) foil2d(i, AGE[i] / LIFE[i])

  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < CAP; i++) {
    const k = kind[i]
    if (!k || AGE[i] < 0) continue
    const t = AGE[i] / LIFE[i]
    const P = pals[pal[i]]
    switch (k) {
      case K_FOIL: {
        const af = Math.abs(Math.cos(PH[i]))
        if (af < 0.26) glow2d(P, 1, X[i], Y[i], SIZE[i] * 4.6, (1 - af / 0.26) * ((1 - t) * 4 > 1 ? 1 : (1 - t) * 4) * 0.95)
        break
      }
      case K_SPARK: {
        const ci = (t * (RAMP - 1)) | 0
        const a = (1 - t) * (1 - t) * (0.72 + 0.28 * Math.sin(PH[i]))
        const vx = VX[i], vy = VY[i]
        const sp = Math.sqrt(vx * vx + vy * vy) + 0.001
        const len = (sp * 0.032 > 26 ? 26 : sp * 0.032) + 1
        const w = SIZE[i] * (1 - t * 0.5)
        ctx.strokeStyle = P.ramp[ci]
        ctx.beginPath()
        ctx.moveTo(X[i] - (vx / sp) * len, Y[i] - (vy / sp) * len)
        ctx.lineTo(X[i], Y[i])
        ctx.globalAlpha = a * 0.28; ctx.lineWidth = w * 3.4; ctx.stroke()
        ctx.globalAlpha = a;        ctx.lineWidth = w;       ctx.stroke()
        glow2d(P, ci, X[i], Y[i], SIZE[i] * 7.2, a * 0.5)
        if (t < 0.4) glow2d(P, 0, X[i], Y[i], SIZE[i] * 2.9, a * 0.8)
        break
      }
      case K_EMBER: {
        const env = t < 0.14 ? t / 0.14 : t > 0.55 ? (1 - t) / 0.45 : 1
        const fl = 0.7 + 0.3 * Math.sin(PH[i] * 3.1 + i)
        glow2d(P, (2 + t * (RAMP - 3)) | 0, X[i], Y[i], SIZE[i] * 7, env * fl * 0.85)
        break
      }
      case K_PUFF: {
        const ci = (t * (RAMP - 1)) | 0
        const sz = SIZE[i] * (1 + 0.9 * t - 1.5 * t * t) * 5
        const a = (1 - t) * (1 - t * 0.35) * 0.8
        glow2d(P, ci, X[i], Y[i], sz, a)
        if (t < 0.2) glow2d(P, 0, X[i], Y[i], sz * 0.34, a * 0.65)
        break
      }
      case K_DIAM: {
        const a = SIZE[i] * (1 - t)
        if (a > 0.01) {
          if (!P.glow) buildGlow(P)
          ctx.setTransform(SX[i] * dpr, SY[i] * dpr, -SY[i] * dpr, SX[i] * dpr, X[i] * dpr, Y[i] * dpr)
          ctx.globalAlpha = a > 1 ? 1 : a
          ctx.drawImage(P.glow[CY[i] | 0], -EX[i] * 2.2, -EY[i] * 2.2, EX[i] * 4.4, EY[i] * 4.4)
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
        break
      }
      case K_COMET: {
        const e = t * t * (3 - 2 * t) * 0.35 + t * t * 0.65
        const a = t < 0.1 ? t / 0.1 : 1
        glow2d(P, 0, X[i], Y[i], SIZE[i] * 2.6, a)
        glow2d(P, 3, X[i], Y[i], SIZE[i] * 6.5, a * 0.55)
        for (let g = 1; g <= 6; g++) {
          S[S_E] = e > g * 0.03 ? e - g * 0.03 : 0
          bez(i)
          glow2d(P, g < 5 ? g + 2 : 7, S[S_BX], S[S_BY], SIZE[i] * (5.5 - g * 0.6), a * (0.5 - g * 0.07))
        }
        break
      }
      default: break
    }
  }

  ctx.lineCap = 'butt'
  for (let r = 0; r < RCAP; r++) {
    if (!RDUR[r] || RAGE[r] < 0) continue
    const u = RAGE[r] / RDUR[r]
    const rad = RSIZE[r] * 0.5 * (1 - Math.pow(2, -10 * u))
    const a = (1 - u) * (1 - u)
    const P = pals[RPAL[r]]
    ctx.beginPath(); ctx.arc(RX[r], RY[r], rad, 0, TAU)
    ctx.strokeStyle = P.ramp[4]; ctx.globalAlpha = a * 0.2; ctx.lineWidth = RW[r] * 6 * (1 - u * 0.6); ctx.stroke()
    ctx.strokeStyle = P.ramp[1]; ctx.globalAlpha = a * 0.95; ctx.lineWidth = Math.max(0.6, RW[r] * (1 - u)); ctx.stroke()
    if (rad > 14) {
      ctx.beginPath(); ctx.arc(RX[r], RY[r], rad * 0.82, 0, TAU)
      ctx.strokeStyle = P.ramp[3]; ctx.globalAlpha = a * 0.34; ctx.lineWidth = 0.6; ctx.stroke()
    }
  }
  ctx.lineCap = 'round'
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

/* ═════════════════════════ frame ═════════════════════════ */

function tick(dtMs) {
  const t0 = performance.now()
  S[S_DT] = dtMs > 50 ? 50 : dtMs

  // frame governor: shed load on a GPU that cannot keep up, restore it when it can
  if (!qualityLocked && dtMs < 200) {
    S[S_FRAME] += (dtMs - S[S_FRAME]) * 0.1
    S[S_FPS] += (1000 / (dtMs > 1 ? dtMs : 1) - S[S_FPS]) * 0.1
    if (S[S_FRAME] > 26) { fast = 0; if (++slow > 24) { quality = Math.max(0.35, quality * 0.72); slow = 0 } }
    else if (S[S_FRAME] < 19) { slow = 0; if (quality < 1 && ++fast > 150) { quality = Math.min(1, quality * 1.25); fast = 0 } }
    else { slow = 0; fast = 0 }
  }

  try {
    update()
    if (gl) { if (!glLost) drawGL() } else if (ctx) draw2d()
  } catch (err) {
    broken = true
    console.error('[fx] renderer failed, effects disabled', err)
    clear()
    return
  }

  S[S_TICK] += (performance.now() - t0 - S[S_TICK]) * 0.1
  if (live === 0 && ringsLive === 0 && trails.length === 0) stop()
}

/* ═════════════════════════ public API ═════════════════════════ */

const count = (n) => Math.max(1, Math.round(n * quality))
const pt = (o) => (typeof o.x === 'number' && typeof o.y === 'number' ? o : at(null))

/** Viewport point for an element / ref / event / {x,y}. `edge`: 'center' (default) | 'top' | 'bottom' | 'left' | 'right'. */
function at(t, edge = 'center') {
  if (!t) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  if (typeof t.clientX === 'number') return { x: t.clientX, y: t.clientY }
  if (typeof t.x === 'number' && typeof t.y === 'number' && !t.getBoundingClientRect) return { x: t.x, y: t.y }
  const el = t.current || t
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2
  return edge === 'top' ? { x: cx, y: r.top } : edge === 'bottom' ? { x: cx, y: r.bottom }
    : edge === 'left' ? { x: r.left, y: cy } : edge === 'right' ? { x: r.right, y: cy } : { x: cx, y: cy }
}

function sparks(o = {}) {
  if (!ready()) return
  const p = pt(o)
  const n = count(o.n ?? 24), power = o.power ?? 1
  const spread = (o.spread ?? 360) * D2R, ang = (o.angle ?? -90) * D2R
  const grav = (o.gravity ?? 0.6) * 1000, life = o.life ?? 900, delay = o.delay ?? 0
  const pl = paletteList(o.colors, 'fire')
  if (n >= 14 && o.flare !== false) {          // a hot centre: one soft bloom instead of fifty cores stacking into a white blob
    const f = spawn(K_DIAM, pl[0])
    if (f >= 0) {
      X[f] = p.x; Y[f] = p.y; SX[f] = 1; SY[f] = 0
      EX[f] = EY[f] = 15 + 17 * Math.min(power, 1.6); AGE[f] = -delay; LIFE[f] = 190; SIZE[f] = 0.62; CY[f] = 2
    }
  }
  for (let j = 0; j < n; j++) {
    const a = ang + (rand() - 0.5) * spread
    const sp = (150 + rand() * 560) * power * (0.45 + 0.55 * rand())
    const i = spawn(K_SPARK, pl[(rand() * pl.length) | 0])
    if (i < 0) continue
    const pre = rand() * 0.034                  // pre-roll along the heading: the burst is born with a little depth
    X[i] = p.x + Math.cos(a) * sp * pre; Y[i] = p.y + Math.sin(a) * sp * pre; VX[i] = Math.cos(a) * sp; VY[i] = Math.sin(a) * sp
    AGE[i] = -delay; LIFE[i] = life * (0.6 + rand() * 0.55); SIZE[i] = 1.1 + rand() * 1.7
    G[i] = grav; DRAG[i] = 1.5 + rand() * 1.4; VPH[i] = 14 + rand() * 20; PH[i] = rand() * TAU
  }
  start()
}

function embers(o = {}) {
  if (!ready()) return
  const p = pt(o)
  const w = o.w ?? 160, n = count(o.n ?? 16), delay = o.delay ?? 0
  const pl = paletteList(o.colors, 'fire')
  for (let j = 0; j < n; j++) {
    const i = spawn(K_EMBER, pl[(rand() * pl.length) | 0])
    if (i < 0) continue
    X[i] = p.x + (rand() - 0.5) * w; Y[i] = p.y + (rand() - 0.5) * 8; VX[i] = (rand() - 0.5) * 14; VY[i] = -(34 + rand() * 62)
    AGE[i] = -(delay + rand() * 900); LIFE[i] = 1500 + rand() * 1200; SIZE[i] = 1.4 + rand() * 1.9
    PH[i] = rand() * TAU; VPH[i] = 1.6 + rand() * 3; EX[i] = 12 + rand() * 30
  }
  start()
}

const FOIL_MIX = ['ti', 'ti', 'gold', 'gold', 'ignite']
function confetti(o = {}) {
  if (!ready()) return
  const p = pt(o)
  const n = count(o.n ?? 40), power = o.power ?? 1, delay = o.delay ?? 0
  const spread = (o.spread ?? 110) * D2R, ang = (o.angle ?? -90) * D2R
  const pl = o.colors && o.colors.length ? paletteList(o.colors) : FOIL_MIX.map((k) => palette(k))
  for (let j = 0; j < n; j++) {
    const a = ang + (rand() - 0.5) * spread
    const sp = (420 + rand() * 640) * power
    const i = spawn(K_FOIL, pl[(rand() * pl.length) | 0])
    if (i < 0) continue
    X[i] = p.x; Y[i] = p.y; VX[i] = Math.cos(a) * sp; VY[i] = Math.sin(a) * sp
    AGE[i] = -(delay + rand() * 60); LIFE[i] = 2300 + rand() * 1300; SIZE[i] = 3.4 + rand() * 2.8
    G[i] = 560; DRAG[i] = 2.7 + rand() * 1.1
    PH[i] = rand() * TAU; VPH[i] = 6 + rand() * 9
    ROT[i] = rand() * TAU; VROT[i] = (rand() - 0.5) * 7
    EX[i] = (rand() - 0.5) * 2.4; CX[i] = 18 + rand() * 38
  }
  start()
}

/** Expanding hairline ring. size = final diameter px. opts: color · ms · width · delay */
function shockwave(o = {}) {
  if (!ready()) return
  const p = pt(o)
  let r = -1
  for (let k = 0; k < RCAP; k++) if (!RDUR[k]) { r = k; break }
  if (r < 0) return
  RX[r] = p.x; RY[r] = p.y; RAGE[r] = -(o.delay ?? 0); RDUR[r] = o.ms ?? 720
  RSIZE[r] = o.size ?? 260; RW[r] = o.width ?? 2.2; RPAL[r] = palette(o.color || 'ignite')
  ringsLive++
  start()
}

let flashAnim = null, lastFlash = -1e9
/** Full-screen additive wash. opts: peak (0.12–0.6, default .5) · x,y (viewport px: the light comes from there, default screen centre-low) · r (radius, vmax) */
function flash(color = 'ignite', ms = 260, o = {}) {
  if (!ready() || !flashEl || !flashEl.animate) return
  const now = performance.now()
  if (now - lastFlash < FLASH_GAP) return
  lastFlash = now
  const st = flashEl.style
  st.setProperty('--fx-flash', rgb(pals[palette(color)].cols[(RAMP * 0.33) | 0]))
  st.setProperty('--fx-core', rgb(pals[palette(color)].cols[0]))
  if (typeof o.x === 'number' && typeof o.y === 'number') {
    st.setProperty('--fx-x', (o.x / (window.innerWidth || 1) * 100).toFixed(1) + '%')
    st.setProperty('--fx-y', (o.y / (window.innerHeight || 1) * 100).toFixed(1) + '%')
  } else { st.removeProperty('--fx-x'); st.removeProperty('--fx-y') }
  st.setProperty('--fx-r', (o.r ?? 78) + 'vmax')
  if (flashAnim) flashAnim.cancel()
  const pk = Math.min(0.6, o.peak ?? 0.5)
  flashAnim = flashEl.animate(
    [{ opacity: 0 }, { opacity: pk, offset: 0.1, easing: easeOut }, { opacity: pk * 0.34, offset: 0.34, easing: 'linear' }, { opacity: 0 }],
    { duration: ms, easing: 'linear' },
  )
}

const shakes = new WeakMap()
const CAN_TRANSLATE = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('translate', '1px')
/** Damped shake via the `translate` property, so it composes with the element's own transform. opts: amp px · ms · axis 'x'|'y'|'xy' */
function shake(t, o = {}) {
  const el = t && (t.current || t)
  if (!el || !el.animate || isLite()) return
  const amp = o.amp ?? 6, ms = o.ms ?? 320, axis = o.axis ?? 'x'
  const N = 9
  const frames = []
  for (let k = 0; k <= N; k++) {
    const decay = Math.pow(1 - k / N, 1.3)
    const sx = Math.sin(k * 2.2) * amp * decay                 // ~1.6 cycles, decaying
    const sy = Math.sin(k * 2.2 + 1.3) * amp * decay
    const x = axis === 'y' ? 0 : sx, y = axis === 'x' ? 0 : axis === 'y' ? sx : sy * 0.4
    frames.push(CAN_TRANSLATE ? { translate: x.toFixed(2) + 'px ' + y.toFixed(2) + 'px' } : { transform: 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px)' })
  }
  const prev = shakes.get(el)
  if (prev) prev.cancel()
  const a = el.animate(frames, { duration: ms, easing: 'ease-in-out' })
  shakes.set(el, a)
  a.onfinish = a.oncancel = () => { if (shakes.get(el) === a) shakes.delete(el) }
}

/** Rocket exhaust anchored to an element. Returns { stop() }. opts: where 'bottom'|'center'|'top' · dir (deg, 90 = down) · rate/s · scale · dx · dy · color */
function trail(t, o = {}) {
  const el = t && (t.current || t)
  if (!el || !ready()) return { stop() {} }
  const tr = {
    el, on: true, has: false, acc: 0, lx: 0, ly: 0,
    where: o.where || 'bottom', dir: (o.dir ?? 90) * D2R, cd: 0, sd: 1, rate: o.rate ?? 110, scale: o.scale ?? 1,
    dx: o.dx ?? 0, dy: o.dy ?? 0, pal: palette(o.color || 'fire'),
  }
  tr.cd = Math.cos(tr.dir); tr.sd = Math.sin(tr.dir)     // once: Math.cos/sin results are boxed when called from a loop body
  trails.push(tr)
  start()
  return { stop() { tr.on = false } }
}

/** XP-to-HUD style comets along an arc. { from, to, n = 5, color = 'tele', ms = 640, onArrive(i, n), onDone() }.
 *  In lite there is nothing to watch, so the callbacks fire at once: the state change still happens. */
function fly(o = {}) {
  if (!ready()) {
    const n = o.n ?? 5
    if (o.onArrive) for (let i = 0; i < n; i++) o.onArrive(i, n)
    if (o.onDone) o.onDone()
    return
  }
  const a = at(o.from), b = at(o.to)
  const n = Math.max(1, Math.round((o.n ?? 5) * Math.max(quality, 0.6)))
  const ms = o.ms ?? 640
  const p = palette(o.color || 'tele')
  const dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy) || 1
  const side = rand() < 0.5 ? -1 : 1
  for (let j = 0; j < n; j++) {
    const bow = side * dist * (0.2 + rand() * 0.16)
    const i = spawn(K_COMET, p)
    if (i < 0) continue
    X[i] = a.x; Y[i] = a.y
    AGE[i] = -j * 55; LIFE[i] = ms * (0.9 + rand() * 0.2); SIZE[i] = 2.4 + rand() * 1.2
    SX[i] = a.x + (rand() - 0.5) * 14; SY[i] = a.y + (rand() - 0.5) * 14
    CX[i] = (a.x + b.x) / 2 - (dy / dist) * bow; CY[i] = (a.y + b.y) / 2 + (dx / dist) * bow
    EX[i] = b.x + (rand() - 0.5) * 8; EY[i] = b.y + (rand() - 0.5) * 8
    const last = j === n - 1
    cbs[i] = () => { if (o.onArrive) o.onArrive(j, n); if (last && o.onDone) o.onDone() }
  }
  start()
}

function clear() {
  for (let i = 0; i < CAP; i++) if (kind[i]) kill(i)
  for (let r = 0; r < RCAP; r++) RDUR[r] = 0
  ringsLive = 0
  for (let k = 0; k < trails.length; k++) trails[k].on = false
  trails.length = 0
  if (flashAnim) { flashAnim.cancel(); flashAnim = null }
  stop()
}

/* ── the moments, composed once so every screen fires the same thing ── */

/** Tapping the launch control: ignite-wash, a ring off the button, sparks up the screen. */
function launch(where) {
  const p = at(where)
  flash('ignite', 460, { peak: 0.52, x: p.x, y: p.y })
  shockwave({ ...p, color: 'ignite', size: 380, ms: 760 })
  shockwave({ ...p, color: 'gold', size: 230, ms: 560, delay: 90, width: 1.4 })
  sparks({ ...p, n: 38, power: 1.25, spread: 80, angle: -90, gravity: 0.5 })
  sparks({ ...p, n: 12, power: 0.7, spread: 360, gravity: 0.9, delay: 40 })
}
/** Orbit insertion / a medal / a perfect lesson. `big` for rank-up and month complete. */
function celebrate(where, { big = false } = {}) {
  const p = at(where)
  flash(big ? 'gold' : 'ignite', big ? 560 : 380, { peak: big ? 0.5 : 0.38, x: p.x, y: p.y })
  shockwave({ ...p, color: big ? 'gold' : 'ignite', size: big ? 520 : 340, ms: 900 })
  shockwave({ ...p, color: 'ti', size: big ? 340 : 220, ms: 700, delay: 110, width: 1.2 })
  sparks({ ...p, n: big ? 46 : 30, power: 1.2, spread: 360, gravity: 0.7 })
  confetti({ ...p, n: big ? 64 : 42, power: big ? 1.15 : 1 })
  embers({ x: p.x, y: p.y + 30, w: big ? 320 : 220, n: big ? 22 : 14, delay: 200 })
}
/** Month complete: foil cannons fire inward from both bottom corners, then a rising bed of embers. */
function cannons({ n = 44 } = {}) {
  const w = window.innerWidth, h = window.innerHeight
  const y = h * 0.92
  confetti({ x: w * 0.06, y, n, angle: -58, spread: 38, power: 1.35 })
  confetti({ x: w * 0.94, y, n, angle: -122, spread: 38, power: 1.35, delay: 70 })
  sparks({ x: w * 0.06, y, n: 14, angle: -58, spread: 30, power: 1.1, gravity: 0.8 })
  sparks({ x: w * 0.94, y, n: 14, angle: -122, spread: 30, power: 1.1, gravity: 0.8, delay: 70 })
  embers({ x: w / 2, y: h * 0.98, w: w * 0.9, n: 20, delay: 300 })
}
/** A small precise "it registered" beat: one hairline ring and a few sparks. A ring closing, a shield spent, a chest tapped.
 *  opts: color ('ignite'|'gold'|'ti'|'tele'|'go'|any CSS colour) · size (final diameter px) */
function pop(where, o = {}) {
  const p = at(where), c = o.color || 'ignite'
  shockwave({ ...p, color: c, size: o.size ?? 130, ms: 520, width: 1.5 })
  sparks({ ...p, n: 10, power: 0.5, colors: [c], gravity: 0.8, life: 640, flare: false })
}
/** The streak flame catching: a flare off the flame, a ring, a few embers rising. */
function ignite(where) {
  const p = at(where)
  flash('ignite', 320, { peak: 0.24, x: p.x, y: p.y, r: 44 })
  shockwave({ ...p, color: 'ignite', size: 210, ms: 660, width: 1.6 })
  sparks({ ...p, n: 22, power: 0.9, spread: 70, angle: -90, gravity: 0.45 })
  embers({ x: p.x, y: p.y + 6, w: 54, n: 8, delay: 120 })
}
/** A correct answer: a small green ring and a few cool sparks. */
function go(where) {
  const p = at(where)
  shockwave({ ...p, color: 'go', size: 150, ms: 560, width: 1.6 })
  sparks({ ...p, n: 12, power: 0.55, colors: ['go', 'tele'], gravity: 0.7, life: 700 })
}
/** A wrong answer: the plate shakes, one dim ring. No particles: never a firework for a miss. */
function nogo(where) {
  const p = at(where)
  shake(where && (where.current || where.getBoundingClientRect ? where : null), { amp: 7, ms: 340 })
  shockwave({ ...p, color: 'nogo', size: 120, ms: 520, width: 1.4 })
}

function stats() {
  return {
    live, rings: ringsLive, trails: trails.length, running, quality, renderer: gl ? 'webgl' : ctx ? '2d' : 'idle', shrunk,
    fps: Math.round(S[S_FPS]), frameMs: +S[S_FRAME].toFixed(1), tickMs: +S[S_TICK].toFixed(3), verts: nv, dpr, w: W, h: H, level: getFxLevel(),
  }
}
/** 'auto' hands control back to the governor; a number 0.2–1 pins it (tests, screenshots). */
function setQuality(q) {
  if (q === 'auto') { qualityLocked = false; return }
  qualityLocked = true
  quality = Math.max(0.2, Math.min(1, q))
}
/** Tests only: 'auto' | 'webgl' | '2d'. Read when the context is made: call it before the first effect. */
function setRenderer(r) { forced = r }

subscribeFxLevel(() => { if (isLite()) clear() })

export const fx = { sparks, embers, confetti, shockwave, flash, shake, trail, at, fly, launch, celebrate, cannons, go, nogo, pop, ignite, clear, stats, setQuality, setRenderer }
export { attachLayer as _attachLayer }
