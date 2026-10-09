// Rocket — the hero object of the app. An original two-stage launch vehicle with a crew capsule on top.
//
//   MATERIALS   matte carbon airframe · brushed-titanium interstage, rings, grid fins, legs · copper-hot bells with soot
//   LIGHT       one cool rim from the left (sky / earthshine), one warm kick from the right and below (the flame itself).
//               Lighting is painted, not filtered: a cylinder is a horizontal gradient, the flame wash is a diagonal one
//               that is masked toward the lit side.
//   PERSPECTIVE the camera sits low on the stack, so every ring is a shallow arc: bowed up (∩) above the eye line,
//               flat at it, bowed down (∪) below. Vertical features (ribs, rivet columns) are spaced by sin(θ) so they
//               crowd toward the silhouette like they do on a real cylinder. These two cues are what make it an object.
//   ORIGINAL    the livery, the roundel and the vehicle's proportions are ours; nothing here traces a real vehicle.
//
// API: <Rocket size={px height of the vehicle} flame='off'|'idle'|'burn' tilt={deg} variant='stack'|'capsule' title? />
//   The SVG's layout box is the *vehicle* only; the plume spills below it (overflow: visible). Position the box, not the fire.
import { cx, useUid } from './Starfield.jsx'
import { Plume, PlumeDefs } from './Flame.jsx'

const CX = 60, R = 22, XL = CX - R, XR = CX + R
const EYE = 262                       // y of the camera's eye line on the stack
const VH_STACK = 372, EXIT_Y = 369    // viewBox height / y of the centre bell's exit plane
const f = (v) => +v.toFixed(2)
const sg = (y, r = R) => (y - EYE) * 0.0125 * (r / R)                    // ring sag: − above eye (∩), + below (∪)
const onRing = (y, r, dx) => y + sg(y, r) * (1 - (dx / r) ** 2)          // y of the front arc at offset dx
const ringQ = (y, r = R) => `M${f(CX - r)} ${f(y)}Q${CX} ${f(y + 2 * sg(y, r))} ${f(CX + r)} ${f(y)}`
const band = (y0, y1, r0 = R, r1 = R) =>
  `M${f(CX - r0)} ${f(y0)}Q${CX} ${f(y0 + 2 * sg(y0, r0))} ${f(CX + r0)} ${f(y0)}L${f(CX + r1)} ${f(y1)}Q${CX} ${f(y1 + 2 * sg(y1, r1))} ${f(CX - r1)} ${f(y1)}Z`
const rad = (a) => (a * Math.PI) / 180

function rivets(y, { r = R, from = -76, to = 76, step = 10.5, k = 0.5 } = {}) {
  let d = ''
  for (let a = from; a <= to + 0.01; a += step) {
    const dx = r * Math.sin(rad(a))
    d += `M${f(CX + dx - k)} ${f(onRing(y, r, dx))}a${k} ${k} 0 1 0 ${k * 2} 0a${k} ${k} 0 1 0 ${-k * 2} 0`
  }
  return d
}
function ribs(y0, y1, { r = R, from = -72, to = 72, step = 12 } = {}) {
  let d = ''
  for (let a = from; a <= to + 0.01; a += step) {
    const dx = r * Math.sin(rad(a))
    d += `M${f(CX + dx)} ${f(onRing(y0, r, dx))}L${f(CX + dx)} ${f(onRing(y1, r, dx))}`
  }
  return d
}
// the capsule's convex cone: right-hand Bézier, sampled so rings/windows can ask "how wide is the hull at y?"
const BZ = [[65.5, 3.6], [74, 7], [81, 19], [82, 34]]
const bz = (t) => {
  const m = 1 - t
  const w = [m * m * m, 3 * m * m * t, 3 * m * t * t, t * t * t]
  return [0, 1].map((i) => w.reduce((s, wi, k) => s + wi * BZ[k][i], 0))
}
const CAP_PTS = Array.from({ length: 41 }, (_, i) => bz(i / 40))
function capHalf(y) {
  if (y >= 34) return R
  if (y <= 3.6) return 5.5
  for (let i = 1; i < CAP_PTS.length; i++) {
    const [x1, y1] = CAP_PTS[i - 1], [x2, y2] = CAP_PTS[i]
    if (y >= y1 && y <= y2) return x1 + ((x2 - x1) * (y - y1)) / (y2 - y1 || 1) - CX
  }
  return 5.5
}

const CAP = 'M54.5 3.6C56 .9 64 .9 65.5 3.6C74 7 81 19 82 34L82 56L38 56L38 34C39 19 46 7 54.5 3.6Z'
const HULL_L = 'M54.5 3.6C46 7 39 19 38 34L38 338L40 350'          // left silhouette edge, nose → skirt
const HULL_R = 'M65.5 3.6C74 7 81 19 82 34L82 338L80 350'

/* ── defs ───────────────────────────────────────────────────────────────────────────────────────────────────── */
function Defs({ u, fine }) {
  const h = (id, stops, extra = {}) => (
    <linearGradient id={`${u}-${id}`} gradientUnits="userSpaceOnUse" x1="38" x2="82" y1="0" y2="0" {...extra}>
      {stops.map(([o, c, a], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a} />)}
    </linearGradient>
  )
  const v = (id, y1, y2, stops, x = {}) => (
    <linearGradient id={`${u}-${id}`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y1} y2={y2} {...x}>
      {stops.map(([o, c, a], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a} />)}
    </linearGradient>
  )
  return (
    <defs>
      {h('carbon', [[0, '#1d2336'], [0.03, '#5a6c9c'], [0.085, '#3e4b6e'], [0.17, '#2b3552'], [0.29, '#1a2032'], [0.44, '#10131f'], [0.6, '#090b12'], [0.78, '#0b0d16'], [0.9, '#17120f'], [0.955, '#3a241a'], [0.985, '#5e3623'], [1, '#1a1210']])}
      {h('ti', [[0, '#3c4357'], [0.05, '#8d98b0'], [0.14, '#eaeffa'], [0.22, '#c4ccdd'], [0.34, '#8a93a8'], [0.5, '#566077'], [0.66, '#727b92'], [0.82, '#a89fa0'], [0.92, '#d8b18b'], [1, '#3e4256']])}
      {h('tid', [[0, '#272d3d'], [0.06, '#6e7a91'], [0.16, '#bcc5d9'], [0.3, '#6d768b'], [0.5, '#3a4153'], [0.7, '#4e576a'], [0.88, '#8f7c6b'], [1, '#252a37']])}
      {/* the flame wash: diagonal, so the lower-right of the airframe takes the light and the upper-left never does */}
      <linearGradient id={`${u}-wd`} gradientUnits="userSpaceOnUse" x1="40" y1="236" x2="82" y2="362">
        <stop offset="0" stopColor="#ff7a1a" stopOpacity="0" />
        <stop offset=".5" stopColor="#ff7a1a" stopOpacity=".16" />
        <stop offset="1" stopColor="#ffa24a" stopOpacity=".6" />
      </linearGradient>
      {v('wv', 262, 350, [[0, '#ff6a14', 0], [0.55, '#ff7a1a', 0.16], [1, '#ffb25c', 0.5]])}
      {v('rimc', 0, 350, [[0, '#cfe2ff', 0.95], [0.5, '#9bbcff', 0.5], [1, '#7ea6ff', 0.14]])}
      {v('rimw', 40, 352, [[0, '#ffd9a8', 0.05], [0.5, '#ff9a4a', 0.25], [1, '#ffc27a', 0.95]])}
      {v('soot', 288, 346, [[0, '#0a0605', 0], [0.55, '#0a0605', 0.5], [1, '#0a0605', 0.94]])}
      {v('frost', 176, 244, [[0, '#dff0ff', 0.2], [0.45, '#cfe6ff', 0.07], [1, '#cfe6ff', 0]])}
      {v('aod', 0, 7, [[0, '#000', 0.6], [1, '#000', 0]])}
      {v('aou', 0, 7, [[0, '#000', 0], [1, '#000', 0.5]])}
      <linearGradient id={`${u}-win`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#26130a" /><stop offset=".38" stopColor="#6e3612" /><stop offset=".72" stopColor="#e88a2e" /><stop offset="1" stopColor="#ffd07a" />
      </linearGradient>
      <radialGradient id={`${u}-winc`} cx=".5" cy=".92" r=".7">
        <stop offset="0" stopColor="#fff0c4" stopOpacity=".85" /><stop offset="1" stopColor="#ffc267" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${u}-wglow`}>
        <stop offset="0" stopColor="#ffb25c" stopOpacity=".62" />
        <stop offset=".5" stopColor="#ff8a2a" stopOpacity=".2" />
        <stop offset="1" stopColor="#ff8a2a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${u}-glass`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#cfe6ff" stopOpacity=".7" />
        <stop offset=".42" stopColor="#cfe6ff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${u}-bell`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#2b303d" /><stop offset=".16" stopColor="#8c909e" /><stop offset=".3" stopColor="#d1ab8c" />
        <stop offset=".55" stopColor="#5b4737" /><stop offset=".8" stopColor="#3b2d26" /><stop offset="1" stopColor="#14100f" />
      </linearGradient>
      <linearGradient id={`${u}-bellsoot`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#0a0605" stopOpacity="0" /><stop offset="1" stopColor="#0a0605" stopOpacity=".78" />
      </linearGradient>
      <radialGradient id={`${u}-mouth`}>
        <stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#ffd98a" /><stop offset="1" stopColor="#ff7a1a" />
      </radialGradient>
      <radialGradient id={`${u}-shield`} cx=".5" cy=".3" r=".9">
        <stop offset="0" stopColor="#4a352a" /><stop offset=".6" stopColor="#1c1411" /><stop offset="1" stopColor="#0a0706" />
      </radialGradient>
      <linearGradient id={`${u}-finL`} gradientUnits="userSpaceOnUse" x1="12" x2="40" y1="0" y2="0">
        <stop offset="0" stopColor="#5d6880" /><stop offset=".4" stopColor="#c7cfe0" /><stop offset="1" stopColor="#6a738a" />
      </linearGradient>
      <linearGradient id={`${u}-finR`} gradientUnits="userSpaceOnUse" x1="80" x2="108" y1="0" y2="0">
        <stop offset="0" stopColor="#6a738a" /><stop offset=".6" stopColor="#a49c9c" /><stop offset="1" stopColor="#d6b18d" />
      </linearGradient>
      {/* legs / RCS pods sit outside the airframe's x-range, so they carry their own light */}
      <linearGradient id={`${u}-legL`} gradientUnits="userSpaceOnUse" x1="12" x2="40" y1="0" y2="0">
        <stop offset="0" stopColor="#2c3344" /><stop offset=".55" stopColor="#8d98b0" /><stop offset=".72" stopColor="#d4dcec" /><stop offset="1" stopColor="#3b4357" />
      </linearGradient>
      <linearGradient id={`${u}-legR`} gradientUnits="userSpaceOnUse" x1="80" x2="108" y1="0" y2="0">
        <stop offset="0" stopColor="#4a5368" /><stop offset=".4" stopColor="#8a8690" /><stop offset=".8" stopColor="#d8b08a" /><stop offset="1" stopColor="#6a5648" />
      </linearGradient>
      <linearGradient id={`${u}-lmg`} gradientUnits="userSpaceOnUse" x1="38" x2="82" y1="0" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity=".12" /><stop offset=".5" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" />
      </linearGradient>
      <mask id={`${u}-lm`} maskUnits="userSpaceOnUse" x="30" y="0" width="60" height="380"><rect x="30" y="0" width="60" height="380" fill={`url(#${u}-lmg)`} /></mask>
      <linearGradient id={`${u}-gl`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#dce8ff" stopOpacity="0" /><stop offset=".22" stopColor="#dce8ff" stopOpacity=".5" /><stop offset=".78" stopColor="#dce8ff" stopOpacity=".42" /><stop offset="1" stopColor="#dce8ff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${u}-streak`} gradientUnits="userSpaceOnUse" x1="43" x2="53" y1="0" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#dfe8ff" stopOpacity=".075" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      {/* floodlight kick: warm from the right edge, strongest at mid-height (where the pad's lamps stand) */}
      <linearGradient id={`${u}-fl`} gradientUnits="userSpaceOnUse" x1="82" x2="54" y1="0" y2="0">
        <stop offset="0" stopColor="#ffbe70" stopOpacity=".62" /><stop offset=".45" stopColor="#ff9a4a" stopOpacity=".16" /><stop offset="1" stopColor="#ff9a4a" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${u}-fmg`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="40" y2="350">
        <stop offset="0" stopColor="#fff" stopOpacity=".25" /><stop offset=".42" stopColor="#fff" /><stop offset=".7" stopColor="#fff" stopOpacity=".8" /><stop offset="1" stopColor="#fff" stopOpacity=".3" />
      </linearGradient>
      <mask id={`${u}-fm`} maskUnits="userSpaceOnUse" x="30" y="0" width="60" height="380"><rect x="30" y="0" width="60" height="380" fill={`url(#${u}-fmg)`} /></mask>
      <clipPath id={`${u}-hull`}>
        <path d={CAP} />
        <path d={`M${XL} 56H${XR}V338L${XR - 2} 350H${XL + 2}L${XL} 338Z`} />
      </clipPath>
      <clipPath id={`${u}-cap`}><path d={CAP} /></clipPath>
      {fine && (
        <pattern id={`${u}-brush`} width="2.6" height="12" patternUnits="userSpaceOnUse">
          <rect width=".34" height="12" fill="#fff" opacity=".09" />
          <rect x="1.4" width=".22" height="12" fill="#000" opacity=".09" />
        </pattern>
      )}
      <PlumeDefs u={u} W={44} L={236} />
    </defs>
  )
}

/* ── pieces ─────────────────────────────────────────────────────────────────────────────────────────────────── */
const Seam = ({ y, r = R, w = 0.5, a = 0.62 }) => (
  <g>
    <path d={ringQ(y, r)} fill="none" stroke="#000" strokeOpacity={a} strokeWidth={w} />
    <path d={ringQ(y + 0.62, r)} fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth={w * 0.8} />
  </g>
)

function GridFin({ u, side, y = 157 }) {
  const s = side            // -1 left, +1 right
  const hx = CX + s * (R + 0.6)
  const a = 21, b = 12.5, drop = 6
  const P = (t, k) => [hx + s * a * t, y + drop * t + b * k]          // t: 0 root → 1 tip, k: 0 top → 1 bottom edge
  const frame = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)].map(([x, yy]) => `${f(x)} ${f(yy)}`)
  const grid = []
  for (let i = 1; i < 5; i++) grid.push(`M${P(i / 5, 0).map(f).join(' ')}L${P(i / 5, 1).map(f).join(' ')}`)
  grid.push(`M${P(0, 0.5).map(f).join(' ')}L${P(1, 0.5).map(f).join(' ')}`)
  const fill = `url(#${u}-${s < 0 ? 'finL' : 'finR'})`
  return (
    <g>
      <path d={`M${frame.join('L')}Z`} fill="#05060a" fillOpacity=".86" />
      <path d={grid.join('')} transform="translate(0 1.1)" stroke="#000" strokeOpacity=".45" strokeWidth="1.15" fill="none" />
      <path d={grid.join('')} stroke={fill} strokeWidth="1.15" fill="none" />
      <path d={`M${frame.join('L')}Z`} transform="translate(0 1.2)" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="1.6" strokeLinejoin="round" />
      <path d={`M${frame.join('L')}Z`} fill="none" stroke={fill} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={`M${f(hx - s * 1.6)} ${y + 12}L${P(0.5, 1).map(f).join(' ')}`} stroke={fill} strokeWidth=".7" />
      <path d={`M${P(0, 0).map(f).join(' ')}L${P(1, 0).map(f).join(' ')}`} stroke="#fff" strokeOpacity=".5" strokeWidth=".4" />
      <rect x={s < 0 ? hx - 1.2 : hx - 2.8} y={y + 1.6} width="4" height={b - 3.2} rx=".8" fill={`url(#${u}-tid)`} />
    </g>
  )
}

function Leg({ u, side }) {
  const s = side
  const fill = `url(#${u}-${s < 0 ? 'legL' : 'legR'})`
  const ex = CX + s * R                      // silhouette edge
  const P = (dx, y) => `${f(ex + s * dx)} ${y}`
  // a stowed landing leg, hinged at the silhouette and splayed ~8 units so the stack stands on a flared stance
  return (
    <g>
      <path d={`M${P(1.2, 298)}L${P(-3.6, 298)}L${P(4.6, 345)}L${P(8.2, 345)}Z`} fill={fill} />
      <path d={`M${P(-3.6, 298)}L${P(4.6, 345)}`} stroke="#fff" strokeOpacity=".34" strokeWidth=".45" />
      <path d={`M${P(-0.6, 306)}L${P(6.2, 342)}`} stroke="#000" strokeOpacity=".4" strokeWidth=".5" />
      <path d={`M${P(-4.6, 294)}L${P(1.8, 294)}L${P(1.8, 302)}L${P(-4.6, 302)}Z`} fill={fill} />
      <path d={`M${P(-4.6, 294)}L${P(1.8, 294)}`} stroke="#fff" strokeOpacity=".4" strokeWidth=".4" />
      <path d={`M${P(-4.6, 302)}L${P(1.8, 302)}`} stroke="#000" strokeOpacity=".5" strokeWidth=".5" />
      <path d={`M${P(-3.4, 330)}L${P(4.6, 321)}`} stroke={fill} strokeWidth="1" />
      <path d={`M${P(2.4, 344.4)}L${P(13.6, 344.4)}L${P(14.8, 347.8)}L${P(1.4, 347.8)}Z`} fill={fill} />
      <path d={`M${P(2.4, 344.4)}L${P(13.6, 344.4)}`} stroke="#fff" strokeOpacity=".45" strokeWidth=".4" />
    </g>
  )
}

/** The crew capsule, drawn in the stack's own coordinates (apex y≈1, skirt to y=56) so it can be reused scaled. */
function Capsule({ u, fine, solo }) {
  const ringY = [19, 28.6, 40]
  const capD = `M${CX - 20} -2H${CX + 20}V11.2Q${CX} ${11.2 + 2 * sg(11.2, 14.4)} ${CX - 20} 11.2Z`
  return (
    <g>
      {/* docking probe: a slim mast proud of the nose, tipped with a nav light */}
      <path d={`M${CX - 0.7} 2.6L${CX - 0.45} -6.4L${CX + 0.45} -6.4L${CX + 0.7} 2.6Z`} fill={`url(#${u}-tid)`} />
      <rect x={CX - 1.5} y="1.6" width="3" height="1.6" rx=".6" fill={`url(#${u}-ti)`} />
      <circle className="art-rk__nav" cx={CX} cy="-7" r=".95" fill="#ff4f62" />
      <path d={CAP} fill={`url(#${u}-carbon)`} />
      <g clipPath={`url(#${u}-cap)`}>
        <path d="M50 8C44 15 40.4 24 39.6 38L45.6 38C46.4 26 49.4 17 54.4 10Z" fill="#fff" opacity=".07" />
        {ringY.map((y) => <Seam key={y} y={y} r={capHalf(y)} />)}
        {fine && ringY.map((y) => <path key={y} d={rivets(y + 1.5, { r: capHalf(y + 1.5) - 0.6, step: 11, k: 0.32 })} fill="#fff" opacity=".18" />)}
        {/* nose cap: brushed titanium over the docking hatch */}
        <path d={capD} fill={`url(#${u}-ti)`} />
        {fine && <path d={capD} fill={`url(#${u}-brush)`} />}
        <path d={ringQ(11.4, 14.4)} stroke="#000" strokeOpacity=".72" strokeWidth=".6" fill="none" />
        <path d={ringQ(6.4, 8.6)} stroke="#000" strokeOpacity=".42" strokeWidth=".42" fill="none" />
        <path d={ringQ(7.2, 8.6)} stroke="#fff" strokeOpacity=".3" strokeWidth=".35" fill="none" />
        {/* skirt */}
        <path d={band(46, 56)} fill="#000" opacity=".28" />
        <path d={`M${XL} 46Q${CX} ${46 + 2 * sg(46)} ${XR} 46`} stroke="#000" strokeOpacity=".7" strokeWidth=".55" fill="none" />
      </g>
      {/* the windows: main, offset right of the axis because the cone turns away; a smaller one wrapping the left flank */}
      <g>
        <ellipse className="art-rk__winglow" cx="64.8" cy="30" rx="16" ry="15" fill={`url(#${u}-wglow)`} />
        <path d="M59.6 22Q64.8 20.4 70 22L70.9 34.2Q64.8 36.8 58.7 34.2Z" fill="#05060a" stroke={`url(#${u}-tid)`} strokeWidth="1.25" strokeLinejoin="round" />
        <path className="art-rk__win" d="M60.4 22.8Q64.8 21.5 69.2 22.8L70 33.5Q64.8 35.7 59.6 33.5Z" fill={`url(#${u}-win)`} />
        <path d="M60.4 22.8Q64.8 21.5 69.2 22.8L70 33.5Q64.8 35.7 59.6 33.5Z" fill={`url(#${u}-winc)`} />
        <path d="M60.5 22.9Q64.8 21.6 69 22.8L68.6 26.4Q64.6 25 60.3 27Z" fill={`url(#${u}-glass)`} />
        <path d="M61.2 23.6L60.7 31.4" stroke="#fff" strokeOpacity=".5" strokeWidth=".42" strokeLinecap="round" />
        <path d="M48.8 25.6Q50.8 24.8 52.6 25.8L53 32.2Q50.8 33.4 48.6 32.2Z" fill="#05060a" stroke={`url(#${u}-tid)`} strokeWidth=".75" />
        <path d="M49.3 26.3Q50.8 25.7 52.2 26.4L52.4 31.6Q50.8 32.4 49.2 31.6Z" fill={`url(#${u}-win)`} opacity=".62" />
      </g>
      {/* RCS pods on the skirt, proud of the silhouette */}
      <path d="M35 46.6h3.2v6.4H35z" fill={`url(#${u}-legL)`} />
      <path d="M81.8 46.6H85v6.4h-3.2z" fill={`url(#${u}-legR)`} />
      <path d="M35.6 48.6h1.2M35.6 50.6h1.2M83.2 48.6h1.2M83.2 50.6h1.2" stroke="#000" strokeOpacity=".7" strokeWidth=".6" />
      {solo && (
        <g>
          <path d={ringQ(34, R)} stroke="#fff" strokeOpacity=".07" strokeWidth=".4" fill="none" />
          <path d="M52.6 14.4Q60 12.6 67.4 14.4" stroke="#fff" strokeOpacity=".14" strokeWidth=".4" fill="none" />
        </g>
      )}
    </g>
  )
}

function Roundel({ u, x, y, r = 8.4 }) {
  const hex = (rr, rot = 0) => Array.from({ length: 6 }, (_, i) => { const a = rad(60 * i - 90 + rot); return `${f(x + rr * Math.cos(a) * 0.96)} ${f(y + rr * Math.sin(a))}` }).join('L')
  const ticks = Array.from({ length: 6 }, (_, i) => { const a = rad(60 * i - 90); return `M${f(x + (r - 1.6) * Math.cos(a) * 0.96)} ${f(y + (r - 1.6) * Math.sin(a))}L${f(x + r * Math.cos(a) * 0.96)} ${f(y + r * Math.sin(a))}` }).join('')
  return (
    <g>
      <path d={`M${hex(r + 1.2)}Z`} fill="#000" opacity=".35" />
      <path d={`M${hex(r)}Z`} fill={`url(#${u}-ti)`} />
      <path d={`M${hex(r - 1.5)}Z`} fill="#0b0d15" />
      <path d={`M${hex(r - 1.5)}Z`} fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth=".35" />
      <path d={ticks} stroke="#000" strokeOpacity=".5" strokeWidth=".4" />
      {/* KIND mark: a chevron climbing out of a base line, in the single hot colour */}
      <path d={`M${f(x - 3.1)} ${f(y + 0.4)}L${f(x)} ${f(y - 2.9)}L${f(x + 3.1)} ${f(y + 0.4)}`} stroke="#ff7a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={`M${f(x - 3.1)} ${f(y + 3.1)}L${f(x)} ${f(y - 0.2)}L${f(x + 3.1)} ${f(y + 3.1)}`} stroke="#ffc43d" strokeOpacity=".65" strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  )
}

// hand-placed soot: tapered streaks, longer on the lit (right) side where the flame licks the tank
const SOOT = [
  [43, 318, 0.8, 30], [46.5, 312, 0.6, 26], [50, 322, 1, 34], [53.6, 308, 0.7, 24], [57, 316, 0.6, 28], [60.5, 306, 0.9, 34], [64, 320, 0.7, 26],
  [67.6, 310, 0.6, 30], [71, 304, 1, 38], [74.4, 314, 0.7, 28], [77.6, 306, 0.6, 34],
].map(([x, y, w, h]) => `M${x} ${y + h}L${x - w / 2} ${y + h * 0.1}L${x} ${y}L${x + w / 2} ${y + h * 0.1}Z`).join('')

function Bells({ u }) {
  const bell = (x, top, bot, wTop, wBot, k) => (
    <g key={x}>
      <path d={`M${x - wTop / 2} ${top}L${x + wTop / 2} ${top}L${x + wBot / 2} ${bot}L${x - wBot / 2} ${bot}Z`} fill={`url(#${u}-bell)`} />
      <path d={`M${x - wTop / 2} ${top}L${x + wTop / 2} ${top}L${x + wBot / 2} ${bot}L${x - wBot / 2} ${bot}Z`} fill={`url(#${u}-bellsoot)`} />
      <path d={`M${x - wTop / 2 + 0.7} ${top}L${x - wBot / 2 + 1} ${bot}`} stroke="#fff" strokeOpacity=".28" strokeWidth=".4" />
      {/* the exit plane: a dark mouth that lights up when the engines do */}
      <ellipse cx={x} cy={bot} rx={wBot / 2} ry={k} fill="#07080c" />
      <ellipse className="art-rk__mouth" cx={x} cy={bot} rx={wBot / 2 - 1.1} ry={k - 0.5} fill={`url(#${u}-mouth)`} />
    </g>
  )
  return (
    <g>
      {bell(CX - 13, 347, 365, 7.6, 11, 1.6)}
      {bell(CX + 13, 347, 365, 7.6, 11, 1.6)}
      {bell(CX, 348, EXIT_Y, 9.4, 14.4, 1.9)}
      {/* thrust-structure lip under the skirt */}
      <path d={band(349.2, 351.4, 19.6, 19.2)} fill="#0b0d15" />
      <path d={ringQ(349.5, 19.6)} stroke="#fff" strokeOpacity=".22" strokeWidth=".4" fill="none" />
    </g>
  )
}

/** The full vehicle. */
function Stack({ u, fine }) {
  const S1 = [176, 338], S2 = [63, 152]
  const seams1 = [208, 244, 280, 314]
  const seams2 = [92, 124]
  return (
    <g>
      {/* second stage */}
      <path d={band(S2[0], S2[1])} fill={`url(#${u}-carbon)`} />
      {/* first stage */}
      <path d={band(S1[0], S1[1])} fill={`url(#${u}-carbon)`} />
      {/* panel tone: alternate panels sit a hair lighter so the skin reads as separate sheets */}
      <path d={band(92, 124)} fill="#fff" opacity=".028" />
      <path d={band(208, 244)} fill="#fff" opacity=".03" />
      <path d={band(280, 314)} fill="#fff" opacity=".03" />
      {/* the glint: a hairline of sky reflected in each panel, broken at the seams the way real sheet metal breaks it */}
      <g>
        {[[65, 92, 0.2], [93, 124, 0.3], [125, 151, 0.22], [178, 207, 0.24], [209, 243, 0.32], [245, 279, 0.2], [281, 313, 0.28], [315, 336, 0.16]].map(([y0, y1, a], i) => (
          <rect key={i} x={f(47.4 + (i % 3) * 0.35)} y={y0} width=".9" height={y1 - y0} rx=".45" fill={`url(#${u}-gl)`} opacity={a * 3} />
        ))}
      </g>
      {/* broad sky reflection down the left of both stages */}
      <rect x="43" y="64" width="10" height="86" fill={`url(#${u}-streak)`} />
      <rect x="43" y="178" width="10" height="158" fill={`url(#${u}-streak)`} />
      {/* interstage: brushed titanium */}
      <path d={band(152, 176)} fill={`url(#${u}-ti)`} />
      {fine && <path d={band(152, 176)} fill={`url(#${u}-brush)`} />}
      {/* separation ring under the capsule */}
      <path d={band(56, 63, R + 0.7, R + 0.7)} fill={`url(#${u}-ti)`} />
      {fine && <path d={band(56, 63, R + 0.7, R + 0.7)} fill={`url(#${u}-brush)`} />}
      {/* engine skirt (boat-tail): dark thermal shroud with a titanium lip */}
      <path d={`M${XL} 338Q${CX} ${338 + 2 * sg(338)} ${XR} 338L${CX + 19.6} 350Q${CX} ${350 + 2 * sg(350, 19.6)} ${CX - 19.6} 350Z`} fill={`url(#${u}-carbon)`} />
      <path d={`M${XL} 338Q${CX} ${338 + 2 * sg(338)} ${XR} 338L${XR - 0.2} 340.2Q${CX} ${340.2 + 2 * sg(340.2)} ${XL + 0.2} 340.2Z`} fill={`url(#${u}-tid)`} />
      <path d={ringQ(344.4, 21)} stroke="#000" strokeOpacity=".5" strokeWidth=".5" fill="none" />
      <path d={ringQ(347.2, 20.3)} stroke="#000" strokeOpacity=".5" strokeWidth=".5" fill="none" />

      <Capsule u={u} fine={fine} />

      {/* ambient occlusion under every lip */}
      {[63, 176, 152].map((y) => (
        <rect key={y} x={XL} y={y + sg(y) * 0.2} width={2 * R} height="7" fill={`url(#${u}-aod)`} opacity={y === 152 ? 0.35 : 0.8} />
      ))}
      <rect x={XL} y="146" width={2 * R} height="7" fill={`url(#${u}-aou)`} opacity=".45" />
      <rect x={XL} y="169" width={2 * R} height="7.4" fill={`url(#${u}-aou)`} opacity=".4" />
      <rect x={XL} y="331" width={2 * R} height="8" fill={`url(#${u}-aou)`} opacity=".7" />

      {/* stage 2: seams, pinstripe, roundel, lettering, cable raceway */}
      {seams2.map((y) => <Seam key={y} y={y} />)}
      <path d={ringQ(70.4)} stroke="#ff7a1a" strokeWidth="1.5" fill="none" opacity=".95" />
      <path d={ringQ(73.2)} stroke="#ff7a1a" strokeWidth=".45" fill="none" opacity=".6" />
      <Roundel u={u} x={CX + 1.6} y={107} />
      <Raceway u={u} y0={78} y1={148} />
      {fine && (
        <g>
          <path d={rivets(98.6, { step: 12 })} fill="#fff" opacity=".16" />
          <path d={rivets(116, { step: 12 })} fill="#fff" opacity=".16" />
          <text transform={`translate(${CX - 14.5} 140) rotate(-90) scale(.94 1)`} className="art-rk__txt" fontSize="4.6" letterSpacing="1.4" fill="#f4f6fb" fillOpacity=".52">STAGE 02</text>
        </g>
      )}

      {/* interstage: ribs, bolts, seam lines */}
      <path d={ribs(155.4, 173.4, { step: 10 })} stroke="#000" strokeOpacity=".2" strokeWidth=".45" />
      <path d={ribs(155.9, 173.9, { step: 10, from: -68, to: 76 })} stroke="#fff" strokeOpacity=".1" strokeWidth=".4" />
      <Seam y={152} r={R} w={0.6} a={0.8} />
      <Seam y={176} r={R} w={0.6} a={0.8} />
      {fine && <path d={rivets(158.6, { step: 8 })} fill="#000" opacity=".5" />}
      {fine && <path d={rivets(171, { step: 8 })} fill="#000" opacity=".5" />}

      {/* stage 1: panels, frost, lettering, soot */}
      {seams1.map((y) => <Seam key={y} y={y} />)}
      {fine && seams1.map((y) => <path key={y} d={rivets(y + 2.6, { step: 9.5, k: 0.42 })} fill="#fff" opacity=".15" />)}
      <path d={ribs(177, 337, { step: 62, from: -38, to: 24 })} stroke="#000" strokeOpacity=".4" strokeWidth=".4" />
      <rect x={XL} y="176" width={2 * R} height="70" fill={`url(#${u}-frost)`} />
      <Raceway u={u} y0={182} y1={330} />
      <text transform={`translate(${CX - 5.6} 276) rotate(-90) scale(.94 1)`} className="art-rk__txt art-rk__txt--big" fontSize="13.4" letterSpacing="3.2" fill="#f4f6fb" fillOpacity=".9">KIND</text>
      {fine && (
        <g>
          <path d={ringQ(187.6, R)} stroke="#ff7a1a" strokeWidth=".5" fill="none" opacity=".8" />
          <text transform={`translate(${CX - 14.5} 232) rotate(-90) scale(.94 1)`} className="art-rk__txt" fontSize="4.6" letterSpacing="1.4" fill="#f4f6fb" fillOpacity=".5">STAGE 01</text>
        </g>
      )}
      <rect x={XL} y="288" width={2 * R} height="52" fill={`url(#${u}-soot)`} />
      <path d={SOOT} fill="#0a0605" opacity=".2" />

      {/* grid fins, landing legs, engines */}
      <GridFin u={u} side={-1} />
      <GridFin u={u} side={1} />
      <Leg u={u} side={-1} />
      <Leg u={u} side={1} />
      <Bells u={u} />

      {/* light: the flame's wash (masked toward the lit side), then the two rim lights */}
      <g clipPath={`url(#${u}-hull)`}>
        <g className="art-rk__lit" mask={`url(#${u}-lm)`}>
          <rect x={XL} y="150" width={2 * R} height="204" fill={`url(#${u}-wd)`} />
          <rect x={XL} y="250" width={2 * R} height="104" fill={`url(#${u}-wv)`} />
        </g>
        <g className="art-rk__flood" mask={`url(#${u}-fm)`}><rect x={XL} y="0" width={2 * R} height="352" fill={`url(#${u}-fl)`} /></g>
        <path d={HULL_L} fill="none" stroke={`url(#${u}-rimc)`} strokeWidth="2.6" />
        <path className="art-rk__rimw" d={HULL_R} fill="none" stroke={`url(#${u}-rimw)`} strokeWidth="2.6" />
      </g>
      <g fill="#fff" opacity=".85">
        <circle cx="49.6" cy="59.5" r=".55" /><circle cx="49.2" cy="154.4" r=".5" />
      </g>
    </g>
  )
}

// a cable raceway: a segmented titanium duct on the lit side, foreshortened because it sits ~56° round the tank
function Raceway({ u, y0, y1 }) {
  const x = CX + R * Math.sin(rad(56))
  const n = Math.max(2, Math.round((y1 - y0) / 34))
  const seg = (y1 - y0) / n
  return (
    <g opacity=".42">
      {Array.from({ length: n }, (_, i) => {
        const ya = y0 + i * seg + 1.6, yb = y0 + (i + 1) * seg - 1.6
        return (
          <g key={i}>
            <rect x={f(x - 0.85)} y={f(ya)} width="1.7" height={f(yb - ya)} rx=".4" fill={`url(#${u}-tid)`} />
            <rect x={f(x - 1.25)} y={f(ya - 0.4)} width="2.5" height=".9" rx=".3" fill={`url(#${u}-ti)`} />
            <rect x={f(x - 1.25)} y={f(yb - 0.5)} width="2.5" height=".9" rx=".3" fill={`url(#${u}-ti)`} />
          </g>
        )
      })}
    </g>
  )
}

/** Stand-alone spacecraft: crew capsule on a service module with folded-out solar wings and a single engine.
 *  Its own 120 × 124 frame; the plume leaves the bell at y = 122. */
const C2 = [[68, 13], [73, 22], [80, 38], [84, 54]]
const C2_PTS = Array.from({ length: 41 }, (_, i) => {
  const t = i / 40, m = 1 - t
  const w = [m * m * m, 3 * m * m * t, 3 * m * t * t, t * t * t]
  return [0, 1].map((k) => w.reduce((s, wi, j) => s + wi * C2[j][k], 0))
})
function c2Half(y) {
  if (y >= 54) return 24
  if (y <= 13) return 8
  for (let i = 1; i < C2_PTS.length; i++) {
    const [x1, y1] = C2_PTS[i - 1], [x2, y2] = C2_PTS[i]
    if (y >= y1 && y <= y2) return x1 + ((x2 - x1) * (y - y1)) / (y2 - y1 || 1) - CX
  }
  return 24
}
const CAP2 = 'M52 13C52.6 10.4 55.8 9.4 60 9.4C64.2 9.4 67.4 10.4 68 13C73 22 80 38 84 54L84 62L36 62L36 54C40 38 47 22 52 13Z'
const CAP2_Y = 122

function Wing({ u, side }) {
  const s = side
  const P = (t, k) => [CX + s * (22 + 30 * t), 80 - 4.4 * t + 11 * k + 0.0 * t]     // t: root → tip, k: top → bottom
  const pts = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]
  const d = `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`
  const cells = []
  for (let i = 1; i < 6; i++) cells.push(`M${P(i / 6, 0).map(f).join(' ')}L${P(i / 6, 1).map(f).join(' ')}`)
  cells.push(`M${P(0, 0.5).map(f).join(' ')}L${P(1, 0.5).map(f).join(' ')}`)
  return (
    <g>
      <path d={d} fill={`url(#${u}-pv)`} />
      <path d={cells.join('')} stroke="#7fa4ff" strokeOpacity=".22" strokeWidth=".35" />
      <path d={`M${P(0, 0).map(f).join(' ')}L${P(1, 0).map(f).join(' ')}L${P(1, 0.22).map(f).join(' ')}L${P(0, 0.22).map(f).join(' ')}Z`} fill="#bcd4ff" opacity=".13" />
      <path d={d} fill="none" stroke={`url(#${u}-${s < 0 ? 'finL' : 'finR'})`} strokeWidth=".9" strokeLinejoin="round" />
      <rect x={s < 0 ? CX - 24.4 : CX + 21.2} y="82.6" width="3.2" height="6" rx=".6" fill={`url(#${u}-tid)`} />
    </g>
  )
}

function CapsuleSolo({ u, fine }) {
  const seams = [25, 36.4, 48]
  const capD = `M${CX - 14} 4H${CX + 14}V22.6Q${CX} ${22.6 + 2 * sg(22.6, 11)} ${CX - 14} 22.6Z`
  return (
    <g>
      <defs>
        <clipPath id={`${u}-cap2`}><path d={CAP2} /></clipPath>
        <linearGradient id={`${u}-pv`} gradientUnits="userSpaceOnUse" x1="0" y1="76" x2="0" y2="92">
          <stop offset="0" stopColor="#233f86" /><stop offset=".5" stopColor="#10224f" /><stop offset="1" stopColor="#070d24" />
        </linearGradient>
      </defs>
      {/* wings first: they sit behind the service module's silhouette */}
      <Wing u={u} side={-1} />
      <Wing u={u} side={1} />
      {/* docking probe */}
      <path d={`M${CX - 0.8} 10L${CX - 0.5} 1.4L${CX + 0.5} 1.4L${CX + 0.8} 10Z`} fill={`url(#${u}-tid)`} />
      <circle className="art-rk__nav" cx={CX} cy="1" r="1" fill="#ff4f62" />
      {/* capsule */}
      <path d={CAP2} fill={`url(#${u}-carbon)`} />
      <g clipPath={`url(#${u}-cap2)`}>
        <path d="M50 18C44 26 40 38 38.4 56L45 56C46 40 49.4 28 55 20Z" fill="#fff" opacity=".07" />
        {seams.map((y) => <Seam key={y} y={y} r={c2Half(y)} />)}
        {fine && seams.map((y) => <path key={y} d={rivets(y + 1.6, { r: c2Half(y + 1.6) - 0.6, step: 10, k: 0.32 })} fill="#fff" opacity=".18" />)}
        <path d={capD} fill={`url(#${u}-ti)`} />
        {fine && <path d={capD} fill={`url(#${u}-brush)`} />}
        <path d={ringQ(22.8, 11)} stroke="#000" strokeOpacity=".7" strokeWidth=".6" fill="none" />
        <path d={ringQ(14.6, 8.4)} stroke="#000" strokeOpacity=".42" strokeWidth=".42" fill="none" />
        <path d={ringQ(15.4, 8.4)} stroke="#fff" strokeOpacity=".3" strokeWidth=".35" fill="none" />
        <path d={band(54, 62, 24, 24)} fill="#000" opacity=".3" />
        <path d={ringQ(54, 24)} stroke="#000" strokeOpacity=".7" strokeWidth=".55" fill="none" />
        <path d={HULL2_L} fill="none" stroke={`url(#${u}-rimc)`} strokeWidth="2.6" />
        <path className="art-rk__rimw" d={HULL2_R} fill="none" stroke={`url(#${u}-rimw)`} strokeWidth="2.6" />
      </g>
      {/* windows */}
      <g>
        <ellipse className="art-rk__winglow" cx="66" cy="38" rx="17" ry="16" fill={`url(#${u}-wglow)`} />
        <path d="M61 31.4Q66 29.8 71 31.4L71.9 43.4Q66 46 60.1 43.4Z" fill="#05060a" stroke={`url(#${u}-tid)`} strokeWidth="1.25" strokeLinejoin="round" />
        <path className="art-rk__win" d="M61.8 32.2Q66 30.9 70.2 32.2L71 42.8Q66 45 61 42.8Z" fill={`url(#${u}-win)`} />
        <path d="M61.8 32.2Q66 30.9 70.2 32.2L71 42.8Q66 45 61 42.8Z" fill={`url(#${u}-winc)`} />
        <path d="M61.9 32.3Q66 31 70 32.2L69.7 35.8Q65.8 34.4 61.7 36.4Z" fill={`url(#${u}-glass)`} />
        <path d="M62.5 33L62 40.6" stroke="#fff" strokeOpacity=".5" strokeWidth=".42" strokeLinecap="round" />
        <path d="M50.4 34.8Q52.4 34 54.2 35L54.6 41.2Q52.4 42.4 50.2 41.2Z" fill="#05060a" stroke={`url(#${u}-tid)`} strokeWidth=".75" />
        <path d="M50.9 35.5Q52.4 34.9 53.8 35.6L54 40.6Q52.4 41.4 50.8 40.6Z" fill={`url(#${u}-win)`} opacity=".62" />
      </g>
      {/* RCS pods on the capsule's shoulder */}
      <path d="M33 54.6h3.4v6.6H33z" fill={`url(#${u}-legL)`} />
      <path d="M83.6 54.6H87v6.6h-3.4z" fill={`url(#${u}-legR)`} />
      <path d="M33.7 56.8h1.4M33.7 58.8h1.4M84.9 56.8h1.4M84.9 58.8h1.4" stroke="#000" strokeOpacity=".7" strokeWidth=".6" />
      {/* service module */}
      <path d={band(66, 104, 22, 22)} fill={`url(#${u}-carbon)`} />
      <path d={band(61.4, 66.2, 25, 25)} fill={`url(#${u}-ti)`} />
      {fine && <path d={band(61.4, 66.2, 25, 25)} fill={`url(#${u}-brush)`} />}
      <path d={band(103.6, 107, 23, 23)} fill={`url(#${u}-ti)`} />
      <rect x={XL} y="66" width={2 * R} height="6" fill={`url(#${u}-aod)`} />
      <rect x={XL} y="98" width={2 * R} height="6" fill={`url(#${u}-aou)`} />
      <Seam y={76} r={22} /><Seam y={96} r={22} />
      {fine && <path d={rivets(78.8, { r: 22, step: 11, k: 0.4 })} fill="#fff" opacity=".15" />}
      {fine && <path d={rivets(98.8, { r: 22, step: 11, k: 0.4 })} fill="#fff" opacity=".15" />}
      <Roundel u={u} x={CX + 2} y={86} r={6.6} />
      <text transform={`translate(${CX - 11.6} 100.4) rotate(-90) scale(.94 1)`} className="art-rk__txt" fontSize="4.8" letterSpacing="1.8" fill="#f4f6fb" fillOpacity=".62">KIND</text>
      <g clipPath={`url(#${u}-sm)`}>
        <path d="M38 66V104" fill="none" stroke={`url(#${u}-rimc)`} strokeWidth="2.6" />
        <path className="art-rk__rimw" d="M82 66V104" fill="none" stroke={`url(#${u}-rimw)`} strokeWidth="2.6" />
      </g>
      {/* the engine */}
      <path d={`M${CX - 6.2} 107L${CX + 6.2} 107L${CX + 10} 120L${CX - 10} 120Z`} fill={`url(#${u}-bell)`} />
      <path d={`M${CX - 6.2} 107L${CX + 6.2} 107L${CX + 10} 120L${CX - 10} 120Z`} fill={`url(#${u}-bellsoot)`} />
      <ellipse cx={CX} cy="120" rx="10" ry="1.9" fill="#07080c" />
      <ellipse className="art-rk__mouth" cx={CX} cy="120" rx="8.8" ry="1.4" fill={`url(#${u}-mouth)`} />
      <defs><clipPath id={`${u}-sm`}><path d={`M38 66H82V104H38Z`} /></clipPath></defs>
    </g>
  )
}
const HULL2_L = 'M52 13C47 22 40 38 36 54L36 62'
const HULL2_R = 'M68 13C73 22 80 38 84 54L84 62'

/** The rocket's drawing without an <svg> wrapper: defs + plume + vehicle, in the 120 × 372 stack frame (or 120 × 112
 *  capsule frame). Scenes drop it inside a transformed <g>. `u` must be unique per instance (see useUid). */
export function RocketArt({ u, flame = 'off', variant = 'stack', fine = true }) {
  const stack = variant !== 'capsule'
  const plumeAt = stack ? [CX, EXIT_Y] : [CX, CAP2_Y]
  const scaleP = stack ? 1 : 0.5
  return (
    <>
      <Defs u={u} fine={fine} />
      <g transform={`translate(${plumeAt[0]} ${plumeAt[1]}) scale(${scaleP})`}>
        <Plume u={u} W={44} L={236} jets={stack ? [-26, 0, 26] : [0]} mode={flame} seed={11} />
      </g>
      {stack ? <Stack u={u} fine={fine} /> : <CapsuleSolo u={u} fine={fine} />}
    </>
  )
}
export const ROCKET_FRAME = { w: 120, h: VH_STACK, cx: CX, legs: 347.8, exit: EXIT_Y }

export default function Rocket({
  size = 240, flame = 'off', tilt = 0, variant = 'stack', float = false, title, className, style, ...rest
}) {
  const u = useUid('rk')
  const stack = variant !== 'capsule'
  const VW = 120, VH = stack ? VH_STACK : CAP2_Y + 2
  return (
    <svg
      className={cx('art-rk', className)}
      data-flame={flame} data-variant={variant} data-float={float ? '' : undefined}
      viewBox={`0 0 ${VW} ${VH}`}
      width={(size * VW) / VH} height={size}
      role={title ? 'img' : undefined} aria-hidden={title ? undefined : 'true'} focusable="false"
      style={{ '--tilt': `${tilt}deg`, ...style }}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <RocketArt u={u} flame={flame} variant={variant} fine={size >= 132} />
    </svg>
  )
}
