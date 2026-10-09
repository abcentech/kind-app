// Flame — the exhaust plume. One geometry, three states, all driven by CSS (see art.css · FLAME):
//   off   → collapsed + transparent        idle → a short, narrow, breathing tongue        burn → the full layered plume
// Switching state is a spring on transform/opacity, so ignition *blooms* instead of popping.
//
// Layers, back to front (no SVG filters anywhere — softness comes from radial gradients):
//   bloom (the light the plume throws) · outer (translucent orange) · tongues (ragged edge) · body (ignition orange)
//   · three jets (one per bell, merging) · core (white-hot) · shock diamonds · embers
// Everything is authored pointing DOWN from the origin (0,0) = the nozzle exit plane.
import { useMemo } from 'react'
import { cx, mulberry32, useUid } from './Starfield.jsx'

const n2 = (v) => +v.toFixed(2)

/** Gradient defs for one plume. `u` is the instance uid; W the merged throat width, L the full-burn length. */
export function PlumeDefs({ u, W, L }) {
  const sx = (k) => `scale(${n2((W * k) / 2 / L)} 1)`
  return (
    <>
      <radialGradient id={`${u}-pl-bloom`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r={n2(L * 0.78)} gradientTransform={`translate(0 ${n2(L * 0.2)}) ${sx(2.6)}`}>
        <stop offset="0" stopColor="#ff9a3c" stopOpacity=".62" />
        <stop offset=".34" stopColor="#ff6a1a" stopOpacity=".28" />
        <stop offset=".7" stopColor="#ff4a0f" stopOpacity=".08" />
        <stop offset="1" stopColor="#ff4a0f" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${u}-pl-outer`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r={L} gradientTransform={sx(1.18)}>
        <stop offset="0" stopColor="#ffb766" stopOpacity=".7" />
        <stop offset=".3" stopColor="#ff8a2a" stopOpacity=".42" />
        <stop offset=".6" stopColor="#ff5a16" stopOpacity=".15" />
        <stop offset=".86" stopColor="#ff4a0f" stopOpacity=".02" />
        <stop offset="1" stopColor="#ff4a0f" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${u}-pl-tongue`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r={n2(L * 0.6)} gradientTransform={sx(0.95)}>
        <stop offset="0" stopColor="#ff9a3c" stopOpacity=".4" />
        <stop offset=".5" stopColor="#ff6a1a" stopOpacity=".16" />
        <stop offset="1" stopColor="#ff4a0f" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${u}-pl-body`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r={n2(L * 0.74)} gradientTransform={sx(1.12)}>
        <stop offset="0" stopColor="#fff0c4" />
        <stop offset=".2" stopColor="#ffd172" />
        <stop offset=".46" stopColor="#ff9626" />
        <stop offset=".78" stopColor="#ff5a12" stopOpacity=".5" />
        <stop offset="1" stopColor="#ff4a0f" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${u}-pl-core`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r={n2(L * 0.46)} gradientTransform={sx(0.58)}>
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".42" stopColor="#fff6dc" stopOpacity=".95" />
        <stop offset=".78" stopColor="#ffd88a" stopOpacity=".42" />
        <stop offset="1" stopColor="#ffc060" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${u}-pl-jet`}>
        <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
        <stop offset=".55" stopColor="#fff2cc" stopOpacity=".5" />
        <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${u}-pl-dia`}>
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".5" stopColor="#ffeab8" stopOpacity=".92" />
        <stop offset="1" stopColor="#ffb44a" stopOpacity=".1" />
      </radialGradient>
      <radialGradient id={`${u}-pl-throat`}>
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".45" stopColor="#fff0c0" stopOpacity=".92" />
        <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
      </radialGradient>
    </>
  )
}

/** The plume itself, origin at the nozzle exit plane. Wrap in <g transform="translate(x y)">.
 *  `jets` = x offsets of individual bells (the merging streaks); pass [] for a single clean plume. */
export function Plume({ u, W = 34, L = 210, jets = [-11, 0, 11], mode = 'burn', seed = 7 }) {
  const g = useMemo(() => {
    const h = W / 2
    const outer = `M${n2(-h)} 0C${n2(-h * 1.34)} ${n2(L * 0.12)} ${n2(-h * 1.28)} ${n2(L * 0.34)} ${n2(-h * 0.6)} ${n2(L * 0.62)}C${n2(-h * 0.32)} ${n2(L * 0.8)} ${n2(-h * 0.12)} ${n2(L * 0.93)} 0 ${L}C${n2(h * 0.12)} ${n2(L * 0.92)} ${n2(h * 0.36)} ${n2(L * 0.78)} ${n2(h * 0.66)} ${n2(L * 0.6)}C${n2(h * 1.3)} ${n2(L * 0.34)} ${n2(h * 1.34)} ${n2(L * 0.12)} ${n2(h)} 0Z`
    const body = `M${n2(-h * 0.8)} 0C${n2(-h * 1.0)} ${n2(L * 0.1)} ${n2(-h * 0.94)} ${n2(L * 0.26)} ${n2(-h * 0.42)} ${n2(L * 0.46)}C${n2(-h * 0.2)} ${n2(L * 0.58)} ${n2(-h * 0.06)} ${n2(L * 0.68)} 0 ${n2(L * 0.74)}C${n2(h * 0.08)} ${n2(L * 0.66)} ${n2(h * 0.24)} ${n2(L * 0.56)} ${n2(h * 0.46)} ${n2(L * 0.44)}C${n2(h * 0.96)} ${n2(L * 0.24)} ${n2(h * 1.0)} ${n2(L * 0.1)} ${n2(h * 0.8)} 0Z`
    const core = `M${n2(-h * 0.36)} 0C${n2(-h * 0.5)} ${n2(L * 0.07)} ${n2(-h * 0.42)} ${n2(L * 0.2)} ${n2(-h * 0.14)} ${n2(L * 0.34)}C${n2(-h * 0.06)} ${n2(L * 0.4)} ${n2(-h * 0.02)} ${n2(L * 0.44)} 0 ${n2(L * 0.47)}C${n2(h * 0.03)} ${n2(L * 0.42)} ${n2(h * 0.08)} ${n2(L * 0.38)} ${n2(h * 0.16)} ${n2(L * 0.32)}C${n2(h * 0.44)} ${n2(L * 0.2)} ${n2(h * 0.5)} ${n2(L * 0.07)} ${n2(h * 0.36)} 0Z`
    // two ragged tongues riding the outside of the plume, flickering out of phase with it
    const tongue = (s) => `M${n2(s * h * 0.5)} 0C${n2(s * h * 1.16)} ${n2(L * 0.1)} ${n2(s * h * 1.18)} ${n2(L * 0.3)} ${n2(s * h * 0.74)} ${n2(L * 0.5)}C${n2(s * h * 0.46)} ${n2(L * 0.36)} ${n2(s * h * 0.38)} ${n2(L * 0.18)} ${n2(s * h * 0.22)} 0Z`
    const rnd = mulberry32(seed)
    const dia = [[0.17, 0.3, 0.085], [0.3, 0.23, 0.066], [0.41, 0.17, 0.05], [0.5, 0.11, 0.038]].map(([y, w, hh], i) => ({ y: L * y, w: W * w, h: L * hh, d: n2(i * 0.07) }))
    const sparks = Array.from({ length: 7 }, (_, i) => ({
      x: n2((rnd() - 0.5) * W * 0.9), y: n2(L * (0.1 + rnd() * 0.16)), r: n2(0.7 + rnd() * 0.9),
      dx: n2((rnd() - 0.5) * W * 1.1), dy: n2(L * (0.42 + rnd() * 0.3)), t: n2(0.7 + rnd() * 0.7), d: n2(i * 0.17),
    }))
    return { outer, body, core, tl: tongue(-1), tr: tongue(1), dia, sparks }
  }, [W, L, seed])

  return (
    <g className="art-fl" data-mode={mode}>
      <ellipse className="art-fl__bloom" cx="0" cy={n2(L * 0.28)} rx={n2(W * 1.7)} ry={n2(L * 0.64)} fill={`url(#${u}-pl-bloom)`} />
      <g className="art-fl__plume">
        <path className="art-fl__o" d={g.outer} fill={`url(#${u}-pl-outer)`} />
        <path className="art-fl__t art-fl__t--l" d={g.tl} fill={`url(#${u}-pl-tongue)`} />
        <path className="art-fl__t art-fl__t--r" d={g.tr} fill={`url(#${u}-pl-tongue)`} />
        <path className="art-fl__b" d={g.body} fill={`url(#${u}-pl-body)`} />
        {jets.map((x, i) => (
          <ellipse
            key={i} className="art-fl__j" cx={n2(x * 0.5)} cy={n2(L * 0.1)} rx={n2(2.2 + W * 0.04)} ry={n2(L * 0.1)} fill={`url(#${u}-pl-jet)`}
            style={{ '--d': `${i * -0.09}s` }}
          />
        ))}
        <path className="art-fl__c" d={g.core} fill={`url(#${u}-pl-core)`} />
      </g>
      <g className="art-fl__dg">
        {g.dia.map((d, i) => (
          <path key={i} className="art-fl__d" fill={`url(#${u}-pl-dia)`} style={{ '--d': `${d.d * -1}s` }}
            d={`M${n2(-d.w)} ${n2(d.y)}L0 ${n2(d.y - d.h)}L${n2(d.w)} ${n2(d.y)}L0 ${n2(d.y + d.h * 1.25)}Z`} />
        ))}
      </g>
      <g className="art-fl__sg">
        {g.sparks.map((s, i) => (
          <circle key={i} className="art-fl__s" cx={s.x} cy={s.y} r={s.r} fill="#ffd9a0"
            style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--t': `${s.t * 1.6}s`, '--d': `${s.d}s` }} />
        ))}
      </g>
      <ellipse className="art-fl__throat" cx="0" cy="0" rx={n2(W * 0.5)} ry="3.4" fill={`url(#${u}-pl-throat)`} />
    </g>
  )
}

const FW = 44, FL = 200   // standalone geometry

/** Flame — the plume as its own asset. `size` = rendered height in px (width follows). `intensity` 0..1:
 *  < .12 off, < .6 idle, else burn. The plume points down from a small nozzle collar at the top-centre of the box;
 *  pass nozzle={false} to get the bare plume (origin at the top edge) for mounting on your own hardware. */
export default function Flame({ size = 160, intensity = 1, nozzle = true, className, style, title, ...rest }) {
  const u = useUid('fl')
  const mode = intensity < 0.12 ? 'off' : intensity < 0.6 ? 'idle' : 'burn'
  const vw = 150, vh = FL + 44
  return (
    <svg
      className={cx('art-flame', className)}
      viewBox={`${-vw / 2} -26 ${vw} ${vh}`}
      width={size ? (size * vw) / vh : undefined} height={size || undefined}
      role={title ? 'img' : undefined} aria-hidden={title ? undefined : 'true'} focusable="false"
      style={{ overflow: 'visible', ...style }}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <PlumeDefs u={u} W={FW} L={FL} />
        <linearGradient id={`${u}-noz`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#2a3040" /><stop offset=".16" stopColor="#8d98b0" /><stop offset=".3" stopColor="#e4eaf6" /><stop offset=".55" stopColor="#566077" /><stop offset=".85" stopColor="#8f7c6b" /><stop offset="1" stopColor="#262b38" />
        </linearGradient>
        <linearGradient id={`${u}-nozs`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#0a0605" stopOpacity="0" /><stop offset="1" stopColor="#0a0605" stopOpacity=".7" /></linearGradient>
      </defs>
      <Plume u={u} W={FW} L={FL} jets={[]} mode={mode} />
      {nozzle && (
        <g>
          <path d={`M${-FW * 0.2} -27Q${-FW * 0.27} -11 ${-FW * 0.54} -4L${FW * 0.54} -4Q${FW * 0.27} -11 ${FW * 0.2} -27Z`} fill={`url(#${u}-noz)`} />
          <path d={`M${-FW * 0.2} -27Q${-FW * 0.27} -11 ${-FW * 0.54} -4L${FW * 0.54} -4Q${FW * 0.27} -11 ${FW * 0.2} -27Z`} fill={`url(#${u}-nozs)`} />
          <path d={`M${-FW * 0.2 + 1.2} -27Q${-FW * 0.27 + 1.4} -11 ${-FW * 0.54 + 2} -5`} stroke="#fff" strokeOpacity=".4" strokeWidth=".7" fill="none" />
          <rect x={-FW * 0.58} y="-5" width={FW * 1.16} height="5" rx="1.2" fill={`url(#${u}-noz)`} />
          <path d={`M${-FW * 0.58} 0H${FW * 0.58}`} stroke="#ffd9a0" strokeOpacity={mode === 'off' ? 0 : 0.8} strokeWidth="1.2" />
        </g>
      )}
    </svg>
  )
}
