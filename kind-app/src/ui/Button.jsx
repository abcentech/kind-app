// ui-core · Button — the launch control.
// Shared internals for the other ui-core primitives live here too (cx, renderIcon, usePress, stageVars):
// the contract gives ui-core a fixed file list, so one module hosts the helpers instead of a new file.
import { createElement, forwardRef, isValidElement, useCallback, useEffect, useRef } from 'react'
import { Icon } from '../icons.jsx'
import { sound } from '../fx/sound.js'
import { haptic } from '../fx/haptics.js'

export const cx = (...a) => a.filter(Boolean).join(' ')

/** `icon` may be a glyph name ('flame'), an element (<Icon.flame/>) or a component. Returns a node or null. */
export function renderIcon(icon, size = 24, props) {
  if (icon == null || icon === false) return null
  if (typeof icon === 'string') return <Icon name={icon} size={size} {...props} />
  if (isValidElement(icon)) return icon
  if (typeof icon === 'function' || (typeof icon === 'object' && icon.$$typeof)) return createElement(icon, { size, ...props })
  return null
}

/** `stage` (1–5) → the --stage / --stage-glow pair every stage-aware component paints with. */
export const stageVars = (stage, style) =>
  stage ? { '--stage': `var(--stage-${stage})`, '--stage-glow': `var(--stage-${stage}-glow)`, ...style } : style

/** Merge a forwarded ref with an internal one. */
export const useMergedRef = (...refs) =>
  useCallback((node) => { refs.forEach((r) => { if (typeof r === 'function') r(node); else if (r) r.current = node }) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs)

const MIN_HOLD = 90 // ms a press stays visibly "in" — a quick tap still shows the sink

/**
 * Press state as an attribute (`data-pressed`) so every pressable shares one recipe and a fast tap is never invisible
 * (iOS Safari also never fires :active without a touch listener). Written straight to the DOM: no re-render per press.
 */
export function usePress(ref, off = false, track = false) {
  useEffect(() => {
    const el = ref.current
    if (!el || off) return undefined
    let t = 0, timer = 0, rel = 0, box = null
    // `track`: write the pointer position (px, plate-relative) to --k-mx / --k-my so a specular can follow the cursor
    // on hover and bloom from the fingertip on press. Two custom properties, no re-render, one cached rect.
    const aim = (e) => {
      if (!box) box = el.getBoundingClientRect()
      el.style.setProperty('--k-mx', `${(e.clientX - box.left).toFixed(1)}px`)
      el.style.setProperty('--k-my', `${(e.clientY - box.top).toFixed(1)}px`)
    }
    const enter = (e) => { box = el.getBoundingClientRect(); aim(e) }
    const down = (e) => {
      if (e.button > 0 || e.repeat) return
      if (track && e.clientX != null && e.pointerType) { box = el.getBoundingClientRect(); aim(e) }
      clearTimeout(timer); clearTimeout(rel); t = performance.now()
      el.removeAttribute('data-released'); el.setAttribute('data-pressed', '')
    }
    // a completed press (pointerup / key up) also gets a one-shot data-released — Button uses it for the spring release
    const up = (e) => {
      if (!el.hasAttribute('data-pressed')) return
      const done = e && (e.type === 'pointerup' || e.type === 'keyup')
      clearTimeout(timer)
      timer = setTimeout(() => {
        el.removeAttribute('data-pressed')
        if (done) { el.setAttribute('data-released', ''); rel = setTimeout(() => el.removeAttribute('data-released'), 600) }
      }, Math.max(0, MIN_HOLD - (performance.now() - t)))
    }
    const keyDown = (e) => { if (e.key === ' ' || e.key === 'Enter') down(e) }
    const keyUp = (e) => { if (e.key === ' ' || e.key === 'Enter') up(e) }
    if (track) { el.addEventListener('pointerenter', enter); el.addEventListener('pointermove', aim) }
    el.addEventListener('pointerdown', down)
    el.addEventListener('keydown', keyDown)
    el.addEventListener('keyup', keyUp)
    const ends = ['pointerup', 'pointerleave', 'pointercancel', 'blur']
    ends.forEach((n) => el.addEventListener(n, up))
    return () => {
      clearTimeout(timer); clearTimeout(rel)
      if (track) { el.removeEventListener('pointerenter', enter); el.removeEventListener('pointermove', aim) }
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('keydown', keyDown)
      el.removeEventListener('keyup', keyUp)
      ends.forEach((n) => el.removeEventListener(n, up))
      el.removeAttribute('data-pressed'); el.removeAttribute('data-released')
    }
  }, [ref, off, track])
}

const ICON_PX = { lg: 24, md: 20, sm: 16 }
const TICKS = Array.from({ length: 12 }, (_, i) => i)

/** The tick-ring spinner: 12 ticks, bright head, stepped like an instrument rather than smoothly spun.
 *  Standalone (`<Spinner label="Loading" />`, a Suspense fallback) it is a status; inside a Button it is decoration. */
export function Spinner({ size = 24, label, className, style, ...rest }) {
  return (
    <svg
      className={cx('k-spin', className)}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={style}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
      data-motion="essential"
      {...rest}
    >
      {TICKS.map((i) => (
        <line key={i} x1="12" y1="2.5" x2="12" y2="6.75" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round"
          opacity={0.16 + 0.84 * (i / 11)} transform={`rotate(${i * 30} 12 12)`} />
      ))}
    </svg>
  )
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'lg', icon, iconRight, full = false, loading = false, disabled = false, silent = false,
    as: As = 'button', pulse = false, children, className, onClick, type, ...rest },
  fwd,
) {
  const own = useRef(null)
  const ref = useMergedRef(own, fwd)
  const off = disabled || loading
  usePress(own, disabled, variant !== 'ghost')

  const handleClick = (e) => {
    if (off) { e.preventDefault(); e.stopPropagation(); return }
    if (!silent) { sound.play('tap'); haptic.tap() }
    onClick?.(e)
  }

  const isNative = As === 'button'
  const px = ICON_PX[size] || 20
  return (
    <As
      ref={ref}
      className={cx('k-btn', className)}
      data-v={variant}
      data-size={size}
      data-full={full ? '' : undefined}
      data-only={(icon || iconRight) && (children == null || children === false) ? '' : undefined}
      data-loading={loading ? '' : undefined}
      data-pulse={pulse && !off ? '' : undefined}
      aria-busy={loading || undefined}
      {...(isNative ? { type: type || 'button', disabled: disabled || undefined } : { 'aria-disabled': off || undefined, tabIndex: off ? -1 : rest.tabIndex })}
      {...rest}
      onClick={handleClick}
    >
      <span className="k-btn__halo" aria-hidden="true" />
      <span className="k-btn__ring" aria-hidden="true" />
      <span className="k-btn__face" aria-hidden="true">
        <span className="k-btn__fill" />
        <span className="k-btn__sheen" />
        <span className="k-btn__spot" />
        <span className="k-btn__glint" />
      </span>
      <span className="k-btn__in">
        {renderIcon(icon, px, { className: 'k-btn__icon' })}
        {children != null && children !== false && <span className="k-btn__label">{children}</span>}
        {renderIcon(iconRight, px, { className: 'k-btn__icon' })}
      </span>
      {loading && <Spinner className="k-btn__spin" />}
    </As>
  )
})

export default Button
