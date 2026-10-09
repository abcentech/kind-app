// Earth — a lit sphere with real geography (Africa, Arabia, Mediterranean Europe), because the people this app is for
// live on that coastline. Orthographic projection of hand-keyed coast outlines; no textures, no filters.
//
//   LIGHT   the sun is a vector, not a gradient. `sun` = which way the lit limb faces on screen (0 up · 90 right),
//           `phase` = how far the sun sits toward the viewer (bigger → fuller). The terminator is the true projected great
//           circle (an ellipse), softened with stacked bands, so city lights switch on exactly where the day ends.
//   DUSK    defaults put Nigeria in twilight: Lagos, Abuja, Kano, Port Harcourt glow; the Sahara still holds the light.
//   COST    ~12 paths + ~40 lights + ~16 cloud ellipses. Static in every mode (nothing here animates).
import { useMemo } from 'react'
import { cx, mulberry32, useUid } from './Starfield.jsx'

const D2R = Math.PI / 180
const f = (v) => +v.toFixed(2)

// [lon, lat] coast outlines, clockwise. Keyed by hand from a mental atlas; good to ~1°, which is a pixel at 200 px.
const AFRICA = [[-5.9,35.8],[-4.4,35.2],[-2.9,35.2],[-1.2,35.4],[0.2,35.9],[1.8,36.5],[3,36.8],[5,36.8],[7,37],[8.8,36.9],[10.2,37.3],[11,37.1],[10.5,36.3],[10.6,35.5],[10.1,34.3],[11.1,33.3],[13.2,32.9],[15.2,32.4],[15.6,31.4],[17.5,30.4],[19.1,30.3],[20,31.6],[20.1,32.2],[21.7,32.9],[23.2,32.7],[25,31.8],[27.2,31.4],[29.9,31.2],[31.3,31.6],[32.3,31.2],[32.6,30],[32.9,29.4],[33.5,28.1],[33.8,27.2],[34.9,25.9],[35.5,24],[35.6,23.1],[36.9,21.4],[37.2,19.6],[38.5,18],[39.5,15.6],[41.5,13.6],[43.1,12.7],[43.3,11.6],[44.5,10.5],[47.5,11.2],[49.5,11.5],[51.2,11.8],[51.1,10.4],[50.8,9.1],[49.8,7.5],[48.7,5.5],[47.5,4.2],[45.3,2],[43.3,0.4],[41.6,-1.7],[40.1,-2.8],[39.4,-4.3],[39.2,-6.4],[39.3,-7.9],[39.5,-9.5],[40.4,-10.5],[40.5,-12.5],[40.7,-15],[39.4,-16.5],[37.5,-17.5],[36.5,-18.5],[35.3,-19.9],[34.8,-20.5],[35.4,-22.5],[35.5,-23.9],[33.8,-25.3],[32.9,-25.9],[32.8,-28.5],[31,-29.9],[30,-31.4],[28,-32.8],[27.3,-33.5],[25.7,-34],[23.5,-34.1],[22.2,-34.1],[20.5,-34.6],[19.9,-34.8],[18.4,-34.2],[18.4,-33.9],[18.2,-32.7],[17.9,-31],[17.1,-29],[16.5,-28.5],[15.1,-26.5],[14.5,-22.9],[13.2,-20.4],[11.8,-17.3],[12.2,-14],[13.5,-12.5],[13.2,-9],[12.2,-6.1],[11.8,-4.7],[9.7,-2.5],[9.3,-1],[9.4,0.4],[9.7,2],[9.8,3.2],[9.6,4],[8.9,4.5],[8.3,4.9],[7,4.4],[6.2,4.3],[5.2,5.1],[4.4,5.9],[3.4,6.4],[2.4,6.3],[1.2,6.1],[-0.1,5.6],[-1.8,4.8],[-2.1,4.75],[-3.3,5.1],[-4,5.3],[-5.6,5],[-7.5,4.4],[-9.2,5.1],[-10.8,6.3],[-12.5,7.3],[-13.2,8.5],[-13.7,9.5],[-15,10.8],[-16.7,12.4],[-17.5,14.7],[-16.5,16],[-16.2,19],[-16.9,21],[-16.1,23.6],[-14.5,26],[-13.2,27.7],[-11.5,28.2],[-9.8,29.9],[-9.6,30.4],[-9.7,31.6],[-8.5,33.3],[-7.6,33.6],[-6.8,34.1],[-6,35.2]]
const MADAGASCAR = [[49.3,-12.1],[50.4,-15.2],[49.7,-17],[48.5,-20],[47.1,-24.8],[45.1,-25.5],[44.1,-23],[43.5,-21.4],[44.4,-19],[44.1,-16.4],[46.3,-15.7],[47.7,-14.7]]
// Europe's south coast, the Levant, Anatolia, Arabia and the Gulf as one ring; it runs off over the pole where the globe turns away.
const EURASIA = [[32.4,30],[32.3,31.2],[34.2,31.3],[35,33],[35.8,34.5],[36,35.8],[36.2,36.7],[34.6,36.7],[32.3,36.1],[30.4,36.3],[28.2,36.7],[27.3,37],[26.8,38.3],[26.3,40.1],[24,40.6],[22.9,40.6],[23.8,38],[22.5,36.4],[21.6,36.8],[21,38.5],[20,39.5],[19.5,40.3],[19.4,41.9],[18.5,42.5],[16.4,43.5],[15,44.5],[13.7,45.6],[12.3,45.3],[12.5,44],[14,42.6],[16,41.9],[17.2,41],[18.5,40.1],[17,39.2],[16.5,38.9],[15.7,37.9],[16,38.2],[15.7,40],[14,40.8],[12.2,42],[10.3,43.6],[8.9,44.4],[7.5,43.8],[6,43.1],[3.2,43.3],[3.2,41.9],[0.8,40.7],[-0.3,38.8],[-2,36.8],[-5.6,36],[-6.2,36.5],[-9.3,37],[-8.8,38.8],[-9.5,40.2],[-8.8,42],[-9.2,43.2],[-7,43.7],[-2,43.5],[-1.2,46.2],[-4.5,47.8],[-1.5,48.6],[1.5,50.3],[3,51.5],[5,62],[0,75],[40,83],[110,80],[150,60],[120,30],[100,20],[90,22],[80,15],[77.5,8.1],[76.3,9.9],[72.8,19],[70,21],[67,24.8],[60.6,25.3],[56.3,27.2],[52,27.7],[50.8,28.9],[48.5,30],[48,29.4],[50.1,26.4],[51.6,25.3],[54.4,24.5],[55.3,25.3],[56.3,26.2],[58.6,23.6],[59.8,22.5],[57.7,19.7],[54,17],[49.1,14.6],[45,12.8],[43.2,13.3],[42.9,14.8],[42.6,16.9],[39.2,21.5],[38.1,24.1],[35.7,27.3],[34.9,28.5],[35,29.5],[34.3,27.8],[33.6,28.1],[32.6,29.9]]
const BLACK_SEA = [[28,41.2],[31,41.1],[35,42],[41,41],[41.6,42],[40,43.5],[37.5,44.7],[38.3,46.2],[35.5,45.3],[33,45],[30.5,46.4],[29.7,45.2],[28.6,43.4]]
const CASPIAN = [[49,38.4],[50.3,40.4],[49.8,42],[47.5,43],[51.2,44.5],[53,42],[53.8,40],[54,37.5],[51,36.6]]
const NIGERIA = [[2.7,6.4],[3.4,6.4],[4.4,6],[5.3,5],[6.2,4.3],[7.1,4.4],[8.3,4.7],[8.6,5],[9,5.7],[9.8,6.5],[10.7,7],[11.4,7.4],[11.7,8.4],[12.3,8.9],[13,9.8],[13.6,10.8],[14.1,11.6],[14.6,12.4],[14.6,13.2],[13.6,13.7],[12.2,13.4],[10.8,13.3],[9.4,12.9],[8.2,13.1],[7,13],[5.9,13.8],[4.1,13.5],[3.6,12.5],[3.6,11.7],[3.1,10.9],[2.7,9.6],[2.7,7.8]]

// [lon, lat, weight] — metros that glow at night. Lagos first: it is the point of the picture.
const CITIES = [
  [3.4, 6.5, 1.25], [3.9, 7.4, 0.55], [7.5, 9.1, 0.6], [8.5, 12, 0.7], [7, 4.8, 0.6], [5.6, 6.3, 0.4], [-0.2, 5.6, 0.8], [-4, 5.3, 0.7], [-17.4, 14.7, 0.55],
  [31.2, 30, 1], [29.9, 31.2, 0.55], [28, -26.2, 0.9], [36.8, -1.3, 0.7], [38.7, 9, 0.55], [15.3, -4.3, 0.85], [13.2, -8.8, 0.5], [-7.6, 33.6, 0.65], [3, 36.7, 0.65],
  [10.2, 36.8, 0.45], [32.5, 15.6, 0.45], [39.3, -6.8, 0.45], [18.4, -33.9, 0.55], [31, -29.9, 0.45], [28.3, -15.4, 0.35], [-3.7, 40.4, 0.65], [2.3, 48.9, 0.85],
  [12.5, 41.9, 0.65], [23.7, 38, 0.45], [29, 41, 0.85], [46.7, 24.7, 0.55], [39.2, 21.5, 0.45], [55.3, 25.3, 0.55], [51.4, 35.7, 0.65], [44.4, 33.3, 0.55], [72.8, 19, 0.7],
]

/** orthographic projection of (lon, lat) about the view centre; screen y is down. */
export function project(lon, lat, lon0, lat0, R) {
  const dl = (lon - lon0) * D2R, p = lat * D2R, p0 = lat0 * D2R
  const z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(dl)
  return { x: R * Math.cos(p) * Math.sin(dl), y: -R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(dl)), z }
}

// closed outline → path; edges are subdivided (so they follow the sphere) and points past the horizon are pushed out to the limb.
function outline(pts, lon0, lat0, R, step = 5) {
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const [a, b] = [pts[i], pts[(i + 1) % pts.length]]
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / step))
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n])
  }
  return 'M' + out.map(([lo, la]) => {
    const q = project(lo, la, lon0, lat0, R)
    if (q.z > 0.02) return `${f(q.x)} ${f(q.y)}`
    const r = Math.hypot(q.x, q.y) || 1
    return `${f((q.x / r) * R * 1.08)} ${f((q.y / r) * R * 1.08)}`
  }).join('L') + 'Z'
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

/// terrain: soft blotches that break the flat land gradient into desert, highland, rainforest and savanna.
// [lon, lat, rx°, ry°, colour, alpha]
const TERRAIN = [
  [22, -1, 11, 8, '#1c5a33', 0.6], [-5, 8, 7, 4, '#2f6b3a', 0.45], [6, 6, 5, 3, '#236636', 0.45], [38, 9, 5, 4, '#76803f', 0.5], [36, -3, 5, 5, '#5d7a3d', 0.4],
  [10, 13.5, 24, 3.4, '#8a9448', 0.55], [28, 12, 8, 3, '#7e8c44', 0.45], [6, 23, 4, 3, '#8b6a3b', 0.55], [17, 21, 3.4, 3, '#7a5a34', 0.55], [24, 26, 9, 5, '#dcc084', 0.5],
  [-3, 25, 7, 4, '#d4ab6a', 0.45], [-10, 22, 5, 5, '#b48c52', 0.35], [-3, 33, 6, 1.6, '#5b7a3c', 0.55], [21, -23, 8, 5, '#cba46b', 0.55], [15, -24, 2, 5, '#dab378', 0.5],
  [27, -30, 5, 3, '#5e8a42', 0.45], [50, 20, 9, 5, '#e0c283', 0.55], [40, 24, 3, 4, '#8c6a3f', 0.45], [10, 46, 13, 5, '#4a773a', 0.5], [33, 39, 7, 2.6, '#7c7a45', 0.4], [47, -19, 2, 4, '#3f7a3f', 0.45],
  [-10, 44, 4, 4, '#58803e', 0.4], [22, 48, 14, 5, '#547e3c', 0.35],
]
const NILE = [[32.5, 15.6], [33.2, 19], [31.6, 22], [32.8, 25.7], [31.2, 30], [31, 31.3]]

export default function Earth({
  size = 240, sun = 76, phase = 22, lon = 24, lat = 4, lights = true, clouds = true, title, className, style, ...rest
}) {
  const u = useUid('ea')
  const R = 90
  const g = useMemo(() => {
    const dx = Math.sin(sun * D2R), dy = -Math.cos(sun * D2R)
    const sz = Math.sin(Math.max(2, phase) * D2R), hz = Math.cos(Math.max(2, phase) * D2R)
    const S = [hz * dx, hz * dy, sz]
    const lit = (q) => (S[0] * q.x + S[1] * q.y) / R + S[2] * q.z                 // n·s with n = (x,y,z)/R, z = cos c
    const land = [AFRICA, MADAGASCAR, EURASIA].map((p) => outline(p, lon, lat, R))
    const holes = [BLACK_SEA, CASPIAN].map((p) => outline(p, lon, lat, R, 2))
    const nig = outline(NIGERIA, lon, lat, R, 1.5)
    const nile = 'M' + NILE.map(([lo, la]) => { const q = project(lo, la, lon, lat, R); return `${f(q.x)} ${f(q.y)}` }).join('L')
    const terrain = []
    for (const [lo, la, rx, ry, col, a] of TERRAIN) {
      const q = project(lo, la, lon, lat, R)
      if (q.z < 0.1) continue
      const k = 0.4 + 0.6 * q.z
      terrain.push({ x: f(q.x), y: f(q.y), rx: f(rx * D2R * R * k), ry: f(ry * D2R * R * (0.5 + 0.5 * q.z)), col, a })
    }
    const city = []
    for (const [lo, la, w] of CITIES) {
      const q = project(lo, la, lon, lat, R)
      if (q.z < 0.05) continue
      const night = smooth(0.1, -0.12, lit(q))          // 0 in daylight → 1 in the dark
      if (night < 0.04) continue
      city.push({ x: f(q.x), y: f(q.y), w, night, k: Math.sqrt(q.z) })
    }
    // small towns around each metro so a city reads as a cluster, not a dot
    const rnd = mulberry32(5)
    const towns = []
    for (const c of city) {
      const m = Math.round(4 + c.w * 6)
      for (let i = 0; i < m; i++) towns.push({ x: f(c.x + (rnd() - 0.5) * 9 * c.k), y: f(c.y + (rnd() - 0.5) * 6 * c.k), a: (0.4 + rnd() * 0.55) * c.night * Math.min(1, c.w + 0.35) })
    }
    // clouds in bands that follow the parallels (so they bend with the sphere): the ITCZ, a mid-latitude front each side
    const cl = []
    const r2 = mulberry32(31)
    const band = (la0, lo0, lo1, n, amp, big) => {
      for (let i = 0; i < n; i++) {
        const lo = lo0 + ((lo1 - lo0) * (i + r2() * 0.8)) / n
        const la = la0 + Math.sin(lo * 0.09 + la0) * amp + (r2() - 0.5) * amp * 0.8
        const q = project(lo, la, lon, lat, R)
        if (q.z < 0.16) continue
        const q2 = project(lo + 3, la, lon, lat, R)
        const ang = (Math.atan2(q2.y - q.y, q2.x - q.x) * 180) / Math.PI
        const k = 0.3 + 0.7 * q.z
        cl.push({ x: f(q.x), y: f(q.y), rx: f((big * 0.6 + r2() * big) * k), ry: f((2 + r2() * 3.6) * k), a: f(ang), o: f(0.3 + r2() * 0.4) })
      }
    }
    band(3, -30, 70, 14, 3, 16)
    band(-34, -20, 70, 12, 5, 15)
    band(47, -30, 60, 10, 4, 15)
    band(18, -30, 10, 4, 3, 10)
    return { land, holes, nig, nile, terrain, city, towns, cl, sub: { x: f(S[0] * R), y: f(S[1] * R) }, sz }
  }, [sun, phase, lon, lat])

  // night side: stacked bands from the exact terminator ellipse (in the sun-up frame, rotated into place) — a soft edge
  // with no blur filter. Each band is the night region with its boundary pushed a little deeper into the day.
  const NB = 40
  const nights = Array.from({ length: NB }, (_, i) => {
    const extra = R * (0.32 - (0.55 * i) / (NB - 1))
    const ry = Math.max(0.5, R * g.sz + extra)
    return <path key={i} d={`M${-R} 0A${R} ${ry} 0 0 0 ${R} 0A${R} ${R} 0 0 1 ${-R} 0Z`} fill="#02040c" opacity=".042" />
  })
  const seaC = [(g.sub.x * 0.5 + R) / (2 * R), (g.sub.y * 0.5 + R) / (2 * R)]
  const dayC = [(g.sub.x + R) / (2 * R), (g.sub.y + R) / (2 * R)]

  return (
    <svg
      className={cx('art-ea', className)}
      viewBox="0 0 200 200" width={size} height={size}
      role={title ? 'img' : undefined} aria-hidden={title ? undefined : 'true'} focusable="false"
      style={style} {...rest}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={`${u}-c`}><circle r={R} /></clipPath>
        <clipPath id={`${u}-lc`}>{g.land.map((d, i) => <path key={i} d={d} />)}</clipPath>
        <radialGradient id={`${u}-sea`} cx={seaC[0]} cy={seaC[1]} r=".8">
          <stop offset="0" stopColor="#2a8ad8" /><stop offset=".42" stopColor="#12529a" /><stop offset="1" stopColor="#072760" />
        </radialGradient>
        <linearGradient id={`${u}-land`} gradientUnits="userSpaceOnUse" x1="0" y1={-R} x2="0" y2={R}>
          <stop offset="0" stopColor="#5d7440" /><stop offset=".2" stopColor="#7e8a4a" /><stop offset=".3" stopColor="#c0a265" />
          <stop offset=".4" stopColor="#c9a869" /><stop offset=".49" stopColor="#8d9a52" /><stop offset=".6" stopColor="#2f7040" />
          <stop offset=".72" stopColor="#5c8b45" /><stop offset=".82" stopColor="#b69b63" /><stop offset=".93" stopColor="#6c8a4a" /><stop offset="1" stopColor="#52783f" />
        </linearGradient>
        <radialGradient id={`${u}-day`} cx={dayC[0]} cy={dayC[1]} r=".62">
          <stop offset="0" stopColor="#9fd6ff" stopOpacity=".3" /><stop offset=".5" stopColor="#6fb4ff" stopOpacity=".08" /><stop offset="1" stopColor="#6fb4ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${u}-cloud`}><stop offset="0" stopColor="#fff" stopOpacity=".85" /><stop offset=".55" stopColor="#eef5ff" stopOpacity=".4" /><stop offset="1" stopColor="#eaf3ff" stopOpacity="0" /></radialGradient>
        {g.terrain.map((t, i) => (
          <radialGradient key={i} id={`${u}-t${i}`}><stop offset="0" stopColor={t.col} stopOpacity={t.a} /><stop offset=".55" stopColor={t.col} stopOpacity={f(t.a * 0.75)} /><stop offset="1" stopColor={t.col} stopOpacity="0" /></radialGradient>
        ))}
        <radialGradient id={`${u}-halo`} cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse">
          <stop offset=".895" stopColor="#4aa2ff" stopOpacity="0" /><stop offset=".915" stopColor="#5db4ff" stopOpacity=".6" />
          <stop offset=".95" stopColor="#3b82f0" stopOpacity=".2" /><stop offset="1" stopColor="#2b5fe0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${u}-fres`} cx="0" cy="0" r={R} gradientUnits="userSpaceOnUse">
          <stop offset=".72" stopColor="#8fd0ff" stopOpacity="0" /><stop offset=".93" stopColor="#8fd0ff" stopOpacity=".3" /><stop offset="1" stopColor="#d6efff" stopOpacity=".7" />
        </radialGradient>
        {/* day-weighted light: everything atmospheric is masked by "how close to the sun" */}
        <linearGradient id={`${u}-dm`} gradientUnits="userSpaceOnUse" x1="0" y1={-R} x2="0" y2={R * 0.5}>
          <stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0.08" />
        </linearGradient>
        <mask id={`${u}-dmask`} maskUnits="userSpaceOnUse" x="-110" y="-110" width="220" height="220">
          <g transform={`rotate(${sun})`}><rect x="-110" y="-110" width="220" height="220" fill={`url(#${u}-dm)`} /></g>
        </mask>
        <linearGradient id={`${u}-rim`} gradientUnits="userSpaceOnUse" x1="0" y1={-R} x2="0" y2={R}>
          <stop offset="0" stopColor="#e6f5ff" stopOpacity=".95" /><stop offset=".5" stopColor="#9fd0ff" stopOpacity=".45" /><stop offset="1" stopColor="#5d9bf0" stopOpacity=".1" />
        </linearGradient>
        <radialGradient id={`${u}-lite`}><stop offset="0" stopColor="#fff0cc" stopOpacity="1" /><stop offset=".35" stopColor="#ffbf66" stopOpacity=".5" /><stop offset="1" stopColor="#ff8a2a" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${u}-glint`}><stop offset="0" stopColor="#fff" stopOpacity=".42" /><stop offset="1" stopColor="#bfe3ff" stopOpacity="0" /></radialGradient>
      </defs>
      <g transform="translate(100 100)">
        <g mask={`url(#${u}-dmask)`}><circle r="100" fill={`url(#${u}-halo)`} /></g>
        <circle r="100" fill={`url(#${u}-halo)`} opacity=".22" />
        <g clipPath={`url(#${u}-c)`}>
          <circle r={R} fill={`url(#${u}-sea)`} />
          {g.land.map((d, i) => <path key={'s' + i} d={d} fill="none" stroke="#49b9e0" strokeOpacity=".28" strokeWidth="2.4" strokeLinejoin="round" />)}
          {g.land.map((d, i) => <path key={i} d={d} fill={`url(#${u}-land)`} stroke="#0b2a4a" strokeOpacity=".3" strokeWidth=".3" />)}
          <g clipPath={`url(#${u}-lc)`}>
            {g.terrain.map((t, i) => <ellipse key={i} cx={t.x} cy={t.y} rx={t.rx} ry={t.ry} fill={`url(#${u}-t${i})`} />)}
            <path d={g.nile} fill="none" stroke="#3f7d3b" strokeWidth=".6" strokeLinecap="round" strokeLinejoin="round" opacity=".6" />
            <path d={g.nig} fill="#2f7a3a" opacity=".22" />
          </g>
          {g.holes.map((d, i) => <path key={i} d={d} fill="#0e4a92" />)}
          <path d={g.nig} fill="none" stroke="#eaf7cc" strokeOpacity=".32" strokeWidth=".3" />
          <circle r={R} fill={`url(#${u}-day)`} />
          {clouds && g.cl.map((c, i) => <ellipse key={i} cx={c.x} cy={c.y} rx={c.rx} ry={c.ry} transform={`rotate(${c.a} ${c.x} ${c.y})`} fill={`url(#${u}-cloud)`} opacity={c.o} />)}
          <ellipse cx={g.sub.x * 0.62} cy={g.sub.y * 0.62} rx="14" ry="8" transform={`rotate(${Math.round(sun - 90)} ${g.sub.x * 0.62} ${g.sub.y * 0.62})`} fill={`url(#${u}-glint)`} />
          <g mask={`url(#${u}-dmask)`}><circle r={R} fill={`url(#${u}-fres)`} /></g>
          <g transform={`rotate(${sun})`}>{nights}</g>
          {lights && g.city.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={f((3.2 + c.w * 3) * c.k)} fill={`url(#${u}-lite)`} opacity={f(c.night * Math.min(1, c.w))} />)}
          {lights && g.towns.map((t, i) => <circle key={i} cx={t.x} cy={t.y} r=".55" fill="#ffe9c0" opacity={f(t.a)} />)}
        </g>
        <g transform={`rotate(${sun})`}><circle r={R - 0.25} fill="none" stroke={`url(#${u}-rim)`} strokeWidth=".8" /></g>
      </g>
    </svg>
  )
}
