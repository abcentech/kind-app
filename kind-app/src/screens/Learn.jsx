import { useEffect, useRef, useState } from 'react'
import { cap, dayLabel, fmtDay, todayNumber } from '../lib.js'
import { isDayDone, useStore, weekProgress } from '../store.js'
import { Icon } from '../icons.jsx'
import { buzz } from './bits.jsx'

/**
 * The trail. Every day of the month is a node on a winding path, grouped into
 * units by the month's four codes. Today's node bobs and wears a START bubble;
 * days ahead are locked. Tapping a node opens its lesson.
 */
export default function Learn({ s, openDay }) {
  const st = useStore()
  const today = todayNumber(s)
  const prog = weekProgress(st, s.id)
  const [toast, setToast] = useState('')
  const current = useRef(null)

  useEffect(() => {
    current.current?.scrollIntoView({ block: 'center', behavior: 'auto' })
  }, [])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(id)
  }, [toast])

  const tap = (d, locked) => {
    if (locked) { buzz(24); setToast(`Day ${d.day} unlocks on ${fmtDay(s, d.day)}.`); return }
    buzz(10)
    openDay(d.day)
  }

  return (
    <>
      <Hud s={s} />
      <div className="trail">
        {sections(s).map((sec, si) => (
          <section key={si} style={{ '--unit': `var(--u${sec.unit + 1})`, '--unit-e': `var(--u${sec.unit + 1}-e)` }}>
            <header className="unit-banner">
              <div>
                <small>Unit {sec.unit + 1}</small>
                <b>{sec.title}</b>
              </div>
              <span className="ub-r">
                <Icon.book />{Math.round((prog[sec.unit] || 0) * 100)}%
              </span>
            </header>

            <div className="nodes">
              {sec.days.map((d, i) => {
                const done = isDayDone(st, s.id, d.day)
                const isNow = d.day === today
                const locked = d.day > today
                const finale = d.type === 'celebration'
                return (
                  <div key={d.day}
                    ref={isNow ? current : null}
                    className={'node-slot' + (isNow ? ' current' : '') + (finale ? ' trophy' : '')}
                    style={{ transform: `translateX(${sway(i)}px)` }}>
                    {isNow && !done && <span className="bubble">Start</span>}
                    {isNow && <span className="ring" />}
                    <button className={'node' + (done ? ' done' : '') + (locked ? ' locked' : '') + (d.type === 'selah' ? ' rest' : '')}
                      onClick={() => tap(d, locked)}
                      aria-label={`Day ${d.day}: ${dayLabel(s, d.day)}${locked ? ' (locked)' : ''}`}>
                      <Mark d={d} done={done} locked={locked} />
                    </button>
                    <span className="node-cap">{isNow ? dayLabel(s, d.day) : `Day ${d.day}`}</span>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
      {toast && <div className="locked-toast">{toast}</div>}
    </>
  )
}

/** The path leans left and right so it reads as a journey, not a list. */
const SWAY = [0, 38, 62, 38, 0, -38, -62, -38]
const sway = (i) => SWAY[i % SWAY.length]

function Mark({ d, done, locked }) {
  if (locked) return <Icon.lock />
  if (done) return <Icon.check />
  if (d.type === 'celebration') return <Icon.trophy />
  if (d.type === 'intro') return <Icon.flag />
  if (d.type === 'selah') return <Icon.star />
  return <b>{d.day}</b>
}

/** Group the calendar into units, carrying stray days into the unit around them. */
function sections(s) {
  const out = []
  let unit = -1
  let last = 0
  for (const d of s.calendar) {
    const u = d.week ?? last
    last = u
    if (u !== unit) {
      unit = u
      out.push({ unit: u, title: s.weeks[u] ? `The ${cap(s.weeks[u].f)} Code` : s.title, days: [] })
    }
    out[out.length - 1].days.push(d)
  }
  return out
}

/* ---- the persistent HUD ------------------------------------------------- */
export function Hud({ s }) {
  const st = useStore()
  const held = (st.series[s.id]?.cards || []).length
  return (
    <div className="hud">
      <span className={'hud-i streak' + (st.streak ? '' : ' dim')}><Icon.flame /><b>{st.streak}</b></span>
      <span className="hud-i xp"><Icon.bolt /><b>{st.xp}</b></span>
      <span className="hud-i pass"><Icon.vault /><b>{held}</b></span>
      <span className="hud-sp" />
    </div>
  )
}
