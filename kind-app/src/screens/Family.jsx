import { useState } from 'react'
import { series, calendar, todayNumber, cap, dayInfo } from '../lib.js'
import { useStore, daysCompleted, perfectWeeks, setFamilyName } from '../store.js'

const BADGES = [
  { icon: '🌅', name: 'First Step', test: (done) => done.includes(1) },
  { icon: '📖', name: 'First 7 Days', test: (done) => done.length >= 7 },
  ...series.weeks.map((w, wi) => ({
    icon: w.emoji, name: cap(w.f),
    test: (done) => calendar.filter((d) => d.week === wi).every((d) => done.includes(d.day)),
  })),
  { icon: '🏁', name: 'Finisher', test: (done) => done.length >= calendar.length },
]

export default function Family({ goJourney }) {
  const s = useStore()
  const done = daysCompleted(s)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(s.familyName)
  const today = todayNumber()
  const nextSelah = calendar.find((d) => d.day >= today && (d.type === 'selah' || d.type === 'review'))

  return (
    <section className="screen">
      <div className="fhead">
        <span className="eyebrow">Parent Corner</span>
        {editing ? (
          <form className="namef" onSubmit={(e) => { e.preventDefault(); setFamilyName(name.trim()); setEditing(false) }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Adeyemi" autoFocus maxLength={24} />
            <button type="submit">Save</button>
          </form>
        ) : (
          <h1 onClick={() => setEditing(true)} title="Tap to edit">
            {s.familyName ? `The ${s.familyName} Family` : 'Your Family'} <span className="pencil">✎</span>
          </h1>
        )}
        <div className="sub">Raising goDs, building nations — one declaration at a time.</div>
      </div>

      <div className="fcard">
        <span className="eyebrow">This month together</span>
        <div className="bigstats">
          <div><b>🔥 {s.streak}</b><span>day streak</span></div>
          <div><b>{done.length}<i>/{calendar.length}</i></b><span>days done</span></div>
          <div><b>⭐ {perfectWeeks(s)}</b><span>perfect weeks</span></div>
          <div><b>💎 {s.gems}</b><span>gems earned</span></div>
        </div>
      </div>

      <div className="fcard">
        <span className="eyebrow">Badge shelf</span>
        <div className="badges">
          {BADGES.map((b) => (
            <div key={b.name} className={'badge' + (b.test(done) ? '' : ' locked')}>
              <div className="bic">{b.icon}</div>{b.name}
            </div>
          ))}
        </div>
      </div>

      {nextSelah && (
        <div className="fcard">
          <span className="eyebrow">
            {nextSelah.day === today ? 'Selah — today!' : `Selah — Day ${nextSelah.day}`}
          </span>
          <p className="fp">No new episode that day. Review the week together, check memory verses, and do one family activity.</p>
          <button className="btn ghost" onClick={goJourney}>See it on the journey</button>
        </div>
      )}

      <div className="fcard">
        <span className="eyebrow">Keep the rhythm</span>
        <p className="fp">The K.I.N.D. premiere goes live every night at 8:00 PM WAT — gather the family, then open the app to walk through the day together.</p>
        <a className="btn ghost" href={series.channel} target="_blank" rel="noopener noreferrer">Visit our YouTube channel ↗</a>
      </div>
    </section>
  )
}
