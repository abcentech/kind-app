// ex-blank-order · specimen sheet. Real exercises from quizFor() for both series, in the real shell frame.
//   ?only=<spec>        one specimen        ?state=rest|partial|complete|right|wrong      one state
//   ?step=<spec>        the REAL ExerciseStep (eyebrow, prompt, CHECK, verdict sheet) around the View, nothing else
//   ?fx=lite            lite mode           ?series=…  (shell only)
//   specs: sc-blank-verse sc-blank-truth sl-blank sl-blank-long sc-order9 sc-order5 sl-order sl-order-long
import { useState } from 'react'
import { mountScreen } from './_shell.jsx'
import Blank from '../src/screens/lesson/ex/Blank.jsx'
import Order from '../src/screens/lesson/ex/Order.jsx'
import { quizFor, gradeExercise, isAnswerComplete } from '../src/quiz.js'
import { getSeries } from '../src/lib.js'
import { Button } from '../src/ui/index.js'
import { ExerciseStep } from '../src/screens/lesson/Exercises.jsx'

const SC = 'stewardship-code'
const SL = 'secrets-of-longevity'
const q = new URLSearchParams(location.search)

function find(sid, type, pred = () => true) {
  const s = getSeries(sid)
  for (let d = 1; d <= s.calendar.length; d++) for (const ex of quizFor(s, d, { count: 6 })) if (ex.type === type && pred(ex)) return ex
  return null
}
const longest = (e) => Math.max(...e.words.map((w) => w.text.length))
const SPECS = [
  ['sc-blank-verse', find(SC, 'blank', (e) => e.cite)],
  ['sc-blank-truth', find(SC, 'blank', (e) => !e.cite)],
  ['sl-blank', find(SL, 'blank', (e) => e.cite)],
  ['sl-blank-long', find(SL, 'blank', (e) => e.options.some((o) => o.text.length >= 11))],
  ['sc-order9', find(SC, 'order', (e) => e.words.length === 9)],
  ['sc-order5', find(SC, 'order', (e) => e.words.length <= 6)],
  ['sl-order', find(SL, 'order', (e) => e.cite && e.words.length >= 6)],
  ['sl-order-long', find(SL, 'order', (e) => longest(e) >= 11)],
].filter(([, ex]) => ex)

// Yoruba diacritics (stacked marks, dot-below + tone): synthetic, to prove nothing clips or collapses
const yoOpt = (t, i) => ({ id: 'abcd'[i], text: t })
SPECS.push(
  ['yo-blank', { id: 'yo:1:blank', type: 'blank', prompt: 'Complete the verse', cite: 'Orin Dafidi 24:1', xp: 10, explain: '',
    before: 'Ti Ọlọ́run ni ayé, ati ', after: ' rẹ̀, ẹ̀mí ṣe àṣeyọrí.', options: ['ẹ̀kúnrẹ́rẹ́', 'ọ̀rọ̀', 'Ọ̀gá', 'ṣíṣẹ́'].map(yoOpt), answer: 'a' }],
  ['yo-order', { id: 'yo:1:order', type: 'order', prompt: 'Put the declaration in order', cite: '', xp: 10, explain: '',
    words: ['Ọlọ́run', 'ni', 'ẹ̀mí', 'mi,', 'Ọ̀gá', 'ṣíṣẹ́', 'àṣeyọrí', 'wà'].map((t, i) => ({ id: 'w' + (i + 1), text: t })),
    answer: ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'] }],
)

function valuesFor(ex, state) {
  if (ex.type === 'blank') {
    const bad = ex.options.find((o) => o.id !== ex.answer).id
    return { rest: null, partial: bad, complete: ex.answer, right: ex.answer, wrong: bad }[state]
  }
  const ids = ex.words.map((w) => w.id)
  const swapped = ex.answer.slice()
  ;[swapped[1], swapped[swapped.length - 2]] = [swapped[swapped.length - 2], swapped[1]]
  return { rest: [], partial: ids.slice(0, 4), complete: ids, right: ex.answer.slice(), wrong: swapped }[state]
}

function Demo({ name, ex, state }) {
  const View = ex.type === 'blank' ? Blank : Order
  const [value, setValue] = useState(() => valuesFor(ex, state))
  const [graded, setGraded] = useState(() => (state === 'right' || state === 'wrong' ? gradeExercise(ex, valuesFor(ex, state)) : null))
  const [n, setN] = useState(0)
  const check = () => { if (!graded && isAnswerComplete(ex, value)) setGraded(gradeExercise(ex, value)) }
  const reset = () => { setGraded(null); setValue(ex.type === 'blank' ? null : []); setN((x) => x + 1) }
  return (
    <section className="pg-demo" data-spec={name} data-state={state}>
      <p className="pg-meta"><span>{name} · <b>{state}</b></span><span>{ex.type} · {ex.id.split(':').slice(0, 2).join(' d')}</span></p>
      <View key={n} ex={ex} value={value} onChange={setValue} locked={!!graded} graded={graded} onSubmit={check} />
      <div className="pg-bar">
        <Button variant="primary" full disabled={!!graded || !isAnswerComplete(ex, value)} onClick={check}>Check</Button>
        <Button variant="secondary" onClick={reset}>Reset</Button>
      </div>
    </section>
  )
}

const STATES = ['rest', 'partial', 'complete', 'right', 'wrong']
function Sheet() {
  const only = q.get('only')
  const one = q.get('state')
  const specs = SPECS.filter(([k]) => !only || k === only)
  return (
    <div>
      {only ? null : (
        <>
          <h1 className="pg-title">Fill the gap · <b>Order</b></h1>
          <p className="pg-note">{SPECS.length} real exercises · both series · rest / partial / complete / right / wrong</p>
        </>
      )}
      {specs.flatMap(([k, ex]) => (one ? [one] : STATES).map((st) => <Demo key={k + st} name={k} ex={ex} state={st} />))}
    </div>
  )
}

function Step({ spec }) {
  const hit = SPECS.find(([k]) => k === spec)
  if (!hit) return <p className="pg-note">no such spec</p>
  return <ExerciseStep ex={hit[1]} isRetry={false} index={1} total={4} onGraded={(r) => console.log('[graded]', JSON.stringify(r))} onNext={() => console.log('[next]')} />
}

const step = q.get('step')
mountScreen(step ? <Step spec={step} /> : <Sheet />, { bare: true })
