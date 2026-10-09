// CodeCardArt — the back of a very expensive card. Generative engraving seeded by `day`.
//   <CodeCardArt day={12} hue={200} w={150} h={210} />        printed: iris-inked fine line on tinted stock
//   <CodeCardArt day={8} rare />                               gold hot-foil: the same plate, struck in foil that follows --gx / --gy
//
// The plate is built the way a banknote is:
//   guilloche rosettes   hypotrochoid curves, one path <use>d at 14-26 rotations so the moire does the drawing
//   topographic lines    value noise -> marching squares -> chained, smoothed contours (the "ascent" of the series)
//   hex lattice          a fine honeycomb that fades out under a mask
//   wave bands           interleaved sine lines with drifting phase (the lower field)
//   frame                chamfered TL + BR (the Lamborghini cut, matching --clip-cut), a two-wave guilloche border, microtext
//   medallion            the day, set in Barlow outlines and hatched like an engraved numeral
// Everything is plain markup generated once per (day, hue, rare) and cached; ids carry a per-instance token so
// many cards share a page. Rare cards also render the plate as a CSS mask over a conic-gradient layer, so the foil lives only
// on the printed lines and slides with the tilt vars (--gx --gy as %, --tilt-on 0..1) set by usePointerTilt on any ancestor.
import { memo, useMemo } from 'react'
import { clamp, cx, hash, mulberry32, oklch, pt, r1, toLch, TAU, useUid } from './emblem-kit.jsx'
import { typeset } from './emblem-type.js'

const W = 300, H = 420, CUT = 26, SEP = '§'

/* ───────────────────────────── noise + contours ───────────────────────────── */
// A smooth curve through points with one quadratic per vertex (control = the vertex, end = the midpoint to the next):
// as round as Catmull-Rom for a fraction of the bytes.
const q1 = (p) => `${r1(p[0])} ${r1(p[1])}`
function qsmooth(p, closed) {
  const n = p.length
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  if (closed) {
    let d = 'M' + q1(mid(p[n - 1], p[0]))
    for (let i = 0; i < n; i++) d += `Q${q1(p[i])} ${q1(mid(p[i], p[(i + 1) % n]))}`
    return d + 'z'
  }
  let d = 'M' + q1(p[0])
  for (let i = 1; i < n - 1; i++) d += `Q${q1(p[i])} ${q1(mid(p[i], p[i + 1]))}`
  return d + 'L' + q1(p[n - 1])
}
function noise2(rnd) {
  const N = 32, g = Float32Array.from({ length: N * N }, rnd)
  const at = (x, y) => g[(y & (N - 1)) * N + (x & (N - 1))]
  const sm = (t) => t * t * (3 - 2 * t)
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi)
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1)
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf
  }
}
// segment table for marching squares; corners tl=8 tr=4 br=2 bl=1 (bit set = above the level). T top, R right, B bottom, L left
const SEG = { 1: [['L', 'B']], 2: [['B', 'R']], 3: [['L', 'R']], 4: [['T', 'R']], 6: [['T', 'B']], 7: [['T', 'L']], 8: [['T', 'L']], 9: [['T', 'B']], 11: [['T', 'R']], 12: [['L', 'R']], 13: [['R', 'B']], 14: [['L', 'B']] }

function contours(f, gw, gh, cell, levels) {
  const out = []
  const val = (i, j) => f[j * (gw + 1) + i]
  for (const L of levels) {
    const pts = new Map(), segs = []
    const key = (k, i, j) => {
      const id = k + i + '_' + j
      if (!pts.has(id)) {
        if (k === 'h') { const a = val(i, j), b = val(i + 1, j); pts.set(id, [(i + (L - a) / (b - a)) * cell, j * cell]) }
        else { const a = val(i, j), b = val(i, j + 1); pts.set(id, [i * cell, (j + (L - a) / (b - a)) * cell]) }
      }
      return id
    }
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const tl = val(i, j) > L, tr = val(i + 1, j) > L, br = val(i + 1, j + 1) > L, bl = val(i, j + 1) > L
      const idx = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0)
      if (idx === 0 || idx === 15) continue
      const e = { T: () => key('h', i, j), R: () => key('v', i + 1, j), B: () => key('h', i, j + 1), L: () => key('v', i, j) }
      let list = SEG[idx]
      if (idx === 5 || idx === 10) {
        const mid = (val(i, j) + val(i + 1, j) + val(i + 1, j + 1) + val(i, j + 1)) / 4 > L
        list = idx === 5 ? (mid ? [['T', 'L'], ['B', 'R']] : [['T', 'R'], ['L', 'B']]) : (mid ? [['T', 'R'], ['L', 'B']] : [['T', 'L'], ['B', 'R']])
      }
      for (const [a, b] of list) segs.push([e[a](), e[b]()])
    }
    const adj = new Map()
    segs.forEach(([a, b], s) => { (adj.get(a) || adj.set(a, []).get(a)).push(s); (adj.get(b) || adj.set(b, []).get(b)).push(s) })
    const used = new Uint8Array(segs.length)
    const walk = (startKey, fromSeg) => {
      const chain = []
      let k = startKey, prev = fromSeg
      for (;;) {
        const nxt = (adj.get(k) || []).find((s) => s !== prev && !used[s])
        if (nxt === undefined) break
        used[nxt] = 1
        const [a, b] = segs[nxt]
        k = a === k ? b : a
        chain.push(k)
        prev = nxt
      }
      return chain
    }
    for (let s = 0; s < segs.length; s++) {
      if (used[s]) continue
      used[s] = 1
      const [a, b] = segs[s]
      const fwd = walk(b, s), back = walk(a, s)
      const keys = [...back.reverse(), a, b, ...fwd]
      if (keys.length < 4) continue
      const closed = keys[0] === keys[keys.length - 1]
      const p = keys.map((k) => pts.get(k))
      out.push(qsmooth(closed ? p.slice(0, -1) : p, closed))
    }
  }
  return out
}

/* ───────────────────────────── guilloche ───────────────────────────── */
const curve = (cx0, cy0, A, B, m, n = 300) => {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * TAU
    d += `${i ? 'L' : 'M'}${r1(cx0 + A * Math.cos(t) + B * Math.cos(m * t))} ${r1(cy0 + A * Math.sin(t) - B * Math.sin(m * t))}`
  }
  return d + 'z'
}
const frameOf = (i, c = CUT) => [[i + c, i], [W - i, i], [W - i, H - i - c], [W - i - c, H - i], [i, H - i], [i, i + c]]
const polyD = (p) => 'M' + p.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L') + 'z'
// a sine ribbon running along a closed polygon, `off` px inside it
function waveAlong(poly, off, amp, lambda, phase, step = 4.2) {
  const pts = []
  let s = 0
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k], b = poly[(k + 1) % poly.length]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len
    for (let t = 0; t < len; t += step, s += step) {
      const o = off + amp * Math.sin((s / lambda) * TAU + phase)
      pts.push([a[0] + tx * t - ty * o, a[1] + ty * t + tx * o])
    }
  }
  return 'M' + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L') + 'z'
}
function waveBand(y0, lines, amp, lambda, phase, drift, x0 = 22, x1 = W - 22) {
  const paths = []
  for (let l = 0; l < lines; l++) {
    const pts = []
    for (let x = x0; x <= x1 + 0.1; x += 7.5) {
      const ph = phase + l * drift
      pts.push([x, y0 + l * 2.4 + amp * (0.55 + l / lines) * Math.sin((x / lambda) * TAU + ph) + amp * 0.35 * Math.sin((x / (lambda * 0.43)) * TAU + ph * 1.7)])
    }
    paths.push(qsmooth(pts, false))
  }
  return paths
}

/* ───────────────────────────── the plate ───────────────────────────── */
// colour sets: `view` paints, `mask` is alpha only (foil lives where ink is)
function inks(hue, rare) {
  if (rare) return { bg0: '#16100a', bg1: '#080604', disc: '#1c140a', g: ['#fff1c0', '#e8b64a', '#c48a1c', '#fbe6a8', '#d9a238'], lo: '#8f6a22', mid: '#c8963a', hi: '#fbe6a8' }
  return {
    bg0: oklch(0.2, 0.05, hue), bg1: oklch(0.11, 0.04, hue + 12), disc: oklch(0.15, 0.045, hue + 6),
    g: [oklch(0.84, 0.1, hue - 30), oklch(0.8, 0.13, hue), oklch(0.84, 0.11, hue + 34), oklch(0.78, 0.12, hue + 6), oklch(0.82, 0.1, hue - 14)],
    lo: oklch(0.46, 0.08, hue), mid: oklch(0.64, 0.1, hue), hi: oklch(0.86, 0.09, hue),
  }
}

const cache = new Map()
function plate(day, hue, rare, label) {
  const key = `${day}|${Math.round(hue)}|${rare ? 1 : 0}|${label}`
  if (cache.has(key)) return cache.get(key)
  const rnd = mulberry32(hash('card' + day))
  const k = inks(hue, rare)
  const pick = (a) => a[Math.floor(rnd() * a.length)]

  // seeded parameters: every day is a different plate in the same family
  const m1 = pick([5, 6, 7, 8, 9]), m2 = m1 + pick([2, 3, 4]), m3 = pick([36, 42, 48, 54, 60])
  const A1 = 74 + rnd() * 4, B1 = 19 + rnd() * 5, copies1 = pick([16, 20, 24])
  const B2 = 9 + rnd() * 5
  const hexR = pick([7, 8.5, 10]), hexRot = pick([0, 0, 30]), waveL = 90 + rnd() * 90, wavePh = rnd() * TAU
  const gx = 32, gy = 45, cell = 9.4
  const nA = noise2(rnd), nB = noise2(rnd), ox = rnd() * 9, oy = rnd() * 9
  const bumps = Array.from({ length: 3 }, () => [rnd() * gx, rnd() * gy, 6 + rnd() * 8, 0.35 + rnd() * 0.4])
  const field = new Float32Array((gx + 1) * (gy + 1))
  for (let j = 0; j <= gy; j++) for (let i = 0; i <= gx; i++) {
    let v = nA(i * 0.12 + ox, j * 0.12 + oy) * 0.62 + nB(i * 0.27 + oy, j * 0.27 + ox) * 0.3
    for (const [bx, by, br, bh] of bumps) v += bh * Math.exp(-(((i - bx) ** 2 + (j - by) ** 2) / (2 * br * br)))
    field[j * (gx + 1) + i] = v
  }
  let lo = Infinity, hi = -Infinity
  field.forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v) })
  const levels = Array.from({ length: 9 }, (_, i) => lo + ((hi - lo) * (i + 1.5)) / 10.8)
  const topo = contours(field, gx, gy, cell, levels)

  const CXX = W / 2, CYY = 188
  const f1 = polyD(frameOf(10)), f2 = polyD(frameOf(18)), f3 = polyD(frameOf(21.5, CUT - 2))
  const waveA = waveAlong(frameOf(13.6), 0, 2.2, 16.8, 0), waveB = waveAlong(frameOf(13.6), 0, 2.2, 16.8, Math.PI)
  const bands = [...waveBand(304, 12, 6, waveL, wavePh, 0.18), ...waveBand(342, 7, 4, waveL * 0.8, wavePh + 1.2, 0.22)]
  const num = String(day)
  const nSize = num.length > 1 ? 80 : 98
  const numD = typeset(num, CXX, CYY + nSize * 0.35, nSize, { tracking: -2 }).d
  const dayD = typeset('DAY', CXX, CYY - 37, 10.5, { tracking: 26 }).d
  const serialD = typeset('NO.', 52, H - 32, 10, { tracking: 8, anchor: 'start' }).d + typeset(String(day).padStart(4, '0'), 79, H - 32, 10, { tracking: 14, anchor: 'start' }).d
  const kindD = typeset('KIND', W - 52, H - 32, 10, { tracking: 26, anchor: 'end' }).d
  const radial = (() => { let d = ''; for (let i = 0; i < 144; i++) { const a = i * 2.5, long = i % 6 === 0; d += `M${pt(CXX, CYY, 107, a).map(r1).join(' ')}L${pt(CXX, CYY, long ? 116 : 112, a).map(r1).join(' ')}` } return d })()
  const ticks = (() => { let d = ''; for (let i = 0; i < 90; i++) { const a = i * 4; d += `M${pt(CXX, CYY, 53.6, a).map(r1).join(' ')}L${pt(CXX, CYY, i % 5 ? 56 : 58, a).map(r1).join(' ')}` } return d })()
  const hex = (cxx, cyy, r) => { let d = ''; for (let i = 0; i < 6; i++) d += `${i ? 'L' : 'M'}${pt(cxx, cyy, r, 30 + i * 60).map(r1).join(' ')}`; return d + 'z' }
  const sparkAt = (x, y, R) => `M${x} ${y - R}L${x + R * 0.22} ${y - R * 0.22}L${x + R} ${y}L${x + R * 0.22} ${y + R * 0.22}L${x} ${y + R}L${x - R * 0.22} ${y + R * 0.22}L${x - R} ${y}L${x - R * 0.22} ${y - R * 0.22}z`

  const hw = hexR * 3, hh = hexR * Math.sqrt(3)
  const hexTile = `M0 ${hh / 2}L${hexR / 2} 0H${hexR * 1.5}L${hexR * 2} ${hh / 2}L${hexR * 1.5} ${hh}H${hexR / 2}zM${hexR * 2} ${hh / 2}H${hw}M${hexR * 1.5} 0L${hexR * 2} ${-hh / 2}M${hexR * 1.5} ${hh}L${hexR * 2} ${hh * 1.5}`

  // `S` selects how a stroke is painted in each rendering (view = inks, mask = opaque ink-on-nothing)
  const build = (view) => {
    const st = (kind, w, op = 1, extra = '') => {
      const c = view ? (kind === 'lo' ? k.lo : kind === 'mid' ? k.mid : kind === 'hi' ? k.hi : `url(#${SEP}i)`) : '#fff'
      const o = view ? op : op * (kind === 'lo' ? 0.5 : kind === 'mid' ? 0.75 : 1)
      return `fill="none" stroke="${c}" stroke-width="${w}" stroke-opacity="${r1(o * 100) / 100}" stroke-linejoin="round" stroke-linecap="round" ${extra}`
    }
    const defs = `<defs>
      ${view ? `<linearGradient id="${SEP}bg" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${k.bg0}"/><stop offset="1" stop-color="${k.bg1}"/></linearGradient>
      <linearGradient id="${SEP}i" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="${H}">${k.g.map((c, i) => `<stop offset="${i / (k.g.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>
      <radialGradient id="${SEP}vg" cx="50%" cy="44%" r="75%"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
      <pattern id="${SEP}fl" width="3" height="2.4" patternUnits="userSpaceOnUse"><path d="M0 1.2H3" stroke="${k.mid}" stroke-width=".3" opacity=".16"/></pattern>` : ''}
      <pattern id="${SEP}hx" width="${r1(hw)}" height="${r1(hh)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${hexRot} ${CXX} ${CYY})"><path d="${hexTile}" fill="none" stroke="${view ? k.mid : '#fff'}" stroke-width=".32"/></pattern>
      <pattern id="${SEP}ht" width="1.5" height="1.5" patternUnits="userSpaceOnUse" patternTransform="rotate(52)"><rect width="1.5" height=".92" fill="${view ? k.hi : '#fff'}"/></pattern>
      <radialGradient id="${SEP}hm" cx="${CXX}" cy="${CYY}" r="210" gradientUnits="userSpaceOnUse"><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".72" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></radialGradient>
      <mask id="${SEP}hk"><rect width="${W}" height="${H}" fill="url(#${SEP}hm)"/></mask>
      <clipPath id="${SEP}cl"><path d="${f2}"/></clipPath>
      <path id="${SEP}r1" d="${curve(CXX, CYY, A1, B1, m1, clamp(30 * (m1 + 1), 180, 300))}"/>
      <path id="${SEP}r2" d="${curve(CXX, CYY, A1, B2, m2, clamp(30 * (m2 + 1), 200, 340))}"/>
      <path id="${SEP}r3" d="${curve(CXX, CYY, 101.5, 2.4, m3, m3 * 7)}"/>
      <path id="${SEP}r4" d="${curve(0, 0, 9.5, 4.2, 6, 110)}"/>
      <path id="${SEP}mt" d="${polyD(frameOf(16.2, CUT - 1))}"/>
    </defs>`
    const uses = (id, n, step, w, kind, op) => `<g ${st(kind, w, op)}>${Array.from({ length: n }, (_, i) => `<use href="#${SEP}${id}" transform="rotate(${r1(i * step)} ${CXX} ${CYY})"/>`).join('')}</g>`
    return `${defs}
      ${view ? `<rect width="${W}" height="${H}" fill="url(#${SEP}bg)"/><rect width="${W}" height="${H}" fill="url(#${SEP}fl)"/>` : ''}
      ${view ? `<g clip-path="url(#${SEP}cl)">
        <path d="${topo.join('')}" ${st('lo', 0.42, 0.85)}/>
        <rect x="0" y="0" width="${W}" height="${H}" fill="url(#${SEP}hx)" mask="url(#${SEP}hk)" opacity=".8"/>
        <path d="${bands.join('')}" ${st('mid', 0.34, 0.9)}/>
      </g>` : ''}
      ${view ? `<circle cx="${CXX}" cy="${CYY}" r="106" fill="${k.disc}" opacity=".5"/>` : ''}
      ${uses('r2', 12, 360 / (m2 + 1) / 12, 0.26, 'mid', 0.85)}
      ${uses('r1', copies1, 360 / (m1 + 1) / copies1, 0.3, 'hi', 0.95)}
      <use href="#${SEP}r3" ${st('hi', 0.4, 0.95)}/>
      <circle cx="${CXX}" cy="${CYY}" r="105" ${st('hi', 0.5)}/><circle cx="${CXX}" cy="${CYY}" r="97.5" ${st('lo', 0.25, 0.8)}/><circle cx="${CXX}" cy="${CYY}" r="51" ${st('lo', 0.25, 0.8)}/>
      <path d="${radial}" ${st('mid', 0.4, 0.9)}/>
      ${view ? `<circle cx="${CXX}" cy="${CYY}" r="52" fill="${k.disc}"/>` : ''}
      <circle cx="${CXX}" cy="${CYY}" r="52.5" ${st('hi', 0.9)}/><circle cx="${CXX}" cy="${CYY}" r="49.8" ${st('mid', 0.35)}/>
      <path d="${ticks}" ${st('mid', 0.4)}/>
      <path d="${hex(CXX, CYY, 44)}" ${st('mid', 0.45)} transform="rotate(30 ${CXX} ${CYY})"/>
      <path d="${numD}" fill="url(#${SEP}ht)"/>
      <path d="${numD}" ${st('hi', 0.7, 1)}/>
      <path d="${dayD}" fill="${view ? k.hi : '#fff'}" opacity=".9"/>
      <path d="${f1}" ${st('hi', 0.9)}/><path d="${f2}" ${st('hi', 0.5)}/><path d="${f3}" ${st('lo', 0.35)}/>
      <path d="${waveA}" ${st('mid', 0.38, 0.95)}/><path d="${waveB}" ${st('mid', 0.38, 0.95)}/>
      <path d="${hex(W - 33, 33, 9.5)}" ${st('mid', 0.4)}/><path d="${hex(33, H - 33, 9.5)}" ${st('mid', 0.4)}/>
      <g ${st('hi', 0.3, 0.9)}>${[[W - 33, 33], [33, H - 33]].map(([x, y]) => [0, 1, 2, 3, 4, 5].map((i) => `<use href="#${SEP}r4" transform="translate(${x} ${y}) rotate(${i * 10})"/>`).join('')).join('')}</g>
      <path d="${sparkAt(CUT * 0.5 + 12, CUT * 0.5 + 12, 3.2)}${sparkAt(W - CUT * 0.5 - 12, H - CUT * 0.5 - 12, 3.2)}" fill="${view ? k.hi : '#fff'}"/>
      <path d="${serialD}${kindD}" fill="${view ? k.hi : '#fff'}" opacity=".85"/>
      ${view ? `<text font-family="'Barlow Condensed','Arial Narrow',sans-serif" font-weight="600" font-size="3.9" letter-spacing=".9" fill="${k.mid}" opacity=".9"><textPath href="#${SEP}mt" startOffset="0">${label} · RAISING goDs, BUILDING NATIONS · ${label} · RAISING goDs, BUILDING NATIONS · ${label} · RAISING goDs, BUILDING NATIONS ·</textPath></text>
      <rect width="${W}" height="${H}" fill="url(#${SEP}vg)"/>` : ''}`
  }
  const out = { view: build(true), mask: rare ? build(false) : '' }
  if (cache.size > 120) cache.clear()
  cache.set(key, out)
  return out
}

const maskCache = new Map()
function maskUrl(day, hue, rare, label) {
  const key = `${day}|${Math.round(hue)}|${label}`
  if (maskCache.has(key)) return maskCache.get(key)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">${plate(day, hue, rare, label).mask.replaceAll(SEP, 'm')}</svg>`
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  if (maskCache.size > 60) maskCache.clear()
  maskCache.set(key, url)
  return url
}

/* ───────────────────────────── component ───────────────────────────── */
export const CodeCardArt = memo(function CodeCardArt({ day = 1, rare = false, hue, w = 150, h, label = 'KIDS INSPIRING NATION', title, decorative, className, style, ...rest }) {
  const u = useUid('cc')
  const d = Math.max(1, Math.round(Number(day) || 1))
  const hh = typeof hue === 'string' ? toLch(hue)[2] : hue ?? (d * 47 + 200) % 360
  const width = w, height = h ?? (typeof w === 'number' ? Math.round(w * 1.4) : undefined)
  const p = useMemo(() => plate(d, hh, !!rare, label), [d, hh, rare, label])
  const html = useMemo(() => p.view.replaceAll(SEP, u), [p, u])
  const mask = useMemo(() => (rare ? maskUrl(d, hh, true, label) : null), [rare, d, hh, label])
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': title || `${rare ? 'Gold' : 'Code'} card, day ${d}` }
  return (
    <div className={cx('art-codecard', rare && 'is-rare', className)} style={{ width, height, aspectRatio: height == null ? '5 / 7' : undefined, ...style }} data-day={d} {...a11y} {...rest}>
      <svg className="art-codecard__plate" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: html }} />
      {rare && (
        <div className="art-codecard__foil" style={{ '--cc-mask': mask }} aria-hidden="true"><i className="art-codecard__sheen" /></div>
      )}
      <i className="art-codecard__glare" aria-hidden="true" />
      <i className="art-codecard__edge" aria-hidden="true" />
    </div>
  )
})

export default CodeCardArt
