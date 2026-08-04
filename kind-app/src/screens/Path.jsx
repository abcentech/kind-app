import { cap, dayEyebrow, dayLabel, dayInfo, todayNumber } from '../lib.js'
import { isDayDone, useStore, weekProgress } from '../store.js'

/** The whole month at a glance — four codes, 31 days, honest state on each. */
export default function Path({ s, openDay }) {
  const st = useStore()
  const today = todayNumber(s)
  const prog = weekProgress(st, s.id)

  const groups = s.weeks.map((w, wi) => ({ w, wi, days: s.calendar.filter((d) => d.week === wi) }))
  const loose = s.calendar.filter((d) => d.week == null)

  return (
    <section className="screen path">
      <header className="h-top">
        <div>
          <span className="eyebrow">{s.month} {s.year}</span>
          <h1>The journey</h1>
          <p className="sub">{s.tagline}</p>
        </div>
      </header>

      <div className="themeverse">
        <blockquote>“{s.themeScripture.text}”</blockquote>
        <cite>{s.themeScripture.ref}</cite>
      </div>

      {groups.map(({ w, wi, days }) => (
        <div className={'weekblock w' + (wi + 1)} key={wi}>
          <div className="wb-head">
            <span className="wb-emoji">{w.emoji}</span>
            <div>
              <h2>The {cap(w.f)} Code</h2>
              <p>{w.title}</p>
            </div>
            <span className="wb-pct">{Math.round(prog[wi] * 100)}%</span>
          </div>
          {w.question && <p className="wb-q">“{w.question}”</p>}
          <div className="bar"><i style={{ width: `${prog[wi] * 100}%` }} /></div>
          <div className="daylist">
            {days.map((d) => <DayRow key={d.day} s={s} d={d} today={today} openDay={openDay} />)}
          </div>
        </div>
      ))}

      {loose.length > 0 && (
        <div className="weekblock">
          <div className="wb-head"><span className="wb-emoji">🕊️</span><div><h2>Around the month</h2><p>Launch, Selah and the finale</p></div></div>
          <div className="daylist">
            {loose.map((d) => <DayRow key={d.day} s={s} d={d} today={today} openDay={openDay} />)}
          </div>
        </div>
      )}
    </section>
  )
}

function DayRow({ s, d, today, openDay }) {
  const st = useStore()
  const done = isDayDone(st, s.id, d.day)
  const future = d.day > today
  return (
    <button className={'dayrow' + (done ? ' done' : '') + (d.day === today ? ' now' : '') + (future ? ' future' : '')}
      onClick={() => openDay(d.day)}>
      <span className="dr-n">{done ? '✓' : d.day}</span>
      <span className="dr-meta">
        <b>{dayLabel(s, d.day)}</b>
        <small>{dayEyebrow(s, d.day)}{d.videoId ? ' · 🎬 video' : ''}</small>
      </span>
      {d.day === today && <span className="dr-tag">Today</span>}
    </button>
  )
}
