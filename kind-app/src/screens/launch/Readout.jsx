// learn-launch · the live T-minus. Mono, tabular, one text node per segment: the digits change, the box never does.
// Owns its own 1 Hz clock so the bar around it does not re-render every second. Decorative to assistive tech (the region label
// carries the spoken duration); calls onZero once when the target passes so the bar can flip to its next state.
import { useEffect, useRef } from 'react'
import { useClock } from '../../store.js'
import { fmtCountdown } from '../../lib.js'

export default function Readout({ target, size = 'sm', onZero }) {
  const t = useClock(1000)
  const ms = Math.max(0, target - t.getTime())
  const fired = useRef(null)
  useEffect(() => {
    if (ms > 0 || fired.current === target) return
    fired.current = target
    onZero?.()
  }, [ms, target, onZero])
  const txt = fmtCountdown(ms, { prefix: 'T-' })
  const m = /^T-(\d\d):(\d\d):(\d\d)$/.exec(txt)
  return (
    <span className="launch-readout" data-size={size} aria-hidden="true">
      {m ? (
        <>
          <span className="launch-readout__p">T-</span>{m[1]}<i>:</i>{m[2]}<i>:</i>{m[3]}
        </>
      ) : txt}
    </span>
  )
}
