// Playground for ex-step: the Go / No-Go shell, driven like a real lesson's check phase (misses return once, at the end).
//   http://localhost:5183/playground/ex-step.html
//   ?series=secrets-of-longevity   ?day=12   ?type=choice|blank|order|match|tf   ?views=real|fake|auto   ?fx=lite   ?bare (no controls)
// Views that are still stubs (ex-blank-order's) are swapped for a plain fake so the shell is testable on its own.
// Test hooks:  window.__pg.answer(true|false) fills the current view with a right / wrong response (then press Enter or click CHECK);
//              window.__pg.log = every onGraded / onNext the shell fired (checks "exactly once").
import { useCallback, useEffect, useMemo, useState } from 'react'
import { mountScreen } from './_shell.jsx'
import { ExerciseStep, resetCombo } from '../src/screens/lesson/Exercises.jsx'
import { VIEWS } from '../src/screens/lesson/ex/index.js'
import { exercisePool, pairUp, quizFor, toggleWord } from '../src/quiz.js'
import { activeSeriesId, getSeries, allSeries } from '../src/lib.js'
import { SegmentBar } from '../src/ui/index.js'
import { Icon } from '../src/icons.jsx'

const qs = new URLSearchParams(location.search)
const SERIES = qs.get('series') || activeSeriesId()
const DAY = +(qs.get('day') || 12)
const TYPE = qs.get('type')
const MODE = qs.get('views') || 'auto'
const BARE = qs.has('bare')

/* ── fake renderers: just enough to answer, with the data-state the shell reads ── */
function FakeView({ ex, value, onChange, locked, graded }) {
  const st = (chosen, isAns) => (graded ? (isAns ? 'right' : chosen ? 'wrong' : 'dim') : chosen ? 'selected' : 'rest')
  const Btn = ({ chosen, isAns, onClick, children }) => (
    <button type="button" className="pgf-btn" data-state={st(chosen, isAns)} disabled={locked} onClick={onClick}>{children}</button>
  )
  let body = null
  if (ex.type === 'choice' || ex.type === 'blank') {
    const id = value && typeof value === 'object' ? value.id : value
    body = ex.options.map((o, i) => <Btn key={o.id} chosen={o.id === id} isAns={o.id === ex.answer} onClick={() => onChange(o.id)}>{i + 1}  {o.text}</Btn>)
  } else if (ex.type === 'tf') {
    body = [true, false].map((v) => <Btn key={String(v)} chosen={value === v} isAns={v === ex.answer} onClick={() => onChange(v)}>{v ? 'True' : 'False'}</Btn>)
  } else if (ex.type === 'order') {
    const placed = Array.isArray(value) ? value : []
    body = [
      <p key="line" className="pgf-line">{placed.map((id) => ex.words.find((w) => w.id === id).text).join(' ') || '…'}</p>,
      ...ex.words.map((w) => <Btn key={w.id} chosen={placed.includes(w.id)} isAns={false} onClick={() => onChange(toggleWord(ex, value, w.id))}>{w.text}</Btn>),
    ]
  } else if (ex.type === 'match') {
    const r = value || {}
    body = ex.pairs.map((p) => <Btn key={p.id} chosen={r[p.id] != null} isAns={false} onClick={() => onChange(pairUp(ex, r, p.id, p.id))}>{p.left} → {p.right}</Btn>)
  }
  return (
    <div className="pgf">
      <p className="pgf-tag">fake {ex.type} view</p>
      {ex.type === 'blank' && <p className="pgf-line">{ex.before}<b>____</b>{ex.after}</p>}
      {ex.type === 'tf' && <p className="pgf-line">“{ex.statement}”</p>}
      {body}
    </div>
  )
}

const isStub = (V) => !V || V.toString().length < 200
const tap = (V) => function Tap(props) { window.__cur = props; return <V {...props} /> }
for (const t of Object.keys(VIEWS)) {
  const real = VIEWS[t]
  const use = MODE === 'fake' ? FakeView : MODE === 'real' ? real : isStub(real) ? FakeView : real
  VIEWS[t] = tap(use)
}

/* ── the set of exercises ── */
function buildSteps() {
  const s = getSeries(SERIES)
  if (TYPE && TYPE !== 'all') {
    const out = []
    for (let d = DAY; d <= s.calendar.length + DAY && out.length < 4; d++) {
      const day = ((d - 1) % s.calendar.length) + 1
      out.push(...exercisePool(s, day, { count: 99 }).exercises.filter((e) => e.type === TYPE).slice(0, 1))
    }
    return out.map((ex) => ({ ex, retry: false }))
  }
  return quizFor(s, DAY, { count: 5 }).map((ex) => ({ ex, retry: false }))
}

function answerFor(ex, right) {
  switch (ex.type) {
    case 'choice': case 'blank': return right ? ex.answer : ex.options.find((o) => o.id !== ex.answer).id
    case 'tf': return right ? ex.answer : !ex.answer
    case 'order': return right ? ex.answer.slice() : ex.answer.slice().reverse()
    case 'match': {
      const ids = ex.pairs.map((p) => p.id)
      return Object.fromEntries(ids.map((id, k) => [id, right ? id : ids[(k + 1) % ids.length]]))
    }
    default: return null
  }
}

const CSS = `
.pg-lesson { position: absolute; inset: 0; z-index: var(--z-lesson); display: flex; flex-direction: column; background: radial-gradient(120% 60% at 50% 0, var(--carbon-2), var(--carbon-0) 70%); }
.pg-ctl { flex: none; display: flex; gap: 6px; align-items: center; padding: 6px 10px; overflow-x: auto; font: 500 10px/1 var(--font-mono); color: var(--ink-3); border-bottom: 1px solid var(--line); scrollbar-width: none; }
.pg-ctl a, .pg-ctl button { flex: none; padding: 5px 7px; color: var(--ink-2); background: var(--carbon-2); border: 1px solid var(--line-2); border-radius: 6px; font: inherit; text-decoration: none; cursor: pointer; }
.pg-ctl [aria-current] { color: var(--ink-on-ignite); background: var(--ignite-flat); border-color: transparent; }
.pg-top { flex: none; display: flex; align-items: center; gap: 12px; padding: calc(var(--sat) + 10px) 16px 6px; }
.pg-top .k-ticker { flex: 1; }
.pg-x { display: grid; place-items: center; width: 40px; height: 40px; color: var(--ink-2); }
.pg-n { font: 500 12px/1 var(--font-mono); color: var(--ink-3); font-variant-numeric: tabular-nums; }
.pg-stage { flex: 1; min-height: 0; display: flex; }
.pg-end { margin: auto; display: grid; gap: 12px; justify-items: center; color: var(--ink-2); font: 500 13px/1 var(--font-mono); }
.pgf { display: grid; gap: 10px; }
.pgf-tag { margin: 0; color: var(--ink-4); font: 500 10px/1 var(--font-mono); text-transform: uppercase; }
.pgf-line { margin: 0; color: var(--ink); font: italic 400 20px/1.4 var(--font-serif); }
.pgf-btn { padding: 14px 16px; text-align: left; color: var(--ink); background: var(--carbon-2); border: 1px solid var(--line-2); border-radius: 12px; font: 500 15px/1.3 var(--font-ui); }
.pgf-btn[data-state="selected"] { border-color: var(--tele); }
.pgf-btn[data-state="right"] { border-color: var(--go); background: var(--go-wash); }
.pgf-btn[data-state="wrong"] { border-color: var(--nogo); background: var(--nogo-wash); }
.pgf-btn[data-state="dim"] { opacity: .45; }
`

function Harness() {
  const [steps, setSteps] = useState(buildSteps)
  const [i, setI] = useState(0)
  const [log] = useState(() => (window.__pg = { log: [] }).log)
  const cur = steps[i]

  const onGraded = useCallback((r) => {
    log.push({ ev: 'graded', right: r.right, retry: r.retry, at: Math.round(performance.now()) })
    if (!r.right && !r.retry) setSteps((s) => [...s, { ex: s[i].ex, retry: true }])
  }, [i, log])
  const onNext = useCallback(() => { log.push({ ev: 'next', at: Math.round(performance.now()) }); setI((n) => n + 1) }, [log])
  const restart = useCallback(() => { resetCombo(); log.length = 0; setSteps(buildSteps()); setI(0) }, [log])

  useEffect(() => {
    Object.assign(window.__pg, {
      answer: (right) => { const p = window.__cur; if (p) p.onChange(answerFor(p.ex, right)) },
      restart, goto: setI, steps, i,
    })
  })

  return (
    <div className="pg-lesson">
      <style>{CSS}</style>
      {!BARE && (
        <div className="pg-ctl">
          {allSeries.map((s) => <a key={s.id} href={`?series=${s.id}&day=${DAY}${TYPE ? '&type=' + TYPE : ''}`} aria-current={s.id === SERIES ? 'true' : undefined}>{s.id.split('-')[0]}</a>)}
          {['all', 'choice', 'blank', 'order', 'match', 'tf'].map((t) => <a key={t} href={`?series=${SERIES}&day=${DAY}&type=${t}`} aria-current={(TYPE || 'all') === t ? 'true' : undefined}>{t}</a>)}
          <button onClick={() => window.__pg.answer(true)}>fill right</button>
          <button onClick={() => window.__pg.answer(false)}>fill wrong</button>
          <button onClick={restart}>restart</button>
        </div>
      )}
      <div className="pg-top">
        <span className="pg-x"><Icon.close size={24} /></span>
        <SegmentBar total={Math.max(1, steps.length)} done={Math.min(i, steps.length)} label="Lesson progress" />
        <span className="pg-n">{Math.min(i + 1, steps.length)}/{steps.length}</span>
      </div>
      <div className="pg-stage">
        {cur ? (
          <ExerciseStep ex={cur.ex} isRetry={cur.retry} index={i} total={steps.length} onGraded={onGraded} onNext={onNext} />
        ) : (
          <div className="pg-end"><span>END OF CHECK · {log.filter((l) => l.ev === 'graded').length} graded</span><button className="pgf-btn" onClick={restart}>restart</button></div>
        )}
      </div>
    </div>
  )
}

mountScreen(<Harness />, { bare: true })
