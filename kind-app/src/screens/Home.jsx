import { dayEyebrow, dayHookline, dayInfo, dayLabel, fmtDay, greeting, isLive, todayNumber, weekOf } from '../lib.js'
import { doneDays, isDayDone, missedDays, unlockedCards, useStore } from '../store.js'
import { CountUp, Countdown, Stars } from './bits.jsx'

/**
 * Home is deliberately one decision: open today. Everything else is a glance.
 */
export default function Home({ s, openDay, goVault, goPath }) {
  const st = useStore()
  const today = todayNumber(s)
  const d = dayInfo(s, today)
  const live = isLive(s)
  const doneToday = isDayDone(st, s.id, today)
  const missed = missedDays(st, s.id, today).slice(-3)
  const cards = unlockedCards(st, s.id)
  const done = doneDays(st, s.id)
  const wk = weekOf(s, d)
  const premiered = new Date().getHours() >= 20

  return (
    <section className="screen home">
      <header className="h-top">
        <div>
          <span className="eyebrow">{greeting()}{st.name ? ', ' + st.name : ''}</span>
          <h1>{s.title}</h1>
          <p className="sub">{s.month} {s.year} · {s.subtitle}</p>
        </div>
        <button className="streakchip" onClick={goPath} title="Your streak">
          <b>🔥 <CountUp value={st.streak} /></b><span>day{st.streak === 1 ? '' : 's'}</span>
        </button>
      </header>

      <button className={'todaycard w' + ((d.week ?? 0) + 1) + (doneToday ? ' done' : '')}
        onClick={() => openDay(today)}>
        <Stars n={14} />
        <span className="t-eyebrow">{live ? 'Today' : fmtDay(s, today)} · Day {today} of {s.calendar.length}</span>
        <h2>{dayLabel(s, today)}</h2>
        <p className="t-hook">{dayHookline(s, today)}</p>
        <div className="t-foot">
          <span className="t-tag">{wk ? wk.emoji + ' ' + dayEyebrow(s, today) : dayEyebrow(s, today)}</span>
          <span className="t-cta">{doneToday ? 'Done today ✓' : 'Start →'}</span>
        </div>
      </button>

      {live && !premiered && d.type !== 'selah' && (
        <div className="premiere">
          <span>Tonight’s episode premieres 8:00 PM WAT</span>
          <Countdown />
          <a className="linkbtn" href={s.channel + '/streams'} target="_blank" rel="noopener">Set a reminder on YouTube ↗</a>
        </div>
      )}

      {missed.length > 0 && (
        <div className="catchup">
          <span className="eyebrow">Catch up — nothing is lost</span>
          <div className="chips">
            {missed.map((n) => (
              <button key={n} className="chip" onClick={() => openDay(n)}>
                Day {n} · {dayLabel(s, n).slice(0, 22)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="weekstrip">
        <span className="eyebrow">This week</span>
        <div className="ws-row">
          {weekWindow(s, today).map((n) => (
            <button key={n} className={'ws' + (isDayDone(st, s.id, n) ? ' on' : '') + (n === today ? ' now' : '') + (n > today ? ' future' : '')}
              onClick={() => openDay(n)} title={dayLabel(s, n)}>
              <b>{n}</b>
              <i>{new Date(s.year, s.monthNum - 1, n).toLocaleDateString('en-GB', { weekday: 'narrow' })}</i>
            </button>
          ))}
        </div>
      </div>

      <button className="vaultrow" onClick={goVault}>
        <span className="eyebrow">The code vault</span>
        <div className="vr-line">
          <b>{cards.length}<i>/{s.codes.length}</i></b>
          <div className="minicards">
            {s.codes.slice(0, 10).map((c) => (
              <i key={c.no} className={'mc' + (cards.includes(c.no) ? ' got' : '') + (c.rare ? ' rare' : '')} />
            ))}
          </div>
          <span className="t-cta">Open →</span>
        </div>
        <p className="sub">{cards.length ? 'One card for every day you finish.' : 'Finish today to unlock your first code card.'}</p>
      </button>

      <div className="statrow">
        <div><b><CountUp value={done.length} /></b><span>days done</span></div>
        <div><b><CountUp value={st.gems} /></b><span>gems</span></div>
        <div><b><CountUp value={st.best} /></b><span>best streak</span></div>
      </div>
    </section>
  )
}

function weekWindow(s, today) {
  const start = Math.max(1, Math.min(today - 3, s.calendar.length - 6))
  return Array.from({ length: Math.min(7, s.calendar.length) }, (_, i) => start + i)
}
