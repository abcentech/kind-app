// onboard · Name — beat 3, "What should we call you?". Large type, not a form: a crew hex above shows the initial as you
// type, the name sits on an instrument rule that lights on focus. Any Latin letter works (Yoruba and Igbo marks: Ọlámidé,
// Ìfẹ́, Chukwuemeka, Ụgọ̀) — the limit counts characters, not UTF-16 units, so a decomposed ẹ́ is still one. Enter continues.
import { useEffect, useRef, useState } from 'react'
import { Button, Hex } from '../../ui/index.js'
import { Icon } from '../../icons.jsx'
import { fx } from '../../fx/fx.js'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'
import { onboardCopy } from '../../copy.js'
import Beat from './Beat.jsx'

export const NAME_MAX = 20
const chars = (v) => Array.from(v)
// first letter plus any combining marks that follow it, upper-cased (ọ́ → Ọ́)
const initialOf = (v) => (v.trim().match(/^\P{M}\p{M}*/u)?.[0] || '').toLocaleUpperCase()

export default function Name({ value, onChange, next, autoFocus = true }) {
  const c = onboardCopy.name
  const input = useRef(null)
  const [err, setErr] = useState(false)
  const [focus, setFocus] = useState(false)
  const n = chars(value).length
  const ini = initialOf(value)

  useEffect(() => {
    if (autoFocus) input.current?.focus({ preventScroll: true })
  }, [autoFocus])

  const edit = (e) => {
    let v = e.target.value.replace(/^\s+/, '').replace(/\s{2,}/g, ' ')
    if (!e.nativeEvent?.isComposing && chars(v).length > NAME_MAX) v = chars(v).slice(0, NAME_MAX).join('')
    if (err && v.trim()) setErr(false)
    onChange(v)
  }
  const submit = () => {
    if (!value.trim()) {
      setErr(true)
      sound.play('error'); haptic.error()
      fx.shake(input.current?.parentElement, { amp: 7 })
      input.current?.focus({ preventScroll: true })
      return
    }
    onChange(value.trim().normalize('NFC'))
    next()
  }
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.nativeEvent?.isComposing) { e.preventDefault(); submit() }
  }
  const size = n > 14 ? 'l' : n > 9 ? 'm' : 's'

  return (
    <Beat
      eyebrow={c.eyebrow}
      title={c.title}
      footer={<Button full onClick={submit}>{c.cta}</Button>}
    >
      <div className="onb-name" data-err={err ? '' : undefined} data-focus={focus ? '' : undefined}>
        <Hex size={96} state={ini ? 'current' : 'open'} tone="tele" className="onb-name__hex">
          {ini ? <span className="onb-name__ini" aria-hidden="true">{ini}</span> : <Icon name="user" size={32} weight="duo" />}
        </Hex>
        <div className="onb-field" data-len={size}>
          <input
            ref={input}
            className="onb-field__input"
            type="text"
            value={value}
            placeholder={c.placeholder}
            aria-label={c.placeholder}
            aria-invalid={err || undefined}
            aria-describedby="onb-name-note"
            autoComplete="given-name"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            onChange={edit}
            onKeyDown={onKeyDown}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
          />
          <i className="onb-field__rule" aria-hidden="true" />
        </div>
        <p className="onb-field__meta">
          <span id="onb-name-note" className="onb-field__note" role={err ? 'alert' : undefined}>{err ? c.error : c.help}</span>
          <span className="onb-field__count t-mono-sm t-num" aria-hidden="true">{String(n).padStart(2, '0')}/{NAME_MAX}</span>
        </p>
      </div>
    </Beat>
  )
}
