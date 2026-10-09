// The audit's page-side half: renders cues / flows offline through the real master chain and hands the samples back (base64 Float32).
// Everything that needs the browser lives here; everything that needs numbers (peak, LUFS, spectrum, verdicts) lives in tools/audio-render.mjs.
import * as synth from '../src/fx/sound-synth.js'
import { CUES } from '../src/fx/sound.js'
import { MARKS } from '../src/fx/sound-marks.js'
import { FLOWS } from './sound.flows.js'

const enc = (f) => { const u = new Uint8Array(f.buffer, f.byteOffset, f.byteLength); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s) }

/** Counts the nodes a render creates and the most sources (oscillators + noise players) sounding at once: the audio-thread cost of a cue. */
function counter() {
  const c = { osc: 0, src: 0, filt: 0, gain: 0, pan: 0 }, iv = []
  const prepare = (ctx) => {
    const wrap = (method, key, track) => {
      const make = ctx[method].bind(ctx)
      ctx[method] = (...a) => {
        const n = make(...a)
        c[key]++
        if (track) {
          const start = n.start.bind(n), stop = n.stop.bind(n), rec = { t0: 0, t1: Infinity }
          n.start = (t = 0, ...r) => { rec.t0 = t; iv.push(rec); return start(t, ...r) }
          n.stop = (t) => { rec.t1 = t; return stop(t) }
        }
        return n
      }
    }
    wrap('createOscillator', 'osc', true); wrap('createBufferSource', 'src', true)
    wrap('createBiquadFilter', 'filt'); wrap('createGain', 'gain'); wrap('createStereoPanner', 'pan')
  }
  const done = () => {
    const ev = []
    for (const r of iv) { ev.push([r.t0, 1], [r.t1, -1]) }
    ev.sort((a, b) => a[0] - b[0] || a[1] - b[1])
    let cur = 0, peak = 0
    for (const [, d] of ev) { cur += d; peak = Math.max(peak, cur) }
    return { ...c, sources: c.osc + c.src, peak }
  }
  return { prepare, done }
}

const pack = (buf, nodes) => ({ L: enc(buf.getChannelData(0)), R: enc(buf.getChannelData(1)), nodes })

window.bench = {
  ready: true,
  meta: synth.CUE_META,
  cues: CUES,
  marks: MARKS,
  flows: FLOWS,
  async renderCue(cue, { sr = 48000, volume = 1, ...opts } = {}) {
    const k = counter()
    const buf = await synth.renderCue(cue, { sampleRate: sr, volume, prepare: k.prepare, ...opts })
    return pack(buf, k.done())
  },
  async renderFlow(id, { sr = 48000, volume = 1, ...opts } = {}) {
    const flow = FLOWS.find((f) => f.id === id)
    const k = counter()
    const buf = await synth.renderSequence(flow.steps, { sampleRate: sr, volume, prepare: k.prepare, ...opts })
    return pack(buf, k.done())
  },
  /** The longest stretch the main thread was blocked while the master chain was built (a 4 ms watchdog timer measures the gap). mode: 'sync' (createMaster) | 'cold' (createMasterAsync with nothing prepared) | 'warm' (createMasterAsync after the idle prewarm: what a phone does on its first tap). */
  async blockProbe(mode, { sr = 48000 } = {}) {
    const ctx = new OfflineAudioContext(2, 4800, sr), sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    let last = performance.now(), worst = 0
    const timer = setInterval(() => { const n = performance.now(); worst = Math.max(worst, n - last - 4); last = n }, 4)
    if (mode === 'warm') while (!synth.prewarm(sr, 6)) await sleep(0)
    await sleep(40); worst = 0; last = performance.now()
    const t0 = performance.now()
    const slices = []
    if (mode === 'sync') synth.createMaster(ctx, { volume: 1 }); else await synth.createMasterAsync(ctx, { volume: 1, trace: (name, ms) => slices.push([name, +ms.toFixed(1)]) })
    const total = performance.now() - t0
    await sleep(30)
    clearInterval(timer)
    return { total, worst, slices }
  },
  /** A 1 kHz sine at `db` dBFS straight into the master: what the chain does to a level. Returns the RMS and peak (dBFS) of the steady part. */
  async masterGain(db, { sr = 48000, volume = 1 } = {}) {
    const ctx = new OfflineAudioContext(2, Math.round(sr * 1.2), sr)
    const master = synth.createMaster(ctx, { volume })
    const bus = master.bus(1, 'hero')
    const o = ctx.createOscillator(); o.frequency.value = 1000
    const g = ctx.createGain(); g.gain.value = 10 ** (db / 20)
    o.connect(g); g.connect(bus.dry); o.start(0); o.stop(1)
    const d = (await ctx.startRendering()).getChannelData(0)
    let s = 0, n = 0, pk = 0
    for (let i = Math.round(sr * .5); i < Math.round(sr * .9); i++) { s += d[i] * d[i]; n++; pk = Math.max(pk, Math.abs(d[i])) }
    return { rms: 20 * Math.log10(Math.max(Math.sqrt(s / n), 1e-9)), peak: 20 * Math.log10(Math.max(pk, 1e-9)) }
  },
}
