// GAME DAY — Sundays. The hub a Sunday node opens (App routes isGameDay days here instead of the Lesson).
// Three games on the week's own material (lib.gameDataFor): ORBIT RUN (flagship), QUIZ BLITZ, SIGNAL MATCH.
// Playing each once completes the day (store.recordGame → finishPure: XP once per Sunday, the streak, the drop, medals).
// Not playing is fine: a Game Day keeps Selah grace (store.graceKind). Props { s, day, close, openLesson }.
// Each game is its own lazy chunk. import.meta.glob (not three static imports) so a game that is not on disk yet
// becomes a placeholder card instead of a build error.
import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, IconButton, toast, useBackClose } from '../../ui/index.js'
import { Icon } from '../../icons.jsx'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'
import { fx } from '../../fx/fx.js'
import { useFxLevel } from '../../fx/motion.js'
import { dayInfo, epOf, fmtDay, gameDataFor, weekOf, title as sentence, GAME_IDS } from '../../lib.js'
import { XP, gameDayFor, gameStats, recordGame, useStore } from '../../store.js'
import './games.css'

const MODS = import.meta.glob(['./orbit/OrbitRun.jsx', './blitz/Blitz.jsx', './match/Match.jsx'])
const GAMES = {
  orbit: { path: './orbit/OrbitRun.jsx', name: 'Orbit Run', tag: 'Flagship', blurb: 'Fly the week. Thread the code lines, dodge the debris.' },
  blitz: { path: './blitz/Blitz.jsx', name: 'Quiz Blitz', tag: '60 seconds', blurb: 'The week’s facts against the clock. Streaks add time.' },
  match: { path: './match/Match.jsx', name: 'Signal Match', tag: 'Memory', blurb: 'Pair every code line with its signal. Fewer moves, more stars.' },
}

function Missing({ onExit, name }) {
  return (
    <div className="gd-missing" role="status">
      <GameGlyph id="orbit" size={56} />
      <h2>{name} is still on the pad</h2>
      <p>This game is not ready on this build yet. The other two count for today.</p>
      <Button variant="secondary" onClick={onExit}>Back to Game Day</Button>
    </div>
  )
}
const loaders = Object.fromEntries(GAME_IDS.map((id) => {
  const load = MODS[GAMES[id].path]
  const fallback = { default: (p) => <Missing {...p} name={GAMES[id].name} /> }
  return [id, lazy(() => (load ? load().catch(() => fallback) : Promise.resolve(fallback)))]
}))

/** A game that throws lands back on the hub, not on a white page. */
class GameFault extends Component {
  state = { err: null }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { console.error('[kind] game fault', err) }
  render() { return this.state.err ? <Missing onExit={this.props.onExit} name={this.props.name} /> : this.props.children }
}

/* ---- drawn glyphs (no emoji) ---------------------------------------------- */
export function GameGlyph({ id, size = 40 }) {
  return (
    <svg className="gd-glyph" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {id === 'orbit' && (<>
        <ellipse cx="24" cy="24" rx="20" ry="8.5" transform="rotate(-24 24 24)" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 3" />
        <circle cx="24" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M37.5 10.5l3.6 1.2-1.2 3.6-2.2.4-1.6-1.6z" fill="currentColor" />
        <circle cx="21" cy="21.5" r="1.6" fill="currentColor" />
      </>)}
      {id === 'blitz' && (<>
        <path d="M27 5L12 27h10l-3 16 17-24H26z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M6 13h6M4 21h5M7 35h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>)}
      {id === 'match' && (<>
        <polygon points="14,6 22,10.5 22,19.5 14,24 6,19.5 6,10.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <polygon points="34,24 42,28.5 42,37.5 34,42 26,37.5 26,28.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M21 21l6 6" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 2.5" />
        <circle cx="14" cy="15" r="2.4" fill="currentColor" /><circle cx="34" cy="33" r="2.4" fill="currentColor" />
      </>)}
    </svg>
  )
}
const STAR = '12,1.5 14.9,8.6 22.5,9.1 16.6,14 18.5,21.5 12,17.4 5.5,21.5 7.4,14 1.5,9.1 9.1,8.6'
const Stars = ({ n }) => (
  <span className="gd-stars" aria-label={`${n} of 3 stars`} role="img">
    {[0, 1, 2].map((i) => <svg key={i} width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" data-on={i < n ? '' : undefined}><polygon points={STAR} /></svg>)}
  </span>
)

/** The daily bonus ring: three arcs, one per game, lit as each is played. */
function BonusRing({ played, done }) {
  const R = 44, C = 2 * Math.PI * R, gap = 10, seg = C / 3 - gap
  return (
    <div className="gd-ring" data-done={done ? '' : undefined}>
      <svg viewBox="0 0 108 108" aria-hidden="true" focusable="false">
        {GAME_IDS.map((id, i) => (
          <circle key={id} cx="54" cy="54" r={R} className="gd-ring__arc" data-on={played.includes(id) ? '' : undefined}
            strokeDasharray={`${seg} ${C - seg}`} strokeDashoffset={-(i * (C / 3)) - gap / 2} transform="rotate(-90 54 54)" />
        ))}
      </svg>
      <div className="gd-ring__mid">
        {done ? <Icon name="check" size={24} weight="solid" /> : <b>{played.length}<small>/3</small></b>}
      </div>
    </div>
  )
}

/** Family talk: the Sunday guide's questions when there is one, else the week's own prompts. */
function talkFor(s, day) {
  const d = dayInfo(s, day)
  const su = d.sunday != null ? s.sundays?.[d.sunday] : null
  const ep = epOf(s, d)
  const wk = weekOf(s, d)
  const qs = [...(su?.questions || []), ...(ep?.questions || []), wk?.ask, wk?.question].filter(Boolean)
  const more = ['What stood out most this week?', 'Where did you see it at school or at home?', 'Which code line will you carry into next week?']
  const all = [...qs, ...more]
  return { title: su?.title ? sentence(su.title) : 'Talk about the week', qs: all.filter((q, i) => all.indexOf(q) === i).slice(0, 3) }
}

export default function GameDay({ s, day, close, openLesson }) {
  const st = useStore()
  const lite = useFxLevel() === 'lite'
  const [playing, setPlaying] = useState(null)
  const [cleared, setCleared] = useState(null) // the finish result, the moment Game Day completes
  const ringRef = useRef(null)
  const data = useMemo(() => gameDataFor(s, day), [s, day])
  const talk = useMemo(() => talkFor(s, day), [s, day])
  const gd = gameDayFor(st, s.id, day)
  const d = dayInfo(s, day)
  const lessonTitle = d.type === 'teaching' && epOf(s, d) ? sentence(epOf(s, d).title) : null
  const theme = useMemo(() => {
    let accent = ''
    try { accent = getComputedStyle(document.documentElement).getPropertyValue('--ignite-flat').trim() || getComputedStyle(document.documentElement).getPropertyValue('--ignite').trim() } catch { /* canvas falls back */ }
    return { accent }
  }, [])

  const exit = useCallback(() => { setPlaying(null); sound.play('close') }, [])
  useBackClose(Boolean(playing), exit)

  const start = (id) => { sound.play('open'); haptic.select(); setPlaying(id) }

  const onFinish = useCallback((res) => {
    if (!playing) return
    let r = null
    try { r = recordGame(s.id, day, playing, { score: Number(res?.score) || 0, stars: Number(res?.stars) || 0 }) } catch (e) { console.error('[kind] game record', e) }
    if (!r) return
    if (r.complete) {
      setCleared(r.complete)
      sound.play('complete'); haptic.success()
      toast({ key: 'gameday', tone: 'ignite', icon: 'trophy', title: 'Game Day cleared', body: `+${r.complete.xp?.total ?? XP.gameDay} XP. Streak ${r.complete.streak?.to ?? ''}`.trim() })
    } else if (r.xp) {
      toast({ key: 'game-' + r.game, tone: 'tele', icon: 'star', title: `${GAMES[r.game].name} logged`, body: `+${r.xp} XP · ${r.count} of ${r.of} games played` })
    } else if (r.newBest) {
      toast({ key: 'best-' + r.game, tone: 'go', icon: 'trophy', title: 'New best', body: `${GAMES[r.game].name}: ${r.best}` })
    }
  }, [playing, s.id, day])

  // the ring lights the moment you come back to a cleared hub
  const celebrate = useRef(false)
  useEffect(() => {
    if (!cleared || playing || celebrate.current || !ringRef.current || lite) return
    celebrate.current = true
    try { const p = fx.at(ringRef.current); fx.confetti({ ...p, n: 60 }) } catch { /* fx is decoration */ }
  }, [cleared, playing, lite])

  if (playing) {
    const Game = loaders[playing]
    return (
      <div className="gd-play" data-game={playing}>
        <GameFault onExit={exit} name={GAMES[playing].name}>
          <Suspense fallback={<div className="gd-load" role="status" aria-label="Loading game"><GameGlyph id={playing} size={64} /><span>{GAMES[playing].name}</span></div>}>
            <Game theme={theme} words={data.words} facts={data.facts} lite={lite} onFinish={onFinish} onExit={exit} />
          </Suspense>
        </GameFault>
      </div>
    )
  }

  const order = ['orbit', 'blitz', 'match']
  return (
    <div className="gd" data-lite={lite ? '' : undefined}>
      <header className="gd-top">
        <IconButton icon="close" label="Close Game Day" onClick={close} />
        <span className="gd-top__eye">{`Day ${d.day} · ${fmtDay(s, d.day)}`}</span>
      </header>

      <section className="gd-hero" aria-labelledby="gd-title">
        <div className="gd-hero__text">
          <span className="gd-eyebrow">Sunday · {s.title}</span>
          <h1 id="gd-title" className="gd-title">Game Day</h1>
          <p className="gd-sub">{gd.complete ? 'Cleared. Play again any time to beat your best.' : 'Play each game once to clear today. It is a rest day: your streak is safe either way.'}</p>
        </div>
        <div ref={ringRef} className="gd-hero__ring">
          <BonusRing played={gd.played} done={gd.complete} />
          <span className="gd-ring__cap">{gd.complete ? 'Bonus earned' : `Daily bonus +${XP.gameDay} XP`}</span>
        </div>
      </section>

      {cleared && (
        <div className="gd-cleared" role="status">
          <Icon name="trophy" size={24} weight="solid" />
          <div><b>Game Day cleared</b><span>{`+${cleared.xp?.total ?? XP.gameDay} XP · streak ${cleared.streak?.to ?? '-'}`}</span></div>
        </div>
      )}

      <ul className="gd-games" role="list">
        {order.map((id) => {
          const g = GAMES[id], rec = gameStats(st, id), done = gd.played.includes(id)
          return (
            <li key={id} className="gd-card" data-game={id} data-flag={id === 'orbit' ? '' : undefined} data-played={done ? '' : undefined}>
              <button type="button" className="gd-card__btn" onClick={() => start(id)} aria-label={`Play ${g.name}${done ? ', played today' : ''}. Best ${rec.best}`}>
                <span className="gd-card__icon"><GameGlyph id={id} size={id === 'orbit' ? 52 : 40} /></span>
                <span className="gd-card__body">
                  <span className="gd-card__tag">{g.tag}{done ? ' · Played' : ''}</span>
                  <span className="gd-card__name">{g.name}</span>
                  <span className="gd-card__blurb">{g.blurb}</span>
                  <span className="gd-card__meta">
                    <span>Best <b>{rec.best}</b></span>
                    <Stars n={rec.stars} />
                    {rec.plays ? <span>{rec.plays} {rec.plays === 1 ? 'play' : 'plays'}</span> : null}
                  </span>
                </span>
                <span className="gd-card__go" aria-hidden="true">{done ? <Icon name="check" size={20} weight="solid" /> : <Icon name="play" size={20} weight="solid" />}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <section className="gd-talk" aria-labelledby="gd-talk-h">
        <span className="gd-eyebrow"><Icon name="family" size={16} /> Family talk</span>
        <h2 id="gd-talk-h">{talk.title}</h2>
        <ol>{talk.qs.map((q, i) => <li key={i}>{q}</li>)}</ol>
      </section>

      {lessonTitle && openLesson ? (
        <button type="button" className="gd-lesson" onClick={openLesson}>
          <Icon name="book" size={20} />
          <span><small>Today’s lesson</small>{lessonTitle}</span>
          <Icon name="chevronRight" size={20} />
        </button>
      ) : null}
      <p className="gd-foot">{data.words.length} code lines · {data.facts.length} facts from this week</p>
    </div>
  )
}
