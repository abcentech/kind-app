// ui-core · Row / RowGroup — the iOS inset-grouped list, in carbon. A Row is a <button> when it has `onClick`;
// for a Switch row use as="label" so the whole row toggles the switch.
import { forwardRef, useId, useRef } from 'react'
import { sound } from '../fx/sound.js'
import { haptic } from '../fx/haptics.js'
import { Icon } from '../icons.jsx'
import { cx, renderIcon, useMergedRef, usePress } from './Button.jsx'

export const Row = forwardRef(function Row(
  { icon, title, sub, value, trailing, onClick, chevron = false, tone = 'neutral', disabled = false, silent = false, as, className, children, ...rest },
  fwd,
) {
  const own = useRef(null)
  const ref = useMergedRef(own, fwd)
  const clickable = typeof onClick === 'function'
  const interactive = clickable || as === 'a' || as === 'label'
  const El = as || (clickable ? 'button' : 'div')
  usePress(own, !interactive || disabled || El === 'label')
  const { onClick: restClick, ...restProps } = rest
  return (
    <El
      ref={ref}
      className={cx('k-row', className)}
      data-tone={tone}
      data-i={interactive ? '' : undefined}
      data-ic={icon ? '' : undefined}
      {...(El === 'button' ? { type: 'button', disabled: disabled || undefined } : { 'aria-disabled': disabled || undefined })}
      {...restProps}
      onClick={clickable ? (e) => { if (!silent) { sound.play('tap'); haptic.select() } onClick(e) } : restClick}
    >
      {icon ? <span className="k-row__icon" aria-hidden="true">{renderIcon(icon, 20)}</span> : null}
      <span className="k-row__body">
        <span className="k-row__title">{title}</span>
        {sub ? <span className="k-row__sub">{sub}</span> : null}
        {children}
      </span>
      {value != null && value !== false ? <span className="k-row__value">{value}</span> : null}
      {trailing ? <span className="k-row__trail">{trailing}</span> : null}
      {chevron ? <Icon name="chevronRight" size={16} className="k-row__chev" /> : null}
    </El>
  )
})

export function RowGroup({ title, footer, children, className, ...rest }) {
  const id = useId()
  return (
    <div className={cx('k-rowgroup', className)} role="group" aria-labelledby={title ? id : undefined} {...rest}>
      {title ? <div className="k-rowgroup__title" id={id}>{title}</div> : null}
      <div className="k-rowgroup__list">{children}</div>
      {footer ? <div className="k-rowgroup__foot">{footer}</div> : null}
    </div>
  )
}

export default Row
