// ui-core · IconButton — a machined key: a chamfered plate (same two cut corners as Button) with its own faces drawn in
// layers, so a hover backing, a rim and a focus ring all follow the chamfer. `label` is the accessible name (required);
// `badge` is a count or `true` for a dot.
import { forwardRef, useRef } from 'react'
import { sound } from '../fx/sound.js'
import { haptic } from '../fx/haptics.js'
import { cx, renderIcon, useMergedRef, usePress } from './Button.jsx'

const ICON_PX = { lg: 32, md: 24, sm: 20 }

export const IconButton = forwardRef(function IconButton(
  { icon, label, size = 'md', variant = 'ghost', badge, disabled = false, silent = false, as: As = 'button', className, onClick, type, children, ...rest },
  fwd,
) {
  const own = useRef(null)
  const ref = useMergedRef(own, fwd)
  usePress(own, disabled, variant === 'plate')
  const hasBadge = badge != null && badge !== false && badge !== 0
  const dot = badge === true
  const name = hasBadge && !dot ? `${label}, ${badge} new` : hasBadge ? `${label}, new` : label
  const isNative = As === 'button'
  return (
    <As
      ref={ref}
      className={cx('k-iconbtn', className)}
      data-v={variant}
      data-size={size}
      aria-label={name}
      title={label}
      {...(isNative ? { type: type || 'button', disabled: disabled || undefined } : { 'aria-disabled': disabled || undefined })}
      {...rest}
      onClick={(e) => {
        if (disabled) { e.preventDefault(); return }
        if (!silent) { sound.play('tap'); haptic.tap() }
        onClick?.(e)
      }}
    >
      <span className="k-iconbtn__ring" aria-hidden="true" />
      <span className="k-iconbtn__face" aria-hidden="true"><span className="k-iconbtn__fill" /><span className="k-iconbtn__spot" /></span>
      {renderIcon(icon, ICON_PX[size] || 24, { className: 'k-iconbtn__icon' })}
      {children}
      {hasBadge && (
        <span className="k-iconbtn__badge" data-dot={dot ? '' : undefined} aria-hidden="true">{dot ? null : badge}</span>
      )}
    </As>
  )
})

export default IconButton
