import { series, calendar, todayNumber, cap } from '../lib.js'
import { useStore, daysCompleted, weekProgress } from '../store.js'

const WEEK_BG = ['#e7f0e6', '#fbf1d8', '#e8ebf5', '#fdeae2', '#f3e8f2']

export default function Journey({ goDay }) {
  const s = useStore()
  const doneSet = new Set(daysCompleted(s))
  const prog = weekProgress(s)
  const today = todayNumber()

  return (
    <section className="screen">
      <div className="jhead">
        <span className="eyebrow gold-ey">{series.title} · {series.month}</span>
        <h1>The {calendar.length}-Day Climb</h1>
        <div className="sub">"{series.treeVerse.text}" — {series.treeVerse.ref}</div>
        <div className="jprog">{prog.map((p, i) => <div key={i} className="seg5"><i style={{ width: `${p * 100}%` }} /></div>)}</div>
        <div className="jprog-lbl">{series.weeks.map((w) => <span key={w.f}>{cap(w.f)}</span>)}</div>
      </div>

      <IntroTile day={1} doneSet={doneSet} today={today} goDay={goDay} />

      {series.weeks.map((w, wi) => {
        const days = calendar.filter((d) => d.week === wi)
        const status = prog[wi] === 1 ? 'done' : days.some((d) => d.day <= today) ? 'now' : ''
        return (
          <div className="week" key={w.f}>
            <div className="wh">
              <span className="fnum" style={{ background: WEEK_BG[wi] }}>{w.emoji}</span>
              <span><span className="f">Week {wi + 1} · {w.f}</span><span className="t">{w.title}</span></span>
              {status === 'done' && <span className="done-tag">✓ COMPLETE</span>}
              {status === 'now' && <span className="done-tag now">IN PROGRESS</span>}
            </div>
            <div className="days">
              {days.map((d) => <DayDot key={d.day} d={d} doneSet={doneSet} today={today} goDay={goDay} />)}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function IntroTile({ day, doneSet, today, goDay }) {
  return (
    <div className="week">
      <div className="wh">
        <span className="fnum" style={{ background: '#e8ebf5' }}>🌅</span>
        <span><span className="f">Introduction</span><span className="t">The Gift of Long Life</span></span>
      </div>
      <div className="days">
        <DayDot d={calendar[0]} doneSet={doneSet} today={today} goDay={goDay} />
      </div>
    </div>
  )
}

function DayDot({ d, doneSet, today, goDay }) {
  let cls = 'dn'
  if (d.type === 'intro') cls += ' intro-d'
  if (doneSet.has(d.day)) cls += ' done'
  if (d.day === today) cls += ' today'
  if (d.type === 'selah' || d.type === 'review') cls += ' selah'
  if (d.type === 'celebration') cls += ' cel'
  const label = d.type === 'celebration' ? '🎉' : d.type === 'selah' ? 'S' : d.type === 'review' ? 'R' : d.day
  return (
    <button className={cls} aria-label={`Day ${d.day}`} onClick={() => goDay(d.day)}>{label}</button>
  )
}
