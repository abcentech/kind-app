// KIND v7 "Ascent" icons — one hand-built family.
//   import { Icon, ICON_NAMES, ICON_GROUPS } from './icons.jsx'
//   <Icon.flame size={24} weight="solid" />   <Icon name="flame" />   (size 16 · 20 · 24 · 32; weight 'line' | 'duo' | 'solid')
//   Decorative by default (aria-hidden). Pass `title` to make it an img with an accessible name. Colour is currentColor.
//   Unknown names render a boxed "?" and warn once; they never throw. Old v6 names (vault, quests, chevron…) are aliased.
// 24 grid · 1.75 stroke · round caps/joins · live area 2..22 · currentColor.
//
// Language (so new glyphs stay in the family):
//   · Geometry is generated, not eyeballed: 45° / 30° diagonals only, circles on the r=9 keyline, 3.5u between parallel strokes.
//   · The chamfer: plates that read as hardware cut TL + BR at 45° (matches --clip-cut); everything else stays round.
//   · An LED is a zero-length round-cap stroke (dot). Tick marks are telemetry; they appear on instruments only.
//   · Three weights from one drawing: line = strokes · duo = line + 18 % fill under closed shapes · solid = fill+stroke of the
//     same outline (identical silhouette to line) with the inner detail knocked *through* the fill (a real mask — it stays
//     transparent on any background, no "carbon colour" hacks).
//   · Optical sizing: the stroke is scaled so a glyph keeps its weight at 16/20/24/32 instead of shrinking with the box.
//
// Def schema (all values are SVG path data on the 24 grid):
//   o   closed outlines — stroked in line, tinted in duo, filled in solid
//   d   detail strokes  — stroked in line/duo, knocked out of the fill in solid
//   i   ink strokes     — stroked in every weight (antennas, ribbons, exhaust)
//   bk  back layer(s)   — a path, or an array of closed paths drawn rear-to-front. Each is hidden wherever anything in front of it
//                         (later layers, then `o`) overlaps it, with a halo of `bg` (default 4.6) — cards, people, a ring behind a planet
//   x   overlay         — stroked on top with a halo (`xw`, default 4.6) cut out of everything beneath (the "slash" of off-states, a ring crossing a planet)
//   t   track strokes — a faint full ring/arc behind the line, duo only (Apple-rings style)
//   s   solid shape override · k solid knock-out strokes · kf solid knock-out *filled* shapes · sw solid stroke · u duo fill override
//   si  solid ink override ('' = none) · eo  even-odd fill (shapes with holes) · r  rotate the drawing about the centre
//   lo  an override object merged over the glyph at ≤ 20 px: the same silhouette with fewer parts (a fan of 3 cards becomes 2)
import { memo, useId } from 'react'

/* ───────────────────────────── geometry helpers ───────────────────────────── */
const r2 = (n) => Math.round(n * 100) / 100
const rad = (d) => (d * Math.PI) / 180
// Angles: 0° = 12 o'clock, clockwise positive (how a designer reads a dial).
const pt = (cx, cy, r, a) => [cx + r * Math.sin(rad(a)), cy - r * Math.cos(rad(a))]
const P = ([x, y]) => `${r2(x)} ${r2(y)}`
const circle = (cx, cy, r) => `M${r2(cx - r)} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0z`
const arc = (cx, cy, r, a0, a1) =>
  `M${P(pt(cx, cy, r, a0))}A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${P(pt(cx, cy, r, a1))}`
const poly = (pts, close = true) => 'M' + pts.map(P).join('L') + (close ? 'z' : '')
const dot = (x, y) => `M${x} ${y}h.01`                       // an LED: 1.75 round
const ticks = (cx, cy, r0, r1, angles) => angles.map((a) => `M${P(pt(cx, cy, r0, a))}L${P(pt(cx, cy, r1, a))}`).join('')
const ngon = (cx, cy, r, n, rot = 0) => poly(Array.from({ length: n }, (_, i) => pt(cx, cy, r, rot + (i * 360) / n)))
// A bold dot. Not a tiny circle: a circle with r < half the stroke inverts its inner offset and punches a pinhole.
// A small octagon strokes solid at every size and still reads round.
const disc = (x, y, r = 0.7) => ngon(x, y, r, 8, 22.5)
const star = (cx, cy, R, r, n = 5, rot = 0) => poly(Array.from({ length: n * 2 }, (_, i) => pt(cx, cy, i % 2 ? r : R, rot + (i * 180) / n)))
// Rounded / chamfered rectangle, clockwise from top-left. Corner value: >0 radius · <0 chamfer · 0 square.
const plate = (x, y, w, h, a = 0, b = a, c = a, d = a) => {
  const X = x + w, Y = y + h, m = Math.abs
  const k = (r, ex, ey) => (r > 0 ? `A${r} ${r} 0 0 1 ${ex} ${ey}` : `L${ex} ${ey}`)
  return `M${x + m(a)} ${y}H${X - m(b)}${k(b, X, y + m(b))}V${Y - m(c)}${k(c, X - m(c), Y)}H${x + m(d)}${k(d, x, Y - m(d))}V${y + m(a)}${k(a, x + m(a), y)}z`
}
// The app's signature plate: TL + BR chamfer (as --clip-cut), TR + BL softly rounded.
const cutPlate = (x, y, w, h, c = 3, r = 2.2) => plate(x, y, w, h, -c, r, -c, r)
// A chamfer-only plate (TL + BR cut) as points, rotated by deg about (px,py): the cards of a fanned deck.
const cardPts = (x, y, w, h, c, deg = 0, px = x + w / 2, py = y + h) => {
  const a = rad(deg), co = Math.cos(a), si = Math.sin(a)
  return [[x + c, y], [x + w, y], [x + w, y + h - c], [x + w - c, y + h], [x, y + h], [x, y + c]]
    .map(([qx, qy]) => [px + (qx - px) * co - (qy - py) * si, py + (qx - px) * si + (qy - py) * co])
}
// Elliptical arc by parametric angle (deg, +x axis, clockwise on screen), tilted by rot.
const ellipseArc = (cx, cy, rx, ry, rot, t0, t1) => {
  const c = Math.cos(rad(rot)), s = Math.sin(rad(rot))
  const p = (t) => { const x = rx * Math.cos(rad(t)), y = ry * Math.sin(rad(t)); return [cx + x * c - y * s, cy + x * s + y * c] }
  return `M${P(p(t0))}A${rx} ${ry} ${rot} ${Math.abs(t1 - t0) > 180 ? 1 : 0} ${t1 > t0 ? 1 : 0} ${P(p(t1))}`
}
const ep = (cx, cy, rx, ry, rot, t) => {
  const c = Math.cos(rad(rot)), sn = Math.sin(rad(rot)), x = rx * Math.cos(rad(t)), y = ry * Math.sin(rad(t))
  return [cx + x * c - y * sn, cy + x * sn + y * c]
}
// Stitching: the middle stretch of every edge of an n-gon (a hex "merrow" border).
const stitch = (cx, cy, r, n, a = 0.24, b = 0.76) => Array.from({ length: n }, (_, i) => {
  const p = pt(cx, cy, r, (i * 360) / n), q = pt(cx, cy, r, ((i + 1) * 360) / n), L = (t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
  return `M${P(L(a))}L${P(L(b))}`
}).join('')
// Chevron head: tip (x,y), travelling toward heading h (0 = up, clockwise).
const head = (x, y, h, len = 4.4, spread = 44) => {
  const w = (s) => [x - len * Math.sin(rad(h + s)), y + len * Math.cos(rad(h + s))]
  return `M${P(w(spread))}L${r2(x)} ${r2(y)}L${P(w(-spread))}`
}
// A tooth-and-root gear: n teeth, tip radius ro, root radius ri.
const gear = (cx, cy, n, ro, ri) => {
  const st = 360 / n; let d = ''
  for (let i = 0; i < n; i++) {
    const a = i * st
    const q = [pt(cx, cy, ri, a - st * 0.27), pt(cx, cy, ro, a - st * 0.15), pt(cx, cy, ro, a + st * 0.15), pt(cx, cy, ri, a + st * 0.27)]
    d += (i ? 'L' : 'M') + P(q[0]) + 'L' + P(q[1]) + 'L' + P(q[2]) + 'L' + P(q[3]) + `A${ri} ${ri} 0 0 1 ${P(pt(cx, cy, ri, a + st - st * 0.27))}`
  }
  return d.replace(/A[^A]*$/, '') + 'z'
}
// A person: round head + shouldered torso (closed). cx/cy = head centre.
const person = (cx, cy, hr, bw, top, bottom) =>
  circle(cx, cy, hr) + `M${r2(cx - bw)} ${bottom}C${r2(cx - bw)} ${r2(top + (bottom - top) * 0.25)} ${r2(cx - bw * 0.55)} ${top} ${cx} ${top}S${r2(cx + bw)} ${r2(top + (bottom - top) * 0.25)} ${r2(cx + bw)} ${bottom}z`

/* ─────────────────────────────── the drawings ─────────────────────────────── */
const G = {
  /* ── navigation — the five hero glyphs ── */
  learn: { o: ngon(6.2, 17.9, 3.3, 6) + circle(18.1, 6, 2.9), bk: 'M6.2 14.4C6.2 9.2 9.6 6 15.1 6', i: dot(18.1, 6), k: dot(6.2, 17.9), bg: 4.4 },
  objectives: { o: disc(12, 12, 0.6), i: arc(12, 12, 8.7, 0, 300) + arc(12, 12, 4.9, 0, 210), t: circle(12, 12, 8.7) + circle(12, 12, 4.9), s: circle(12, 12, 1.5), sw: 2.5 },
  shorts: { o: cutPlate(6.2, 2.8, 11.6, 18.4, 3.2, 2.4), d: poly([[10.3, 8.6], [10.3, 14.6], [15.2, 11.6]]) + 'M9.6 17.6H14.4' },
  locker: {
    // A deck seen from its corner: three chamfered cards stepping up-right, the front one stamped with a hex facet.
    o: poly(cardPts(3.6, 8, 10.4, 13, 2.6)),
    bk: [poly(cardPts(9.8, 2.6, 10.4, 13, 2.6)), poly(cardPts(6.7, 5.3, 10.4, 13, 2.6))],
    d: ngon(8.8, 14.6, 2.5, 6), bg: 5,
    lo: { bk: [poly(cardPts(7.4, 4.4, 10.4, 13, 2.6))], d: ngon(8.8, 14.6, 2.3, 6), bg: 5 },   // 16–20 px: two cards, the third would fuse
  },
  me: {
    // Pilot bust. The visor is the *negative* space between a chord and a chamfered sill whose ends sit on the helmet rim,
    // so there are no slivers to fuse at 24 px. Solid knocks the same region out.
    o: circle(12, 8.7, 5.9) + 'M3.8 21.2C4.4 18.8 6.4 17.8 9 17.8H15C17.6 17.8 19.6 18.8 20.2 21.2Z',
    d: 'M6.5 6.7H17.5M6.2 9.6L8.5 11.9H15.5L17.8 9.6',
    kf: 'M6.9 7.1H17.1L17.6 9.6 15.3 11.5H8.7L6.4 9.6Z', kw: 0.6, k: '',
  },

  /* ── status & reward ── */
  flame: {
    o: 'M13.2 2.6C13.6 6.2 19 8.8 19 14.2 19 18.2 15.9 21.2 12 21.2 8.1 21.2 5 18.4 5 14.6 5 11.8 6.4 10.2 7.6 8.8 8 10.6 8.9 11.5 9.9 11.7 9.2 8.4 10.8 5.2 13.2 2.6Z',
    d: 'M12 17.8C10.3 17.8 9.2 16.7 9.2 15.2 9.2 13.7 10.7 12.8 12 11 13.3 12.8 14.8 13.7 14.8 15.2 14.8 16.7 13.7 17.8 12 17.8Z',
  },
  bolt: { o: poly([[13.6, 2.6], [5.4, 13.4], [11.2, 13.4], [9.8, 21.4], [18.6, 10.2], [12.8, 10.2]]) },
  shield: { o: 'M12 2.9L19.4 5.6V11.4C19.4 16.2 16.3 19.6 12 21.2 7.7 19.6 4.6 16.2 4.6 11.4V5.6Z', d: 'M12 3V21' },
  chest: {
    // Supply crate: faceted lid, a seam, and a hex latch seated in a recess across the join (the halo is the recess).
    o: 'M3.6 11.1V8.3L6.4 4.1H17.6L20.4 8.3V11.1Z' + plate(3.6, 11.1, 16.8, 9.4, 0, 0, 2.4, 2.4),
    x: ngon(12, 11.1, 2.6, 6) + dot(12, 11.1), k: 'M3.6 11.1H20.4',
  },
  rocket: {
    // Slender orbital stack, not a toy: ogive fairing, stage seam, a KIND roundel dot, swept fins, three plumes.
    o: 'M12 2.4C13.5 4.2 14.7 6.6 14.7 9.6V17.2H9.3V9.6C9.3 6.6 10.5 4.2 12 2.4Z' + 'M9.3 12.4L5.6 16.8V19.4L9.3 17.2Z' + 'M14.7 12.4L18.4 16.8V19.4L14.7 17.2Z',
    d: 'M9.3 7.6H14.7' + dot(12, 11.2), i: 'M12 19.6V21.5M9.8 19.6V20.6M14.2 19.6V20.6',
  },
  star: { o: star(12, 12.6, 9.4, 4.2) },
  trophy: {
    o: 'M7.2 3.6H16.8V9.4C16.8 12 14.7 14.1 12 14.1 9.3 14.1 7.2 12 7.2 9.4Z' + plate(7.6, 17.6, 8.8, 3.4, 1.2),
    i: 'M7.2 5.6H4.3V7.4C4.3 9.6 5.6 10.8 7.5 11.1M16.8 5.6H19.7V7.4C19.7 9.6 18.4 10.8 16.5 11.1M12 14.1V17.6', d: 'M10.2 6.9V9.2',
  },
  flag: { o: 'M5.5 3.8H19L16.4 8.2 19 12.6H5.5Z', i: 'M5.5 12.6V20.8' },
  lock: {
    o: cutPlate(5, 10.4, 14, 10.6, 2.6, 2.2), i: 'M8.2 10.4V7.4a3.8 3.8 0 0 1 7.6 0V10.4', d: 'M12 14.4V17.2',
  },
  unlock: { o: cutPlate(5, 10.4, 14, 10.6, 2.6, 2.2), i: 'M8.2 10.4V7.4a3.8 3.8 0 0 1 7.2-1.7', d: 'M12 14.4V17.2' },
  check: { i: 'M4.8 12.6L9.8 17.4 19.2 6.8', sw: 2.6 },
  checkCircle: { o: circle(12, 12, 9), d: 'M7.9 12.4L10.8 15.3 16.2 9' },
  close: { i: 'M6 6L18 18M18 6L6 18', sw: 2.5 },
  medal: { o: circle(12, 14.8, 6.1), i: 'M7.4 2.8L10.2 8.9M16.6 2.8L13.8 8.9', d: star(12, 15, 3.1, 1.4), kf: star(12, 15, 2.4, 1) },
  card: { o: cutPlate(5.4, 3, 13.2, 18, 3, 2.2), d: circle(12, 9, 2.2) + 'M8.8 14.6H15.2M8.8 17.6H12.6' },
  patch: { o: ngon(12, 12, 9.6, 6), d: stitch(12, 12, 5.6, 6) + dot(12, 12) },
  target: { o: circle(12, 12, 6.8), i: ticks(12, 12, 3.6, 9.7, [0, 90, 180, 270]) + disc(12, 12, 0.6), k: circle(12, 12, 3.2) },
  sparkle: {
    o: 'M11 4C11.6 9.4 13.6 11.4 19 12 13.6 12.6 11.6 14.6 11 20 10.4 14.6 8.4 12.6 3 12 8.4 11.4 10.4 9.4 11 4Z' + 'M19 2.8C19.2 4.6 19.8 5.2 21.6 5.4 19.8 5.6 19.2 6.2 19 8 18.8 6.2 18.2 5.6 16.4 5.4 18.2 5.2 18.8 4.6 19 2.8Z',
  },
  crown: { o: 'M4.2 17.1L3.2 7.1 8.6 11.1 12 4.7 15.4 11.1 20.8 7.1 19.8 17.1Z', i: 'M4.8 20.3H19.2' },
  heart: { o: 'M12 20.2L4.7 12.7C2.7 10.6 3 7.2 5.3 5.7 7.4 4.3 10.1 4.9 12 7.3 13.9 4.9 16.6 4.3 18.7 5.7 21 7.2 21.3 10.6 19.3 12.7Z' },
  gift: {
    o: plate(3.4, 7.6, 17.2, 4.2, 1.4) + plate(4.8, 11.8, 14.4, 9.2, 0, 0, 2.2, 2.2), d: 'M12 7.6V21',
    i: 'M12 7.4C9.6 7.4 7.6 6.6 7.6 5 7.6 3.9 8.6 3.4 9.6 3.6 11 3.9 11.8 5.4 12 7.4 12.2 5.4 13 3.9 14.4 3.6 15.4 3.4 16.4 3.9 16.4 5 16.4 6.6 14.4 7.4 12 7.4Z',
  },
  key: { o: circle(7.6, 16.4, 3.5), i: 'M10.1 13.9L20.4 3.6M17.2 6.8L19.6 9.2M14.4 9.6L16.3 11.5', sw: 2.3 },

  /* ── arrows & controls ── */
  chevronRight: { i: 'M9 5L16 12 9 19' }, chevronLeft: { i: 'M15 5L8 12 15 19' },
  chevronUp: { i: 'M5 15L12 8 19 15' }, chevronDown: { i: 'M5 9L12 16 19 9' },
  arrowRight: { i: 'M4.5 12H19.5M13.5 6L19.5 12 13.5 18' }, arrowLeft: { i: 'M19.5 12H4.5M10.5 6L4.5 12 10.5 18' },
  arrowUp: { i: 'M12 19.5V4.5M6 10.5L12 4.5 18 10.5' }, arrowDown: { i: 'M12 4.5V19.5M6 13.5L12 19.5 18 13.5' },
  plus: { i: 'M12 4.8V19.2M4.8 12H19.2', sw: 2.5 }, minus: { i: 'M4.8 12H19.2', sw: 2.5 },
  more: { i: disc(5.6, 12) + disc(12, 12) + disc(18.4, 12) },
  search: { o: circle(10.6, 10.6, 6.6), i: 'M15.6 15.6L20.4 20.4', d: 'M8 8.8A3.2 3.2 0 0 1 10.4 7.3' },
  filter: { o: 'M3.8 4.7H20.2L14.2 12.1V18.7L9.8 20.5V12.1Z' },
  info: { o: circle(12, 12, 9), d: 'M12 11V16.6M12 7.6h.01' },
  warning: { o: poly([[12, 3.6], [21.4, 20], [2.6, 20]]), d: 'M12 10V14.4M12 17.1h.01' },
  help: { o: circle(12, 12, 9), d: 'M9.4 9.6a2.7 2.7 0 1 1 4.1 2.3c-1 .7-1.5 1.2-1.5 2.4M12 17.2h.01' },
  refresh: { i: arc(12, 12, 7.6, 28, 332) + head(...pt(12, 12, 7.6, 332), 62, 4.8) },
  undo: { i: 'M9.6 5.2L5.2 9.6 9.6 14M5.2 9.6H14.6a4.8 4.8 0 0 1 0 9.6H9.4' },
  trash: { o: 'M6.4 6.4L7.4 18.8 9 21H15L16.6 18.8 17.6 6.4Z', i: 'M4.4 6.4H19.6M9.4 6.4V4.2H14.6V6.4', d: 'M10.2 10.2V17M13.8 10.2V17' },
  copy: { o: cutPlate(8.4, 7.6, 12, 13.2, 3, 2.2), bk: 'M15.2 7.6V5.6a2 2 0 0 0-2-2H5.6a2 2 0 0 0-2 2V13.2a2 2 0 0 0 2 2H8' },
  link: { i: 'M9.5 14.5a4 4 0 0 1 0-5.7l3.2-3.2a4 4 0 0 1 5.7 5.7L16.6 13M14.5 9.5a4 4 0 0 1 0 5.7l-3.2 3.2a4 4 0 0 1-5.7-5.7L7.4 11' },
  external: { i: 'M10.6 4.6H6.4a2 2 0 0 0-2 2V17.6a2 2 0 0 0 2 2H17.6a2 2 0 0 0 2-2V13.4M14 4.2H19.8V10M19.6 4.4L10.4 13.6' },
  share: { i: 'M12 15V3.8M8.2 7.4L12 3.6 15.8 7.4M8.6 10.4H7a2.4 2.4 0 0 0-2.4 2.4V18.6A2.4 2.4 0 0 0 7 21H17a2.4 2.4 0 0 0 2.4-2.4V12.8A2.4 2.4 0 0 0 17 10.4H15.4' },
  download: { i: 'M12 4V15M7.6 10.8L12 15.2 16.4 10.8M4.6 15.6V18.4a2.2 2.2 0 0 0 2.2 2.2H17.2a2.2 2.2 0 0 0 2.2-2.2V15.6' },
  upload: { i: 'M12 15.2V4M7.6 8.4L12 4 16.4 8.4M4.6 15.6V18.4a2.2 2.2 0 0 0 2.2 2.2H17.2a2.2 2.2 0 0 0 2.2-2.2V15.6' },
  settings: { o: gear(12, 12, 8, 9.1, 7.3) + circle(12, 12, 3), eo: 1 },
  sliders: { i: 'M3.5 6H10.8M15.2 6H20.5M3.5 12H5.8M10.2 12H20.5M3.5 18H13.8M18.2 18H20.5', o: circle(13, 6, 2.2) + circle(8, 12, 2.2) + circle(16, 18, 2.2) },

  /* ── content ── */
  book: { o: 'M12 6.6C10 4.9 7 4.5 3.8 5.2V18.6C7 17.9 10 18.3 12 20 14 18.3 17 17.9 20.2 18.6V5.2C17 4.5 14 4.9 12 6.6Z', d: 'M12 6.6V20' },
  verse: { o: cutPlate(5.2, 3, 13.6, 18, 3, 2.2), d: 'M8.8 3.4V20.6M13.8 7.2V14.4M10.8 9.8H16.8' },
  quote: { o: 'M4.4 17.2V12.2C4.4 9 6.2 7.1 9.8 6.6V8.9C8.2 9.3 7.4 10.2 7.2 11.4H10.4V17.2Z' + 'M13.8 17.2V12.2C13.8 9 15.6 7.1 19.2 6.6V8.9C17.6 9.3 16.8 10.2 16.6 11.4H19.8V17.2Z' },
  pen: { o: 'M16.6 3.6L20.4 7.4 8.6 19.2 3.6 20.4 4.8 15.4Z', d: 'M13.6 6.6L17.4 10.4' },
  journal: { o: cutPlate(6.6, 3, 13, 18, 2.6, 2.2), i: 'M4 7.6H9.2M4 12H9.2M4 16.4H9.2', d: 'M12.2 8H16.6M12.2 12H16.6M12.2 16H14.6' },
  mic: { o: plate(9, 2.8, 6, 11.4, 3), i: 'M5.6 11.4a6.4 6.4 0 0 0 12.8 0M12 17.8V21.2M8.6 21.2H15.4', d: 'M10.9 6.8H13.1M10.9 10H13.1' },
  headphones: { o: plate(3.2, 14.2, 4.8, 6.4, 1.8) + plate(16, 14.2, 4.8, 6.4, 1.8), i: 'M4.2 15.6V12a7.8 7.8 0 0 1 15.6 0V15.6' },
  play: { o: 'M8 4.8L19.2 12 8 19.2Z' },
  pause: { o: plate(6.4, 5, 3.8, 14, 1.2) + plate(13.8, 5, 3.8, 14, 1.2) },
  video: { o: plate(2.8, 6.6, 12.8, 10.8, 2.4) + poly([[15.6, 10.4], [21, 7.6], [21, 16.4], [15.6, 13.6]]) },
  clock: { o: circle(12, 12, 9), d: 'M12 6.8V12L15.6 14.2' },
  calendar: { o: cutPlate(3.4, 5, 17.2, 16, 3, 2.4), i: 'M8 2.8V6.4M16 2.8V6.4', d: 'M3.6 10H20.4' + dot(8, 14.2) + dot(12, 14.2) + dot(16, 14.2) + dot(8, 17.6) + dot(12, 17.6) },
  bell: {
    o: 'M12 3.4C8.8 3.4 6.4 5.8 6.4 9.2V13L4.6 16.2C4.3 16.8 4.7 17.4 5.3 17.4H18.7C19.3 17.4 19.7 16.8 19.4 16.2L17.6 13V9.2C17.6 5.8 15.2 3.4 12 3.4Z',
    i: 'M9.6 20.2C10.1 21.2 11 21.6 12 21.6S13.9 21.2 14.4 20.2',
  },
  bellOff: {
    o: 'M12 3.4C8.8 3.4 6.4 5.8 6.4 9.2V13L4.6 16.2C4.3 16.8 4.7 17.4 5.3 17.4H18.7C19.3 17.4 19.7 16.8 19.4 16.2L17.6 13V9.2C17.6 5.8 15.2 3.4 12 3.4Z',
    i: 'M9.6 20.2C10.1 21.2 11 21.6 12 21.6S13.9 21.2 14.4 20.2', x: 'M4.4 4.4L19.6 19.6',
  },
  hourglass: { o: 'M7 3.4H17V7.2L13 12 17 16.8V20.6H7V16.8L11 12 7 7.2Z', d: 'M9.2 18H14.8' },
  textSize: { i: 'M3.4 19.4L8.6 5.2 13.8 19.4M5.2 14.6H12M20.5 13.1V19.4', o: circle(18, 15.8, 2.5) },
  bookmark: { o: 'M8.6 3.4H15.4a2 2 0 0 1 2 2V20.8L12 16.6 6.6 20.8V5.4a2 2 0 0 1 2-2Z' },
  hint: { o: 'M9.2 17.4V16.2C9.2 15 8.5 14.2 7.6 13.2A6.2 6.2 0 1 1 16.4 13.2C15.5 14.2 14.8 15 14.8 16.2V17.4Z', i: 'M9.8 20.2H14.2', d: 'M10.4 14L12 11.6 13.6 14' },

  /* ── device & world ── */
  soundOn: { o: 'M3.8 9.8H7.4L12.2 5.8V18.2L7.4 14.2H3.8Z', i: 'M15.4 9.2a4 4 0 0 1 0 5.6M18.4 6.4a8 8 0 0 1 0 11.2' },
  soundOff: { o: 'M3.8 9.8H7.4L12.2 5.8V18.2L7.4 14.2H3.8Z', i: 'M15.8 9.8L20.4 14.2M20.4 9.8L15.8 14.2' },
  vibrate: { o: plate(8.6, 3.2, 6.8, 17.6, 2), i: 'M5.4 8.4V15.6M18.6 8.4V15.6M2.6 10.6V13.4M21.4 10.6V13.4' },
  moon: { o: 'M19.6 14.6A8.2 8.2 0 1 1 9.4 4.4 6.6 6.6 0 0 0 19.6 14.6Z', i: 'M18.2 3.6V6.8M16.6 5.2H19.8' },
  wifiOff: { i: 'M2.6 9.2a14.2 14.2 0 0 1 18.8 0M5.9 12.6a9.4 9.4 0 0 1 12.2 0M9.2 15.9a4.8 4.8 0 0 1 5.6 0M12 19.4h.01', x: 'M4 4L20 20' },
  install: { o: plate(6, 2.8, 12, 18.4, 2.6), d: 'M12 7.6V13.4M9.4 11L12 13.6 14.6 11M10 17.4H14' },
  phone: { o: plate(6.4, 2.8, 11.2, 18.4, 2.6), d: 'M10 18H14' },
  globe: { o: circle(12, 12, 9), d: 'M3 12H21M12 3C14.6 5.6 15.8 8.6 15.8 12S14.6 18.4 12 21C9.4 18.4 8.2 15.4 8.2 12S9.4 5.6 12 3Z' },
  mail: { o: plate(3, 5.4, 18, 13.2, 2.6), d: 'M3.6 7.4L12 13.4 20.4 7.4' },
  user: { o: person(12, 8, 3.9, 7.6, 14.8, 20.8) },
  users: { o: person(9.4, 8.2, 3.5, 6.6, 15.2, 20.6), bk: 'M14.4 4.9a3.4 3.4 0 0 1 0 6.6M17 15.4C19.5 15.8 21 17.7 21.2 20.2' },
  home: { o: 'M3.6 11.4L12 3.8 20.4 11.4V19a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2Z', d: 'M9.6 21V15.6H14.4V21' },
  family: { o: person(8, 11.4, 2.4, 5, 15.8, 20.8), bk: 'M8.4 20.6C8.8 16.2 11.4 13.4 14.8 13.4S20.8 16.2 21.2 20.6' + circle(14.8, 6.8, 3) },
  eye: { o: 'M2.8 12C5 7.8 8.2 5.8 12 5.8S19 7.8 21.2 12C19 16.2 15.8 18.2 12 18.2S5 16.2 2.8 12Z', d: circle(12, 12, 2.6) },
  eyeOff: { o: 'M2.8 12C5 7.8 8.2 5.8 12 5.8S19 7.8 21.2 12C19 16.2 15.8 18.2 12 18.2S5 16.2 2.8 12Z', d: circle(12, 12, 2.6), x: 'M4.4 4.4L19.6 19.6' },
  menu: { i: 'M4.4 7H19.6M4.4 12H19.6M4.4 17H19.6' },

  /* ── brands (simplified, monochrome) ── */
  youtube: { o: plate(2.6, 5.4, 18.8, 13.2, 4), d: poly([[10, 9.2], [15.4, 12], [10, 14.8]]) },
  whatsapp: {
    o: 'M3.54 15.08A9 9 0 1 1 8.92 20.46L3.2 21Z',
    d: 'M8 8.2L10.2 7.8 11.6 10.4 10.4 11.4C10.9 12.6 11.9 13.6 13.2 14.1L14.2 12.9 16.7 14.2 16.3 16.3C13 16.6 7.8 12.2 8 8.2Z', kf: 'M8 8.2L10.2 7.8 11.6 10.4 10.4 11.4C10.9 12.6 11.9 13.6 13.2 14.1L14.2 12.9 16.7 14.2 16.3 16.3C13 16.6 7.8 12.2 8 8.2Z', kw: 0.8, k: '',
  },
  telegram: { o: 'M20.8 4.2L3 11 8.6 13.2 10.4 19.2 13.3 15.3 17.8 18.7Z', d: 'M8.6 13.2L20.8 4.2' },
  instagram: { o: plate(3.4, 3.4, 17.2, 17.2, 5), d: circle(12, 12, 4) + dot(17.2, 6.8) },

  /* ── instruments ── */
  gauge: {
    i: arc(12, 14, 8.8, -125, 125) + ticks(12, 14, 6.1, 7.7, [-90, -45, 0, 45, 90]) + 'M12 14L14.4 8.6', o: circle(12, 14, 1.3),
    s: arc(12, 14, 8.8, -125, 125) + 'z', k: ticks(12, 14, 5.6, 7.4, [-90, -45, 0, 45, 90]) + 'M12 14L14.2 9', kf: circle(12, 14, 1.2), si: '',
  },
  orbit: {
    // Ring tilted 22°: its back half hides behind the planet, the front half crosses it with a halo cut; a moon rides the back arc.
    o: circle(12, 12, 5),
    bk: ellipseArc(12, 12, 10.2, 3, -22, 180, 360),
    x: ellipseArc(12, 12, 10.2, 3, -22, 0, 180), xw: 3.8,
    i: disc(...ep(12, 12, 10.2, 3, -22, 318), 1),
  },
  satellite: {
    r: -40, o: plate(9.2, 8.6, 5.6, 6.8, 1.4) + plate(2, 9.4, 5.6, 5.2, 0.6) + plate(16.4, 9.4, 5.6, 5.2, 0.6),
    i: 'M7.6 12H9.2M14.8 12H16.4M12 8.6V6.2M9.8 4.2a2.8 2.8 0 0 0 4.4 0', d: 'M4.8 9.6V14.4M19.2 9.6V14.4',
    lo: { d: '', i: 'M7.6 12H9.2M14.8 12H16.4M12 8.6V5.4' },                         // panel ribs and the dish fuse below 24 px
  },
  stage: {
    // Three hex plates in a stack, seen edge-on: the top one whole, the two beneath showing their lower edge.
    o: poly([[3, 6.6], [7.5, 2.8], [16.5, 2.8], [21, 6.6], [16.5, 10.4], [7.5, 10.4]]),
    i: 'M3 12L7.5 15.8H16.5L21 12M3 17.4L7.5 21.2H16.5L21 17.4',
  },
  signal: { i: 'M5 20V17M9.7 20V13.6M14.3 20V9.8M19 20V4.8', sw: 3 },
  radar: {
    o: circle(12, 12, 9), i: 'M12 12L18.4 5.6' + disc(7.6, 15.2, 0.5), d: circle(12, 12, 4.8), u: 'M12 12V3A9 9 0 0 1 18.36 5.64Z',
    k: circle(12, 12, 4.8) + 'M12 12L18.4 5.6', si: '',
  },
  thruster: {
    // de Laval profile (chamber, throat, flared bell) over three exhaust streaks, the centre one longest.
    o: 'M9.2 2.8H14.8L16.8 4.8V6.4L14.6 8.6C14.6 11 16 12.3 19 13.4H5C8 12.3 9.4 11 9.4 8.6L7.2 6.4V4.8Z',
    d: 'M10.2 5.8H13.8',
    i: 'M12 15.8V21.4M8.4 15.8V18.8M15.6 15.8V18.8', si: 'M12 15.8V21.4M8.4 15.8V18.8M15.6 15.8V18.8',
  },
  countdown: { o: circle(12, 13.4, 7.8), i: 'M9.8 2.8H14.2M12 2.8V5.6M18.2 7.2L19.4 6', d: 'M9.4 10H14.6V16.8H9.4M11.4 13.4H14.6' },

  closeCircle: { o: circle(12, 12, 9), d: 'M8.8 8.8L15.2 15.2M15.2 8.8L8.8 15.2' },
  wifi: { i: 'M2.6 9.2a14.2 14.2 0 0 1 18.8 0M5.9 12.6a9.4 9.4 0 0 1 12.2 0M9.2 15.9a4.8 4.8 0 0 1 5.6 0M12 19.4h.01' },
  sun: { o: circle(12, 12, 4), i: ticks(12, 12, 7.2, 9.6, [0, 45, 90, 135, 180, 225, 270, 315]) },
  rotate: { o: cutPlate(2.8, 10.4, 13, 8.6, 2.4, 2), d: dot(6.4, 14.7), i: 'M10.6 4.8C14.6 3.6 19 5.6 20.2 9.6M17 9.2L20.4 10 21.4 6.6' },
  image: { o: plate(3.4, 4.4, 17.2, 15.2, 2.4), d: 'M3.8 17L9 12.2 12.8 15.8 15.6 13.4 20.2 17.4' + disc(8.4, 8.8, 0.6) },
  grip: { i: [9, 15].flatMap((x) => [6.4, 12, 17.6].map((y) => disc(x, y, 0.55))).join('') },
  send: { o: 'M21 3L3 9.8 10.4 13.6 14.2 21Z', d: 'M10.4 13.6L21 3' },
  cap: { o: poly([[12, 4.2], [21, 8.8], [12, 13.4], [3, 8.8]]), i: 'M6.6 11.4V16C6.6 17.6 8.9 19 12 19S17.4 17.6 17.4 16V11.4M21 8.8V14.4' },
  battery: { o: plate(2.6, 7, 16.4, 10, 2.4), i: 'M21 10.6V13.4', d: 'M6 10.6V13.4M9.2 10.6V13.4M12.4 10.6V13.4' },
  list: { i: 'M9 6.6H20.4M9 12H20.4M9 17.4H20.4' + dot(4.4, 6.6) + dot(4.4, 12) + dot(4.4, 17.4) },
  grid: { o: plate(3.6, 3.6, 7.2, 7.2, 1.8) + plate(13.2, 3.6, 7.2, 7.2, 1.8) + plate(3.6, 13.2, 7.2, 7.2, 1.8) + plate(13.2, 13.2, 7.2, 7.2, 1.8) },
}

export const ICON_NAMES = Object.keys(G)
export const ICON_GROUPS = {
  nav: ['learn', 'objectives', 'shorts', 'locker', 'me'],
  hero: ['flame', 'bolt', 'shield', 'chest', 'rocket', 'gauge', 'orbit', 'thruster', 'countdown'],
  reward: ['star', 'trophy', 'flag', 'lock', 'unlock', 'check', 'checkCircle', 'close', 'medal', 'card', 'patch', 'target', 'sparkle', 'crown', 'heart', 'gift', 'key'],
  controls: ['chevronRight', 'chevronLeft', 'chevronUp', 'chevronDown', 'arrowRight', 'arrowLeft', 'arrowUp', 'arrowDown', 'plus', 'minus', 'more', 'search', 'filter', 'info', 'warning', 'help', 'refresh', 'undo', 'trash', 'copy', 'link', 'external', 'share', 'download', 'upload', 'settings', 'sliders', 'eye', 'eyeOff', 'menu', 'closeCircle', 'send', 'list', 'grid', 'image', 'grip'],
  content: ['book', 'verse', 'quote', 'pen', 'journal', 'mic', 'headphones', 'play', 'pause', 'video', 'clock', 'calendar', 'bell', 'bellOff', 'hourglass', 'textSize', 'bookmark', 'hint'],
  world: ['soundOn', 'soundOff', 'vibrate', 'moon', 'wifiOff', 'install', 'phone', 'globe', 'mail', 'user', 'users', 'home', 'family', 'wifi', 'sun', 'battery', 'rotate', 'cap'],
  brand: ['youtube', 'whatsapp', 'telegram', 'instagram'],
  instruments: ['satellite', 'stage', 'signal', 'radar'],
}

// Names the v6 screens still use; they resolve silently so nothing crashes mid-migration.
const ALIASES = { lightbulb: 'hint', edit: 'pen', volume: 'soundOn', speaker: 'soundOn', mute: 'soundOff', gear: 'settings', person: 'user', people: 'users', time: 'clock', notification: 'bell', back: 'arrowLeft', next: 'arrowRight', chevron: 'chevronRight', vault: 'locker', quests: 'objectives', x: 'close', alert: 'warning', fire: 'flame', xp: 'bolt', streak: 'flame', rank: 'medal', mission: 'flag', cross: 'close', tick: 'check' }
const MISSING = { i: plate(4, 4, 16, 16, 3) + 'M9.7 9.8a2.4 2.4 0 1 1 3.6 2c-.9.5-1.3 1-1.3 2M12 16.8h.01' }

/* ─────────────────────────────────── render ───────────────────────────────── */
// Weight stays optically constant: 16px gets a heavier unit stroke, 32+ a lighter one.
const optical = (size) => (size <= 16 ? 2 : size <= 20 ? 1.9 : size <= 28 ? 1.75 : size <= 40 ? 1.6 : 1.5)
// Masks are luminance maps, not UI colour: white keeps, black cuts. (The only colour keywords in this file.)
const WIDE = { x: -6, y: -6, width: 36, height: 36 }                 // mask region: generous, survives `r` rotation

const warned = new Set()
const warnOnce = (name) => { if (!warned.has(name)) { warned.add(name); if (import.meta.env?.DEV) console.warn(`[icons] no glyph named "${name}"`) } }

const FLEX = { flex: 'none' }                                         // an icon never squashes inside a flex row
const LO_AT = 20                                                       // ≤ this size, a glyph may swap in its `lo` drawing

const Glyph = memo(function Glyph({ name, size = 24, weight = 'line', title, className, style, strokeWidth, ...rest }) {
  const uid = useId().replace(/\W/g, '')
  const known = G[name] || G[ALIASES[name]]
  if (!known) warnOnce(name)
  const px = typeof size === 'number' ? size : 24
  // Optical sizes: a glyph with too much detail for 16–20 px ships a simpler `lo` drawing (same silhouette, fewer parts).
  const def = known ? (known.lo && px <= LO_AT ? { ...known, ...known.lo } : known) : MISSING
  const solid = weight === 'solid' || weight === 'fill' || weight === 'filled', duo = weight === 'duo'
  const sw = strokeWidth ?? optical(px), f = sw / 1.75
  const shape = solid ? def.s ?? def.o : null
  const knock = solid && shape ? (def.k ?? def.d) : null
  const needMask = !!(def.x || (solid && shape && (knock || def.kf)))
  const mId = `m${uid}`, bId = `b${uid}`
  const outer = shape ?? def.o                                       // what a back layer tucks behind
  const swS = solid ? (def.sw ?? 1.75) * f : sw
  // Back layers, drawn rear-to-front. Each is hidden where anything in front of it (later layers, then the main shape) overlaps it.
  const back = def.bk ? (Array.isArray(def.bk) ? def.bk : [def.bk]) : []
  const halo = (def.bg ?? 4.6) * f
  const eo = def.eo ? 'evenodd' : undefined
  const backEls = back.map((d, k) => <g key={k} mask={`url(#${bId}${k})`}><path d={d} strokeWidth={solid && !shape ? swS : undefined} /></g>)
  let inner
  if (solid && shape) {
    inner = (
      <>
        {backEls}
        <g mask={needMask ? `url(#${mId})` : undefined}>
          <path d={shape} fill="currentColor" fillRule={eo} strokeWidth={swS} />
        </g>
        {(def.si ?? def.i) && <path d={def.si ?? def.i} strokeWidth={swS} />}
      </>
    )
  } else if (solid) {
    // strokes only (arrows, plus, check…): solid = the same drawing, heavier
    inner = <>{backEls}<path d={(def.d || '') + (def.i || '')} strokeWidth={swS} /></>
  } else {
    inner = (
      <>
        {backEls}
        <g mask={def.x ? `url(#${mId})` : undefined}>
          {duo && def.t && <path d={def.t} strokeOpacity=".22" />}
          {duo && def.o && <path d={def.u ?? def.o} fill="currentColor" fillOpacity=".18" stroke="none" fillRule={eo} />}
          <path d={(def.o || '') + (def.d || '') + (def.i || '')} />
        </g>
      </>
    )
  }
  return (
    <svg
      className={className ? 'k-icon ' + className : 'k-icon'} style={style ? { ...FLEX, ...style } : FLEX} width={size} height={size} viewBox="0 0 24 24" display="block"
      fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': 'true', focusable: 'false' })}
      data-icon={name} data-weight={weight} {...rest}
    >
      {title ? <title>{title}</title> : null}
      {(back.length || needMask) && (
        <defs>
          {back.map((_, k) => (
            <mask key={k} id={`${bId}${k}`} maskUnits="userSpaceOnUse" {...WIDE}>
              <rect {...WIDE} fill="white" />
              {back.slice(k + 1).map((d, j) => <path key={j} d={d} fill="black" stroke="black" strokeWidth={halo} />)}
              {outer && <path d={outer} fill="black" stroke="black" strokeWidth={halo} fillRule={eo} />}
            </mask>
          ))}
          {needMask && (
            <mask id={mId} maskUnits="userSpaceOnUse" {...WIDE}>
              <rect {...WIDE} fill="white" />
              {knock && <path d={knock} stroke="black" strokeWidth={(def.kw ?? 1.75) * f} />}
              {def.kf && <path d={def.kf} fill="black" stroke="black" strokeWidth={(def.kw ?? 1.75) * f} />}
              {def.x && <path d={def.x} stroke="black" strokeWidth={(def.xw ?? 4.6) * f} />}
            </mask>
          )}
        </defs>
      )}
      <g transform={def.r ? `rotate(${def.r} 12 12)` : undefined}>{inner}</g>
      {def.x && <path d={def.x} />}
    </svg>
  )
})

const named = {}
for (const n of ICON_NAMES) {
  const C = memo((p) => <Glyph name={n} {...p} />)
  C.displayName = `Icon.${n}`
  named[n] = C
}
for (const [a, n] of Object.entries(ALIASES)) named[a] = named[n]

// Names React itself probes on a component type: never fabricate these.
const RESERVED = new Set(['then', 'type', 'render', 'compare', 'displayName', 'defaultProps', 'propTypes', 'contextTypes', 'contextType', 'childContextTypes', 'getDefaultProps', 'getDerivedStateFromProps', 'prototype', 'toJSON', 'constructor', 'name', 'length'])

function IconBase({ name, ...props }) { return <Glyph name={name} {...props} /> }
IconBase.displayName = 'Icon'

/** <Icon name="flame" /> or <Icon.flame />. Unknown names render a boxed "?" and warn once; they never throw. */
export const Icon = new Proxy(IconBase, {
  get(target, key, recv) {
    if (key in target || typeof key !== 'string') return Reflect.get(target, key, recv)
    if (named[key]) return named[key]
    if (RESERVED.has(key) || !/^[a-z][A-Za-z0-9]{1,23}$/.test(key)) return undefined
    return (named[key] = memo((p) => <Glyph name={key} {...p} />))
  },
})
export default Icon
