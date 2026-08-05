import { dayEyebrow, dayHookline, dayInfo, dayLabel, fmtDay, greeting, isLive, todayNumber } from '../lib.js'
import { doneDays, isDayDone, missedDays, unlockedCards, useStore } from '../store.js'
import { Icon } from '../icons.jsx'
import { Countdown } from './bits.jsx'

/** One decision above the fold; everything else is a glance. */
export default function Home({ s, openDay, goVault }) {
  const st = useStore()
  const today = todayNumber(s)
  const d = dayInfo(s, today)
  const live = isLive(s)
  const doneToday = isDayDone(st, s.id, today)
  const missed = missedDays(st, s.id, today)
  const held = unlockedCards(st, s.id)
  const done = doneDays(st, s.id)
  const tone = 'tone' + ((d.week ?? 0) + 1)

  return (
    <section className="screen">
      <div className="hdr">
        <div className="hdr-l">
          <span className="kicker">{greeting()}{st.name ? ', ' + st.name : ''}</span>
          <h1 className="title">{s.title}</h1>
          <p className="dek">{s.month} {s.year} · {s.subtitle}</p>
        </div>
        {st.streak > 0 && (
          <div className="streak" title="Day streak"><Icon.flame /><b>{st.streak}</b></div>
        )}
      </div>

      <button className={'lead ' + tone + (doneToday ? ' done' : '')} onClick={() => openDay(today)}>
        <div className="lead-top">
          <span className="lead-eyebrow">{dayEyebrow(s, today)}</span>
          <span className="lead-day">{live ? 'TODAY' : fmtDay(s, today).toUpperCase()} · {today}/{s.calendar.length}</span>
        </div>
        <h2>{dayLabel(s, today)}</h2>
        <p>{dayHookline(s, today)}</p>
        <span className="lead-cta">
          {doneToday ? 'Read it again' : 'Begin'}<Icon.chevron />
        </span>
      </button>

      {live && new Date().getHours() < 20 && d.type !== 'selah' && (
        <div className="countdown">
          <b><Countdown /></b>
          <span>until tonight’s premiere</span>
          <a href={s.channel + '/streams'} target="_blank" rel="noopener">Remind me</a>
        </div>
      )}

      <div className="week-rail">
        {window7(s, today).map((n) => (
          <button key={n} className={'wr' + (isDayDone(st, s.id, n) ? ' on' : '') + (n === today ? ' now' : '') + (n > today ? ' ahead' : '')}
            onClick={() => openDay(n)} title={dayLabel(s, n)}>
            <i>{new Date(s.year, s.monthNum - 1, n).toLocaleDateString('en-GB', { weekday: 'narrow' })}</i>
            <b>{n}</b>
          </button>
        ))}
      </div>

      {missed.length > 0 && (
        <>
          <p className="group-t">Unfinished · nothing is lost</p>
          <div className="group">
            {missed.slice(-4).map((n) => (
              <button key={n} className="row" onClick={() => openDay(n)}>
                <span className="row-m"><b>{dayLabel(s, n)}</b><small>{fmtDay(s, n)} · {dayEyebrow(s, n)}</small></span>
                <span className="row-a"><Icon.chevron /></span>
              </button>
            ))}
          </div>
        </>
      )}

      <button className="vault-tease" onClick={goVault}>
        <div className="vt-head">
          <b>{held.length}</b><span>of {s.codes.length} passes</span>
          <span className="row-a"><Icon.chevron /></span>
        </div>
        <div className="pips">
          {s.codes.map((c) => (
            <i key={c.no} className={(held.includes(c.no) ? 'got' : '') + (c.rare ? ' gold' : '')} />
          ))}
        </div>
      </button>

      <div className="figures">
        <div><b>{done.length}</b><span>days kept</span></div>
        <div><b>{st.best}</b><span>best streak</span></div>
        <div><b>{Math.round((done.length / s.calendar.length) * 100)}%</b><span>of the month</span></div>
      </div>
    </section>
  )
}

function window7(s, today) {
  const start = Math.max(1, Math.min(today - 3, s.calendar.length - 6))
  return Array.from({ length: Math.min(7, s.calendar.length) }, (_, i) => start + i)
}
