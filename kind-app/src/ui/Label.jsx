// ui-core · Label — the uppercase Barlow eyebrow, or the mono telemetry tag when `mono`.
import { cx } from './Button.jsx'

export function Label({ as: El = 'span', tone = 'neutral', size = 'sm', mono = false, dot = false, stage, className, style, children, ...rest }) {
  const vars = stage ? { '--stage': `var(--stage-${stage})`, '--stage-glow': `var(--stage-${stage}-glow)`, ...style } : style
  return (
    <El className={cx('k-label', className)} data-tone={stage ? 'stage' : tone} data-size={size} data-mono={mono ? '' : undefined} style={vars} {...rest}>
      {dot && <i className="k-label__led" aria-hidden="true" />}
      {children}
    </El>
  )
}

export default Label
