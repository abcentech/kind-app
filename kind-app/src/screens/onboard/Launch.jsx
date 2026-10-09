// onboard · Launch — the last beat. "Day N is ready": today's lesson as a card, the three things you just set as a
// pre-flight checklist whose LEDs go green one by one, and the one decision left. Launch Day N commits the profile
// (completeOnboarding → reminder → prefs) and hands the day to the shell, which opens the lesson.
//   form = { name, role, familyName, kids, goal, reminder:{ on, hour, min } }     onDone({ openDay })
import { useEffect, useMemo, useRef, useState } from 'react'
import { useShell } from '../../shell.jsx'
import { Button, Panel } from '../../ui/index.js'
import { Icon } from '../../icons.jsx'
import { completeOnboarding, updateProfile, useStore } from '../../store.js'
import { currentDay, dayLabel, estimateMinutes, teaserFor } from '../../lib.js'
import { prefs } from '../../prefs.js'
import { fx } from '../../fx/fx.js'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'
import { useFxLevel } from '../../fx/motion.js'
import { goalCopy, launchBarCopy, launchSequence, onboardCopy, settingsHelp } from '../../copy.js'
import Beat from './Beat.jsx'

const clock = (h, m) => {
  const hh = h % 12 || 12
  return `${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

export default function Launch({ form, onDone, step, steps }) {
  const { s } = useShell()
  const st = useStore()
  const lite = useFxLevel() === 'lite'
  const N = useMemo(() => currentDay(s, st), [s, st])
  const day = s.calendar.find((d) => d.day === N)
  const title = dayLabel(s, N)
  const bar = launchBarCopy({ state: 'first', day: N, title, mins: estimateMinutes(s, N), kind: day?.type, role: form.role, seed: s.id })
  const goal = goalCopy(form.goal)
  const rem = form.reminder || { on: false }
  const rows = [
    { k: onboardCopy.crew.eyebrow, v: form.role === 'parent' && form.kids?.length ? `${form.name} + ${form.kids.length}` : form.name },
    { k: onboardCopy.goal.eyebrow, v: `${goal.label} · ${goal.xp} XP` },
    { k: onboardCopy.remind.eyebrow, v: rem.on ? clock(rem.hour, rem.min) : 'Off', off: !rem.on },
  ]

  // checklist LEDs: lit one by one after the beat has slid in
  const [lit, setLit] = useState(lite ? rows.length : 0)
  useEffect(() => {
    if (lite) { setLit(rows.length); return undefined }
    const t = []
    rows.forEach((_, i) => t.push(setTimeout(() => { setLit(i + 1); sound.play('detent', { step: i, gain: 0.5 }); haptic.select() }, 520 + i * 240)))
    return () => t.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lite])
  const armed = lit >= rows.length

  const busy = useRef(false)
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const btn = useRef(null)

  const launch = () => {
    if (busy.current) return
    busy.current = true
    const day0 = N
    completeOnboarding({ name: form.name, role: form.role, familyName: form.familyName, kids: form.kids, dailyGoal: form.goal })
    if (rem.on) updateProfile({ reminderHour: rem.hour })
    prefs.set('reminder', { on: !!rem.on, hour: rem.hour ?? 20, min: rem.min ?? 0 })
    sound.play('ignite'); haptic.launch()
    if (lite) { timers.current.push(setTimeout(() => onDone({ openDay: day0 }), 160)); return }
    timers.current.push(setTimeout(() => { sound.play('launch'); fx.launch(btn.current) }, 380))
    timers.current.push(setTimeout(() => onDone({ openDay: day0 }), 760))
  }

  return (
    <Beat
      variant="launch"
      eyebrow={launchSequence[0]}
      title={`Day ${N} is ready`}
      step={step}
      steps={steps}
      footer={(
        <Button ref={btn} full icon="rocket" silent pulse={armed} onClick={launch}>{`${onboardCopy.finish.cta} Day ${N}`}</Button>
      )}
    >
      <Panel tone="raised" cut pad="md" className="onb-ready">
        <span className="onb-ready__num" aria-hidden="true">{N}</span>
        <p className="onb-ready__meta t-mono-sm">
          <span>{bar.eyebrow}</span>
          {bar.meta ? <span>{bar.meta}</span> : null}
        </p>
        <h2 className="onb-ready__title">{title}</h2>
        <p className="onb-ready__teaser">{teaserFor(s, N)}</p>
        <ul className="onb-check" aria-label={settingsHelp.sections.commitment}>
          {rows.map((r, i) => (
            <li key={r.k} className="onb-check__row" data-lit={i < lit ? '' : undefined} data-off={r.off ? '' : undefined}>
              <span className="onb-check__k t-mono-sm">{r.k}</span>
              <span className="onb-check__v">{r.v}</span>
              <span className="onb-check__led" aria-hidden="true">{i < lit ? (r.off ? <i className="onb-check__dash" /> : <Icon name="check" size={16} />) : null}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </Beat>
  )
}
