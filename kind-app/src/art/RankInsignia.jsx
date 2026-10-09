// RankInsignia — seven hexagonal ranks, increasingly ornate. Plain steel at 0, full gold at 6.
//   <RankInsignia rank={0..6} size={72} />         size = height; the hex is pointy-top (width = 0.866 x height), like --clip-hex
//
//   0 plain            steel plate, one diamond
//   1 · 2 · 3          one, two, three chevrons (steel -> titanium; rank 3 gets cyan enamel)
//   4                  three chevrons + a star, bronze, studs at the poles
//   5                  + a laurel, silver with a gold inner rim, studs at every vertex
//   6                  gold: radiating rays, wings, crowned star with a ruby, full laurel, double bezel
// Cues: turned-chrome bezel with bevelled edges lit from the top-left, dark enamel plate with a brushed grain, chevrons struck in relief,
// seven LED pips along the foot (the lit ones are your rank).
import { memo } from 'react'
import { ReliefGlyph } from './Medal.jsx'
import { leaf, leafArc } from './emblem-glyphs.js'
import { GroundShadow, METALS, MetalGrad, cx, metalOf, mix, pt, poly, P, circ, star, r2, useUid, rrect } from './emblem-kit.jsx'

export const RANK_COUNT = 7
const W = 100, H = 115.47, CXC = 50, CYC = 57.735, RAD = 57.735
const hexPts = (inset = 0, cy = CYC) => Array.from({ length: 6 }, (_, i) => {
  const a = i * 60, r = RAD - inset / Math.cos(Math.PI / 6)
  return pt(CXC, cy, r, a)
})
const hexD = (inset) => poly(hexPts(inset))

// metal / enamel / lit-pip colour per rank
const SPEC = [
  { metal: 'steel', plate: ['#1a1f2b', '#0d1017'], pip: '#8993a9' },
  { metal: 'steel', plate: ['#1b2230', '#0c1018'], pip: '#b7bfd0' },
  { metal: 'ti', plate: ['#1a2436', '#0a0f19'], pip: '#cfe9ff' },
  { metal: 'ti', plate: ['#10405c', '#06141f'], pip: '#63d8ff' },
  { metal: 'bronze', plate: ['#3c2112', '#150b05'], pip: '#ffd9b3' },
  { metal: 'silver', plate: ['#1a2a52', '#090f22'], pip: '#fff4c9' },
  { metal: 'gold', plate: ['#3a121c', '#12050a'], pip: '#fffbe8' },
]

const chev = (y, w = 28, th = 8.5, drop = 13) =>
  poly([[50, y], [50 + w, y + drop], [50 + w, y + drop + th], [50, y + th], [50 - w, y + drop + th], [50 - w, y + drop]])
const S = (d, r = 'p', x) => ({ d, r, ...x })

function shapesFor(rank) {
  if (rank === 0) return [S(poly([[50, 49], [58, 57.7], [50, 66.4], [42, 57.7]]), 'p'), S(poly([[50, 53.4], [54.2, 57.7], [50, 62], [45.8, 57.7]]), 'k')]
  if (rank === 1) return [S(chev(46), 'p')]
  if (rank === 2) return [S(chev(38), 'p'), S(chev(53), 'p')]
  if (rank === 3) return [S(chev(33), 'p'), S(chev(48), 'p'), S(chev(63), 'p')]
  const chevs = [S(chev(40), 'p'), S(chev(54), 'p'), S(chev(68), 'p')]
  if (rank === 4) return [S(star(50, 27, 10.5, 4.4), 'p'), ...chevs]
  const laurel = [...leafArc(50, 60, 38, 198, 318, 6, 12, 6.5), ...leafArc(50, 60, 38, 162, 42, 6, 12, 6.5)].map((d) => S(d, 's'))
  if (rank === 5) return [...laurel, S(star(50, 26, 10.5, 4.4), 'p'), ...chevs]
  // rank 6
  const wings = [-1, 1].flatMap((sd) => [
    S(leaf(50 + sd * 9, 37, 25, 7.5, sd * 72), 'p'), S(leaf(50 + sd * 9, 41.5, 22, 6.8, sd * 82), 'p'), S(leaf(50 + sd * 9, 46, 17, 6.2, sd * 94), 'p'),
  ])
  const laurel6 = [...leafArc(50, 62, 40, 200, 322, 7, 12.5, 6.8), ...leafArc(50, 62, 40, 160, 38, 7, 12.5, 6.8)].map((d) => S(d, 's'))
  return [...laurel6, ...wings, S('M43 19.5L45 13L48 16.5L50 11L52 16.5L55 13L57 19.5Z', 'a'), S(star(50, 29.5, 11, 4.6), 'p'), S(chev(45, 26, 7.5, 12), 'p'), S(chev(57, 26, 7.5, 12), 'p'), S(chev(69, 26, 7.5, 12), 'p')]
}

export const RankInsignia = memo(function RankInsignia({ rank = 0, size = 72, title, decorative, className, style, ...rest }) {
  const u = useUid('rk')
  const r = Math.max(0, Math.min(6, Math.round(Number(rank) || 0)))
  const sp = SPEC[r]
  const m = metalOf(sp.metal)
  const px = typeof size === 'number' ? size : 72
  const w = typeof size === 'number' ? r2((size * W) / H) : undefined
  const hi = px >= 56
  const shapes = shapesFor(r)
  const studs = r >= 5 ? hexPts(3.4) : r >= 4 ? [hexPts(3.4)[0], hexPts(3.4)[3]] : r === 3 ? [hexPts(3.4)[0], hexPts(3.4)[3]] : []
  const edge = (a, b, c, o, wd = 0.9) => <path d={`M${P(a)}L${P(b)}`} stroke={c} strokeOpacity={o} strokeWidth={wd} strokeLinecap="round" />
  const o = hexPts(0.7)
  const label = title || `Rank ${r + 1} of ${RANK_COUNT} insignia`
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label }

  return (
    <svg className={cx('art-rank', `is-r${r}`, className)} width={w} height={size} viewBox={`0 0 ${W} ${r2(H)}`} style={style} data-rank={r} {...a11y} {...rest}>
      <defs>
        <MetalGrad id={u + 'bz'} metal={sp.metal} x1="0.05" y1="0" x2="0.95" y2="1" />
        <linearGradient id={u + 'fc'} gradientUnits="userSpaceOnUse" x1="24" y1="20" x2="76" y2="90">
          <stop offset="0" stopColor={m.ramp[5]} /><stop offset=".45" stopColor={m.ramp[4]} /><stop offset=".8" stopColor={m.ramp[3]} /><stop offset="1" stopColor={m.ramp[2]} />
        </linearGradient>
        <radialGradient id={u + 'pl'} cx="50%" cy="38%" r="75%"><stop offset="0" stopColor={sp.plate[0]} /><stop offset="1" stopColor={sp.plate[1]} /></radialGradient>
        <linearGradient id={u + 'gl'} x1="0" y1="0" x2=".7" y2=".9"><stop offset="0" stopColor="#fff" stopOpacity=".34" /><stop offset=".38" stopColor="#fff" stopOpacity=".05" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".28" /></linearGradient>
        <pattern id={u + 'br'} width="2" height="1.6" patternUnits="userSpaceOnUse"><rect width="2" height=".5" fill="#fff" opacity=".045" /></pattern>
        <radialGradient id={u + 'gm'} cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#ffd0d8" /><stop offset=".35" stopColor="#ff3b5c" /><stop offset="1" stopColor="#7a0a22" /></radialGradient>
        <clipPath id={u + 'cp'}><path d={hexD(0)} /></clipPath>
        <clipPath id={u + 'cl'}><path d={hexD(7)} /></clipPath>
      </defs>
      <GroundShadow id={u + 'sh'} cx="50" cy="112" rx="38" ry="4.2" a={0.55} />

      {/* bezel */}
      <path d={hexD(0)} fill={`url(#${u}bz)`} />
      {r === 6 && <path d={hexD(3)} fill="none" stroke="#000" strokeOpacity=".4" strokeWidth=".7" />}
      {edge(o[5], o[0], '#fff', 0.85, 1.1)}{edge(o[0], o[1], '#fff', 0.35)}{edge(o[4], o[5], '#fff', 0.6)}
      {edge(o[1], o[2], '#000', 0.3)}{edge(o[2], o[3], '#000', 0.5, 1.1)}{edge(o[3], o[4], '#000', 0.35)}
      <path d={hexD(5.6)} fill="#000" fillOpacity=".55" />
      {r >= 5 && <path d={hexD(6.6)} fill="none" stroke={r === 5 ? METALS.gold.ramp[4] : m.edge} strokeOpacity=".85" strokeWidth=".9" />}

      {/* enamel plate */}
      <path d={hexD(7)} fill={`url(#${u}pl)`} />
      {hi && <path d={hexD(7)} fill={`url(#${u}br)`} />}
      <path d={hexD(7)} fill="none" stroke="#000" strokeOpacity=".6" strokeWidth="1" />
      <path d={hexD(9.4)} fill="none" stroke={m.ramp[3]} strokeOpacity={r === 0 ? 0.25 : 0.5} strokeWidth=".45" />
      {r === 6 && (
        <g clipPath={`url(#${u}cl)`} opacity=".5">
          {Array.from({ length: 28 }, (_, i) => <path key={i} d={poly([pt(50, 56, 8, i * 12.857 - 1.7), pt(50, 56, 60, i * 12.857), pt(50, 56, 8, i * 12.857 + 1.7)])} fill={m.ramp[3]} fillOpacity={i % 2 ? 0.28 : 0.5} />)}
        </g>
      )}
      {r === 3 && <path d={hexD(12)} fill="none" stroke="#63d8ff" strokeOpacity=".5" strokeWidth=".6" strokeDasharray="2 2.4" />}

      {/* emblem, struck in relief */}
      <ReliefGlyph shapes={shapes} metal={sp.metal} u={u} depth={0.7} />
      {r === 6 && <circle cx="50" cy="29.5" r="3" fill={`url(#${u}gm)`} stroke="#000" strokeOpacity=".5" strokeWidth=".5" />}
      {r === 3 && <path d={poly([[50, 22], [53.2, 25.2], [50, 28.4], [46.8, 25.2]])} fill="#63d8ff" />}

      {/* studs */}
      {studs.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r="2.4" fill="#000" fillOpacity=".5" /><circle cx={p[0]} cy={p[1]} r="1.9" fill={`url(#${u}fc)`} /></g>)}

      {/* the foot: seven pips, lit up to this rank */}
      {px >= 40 && Array.from({ length: RANK_COUNT }, (_, i) => {
        const x = 50 + (i - 3) * 6.4, y = 98.8
        return i <= r
          ? <g key={i}><circle cx={x} cy={y} r="2.1" fill="#000" fillOpacity=".7" /><circle cx={x} cy={y} r="1.45" fill={sp.pip} />{r >= 3 && <circle cx={x} cy={y} r="3.2" fill={sp.pip} fillOpacity=".12" />}</g>
          : <circle key={i} cx={x} cy={y} r="1.5" fill="none" stroke={m.ramp[2]} strokeOpacity=".5" strokeWidth=".5" />
      })}

      {/* light */}
      <g clipPath={`url(#${u}cp)`}><rect width={W} height={H} fill={`url(#${u}gl)`} /></g>
    </svg>
  )
})

export default RankInsignia
