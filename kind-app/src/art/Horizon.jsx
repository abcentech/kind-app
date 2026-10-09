// Horizon — the backdrop every scene stands on. Three variants, one contract:
//   <Horizon variant='pad' | 'limb' | 'space' stars seed twinkle parallax sun>{children}</Horizon>
// It fills its (positioned) parent. `children` are SVG, drawn in the variant's own 390 × 620 world, on top of the
// scenery and below nothing — LaunchPad puts the pad and the rocket there, OrbitScene the orbit and its traveller.
//
//   pad    dusk over a spaceport: indigo → violet → ember, three haze-stepped ridges (far hills / tank farm / palms and
//          bush), a distant gantry with a beacon, sodium-lit apron. World is 390 × 620, bottom-centre anchored, `meet`.
//   limb   the Earth's curved edge from orbit: troposphere orange line, blue-white airglow, a thin green airglow band,
//          cloud streaks laid along the curve, sparse city lights, optional sunrise at the limb. `slice`, bottom anchored.
//   space  deep field with two faint nebulae; stars only.
//
// Stars sit *between* the sky and the ground so a ridge always occludes them. Everything is gradients; no filters.
import { useMemo } from 'react'
import Starfield, { cx, mulberry32, useUid } from './Starfield.jsx'

export const WORLD = { w: 390, h: 620 }
const f = (v) => +v.toFixed(1)

/* ── geometry helpers (shared with LaunchPad / OrbitScene) ───────────────────────────────────────────────────── */

/** A soft skyline: sum of sines sampled every `step`, smoothed with midpoint quadratics, closed down to `bottom`. */
export function ridge({ y, amp = 10, seed = 1, x0 = -900, x1 = 1300, step = 16, bottom = 760, detail = 1 }) {
  const r = mulberry32(seed * 131 + 7)
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28]
  const pts = []
  for (let x = x0; x <= x1; x += step) {
    const h = Math.sin(x * 0.011 + ph[0]) * 0.55 + Math.sin(x * 0.027 + ph[1]) * 0.3 + Math.sin(x * 0.061 + ph[2]) * 0.14 * detail + Math.sin(x * 0.13 + ph[3]) * 0.05 * detail
    pts.push([x, y - h * amp])
  }
  let d = `M${x0} ${bottom}L${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2
    d += `Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`
  }
  const last = pts[pts.length - 1]
  return d + `L${f(last[0])} ${f(last[1])}L${x1} ${bottom}Z`
}

/** A lattice tower: two legs (optionally tapering), rungs, X-braces. Returns three stroke paths. */
export function lattice({ xl, xr, yTop, yBase, bays, taper = 0, skip = [] }) {
  const w0 = xr - xl, cxm = (xl + xr) / 2
  const at = (i) => {                                       // i = 0 (base) … bays (top)
    const t = i / bays, w = (w0 * (1 - taper * t)) / 2
    return [cxm - w, cxm + w, yBase - (yBase - yTop) * t]
  }
  let legs = '', rungs = '', braces = ''
  const [bl, br] = [at(0), at(bays)]
  legs += `M${f(at(0)[0])} ${f(yBase)}L${f(bl[0] + (bays ? at(bays)[0] - bl[0] : 0))} ${f(yTop)}M${f(at(0)[1])} ${f(yBase)}L${f(at(bays)[1])} ${f(yTop)}`
  for (let i = 0; i <= bays; i++) { const [a, b, y] = at(i); if (!skip.includes(i)) rungs += `M${f(a)} ${f(y)}L${f(b)} ${f(y)}` }
  for (let i = 0; i < bays; i++) {
    const [a0, b0, y0] = at(i), [a1, b1, y1] = at(i + 1)
    braces += i % 2 ? `M${f(a0)} ${f(y0)}L${f(b1)} ${f(y1)}M${f(b0)} ${f(y0)}L${f(a1)} ${f(y1)}` : `M${f(a0)} ${f(y0)}L${f(b1)} ${f(y1)}`
  }
  return { legs, rungs, braces }
}

/** A palm as stroke paths: a leaning trunk and a fan of drooping fronds. */
export function palm(x, y, h, lean, s = 1) {
  const tx = x + lean, ty = y - h
  let trunk = `M${f(x)} ${f(y)}Q${f(x + lean * 0.15)} ${f(y - h * 0.55)} ${f(tx)} ${f(ty)}`
  let fronds = ''
  const n = 9
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (0.06 + (0.88 * i) / (n - 1))                          // fan from right (−0.06π) to left (−0.94π)
    const L = h * (0.5 + 0.06 * Math.sin(i * 2.3)) * s
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.55 + L * 0.42 * Math.abs(Math.cos(a))
    const cxp = tx + Math.cos(a) * L * 0.55, cyp = ty + Math.sin(a) * L * 0.75 - L * 0.05
    fronds += `M${f(tx)} ${f(ty)}Q${f(cxp)} ${f(cyp)} ${f(ex)} ${f(ey)}`
  }
  return { trunk, fronds }
}

/* ── the three skies ─────────────────────────────────────────────────────────────────────────────────────────── */

function PadSky({ u, fit }) {
  const clouds = useMemo(() => {
    const r = mulberry32(21)
    return Array.from({ length: 7 }, (_, i) => {
      const y = 330 + i * 17 + r() * 8, len = 90 + r() * 190, x = -60 + r() * 380, h = 2.4 + r() * 3.4
      return { y, x, len, h, o: 0.18 + (i / 7) * 0.5 }
    })
  }, [])
  return (
    <svg className="art-hz__svg art-hz__svg--sky" viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} preserveAspectRatio={`xMidYMax ${fit}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${u}-sky`} gradientUnits="userSpaceOnUse" x1="0" y1="-420" x2="0" y2="470">
          <stop offset="0" stopColor="#04051a" /><stop offset=".34" stopColor="#090c2e" /><stop offset=".55" stopColor="#1a1650" />
          <stop offset=".7" stopColor="#3a1f63" /><stop offset=".81" stopColor="#74295f" /><stop offset=".9" stopColor="#c4462f" />
          <stop offset=".96" stopColor="#ff8a3a" /><stop offset="1" stopColor="#ffc064" />
        </linearGradient>
        <radialGradient id={`${u}-glow`} gradientUnits="userSpaceOnUse" cx="128" cy="462" r="360" gradientTransform="translate(128 462) scale(1 .42) translate(-128 -462)">
          <stop offset="0" stopColor="#ffd890" stopOpacity=".7" /><stop offset=".25" stopColor="#ff9a4a" stopOpacity=".42" />
          <stop offset=".62" stopColor="#d8453a" stopOpacity=".16" /><stop offset="1" stopColor="#d8453a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${u}-cl`} gradientUnits="objectBoundingBox" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1248" stopOpacity=".7" /><stop offset=".6" stopColor="#5a2862" stopOpacity=".6" /><stop offset="1" stopColor="#ff9a58" stopOpacity=".85" />
        </linearGradient>
      </defs>
      <rect x="-3000" y="-3000" width="6400" height="3470" fill={`url(#${u}-sky)`} />
      <ellipse cx="128" cy="462" rx="380" ry="170" fill={`url(#${u}-glow)`} />
      <g>
        {clouds.map((c, i) => (
          <path key={i} d={`M${f(c.x)} ${f(c.y)}Q${f(c.x + c.len / 2)} ${f(c.y - c.h * 2)} ${f(c.x + c.len)} ${f(c.y)}Q${f(c.x + c.len / 2)} ${f(c.y + c.h)} ${f(c.x)} ${f(c.y)}Z`} fill={`url(#${u}-cl)`} opacity={f(c.o)} />
        ))}
      </g>
    </svg>
  )
}

function PadGround({ u, fit, children }) {
  const g = useMemo(() => {
    const palms = [palm(26, 520, 52, -6), palm(54, 524, 38, 5, 0.9), palm(347, 522, 58, 7), palm(372, 526, 40, -4, 0.9), palm(-8, 524, 46, 4), palm(402, 524, 50, -6)]
    const tower = lattice({ xl: 283, xr: 296, yTop: 428, yBase: 490, bays: 7, taper: 0.3 })
    return { palms, tower, far: ridge({ y: 452, amp: 18, seed: 3 }), mid: ridge({ y: 486, amp: 10, seed: 8, detail: 0.6 }), near: ridge({ y: 520, amp: 8, seed: 12 }) }
  }, [])
  return (
    <svg className="art-hz__svg art-hz__svg--ground" viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} preserveAspectRatio={`xMidYMax ${fit}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${u}-far`} gradientUnits="userSpaceOnUse" x1="0" y1="426" x2="0" y2="478">
          <stop offset="0" stopColor="#8c3f66" /><stop offset=".4" stopColor="#4a2663" /><stop offset="1" stopColor="#261748" />
        </linearGradient>
        <linearGradient id={`${u}-mid`} gradientUnits="userSpaceOnUse" x1="0" y1="466" x2="0" y2="514">
          <stop offset="0" stopColor="#3a2158" /><stop offset=".5" stopColor="#1d1442" /><stop offset="1" stopColor="#140d30" />
        </linearGradient>
        <linearGradient id={`${u}-near`} gradientUnits="userSpaceOnUse" x1="0" y1="504" x2="0" y2="548">
          <stop offset="0" stopColor="#1c1138" /><stop offset=".5" stopColor="#0f0a26" /><stop offset="1" stopColor="#0a0719" />
        </linearGradient>
        <radialGradient id={`${u}-pool`} gradientUnits="userSpaceOnUse" cx="226" cy="560" r="230" gradientTransform="translate(226 560) scale(1 .22) translate(-226 -560)">
          <stop offset="0" stopColor="#ffc47a" stopOpacity=".62" /><stop offset=".4" stopColor="#ff9a4a" stopOpacity=".28" /><stop offset="1" stopColor="#ff8a2a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${u}-apron`} gradientUnits="userSpaceOnUse" x1="0" y1="538" x2="0" y2="640">
          <stop offset="0" stopColor="#3a2a3a" /><stop offset=".25" stopColor="#1e1630" /><stop offset="1" stopColor="#0a0719" />
        </linearGradient>
        <radialGradient id={`${u}-lamp`}><stop offset="0" stopColor="#fff1cf" /><stop offset=".25" stopColor="#ffc47a" stopOpacity=".85" /><stop offset="1" stopColor="#ff9a4a" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${u}-refl`}>
          <stop offset="0" stopColor="#ffd9a0" stopOpacity=".3" /><stop offset=".6" stopColor="#ffc47a" stopOpacity=".1" /><stop offset="1" stopColor="#ffb25c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${u}-haze`} gradientUnits="userSpaceOnUse" cx="195" cy="470" r="300" gradientTransform="translate(195 470) scale(1 .16) translate(-195 -470)">
          <stop offset="0" stopColor="#ff9a58" stopOpacity=".38" /><stop offset="1" stopColor="#ff9a58" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* far ridge, lost in the glow */}
      <path d={g.far} fill={`url(#${u}-far)`} />
      <ellipse cx="195" cy="470" rx="400" ry="50" fill={`url(#${u}-haze)`} />
      {/* industrial middle ground: tank farm and a distant gantry with a beacon */}
      <path d={g.mid} fill={`url(#${u}-mid)`} />
      <g fill="#1a1140">
        <rect x="318" y="468" width="22" height="30" /><ellipse cx="329" cy="468" rx="11" ry="2.6" fill="#241752" />
        <rect x="344" y="474" width="16" height="24" /><ellipse cx="352" cy="474" rx="8" ry="2" fill="#241752" />
        <circle cx="40" cy="482" r="11" /><rect x="38" y="490" width="4" height="12" />
        <rect x="58" y="482" width="3.4" height="22" /><rect x="76" y="478" width="2.6" height="26" />
      </g>
      <g stroke="#1a1140" fill="none" strokeLinecap="round">
        <path d={g.tower.legs} strokeWidth="1.5" /><path d={g.tower.rungs} strokeWidth=".9" /><path d={g.tower.braces} strokeWidth=".6" />
      </g>
      <g fill="#ffb25c"><circle cx="329" cy="482" r=".8" /><circle cx="352" cy="486" r=".7" opacity=".7" /><circle cx="40" cy="480" r=".7" opacity=".8" /><circle cx="60" cy="492" r=".6" opacity=".6" /></g>
      <circle className="art-hz__beacon" cx="289.5" cy="427" r="1.5" fill="#ff4f62" />
      <circle className="art-hz__beacon" cx="289.5" cy="427" r="6" fill={`url(#${u}-lamp)`} opacity=".0" />
      {/* near ridge + palms */}
      <path d={g.near} fill={`url(#${u}-near)`} />
      <g stroke="#0d0824" fill="none" strokeLinecap="round">
        {g.palms.map((p, i) => (
          <g key={i}><path d={p.trunk} strokeWidth={i % 2 ? 1.8 : 2.4} /><path d={p.fronds} strokeWidth={i % 2 ? 1.1 : 1.5} /></g>
        ))}
      </g>
      {/* the ground itself: an apron lit from the floodlights */}
      <path d="M-1400 536L1800 536L1800 900L-1400 900Z" fill="#0a0719" />
      <path d="M-120 538L520 538L1000 900L-600 900Z" fill={`url(#${u}-apron)`} />
      <ellipse cx="226" cy="560" rx="230" ry="50" fill={`url(#${u}-pool)`} />
      {/* slab seams: horizontals spaced by perspective, verticals converging on the horizon */}
      <g stroke="#ffc47a" strokeOpacity=".038" strokeWidth=".6" fill="none">
        {[548, 560, 576, 600, 640, 700].map((y) => <path key={y} d={`M-600 ${y}H1000`} />)}
        {[-240, 20, 195, 370, 630].map((x) => <path key={x} d={`M${195 + (x - 195) * 0.06} 538L${x + (x - 195) * 1.6} 780`} />)}
      </g>
      {/* the lamps stand in the concrete: long soft reflections */}
      <g fill={`url(#${u}-refl)`}>
        <ellipse cx="300" cy="580" rx="6" ry="46" /><ellipse cx="326" cy="580" rx="5" ry="38" />
      </g>
      {children}
    </svg>
  )
}

/* ── the Earth's limb ────────────────────────────────────────────────────────────────────────────────────────── */

const LIMB = { cx: 195, top: 470, R: 430 }

function LimbArt({ u, sun, aurora, children }) {
  const { cx: X, top, R } = LIMB
  const Y = top + R
  const g = useMemo(() => {
    const r = mulberry32(77)
    // cloud streaks laid along the curve: ellipses rotated to the local tangent, flattened toward the limb
    const clouds = Array.from({ length: 26 }, () => {
      const a = (r() - 0.5) * 1.5, depth = 8 + r() * r() * 150                                // radians from top, px below the limb
      const rr = R - depth
      const x = X + Math.sin(a) * rr, y = Y - Math.cos(a) * rr
      return { x: f(x), y: f(y), rx: f(14 + r() * 56), ry: f(0.8 + r() * 2.2 * (depth / 150 + 0.25)), a: f((a * 180) / Math.PI), o: f(0.07 + r() * 0.16) }
    })
    // city lights: a handful of clusters on the dark side, each a Gaussian-ish scatter of warm points
    const lights = []
    const centres = [[-0.46, 24, 1], [-0.31, 54, 0.7], [-0.14, 30, 1.3], [-0.02, 66, 0.6], [0.1, 40, 0.9], [0.2, 78, 0.8], [0.3, 28, 0.7], [-0.4, 96, 0.6], [0.04, 108, 0.5]]
    for (const [a, depth, w] of centres) {
      // a metro is a bright core + a web of towns strung along a few "roads" (tangential strings), flattened toward the limb
      const n = Math.round(26 * w), flat = 0.25 + 0.75 * Math.min(1, depth / 90)
      for (let i = 0; i < n; i++) {
        const road = Math.floor(r() * 3) - 1
        const aa = a + (r() - 0.5) * 0.1 * w, dd = depth + (road * 5 + (r() - 0.5) * 4) * flat * (0.4 + r())
        const rr = R - dd
        lights.push({ x: f(X + Math.sin(aa) * rr), y: f(Y - Math.cos(aa) * rr), r: f(0.28 + r() * 0.5), o: f(0.3 + r() * 0.65), w: r() < 0.2 })
      }
      lights.push({ x: f(X + Math.sin(a) * (R - depth)), y: f(Y - Math.cos(a) * (R - depth)), glow: 5 + 4 * w, core: true })
    }
    // aurora curtains: soft wavering ribbons standing on the limb on the night side, each rotated to the local radial
    const curtains = Array.from({ length: 30 }, (_, i) => {
      const t = i / 29
      const a = (0.06 + t * 0.29 + (r() - 0.5) * 0.012) * (sun === 'left' ? 1 : -1)
      const h = 12 + r() * 30 * Math.max(0.2, 1 - Math.abs(t - 0.5) * 1.5), w = 2 + r() * 4.2, s1 = (r() - 0.5) * 9, s2 = (r() - 0.5) * 7
      return {
        x: f(X + Math.sin(a) * R), y: f(Y - Math.cos(a) * R), deg: f((a * 180) / Math.PI), o: f(0.16 + r() * 0.3),
        d: `M${f(-w / 2)} 0Q${f(-w / 2 + s1)} ${f(-h * 0.5)} ${f(-w * 0.3 + s2)} ${f(-h)}L${f(w * 0.3 + s2)} ${f(-h)}Q${f(w / 2 + s1)} ${f(-h * 0.5)} ${f(w / 2)} 0Z`,
      }
    })
    return { clouds, lights, curtains }
  }, [sun])
  const sx = sun === 'left' ? 58 : 330
  const sy = Y - Math.sqrt(R * R - (sx - X) ** 2)
  return (
    <svg className="art-hz__svg art-hz__svg--front" viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${u}-halo`} gradientUnits="userSpaceOnUse" cx={X} cy={Y} r={R + 90}>
          <stop offset={(R - 4) / (R + 90)} stopColor="#2a6bff" stopOpacity="0" /><stop offset={(R + 4) / (R + 90)} stopColor="#2f78ff" stopOpacity=".34" />
          <stop offset={(R + 22) / (R + 90)} stopColor="#2358d8" stopOpacity=".16" /><stop offset={(R + 52) / (R + 90)} stopColor="#1a3fa8" stopOpacity=".05" /><stop offset="1" stopColor="#1a3fa8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${u}-glow`} gradientUnits="userSpaceOnUse" cx={X} cy={Y} r={R + 26}>
          <stop offset={(R - 8) / (R + 26)} stopColor="#7cc8ff" stopOpacity="0" /><stop offset={(R - 1) / (R + 26)} stopColor="#9bd8ff" stopOpacity=".75" />
          <stop offset={(R + 5) / (R + 26)} stopColor="#4aa0ff" stopOpacity=".34" /><stop offset="1" stopColor="#2a6bff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${u}-body`} gradientUnits="userSpaceOnUse" cx={X} cy={Y} r={R}>
          <stop offset="0" stopColor="#010208" /><stop offset={(R - 110) / R} stopColor="#02040c" /><stop offset={(R - 46) / R} stopColor="#050f26" />
          <stop offset={(R - 18) / R} stopColor="#0b2a60" /><stop offset={(R - 6) / R} stopColor="#1a5aa8" /><stop offset="1" stopColor="#6fb6ff" />
        </radialGradient>
        <radialGradient id={`${u}-cloud`}><stop offset="0" stopColor="#bcd8ff" stopOpacity=".9" /><stop offset="1" stopColor="#8fb8ff" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${u}-lite`}><stop offset="0" stopColor="#ffd9a0" stopOpacity=".42" /><stop offset="1" stopColor="#ff9a4a" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${u}-sun`} gradientUnits="userSpaceOnUse" cx={sx} cy={sy} r="210" gradientTransform={`translate(${sx} ${sy}) scale(1 .7) translate(${-sx} ${-sy})`}>
          <stop offset="0" stopColor="#fffaf0" stopOpacity=".95" /><stop offset=".08" stopColor="#ffe2a8" stopOpacity=".8" /><stop offset=".22" stopColor="#ff9a4a" stopOpacity=".42" />
          <stop offset=".5" stopColor="#d84a8a" stopOpacity=".14" /><stop offset="1" stopColor="#4a3aff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${u}-aur`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a7aff" stopOpacity="0" /><stop offset=".35" stopColor="#5af0b4" stopOpacity=".5" /><stop offset=".85" stopColor="#7dffd0" stopOpacity=".85" /><stop offset="1" stopColor="#bfffe6" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id={`${u}-streak`} gradientUnits="userSpaceOnUse" x1={sx} y1="0" x2={sun === 'left' ? sx + 150 : sx - 150} y2="0">
          <stop offset="0" stopColor="#fff6e4" stopOpacity=".95" /><stop offset=".5" stopColor="#ffe2b0" stopOpacity=".3" /><stop offset="1" stopColor="#ffd090" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${u}-sunrim`} gradientUnits="userSpaceOnUse" x1={sun === 'left' ? 0 : 390} y1="0" x2={sun === 'left' ? 390 : 0} y2="0">
          <stop offset="0" stopColor="#fff1d0" stopOpacity=".95" /><stop offset=".3" stopColor="#bfe4ff" stopOpacity=".55" /><stop offset=".7" stopColor="#8fc8ff" stopOpacity=".12" /><stop offset="1" stopColor="#8fc8ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx={X} cy={Y} r={R + 90} fill={`url(#${u}-halo)`} />
      <circle cx={X} cy={Y} r={R + 26} fill={`url(#${u}-glow)`} />
      {/* airglow: a thin green band above the haze, the orange troposphere line under the blue */}
      <circle cx={X} cy={Y} r={R + 13} fill="none" stroke="#6bf0b0" strokeOpacity=".085" strokeWidth="3.4" />
      <circle cx={X} cy={Y} r={R + 8} fill="none" stroke="#ff6a3a" strokeOpacity=".09" strokeWidth="2" />
      <circle cx={X} cy={Y} r={R} fill={`url(#${u}-body)`} />
      <clipPath id={`${u}-clip`}><circle cx={X} cy={Y} r={R} /></clipPath>
      <g clipPath={`url(#${u}-clip)`}>
        {g.clouds.map((c, i) => <ellipse key={i} cx={c.x} cy={c.y} rx={c.rx} ry={c.ry} transform={`rotate(${c.a} ${c.x} ${c.y})`} fill={`url(#${u}-cloud)`} opacity={c.o} />)}
        {g.lights.map((l, i) => (l.glow
          ? <g key={i}><circle cx={l.x} cy={l.y} r={l.glow} fill={`url(#${u}-lite)`} /><circle cx={l.x} cy={l.y} r=".9" fill="#fff4dc" opacity=".9" /></g>
          : <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={l.w ? '#fff1d6' : '#ffc680'} opacity={l.o} />))}
      </g>
      <circle cx={X} cy={Y} r={R - 0.4} fill="none" stroke="#bfe4ff" strokeOpacity=".7" strokeWidth=".9" />
      <circle cx={X} cy={Y} r={R - 0.4} fill="none" stroke={`url(#${u}-sunrim)`} strokeWidth="2.2" />
      {aurora && (
        <g className="art-hz__aurora">
          {g.curtains.map((c, i) => (
            <path key={i} d={c.d} transform={`translate(${c.x} ${c.y}) rotate(${c.deg})`} fill={`url(#${u}-aur)`} opacity={c.o} />
          ))}
        </g>
      )}
      {sun !== 'none' && (
        <g>
          <circle cx={sx} cy={sy} r="240" fill={`url(#${u}-sun)`} />
          <ellipse cx={sx} cy={sy} rx="150" ry="2.6" fill={`url(#${u}-streak)`} opacity=".7" />
        </g>
      )}
      {children}
    </svg>
  )
}

/* ── component ───────────────────────────────────────────────────────────────────────────────────────────────── */

export default function Horizon({
  variant = 'pad', fit = 'cover', stars = true, seed = 1, twinkle = false, parallax = false, meteors = false, aurora = false, density, sun = 'right', children, className, style, ...rest
}) {
  const u = useUid('hz')
  const fade = variant === 'pad' ? 'horizon' : variant === 'limb' ? 'bottom' : undefined
  const dens = density ?? (variant === 'space' ? 1.25 : 1)
  return (
    <div className={cx('art-hz', className)} data-v={variant} style={style} aria-hidden="true" {...rest}>
      {variant === 'pad' && <PadSky u={u} fit={fit === 'contain' ? 'meet' : 'slice'} />}
      {variant === 'space' && <i className="art-hz__neb" />}
      {stars && <Starfield seed={seed} twinkle={twinkle} parallax={parallax} meteors={meteors} density={dens} fade={fade} />}
      {variant === 'pad' && <PadGround u={u} fit={fit === 'contain' ? 'meet' : 'slice'}>{children}</PadGround>}
      {variant === 'limb' && <LimbArt u={u} sun={sun} aurora={aurora}>{children}</LimbArt>}
    </div>
  )
}

/** AscentSky — the Learn screen's sky. Dusk and ember at the foot of the climb, deep space and thick stars at the summit,
 *  driven by the unitless CSS var --scroll (0 → 1, written by useScrollVar on any ancestor). Opacity + transform only. */
export function AscentSky({ seed = 2, className, style, ...rest }) {
  return (
    <div className={cx('art-asc', className)} style={style} aria-hidden="true" {...rest}>
      <i className="art-asc__space" />
      <i className="art-asc__dusk" />
      <Starfield seed={seed} density={1.5} twinkle parallax meteors className="art-asc__stars" />
      <i className="art-asc__glow" />
    </div>
  )
}

export { PadSky, PadGround, LimbArt, LIMB }
