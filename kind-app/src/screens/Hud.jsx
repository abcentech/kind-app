// Hud — the global instrument bar. A glass slab over every tab (opaque carbon in lite): the mission on the left,
// streak · XP · shields on the right, and a 2px burn line along the bottom edge that fills with today's XP goal.
//
// Everything shown is read at render time (streakInfo, never st.streak). The bar is unmounted while a lesson is open, so the
// numbers it last showed live in a module-level memory: coming back, each stat starts from what you saw last, waits out the
// screen transition, then counts up to the truth and pulses (ring + pop). On a cold start the numbers spin up from zero.
// Each stat is a 48px button that opens its sheet; the sheets are lazy chunks, warmed on touch/hover/focus.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useShell } from '../shell.jsx'
import { rings, useStore, useStreak } from '../store.js'
import { modeOf } from '../lib.js'
import { aria } from '../copy.js'
import { Counter } from '../ui/index.js'
import { cx, usePress } from '../ui/Button.jsx'
import { FlameMark, ShieldEmblem } from '../art/index.js'
import { Icon } from '../icons.jsx'
import { flameLevel } from './hud/parts.jsx'

const loaders = {
  streak: () => import('./hud/StreakSheet.jsx'),
  xp: () => import('./hud/XpSheet.jsx'),
  shield: () => import('./hud/ShieldSheet.jsx'),
  mission: () => import('./hud/MissionSheet.jsx'),
}
const Sheets = Object.fromEntries(Object.entries(loaders).map(([k, load]) => [k, lazy(load)]))
const warm = (k) => { loaders[k]().catch(() => {}) }      // import() is cached: this just starts the fetch early

/* ── tick-up memory ──────────────────────────────────────────────────────── */
const seen = {}                                            // key → the last value this bar displayed

/**
 * Drive a number toward `target` with the HUD's choreography.
 *   returns { from, shown, bump } — hand `from`/`shown` to <Counter>, and `bump` (0, 1, 2… ) to the stat so it can pulse.
 * First ever mount: from 0 when `ramp` (the spin-up), else straight to the value, no pulse. Remount after a lesson: starts from what
 * was last shown, holds `wait` ms for the screen to settle, then moves and pulses if it went up.
 */
function useTicker(key, target, { ramp = false, wait = 520 } = {}) {
  const returning = useRef(key in seen)
  const intro = useRef(ramp && !returning.current)
  const [from] = useState(() => (key in seen ? seen[key] : ramp ? 0 : target))
  const [shown, setShown] = useState(from)
  const [bump, setBump] = useState(0)
  useEffect(() => {
    if (shown === target) return undefined
    const t = setTimeout(() => {
      if (!intro.current && target > shown) setBump((b) => b + 1)
      intro.current = false
      returning.current = false
      setShown(target)
    }, returning.current ? wait : 0)
    return () => clearTimeout(t)
  }, [target, shown, wait])
  useEffect(() => { seen[key] = shown }, [key, shown])
  return { from, shown, bump }
}

/* ── a stat button ───────────────────────────────────────────────────────── */
function Stat({ kind, state, label, bump, open, onOpen, children }) {
  const ref = useRef(null)
  usePress(ref)
  const warmUp = () => warm(kind)
  return (
    <button
      ref={ref} type="button" className="hud-stat" data-kind={kind} data-state={state}
      data-bump={bump ? (bump % 2 ? 'a' : 'b') : undefined}
      aria-label={label} aria-haspopup="dialog" aria-expanded={open}
      onPointerDown={warmUp} onPointerEnter={warmUp} onFocus={warmUp} onClick={onOpen}
    >
      <span className="hud-stat__ping" aria-hidden="true" />
      <span className="hud-stat__in">{children}</span>
    </button>
  )
}

export function Hud({ s }) {
  const shell = useShell() || {}
  const st = useStore()
  const info = useStreak()
  const [open, setOpen] = useState(null)
  const [loaded, setLoaded] = useState({})
  const missionRef = useRef(null)
  usePress(missionRef)

  const show = useCallback((k) => {
    warm(k)
    setLoaded((m) => (m[k] ? m : { ...m, [k]: true }))
    setOpen(k)
  }, [])
  const close = useCallback(() => setOpen(null), [])
  const swap = useCallback((k) => { setOpen(null); setTimeout(() => show(k), 300) }, [show])
  useEffect(() => { const id = setTimeout(() => Object.keys(loaders).forEach(warm), 2500); return () => clearTimeout(id) }, [])

  const streak = useTicker('streak', info.count, { ramp: true })
  const xp = useTicker('xp', st.xp, { ramp: true })
  const held = Math.min(info.max, Math.max(0, info.held))
  const bays = useTicker('shields', held)

  const goal = rings(st)[1]
  const mode = shell.mode || modeOf(s)
  const mon = String(s.month || '').slice(0, 3).toUpperCase()
  const modeTag = mode === 'live' ? 'LIVE' : mode === 'upcoming' ? 'SOON' : 'ARCHIVE'
  const modeTone = mode === 'live' ? 'go' : mode === 'upcoming' ? 'tele' : 'ink'

  const risk = info.state === 'at-risk'
  const streakName = [
    aria.streak(info.count),
    info.doneToday ? 'Done today.' : risk ? 'Today’s lesson is still to do.' : info.restDay ? 'A Selah rest day.' : '',
    'Opens streak details.',
  ].filter(Boolean).join(' ')

  return (
    <header className="hud" aria-label="Flight status">
      <button
        type="button" className="hud-mission" aria-haspopup="dialog" aria-expanded={open === 'mission'}
        aria-label={`Mission: ${s.title}, ${s.month || ''} ${s.year || ''}, ${modeTag.toLowerCase()}. Change mission.`}
        onPointerDown={() => warm('mission')} onFocus={() => warm('mission')} onClick={() => show('mission')}
        ref={missionRef}
      >
        <span className="hud-mission__top">
          <i className="hud-led" data-tone={modeTone} aria-hidden="true" />
          <span>{mon} · {modeTag}</span>
          <Icon.chevronDown size={16} />
        </span>
        <span className="hud-mission__name">{s.title}</span>
      </button>

      <div className="hud-stats">
        <Stat kind="streak" state={info.state} bump={streak.bump} open={open === 'streak'} label={streakName} onOpen={() => show('streak')}>
          <span className="hud-mark">
            <FlameMark size={32} lit={info.doneToday} level={flameLevel(info.count)} decorative />
            {risk ? <i className="hud-led hud-mark__led" data-tone="warn" aria-hidden="true" /> : null}
          </span>
          <Counter className="hud-num" value={streak.shown} from={streak.from} />
        </Stat>

        <Stat kind="xp" state={goal.done ? 'goal' : 'live'} bump={xp.bump} open={open === 'xp'} label={`${aria.xp(st.xp)}${goal.done ? ' Daily goal met.' : ''} Opens rank details.`} onOpen={() => show('xp')}>
          <Icon.bolt size={20} weight="solid" className="hud-bolt" />
          <Counter className="hud-num" value={xp.shown} from={xp.from} />
        </Stat>

        <Stat kind="shield" state={held ? 'held' : 'empty'} bump={bays.bump} open={open === 'shield'} label={`${aria.shields(held, info.max)} Opens shield details.`} onOpen={() => show('shield')}>
          <span className="hud-bay" data-held={held}>
            {Array.from({ length: Math.max(1, held) }, (_, i) => (
              <ShieldEmblem key={i} size={26} state="ready" decorative className={cx('hud-shield', !held && 'is-empty')} />
            ))}
          </span>
        </Stat>
      </div>

      <span className="hud__burn" data-done={goal.done || undefined} aria-hidden="true"><i style={{ '--p': goal.value }} /></span>

      {loaded.streak && <Suspense fallback={null}><Sheets.streak open={open === 'streak'} onClose={close} onSwap={swap} /></Suspense>}
      {loaded.xp && <Suspense fallback={null}><Sheets.xp open={open === 'xp'} onClose={close} /></Suspense>}
      {loaded.shield && <Suspense fallback={null}><Sheets.shield open={open === 'shield'} onClose={close} /></Suspense>}
      {loaded.mission && <Suspense fallback={null}><Sheets.mission open={open === 'mission'} onClose={close} /></Suspense>}
    </header>
  )
}

export default Hud
