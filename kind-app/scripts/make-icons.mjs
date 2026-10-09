// KIND brand build — every icon, social card, splash and store asset, generated from code.
//
//   node scripts/make-icons.mjs            regenerate everything (deterministic)
//   node scripts/make-icons.mjs --check    regenerate in memory, fail if any file on disk differs
//   node scripts/make-icons.mjs --dev      also write review sheets to store/_work/out
//
// No npm installs, no fonts at render time: the wordmark is Barlow Condensed (OFL) converted to outlines with
// opentype.js; colours are read from src/styles/tokens.css so the brand can never drift from the app.
import sharp from 'sharp'
import opentype from 'opentype.js'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const PUB = join(ROOT, 'public')
const STORE = join(ROOT, 'store')
const ARGS = process.argv.slice(2)
const CHECK = ARGS.includes('--check')
const DEV = ARGS.includes('--dev')
const ONLY = (ARGS.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean)
const want = (k) => !ONLY.length || ONLY.includes(k)

// ───────────────────────────────────────────────────────────────────────────
// 0 · tokens → palette
// ───────────────────────────────────────────────────────────────────────────
const tokenCss = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8')
const TOK = {}
for (const m of tokenCss.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) TOK[m[1]] = m[2].toLowerCase()
const need = (k) => { if (!TOK[k]) throw new Error(`token --${k} not found in tokens.css`); return TOK[k] }
const P = {
  void: need('void'), c0: need('carbon-0'), c1: need('carbon-1'), c2: need('carbon-2'), c3: need('carbon-3'), c4: need('carbon-4'),
  ink: need('ink'), ink2: need('ink-2'), ink3: need('ink-3'), ink4: need('ink-4'), onIgnite: need('ink-on-ignite'),
  i1: need('ignite-1'), i2: need('ignite-2'), i3: need('ignite-3'),
  tele: need('tele'), tele2: need('tele-2'),
  g1: need('gold-1'), g2: need('gold-2'), g3: need('gold-3'),
  t1: need('ti-1'), t2: need('ti-2'), t3: need('ti-3'), t4: need('ti-4'),
}
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)) }
const rgba = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})` }
// titanium ramp: brightness 0..1 → metal (tokens only)
const metal = (b) => {
  const stops = [[0, P.t4], [0.34, P.t3], [0.68, P.t2], [1, P.t1]]
  b = Math.max(0, Math.min(1, b))
  for (let i = 1; i < stops.length; i++) if (b <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (b - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]))
  return P.t1
}

// ───────────────────────────────────────────────────────────────────────────
// 1 · small maths
// ───────────────────────────────────────────────────────────────────────────
const f2 = (n) => (Math.round(n * 100) / 100).toString()
const rad = (d) => (d * Math.PI) / 180
const hexV = (cx, cy, R, i) => [cx + R * Math.cos(rad(-90 + 60 * i)), cy + R * Math.sin(rad(-90 + 60 * i))]
const pts = (arr) => arr.map(([x, y]) => f2(x) + ',' + f2(y)).join(' ')
const hexPoints = (cx, cy, R) => pts([0, 1, 2, 3, 4, 5].map((i) => hexV(cx, cy, R, i)))
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// ───────────────────────────────────────────────────────────────────────────
// 2 · the mark — geometry (512 space; the hexagon is centred on 256,256)
// ───────────────────────────────────────────────────────────────────────────
const HX = { cx: 256, cy: 256, R0: 200 }
// Rim, outside in (apothem widths): outer chamfer 6 · flat band 10 · inner chamfer 5.
const apo = (R) => R * Math.cos(rad(30))
const fromApo = (a) => a / Math.cos(rad(30))
const RIM = (() => {
  const a0 = apo(HX.R0)
  return { R0: HX.R0, R1: fromApo(a0 - 6), R2: fromApo(a0 - 16), R3: fromApo(a0 - 21) }
})()

// The K, drawn in its own space: stem 0..42, cap line y=0, baseline y=220; the flame rises above the cap line.
// Arm and leg both leave the stem at 58°; the arm bends up into a flame lick (the "rising trajectory").
const K_LOCAL = {
  body: 'M0 16 L16 0 L42 0 L42 82 C66 50 112 40 144 -34 C150 -4 182 42 156 76 C132 100 96 108 70 118 L134 220 L86 220 L42 156 L42 220 L0 220 Z',
  // hot core: a smaller flame inside the lick (large sizes only)
  core: 'M104 84 C126 80 148 64 144 44 C142 30 138 18 139 -2 C128 24 108 42 94 62 C90 72 94 86 104 84 Z',
  box: { x0: 0, y0: -34, x1: 170, y1: 220 },
}
const K_T = { x: 170, y: 146, s: 1.04 } // placement in the 512 space
const kAbs = (x, y) => [K_T.x + x * K_T.s, K_T.y + y * K_T.s]

// ───────────────────────────────────────────────────────────────────────────
// 3 · the badge (SVG fragment builder)
// ───────────────────────────────────────────────────────────────────────────
// id        unique prefix for every gradient/filter/clip (so many badges can share a page)
// tile      'rounded' (any-purpose app icon) | 'full' (square, full-bleed) | 'none' (free-standing object)
// scale     hex scale about the centre (maskable art sits at .98 so every vertex clears the 80 % safe circle)
// detail    'full' | 'lite'  — lite drops ticks, hairlines, flame core and the K bevel (< ~56 px renders)
// weave     carbon-weave texture on the tile and plate (≥ 384 px renders only)
// glow      ember glow behind the K · glowSlot emits a marker instead, for the JSX component to fill at run time
// only      'k' → just the K (and what it needs)
function badge({ id = 'b', tile = 'rounded', scale = 1, detail = 'full', weave = detail === 'full', glow = false, glowSlot = false, shadow = tile !== 'none', halo = false, only = null, kShadow = true, mark = false } = {}) {
  const { cx, cy } = HX
  const full = detail === 'full' || mark // mark: emit everything, wrapping the detail-only parts so the component can strip them at run time
  const F = (x) => (mark ? `<!--@full-->${x}<!--@/full-->` : x)
  const u = (n) => `${id}-${n}`
  const L = -105 // light azimuth (deg): from above, a touch left
  const light = (n) => 0.5 + 0.5 * Math.cos(rad(n - L))
  const onlyK = only === 'k'
  const kx0 = K_T.x, ky1 = K_T.y + 220 * K_T.s
  const [tipX, tipY] = kAbs(150, -34)
  const kT = `translate(${K_T.x} ${K_T.y}) scale(${K_T.s})`
  const gs = (a, b) => `${a}${b}`

  // ── defs (only what the chosen options use)
  const d = []
  const kd = [] // everything the K needs (the component builds the K-only mark from this region)
  kd.push(`<linearGradient id="${u('ig')}" gradientUnits="userSpaceOnUse" x1="${f2(kx0 + 20)}" y1="${f2(ky1)}" x2="${f2(tipX + 10)}" y2="${f2(tipY)}"><stop offset="0" stop-color="${P.i1}"/><stop offset=".56" stop-color="${P.i2}"/><stop offset="1" stop-color="${P.i3}"/></linearGradient>`)
  kd.push(`<linearGradient id="${u('sheen')}" gradientUnits="userSpaceOnUse" x1="0" y1="${f2(K_T.y - 34)}" x2="0" y2="${f2(K_T.y + 150)}"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`)
  kd.push(`<clipPath id="${u('kClip')}"><path transform="${kT}" d="${K_LOCAL.body}"/></clipPath>`)
  kd.push(`<filter id="${u('blur8')}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter>`)
  if (full) {
    const fd = []
    fd.push(`<linearGradient id="${u('core')}" gradientUnits="userSpaceOnUse" x1="${f2(kx0 + 100 * K_T.s)}" y1="${f2(K_T.y + 90 * K_T.s)}" x2="${f2(kx0 + 140 * K_T.s)}" y2="${f2(K_T.y - 6 * K_T.s)}"><stop offset="0" stop-color="${P.i3}" stop-opacity="0"/><stop offset=".45" stop-color="${P.i3}" stop-opacity=".55"/><stop offset="1" stop-color="${P.g1}" stop-opacity=".95"/></linearGradient>`)
    fd.push(`<linearGradient id="${u('shade')}" gradientUnits="userSpaceOnUse" x1="0" y1="${f2(K_T.y + 120 * K_T.s)}" x2="0" y2="${f2(K_T.y + 224 * K_T.s)}"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".10"/></linearGradient>`)
    fd.push(`<linearGradient id="${u('edge')}" gradientUnits="userSpaceOnUse" x1="0" y1="${f2(K_T.y - 34)}" x2="0" y2="${f2(K_T.y + 230)}"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".35" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`)
    fd.push(`<filter id="${u('blur1')}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter>`)
    kd.push(F(fd.join('')))
  }
  if (shadow || glow || glowSlot) kd.push(`<filter id="${u('blur14')}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>`)
  d.push(mark ? `<!--@kd-->${kd.join('')}<!--@/kd-->` : kd.join(''))
  if (!onlyK) {
    d.push(`<linearGradient id="${u('ti')}" gradientUnits="userSpaceOnUse" x1="${f2(cx - 60)}" y1="${f2(cy - 200)}" x2="${f2(cx + 60)}" y2="${f2(cy + 200)}"><stop offset="0" stop-color="${P.t1}"/><stop offset=".34" stop-color="${P.t2}"/><stop offset=".62" stop-color="${P.t4}"/><stop offset="1" stop-color="${P.t2}"/></linearGradient>`)
    d.push(`<linearGradient id="${u('plate')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.c2}"/><stop offset=".6" stop-color="${P.c1}"/><stop offset="1" stop-color="${P.c0}"/></linearGradient>`)
    d.push(`<radialGradient id="${u('plateLight')}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy - 70}" r="190"><stop offset="0" stop-color="${P.c4}" stop-opacity=".55"/><stop offset="1" stop-color="${P.c4}" stop-opacity="0"/></radialGradient>`)
    d.push(`<radialGradient id="${u('bloom')}" gradientUnits="userSpaceOnUse" cx="${f2(tipX - 8)}" cy="${f2(tipY + 70)}" r="130"><stop offset="0" stop-color="${P.i2}" stop-opacity=".26"/><stop offset=".55" stop-color="${P.i1}" stop-opacity=".07"/><stop offset="1" stop-color="${P.i1}" stop-opacity="0"/></radialGradient>`)
    d.push(`<clipPath id="${u('plateClip')}"><polygon points="${hexPoints(cx, cy, RIM.R3)}"/></clipPath>`)
    if (tile !== 'none') d.push(`<radialGradient id="${u('tile')}" cx="50%" cy="26%" r="78%"><stop offset="0" stop-color="${P.c3}"/><stop offset=".5" stop-color="${P.c1}"/><stop offset="1" stop-color="${P.c0}"/></radialGradient>`)
    if (halo) d.push(`<radialGradient id="${u('halo')}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${RIM.R0 * 1.9}"><stop offset=".35" stop-color="${P.i2}" stop-opacity=".11"/><stop offset=".6" stop-color="${P.tele2}" stop-opacity=".05"/><stop offset="1" stop-color="${P.tele2}" stop-opacity="0"/></radialGradient>`)
    if (weave) d.push(`<pattern id="${u('weave')}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#fff" fill-opacity=".026"/><rect x="4" width="4" height="4" fill="#000" fill-opacity=".13"/><rect y="4" width="4" height="4" fill="#000" fill-opacity=".09"/><rect x="4" y="4" width="4" height="4" fill="#fff" fill-opacity=".012"/></pattern>`)
  }
  const defs = d.join('\n    ')

  // ── tile
  let tileSvg = ''
  if (tile === 'rounded') tileSvg = `<rect width="512" height="512" rx="115" fill="url(#${u('tile')})"/>${weave ? `<rect width="512" height="512" rx="115" fill="url(#${u('weave')})"/>` : ''}<rect x=".75" y=".75" width="510.5" height="510.5" rx="114.25" fill="none" stroke="${rgba(P.t1, 0.1)}" stroke-width="1.5"/>`
  if (tile === 'full') tileSvg = `<rect width="512" height="512" fill="url(#${u('tile')})"/>${weave ? `<rect width="512" height="512" fill="url(#${u('weave')})"/>` : ''}`

  // ── rim: six facets outside, six inside, a flat titanium band between (light from above, a touch left)
  const facets = []
  const level = [RIM.R0, RIM.R1, RIM.R2, RIM.R3]
  for (let i = 0; i < 6; i++) {
    const nOut = -60 + 60 * i
    const bOut = light(nOut), bIn = light(nOut + 180)
    const quad = (Ra, Rb) => pts([hexV(cx, cy, Ra, i), hexV(cx, cy, Ra, i + 1), hexV(cx, cy, Rb, i + 1), hexV(cx, cy, Rb, i)])
    facets.push(`<polygon points="${quad(level[0], level[1])}" fill="${metal(0.18 + 0.82 * bOut ** 1.4)}"/>`)
    facets.push(`<polygon points="${quad(level[2], level[3])}" fill="${metal(0.1 + 0.74 * bIn ** 1.5)}"/>`)
  }
  const hair = []
  if (full) for (let i = 0; i < 6; i++) {
    const b = light(-60 + 60 * i)
    const [x1, y1] = hexV(cx, cy, RIM.R0 - 0.6, i), [x2, y2] = hexV(cx, cy, RIM.R0 - 0.6, i + 1)
    hair.push(`<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="#fff" stroke-opacity="${f2(Math.max(0, (b - 0.42) * 0.95))}" stroke-width="1.6"/>`)
  }
  const hairSvg = hair.length ? F(hair.join('')) : ''
  const rim = `<g class="brand-mark__rim">
    <polygon points="${hexPoints(cx, cy, RIM.R0)}" fill="url(#${u('ti')})"/>
    ${facets.join('')}
    <polygon points="${hexPoints(cx, cy, (RIM.R1 + RIM.R2) / 2)}" fill="none" stroke="url(#${u('ti')})" stroke-width="${f2(apo(RIM.R1) - apo(RIM.R2))}" stroke-linejoin="miter"/>
    ${hairSvg}</g>`

  // ── instrument ticks: the Ignition ring, 60 of them, set into the bezel
  const ticks = []
  if (full) {
    const Rt = RIM.R3 - 9
    for (let i = 0; i < 6; i++) for (let j = 0; j < 10; j++) {
      const t = j / 10
      const [ax, ay] = hexV(cx, cy, Rt, i), [bx, by] = hexV(cx, cy, Rt, i + 1)
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t
      const ex = bx - ax, ey = by - ay, em = Math.hypot(ex, ey)
      let inx = -ey / em, iny = ex / em
      if (inx * (cx - x) + iny * (cy - y) < 0) { inx = -inx; iny = -iny } // always toward the centre
      const len = j === 0 ? 13 : 7
      ticks.push(`M${f2(x)} ${f2(y)}l${f2(inx * len)} ${f2(iny * len)}`)
    }
  }
  const tickSvg = ticks.length ? F(`<path class="brand-mark__ticks" d="${ticks.join('')}" stroke="${P.t3}" stroke-opacity=".5" stroke-width="1.8" fill="none"/>`) : ''

  // ── plate: carbon, lit from above, warmed by the flame
  const plate = `<g class="brand-mark__plate">
    <polygon points="${hexPoints(cx, cy, RIM.R3)}" fill="url(#${u('plate')})"/>
    <g clip-path="url(#${u('plateClip')})">
      <rect width="512" height="512" fill="url(#${u('plateLight')})"/>
      ${weave ? `<rect width="512" height="512" fill="url(#${u('weave')})"/>` : ''}
      <rect width="512" height="512" fill="url(#${u('bloom')})"/>
      ${tickSvg}
      <polygon points="${hexPoints(cx, cy, RIM.R3 + 2)}" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="10" filter="url(#${u('blur8')})"/>
    </g>
    <polygon points="${hexPoints(cx, cy, RIM.R3)}" fill="none" stroke="${P.void}" stroke-opacity=".9" stroke-width="1.5"/></g>`

  // ── the K, and the flame core inside its lick
  const kInner = `<g class="brand-mark__k">
    ${kShadow ? `<g filter="url(#${u('blur8')})" opacity=".7"><path transform="translate(${K_T.x} ${K_T.y + 9}) scale(${K_T.s})" d="${K_LOCAL.body}" fill="#000"/></g>` : ''}
    <path transform="${kT}" d="${K_LOCAL.body}" fill="url(#${u('ig')})"/>
    <g clip-path="url(#${u('kClip')})"><rect y="${f2(K_T.y - 40)}" width="512" height="200" fill="url(#${u('sheen')})"/></g>
    ${full ? F(`<path transform="${kT}" d="${K_LOCAL.body}" fill="none" stroke="url(#${u('edge')})" stroke-width="3.2" stroke-linejoin="round" clip-path="url(#${u('kClip')})"/>
    <g clip-path="url(#${u('kClip')})"><rect y="${f2(K_T.y + 110 * K_T.s)}" width="512" height="200" fill="url(#${u('shade')})"/></g>
    <path class="brand-mark__flame" transform="${kT}" d="${K_LOCAL.core}" fill="url(#${u('core')})" filter="url(#${u('blur1')})"/>`) : ''}</g>`

  const k = mark ? `<!--@k-->${kInner}<!--@/k-->` : kInner
  const glowLayer = `<g class="brand-mark__glow" filter="url(#${u('blur14')})" opacity="__OP__"><path transform="${kT}" d="${K_LOCAL.body}" fill="${P.i2}"/></g>`
  const kGlow = glowSlot ? '<!--@glow-->' : glow ? glowLayer.replace('__OP__', '.85') : ''

  if (onlyK) return { defs, body: kGlow + k, glowLayer }

  const haloSvg = halo ? `<circle cx="${cx}" cy="${cy}" r="${RIM.R0 * 1.9}" fill="url(#${u('halo')})"/>` : ''
  const shadowSvg = shadow ? `<g filter="url(#${u('blur14')})" opacity=".75"><polygon transform="translate(0 14)" points="${hexPoints(cx, cy, RIM.R0 - 2)}" fill="#000"/></g>` : ''
  const body = `${tileSvg}${haloSvg}<g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})">${shadowSvg}${rim}${plate}${kGlow}${k}</g>`
  return { defs, body, glowLayer }
}

const svgDoc = (w, h, vb, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${inner}</svg>`
const iconSvg = (size, opts) => { const b = badge(opts); return svgDoc(size, size, '0 0 512 512', `<defs>${b.defs}</defs>${b.body}`) }
// ───────────────────────────────────────────────────────────────────────────
// 4 · typography — Barlow Condensed → outlines (no font at render time)
// ───────────────────────────────────────────────────────────────────────────
const FONT_DIR = join(ROOT, 'node_modules/@fontsource/barlow-condensed/files')
const _fonts = {}
function font(weight = 700) {
  if (!_fonts[weight]) {
    const b = readFileSync(join(FONT_DIR, `barlow-condensed-latin-${weight}-normal.woff`))
    _fonts[weight] = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
  }
  return _fonts[weight]
}
const CAP = 700 // Barlow Condensed cap height (units of 1000)
function flatten(path, steps = 10) {
  const polys = []; let cur = null, px = 0, py = 0
  for (const c of path.commands) {
    if (c.type === 'M') { cur = [[c.x, c.y]]; polys.push(cur); px = c.x; py = c.y }
    else if (c.type === 'L') { cur.push([c.x, c.y]); px = c.x; py = c.y }
    else if (c.type === 'Q') { for (let i = 1; i <= steps; i++) { const t = i / steps, u = 1 - t; cur.push([u * u * px + 2 * u * t * c.x1 + t * t * c.x, u * u * py + 2 * u * t * c.y1 + t * t * c.y]) } px = c.x; py = c.y }
    else if (c.type === 'C') { for (let i = 1; i <= steps; i++) { const t = i / steps, u = 1 - t; cur.push([u * u * u * px + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x, u * u * u * py + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y]) } px = c.x; py = c.y }
  }
  return polys
}
// right / left ink extent of a glyph at each sample row (font units, y up)
function profile(glyph, rows) {
  const polys = flatten(glyph.getPath(0, 0, 1000)).map((poly) => poly.map(([x, y]) => [x, -y])) // y up
  const L = rows.map(() => Infinity), R = rows.map(() => -Infinity)
  for (const poly of polys) for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]
    rows.forEach((y, k) => {
      if ((y1 <= y && y2 >= y) || (y2 <= y && y1 >= y)) {
        const x = y1 === y2 ? Math.max(x1, x2) : x1 + ((y - y1) * (x2 - x1)) / (y2 - y1)
        if (y1 === y2) { L[k] = Math.min(L[k], x1, x2); R[k] = Math.max(R[k], x1, x2) } else { L[k] = Math.min(L[k], x); R[k] = Math.max(R[k], x) }
      }
    })
  }
  return { L, R }
}
// Optical kerning: space every pair so the *clamped mean gap* between outlines equals `target` — an open mouth (K) is only
// partly credited, straight-to-straight pairs get exactly the target.  Returns extra advance per pair, in font units.
function opticalPairs(fnt, text, { target = 190, clamp = 260, lo = 20, hi = 680 } = {}) {
  const rows = []; for (let y = lo; y <= hi; y += 10) rows.push(y)
  const prof = [...text].map((ch) => profile(fnt.charToGlyph(ch), rows))
  const out = []
  for (let i = 0; i < text.length - 1; i++) {
    const a = fnt.charToGlyph(text[i]), A = prof[i], B = prof[i + 1]
    const mean = (d) => rows.reduce((s, _, k) => s + Math.min(clamp, B.L[k] + a.advanceWidth + d - A.R[k]), 0) / rows.length
    let d0 = -400, d1 = 600
    for (let it = 0; it < 40; it++) { const m = (d0 + d1) / 2; if (mean(m) < target) d0 = m; else d1 = m }
    out.push((d0 + d1) / 2)
  }
  return out
}
// own path writer: opentype's toPathData() can emit NaN for some glyph/offset combinations, so we never use it
function cmdsToD(cmds, dx = 0, dy = 0, dec = 2) {
  const r = (v) => String(Math.round(v * 10 ** dec) / 10 ** dec)
  return cmds.map((c) => c.type === 'Z' ? 'Z' : c.type === 'M' || c.type === 'L' ? c.type + r(c.x + dx) + ' ' + r(c.y + dy) : c.type === 'Q' ? 'Q' + r(c.x1 + dx) + ' ' + r(c.y1 + dy) + ' ' + r(c.x + dx) + ' ' + r(c.y + dy) : 'C' + r(c.x1 + dx) + ' ' + r(c.y1 + dy) + ' ' + r(c.x2 + dx) + ' ' + r(c.y2 + dy) + ' ' + r(c.x + dx) + ' ' + r(c.y + dy)).join('')
}
const kernOf = (fnt, a, b) => { const v = fnt.getKerningValue(a, b); return Number.isFinite(v) ? v : 0 }
// text → path data.  size = font-size in px (so cap height = size*0.7).  y = baseline.  Returns ink-tight metrics.
function textOutline(text, { weight = 700, size = 100, tracking = 0, x = 0, y = 0, optical = null, kerning = true } = {}) {
  const fnt = font(weight), k = size / 1000
  const pairs = optical ? opticalPairs(fnt, text, optical) : null
  let pen = 0, d = '', minX = Infinity, maxX = -Infinity
  const glyphs = [], parts = []
  ;[...text].forEach((ch, i) => {
    const g = fnt.charToGlyph(ch)
    const gd = cmdsToD(g.getPath(0, 0, size).commands, x + pen * k, y)
    d += gd; parts.push(gd)
    const bb = g.getBoundingBox()
    if (g.path.commands.length) { minX = Math.min(minX, pen + bb.x1); maxX = Math.max(maxX, pen + bb.x2) }
    glyphs.push({ ch, x: pen * k, adv: g.advanceWidth * k })
    if (i < text.length - 1) {
      const nxt = fnt.charToGlyph(text[i + 1])
      pen += g.advanceWidth + (pairs ? pairs[i] - 0 : (kerning ? kernOf(fnt, g, nxt) : 0) + tracking * 1000)
      if (pairs) pen += tracking * 1000
    }
  })
  return { d, parts, x0: x + minX * k, x1: x + maxX * k, width: (maxX - minX) * k, glyphs, capH: CAP * k }
}
const shiftPath = (d, dx, dy, dec = 2) => d.replace(/([MLQCZ])([^MLQCZ]*)/g, (m, c, rest) => {
  if (c === 'Z') return 'Z'
  const n = (rest.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || []).map(Number)
  return c + n.map((v, i) => String(Math.round((v + (i % 2 ? dy : dx)) * 10 ** dec) / 10 ** dec)).join(' ')
})

// Wordmark: KIND, optically spaced, ink-tight, cap top at y=0, baseline y=700 (1 unit = 1/1000 em).
const WORDMARK = (() => {
  const o = textOutline('KIND', { weight: 700, size: 1000, y: CAP, optical: { target: 196, clamp: 220 } })
  return { d: shiftPath(o.d, -o.x0, 0), w: Math.round(o.width), h: CAP }
})()


// Absolute M/L/Q/C/Z → relative m/l/q/c/z on a rounded grid, minimal separators (≈ 55 % smaller; no drift: deltas are taken between rounded points).
function compactPath(d, dec = 0) {
  const q = (v) => Math.round(v * 10 ** dec) / 10 ** dec
  const num = (v) => { let s = String(v); if (s.startsWith('0.')) s = s.slice(1); else if (s.startsWith('-0.')) s = '-' + s.slice(2); return s }
  const pack = (arr) => arr.map(num).reduce((a, s, i) => a + (i && !s.startsWith('-') ? ' ' : '') + s, '')
  let cx = 0, cy = 0, sx = 0, sy = 0, out = ''
  for (const m of d.matchAll(/([MLQCZ])([^MLQCZ]*)/g)) {
    const c = m[1], n = (m[2].match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || []).map(Number)
    if (c === 'Z') { out += 'z'; cx = sx; cy = sy; continue }
    const abs = []
    for (let i = 0; i < n.length; i += 2) abs.push([q(n[i]), q(n[i + 1])])
    const rel = abs.flatMap(([x, y]) => [q(x - cx), q(y - cy)])
    out += c.toLowerCase() + pack(rel)
    const [ex, ey] = abs[abs.length - 1]
    cx = ex; cy = ey
    if (c === 'M') { sx = ex; sy = ey }
  }
  return out
}
// ───────────────────────────────────────────────────────────────────────────
// 5 · scenes — starfield + the Earth's limb at dawn (drawn, never photographed)
// ───────────────────────────────────────────────────────────────────────────
// Stars thicken toward the top of the frame ("the sky darkens and stars thicken as you climb").
function starfield({ w, h, seed = 7, density = 1, horizon = h, bright = 7, band = null }) {
  const rnd = mulberry32(seed)
  const n = Math.round(((w * h) / 2600) * density)
  const buckets = {}
  const add = (col, a, r, x, y) => { const k = col + '|' + a.toFixed(2); (buckets[k] ||= []).push(`<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}"/>`) }
  const tints = [[P.ink2, 0.74], [P.tele, 0.14], [P.i3, 0.08], [P.t1, 0.04]]
  const tint = () => { const t = rnd(); let a = 0; for (const [c, p] of tints) { a += p; if (t <= a) return c } return P.ink2 }
  for (let i = 0; i < n; i++) {
    const y = horizon * Math.pow(rnd(), 1.75)
    const x = rnd() * w
    const r = 0.32 + Math.pow(rnd(), 7) * 1.5
    const a = Math.round((0.18 + 0.82 * Math.pow(rnd(), 1.4)) * 8) / 8
    add(tint(), a * (0.45 + 0.55 * (1 - y / horizon)), r * (w > 900 ? 1 : 0.9), x, y)
  }
  // a faint galactic band: denser tiny stars along a diagonal, plus a haze
  let bandSvg = ''
  if (band) {
    const { cx, cy, rot, len, thick } = band
    const m = Math.round(n * 0.5)
    for (let i = 0; i < m; i++) {
      const t = (rnd() - 0.5) * len, s = (rnd() + rnd() + rnd() - 1.5) * thick
      const x = cx + t * Math.cos(rad(rot)) - s * Math.sin(rad(rot)), y = cy + t * Math.sin(rad(rot)) + s * Math.cos(rad(rot))
      if (x < 0 || x > w || y < 0 || y > horizon) continue
      add(rnd() < 0.2 ? P.tele : P.ink2, 0.2 + 0.4 * rnd(), 0.3 + rnd() * 0.45, x, y)
    }
    bandSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${f2(len * 0.55)}" ry="${f2(thick * 1.5)}" transform="rotate(${rot} ${cx} ${cy})" fill="url(#sf-haze-${seed})"/>`
  }
  const groups = Object.entries(buckets).map(([k, v]) => { const [c, a] = k.split('|'); return `<g fill="${c}" fill-opacity="${a}">${v.join('')}</g>` }).join('')
  // a few hero stars: soft bloom + hairline diffraction cross
  const heroes = []
  for (let i = 0; i < bright; i++) {
    const x = w * (0.06 + 0.88 * rnd()), y = horizon * 0.72 * Math.pow(rnd(), 1.3), r = 1.1 + rnd() * 0.9, c = tint(), L = 10 + rnd() * 12
    heroes.push(`<g><circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r * 5)}" fill="${c}" fill-opacity=".10"/><circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}" fill="${P.t1}"/><path d="M${f2(x - L)} ${f2(y)}H${f2(x + L)}M${f2(x)} ${f2(y - L)}V${f2(y + L)}" stroke="${c}" stroke-opacity=".38" stroke-width=".6"/></g>`)
  }
  return {
    defs: band ? `<radialGradient id="sf-haze-${seed}"><stop offset="0" stop-color="${P.tele2}" stop-opacity=".085"/><stop offset=".6" stop-color="${P.tele2}" stop-opacity=".03"/><stop offset="1" stop-color="${P.tele2}" stop-opacity="0"/></radialGradient>` : '',
    body: bandSvg + groups + heroes.join(''),
  }
}

// Earth's limb: a huge dark disc whose top edge crosses the frame; dawn breaks at sunX.
function limb({ id = 'lm', w, h, top, r, sunX, cx = w / 2, glow = 1, lights = true, seed = 11 }) {
  const cy = top + r
  const yAt = (x) => cy - Math.sqrt(Math.max(0, r * r - (x - cx) * (x - cx)))
  const sy = yAt(sunX)
  const sf = sunX / w
  const u = (k) => `${id}-${k}`
  const fy = Math.max(0, top - h * 0.3)
  const arc = `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}"`
  const defs = `
    <linearGradient id="${u('atm')}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${w}" y2="0">
      <stop offset="0" stop-color="${P.tele2}" stop-opacity="0"/>
      <stop offset="${f2(Math.max(0.05, sf - 0.5))}" stop-color="${P.tele2}" stop-opacity=".5"/>
      <stop offset="${f2(sf - 0.2)}" stop-color="${P.tele}" stop-opacity=".78"/>
      <stop offset="${f2(sf - 0.05)}" stop-color="${P.t1}" stop-opacity=".98"/>
      <stop offset="${f2(sf)}" stop-color="#fff"/>
      <stop offset="${f2(sf + 0.06)}" stop-color="${P.t1}" stop-opacity=".95"/>
      <stop offset="${f2(Math.min(0.98, sf + 0.28))}" stop-color="${P.tele}" stop-opacity=".6"/>
      <stop offset="1" stop-color="${P.tele2}" stop-opacity=".12"/>
    </linearGradient>
    <linearGradient id="${u('warm')}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${w}" y2="0">
      <stop offset="0" stop-color="${P.i1}" stop-opacity="0"/>
      <stop offset="${f2(Math.max(0.01, sf - 0.3))}" stop-color="${P.i1}" stop-opacity="0"/>
      <stop offset="${f2(sf - 0.07)}" stop-color="${P.i1}" stop-opacity=".55"/>
      <stop offset="${f2(sf)}" stop-color="${P.i2}" stop-opacity=".95"/>
      <stop offset="${f2(sf + 0.07)}" stop-color="${P.i1}" stop-opacity=".5"/>
      <stop offset="${f2(Math.min(0.99, sf + 0.3))}" stop-color="${P.i1}" stop-opacity="0"/>
      <stop offset="1" stop-color="${P.i1}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${u('disc')}" gradientUnits="userSpaceOnUse" x1="0" y1="${f2(top)}" x2="0" y2="${f2(top + Math.max(h * 0.5, 200))}">
      <stop offset="0" stop-color="${mix(P.c1, P.tele2, 0.07)}"/><stop offset=".12" stop-color="${P.c0}"/><stop offset="1" stop-color="${P.void}"/>
    </linearGradient>
    <radialGradient id="${u('dawn')}" gradientUnits="userSpaceOnUse" cx="${f2(sunX)}" cy="${f2(sy)}" r="${f2(w * 0.42)}" gradientTransform="translate(${f2(sunX)} ${f2(sy)}) scale(1 .5) translate(${-f2(sunX)} ${-f2(sy)})">
      <stop offset="0" stop-color="${P.i2}" stop-opacity="${f2(0.5 * glow)}"/><stop offset=".25" stop-color="${P.i1}" stop-opacity="${f2(0.2 * glow)}"/><stop offset=".6" stop-color="${P.tele2}" stop-opacity="${f2(0.05 * glow)}"/><stop offset="1" stop-color="${P.tele2}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${u('sun')}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".18" stop-color="${P.i3}" stop-opacity=".85"/><stop offset=".5" stop-color="${P.i2}" stop-opacity=".25"/><stop offset="1" stop-color="${P.i1}" stop-opacity="0"/></radialGradient>
    <filter id="${u('b4')}" filterUnits="userSpaceOnUse" x="0" y="${f2(fy)}" width="${w}" height="${f2(h - fy)}"><feGaussianBlur stdDeviation="${f2(w / 300)}"/></filter>
    <filter id="${u('b12')}" filterUnits="userSpaceOnUse" x="0" y="${f2(fy)}" width="${w}" height="${f2(h - fy)}"><feGaussianBlur stdDeviation="${f2(w / 100)}"/></filter>
    <filter id="${u('b30')}" filterUnits="userSpaceOnUse" x="0" y="${f2(fy)}" width="${w}" height="${f2(h - fy)}"><feGaussianBlur stdDeviation="${f2(w / 38)}"/></filter>
    <clipPath id="${u('clip')}"><rect x="0" y="0" width="${w}" height="${h}"/></clipPath>`
  // city lights hugging the limb (compressed vertically by the grazing view)
  let dots = ''
  if (lights) {
    const rnd = mulberry32(seed)
    const clusters = [[0.14, 70], [0.27, 46], [0.42, 90], [0.58, 56], [0.72, 80], [0.88, 62]]
    const out = []
    for (const [fx, n] of clusters) {
      for (let i = 0; i < n; i++) {
        const x = w * fx + (rnd() + rnd() + rnd() - 1.5) * w * 0.07
        const y = yAt(x) + 4 - Math.log(1 - rnd() * 0.97) * h * 0.02
        if (y > h) continue
        const a = (0.25 + 0.65 * rnd()) * Math.max(0.2, 1 - (y - yAt(x)) / (h * 0.12))
        out.push(`<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(0.5 + rnd() * 0.8)}" fill="${rnd() < 0.3 ? P.i3 : P.i2}" fill-opacity="${f2(a)}"/>`)
      }
    }
    dots = out.join('')
  }
  const body = `
    <g clip-path="url(#${u('clip')})">
      <g filter="url(#${u('b30')})" opacity="${f2(0.55 * glow)}">${arc} fill="none" stroke="url(#${u('atm')})" stroke-width="${f2(w * 0.03)}" transform="translate(0 ${f2(-w * 0.012)})"/></g>
      <rect x="0" y="0" width="${w}" height="${h}" fill="url(#${u('dawn')})"/>
      ${arc} fill="url(#${u('disc')})"/>
      <g filter="url(#${u('b12')})" opacity="${f2(0.7 * glow)}">${arc} fill="none" stroke="url(#${u('warm')})" stroke-width="${f2(w * 0.02)}"/></g>
      <g filter="url(#${u('b4')})" opacity=".7">${arc} fill="none" stroke="url(#${u('atm')})" stroke-width="${f2(w * 0.006)}"/></g>
      ${arc} fill="none" stroke="url(#${u('atm')})" stroke-width="${f2(Math.max(1.4, w * 0.0018))}"/>
      <g filter="url(#${u('b12')})" opacity=".30"><circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r - w * 0.012)}" fill="none" stroke="${P.tele2}" stroke-width="${f2(w * 0.012)}"/></g>
      ${dots}
      <circle cx="${f2(sunX)}" cy="${f2(sy)}" r="${f2(w * 0.05 * glow)}" fill="url(#${u('sun')})"/>
      <circle cx="${f2(sunX)}" cy="${f2(sy)}" r="${f2(Math.max(1.4, w * 0.0018))}" fill="#fff"/>
    </g>`
  return { defs, body, yAt, sy }
}

// fine deterministic grain (dithers the dark gradients so they never band)
let _grain
async function grainTile(size = 256, amp = 10) {
  if (_grain) return _grain
  const rnd = mulberry32(90210), px = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) { const v = 128 + Math.round((rnd() + rnd() - 1) * amp); px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v; px[i * 4 + 3] = 255 }
  return (_grain = await sharp(px, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer())
}
// ───────────────────────────────────────────────────────────────────────────
// 6 · compositions — social cards, Play feature graphic, iOS splash
// ───────────────────────────────────────────────────────────────────────────
// A line of display type as outlines.  anchor: start | middle | end — measured on ink, not advance.
function textBlock(text, { weight = 700, size = 60, tracking = 0, x = 0, y = 0, anchor = 'start', fill = P.ink, opacity = 1, optical = null, gradient = null }) {
  const o = textOutline(text, { weight, size, tracking, optical })
  const dx = anchor === 'middle' ? x - (o.x0 + o.x1) / 2 : anchor === 'end' ? x - o.x1 : x - o.x0
  const f = gradient ? `url(#${gradient})` : fill
  return { svg: `<path d="${shiftPath(o.d, dx, y)}" fill="${f}"${opacity < 1 ? ` fill-opacity="${opacity}"` : ''}/>`, width: o.width, x0: dx + o.x0, x1: dx + o.x1, capH: o.capH }
}

// the badge as a free-standing object, centred on (cx,cy), `height` px tall (hex point to point)
function placeBadge({ id, cx, cy, height, ...opts }) {
  const s = height / (2 * RIM.R0)
  const b = badge({ id, tile: 'none', ...opts })
  return { defs: b.defs, body: `<g transform="translate(${f2(cx - 256 * s)} ${f2(cy - 256 * s)}) scale(${f2(s * 1000) / 1000})">${b.body}</g>` }
}
// KIND wordmark: x0 = left ink edge, y0 = cap top, capH = cap height in px
function placeWordmark({ x0, y0, capH, fill = 'url(#wm-metal)', anchor = 'start' }) {
  const k = capH / CAP, w = WORDMARK.w * k
  const left = anchor === 'middle' ? x0 - w / 2 : anchor === 'end' ? x0 - w : x0
  return { svg: `<path transform="translate(${f2(left)} ${f2(y0)}) scale(${f2(k * 10000) / 10000})" d="${WORDMARK.d}" fill="${fill}"/>`, w, left }
}
const WM_DEFS = `<linearGradient id="wm-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.t1}"/><stop offset=".55" stop-color="${P.t2}"/><stop offset="1" stop-color="${mix(P.t2, P.t3, 0.55)}"/></linearGradient>`

const TAGLINE = 'RAISING goDs · BUILDING NATIONS'
// tagline justified to a given ink width: pick the tracking that lands exactly on it (size fixed).
// "goDs" is set one step brighter than the rest — the brand's one typographic accent.
const EMPH = [TAGLINE.indexOf('goDs'), TAGLINE.indexOf('goDs') + 4]
function fitTagline(width, { size, weight = 600, x = 0, y = 0, anchor = 'start', fill = P.ink2, emphFill = P.ink }) {
  let lo = 0, hi = 1.2
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (textOutline(TAGLINE, { weight, size, tracking: m }).width < width) lo = m; else hi = m }
  const tracking = (lo + hi) / 2
  const o = textOutline(TAGLINE, { weight, size, tracking })
  const dx = anchor === 'middle' ? x - (o.x0 + o.x1) / 2 : anchor === 'end' ? x - o.x1 : x - o.x0
  const main = o.parts.filter((_, i) => i < EMPH[0] || i >= EMPH[1]).join('')
  const emph = o.parts.slice(EMPH[0], EMPH[1]).join('')
  return { svg: `<path d="${shiftPath(main, dx, y)}" fill="${fill}"/><path d="${shiftPath(emph, dx, y)}" fill="${emphFill}"/>`, tracking, width: o.width, main, emph, o }
}

// Shared night-sky ground: void → carbon, grain added after rasterising.
function sky({ id, w, h, topFade = 0 }) {
  return `<linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.void}"/><stop offset=".55" stop-color="${P.c0}"/><stop offset="1" stop-color="${mix(P.c0, P.c1, 0.8)}"/></linearGradient>
    <radialGradient id="${id}-v" cx="50%" cy="38%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>`
}

// 1200×630 Open Graph / 1200×600 Twitter: badge on the horizon, the line beneath it
function socialSvg(w, h) {
  const id = 'so'
  const st = starfield({ w, h, seed: 5, horizon: h * 0.78, density: 1.1, bright: 9, band: { cx: w * 0.28, cy: h * 0.3, rot: -22, len: w * 1.0, thick: h * 0.075 } })
  const lm = limb({ id: 'oglm', w, h, top: h * 0.885, r: w * 1.5, sunX: w * 0.58, glow: 1 })
  const mk = placeBadge({ id: 'ogb', cx: w / 2, cy: h * 0.325, height: h * 0.5, glow: false, halo: true })
  const head = textBlock('Raising goDs. Building nations.', { weight: 700, size: h * 0.112, x: w / 2, y: h * 0.735, anchor: 'middle', fill: P.ink })
  const eyebrow = textBlock('KIDS INSPIRING NATION  ·  DAILY FAMILY DEVOTIONAL', { weight: 600, size: h * 0.034, tracking: 0.34, x: w / 2, y: h * 0.79, anchor: 'middle', fill: P.ink3 })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>${sky({ id, w, h })}${st.defs}${lm.defs}${mk.defs}${WM_DEFS}</defs>
    <rect width="${w}" height="${h}" fill="url(#${id}-g)"/>
    ${st.body}${lm.body}${mk.body}
    ${head.svg}${eyebrow.svg}
    <rect width="${w}" height="${h}" fill="url(#${id}-v)"/>
  </svg>`
}

// 1024×500 Google Play feature graphic: lockup left-of-centre, horizon across the foot. Keep the key content inside the centre ~70 %.
function featureSvg(w = 1024, h = 500) {
  const id = 'fg'
  const st = starfield({ w, h, seed: 23, horizon: h * 0.8, density: 1.0, bright: 7, band: { cx: w * 0.7, cy: h * 0.25, rot: -18, len: w * 0.95, thick: h * 0.08 } })
  const lm = limb({ id: 'fglm', w, h, top: h * 0.88, r: w * 1.4, sunX: w * 0.76, glow: 0.9 })
  const mk = placeBadge({ id: 'fgb', cx: w * 0.255, cy: h * 0.47, height: h * 0.66, halo: true })
  const capH = h * 0.3, wmx = w * 0.455, y0 = h * 0.26
  const wm = placeWordmark({ x0: wmx, y0, capH })
  const tag = fitTagline(wm.w, { size: h * 0.04, x: wmx, y: y0 + capH + h * 0.115, fill: P.ink2 })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>${sky({ id, w, h })}${st.defs}${lm.defs}${mk.defs}${WM_DEFS}</defs>
    <rect width="${w}" height="${h}" fill="url(#${id}-g)"/>
    ${st.body}${lm.body}${mk.body}
    ${wm.svg}${tag.svg}
    <rect width="${w}" height="${h}" fill="url(#${id}-v)"/>
  </svg>`
}

// iOS startup image: the badge on a carbon field, a faint dawn on the horizon.  Portrait w×h in device pixels.
function splashSvg(w, h) {
  const id = 'sp'
  const base = Math.min(w, h * 0.56)
  const st = starfield({ w, h, seed: 3, horizon: h * 0.8, density: 0.55, bright: 4 })
  const lm = limb({ id: 'splm', w, h, top: h * 0.905, r: w * 1.6, sunX: w * 0.5, glow: 0.55, lights: false })
  const markH = base * 0.42
  const cy = h * 0.435
  const mk = placeBadge({ id: 'spb', cx: w / 2, cy, height: markH, halo: true })
  const capH = markH * 0.13
  const wm = placeWordmark({ x0: w / 2, y0: cy + markH / 2 + markH * 0.16, capH, anchor: 'middle' })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>${sky({ id, w, h })}${st.defs}${lm.defs}${mk.defs}${WM_DEFS}</defs>
    <rect width="${w}" height="${h}" fill="url(#${id}-g)"/>
    ${st.body}${lm.body}${mk.body}${wm.svg}
    <rect width="${w}" height="${h}" fill="url(#${id}-v)"/>
  </svg>`
}

// ───────────────────────────────────────────────────────────────────────────
// 7 · small-size art — monochrome (Android themed icons) and the favicon
// ───────────────────────────────────────────────────────────────────────────
// Alpha-only silhouette: ring + K, no tile.  Android keeps ~61 % of the layer, so the ring sits at R=150 of 512.
function monoSvg(size = 512, color = '#fff') {
  const R = 152, ringW = 15, m = R / RIM.R0
  const ring = `<path fill-rule="evenodd" d="M${hexPoints(256, 256, R).replace(/ /g, 'L')}ZM${hexPoints(256, 256, fromApo(apo(R) - ringW)).replace(/ /g, 'L')}Z" fill="${color}"/>`
  const kScale = m * 1.12
  return svgDoc(size, size, '0 0 512 512', `${ring}<g transform="translate(256 256) scale(${f2(kScale * 1000) / 1000}) translate(-256 -256)"><path transform="translate(${K_T.x} ${K_T.y}) scale(${K_T.s})" d="${K_LOCAL.body}" fill="${color}"/></g>`)
}
// ───────────────────────────────────────────────────────────────────────────
// 7b · favicon art — drawn for 16 px, not scaled down from the badge
// ───────────────────────────────────────────────────────────────────────────
// The hexagon IS the icon here (no tile), the rim is a plain titanium band, the K is fattened with a round-joined
// stroke so its stem still lands on a whole pixel column at 16.
function faviconSvg(size = 64) {
  const R = 31.4, ring = 4.2, cx = 32, cy = 32
  const Rin = fromApo(apo(R) - ring)
  const s = 0.125, kx = 32.4 - 85 * s, ky = 32.2 - 93 * s
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="f-ti" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.t1}"/><stop offset=".5" stop-color="${P.t2}"/><stop offset="1" stop-color="${P.t3}"/></linearGradient>
    <linearGradient id="f-pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.c2}"/><stop offset="1" stop-color="${P.c0}"/></linearGradient>
    <linearGradient id="f-ig" gradientUnits="userSpaceOnUse" x1="20" y1="226" x2="150" y2="-40"><stop offset="0" stop-color="${P.i1}"/><stop offset=".55" stop-color="${P.i2}"/><stop offset="1" stop-color="${P.i3}"/></linearGradient>
  </defs>
  <polygon points="${hexPoints(cx, cy, R)}" fill="url(#f-ti)"/>
  <polygon points="${hexPoints(cx, cy, Rin)}" fill="url(#f-pl)"/>
  <g transform="translate(${f2(kx)} ${f2(ky)}) scale(${s})"><path d="${K_LOCAL.body}" fill="url(#f-ig)" stroke="url(#f-ig)" stroke-width="10" stroke-linejoin="round"/></g>
</svg>`
}

// PNG-in-ICO (Vista+; every browser). entries: [{ size, png }]
function icoFile(entries) {
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4)
  let off = 6 + entries.length * 16
  const dir = entries.map(({ size, png }) => {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size; e[1] = size >= 256 ? 0 : size; e[2] = 0; e[3] = 0
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(png.length, 8); e.writeUInt32LE(off, 12)
    off += png.length
    return e
  })
  return Buffer.concat([head, ...dir, ...entries.map((e) => e.png)])
}

// ───────────────────────────────────────────────────────────────────────────
// 8 · the job list — every file this script owns
// ───────────────────────────────────────────────────────────────────────────
// iOS portrait startup images: [css-width, css-height, dpr, example devices]
const SPLASH = [
  [440, 956, 3, 'iPhone 16 Pro Max, 17 Pro Max'],
  [420, 912, 3, 'iPhone Air'],
  [402, 874, 3, 'iPhone 16 Pro, 17, 17 Pro'],
  [430, 932, 3, 'iPhone 16 Plus, 15 Plus, 15 Pro Max, 14 Pro Max'],
  [393, 852, 3, 'iPhone 16, 15, 15 Pro, 14 Pro'],
  [428, 926, 3, 'iPhone 14 Plus, 13 Pro Max, 12 Pro Max'],
  [390, 844, 3, 'iPhone 14, 13, 13 Pro, 12, 12 Pro'],
  [414, 896, 3, 'iPhone 11 Pro Max, XS Max'],
  [414, 896, 2, 'iPhone 11, XR'],
  [375, 812, 3, 'iPhone 13 mini, 12 mini, 11 Pro, XS, X'],
  [414, 736, 3, 'iPhone 8 Plus, 7 Plus, 6s Plus'],
  [375, 667, 2, 'iPhone SE (2nd/3rd gen), 8, 7, 6s'],
  [320, 568, 2, 'iPhone SE (1st gen), 5s'],
  [1032, 1376, 2, 'iPad Pro 13" (M4)'],
  [1024, 1366, 2, 'iPad Pro 12.9"'],
  [834, 1210, 2, 'iPad Pro 11" (M4)'],
  [834, 1194, 2, 'iPad Pro 11" (1st-4th gen)'],
  [834, 1112, 2, 'iPad Pro 10.5", iPad Air (3rd gen)'],
  [820, 1180, 2, 'iPad Air 10.9" / 11", iPad (10th gen)'],
  [810, 1080, 2, 'iPad 10.2"'],
  [744, 1133, 2, 'iPad mini (6th gen+)'],
  [768, 1024, 2, 'iPad 9.7", iPad mini (5th gen)'],
]
const splashName = (w, h, d) => `apple-splash-${w * d}x${h * d}.png`

async function raster(svg, { grain = false, palette = false, colors = 256, dither = 1 } = {}) {
  let buf = await sharp(Buffer.from(svg)).png().toBuffer()
  if (grain) buf = await sharp(buf).composite([{ input: await grainTile(), tile: true, blend: 'soft-light' }]).png().toBuffer()
  return sharp(buf).png(palette ? { palette: true, colours: colors, dither, effort: 10, compressionLevel: 9 } : { compressionLevel: 9, effort: 10 }).toBuffer()
}

// 128 colours + grain: the grain dithers the dark gradients (no banding) and the palette keeps each file ~200–400 KB
const SPLASH_OPTS = { grain: true, palette: true, colors: 128 }
const JOBS = []
const job = (group, path, make) => JOBS.push({ group, path, make })

// app icons ------------------------------------------------------------
job('icons', 'public/icon.svg', async () => Buffer.from(iconSvg(512, { id: 'k', tile: 'rounded' })))
job('icons', 'public/icon-192.png', () => raster(iconSvg(192, { tile: 'rounded', weave: false })))
job('icons', 'public/icon-512.png', () => raster(iconSvg(512, { tile: 'rounded' })))
job('icons', 'public/icon-maskable-512.png', () => raster(iconSvg(512, { tile: 'full', scale: 0.98 })))
job('icons', 'public/icon-monochrome-512.png', () => raster(monoSvg(512, '#ffffff')))
job('icons', 'public/apple-touch-icon.png', () => raster(iconSvg(180, { tile: 'full', weave: false })))
job('icons', 'public/favicon.svg', async () => Buffer.from(faviconSvg(64)))
job('icons', 'public/favicon-32.png', () => raster(faviconSvg(32)))
job('icons', 'public/favicon.ico', async () => icoFile(await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await raster(faviconSvg(size)) })))))

// social ---------------------------------------------------------------
job('social', 'public/og.png', () => once('og', () => raster(socialSvg(1200, 630), { grain: true, palette: true })))
job('social', 'public/og-twitter.png', () => raster(socialSvg(1200, 600), { grain: true, palette: true }))

// Play Store ------------------------------------------------------------
job('store', 'store/icon-512.png', () => raster(iconSvg(512, { tile: 'full', scale: 0.98 })))
job('store', 'store/feature-graphic-1024x500.png', () => once('fg', () => raster(featureSvg(1024, 500), { grain: true })))

// iOS startup images -------------------------------------------------------
const SPLASH_ONLY = (ARGS.find((a) => a.startsWith('--splash=')) || '').slice(9)
for (const [w, h, d] of SPLASH.filter(([w]) => !SPLASH_ONLY || String(w) === SPLASH_ONLY)) job('splash', `public/splash/${splashName(w, h, d)}`, () => raster(splashSvg(w * d, h * d), SPLASH_OPTS))
// ───────────────────────────────────────────────────────────────────────────
// 8b · hand-off snippets for the pwa agent (generated so they can never disagree with the files)
// ───────────────────────────────────────────────────────────────────────────
const media = (w, h, d) => `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait)`
job('meta', 'store/splash-links.html', async () => Buffer.from(`<!-- iOS startup images (apple-touch-startup-image) — generated by scripts/make-icons.mjs.
     Paste inside <head>. Paths are relative so they work with vite base './'. Each file is a portrait splash at the exact
     device pixel size: carbon ${P.c0} field, the KIND badge, a faint dawn on the horizon. Set the manifest background_color
     and both theme-color metas to ${P.c0} so there is no flash between this image and first paint. -->
${SPLASH.map(([w, h, d, who]) => `<!-- ${who} -->\n<link rel="apple-touch-startup-image" media="${media(w, h, d)}" href="./splash/${splashName(w, h, d)}" />`).join('\n')}
`))

job('meta', 'store/head-tags.html', async () => Buffer.from(`<!-- Icons, social cards and colour — generated by scripts/make-icons.mjs. Paste inside <head>; replace SITE with the deployed origin. -->
<meta name="theme-color" content="${P.c0}" />
<meta name="color-scheme" content="dark" />
<link rel="icon" href="./favicon.ico" sizes="48x48" />
<link rel="icon" href="./favicon.svg" type="image/svg+xml" sizes="any" />
<link rel="icon" href="./favicon-32.png" type="image/png" sizes="32x32" />
<link rel="apple-touch-icon" href="./apple-touch-icon.png" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="KIND" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="KIND" />
<meta property="og:title" content="KIND — the daily family devotional" />
<meta property="og:description" content="Raising goDs. Building nations. One short launch a day: Scripture, one truth, a challenge and a prayer." />
<meta property="og:image" content="SITE/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="The KIND badge above the Earth's horizon at sunrise, with the line Raising goDs. Building nations." />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="SITE/og-twitter.png" />
<meta name="twitter:image:alt" content="The KIND badge above the Earth's horizon at sunrise." />
`))

job('meta', 'store/manifest-icons.json', async () => Buffer.from(JSON.stringify({
  background_color: P.c0,
  theme_color: P.c0,
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: 'icon-monochrome-512.png', sizes: '512x512', type: 'image/png', purpose: 'monochrome' },
    { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  ],
}, null, 2) + '\n'))
// ───────────────────────────────────────────────────────────────────────────
// 9 · src/art/Brand.jsx — the generated block (markup + geometry); the components are hand-written around it
// ───────────────────────────────────────────────────────────────────────────
const tight = (s) => s.replace(/\s*\n\s*/g, '')
function monoMarkup() {
  const ringW = 22
  const ring = `M${hexPoints(256, 256, RIM.R0).replace(/ /g, 'L')}ZM${hexPoints(256, 256, fromApo(apo(RIM.R0) - ringW)).replace(/ /g, 'L')}Z`
  return `<path class="brand-mark__rim" fill-rule="evenodd" fill="currentColor" d="${ring}"/><path class="brand-mark__k" transform="translate(${K_T.x} ${K_T.y}) scale(${K_T.s})" d="${K_LOCAL.body}" fill="currentColor"/>`
}
const TAG_UNITS = 96 // tagline font-size in wordmark units (cap 700): lands at ~.26em tracking when justified to the wordmark
function taglineUnits() {
  const t = fitTagline(WORDMARK.w, { size: TAG_UNITS })
  const g = font(600).charToGlyph('g').getBoundingBox()
  return { main: compactPath(shiftPath(t.main, -t.o.x0, 0, 3), 0), emph: compactPath(shiftPath(t.emph, -t.o.x0, 0, 3), 0), cap: +(CAP * TAG_UNITS / 1000).toFixed(2), desc: +(-g.y1 * TAG_UNITS / 1000).toFixed(2), tracking: +t.tracking.toFixed(3) }
}

function brandBlock() {
  const mk = (o) => { const b = badge({ id: '__ID__', ...o }); return tight(`<defs>${b.defs}</defs>${b.body}`) }
  const badgeFull = mk({ tile: 'none', mark: true, weave: false, glowSlot: true, shadow: false })
  const glowLayer = tight(badge({ id: '__ID__', tile: 'none', glow: true }).glowLayer)
  const [tipX, tipY] = kAbs(150, -34)
  const kw = 170 * K_T.s, kh = 254 * K_T.s
  const geo = {
    box: { x: 56, y: 56, w: 400, h: 400 },
    kBox: { x: +(K_T.x - 4).toFixed(1), y: +(K_T.y - 34 * K_T.s - 4).toFixed(1), w: +(kw + 8).toFixed(1), h: +(kh + 8).toFixed(1) },
    flameTip: { x: +((tipX - 56) / 400).toFixed(4), y: +((tipY - 56) / 400).toFixed(4) },
    stemTop: { x: +((K_T.x + 21 * K_T.s - 56) / 400).toFixed(4), y: +((K_T.y - 56) / 400).toFixed(4) },
    hex: { circumradius: HX.R0 / 400, innerRadius: RIM.R3 / 400 }, // 0..1 of the box height, for tick rings and orbit paths
  }
  const colors = Object.fromEntries(Object.entries({ void: P.void, carbon0: P.c0, carbon1: P.c1, carbon2: P.c2, carbon3: P.c3, carbon4: P.c4, ink: P.ink, ink2: P.ink2, ink3: P.ink3, ignite1: P.i1, ignite2: P.i2, ignite3: P.i3, ti1: P.t1, ti2: P.t2, ti3: P.t3, ti4: P.t4 }))
  const tag = taglineUnits()
  const J = JSON.stringify
  return `/* @generated:begin — scripts/make-icons.mjs · do not edit */
const MARK = {
  badge: ${J(badgeFull)},
  mono: ${J(monoMarkup())},
  glow: ${J(glowLayer)},
}
const WORDMARK = { w: ${WORDMARK.w}, h: ${WORDMARK.h}, d: ${J(compactPath(WORDMARK.d, 0))} }
const TAGLINE = { cap: ${tag.cap}, desc: ${tag.desc}, main: ${J(tag.main)}, emph: ${J(tag.emph)} }

/** 0..1 coordinates are fractions of the Mark's box (square, hexagon point-to-point tall). */
export const MARK_GEOMETRY = ${J(geo, null, 2)}

export const BRAND = {
  name: 'KIND',
  tagline: 'Raising goDs. Building nations.',
  taglineCaps: 'RAISING goDs · BUILDING NATIONS',
  colors: ${J(colors)},
  metal: ${J([[0, P.t1], [0.55, P.t2], [1, mix(P.t2, P.t3, 0.55)]])},
}
/* @generated:end */`
}

const JSX_PATH = join(ROOT, 'src/art/Brand.jsx')
function brandJsx() {
  const cur = readFileSync(JSX_PATH, 'utf8')
  const a = cur.indexOf('/* @generated:begin'), b = cur.indexOf('/* @generated:end */')
  if (a < 0 || b < 0) throw new Error('Brand.jsx is missing its @generated markers')
  return Buffer.from(cur.slice(0, a) + brandBlock() + cur.slice(b + '/* @generated:end */'.length))
}
job('jsx', 'src/art/Brand.jsx', async () => brandJsx())
// ───────────────────────────────────────────────────────────────────────────
// 10 · verification — numbers, not vibes (the screenshots are the other half)
// ───────────────────────────────────────────────────────────────────────────
async function verify(results) {
  const by = Object.fromEntries(results.map((r) => [r.path, r.buf]))
  const checks = []
  const ok = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail })

  // dimensions
  const dims = {
    'public/icon-192.png': [192, 192], 'public/icon-512.png': [512, 512], 'public/icon-maskable-512.png': [512, 512],
    'public/icon-monochrome-512.png': [512, 512], 'public/apple-touch-icon.png': [180, 180], 'public/favicon-32.png': [32, 32],
    'public/og.png': [1200, 630], 'public/og-twitter.png': [1200, 600], 'store/icon-512.png': [512, 512], 'store/feature-graphic-1024x500.png': [1024, 500],
  }
  for (const [w, h, d] of SPLASH) dims[`public/splash/${splashName(w, h, d)}`] = [w * d, h * d]
  for (const [p, [w, h]] of Object.entries(dims)) {
    if (!by[p]) continue
    const m = await sharp(by[p]).metadata()
    ok(`size ${p}`, m.width === w && m.height === h, `${m.width}×${m.height}`)
  }

  // alpha: any-purpose icons keep transparent corners; full-bleed ones are opaque edge to edge
  for (const p of ['public/icon-maskable-512.png', 'public/apple-touch-icon.png', 'store/icon-512.png']) if (by[p]) { const m = await sharp(by[p]).metadata(); ok(`opaque ${p}`, !m.hasAlpha || (await sharp(by[p]).stats()).channels[3].min === 255) }
  for (const p of ['public/icon-192.png', 'public/icon-512.png']) if (by[p]) {
    const raw = await sharp(by[p]).raw().toBuffer({ resolveWithObject: true })
    const a = (x, y) => raw.data[(y * raw.info.width + x) * raw.info.channels + 3]
    ok(`transparent corners ${p}`, a(0, 0) === 0 && a(raw.info.width - 1, 0) === 0 && a(0, raw.info.height - 1) === 0, `a(0,0)=${a(0, 0)}`)
    ok(`opaque centre ${p}`, a(raw.info.width >> 1, raw.info.height >> 1) === 255)
  }

  // maskable: nothing but background (and the hex's soft shadow) outside the 80 % safe circle
  if (by['public/icon-maskable-512.png']) {
    const ref = await sharp(Buffer.from(iconSvg(512, { tile: 'full', scale: 0.0001 }))).raw().toBuffer({ resolveWithObject: true })
    const got = await sharp(by['public/icon-maskable-512.png']).raw().toBuffer({ resolveWithObject: true })
    const ch = got.info.channels, rch = ref.info.channels
    let worst = 0, bad = 0
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      if (Math.hypot(x - 255.5, y - 255.5) <= 204.8) continue
      const i = (y * 512 + x) * ch, j = (y * 512 + x) * rch
      const d = Math.max(Math.abs(got.data[i] - ref.data[j]), Math.abs(got.data[i + 1] - ref.data[j + 1]), Math.abs(got.data[i + 2] - ref.data[j + 2]))
      worst = Math.max(worst, d); if (d > 24) bad++
    }
    ok('maskable safe zone (80 % circle): no content outside', bad === 0, `worst Δ ${worst}, ${bad} px over threshold`)
  }

  // monochrome: pure white on transparent, inside Android's 61 % themed-icon safe zone
  if (by['public/icon-monochrome-512.png']) {
    const raw = await sharp(by['public/icon-monochrome-512.png']).raw().toBuffer({ resolveWithObject: true })
    const { width, channels } = raw.info
    let notWhite = 0, outside = 0, ink = 0
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const i = (y * width + x) * channels, a = raw.data[i + 3]
      if (a < 16) continue
      ink++
      if (raw.data[i] < 250 || raw.data[i + 1] < 250 || raw.data[i + 2] < 250) notWhite++
      if (Math.hypot(x - 255.5, y - 255.5) > 0.3125 * 512 + 1) outside++
    }
    ok('monochrome is white-only', notWhite === 0, `${notWhite} non-white px of ${ink}`)
    ok('monochrome inside the themed-icon safe zone', outside === 0, `${outside} px beyond r=${0.3125 * 512}`)
  }

  // favicon.ico structure
  if (by['public/favicon.ico']) {
    const b = by['public/favicon.ico']
    const n = b.readUInt16LE(4)
    const sizes = []
    let good = b.readUInt16LE(0) === 0 && b.readUInt16LE(2) === 1
    for (let i = 0; i < n; i++) {
      const o = 6 + i * 16, sz = b[o] || 256, len = b.readUInt32LE(o + 8), off = b.readUInt32LE(o + 12)
      const png = b.subarray(off, off + len)
      const m = await sharp(png).metadata()
      good = good && png.subarray(1, 4).toString() === 'PNG' && m.width === sz
      sizes.push(sz)
    }
    ok('favicon.ico holds 16/32/48 PNG frames', good && sizes.join() === '16,32,48', sizes.join('/'))
  }

  // budgets (link-preview scrapers choke on heavy images; splash files are fetched once at install)
  const kb = (p) => (by[p] ? by[p].length / 1024 : 0)
  ok('og.png ≤ 450 KB (WhatsApp/Telegram previews)', kb('public/og.png') <= 450, `${kb('public/og.png').toFixed(0)} KB`)
  ok('og-twitter.png ≤ 450 KB', kb('public/og-twitter.png') <= 450, `${kb('public/og-twitter.png').toFixed(0)} KB`)
  ok('icon.svg ≤ 12 KB', kb('public/icon.svg') <= 12, `${kb('public/icon.svg').toFixed(1)} KB`)
  ok('favicon.svg ≤ 2 KB', kb('public/favicon.svg') <= 2, `${kb('public/favicon.svg').toFixed(2)} KB`)
  const big = Object.entries(by).filter(([p]) => p.startsWith('public/splash/')).sort((a, c) => c[1].length - a[1].length)[0]
  if (big) ok('each splash ≤ 700 KB', big[1].length / 1024 <= 700, `largest ${big[0].split('/').pop()} ${(big[1].length / 1024).toFixed(0)} KB`)
  const total = Object.entries(by).filter(([p]) => p.startsWith('public/splash/')).reduce((s, [, b]) => s + b.length, 0)
  if (total) ok('splash set total ≤ 9 MB', total / 1048576 <= 9, `${(total / 1048576).toFixed(1)} MB across ${Object.keys(by).filter((p) => p.startsWith('public/splash/')).length}`)

  // Brand.jsx: colours only from tokens (+ pure white/black used as light/shade overlays), and it must parse
  if (by['src/art/Brand.jsx']) {
    const src = by['src/art/Brand.jsx'].toString('utf8')
    const blk = src.slice(src.indexOf('/* @generated:begin'), src.indexOf('/* @generated:end */'))
    const allowed = new Set([...Object.values(TOK), '#fff', '#000', '#ffffff', '#000000'])
    // titanium facet shades are interpolations along the token ramp (ti-4 → ti-3 → ti-2 → ti-1)
    const ramp = Array.from({ length: 201 }, (_, i) => rgb(metal(i / 200)))
    const onRamp = (c) => { const r = rgb(c); return ramp.some((q) => Math.max(...q.map((v, k) => Math.abs(v - r[k]))) <= 2) }
    const stray = [...new Set([...blk.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)].map((m) => m[0].toLowerCase()))].filter((c) => !allowed.has(c) && !(c.length === 7 && onRamp(c)))
    ok('Brand.jsx colours all trace to tokens.css (facet shades on the titanium ramp)', stray.length === 0, stray.join(' '))
    ok('Brand.jsx generated block ≤ 26 KB', blk.length <= 26 * 1024, `${(blk.length / 1024).toFixed(1)} KB raw, ${(gzipSync(Buffer.from(blk)).length / 1024).toFixed(1)} KB gz`)
    try {
      const esb = await import('esbuild')
      esb.transformSync(src, { loader: 'jsx' })
      ok('Brand.jsx parses as JSX', true)
    } catch (e) { ok('Brand.jsx parses as JSX', e.code === 'ERR_MODULE_NOT_FOUND', String(e.message).split('\n')[0]) }
  }

  // LISTING.md: the Play limits, counted; the brand casing; nothing private
  if (existsSync(join(STORE, 'LISTING.md'))) {
    const md = readFileSync(join(STORE, 'LISTING.md'), 'utf8')
    const block = (tag) => (md.match(new RegExp('```' + tag + '\\n([\\s\\S]*?)\\n```')) || [])[1]
    for (const [tag, max] of [['title', 30], ['short', 80], ['long', 4000], ['whatsnew', 500]]) {
      const t = block(tag)
      ok(`LISTING.md ${tag} ≤ ${max} chars`, t !== undefined && t.length <= max, t === undefined ? 'block missing' : `${t.length} chars`)
    }
    ok('LISTING.md never writes the tagline as Gods / GODS', !/Raising Gods|RAISING GODS|Raising gods/.test(md))
    ok('LISTING.md has no emoji', !/\p{Extended_Pictographic}/u.test(md))
    ok('LISTING.md does not leak the account email', !/@kidsinspiringnation\.org/i.test(md))
  }

  // no NaN ever reaches a path (opentype's own path writer has bitten us once)
  const svgs = { 'social svg': socialSvg(1200, 630), 'feature svg': featureSvg(), 'splash svg': splashSvg(390, 844), 'icon svg': iconSvg(512, { tile: 'rounded' }), 'mono svg': monoSvg(), 'favicon svg': faviconSvg() }
  for (const [k, s] of Object.entries(svgs)) ok(`no NaN in ${k}`, !/NaN|undefined/.test(s))
  if (by['src/art/Brand.jsx']) ok('no NaN/undefined in Brand.jsx', !/NaN|undefined/.test(by['src/art/Brand.jsx'].toString('utf8').replace(/typeof undefined/g, '')))

  // determinism: a second render of two assets is byte-identical
  if (by['public/icon-512.png']) ok('deterministic icon-512.png', Buffer.compare(by['public/icon-512.png'], await raster(iconSvg(512, { tile: 'rounded' }))) === 0)
  if (by['public/favicon.ico']) ok('deterministic favicon.ico', Buffer.compare(by['public/favicon.ico'], icoFile(await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await raster(faviconSvg(size)) }))))) === 0)
  return checks
}
// ───────────────────────────────────────────────────────────────────────────
// 11b · the brand board — one picture of the whole identity (store/brand-board.png), for people, not for the app
// ───────────────────────────────────────────────────────────────────────────
const _memo = new Map()
const once = (k, f) => { if (!_memo.has(k)) _memo.set(k, f()); return _memo.get(k) }
const rrect = (w, h, r, fill = '#fff') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="${fill}"/></svg>`)
const circleMask = (n) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}"><circle cx="${n / 2}" cy="${n / 2}" r="${n / 2}" fill="#fff"/></svg>`)
const masked = async (buf, n, maskBuf) => sharp(buf).resize(n, n).ensureAlpha().composite([{ input: maskBuf, blend: 'dest-in' }]).png().toBuffer()

async function boardPng() {
  const W = 2400, H = 1500
  const lab = (t, x, y, anchor = 'start', fill = P.ink3, size = 16) => textBlock(t, { weight: 600, size, tracking: 0.3, x, y, anchor, fill }).svg
  const panel = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="url(#bd-panel)" stroke="${rgba(P.t2, 0.14)}" stroke-width="1.5"/>`
  const st = starfield({ w: W, h: H, seed: 77, horizon: H * 0.85, density: 0.75, bright: 12, band: { cx: W * 0.55, cy: H * 0.3, rot: -14, len: W * 1.1, thick: H * 0.09 } })
  // the stack lockup, drawn here with the same primitives the app uses
  const mk = placeBadge({ id: 'bdm', cx: 1200, cy: 370, height: 300, halo: true })
  const wm = placeWordmark({ x0: 1200, y0: 545, capH: 170, anchor: 'middle' })
  const tg = fitTagline(wm.w, { size: 22, x: wm.left, y: 545 + 170 + 78, fill: P.ink2 })

  const items = []
  const put = (input, left, top) => items.push({ input, left: Math.round(left), top: Math.round(top) })

  // A · hero icon
  put(await raster(iconSvg(540, { tile: 'rounded' })), 160, 200)
  // C · size ladder (app-icon art ≥ 64, the dedicated favicon art below that) + masks
  let lx = 1668
  for (const [s, fav] of [[128, false], [96, false], [64, false], [48, true], [32, true], [16, true]]) {
    put(await raster(fav ? faviconSvg(s) : iconSvg(s, { tile: 'rounded', weave: false })), lx, 410 - s)
    lx += s + 22
  }
  const maskable = await raster(iconSvg(512, { tile: 'full', scale: 0.98 }))
  const mono = await raster(monoSvg(512, '#ffffff'))
  put(await masked(maskable, 132, circleMask(132)), 1668, 560)
  put(await masked(maskable, 132, rrect(132, 132, 44)), 1830, 560)
  put(await masked(maskable, 132, rrect(132, 132, 16)), 1992, 560)
  // themed icon: the monochrome art tinted by the system
  const tint = async (fg, bg) => {
    const monoN = await sharp(mono).resize(132, 132).png().toBuffer()
    const sil = await sharp({ create: { width: 132, height: 132, channels: 4, background: fg } }).composite([{ input: monoN, blend: 'dest-in' }]).png().toBuffer()
    return sharp(rrect(132, 132, 66, bg)).composite([{ input: sil }]).png().toBuffer()
  }
  put(await tint(P.tele, P.c3), 2154, 560)
  // C2 · the maskable safe zone, and the favicon in a tab (dark + light)
  put(await sharp(maskable).resize(210, 210).png().toBuffer(), 1668, 650)
  put(await raster(faviconSvg(16)), 1982, 684)
  put(await raster(faviconSvg(16)), 1982, 774)
  const tabs = `<g>
    <path fill-rule="evenodd" d="M1668 650h210v210h-210zM1773 755m-84 0a84 84 0 1 0 168 0a84 84 0 1 0 -168 0z" fill="#000" fill-opacity=".62"/>
    <circle cx="1773" cy="755" r="84" fill="none" stroke="${P.tele}" stroke-opacity=".8" stroke-dasharray="6 5" stroke-width="1.6"/>
    ${lab('80 % SAFE CIRCLE', 1773, 884, 'middle', P.ink3, 14)}
    <rect x="1950" y="664" width="330" height="62" rx="14" fill="#202124"/><rect x="1966" y="676" width="230" height="38" rx="10" fill="#35363a"/>
    <rect x="1950" y="754" width="330" height="62" rx="14" fill="#dee1e6"/><rect x="1966" y="766" width="230" height="38" rx="10" fill="#ffffff"/>
    ${textBlock('KIND — Daily Family Devotional', { weight: 600, size: 15, x: 2008, y: 701, fill: '#e8eaed' }).svg}
    ${textBlock('KIND — Daily Family Devotional', { weight: 600, size: 15, x: 2008, y: 791, fill: '#202124' }).svg}
    ${lab('FAVICON · 16 PX · DARK AND LIGHT TABS', 2115, 884, 'middle', P.ink3, 14)}
  </g>`
  // D · a home screen: the icon among quiet neighbours (generic shapes, no real apps)
  const hsX = 130, hsY = 1000
  const neighbours = [P.c3, P.c4, mix(P.c4, P.tele2, 0.25), P.c3, mix(P.c3, P.t3, 0.3), P.c4, mix(P.c4, P.t3, 0.25), P.c3, mix(P.c3, P.tele2, 0.2), P.c4, P.c3]
  let ni = 0
  const homeIcons = []
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
    const x = hsX + 52 + c * 164, y = hsY + 70 + r * 196
    if (r === 0 && c === 2) { put(await raster(iconSvg(116, { tile: 'rounded', weave: false })), x, y); homeIcons.push(lab('KIND', x + 58, y + 150, 'middle', P.ink, 17)); continue }
    const tone = neighbours[ni++ % neighbours.length]
    const g = (ni % 3 === 0) ? `<circle cx="58" cy="58" r="20" fill="none" stroke="${P.ink4}" stroke-width="5"/>` : (ni % 3 === 1) ? `<rect x="40" y="40" width="36" height="36" rx="8" fill="${P.ink4}"/>` : `<path d="M36 76L58 36L80 76Z" fill="${P.ink4}"/>`
    put(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="116" height="116"><defs><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(tone, '#ffffff', 0.05)}"/><stop offset="1" stop-color="${mix(tone, P.void, 0.5)}"/></linearGradient></defs><rect width="116" height="116" rx="26" fill="url(#n)"/>${g}</svg>`), x, y)
    homeIcons.push(lab('APP', x + 58, y + 150, 'middle', P.ink4, 15))
  }
  // E · social + store art
  put(await sharp(await once('og', () => raster(socialSvg(1200, 630), { grain: true, palette: true }))).resize(590, 310).png().toBuffer(), 1092, 1034)
  put(await sharp(await once('fg', () => raster(featureSvg(1024, 500), { grain: true }))).resize(590, 288).png().toBuffer(), 1708, 1034)
  // palette
  const chips = [[P.c0, 'carbon-0'], [P.c2, 'carbon-2'], [P.c4, 'carbon-4'], [P.t1, 'ti-1'], [P.t3, 'ti-3'], [P.i1, 'ignite-1'], [P.i2, 'ignite-2'], [P.i3, 'ignite-3'], [P.g1, 'gold-1'], [P.tele, 'tele']]
  const chipSvg = chips.map(([c, n], i) => `<rect x="${1092 + i * 124}" y="1372" width="108" height="30" rx="8" fill="${c}" stroke="${rgba(P.t2, 0.25)}" stroke-width="1"/>${lab(n.toUpperCase(), 1092 + i * 124 + 54, 1422, 'middle', P.ink4, 11)}`).join('')

  const hdr = placeWordmark({ x0: 160, y0: 74, capH: 28, fill: P.ink })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>${sky({ id: 'bd', w: W, h: H })}${st.defs}${mk.defs}${WM_DEFS}
      <linearGradient id="bd-panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.c2}" stop-opacity=".55"/><stop offset="1" stop-color="${P.c1}" stop-opacity=".7"/></linearGradient>
      <radialGradient id="bd-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${P.i2}" stop-opacity=".16"/><stop offset="1" stop-color="${P.i2}" stop-opacity="0"/></radialGradient>
      <linearGradient id="bd-wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(P.c1, P.tele2, 0.18)}"/><stop offset="1" stop-color="${P.c0}"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bd-g)"/>${st.body}
    <ellipse cx="430" cy="480" rx="520" ry="420" fill="url(#bd-glow)"/>
    ${panel(80, 150, 700, 760)}${panel(820, 150, 760, 760)}${panel(1620, 150, 700, 760)}${panel(80, 950, 940, 480)}${panel(1060, 950, 1260, 480)}
    <rect x="${hsX}" y="${hsY}" width="840" height="410" rx="34" fill="url(#bd-wall)" stroke="${rgba(P.t2, 0.12)}"/>
    ${hdr.svg}${lab('IDENTITY  ·  V7 ASCENT  ·  GENERATED FROM CODE', 160 + hdr.w + 36, 92, 'start', P.ink3, 17)}${lab('NODE SCRIPTS/MAKE-ICONS.MJS', 2320, 92, 'end', P.ink4, 17)}
    ${lab('APP ICON  ·  512  ·  PUBLIC/ICON.SVG', 430, 880, 'middle')}${lab('LOCKUP  ·  MARK + KIND + TAGLINE', 1200, 880, 'middle')}${lab('SIZES  ·  128 96 64 / FAVICON ART 48 32 16', 1970, 232, 'middle')}
    ${lab('MASKS  ·  CIRCLE · SQUIRCLE · ROUNDED · THEMED', 1970, 528, 'middle')}${lab('THE BADGE ON A HOME SCREEN', 550, 990, 'middle')}
    ${lab('OG  1200×630', 1092, 1010)}${lab('PLAY FEATURE GRAPHIC  1024×500', 1708, 1010)}
    ${mk.body}${wm.svg}${tg.svg}${tabs}${homeIcons.join('')}${chipSvg}
  </svg>`
  const base = await sharp(Buffer.from(svg)).png().toBuffer()
  const grain = await grainTile()
  return sharp(base).composite([...items, { input: grain, tile: true, blend: 'soft-light' }]).png({ compressionLevel: 9 }).toBuffer()
}
job('board', 'store/brand-board.png', () => boardPng())
// ───────────────────────────────────────────────────────────────────────────
// 12 · Play screenshots — frame raw captures of the real app (run with --screenshots)
// ───────────────────────────────────────────────────────────────────────────
// raw/NN-slug.png → play/NN-slug.png.  Whole device in frame, caption above, starfield + horizon behind. No invented UI: the
// screen is the raw capture, untouched except for the rounded-corner mask.
async function frameScreenshot(rawBuf, caption, index = 0) {
  const meta = await sharp(rawBuf).metadata()
  const tablet = meta.width / meta.height > 0.62
  const W = tablet ? 1600 : 1080, H = tablet ? 2560 : 1920
  const k = W / 1080
  const capSize = 118 * k
  // caption: shrink to fit 86 % of the width, never above two lines' worth of height
  let cap = textBlock(caption, { weight: 700, size: capSize, x: W / 2, y: 0, anchor: 'middle' })
  const maxW = W * 0.86
  const fit = cap.width > maxW ? capSize * (maxW / cap.width) : capSize
  const capY = 250 * k
  cap = textBlock(caption, { weight: 700, size: fit, x: W / 2, y: capY, anchor: 'middle', fill: P.ink })
  const sub = textBlock('KIND  ·  DAILY FAMILY DEVOTIONAL', { weight: 600, size: 24 * k, tracking: 0.36, x: W / 2, y: capY - fit * 0.7 - 44 * k, anchor: 'middle', fill: P.ink3 })

  const bez = 14 * k, r = (tablet ? 56 : 84) * k
  const devTop = 360 * k, devBottom = H - 72 * k
  const screenH = devBottom - devTop - 2 * bez
  const screenW = Math.round((screenH * meta.width) / meta.height)
  const devW = screenW + 2 * bez, devH = screenH + 2 * bez
  const devX = Math.round((W - devW) / 2)
  const st = starfield({ w: W, h: H, seed: 40 + index, horizon: H * 0.85, density: 0.9, bright: 6 })
  const lm = limb({ id: 'sh', w: W, h: H, top: H * 0.9, r: W * 1.6, sunX: W * (0.3 + 0.4 * ((index * 0.37) % 1)), glow: 0.8, lights: false })
  const base = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>${sky({ id: 'sh', w: W, h: H })}${st.defs}${lm.defs}
      <filter id="sh-shadow" x="-20%" y="-10%" width="140%" height="130%"><feGaussianBlur stdDeviation="${f2(34 * k)}"/></filter>
      <linearGradient id="sh-bezel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.t3}"/><stop offset=".5" stop-color="${P.c3}"/><stop offset="1" stop-color="${P.t3}"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#sh-g)"/>${st.body}${lm.body}
    <g filter="url(#sh-shadow)" opacity=".8"><rect x="${devX}" y="${devTop + 30 * k}" width="${devW}" height="${devH}" rx="${r + bez}" fill="#000"/></g>
    <rect x="${devX}" y="${devTop}" width="${devW}" height="${devH}" rx="${r + bez}" fill="url(#sh-bezel)"/>
    <rect x="${devX + 1}" y="${devTop + 1}" width="${devW - 2}" height="${devH - 2}" rx="${r + bez - 1}" fill="#000"/>
    ${sub.svg}${cap.svg}
  </svg>`
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${screenW}" height="${screenH}"><rect width="${screenW}" height="${screenH}" rx="${r}" fill="#fff"/></svg>`)
  const screen = await sharp(rawBuf).resize(screenW, screenH, { fit: 'fill' }).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  const rim = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${devX + 0.75}" y="${devTop + 0.75}" width="${devW - 1.5}" height="${devH - 1.5}" rx="${r + bez - 0.75}" fill="none" stroke="${P.t1}" stroke-opacity=".5" stroke-width="2"/></svg>`)
  const frame = await sharp(Buffer.from(base)).png().toBuffer()
  const grain = await grainTile()
  return sharp(frame)
    .composite([{ input: screen, left: devX + Math.round(bez), top: Math.round(devTop + bez) }, { input: rim, left: 0, top: 0 }, { input: grain, tile: true, blend: 'soft-light' }])
    .png({ compressionLevel: 9 }).toBuffer()
}

async function frameScreenshots() {
  const arg = (ARGS.find((a) => a.startsWith('--screenshots=')) || '').slice(14)
  const rawDir = arg ? resolve(arg) : join(STORE, 'screenshots/raw'), outDir = arg ? join(resolve(arg), '../framed') : join(STORE, 'screenshots/play')
  mkdirSync(outDir, { recursive: true })
  const capFile = join(STORE, 'screenshots/captions.json')
  const caps = existsSync(capFile) ? JSON.parse(readFileSync(capFile, 'utf8')) : {}
  const files = existsSync(rawDir) ? readdirSync(rawDir).filter((f) => f.toLowerCase().endsWith('.png')).sort() : []
  if (!files.length) { console.log('no raw screenshots in store/screenshots/raw — capture them first (see store/LISTING.md)'); return }
  let i = 0
  for (const f of files) {
    const slug = f.replace(/\.png$/i, '')
    const caption = caps[slug] || slug.replace(/^\d+-/, '').replace(/-/g, ' ')
    const out = await frameScreenshot(readFileSync(join(rawDir, f)), caption, i++)
    writeFileSync(join(outDir, f), out)
    const m = await sharp(out).metadata()
    console.log(`  ✎ ${relative(ROOT, join(outDir, f)).split('\\').join('/')}  ${m.width}×${m.height}  "${caption}"`)
  }
}
// ───────────────────────────────────────────────────────────────────────────
// 11 · run
// ───────────────────────────────────────────────────────────────────────────
const sha = (b) => createHash('sha256').update(b).digest('hex')
async function main() {
  const t0 = Date.now()
  const todo = JOBS.filter((j) => want(j.group))
  const results = new Array(todo.length)
  let next = 0
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < todo.length) {
      const i = next++
      const t = Date.now()
      results[i] = { ...todo[i], buf: await todo[i].make(), ms: Date.now() - t }
    }
  }))

  let changed = 0
  const rows = []
  for (const r of results) {
    const abs = join(ROOT, r.path)
    const had = existsSync(abs)
    const same = had && sha(readFileSync(abs)) === sha(r.buf)
    if (!same) changed++
    if (!CHECK && !same) { mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, r.buf) }
    rows.push(`${same ? '  =' : CHECK ? '  ≠' : '  ✎'} ${r.path.padEnd(54)} ${(r.buf.length / 1024).toFixed(1).padStart(8)} KB  ${String(r.ms).padStart(6)} ms`)
  }
  console.log(rows.join('\n'))

  const checks = await verify(results)
  const failed = checks.filter((c) => !c.pass)
  console.log('\n' + checks.map((c) => `${c.pass ? '  ✓' : '  ✗'} ${c.name}${c.detail ? '  — ' + c.detail : ''}`).join('\n'))
  console.log(`\n${results.length} files, ${changed} ${CHECK ? 'differ from disk' : 'written'}, ${checks.length - failed.length}/${checks.length} checks passed, ${((Date.now() - t0) / 1000).toFixed(1)} s`)

  if (DEV) await devSheets(results)
  if (failed.length || (CHECK && changed)) process.exit(1)
}

// review sheets (store/_work/out) — only with --dev
async function devSheets(results) {
  const OUT = join(STORE, '_work/out'); mkdirSync(OUT, { recursive: true })
  const get = (p) => results.find((r) => r.path === p)?.buf
  const tiles = []; let x = 0
  const icon = get('public/icon-512.png')
  if (icon) {
    tiles.push({ input: icon, left: 0, top: 0 }); x = 530
    for (const s of [192, 96, 64, 48, 32, 16]) { tiles.push({ input: await sharp(icon).resize(s).png().toBuffer(), left: x, top: 0 }); x += s + 14 }
    const fav = [16, 32, 48, 64].map((s) => sharp(Buffer.from(faviconSvg(s))).png().toBuffer())
    let fx = 530
    for (const p of await Promise.all(fav)) { const m = await sharp(p).metadata(); tiles.push({ input: p, left: fx, top: 300 }); fx += m.width + 14 }
    for (const [name, bg] of [['public/icon-maskable-512.png', null], ['public/icon-monochrome-512.png', '#555']]) {
      const b = get(name); if (!b) continue
      let img = sharp(b).resize(160); if (bg) img = img.flatten({ background: bg })
      tiles.push({ input: await img.png().toBuffer(), left: 530 + (name.includes('mono') ? 180 : 0), top: 352 })
    }
    await sharp({ create: { width: Math.max(x, 1100), height: 520, channels: 4, background: '#2a2a2a' } }).composite(tiles).png().toFile(join(OUT, 'sheet.png'))
  }
}

if (ARGS.some((a) => a.startsWith('--screenshots'))) await frameScreenshots()
else await main()
