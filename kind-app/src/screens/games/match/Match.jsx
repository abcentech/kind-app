// SIGNAL MATCH — a memory game on hex tiles. Each word pairs with the glyph that stands for it.
// Three levels grow the board; fewer moves earn more stars. Self-contained, lazy-loaded by the Game Day screen.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { fx } from '../../../fx/fx.js'
import { Icon } from '../../../icons.jsx'
import Button from '../../../ui/Button.jsx'
import './match.css'

const BEST_KEY = 'kind-match-best'
const LEVELS = [{ pairs: 6, cols: 4 }, { pairs: 8, cols: 4 }, { pairs: 10, cols: 5 }]   // 4x3, 4x4, 5x4 (4 cols on narrow phones)
const PAD = ['Faith', 'Love', 'Joy', 'Peace', 'Hope', 'Truth', 'Honour', 'Service', 'Grit', 'Wisdom']
const TICK = 250
const MISS_MS = 720
const TOTAL_PAIRS = LEVELS.reduce((s, l) => s + l.pairs, 0)

// Ten abstract glyphs on a 24-unit grid. Stroke only; colour comes from CSS.
const GLYPHS = [
  <g key="0"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.4" /></g>,
  <polygon key="1" points="12,4 20,19 4,19" />,
  <g key="2"><polyline points="4,8 12,4 20,8" /><polyline points="4,14 12,10 20,14" /><polyline points="4,20 12,16 20,20" /></g>,
  <polygon key="3" points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" />,
  <polygon key="4" points="7,4 17,4 20,7 20,17 17,20 7,20 4,17 4,7" />,
  <g key="5"><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" /><circle cx="12" cy="12" r="2.4" /></g>,
  <g key="6"><line x1="12" y1="4" x2="12" y2="20" /><line x1="4" y1="12" x2="20" y2="12" /><rect x="8" y="8" width="8" height="8" /></g>,
  <g key="7"><polygon points="12,3 21,12 12,21 3,12" /><polygon points="12,8 16,12 12,16 8,12" /></g>,
  <g key="8"><path d="M4 20 A16 16 0 0 1 20 4" /><path d="M9 20 A11 11 0 0 1 20 9" /></g>,
  <polygon key="9" points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10" />,
]

const shuffle = (a) => {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

// Week's words first, generic values pad the pool so every level has enough distinct pairs.
function poolFrom(words) {
  const seen = new Set()
  const out = []
  for (const w of [...(Array.isArray(words) ? words : []), ...PAD]) {
    if (typeof w !== 'string') continue
    const t = w.trim().slice(0, 18)
    const k = t.toLowerCase()
    if (!t || seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

function buildLevel(pool, level) {
  const values = shuffle(pool).slice(0, level.pairs)
  const tiles = []
  values.forEach((text, pair) => {
    tiles.push({ pair, kind: 'word', text, long: text.length > 8 })
    tiles.push({ pair, kind: 'glyph', glyph: pair, text: '' })
  })
  return shuffle(tiles)
}

// Stars judged on moves per pair: a clean run is 1.0. Score rewards pairs, few extra moves and speed.
function scoreRun(moves, ms) {
  const extra = Math.max(0, moves - TOTAL_PAIRS)
  const moveBonus = Math.max(0, TOTAL_PAIRS * 2 - extra) * 40
  const timeBonus = Math.max(0, Math.round(300 - ms / 1000)) * 2
  const ratio = moves / TOTAL_PAIRS
  return {
    score: TOTAL_PAIRS * 100 + moveBonus + timeBonus,
    stars: ratio <= 1.5 ? 3 : ratio <= 2.2 ? 2 : 1,
  }
}

function readBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
}
function writeBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)) } catch { /* private mode: best simply not kept */ }
}

const clock = (ms) => {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function Match({ theme, words, lite = false, onFinish, onExit }) {
  const pool = useMemo(() => poolFrom(words), [words])
  const [phase, setPhase] = useState('ready')     // ready | play | between | done
  const [li, setLi] = useState(0)
  const [tiles, setTiles] = useState([])
  const [cols, setCols] = useState(4)
  const [up, setUp] = useState([])                 // tile indexes face-up right now (max 2)
  const [got, setGot] = useState([])               // matched pair ids
  const [moves, setMoves] = useState(0)
  const [ms, setMs] = useState(0)
  const [hidden, setHidden] = useState(false)
  const [final, setFinal] = useState(null)
  const [best, setBest] = useState(readBest)
  const missTimer = useRef(0)

  useEffect(() => () => clearTimeout(missTimer.current), [])

  const start = useCallback((i) => {
    const L = LEVELS[i]
    const wide = typeof window !== 'undefined' && window.innerWidth >= 390
    setCols(Math.min(L.cols, wide ? 5 : 4))
    setLi(i)
    setTiles(buildLevel(pool, L))
    setUp([])
    setGot([])
    setPhase('play')
  }, [pool])

  const begin = () => {
    setMoves(0)
    setMs(0)
    setFinal(null)
    start(0)
  }

  // Clock runs only while a level is live and the tab is visible.
  useEffect(() => {
    if (phase !== 'play' || hidden) return undefined
    const id = setInterval(() => setMs((m) => m + TICK), TICK)
    return () => clearInterval(id)
  }, [phase, hidden])

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState !== 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // A level is cleared when every pair has been matched.
  useEffect(() => {
    if (phase !== 'play' || !tiles.length) return
    if (got.length === LEVELS[li].pairs) {
      setPhase('between')
      sound.play('next')
      haptic.success()
    }
  }, [got, phase, li, tiles.length])

  useEffect(() => {
    if (phase !== 'between') return undefined
    const last = li === LEVELS.length - 1
    const id = setTimeout(() => (last ? setPhase('done') : start(li + 1)), last ? 1000 : 1100)
    return () => clearTimeout(id)
  }, [phase, li, start])

  useEffect(() => {
    if (phase !== 'done' || final) return
    const r = scoreRun(moves, ms)
    const nb = Math.max(best, r.score)
    if (nb > best) { writeBest(nb); setBest(nb) }
    setFinal({ ...r, best: nb })
    sound.play('complete')
    haptic.heavy()
  }, [phase, final, moves, ms, best])

  const flip = (i, e) => {
    if (phase !== 'play' || up.length >= 2) return
    const t = tiles[i]
    if (up.includes(i) || got.includes(t.pair)) return
    sound.play('select')
    haptic.select()
    const next = [...up, i]
    setUp(next)
    if (next.length < 2) return
    setMoves((m) => m + 1)
    const [a, b] = next
    if (tiles[a].pair === tiles[b].pair) {
      sound.play('correct')
      haptic.success()
      if (!lite && e?.currentTarget) {
        const p = fx.at(e.currentTarget)
        fx.sparks({ x: p.x, y: p.y, n: 18, power: 0.9 })
      }
      setGot((g) => [...g, tiles[a].pair])
      setUp([])
    } else {
      clearTimeout(missTimer.current)
      missTimer.current = setTimeout(() => {
        sound.play('wrong')
        haptic.warning()
        setUp([])
      }, lite ? 420 : MISS_MS)
    }
  }

  const L = LEVELS[li] || LEVELS[0]
  const pct = phase === 'done' ? 1 : got.length / L.pairs
  const playing = phase === 'play' || phase === 'between'

  return (
    <section className="match-root" style={{ '--match-accent': theme?.accent }} aria-label="Signal Match">
      <header className="match-top">
        <p className="match-kicker">Game day · Signal Match</p>
        {onExit && <Button variant="ghost" size="sm" onClick={onExit}>Exit</Button>}
      </header>

      {phase === 'ready' && (
        <div className="match-panel">
          <h2 className="match-title">Signal Match</h2>
          <p className="match-copy">Match every word to the glyph that carries it. Fewer moves earn more stars. Three levels, one clock.</p>
          {best > 0 && <p className="match-best">Best score {best}</p>}
          <div className="match-actions">
            <Button variant="primary" size="lg" full onClick={begin}>Start</Button>
          </div>
        </div>
      )}

      {playing && (
        <>
          <div className="match-hud">
            <div className="match-stat"><span>Level</span><b>{li + 1} / {LEVELS.length}</b></div>
            <div className="match-stat"><span>Moves</span><b>{String(moves).padStart(2, '0')}</b></div>
            <div className="match-stat"><span>Time</span><b>{clock(ms)}</b></div>
          </div>

          <div className="match-meter" role="progressbar" aria-label="Pairs matched" aria-valuemin={0} aria-valuemax={L.pairs} aria-valuenow={got.length}>
            <span style={{ width: `${pct * 100}%` }} />
          </div>

          <div className="match-board" style={{ '--cols': cols }}>
            {tiles.map((t, i) => {
              const isUp = up.includes(i)
              const isGot = got.includes(t.pair)
              const face = isUp || isGot
              const cls = ['match-tile', face && 'is-up', isGot && 'is-matched', isUp && up.length === 2 && 'is-wrong']
                .filter(Boolean).join(' ')
              const label = face
                ? (t.kind === 'word' ? t.text : `Glyph ${t.glyph + 1}`)
                : `Hidden tile ${i + 1}`
              return (
                <button
                  key={`${t.pair}-${t.kind}`}
                  type="button"
                  className={cls}
                  data-long={t.long ? '1' : undefined}
                  aria-label={label}
                  aria-disabled={isGot || phase !== 'play' ? 'true' : undefined}
                  onClick={(e) => flip(i, e)}
                >
                  <span className="match-card">
                    <span className="match-face match-back">
                      <svg className="match-sigil" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <polygon points="12,5 18,8.5 18,15.5 12,19 6,15.5 6,8.5" />
                      </svg>
                    </span>
                    <span className="match-face match-front">
                      {t.kind === 'word'
                        ? <span className="match-word">{t.text}</span>
                        : <svg className="match-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{GLYPHS[t.glyph % GLYPHS.length]}</svg>}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <p className="match-banner" role="status" aria-live="polite">
            {phase === 'between' ? (li === LEVELS.length - 1 ? 'Signal locked' : `Level ${li + 1} cleared`) : ''}
          </p>
        </>
      )}

      {phase === 'done' && final && (
        <div className="match-panel">
          <p className="match-kicker">Run complete</p>
          <p className="match-score" aria-label={`Score ${final.score}`}>{final.score}</p>
          <div className="match-stars" role="img" aria-label={`${final.stars} of 3 stars`}>
            {[1, 2, 3].map((n) => (
              <Icon key={n} name="star" size={32} weight={n <= final.stars ? 'solid' : 'line'} className={n <= final.stars ? 'is-lit' : undefined} />
            ))}
          </div>
          <p className="match-best">Best {final.best} · {moves} moves · {clock(ms)}</p>
          <div className="match-actions">
            <Button variant="primary" size="lg" full onClick={() => onFinish?.({ score: final.score, stars: final.stars, best: final.best })}>Collect</Button>
            <Button variant="secondary" size="md" full onClick={begin}>Play again</Button>
          </div>
        </div>
      )}
    </section>
  )
}
