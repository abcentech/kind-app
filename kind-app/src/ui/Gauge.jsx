// Gauge — a radial instrument, not a progress bar.
// 270° sweep, 60-division titanium bezel (a major mark every 5), a recessed groove with a gradient arc that lights up
// along its length, a bladed needle with a jewelled hub and counterweight, Barlow numerals, and a readout in the gap
// at the bottom. `sweep` plays the start-up sweep: needle 0 → redline → settle on the value (--ease-io).
//
// Everything that moves (needle, arc mask, lit ticks, readout text) is driven imperatively on refs inside one tween,
// so a sweep is ~60 style writes a second and no React renders. JSX gives those nodes constant initial values, which
// means React never rewrites what the tween has set.
import { useEffect, useId, useMemo, useRef } from 'react'
import { isLite, readEase, readMs, tween } from './Counter.jsx'

const C = 100
const A0 = 135                    // 7:30 on the dial; SVG angles run clockwise from +x
const SPAN = 270
const R_ARC = 70, W_ARC = 7.5
const R_TICK = 89, MAJ = 10, MIN = 5.5
const R_NUM = 54
const N_DIV = 60
const SEGS = 45
const rad = (d) => (d * Math.PI) / 180
const pt = (r, deg) => [C + r * Math.cos(rad(deg)), C + r * Math.sin(rad(deg))]
const f2 = (n) => +n.toFixed(2)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const arc = (r, a1, a2) => {
  const [x1, y1] = pt(r, a1), [x2, y2] = pt(r, a2)
  return `M${f2(x1)} ${f2(y1)}A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${f2(x2)} ${f2(y2)}`
}
const ARC_FULL = arc(R_ARC, A0, A0 + SPAN - 0.001)
const defaultFormat = (n) => Math.round(n).toLocaleString('en-US')

// Dial numerals only where the scale is honest: whole-number steps landing on major marks. (The arc ends say min and max;
// labelling them too would collide with the readout in the gap.)
function scaleLabels(min, max) {
  const span = max - min
  for (const n of [5, 7, 4, 3, 2]) {
    const step = span / (n - 1)
    if (Math.abs(step - Math.round(step)) < 1e-6) {
      return Array.from({ length: n }, (_, k) => ({ f: k / (n - 1), text: String(Math.round(min + step * k)) }))
    }
  }
  return [{ f: 0, text: String(min) }, { f: 1, text: String(max) }]
}

const segColor = (f, red) => {
  if (red != null && f >= red) return 'var(--nogo)'
  const t = f < 0.5 ? f * 2 : (f - 0.5) * 2
  return f < 0.5
    ? `color-mix(in oklab, var(--k-c1) ${f2((1 - t) * 100)}%, var(--k-c2))`
    : `color-mix(in oklab, var(--k-c2) ${f2((1 - t) * 100)}%, var(--k-c3))`
}

/**
 * Gauge { value:0..1 min max label unit size ticks tone needle sweep }
 * extras: redline (0..1) · peak (0..1, a high-water mark etched across the groove) · display (override the readout) · format(n) · numerals · glow · animate · onSweepEnd
 * `sweep` may be a number: change it to replay the sweep.
 */
export function Gauge({
  value = 0, min = 0, max = 100, label, unit, size = 160, ticks = true, tone = 'ignite', needle = true,
  sweep = false, redline = null, peak = null, display, format = defaultFormat, numerals, glow = true, animate = true,
  onSweepEnd, className = '', style, ...rest
}) {
  const uid = 'g' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const compact = size < 128
  const showNumerals = numerals ?? (!compact && ticks)
  const target = clamp(value, 0, 1)

  const refs = useRef({ needle: null, shadow: null, mask: null, tip: null, val: null, ticks: [], lit: [], cur: 0 })
  const sweptFor = useRef(null)
  const latest = useRef({})
  latest.current = { min, max, display, format, redline, onSweepEnd }

  const geo = useMemo(() => {
    const t = []
    for (let i = 0; i <= N_DIV; i++) {
      const major = i % 5 === 0
      const ang = A0 + (SPAN * i) / N_DIV
      const [x1, y1] = pt(R_TICK, ang), [x2, y2] = pt(R_TICK - (major ? MAJ : MIN), ang)
      t.push({ i, major, x1: f2(x1), y1: f2(y1), x2: f2(x2), y2: f2(y2), f: i / N_DIV })
    }
    const segs = []
    for (let i = 0; i < SEGS; i++) {
      const f = (i + 0.5) / SEGS
      segs.push({ i, f, d: arc(R_ARC, A0 + (SPAN * i) / SEGS - 0.5, A0 + (SPAN * (i + 1)) / SEGS + 0.5) })
    }
    const nums = scaleLabels(min, max).slice(1, -1).map((l) => {
      const [x, y] = pt(R_NUM, A0 + SPAN * l.f)
      return { ...l, x: f2(x), y: f2(y) }
    })
    return { t, segs, nums }
  }, [min, max])

  // One place that writes every moving part. v: displayed fraction (the needle alone may overshoot a hair).
  const apply = (v) => {
    const r = refs.current
    if (!r.needle) return
    const vc = clamp(v, 0, 1)
    r.cur = v
    const ang = A0 + SPAN * clamp(v, -0.03, 1.03)
    r.needle.style.transform = `rotate(${ang}deg)`
    r.shadow.style.transform = `rotate(${ang}deg)`
    r.mask.style.strokeDashoffset = String(1 - vc)
    r.mask.style.visibility = vc < 0.004 ? 'hidden' : 'visible'
    r.tip.style.transform = `rotate(${SPAN * vc}deg)`
    r.tip.style.visibility = vc < 0.004 ? 'hidden' : 'visible'
    for (let i = 0; i <= N_DIV; i++) {
      const on = i / N_DIV <= vc + 1e-6
      if (r.lit[i] !== on) { r.lit[i] = on; const el = r.ticks[i]; if (el) { if (on) el.setAttribute('data-lit', ''); else el.removeAttribute('data-lit') } }
    }
    const L = latest.current
    if (r.val && L.display == null) r.val.textContent = L.format(L.min + vc * (L.max - L.min))
  }

  useEffect(() => {
    const lite = isLite()
    let t1 = null, t2 = null, timer = 0, finished = false
    if (sweep && !lite && sweptFor.current !== sweep) {
      sweptFor.current = sweep
      const T = readMs('--t-hero'), ease = readEase('--ease-io')
      apply(0)
      t1 = tween({
        from: 0, to: 1, ms: T * 0.56, ease, onUpdate: apply,
        onDone: () => {
          timer = setTimeout(() => {
            t2 = tween({ from: 1, to: target, ms: T * 0.5, ease, onUpdate: apply, onDone: () => { finished = true; latest.current.onSweepEnd && latest.current.onSweepEnd() } })
          }, T * 0.07)                                                  // a beat on the redline
        },
      })
    } else if (lite || !animate) {
      apply(target)
    } else {
      // an analogue needle has inertia: --spring-snap overshoots ~4% and settles
      t1 = tween({ from: refs.current.cur, to: target, ms: readMs('--spring-snap-ms'), ease: readEase('--spring-snap'), onUpdate: apply })
    }
    return () => {
      t1 && t1.cancel(); t2 && t2.cancel(); clearTimeout(timer)
      if (sweep && !finished) sweptFor.current = null                  // StrictMode / interrupted: let the sweep play again
    }
  }, [target, sweep, min, max]) // eslint-disable-line react-hooks/exhaustive-deps

  const ariaNow = Math.round(min + target * (max - min))
  const shownText = display != null ? display : format(min + 0 * (max - min))
  const id = (s) => `${uid}-${s}`

  return (
    <div
      className={'k-gauge ' + className} data-tone={tone} data-compact={compact || undefined} data-glow={glow || undefined}
      style={{ '--k-size': size + 'px', width: size, height: size, ...style }}
      role="meter" aria-label={label || 'Gauge'} aria-valuemin={min} aria-valuemax={max} aria-valuenow={ariaNow}
      aria-valuetext={unit ? `${ariaNow} ${unit}` : String(ariaNow)} {...rest}
    >
      <svg className="k-gauge-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={id('bz')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--ti-1)' }} /><stop offset=".34" style={{ stopColor: 'var(--ti-2)' }} />
            <stop offset=".62" style={{ stopColor: 'var(--ti-4)' }} /><stop offset="1" style={{ stopColor: 'var(--ti-2)' }} />
          </linearGradient>
          <radialGradient id={id('face')} cx=".5" cy=".38" r=".74">
            <stop offset="0" style={{ stopColor: 'var(--carbon-3)' }} /><stop offset=".62" style={{ stopColor: 'var(--carbon-1)' }} />
            <stop offset="1" style={{ stopColor: 'var(--void)' }} />
          </radialGradient>
          <radialGradient id={id('hub')} cx=".35" cy=".3" r=".85">
            <stop offset="0" style={{ stopColor: 'var(--ti-1)' }} /><stop offset=".5" style={{ stopColor: 'var(--ti-3)' }} />
            <stop offset="1" style={{ stopColor: 'var(--ti-4)' }} />
          </radialGradient>
          <linearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--ink)', stopOpacity: 0.1 }} /><stop offset="1" style={{ stopColor: 'var(--ink)', stopOpacity: 0 }} />
          </linearGradient>
          <clipPath id={id('clip')}><circle cx={C} cy={C} r="92" /></clipPath>
          <filter id={id('blur')} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.6" /></filter>
          <mask id={id('m')} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
            <path
              ref={(el) => { refs.current.mask = el }} d={ARC_FULL} pathLength="1" fill="none" stroke="white" strokeWidth={W_ARC}
              strokeLinecap="round" strokeDasharray="1 1" style={{ strokeDashoffset: 1, visibility: 'hidden' }}
            />
          </mask>
          <g id={id('segs')}>
            {geo.segs.map((s) => (
              <path key={s.i} d={s.d} fill="none" strokeWidth={W_ARC + 3} style={{ stroke: segColor(s.f, redline) }} />
            ))}
          </g>
        </defs>

        {/* bezel: titanium ring, catch-light on the outside, shadow lip on the inside */}
        <circle cx={C} cy={C} r="96" fill="none" stroke={`url(#${id('bz')})`} strokeWidth="5.4" />
        <circle cx={C} cy={C} r="98.6" fill="none" className="k-gauge-rim" />
        <circle cx={C} cy={C} r="93.3" fill="none" className="k-gauge-lip" />
        <circle cx={C} cy={C} r="93" fill={`url(#${id('face')})`} />
        <g className="k-gauge-turned" aria-hidden="true">
          {[24, 31, 38, 45].map((r) => <circle key={r} cx={C} cy={C} r={r} fill="none" />)}
        </g>

        {ticks && (
          <g className="k-gauge-ticks">
            {geo.t.map((k) => (
              <line
                key={k.i} ref={(el) => { refs.current.ticks[k.i] = el }} x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2}
                className="k-gauge-tick" data-major={k.major || undefined}
                data-red={redline != null && k.f >= redline ? '' : undefined}
              />
            ))}
          </g>
        )}

        {/* the groove and the lit arc */}
        <path d={ARC_FULL} className="k-gauge-groove" strokeWidth={W_ARC + 2.4} fill="none" strokeLinecap="round" />
        <path d={ARC_FULL} className="k-gauge-track" strokeWidth={W_ARC} fill="none" strokeLinecap="round" />
        {redline != null && <path d={arc(R_ARC, A0 + SPAN * redline, A0 + SPAN - 0.001)} className="k-gauge-redzone" strokeWidth={W_ARC} fill="none" />}
        <g mask={`url(#${id('m')})`}>
          <g className="k-gauge-glow" filter={`url(#${id('blur')})`}><use href={`#${id('segs')}`} /></g>
          <use href={`#${id('segs')}`} />
        </g>
        <g ref={(el) => { refs.current.tip = el }} className="k-gauge-tip" style={{ transformOrigin: `${C}px ${C}px`, visibility: 'hidden' }}>
          <circle cx={pt(R_ARC, A0)[0]} cy={pt(R_ARC, A0)[1]} r={W_ARC * 0.5 + 1.2} className="k-gauge-tip-halo" />
          <circle cx={pt(R_ARC, A0)[0]} cy={pt(R_ARC, A0)[1]} r={W_ARC * 0.36} className="k-gauge-tip-dot" />
        </g>

        {showNumerals && (
          <g className="k-gauge-nums">
            {geo.nums.map((n) => <text key={n.f} x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central" className="k-gauge-num">{n.text}</text>)}
          </g>
        )}

        <ellipse cx="74" cy="46" rx="64" ry="30" transform="rotate(-24 74 46)" fill={`url(#${id('gloss')})`} clipPath={`url(#${id('clip')})`} />

        {peak != null && (() => {
          const a = A0 + SPAN * clamp(peak, 0, 1)
          const [x1, y1] = pt(R_ARC - W_ARC * 0.5 - 3.4, a), [x2, y2] = pt(R_ARC + W_ARC * 0.5 + 3.4, a)
          return <line x1={f2(x1)} y1={f2(y1)} x2={f2(x2)} y2={f2(y2)} className="k-gauge-peak" strokeLinecap="round" />
        })()}

        {needle && (
          <>
            <g transform="translate(1.6 3.2)" className="k-gauge-shadow">
              <g ref={(el) => { refs.current.shadow = el }} style={{ transformOrigin: `${C}px ${C}px`, transform: `rotate(${A0}deg)` }}>
                <g transform={`translate(${C} ${C})`}><NeedleShape /></g>
              </g>
            </g>
            <g ref={(el) => { refs.current.needle = el }} className="k-gauge-needle" style={{ transformOrigin: `${C}px ${C}px`, transform: `rotate(${A0}deg)` }}>
              <g transform={`translate(${C} ${C})`}>
                <NeedleShape lit />
              </g>
            </g>
            <circle cx={C} cy={C} r="12.4" className="k-gauge-hub-shadow" />
            <circle cx={C} cy={C} r="11" fill={`url(#${id('hub')})`} className="k-gauge-hub" />
            <circle cx={C} cy={C} r="7.4" className="k-gauge-hub-cap" />
            <circle cx={C} cy={C} r="2.7" className="k-gauge-jewel" />
          </>
        )}
      </svg>

      <div className="k-gauge-read">
        <span className="k-gauge-line">
          <span className="k-gauge-val" ref={(el) => { refs.current.val = el }}>{shownText}</span>
          {unit && !compact && <span className="k-gauge-unit">{unit}</span>}
        </span>
        {label && !compact && <span className="k-gauge-label">{label}</span>}
      </div>
    </div>
  )
}

// Drawn pointing +x from the hub. Lit half / shaded half make the blade read as a facet, not a flat triangle.
function NeedleShape({ lit }) {
  return lit ? (
    <>
      <path d="M88 0 L10 -2.5 L10 2.5 Z" className="k-gauge-halo" strokeLinejoin="round" />
      <path d="M-5 -3.4 L-17 -4.7 A4.7 4.7 0 0 0 -17 4.7 L-5 3.4 Z" className="k-gauge-weight" />
      <path d="M-5 -3.4 L-17 -4.7 A4.7 4.7 0 0 0 -17.4 -3.6 L-5 -.2Z" className="k-gauge-weight-hi" />
      <path d="M88 0 L10 -2.5 L10 0 Z" className="k-gauge-blade-hi" />
      <path d="M88 0 L10 0 L10 2.5 Z" className="k-gauge-blade-lo" />
    </>
  ) : (
    <>
      <path d="M-5 -3.4 L-17 -4.7 A4.7 4.7 0 0 0 -17 4.7 L-5 3.4 Z" />
      <path d="M88 0 L10 -2.5 L10 2.5 Z" />
    </>
  )
}

export default Gauge
