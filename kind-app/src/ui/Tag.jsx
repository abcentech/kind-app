// ui-core · Tag — a chamfered status readout with a tiny LED. Not interactive; Chip is the pressable cousin.
import { cx, renderIcon, stageVars } from './Button.jsx'

export function Tag({ tone = 'neutral', icon, led = true, stage, className, style, children, ...rest }) {
  const t = stage ? 'stage' : tone
  return (
    <span className={cx('k-tag', className)} data-tone={t} style={stageVars(stage, style)} {...rest}>
      <span className="k-tag__face" aria-hidden="true" />
      {icon ? renderIcon(icon, 16, { className: 'k-tag__icon' }) : led ? <i className="k-tag__led" aria-hidden="true" /> : null}
      <span className="k-tag__text">{children}</span>
    </span>
  )
}

export default Tag
