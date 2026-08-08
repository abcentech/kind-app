import { todayNumber } from '../lib.js'
import { doneDays, questState, todayTally, useStore } from '../store.js'
import { Icon } from '../icons.jsx'
import { Hud } from './Learn.jsx'

/** Today's three quests, and the month-long one underneath. */
export default function Quests({ s, openDay }) {
  const st = useStore()
  const quests = questState(st)
  const tally = todayTally(st)
  const today = todayNumber(s)
  const done = doneDays(st, s.id)
  const all = quests.every((q) => q.done)

  return (
    <>
      <Hud s={s} />
      <section className="screen">
        <span className="kicker">Resets at midnight</span>
        <h1 className="title">Daily quests</h1>

        <div className="card" style={{ marginTop: 16 }}>
          {quests.map((q) => (
            <div className={'quest' + (q.done ? ' done' : '')} key={q.id}>
              <span className="chest">{q.done ? <Icon.check /> : <Icon.chest />}</span>
              <div className="quest-m">
                <b>{q.label}</b>
                <div className="qbar">
                  <i style={{ width: `${(q.at / q.goal) * 100}%` }} />
                  <span>{q.at} / {q.goal}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {all && (
          <div className="card sunk" style={{ textAlign: 'center' }}>
            <b style={{ fontSize: 18 }}>All three cleared today.</b>
            <p className="dek">{tally.xp} XP earned since midnight. Come back tomorrow.</p>
          </div>
        )}

        <h2 style={{ fontSize: 20, margin: '26px 0 12px' }}>This month</h2>
        <div className="card">
          <div className="quest">
            <span className={'chest' + (done.length >= s.calendar.length ? ' done' : '')}><Icon.trophy /></span>
            <div className="quest-m">
              <b>Finish all {s.calendar.length} days of {s.title}</b>
              <div className="qbar">
                <i style={{ width: `${(done.length / s.calendar.length) * 100}%` }} />
                <span>{done.length} / {s.calendar.length}</span>
              </div>
            </div>
          </div>
          <div className="quest">
            <span className="chest"><Icon.vault /></span>
            <div className="quest-m">
              <b>Collect every pass</b>
              <div className="qbar">
                <i style={{ width: `${((st.series[s.id]?.cards || []).length / s.codes.length) * 100}%` }} />
                <span>{(st.series[s.id]?.cards || []).length} / {s.codes.length}</span>
              </div>
            </div>
          </div>
        </div>

        {!quests[0].done && (
          <button className="btn wide grass" onClick={() => openDay(today)} style={{ marginTop: 6 }}>
            Start today’s lesson
          </button>
        )}
      </section>
    </>
  )
}
