// KIND v7 · Game Day · ORBIT RUN engine.
//
//   Pure simulation (node-testable, deterministic for a seed) + a canvas-2D renderer. Nothing here touches the DOM at import.
//
//   const s = createSim({ seed, words, facts, viewH })     world is W=360 units wide; viewH is the visible height in world units
//   s.emit = (type, a) => {}                                 count n · go · collect combo · combo mult · near · hit shields · smash
//                                                            ignite · ready · burst-end · gate · gate-right · gate-wrong · gate-timeout · dead · over
//   steerBy(s, dx) · s.keyDir = -1|0|1 · requestIgnite(s) · answerGate(s, side)
//   step(s, STEP)                                            fixed timestep; the runner clamps the frame delta to MAX_DT
//   const v = createView(canvas, { accent, lite, reduced }); resizeView(v, cssW, cssH, dpr) → viewH; setView(s, viewH); draw(v, s)
//
//   Pools are struct-of-arrays allocated once. step() and draw() allocate nothing per frame (strings are made only on events,
//   and HUD numbers are re-formatted only when the shown value changes).

export const W = 360
export const STEP = 1 / 120
export const MAX_DT = 0.1
export const ROCKET_R = 11
export const TOKEN_HIT = 28
export const NEAR = 20
export const SHIELDS = 3
export const BURST_S = 3.2
export const GATE_EVERY = 30
export const GATE_S = 6
export const COUNT_S = 3
export const STAR_AT = [5000, 15000, 35000]   // calibrated with tools bot runs: beginner 5-11k, sharp 40-90k
const MARGIN = 20
const N_H = 56, N_K = 28, N_P = 260, N_U = 10

export const starsFor = (score) => (score >= STAR_AT[2] ? 3 : score >= STAR_AT[1] ? 2 : score >= STAR_AT[0] ? 1 : 0)
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

/* ── seeded RNG (mulberry32). Gameplay and cosmetics use separate streams, so lite mode never changes the run. ── */
function rnd(s) {
  s.rng = (s.rng + 0x6d2b79f5) | 0
  let t = s.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
function frnd(s) {
  s.frng = (s.frng + 0x6d2b79f5) | 0
  let t = s.frng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/* ═══ PATTERNS ═══════════════════════════════════════════════════════════════════════════════════════════════
   Designed set pieces, not noise. Each item: [d (distance into the pattern), kind, x (0..1 of W), p, v]
   kind  0 token · 1 asteroid (p radius) · 2 storm cloud (p half-width; radius 28) · 3 meteor (falls, p radius) · 4 drifter (p radius, v = vx)
   The picker mirrors patterns at random (seeded) and tightens spacing as the run heats up. */
const T = 0, A = 1, C = 2, M = 3, D = 4
const PATTERNS = []
function pattern(name, tier, items) {
  items.sort((a, b) => a[0] - b[0])
  const n = items.length
  const p = { name, tier, n, len: items[n - 1][0], d: new Float32Array(n), k: new Uint8Array(n), x: new Float32Array(n), p: new Float32Array(n), v: new Float32Array(n) }
  for (let i = 0; i < n; i++) { const it = items[i]; p.d[i] = it[0]; p.k[i] = it[1]; p.x[i] = it[2]; p.p[i] = it[3] || 0; p.v[i] = it[4] || 0 }
  PATTERNS.push(p)
}
function wall(items, d, gap, width, r) {
  const step = (2 * r + 6) / W
  for (let x = r / W; x <= 1 - r / W + 1e-6; x += step) if (Math.abs(x - gap) * W >= (width * W) / 2 + r) items.push([d, A, x, r])
  items.push([d, T, gap])
}
;(function build() {
  // tier 0 · learn to steer
  pattern('column', 0, [[0, T, .5], [60, T, .5], [120, T, .5], [180, T, .5], [240, T, .5], [70, A, .16, 22], [190, A, .84, 22]])
  { const it = []; for (let i = 0; i < 5; i++) { it.push([i * 95, T, i % 2 ? .3 : .7]); it.push([i * 95 + 12, A, i % 2 ? .78 : .22, 20]) } pattern('slalom', 0, it) }
  pattern('pair', 0, [[0, A, .2, 26], [0, A, .8, 26], [0, T, .5], [55, T, .5], [110, T, .5], [210, A, .5, 24], [210, T, .2], [210, T, .8]])
  // tier 1 · zigzags, gates, storms
  { const it = []; for (let i = 0; i < 9; i++) { const s = Math.sin(i * .75); it.push([i * 50, T, .5 + .3 * s]); if (i % 2 === 0 && Math.abs(s) > .3) it.push([i * 50, A, .5 - .38 * s, 17]) } pattern('zigzag', 1, it) }
  { const it = []; wall(it, 0, .3, .32, 18); wall(it, 200, .72, .32, 18); wall(it, 400, .45, .32, 18); pattern('gates', 1, it) }
  pattern('storm-sides', 1, [[0, C, .12, 50], [150, C, .88, 50], [300, C, .12, 50], [0, T, .62], [75, T, .5], [150, T, .38], [225, T, .5], [300, T, .62]])
  // tier 2 · crossing traffic, chicanes, twin gates
  { const it = []; for (let i = 0; i < 5; i++) it.push([i * 85, D, i % 2 ? 1.08 : -.08, 19, i % 2 ? -75 : 75]); for (let i = 0; i < 6; i++) it.push([i * 65 + 30, T, .2 + i * .12]); pattern('drift', 2, it) }
  pattern('chicane', 2, [[0, C, .26, 72], [180, C, .74, 72], [360, C, .26, 72], [0, T, .84], [90, T, .5], [180, T, .16], [270, T, .5], [360, T, .84]])
  { const it = []; wall(it, 0, .25, .3, 18); wall(it, 130, .68, .3, 18); pattern('twin-gates', 2, it) }
  // tier 3 · meteor rain, narrow gates, crossed storm
  { const it = []; const lanes = [.15, .55, .35, .85, .25, .65, .45, .75]; for (let i = 0; i < 8; i++) { it.push([i * 48, M, lanes[i], 12]); if (i % 2) it.push([i * 48 + 24, T, .5 + (lanes[i] < .5 ? .25 : -.25)]) } pattern('rain', 3, it) }
  { const it = []; const g = [.5, .25, .6, .82]; for (let i = 0; i < 4; i++) wall(it, i * 165, g[i], .26, 17); pattern('narrow', 3, it) }
  pattern('cross-storm', 3, [[0, C, .5, 58], [0, T, .1], [0, T, .9], [130, D, -.08, 18, 90], [130, D, 1.08, 18, -90], [270, C, .14, 46], [270, C, .86, 46], [270, T, .5], [330, T, .5]])
})()
export const patternNames = () => PATTERNS.map((p) => p.name)

/* ═══ SIM ════════════════════════════════════════════════════════════════════════════════════════════════════ */
function normaliseFacts(facts) {
  const out = []
  for (const f of Array.isArray(facts) ? facts : []) {
    if (!f || typeof f.q !== 'string' || !Array.isArray(f.options) || f.options.length < 2) continue
    const opts = f.options.map(String)
    const ans = typeof f.answer === 'number' ? f.answer : opts.indexOf(String(f.answer))
    if (ans >= 0 && ans < opts.length) out.push({ q: f.q, opts, ans })
  }
  return out
}
const FALLBACK_WORDS = ['FAITH', 'COURAGE', 'INTEGRITY', 'HOPE', 'TRUTH', 'LOVE']
export function normaliseWords(words) {
  const out = []
  for (const w of Array.isArray(words) ? words : []) {
    let t = String(w || '').replace(/[^\p{L}\p{N}' -]/gu, ' ').replace(/\s+/g, ' ').trim().toUpperCase()
    if (!t) continue
    if (t.length > 12) { // a long line becomes its strongest word: the longest one that fits
      let k = ''
      for (const p of t.split(' ')) if (p.length <= 12 && p.length > k.length) k = p
      t = k || t.slice(0, 12)
    }
    if (t && !out.includes(t)) out.push(t)
    if (out.length >= 16) break
  }
  return out.length ? out : FALLBACK_WORDS.slice()
}

export function createSim({ seed = 1, words, facts, viewH = 640 } = {}) {
  const s = {
    words: normaliseWords(words), facts: normaliseFacts(facts), emit: () => {},
    hx: new Float32Array(N_H), ha: new Float32Array(N_H), hr: new Float32Array(N_H), hw: new Float32Array(N_H),
    hvx: new Float32Array(N_H), hvy: new Float32Array(N_H), hrot: new Float32Array(N_H), hspin: new Float32Array(N_H),
    hon: new Uint8Array(N_H), hk: new Uint8Array(N_H), hnear: new Uint8Array(N_H), hvar: new Uint8Array(N_H), hlife: new Float32Array(N_H),
    kx: new Float32Array(N_K), ka: new Float32Array(N_K), kon: new Uint8Array(N_K), kw: new Uint8Array(N_K), kph: new Float32Array(N_K),
    px: new Float32Array(N_P), pa: new Float32Array(N_P), pvx: new Float32Array(N_P), pva: new Float32Array(N_P),
    pl: new Float32Array(N_P), pm: new Float32Array(N_P), ps: new Float32Array(N_P), pc: new Uint8Array(N_P), pNext: 0, pCap: N_P,
    ux: new Float32Array(N_U), ua: new Float32Array(N_U), ul: new Float32Array(N_U), uc: new Uint8Array(N_U), ut: new Array(N_U).fill(''), uNext: 0,
    factOrder: [],
  }
  reset(s, seed)
  setView(s, viewH)
  return s
}

export function setView(s, viewH) {
  s.viewH = viewH
  s.rocketY = viewH * 0.74
  s.ahead = s.rocketY + 80
  s.below = viewH - s.rocketY + 80
}

export function reset(s, seed = 1) {
  s.seed = seed
  s.rng = (seed | 0) || 1
  s.frng = (Math.imul(seed | 0, 7919) ^ 0x5bd1e995) | 0
  s.hon.fill(0); s.kon.fill(0); s.pl.fill(0); s.ul.fill(0)
  s.phase = 'count'; s.countT = COUNT_S; s.t = 0; s.runT = 0
  s.alt = 0; s.vel = 0; s.x = W / 2; s.aimX = W / 2; s.keyDir = 0; s.tilt = 0; s.igniteReq = false
  s.shields = SHIELDS; s.combo = 0; s.mult = 1; s.bestCombo = 0; s.pts = 0; s.boost = 0; s.burst = 0; s.inv = 0
  s.trauma = 0; s.flash = 0; s.flashC = 0; s.near = 0; s.tokens = 0; s.hits = 0; s.smashed = 0; s.gatesRight = 0
  s.nextGate = GATE_EVERY; s.gateT = 0; s.gateQ = -1; s.gateA = 0; s.gateB = 0; s.gateRight = 0; s.factI = 0
  s.dieT = 0; s.trailAcc = 0; s.readySent = false; s.wordI = 0
  s.patBase = 0; s.pat = null; s.patCur = 0; s.patMirror = false; s.patSp = 1; s.lastPat = -1
  // fact order: a seeded shuffle, cycled
  const n = s.facts.length
  s.factOrder.length = 0
  for (let i = 0; i < n; i++) s.factOrder.push(i)
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd(s) * (i + 1)); const t = s.factOrder[i]; s.factOrder[i] = s.factOrder[j]; s.factOrder[j] = t }
}

export const score = (s) => s.pts + Math.floor(s.alt / 10)
export const difficulty = (s) => clamp(s.runT / 150, 0, 1)
const tierOf = (t) => (t < 22 ? 0 : t < 55 ? 1 : t < 100 ? 2 : 3)

function nextPattern(s) {
  const tier = tierOf(s.runT)
  // weight: patterns at the current tier ×3, older ones ×1; never the same one twice running
  let total = 0
  for (let i = 0; i < PATTERNS.length; i++) { const p = PATTERNS[i]; if (p.tier <= tier && i !== s.lastPat) total += p.tier === tier ? 3 : 1 }
  let r = rnd(s) * total, pick = 0
  for (let i = 0; i < PATTERNS.length; i++) {
    const p = PATTERNS[i]
    if (p.tier > tier || i === s.lastPat) continue
    r -= p.tier === tier ? 3 : 1
    if (r <= 0) { pick = i; break }
    pick = i
  }
  const diff = difficulty(s)
  const gap = 170 - 90 * diff
  s.patBase = s.pat ? s.patBase + s.pat.len * s.patSp + gap : s.alt + s.ahead + 60
  s.pat = PATTERNS[pick]; s.lastPat = pick; s.patCur = 0
  s.patMirror = rnd(s) < .5
  s.patSp = 1 - .22 * diff
}

function spawnHazard(s, kind, x, a, p, v) {
  for (let i = 0; i < N_H; i++) {
    if (s.hon[i]) continue
    s.hon[i] = 1; s.hk[i] = kind === C ? 1 : 0; s.hx[i] = x; s.ha[i] = a; s.hnear[i] = 0; s.hlife[i] = 0
    s.hr[i] = kind === C ? 28 : p; s.hw[i] = kind === C ? p : 0
    s.hvx[i] = kind === D ? v : 0; s.hvy[i] = kind === M ? 140 : 0
    s.hrot[i] = rnd(s) * 6.283; s.hspin[i] = (rnd(s) - .5) * (kind === M ? 5 : 1.6); s.hvar[i] = Math.floor(rnd(s) * 4)
    return i
  }
  return -1
}
function spawnToken(s, x, a) {
  for (let i = 0; i < N_K; i++) {
    if (s.kon[i]) continue
    s.kon[i] = 1; s.kx[i] = x; s.ka[i] = a; s.kph[i] = rnd(s) * 6.283
    s.kw[i] = s.wordI++ % s.words.length   // the week's words in turn, so every one gets seen
    return i
  }
  return -1
}

function spawn(s) {
  if (!s.pat) nextPattern(s)
  for (let guard = 0; guard < 64; guard++) {
    const p = s.pat
    if (s.patCur >= p.n) { nextPattern(s); continue }
    const i = s.patCur
    const a = s.patBase + p.d[i] * s.patSp
    if (a > s.alt + s.ahead) return
    s.patCur++
    const x = (s.patMirror ? 1 - p.x[i] : p.x[i]) * W
    const k = p.k[i]
    if (k === T) spawnToken(s, clamp(x, MARGIN, W - MARGIN), a)
    else spawnHazard(s, k, x, a, p.p[i], s.patMirror ? -p.v[i] : p.v[i])
  }
}

/* particles: col 0 accent · 1 hot (ignite-3) · 2 white · 3 nogo · 4 smoke · 5 gold */
function particle(s, x, a, vx, va, life, size, col) {
  const i = s.pNext
  s.pNext = (i + 1) % s.pCap
  s.px[i] = x; s.pa[i] = a; s.pvx[i] = vx; s.pva[i] = va; s.pl[i] = life; s.pm[i] = life; s.ps[i] = size; s.pc[i] = col
}
function burstAt(s, x, a, n, speed, life, size, col) {
  for (let j = 0; j < n; j++) {
    const ang = frnd(s) * 6.283, sp = speed * (.35 + frnd(s) * .65)
    particle(s, x, a, Math.cos(ang) * sp, Math.sin(ang) * sp, life * (.6 + frnd(s) * .4), size * (.6 + frnd(s) * .6), col)
  }
}
function popup(s, x, a, text, col) {
  const i = s.uNext
  s.uNext = (i + 1) % N_U
  s.ux[i] = x; s.ua[i] = a; s.ul[i] = 1; s.uc[i] = col; s.ut[i] = text
}

export function steerBy(s, dx) { s.aimX = clamp(s.aimX + dx, MARGIN, W - MARGIN) }
export function requestIgnite(s) { s.igniteReq = true }
export const igniteReady = (s) => s.phase === 'play' && s.boost >= 1 && s.burst <= 0

function ignite(s) {
  s.burst = BURST_S; s.boost = 1; s.inv = Math.max(s.inv, .2); s.trauma = Math.min(1, s.trauma + .5); s.flash = .8; s.flashC = 1
  s.readySent = false
  for (let i = 0; i < N_H; i++) {
    if (s.hon[i] !== 1) continue
    const rel = s.ha[i] - s.alt
    if (rel < -s.below || rel > s.ahead) continue
    scatter(s, i)
  }
  burstAt(s, s.x, s.alt, 26, 380, .7, 3.2, 1)
  s.emit('ignite', 0)
}
function scatter(s, i) {
  const side = s.hx[i] >= s.x ? 1 : -1
  s.hon[i] = 2; s.hlife[i] = 1.1
  s.hvx[i] = side * (260 + rnd(s) * 220)
  s.hvy[i] = -(160 + rnd(s) * 160)
  s.hspin[i] *= 4
}

function hit(s, i) {
  s.shields--; s.hits++; s.combo = 0; s.mult = 1; s.inv = 1.5
  s.trauma = Math.min(1, s.trauma + .75); s.flash = 1; s.flashC = 0
  burstAt(s, s.hx[i], s.ha[i], 18, 220, .7, 3, 4)
  burstAt(s, s.x, s.alt, 12, 260, .5, 2.6, 3)
  s.hon[i] = 0
  if (s.shields <= 0) {
    s.shields = 0; s.phase = 'dying'; s.dieT = 1.1
    burstAt(s, s.x, s.alt, 40, 420, 1.1, 3.6, 1)
    burstAt(s, s.x, s.alt, 20, 200, 1.3, 4, 4)
    s.emit('dead', 0)
  } else s.emit('hit', s.shields)
}

function collect(s, i) {
  s.kon[i] = 0; s.tokens++; s.combo++
  if (s.combo > s.bestCombo) s.bestCombo = s.combo
  const m = Math.min(5, 1 + Math.floor(s.combo / 4))
  const up = m > s.mult
  s.mult = m
  const gain = 50 * m
  s.pts += gain
  if (s.burst <= 0) s.boost = Math.min(1, s.boost + .12)
  burstAt(s, s.kx[i], s.ka[i], 14, 240, .55, 2.6, 0)
  burstAt(s, s.kx[i], s.ka[i], 6, 120, .4, 2, 2)
  popup(s, s.kx[i], s.ka[i] + 16, '+' + gain, 0)
  s.emit('collect', s.combo)
  if (up) { popup(s, s.x, s.alt + 52, 'x' + m + ' COMBO', 5); s.emit('combo', m) }
}

function openGate(s) {
  const n = s.facts.length
  const fi = s.factOrder[s.factI % n]
  s.factI++
  const f = s.facts[fi]
  let wrong = Math.floor(rnd(s) * (f.opts.length - 1))
  if (wrong >= f.ans) wrong++
  s.gateRight = rnd(s) < .5 ? 0 : 1
  s.gateA = s.gateRight === 0 ? f.ans : wrong
  s.gateB = s.gateRight === 0 ? wrong : f.ans
  s.gateQ = fi; s.gateT = GATE_S; s.phase = 'gate'
  s.emit('gate', fi)
}
/** side 0 / 1 = the two options; -1 = time ran out. Never a penalty. */
export function answerGate(s, side) {
  if (s.phase !== 'gate') return
  s.phase = 'play'; s.nextGate = s.runT + GATE_EVERY; s.inv = Math.max(s.inv, .8)
  if (side === s.gateRight) {
    s.gatesRight++; s.pts += 250; s.boost = Math.min(1, s.boost + .5)
    popup(s, s.x, s.alt + 60, '+250 BOOST', 5)
    burstAt(s, s.x, s.alt, 20, 300, .6, 3, 5)
    s.emit('gate-right', 0)
  } else s.emit(side < 0 ? 'gate-timeout' : 'gate-wrong', 0)
}

export function step(s, dt) {
  s.t += dt
  s.trauma = Math.max(0, s.trauma - dt * 1.8)
  s.flash = Math.max(0, s.flash - dt * 3)
  const ph = s.phase
  if (ph === 'over') { stepParticles(s, dt); return }
  if (ph === 'gate') { s.gateT -= dt; stepParticles(s, dt * .25); if (s.gateT <= 0) answerGate(s, -1); return }
  const sdt = ph === 'dying' ? dt * .35 : dt
  // steering: aim moves with keys; the rocket chases the aim (critically damped feel)
  if (ph !== 'dying') {
    if (s.keyDir) s.aimX = clamp(s.aimX + s.keyDir * 340 * sdt, MARGIN, W - MARGIN)
    const ox = s.x
    s.x += (s.aimX - s.x) * (1 - Math.exp(-sdt * 14))
    const vx = (s.x - ox) / sdt
    s.tilt += (clamp(vx / 700, -.42, .42) - s.tilt) * (1 - Math.exp(-sdt * 10))
  }
  if (ph === 'count') {
    const before = Math.ceil(s.countT)
    s.countT -= dt
    const now = Math.ceil(s.countT)
    if (now !== before && now > 0) s.emit('count', now)
    if (s.countT <= 0) { s.countT = 0; s.phase = 'play'; s.emit('go', 0) }
    trail(s, dt, .35)
    stepParticles(s, dt); stepPopups(s, dt)
    return
  }
  if (ph === 'play') s.runT += sdt
  const diff = difficulty(s)
  let target = 150 + 240 * diff * diff * (3 - 2 * diff) + Math.max(0, s.runT - 150) * .5
  if (target > 540) target = 540
  if (s.burst > 0) target *= 1.55
  if (ph === 'dying') target = 20
  s.vel += (target - s.vel) * (1 - Math.exp(-sdt * 2.4))
  s.alt += s.vel * sdt
  spawn(s)

  const R = ROCKET_R, x = s.x, alt = s.alt
  // hazards
  for (let i = 0; i < N_H; i++) {
    const on = s.hon[i]
    if (!on) continue
    s.hx[i] += s.hvx[i] * sdt
    s.ha[i] -= s.hvy[i] * sdt
    s.hrot[i] += s.hspin[i] * sdt
    const rel = s.ha[i] - alt
    if (on === 2) { s.hlife[i] -= sdt; if (s.hlife[i] <= 0 || rel < -s.below) s.hon[i] = 0; continue }
    if (rel < -s.below || s.hx[i] < -120 || s.hx[i] > W + 120) { s.hon[i] = 0; continue }
    if (ph !== 'play') continue
    const r = s.hr[i], hw = s.hw[i]
    const reach = R + r + NEAR
    if (rel > reach || rel < -reach) {
      if (s.hnear[i] === 1 && rel < -reach) { s.hnear[i] = 2; nearMiss(s, i) }
      continue
    }
    const hx = s.hx[i]
    const cx = hw > 0 ? clamp(x, hx - hw, hx + hw) : hx
    const dx = x - cx, dy = rel
    const d2 = dx * dx + dy * dy
    if (d2 < (R + r) * (R + r)) {
      if (s.burst > 0) { s.smashed++; s.pts += 40; s.hon[i] = 0; burstAt(s, hx, s.ha[i], 14, 300, .6, 3, 1); popup(s, hx, s.ha[i], '+40', 1); s.emit('smash', 0) }
      else if (s.inv <= 0) { hit(s, i); if (s.phase !== 'play') break }
      else s.hnear[i] = 3   // brushed it while blinking: no bonus
    } else if (d2 < reach * reach && s.hnear[i] === 0 && s.inv <= 0 && s.burst <= 0) s.hnear[i] = 1
  }
  // tokens
  const magnet = s.burst > 0 ? 150 : 0
  for (let i = 0; i < N_K; i++) {
    if (!s.kon[i]) continue
    s.kph[i] += sdt * 3
    const rel = s.ka[i] - alt
    if (rel < -s.below) { s.kon[i] = 0; continue }
    if (ph !== 'play') continue
    let dx = s.kx[i] - x, dy = rel
    if (magnet && dx * dx + dy * dy < magnet * magnet) {
      const d = Math.sqrt(dx * dx + dy * dy) || 1, pull = Math.min(d, 700 * sdt)
      s.kx[i] -= (dx / d) * pull; s.ka[i] -= (dy / d) * pull
      dx = s.kx[i] - x; dy = s.ka[i] - alt
    }
    if (dx * dx + dy * dy < TOKEN_HIT * TOKEN_HIT) collect(s, i)
  }
  // ignite
  if (s.igniteReq) { s.igniteReq = false; if (igniteReady(s)) ignite(s) }
  if (s.burst > 0) {
    s.burst -= sdt
    s.boost = Math.max(0, s.burst / BURST_S)
    if (s.burst <= 0) { s.burst = 0; s.boost = 0; s.inv = Math.max(s.inv, .5); s.emit('burst-end', 0) }
  }
  if (!s.readySent && igniteReady(s)) { s.readySent = true; s.emit('ready', 1) }
  if (s.inv > 0) s.inv -= sdt
  if (ph === 'play') trail(s, sdt, s.burst > 0 ? 2.2 : 1)
  stepParticles(s, sdt); stepPopups(s, sdt)
  if (ph === 'play' && s.facts.length && s.runT >= s.nextGate && s.burst <= 0) openGate(s)
  if (ph === 'dying') { s.dieT -= dt; if (s.dieT <= 0) { s.phase = 'over'; s.emit('over', 0) } }
}

function nearMiss(s, i) {
  s.near++; s.pts += 75; if (s.burst <= 0) s.boost = Math.min(1, s.boost + .05)
  popup(s, s.hx[i] < s.x ? s.x + 34 : s.x - 34, s.alt + 26, 'NEAR MISS +75', 2)
  s.emit('near', s.near)
}

function trail(s, dt, rate) {
  s.trailAcc += dt * 60 * rate * (s.pCap < N_P ? .5 : 1)
  while (s.trailAcc >= 1) {
    s.trailAcc -= 1
    const sx = s.x - Math.sin(s.tilt) * 24
    particle(s, sx + (frnd(s) - .5) * 6, s.alt - 24, (frnd(s) - .5) * 40 - s.tilt * 80, -40 - frnd(s) * 60, .45 + frnd(s) * .25, 2.4 + frnd(s) * 2, frnd(s) < .3 ? 1 : frnd(s) < .2 ? 4 : 0)
  }
}
function stepParticles(s, dt) {
  const k = 1 - dt * 1.6
  for (let i = 0; i < s.pCap; i++) {
    if (s.pl[i] <= 0) continue
    s.pl[i] -= dt
    s.px[i] += s.pvx[i] * dt; s.pa[i] += s.pva[i] * dt
    s.pvx[i] *= k; s.pva[i] *= k
  }
}
function stepPopups(s, dt) {
  for (let i = 0; i < N_U; i++) { if (s.ul[i] <= 0) continue; s.ul[i] -= dt * 1.1; s.ua[i] += dt * 40 }
}

/* ═══ RENDER ═════════════════════════════════════════════════════════════════════════════════════════════════ */
const STARS = 90
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return [255, 122, 26]
  let h = m[1]
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

export function createView(canvas, { accent = '#ff7a1a', lite = false, reduced = false, fonts } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false })
  const c = hexToRgb(accent)
  const v = {
    canvas, ctx, lite, reduced, accent: c, k: 1, dpr: 1, scale: 1, cssW: 0, cssH: 0, viewH: 640,
    fontDisplay: (fonts && fonts.display) || "'Barlow Condensed', 'Arial Narrow', sans-serif",
    fontMono: (fonts && fonts.mono) || "ui-monospace, Menlo, Consolas, monospace",
    starX: new Float32Array(STARS), starY: new Float32Array(STARS), starL: new Uint8Array(STARS),
    sprites: null, tags: null, words: null,
    pal: [rgba(c, 1), '#ffc43d', '#ffffff', '#ff4f62', '#8a93ad', '#ffd76a'],
    hud: { alt: -1, altS: '0', score: -1, scoreS: '0', mult: 0, multS: '' },
    countS: ['', '1', '2', '3'],
  }
  let seed = 9
  for (let i = 0; i < STARS; i++) {
    seed = (seed * 16807) % 2147483647; v.starX[i] = (seed / 2147483647) * W
    seed = (seed * 16807) % 2147483647; v.starY[i] = seed / 2147483647
    v.starL[i] = i % 3
  }
  return v
}

function mk(w, h, k) {
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.ceil(w * k), Math.ceil(h * k)) : Object.assign(document.createElement('canvas'), { width: Math.ceil(w * k), height: Math.ceil(h * k) })
  const g = cv.getContext('2d')
  g.scale(k, k)
  return [cv, g]
}
function hexPath(g, cx, cy, r) {
  g.beginPath()
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; if (i) g.lineTo(px, py); else g.moveTo(px, py) }
  g.closePath()
}

function buildSprites(v, words) {
  const k = v.k, c = v.accent
  const sp = {}
  // soft glow (accent) — replaces shadowBlur everywhere
  { const [cv, g] = mk(64, 64, k); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, rgba(c, .75)); gr.addColorStop(.35, rgba(c, .28)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); sp.glow = cv }
  { const [cv, g] = mk(64, 64, k); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,79,98,.55)'); gr.addColorStop(1, 'rgba(255,79,98,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); sp.redGlow = cv }
  // value coin: a hex gem
  {
    const [cv, g] = mk(36, 36, k)
    hexPath(g, 18, 18, 15); const gr = g.createLinearGradient(4, 4, 32, 32); gr.addColorStop(0, '#ffc43d'); gr.addColorStop(.55, rgba(c, 1)); gr.addColorStop(1, '#ff4a0f'); g.fillStyle = gr; g.fill()
    g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,.75)'; g.stroke()
    hexPath(g, 18, 18, 9); g.fillStyle = 'rgba(26,9,0,.55)'; g.fill()
    g.beginPath(); g.moveTo(13, 21); g.lineTo(18, 14); g.lineTo(23, 21); g.lineWidth = 2.2; g.strokeStyle = '#ffd9a0'; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke()
    g.beginPath(); g.moveTo(9, 10); g.lineTo(18, 4.5); g.lineTo(21, 6.5); g.lineTo(12, 12); g.closePath(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fill()
    sp.coin = cv
  }
  // word tags
  v.words = words
  v.tags = []
  {
    const [, m] = mk(4, 4, 1); m.font = `700 9px ${v.fontMono}`
    for (const w of words) {
      const tw = Math.ceil(m.measureText(w).width) + 12, th = 14
      const [cv, g] = mk(tw, th, k)
      g.beginPath(); g.moveTo(4, 0); g.lineTo(tw, 0); g.lineTo(tw, th - 4); g.lineTo(tw - 4, th); g.lineTo(0, th); g.lineTo(0, 4); g.closePath()
      g.fillStyle = 'rgba(10,12,20,.82)'; g.fill(); g.lineWidth = 1; g.strokeStyle = rgba(c, .7); g.stroke()
      g.font = `700 9px ${v.fontMono}`; g.fillStyle = '#ffe2c2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(w, tw / 2, th / 2 + .5)
      v.tags.push({ img: cv, w: tw, h: th })
    }
  }
  // asteroids: four seeded silhouettes
  sp.rock = []
  for (let n = 0; n < 4; n++) {
    const [cv, g] = mk(64, 64, k)
    let sd = 11 + n * 97
    const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647)
    g.beginPath()
    const V = 11
    for (let i = 0; i < V; i++) { const a = (i / V) * 6.283, rr = 30 * (.78 + r() * .22); const px = 32 + Math.cos(a) * rr, py = 32 + Math.sin(a) * rr; if (i) g.lineTo(px, py); else g.moveTo(px, py) }
    g.closePath()
    const gr = g.createRadialGradient(24, 22, 4, 32, 32, 34); gr.addColorStop(0, '#4a5068'); gr.addColorStop(.6, '#262a3a'); gr.addColorStop(1, '#14161f')
    g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,79,98,.55)'; g.stroke()
    for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(20 + r() * 24, 20 + r() * 24, 3 + r() * 4, 0, 6.283); g.fillStyle = 'rgba(8,9,14,.45)'; g.fill() }
    sp.rock.push(cv)
  }
  // storm cloud: dark mass with a red under-glow
  {
    const [cv, g] = mk(160, 80, k)
    const gr = g.createRadialGradient(80, 52, 6, 80, 44, 80); gr.addColorStop(0, 'rgba(255,79,98,.38)'); gr.addColorStop(1, 'rgba(255,79,98,0)'); g.fillStyle = gr; g.fillRect(0, 0, 160, 80)
    const blobs = [[36, 46, 24], [62, 34, 28], [92, 30, 30], [122, 42, 24], [80, 52, 26], [50, 54, 20], [112, 56, 20]]
    for (const [bx, by, br] of blobs) {
      const b = g.createRadialGradient(bx - br * .3, by - br * .4, 2, bx, by, br); b.addColorStop(0, '#4b4466'); b.addColorStop(1, '#1c1828')
      g.beginPath(); g.arc(bx, by, br, 0, 6.283); g.fillStyle = b; g.fill()
    }
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,79,98,.35)'
    for (const [bx, by, br] of blobs) { g.beginPath(); g.arc(bx, by, br, Math.PI * .1, Math.PI * .9); g.stroke() }
    sp.cloud = cv
  }
  // rocket: 24 × 52, nose up, centre of the hitbox at (12, 26)
  {
    const [cv, g] = mk(24, 52, k)
    g.beginPath(); g.moveTo(5, 34); g.lineTo(0, 46); g.lineTo(6, 44); g.closePath(); g.moveTo(19, 34); g.lineTo(24, 46); g.lineTo(18, 44); g.closePath()
    g.fillStyle = '#2a2f40'; g.fill(); g.lineWidth = 1; g.strokeStyle = rgba(c, .9); g.stroke()
    g.beginPath(); g.moveTo(12, 0); g.bezierCurveTo(19, 8, 19, 20, 18, 30); g.lineTo(17, 45); g.lineTo(7, 45); g.lineTo(6, 30); g.bezierCurveTo(5, 20, 5, 8, 12, 0); g.closePath()
    const body = g.createLinearGradient(5, 0, 19, 0); body.addColorStop(0, '#9aa3bd'); body.addColorStop(.45, '#f4f6fb'); body.addColorStop(1, '#6b7390')
    g.fillStyle = body; g.fill()
    g.beginPath(); g.moveTo(12, 0); g.bezierCurveTo(16, 4, 17.5, 8, 18, 12); g.lineTo(6, 12); g.bezierCurveTo(6.5, 8, 8, 4, 12, 0); g.closePath()
    const nose = g.createLinearGradient(6, 0, 18, 12); nose.addColorStop(0, '#ffc43d'); nose.addColorStop(1, rgba(c, 1)); g.fillStyle = nose; g.fill()
    g.beginPath(); g.arc(12, 20, 3.4, 0, 6.283); g.fillStyle = '#0b0d16'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = rgba(c, 1); g.stroke()
    g.fillStyle = '#1b1f2c'; g.fillRect(7, 44, 10, 3)
    sp.rocket = cv
  }
  // flame
  {
    const [cv, g] = mk(20, 40, k)
    g.beginPath(); g.moveTo(10, 40); g.bezierCurveTo(1, 24, 2, 8, 4, 0); g.lineTo(16, 0); g.bezierCurveTo(18, 8, 19, 24, 10, 40); g.closePath()
    const fl = g.createLinearGradient(0, 0, 0, 40); fl.addColorStop(0, '#fff6e0'); fl.addColorStop(.25, '#ffc43d'); fl.addColorStop(.6, rgba(c, .9)); fl.addColorStop(1, rgba(c, 0)); g.fillStyle = fl; g.fill()
    sp.flame = cv
  }
  v.sprites = sp
}

export function resizeView(v, cssW, cssH, dpr, words) {
  const cap = v.lite ? 1.5 : 2
  v.dpr = Math.min(cap, Math.max(1, dpr || 1))
  v.cssW = cssW; v.cssH = cssH
  v.scale = cssW / W
  v.k = v.scale * v.dpr
  v.viewH = cssH / v.scale
  v.canvas.width = Math.round(cssW * v.dpr)
  v.canvas.height = Math.round(cssH * v.dpr)
  const ctx = v.ctx
  v.bg = ctx.createLinearGradient(0, 0, 0, v.viewH)
  v.bg.addColorStop(0, '#05060c'); v.bg.addColorStop(.7, '#0a0c16'); v.bg.addColorStop(1, '#151018')
  // vignettes: rendered once into a small canvas and stretched (a full-screen radial gradient per frame is the costliest thing a low-end phone can be asked for)
  const vig = (rgb) => {
    const [cv, g] = mk(48, 80, 1)
    const gr = g.createRadialGradient(24, 40, 14, 24, 40, 46); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, rgb)
    g.fillStyle = gr; g.fillRect(0, 0, 48, 80)
    return cv
  }
  v.vign = vig('rgba(255,40,60,.6)')
  v.vignA = vig(rgba(v.accent, .5))
  v.scrimT = ctx.createLinearGradient(0, 0, 0, 76)
  v.scrimT.addColorStop(0, 'rgba(5,6,12,.88)'); v.scrimT.addColorStop(1, 'rgba(5,6,12,0)')
  v.scrimB = ctx.createLinearGradient(0, v.viewH - 64, 0, v.viewH)
  v.scrimB.addColorStop(0, 'rgba(5,6,12,0)'); v.scrimB.addColorStop(1, 'rgba(5,6,12,.8)')
  v.fHud = `700 22px ${v.fontDisplay}`; v.fLbl = `600 8px ${v.fontMono}`; v.fPop = `700 13px ${v.fontDisplay}`; v.fCount = `700 120px ${v.fontDisplay}`; v.fSmall = `700 11px ${v.fontDisplay}`
  buildSprites(v, words)
  return v.viewH
}

const fmtInt = (n) => { const s = String(n); return s.length > 3 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s }

export function draw(v, s) {
  const ctx = v.ctx, k = v.k, sp = v.sprites, vh = v.viewH, ry = s.rocketY, alt = s.alt
  const calm = v.lite || v.reduced
  let ox = 0, oy = 0
  if (!calm && s.trauma > 0) { const tr = s.trauma * s.trauma * 9; ox = Math.sin(s.t * 71) * tr * v.dpr; oy = Math.cos(s.t * 53) * tr * v.dpr }
  ctx.setTransform(k, 0, 0, k, ox, oy)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.fillStyle = v.bg
  ctx.fillRect(-20, -20, W + 40, vh + 40)

  // parallax stars: positions are a pure function of altitude, so they cost no state
  const streak = s.burst > 0 && !calm
  for (let i = 0; i < STARS; i++) {
    const L = v.starL[i], f = L === 0 ? .04 : L === 1 ? .1 : .22
    let y = (v.starY[i] * (vh + 20) + alt * f) % (vh + 20) - 10
    ctx.globalAlpha = L === 0 ? .35 : L === 1 ? .55 : .85
    ctx.fillStyle = L === 2 ? '#ffffff' : '#a9b6dc'
    const sz = L === 2 ? 1.6 : 1
    if (streak && L === 2) ctx.fillRect(v.starX[i], y - 14, 1.2, 16)
    else ctx.fillRect(v.starX[i], y, sz, sz)
  }
  ctx.globalAlpha = 1

  // tokens
  for (let i = 0; i < s.kx.length; i++) {
    if (!s.kon[i]) continue
    const y = ry - (s.ka[i] - alt) + Math.sin(s.kph[i]) * 2.5
    if (y < -40 || y > vh + 40) continue
    const x = s.kx[i], pulse = .75 + Math.sin(s.kph[i] * 1.7) * .25
    ctx.globalAlpha = pulse
    ctx.drawImage(sp.glow, x - 30, y - 30, 60, 60)
    ctx.globalAlpha = 1
    ctx.drawImage(sp.coin, x - 18, y - 18, 36, 36)
    const tg = v.tags[s.kw[i] % v.tags.length]
    ctx.drawImage(tg.img, x - tg.w / 2, y + 17, tg.w, tg.h)
  }

  // hazards
  for (let i = 0; i < s.hx.length; i++) {
    const on = s.hon[i]
    if (!on) continue
    const r = s.hr[i]
    const y = ry - (s.ha[i] - alt)
    if (y < -r - 60 || y > vh + r + 60) continue
    const x = s.hx[i]
    ctx.globalAlpha = on === 2 ? Math.max(0, s.hlife[i]) : 1
    if (s.hk[i] === 1) {
      const hw = s.hw[i], w = (hw + r) * 2 + 10, h = r * 2.6
      ctx.drawImage(sp.cloud, x - w / 2, y - h / 2, w, h)
      // lightning: a short deterministic flicker
      if (on === 1 && !calm && Math.sin(s.t * 13 + i * 3.1) > .93) {
        ctx.strokeStyle = '#ff8090'; ctx.lineWidth = 1.6; ctx.beginPath()
        const bx = x + Math.sin(i * 7.7 + Math.floor(s.t * 4)) * hw * .6
        ctx.moveTo(bx, y - r * .3); ctx.lineTo(bx - 5, y + r * .2); ctx.lineTo(bx + 3, y + r * .25); ctx.lineTo(bx - 3, y + r * .9); ctx.stroke()
      }
    } else {
      const rot = s.hrot[i], cs = Math.cos(rot) * k, sn = Math.sin(rot) * k, d = r * 2.13
      ctx.setTransform(cs, sn, -sn, cs, x * k + ox, y * k + oy)
      ctx.drawImage(sp.rock[s.hvar[i]], -d / 2, -d / 2, d, d)
      ctx.setTransform(k, 0, 0, k, ox, oy)
    }
  }
  ctx.globalAlpha = 1

  // particles
  if (!v.lite) ctx.globalCompositeOperation = 'lighter'
  let lastC = -1
  for (let i = 0; i < s.pCap; i++) {
    const l = s.pl[i]
    if (l <= 0) continue
    const y = ry - (s.pa[i] - alt)
    if (y < -10 || y > vh + 10) continue
    const c = s.pc[i]
    if (c !== lastC) { ctx.fillStyle = v.pal[c]; lastC = c }
    const t = l / s.pm[i], z = s.ps[i] * (.4 + t * .6)
    ctx.globalAlpha = c === 4 ? t * .5 : t
    ctx.fillRect(s.px[i] - z / 2, y - z / 2, z, z)
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1

  // rocket
  if (s.phase !== 'over' && !(s.phase === 'dying' && s.dieT < .9)) {
    const blink = s.inv > 0 && s.burst <= 0 && s.phase === 'play' && Math.floor(s.t * 14) % 2 === 0
    const cs = Math.cos(s.tilt) * k, sn = Math.sin(s.tilt) * k
    ctx.setTransform(cs, sn, -sn, cs, s.x * k + ox, ry * k + oy)
    const fl = s.phase === 'count' ? .45 + Math.sin(s.t * 40) * .05 : (s.burst > 0 ? 1.6 : 1) * (.85 + Math.sin(s.t * 47) * .1 + Math.sin(s.t * 31) * .06)
    if (!v.lite) ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(sp.glow, -20, 8, 40, 30 + 20 * fl)
    ctx.drawImage(sp.flame, -7, 19, 14, 28 * fl)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = blink ? .35 : 1
    ctx.drawImage(sp.rocket, -12, -26, 24, 52)
    ctx.globalAlpha = 1
    if (s.burst > 0) {
      ctx.strokeStyle = v.pal[0]; ctx.lineWidth = 2; ctx.globalAlpha = .55 + Math.sin(s.t * 20) * .2
      ctx.beginPath(); ctx.arc(0, 0, 32, 0, 6.283); ctx.stroke()
      ctx.globalAlpha = 1
    }
    ctx.setTransform(k, 0, 0, k, ox, oy)
  }

  // popups
  ctx.font = v.fPop; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (let i = 0; i < s.ul.length; i++) {
    const l = s.ul[i]
    if (l <= 0) continue
    const y = ry - (s.ua[i] - alt)
    ctx.globalAlpha = Math.min(1, l * 2)
    ctx.fillStyle = v.pal[s.uc[i]]
    ctx.fillText(s.ut[i], s.ux[i], y)
  }
  ctx.globalAlpha = 1

  // flashes
  if (s.flash > 0 && !v.reduced) {
    ctx.globalAlpha = Math.min(1, s.flash) * (s.flashC ? .6 : .9)
    ctx.drawImage(s.flashC ? v.vignA : v.vign, 0, 0, W, vh)
    ctx.globalAlpha = 1
  } else if (s.burst > 0) { ctx.globalAlpha = .35; ctx.drawImage(v.vignA, 0, 0, W, vh); ctx.globalAlpha = 1 }

  ctx.setTransform(k, 0, 0, k, 0, 0)
  ctx.fillStyle = v.scrimT; ctx.fillRect(0, 0, W, 76)
  ctx.fillStyle = v.scrimB; ctx.fillRect(0, vh - 64, W, 64)
  hud(v, s)
}

function hud(v, s) {
  const ctx = v.ctx, h = v.hud, vh = v.viewH
  const a = Math.floor(s.alt / 10) * 10
  if (a !== h.alt) { h.alt = a; h.altS = fmtInt(a) + ' m' }
  const sc = score(s)
  if (sc !== h.score) { h.score = sc; h.scoreS = fmtInt(sc) }
  if (s.mult !== h.mult) { h.mult = s.mult; h.multS = 'x' + s.mult }
  ctx.textBaseline = 'alphabetic'
  // left: altitude (the pause button sits at the far left)
  ctx.textAlign = 'left'
  ctx.font = v.fLbl; ctx.fillStyle = '#7d86a3'; ctx.fillText('ALTITUDE', 58, 22)
  ctx.font = v.fHud; ctx.fillStyle = '#f4f6fb'; ctx.fillText(h.altS, 58, 44)
  // right: score + multiplier
  ctx.textAlign = 'right'
  ctx.font = v.fLbl; ctx.fillStyle = '#7d86a3'; ctx.fillText('SCORE', W - 14, 22)
  ctx.font = v.fHud; ctx.fillStyle = '#f4f6fb'; ctx.fillText(h.scoreS, W - 14, 44)
  if (s.mult > 1) { ctx.font = v.fSmall; ctx.fillStyle = v.pal[0]; ctx.fillText(h.multS, W - 14, 60) }
  // shields: three hexes, centre top
  for (let i = 0; i < SHIELDS; i++) {
    const cx = W / 2 - 22 + i * 22, cy = 32
    hexPath(ctx, cx, cy, 8)
    if (i < s.shields) { ctx.fillStyle = v.pal[0]; ctx.fill() } else { ctx.lineWidth = 1.2; ctx.strokeStyle = '#3a4058'; ctx.stroke() }
  }
  // boost meter, bottom
  const bx = 70, bw = W - 140, by = vh - 30, bh = 8
  ctx.beginPath(); ctx.moveTo(bx + 4, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw - 4, by + bh); ctx.lineTo(bx, by + bh); ctx.closePath()
  ctx.fillStyle = '#161a27'; ctx.fill()
  const f = clamp(s.boost, 0, 1)
  if (f > 0) {
    const fw = (bw - 4) * f
    ctx.beginPath(); ctx.moveTo(bx + 4, by); ctx.lineTo(bx + 4 + fw, by); ctx.lineTo(bx + fw, by + bh); ctx.lineTo(bx, by + bh); ctx.closePath()
    const full = f >= 1 && s.burst <= 0
    ctx.globalAlpha = full ? .8 + Math.sin(s.t * 9) * .2 : 1
    ctx.fillStyle = full ? '#ffc43d' : v.pal[0]; ctx.fill(); ctx.globalAlpha = 1
  }
  ctx.textAlign = 'center'; ctx.font = v.fLbl; ctx.fillStyle = s.burst > 0 ? '#ffc43d' : '#7d86a3'
  ctx.fillText(s.burst > 0 ? 'IGNITION' : 'BOOST', W / 2, by - 6)
  // countdown
  if (s.phase === 'count') {
    const n = Math.ceil(s.countT), fr = s.countT - Math.floor(s.countT)
    const z = v.reduced ? 1 : .8 + fr * .4
    ctx.globalAlpha = v.reduced ? 1 : Math.min(1, fr * 2.5)
    ctx.setTransform(v.k * z, 0, 0, v.k * z, (W / 2) * v.k, (vh * .4) * v.k)
    ctx.font = v.fCount; ctx.textBaseline = 'middle'; ctx.fillStyle = n === 1 ? v.pal[0] : '#f4f6fb'
    ctx.fillText(v.countS[n] || '', 0, 0)
    ctx.setTransform(v.k, 0, 0, v.k, 0, 0)
    ctx.globalAlpha = 1
  }
}
