// ui-core · Switch — a machined toggle: recessed track, titanium thumb, a status LED in the empty half.
// A native <input type=checkbox role=switch> sits under the art, so keyboard, forms and labels (Row as="label")
// just work. onChange receives the next boolean (and the event).
import { forwardRef, useRef, useState } from 'react'
import { sound } from '../fx/sound.js'
import { haptic } from '../fx/haptics.js'
import { cx, usePress } from './Button.jsx'

export const Switch = forwardRef(function Switch(
  { checked, defaultChecked = false, onChange, label, disabled = false, tone = 'go', silent = false, className, style, ...rest },
  ref,
) {
  const root = useRef(null)
  const [inner, setInner] = useState(defaultChecked)
  const controlled = checked !== undefined
  const on = controlled ? !!checked : inner
  usePress(root, disabled)
  const { 'data-state': dataState, ...inputRest } = rest
  return (
    <span
      ref={root}
      className={cx('k-switch', className)}
      data-tone={tone}
      data-on={on ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-state={dataState}
      style={style}
    >
      <input
        ref={ref}
        className="k-switch__input"
        type="checkbox"
        role="switch"
        checked={on}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => {
          const next = e.target.checked
          if (!controlled) setInner(next)
          if (!silent) { sound.play('toggle'); haptic.select() }
          onChange?.(next, e)
        }}
        {...inputRest}
      />
      <span className="k-switch__track" aria-hidden="true">
        <i className="k-switch__led" />
        <i className="k-switch__led" />
        <span className="k-switch__thumb"><i /></span>
      </span>
    </span>
  )
})

export default Switch
