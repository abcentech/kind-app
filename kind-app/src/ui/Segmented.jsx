// ui-core · Segmented — a recessed rail with a sliding titanium thumb (transform only). Radio-group semantics:
// one tab stop, arrows / Home / End move and select. onChange receives the option id.
import { useRef } from 'react'
import { sound } from '../fx/sound.js'
import { haptic } from '../fx/haptics.js'
import { cx, renderIcon, usePress } from './Button.jsx'

function Seg({ o, on, tab, size, onPick, regRef }) {
  const ref = useRef(null)
  usePress(ref, o.disabled)
  return (
    <button
      ref={(n) => { ref.current = n; regRef(n) }}
      type="button"
      role="radio"
      className="k-seg__opt"
      aria-checked={on}
      tabIndex={tab ? 0 : -1}
      disabled={o.disabled}
      onClick={onPick}
    >
      {o.icon ? renderIcon(o.icon, size === 'sm' ? 16 : 20, { className: 'k-seg__icon' }) : null}
      {o.label != null ? <span className="k-seg__label">{o.label}</span> : null}
    </button>
  )
}

export function Segmented({ options = [], value, onChange, size = 'md', label, full = true, silent = false, className, style, ...rest }) {
  const refs = useRef([])
  const drag = useRef(false)
  const n = options.length || 1
  const found = options.findIndex((o) => o.id === value)
  const idx = Math.max(0, found)
  const pick = (i, focus) => {
    const o = options[i]
    if (!o || o.disabled || o.id === value) return
    if (!silent) { sound.play('select'); haptic.select() }
    onChange?.(o.id)
    if (focus) refs.current[i]?.focus()
  }
  const onKeyDown = (e) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    let next = -1
    if (dir) {
      for (let k = 1; k <= n; k++) {
        const j = (((idx + dir * k) % n) + n) % n
        if (!options[j].disabled) { next = j; break }
      }
    } else if (e.key === 'Home') next = options.findIndex((o) => !o.disabled)
    else if (e.key === 'End') { for (let j = n - 1; j >= 0; j--) if (!options[j].disabled) { next = j; break } }
    if (next < 0) return
    e.preventDefault()
    pick(next, true)
  }
  // press-and-slide: selection follows the finger across the rail, like the iOS control. Keyboard still arrives as click.
  const at = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    return Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * n)))
  }
  const onPointerDown = (e) => {
    if (e.button > 0 || e.pointerType === 'touch') return
    drag.current = true   // no pointer capture: the option under the finger must still see its own pointerup (press state)
    pick(at(e))
  }
  const onPointerMove = (e) => { if (drag.current) pick(at(e)) }
  const onPointerUp = () => { drag.current = false }
  return (
    <div
      className={cx('k-seg', className)}
      role="radiogroup"
      aria-label={label}
      data-size={size}
      data-full={full ? '' : undefined}
      style={{ '--n': n, '--i': idx, ...style }}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
      {...rest}
    >
      <span className="k-seg__thumb" aria-hidden="true" />
      {options.map((o, i) => (
        <Seg key={o.id} o={o} on={i === found} tab={i === idx} size={size} onPick={() => pick(i)} regRef={(node) => { refs.current[i] = node }} />
      ))}
    </div>
  )
}

export default Segmented
