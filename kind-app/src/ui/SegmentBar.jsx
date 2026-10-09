// ui-core · SegmentBar — the lesson ticker. `done` segments are lit, `current` (default: the next one) breathes.
// On mount the lit segments wipe in one after another (a resumed lesson "spools up"); afterwards each change is a single
// wipe, and a segment that has just been completed flares once — the tick of a cockpit annunciator.
import { useEffect, useRef, useState } from 'react'
import { cx, stageVars } from './Button.jsx'

export function SegmentBar({ total = 1, done = 0, current, tone = 'tele', stage, label = 'Lesson progress', className, style, ...rest }) {
  const n = Math.max(1, Math.floor(total))
  const d = Math.min(n, Math.max(0, Math.floor(done)))
  const c = current == null ? d : current
  const [ready, setReady] = useState(false)
  const [boot, setBoot] = useState(true)
  const [pop, setPop] = useState(null)               // { from, to } — the segments completed by the latest change
  const lit = ready ? d : 0
  const seen = useRef(0)
  useEffect(() => {
    let b = 0
    const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setReady(true)) })
    const t = setTimeout(() => setBoot(false), 600 + n * 40)
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); clearTimeout(t) }
  }, [n])
  useEffect(() => {
    const from = seen.current
    seen.current = lit
    if (boot || lit <= from) { setPop(null); return undefined }
    setPop({ from, to: lit })
    const t = setTimeout(() => setPop(null), 900)
    return () => clearTimeout(t)
  }, [lit, boot])
  return (
    <div
      className={cx('k-ticker', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={n}
      aria-valuenow={d}
      aria-valuetext={`${d} of ${n}`}
      data-tone={stage ? 'stage' : tone}
      data-boot={boot ? '' : undefined}
      style={stageVars(stage, style)}
      {...rest}
    >
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="k-ticker__seg"
          data-s={i < lit ? 'done' : i === c ? 'current' : 'todo'}
          data-pop={pop && i >= pop.from && i < pop.to ? '' : undefined}
          style={{ '--i': i }}
        >
          <b><i /></b>
        </span>
      ))}
    </div>
  )
}

export default SegmentBar
