// OrbitScene — "orbit insertion", the lesson-complete picture: the Earth's limb at dawn, a small vehicle arcing along an
// orbit line on a glowing trail, heading toward the sunrise.
//
//   <OrbitScene animate progress flame />   fills its positioned parent
//
// The whole motion is ONE rotation: the vehicle sits at the top of the orbit and its parent group rotates about the
// planet's centre, so position, heading and the trail all follow from a single `transform` on the compositor.
//   animate (default)   one pass in from the left (3.4 s, ease-out), engines burning → idle on arrival, then a slow drift
//   progress 0..1       static pose along the arc (for screens that drive it: rank bars, month progress…)
//   lite / reduced      lands on the final pose with engines idle
import { useState } from 'react'
import Horizon, { LIMB } from './Horizon.jsx'
import { RocketArt, ROCKET_FRAME } from './Rocket.jsx'
import { cx, useUid } from './Starfield.jsx'

const f = (v) => +v.toFixed(2)
const X = LIMB.cx, Y = LIMB.top + LIMB.R
const RO = LIMB.R + 150                    // orbit radius
const S = 0.23                             // vehicle scale: 372 → 86 units tall
const A0 = -17, A1 = 4                     // arrival sweep, degrees about the planet centre
const pt = (deg, r = RO) => [X + r * Math.sin((deg * Math.PI) / 180), Y - r * Math.cos((deg * Math.PI) / 180)]
const arc = (a, b, r = RO) => {
  const [x0, y0] = pt(a, r), [x1, y1] = pt(b, r)
  return `M${f(x0)} ${f(y0)}A${r} ${r} 0 0 ${b > a ? 1 : 0} ${f(x1)} ${f(y1)}`
}
const TICKS = (() => {
  let d = ''
  for (let a = -40; a <= 40; a += 2) {
    const [x0, y0] = pt(a, RO - (a % 10 === 0 ? 5 : 2.2)), [x1, y1] = pt(a, RO + (a % 10 === 0 ? 5 : 2.2))
    d += `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`
  }
  return d
})()

export default function OrbitScene({ animate = true, progress, flame, seed = 6, twinkle = true, sun = 'right', className, style, ...rest }) {
  const u = useUid('ob'), ru = useUid('or')
  const [arrived, setArrived] = useState(false)
  const driven = typeof progress === 'number'
  const end = driven ? A0 + (A1 + 22 - A0) * Math.min(1, Math.max(0, progress)) : A1
  const mode = flame ?? (driven || arrived || !animate ? 'idle' : 'burn')
  const run = animate && !driven
  return (
    <Horizon variant="limb" seed={seed} twinkle={twinkle} meteors aurora sun={sun} className={cx('art-ob', className)} style={style} {...rest}>
      <defs>
        <linearGradient id={`${u}-tr`} gradientUnits="userSpaceOnUse" x1={X} y1="0" x2={X - 300} y2="0">
          <stop offset="0" stopColor="#fff4d8" stopOpacity=".95" /><stop offset=".18" stopColor="#ffb25c" stopOpacity=".6" />
          <stop offset=".55" stopColor="#ff7a1a" stopOpacity=".16" /><stop offset="1" stopColor="#ff4a0f" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${u}-line`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="390" y2="0">
          <stop offset="0" stopColor="#63d8ff" stopOpacity=".06" /><stop offset=".5" stopColor="#63d8ff" stopOpacity=".5" /><stop offset="1" stopColor="#63d8ff" stopOpacity=".16" />
        </linearGradient>
        <radialGradient id={`${u}-halo`}><stop offset="0" stopColor="#ffd9a0" stopOpacity=".55" /><stop offset="1" stopColor="#ff9a4a" stopOpacity="0" /></radialGradient>
      </defs>
      {/* the orbit: a hairline with protractor ticks, and a wide faint bloom under it */}
      <path d={arc(-60, 60)} fill="none" stroke={`url(#${u}-line)`} strokeWidth="5" opacity=".18" />
      <path d={arc(-60, 60)} fill="none" stroke={`url(#${u}-line)`} strokeWidth=".8" strokeDasharray="1.2 5" />
      <path d={TICKS} stroke="#63d8ff" strokeOpacity=".28" strokeWidth=".6" />
      <g className="art-ob__rot" data-run={run ? '' : undefined} style={{ '--end': `${f(end)}deg`, '--from': `${A0}deg`, transformOrigin: `${X}px ${Y}px` }} onAnimationEnd={(e) => { if (e.target === e.currentTarget) setArrived(true) }}>
        <g className="art-ob__drift" style={{ transformOrigin: `${X}px ${Y}px` }}>
          {/* the wake: an arc behind the vehicle, wide-and-warm under thin-and-bright */}
          <path d={arc(-26, 0)} fill="none" stroke={`url(#${u}-tr)`} strokeWidth="7" strokeLinecap="round" opacity=".5" />
          <path d={arc(-26, 0)} fill="none" stroke={`url(#${u}-tr)`} strokeWidth="1.7" strokeLinecap="round" />
          <ellipse cx={X - 14} cy={Y - RO} rx="30" ry="9" fill={`url(#${u}-halo)`} />
          {/* nose to the right: rotate the upright vehicle 90° about its own midpoint, centred on the orbit */}
          <g transform={`translate(${X} ${Y - RO}) rotate(90) scale(${S}) translate(${-ROCKET_FRAME.cx} ${-ROCKET_FRAME.h / 2})`} data-flame={mode}>
            <RocketArt u={ru} flame={mode} fine={false} />
          </g>
        </g>
      </g>
    </Horizon>
  )
}
