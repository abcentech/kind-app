// emblem-glyphs — every symbol a collectible can carry, drawn once on a 100x100 board (centre 50,50, live radius ~46).
// A glyph is a list of shapes:  { d, r, st?, eo?, o?, cap? }
//   d   path data                      r   role — which thread / which face of the metal paints it:
//   st  stroke width (a line, not a fill)     p primary · s secondary (shade) · a accent (gold / hot) · w white / highlight · k recess / black detail
//   eo  even-odd fill (rings)          o   false = no outline thread around it
// MissionPatch renders roles as satin thread; Medal renders the very same shapes as relief in metal.
import { circ, rrect, poly, star, spark4, pt, r2, P, rad, smooth, ngon, lerp, clamp } from './emblem-kit.jsx'

const S = (d, r = 'p', x) => ({ d, r, ...x })
const L = (d, r = 'w', st = 3, x) => ({ d, r, st, ...x })

/* ───────────────────────────── builders ───────────────────────────── */
// A leaf: base (x,y), direction `ang` (0 = up, clockwise), length, total width.
export function leaf(x, y, len, w, ang) {
  const [tx, ty] = pt(x, y, len, ang)
  const mx = (x + tx) / 2, my = (y + ty) / 2
  const nx = Math.cos(rad(ang)) * w, ny = Math.sin(rad(ang)) * w
  return `M${P([x, y])}Q${P([mx + nx, my + ny])} ${P([tx, ty])}Q${P([mx - nx, my - ny])} ${P([x, y])}z`
}
// Leaves marching along an arc (a laurel branch). `grow` = +1 clockwise, -1 counter-clockwise.
export function leafArc(cx, cy, r, a0, a1, n, len, w, tilt = 38) {
  const out = []
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1)
    const a = lerp(a0, a1, t)
    const [x, y] = pt(cx, cy, r, a)
    const dir = a1 > a0 ? 1 : -1
    const sc = 0.72 + 0.28 * Math.sin(Math.PI * (0.15 + 0.7 * t))   // fat in the middle, small at the tips
    out.push(leaf(x, y, len * sc, w * sc, a + dir * (90 - tilt)))
    out.push(leaf(x, y, len * sc * 0.82, w * sc * 0.8, a + dir * (90 + tilt)))
  }
  return out
}
// Ellipse arc as a smooth path (for orbits): centre, radii, rotation, from/to angle in degrees
const ellArc = (cx, cy, rx, ry, rot, a0, a1, n = 18) => {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const a = rad(lerp(a0, a1, i / n))
    const x = rx * Math.cos(a), y = ry * Math.sin(a), cr = Math.cos(rad(rot)), sr = Math.sin(rad(rot))
    pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr])
  }
  return smooth(pts, false, 1)
}
// Crescent = disc A minus disc B, from their two intersection points
function crescent(ax, ay, ar, bx, by, br) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy)
  const a = (ar * ar - br * br + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, ar * ar - a * a))
  const mx = ax + (a * dx) / d, my = ay + (a * dy) / d
  const p1 = [mx + (h * dy) / d, my - (h * dx) / d], p2 = [mx - (h * dy) / d, my + (h * dx) / d]
  return `M${P(p1)}A${ar} ${ar} 0 1 0 ${P(p2)}A${br} ${br} 0 0 1 ${P(p1)}z`
}
const ring = (cx, cy, ro, ri) => circ(cx, cy, ro) + circ(cx, cy, ri)   // use with eo
const rays = (cx, cy, r0, r1, r2_, n, half, rot = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = rot + (i * 360) / n, big = i % 2 === 0
    return poly([pt(cx, cy, r0, a - half), pt(cx, cy, big ? r1 : r2_, a), pt(cx, cy, r0, a + half)])
  })

/* ───────────────────────────── MEDAL SYMBOLS (24) ───────────────────────────── */
const FLAME_O = 'M50 10C55 24 76 36 76 58C76 76 64 90 50 90C36 90 24 76 24 58C24 48 29 41 34 35C35 44 40 49 44 49C40 36 43 22 50 10Z'
const FLAME_I = 'M50 58C55 65 61 69 61 77C61 84 56 88 50 88C44 88 39 84 39 77C39 70 44 66 50 58Z'
const SHIELD = 'M50 9L81 21V48C81 69 67 83 50 92C33 83 19 69 19 48V21Z'

// the key lives in its own frame: bow centre b, pointing `ang` (0 = up, clockwise)
function keyShapes(bx, by, ang, len, bowR = 17, scale = 1) {
  const T = (u, v) => { const a = rad(ang); return [bx + u * Math.sin(a) + v * Math.cos(a), by - u * Math.cos(a) + v * Math.sin(a)] }
  const sw = 4.6 * scale
  return [
    S(circ(bx, by, bowR) + circ(bx, by, bowR * 0.46), 'p', { eo: true }),
    S(poly([T(bowR - 2, -sw), T(len, -sw), T(len, sw), T(bowR - 2, sw)]), 'p'),
    S(poly([T(len, sw), T(len, sw + 9 * scale), T(len - 7 * scale, sw + 9 * scale), T(len - 7 * scale, sw)]), 'p'),
    S(poly([T(len - 13 * scale, sw), T(len - 13 * scale, sw + 7 * scale), T(len - 19 * scale, sw + 7 * scale), T(len - 19 * scale, sw)]), 'p'),
    S(circ(bx, by, bowR * 0.18), 'k'),
  ]
}

export const MEDAL_GLYPHS = {
  flame: [S(FLAME_O, 'p'), S(FLAME_I, 'k')],
  shield: [S(SHIELD, 'p'), L('M50 20L72 29V48C72 63 62 74 50 81C38 74 28 63 28 48V29Z', 'k', 2.2), S(star(50, 51, 15, 6.4), 'w')],
  rocket: [
    S('M36 48L20 66V80L36 69Z', 's'), S('M64 48L80 66V80L64 69Z', 's'),
    S('M50 7C64 19 68 40 65 63H35C32 40 36 19 50 7Z', 'p'),
    S(circ(50, 38, 7.5), 'k'), S(circ(50, 38, 4), 'w'),
    S('M41 65H59L55.5 78H44.5Z', 's'), S('M50 93C45 85 43.5 82 45.5 78H54.5C56.5 82 55 85 50 93Z', 'a'),
  ],
  star: [S(star(50, 54, 42, 17.5), 'p'), ...Array.from({ length: 5 }, (_, i) => L(`M50 54L${P(pt(50, 54, 36, i * 72))}`, 'k', 1.5))],
  crown: [
    S('M17 68L10 28L33 47L50 18L67 47L90 28L83 68Z', 'p'), S(rrect(17, 72, 66, 11, 3), 's'),
    S(circ(10, 26, 5), 'w'), S(circ(50, 15, 5.5), 'w'), S(circ(90, 26, 5), 'w'), S(poly([[50, 73.5], [55, 77.5], [50, 81.5], [45, 77.5]]), 'k'),
  ],
  key: keyShapes(34, 33, 135, 70),
  book: [
    S('M48 30C38 21 24 19 11 23V75C24 71 38 73 48 81Z', 'p'), S('M52 30C62 21 76 19 89 23V75C76 71 62 73 52 81Z', 'p'),
    L('M20 36C27 34 33 35 40 38M20 47C27 45 33 46 40 49M20 58C27 56 33 57 40 60', 'k', 2.2), L('M60 38C67 35 73 34 80 36M60 49C67 46 73 45 80 47M60 60C67 57 73 56 80 58', 'k', 2.2),
    S('M8 78C24 74 38 77 50 86C62 77 76 74 92 78V82C76 79 62 82 50 91C38 82 24 79 8 82Z', 's'),
  ],
  anchor: [
    S(ring(50, 17, 9, 4.2), 'p', { eo: true }), S(rrect(46, 24, 8, 60, 2), 'p'), S(rrect(32, 35, 36, 7, 3), 'p'),
    S('M11 54C13 78 31 91 50 91C69 91 87 78 89 54L77 62C72 74 63 80 50 80C37 80 28 74 23 62Z', 'p'),
    S('M5 60L16 42L29 58Z', 'p'), S('M95 60L84 42L71 58Z', 'p'),
  ],
  seedling: [
    S('M14 90C26 78 74 78 86 90Z', 's'), L('M50 84C50 70 50 56 50 40', 'p', 5, { cap: 'round' }),
    S(leaf(50, 60, 38, 22, -52), 'p'), S(leaf(50, 46, 34, 20, 50), 'p'),
    L(`M50 60L${P(pt(50, 60, 28, -52))}`, 'k', 1.6), L(`M50 46L${P(pt(50, 46, 25, 50))}`, 'k', 1.6),
  ],
  mountain: [
    S('M5 84L36 28L50 52L62 34L95 84Z', 'p'), S('M36 28L5 84H27Z', 's', { o: false }),
    S('M36 28L26.5 45L33 41L37.5 47.5L43 40.5L46.6 45Z', 'w'), S('M62 34L54 48L59.5 45L63.5 50L68 44L72 48Z', 'w'), S(circ(80, 22, 7), 'a'),
  ],
  compass: [
    S(ring(50, 50, 41, 35), 'p', { eo: true }), L('M50 9V17M50 83V91M9 50H17M83 50H91', 'k', 3),
    S(poly([[50, 17], [61, 50], [39, 50]]), 'p'), S(poly([[50, 83], [61, 50], [39, 50]]), 's'), S(circ(50, 50, 6.5), 'w'), S(circ(50, 50, 2.6), 'k'),
  ],
  sun: [...rays(50, 50, 24, 43, 35, 12, 5.2).map((d) => S(d, 'p')), S(circ(50, 50, 19), 'p'), S(circ(50, 50, 12), 'w', { o: false })],
  moon: [S(crescent(50, 50, 40, 68, 40, 33), 'p'), S(spark4(78, 28, 11), 'a'), S(circ(86, 54, 3.2), 'a')],
  cross: [
    S('M42 8H58V34H86V52H58V92H42V52H14V34H42Z', 'p'), S('M46 14H54V40H80V46H54V86H46V46H20V40H46Z', 'k', { o: false }),
    S(circ(50, 43, 5.4), 'a'),
  ],
  heart: [
    S('M50 88C20 67 9 49 9 34C9 21 19 13 30 13C38 13 46 17 50 26C54 17 62 13 70 13C81 13 91 21 91 34C91 49 80 67 50 88Z', 'p'),
    L('M22 33C22 26 27 21 34 21', 'w', 4.5, { cap: 'round' }),
  ],
  target: [
    S(ring(50, 52, 40, 33), 'p', { eo: true }), S(ring(50, 52, 26, 19), 'p', { eo: true }), S(circ(50, 52, 10), 'p'),
    L('M52 50L84 18', 'w', 4.5, { cap: 'round' }), S('M80 14L90 10L92 22L86 20Z', 'a'), S('M84 18L96 14L90 4L82 10Z', 'a', { o: false }),
  ],
  bolt: [S('M60 6L20 56H45L38 94L80 40H55Z', 'p'), L('M58 18L36 48', 'w', 3, { cap: 'round' })],
  hourglass: [
    S(rrect(20, 9, 60, 9, 3), 's'), S(rrect(20, 82, 60, 9, 3), 's'),
    S('M27 18H73C73 38 58 46 54 50C58 54 73 62 73 82H27C27 62 42 54 46 50C42 46 27 38 27 18Z', 'p'),
    S('M35 21H65C63 32 56 38 50 43C44 38 37 32 35 21Z', 'a'), S('M31 80C35 69 43 65 50 60C57 65 65 69 69 80Z', 'a'),
  ],
  laurel: [
    ...leafArc(50, 50, 33, 200, 332, 8, 17, 9).map((d) => S(d, 'p')), ...leafArc(50, 50, 33, 160, 28, 8, 17, 9).map((d) => S(d, 'p')),
    S(star(50, 46, 15, 6.3), 'a'), S('M42 86L50 78L58 86L50 92Z', 's'),
  ],
  flag: [
    S(rrect(20, 8, 5.5, 86, 2.5), 's'), S(circ(22.7, 8, 4.4), 'a'),
    S('M26 14C42 8 56 21 72 15C79 12.5 85 12 90 12V52C85 52 79 53 72 56C56 62 42 48 26 54Z', 'p'),
    S(star(54, 34, 10, 4.2), 'w'),
  ],
  lamp: [
    S('M12 62H66C69 77 58 86 40 86C24 86 14 77 12 62Z', 'p'), S(rrect(28, 86, 24, 6, 2), 's'),
    S('M64 62L90 48L93 55L72 71Z', 'p'), L('M12 66C2 64 2 78 17 76', 'p', 4.5, { cap: 'round' }),
    S('M93 24C98 31 100 36 96 42C92 45 89 42 91 37C91 33 91 29 93 24Z', 'a'), S(rrect(30, 55, 22, 7, 2), 's'),
  ],
  coin: [S(circ(50, 50, 42), 'p'), L(circ(50, 50, 33), 'k', 2.4), S(star(50, 51, 20, 8.4), 'w'), ...Array.from({ length: 24 }, (_, i) => L(`M${P(pt(50, 50, 38, i * 15))}L${P(pt(50, 50, 40.5, i * 15))}`, 'k', 1.4))],
  tree: [
    S('M44 92L47 56H53L56 92Z', 's'), L('M50 62L36 48M50 56L66 42', 's', 3.2, { cap: 'round' }),
    S(circ(50, 30, 23), 'p'), S(circ(30, 47, 19), 'p'), S(circ(70, 47, 19), 'p'), S(circ(50, 52, 17), 'p'),
    S(circ(41, 25, 5), 'w', { o: false }),
  ],
  orbit: [
    L(ellArc(50, 50, 46, 15, -24, 185, 355), 's', 5, { cap: 'round' }),
    S(circ(50, 50, 23), 'p'), S('M31 42C40 38 58 38 69 44C71 47 72 51 72 54C66 50 38 50 28 56C28 50 29 46 31 42Z', 's', { o: false }),
    L(ellArc(50, 50, 46, 15, -24, 5, 175), 'p', 5, { cap: 'round' }), S(circ(88, 42, 5), 'a'),
  ],
}
export const MEDAL_GLYPH_NAMES = Object.keys(MEDAL_GLYPHS)

// What an achievement id *means* picks its symbol; anything unrecognised is hashed so the same id always gets the same one.
const MEDAL_WORDS = [
  [/streak|flame|fire|ignit|ablaze|day-?\d|consisten/, 'flame'], [/shield|protect|guard|grace/, 'shield'], [/rocket|launch|liftoff|blast/, 'rocket'],
  [/crown|rank|king|royal|promot/, 'crown'], [/key|code|cipher|unlock/, 'key'], [/book|read|verse|word|scripture|bible|journal|note/, 'book'],
  [/anchor|steadfast|faithful|loyal/, 'anchor'], [/seed|sprout|grow|begin|first-?step|little/, 'seedling'], [/mountain|summit|peak|climb|ascent/, 'mountain'],
  [/compass|path|explor|navigat|guide/, 'compass'], [/sun|dawn|early|morning|sunrise/, 'sun'], [/moon|night|selah|rest|sabbath|quiet/, 'moon'],
  [/cross|faith|pray|worship|spirit/, 'cross'], [/heart|kind|love|give|gift|generous|family|share/, 'heart'], [/target|perfect|accura|precis|aim|sharp|ace/, 'target'],
  [/bolt|xp|power|fast|speed|lightning|energy/, 'bolt'], [/hour|time|patien|wait|clock|late/, 'hourglass'], [/laurel|victor|champion|win|week|complete|finish/, 'laurel'],
  [/flag|milestone|mission|goal|stage/, 'flag'], [/lamp|light|wisdom|lesson|learn|shine/, 'lamp'], [/coin|steward|save|tithe|money|offering|wealth/, 'coin'],
  [/tree|legacy|multipl|fruit|harvest/, 'tree'], [/orbit|month|series|planet|star-?gaz/, 'orbit'], [/star|first|bright|stellar/, 'star'],
]
export function medalGlyphFor(id, hashFn) {
  const s = String(id ?? '').toLowerCase()
  for (const [re, name] of MEDAL_WORDS) if (re.test(s)) return name
  return MEDAL_GLYPH_NAMES[hashFn(s) % MEDAL_GLYPH_NAMES.length]
}

/* ───────────────────────────── PATCH EMBLEMS ───────────────────────────── */
// Richer than the medal symbols: each is a small composition in 4–5 threads.
function flagCloth() {
  // chequered cloth, 5 x 3 cells mapped onto a gently waving sheet
  const x0 = 33, y0 = 14, W = 44, H = 34, cols = 5, rows = 3
  const at = (u, v) => [x0 + W * u, y0 + H * v + 4.2 * Math.sin(u * 5.2 + v * 0.8) - 2 * u]
  const out = []
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    if ((i + j) % 2) continue
    const u0 = i / cols, u1 = (i + 1) / cols, v0 = j / rows, v1 = (j + 1) / rows
    out.push(poly([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]))
  }
  const edge = [at(0, 0), at(0.25, 0), at(0.5, 0), at(0.75, 0), at(1, 0), at(1, 0.5), at(1, 1), at(0.75, 1), at(0.5, 1), at(0.25, 1), at(0, 1)]
  return { cloth: smooth(edge, true, 0.9), checks: out }
}
const { cloth, checks } = flagCloth()
const chain = (x, y, w, h, st = 4.4) => rrect(x, y, w, h, h / 2)

export const PATCH_GLYPHS = {
  ownership: [
    S('M20 32L15 11L35 24L50 3L65 24L85 11L80 32Z', 'p'), S(rrect(18.5, 32, 63, 8, 2.5), 's'),
    S(circ(15, 9.5, 4), 'w'), S(circ(50, 2.5, 4.6), 'w'), S(circ(85, 9.5, 4), 'w'), S(poly([[50, 33.4], [54.6, 36], [50, 38.6], [45.4, 36]]), 'a'),
    S(circ(50, 54, 13.5) + circ(50, 54, 5.8), 'w', { eo: true }),
    S(rrect(46, 64, 8, 31, 1.5), 'w'), S(rrect(53, 78, 12, 6.5, 1.5), 'w'), S(rrect(53, 88, 8.5, 6, 1.5), 'w'),
  ],
  faithfulness: [
    S('M11 56C13 78 31 91 50 91C69 91 87 78 89 56L77 62C72 74 63 80 50 80C37 80 28 74 23 62Z', 'w'),
    S('M5 61L16 44L29 59Z', 'w'), S('M95 61L84 44L71 59Z', 'w'),
    S(rrect(46, 26, 8, 56, 2), 'w'), S(rrect(33, 41, 34, 7, 3), 'w'),
    L('M50 28C50 24 50 21 50 18', 'p', 3.6, { cap: 'round' }),
    S(leaf(50, 26, 36, 19, -58), 'p'), S(leaf(50, 26, 36, 19, 58), 'p'), S(leaf(50, 20, 22, 12, 6), 'a'),
    L(`M50 26L${P(pt(50, 26, 26, -58))}`, 'k', 1.3), L(`M50 26L${P(pt(50, 26, 26, 58))}`, 'k', 1.3),
  ],
  mastery: [
    ...Array.from({ length: 8 }, (_, i) => L(`M${P(pt(50, 38, 10, i * 45))}L${P(pt(50, 38, 34, i * 45))}`, 's', 5, { cap: 'round' })),
    S(ring(50, 38, 25, 18.5), 'p', { eo: true }),
    ...Array.from({ length: 8 }, (_, i) => S(circ(...pt(50, 38, 35.5, i * 45), 3.4), 'p')),
    S(circ(50, 38, 10.5), 'p'), S(circ(50, 38, 4.6), 'a'),
    L(rrect(12, 80, 28, 15, 7.5), 'w', 4.2),
    S(rrect(31, 84.5, 22, 6.5, 3.25), 'w'),
    L('M64 80H55A7.5 7.5 0 0 0 55 95H64', 'w', 4.2, { cap: 'round' }),
    S(spark4(73, 87.5, 5.4), 'a'), L('M82 80H85A7.5 7.5 0 0 1 85 95H82', 'w', 4.2, { cap: 'round' }),
  ],
  multiplication: [
    L('M50 94V64', 's', 7, { cap: 'round' }), L('M50 66L27 47M50 66L73 47M27 47L15 30M27 47L40 28M73 47L60 28M73 47L85 30', 's', 5, { cap: 'round' }),
    S('M36 94C42 88 58 88 64 94Z', 's'),
    S(leaf(50, 68, 22, 11, -34), 'p'), S(leaf(50, 68, 22, 11, 34), 'p'),
    S(circ(27, 47, 6.4), 'a'), S(circ(73, 47, 6.4), 'a'),
    ...[[15, 25], [40, 22], [60, 22], [85, 25]].map(([x, y]) => S(circ(x, y, 9.2), 'p')),
    ...[[15, 25], [40, 22], [60, 22], [85, 25]].map(([x, y], i) => S(spark4(x, y, 5.6), i % 2 ? 'a' : 'w', { o: false })),
  ],
  foundation: [
    S(rrect(10, 76, 80, 15, 2), 's'), S(rrect(22, 60, 56, 15, 2), 'p'), S(rrect(34, 44, 32, 15, 2), 's'),
    L('M36 76V91M64 76V91M50 60V75M22 76V91', 'k', 1.5), L('M50 44V59', 'k', 1.5),
    ...rays(50, 26, 12, 30, 24, 12, 3.4).map((d) => S(d, 'a')), S(circ(50, 26, 10.5), 'w'), S(circ(50, 26, 6.5), 'a', { o: false }),
  ],
  faith: [
    ...rays(50, 44, 18, 47, 36, 16, 3.8, 11.25).map((d) => S(d, 'a')),
    S('M43 12H57V36H77V50H57V88H43V50H23V36H43Z', 'w'), L('M48 16V84M30 43H70', 'p', 2, { o: false }),
    S(circ(50, 43, 6), 'p'), S(circ(50, 43, 2.8), 'a', { o: false }),
  ],
  focus: [
    S(ring(50, 48, 40, 36), 'p', { eo: true }), L('M50 4V16M50 80V92M4 48H16M84 48H96', 'p', 4.2, { cap: 'round' }),
    S('M12 48C26 28 40 22 50 22C60 22 74 28 88 48C74 68 60 74 50 74C40 74 26 68 12 48Z', 'w'),
    S(circ(50, 48, 17), 'p'), S(circ(50, 48, 8.4), 'k'), S(circ(44.5, 42.5, 3.4), 'w', { o: false }),
    S(spark4(76, 22, 8), 'a'),
  ],
  fitness: [
    S('M50 88C20 67 9 49 9 34C9 21 19 13 30 13C38 13 46 17 50 26C54 17 62 13 70 13C81 13 91 21 91 34C91 49 80 67 50 88Z', 'p'),
    L('M20 31C20 24 25 19 32 19', 'w', 4, { cap: 'round', o: false }),
    L('M3 54H30L38 38L50 70L60 26L68 54H97', 'k', 8, { cap: 'round' }), L('M3 54H30L38 38L50 70L60 26L68 54H97', 'w', 4.2, { cap: 'round', o: false }),
  ],
  finishing: [
    ...leafArc(50, 56, 38, 196, 332, 7, 16, 9).map((d) => S(d, 's')), ...leafArc(50, 56, 38, 164, 28, 7, 16, 9).map((d) => S(d, 's')),
    S(rrect(30, 12, 4.4, 76, 2.2), 'w'), S(circ(32.2, 11, 4.2), 'a'),
    S(cloth, 'w'), ...checks.map((d) => S(d, 'k', { o: false })),
    S('M40 86L50 80L60 86L50 94Z', 'a'),
  ],
  star: [
    L(ellArc(50, 52, 46, 14, -22, 0, 360, 26) + 'z', 's', 3.2, { cap: 'round', o: false }),
    S(star(50, 52, 40, 17), 'p'),
    ...Array.from({ length: 5 }, (_, i) => S(poly([[50, 52], pt(50, 52, 40, i * 72), pt(50, 52, 17, i * 72 + 36)]), 'w', { o: false })),
  ],
}

// Keyword -> glyph for weeks[stage].f. Order matters (FAITHFULNESS before FAITH).
const PATCH_WORDS = [
  [/\bOWN|^CROWN|^LORD|SOVEREIGN/, 'ownership'], [/FAITHFUL|SEED|ANCHOR|LITTLE|STEADFAST|TRUST/, 'faithfulness'],
  [/MASTER|CHAIN|FREE|DEBT|SERVANT/, 'mastery'], [/MULTIPL|INCREAS|HARVEST|^SOW|^SEND|^BUILD/, 'multiplication'],
  [/FOUNDATION|ORIGIN|BEGIN|GENESIS|ROOT/, 'foundation'], [/^FAITH$|SPIRIT|BELIEVE|PRAYER|WORSHIP/, 'faith'],
  [/FOCUS|MIND|RENEW|VISION|WISDOM/, 'focus'], [/FITNESS|BODY|HEALTH|STRENGTH|TEMPLE/, 'fitness'],
  [/FINISH|LEGACY|COMPLETE|^END|RACE/, 'finishing'],
]
export function patchGlyphFor(f) {
  const s = String(f ?? '').toUpperCase()
  for (const [re, name] of PATCH_WORDS) if (re.test(s)) return name
  return 'star'
}
export const PATCH_GLYPH_NAMES = Object.keys(PATCH_GLYPHS)
