// complete-streak playground: the Rings and Streak beats in the real shell frame, fed hand-built finishDay results.
//   ?v=rings-3|rings-1|rings-2|first|streak6|week7|shield-used|shield-xp|comeback|lost|m31|newbest
//   &beat=rings|streak|shield|milestone   (default: the variant's own)   &bar=0 hides the switcher   &fx=lite
import { useState } from 'react'
import { mountScreen } from './_shell.jsx'
import { Horizon } from '../src/art/index.js'
import Rings from '../src/screens/complete/beats/Rings.jsx'
import Streak from '../src/screens/complete/beats/Streak.jsx'
import { fx } from '../src/fx/fx.js'
import { sound } from '../src/fx/sound.js'
import { haptic } from '../src/fx/haptics.js'
import './complete-streak.css'

// Instrumentation for the verification scripts: every sound / haptic / fx call lands in window.__log with its time.
const T = () => Math.round(performance.now())
const spy = (obj, name, tag) => { const f = obj[name]; obj[name] = (...a) => { (window.__log = window.__log || []).push([tag + (typeof a[0] === 'string' ? ':' + a[0] : ''), T()]); return f.apply(obj, a) } }
spy(sound, 'play', 'sound'); ;['success', 'heavy', 'tap'].forEach((n) => spy(haptic, n, 'haptic.' + n)); ;['sparks', 'ignite', 'pop', 'celebrate', 'confetti'].forEach((n) => spy(fx, n, 'fx.' + n))

const q = new URLSearchParams(location.search)
const NAME = { lesson: 'Lesson', xp: 'XP', right: 'Accuracy' }
const ring = (id, now, goal) => ({ id, label: NAME[id], now, goal, value: Math.min(1, now / goal), done: now >= goal })
const rings = (l, x, r) => [ring('lesson', l, 1), ring('xp', x, 40), ring('right', r, 3)]
const wk = (p) => p.split('').map((c, i) => ({
  key: `2026-08-${String(6 + i).padStart(2, '0')}`, label: 'SMTWTFS'[(i + 4) % 7], lessons: c === 'f' ? 1 : 0, flame: c === 'f', save: c === 's' ? 'shield' : null, rest: c === 'r', today: i === 6,
}))
const streak = (o) => ({ from: 5, to: 6, extended: true, shieldUsed: false, graced: false, shieldEarned: null, shields: 1, milestone: null, broke: false, lostFrom: 0, best: 12, newBest: false, comeback: false, ...o })
const base = (o) => ({
  seriesId: 'stewardship-code', day: 12, date: '2026-08-12', time: '19:00', again: false, first: false, right: 4, asked: 4, perfect: true,
  xp: { lesson: 40, bonus: 30, drop: 0, total: 70, lines: [{ id: 'complete', xp: 20 }, { id: 'perfect', xp: 10 }] },
  rings: { before: rings(0, 0, 0), after: rings(1, 40, 3), closed: ['lesson', 'xp', 'right'] },
  goal: { xp: 40, goal: 40, met: true, justMet: true }, streak: streak({}), ...o,
})

const V = {
  'rings-3': { beat: 'rings', result: base({}) },
  'rings-1': { beat: 'rings', result: base({ rings: { before: rings(0, 22, 1), after: rings(1, 36, 2), closed: ['lesson'] }, goal: { xp: 40, goal: 40, met: false, justMet: false } }) },
  'rings-2': { beat: 'rings', result: base({ rings: { before: rings(1, 18, 1), after: rings(1, 40, 3), closed: ['xp', 'right'] } }) },
  first: { beat: 'streak', week: wk('......f'), result: base({ first: true, streak: streak({ from: 0, to: 1, best: 1 }) }) },
  streak6: { beat: 'streak', week: wk('.ffffff'), result: base({ streak: streak({}) }) },
  week7: { beat: 'streak', week: wk('fffffff'), result: base({ streak: streak({ from: 6, to: 7, shieldEarned: 'shield', shields: 2, milestone: 7, best: 7 }), xp: { lesson: 40, bonus: 50, drop: 0, total: 90, lines: [{ id: 'milestone', xp: 30 }] } }) },
  'shield-used': { beat: 'shield', week: wk('ffffsff'), result: base({ streak: streak({ from: 12, to: 13, shieldUsed: true, shields: 0, best: 12, newBest: true }) }) },
  'shield-xp': { beat: 'shield', week: wk('fffffff'), result: base({ streak: streak({ from: 13, to: 14, shieldEarned: 'xp', shields: 2, milestone: 14, best: 14 }), xp: { lesson: 40, bonus: 75, drop: 0, total: 115, lines: [{ id: 'shield-overflow', xp: 25 }, { id: 'milestone', xp: 50 }] } }) },
  comeback: { beat: 'streak', week: wk('..r..rf'), result: base({ streak: streak({ from: 0, to: 1, broke: true, lostFrom: 9, best: 9, comeback: true }) }) },
  lost: { beat: 'streak', week: wk('.....rf'), result: base({ streak: streak({ from: 0, to: 1, broke: true, lostFrom: 12, best: 12 }) }) },
  m31: { beat: 'milestone', week: wk('fffffff'), result: base({ streak: streak({ from: 30, to: 31, milestone: 31, best: 31, newBest: true }), xp: { lesson: 40, bonus: 120, drop: 0, total: 160, lines: [{ id: 'milestone', xp: 120 }] } }) },
  newbest: { beat: 'streak', week: wk('fffffff'), result: base({ streak: streak({ from: 20, to: 21, best: 21, newBest: true }) }) },
}

function Stage() {
  const [v, setV] = useState(q.get('v') || 'rings-3')
  const [beat, setBeat] = useState(q.get('beat') || '')
  const [run, setRun] = useState(0)
  const spec = V[v] || V['rings-3']
  window.__replay = () => { window.__nexts = []; window.__log = []; window.__t0 = T(); setRun((n) => n + 1) }
  const b = beat || spec.beat
  const next = () => { (window.__nexts = window.__nexts || []).push([v, b, Math.round(performance.now())]); console.log('[beat] next()', v, b) }
  const Beat = b === 'rings' ? Rings : Streak   // beat=composite: the Streak beat with no beat id, as the shell may call it
  return (
    <div className="pg-stage">
      <Horizon variant="limb" className="pg-bg" />
      <div className="pg-top"><span>Orbit insertion · {b}</span><button type="button" onClick={next}>Skip</button></div>
      <Beat key={v + b + run} result={spec.result} week={spec.week} beat={b === 'rings' || b === 'composite' ? undefined : b} active next={next} share={(r) => console.log('[share]', JSON.stringify(r))} />
      {q.get('bar') === '0' ? null : (
        <div className="pg-bar">
          <select value={v} onChange={(e) => { setV(e.target.value); setBeat('') }} aria-label="variant">{Object.keys(V).map((k) => <option key={k}>{k}</option>)}</select>
          <select value={beat} onChange={(e) => setBeat(e.target.value)} aria-label="beat"><option value="">own beat</option>{['rings', 'streak', 'shield', 'milestone', 'composite'].map((k) => <option key={k}>{k}</option>)}</select>
          <button type="button" onClick={() => setRun((n) => n + 1)}>replay</button>
        </div>
      )}
    </div>
  )
}

mountScreen(<Stage />, { bare: true })
