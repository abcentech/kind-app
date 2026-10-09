// ui-core · Progress — an instrument bar: recessed graduated track, a fill that wipes with transform only, and a
// leading cap that glows. `label` is the accessible name (render a visible caption yourself). It fills in on mount
// (`animate={false}` to appear at rest) and a highlight runs along the fill whenever the value rises. A full bar stops
// glowing at its tip and lights its whole length instead. Pass `indeterminate` for a seeking bar.
import { useEffect, useRef, useState } from 'react'
import { cx, stageVars } from './Button.jsx'

export function Progress({ value = 0, tone = 'ignite', height = 8, glow = true, label = 'Progress', stage, indeterminate = false, animate = true, className, style, ...rest }) {
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
  const [shown, setShown] = useState(animate ? 0 : v)
  const [surge, setSurge] = useState(0)
  const was = useRef(animate ? 0 : v)
  useEffect(() => {
    if (!animate) { setShown(v); was.current = v; return undefined }
    let b = 0
    const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setShown(v)) })
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b) }
  }, [v, animate])
  useEffect(() => {
    if (shown > was.current + 0.004) setSurge((k) => k + 1)   // two alternating animation names restart the run each time
    was.current = shown
  }, [shown])
  const h = typeof height === 'number' ? `${height}px` : height
  return (
    <div
      className={cx('k-prog', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(v * 100)}
      data-tone={stage ? 'stage' : tone}
      data-glow={glow ? '' : undefined}
      data-ind={indeterminate ? '' : undefined}
      data-full={!indeterminate && v >= 1 ? '' : undefined}
      data-surge={surge ? (surge % 2 ? 'a' : 'b') : undefined}
      data-motion={indeterminate ? 'essential' : undefined}
      style={{ '--v': indeterminate ? 0 : shown, '--k-h': h, ...stageVars(stage, style) }}
      {...rest}
    >
      <span className="k-prog__track"><span className="k-prog__fill" /></span>
      {glow && !indeterminate ? <span className="k-prog__lead" aria-hidden="true"><i /></span> : null}
    </div>
  )
}

export default Progress
