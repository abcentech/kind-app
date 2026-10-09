// Chest — a hard-case supply crate (think flight-line equipment case, not a pirate's trunk).
//   <Chest state="closed" | "open" tone="ignite" | "tele" | "gold" | "go" size={96} />
// Closed: ribbed shell, titanium latches, corner bumpers, a hazard-stripe kick plate, handle, and a light strip that breathes in `tone`.
// Open: the lid swings up and back, the latches hang free, light pours out of the mouth in two beams and the lid's foam lights from below;
//       a few motes drift up (full fx only).
// size = the box edge: the artwork is square so it can swap closed <-> open without the layout moving.
import { memo } from 'react'
import { GroundShadow, MetalGrad, cx, rrect, spark4, useUid, poly } from './emblem-kit.jsx'

const TONES = {
  ignite: { hot: '#fff0d0', mid: '#ff9a22', deep: '#ff4a0f' },
  tele: { hot: '#e8fbff', mid: '#63d8ff', deep: '#2b8fc2' },
  gold: { hot: '#fffbe8', mid: '#f4cf6a', deep: '#c48a1c' },
  go: { hot: '#eafff4', mid: '#3ddc97', deep: '#1a8a5a' },
}

export const Chest = memo(function Chest({ state = 'closed', tone = 'ignite', size = 96, title, decorative, className, style, ...rest }) {
  const u = useUid('ch')
  const open = state === 'open'
  const t = TONES[tone] || TONES.ignite
  const label = title || `Supply crate, ${open ? 'open' : 'closed'}`
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label }
  const dy = open ? 0 : -8
  const latch = (x, opened) => (
    <g key={x}>
      <path d={rrect(x - 10, 60, 20, 24, 3)} fill={`url(#${u}ti)`} stroke="#000" strokeOpacity=".55" strokeWidth=".7" />
      <path d={rrect(x - 7, 63, 14, 8, 2)} fill="#000" fillOpacity=".4" />
      {opened ? (
        <g transform={`rotate(${x < 80 ? 16 : -16} ${x} 66)`}>
          <path d={rrect(x - 6.5, 66, 13, 20, 3)} fill={`url(#${u}lv)`} stroke="#000" strokeOpacity=".6" strokeWidth=".7" />
          <path d={`M${x - 4} 69H${x + 4}`} stroke="#fff" strokeOpacity=".5" strokeWidth=".9" strokeLinecap="round" />
          <circle cx={x} cy="81" r="1.7" fill="#000" fillOpacity=".7" />
        </g>
      ) : (
        <g>
          <path d={rrect(x - 6.5, 54, 13, 21, 3)} fill={`url(#${u}lv)`} stroke="#000" strokeOpacity=".6" strokeWidth=".7" />
          <path d={`M${x - 4} 57H${x + 4}`} stroke="#fff" strokeOpacity=".5" strokeWidth=".9" strokeLinecap="round" />
          <circle cx={x} cy="70" r="1.7" fill="#000" fillOpacity=".7" />
        </g>
      )}
      <circle cx={x - 7.5} cy="82" r="1.1" fill="#000" fillOpacity=".6" /><circle cx={x + 7.5} cy="82" r="1.1" fill="#000" fillOpacity=".6" />
    </g>
  )

  return (
    <svg className={cx('art-chest', open ? 'is-open' : 'is-closed', `tone-${tone}`, className)} width={size} height={size} viewBox="0 -22 160 162" style={style} data-state={open ? 'open' : 'closed'} {...a11y} {...rest}>
      <defs>
        <linearGradient id={u + 'bd'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2b3145" /><stop offset=".6" stopColor="#1a1e2d" /><stop offset="1" stopColor="#0f121c" /></linearGradient>
        <linearGradient id={u + 'ld'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b4360" /><stop offset=".55" stopColor="#272d44" /><stop offset="1" stopColor="#1d2236" /></linearGradient>
        <linearGradient id={u + 'sd'} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".1" /><stop offset=".12" stopColor="#fff" stopOpacity="0" /><stop offset=".88" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".35" /></linearGradient>
        <MetalGrad id={u + 'ti'} metal="ti" x1="0" y1="0" x2="1" y2="1" />
        <linearGradient id={u + 'lv'} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5a6380" /><stop offset=".5" stopColor="#2f364d" /><stop offset="1" stopColor="#1b2033" /></linearGradient>
        <linearGradient id={u + 'bm'} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={t.mid} stopOpacity=".95" /><stop offset=".35" stopColor={t.mid} stopOpacity=".55" /><stop offset=".7" stopColor={t.mid} stopOpacity=".16" /><stop offset="1" stopColor={t.mid} stopOpacity="0" /></linearGradient>
        <linearGradient id={u + 'bm2'} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={t.hot} stopOpacity=".95" /><stop offset=".4" stopColor={t.hot} stopOpacity=".3" /><stop offset=".8" stopColor={t.hot} stopOpacity=".05" /><stop offset="1" stopColor={t.hot} stopOpacity="0" /></linearGradient>
        <radialGradient id={u + 'mo'} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor={t.hot} /><stop offset=".45" stopColor={t.mid} stopOpacity=".85" /><stop offset="1" stopColor={t.deep} stopOpacity="0" /></radialGradient>
        <linearGradient id={u + 'ls'} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={t.deep} /><stop offset=".5" stopColor={t.hot} /><stop offset="1" stopColor={t.deep} /></linearGradient>
        <linearGradient id={u + 'lf'} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={t.mid} stopOpacity=".55" /><stop offset="1" stopColor={t.mid} stopOpacity="0" /></linearGradient>
        <pattern id={u + 'hz'} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="9" height="9" fill="#0a0b10" /><rect width="4.6" height="9" fill="#ffc43d" /></pattern>
        <pattern id={u + 'rb'} width="7" height="4" patternUnits="userSpaceOnUse"><rect width="1" height="4" fill="#000" opacity=".22" /><rect x="1" width=".6" height="4" fill="#fff" opacity=".045" /></pattern>
        <clipPath id={u + 'kp'}><path d={rrect(34, 108, 92, 12, 2)} /></clipPath>
        <clipPath id={u + 'bc'}><path d={rrect(14, 66, 132, 56, 6)} /></clipPath>
      </defs>
      <GroundShadow id={u + 'gs'} cx="80" cy="131" rx="66" ry="6" a={0.6} />

      {open && (
        <g className="art-chest__light" aria-hidden="true">
          <polygon points="26,60 134,60 176,-22 -16,-22" fill={`url(#${u}bm)`} />
          <polygon points="46,60 114,60 138,-22 22,-22" fill={`url(#${u}bm2)`} />
          <ellipse cx="80" cy="58" rx="64" ry="14" fill={`url(#${u}mo)`} />
          {[[40, 20, 4.2], [112, 10, 5.4], [74, -6, 3.4], [128, 32, 3], [24, 38, 3.2], [92, 26, 3.6]].map(([x, y, r], i) => (
            <path key={i} d={spark4(x, y, r * 1.6)} fill={i % 2 ? t.hot : t.mid} className="art-chest__mote" style={{ '--i': i }} />
          ))}
        </g>
      )}

      <g transform={`translate(0 ${dy})`}>
        {open && (
          <g>{/* the lid, swung up and back: we see its underside, foam lit from the crate below */}
            <path d="M16 48L26 4Q27 2 29 2H131Q133 2 134 4L144 48Z" fill={`url(#${u}ld)`} stroke="#000" strokeOpacity=".5" strokeWidth=".8" strokeLinejoin="round" />
            <path d="M23 43L31 9H129L137 43Z" fill="#0a0c14" />
            <path d="M23 43L31 9H129L137 43Z" fill={`url(#${u}rb)`} opacity=".9" />
            <path d="M23 43L31 9H129L137 43Z" fill={`url(#${u}lf)`} />
            <path d="M27 26H133M54 9V43M80 9V43M106 9V43" stroke="#000" strokeOpacity=".4" strokeWidth=".7" />
            <path d="M30 3.4H130" stroke="#fff" strokeOpacity=".4" strokeWidth=".9" strokeLinecap="round" />
            <path d="M16 48H144" stroke="#000" strokeOpacity=".6" strokeWidth="2.4" />
            {[22, 138].map((x) => <path key={x} d={rrect(x - 5, 44, 10, 12, 2)} fill={`url(#${u}ti)`} stroke="#000" strokeOpacity=".55" strokeWidth=".7" />)}
          </g>
        )}

        {/* body */}
        <path d={rrect(14, 66, 132, 56, 6)} fill={`url(#${u}bd)`} />
        <g clipPath={`url(#${u}bc)`}>
          <rect x="14" y="66" width="132" height="56" fill={`url(#${u}rb)`} />
          <rect x="14" y="66" width="132" height="56" fill={`url(#${u}sd)`} />
          <path d="M14 78H146" stroke="#fff" strokeOpacity=".07" strokeWidth=".8" />
        </g>
        <path d={rrect(14.4, 66.4, 131.2, 55.2, 6)} fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth=".7" />
        {/* kick plate: hazard stripe */}
        <g clipPath={`url(#${u}kp)`}><rect x="34" y="108" width="92" height="12" fill={`url(#${u}hz)`} /></g>
        <path d={rrect(34, 108, 92, 12, 2)} fill="none" stroke="#000" strokeOpacity=".7" strokeWidth="1" />
        {/* corner bumpers */}
        {[[14, 1], [130, -1]].map(([x, s]) => (
          <g key={x}>
            <path d={`M${x} 98H${x + s * 14}V122H${x}Z`} fill={`url(#${u}ti)`} stroke="#000" strokeOpacity=".55" strokeWidth=".7" />
            <circle cx={x + s * 7} cy="106" r="1.6" fill="#000" fillOpacity=".6" /><circle cx={x + s * 7} cy="115" r="1.6" fill="#000" fillOpacity=".6" />
          </g>
        ))}
        {/* mouth rim */}
        {open ? (
          <g>
            <path d="M14 66L24 54H136L146 66Z" fill={`url(#${u}mo)`} />
            <path d="M14 66L24 54H136L146 66" fill="none" stroke={t.hot} strokeOpacity=".8" strokeWidth="1" strokeLinejoin="round" />
            <path d="M14 66H146" stroke="#000" strokeOpacity=".6" strokeWidth="2.4" />
          </g>
        ) : (
          <path d="M14 66H146" stroke="#000" strokeOpacity=".75" strokeWidth="2.6" />
        )}

        {/* lid (closed) */}
        {!open && (
          <g>
            <path d="M24 32L28 25H132L136 32Z" fill="#454e6c" stroke="#000" strokeOpacity=".4" strokeWidth=".6" />
            <path d="M14 66V44Q14 32 26 32H134Q146 32 146 44V66Z" fill={`url(#${u}ld)`} />
            <path d="M14 66V44Q14 32 26 32H134Q146 32 146 44V66Z" fill={`url(#${u}rb)`} opacity=".9" />
            <path d="M14 66V44Q14 32 26 32H134Q146 32 146 44V66Z" fill={`url(#${u}sd)`} />
            <path d="M15 44Q15 33 26 33H134Q145 33 145 44" fill="none" stroke="#fff" strokeOpacity=".36" strokeWidth=".9" />
            <path d="M60 28Q60 16 72 16H88Q100 16 100 28" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="6" strokeLinecap="round" />
            <path d="M60 28Q60 16 72 16H88Q100 16 100 28" fill="none" stroke={`url(#${u}ti)`} strokeWidth="4" strokeLinecap="round" />
            {/* light strip */}
            <path d={rrect(46, 43, 68, 8, 4)} fill="#05060a" stroke="#000" strokeWidth=".6" />
            <g className="art-chest__strip">
              <path d={rrect(48, 44.6, 64, 4.8, 2.4)} fill={`url(#${u}ls)`} />
              <path d={rrect(40, 38, 80, 20, 10)} fill={t.mid} opacity=".14" />
            </g>
            <path d="M24 63H136" stroke="#000" strokeOpacity=".45" strokeWidth=".7" />
            <path d="M14 66V50M146 66V50" stroke="#000" strokeOpacity=".4" strokeWidth=".6" />
          </g>
        )}
        {[44, 116].map((x) => latch(x, open))}
      </g>
    </svg>
  )
})

export default Chest
