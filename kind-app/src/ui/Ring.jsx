// Ring / Rings — concentric activity rings.
// The fill is an angular gradient built from 60 coloured arc segments (SVG has no conic gradient) revealed by one
// animated dash mask, so the stroke has round caps at both ends, a glowing head that rides the tip, and a gradient that
// brightens along the way round. A ring that CLOSES (crosses 1 while mounted) pops, throws a one-shot sparkle burst,
// and fires haptic.success() + sound.play('ring'). Mounting already-closed does not celebrate (opt in with `celebrate`).
import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '../icons.jsx'
import { haptic } from '../fx/haptics.js'
import { sound } from '../fx/sound.js'
import { isLite, readEase, readMs, tween } from './Counter.jsx'

const SEGS = 60
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const f2 = (n) => +n.toFixed(2)
const arc = (cx, cy, r, a1, a2) => {
  const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)]
  const [x1, y1] = p(a1), [x2, y2] = p(a2)
  return `M${f2(x1)} ${f2(y1)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(x2)} ${f2(y2)}`
}
// Local hue of the gradient at progress f (same stops the 60 segments use), and a lit tint of it for the leading cap:
// the head must belong to the stroke it ends, not sit on it as a pale sticker.
const segColor = (f) => {
  const t = f < 0.5 ? f * 2 : (f - 0.5) * 2
  return f < 0.5
    ? `color-mix(in oklab, var(--k-c1) ${f2((1 - t) * 100)}%, var(--k-c2))`
    : `color-mix(in oklab, var(--k-c2) ${f2((1 - t) * 100)}%, var(--k-c3))`
}

function RingArc({ uid, index, cx, cy, r, stroke, tone, value, animate, delay, glow, celebrate, onClosed }) {
  const refs = useRef({ mask: null, cap: null, head: null, bloom: null, cur: animate ? 0 : value, group: null })
  const prev = useRef(celebrate ? 0 : value)
  const target = clamp(value, 0, 1)
  const maskId = `${uid}-m${index}`, segsId = `${uid}-s${index}`

  const apply = (v) => {
    const R = refs.current
    if (!R.mask) return
    R.cur = v
    const vc = clamp(v, 0, 1)
    R.mask.style.strokeDasharray = `${vc * 100} 100`
    R.mask.style.visibility = vc < 0.003 ? 'hidden' : 'visible'
    const rot = `rotate(${vc * 360}deg)`
    R.cap.style.transform = rot
    R.cap.style.visibility = vc < 0.003 ? 'hidden' : 'visible'
    if (vc < 0.999) R.cap.removeAttribute('data-over'); else R.cap.setAttribute('data-over', '')   // closed: the head casts a shadow on the tail
    const here = segColor(vc)
    R.head.style.fill = `color-mix(in oklab, ${here} 88%, var(--ink))`
    if (R.bloom) R.bloom.style.fill = `color-mix(in oklab, ${here} 70%, transparent)`
  }

  useEffect(() => {
    const R = refs.current
    const closedNow = target >= 1 && prev.current < 1
    prev.current = target
    const ceremony = () => {
      if (!closedNow) return
      haptic.success()
      sound.play('ring', { step: Math.min(index, 2) })           // each ring closes a rung higher up the scale
      if (R.group) { R.group.removeAttribute('data-pop'); void R.group.getBoundingClientRect(); R.group.setAttribute('data-pop', '') }
      onClosed(index)
    }
    if (isLite() || !animate) { apply(target); ceremony(); return undefined }
    const t = tween({
      from: R.cur, to: target, ms: readMs('--t-slower'), ease: readEase('--ease-out'), delay, onUpdate: apply, onDone: ceremony,
    })
    return () => t.cancel()
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps

  const segs = []
  for (let i = 0; i < SEGS; i++) {
    const a1 = -90 + (360 * i) / SEGS - 0.7, a2 = -90 + (360 * (i + 1)) / SEGS + 0.7
    segs.push(<path key={i} d={arc(cx, cy, r, a1, a2)} fill="none" strokeWidth={stroke + 2} style={{ stroke: segColor((i + 0.5) / SEGS) }} />)
  }

  return (
    <g
      className="k-ring-arc" data-tone={tone} ref={(el) => { refs.current.group = el }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    >
      <defs>
        <g id={segsId}>{segs}</g>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={cx * 2} height={cy * 2}>
          <circle
            ref={(el) => { refs.current.mask = el }} cx={cx} cy={cy} r={r} pathLength="100" fill="none" stroke="white"
            strokeWidth={stroke} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
            style={{ strokeDasharray: '0 100', visibility: 'hidden' }}
          />
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={stroke} className="k-ring-track" />
      <g mask={`url(#${maskId})`}>
        {glow && <g className="k-ring-glow" style={{ filter: `blur(${f2(stroke * 0.42)}px)` }}><use href={`#${segsId}`} /></g>}
        <use href={`#${segsId}`} />
        {/* the mask's round start cap pokes backwards into the gradient's wrap-around (bright) end: cover it in the start colour */}
        <circle cx={cx} cy={cy - r} r={stroke / 2 + 0.5} className="k-ring-start" />
      </g>
      <g ref={(el) => { refs.current.cap = el }} className="k-ring-cap" style={{ transformOrigin: `${cx}px ${cy}px`, visibility: 'hidden' }}>
        {glow && <circle ref={(el) => { refs.current.bloom = el }} cx={cx} cy={cy - r} r={stroke * 0.72} className="k-ring-bloom" style={{ filter: `blur(${f2(stroke * 0.36)}px)` }} />}
        <circle ref={(el) => { refs.current.head = el }} cx={cx} cy={cy - r} r={stroke / 2} className="k-ring-head" />
      </g>
    </g>
  )
}

// The one-shot sparkle: stars and sparks thrown outward from the ring's 12 o'clock.
const SPARKS = Array.from({ length: 12 }, (_, i) => ({
  a: -90 + (i / 11 - 0.5) * 230, d: 0.9 + ((i * 37) % 10) / 10, star: i % 3 !== 1, s: 0.7 + ((i * 53) % 7) / 10,
}))

function RingSet({
  rings, size, stroke, gap, animate = true, glow = true, celebrate = false, stagger = true, onComplete,
  label, children, className = '', style, ...rest
}) {
  const uid = 'r' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const [bursts, setBursts] = useState([])
  const cx = size / 2, cy = size / 2
  const step = stroke + gap
  const r0 = (size - stroke) / 2

  const closed = (i) => {
    const key = Math.random().toString(36).slice(2)
    setBursts((b) => [...b, { key, i }])
    onComplete && onComplete(rings[i].id)
    setTimeout(() => setBursts((b) => b.filter((x) => x.key !== key)), readMs('--t-slower') + 200)
  }

  return (
    <div
      className={'k-rings ' + className} style={{ '--k-size': size + 'px', '--k-stroke': stroke + 'px', width: size, height: size, ...style }}
      role="group" aria-label={label || 'Progress rings'} {...rest}
    >
      <svg className="k-rings-svg" viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        {rings.map((rg, i) => (
          <RingArc
            key={rg.id ?? i} uid={uid} index={i} cx={cx} cy={cy} r={r0 - i * step} stroke={stroke} tone={rg.tone || 'ignite'}
            value={rg.value} animate={animate} delay={stagger ? i * readMs('--t-fast', 140) : 0} glow={glow} celebrate={celebrate}
            onClosed={closed}
          />
        ))}
      </svg>
      <div className="k-ring-icons" aria-hidden="true">
        {rings.map((rg, i) => rg.icon ? (
          <span key={rg.id ?? i} className="k-ring-icon" data-tone={rg.tone || 'ignite'} style={{ left: cx, top: cy - (r0 - i * step), '--k-ico': stroke * 0.6 + 'px' }}>
            {typeof rg.icon === 'string' ? <Icon name={rg.icon} size={16} weight="solid" /> : rg.icon}
          </span>
        ) : null)}
      </div>
      <div className="k-ring-bursts" aria-hidden="true">
        {bursts.map((b) => {
          const r = r0 - b.i * step
          return (
            <span key={b.key} className="k-ring-burst" data-tone={rings[b.i].tone || 'ignite'} style={{ left: cx, top: cy - r, '--k-s': stroke + 'px' }}>
              {SPARKS.map((s, k) => (
                <i key={k} className={s.star ? 'k-ring-star' : 'k-ring-spark'} style={{ '--a': s.a + 'deg', '--d': s.d, '--sz': s.s, '--k': k }} />
              ))}
            </span>
          )
        })}
      </div>
      {children != null && <div className="k-ring-center">{children}</div>}
      <ul className="k-ring-sr">
        {rings.map((rg, i) => <li key={rg.id ?? i}>{(rg.label || rg.id || `Ring ${i + 1}`) + ': ' + Math.round(clamp(rg.value, 0, 1) * 100) + '%'}</li>)}
      </ul>
    </div>
  )
}

/** Ring { value:0..1 size stroke tone icon glow animate label children } — one ring. */
export function Ring({ value = 0, size = 96, stroke, tone = 'ignite', icon, glow = true, animate = true, label, celebrate, onComplete, children, ...rest }) {
  const sw = stroke ?? Math.max(6, Math.round(size * 0.12))
  return (
    <RingSet
      rings={[{ id: 'ring', value, tone, icon, label }]} size={size} stroke={sw} gap={0} glow={glow} animate={animate}
      celebrate={celebrate} onComplete={onComplete} label={label} {...rest}
    >
      {children}
    </RingSet>
  )
}

/** Rings { rings:[{id,value,tone,icon,label}] size stroke gap children onComplete } — concentric, outermost first. */
export function Rings({ rings = [], size = 160, stroke, gap, glow = true, animate = true, celebrate, onComplete, label, children, ...rest }) {
  const sw = stroke ?? Math.max(7, Math.round(size * 0.105))
  const gp = gap ?? Math.max(2, Math.round(sw * 0.18))
  return (
    <RingSet rings={rings} size={size} stroke={sw} gap={gp} glow={glow} animate={animate} celebrate={celebrate} onComplete={onComplete} label={label} {...rest}>
      {children}
    </RingSet>
  )
}

export default Rings
