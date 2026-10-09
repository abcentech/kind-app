// onboard-commit · Goal — "Your daily commitment" (beat 4 of 5; Beat reads step/steps from the flow). Three chamfered plates, each with a mini gauge of its intensity.
// value = 20 | 40 | 60 (the daily XP goal, GOALS in copy.js); onChange(xp) on every pick; next(xp) from the CTA.
// The plates are real radios (a hidden input stretched over the plate): arrow keys, roving tab stop, SR "2 of 3" for free.
// `Frame` is a test seam so the playground can stand in for Beat while onboard-main's is a stub; callers never pass it.
import { useEffect, useRef } from 'react'
import { Button, Counter, Gauge, Rings, Tag } from '../../ui/index.js'
import { usePress } from '../../ui/Button.jsx'
import { Icon } from '../../icons.jsx'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'
import { GOALS, goalCopy, onboardCopy } from '../../copy.js'
import Beat from './Beat.jsx'

const DEFAULT_XP = 40
const MAX_XP = GOALS[GOALS.length - 1].xp
const MID_RING = [{ id: 'lesson', value: 0, tone: 'tele' }, { id: 'xp', value: 0.62, tone: 'tele' }, { id: 'right', value: 0, tone: 'tele' }]

function Plate({ g, i, on, rec, onPick }) {
  const ref = useRef(null)
  usePress(ref)
  const c = goalCopy(g.xp)
  const id = `onc-goal-${g.id}`
  return (
    <div ref={ref} className="onc-opt u-cut-frame is-block" data-on={on ? '' : undefined} style={{ '--i': i }}>
      <input
        type="radio" name="onc-goal" className="onc-opt__in" value={g.xp} checked={on}
        aria-labelledby={`${id}-n`} aria-describedby={`${id}-d`}
        onChange={() => onPick(g.xp)}
      />
      <span className="onc-plate" aria-hidden="true">
        <i className="onc-plate__rail" />
        <span className="onc-plate__gauge">
          <Gauge value={g.xp / MAX_XP} size={56} tone="tele" sweep={1} display="" glow={on} label={g.label} />
        </span>
        <span className="onc-plate__txt">
          <span className="onc-plate__name" id={`${id}-n`}>{g.label}</span>
          <span className="onc-plate__meta"><b>{g.mins} min</b><i>·</i><b>{g.xp} XP</b></span>
          <span className="onc-plate__blurb">{g.blurb}</span>
        </span>
        {rec && <Tag tone="tele" led={false} className="onc-plate__rec">{onboardCopy.goal.tag}</Tag>}
        <span className="onc-plate__led"><Icon.check size={16} weight="solid" /></span>
      </span>
      <span className="u-sr" id={`${id}-d`}>{rec ? `${onboardCopy.goal.tag}. ` : ''}{c.meta}. {g.blurb}</span>
    </div>
  )
}

export default function Goal({ value, onChange, next, back, Frame = Beat }) {
  const copy = onboardCopy.goal
  const valid = GOALS.some((g) => g.xp === value)
  const cur = valid ? value : DEFAULT_XP
  const rec = GOALS.find((g) => g.id === copy.recommended)?.xp

  // Regular is preselected: tell the parent so "Set my goal" without touching anything still commits 40.
  useEffect(() => { if (!valid) onChange?.(DEFAULT_XP) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (xp) => {
    if (xp === cur) return
    sound.play('select'); haptic.select()
    onChange?.(xp)
  }

  return (
    <Frame
      eyebrow={copy.eyebrow} title={copy.title} dek={copy.body} back={back}
      footer={(
        <div className="onc-foot" data-beat="goal">
          <Button full iconRight="arrowRight" onClick={() => next?.(cur)}>{copy.cta}</Button>
          <p className="onc-foot__note onb-note">{copy.foot}</p>
        </div>
      )}
    >
      <div className="onc-goal">
        <div className="onc-opts" role="radiogroup" aria-label={copy.title}>
          {GOALS.map((g, i) => <Plate key={g.id} g={g} i={i} on={g.xp === cur} rec={g.xp === rec} onPick={pick} />)}
        </div>

        <div className="onc-effect">
          <Rings rings={MID_RING} size={40} stroke={4} gap={1} glow={false} aria-hidden="true" />
          <p className="onc-effect__line">This sets your middle ring.</p>
          <span className="onc-effect__val" aria-hidden="true"><Counter value={cur} duration={420} /><small>XP / day</small></span>
          <span className="u-sr" role="status">Daily goal {cur} XP</span>
        </div>
      </div>
    </Frame>
  )
}
