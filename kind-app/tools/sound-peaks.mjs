// Strongest spectral peaks of a rendered cue in a time window, with note names and cents: how to check a cue is really playing the notes it claims.
//   node tools/sound-peaks.mjs correct 0.2 0.5      (reads tools/out/sound/<cue>.wav, written by tools/audio-render.mjs; window start and length in seconds)
import { readFileSync } from 'node:fs'
const [name, t0 = 0, t1 = 0.5] = process.argv.slice(2)
const b = readFileSync(`tools/out/sound/${name}.wav`)
const sr = b.readUInt32LE(24), n = (b.length - 44) / 4
const x = new Float64Array(n)
for (let i = 0; i < n; i++) x[i] = (b.readInt16LE(44 + i * 4) + b.readInt16LE(46 + i * 4)) / 65536
const s = Math.floor(+t0 * sr), N = 16384
const re = new Float64Array(N), im = new Float64Array(N)
for (let i = 0; i < N; i++) re[i] = (x[s + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N))
// naive radix-2
for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] } }
for (let len = 2; len <= N; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < N; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2; const tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr; re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr } } }
const mag = new Float64Array(N / 2); let mx = 0
for (let k = 1; k < N / 2; k++) { mag[k] = Math.hypot(re[k], im[k]); mx = Math.max(mx, mag[k]) }
const peaks = []
for (let k = 2; k < N / 2 - 2; k++) if (mag[k] > mag[k - 1] && mag[k] >= mag[k + 1] && mag[k] > mx * 0.03) peaks.push([k * sr / N, 20 * Math.log10(mag[k] / mx)])
const NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
console.log(peaks.sort((a, b) => b[1] - a[1]).slice(0, 14).map(([f, d]) => { const m = 69 + 12 * Math.log2(f / 440), r = Math.round(m); return `${f.toFixed(1).padStart(8)} Hz  ${d.toFixed(1).padStart(6)} dB  ${NOTE[((r % 12) + 12) % 12]}${Math.floor(r / 12) - 1} ${(100 * (m - r)).toFixed(0)}c` }).join('\n'))
