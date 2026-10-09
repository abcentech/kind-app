// emblem-kit — the shared workshop for every collectible in src/art (owner: art-emblems).
// Pure maths + a few SVG building blocks. Nothing here knows about a specific emblem.
//   colour : OKLCH <-> hex, so a tint from the series accent keeps its lightness when we derive a shadow thread from it
//   metal  : gradient profiles + a faux-conic "turned metal" disc (SVG has no conic gradient; 48 wedges does the job)
//   geom   : 0deg = 12 o'clock, clockwise (same convention as icons.jsx)
// Hex literals live here on purpose: they are illustration-internal shading, never UI chrome (contract s0.2).
import { useId } from 'react'

export const TAU = Math.PI * 2
export const rad = (d) => (d * Math.PI) / 180
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
export const lerp = (a, b, t) => a + (b - a) * t
export const r2 = (n) => Math.round(n * 100) / 100
export const r1 = (n) => Math.round(n * 10) / 10
export const cx = (...a) => a.filter(Boolean).join(' ')

/* ───────────────────────────── ids + randomness ───────────────────────────── */
// SVG gradient/pattern ids are document-global: two patches on one page must never share (or lose) each other's <defs>.
export const useUid = (prefix = 'e') => prefix + useId().replace(/[^a-zA-Z0-9]/g, '')

export function hash(s) {
  s = String(s)
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15
  return h >>> 0
}
export function mulberry32(seed) {
  let a = (seed | 0) + 0x6d2b79f5
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ───────────────────────────── colour (OKLab / OKLCH) ───────────────────────────── */
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

export function hex2rgb(hex) {
  let h = String(hex).replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((x) => x + x).join('')
  const n = parseInt(h.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export const rgb2hex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')

function rgb2lab([r, g, b]) {
  const lr = toLin(r / 255), lg = toLin(g / 255), lb = toLin(b / 255)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}
function lab2lin([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}
const inGamut = (v) => v.every((c) => c >= -0.0005 && c <= 1.0005)

/** oklch(L 0..1, C ~0..0.37, h degrees) -> '#rrggbb', chroma reduced until it fits sRGB */
export function oklch(L, C, h) {
  const hr = rad(h)
  let c = C
  let lin = lab2lin([L, c * Math.cos(hr), c * Math.sin(hr)])
  for (let i = 0; i < 14 && !inGamut(lin); i++) {
    c *= 0.88
    lin = lab2lin([L, c * Math.cos(hr), c * Math.sin(hr)])
  }
  return rgb2hex(lin.map((v) => toSrgb(clamp(v, 0, 1)) * 255))
}
export function toLch(hex) {
  const [L, a, b] = rgb2lab(hex2rgb(hex))
  return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360]
}
/** set any of lightness / chroma / hue on a colour; `cs` scales its chroma instead of replacing it */
export function tone(hex, { l, c, h, cs = 1, dl = 0 } = {}) {
  const [L, C, H] = toLch(hex)
  return oklch(clamp((l ?? L) + dl, 0, 1), (c ?? C) * cs, h ?? H)
}
/** mix in OKLab: perceptually even, no muddy midpoints */
export function mix(a, b, t) {
  const A = rgb2lab(hex2rgb(a)), B = rgb2lab(hex2rgb(b))
  const lin = lab2lin([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)])
  return rgb2hex(lin.map((v) => toSrgb(clamp(v, 0, 1)) * 255))
}
export const rgba = (hex, a) => { const [r, g, b] = hex2rgb(hex); return `rgba(${r},${g},${b},${r1(a * 100) / 100})` }

/* ───────────────────────────── geometry ───────────────────────────── */
export const pt = (cx0, cy0, r, a) => [cx0 + r * Math.sin(rad(a)), cy0 - r * Math.cos(rad(a))]
export const P = ([x, y]) => `${r2(x)} ${r2(y)}`
export const poly = (pts, close = true) => 'M' + pts.map(P).join('L') + (close ? 'z' : '')
export const ngon = (cx0, cy0, r, n, rot = 0) => poly(Array.from({ length: n }, (_, i) => pt(cx0, cy0, r, rot + (i * 360) / n)))
export const circ = (cx0, cy0, r) => `M${r2(cx0 - r)} ${r2(cy0)}a${r2(r)} ${r2(r)} 0 1 0 ${r2(r * 2)} 0a${r2(r)} ${r2(r)} 0 1 0 ${r2(-r * 2)} 0z`
export const arcp = (cx0, cy0, r, a0, a1, move = true) =>
  `${move ? 'M' + P(pt(cx0, cy0, r, a0)) : 'L' + P(pt(cx0, cy0, r, a0))}A${r2(r)} ${r2(r)} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${P(pt(cx0, cy0, r, a1))}`
/** annular sector, clockwise from a0 to a1; r0 = 0 gives a pie slice */
export function sector(cx0, cy0, r0, r1, a0, a1) {
  const big = Math.abs(a1 - a0) > 180 ? 1 : 0
  const o0 = pt(cx0, cy0, r1, a0), o1 = pt(cx0, cy0, r1, a1)
  if (r0 <= 0) return `M${r2(cx0)} ${r2(cy0)}L${P(o0)}A${r2(r1)} ${r2(r1)} 0 ${big} 1 ${P(o1)}z`
  const i0 = pt(cx0, cy0, r0, a0), i1 = pt(cx0, cy0, r0, a1)
  return `M${P(o0)}A${r2(r1)} ${r2(r1)} 0 ${big} 1 ${P(o1)}L${P(i1)}A${r2(r0)} ${r2(r0)} 0 ${big} 0 ${P(i0)}z`
}
export const rrect = (x, y, w, h, r = 0) => {
  r = Math.min(r, w / 2, h / 2)
  return `M${r2(x + r)} ${r2(y)}H${r2(x + w - r)}A${r} ${r} 0 0 1 ${r2(x + w)} ${r2(y + r)}V${r2(y + h - r)}A${r} ${r} 0 0 1 ${r2(x + w - r)} ${r2(y + h)}H${r2(x + r)}A${r} ${r} 0 0 1 ${r2(x)} ${r2(y + h - r)}V${r2(y + r)}A${r} ${r} 0 0 1 ${r2(x + r)} ${r2(y)}z`
}
export const star = (cx0, cy0, R, r, n = 5, rot = 0) =>
  poly(Array.from({ length: n * 2 }, (_, i) => pt(cx0, cy0, i % 2 ? r : R, rot + (i * 180) / n)))
/** four-point sparkle (concave diamond) */
export const spark4 = (cx0, cy0, R, r = R * 0.28) => star(cx0, cy0, R, r, 4, 0)
/** Catmull-Rom through points -> cubic Bezier path (closed or open) */
export function smooth(pts, closed = false, k = 0.5) {
  const n = pts.length
  if (n < 3) return poly(pts, closed)
  const g = (i) => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)]
  let d = 'M' + P(pts[0])
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2)
    const c1 = [p1[0] + ((p2[0] - p0[0]) * k) / 3, p1[1] + ((p2[1] - p0[1]) * k) / 3]
    const c2 = [p2[0] - ((p3[0] - p1[0]) * k) / 3, p2[1] - ((p3[1] - p1[1]) * k) / 3]
    d += `C${P(c1)} ${P(c2)} ${P(p2)}`
  }
  return d + (closed ? 'z' : '')
}
/** Offset a convex, clockwise (screen) polygon inward by d: the new vertices are the intersections of the shifted edges. */
export function insetPoly(pts, d) {
  const n = pts.length
  const lines = pts.map((a, i) => {
    const b = pts[(i + 1) % n]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len
    return { px: a[0] - ty * d, py: a[1] + tx * d, tx, ty }
  })
  return pts.map((_, i) => {
    const l1 = lines[(i + n - 1) % n], l2 = lines[i]
    const den = l1.tx * l2.ty - l1.ty * l2.tx
    if (Math.abs(den) < 1e-9) return [l2.px, l2.py]
    const t = ((l2.px - l1.px) * l2.ty - (l2.py - l1.py) * l2.tx) / den
    return [l1.px + l1.tx * t, l1.py + l1.ty * t]
  })
}
/** mirror a list of x coordinates about x=50 inside a path written with absolute commands: caller supplies both halves */
export const mirrorX = (x, axis = 50) => axis * 2 - x

/* ───────────────────────────── metals ───────────────────────────── */
// Each metal is a 6-step ramp, darkest -> brightest (index 5 is the specular kiss). The same ramp drives
// linear gradients (chrome: bright / dark / bright bands) and the conic "turned metal" wedges.
export const METALS = {
  gold:   { ramp: ['#4a2e05', '#8a5a0e', '#c48a1c', '#e8b64a', '#f7d98a', '#fffbe8'], edge: '#fff4c9', deep: '#3a2204' },
  silver: { ramp: ['#2b303e', '#555d72', '#8e97ad', '#bcc4d6', '#e3e8f3', '#ffffff'], edge: '#f4f7ff', deep: '#1c202b' },
  bronze: { ramp: ['#2e1708', '#6b3a1a', '#a35f2e', '#cf8a52', '#ecb98a', '#ffe7cf'], edge: '#ffd9b3', deep: '#220f04' },
  ti:     { ramp: ['#10131c', '#262c3c', '#4a5268', '#7e879d', '#b9c1d3', '#eef2fb'], edge: '#cfe9ff', deep: '#090b12' },
  steel:  { ramp: ['#1b1f2b', '#363c4e', '#5c657c', '#8993a9', '#b7bfd0', '#e2e7f2'], edge: '#d7deec', deep: '#12141d' },
}
export const metalOf = (m) => METALS[m] || METALS.ti

/** sample the ramp at t in 0..1 */
export function ramp(metal, t) {
  const r = metalOf(metal).ramp
  const x = clamp(t) * (r.length - 1)
  const i = Math.min(r.length - 2, Math.floor(x))
  return mix(r[i], r[i + 1], x - i)
}
/** chrome profile for linear gradients: order of ramp indices from the lit end to the shadow end and back */
const CHROME = [[0, 4], [0.16, 5], [0.34, 3], [0.52, 1], [0.68, 2], [0.86, 4], [1, 3]]
const SOFT = [[0, 5], [0.3, 4], [0.62, 2], [1, 1]]
export function MetalGrad({ id, metal = 'gold', x1 = 0, y1 = 0, x2 = 1, y2 = 1, profile = 'chrome', units, children }) {
  const m = metalOf(metal)
  const stops = profile === 'soft' ? SOFT : CHROME
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits={units}>
      {stops.map(([o, i]) => <stop key={o} offset={o} stopColor={m.ramp[i]} />)}
      {children}
    </linearGradient>
  )
}

/** Faux conic gradient: n opaque wedges, each overlapping the next by a hair so no seam ever shows.
 *  `lobes` bright/dark pairs around the circle (2 = classic turned-metal disc); `rot` swings the highlights. */
export function Conic({ cx: x = 0, cy: y = 0, r0 = 0, r1, metal = 'ti', n = 48, lobes = 2, rot = -45, lo = 0.08, hi = 0.96, gamma = 1.4 }) {
  const wedges = []
  const step = 360 / n
  for (let i = 0; i < n; i++) {
    const a0 = i * step, a1 = a0 + step + 0.6
    const mid = a0 + step / 2
    // triangle wave in angle -> 0 (shadow) .. 1 (specular), shaped so the highlight is narrow and the shadow broad
    const u = (((mid - rot) * lobes) / 360) % 1
    const tri = 1 - Math.abs(((u + 1) % 1) * 2 - 1)
    const t = lo + (hi - lo) * tri ** gamma
    wedges.push(<path key={i} d={sector(x, y, r0, r1, a0, a1)} fill={ramp(metal, t)} />)
  }
  return <g shapeRendering="geometricPrecision">{wedges}</g>
}

/* ───────────────────────────── small shared parts ───────────────────────────── */
/** A soft ground shadow: radial gradient, never a filter (cheap on a Moto-G, identical everywhere) */
export function GroundShadow({ id, cx: x, cy: y, rx, ry, a = 0.55 }) {
  return (
    <>
      <radialGradient id={id}>
        <stop offset="0" stopColor="#000" stopOpacity={a} />
        <stop offset=".55" stopColor="#000" stopOpacity={a * 0.45} />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${id})`} />
    </>
  )
}

/** the one place that decides how big an emblem is drawn */
export function dims(size, aspect, width, height) {
  // `size` = the long side; aspect = width / height of the artwork
  let w, h
  if (width != null && height != null) { w = width; h = height }
  else if (width != null) { w = width; h = typeof width === 'number' ? width / aspect : undefined }
  else if (height != null) { h = height; w = typeof height === 'number' ? height * aspect : undefined }
  else if (aspect >= 1) { w = size; h = typeof size === 'number' ? size / aspect : undefined }
  else { h = size; w = typeof size === 'number' ? size * aspect : undefined }
  return { w, h }
}
