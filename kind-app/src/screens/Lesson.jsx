import { useEffect, useMemo, useState } from 'react'
import { deckFor, dayInfo, weekOf, codeFor, fmtDay, md, title as sentence } from '../lib.js'
import { quizFor } from '../quiz.js'
import { finishDay, isDayDone, noteFor, saveNote, scoreAnswer, unlockedCards, useStore } from '../store.js'
import { Icon } from '../icons.jsx'
import { buzz } from './bits.jsx'

/**
 * A lesson: read the day, then answer for it. Teaching slides first, a few
 * check questions, the declaration last, then the completion screen. The bar
 * at the top fills as you go and the button at the bottom is always the one
 * thing to press.
 */
export default function Lesson({ s, day, close }) {
  const st = useStore()
  const d = dayInfo(s, day)
  const wk = weekOf(s, d)
  const unit = (d.week ?? 0) + 1

  const steps = useMemo(() => {
    const leaves = deckFor(s, day)
    const creed = leaves[leaves.length - 1]?.kind === 'declare' ? leaves.pop() : null
    const quiz = quizFor(s, day).map((q) => ({ kind: 'quiz', id: 'q' + q.prompt.length + q.answer.length, ...q }))
    return [...leaves, ...quiz, ...(creed ? [creed] : [])]
  }, [s.id, day])

  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [checked, setChecked] = useState(false)
  const [right, setRight] = useState(0)
  const [asked, setAsked] = useState(0)
  const [xp, setXp] = useState(0)
  const [finished, setFinished] = useState(null)

  const step = steps[i]
  const last = i === steps.length - 1
  const isQuiz = step?.kind === 'quiz'
  const correct = isQuiz && picked != null && step.options[picked].ok

  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') close() }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [])

  const check = () => {
    setChecked(true)
    setAsked(asked + 1)
    if (correct) { setRight(right + 1); setXp(xp + scoreAnswer(true)); buzz([10, 40, 16]) }
    else { scoreAnswer(false); buzz([28, 60, 28]) }
  }

  const advance = () => {
    if (last) {
      const r = finishDay(s.id, day, xp)
      buzz([12, 40, 18])
      setFinished(r || { code: codeFor(s, day), streak: st.streak, xp, again: true })
      return
    }
    setI(i + 1); setPicked(null); setChecked(false); buzz(8)
  }

  if (finished)
    return <Complete s={s} day={day} result={finished} right={right} asked={asked} close={close} unit={unit} />

  return (
    <div className="lesson" style={{ '--unit': `var(--u${unit})`, '--unit-e': `var(--u${unit}-e)` }}>
      <div className="lesson-top">
        <button className="quit" onClick={close} aria-label="Quit lesson"><Icon.close /></button>
        <div className="track" role="progressbar" aria-valuenow={i + 1} aria-valuemax={steps.length}>
          <i style={{ width: `${((i + (checked ? 1 : 0)) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="slide" key={step.id || i}>
        {isQuiz
          ? <Question q={step} picked={picked} checked={checked} pick={setPicked} />
          : <Slide l={step} s={s} day={day} wk={wk} />}
      </div>

      {isQuiz && checked ? (
        <div className={'foot verdict ' + (correct ? 'ok' : 'no')}>
          <div className="verdict-h">
            <span className="badge">{correct ? <Icon.check /> : <Icon.close />}</span>
            <div>
              <b>{correct ? 'Well done!' : 'Not quite'}</b>
              <small>{correct ? step.hint : `Answer: ${step.answer}`}</small>
            </div>
          </div>
          <button className={'btn wide ' + (correct ? 'grass' : 'fire')} onClick={advance}>Continue</button>
        </div>
      ) : (
        <div className="foot">
          {isQuiz ? (
            <button className="btn wide grass" disabled={picked == null} onClick={check}>Check</button>
          ) : (
            <button className="btn wide grass" onClick={advance}>{last ? 'Finish' : 'Continue'}</button>
          )}
        </div>
      )}
    </div>
  )
}

/* ---- teaching slides ---------------------------------------------------- */
function Slide({ l, s, day, wk }) {
  if (l.kind === 'open')
    return (
      <>
        <div className="hero">{l.kind === 'open' && <Icon.book />}</div>
        <span className="slide-label">{l.eyebrow}</span>
        <h1>{l.title}</h1>
        {l.tag && <p style={{ marginTop: 10, color: 'var(--ink-soft)' }}>{l.tag}</p>}
      </>
    )

  if (l.kind === 'verse')
    return (
      <>
        <span className="slide-label">{l.label}</span>
        <div className="verse-card"><q>{l.body}</q><cite>{l.ref}</cite></div>
      </>
    )

  if (l.kind === 'truth')
    return (
      <>
        <span className="slide-label">{l.label}</span>
        <div className="mascot">
          <span className="pip"><Icon.star /></span>
          <p className="speech" style={{ margin: 0 }}>{md(l.body).replace(/\n+/g, ' ')}</p>
        </div>
      </>
    )

  if (l.kind === 'point')
    return (
      <>
        <span className="slide-label">{l.label}</span>
        <h2>{l.title}</h2>
        <Prose text={l.body} />
      </>
    )

  if (l.kind === 'watch')
    return (
      <>
        <span className="slide-label">{l.label}</span>
        <div className="player">
          <iframe src={`https://www.youtube-nocookie.com/embed/${l.videoId}?rel=0&playsinline=1`}
            title={l.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen loading="lazy" />
        </div>
        <p style={{ color: 'var(--ink-soft)' }}>Watch it together, then carry on.</p>
      </>
    )

  if (l.kind === 'quote')
    return (
      <>
        <span className="slide-label">{l.label}</span>
        <div className="verse-card"><q>{l.body}</q></div>
        {l.sub && <p style={{ marginTop: 14 }}>{l.sub}</p>}
        <a className="btn-plain" href={s.shortsUrl} target="_blank" rel="noopener">Watch the short</a>
      </>
    )

  if (l.kind === 'ask') return <Ask l={l} s={s} day={day} />

  if (l.kind === 'declare')
    return (
      <>
        <span className="slide-label">{l.label}</span>
        <div className="creed">
          {l.lines.map((line, x) => <p key={x} style={{ animationDelay: `${x * 0.13}s` }}>{line}</p>)}
        </div>
      </>
    )

  // read / do / pray
  return (
    <>
      <span className="slide-label">{l.label}</span>
      <Prose text={l.body} />
    </>
  )
}

function Ask({ l, s, day }) {
  const st = useStore()
  const [text, setText] = useState(noteFor(st, s.id, day))
  useEffect(() => {
    const id = setTimeout(() => saveNote(s.id, day, text), 400)
    return () => clearTimeout(id)
  }, [text])
  return (
    <>
      <span className="slide-label">{l.label}</span>
      <h2>{l.prompt}</h2>
      <textarea value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer — it stays on this device." />
      {l.extra?.length > 0 && (
        <details className="extra">
          <summary>{l.extra.length} more to talk about</summary>
          <ol>{l.extra.map((q, x) => <li key={x}>{q}</li>)}</ol>
        </details>
      )}
    </>
  )
}

function Prose({ text }) {
  const lines = md(text || '').split('\n').filter((l) => l.trim())
  return (
    <>
      {lines.map((l, x) =>
        /^\s*[-•]\s/.test(l) ? <p key={x} className="li">{l.replace(/^\s*[-•]\s*/, '')}</p>
        : /^#{2,4}\s/.test(l) ? <h3 key={x}>{l.replace(/^#+\s*/, '').replace(/^[“"]|[”"]$/g, '')}</h3>
        : <p key={x}>{l}</p>
      )}
    </>
  )
}

/* ---- the check ---------------------------------------------------------- */
function Question({ q, picked, checked, pick }) {
  return (
    <>
      <span className="slide-label">Check</span>
      <h2>{q.prompt}</h2>
      <div className="choices">
        {q.options.map((o, x) => {
          const state = !checked
            ? (picked === x ? ' picked' : '')
            : o.ok ? ' right' : picked === x ? ' wrong' : ''
          return (
            <button key={x} className={'choice' + state} disabled={checked}
              onClick={() => { pick(x); buzz(6) }}>
              <span className="key">{x + 1}</span>{o.text}
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ---- lesson complete ---------------------------------------------------- */
function Complete({ s, day, result, right, asked, close, unit }) {
  const st = useStore()
  const { code, streak, xp } = result
  const accuracy = asked ? Math.round((right / asked) * 100) : 100
  const held = unlockedCards(st, s.id).length
  const share = async () => {
    const text = code
      ? `“${code.line}” — pass ${String(code.no).padStart(2, '0')} of ${s.title}, on the KIND App.`
      : `Day ${day} of ${s.title}, done — on the KIND App.`
    try {
      if (navigator.share) await navigator.share({ title: 'KIND', text })
      else await navigator.clipboard.writeText(text)
    } catch {}
  }
  return (
    <div className="done-screen" style={{ '--unit': `var(--u${unit})`, '--unit-e': `var(--u${unit}-e)` }}>
      <div className="rays" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} style={{ transform: `rotate(${i * 36}deg)`, animationDelay: `${i * -0.9}s` }} />
        ))}
      </div>
      <h1>Lesson complete!</h1>
      <p className="dek">Day {day} · {fmtDay(s, day)}</p>

      <div className="tiles">
        <div className="tile xp"><div><small>Total XP</small><b>{xp}</b></div></div>
        <div className="tile streak"><div><small>Streak</small><b>{streak}</b></div></div>
        <div className="tile acc"><div><small>Accurate</small><b>{accuracy}%</b></div></div>
      </div>

      {code && (
        <div className={'pass-card' + (code.rare ? ' gold' : '')}>
          <span className="pn">Pass {String(code.no).padStart(2, '0')}{code.rare ? ' · gold' : ''}</span>
          <q>{code.line}</q>
          <em>{sentence(code.title)} · {held} of {s.codes.length} collected</em>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 340, marginTop: 20 }}>
        <button className="btn wide grass" onClick={close}>Claim XP</button>
        <button className="btn-plain quiet" style={{ width: '100%' }} onClick={share}>Share this pass</button>
      </div>
    </div>
  )
}
