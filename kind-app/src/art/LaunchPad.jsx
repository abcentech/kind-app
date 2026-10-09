// LaunchPad — the onboarding hero: a launch vehicle on its pad at dusk, stars above, steam venting.
//
//   <LaunchPad flame='off'|'idle'|'burn' liftoff steam twinkle parallax seed />   fills its positioned parent
//
// Composition (all in Horizon's 390 × 620 world, bottom-centre anchored): service tower on the left with the crew-access
// arm touching the capsule at window height, the vehicle on a launch mount right of centre, two floodlight poles on the
// right throwing the warm kick that lights the airframe from that side, a lightning mast, a beacon on everything tall.
// `liftoff` plays the launch: ignition flare, ground cloud, the vehicle climbing out of frame (transform only).
import { useEffect, useMemo, useState } from 'react'
import Horizon, { lattice } from './Horizon.jsx'
import { RocketArt, ROCKET_FRAME } from './Rocket.jsx'
import { cx, useUid } from './Starfield.jsx'

const f = (v) => +v.toFixed(1)
const S = 0.806                         // vehicle scale in the world: 372 → 300 units tall
const RX = 222, BASE = 534              // vehicle axis x, the mount's top surface y
const OX = RX - ROCKET_FRAME.cx * S, OY = BASE - ROCKET_FRAME.legs * S
const TOWER = { xl: 126, xr: 158, yTop: 262, yBase: BASE, bays: 13, taper: 0.1 }

function Pad({ u, ru, flame, steam, liftoff }) {
  const tower = useMemo(() => lattice({ ...TOWER, skip: [] }), [])
  const decks = [3, 6, 9, 12]
  const deckY = (i) => TOWER.yBase - ((TOWER.yBase - TOWER.yTop) * i) / TOWER.bays
  const mast = lattice({ xl: 83, xr: 89, yTop: 336, yBase: BASE - 4, bays: 9 })
  const armY = 282
  const lit = flame !== 'off'
  return (
    <g>
      <defs>
        <linearGradient id={`${u}-beam`} gradientUnits="userSpaceOnUse" x1="302" y1="402" x2="236" y2="440">
          <stop offset="0" stopColor="#ffe2b0" stopOpacity=".26" /><stop offset="1" stopColor="#ffb25c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${u}-steel`} gradientUnits="userSpaceOnUse" x1="186" y1="0" x2="258" y2="0">
          <stop offset="0" stopColor="#2a3144" /><stop offset=".12" stopColor="#8a96ae" /><stop offset=".3" stopColor="#4a5368" /><stop offset=".7" stopColor="#323a4e" />
          <stop offset=".9" stopColor="#b08a68" /><stop offset="1" stopColor="#3a3340" />
        </linearGradient>
        <linearGradient id={`${u}-trench`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05030c" /><stop offset=".6" stopColor="#1a0a10" /><stop offset="1" stopColor="#7a2410" />
        </linearGradient>
        <radialGradient id={`${u}-steam`}><stop offset="0" stopColor="#fff2e2" stopOpacity=".85" /><stop offset=".5" stopColor="#ffd9b8" stopOpacity=".38" /><stop offset="1" stopColor="#ffd9b8" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${u}-flare`} gradientUnits="userSpaceOnUse" cx={RX} cy={BASE + 8} r="150" gradientTransform={`translate(${RX} ${BASE + 8}) scale(1 .5) translate(${-RX} ${-(BASE + 8)})`}>
          <stop offset="0" stopColor="#fff4d8" stopOpacity=".95" /><stop offset=".22" stopColor="#ffb25c" stopOpacity=".55" /><stop offset="1" stopColor="#ff6a1a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${u}-lamp`}><stop offset="0" stopColor="#fffbe8" /><stop offset=".22" stopColor="#ffd592" stopOpacity=".95" /><stop offset=".6" stopColor="#ff9a4a" stopOpacity=".28" /><stop offset="1" stopColor="#ff8a2a" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${u}-arm`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a5368" /><stop offset=".5" stopColor="#262c3e" /><stop offset="1" stopColor="#14111f" /></linearGradient>
      </defs>

      {/* floodlight beams: dust in the dusk air, drawn behind the vehicle */}
      <path d="M302 402L226 330L226 520Z" fill={`url(#${u}-beam)`} />
      <path d="M326 420L240 364L246 540Z" fill={`url(#${u}-beam)`} opacity=".6" />

      {/* mast with a nav light */}
      <g stroke="#0b0820" fill="none" strokeLinecap="round">
        <path d={mast.legs} strokeWidth="1.1" /><path d={mast.rungs} strokeWidth=".6" /><path d={mast.braces} strokeWidth=".45" />
        <path d="M86 336L86 316" strokeWidth=".9" />
      </g>
      <circle className="art-hz__beacon" cx="86" cy="315.5" r="1.5" fill="#ff4f62" />

      {/* service tower */}
      <g stroke="#0c0922" fill="none" strokeLinecap="round">
        <path d={tower.legs} strokeWidth="2.4" /><path d={tower.rungs} strokeWidth="1.2" /><path d={tower.braces} strokeWidth=".9" />
      </g>
      <path d={`M${TOWER.xr} ${BASE}L${f((TOWER.xl + TOWER.xr) / 2 + ((TOWER.xr - TOWER.xl) * (1 - TOWER.taper)) / 2)} ${TOWER.yTop}`} stroke="#c47a3a" strokeOpacity=".55" strokeWidth=".7" fill="none" />
      {decks.map((i) => {
        const y = deckY(i)
        return (
          <g key={i}>
            <rect x={TOWER.xl - 5} y={f(y - 1.4)} width={TOWER.xr - TOWER.xl + 10} height="2.8" fill="#0c0922" />
            <path d={`M${TOWER.xl - 5} ${f(y - 6)}H${TOWER.xr + 5}`} stroke="#0c0922" strokeWidth=".6" />
            <path d={`M${TOWER.xr + 5} ${f(y - 1.4)}H${TOWER.xl - 5}`} stroke="#ffb25c" strokeOpacity=".35" strokeWidth=".4" />
            <circle cx={TOWER.xr + 5} cy={f(y - 3)} r="1.1" fill="#ffd592" /><circle cx={TOWER.xr + 5} cy={f(y - 3)} r="6" fill={`url(#${u}-lamp)`} opacity=".7" />
          </g>
        )
      })}
      <circle className="art-hz__beacon" cx={(TOWER.xl + TOWER.xr) / 2} cy={TOWER.yTop - 2} r="1.6" fill="#ff4f62" />

      {/* crew-access arm: tower → capsule, at window height. The room's window is the only other lit thing up here. */}
      <path d={`M${TOWER.xr} ${armY - 2.6}H203V${armY + 2.6}H${TOWER.xr}Z`} fill={`url(#${u}-arm)`} />
      <path d={`M${TOWER.xr} ${armY - 2.6}H203`} stroke="#9fb4d8" strokeOpacity=".45" strokeWidth=".5" />
      <path d={`M${TOWER.xr} ${armY + 5}L192 ${armY + 2.6}`} stroke="#0c0922" strokeWidth=".8" />
      <rect x="196" y={armY - 6.5} width="9" height="13" rx="1.2" fill={`url(#${u}-arm)`} />
      <rect x="198" y={armY - 3.8} width="3.4" height="5" rx=".5" fill="#ffd592" opacity=".92" />
      <circle cx="199.7" cy={armY - 1.3} r="7" fill={`url(#${u}-lamp)`} opacity=".45" />

      {/* the vehicle (moves as one piece on liftoff) */}
      <clipPath id={`${u}-ground`}><rect x="-3000" y="-3600" width="6000" height={3600 + 549} /></clipPath>
      <g clipPath={`url(#${u}-ground)`}>
      <g className="art-lp__rocket" data-lift={liftoff ? '' : undefined}>
        <g transform={`translate(${f(OX)} ${f(OY)}) scale(${S})`} data-flame={flame} data-lit="flood">
          <RocketArt u={ru} flame={flame} />
        </g>
      </g>
      </g>

      {/* mount: a steel deck on piers, a flame trench glowing dull red beneath */}
      <path d={`M200 549L244 549L252 586L192 586Z`} fill={`url(#${u}-trench)`} />
      <rect x="186" y={BASE} width="72" height="15" fill={`url(#${u}-steel)`} />
      <path d={`M186 ${BASE + 0.5}H258`} stroke="#fff" strokeOpacity=".5" strokeWidth=".6" />
      <path d={`M186 ${BASE + 15}H258`} stroke="#000" strokeOpacity=".6" strokeWidth=".8" />
      <g fill="#000" opacity=".45"><rect x="200" y={BASE + 2} width=".8" height="11" /><rect x="222" y={BASE + 2} width=".8" height="11" /><rect x="244" y={BASE + 2} width=".8" height="11" /></g>
      <g fill="#fff" opacity=".35">{[192, 208, 236, 252].map((x) => <circle key={x} cx={x} cy={BASE + 4} r=".7" />)}</g>
      <path d="M196 534L200 527L205 534Z M240 534L245 527L249 534Z" fill={`url(#${u}-steel)`} />
      <ellipse cx={RX} cy="568" rx="92" ry="11" fill="none" stroke="#ffc47a" strokeOpacity=".12" strokeWidth=".7" />
      <ellipse cx={RX} cy="568" rx="62" ry="7" fill="none" stroke="#ffc47a" strokeOpacity=".09" strokeWidth=".6" />

      {/* floodlight poles */}
      {[[300, 396, 34], [326, 416, 26]].map(([x, y, r]) => (
        <g key={x}>
          <path d={`M${x} ${BASE + 6}L${x} ${y + 4}`} stroke="#0c0922" strokeWidth="2.2" />
          <path d={`M${x - 6} ${y + 2}H${x + 6}`} stroke="#0c0922" strokeWidth="2.6" />
          <circle cx={x} cy={y} r={r} fill={`url(#${u}-lamp)`} opacity=".72" />
          {[-4.5, 0, 4.5].map((dx) => <circle key={dx} cx={x + dx} cy={y} r="1.5" fill="#fffbe8" />)}
        </g>
      ))}

      {/* venting: LOX boil-off from the interstage, a bleed low on the stage, a ground cloud around the mount */}
      {steam && (
        <g className="art-lp__steam">
          {[
            [242, 372, 38, -22, 0, 5.4], [242, 372, 30, -34, 1.5, 6.2], [242, 372, 34, -14, 3, 5.8], [242, 372, 26, -42, 4.4, 6.6],
            [236, 452, 26, 26, 0.8, 6.6], [236, 452, 30, 38, 3.1, 7], [236, 452, 20, 18, 5, 6.2],
          ].map(([x, y, dx, dy, d, t], i) => (
            <g key={i} className="art-lp__wisp" style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, '--d': `${d}s`, '--t': `${t}s` }}>
              <ellipse cx={x - 7} cy={y + 2} rx="12" ry="7.5" fill={`url(#${u}-steam)`} />
              <ellipse cx={x + 2} cy={y - 3} rx="14" ry="9" fill={`url(#${u}-steam)`} />
              <ellipse cx={x + 10} cy={y + 3} rx="10" ry="6.5" fill={`url(#${u}-steam)`} />
            </g>
          ))}
          {[[196, 548, 38, 6.4, 0, 14], [252, 549, 44, 7, 4, 16], [224, 552, 52, 6, 8, 18]].map(([x, y, rx, ry, d, t], i) => (
            <g key={'g' + i} className="art-lp__drift" style={{ '--d': `${d}s`, '--t': `${t}s` }}>
              <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${u}-steam)`} />
            </g>
          ))}
        </g>
      )}

      {/* launch: ignition flare + the cloud that billows out of the trench */}
      {liftoff && (
        <g>
          <ellipse className="art-lp__flare" cx={RX} cy={BASE + 8} rx="170" ry="80" fill={`url(#${u}-flare)`} />
          {[[-1, 0], [1, 0.12], [-1, 0.3], [1, 0.4]].map(([dir, d], i) => (
            <g key={i} className="art-lp__puff" style={{ '--dir': dir, '--d': `${d + 0.5}s` }}>
              <ellipse cx={RX + dir * 24} cy={BASE + 16} rx="46" ry="15" fill={`url(#${u}-steam)`} />
            </g>
          ))}
        </g>
      )}
    </g>
  )
}

export default function LaunchPad({ flame = 'off', liftoff = false, steam = true, seed = 4, twinkle = true, parallax = false, fit = 'cover', className, style, ...rest }) {
  const u = useUid('lp'), ru = useUid('lr')
  // ignition has a beat: engines catch (idle) a half-second before they open up
  const [ign, setIgn] = useState(false)
  useEffect(() => {
    if (!liftoff) { setIgn(false); return undefined }
    const t = setTimeout(() => setIgn(true), 520)
    return () => clearTimeout(t)
  }, [liftoff])
  const mode = liftoff ? (ign ? 'burn' : 'idle') : flame
  return (
    <Horizon variant="pad" fit={fit} meteors seed={seed} twinkle={twinkle} parallax={parallax} className={cx('art-lp', className)} style={style} data-liftoff={liftoff ? '' : undefined} {...rest}>
      <Pad u={u} ru={ru} flame={mode} steam={steam} liftoff={liftoff} />
    </Horizon>
  )
}
