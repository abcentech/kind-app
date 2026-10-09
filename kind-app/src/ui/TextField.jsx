// ui-core · TextField — a recessed instrument field (input, or textarea with `multiline`). Additive: contract §3.5 lists no
// input primitive, but onboarding ("What should we call you?"), the Journal and family names all need one.
//   label   the mono eyebrow above (also the accessible name)         hint / error   the line below; `error` wins and is announced
//   icon    a glyph inside the left edge                               maxLength       shows a  12 / 40  counter and stops there
//   value / onChange(value, event)  controlled; defaultValue for uncontrolled. Everything else (type, placeholder,
//   autoComplete, inputMode, enterKeyHint, name, onFocus…) goes straight to the native element.
// A status LED sits at the left of the well: dark at rest, telemetry-blue on focus, red on error. Multiline grows with its
// content up to `maxRows`.
import { forwardRef, useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '../icons.jsx'
import { cx, renderIcon, useMergedRef } from './Button.jsx'

export const TextField = forwardRef(function TextField(
  { label, hint, error, icon, suffix, multiline = false, rows = 2, maxRows = 8, maxLength, value, defaultValue, onChange, disabled = false, id, className, style, 'data-state': dataState, ...rest },
  fwd,
) {
  const uid = useId()
  const fid = id || `k-field-${uid}`
  const own = useRef(null)
  const ref = useMergedRef(own, fwd)
  const [inner, setInner] = useState(defaultValue ?? '')
  const controlled = value !== undefined
  const v = controlled ? value ?? '' : inner
  const len = String(v).length

  const grow = useCallback(() => {
    const el = own.current
    if (!el || !multiline) return
    const cs = getComputedStyle(el)
    const line = parseFloat(cs.lineHeight) || 24
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, line * maxRows + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom))}px`
  }, [multiline, maxRows])
  useLayoutEffect(grow, [v, grow])

  const El = multiline ? 'textarea' : 'input'
  const note = error || hint
  return (
    <div
      className={cx('k-field', className)}
      data-invalid={error ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-multi={multiline ? '' : undefined}
      data-full={maxLength && len >= maxLength ? '' : undefined}
      data-state={dataState}
      style={style}
    >
      {label ? <label className="k-field__label" htmlFor={fid}>{label}</label> : null}
      <div className="k-field__box">
        <i className="k-field__led" aria-hidden="true" />
        {icon ? <span className="k-field__icon" aria-hidden="true">{renderIcon(icon, 20)}</span> : null}
        <El
          type={multiline ? undefined : 'text'}
          rows={multiline ? rows : undefined}
          {...rest}
          ref={ref}
          id={fid}
          className="k-field__input"
          value={v}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? `${fid}-note` : undefined}
          onChange={(e) => { if (!controlled) setInner(e.target.value); onChange?.(e.target.value, e) }}
        />
        {maxLength ? <span className="k-field__count" aria-hidden="true">{len}<i>/</i>{maxLength}</span> : null}
        {suffix}
      </div>
      {note ? (
        <p className="k-field__note" id={`${fid}-note`} role={error ? 'alert' : undefined}>
          {error ? <Icon name="warning" size={16} /> : null}
          <span>{note}</span>
        </p>
      ) : null}
    </div>
  )
})

export default TextField
