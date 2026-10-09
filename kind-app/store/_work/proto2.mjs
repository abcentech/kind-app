// scratch: hand-drawn K variants with flame arm
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = 'C:/Users/ADMIN/Documents/KIN/KIND/Monthly Devotional/kind-app/store/_work/out'
mkdirSync(OUT, { recursive: true })
const C = {
  carbon0: '#06070d', carbon1: '#0b0d15', carbon2: '#11141f', carbon3: '#181c2a',
  i1: '#ff4a0f', i2: '#ff8a1c', i3: '#ffc43d',
  t1: '#eef1f8', t2: '#aeb5c6', t3: '#6a7186', t4: '#343a4c',
}
const hexPts = (cx, cy, R) => [0, 1, 2, 3, 4, 5].map((i) => { const a = (-90 + i * 60) * Math.PI / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a)] })

// each: path in K-local coords (y down, baseline 220, stem x 0..42), plus offset
const V = {
  // 1: flame tongue arm
  F1: `M0 16 L16 0 L42 0 L42 84
       C 66 46, 134 40, 128 -26
       C 168 -2, 186 30, 170 62
       C 160 84, 100 98, 68 118
       L 132 220 L 84 220 L 42 154 L 42 220 L 0 220 Z`,
  // 2: sleeker, trajectory then flame lick tip
  F2: `M0 16 L16 0 L42 0 L42 88
       C 70 56, 118 52, 150 -30
       C 176 8, 176 52, 150 76
       C 128 96, 96 104, 70 118
       L 134 220 L 86 220 L 42 156 L 42 220 L 0 220 Z`,
  // 3: straight blade arm (60deg) w/ flame notch at tip
  F3: `M0 16 L16 0 L42 0 L42 84
       L 96 -4 L 112 -28
       L 142 0
       L 140 22
       L 70 118
       L 134 220 L 86 220 L 42 156 L 42 220 L 0 220 Z`,
}

function badge(kd, ox = 150, oy = 138, size = 512) {
  const cx = 256, cy = 256, Ro = 200, Ri = 179
  const ho = hexPts(cx, cy, Ro).map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ')
  const hi = hexPts(cx, cy, Ri).map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="${C.carbon3}"/><stop offset=".55" stop-color="${C.carbon1}"/><stop offset="1" stop-color="${C.carbon0}"/></radialGradient>
    <linearGradient id="ti" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="${C.t1}"/><stop offset=".34" stop-color="${C.t2}"/><stop offset=".62" stop-color="${C.t4}"/><stop offset="1" stop-color="${C.t2}"/></linearGradient>
    <linearGradient id="ig" gradientUnits="userSpaceOnUse" x1="${ox}" y1="${oy + 230}" x2="${ox + 180}" y2="${oy - 30}"><stop offset="0" stop-color="${C.i1}"/><stop offset=".56" stop-color="${C.i2}"/><stop offset="1" stop-color="${C.i3}"/></linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#bg)"/>
  <polygon points="${ho}" fill="url(#ti)"/>
  <polygon points="${hi}" fill="${C.carbon1}"/>
  <g transform="translate(${ox} ${oy})"><path d="${kd}" fill="url(#ig)"/></g>
</svg>`
}

const tiles = []
let x = 0
for (const [k, d] of Object.entries(V)) {
  const svg = badge(d)
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  tiles.push({ input: await sharp(png).resize(400).png().toBuffer(), left: x, top: 0 })
  tiles.push({ input: await sharp(png).resize(64).png().toBuffer(), left: x, top: 410 })
  tiles.push({ input: await sharp(png).resize(32).png().toBuffer(), left: x + 80, top: 410 })
  tiles.push({ input: await sharp(png).resize(16).png().toBuffer(), left: x + 130, top: 410 })
  x += 410
}
await sharp({ create: { width: x, height: 500, channels: 4, background: '#222' } }).composite(tiles).png().toFile(`${OUT}/sheet2.png`)
console.log('ok')
