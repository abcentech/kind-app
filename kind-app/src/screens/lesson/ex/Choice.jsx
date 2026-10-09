// ex-choice · Choice — "choose one": stacked answer plates, keycaps 1–4. value = the chosen option id.
// Graded: the chosen plate is painted right or wrong, and the correct one is ALWAYS revealed; the rest go dim.
import { Plate, useRadios } from './Plate.jsx'
import { aria, lessonCopy } from '../../../copy.js'

// Spoken after the option on a graded plate (screen-reader users read the radios, not the verdict sheet). Candidate for copy.js.
const SPOKEN = { right: ' Correct answer.', wrong: ' Your answer. Not correct.' }

export default function Choice({ ex, value, onChange, locked = false, graded = null, onSubmit }) {
  const opts = ex.options || []
  const chosen = value && typeof value === 'object' ? value.id : value
  const index = opts.findIndex((o) => o.id === chosen)
  const done = !!graded
  const frozen = locked || done

  const r = useRadios({
    count: opts.length, index, frozen,
    onPick: (i) => onChange?.(opts[i].id),
    onSubmit,
  })

  const stateOf = (o) => {
    if (done) return o.id === ex.answer ? 'right' : o.id === chosen ? 'wrong' : 'dim'
    return o.id === chosen ? 'selected' : 'rest'
  }

  return (
    <div className="exc-group exc-choice" {...r.group} aria-label={ex.prompt || lessonCopy.exercise.choice}>
      {opts.map((o, i) => {
        const state = stateOf(o)
        return (
          <Plate
            key={o.id}
            {...r.item(i)}
            keycap={i + 1}
            state={state}
            frozen={frozen}
            label={aria.option(i + 1, o.text) + (SPOKEN[state] || '')}
            style={{ '--exc-d': `${40 + i * 50}ms` }}
            onClick={() => { if (!frozen && i !== index) onChange?.(o.id) }}
          >
            {o.text}
          </Plate>
        )
      })}
    </div>
  )
}
