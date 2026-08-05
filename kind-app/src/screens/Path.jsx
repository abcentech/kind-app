import { dayEyebrow, dayLabel, fmtDay, title as sentence, todayNumber } from '../lib.js'
import { isDayDone, useStore, weekProgress } from '../store.js'
import { Icon } from '../icons.jsx'

/** The month as chapters and hairline rows — a table of contents, not a map. */
export default function Path({ s, openDay }) {
  const st = useStore()
  const today = todayNumber(s)
  const prog = weekProgress(st, s.id)
  const loose = s.calendar.filter((d) => d.week == null)

  return (
    <section className="screen">
      <div className="hdr">
        <div className="hdr-l">
          <span className="kicker">{s.month} {s.year}</span>
          <h1 className="title">The journey</h1>
        </div>
      </div>

      <p className="pull">“{s.themeScripture.text}”</p>
      <span className="pull-c">{s.themeScripture.ref}</span>

      {s.weeks.map((w, wi) => (
        <section className={'chapter tone' + (wi + 1)} key={wi}>
          <div className="chapter-h">
            <span className="ord">{String(wi + 1).padStart(2, '0')}</span>
            <h2>The {sentence(w.f)} Code</h2>
            <em>{Math.round(prog[wi] * 100)}%</em>
          </div>
          <p>{w.title}</p>
          <div className="meter"><i style={{ width: `${prog[wi] * 100}%` }} /></div>
          <div className="group">
            {s.calendar.filter((d) => d.week === wi).map((d) => <Row key={d.day} s={s} d={d} today={today} openDay={openDay} />)}
          </div>
        </section>
      ))}

      {loose.length > 0 && (
        <section className="chapter">
          <div className="chapter-h"><span className="ord">—</span><h2>Around the month</h2></div>
          <p>The launch, the Selah days and the finale</p>
          <div className="group">
            {loose.map((d) => <Row key={d.day} s={s} d={d} today={today} openDay={openDay} />)}
          </div>
        </section>
      )}
    </section>
  )
}

function Row({ s, d, today, openDay }) {
  const st = useStore()
  const done = isDayDone(st, s.id, d.day)
  const state = done ? ' is-done' : d.day === today ? ' is-now' : d.day > today ? ' is-ahead' : ''
  return (
    <button className={'row inset' + state} onClick={() => openDay(d.day)}>
      <span className="tick">{done ? <Icon.check /> : <span>{d.day}</span>}</span>
      <span className="row-m">
        <b>{dayLabel(s, d.day)}</b>
        <small>{fmtDay(s, d.day)} · {dayEyebrow(s, d.day)}{d.videoId ? ' · video' : ''}</small>
      </span>
      <span className="row-a">{d.day === today ? 'Today' : <Icon.chevron />}</span>
    </button>
  )
}
