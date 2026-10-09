// ui-core · Kbd — a keycap (answer plates use 1–4). `lit` arms it with the telemetry colour.
import { cx } from './Button.jsx'

export function Kbd({ lit = false, className, children, ...rest }) {
  return (
    <kbd className={cx('k-kbd', className)} data-lit={lit ? '' : undefined} {...rest}>
      {children}
    </kbd>
  )
}

export default Kbd
