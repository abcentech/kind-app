import { useEffect, useMemo, useRef, useState } from 'react'
import { deckFor, dayInfo, weekOf, codeFor, fmtDay, md, title as sentence } from '../lib.js'
import { finishDay, isDayDone, noteFor, posFor, saveNote, setPos, unlockedCards, useStore } from '../store.js'
import { Icon } from '../icons.jsx'
import { buzz } from './bits.jsx'

/**
 * The deck — the day, one thought per leaf. Chrome is two hairline bars; the
 * page itself is the interface. Reaching the last leaf and claiming it is the
 * only way a day completes.
 */
export default function Drop({ s, day, close }) {
  const st = useStore()
  const leaves = useMemo(() => deckFor(s, day), [s.id, day])
  const already = isDayDone(st, s.id, day)
  const [i, setI] = useState(() => (already ? 0 : Math.min(posFor(st, s.id, day), leaves.length - 1)))
  const [back, setBack] = useState(false)
  const [reward, setReward] = useState(null)
  const d = dayInfo(s, day)
  const wk = weekOf(s, d)
  const tone = 'tone' + ((d.week ?? 0) + 1)
  const from = useRef(null)

  const go = (n) => {
    const next = Math.max(0, Math.min(leaves.length - 1, n))
    if (next === i) return
    setBack(next < i)
    setI(next)
    setPos(s.id, day, next)
    buzz(6)
  }
  const claim = () => {
    const r = finishDay(s.id, day)
    buzz([8, 30, 12])
    setReward(r || { code: codeFor(s, day), streak: st.streak, again: true })
  }

  useEffect(() => {
    const key = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') go(i + 1)
      if (e.key === 'ArrowLeft') go(i - 1)
      if (e.key === 'Escape') close()
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [i, leaves.length])

  const leaf = leaves[i]
  const last = i === leaves.length - 1

  return (
    <div className={'deck ' + tone}
      onTouchStart={(e) => (from.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (from.current ?? 0)
        if (Math.abs(dx) > 52) go(i + (dx < 0 ? 1 : -1))
      }}>
      <div className="deck-bar">
        <div className="rail" role="progressbar" aria-valuenow={i + 1} aria-valuemax={leaves.length}>
          {leaves.map((l, x) => <i key={l.id} className={x < i ? 'seen' : x === i ? 'now' : ''} />)}
        </div>
        <div className="deck-meta">
          <span>{fmtDay(s, day)} · {wk ? sentence(wk.f) + ' code' : s.title}</span>
          <button className="iconbtn" onClick={close} aria-label="Close"><Icon.close /></button>
        </div>
      </div>

      <div className="stage">
        <div className={'leaf' + (back ? ' back' : '') + (CENTRED.has(leaf.kind) ? ' mid' : '') + (leaf.kind === 'open' ? ' cover' : '')} key={leaf.id}>
          <Leaf l={leaf} s={s} day={day} />
        </div>
      </div>

      <div className="deck-foot">
        {i > 0 && <button className="iconbtn" onClick={() => go(i - 1)} aria-label="Previous"><Icon.up /></button>}
        {last ? (
          <button className="btn" onClick={claim}>{already ? 'See today’s pass' : 'Claim today’s pass'}</button>
        ) : (
          <button className="btn" onClick={() => go(i + 1)}>{leaf.kind === 'ask' ? 'Saved · continue' : 'Continue'}</button>
        )}
      </div>

      {reward && <Reward s={s} day={day} reward={reward} close={() => { setReward(null); close() }} />}
    </div>
  )
}

const CENTRED = new Set(['open', 'verse', 'truth', 'quote', 'declare'])

/* ---- leaves ------------------------------------------------------------- */
function Leaf({ l, s, day }) {
  if (l.kind === 'open')
    return (
      <>
        <span className="cover-ord">{l.eyebrow.toUpperCase()}</span>
        <h1>{l.title}</h1>
        {l.tag && <p className="cover-ref">{l.tag}</p>}
        <p className="cover-hint">Swipe through — about two minutes.</p>
      </>
    )

  if (l.kind === 'verse')
    return (
      <>
        <span className="leaf-label">{l.label}</span>
        <blockquote className="scripture">“{l.body}”<cite className="scripture-c">{l.ref}</cite></blockquote>
      </>
    )

  if (l.kind === 'truth')
    return (
      <>
        <span className="leaf-label">{l.label}</span>
        <p className="oneliner">{md(l.body).replace(/\n+/g, ' ')}</p>
      </>
    )

  if (l.kind === 'point')
    return (
      <>
        <span className="leaf-label">{l.label}</span>
        <h2 className="point">{l.title}</h2>
        <Prose text={l.body} />
      </>
    )

  if (l.kind === 'read' || l.kind === 'do' || l.kind === 'pray')
    return (
      <>
        <span className="leaf-label">{l.label}</span>
        <Prose text={l.body} />
      </>
    )

  if (l.kind === 'quote')
    return (
      <>
        <span className="leaf-label">{l.label}</span>
        <p className="oneliner">“{l.body}”</p>
        {l.sub && <p className="leaf-note" style={{ marginTop: 18 }}>{l.sub}</p>}
        <a className="link" href={s.shortsUrl} target="_blank" rel="noopener">Watch on YouTube</a>
      </>
    )

  if (l.kind === 'watch')
    return (
      <>
        <span className="leaf-label">{l.label}</span>
        <div className="player">
          <iframe src={`https://www.youtube-nocookie.com/embed/${l.videoId}?rel=0&playsinline=1`}
            title={l.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen loading="lazy" />
        </div>
        <p className="leaf-note">Watch it together, then carry on through the day.</p>
      </>
    )

  if (l.kind === 'ask') return <Ask l={l} s={s} day={day} />

  return (
    <>
      <span className="leaf-label">{l.label}</span>
      <div className="creed">
        {l.lines.map((line, x) => <p key={x} style={{ animationDelay: `${x * 0.14}s` }}>{line}</p>)}
      </div>
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
      <span className="leaf-label">{l.label}</span>
      <p className="ask-q">{l.prompt}</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Write your answer. It stays on this device." />
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
    <div className="prose">
      {lines.map((l, x) =>
        /^\s*[-•]\s/.test(l) ? <p key={x} className="li">{l.replace(/^\s*[-•]\s*/, '')}</p>
        : /^#{2,4}\s/.test(l) ? <h3 key={x}>{l.replace(/^#+\s*/, '').replace(/^[“"]|[”"]$/g, '')}</h3>
        : <p key={x}>{l}</p>
      )}
    </div>
  )
}

/* ---- the pass ----------------------------------------------------------- */
function Reward({ s, day, reward, close }) {
  const st = useStore()
  const { code, streak, again } = reward
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
    <div className={'reward tone' + ((code?.week ?? 0) + 1)} role="dialog" aria-label="Day complete">
      {!again && <p className="reward-k">Day {day} complete</p>}
      <div className={'pass' + (code?.rare ? ' is-gold' : '')}>
        <div className="pass-top">
          <span className="pass-no">{code ? 'PASS ' + String(code.no).padStart(2, '0') : 'SELAH'}</span>
          {code?.rare && <span className="pass-gold">Gold</span>}
        </div>
        <q>{code ? code.line : s.declaration[0]}</q>
        <p className="pass-ep">{code ? sentence(code.title) : fmtDay(s, day)}</p>
      </div>
      <div className="tally">
        <div><b>{streak}</b><span>day streak</span></div>
        <div><b>{held}</b><span>of {s.codes.length} passes</span></div>
      </div>
      <div className="reward-foot">
        <button className="btn" onClick={close}>Done</button>
        <button className="link" onClick={share}>Share this pass</button>
      </div>
    </div>
  )
}
