// Starfield — layered CSS stars. No canvas, no SVG filter, no JS after first render:
// every star is one radial-gradient layer positioned in % inside a small tile, so a full sky is four
// composited elements. Three depth layers (far/mid/near) + a handful of diffraction-spike stars,
// a faint "galactic band" of dust, and (full fx only) a few independently twinkling stars.
//
// This file also hosts the two helpers every scene shares (art-scenes may not add files):
//   mulberry32(seed) → () => [0,1)      useUid(prefix)  → a DOM-id-safe unique string per component instance
import { useId, useMemo } from 'react'

export function mulberry32(seed) {
  let a = (seed | 0) + 0x6d2b79f5
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// SVG gradient ids are document-global; two Rockets on one page must not share (or lose) each other's <defs>.
export const useUid = (prefix = 'k') => prefix + useId().replace(/[^a-zA-Z0-9]/g, '')
export const cx = (...a) => a.filter(Boolean).join(' ')

// Aspect assumption for spacing only (portrait phone): keeps stars visually evenly spaced in px, not in %.
const ASPECT = 0.55

function scatter(rnd, n, minDist, pts, bandFn) {
  const out = []
  let guard = 0
  while (out.length < n && guard++ < n * 40) {
    let x, y
    if (bandFn) [x, y] = bandFn(rnd)
    else { x = rnd(); y = rnd() }
    if (x < 0.01 || x > 0.99 || y < 0.01 || y > 0.99) continue
    let ok = true
    for (const p of pts) {
      const dx = (p[0] - x) * ASPECT, dy = p[1] - y
      if (dx * dx + dy * dy < minDist * minDist) { ok = false; break }
    }
    if (ok) { out.push([x, y]); pts.push([x, y]) }
  }
  return out
}

const pct = (v) => (v * 100).toFixed(2) + '%'
// One star = one gradient layer. `tile` is the px box the star is drawn in; position is container-relative %.
const dot = (x, y, color, r, tile, soft = 0.7) =>
  `radial-gradient(circle, ${color} 0 ${r}px, transparent ${(r + soft).toFixed(2)}px) ${pct(x)} ${pct(y)} / ${tile}px ${tile}px no-repeat`

function pickColor(rnd, tiers, warmChance, coolChance) {
  const r = rnd()
  if (r < warmChance) return 'var(--st-w)'
  if (r < warmChance + coolChance) return 'var(--st-k)'
  return tiers[Math.floor(rnd() * rnd() * tiers.length)]   // squared bias → mostly the dim tiers
}

export function buildSky({ density = 1, seed = 1 }) {
  const rnd = mulberry32(seed * 9973 + 17)
  const used = []
  const d = Math.max(0.2, density)

  // Galactic band: stars clustered around a diagonal, gaussian-ish spread. Reads as depth, not as a pattern.
  // x + y = const in normalised space = the CSS haze's "to bottom right" iso-line, at any aspect ratio.
  const band = (r) => {
    const t = r()
    const g = (r() + r() + r() - 1.5) * 0.17
    const x = t, y = 0.92 - t + g
    return [x, y]
  }
  const dust = scatter(rnd, Math.round(34 * d), 0.012, used, band)
  const far = scatter(rnd, Math.round(64 * d), 0.026, used)
  const mid = scatter(rnd, Math.round(30 * d), 0.05, used)
  const near = scatter(rnd, Math.round(11 * d), 0.1, used)
  const bright = scatter(rnd, Math.max(2, Math.round(4.5 * Math.min(d, 1.6))), 0.2, used)
  const twinkle = scatter(rnd, Math.round(11 * Math.min(d, 1.5)), 0.08, used)

  const farTiers = ['var(--st-c)', 'var(--st-c)', 'var(--st-d)', 'var(--st-b)']
  const midTiers = ['var(--st-b)', 'var(--st-c)', 'var(--st-a)']
  const nearTiers = ['var(--st-a)', 'var(--st-b)']

  const farBg = [
    ...dust.map(([x, y]) => dot(x, y, 'var(--st-d)', 0.45, 3, 0.55)),
    ...far.map(([x, y]) => dot(x, y, pickColor(rnd, farTiers, 0.06, 0.1), 0.5 + rnd() * 0.25, 3, 0.6)),
  ]
  const midBg = mid.map(([x, y]) => dot(x, y, pickColor(rnd, midTiers, 0.1, 0.12), 0.7 + rnd() * 0.3, 4, 0.7))
  const nearBg = near.map(([x, y]) => dot(x, y, pickColor(rnd, nearTiers, 0.18, 0.18), 1 + rnd() * 0.45, 7, 1.1))

  // Bright stars: hot core + soft bloom + a thin horizontal/vertical diffraction cross, all in one 28px tile
  // (same tile for every layer of a star, so the pieces stay concentric).
  const spikeBg = []
  for (const [x, y] of bright) {
    const warm = rnd() < 0.4
    const c = warm ? 'var(--st-w)' : rnd() < 0.5 ? 'var(--st-a)' : 'var(--st-k)'
    const T = 28
    const p = `${pct(x)} ${pct(y)} / ${T}px ${T}px no-repeat`
    spikeBg.push(
      `radial-gradient(circle, ${c} 0 1.3px, transparent 2px) ${p}`,
      `radial-gradient(circle, var(--st-bloom) 0, transparent 9px) ${p}`,
      `radial-gradient(ellipse 13px .55px, ${c}, transparent) ${p}`,
      `radial-gradient(ellipse .55px 13px, ${c}, transparent) ${p}`,
    )
  }
  const tw = twinkle.map(([x, y], i) => ({
    x: pct(x), y: pct(y),
    d: (rnd() * 6).toFixed(2) + 's', t: (2.6 + rnd() * 3.4).toFixed(2) + 's',
    c: i % 5 === 0 ? 'var(--st-w)' : i % 4 === 0 ? 'var(--st-k)' : 'var(--st-a)',
    s: 2 + rnd() * 1.6,
  }))
  return { far: farBg.join(','), mid: midBg.join(','), near: nearBg.join(','), spikes: spikeBg.join(','), tw }
}

// two shooting stars on long, unequal cycles (so they never read as a loop); positions are % of the sky
const METEORS = [
  { x: '64%', y: '12%', a: '28deg', t: '19s', d: '4s' },
  { x: '38%', y: '30%', a: '34deg', t: '27s', d: '15s' },
]

export default function Starfield({
  density = 1, seed = 1, twinkle = false, parallax = false, band = true, meteors = false, fade, size, width, height, className, style, ...rest
}) {
  const sky = useMemo(() => buildSky({ density, seed }), [density, seed])
  const sized = size || width || height
  return (
    <div
      className={cx('art-stars', className)}
      data-parallax={parallax ? '' : undefined}
      data-twinkle={twinkle ? '' : undefined}
      data-band={band ? '' : undefined}
      data-fade={fade || undefined}
      data-sized={sized ? '' : undefined}
      style={{ width: width ?? size, height: height ?? size, ...style }}
      aria-hidden="true"
      {...rest}
    >
      {band && <i className="art-stars__haze" />}
      <i className="art-stars__l art-stars__l--far" style={{ background: sky.far }} />
      <i className="art-stars__l art-stars__l--mid" style={{ background: sky.mid }} />
      <i className="art-stars__l art-stars__l--near" style={{ background: sky.near + (sky.near && sky.spikes ? ',' : '') + sky.spikes }} />
      {meteors && (
        <span className="art-stars__met">
          {METEORS.map((m, i) => <i key={i} style={{ '--x': m.x, '--y': m.y, '--a': m.a, '--t': m.t, '--d': m.d }} />)}
        </span>
      )}
      {twinkle && (
        <span className="art-stars__tw">
          {sky.tw.map((s, i) => (
            <i key={i} style={{ left: s.x, top: s.y, width: s.s, height: s.s, '--d': s.d, '--t': s.t, '--c': s.c }} />
          ))}
        </span>
      )}
    </div>
  )
}
