// ui-core · Slider — a fader: recessed groove, lit fill, a titanium cap, and a gauge scale of ticks underneath.
// Custom pointer logic (capture + touch-action: pan-y) so a horizontal drag never fights the page scroll, and
// role=slider on the cap so the keyboard and screen readers get the full APG pattern. onChange receives the number.
import { forwardRef, useMemo, useRef, useState } from 'react'
import { sound } from '../fx/sound.js'
import { haptic } from '../fx/haptics.js'
import { cx, useMergedRef } from './Button.jsx'

export const Slider = forwardRef(function Slider(
  { min = 0, max = 100, step = 1, value, onChange, label, format, disabled = false, ticks = true, showValue = true, tone = 'tele', silent = false, className, style, ...rest },
  fwd,
) {
  const rail = useRef(null)
  const cap = useRef(null)
  const ref = useMergedRef(cap, fwd)
  const last = useRef(0)
  const [drag, setDrag] = useState(false)

  const span = max - min
  const clamp = (v) => Math.min(max, Math.max(min, v))
  const snap = (v) => clamp(+(Math.round((v - min) / step) * step + min).toFixed(6))
  const cur = clamp(value ?? min)
  const f = span > 0 ? (cur - min) / span : 0
  const show = format ? format(cur) : String(cur)

  const emit = (v) => {
    if (v === cur) return
    const t = performance.now()
    if (!silent && t - last.current > 55) { last.current = t; sound.play('select'); haptic.select() }
    onChange?.(v)
  }
  const at = (x) => {
    const r = rail.current.getBoundingClientRect()
    return snap(min + ((x - r.left) / r.width) * span)
  }

  const onPointerDown = (e) => {
    if (disabled || e.button > 0) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag(true)
    emit(at(e.clientX))
    cap.current?.focus({ preventScroll: true })
  }
  const onPointerMove = (e) => { if (drag) emit(at(e.clientX)) }
  const end = () => setDrag(false)

  const onKeyDown = (e) => {
    const big = Math.max(step, snap(min + span / 10) - min)
    const d = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: big, PageDown: -big }[e.key]
    let next = null
    if (d != null) next = snap(cur + d)
    else if (e.key === 'Home') next = min
    else if (e.key === 'End') next = max
    if (next == null) return
    e.preventDefault()
    emit(next)
  }

  const scale = useMemo(() => {
    if (!ticks || span <= 0) return []
    const n = Math.round(span / step)
    const intervals = n <= 24 ? n : 20
    return Array.from({ length: intervals + 1 }, (_, i) => (i === 0 || i === intervals || (i * 4) % intervals === 0 ? 2 : 1))
  }, [ticks, span, step])

  return (
    <div
      className={cx('k-slider', className)}
      data-tone={tone}
      data-drag={drag ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      style={{ '--f': f, ...style }}
      {...rest}
    >
      {(label || showValue) && (
        <div className="k-slider__head">
          <span className="k-slider__label">{label}</span>
          {showValue && <output className="k-slider__out">{show}</output>}
        </div>
      )}
      <div className="k-slider__ctl" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={end} onPointerCancel={end}>
        <div className="k-slider__rail" ref={rail}>
          <span className="k-slider__groove"><span className="k-slider__fill" /></span>
          {scale.length > 0 && (
            <span className="k-slider__ticks" aria-hidden="true">
              {scale.map((w, i) => <i key={i} data-major={w === 2 ? '' : undefined} data-on={i / (scale.length - 1) <= f + 1e-6 ? '' : undefined} />)}
            </span>
          )}
          <span className="k-slider__pos">
            <span
              ref={ref}
              className="k-slider__cap"
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={label}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={cur}
              aria-valuetext={show}
              aria-orientation="horizontal"
              aria-disabled={disabled || undefined}
              onKeyDown={onKeyDown}
            >
              <i />
            </span>
          </span>
        </div>
      </div>
    </div>
  )
})

export default Slider
