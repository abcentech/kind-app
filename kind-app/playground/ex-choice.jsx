// ex-choice specimen sheet — Choice + TrueFalse on real quizFor() exercises, both series, every state.
//   http://localhost:5183/playground/ex-choice.html            specimen sheet (rest · selected · right · wrong) + stress cases
//   http://localhost:5183/playground/ex-choice.html?live=1     one interactive exercise in the real shell frame (CHECK → graded → CONTINUE)
//   &fx=lite  lite render   &i=3  start the live run at exercise 3   &type=tf|choice  filter the live run
import { useMemo, useState } from 'react'
import { mount } from './_boot.jsx'
import { mountScreen } from './_shell.jsx'
import { allSeries } from '../src/lib.js'
import { quizFor, gradeExercise, emptyResponse, isAnswerComplete } from '../src/quiz.js'
import { Button, Label } from '../src/ui/index.js'
import Choice from '../src/screens/lesson/ex/Choice.jsx'
import TrueFalse from '../src/screens/lesson/ex/TrueFalse.jsx'

const q = new URLSearchParams(location.search)
const FX = q.get('fx') === 'lite' ? 'lite' : 'full'
const VIEWS = { choice: Choice, tf: TrueFalse }

/* ── real exercises ─────────────────────────────────────────────────────── */
const textLen = (ex) => (ex.type === 'tf' ? ex.statement.length : ex.options.reduce((n, o) => n + o.text.length, 0))
function collect(series) {
  const out = []
  for (let d = 1; d <= series.calendar.length; d++) {
    let list = []
    try { list = quizFor(series, d, { count: 6 }) } catch { /* a day without a lesson */ }
    for (const ex of list) if (VIEWS[ex.type]) out.push({ ...ex, _series: series.title, _day: d })
  }
  return out
}
const pickSpecimens = (all, type) => {
  const of = all.filter((e) => e.type === type)
  if (!of.length) return []
  const longest = of.reduce((a, b) => (textLen(b) > textLen(a) ? b : a))
  return [of[0], longest].filter((e, i, a) => a.indexOf(e) === i)
}
const ALL = allSeries.map((s) => ({ s, ex: collect(s) }))

/* ── hand-made stress cases (docs: 4 options x 3 lines at 360x640, Yoruba names, unbroken tokens) ─────────────────── */
const LONG = 'A steward does not own the resources entrusted to him but manages them faithfully for the Owner, who will one day ask for an account.'
const STRESS = [
  { id: 'stress-3', type: 'choice', prompt: 'Four options, three lines each.', answer: 'b', options: ['a', 'b', 'c', 'd'].map((id, i) => ({ id, text: `${['Faithfulness in what is small', 'Obedience to the Owner’s instructions', 'Generosity with every resource given', 'Patience while the harvest is growing'][i]} is what the Master looks for, before He ever entrusts a person with more.` })) },
  { id: 'stress-6', type: 'choice', prompt: 'One option runs to six lines.', answer: 'a', options: [{ id: 'a', text: LONG + ' ' + LONG.split('.')[0] + ' — and none of it is ours to keep.' }, { id: 'b', text: 'Whatever I earn is mine.' }, { id: 'c', text: 'Only tithes belong to God.' }] },
  { id: 'stress-yo', type: 'choice', prompt: 'Yoruba names and tone marks.', answer: 'c', options: [
    { id: 'a', text: 'Ọlọ́run Olúwa Ẹlẹ́dàá, Bàbá wa tí ń bẹ ní ọ̀run' }, { id: 'b', text: 'Adébáyọ̀ Ọmọ́táyọ̀ Ṣóyínká Ògúnmọ́láṣẹ Àjàyí' },
    { id: 'c', text: 'Ẹ̀bùn àti tálẹ́ńtì tí a fi lé wa lọ́wọ́' }, { id: 'd', text: 'Nǹkan àmúṣọrọ̀ Ìwé Mímọ́: Òwe 3:5-6 (ṣe é lójoojúmọ́)' }] },
  { id: 'stress-tok', type: 'choice', prompt: 'An unbroken string must wrap, never overflow.', answer: 'a', options: [
    { id: 'a', text: 'Supercalifragilisticexpialidocious_Stewardship_AccountabilityAndResponsibility_Forever' }, { id: 'b', text: 'A normal short answer' }] },
  { id: 'stress-tf', type: 'tf', prompt: 'True or false?', answer: false, statement: LONG + ' ' + LONG },
  { id: 'stress-tf-yo', type: 'tf', prompt: 'True or false?', answer: true, statement: 'Ọlọ́run ni Olúwa àti Olùdáàbòbò wa; Ẹ̀mí Mímọ́ ni olùrànlọ́wọ́ wa lójoojúmọ́.' },
]

/* ── cells ──────────────────────────────────────────────────────────────── */
const wrongOf = (ex) => (ex.type === 'tf' ? !ex.answer : (ex.options.find((o) => o.id !== ex.answer) || ex.options[0]).id)
function propsFor(ex, state) {
  const base = { ex, onChange() {}, onSubmit() {}, locked: true, graded: null, value: emptyResponse(ex) }
  if (state === 'selected') return { ...base, value: wrongOf(ex) }
  if (state === 'right') return { ...base, value: ex.answer, graded: { right: true, answerText: '' } }
  if (state === 'wrong') return { ...base, value: wrongOf(ex), graded: { right: false, answerText: '' } }
  return base
}
function Cell({ ex, state }) {
  const View = VIEWS[ex.type]
  return (
    <div className="pg-cell">
      <span className="pg-cap">{state}</span>
      <div className="pg-col"><div className="pg-prompt">{ex.prompt}</div><View {...propsFor(ex, state)} /></div>
    </div>
  )
}
const STATES = ['rest', 'selected', 'right', 'wrong']
function Specimen({ title, note, exs }) {
  return (
    <section className="pg-sec">
      <h2>{title}<small>{note}</small></h2>
      {exs.map((ex) => (
        <div key={ex.id} className="pg-block">
          <Label mono>{ex._series ? `${ex._series} · day ${ex._day} · ` : ''}{ex.type} · {ex.id.slice(-18)}</Label>
          <div className="pg-row">{STATES.map((st) => <Cell key={st} ex={ex} state={st} />)}</div>
        </div>
      ))}
    </section>
  )
}

/* ── live harness: a minimal stand-in for ExerciseStep (prompt · renderer · CHECK/CONTINUE) ─────────────────────── */
function Live() {
  const list = useMemo(() => {
    const t = q.get('type')
    return [...STRESS.filter((e) => !t || e.type === t), ...ALL.flatMap((a) => a.ex).filter((e) => !t || e.type === t)]
  }, [])
  const [i, setI] = useState(Number(q.get('i')) || 0)
  const ex = list[i % list.length]
  const [value, setValue] = useState(emptyResponse(ex))
  const [graded, setGraded] = useState(null)
  const [log, setLog] = useState('')
  const View = VIEWS[ex.type]
  const ready = isAnswerComplete(ex, value)
  const check = () => { if (!ready || graded) return; const g = gradeExercise(ex, value); setGraded(g); setLog(`graded ${g.right ? 'RIGHT' : 'WRONG'} · answer ${g.answerText.slice(0, 40)}`) }
  const next = () => { const n = (i + 1) % list.length; setI(n); setValue(emptyResponse(list[n])); setGraded(null); setLog('') }
  return (
    <div className="pg-live" key={ex.id}>
      <style>{CSS}</style>
      <div className="pg-live__scroll">
        <Label mono>{i + 1} / {list.length} · {ex.type} · {ex.id.slice(-14)}</Label>
        <h2 className="pg-live__prompt">{ex.prompt}</h2>
        <View ex={ex} value={value} onChange={(v) => { setValue(v); setLog('onChange ' + String(v)) }} locked={!!graded} graded={graded} onSubmit={graded ? next : check} />
      </div>
      <div className="pg-live__foot">
        <code data-testid="log">{log || 'idle'}</code>
        <Button variant={graded ? (graded.right ? 'go' : 'secondary') : 'primary'} full disabled={!graded && !ready} onClick={graded ? next : check}>{graded ? 'Continue' : 'Check'}</Button>
      </div>
    </div>
  )
}

const CSS = `
body{background:var(--carbon-0)}
.pg-page{padding:var(--s-6) var(--s-5) var(--s-16);display:flex;flex-direction:column;gap:var(--s-10);max-width:1560px;margin:0 auto}
.pg-page h1{font:700 var(--fs-2xl)/1 var(--font-display);letter-spacing:var(--track-label);text-transform:uppercase;margin:0}
.pg-page h1 small,.pg-sec h2 small{display:block;margin-top:var(--s-2);font:500 var(--fs-xs)/1.4 var(--font-mono);letter-spacing:var(--track-mono);color:var(--ink-3);text-transform:none}
.pg-sec{display:flex;flex-direction:column;gap:var(--s-5)}
.pg-sec h2{margin:0;font:700 var(--fs-xl)/1 var(--font-display);letter-spacing:var(--track-label);text-transform:uppercase;border-bottom:1px solid var(--line);padding-bottom:var(--s-3)}
.pg-block{display:flex;flex-direction:column;gap:var(--s-3)}
.pg-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--s-4)}
.pg-cell{position:relative;display:flex;flex-direction:column;gap:var(--s-2);min-width:0}
.pg-cap{font:500 var(--fs-2xs)/1 var(--font-mono);letter-spacing:var(--track-mono);text-transform:uppercase;color:var(--tele)}
.pg-col{width:100%;max-width:360px;padding:var(--s-4) var(--s-5);background:var(--carbon-0);outline:1px dashed var(--line-2);outline-offset:calc(var(--s-1) * -1)}
.pg-prompt{margin:0 0 var(--s-4);font:600 var(--fs-lg)/1.25 var(--font-ui);letter-spacing:var(--track-tight);color:var(--ink)}
.pg-live{display:flex;flex-direction:column;height:100%;min-height:0}
.pg-live__scroll{flex:1;min-height:0;overflow:auto;padding:var(--s-5) var(--gutter) var(--s-4);display:flex;flex-direction:column;gap:var(--s-4)}
.pg-live__prompt{margin:0;font:600 var(--fs-xl)/1.2 var(--font-ui);letter-spacing:var(--track-tight)}
.pg-live__foot{flex:none;display:flex;flex-direction:column;gap:var(--s-2);padding:var(--s-3) var(--gutter) calc(var(--s-4) + var(--sab));border-top:1px solid var(--line);background:var(--carbon-1)}
.pg-live__foot code{font:500 var(--fs-2xs)/1.2 var(--font-mono);color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`

function Sheet() {
  return (
    <div className="pg-page">
      <style>{CSS}</style>
      <h1>ex-choice<small>answer plates · Choice · TrueFalse · real quizFor() exercises · states forced through props · {FX}</small></h1>
      {ALL.map(({ s, ex }) => (
        <div key={s.id} className="pg-sec">
          <Specimen title={`${s.title} · choice`} note="first + longest, 4 states" exs={pickSpecimens(ex, 'choice')} />
          <Specimen title={`${s.title} · true / false`} note="first + longest, 4 states" exs={pickSpecimens(ex, 'tf')} />
        </div>
      ))}
      <Specimen title="Stress" note="3-line x 4 · 6-line · Yoruba · unbroken token · long statement" exs={STRESS} />
    </div>
  )
}

if (q.get('live')) {
  mountScreen(<Live />, { bare: true })
} else {
  mount(<Sheet />, { fx: FX })
}
