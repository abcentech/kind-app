// Offline audio audit for src/fx/sound.js: every cue, every flow, the master chain and the live engine. Exit code 1 if anything FAILs.
//   node tools/audio-render.mjs                       render + measure every cue and flow, WAVs → tools/out/sound/, spectrograms of the hero cues
//   node tools/audio-render.mjs --only launch,tap     a subset of cues (flows and the master test still run; --no-flows skips the flows)
//   node tools/audio-render.mjs --spec all            spectrogram PNGs for every cue (+ _sheet.png contact sheet);  --spec none to skip
//   node tools/audio-render.mjs --stress              also every cue at rate 0.7 / 1.6 and gain 2 (ceiling, NaN, harshness at the extremes the API allows)
//   node tools/audio-render.mjs --lite                audit the data-fx="lite" voicing (fewer oscillators); writes to tools/out/sound/lite/
//   node tools/audio-render.mjs --live                also smoke-test the real-time engine (unlock, iOS-style hung resume, debounce, prefs, volume, voice cap)
//   node tools/audio-render.mjs --autolevel           nudge each cue's `level` in sound-synth.js toward its loudness target (peak-capped at -4 dBFS); run 2-3x
//
// Per cue it writes <cue>.wav, and with --spec: <cue>.png (ffmpeg showspectrumpic) and <cue>.spec.png (our annotated one:
// true log axis, D-octave guides, a 6 kHz line, a dBFS envelope strip).
//   node tools/audio-render.mjs --url http://localhost:5183 --sr 48000 --volume 1 --conc 4
//
// Each cue is rendered through the *real* master chain (plate reverb → soft compressor → ceiling) by an OfflineAudioContext in
// headless Chrome (playground/sound.bench.js), using the same scheduling code that plays live.
//   FAIL  peak > -3 dBFS · clipped · silent · >6 kHz energy ratio > 5 % (harsh) · NaN · DC offset · body (T-35) over its budget · rings past `len` (would be cut on cleanup)
//         · mono fold-down loses > 9 dB (phase cancellation on a one-speaker phone) · a flow (cues stacked the way screens fire them) peaks above -1 dBFS · the master is not transparent
//   WARN  spectral centroid > 3.2 kHz · loudness > 3 LU from the cue's target · tonal energy off the D pentatonic · too many voices at once · a mark with no onset under it
import { open, OUT } from './browser.mjs'
import { MARKS, SOFT } from '../src/fx/sound-marks.js'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const argv = process.argv.slice(2)
const flag = (f) => argv.includes(f)
const arg = (f, d) => { const i = argv.indexOf(f); return i > -1 ? argv[i + 1] : d }
const URL_ = arg('--url', 'http://localhost:5183')
const SR = Number(arg('--sr', 48000))
const VOLUME = Number(arg('--volume', 1))
const SPEC = arg('--spec', 'hero')
const CONC = Math.max(1, Number(arg('--conc', 4)))
const LITE = flag('--lite')
const ONLY = arg('--only', '')?.split(',').filter(Boolean)
const DIR = join(OUT, 'sound', LITE ? 'lite' : '')
mkdirSync(DIR, { recursive: true })

// ── thresholds ───────────────────────────────────────────────────────────────────────────────────
const LIM = { peak: -3, silent: -50, hf: 0.05, dc: 0.003, endRms: -66, centroidWarn: 3200, lufsWarn: 3, keyWarn: 0.8, phoneDrop: 7, phoneDropHero: 11,
  monoWarn: 4.5, monoFail: 9, sources: LITE ? 70 : 120, blockMs: 150, markDb: 1, flowPeak: -1, ceiling: -0.2, masterTol: 0.35 }

// ── DSP helpers (Node side: the browser only renders) ────────────────────────────────────────────
const db = (x) => 20 * Math.log10(Math.max(x, 1e-12))
const b64f32 = (s) => { const b = Buffer.from(s, 'base64'); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4) }

function fft(re, im) {                                      // in-place radix-2
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr
      }
    }
  }
}

/** Mean power spectrum (both channels), Hann, hop = n/4. Returns { p: Float64Array(n/2), hz(k) }. */
function meanSpectrum(chs, sr, n = 4096) {
  const hann = new Float64Array(n).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n))
  const p = new Float64Array(n / 2)
  const re = new Float64Array(n), im = new Float64Array(n)
  for (const x of chs) {
    for (let s = 0; s + n <= x.length; s += n / 4) {
      for (let i = 0; i < n; i++) { re[i] = x[s + i] * hann[i]; im[i] = 0 }
      fft(re, im)
      for (let k = 0; k < n / 2; k++) p[k] += re[k] * re[k] + im[k] * im[k]
    }
  }
  return { p, hz: (k) => (k * sr) / n }
}

/** BS.1770 K-weighting (48 kHz coefficients; we render at 48 k). */
function kWeight(x) {
  const bq = (b, a, v) => { let z1 = 0, z2 = 0; const o = new Float64Array(v.length); for (let i = 0; i < v.length; i++) { const y = b[0] * v[i] + z1; z1 = b[1] * v[i] - a[1] * y + z2; z2 = b[2] * v[i] - a[2] * y; o[i] = y } return o }
  const s1 = bq([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x)
  return bq([1, -2, 1], [1, -1.99004745483398, 0.99007225036621], s1)
}

/** Loudest momentary loudness (BS.1770: 400 ms window, 100 ms hop, K-weighted; zero-padded at the edges). The right yardstick for a swell that climaxes. */
function momentaryMax(chs, sr) {
  const n = chs[0].length, win = Math.round(sr * 0.4), hop = Math.round(sr * 0.1)
  const cs = chs.map((x) => { const k = kWeight(x), c = new Float64Array(n + 1); for (let i = 0; i < n; i++) c[i + 1] = c[i] + k[i] * k[i]; return c })
  let best = -99
  for (let s = 0; s + hop <= n; s += hop) {
    const e = Math.min(n, s + win)
    let sum = 0
    for (const c of cs) sum += (c[e] - c[s]) / win
    best = Math.max(best, -0.691 + 10 * Math.log10(Math.max(sum, 1e-14)))
  }
  return best
}

/** A mid-range Android speaker, roughly: 4th-order 300 Hz high-pass, 2nd-order 7 kHz low-pass (RBJ biquads). */
function phoneSpeaker(x, sr) {
  const bq = (type, fc, Q, v) => {
    const w = (2 * Math.PI * fc) / sr, c = Math.cos(w), al = Math.sin(w) / (2 * Q), a0 = 1 + al
    const b = type === 'hp' ? [(1 + c) / 2, -(1 + c), (1 + c) / 2] : [(1 - c) / 2, 1 - c, (1 - c) / 2]
    const a = [1, (-2 * c) / a0, (1 - al) / a0]
    let z1 = 0, z2 = 0
    const o = new Float64Array(v.length)
    for (let i = 0; i < v.length; i++) { const xi = v[i], y = (b[0] / a0) * xi + z1; z1 = (b[1] / a0) * xi - a[1] * y + z2; z2 = (b[2] / a0) * xi - a[2] * y; o[i] = y }
    return o
  }
  return bq('lp', 7000, 0.707, bq('hp', 300, 0.707, bq('hp', 300, 0.707, x)))
}

/** Active-region loudness: K-weighted mean square between the first and last sample within 30 dB of the peak. */
function activeLoudness(chs, sr, peak) {
  const thr = peak * 0.0316
  const n = chs[0].length
  let a = n, b = 0
  for (const x of chs) { for (let i = 0; i < n; i++) if (Math.abs(x[i]) > thr) { a = Math.min(a, i); break } for (let i = n - 1; i >= 0; i--) if (Math.abs(x[i]) > thr) { b = Math.max(b, i); break } }
  if (b <= a) return { lufs: -99, ms: 0 }
  let sum = 0
  for (const x of chs) { const k = kWeight(x); let s = 0; for (let i = a; i <= b; i++) s += k[i] * k[i]; sum += s / (b - a + 1) }
  return { lufs: -0.691 + 10 * Math.log10(Math.max(sum, 1e-14)), ms: ((b - a) / sr) * 1000 }
}

/** Peak-pick the mean spectrum in 180–2400 Hz; weight pitch classes by peak power. Fit = share on D E F# A B. */
function keyFit(chs, sr) {
  const n = 16384
  const { p, hz } = meanSpectrum(chs, sr, n)
  let mx = 0
  for (let k = 1; k < p.length - 1; k++) if (hz(k) >= 180 && hz(k) <= 2400) mx = Math.max(mx, p[k])
  const PC = new Float64Array(12)
  let tot = 0, inTune = 0
  for (let k = 12; k < p.length - 12; k++) {
    const f = hz(k)
    if (f < 180 || f > 2400 || p[k] < mx * 1e-3 || !(p[k] > p[k - 1] && p[k] >= p[k + 1])) continue
    let floor = 0
    for (let j = 6; j <= 12; j++) floor += p[k - j] + p[k + j]
    if (p[k] < (floor / 14) * 8) continue                    // a real partial stands ≥ 9 dB above its surroundings; noise peaks do not
    const a = Math.log(p[k - 1] + 1e-30), b = Math.log(p[k] + 1e-30), c = Math.log(p[k + 1] + 1e-30)
    const off = (0.5 * (a - c)) / (a - 2 * b + c || 1)
    const fr = hz(k + Math.max(-.5, Math.min(.5, off)))
    const m = 69 + 12 * Math.log2(fr / 440), r = Math.round(m)
    const w = p[k]
    PC[((r % 12) + 12) % 12] += w; tot += w
    if (Math.abs(m - r) < 0.25) inTune += w
  }
  const pent = [2, 4, 6, 9, 11]                              // D E F# A B as pitch classes (C = 0)
  const inKey = pent.reduce((s, i) => s + PC[i], 0)
  return { fit: tot ? inKey / tot : NaN, tune: tot ? inTune / tot : NaN }
}

/** Do the marks in sound-marks.js name real moments? Onset marks: short-term energy must jump ≥ 1 dB across the mark. Soft marks (a pitch apex, a sweep): the cue must be sounding. */
function checkMarks(cue, L, R, sr, offset = 0.02) {
  const marks = MARKS[cue]
  if (!marks) return []
  const n = L.length, cs = new Float64Array(n + 1)
  for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + L[i] * L[i] + R[i] * R[i]
  const ms = (a, b) => { a = Math.max(0, Math.round(a * sr)); b = Math.min(n, Math.round(b * sr)); return b > a ? (cs[b] - cs[a]) / (b - a) : 0 }
  const out = []
  for (const [name, at] of Object.entries(marks)) {
    const t = offset + at
    if (t + 0.03 > n / sr) { out.push({ name, at, bad: 'beyond the render' }); continue }
    if (SOFT[cue]?.includes(name)) {
      const e = 10 * Math.log10(Math.max(ms(t - 0.03, t + 0.03), 1e-12))
      out.push({ name, at, soft: true, db: e, bad: e < -50 ? 'cue is silent at the mark' : '' })
      continue
    }
    const before = ms(t - 0.06, t - 0.005)
    let after = 0
    for (let j = t - 0.005; j <= t + 0.04; j += 0.005) after = Math.max(after, ms(j, j + 0.005))
    const db = Math.min(60, 10 * Math.log10(Math.max(after, 1e-12) / Math.max(before, 1e-12)))
    out.push({ name, at, db, bad: db < LIM.markDb ? `no onset at ${at}s (${db.toFixed(1)} dB)` : '' })
  }
  return out
}

function analyse(name, L, R, sr, meta, extra = {}) {
  const chs = [L, R], n = L.length
  let peak = 0, pkMono = 0, sumsq = 0, nan = false, clip = 0, dcL = 0, dcR = 0
  for (let i = 0; i < n; i++) {
    const l = L[i], r = R[i]
    if (!Number.isFinite(l) || !Number.isFinite(r)) { nan = true; continue }
    peak = Math.max(peak, Math.abs(l), Math.abs(r)); pkMono = Math.max(pkMono, Math.abs(l + r) / 2); sumsq += l * l + r * r; dcL += l; dcR += r
    if (Math.abs(l) >= 0.999 || Math.abs(r) >= 0.999) clip++
  }
  const rms = Math.sqrt(sumsq / (2 * n))
  const at = (lvl) => { const t = Math.pow(10, lvl / 20); for (let i = n - 1; i >= 0; i--) if (Math.abs(L[i]) > t || Math.abs(R[i]) > t) return (i + 1) / sr; return 0 }
  const tail60 = at(-60), body = at(db(peak) - 35)
  const endPeak = Math.max(...[L, R].map((x) => { let m = 0; for (let i = n - Math.floor(sr * 0.01); i < n; i++) m = Math.max(m, Math.abs(x[i])); return m }))
  const { p, hz } = meanSpectrum(chs, sr, 4096)
  let tot = 0, hi = 0, cen = 0
  for (let k = 1; k < p.length; k++) { tot += p[k]; cen += p[k] * hz(k); if (hz(k) > 6000) hi += p[k] }
  const band = (a, b) => { let e = 0; for (let k = 1; k < p.length; k++) if (hz(k) >= a && hz(k) < b) e += p[k]; return e / tot }
  const bands = { sub: band(0, 150), body: band(150, 500), mid: band(500, 2000), pres: band(2000, 6000), air: band(6000, 1e9) }
  const act = activeLoudness(chs, sr, peak)
  const mom = momentaryMax(chs, sr)
  const loud = meta.kind === 'hero' ? mom : act.lufs          // heroes build and release: judge them by their loudest 400 ms
  const ph = chs.map((x) => phoneSpeaker(x, sr))
  const phPeak = Math.max(...ph.map((x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0)))
  const actPhone = activeLoudness(ph, sr, phPeak)
  const kf = meta.pitched ? keyFit(chs, sr) : { fit: NaN, tune: NaN }
  const M = new Float32Array(n)                                   // a one-speaker phone plays (L+R)/2: wide, detuned layers must not cancel there
  for (let i = 0; i < n; i++) M[i] = (L[i] + R[i]) / 2
  const monoDrop = act.lufs - activeLoudness([M, M], sr, pkMono).lufs
  const marks = checkMarks(name, L, R, sr)
  const m = {
    mono: monoDrop, nodes: extra.nodes, marks,
    name, kind: meta.kind, peak: db(peak), rms: db(rms), body, tail: tail60, lufs: loud, lufsA: act.lufs, lufsM: mom, active: act.ms,
    centroid: cen / tot, hf: hi / tot, bands, phone: actPhone.lufs, phoneDrop: act.lufs - actPhone.lufs, dc: Math.max(Math.abs(dcL), Math.abs(dcR)) / n, fit: kf.fit, tune: kf.tune,
    len: meta.len, budget: meta.body, targetLufs: meta.lufs, trimDb: meta.lufs - loud,
  }
  const fails = [], warns = []
  if (nan) fails.push('NaN/Inf samples')
  if (m.peak > LIM.peak) fails.push(`peak ${m.peak.toFixed(1)} dBFS > ${LIM.peak}`)
  if (clip) fails.push(`${clip} clipped samples`)
  if (m.peak < LIM.silent) fails.push('silent')
  if (m.hf > LIM.hf) fails.push(`harsh: ${(m.hf * 100).toFixed(1)} % of energy above 6 kHz`)
  if (m.dc > LIM.dc) fails.push(`DC offset ${m.dc.toFixed(4)}`)
  if (db(endPeak) > LIM.endRms) fails.push(`not silent at the end of the render (${db(endPeak).toFixed(0)} dBFS) — tail truncated`)
  if (m.body > meta.body) fails.push(`body ${m.body.toFixed(2)} s (T-35) > budget ${meta.body} s`)
  if (m.tail > meta.len) fails.push(`rings to ${m.tail.toFixed(2)} s (-60 dBFS) past len ${meta.len} s`)
  if (m.centroid > LIM.centroidWarn) warns.push(`bright: centroid ${(m.centroid / 1000).toFixed(1)} kHz`)
  if (Math.abs(m.lufs - meta.lufs) > LIM.lufsWarn) warns.push(`loudness ${m.lufs.toFixed(1)} vs target ${meta.lufs} LUFS  → level × ${(10 ** (m.trimDb / 20)).toFixed(2)}`)
  if (m.phoneDrop > (meta.kind === 'hero' ? LIM.phoneDropHero : LIM.phoneDrop)) warns.push(`loses ${m.phoneDrop.toFixed(0)} LU on a phone speaker (300 Hz roll-off): too bass-heavy to be heard`)
  if (meta.pitched && m.fit < LIM.keyWarn) warns.push(`only ${(m.fit * 100).toFixed(0)} % of tonal energy on D-pentatonic`)
  if (m.mono > LIM.monoFail) fails.push(`mono fold-down loses ${m.mono.toFixed(1)} dB: phase cancellation`)
  else if (m.mono > LIM.monoWarn) warns.push(`mono fold-down loses ${m.mono.toFixed(1)} dB (more than uncorrelated stereo would)`)
  if (extra.nodes && extra.nodes.peak > LIM.sources) warns.push(`${extra.nodes.peak} sources sounding at once (${extra.nodes.sources} created): heavy for a 2 GB phone`)
  for (const k of marks) if (k.bad) warns.push(`mark ${k.name}: ${k.bad}`)
  return { ...m, fails, warns }
}

// ── WAV (16-bit stereo, TPDF dither) + spectrogram ───────────────────────────────────────────────
function wav16(L, R, sr) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28)
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40)
  const q = (v) => Math.max(-32768, Math.min(32767, Math.round(v * 32767 + (Math.random() - Math.random()))))
  for (let i = 0; i < n; i++) { buf.writeInt16LE(q(L[i]), 44 + i * 4); buf.writeInt16LE(q(R[i]), 46 + i * 4) }
  return buf
}
function spectrogram(wavPath, pngPath, { w = 1200, h = 460, legend = 1 } = {}) {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', wavPath, '-lavfi',
    `showspectrumpic=s=${w}x${h}:legend=${legend}:mode=combined:color=fire:scale=log:fscale=log:win_func=hann:drange=84:start=60:stop=12000`, pngPath], { encoding: 'utf8' })
  if (r.status !== 0) console.warn('  ffmpeg spectrogram failed:', (r.stderr || '').split('\n')[0])
  return r.status === 0
}

/** Our own annotated spectrogram: log frequency 60 Hz-12 kHz, D-octave guides, the 6 kHz harshness line, a dBFS envelope strip. */
async function annotatedSpec(L, R, sr, name, file) {
  const sharp = (await import('sharp')).default
  const W = 1100, H = 420, EH = 70, PAD_L = 54, PAD_T = 22, PAD_B = 22, N = 2048, HOP = 256
  const FMIN = 60, FMAX = 12000, RANGE = 80
  const n = L.length, frames = Math.floor((n - N) / HOP)
  const hann = new Float64Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N))
  const re = new Float64Array(N), im = new Float64Array(N)
  const col = new Float32Array(frames * (N / 2))
  let gmax = 1e-12
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < N; i++) { re[i] = (L[f * HOP + i] + R[f * HOP + i]) * 0.5 * hann[i]; im[i] = 0 }
    fft(re, im)
    for (let k = 0; k < N / 2; k++) { const m = Math.hypot(re[k], im[k]); col[f * (N / 2) + k] = m; if (m > gmax) gmax = m }
  }
  const rowBin = (r) => (FMIN * Math.pow(FMAX / FMIN, r / H) * N) / sr
  const ramp = [[0, 0, 0], [8, 6, 28], [60, 12, 90], [150, 28, 110], [226, 78, 70], [255, 150, 40], [255, 214, 120], [255, 255, 235]]
  const color = (t) => { t = Math.max(0, Math.min(1, t)); const x = t * (ramp.length - 1), i = Math.min(ramp.length - 2, Math.floor(x)), u = x - i; return ramp[i].map((c, j) => c + (ramp[i + 1][j] - c) * u) }
  const pw = W - PAD_L - 10
  const img = Buffer.alloc(pw * H * 3)
  for (let x = 0; x < pw; x++) {
    const f = Math.min(frames - 1, Math.floor((x / pw) * frames))
    for (let y = 0; y < H; y++) {
      const r = H - 1 - y, lo = rowBin(r), hi = Math.max(lo + 1e-6, rowBin(r + 1))
      let m = 0
      for (let k = Math.floor(lo); k <= Math.min(N / 2 - 1, Math.ceil(hi)); k++) m = Math.max(m, col[f * (N / 2) + k])
      const c = color(1 + (20 * Math.log10(Math.max(m / gmax, 1e-6))) / RANGE), o = (y * pw + x) * 3
      img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]
    }
  }
  const env = Buffer.alloc(pw * EH * 3, 8)               // per-column peak in dBFS, -80..0
  for (let x = 0; x < pw; x++) {
    const a = Math.floor((x / pw) * n), b = Math.max(a + 1, Math.floor(((x + 1) / pw) * n))
    let pk = 0
    for (let i = a; i < b; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]))
    const h = Math.round(Math.max(0, Math.min(1, 1 + (20 * Math.log10(Math.max(pk, 1e-6))) / 80)) * EH)
    for (let y = EH - h; y < EH; y++) { const o = (y * pw + x) * 3; env[o] = 99; env[o + 1] = 216; env[o + 2] = 255 }
  }
  const dur = n / sr, TH = PAD_T + H + 8 + EH + PAD_B
  const yOf = (f) => PAD_T + H - 1 - (Math.log(f / FMIN) / Math.log(FMAX / FMIN)) * H
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${TH}"><style>text{font:10px monospace;fill:#aab2c6}.h{fill:#ffc43d}</style>`
  svg += `<text x="${PAD_L}" y="14" class="h">${name}   0-${dur.toFixed(1)} s   log 60 Hz-12 kHz   range ${RANGE} dB below the loudest bin</text>`
  for (const [f, lab] of [[73.42, 'D2'], [146.83, 'D3'], [293.66, 'D4'], [587.33, 'D5'], [1174.66, 'D6'], [2349.3, 'D7'], [4698.6, 'D8']]) {
    svg += `<line x1="${PAD_L}" x2="${W - 10}" y1="${yOf(f)}" y2="${yOf(f)}" stroke="#7a8299" stroke-opacity=".3" stroke-dasharray="2 4"/><text x="6" y="${yOf(f) + 3}">${lab} ${Math.round(f)}</text>`
  }
  svg += `<line x1="${PAD_L}" x2="${W - 10}" y1="${yOf(6000)}" y2="${yOf(6000)}" stroke="#ff4f62" stroke-opacity=".7" stroke-dasharray="6 4"/><text x="6" y="${yOf(6000) + 3}" style="fill:#ff4f62">6k limit</text>`
  for (let t = 0; t <= dur; t += dur > 3 ? 0.5 : 0.25) {
    const x = PAD_L + (t / dur) * pw
    svg += `<line x1="${x}" x2="${x}" y1="${PAD_T + H}" y2="${PAD_T + H + 4}" stroke="#7a8299"/><text x="${x - 8}" y="${PAD_T + H + 16}">${t.toFixed(t % 1 ? 2 : 0)}s</text>`
  }
  svg += `<text x="6" y="${PAD_T + H + 8 + EH / 2}">dBFS</text></svg>`
  await sharp({ create: { width: W, height: TH, channels: 3, background: '#06070d' } })
    .composite([
      { input: img, raw: { width: pw, height: H, channels: 3 }, left: PAD_L, top: PAD_T },
      { input: env, raw: { width: pw, height: EH, channels: 3 }, left: PAD_L, top: PAD_T + H + 8 },
      { input: Buffer.from(svg), top: 0, left: 0 },
    ]).png().toFile(file)
}

/** A flow is a stack of cues fired the way a screen fires them: it must stay under the ceiling and not clip, whatever the individual cues do. */
function analyseFlow(id, L, R, sr) {
  const n = L.length
  let peak = 0, nan = false, clip = 0
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(L[i]) || !Number.isFinite(R[i])) { nan = true; continue }
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
    if (Math.abs(L[i]) >= 0.999 || Math.abs(R[i]) >= 0.999) clip++
  }
  const { p, hz } = meanSpectrum([L, R], sr, 4096)
  let tot = 0, hi = 0
  for (let k = 1; k < p.length; k++) { tot += p[k]; if (hz(k) > 6000) hi += p[k] }
  const m = { name: id, peak: db(peak), lufsM: momentaryMax([L, R], sr), hf: hi / tot, dur: n / sr }
  const fails = [], warns = []
  if (nan) fails.push('NaN/Inf samples')
  if (clip) fails.push(`${clip} clipped samples`)
  if (m.peak > LIM.flowPeak) fails.push(`stacked peak ${m.peak.toFixed(1)} dBFS > ${LIM.flowPeak}: the limiter is working too hard`)
  else if (m.peak > LIM.peak) warns.push(`stacked peak ${m.peak.toFixed(1)} dBFS`)
  if (m.hf > LIM.hf) fails.push(`harsh: ${(m.hf * 100).toFixed(1)} % above 6 kHz`)
  return { ...m, fails, warns }
}

/** The extremes the API allows (rate 0.7 / 1.6, gain 2): the ceiling holds, nothing is NaN, nothing turns harsh. */
function analyseStress(name, variant, L, R, sr) {
  const n = L.length
  let peak = 0, nan = false, clip = 0
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(L[i]) || !Number.isFinite(R[i])) { nan = true; continue }
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
    if (Math.abs(L[i]) >= 0.999 || Math.abs(R[i]) >= 0.999) clip++
  }
  const { p, hz } = meanSpectrum([L, R], sr, 4096)
  let tot = 0, hi = 0
  for (let k = 1; k < p.length; k++) { tot += p[k]; if (hz(k) > 6000) hi += p[k] }
  const pk = db(peak), hf = hi / tot, fails = [], warns = []
  if (nan) fails.push('NaN/Inf samples')
  if (clip) fails.push(`${clip} clipped samples`)
  if (variant === 'gain 2') { if (pk > LIM.ceiling) fails.push(`ceiling broken: ${pk.toFixed(2)} dBFS`) } else if (pk > LIM.peak) fails.push(`peak ${pk.toFixed(1)} dBFS > ${LIM.peak}`)
  if (hf > 0.1) fails.push(`harsh: ${(hf * 100).toFixed(1)} % above 6 kHz`)
  else if (hf > LIM.hf) warns.push(`bright: ${(hf * 100).toFixed(1)} % above 6 kHz`)
  return { name, variant, peak: pk, hf, fails, warns }
}

// ── run ──────────────────────────────────────────────────────────────────────────────────────────
const b = await open({ url: URL_ + '/playground/sound.bench.html', device: 'desktop', state: null, args: ['--autoplay-policy=no-user-gesture-required'] })
const pageErr = () => b.errors.splice(0)

async function inPage(fn, arg) {
  for (let tries = 0; ; tries++) {
    try {
      await b.page.waitForFunction(() => window.bench && window.bench.ready, null, { timeout: 90000 })
      return await b.page.evaluate(fn, arg)
    } catch (e) {
      if (tries < 2 && /context was destroyed|navigation|reloaded/i.test(String(e))) { await b.page.waitForLoadState('load'); continue }
      throw e
    }
  }
}

const { meta, CUES, flows } = await inPage(() => ({ meta: window.bench.meta, CUES: window.bench.cues, flows: window.bench.flows.map((f) => ({ id: f.id, label: f.label })) }))
const names = Object.keys(meta)
const missing = CUES.filter((c) => !meta[c]), extra = names.filter((c) => !CUES.includes(c))
if (missing.length || extra.length) { console.error('CUES mismatch  missing:', missing, ' extra:', extra); process.exitCode = 1 }
const todo = ONLY?.length ? ONLY : CUES

/** Render `cues` concurrently in the page (one offline context each, rendered on its own thread), then pull the samples across. */
const renderBatch = (cues, opts) => inPage(({ cues, opts }) => Promise.all(cues.map((c) => window.bench.renderCue(c, opts))), { cues, opts })
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

const rows = []
const t0 = Date.now()
for (const group of chunk(todo, CONC)) {
  const res = await renderBatch(group, { sr: SR, volume: VOLUME, lite: LITE })
  for (const [i, cue] of group.entries()) {
    const L = b64f32(res[i].L), R = b64f32(res[i].R)
    const row = analyse(cue, L, R, SR, meta[cue], { nodes: res[i].nodes })
    rows.push(row)
    const wavPath = join(DIR, cue + '.wav')
    writeFileSync(wavPath, wav16(L, R, SR))
    if (SPEC === 'all' || (SPEC === 'hero' && (meta[cue].kind === 'hero' || ['correct', 'wrong', 'rare', 'chest'].includes(cue)))) {
      spectrogram(wavPath, join(DIR, cue + '.png'))
      try { await annotatedSpec(L, R, SR, cue, join(DIR, cue + '.spec.png')) } catch (e) { console.warn('  annotated spectrogram failed:', e.message) }
    }
  }
}

// ── flows ────────────────────────────────────────────────────────────────────────────────────────
const flowRows = []
if (!flag('--no-flows') && !ONLY?.length) {
  for (const group of chunk(flows, CONC)) {
    const res = await inPage(({ ids, opts }) => Promise.all(ids.map((id) => window.bench.renderFlow(id, opts))), { ids: group.map((f) => f.id), opts: { sr: SR, volume: VOLUME, lite: LITE } })
    for (const [i, f] of group.entries()) {
      const L = b64f32(res[i].L), R = b64f32(res[i].R)
      const row = analyseFlow(f.id, L, R, SR)
      row.label = f.label; row.nodes = res[i].nodes
      if (row.nodes.peak > LIM.sources * 1.5) row.warns.push(`${row.nodes.peak} sources sounding at once`)
      flowRows.push(row)
      writeFileSync(join(DIR, `flow-${f.id}.wav`), wav16(L, R, SR))
    }
  }
}

// ── master chain: transparent below the knee, a hard ceiling above it ────────────────────────────
const masterRows = []
if (!ONLY?.length) {
  for (const dbIn of [-40, -30, -20, -12, -6, 0, 6]) {
    const out = await inPage((d) => window.bench.masterGain(d, { sr: 48000, volume: 1 }), dbIn)
    masterRows.push({ dbIn, gain: out.rms - (dbIn - 3.01), peak: out.peak })
  }
}

// ── first-tap cost: the master chain is built in slices so unlocking audio never freezes a phone ───────
const blockRows = []
if (!ONLY?.length) {
  const cdp = await b.ctx.newCDPSession(b.page)
  for (const rate of [1, 4]) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate })
    for (const mode of ['sync', 'cold', 'warm']) {
      let best = null
      for (let i = 0; i < 3; i++) { const r = await inPage((m) => window.bench.blockProbe(m), mode); if (!best || r.worst < best.worst) best = r }   // min of three: contention from other processes only ever adds
      blockRows.push({ rate, mode, ...best })
    }
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
}

// ── stress ───────────────────────────────────────────────────────────────────────────────────────
const stressRows = []
if (flag('--stress')) {
  for (const [variant, opts] of [['rate 0.7', { rate: 0.7 }], ['rate 1.6', { rate: 1.6 }], ['gain 2', { gain: 2 }]]) {
    for (const group of chunk(todo, CONC)) {
      const res = await renderBatch(group, { sr: SR, volume: VOLUME, lite: LITE, ...opts })
      for (const [i, cue] of group.entries()) stressRows.push(analyseStress(cue, variant, b64f32(res[i].L), b64f32(res[i].R), SR))
    }
  }
}

// ── report ───────────────────────────────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n), num = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '  - ')
console.log(`\nKIND sound audit${LITE ? ' (lite voicing)' : ''} · ${todo.length} cues · ${SR / 1000} kHz · volume ${VOLUME} · ${((Date.now() - t0) / 1000).toFixed(1)} s\n`)
console.log(pad('cue', 10) + pad('kind', 8) + ['peak dBFS', 'LUFS(a|M)', 'target', 'phone LU', 'mono LU', 'body s', 'budget', 'tail s', 'len', 'centroid', '>6k %', 'key %', 'voices', 'nodes'].map((h) => h.padStart(10)).join('') + '  verdict')
for (const r of rows) {
  const v = r.fails.length ? 'FAIL' : r.warns.length ? 'warn' : 'ok'
  console.log(pad(r.name, 10) + pad(r.kind, 8) + [num(r.peak), num(r.lufs) + (r.kind === 'hero' ? 'M' : 'a'), r.targetLufs, '-' + num(r.phoneDrop, 0), num(-r.mono, 1), num(r.body, 2), r.budget, num(r.tail, 2), r.len, Math.round(r.centroid), num(r.hf * 100), num(r.fit * 100, 0), r.nodes?.peak ?? '-', (r.nodes?.sources ?? '-') + '+' + ((r.nodes?.gain ?? 0) + (r.nodes?.filt ?? 0))].map((x) => String(x).padStart(10)).join('') + '  ' + v)
}
console.log('\nenergy by band, % of total   sub <150 Hz | body 150-500 | mid 0.5-2k | presence 2-6k | air >6k')
for (const r of rows) console.log('  ' + pad(r.name, 10) + Object.values(r.bands).map((x) => (x * 100).toFixed(0).padStart(5)).join(''))
const marked = rows.filter((r) => r.marks?.length)
if (marked.length) {
  console.log('\nmarks (sound.marks): the picture lands here   onset = short-term energy jump across the mark')
  for (const r of marked) console.log('  ' + pad(r.name, 10) + r.marks.map((k) => `${k.name} ${k.at}s ${k.soft ? '(soft)' : (k.db >= 0 ? '+' : '') + num(k.db) + ' dB'}${k.bad ? ' !!' : ''}`).join('   '))
}
if (flowRows.length) {
  console.log('\nflows (cues stacked the way screens fire them, through the real master with ducking)')
  console.log('  ' + pad('flow', 16) + ['dur s', 'peak dBFS', 'LUFS-M', '>6k %', 'voices', 'verdict'].map((h) => h.padStart(10)).join(''))
  for (const f of flowRows) console.log('  ' + pad(f.label, 16) + [num(f.dur), num(f.peak), num(f.lufsM), num(f.hf * 100), f.nodes.peak, f.fails.length ? 'FAIL' : f.warns.length ? 'warn' : 'ok'].map((x) => String(x).padStart(10)).join(''))
}
const blockFails = []
if (blockRows.length) {
  console.log(`
first tap (building the master chain): longest main-thread block, CPU x1 and x4 (a phone)   cold = nothing prepared (limit ${LIM.blockMs} ms at x4) · warm = after the idle prewarm`)
  for (const r of blockRows) console.log(`  CPU x${r.rate}  ${r.mode.padEnd(5)}  longest block ${num(r.worst, 0).padStart(4)} ms   total ${num(r.total, 0).padStart(4)} ms` + (r.slices?.length ? '   slices: ' + r.slices.map(([n, ms]) => `${n} ${Math.round(ms)}`).join(', ') : ''))
  const a4 = blockRows.find((r) => r.rate === 4 && r.mode === 'cold')
  if (a4 && a4.worst > LIM.blockMs) blockFails.push(`first tap blocks the main thread for ${a4.worst.toFixed(0)} ms at CPU x4 (limit ${LIM.blockMs})`)
}
const masterFails = []
if (masterRows.length) {
  console.log('\nmaster chain (1 kHz sine at the bus): gain should be 0 dB below the compressor knee; the soft ceiling must hold above it')
  for (const r of masterRows) console.log(`  in ${String(r.dbIn).padStart(4)} dBFS   gain ${(r.gain >= 0 ? '+' : '') + r.gain.toFixed(2)} dB   peak ${r.peak.toFixed(2)} dBFS`)
  for (const r of masterRows) { if (r.dbIn <= -20 && Math.abs(r.gain) > LIM.masterTol) masterFails.push(`master not transparent at ${r.dbIn} dBFS: ${r.gain.toFixed(2)} dB`); if (r.peak > LIM.ceiling) masterFails.push(`master ceiling broken at ${r.dbIn} dBFS in: peak ${r.peak.toFixed(2)} dBFS`) }
}
const bad = rows.filter((r) => r.fails.length), wr = rows.filter((r) => r.warns.length)
for (const r of rows) { for (const f of r.fails) console.log(`  FAIL ${r.name}: ${f}`); for (const w of r.warns) console.log(`  warn ${r.name}: ${w}`) }
for (const f of flowRows) { for (const x of f.fails) console.log(`  FAIL flow ${f.name}: ${x}`); for (const x of f.warns) console.log(`  warn flow ${f.name}: ${x}`) }
for (const x of masterFails.concat(blockFails)) console.log('  FAIL ' + x)
if (stressRows.length) {
  const sf = stressRows.filter((r) => r.fails.length), sw = stressRows.filter((r) => r.warns.length)
  console.log(`\nstress: ${stressRows.length} renders (rate 0.7, rate 1.6, gain 2) · ${sf.length} fail · ${sw.length} warn · worst peak at gain 2: ${num(Math.max(...stressRows.filter((r) => r.variant === 'gain 2').map((r) => r.peak)), 2)} dBFS`)
  for (const r of stressRows) { for (const f of r.fails) console.log(`  FAIL ${r.name} @ ${r.variant}: ${f}`); for (const w of r.warns) console.log(`  warn ${r.name} @ ${r.variant}: ${w}`) }
}
{                                                          // merge: a partial run (--only) must not wipe the other cues' numbers
  const file = join(DIR, '_report.json')
  let prev = []
  try { prev = JSON.parse((await import('node:fs')).readFileSync(file, 'utf8')) } catch { /* first run */ }
  const by = new Map(prev.map((r) => [r.name, r]))
  for (const r of rows) by.set(r.name, r)
  writeFileSync(file, JSON.stringify(CUES.filter((c) => by.has(c)).map((c) => by.get(c)), null, 1))
  if (flowRows.length) writeFileSync(join(DIR, '_flows.json'), JSON.stringify(flowRows, null, 1))
}

// --autolevel: move each cue's `level` toward its loudness target, never past a -4 dBFS peak. Re-run until it stops changing.
let pendingLevels = null
if (flag('--autolevel') && !LITE) {
  const { readFileSync, writeFileSync: wf } = await import('node:fs')
  const file = new URL('../src/fx/sound-synth.js', import.meta.url)
  const raw = readFileSync(file, 'utf8')
  let src = raw.replace(/\r\n/g, '\n'), changed = 0
  for (const r of rows) {
    const m = new RegExp(`(\\n  ${r.name}:\\s+\\{[^\\n]*?level: )([\\d.]+)`).exec(src)
    if (!m) { console.warn('  autolevel: no level field for', r.name); continue }
    const want = Math.min(10 ** ((r.targetLufs - r.lufs) / 20), 10 ** ((-4 - r.peak) / 20))
    const next = Math.round(Number(m[2]) * want * 100) / 100
    if (Math.abs(next - Number(m[2])) < 0.015) continue
    src = src.replace(m[0], m[1] + next); changed++
    console.log(`  autolevel ${r.name}: ${m[2]} -> ${next}`)
  }
  if (changed) pendingLevels = { file, src: raw.includes('\r\n') ? src.replace(/\n/g, '\r\n') : src, wf }   // written after the page closes: rewriting the synth mid-run would HMR-remount the playground
  console.log(changed ? `autolevel changed ${changed} cues; re-run to confirm` : 'autolevel: nothing to change')
}

// contact sheet of spectrograms
if (SPEC === 'all' && todo.length > 1) {
  try {
    const sharp = (await import('sharp')).default
    const cw = 600, ch = 200, cols = 3
    const files = todo.filter((c) => existsSync(join(DIR, c + '.spec.png')))
    const tiles = []
    for (const [i, c] of files.entries()) {
      const img = await sharp(join(DIR, c + '.spec.png')).resize(cw, ch, { fit: 'fill' }).toBuffer()
      tiles.push({ input: img, left: (i % cols) * cw, top: Math.floor(i / cols) * ch })
    }
    const rowsN = Math.ceil(files.length / cols)
    await sharp({ create: { width: cw * cols, height: ch * rowsN, channels: 3, background: '#000' } }).composite(tiles).png().toFile(join(DIR, '_sheet.png'))
    console.log('\ncontact sheet:', join(DIR, '_sheet.png'))
  } catch (e) { console.warn('contact sheet skipped:', e.message) }
}

// ── live engine smoke test ───────────────────────────────────────────────────────────────────────
let liveFail = 0
if (flag('--live')) {
  console.log('\nlive engine')
  const out = await inPage(async () => {
    const { sound, CUES } = await import('/src/fx/sound.js')
    const { prefs } = await import('/src/prefs.js')
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const until = async (f, ms = 8000) => { for (let t = 0; t < ms; t += 25) { if (f()) return true; await sleep(25) } return f() }
    const log = []
    const ok = (name, pass, info = '') => log.push({ name, pass: !!pass, info })
    prefs.set('sound', true); prefs.set('volume', 0.6)
    ok('locked before unlock: play is a no-op', sound.play('tap') === false && sound.stats().played === 0, JSON.stringify(sound.stats()))

    // iOS: the first resume() (pointerdown, not a valid activation) never settles. A later gesture must still be able to wake the context.
    const Real = window.AudioContext, realResume = Real.prototype.resume
    let calls = 0
    window.AudioContext = class extends Real {
      constructor(o) { super(o); this.suspend() }
      resume() { calls++; return calls === 1 ? new Promise(() => {}) : realResume.call(this) }
    }
    let heard = 0
    const off = sound.onUnlock(() => heard++)
    sound.unlock()
    await sleep(200)
    ok('iOS: a hung first resume() leaves the engine locked', !sound.ready && calls >= 1, JSON.stringify(sound.stats()))
    window.dispatchEvent(new Event('touchend'))
    ok('iOS: the next gesture wakes it anyway', await until(() => sound.ready), JSON.stringify({ ...sound.stats(), calls }))
    ok('onUnlock fires once, when audio is really running', heard === 1, 'heard ' + heard)
    window.dispatchEvent(new Event('click')); window.dispatchEvent(new Event('click')); off()
    ok('onUnlock stays once', heard === 1, 'heard ' + heard)
    window.AudioContext = Real

    let p0 = sound.stats().played
    const first = sound.play('tap'), second = sound.play('tap')
    ok('identical cue within 60 ms is debounced', first === true && second === false && sound.stats().played === p0 + 1, `played ${sound.stats().played - p0}`)
    await sleep(120); p0 = sound.stats().played
    sound.play('tap'); await sleep(80); sound.play('tap')
    ok('…but plays again after 60 ms', sound.stats().played === p0 + 2)
    p0 = sound.stats().played
    prefs.set('sound', false); const muted = sound.play('correct')
    ok('prefs.sound=false is a no-op', muted === false && sound.stats().played === p0)
    prefs.set('sound', true); await until(() => sound.ready); await sleep(100); prefs.set('volume', 0); p0 = sound.stats().played; sound.play('correct')
    ok('volume 0 is a no-op', sound.stats().played === p0)
    prefs.set('volume', 0.6); await sleep(150)
    ok('unknown cue is ignored', sound.play('nope') === false)
    ok('marks: sound.marks(launch) has a lift, and scales with rate', sound.marks('launch').lift === 1.95 && Math.abs(sound.marks('launch', 2).lift - 0.975) < 1e-9 && Object.keys(sound.marks('tap')).length === 0)

    // every cue, 140 ms apart (the longest overlap is the voice cap's to shed): nothing throws, rewards and heroes are never shed, only micro UI cues
    await sleep(500)
    p0 = sound.stats().played; const d0 = sound.stats().dropped, s0 = { ...sound.stats().shed }; let threw = null
    try { for (const c of CUES) { sound.play(c, { gain: 0.8 }); await sleep(140) } } catch (e) { threw = e.message }
    const st = sound.stats(), shedNow = Object.entries(st.shed).filter(([c, n]) => n > (s0[c] || 0)).map(([c]) => c)
    const { CUE_META } = await import('/src/fx/sound-synth.js')
    const wrongShed = shedNow.filter((c) => CUE_META[c].kind !== 'ui')
    ok('all ' + CUES.length + ' cues schedule without throwing; only micro UI cues are ever shed', !threw && st.played - p0 + (st.dropped - d0) === CUES.length && wrongShed.length === 0, threw || `played ${st.played - p0}, shed ${st.dropped - d0} ${JSON.stringify(shedNow)} ${JSON.stringify(wrongShed)}`)

    // lite voicing + every option the API takes: no throw
    await sleep(3000)
    document.documentElement.dataset.fx = 'lite'
    let lt = null
    try { sound.play('complete'); sound.play('medal', { tier: 'gold', pan: -0.7 }); sound.play('detent', { step: 9 }); sound.play('nav', { pan: 1 }) } catch (e) { lt = e.message }
    document.documentElement.dataset.fx = 'full'
    ok('lite voicing and opts (tier, pan, step) schedule without throwing', !lt, lt || '')
    sound.play('launch'); sound.duck(500); sound.stop(100); await sleep(250)
    ok('duck/stop do not throw', true)
    await sleep(400)
    return { log, stats: sound.stats() }
  })
  for (const l of out.log) { console.log(`  ${l.pass ? 'ok  ' : 'FAIL'} ${l.name}${l.pass ? '' : '  ' + l.info}`); if (!l.pass) liveFail++ }
  console.log('  ', JSON.stringify(out.stats))
}

const errs = pageErr()
if (errs.length) console.log('\npage errors:\n' + errs.join('\n'))
await b.close()
if (pendingLevels) pendingLevels.wf(pendingLevels.file, pendingLevels.src)
const flowBad = flowRows.filter((f) => f.fails.length), stressBad = stressRows.filter((r) => r.fails.length)
console.log(`\n${rows.length - bad.length}/${rows.length} cues pass · ${flowRows.length - flowBad.length}/${flowRows.length} flows pass · ${wr.length} warnings · WAVs in ${DIR}`)
if (bad.length || flowBad.length || stressBad.length || masterFails.length || blockFails.length || liveFail || errs.length) process.exitCode = 1
