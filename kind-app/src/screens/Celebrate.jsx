import { useEffect, useState } from 'react'
import { Confetti, buzz } from './bits.jsx'
import { series, dayTitle, dayRef } from '../lib.js'

/** Full-screen day-complete celebration — the dopamine payoff. */
export default function Celebrate({ day, streak, kids, kidDone, onClose }) {
  const [burst, setBurst] = useState(1)
  useEffect(() => { buzz([30, 60, 30, 60, 80]) }, [])
  const doneKids = kids.filter((_, i) => (kidDone || []).includes(i))

  const share = () => {
    const text = `Day ${day} of ${series.title} — done! 🔥 ${streak}-day family streak.\n"${dayTitle(day)}" · ${dayRef(day)}\n\nJoin the journey: ${series.channel}`
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else { navigator.clipboard?.writeText(text); setBurst((b) => b + 1) }
  }

  return (
    <div className="celebrate" role="dialog" aria-label="Day complete">
      <Confetti fire={burst} big key={burst} />
      <div className="cel-card">
        <div className="cel-burst">🎉</div>
        <h2>Day {day} complete!</h2>
        <div className="cel-streak">🔥 <b>{streak}</b> day family streak</div>
        <p className="cel-verse">"{dayTitle(day)}" · {dayRef(day)}</p>
        {doneKids.length > 0 && (
          <div className="cel-kids">
            {doneKids.map((k) => <span key={k.name}>{k.emoji} {k.name} +3💎</span>)}
          </div>
        )}
        <button className="btn gold" onClick={share}>Share the win ↗</button>
        <button className="btn ghost" onClick={onClose}>See you tomorrow 🌙</button>
      </div>
    </div>
  )
}
