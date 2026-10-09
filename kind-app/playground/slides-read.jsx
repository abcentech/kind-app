// slides-read specimen — Open · Watch · Read · Truth · Point · Quote, real cards from deckFor(), both series, in the .lesson-slide frame.
//   http://localhost:5183/playground/slides-read.html
//   ?only=open,truth        which frames (open watch read-hook read-picture read-list truth point point-long quote)
//   ?series=secrets-of-longevity   ?day=12   ?w=360&h=640   ?scale=1.3   ?fx=lite   ?review=1 (the day is marked done first)
//   ?cols=1   ?bg=0 (no footer emulation)
import { useMemo, useState } from 'react'
import { mount } from './_boot.jsx'
import { Button } from '../src/ui/index.js'
import { allSeries, deckFor, getSeries } from '../src/lib.js'
import { finishDay } from '../src/store.js'
import Slide from '../src/screens/lesson/Slide.jsx'
import Open from '../src/screens/lesson/slides/Open.jsx'
import Watch from '../src/screens/lesson/slides/Watch.jsx'
import Read from '../src/screens/lesson/slides/Read.jsx'
import Truth from '../src/screens/lesson/slides/Truth.jsx'
import Point from '../src/screens/lesson/slides/Point.jsx'
import Quote from '../src/screens/lesson/slides/Quote.jsx'

const q = new URLSearchParams(location.search)
const W = +q.get('w') || 390
const H = +q.get('h') || 844
const SCALE = +q.get('scale') || 1
const DAY = +q.get('day') || 12
const ONLY = q.get('only') ? q.get('only').split(',') : null
const FX = q.get('fx') === 'lite' ? 'lite' : 'full'
const SHOW_FOOT = q.get('bg') !== '0'

const COMP = { open: Open, watch: Watch, read: Read, truth: Truth, point: Point, quote: Quote }

/** The frames for one series: the same picks every time, so a screenshot is comparable between runs. */
function specimens(s) {
  const out = []
  const days = s.calendar.map((c) => c.day)
  const decks = days.map((d) => ({ d, deck: deckFor(s, d) }))
  const first = (fn) => { for (const { d, deck } of decks) { const c = deck.find(fn); if (c) return { d, c } } return null }
  const add = (id, label, hit) => { if (hit) out.push({ id, label, card: hit.c, day: hit.d }) }

  const open = deckFor(s, DAY)[0]
  if (open) out.push({ id: 'open', label: `open · day ${DAY}`, card: open, day: DAY })
  add('watch', 'watch', first((c) => c.kind === 'watch'))
  add('read-hook', 'read · hook', first((c) => c.kind === 'read' && c.id === 'hook'))
  add('read-picture', 'read · picture', first((c) => c.kind === 'read' && c.id === 'picture'))
  add('read-list', 'read · list', first((c) => c.kind === 'read' && /^- /m.test(c.body || '')))
  add('truth', 'truth', first((c) => c.kind === 'truth'))
  add('point', 'point', first((c) => c.kind === 'point'))
  let longest = null
  for (const { d, deck } of decks) for (const c of deck) if (c.kind === 'point' && (!longest || c.body.length > longest.c.body.length)) longest = { d, c }
  add('point-long', `point · longest (${longest ? longest.c.body.length : 0} chars)`, longest)
  add('quote', 'quote', first((c) => c.kind === 'quote'))
  return out
}

function Frame({ s, spec }) {
  const [foot, setFoot] = useState({ label: 'Continue' })
  const [log, setLog] = useState('')
  const Comp = COMP[spec.card.kind]
  const props = {
    card: spec.card, s, day: spec.day, seriesId: s.id, scale: SCALE, active: true,
    next: () => setLog('next()'), back: () => setLog('back()'),
    setFooter: (f) => { setFoot(f); setLog('setFooter(' + JSON.stringify(f) + ')') },
    share: (r) => setLog('share ' + JSON.stringify(r)),
    review: q.get('review') ? true : undefined,
  }
  return (
    <figure className="pg-fig" data-frame={spec.id}>
      <figcaption>{s.id} · {spec.label}</figcaption>
      <div className="pg-frame" style={{ width: W, height: H }}>
        <div className="pg-top" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
        <Slide><Comp {...props} /></Slide>
        {SHOW_FOOT && !foot.hidden && (
          <div className="pg-foot"><Button variant="primary" size="lg" full>{foot.label || 'Continue'}</Button></div>
        )}
      </div>
      <pre className="pg-log" data-testid="log">{log || ' '}</pre>
    </figure>
  )
}

function App() {
  const sets = useMemo(() => {
    const ids = q.get('series') ? [q.get('series')] : allSeries.map((s) => s.id)
    return ids.map((id) => {
      const s = getSeries(id)
      if (q.get('review')) { try { finishDay(s.id, DAY, 40, {}) } catch (e) { console.warn(e) } }
      return { s, specs: specimens(s).filter((x) => !ONLY || ONLY.includes(x.id)) }
    })
  }, [])
  return (
    <main className="pg">
      <header>
        <h1>slides-read</h1>
        <p>
          {W}×{H} · scale {SCALE} · fx {FX} · day {DAY}
          {' — '}
          {[0.9, 1, 1.3].map((v) => <a key={v} href={`?scale=${v}`}>{v}</a>)}
          {' · '}<a href="?fx=lite">lite</a>{' · '}<a href="?w=360&h=640">360×640</a>{' · '}<a href="?review=1">review</a>
        </p>
      </header>
      {sets.map(({ s, specs }) => (
        <section key={s.id}>
          <h2>{s.title}</h2>
          <div className="pg-grid">{specs.map((sp) => <Frame key={sp.id} s={s} spec={sp} />)}</div>
        </section>
      ))}
      <style>{`
        .pg { padding: 24px 20px 96px; display: grid; gap: 32px; }
        .pg > header h1 { margin: 0; font: 600 13px/1 var(--font-mono); letter-spacing: .06em; color: var(--tele); text-transform: uppercase; }
        .pg > section > h2 { margin: 0 0 16px; font: 600 15px/1.2 var(--font-display); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-2); }
        .pg > header p { margin: 8px 0 0; font: 12px/1.4 var(--font-mono); color: var(--ink-3); }
        .pg > header p a { color: var(--tele); margin: 0 4px; }
        .pg-grid { display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start; }
        .pg-fig { margin: 0; display: grid; gap: 8px; }
        .pg-fig figcaption { font: 11px/1 var(--font-mono); color: var(--ink-3); text-transform: uppercase; letter-spacing: .04em; }
        .pg-frame { position: relative; display: flex; flex-direction: column; overflow: hidden; background: var(--carbon-0); box-shadow: 0 0 0 1px var(--line-2); isolation: isolate; }
        .pg-top { display: flex; gap: 4px; padding: 12px 20px 0; flex: none; }
        .pg-top i { flex: 1; height: 4px; background: var(--carbon-4); }
        .pg-top i:first-child { background: var(--ink-2); }
        .pg-foot { position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 20px 20px; z-index: 5; }
        .pg-log { margin: 0; font: 11px/1.3 var(--font-mono); color: var(--ink-3); min-height: 1.3em; max-width: ${W}px; white-space: pre-wrap; }
      `}</style>
    </main>
  )
}

mount(<App />, { fx: FX })
