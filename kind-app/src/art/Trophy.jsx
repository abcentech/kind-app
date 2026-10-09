// Trophy — a cup on a chamfered carbon plinth.
//   <Trophy size={96} />                       gold
//   <Trophy size={96} tier="silver" />         bronze | silver | gold | ti
// Chrome-banded body (bright / dark / bright across the width, so it reads as a turned, polished form), two loop handles, a baluster stem,
// an engraved star in relief, a lip you can see into, a gold nameplate on a carbon plinth cut at the corners.
// size = height; width = 0.833 x height.
import { memo } from 'react'
import { ReliefGlyph } from './Medal.jsx'
import { MEDAL_GLYPHS } from './emblem-glyphs.js'
import { GroundShadow, METALS, MetalGrad, cx, poly, spark4, useUid, r2, rrect } from './emblem-kit.jsx'

const W = 100, H = 120
const CUP = 'M21 15C20 42 34 60 45.6 66.4H54.4C66 60 80 42 79 15Z'
const STEM = 'M44 68C45 71 47 72 47 75C47 78 40 79.6 40 83.2C40 86 38 88 36 91H64C62 88 60 86 60 83.2C60 79.6 53 78 53 75C53 72 55 71 56 68Z'

export const Trophy = memo(function Trophy({ size = 96, tier = 'gold', title, decorative, className, style, ...rest }) {
  const u = useUid('tr')
  const t = METALS[tier] ? tier : 'gold'
  const m = METALS[t]
  const w = typeof size === 'number' ? r2((size * W) / H) : undefined
  const label = title || `${t} trophy`
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label }
  const handle = (sd) => {
    const x = (v) => (sd < 0 ? v : 100 - v)
    return `M${x(25)} 20C${x(2)} 16 ${x(0)} 50 ${x(31)} 52`
  }
  return (
    <svg className={cx('art-trophy', `t-${t}`, className)} width={w} height={size} viewBox={`0 0 ${W} ${H}`} style={style} {...a11y} {...rest}>
      <defs>
        <MetalGrad id={u + 'cp'} metal={t} x1="0" y1="0" x2="1" y2="0" />
        <MetalGrad id={u + 'hd'} metal={t} x1="0" y1="0" x2="1" y2="1" />
        <linearGradient id={u + 'fc'} gradientUnits="userSpaceOnUse" x1="30" y1="20" x2="70" y2="60">
          <stop offset="0" stopColor={m.ramp[5]} /><stop offset=".5" stopColor={m.ramp[4]} /><stop offset="1" stopColor={m.ramp[2]} />
        </linearGradient>
        <linearGradient id={u + 'pl'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a3042" /><stop offset="1" stopColor="#0c0e16" /></linearGradient>
        <linearGradient id={u + 'sh'} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".72" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".45" /></linearGradient>
        <radialGradient id={u + 'in'} cx=".5" cy=".3" r=".8"><stop offset="0" stopColor={m.ramp[2]} /><stop offset="1" stopColor={m.deep} /></radialGradient>
        <clipPath id={u + 'cc'}><path d={CUP} /></clipPath>
      </defs>
      <GroundShadow id={u + 'gs'} cx="50" cy="114" rx="40" ry="4.6" a={0.6} />

      {/* plinth: carbon, corners cut at 45 degrees */}
      <path d={poly([[14, 114], [86, 114], [86, 106], [79, 99], [21, 99], [14, 106]])} fill={`url(#${u}pl)`} stroke="#000" strokeOpacity=".6" strokeWidth=".8" />
      <path d="M14 106L21 99H79L86 106" fill="none" stroke={m.edge} strokeOpacity=".55" strokeWidth=".9" strokeLinejoin="round" />
      <path d="M14 106H86" stroke="#000" strokeOpacity=".5" strokeWidth=".7" />
      <path d={poly([[26, 99], [74, 99], [74, 94], [69, 90], [31, 90], [26, 94]])} fill={`url(#${u}pl)`} stroke="#000" strokeOpacity=".6" strokeWidth=".8" />
      <path d="M26 94L31 90H69L74 94" fill="none" stroke={m.edge} strokeOpacity=".5" strokeWidth=".8" strokeLinejoin="round" />
      <path d={rrect(37, 104, 26, 7, 1.4)} fill={`url(#${u}hd)`} stroke="#000" strokeOpacity=".6" strokeWidth=".6" />
      <path d="M42 107.5H58" stroke="#000" strokeOpacity=".55" strokeWidth=".8" strokeLinecap="round" strokeDasharray="2.4 1.6" />

      {/* stem + handles */}
      <path d={STEM} fill={`url(#${u}cp)`} stroke="#000" strokeOpacity=".5" strokeWidth=".7" />
      <path d="M43 82H57" stroke="#000" strokeOpacity=".35" strokeWidth=".8" />
      {[-1, 1].map((sd) => (
        <g key={sd} fill="none" strokeLinecap="round">
          <path d={handle(sd)} stroke="#000" strokeOpacity=".55" strokeWidth="7" />
          <path d={handle(sd)} stroke={`url(#${u}hd)`} strokeWidth="5" />
          <path d={handle(sd)} stroke={m.edge} strokeOpacity=".7" strokeWidth=".9" transform={`translate(${sd * -0.9} -0.9)`} />
        </g>
      ))}

      {/* the cup */}
      <path d={CUP} fill={`url(#${u}cp)`} />
      <g clipPath={`url(#${u}cc)`}>
        <rect x="0" y="0" width={W} height={H} fill={`url(#${u}sh)`} />
        <path d="M27 24C27 44 36 58 47 65" fill="none" stroke="#fff" strokeOpacity=".72" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M71 28C71 44 64 56 56 63" fill="none" stroke={m.edge} strokeOpacity=".4" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M24 33C38 38 62 38 76 33" fill="none" stroke="#000" strokeOpacity=".16" strokeWidth=".8" />
        <path d="M30 51C40 56 60 56 70 51" fill="none" stroke="#000" strokeOpacity=".16" strokeWidth=".8" />
      </g>
      <path d={CUP} fill="none" stroke="#000" strokeOpacity=".5" strokeWidth=".8" strokeLinejoin="round" />
      <g transform="translate(50 38) scale(.3) translate(-50 -50)"><ReliefGlyph shapes={MEDAL_GLYPHS.star} metal={t} u={u} depth={2.2} /></g>
      {/* lip: we look slightly down into it */}
      <ellipse cx="50" cy="15" rx="29.2" ry="6.2" fill={`url(#${u}cp)`} stroke="#000" strokeOpacity=".5" strokeWidth=".7" />
      <ellipse cx="50" cy="15.4" rx="26.2" ry="4.7" fill={`url(#${u}in)`} />
      <path d="M26 14.4C36 11.8 64 11.8 74 14.4" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M22.4 13.4C32 8.6 68 8.6 77.6 13.4" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth=".9" strokeLinecap="round" />
      <path d={spark4(30, 29, 7)} fill="#fff" className="art-trophy__glint" />
    </svg>
  )
})

export default Trophy
