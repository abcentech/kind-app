// Medal — an achievement medal: struck disc + ribbon. Drawn in metal.
//   <Medal id="streak-7" tier="gold" earned size={96} />      tier: bronze | silver | gold | ti
//   <Medal id="anything" />                                    any id works: a keyword picks the symbol, otherwise a hash does
//   <Medal id="x" earned={false} />                            the silhouette: dark die, dashed edge, ghost symbol, padlock
// Material cues: a *turned-metal* rim (faux conic wedges, two highlights), a reeded edge, a recessed field that is darkest where
// the rim shadows it, an embossed symbol (shadow below-right, catch-light above-left, face lit by a diagonal gradient), a rim light
// on the lower edge, and grosgrain ribbon with pinstripes that darkens into the fold where it meets the disc.
import { memo, useMemo } from 'react'
import { MEDAL_GLYPHS, MEDAL_GLYPH_NAMES, medalGlyphFor } from './emblem-glyphs.js'
import { Conic, GroundShadow, METALS, arcp, cx, hash, metalOf, mix, pt, r1, useUid, P } from './emblem-kit.jsx'

const RIBBON = {
  bronze: { base: '#8c3b24', hi: '#c0603c', pin: '#f0c9a0' },
  silver: { base: '#2b5f8c', hi: '#4f93c4', pin: '#dcecf8' },
  gold: { base: '#8c1f2e', hi: '#c23c4e', pin: '#f4d27a' },
  ti: { base: '#1c2230', hi: '#3a4560', pin: '#63d8ff' },
}
export const TIERS = ['bronze', 'silver', 'gold', 'ti']

/** An emblem rendered as relief in one metal: raised faces, shadow, catch-light, recessed 'k' detail. */
export function ReliefGlyph({ shapes, metal, u, scale = 1, depth = 1 }) {
  const m = metalOf(metal)
  const [lo, mid, hi] = [m.ramp[1], m.ramp[3], m.ramp[5]]
  return (
    <g>
      {shapes.map((s, i) => {
        const k = s.r === 'k'
        const face = k ? m.deep : `url(#${u}fc)`
        const fo = s.r === 'w' ? 0.28 : s.r === 's' ? -0.3 : 0
        if (s.st) {
          return (
            <g key={i} strokeLinecap={s.cap || 'butt'} strokeLinejoin="round" fill="none">
              {!k && <path d={s.d} stroke="#000" strokeOpacity=".5" strokeWidth={s.st} transform={`translate(${0.9 * depth} ${1.1 * depth})`} />}
              {!k && <path d={s.d} stroke={hi} strokeOpacity=".7" strokeWidth={s.st} transform={`translate(${-0.5 * depth} ${-0.6 * depth})`} />}
              <path d={s.d} stroke={k ? m.deep : `url(#${u}fc)`} strokeOpacity={k ? 0.9 : 1} strokeWidth={s.st} />
            </g>
          )
        }
        return (
          <g key={i} fillRule={s.eo ? 'evenodd' : undefined}>
            {!k && <path d={s.d} fill="#000" fillOpacity=".5" transform={`translate(${0.9 * depth} ${1.1 * depth})`} />}
            {!k && <path d={s.d} fill={hi} fillOpacity=".75" transform={`translate(${-0.5 * depth} ${-0.6 * depth})`} />}
            <path d={s.d} fill={face} />
            {fo !== 0 && !k && <path d={s.d} fill={fo > 0 ? '#fff' : '#000'} fillOpacity={Math.abs(fo)} />}
          </g>
        )
      })}
    </g>
  )
}

export const Medal = memo(function Medal({
  id = 'medal', tier = 'bronze', earned = true, size = 96, glyph, ribbon = true, glint = true, title, decorative, className, style, ...rest
}) {
  const u = useUid('md')
  const t = METALS[tier] ? tier : 'bronze'
  const m = METALS[t]
  const name = glyph || medalGlyphFor(id, hash)
  const shapes = MEDAL_GLYPHS[name] || MEDAL_GLYPHS.star
  const rb = RIBBON[t]
  const px = typeof size === 'number' ? size : 96
  const small = px < 44
  const CX = 50, CY = 80, R = 38
  const vb = ribbon ? '0 0 100 128' : '10 42 80 80'
  const aspect = ribbon ? 100 / 128 : 1
  const w = typeof size === 'number' ? Math.round(size * aspect * 100) / 100 : undefined
  const reeding = useMemo(() => {
    let d = ''
    for (let i = 0; i < 72; i++) { const a = i * 5; d += `M${P(pt(CX, CY, R - 4.6, a))}L${P(pt(CX, CY, R - 0.6, a))}` }
    return d
  }, [])
  const label = title || `${String(id).replace(/[-_]+/g, ' ')} medal, ${t} tier, ${earned ? 'earned' : 'locked'}`
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label }

  const strip = (side) => {
    // ribbon strip as a polygon, centreline from (28,-2) to the fold under the disc
    const sx = side === 'l' ? 1 : -1
    const x = (v) => (side === 'l' ? v : 100 - v)
    return `M${x(15)} -2L${x(37)} -2L${x(63)} 66L${x(41)} 66Z`
  }
  const ribbonEl = (
    <g>
      <defs>
        <linearGradient id={u + 'rl'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={rb.hi} /><stop offset=".6" stopColor={rb.base} /><stop offset="1" stopColor={mix(rb.base, '#000', 0.55)} />
        </linearGradient>
        <linearGradient id={u + 'rs'} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".42" /><stop offset=".18" stopColor="#000" stopOpacity="0" /><stop offset=".82" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".4" />
        </linearGradient>
        <linearGradient id={u + 'rf'} x1="0" y1=".4" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".6" />
        </linearGradient>
        <clipPath id={u + 'cr'}><path d={strip('l')} /></clipPath>
        <clipPath id={u + 'cq'}><path d={strip('r')} /></clipPath>
      </defs>
      {[['l', 'cr'], ['r', 'cq']].map(([side, cp]) => {
        const sgn = side === 'l' ? 1 : -1
        const lines = []
        // pinstripes + grosgrain ribs follow the strip direction (dx/dy = 26/68)
        const stripe = (off, w, c, o) => {
          const x0 = side === 'l' ? 26 + off : 74 - off
          lines.push(<path key={off + c} d={`M${x0} -2L${x0 + sgn * 26} 66`} stroke={c} strokeWidth={w} strokeOpacity={o} fill="none" />)
        }
        stripe(-7.2, 1.3, rb.pin, 0.92); stripe(-3.9, 0.5, rb.pin, 0.7); stripe(3.9, 0.5, rb.pin, 0.7); stripe(7.2, 1.3, rb.pin, 0.92)
        const ribs = []
        for (let i = -9; i <= 9; i++) {
          const x0 = side === 'l' ? 26 + i * 1.15 : 74 - i * 1.15
          ribs.push(`M${r1(x0)} -2L${r1(x0 + sgn * 26)} 66`)
        }
        return (
          <g key={side} clipPath={`url(#${u}${cp})`}>
            <path d={strip(side)} fill={`url(#${u}rl)`} />
            <path d={ribs.join('')} stroke="#000" strokeOpacity=".16" strokeWidth=".45" fill="none" />
            {lines}
            <path d={strip(side)} fill={`url(#${u}rs)`} />
            <rect x="0" y="0" width="100" height="70" fill={`url(#${u}rf)`} />
          </g>
        )
      })}
      <path d={strip('l')} fill="none" stroke="#000" strokeOpacity=".5" strokeWidth=".6" />
      <path d={strip('r')} fill="none" stroke="#000" strokeOpacity=".5" strokeWidth=".6" />
    </g>
  )

  return (
    <svg
      className={cx('art-medal', earned ? 'is-earned' : 'is-locked', `t-${t}`, className)}
      width={w} height={size} viewBox={vb} style={style} data-glyph={name} data-tier={t}
      {...a11y} {...rest}
    >
      <defs>
        <radialGradient id={u + 'fl'} cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor={m.ramp[4]} /><stop offset=".55" stopColor={m.ramp[2]} /><stop offset="1" stopColor={m.ramp[1]} />
        </radialGradient>
        <linearGradient id={u + 'fc'} gradientUnits="userSpaceOnUse" x1="20" y1="14" x2="80" y2="90">
          <stop offset="0" stopColor={m.ramp[5]} /><stop offset=".4" stopColor={m.ramp[4]} /><stop offset=".75" stopColor={m.ramp[3]} /><stop offset="1" stopColor={m.ramp[2]} />
        </linearGradient>
        <radialGradient id={u + 'gl'} cx="30%" cy="22%" r="72%">
          <stop offset="0" stopColor="#fff" stopOpacity=".42" /><stop offset=".45" stopColor="#fff" stopOpacity=".06" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={u + 'gt'} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".6" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id={u + 'cd'}><circle cx={CX} cy={CY} r={R} /></clipPath>
      </defs>

      {earned ? (
        <>
          {ribbon && ribbonEl}
          {ribbon && (
            <g>{/* the bail: the little loop that joins ribbon to disc */}
              <path d="M44 38.5C44 34 56 34 56 38.5V48H44Z" fill={`url(#${u}fc)`} stroke="#000" strokeOpacity=".5" strokeWidth=".6" />
              <ellipse cx="50" cy="38.6" rx="3.2" ry="2.2" fill="#000" fillOpacity=".6" />
            </g>
          )}
          <GroundShadow id={u + 'g2'} cx={CX} cy={CY + R + 1} rx={R * 0.92} ry="4.2" a={0.5} />
          <circle cx={CX} cy={CY + 1.8} r={R + 0.6} fill="#000" opacity=".5" />
          <Conic cx={CX} cy={CY} r1={R} metal={t} n={small ? 24 : 56} lobes={2} rot={-40} lo={0.04} hi={1} gamma={1.1} />
          {!small && <path d={reeding} stroke="#000" strokeOpacity=".32" strokeWidth=".55" fill="none" />}
          <circle cx={CX} cy={CY} r={R - 0.2} fill="none" stroke="#000" strokeOpacity=".55" strokeWidth=".7" />
          <circle cx={CX} cy={CY} r={R - 0.7} fill="none" stroke={m.edge} strokeOpacity=".5" strokeWidth=".5" strokeDasharray="0 0" clipPath={`url(#${u}cd)`} />
          {/* the recessed field */}
          <circle cx={CX} cy={CY} r={R - 5.2} fill="#000" fillOpacity=".5" />
          <circle cx={CX} cy={CY} r={R - 5.7} fill={`url(#${u}fl)`} />
          <path d={arcp(CX, CY, R - 5.9, 250, 380)} stroke="#000" strokeOpacity=".4" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d={arcp(CX, CY, R - 5.9, 70, 200)} stroke={m.edge} strokeOpacity=".6" strokeWidth=".8" fill="none" strokeLinecap="round" />
          <circle cx={CX} cy={CY} r={R - 9.5} fill="none" stroke="#000" strokeOpacity=".28" strokeWidth=".5" />
          {t === 'ti' && (
            <g>{/* the top tier is lit from inside: a cyan inlay ring, like a cluster tell-tale */}
              <circle cx={CX} cy={CY} r={R - 7.6} fill="none" stroke="#63d8ff" strokeOpacity=".22" strokeWidth="3.2" />
              <circle cx={CX} cy={CY} r={R - 7.6} fill="none" stroke="#63d8ff" strokeOpacity=".95" strokeWidth=".7" strokeDasharray="1.1 1.5" strokeLinecap="round" />
            </g>
          )}
          <g transform={`translate(${CX} ${CY}) scale(${0.43}) translate(-50 -50)`}>
            <ReliefGlyph shapes={shapes} metal={t} u={u} depth={small ? 1.4 : 1.7} />
          </g>
          <g clipPath={`url(#${u}cd)`}>
            <circle cx={CX} cy={CY} r={R} fill={`url(#${u}gl)`} />
            {glint && !small && <g className="art-medal__sweep"><rect x="-30" y="30" width="22" height="110" transform="skewX(-20)" fill={`url(#${u}gt)`} /></g>}
          </g>
        </>
      ) : (
        <>
          {ribbon && (
            <g opacity=".9">
              <path d={strip('l')} fill="#0e1119" stroke="#2f3649" strokeWidth=".8" strokeDasharray="3 2.4" />
              <path d={strip('r')} fill="#0e1119" stroke="#2f3649" strokeWidth=".8" strokeDasharray="3 2.4" />
            </g>
          )}
          <circle cx={CX} cy={CY} r={R} fill="#0b0d14" stroke="#3a4157" strokeWidth="1" strokeDasharray="3.4 2.8" strokeLinecap="round" />
          <circle cx={CX} cy={CY} r={R - 5.5} fill="#0f121a" stroke="#222839" strokeWidth=".7" />
          <g transform={`translate(${CX} ${CY - 1.5}) scale(${0.4}) translate(-50 -50)`} opacity=".9">
            {shapes.map((s, i) => s.st
              ? <path key={i} d={s.d} fill="none" stroke={s.r === 'k' ? '#0a0c12' : '#1d2233'} strokeWidth={s.st} strokeLinecap={s.cap || 'butt'} strokeLinejoin="round" />
              : <path key={i} d={s.d} fillRule={s.eo ? 'evenodd' : undefined} fill={s.r === 'k' ? '#0a0c12' : '#1b2031'} stroke={s.r === 'k' ? 'none' : '#2c3347'} strokeWidth="1" strokeLinejoin="round" />)}
          </g>
          <g transform={`translate(${CX} ${CY + R - 9})`}>
            <path d="M-2.6 -.4V-1.6a2.6 2.6 0 0 1 5.2 0V-.4" fill="none" stroke="#6b7390" strokeWidth="1.1" strokeLinecap="round" />
            <rect x="-3.8" y="-.6" width="7.6" height="5.6" rx="1.2" fill="#2c3246" stroke="#7a82a0" strokeWidth=".6" />
          </g>
        </>
      )}
    </svg>
  )
})

export { MEDAL_GLYPH_NAMES }
export default Medal
