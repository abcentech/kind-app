// Objectives · This week — the Monday-to-Sunday recap slab, read off activityByDate.
// Saturday and Sunday it opens as the Weekly recap; other days it is a one-line disclosure with the same numbers behind it.
import { useId, useMemo, useState } from 'react'
import { Icon } from '../../icons.jsx'
import { activityByDate, streakInfo, useStore, useToday } from '../../store.js'
import { fmtNum, lessonCopy } from '../../copy.js'
import { Button, Counter, Label, Panel, Stat } from '../../ui/index.js'
import { now, today } from '../../now.js'
import { useShell } from '../../shell.jsx'
import { useFirstView } from './Month.jsx'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const plural = (n, w) => (n === 1 ? w : w + 's')

// Lines the copy desk has not written yet (copy.js owns only the label); kept here, short and plain.
function lines({ lessons, goalDays, past, sunday }) {
  if (!lessons) return { h: sunday ? 'No lessons this week.' : 'A quiet week so far.', p: sunday ? 'A new week starts tomorrow. One lesson is all it takes.' : 'One lesson puts you on the board.' }
  const h = `${fmtNum(lessons)} ${plural(lessons, 'lesson')} finished this week.`
  const p = goalDays ? `Daily goal met on ${goalDays} of ${past} ${plural(past, 'day')}.` : 'Every lesson counts. Keep the line unbroken.'
  return { h, p }
}

/** Monday-first week containing `at`: 7 keys, plus how many have started. */
function weekOf(at) {
  const lead = (at.getDay() + 6) % 7
  const keys = DAYS.map((_, i) => today(new Date(at.getFullYear(), at.getMonth(), at.getDate() - lead + i)))
  return { keys, lead, tk: today(at) }
}

export default function Recap() {
  const st = useStore()
  const { share } = useShell()
  const tk = useToday()
  const id = useId()
  const at = useMemo(() => now(), [tk])        // eslint-disable-line react-hooks/exhaustive-deps -- re-derive only when the date rolls
  const weekend = at.getDay() === 6 || at.getDay() === 0
  const [open, setOpen] = useState(weekend)
  const { ref, go, was } = useFirstView('recap', open)

  const w = useMemo(() => {
    const { keys, lead } = weekOf(at)
    const act = activityByDate(st)
    const days = keys.map((k, i) => {
      const a = act[k]
      return { k, name: DAYS[i], xp: a?.xp || 0, lessons: a?.lessons || 0, goal: Boolean(st.log[k]?.goal), today: i === lead, future: i > lead }
    })
    let right = 0, asked = 0
    const inWeek = new Set(keys)
    for (const sb of Object.values(st.series)) for (const r of Object.values(sb.results)) if (inWeek.has(r.date)) { right += r.right; asked += r.asked }
    const lessons = days.reduce((n, d) => n + d.lessons, 0)
    const xp = days.reduce((n, d) => n + d.xp, 0)
    const best = days.reduce((b, d) => (d.xp > 0 && (!b || d.xp >= b.xp) ? d : b), null)
    const max = Math.max(1, ...days.map((d) => d.xp))
    return { days, lessons, xp, best, max, accuracy: asked ? Math.round((right / asked) * 100) : null, goalDays: days.filter((d) => d.goal).length, past: lead + 1 }
  }, [st, at])
  const streak = streakInfo(st, at).count
  const copy = lines({ lessons: w.lessons, goalDays: w.goalDays, past: w.past, sunday: at.getDay() === 0 })
  const summary = w.lessons ? `${fmtNum(w.lessons)} ${plural(w.lessons, 'lesson')} · ${fmtNum(w.xp)} XP` : 'No lessons yet'
  const panel = id + '-p'

  return (
    <Panel as="section" tone={weekend ? 'tele' : 'plate'} cut="sm" className="obm-sec obm-recap" ref={ref} aria-labelledby={id + '-h'} data-open={open ? '' : undefined} data-weekend={weekend ? '' : undefined}>
      <h2 className="obm-recap-bar" id={id + '-h'}>
        <button type="button" className="obm-recap-btn" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((o) => !o)}>
          <span className="obm-recap-ic" aria-hidden="true"><Icon name="calendar" size={20} /></span>
          <span className="obm-recap-lbl">
            <Label tone={weekend ? 'tele' : 'ink-2'} mono size="md">{weekend ? 'Weekly recap' : lessonCopy.slide.recap}</Label>
            <span className="obm-recap-sum">{summary}</span>
          </span>
          <span className="obm-recap-chev" aria-hidden="true"><Icon name="chevronUp" size={20} /></span>
        </button>
      </h2>

      <div className="obm-recap-wrap" id={panel} role="region" aria-labelledby={id + '-h'}>
        <div className="obm-recap-in">
          <div className="obm-slab">
            <p className="obm-recap-h">{copy.h}</p>
            <p className="obm-sub">{copy.p}</p>

            <ol className="obm-week" aria-label="Experience points by day">
              {w.days.map((d) => (
                <li className="obm-day" key={d.k} data-today={d.today ? '' : undefined} data-future={d.future ? '' : undefined} data-goal={d.goal ? '' : undefined}
                  aria-label={d.future ? `${d.name}: not yet` : `${d.name}: ${d.lessons} ${plural(d.lessons, 'lesson')}, ${d.xp} XP${d.goal ? ', goal met' : ''}`}>
                  <span className="obm-col" aria-hidden="true">
                    <i className="obm-fill" style={{ '--h': go && d.xp ? Math.max(0.1, d.xp / w.max) : 0 }} />
                  </span>
                  <span className="obm-dow" aria-hidden="true">{d.name[0]}</span>
                  <span className="obm-flag" aria-hidden="true">{d.goal ? <Icon name="flame" size={16} weight="solid" /> : null}</span>
                </li>
              ))}
            </ol>

            <div className="obm-stats">
              <Stat size="md" label="Lessons" tone="ink" value={<Counter value={go ? w.lessons : 0} animate={!was} />} />
              <Stat size="md" label="XP" tone="tele" value={<Counter value={go ? w.xp : 0} animate={!was} />} />
              <Stat size="md" label="Accuracy" tone="go" value={w.accuracy == null ? '—' : <Counter value={go ? w.accuracy : 0} animate={!was} suffix="%" />} />
              <Stat size="md" label="Streak" tone="ignite" value={<Counter value={go ? streak : 0} animate={!was} />} unit={plural(streak, 'day')} />
            </div>

            <p className="obm-best">
              <Label mono size="sm" tone="ink-2">Best day</Label>
              <span>{w.best ? `${w.best.name} · ${fmtNum(w.best.xp)} XP` : '—'}</span>
            </p>

            <Button className="obm-share" variant="secondary" size="md" full icon="share" disabled={!w.lessons && !streak}
              onClick={() => share({ kind: 'streak', data: { streak, xp: w.xp } })}>
              Share
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  )
}
