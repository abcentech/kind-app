// onboard · Who — beat 2, "Who's flying?". Two large chamfered plates (a radiogroup): Teen, or Parent leading kids.
// 1 / 2 select, arrows move, Enter continues. Choosing is not a context change, so Continue stays an explicit action.
import { useRef } from 'react'
import { Button, Hex, Kbd, Panel } from '../../ui/index.js'
import { Icon } from '../../icons.jsx'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'
import { onboardCopy } from '../../copy.js'
import Beat from './Beat.jsx'

const OPTIONS = [
  { id: 'teen', icon: 'user', key: '1' },
  { id: 'parent', icon: 'family', key: '2' },
]

export default function Who({ value, onChange, next }) {
  const c = onboardCopy.crew
  const refs = useRef([])

  const choose = (i, focus = false) => {
    const o = OPTIONS[(i + OPTIONS.length) % OPTIONS.length]
    if (o.id !== value) { sound.play('select'); haptic.select(); onChange(o.id) }
    if (focus) refs.current[OPTIONS.indexOf(o)]?.focus()
  }
  const onKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const at = OPTIONS.findIndex((o) => o.id === value)
    if (e.key === '1' || e.key === '2') { e.preventDefault(); choose(Number(e.key) - 1, true) }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); choose(at < 0 ? 0 : at + 1, true) }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); choose(at < 0 ? OPTIONS.length - 1 : at - 1, true) }
    else if (e.key === 'Enter' && value && !e.target.closest('button')) { e.preventDefault(); next() }
  }

  return (
    <Beat
      eyebrow={c.eyebrow}
      title={c.title}
      dek={c.body}
      onKeyDown={onKeyDown}
      footer={<Button full disabled={!value} onClick={next}>{onboardCopy.chrome.next}</Button>}
    >
      <div className="onb-plates" role="radiogroup" aria-label={c.title}>
        {OPTIONS.map((o, i) => {
          const on = value === o.id
          const t = c[o.id]
          return (
            <Panel
              key={o.id}
              ref={(n) => { refs.current[i] = n }}
              as="button"
              role="radio"
              aria-checked={on}
              tabIndex={on || (!value && i === 0) ? 0 : -1}
              tone={on ? 'tele' : 'raised'}
              cut
              silent
              className="onb-plate"
              data-on={on ? '' : undefined}
              data-dim={value && !on ? '' : undefined}
              onClick={() => choose(i)}
            >
              <Hex size={64} state={on ? 'current' : 'open'} tone="tele" className="onb-plate__hex">
                <Icon name={o.icon} size={32} weight={on ? 'solid' : 'duo'} />
              </Hex>
              <span className="onb-plate__txt">
                <span className="onb-plate__name">{t.title}</span>
                <span className="onb-plate__sub">{t.sub}</span>
              </span>
              <Kbd lit={on} className="onb-plate__key" aria-hidden="true">{o.key}</Kbd>
            </Panel>
          )
        })}
      </div>
    </Beat>
  )
}
