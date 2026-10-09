// ui-core · Chip — a pressable filter/toggle pill with a status LED. Without `onClick` it renders as a static readout.
import { forwardRef, useRef } from 'react'
import { sound } from '../fx/sound.js'
import { haptic } from '../fx/haptics.js'
import { cx, renderIcon, stageVars, useMergedRef, usePress } from './Button.jsx'

export const Chip = forwardRef(function Chip(
  { selected = false, icon, tone = 'neutral', stage, onClick, disabled = false, silent = false, className, style, children, ...rest },
  fwd,
) {
  const own = useRef(null)
  const ref = useMergedRef(own, fwd)
  const interactive = typeof onClick === 'function'
  usePress(own, !interactive || disabled)
  const El = interactive ? 'button' : 'span'
  return (
    <El
      ref={ref}
      className={cx('k-chip', className)}
      data-tone={stage ? 'stage' : tone}
      data-on={selected ? '' : undefined}
      data-i={interactive ? '' : undefined}
      style={stageVars(stage, style)}
      {...(interactive ? { type: 'button', 'aria-pressed': selected, disabled: disabled || undefined } : {})}
      {...rest}
      onClick={interactive ? (e) => { if (!silent) { sound.play(selected ? 'deselect' : 'select'); haptic.select() } onClick(e) } : undefined}
    >
      {icon ? renderIcon(icon, 16, { className: 'k-chip__icon' }) : <i className="k-chip__led" aria-hidden="true" />}
      <span className="k-chip__text">{children}</span>
    </El>
  )
})

export default Chip
