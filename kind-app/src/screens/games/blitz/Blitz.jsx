// KIND v7 · Game Day · Quiz Blitz. 60 seconds, one question at a time, the week's facts.
// Contract: docs/V7-CONTRACT.md · games/README shape: { theme, words, facts, lite, onFinish, onExit }.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { useReducedMotion } from '../../../fx/motion.js'
import './blitz.css'

const ROUND_MS = 60000
const BONUS_MS = 2000      // every 5 in a row
const PENALTY_MS = 3000    // a miss
const DECK_SIZE = 60       // more than a round can ever use
const LOCK_OK = 220
const LOCK_BAD = 620
const BEST_KEY = 'kind-blitz-best'
const RING_R = 52
const RING_C = 2 * Math.PI * RING_R
const FLAME = 'M20 2C26 14 38 20 36 34C34 46 26 50 20 50C14 50 6 46 4 34C3 26 8 22 11 16C13 24 15 26 18 27C16 18 17 10 20 2Z'
const STAR = '12,1 15,9 23.5,9 16.6,14.2 19.2,22.5 12,17.5 4.8,22.5 7.4,14.2 0.5,9 9,9'
const ZERO = { score: 0, combo: 0, bestCombo: 0, right: 0, total: 0 }

function readBest() {
  try {
    const v = Number(localStorage.getItem(BEST_KEY))
    return Number.isFinite(v) && v > 0 ? v : 0
  } catch {
    return 0
  }
}

function writeBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)) } catch { /* private window: best just does not persist */ }
}

function shuffle(list) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  return a
}

// Accepts answer as an option index or as the option text. Drops anything malformed.
function normalise(facts) {
  const out = []
  for (const f of Array.isArray(facts) ? facts : []) {
    if (!f || typeof f.q !== 'string' || !Array.isArray(f.options) || f.options.length !== 4) continue
    const opts = f.options.map(String)
    const ans = typeof f.answer === 'number' ? f.answer : opts.indexOf(String(f.answer))
    if (ans >= 0 && ans < 4) out.push({ q: f.q, opts, ans })
  }
  return out
}

// Options are shuffled per question so the right answer never sits in the same key for long.
function buildDeck(pool) {
  const deck = []
  while (deck.length < DECK_SIZE) {
    for (const f of shuffle(pool)) {
      const order = shuffle([0, 1, 2, 3])
      deck.push({ q: f.q, opts: order.map((i) => f.opts[i]), ans: order.indexOf(f.ans) })
      if (deck.length >= DECK_SIZE) break
    }
  }
  return deck
}

function starsFor(right, total) {
  const acc = total ? right / total : 0
  return acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.4 ? 1 : 0
}

export default function Blitz({ theme, facts, lite, onFinish, onExit }) {
  const reduce = useReducedMotion()
  const calm = lite || reduce
  const uid = useId()
  const flameId = uid
  const cid = `blitz-clip-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const pool = useMemo(() => normalise(facts), [facts])

  const [phase, setPhase] = useState('ready') // ready | play | paused | over
  const [q, setQ] = useState(null)
  const [picked, setPicked] = useState(null)
  const [stats, setStats] = useState(ZERO)
  const [secs, setSecs] = useState(60)
  const [best, setBest] = useState(readBest)
  const [result, setResult] = useState(null)
  const [live, setLive] = useState('')

  // Hot-path state lives in refs: the clock runs every frame and must not re-render React.
  const msRef = useRef(ROUND_MS)
  const secRef = useRef(60)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const timerRef = useRef(0)
  const lockRef = useRef(false)
  const pendingRef = useRef(false)   // a lock was pending when paused: advance on resume
  const phaseRef = useRef('ready')
  const statsRef = useRef(ZERO)
  const deckRef = useRef([])
  const ptrRef = useRef(0)
  const curRef = useRef(null)
  const poolRef = useRef(pool)
  const ringRef = useRef(null)
  const cardRef = useRef(null)
  const onFinishRef = useRef(onFinish)
  const fns = useRef({})

  poolRef.current = pool
  onFinishRef.current = onFinish

  const setP = (p) => { phaseRef.current = p; setPhase(p) }
  const commit = (next) => { statsRef.current = next; setStats(next) }

  const paintRing = () => {
    const ms = msRef.current
    const max = Math.max(ROUND_MS, ms)
    if (ringRef.current) ringRef.current.style.strokeDashoffset = String(RING_C * (1 - ms / max))
  }

  const syncSecs = () => {
    const s = Math.ceil(msRef.current / 1000)
    if (s !== secRef.current) {
      secRef.current = s
      setSecs(s)
      if (s > 0 && s <= 3) sound.play('countdown')
    }
  }

  const nextQ = () => {
    if (phaseRef.current !== 'play') return
    const pl = poolRef.current
    if (!pl.length) return
    if (ptrRef.current >= deckRef.current.length - 5) deckRef.current = deckRef.current.concat(buildDeck(pl))
    const cur = deckRef.current[ptrRef.current++]
    curRef.current = cur
    lockRef.current = false
    setPicked(null)
    setQ(cur)
  }

  fns.current.finish = () => {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(timerRef.current)
    lockRef.current = false
    pendingRef.current = false
    setP('over')
    const s = statsRef.current
    const prev = readBest()
    const top = Math.max(prev, s.score)
    if (top > prev) writeBest(top)
    setBest(top)
    const stars = starsFor(s.right, s.total)
    const r = { score: s.score, stars, best: top, right: s.right, total: s.total, bestCombo: s.bestCombo, record: top > prev && top > 0 }
    setResult(r)
    setLive(`Round over. Score ${s.score}.`)
    sound.play('complete')
    haptic.success()
    onFinishRef.current?.({ score: s.score, stars, best: top })
  }

  const loop = (ts) => {
    const last = lastRef.current || ts
    lastRef.current = ts
    msRef.current = Math.max(0, msRef.current - Math.min(64, ts - last))
    paintRing()
    syncSecs()
    if (msRef.current <= 0) { fns.current.finish(); return }
    rafRef.current = requestAnimationFrame(loop)
  }

  const runClock = () => {
    cancelAnimationFrame(rafRef.current)
    lastRef.current = 0
    rafRef.current = requestAnimationFrame(loop)
  }

  fns.current.start = () => {
    try { clearTimeout(timerRef.current) } catch { /* noop */ }
    msRef.current = ROUND_MS
    secRef.current = 60
    setSecs(60)
    paintRing()
    deckRef.current = buildDeck(poolRef.current)
    ptrRef.current = 0
    pendingRef.current = false
    commit(ZERO)
    setResult(null)
    setLive('')
    setP('play')
    nextQ()
    runClock()
  }

  fns.current.pause = () => {
    if (phaseRef.current !== 'play') return
    cancelAnimationFrame(rafRef.current)
    clearTimeout(timerRef.current)
    // A feedback lock cannot survive a pause: finish the question on resume instead.
    pendingRef.current = lockRef.current
    lockRef.current = false
    setP('paused')
  }

  fns.current.resume = () => {
    if (phaseRef.current !== 'paused') return
    setP('play')
    if (pendingRef.current) { pendingRef.current = false; nextQ() }
    runClock()
  }

  fns.current.answer = (i) => {
    if (phaseRef.current !== 'play' || lockRef.current || !curRef.current) return
    lockRef.current = true
    const cur = curRef.current
    const ok = i === cur.ans
    setPicked(i)
    const s = statsRef.current
    if (ok) {
      const combo = s.combo + 1
      if (combo % 5 === 0) {
        msRef.current = Math.min(msRef.current + BONUS_MS, ROUND_MS + 15000)
        sound.play('combo')
        haptic.warning()
      } else {
        sound.play('correct')
        haptic.success()
      }
      commit({ score: s.score + 100 * combo, combo, bestCombo: Math.max(s.bestCombo, combo), right: s.right + 1, total: s.total + 1 })
      setLive(combo % 5 === 0 ? `Correct. Combo ${combo}. Plus two seconds.` : `Correct. Combo ${combo}.`)
    } else {
      msRef.current = Math.max(0, msRef.current - PENALTY_MS)
      commit({ ...s, combo: 0, total: s.total + 1 })
      sound.play('wrong')
      haptic.error()
      const card = cardRef.current
      if (card && !calm) {
        card.classList.remove('is-shake')
        void card.offsetWidth // restart the shake
        card.classList.add('is-shake')
      }
      setLive('Wrong. Minus three seconds.')
    }
    paintRing()
    syncSecs()
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(nextQ, ok ? LOCK_OK : LOCK_BAD)
  }

  // Keyboard: 1-4 answer, P or Escape pauses, Escape exits from ready and over.
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const p = phaseRef.current
      if (p === 'play') {
        const n = Number(e.key)
        if (n >= 1 && n <= 4) { e.preventDefault(); fns.current.answer(n - 1) }
        else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); fns.current.pause() }
      } else if (p === 'paused') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { e.preventDefault(); fns.current.resume() }
      }
    }
    const onVis = () => { if (document.hidden) fns.current.pause() }
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onVis)
      cancelAnimationFrame(rafRef.current)
      clearTimeout(timerRef.current)
    }
  }, [])

  const exit = () => {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(timerRef.current)
    onExit?.()
  }

  const level = Math.min(1, stats.combo / 10)
  const acc = stats.total ? Math.round((100 * stats.right) / stats.total) : 0
  const hasDeck = pool.length > 0

  if (!hasDeck) {
    return (
      <section className="blitz" aria-labelledby={flameId}>
        <div className="blitz-panel" role="status">
          <p className="blitz-kicker">Game day</p>
          <h2 id={flameId} className="blitz-title">Quiz Blitz</h2>
          <p className="blitz-body">This week has no questions yet. Come back after the next lesson.</p>
          <button type="button" className="blitz-btn blitz-btn--ghost" onClick={exit}>Back</button>
        </div>
      </section>
    )
  }

  return (
    <section
      className="blitz"
      style={theme?.accent ? { '--blitz-accent': theme.accent } : undefined}
      data-phase={phase}
      aria-label="Quiz Blitz"
    >
      <p className="blitz-sr" role="status" aria-live="polite">{live}</p>

      <header className="blitz-hud">
        <button type="button" className="blitz-exit" onClick={exit} aria-label="Exit Quiz Blitz">Exit</button>

        <div className="blitz-clock" aria-label={`${secs} seconds left`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="blitz-ring-track" cx="60" cy="60" r={RING_R} />
            <circle
              ref={ringRef}
              className="blitz-ring"
              cx="60" cy="60" r={RING_R}
              strokeDasharray={RING_C}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <span className="blitz-clock__n">{secs}</span>
        </div>

        <div className="blitz-score">
          <span className="blitz-label">Score</span>
          <b className="blitz-score__n">{stats.score}</b>
        </div>

        <button
          type="button"
          className="blitz-pause"
          onClick={() => (phase === 'paused' ? fns.current.resume() : fns.current.pause())}
          disabled={phase !== 'play' && phase !== 'paused'}
          aria-label={phase === 'paused' ? 'Resume' : 'Pause'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {phase === 'paused'
              ? <path d="M8 5l11 7-11 7z" />
              : <path d="M7 5h4v14H7zM13 5h4v14h-4z" />}
          </svg>
        </button>
      </header>

      <div className="blitz-meter" aria-label={`Combo ${stats.combo}`}>
        <svg viewBox="0 0 40 52" aria-hidden="true" className="blitz-flame">
          <defs>
            <clipPath id={cid}>
              <rect x="0" y={52 * (1 - level)} width="40" height="52" />
            </clipPath>
          </defs>
          <path className="blitz-flame__track" d={FLAME} />
          <path className="blitz-flame__fill" d={FLAME} clipPath={`url(#${cid})`} />
        </svg>
        <span className="blitz-combo">
          <span className="blitz-label">Combo</span>
          <b>{stats.combo > 0 ? `x${stats.combo}` : '0'}</b>
        </span>
        <span className="blitz-meter__hint">{stats.combo > 0 ? `+${100 * (stats.combo + 1)} next` : 'Build a streak'}</span>
      </div>

      {q && (
        <div className="blitz-card" ref={cardRef} key={ptrRef.current}>
          <p className="blitz-q">{q.q}</p>
          <div className="blitz-opts" role="group" aria-label="Answers">
            {q.opts.map((o, i) => {
              let state = ''
              if (picked !== null) {
                if (i === q.ans) state = ' is-right'
                else if (i === picked) state = ' is-wrong'
                else state = ' is-dim'
              }
              return (
                <button
                  key={i}
                  type="button"
                  className={`blitz-opt${state}`}
                  onClick={() => fns.current.answer(i)}
                  disabled={picked !== null || phase !== 'play'}
                >
                  <kbd aria-hidden="true">{i + 1}</kbd>
                  <span>{o}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {phase === 'ready' && (
        <div className="blitz-overlay">
          <div className="blitz-panel">
            <p className="blitz-kicker">Game day</p>
            <h2 className="blitz-title">Quiz Blitz</h2>
            <ul className="blitz-rules">
              <li><span>60</span> seconds on the clock</li>
              <li><span>+100</span> times your combo per right answer</li>
              <li><span>+2s</span> every 5 in a row</li>
              <li><span>-3s</span> for a miss</li>
            </ul>
            {best > 0 && <p className="blitz-best">Best {best}</p>}
            <button type="button" className="blitz-btn" onClick={() => fns.current.start()} autoFocus>Start</button>
            <button type="button" className="blitz-btn blitz-btn--ghost" onClick={exit}>Not now</button>
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div className="blitz-overlay">
          <div className="blitz-panel">
            <p className="blitz-kicker">Paused</p>
            <p className="blitz-body">The clock is stopped.</p>
            <button type="button" className="blitz-btn" onClick={() => fns.current.resume()} autoFocus>Resume</button>
            <button type="button" className="blitz-btn blitz-btn--ghost" onClick={exit}>Exit</button>
          </div>
        </div>
      )}

      {phase === 'over' && result && (
        <div className="blitz-overlay">
          <div className="blitz-panel">
            <p className="blitz-kicker">Round complete</p>
            <p className="blitz-final">{result.score}</p>
            <p className="blitz-record">{result.record ? 'New best' : `Best ${best}`}</p>
            <div className="blitz-stars" role="img" aria-label={`${result.stars} of 3 stars`}>
              {[1, 2, 3].map((n) => (
                <svg key={n} viewBox="0 0 24 24" className={n <= result.stars ? 'is-on' : ''} aria-hidden="true">
                  <polygon points={STAR} />
                </svg>
              ))}
            </div>
            <dl className="blitz-stats">
              <div><dt>Accuracy</dt><dd>{acc}%</dd></div>
              <div><dt>Longest combo</dt><dd>{result.bestCombo}</dd></div>
              <div><dt>Right</dt><dd>{result.right} of {result.total}</dd></div>
            </dl>
            <button type="button" className="blitz-btn" onClick={() => fns.current.start()} autoFocus>Play again</button>
            <button type="button" className="blitz-btn blitz-btn--ghost" onClick={exit}>Done</button>
          </div>
        </div>
      )}
    </section>
  )
}
