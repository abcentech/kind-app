import { useEffect, useMemo, useRef, useState } from 'react'
import { deckFor, dayInfo, weekOf, codeFor, fmtDay, md } from '../lib.js'
import { finishDay, isDayDone, noteFor, posFor, saveNote, setPos, useStore } from '../store.js'
import { buzz, Confetti, reducedMotion } from './bits.jsx'

/**
 * The Drop — the whole day as a swipeable deck. One thought per card.
 * Reaching the last card and claiming it is the *only* way a day is completed,
 * so finishing is a single gesture instead of a checklist.
 */
export default function Drop({ s, day, close }) {
  const st = useStore()
  const cards = useMemo(() => deckFor(s, day), [s.id, day])
  const already = isDayDone(st, s.id, day)
  // A finished day reopens from the top — you came back to re-read it, not to
  // land on the claim button again.
  const [i, setI] = useState(() => (already ? 0 : Math.min(posFor(st, s.id, day), cards.length - 1)))
  const [dir, setDir] = useState(1)
  const [reward, setReward] = useState(null)
  const d = dayInfo(s, day)
  const wk = weekOf(s, d)
  const touch = useRef(null)

  const go = (n) => {
    const next = Math.max(0, Math.min(cards.length - 1, n))
    if (next === i) return
    setDir(next > i ? 1 : -1)
    setI(next)
    setPos(s.id, day, next)
    buzz(8)
  }
  const claim = () => {
    const r = finishDay(s.id, day)
    buzz([12, 40, 18])
    setReward(r || { code: codeFor(s, day), streak: st.streak, first: false, again: true })
  }

  useEffect(() => {
    const key = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') go(i + 1)
      if (e.key === 'ArrowLeft') go(i - 1)
      if (e.key === 'Escape') close()
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [i, cards.length])

  const card = cards[i]
  const last = i === cards.length - 1

  return (
    <div className={'drop w' + ((d.week ?? 0) + 1) + ' k-' + card.kind}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touch.current ?? 0)
        if (Math.abs(dx) > 55) go(i + (dx < 0 ? 1 : -1))
      }}>
      <header className="drop-top">
        <div className="pips" role="progressbar" aria-valuenow={i + 1} aria-valuemax={cards.length}>
          {cards.map((c, x) => <i key={c.id} className={x < i ? 'p done' : x === i ? 'p on' : 'p'} />)}
        </div>
        <div className="drop-meta">
          <span>{fmtDay(s, day)} · {wk ? 'The ' + wk.f.toLowerCase() + ' code' : s.title}</span>
          <button className="xbtn" onClick={close} aria-label="Close">✕</button>
        </div>
      </header>

      <div className={'card-wrap ' + (dir > 0 ? 'in-r' : 'in-l')} key={card.id}>
        <Card c={card} s={s} day={day} />
      </div>

      <footer className="drop-bot">
        {i > 0 && <button className="nav back" onClick={() => go(i - 1)} aria-label="Previous">↑</button>}
        {last ? (
          <button className="nav next claim" onClick={claim}>
            {already ? 'Done — see today’s code' : 'Claim today’s code'} <b>{codeFor(s, day) ? '🔓' : '✓'}</b>
          </button>
        ) : (
          <button className="nav next" onClick={() => go(i + 1)}>
            {card.kind === 'ask' ? 'Saved — keep going' : 'Next'} <b>↓</b>
          </button>
        )}
      </footer>

      {reward && <Unlock s={s} day={day} reward={reward} close={() => { setReward(null); close() }} />}
    </div>
  )
}

/* ---- one card per thought ---------------------------------------------- */
function Card({ c, s, day }) {
  if (c.kind === 'open')
    return (
      <article className="card open">
        <div className="c-emoji">{c.emoji}</div>
        <span className="c-eyebrow">{c.eyebrow}</span>
        <h1>{c.title}</h1>
        {c.tag && <p className="c-tag">{c.tag}</p>}
        <p className="c-hint">Swipe or tap Next — about two minutes.</p>
      </article>
    )

  if (c.kind === 'verse')
    return (
      <article className="card verse">
        <span className="c-label">{c.label}</span>
        <blockquote>“{c.body}”</blockquote>
        <cite>{c.ref}</cite>
      </article>
    )

  if (c.kind === 'truth')
    return (
      <article className="card truth">
        <span className="c-label">{c.label}</span>
        <h2>{para(c.body)}</h2>
      </article>
    )

  if (c.kind === 'point')
    return (
      <article className="card point">
        <span className="c-label">{c.label}</span>
        <h2>{c.title}</h2>
        <Body text={c.body} />
      </article>
    )

  if (c.kind === 'read')
    return (
      <article className="card read">
        <span className="c-label">{c.label}</span>
        <Body text={c.body} />
      </article>
    )

  if (c.kind === 'do')
    return (
      <article className="card do">
        <span className="c-label">{c.label}</span>
        <div className="do-badge">👟</div>
        <Body text={c.body} />
      </article>
    )

  if (c.kind === 'pray')
    return (
      <article className="card pray">
        <span className="c-label">{c.label}</span>
        <div className="do-badge">🙏</div>
        <Body text={c.body} />
      </article>
    )

  if (c.kind === 'quote')
    return (
      <article className="card quote">
        <span className="c-label">{c.label}</span>
        <blockquote>“{c.body}”</blockquote>
        {c.sub && <p className="c-sub">{c.sub}</p>}
        <a className="btn ghost" href={s.shortsUrl} target="_blank" rel="noopener">Watch the Short ↗</a>
      </article>
    )

  if (c.kind === 'watch')
    return (
      <article className="card watch">
        <span className="c-label">{c.label}</span>
        <div className="frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${c.videoId}?rel=0&playsinline=1`}
            title={c.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen loading="lazy" />
        </div>
        <p className="c-sub">Watch together, then keep swiping for the rest of the day.</p>
      </article>
    )

  if (c.kind === 'ask') return <Ask c={c} s={s} day={day} />

  // declare
  return (
    <article className="card declare">
      <span className="c-label">{c.label}</span>
      <div className="decl">{c.lines.map((l, x) => <p key={x} style={{ animationDelay: `${x * 0.12}s` }}>{l}</p>)}</div>
    </article>
  )
}

function Ask({ c, s, day }) {
  const st = useStore()
  const [text, setText] = useState(noteFor(st, s.id, day))
  useEffect(() => {
    const id = setTimeout(() => saveNote(s.id, day, text), 400)
    return () => clearTimeout(id)
  }, [text])
  return (
    <article className="card ask">
      <span className="c-label">{c.label}</span>
      <h2>{c.prompt}</h2>
      <textarea value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer — it’s saved to your ledger, only on this device."
        rows={5} />
      {c.extra?.length > 0 && (
        <details className="more">
          <summary>{c.extra.length} more question{c.extra.length > 1 ? 's' : ''} to talk about</summary>
          <ul>{c.extra.map((q, x) => <li key={x}>{q}</li>)}</ul>
        </details>
      )}
    </article>
  )
}

const para = (t) => md(t).replace(/\n+/g, ' ')
function Body({ text }) {
  const blocks = md(text || '').split('\n').filter((l) => l.trim())
  return (
    <div className="c-body">
      {blocks.map((l, x) =>
        /^\s*[-•]\s/.test(l)
          ? <p key={x} className="bullet">{l.replace(/^\s*[-•]\s*/, '')}</p>
          : /^####\s/.test(l)
            ? <h3 key={x}>{l.replace(/^####\s*/, '').replace(/^[“"]|[”"]$/g, '')}</h3>
            : <p key={x}>{l}</p>
      )}
    </div>
  )
}

/* ---- the reward -------------------------------------------------------- */
function Unlock({ s, day, reward, close }) {
  const st = useStore()
  const { code, streak, again } = reward
  const share = async () => {
    const text = code
      ? `Code ${code.no} unlocked — “${code.line}” · ${s.title} Day ${day} on the KIND App.`
      : `Day ${day} done on the KIND App — ${s.title}.`
    try {
      if (navigator.share) await navigator.share({ title: 'KIND App', text })
      else { await navigator.clipboard.writeText(text); alert('Copied — paste it anywhere.') }
    } catch {}
  }
  return (
    <div className="unlock" role="dialog" aria-label="Day complete">
      <Confetti fire big />
      {!again && <p className="u-kicker">Day {day} complete</p>}
      {code ? (
        <div className={'codecard' + (code.rare ? ' rare' : '')}>
          <span className="cc-no">Code {String(code.no).padStart(2, '0')}{code.rare ? ' · gold' : ''}</span>
          <h2>{code.line}</h2>
          <p className="cc-ep">{titleCase(code.title)}</p>
          <div className="cc-seal">{s.weeks[code.week]?.emoji || '🔑'}</div>
        </div>
      ) : (
        <div className="codecard"><h2>{s.declaration[0]}</h2><p className="cc-ep">Selah</p></div>
      )}
      <div className="u-stats">
        <div><b>🔥 {streak}</b><span>day streak</span></div>
        <div><b>💎 {st.gems}</b><span>gems</span></div>
        <div><b>🗂️ {(st.series[s.id]?.cards || []).length}</b><span>of {s.codes.length} codes</span></div>
      </div>
      <button className="btn big" onClick={close}>{reducedMotion() ? 'Close' : 'Back to today'}</button>
      <button className="linkbtn" onClick={share}>Share this code</button>
    </div>
  )
}
const titleCase = (s) => (s || '').replace(/[A-Z][A-Z’'\-]+/g, (w) => w[0] + w.slice(1).toLowerCase())
