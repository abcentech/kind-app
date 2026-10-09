// FlameMark — the streak flame. Four stacked tongues (outer ember -> mid -> inner -> white-hot core), a halo, sparks.
//   <FlameMark size={48} lit level={0..3} />      lit={false} = a cold ember outline (streak 0)
// Level grows the flame (0.60 -> 1.0 of the box) and earns it side tongues + sparks; level 3 also gets a heat ring.
// Flicker is CSS (art2.css) on three independent layers; html[data-fx="lite"] and reduced-motion freeze it.
import { memo, useMemo } from 'react'
import { clamp, cx, hash, mulberry32, useUid } from './emblem-kit.jsx'

const OUTER = 'M50 4C54 22 80 38 80 70C80 96 67 114 50 114C33 114 20 96 20 70C20 54 29 44 35 36C36 46 41 54 47 54C41 38 44 18 50 4Z'
const MID = 'M50 30C53 44 68 54 68 76C68 94 60 108 50 108C40 108 32 94 32 76C32 66 38 58 42 52C43 60 46 66 50 66C46 54 47 42 50 30Z'
const INNER = 'M50 56C52 66 60 72 60 88C60 100 56 106 50 106C44 106 40 100 40 88C40 82 43 77 46 73C47 78 49 80 50 80C48 72 48 64 50 56Z'
const CORE = 'M50 82C54 90 56 96 56 100C56 104 53 106 50 106C47 106 44 104 44 100C44 96 46 90 50 82Z'
const TONGUE_L = 'M24 82C13 70 10 55 17 40C20 51 26 57 30 66Z'
const TONGUE_R = 'M76 82C87 68 91 53 83 38C80 49 74 56 70 65Z'
const LICK = 'M73 58C84 46 82 30 74 18C73 32 64 40 63 54Z'
const SCALE = [0.6, 0.76, 0.88, 0.96]
const SPARKS = [[70, 22, 2.4], [28, 30, 1.9], [60, 6, 1.6], [80, 40, 1.6], [20, 14, 1.4], [44, 2, 1.2]]
const COUNT = [0, 0, 2, 5]

export const FlameMark = memo(function FlameMark({ size = 48, lit = true, level = 1, className, style, title, decorative, ...rest }) {
  const u = useUid('fm')
  const lv = clamp(Math.round(level), 0, 3)
  const s = SCALE[lv]
  const phase = useMemo(() => mulberry32(hash(u))(), [u])   // desync flickers between flames on one screen
  const tf = `translate(50 114) scale(${s}) translate(-50 -114)`
  const label = title || (lit ? `Streak flame, level ${lv}` : 'Streak flame, unlit')
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label }

  return (
    <svg
      className={cx('art-flamemark', lit ? 'is-lit' : 'is-cold', `is-l${lv}`, className)}
      width={size} height={size} viewBox="-10 0 120 120"
      style={{ '--fm-d': `${-(phase * 3).toFixed(2)}s`, ...style }}
      {...a11y} {...rest}
    >
      <defs>
        <linearGradient id={u + 'o'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff3a08" /><stop offset=".55" stopColor="#ff5a12" /><stop offset="1" stopColor="#ff8a1c" />
        </linearGradient>
        <linearGradient id={u + 'm'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff7a18" /><stop offset=".6" stopColor="#ffa526" /><stop offset="1" stopColor="#ffc43d" />
        </linearGradient>
        <linearGradient id={u + 'i'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc94a" /><stop offset="1" stopColor="#fff0b8" />
        </linearGradient>
        <linearGradient id={u + 'c'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf2" /><stop offset="1" stopColor="#ffe9a6" />
        </linearGradient>
        <radialGradient id={u + 'g'} cx="50" cy="86" r="62" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff7020" stopOpacity=".55" />
          <stop offset=".5" stopColor="#ff5a14" stopOpacity=".18" />
          <stop offset="1" stopColor="#ff4a0f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={u + 'h'} cx="50" cy="104" r="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffe27a" stopOpacity=".85" /><stop offset=".55" stopColor="#ffa526" stopOpacity=".35" /><stop offset="1" stopColor="#ff5a12" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={u + 'e'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d96ad" /><stop offset="1" stopColor="#4f566b" />
        </linearGradient>
      </defs>

      {lit ? (
        <g>
          <circle cx="50" cy="84" r="62" fill={`url(#${u}g)`} opacity={0.55 + s * 0.45} className="art-flamemark__halo" />
          {lv === 3 && <circle cx="50" cy="80" r="52" fill="none" stroke="#ff9a3c" strokeOpacity=".28" strokeWidth=".8" strokeDasharray="1.2 3.4" strokeLinecap="round" className="art-flamemark__ring" />}
          <g transform={tf}>
            {lv >= 3 && (
              <g className="art-flamemark__tongues">
                <path d={TONGUE_L} fill={`url(#${u}o)`} opacity=".92" className="art-flamemark__t1" />
                <path d={TONGUE_R} fill={`url(#${u}o)`} opacity=".92" className="art-flamemark__t2" />
              </g>
            )}
            <path d={OUTER} fill={`url(#${u}o)`} className="art-flamemark__l1" />
            <path d={OUTER} fill={`url(#${u}h)`} className="art-flamemark__l1" />
            {lv >= 2 && <path d={LICK} fill={`url(#${u}m)`} opacity=".9" className="art-flamemark__t2" />}
            <path d={MID} fill={`url(#${u}m)`} className="art-flamemark__l2" />
            <path d={INNER} fill={`url(#${u}i)`} className="art-flamemark__l3" />
            {lv >= 1 && <path d={CORE} fill={`url(#${u}c)`} className="art-flamemark__core" />}
            {/* a rim light on the outer lobe: reads as a lit surface rather than a flat sticker */}
            <path d="M24 70C24 56 31 47 35 40" fill="none" stroke="#ffd2a0" strokeOpacity=".5" strokeWidth="1.6" strokeLinecap="round" />
          </g>
          {SPARKS.slice(0, COUNT[lv]).map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#ffd978' : '#ffa23a'} className="art-flamemark__spark" style={{ '--i': i }} />
          ))}
        </g>
      ) : (
        <g transform={tf}>
          <path d={OUTER} fill="rgba(255,255,255,.035)" stroke={`url(#${u}e)`} strokeWidth="3.2" strokeLinejoin="round" />
          <path d={MID} fill="none" stroke="#4f566b" strokeOpacity=".55" strokeWidth="2" strokeLinejoin="round" strokeDasharray="1 5" strokeLinecap="round" />
          <circle cx="50" cy="104" r="9" fill="#ff4a0f" fillOpacity=".12" />
          <circle cx="50" cy="104" r="3.6" fill="#7a3a22" />
          <circle cx="49" cy="103" r="1.4" fill="#ff8a1c" fillOpacity=".7" />
        </g>
      )}
    </svg>
  )
})

export default FlameMark
