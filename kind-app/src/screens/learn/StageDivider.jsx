// StageDivider — the gate between two stages: a hairline slab with the stage's mission patch sitting ON the flight path.
// The patch is greyscale until the stage is cleared (then it lights up with a stage-tinted glow and a CLEARED tag).
// Below it: STAGE 02 · FAITHFULNESS, a tick per day (3 of 8 flown) and the stage question set in serif.
// The slab is a near-opaque carbon band on purpose: the path runs straight through the gate, and this is where it is allowed to dim.
import { memo } from 'react'
import { MissionPatch } from '../../art/index.js'
import { Tag } from '../../ui/index.js'
import { aria, stageTag } from '../../copy.js'

/** --stage / --stage-glow for a stage slot (1–5): every stage-aware thing below paints with these. */
export const stageVars = (slot) => ({ '--stage': `var(--stage-${slot})`, '--stage-glow': `var(--stage-${slot}-glow)` })

const StageDivider = memo(function StageDivider({ stage, s, id }) {
  const { n, name, index, question, title, done, total, cleared, state } = stage
  const line = question || title
  return (
    <header className="learn-slab" data-state={state} data-cleared={cleared || undefined}>
      <div className="learn-slab__patch" data-pt={'p' + index} data-f="0">
        <MissionPatch series={s} stage={index} state="earned" size={104} decorative />
      </div>
      <h2 className="learn-slab__title" id={id}>
        <span>{stageTag(n)}</span><i aria-hidden="true" /><span>{name}</span>
      </h2>
      <div className="learn-slab__meta">
        {cleared ? <Tag tone="go" icon="check">Cleared</Tag> : null}
        <span className="learn-ticks" role="img" aria-label={aria.stage({ n, title: name, pct: stage.pct * 100 })}>
          {Array.from({ length: total }, (_, i) => <i key={i} data-on={i < done || undefined} />)}
        </span>
        <span className="learn-slab__count" aria-hidden="true">{done}/{total}</span>
      </div>
      {line ? <p className="learn-slab__q">{line}</p> : null}
    </header>
  )
})

export default StageDivider
