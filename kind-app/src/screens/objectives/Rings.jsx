// Rings — the hero instrument. Three concentric rings (Lesson / XP / Accuracy) inside a titanium bezel; the XP
// ring's progress also lights the bezel's tick marks, so the dial reads at a glance even without the colours.
// A ring's closing ceremony (sound + haptic + burst, all inside <Rings>) is gated to once per day per ring by a store flag:
// rings that are done but unseen mount empty, then close a beat later; rings already celebrated today simply mount full.
import { useEffect, useRef, useState } from 'react'
import { useShell } from '../../shell.jsx'
import { dailyGoalXp, hasFlag, rings as ringsOf, setDailyGoal, setFlag, useStore, useToday } from '../../store.js'
import { currentDay } from '../../lib.js'
import { goalCopy, GOALS, onboardCopy, ringCopy, settingsHelp, toastCopy } from '../../copy.js'
import { Icon } from '../../icons.jsx'
import { Button, Chip, Counter, Rings, Segmented, Sheet, toast } from '../../ui/index.js'

const TONE = { lesson: 'ignite', xp: 'tele', right: 'go' }
const ICON = { lesson: 'book', xp: 'bolt', right: 'target' }
const flagKey = (day, id) => `ring:${day}:${id}`
const TICKS = 60
const BEZEL = 280
const C = BEZEL / 2

// Bezel dial: 60 ticks (every 5th is longer) + the index notch at 12 o'clock. Lit ticks = share of the XP goal.
function Dial({ lit }) {
  const ticks = []
  for (let i = 0; i < TICKS; i++) {
    const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2
    const major = i % 5 === 0
    const r1 = C - 10, r2 = r1 - (major ? 8 : 4)
    ticks.push(
      <line
        key={i} className={'obj-tick' + (major ? ' is-major' : '') + (i < lit ? ' is-lit' : '')}
        x1={(C + Math.cos(a) * r1).toFixed(2)} y1={(C + Math.sin(a) * r1).toFixed(2)}
        x2={(C + Math.cos(a) * r2).toFixed(2)} y2={(C + Math.sin(a) * r2).toFixed(2)}
      />,
    )
  }
  return (
    <svg className="obj-dial" viewBox={`0 0 ${BEZEL} ${BEZEL}`} aria-hidden="true" focusable="false">
      {ticks}
      <path className="obj-index" d={`M${C - 5} 5.5H${C + 5}L${C} 13Z`} />
    </svg>
  )
}

function GoalSheet({ open, onClose, goal }) {
  const g = goalCopy(goal)
  const pick = (xp) => {
    if (xp === goal) return
    setDailyGoal(xp)
    toast(toastCopy('goalSet', { goal: xp }))
  }
  return (
    <Sheet
      open={open} onClose={onClose} title={settingsHelp.goal.label} eyebrow="Objectives · Daily goal"
      footer={<Button variant="secondary" full onClick={onClose}>Done</Button>}
    >
      <div className="obj-goal">
        <p className="obj-goal-lead">{onboardCopy.goal.body}</p>
        <Segmented label="Daily goal in XP" options={GOALS.map((x) => ({ id: x.xp, label: `${x.xp} XP` }))} value={goal} onChange={pick} />
        <div className="obj-goal-read" aria-live="polite">
          <span className="obj-goal-name">{g.label}</span>
          <span className="obj-goal-meta">{g.meta}</span>
          <span className="obj-goal-blurb">{g.blurb}</span>
        </div>
        <p className="obj-goal-help">{settingsHelp.goal.help}</p>
      </div>
    </Sheet>
  )
}

export default function RingsSection({ s }) {
  const st = useStore()
  const { goTab } = useShell()
  const today = useToday()
  const rs = ringsOf(st, today)
  const goal = dailyGoalXp(st)
  const xp = rs.find((r) => r.id === 'xp')
  const closed = rs.filter((r) => r.done).length
  const dormant = st.xp === 0 && rs.every((r) => r.now === 0)
  const [goalOpen, setGoalOpen] = useState(false)

  // First paint only: rings that are done but not yet celebrated today are held empty, then released to close with ceremony.
  const held = useRef(null)
  if (held.current === null) held.current = new Set(rs.filter((r) => r.done && !hasFlag(st, flagKey(today, r.id))).map((r) => r.id))
  const [released, setReleased] = useState(held.current.size === 0)
  useEffect(() => {
    if (released) return undefined
    const t = setTimeout(() => setReleased(true), 700)
    return () => clearTimeout(t)
  }, [released])
  const doneKey = rs.map((r) => (r.done ? 1 : 0)).join('')
  useEffect(() => {
    if (!released) return
    rs.forEach((r) => { if (r.done) setFlag(flagKey(today, r.id)) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [released, today, doneKey])

  const data = rs.map((r) => ({ id: r.id, tone: TONE[r.id], icon: ICON[r.id], label: ringCopy(r).label, value: !released && held.current.has(r.id) ? 0 : r.value }))
  const lit = Math.round(Math.min(1, xp.value) * TICKS)
  const state = dormant ? 'dormant' : closed === 3 ? 'done' : 'live'
  const day = currentDay(s, st)

  return (
    <section className="obj-rings" aria-label={`Today’s rings. ${closed} of 3 closed.`} data-state={state}>
      <div className="obj-bezel">
        <Dial lit={dormant ? 0 : lit} />
        <Rings rings={data} size={232} stroke={14} gap={3} label={rs.map((r) => ringCopy(r).aria).join(' ')}>
          <div className="obj-core">
            <span className="obj-num"><Counter value={xp.now} /></span>
            <span className="obj-of">of {goal} XP</span>
          </div>
        </Rings>
      </div>

      {dormant ? (
        <button type="button" className="obj-dormant" onClick={() => goTab('learn')}>
          <Icon name="rocket" size={16} weight="duo" />Launch Day {day} to light these<Icon name="chevronRight" size={16} />
        </button>
      ) : null}

      <ul className="obj-legend">
        {rs.map((r) => {
          const c = ringCopy(r)
          return (
            <li key={r.id} className="obj-leg" data-ring={r.id} data-done={r.done ? '' : undefined} aria-label={c.aria}>
              <span className="obj-leg-name"><i className="obj-led" aria-hidden="true" />{c.label}</span>
              <span className="obj-leg-val" aria-hidden="true">
                {r.done ? <Icon name="check" size={16} /> : null}
                <b>{r.now}</b><em>/{r.goal}</em>
              </span>
            </li>
          )
        })}
      </ul>

      <Chip className="obj-goalchip" icon="target" onClick={() => setGoalOpen(true)} aria-haspopup="dialog">Daily goal {goal} XP</Chip>
      <GoalSheet open={goalOpen} onClose={() => setGoalOpen(false)} goal={goal} />
    </section>
  )
}
