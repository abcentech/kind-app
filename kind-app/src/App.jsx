// The shell: boot sequence, the five tabs, the lesson layer, the share sheet, global fx/toast hosts.
// Screens take no navigation props — they read useShell() (src/shell.jsx).
import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ShellContext } from './shell.jsx'
import { Button, Dock, ToastHost, toast, useBackClose } from './ui/index.js'
import FxLayer from './fx/FxLayer.jsx'
import { sound } from './fx/sound.js'
import { haptic } from './fx/haptics.js'
import { activeSeriesId, contentReady, ensureContent, getSeries, isUnlocked, modeOf, nextUnlockAt, subscribeContent } from './lib.js'
import { ackNotices, settleStreak, snapshot, useStore, useToday } from './store.js'
import { persistStorage, registerSW, removeBoot, useOnline } from './pwa.js'
import { errorCopy, noticeCopy, toastCopy } from './copy.js'
import Hud from './screens/Hud.jsx'
import Learn from './screens/Learn.jsx'
import Ignition from './screens/Ignition.jsx'
const Onboard = lazy(() => import('./screens/Onboard.jsx'))   // first run only

const Objectives = lazy(() => import('./screens/Objectives.jsx'))
const Shorts = lazy(() => import('./screens/Shorts.jsx'))
const Locker = lazy(() => import('./screens/Locker.jsx'))
const Me = lazy(() => import('./screens/Me.jsx'))
const Lesson = lazy(() => import('./screens/Lesson.jsx'))
const ShareStudio = lazy(() => import('./screens/ShareStudio.jsx'))

const Q = new URLSearchParams(location.search)
const TABS = [
  { id: 'learn', label: 'Learn', icon: 'learn' },
  { id: 'objectives', label: 'Objectives', icon: 'objectives' },
  { id: 'shorts', label: 'Shorts', icon: 'shorts' },
  { id: 'locker', label: 'Locker', icon: 'locker' },
  { id: 'me', label: 'Me', icon: 'me' },
]
const TAB_IDS = TABS.map((t) => t.id)

/** Anything that throws inside a screen lands here instead of a white page.
 *  Root: the whole off-nominal screen. `inline`: just that screen's body, so the HUD and Dock stay alive and the
 *  other tabs keep working. `resetKey` clears the fault when the user navigates away (tab / lesson change). */
class Fault extends Component {
  state = { err: null, key: this.props.resetKey }
  static getDerivedStateFromError(err) { return { err } }
  static getDerivedStateFromProps(p, st) { return p.resetKey !== st.key ? { err: null, key: p.resetKey } : null }
  componentDidCatch(err) { console.error('[kind] off-nominal', err) }
  render() {
    const { inline, silent, onLeave, leaveLabel, children } = this.props
    if (!this.state.err) return children
    if (silent) return null
    let c = {}
    try { c = errorCopy('crash') || {} } catch { /* copy must never be the thing that fails */ }
    const card = (
      <div className={'shell-fault' + (inline ? ' is-inline' : '')} role="alert">
        <h1>{c.title || 'Off-nominal'}</h1>
        <p>{c.body || 'Something went wrong on our side. Your progress is safe on this device.'}</p>
        <div className="shell-fault-actions">
          <Button variant="primary" onClick={() => location.reload()}>{(c.action && c.action.label) || 'Reload'}</Button>
          {onLeave && <Button variant="ghost" onClick={onLeave}>{leaveLabel || 'Back'}</Button>}
        </div>
      </div>
    )
    return inline ? card : <div className="shell"><div className="shell-frame">{card}</div></div>
  }
}

/** One tab's body. Mounted lazily, kept mounted, hidden when away; plays a short entry when it comes forward. */
function Screen({ id, tab, bare, children }) {
  const active = tab === id
  const was = useRef(id === 'learn' ? active : false)
  const [enter, setEnter] = useState(false)
  useEffect(() => { if (active && !was.current) setEnter(true); was.current = active }, [active])
  return (
    <div
      className={'shell-screen' + (bare ? ' is-bare' : '') + (enter && active ? ' is-entering' : '')}
      hidden={!active} data-screen={id}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget) setEnter(false) }}
    >
      <Fault inline resetKey={active}>{children}</Fault>
    </div>
  )
}

/** Lesson text and short bodies are a per-series chunk (lib.js ensureContent); render children once it is in. */
function WhenContent({ sid, children }) {
  const ready = useSyncExternalStore(subscribeContent, () => contentReady(sid), () => true)
  useEffect(() => { if (!ready) ensureContent(sid).catch(() => {}) }, [ready, sid])
  return ready ? children : null
}

/** Shown for the instant a lazy tab's code is on its way. */
const Skel = () => (
  <div className="shell-skel" role="status" aria-label="Loading" data-screen-skel>
    <i /><i /><i /><i />
  </div>
)

function Shell() {
  const st = useStore()
  const today = useToday()
  const online = useOnline()
  const stRef = useRef(st); stRef.current = st

  const [phase, setPhase] = useState(() => (Q.has('fast') ? (st.onboarded ? 'app' : 'onboard') : 'splash'))
  const [seriesId, setSeriesId] = useState(() => (Q.get('series') && getSeries(Q.get('series')).id) || activeSeriesId())
  const [tab, setTab] = useState(() => (TAB_IDS.includes(Q.get('tab')) ? Q.get('tab') : 'learn'))
  const [visited, setVisited] = useState(() => new Set(['learn']))
  const [lesson, setLesson] = useState(null)          // { sid, day }
  const [shareReq, setShareReq] = useState(null)      // { kind, data }
  const s = getSeries(seriesId)

  /* ---- boot ----------------------------------------------------------- */
  useEffect(() => {
    const unlock = () => sound.unlock()
    addEventListener('pointerdown', unlock, { once: true, capture: true })
    const f = requestAnimationFrame(() => requestAnimationFrame(removeBoot))
    registerSW({
      onUpdate: (apply) => { const c = toastCopy('updateReady'); toast({ tone: 'tele', ...c, action: { ...c.action, onClick: apply } }) },
    })
    persistStorage()
    return () => { removeEventListener('pointerdown', unlock, { capture: true }); cancelAnimationFrame(f) }
  }, [])

  // back online: say so once (offline itself is the pill — no toast, it would stack on it)
  const wasOnline = useRef(online)
  useEffect(() => {
    if (online && !wasOnline.current) { try { toast(toastCopy('online')) } catch { /* a toast is never worth a crash */ } }
    wasOnline.current = online
  }, [online])

  /* ---- streak settling: boot, return to the app, midnight ------------- */
  useEffect(() => {
    const run = () => { if (!document.hidden) settleStreak() }
    run()
    document.addEventListener('visibilitychange', run)
    return () => document.removeEventListener('visibilitychange', run)
  }, [today])
  useEffect(() => {
    if (phase !== 'app' || !st.notices.length) return
    const shown = []
    st.notices.forEach((ev, i) => {
      let spec
      try { spec = noticeCopy(ev, { streak: st.streak, shields: st.shields }, ev.id) } catch { spec = null }
      if (spec && (spec.title || spec.body)) setTimeout(() => toast({ key: 'notice-' + ev.id, tone: ev.type === 'lost' ? 'default' : 'tele', icon: ev.type === 'lost' ? 'flame' : 'shield', ...spec }), 600 + i * 900)
      shown.push(ev.id)
    })
    ackNotices(shown)
  }, [phase, st.notices])

  /* ---- Back from any other tab returns to Learn (never exits the app) --- */
  useBackClose(phase === 'app' && !lesson && tab !== 'learn', () => setTab('learn'))

  /* ---- navigation ----------------------------------------------------- */
  const goTab = useCallback((id) => {
    if (!TAB_IDS.includes(id)) return
    setTab(id)
    setVisited((v) => (v.has(id) ? v : new Set(v).add(id)))
  }, [])

  const openDay = useCallback((day, sid) => {
    const ser = getSeries(sid || seriesId)
    if (!isUnlocked(ser, day, stRef.current)) {
      const at = nextUnlockAt(ser, day)
      try { toast({ key: 'locked', ...toastCopy('locked', { day, unlockAt: at, date: at }) }) } catch { toast({ title: `Day ${day} is not open yet`, icon: 'lock' }) }
      haptic.warning(); sound.play('error')
      return
    }
    setLesson({ sid: ser.id, day })
  }, [seriesId])
  const closeLesson = useCallback(() => setLesson(null), [])
  useBackClose(!!lesson, closeLesson)

  // Under a lesson the tabs are unreachable: no Tab-key or screen-reader wandering into the hidden Learn path
  useEffect(() => {
    document.querySelectorAll('.shell-screens, .shell-dock').forEach((el) => (lesson ? el.setAttribute('inert', '') : el.removeAttribute('inert')))
  }, [lesson, phase])

  const share = useCallback((req) => setShareReq(req), [])
  const switchSeries = useCallback((id) => { setSeriesId(getSeries(id).id); goTab('learn') }, [goTab])

  // Fetch the active series' lesson text once the first screen has painted, so a tap on "Start" finds it already here.
  useEffect(() => {
    if (phase !== 'app') return
    // A timer, not requestIdleCallback: the cost is a fetch (the parse is ~20 ms), and on a busy first second idle never comes.
    const h = setTimeout(() => ensureContent(seriesId).catch(() => {}), 400)
    return () => clearTimeout(h)
  }, [phase, seriesId])

  // ?day=12 opens a lesson on boot (demos, QA)
  const bootDay = useRef(false)
  useEffect(() => { if (phase === 'app' && Q.get('day') && !bootDay.current) { bootDay.current = true; openDay(Number(Q.get('day'))) } }, [phase])

  const ctx = useMemo(() => ({ s, seriesId, setSeriesId: switchSeries, tab, goTab, openDay, closeLesson, share, mode: modeOf(s) }),
    [s, seriesId, switchSeries, tab, goTab, openDay, closeLesson, share, today])

  /* ---- phases --------------------------------------------------------- */
  const afterSplash = () => setPhase(snapshot().onboarded ? 'app' : 'onboard')

  if (phase === 'splash')
    return <div className="shell"><div className="shell-frame"><div className="shell-layer is-splash"><Ignition first={!st.onboarded} onDone={afterSplash} /></div></div><FxLayer /></div>

  if (phase === 'onboard')
    return (
      <div className="shell"><div className="shell-frame">
        <ShellContext.Provider value={ctx}>
          <div className="shell-layer"><Suspense fallback={null}><Onboard onDone={({ openDay: d } = {}) => { setPhase('app'); if (d) setTimeout(() => openDay(d), 450) }} /></Suspense></div>
        </ShellContext.Provider>
        <FxLayer /><ToastHost />
      </div></div>
    )

  const L = lesson && getSeries(lesson.sid)
  const mount = (id) => tab === id || visited.has(id)
  return (
    <div className="shell">
      <div className="shell-frame is-arrive">
        <ShellContext.Provider value={ctx}>
          {!lesson && <Fault inline silent resetKey={seriesId}><Hud s={s} /></Fault>}
          <div className="shell-screens">
            <Screen id="learn" tab={tab} bare><Learn /></Screen>
            <Suspense fallback={<Skel />}>
              {mount('objectives') && <Screen id="objectives" tab={tab}><Objectives /></Screen>}
              {mount('shorts') && <Screen id="shorts" tab={tab} bare><WhenContent sid={seriesId}><Shorts /></WhenContent></Screen>}
              {mount('locker') && <Screen id="locker" tab={tab}><Locker /></Screen>}
              {mount('me') && <Screen id="me" tab={tab}><Me /></Screen>}
            </Suspense>
          </div>
          <div className="shell-dock"><Dock tabs={TABS} value={tab} onChange={goTab} hidden={!!lesson} /></div>

          {lesson && (
            <div className="shell-layer" role="dialog" aria-modal="true" aria-label={`Day ${lesson.day}`}>
              <Fault inline resetKey={lesson.sid + lesson.day} onLeave={closeLesson} leaveLabel="Back to Learn">
                <Suspense fallback={<Skel />}><WhenContent sid={lesson.sid}><Lesson key={lesson.sid + lesson.day} s={L} day={lesson.day} close={closeLesson} /></WhenContent></Suspense>
              </Fault>
            </div>
          )}
          <Suspense fallback={null}>
            {shareReq && <ShareStudio req={shareReq} onClose={() => setShareReq(null)} />}
          </Suspense>
        </ShellContext.Provider>
        {!online && <div className="shell-offline" role="status">Offline · everything you have opened still works</div>}
        <FxLayer />
        <ToastHost />
      </div>
    </div>
  )
}

export default function App() { return <Fault><Shell /></Fault> }
