// scratch: ribbon arm with PCHIP width profile; union via same-winding subpaths
import sharp from 'sharp'
const OUT = 'store/_work/out'
const C = { carbon1:'#0b0d15', i1:'#ff4a0f', i2:'#ff8a1c', i3:'#ffc43d' }
const f = (n) => +n.toFixed(2)
const area = (pts) => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + (p[0] * q[1] - q[0] * p[1]) }, 0) / 2
const cw = (pts) => (area(pts) > 0 ? pts : [...pts].reverse())  // y-down: positive area == clockwise on screen
const poly = (pts) => 'M' + cw(pts).map(([x, y]) => f(x) + ' ' + f(y)).join('L') + 'Z'
const cub = (c, t) => { const u = 1 - t; return [0, 1].map(k => u*u*u*c[0][k] + 3*u*u*t*c[1][k] + 3*u*t*t*c[2][k] + t*t*t*c[3][k]) }
const dcub = (c, t) => { const u = 1 - t; return [0, 1].map(k => 3*u*u*(c[1][k]-c[0][k]) + 6*u*t*(c[2][k]-c[1][k]) + 3*t*t*(c[3][k]-c[2][k])) }
// monotone cubic (Fritsch-Carlson)
function pchip(xs, ys) {
  const n = xs.length, d = [], m = new Array(n)
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i+1]-ys[i])/(xs[i+1]-xs[i])
  m[0] = d[0]; m[n-1] = d[n-2]
  for (let i = 1; i < n - 1; i++) m[i] = d[i-1]*d[i] <= 0 ? 0 : (d[i-1]+d[i])/2
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i+1] = 0; continue } const a = m[i]/d[i], b = m[i+1]/d[i], s = a*a+b*b; if (s > 9) { const t = 3/Math.sqrt(s); m[i] = t*a*d[i]; m[i+1] = t*b*d[i] } }
  return (x) => { let i = 0; while (i < n - 2 && x > xs[i+1]) i++; const h = xs[i+1]-xs[i], t = (x-xs[i])/h, t2=t*t, t3=t2*t
    return (2*t3-3*t2+1)*ys[i] + (t3-2*t2+t)*h*m[i] + (-2*t3+3*t2)*ys[i+1] + (t3-t2)*h*m[i+1] }
}
const smoothPath = (pts, k = 1) => { let d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]); for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i-1]||pts[i], p1 = pts[i], p2 = pts[i+1], p3 = pts[i+2]||p2
  d += 'C' + f(p1[0]+(p2[0]-p0[0])*k/6) + ' ' + f(p1[1]+(p2[1]-p0[1])*k/6) + ' ' + f(p2[0]-(p3[0]-p1[0])*k/6) + ' ' + f(p2[1]-(p3[1]-p1[1])*k/6) + ' ' + f(p2[0]) + ' ' + f(p2[1]) } return d }

function armPath({ c, prof, n = 40 }) {
  const w = pchip(prof.map(p => p[0]), prof.map(p => p[1]))
  const L = [], R = []
  for (let i = 0; i <= n; i++) { const t = i / n, p = cub(c, t), d = dcub(c, t), m = Math.hypot(...d), nx = -d[1]/m, ny = d[0]/m, h = Math.max(0, w(t))/2
    L.push([p[0]+nx*h, p[1]+ny*h]); R.push([p[0]-nx*h, p[1]-ny*h]) }
  // ensure orientation: path L then R reversed
  const pts = [...L, ...R.reverse()]
  const ring = cw(pts)
  return smoothPath(ring) + 'Z'
}

function build(o) {
  const stem = poly([[0,16],[16,0],[42,0],[42,220],[0,220]])
  const leg = poly([[30, 220 - 104*Math.tan(58*Math.PI/180)], [134,220], [83,220], [30, 220 - 53*Math.tan(58*Math.PI/180)]])
  const arm = armPath(o)
  return stem + leg + arm
}
const V = {
  A: { c: [[34,116],[57,83],[137,33],[150,-26]], prof: [[0,50],[0.35,44],[0.65,48],[0.85,28],[1,0]] },
  B: { c: [[34,116],[60,78],[132,40],[154,-30]], prof: [[0,52],[0.4,44],[0.7,46],[0.9,22],[1,0]] },
  C: { c: [[34,116],[64,74],[128,56],[160,-30]], prof: [[0,52],[0.4,44],[0.7,48],[0.9,24],[1,0]] },
  D: { c: [[34,116],[70,76],[124,60],[148,-34]], prof: [[0,54],[0.35,44],[0.62,42],[0.82,34],[0.94,16],[1,0]] },
}
const tiles = []; let x = 0
for (const [k, o] of Object.entries(V)) {
  const d = build(o)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="-30 -50 250 300"><rect x="-30" y="-50" width="250" height="300" fill="${C.carbon1}"/>
  <defs><linearGradient id="ig" gradientUnits="userSpaceOnUse" x1="0" y1="220" x2="170" y2="-30"><stop offset="0" stop-color="${C.i1}"/><stop offset=".56" stop-color="${C.i2}"/><stop offset="1" stop-color="${C.i3}"/></linearGradient></defs>
  <path d="${d}" fill="url(#ig)"/></svg>`
  tiles.push({ input: await sharp(Buffer.from(svg)).png().toBuffer(), left: x, top: 0 }); x += 425
}
await sharp({ create: { width: x, height: 420, channels: 4, background: '#333' } }).composite(tiles).png().toFile(`${OUT}/sheet4.png`)
