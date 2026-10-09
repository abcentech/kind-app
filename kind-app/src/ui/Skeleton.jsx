// ui-core · Skeleton — a placeholder slab with a slow sheen sweep (static in lite). Decorative: hidden from AT;
// put aria-busy on the region that is loading. `w` / `h` / `r` take a number (px) or any CSS length; r="full" = pill.
import { cx } from './Button.jsx'

const len = (v) => (typeof v === 'number' ? `${v}px` : v)

export function Skeleton({ w, h, r, className, style, ...rest }) {
  return (
    <span
      className={cx('k-skel', className)}
      aria-hidden="true"
      style={{ ...(w != null && { '--w': len(w) }), ...(h != null && { '--h': len(h) }), ...(r != null && { '--r': r === 'full' ? 'var(--r-full)' : len(r) }), ...style }}
      {...rest}
    />
  )
}

export default Skeleton
