// ui-core · Panel — a machined surface. Its silhouette (rim + fill) is drawn by pseudo-layers, so the host is never
// clipped: the drop-shadow, focus ring and any overflowing child (a badge, a glow) still work on chamfered panels.
// Pass `onClick` (or as="a" / as="button") and it becomes a pressable card with the shared press / hover / focus recipe.
import { forwardRef, useRef } from 'react'
import { sound } from '../fx/sound.js'
import { haptic } from '../fx/haptics.js'
import { cx, stageVars, useMergedRef, usePress } from './Button.jsx'

export const Panel = forwardRef(function Panel(
  { tone = 'plate', cut = false, padded = false, pad, stage, texture, as, onClick, disabled = false, silent = false, className, style, children, ...rest },
  fwd,
) {
  const own = useRef(null)
  const ref = useMergedRef(own, fwd)
  const El = as || (typeof onClick === 'function' ? 'button' : 'div')
  const interactive = typeof onClick === 'function' || El === 'button' || El === 'a'
  usePress(own, !interactive || disabled)
  const p = pad || (padded ? 'md' : undefined)
  return (
    <El
      ref={ref}
      className={cx('k-panel', className)}
      data-tone={stage && tone === 'plate' ? 'stage' : tone}
      data-cut={cut === 'sm' ? 'sm' : cut ? 'md' : undefined}
      data-pad={p}
      data-tx={texture}
      data-i={interactive ? '' : undefined}
      style={stageVars(stage, style)}
      {...(El === 'button' ? { type: 'button', disabled: disabled || undefined } : interactive ? { 'aria-disabled': disabled || undefined } : {})}
      {...rest}
      onClick={typeof onClick === 'function' ? (e) => { if (disabled) { e.preventDefault(); return } if (!silent) { sound.play('tap'); haptic.select() } onClick(e) } : undefined}
    >
      {children}
      {interactive && cut ? <span className="k-panel__ring" aria-hidden="true" /> : null}
    </El>
  )
})

export default Panel
