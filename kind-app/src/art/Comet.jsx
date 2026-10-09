// Comet — a streak of ice and dust for celebrations (milestones, rank-ups, a perfect week). Two tails, because that is
// what a real one has: a thin straight ion tail (blue-white, points directly away from the sun) and a broad curved dust
// tail (gold, lags behind). Gradients only; the drift is one transform, the shimmer is opacity on the streamers.
//
//   <Comet size={px width} angle={deg} />       head on the right, tails trailing left, then rotated by `angle`
import { cx, useUid } from './Starfield.jsx'

const f = (v) => +v.toFixed(1)
// a tail as a polygon about a curved centre line; layering several with shrinking widths gives soft edges with no blur
function tail({ bend, w, taper = 1.1, from = [266, 61.6], to = 8, k = 1 }) {
  const up = [], dn = []
  for (let i = 0; i <= 26; i++) {
    const t = i / 26
    const x = from[0] - (from[0] - to) * t, y = from[1] - bend * Math.pow(t, 1.5)
    const hw = w * k * Math.pow(1 - Math.pow(t, taper), 0.9) + 0.2
    up.push([x, y - hw]); dn.push([x, y + hw])
  }
  return 'M' + up.concat(dn.reverse()).map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z'
}
const DUST = [1, 0.84, 0.7, 0.57, 0.45, 0.34, 0.24, 0.15].map((k) => tail({ bend: 30, w: 27, k }))
const DUST_CORE = [1, 0.72, 0.46].map((k) => tail({ bend: 16, w: 11, to: 60, k }))
const ION = [1, 0.55, 0.3].map((k) => tail({ bend: -6, w: 2.4, taper: 0.8, to: 2, from: [266, 62], k }))

export default function Comet({ size = 320, angle = -18, className, style, title, ...rest }) {
  const u = useUid('cm')
  return (
    <svg
      className={cx('art-cm', className)}
      viewBox="0 0 320 120" width={size} height={(size * 120) / 320}
      role={title ? 'img' : undefined} aria-hidden={title ? undefined : 'true'} focusable="false"
      style={{ '--rot': `${angle}deg`, ...style }}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={`${u}-dust`} gradientUnits="userSpaceOnUse" x1="268" y1="0" x2="10" y2="0">
          <stop offset="0" stopColor="#ffe2b0" stopOpacity=".78" /><stop offset=".3" stopColor="#ffbe6e" stopOpacity=".38" /><stop offset="1" stopColor="#ff9a4a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${u}-dust2`} gradientUnits="userSpaceOnUse" x1="268" y1="0" x2="60" y2="0">
          <stop offset="0" stopColor="#fff3d8" stopOpacity=".7" /><stop offset=".5" stopColor="#ffcf8a" stopOpacity=".22" /><stop offset="1" stopColor="#ffb25c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${u}-ion`} gradientUnits="userSpaceOnUse" x1="268" y1="0" x2="4" y2="0">
          <stop offset="0" stopColor="#e6f6ff" stopOpacity=".95" /><stop offset=".3" stopColor="#8fd0ff" stopOpacity=".5" /><stop offset="1" stopColor="#5aa8ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${u}-coma`}>
          <stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".22" stopColor="#dff2ff" stopOpacity=".7" />
          <stop offset=".55" stopColor="#8fd0ff" stopOpacity=".22" /><stop offset="1" stopColor="#5aa8ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="art-cm__body">
        {/* dust tail: broad, curved, warm — stacked, shrinking layers read as a soft edge */}
        {DUST.map((d, i) => <path key={i} d={d} fill={`url(#${u}-dust)`} opacity=".34" />)}
        {DUST_CORE.map((d, i) => <path key={i} d={d} fill={`url(#${u}-dust2)`} opacity=".45" />)}
        {/* ion tail: thin, straight, bright, with streamers that shimmer */}
        {ION.map((d, i) => <path key={i} d={d} fill={`url(#${u}-ion)`} opacity=".55" />)}
        <g className="art-cm__st" fill="none" stroke={`url(#${u}-ion)`} strokeLinecap="round">
          <path d="M262 60L88 52" strokeWidth=".8" /><path d="M262 63L60 74" strokeWidth=".7" /><path d="M262 62L128 84" strokeWidth=".6" />
        </g>
        {/* head */}
        <circle cx="268" cy="62" r="44" fill={`url(#${u}-coma)`} opacity=".62" />
        <circle cx="268" cy="62" r="17" fill={`url(#${u}-coma)`} />
        <circle cx="268" cy="62" r="3.4" fill="#fff" />
        <g stroke="#fff" strokeLinecap="round" opacity=".7">
          <path d="M246 62H290" strokeWidth=".6" /><path d="M268 40V84" strokeWidth=".6" />
        </g>
      </g>
    </svg>
  )
}
