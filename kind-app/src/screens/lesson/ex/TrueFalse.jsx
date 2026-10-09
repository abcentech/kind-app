// ex-choice · TrueFalse — the statement set as a large quote, then two big plates: TRUE (go) and FALSE (no-go).
// The sides are told apart by glyph + word + position, never by colour alone. value = true | false | null.
// Keys: 1 / T = true, 2 / F = false, arrows move and choose, Enter checks.
import { useId } from 'react'
import { Plate, useRadios } from './Plate.jsx'

const KEYS = { t: 0, f: 1 }
const SIDES = [
  { v: true, word: 'True', tone: 'go', glyph: 'check' },
  { v: false, word: 'False', tone: 'nogo', glyph: 'close' },
]
// Spoken after the side on a graded plate. Candidate for copy.js (same strings as Choice).
const SPOKEN = { right: ' Correct answer.', wrong: ' Your answer. Not correct.' }

// The quote shrinks a step for long statements so the plates never leave the screen at 360x640.
const sizeOf = (t) => (t.length > 150 ? 'l' : t.length > 90 ? 'm' : 's')

export default function TrueFalse({ ex, value, onChange, locked = false, graded = null, onSubmit }) {
  const qid = useId()
  const statement = ex.statement || ''
  const chosen = value === true || value === false ? value : null
  const index = chosen === true ? 0 : chosen === false ? 1 : -1
  const done = !!graded
  const frozen = locked || done

  const r = useRadios({ count: 2, index, frozen, onPick: (i) => onChange?.(i === 0), onSubmit, keys: KEYS })

  const stateOf = (v) => {
    if (done) return v === ex.answer ? 'right' : v === chosen ? 'wrong' : 'dim'
    return v === chosen ? 'selected' : 'rest'
  }

  return (
    <div className="exc-tf">
      <figure className="exc-tf__quote" data-size={sizeOf(statement)}>
        <span className="exc-tf__mark" aria-hidden="true">“</span>
        <blockquote id={qid} className="exc-tf__text">{statement}</blockquote>
      </figure>
      <div className="exc-group exc-tf__plates" {...r.group} aria-labelledby={qid}>
        {SIDES.map((s, i) => {
          const state = stateOf(s.v)
          return (
            <Plate
              key={s.word}
              {...r.item(i)}
              layout="tile"
              tone={s.tone}
              glyph={s.glyph}
              keycap={i + 1}
              state={state}
              frozen={frozen}
              label={s.word + (SPOKEN[state] || '')}
              style={{ '--exc-d': `${120 + i * 60}ms` }}
              onClick={() => { if (!frozen && i !== index) onChange?.(s.v) }}
            >
              {s.word}
            </Plate>
          )
        })}
      </div>
    </div>
  )
}
