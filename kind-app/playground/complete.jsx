// complete-shell playground — the Orbit-insertion sequencer in the real shell frame, driven by REAL finishDay results.
//   http://localhost:5183/playground/complete.html
//     ?preset=first|streak7|rankup|perfect|month|rare|again   (default streak7)
//     ?fake=1      the other roles' beats are replaced with fakes (one auto-advances twice, one renders null, one throws) to prove the sequencer
//     ?fx=lite     ?series=secrets-of-longevity     ?now=2026-08-12T19:00 (live clock: T-minus to the next unlock)   ?keep=1 (do not seed the store)
//   On a wide window an editor shows on the left: presets, the result as JSON (edit + Apply), Restart.
//   window.__pg = { load(id), apply(json), result, plan(), BEATS, log }.
// NB: presets seed this browser's KIND store (localStorage 'kind-app-v4') with the state the lesson finished in, unless ?keep=1.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { mountScreen } from './_shell.jsx'
import Complete, { planBeats } from '../src/screens/Complete.jsx'
import { BEATS } from '../src/screens/complete/beats/index.js'
import { activeSeriesId, currentDay, getSeries, keyOfDay } from '../src/lib.js'
import { dev, demoState, playLessonPure } from '../src/store.js'
import { now } from '../src/now.js'
import { applyFxLevel } from '../src/fx/motion.js'
import { prefs } from '../src/prefs.js'

const q = new URLSearchParams(location.search)
const SID = (q.get('series') && getSeries(q.get('series')).id) || activeSeriesId()
const PRESETS = [
  ['first', 'First lesson'], ['streak7', '7-day streak + shield'], ['rankup', 'Rank-up'], ['perfect', 'Perfect day'],
  ['month', 'Month complete'], ['rare', 'Gold card'], ['again', 'Practice (again)'],
]

/** A real finishDay result, from the real engine, on a believable state. */
function build(id, sid = SID) {
  const s = getSeries(sid)
  const n = s.calendar.length
  const clock = now()
  const at = id === 'month' ? new Date(`${keyOfDay(s, n)}T19:00:00`) : clock
  const mid = (days, extra) => ({ ...demoState('mid', { seriesId: sid, days, at }), ...extra })
  const run = (st, day, o) => playLessonPure(st, sid, day, at, o)
  let st, day, out
  if (id === 'first') { st = demoState('fresh', { seriesId: sid, at }); day = currentDay(s, st, at); out = run(st, day, { right: 3, asked: 4 }) }
  else if (id === 'rankup') { st = mid(1, { xp: 262 }); day = currentDay(s, st, at); out = run(st, day, { right: 4, asked: 4 }) }
  else if (id === 'perfect') { st = mid(3); day = currentDay(s, st, at); out = run(st, day, { right: 4, asked: 4 }) }
  else if (id === 'month') { st = mid(n - 1); day = n; out = run(st, day, { right: 4, asked: 4 }) }
  else if (id === 'rare') { st = demoState('fresh', { seriesId: sid, at }); day = (s.codes.find((c) => c.rare) || { day: 7 }).day; out = run(st, day, { right: 4, asked: 4 }) }
  else if (id === 'again') { st = mid(2); day = currentDay(s, st, at); const one = run(st, day, { right: 3, asked: 4 }); out = run(one.next, day, { right: 4, asked: 4 }) }
  else { st = mid(6); day = currentDay(s, st, at); out = run(st, day, { right: 4, asked: 4 }) }            // streak7
  if (!out) throw new Error(`preset ${id}: finishPure returned null (is the day unlocked on this clock?)`)
  return { result: out.result, state: out.next, day, s }
}

/** JSON → result: the one Date in the object (next.unlockAt) comes back from its ISO string. */
const revive = (k, v) => (k === 'unlockAt' && typeof v === 'string' ? new Date(v) : v)

/* ── fake beats, to prove the sequencer without the other roles' work ── */
function fake(name, mode) {
  return function Fake({ active, next, skip }) {
    useEffect(() => {
      if (!active || mode !== 'auto') return undefined
      const t = setTimeout(() => { next(); next() }, 700)          // a double next(): the sequencer must advance exactly once
      return () => clearTimeout(t)
    }, [active])                                                    // eslint-disable-line react-hooks/exhaustive-deps
    if (mode === 'null') return null
    if (mode === 'throw') throw new Error('fake beat failure (expected)')
    return (
      <div className="pg-fake" data-fake={name} style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center' }}>
        <h2 style={{ font: '700 var(--fs-3xl)/1 var(--font-display)', textTransform: 'uppercase', margin: 0 }}>{name}</h2>
        <p style={{ margin: 0, color: 'var(--ink-3)', font: '500 var(--fs-xs)/1 var(--font-mono)' }}>{mode === 'auto' ? 'auto-advances (calls next twice)' : 'fake beat'}</p>
        <div style={{ display: 'flex', gap: 8 }}><button onClick={next}>next()</button><button onClick={skip}>skip()</button></div>
      </div>
    )
  }
}
const MODES = { rings: 'plain', streak: 'auto', shield: 'plain', milestone: 'plain', card: 'null', drop: 'plain', rank: 'plain', 'rank-up': 'plain', medals: 'throw', patch: 'plain' }
if (q.get('fake') === '1') for (const [id, mode] of Object.entries(MODES)) BEATS[id] = fake(id, mode)

/* ── the page ── */
function Playground() {
  const [id, setId] = useState(q.get('preset') || 'streak7')
  const [pack, setPack] = useState(() => build(id))
  const [json, setJson] = useState(() => JSON.stringify(pack.result, null, 1))
  const [run, setRun] = useState(0)
  const [err, setErr] = useState('')
  const log = useMemo(() => [], [])

  const load = useCallback((pid) => {
    const p = build(pid)
    if (q.get('keep') !== '1') dev.set(p.state)
    setId(pid); setPack(p); setJson(JSON.stringify(p.result, null, 1)); setErr(''); setRun((r) => r + 1)
    return p
  }, [])
  const apply = useCallback((text) => {
    try { const r = JSON.parse(text, revive); setPack((p) => ({ ...p, result: r, day: r.day ?? p.day })); setErr(''); setRun((k) => k + 1) } catch (e) { setErr(String(e.message)) }
  }, [])
  useEffect(() => { if (q.get('keep') !== '1') dev.set(pack.state) }, [])        // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    window.__pg = { load, apply, restart: () => setRun((r) => r + 1), result: pack.result, plan: () => planBeats(pack.result), BEATS, log }
  }, [load, apply, pack, log])

  const setFx = (v) => { prefs.set('fx', v); applyFxLevel(); setRun((r) => r + 1) }
  const onClose = () => { log.push('onClose'); console.log('[complete] onClose'); document.title = 'closed'; setRun((r) => r + 1) }

  return (
    <>
      <style>{`
        .pg-ed { display: none; }
        @media (min-width: 1000px) {
          .pg-ed { display: grid; align-content: start; gap: 10px; position: fixed; z-index: 500; inset: 0 auto 0 0; width: 360px; padding: 16px; overflow: auto;
            background: var(--carbon-1); border-right: 1px solid var(--line-2); font: 500 var(--fs-xs)/1.4 var(--font-mono); color: var(--ink-2); }
        }
        .pg-ed h1 { margin: 0; font: 700 var(--fs-lg)/1 var(--font-display); letter-spacing: var(--track-label); text-transform: uppercase; color: var(--ink); }
        .pg-ed button { font: inherit; padding: 6px 10px; border-radius: var(--r-xs); border: 1px solid var(--line-2); background: var(--carbon-3); color: var(--ink); cursor: pointer; }
        .pg-ed button[aria-pressed='true'] { border-color: var(--tele); color: var(--tele); }
        .pg-ed textarea { width: 100%; height: 340px; resize: vertical; box-sizing: border-box; font: 11px/1.35 var(--font-mono); background: var(--carbon-0); color: var(--ink-2); border: 1px solid var(--line-2); border-radius: var(--r-xs); padding: 8px; }
        .pg-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .pg-err { color: var(--nogo); }
      `}</style>
      <aside className="pg-ed" aria-label="Result editor">
        <h1>complete-shell</h1>
        <div className="pg-row">{PRESETS.map(([pid, label]) => <button key={pid} aria-pressed={id === pid} onClick={() => load(pid)}>{label}</button>)}</div>
        <div className="pg-row">
          <button onClick={() => setRun((r) => r + 1)}>Restart</button>
          <button onClick={() => setFx('lite')}>fx lite</button><button onClick={() => setFx('full')}>fx full</button><button onClick={() => setFx('auto')}>fx auto</button>
        </div>
        <div>beats: {planBeats(pack.result).join(' › ')}</div>
        <textarea value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} aria-label="result JSON" />
        <div className="pg-row"><button onClick={() => apply(json)}>Apply JSON</button></div>
        {err ? <div className="pg-err">{err}</div> : null}
        <div>clock: {now().toString().slice(0, 21)}</div>
      </aside>
      <Complete key={run} s={pack.s} day={pack.day} result={pack.result} onClose={onClose} />
    </>
  )
}

if (q.get('fx') === 'lite') prefs.set('fx', 'lite')
mountScreen(<Playground />, { bare: true, extra: { share: (r) => { console.log('[shell] share', r.kind); document.body.dataset.shared = r.kind } } })
applyFxLevel()            // after mount: _boot writes data-fx itself; the app's main.jsx lets prefs + reduced-motion decide, so do the same
