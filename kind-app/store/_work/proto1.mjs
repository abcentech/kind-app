// scratch: K candidates
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'node:fs'

const OUT = 'C:/Users/ADMIN/Documents/KIN/KIND/Monthly Devotional/kind-app/store/_work/out'
mkdirSync(OUT, { recursive: true })

const f = (n) => +n.toFixed(2)
const P = (pts) => pts.map(([x, y], i) => (i ? 'L' : 'M') + f(x) + ' ' + f(y)).join('') + 'Z'

// sample a cubic
const cub = (p0, p1, p2, p3, t) => {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
}
const dcub = (p0, p1, p2, p3, t) => {
  const u = 1 - t
  return [
    3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]),
    3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]),
  ]
}
// Catmull-Rom -> cubic path through points
const smooth = (pts, k = 0.5) => {
  let d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1])
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
    const c1 = [p1[0] + ((p2[0] - p0[0]) * k) / 3 * 1, p1[1] + ((p2[1] - p0[1]) * k) / 3 * 1]
    const c2 = [p2[0] - ((p3[0] - p1[0]) * k) / 3 * 1, p2[1] - ((p3[1] - p1[1]) * k) / 3 * 1]
    d += 'C' + f(c1[0]) + ' ' + f(c1[1]) + ' ' + f(c2[0]) + ' ' + f(c2[1]) + ' ' + f(p2[0]) + ' ' + f(p2[1])
  }
  return d
}

// ribbon along a cubic centreline with width profile w(t) (full width)
function ribbon(c, wfn, n = 36) {
  const L = [], R = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const p = cub(...c, t)
    const d = dcub(...c, t)
    const m = Math.hypot(d[0], d[1]) || 1
    const nx = -d[1] / m, ny = d[0] / m // left normal (in y-down coords: points to upper-left of travel dir when travelling up-right?)
    const w = wfn(t) / 2
    L.push([p[0] + nx * w, p[1] + ny * w])
    R.push([p[0] - nx * w, p[1] - ny * w])
  }
  return { L, R }
}

const C = {
  carbon0: '#06070d', carbon1: '#0b0d15', carbon2: '#11141f', carbon3: '#181c2a', carbon4: '#232839',
  i1: '#ff4a0f', i2: '#ff8a1c', i3: '#ffc43d',
  t1: '#eef1f8', t2: '#aeb5c6', t3: '#6a7186', t4: '#343a4c',
}

function hexPts(cx, cy, R) {
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (-90 + i * 60) * Math.PI / 180
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)]
  })
}

// ---- K variants. local box: x 0..~190, y 0..216 (baseline 216)
function kA(opts = {}) {
  const T = 46 // stem width
  const stem = [[0, 16], [16, 0], [T, 0], [T, 216], [0, 216]]
  // leg: from stem right edge ~y=124 down to foot at baseline
  const legW = 50
  const leg = [[T - 2, 118], [T + 6 + 0, 118 - 0], [196, 216], [196 - 56, 216], [T - 2, 168]]
  // arm centreline
  const c = opts.c || [[T - 6, 112], [100, 84], [166, 64], [176, -2]]
  const wfn = opts.w || ((t) => {
    const base = 46 - 16 * Math.sin(Math.min(1, t * 1.4) * Math.PI / 2)
    const bulb = 20 * Math.exp(-Math.pow((t - 0.78) / 0.16, 2))
    const taper = Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, (t - 0.8) / 0.2), 1.6)), 0.9)
    return (base + bulb) * (t > 0.8 ? taper : 1)
  })
  const { L, R } = ribbon(c, wfn, 48)
  const arm = smooth([...L, ...R.reverse()]) + 'Z'
  return { d: P(stem) + P(leg) + arm }
}

function badge(kd, size = 512, { rim = true } = {}) {
  const cx = 256, cy = 256, Ro = 200, Ri = 179
  const ho = hexPts(cx, cy, Ro).map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ')
  const hi = hexPts(cx, cy, Ri).map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="${C.carbon3}"/><stop offset=".55" stop-color="${C.carbon1}"/><stop offset="1" stop-color="${C.carbon0}"/></radialGradient>
    <linearGradient id="ti" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="${C.t1}"/><stop offset=".34" stop-color="${C.t2}"/><stop offset=".62" stop-color="${C.t4}"/><stop offset="1" stop-color="${C.t2}"/></linearGradient>
    <linearGradient id="ig" gradientUnits="userSpaceOnUse" x1="170" y1="380" x2="330" y2="130"><stop offset="0" stop-color="${C.i1}"/><stop offset=".56" stop-color="${C.i2}"/><stop offset="1" stop-color="${C.i3}"/></linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#bg)"/>
  <polygon points="${ho}" fill="url(#ti)"/>
  <polygon points="${hi}" fill="${C.carbon1}"/>
  <g transform="translate(161 146)"><path d="${kd}" fill="url(#ig)" fill-rule="nonzero"/></g>
</svg>`
}

const out = []
const variants = {
  A: kA(),
  B: kA({ c: [[40, 112], [110, 100], [160, 70], [168, -2]] }),
  C: kA({ c: [[40, 112], [96, 70], [150, 40], [190, -14]], w: (t) => 44 * (1 - Math.pow(t, 1.7)) + 6 * (1 - t) }),
}
for (const [k, v] of Object.entries(variants)) {
  const svg = badge(v.d)
  writeFileSync(`${OUT}/k-${k}.svg`, svg)
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/k-${k}.png`)
}
// contact sheet
const tiles = []
let x = 0
for (const k of Object.keys(variants)) {
  tiles.push({ input: await sharp(`${OUT}/k-${k}.png`).resize(400).png().toBuffer(), left: x, top: 0 })
  tiles.push({ input: await sharp(`${OUT}/k-${k}.png`).resize(64).png().toBuffer(), left: x, top: 410 })
  tiles.push({ input: await sharp(`${OUT}/k-${k}.png`).resize(32).png().toBuffer(), left: x + 80, top: 410 })
  tiles.push({ input: await sharp(`${OUT}/k-${k}.png`).resize(16).png().toBuffer(), left: x + 130, top: 410 })
  x += 410
}
await sharp({ create: { width: x, height: 500, channels: 4, background: '#222' } }).composite(tiles).png().toFile(`${OUT}/sheet1.png`)
console.log('ok')
