// ShieldEmblem — the streak shield: an armoured hex shield with an engraved flame.
//   <ShieldEmblem size={64} state="ready" | "active" | "spent" />
//   ready   in the locker: titanium, cyan status LED, flame struck in relief
//   active  it just caught a missed day: the flame ignites, a cyan edge lights, two field rings pulse outward
//   spent   used: scorched steel, a crack across the plate, the flame hollow and cold
// size = height; the shield is 0.893 x as wide as it is tall.
import { memo } from 'react'
import { ReliefGlyph } from './Medal.jsx'
import { MEDAL_GLYPHS } from './emblem-glyphs.js'
import { GroundShadow, METALS, MetalGrad, cx, insetPoly, poly, P, r2, useUid } from './emblem-kit.jsx'

const W = 100, H = 112
const OUT = [[50, 2], [94, 17], [94, 60], [50, 110], [6, 60], [6, 17]]
const FLAME = MEDAL_GLYPHS.flame

export const ShieldEmblem = memo(function ShieldEmblem({ size = 64, state = 'ready', title, decorative, className, style, ...rest }) {
  const u = useUid('sh')
  const st = state === 'active' || state === 'spent' ? state : 'ready'
  const ti = st === 'spent' ? METALS.steel : METALS.ti
  const px = typeof size === 'number' ? size : 64
  const w = typeof size === 'number' ? r2((size * W) / H) : undefined
  const o = (d) => poly(insetPoly(OUT, d))
  const ov = insetPoly(OUT, 0.7)
  const edge = (a, b, c, op, wd = 1) => <path d={`M${P(a)}L${P(b)}`} stroke={c} strokeOpacity={op} strokeWidth={wd} strokeLinecap="round" />
  const label = title || (st === 'ready' ? 'Streak shield, ready' : st === 'active' ? 'Streak shield, active' : 'Streak shield, spent')
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label }
  const led = st === 'ready' ? '#63d8ff' : st === 'active' ? '#ffb347' : '#5a2a33'

  return (
    <svg className={cx('art-shieldmark', `is-${st}`, className)} width={w} height={size} viewBox={`0 0 ${W} ${H}`} style={style} data-state={st} {...a11y} {...rest}>
      <defs>
        <MetalGrad id={u + 'bz'} metal={st === 'spent' ? 'steel' : 'ti'} x1="0.05" y1="0" x2="0.95" y2="1" />
        <linearGradient id={u + 'fc'} gradientUnits="userSpaceOnUse" x1="28" y1="30" x2="72" y2="86">
          <stop offset="0" stopColor={ti.ramp[5]} /><stop offset=".5" stopColor={ti.ramp[4]} /><stop offset="1" stopColor={ti.ramp[2]} />
        </linearGradient>
        <radialGradient id={u + 'pl'} cx="50%" cy={st === 'active' ? '58%' : '40%'} r="80%">
          <stop offset="0" stopColor={st === 'active' ? '#4a2210' : st === 'spent' ? '#12141a' : '#16233a'} /><stop offset="1" stopColor={st === 'spent' ? '#050608' : '#070a12'} />
        </radialGradient>
        <radialGradient id={u + 'ae'} cx="50" cy="56" r="66" gradientUnits="userSpaceOnUse"><stop offset=".45" stopColor="#63d8ff" stopOpacity=".42" /><stop offset=".75" stopColor="#63d8ff" stopOpacity=".12" /><stop offset="1" stopColor="#63d8ff" stopOpacity="0" /></radialGradient>
        <radialGradient id={u + 'rg'} cx="50" cy="60" r="34" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#ff8a1c" stopOpacity=".6" /><stop offset="1" stopColor="#ff4a0f" stopOpacity="0" /></radialGradient>
        <linearGradient id={u + 'f1'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff4a14" /><stop offset="1" stopColor="#ff9a22" /></linearGradient>
        <linearGradient id={u + 'f2'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd25a" /><stop offset="1" stopColor="#fff3c4" /></linearGradient>
        <linearGradient id={u + 'gl'} x1="0" y1="0" x2=".7" y2=".9"><stop offset="0" stopColor="#fff" stopOpacity=".3" /><stop offset=".36" stopColor="#fff" stopOpacity=".04" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".3" /></linearGradient>
        <radialGradient id={u + 'sc'} cx="50%" cy="50%" r="62%"><stop offset=".4" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".7" /></radialGradient>
        <clipPath id={u + 'cp'}><path d={o(0)} /></clipPath>
        <clipPath id={u + 'cl'}><path d={o(6.5)} /></clipPath>
      </defs>
      <GroundShadow id={u + 'g'} cx="50" cy="109.6" rx="34" ry="3.4" a={0.55} />

      {st === 'active' && (
        <g className="art-shieldmark__aura" aria-hidden="true">
          <circle cx="50" cy="56" r="66" fill={`url(#${u}ae)`} />
          <path d={o(-3)} className="art-shieldmark__ring" fill="none" stroke="#63d8ff" strokeWidth="1" />
          <path d={o(-3)} className="art-shieldmark__ring is-b" fill="none" stroke="#63d8ff" strokeWidth="1" />
        </g>
      )}

      {/* bezel */}
      <path d={o(0)} fill={`url(#${u}bz)`} />
      {edge(ov[5], ov[0], '#fff', 0.85, 1.1)}{edge(ov[0], ov[1], '#fff', 0.4)}{edge(ov[4], ov[5], '#fff', 0.6)}
      {edge(ov[1], ov[2], '#000', 0.3)}{edge(ov[2], ov[3], '#000', 0.55, 1.1)}{edge(ov[3], ov[4], '#000', 0.4)}
      <path d={o(4.6)} fill="#000" fillOpacity=".62" />
      {st === 'active' && <path d={o(4.9)} fill="none" stroke="#63d8ff" strokeWidth="1.2" strokeOpacity=".95" />}

      {/* plate */}
      <path d={o(6)} fill={`url(#${u}pl)`} />
      <path d={o(6)} fill="none" stroke="#000" strokeOpacity=".6" strokeWidth=".8" />
      <path d={o(9.4)} fill="none" stroke={ti.ramp[3]} strokeOpacity={st === 'spent' ? 0.25 : 0.45} strokeWidth=".45" />
      <g clipPath={`url(#${u}cl)`}>
        {/* armour seams: a horizontal brace under the crest and a V that follows the keel */}
        <path d="M14 31H86M50 12V31" stroke={ti.ramp[2]} strokeOpacity=".55" strokeWidth=".6" fill="none" />
        <path d="M14 36H86" stroke="#000" strokeOpacity=".5" strokeWidth=".6" />
        <path d={`M14 ${70}L50 ${104}L86 ${70}`} stroke={ti.ramp[3]} strokeOpacity=".4" strokeWidth=".5" fill="none" />
        {[22, 78].map((x) => <circle key={x} cx={x} cy="25" r="1.5" fill={`url(#${u}fc)`} stroke="#000" strokeOpacity=".6" strokeWidth=".4" />)}
        {st === 'active' && <circle cx="50" cy="62" r="40" fill={`url(#${u}rg)`} />}
      </g>

      {/* the flame */}
      <g transform="translate(50 62) scale(.5) translate(-50 -50)">
        {st === 'ready' && <ReliefGlyph shapes={FLAME} metal="ti" u={u} depth={1.5} />}
        {st === 'active' && (
          <g>
            <path d={FLAME[0].d} fill={`url(#${u}f1)`} /><path d={FLAME[1].d} fill={`url(#${u}f2)`} />
            <path d="M50 64C53 69 57 72 57 78C57 83 54 85 50 85C46 85 43 83 43 78C43 73 47 69 50 64Z" fill="#fffaf0" opacity=".9" />
          </g>
        )}
        {st === 'spent' && (
          <g fill="none" strokeLinejoin="round">
            <path d={FLAME[0].d} fill="#0a0b10" stroke="#59607a" strokeWidth="2.6" />
            <path d={FLAME[1].d} stroke="#3a4054" strokeWidth="1.6" strokeDasharray="1 4.4" strokeLinecap="round" />
          </g>
        )}
      </g>

      {st === 'spent' && (
        <g clipPath={`url(#${u}cl)`}>
          <rect width={W} height={H} fill={`url(#${u}sc)`} />
          <path d="M18 24L33 41L28 50L45 64L40 76L58 92L55 100" fill="none" stroke="#000" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M19.2 24.4L34 41L29.2 50.2L46 64.2L41.2 76.2L59 92" fill="none" stroke={ti.ramp[3]} strokeOpacity=".55" strokeWidth=".6" strokeLinejoin="round" />
          {[[30, 80, 1.1], [66, 38, 0.9], [72, 70, 1.2]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#7a3a22" fillOpacity=".8" />)}
        </g>
      )}

      {/* status LED */}
      <g>
        <rect x="45" y="11" width="10" height="3.2" rx="1.6" fill="#000" fillOpacity=".7" />
        <rect x="46" y="11.8" width="8" height="1.6" rx=".8" fill={led} />
        {st !== 'spent' && <rect x="43" y="9.5" width="14" height="6.4" rx="3.2" fill={led} fillOpacity=".18" />}
      </g>

      <g clipPath={`url(#${u}cp)`}><rect width={W} height={H} fill={`url(#${u}gl)`} /></g>
    </svg>
  )
})

export default ShieldEmblem
