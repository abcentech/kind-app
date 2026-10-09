// ex-match bench — real match exercises from quizFor() (both series) in the states that matter.
//   http://localhost:5183/playground/ex-match.html                       interactive bench inside the real shell frame
//     ?ex=0..N   which exercise (the longest are listed first)            ?state=live|rest|partial|complete|graded|perfect
//     ?series=secrets-of-longevity  ?fx=lite
//   http://localhost:5183/playground/ex-match.html?sheet=1&ex=0&w=360     every state side by side at one width
import { useMemo, useState } from 'react'
import { mount } from './_boot.jsx'
import { mountScreen } from './_shell.jsx'
import Match from '../src/screens/lesson/ex/Match.jsx'
import { allSeries } from '../src/lib.js'
import { quizFor, gradeExercise, isAnswerComplete } from '../src/quiz.js'
import { Button } from '../src/ui/index.js'

const q = new URLSearchParams(location.search)

// every match exercise either series can set, longest text first (those are the stress cases)
const POOL = []
for (const s of allSeries) {
  for (let d = 1; d <= 31; d++) {
    let qs = []
    try { qs = quizFor(s, d) } catch (e) { console.warn('quizFor', s.id, d, e.message) }
    qs.filter((e) => e.type === 'match').forEach((ex) => POOL.push({ s, d, ex, w: ex.pairs.reduce((t, p) => t + p.left.length + p.right.length, 0) }))
  }
}
POOL.sort((a, b) => b.w - a.w)

const STATES = ['live', 'rest', 'partial', 'complete', 'graded', 'perfect']
function seed(ex, kind) {
  const ids = ex.pairs.map((p) => p.id)
  const right = Object.fromEntries(ids.map((i) => [i, i]))
  if (kind === 'perfect') return right
  if (kind === 'partial') return { [ids[0]]: ids[0], [ids[1]]: ids[2] }
  if (kind === 'complete' || kind === 'graded') return { ...right, [ids[0]]: ids[1], [ids[1]]: ids[0] }   // first two crossed: two misses
  return {}
}

function Instance({ item, kind }) {
  const { ex } = item
  const [value, setValue] = useState(() => seed(ex, kind))
  const [locked, setLocked] = useState(kind === 'graded' || kind === 'perfect')
  const graded = useMemo(() => (locked ? gradeExercise(ex, value) : null), [locked, ex, value])
  const reset = () => { setValue({}); setLocked(false) }
  return (
    <>
      <div className="pgm-eyebrow"><span>{item.s.id.split('-')[0]} · day {item.d}</span><span>{ex.kind}</span></div>
      <h2 className="pgm-prompt">{ex.prompt}</h2>
      <Match ex={ex} value={value} onChange={setValue} locked={locked} graded={graded} onSubmit={() => { if (isAnswerComplete(ex, value)) setLocked(true) }} />
      <div className="pgm-foot">
        <Button variant="secondary" size="md" silent onClick={reset}>Reset</Button>
        <Button variant={locked ? 'go' : 'primary'} size="md" silent disabled={!locked && !isAnswerComplete(ex, value)} onClick={() => setLocked(true)}>{locked ? 'Continue' : 'Check'}</Button>
      </div>
      {graded ? <p className="pgm-ans" data-testid="ans">{graded.right ? 'right' : 'wrong'} · {graded.answerText}</p> : null}
    </>
  )
}

function Bench() {
  const [i, setI] = useState(Math.min(POOL.length - 1, +q.get('ex') || 0))
  const [kind, setKind] = useState(STATES.includes(q.get('state')) ? q.get('state') : 'live')
  if (!POOL.length) return <p>no match exercises</p>
  return (
    <div className="pgm">
      {q.get('bar') === '0' ? null : (
        <div className="pgm-bar">
          <select aria-label="exercise" value={i} onChange={(e) => setI(+e.target.value)}>
            {POOL.map((p, k) => <option key={k} value={k}>{k} · {p.s.id.split('-')[0]} d{p.d} · {p.ex.pairs.length} pairs · {p.ex.kind.replace('match-', '')}</option>)}
          </select>
          <select aria-label="state" value={kind} onChange={(e) => setKind(e.target.value)}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
      )}
      <Instance key={i + kind} item={POOL[i]} kind={kind} />
    </div>
  )
}

function Sheet() {
  const item = POOL[Math.min(POOL.length - 1, +q.get('ex') || 0)]
  const w = +q.get('w') || 360
  return (
    <div className="pgm-sheet" style={{ '--cell-w': `${w}px` }}>
      {['rest', 'partial', 'complete', 'graded', 'perfect'].map((k) => (
        <div className="pgm-cell" key={k}><span className="pgm-cap">{k}</span><Instance item={item} kind={k} /></div>
      ))}
    </div>
  )
}

window.__pool = POOL.map((p) => ({ series: p.s.id, day: p.d, kind: p.ex.kind, n: p.ex.pairs.length, w: p.w }))
if (q.get('sheet')) mount(<Sheet />, { fx: q.get('fx') === 'lite' ? 'lite' : 'full' })
else mountScreen(<Bench />, { bare: true })
