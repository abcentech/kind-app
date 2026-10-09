// onboard · Family — parent flow only. A family name and the children flying along, as removable chips.
// Everything here is optional; the primary action reads "Add them later" until there is something to keep.
import { useRef, useState } from 'react'
import { Button, Chip, TextField } from '../../ui/index.js'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'
import { onboardCopy, settingsHelp } from '../../copy.js'
import Beat from './Beat.jsx'

export const KID_MAX = 8
const NAME_MAX = 20
const clean = (v) => Array.from(v.replace(/\s+/g, ' ').trim()).slice(0, NAME_MAX).join('').normalize('NFC')

export default function Family({ value, onChange, next }) {
  const k = onboardCopy.kids
  const f = onboardCopy.name
  const { familyName = '', kids = [] } = value
  const [draft, setDraft] = useState('')
  const kidInput = useRef(null)
  const full = kids.length >= KID_MAX

  const add = () => {
    const n = clean(draft)
    if (!n || full) return kids
    if (kids.some((x) => x.toLocaleLowerCase() === n.toLocaleLowerCase())) { setDraft(''); return kids }
    const list = [...kids, n]
    sound.play('select'); haptic.select()
    onChange({ kids: list })
    setDraft('')
    return list
  }
  const remove = (i) => { sound.play('deselect'); haptic.select(); onChange({ kids: kids.filter((_, j) => j !== i) }); kidInput.current?.focus({ preventScroll: true }) }
  const go = () => { if (clean(draft)) add(); next() }
  const has = kids.length > 0 || !!clean(draft)

  return (
    <Beat
      eyebrow={settingsHelp.sections.family}
      title={k.title}
      dek={k.help}
      footer={<Button full onClick={go}>{has ? onboardCopy.chrome.next : k.skip}</Button>}
    >
      <div className="onb-fam">
        <TextField
          label={f.familyLabel}
          placeholder={f.familyPlaceholder}
          value={familyName}
          maxLength={30}
          autoComplete="family-name"
          autoCapitalize="words"
          enterKeyHint="next"
          onChange={(v) => onChange({ familyName: v.replace(/^\s+/, '').replace(/\s{2,}/g, ' ') })}
        />
        <div className="onb-kids">
          <div className="onb-kids__add">
            <TextField
              ref={kidInput}
              aria-label={k.placeholder}
              placeholder={k.placeholder}
              value={draft}
              maxLength={NAME_MAX}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
              disabled={full}
              onChange={(v) => setDraft(v.replace(/^\s+/, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent?.isComposing) { e.preventDefault(); add() } }}
            />
            <Button variant="secondary" size="md" icon="plus" disabled={!clean(draft) || full} onClick={() => { add(); kidInput.current?.focus({ preventScroll: true }) }}>{k.add}</Button>
          </div>
          {kids.length ? (
            <ul className="onb-kids__list" aria-label={k.title}>
              {kids.map((name, i) => (
                <li key={name}>
                  <Chip icon="close" selected tone="tele" aria-pressed={undefined} aria-label={k.remove(name)} onClick={() => remove(i)}>{name}</Chip>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </Beat>
  )
}
