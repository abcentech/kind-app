// Learn — THE ASCENT. The home screen: a sky that darkens as you climb, a flight path of hex nodes winding up the column, Day 1 on the
// pad at the BOTTOM and the last day in orbit at the TOP, the rocket parked on the live node.
//
//   <Learn />                      Sky (bg, --scroll lives on it) · scroller > Path · banner + stage chip · jump-to-today · <LaunchBar />
//   scroll model                   the scroller owns the scroll. useScrollVar writes --scroll (1 − progress, so 0 on the pad) onto the SKY only.
//                                  On mount it starts at the pad and climbs to the live node (instant in lite); the node settles at
//                                  HERE_AT of the *visible* window — between the HUD and the Launch Bar, not the raw viewport — so the
//                                  rocket, node and label all clear the bar. When the live day changes it climbs again.
//   hidden tabs                    .shell-screen[hidden] resets a scroller; we remember the offset and restore it when the tab returns.
//   stage chip / jump chip         IntersectionObservers (a 2px "reading line" for the stage, the live node for the jump chip). No scroll math.
// Everything here reads the store through journey(s, st) — never a hand-typed day number.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useShell } from '../shell.jsx'
import { useClock, useStore } from '../store.js'
import { journey } from '../lib.js'
import { useFxLevel, useScrollVar } from '../fx/motion.js'
import { fx } from '../fx/fx.js'
import { haptic } from '../fx/haptics.js'
import { sound } from '../fx/sound.js'
import { Icon } from '../icons.jsx'
import { labels, stageTag } from '../copy.js'
import Path from './learn/Path.jsx'
import Sky from './learn/Sky.jsx'
import ArchiveBanner from './learn/ArchiveBanner.jsx'
import { stageVars } from './learn/StageDivider.jsx'
import LaunchBar from './LaunchBar.jsx'

const HERE_AT = 0.55     // where the live node settles in the visible window (0 = under the HUD, 1 = on the Launch Bar)
const LINE_AT = 0.28     // where the "reading line" that picks the stage chip sits in that window

const stageOfDay = (j) => Math.max(0, j.stages.findIndex((x) => x.days.includes(j.currentDay)))

function StageChip({ stage }) {
  if (!stage) return null
  return (
    <div className="learn-chip" key={stage.index} data-state={stage.state} style={stageVars(stage.slot)} aria-hidden="true">
      <i className="learn-chip__dot" />
      <span>{stageTag(stage.n)} · {stage.name}</span>
      <b>{stage.done}/{stage.total}</b>
    </div>
  )
}

export default function Learn() {
  const { s, openDay } = useShell()
  const st = useStore()
  const clock = useClock(30000)                                   // re-evaluates the 06:00 unlock without a store write
  const lite = useFxLevel() === 'lite'
  const j = useMemo(() => journey(s, st, clock), [s, st, clock])

  const scroller = useRef(null)
  const skyRef = useRef(null)
  const mem = useRef({ top: 0, hidden: false, pending: false, sid: s.id })
  const [viewH, setViewH] = useState(0)
  const [active, setActive] = useState(() => stageOfDay(j))
  const [away, setAway] = useState(null)                           // where the live node is when it is out of the window: 'up' | 'down'

  useScrollVar(scroller, '--scroll', { invert: true, target: skyRef })

  // taps. openDay is gated by the shell (a locked day toasts); locked nodes also get a tiny local shake + haptic.
  const open = useRef(openDay)
  open.current = openDay
  const onOpen = useCallback((n, el) => {
    if (n.state === 'locked') { haptic.warning(); fx.shake(el, { amp: 5, ms: 320 }) }
    else { sound.play('tap'); haptic.tap() }
    open.current(n.day)
  }, [])

  const centre = useCallback((smooth) => {
    const sc = scroller.current
    const here = sc?.querySelector('[data-here]')
    if (!sc || !here || !sc.clientHeight) return false
    const cs = getComputedStyle(sc)
    const padT = parseFloat(cs.paddingTop) || 0
    const padB = parseFloat(cs.paddingBottom) || 0
    const usable = Math.max(1, sc.clientHeight - padT - padB)
    const hr = here.getBoundingClientRect(), sr = sc.getBoundingClientRect()
    const y = hr.top + hr.height / 2 - sr.top + sc.scrollTop      // the node's centre in content coordinates
    sc.scrollTo({ top: Math.max(0, y - (padT + usable * HERE_AT)), behavior: smooth ? 'smooth' : 'auto' })
    return true
  }, [])

  // Open on the pad, then climb. (Layout effect: no frame is ever painted at the wrong end.)
  useLayoutEffect(() => { const sc = scroller.current; if (sc) sc.scrollTop = sc.scrollHeight }, [s.id])
  useEffect(() => {
    const m = mem.current
    const fresh = m.sid !== s.id
    m.sid = s.id
    const id = requestAnimationFrame(() => { if (!centre(!lite && !fresh)) m.pending = true })
    return () => cancelAnimationFrame(id)
  }, [s.id, j.currentDay, lite, centre])

  // size + visibility: remember the offset, restore it after the tab was hidden, finish a centring that had no size to work with.
  useEffect(() => {
    const sc = scroller.current
    if (!sc) return undefined
    const m = mem.current
    const onScroll = () => { if (sc.clientHeight) m.top = sc.scrollTop }
    const ro = new ResizeObserver(() => {
      const h = sc.clientHeight
      setViewH((v) => (v === h ? v : h))
      if (!h) { m.hidden = true; return }
      if (m.hidden) {
        m.hidden = false
        if (m.pending) { m.pending = false; centre(false) } else if (Math.abs(sc.scrollTop - m.top) > 2) sc.scrollTop = m.top
      }
    })
    sc.addEventListener('scroll', onScroll, { passive: true })
    ro.observe(sc)
    return () => { sc.removeEventListener('scroll', onScroll); ro.disconnect() }
  }, [centre])

  useEffect(() => { setActive(stageOfDay(j)) }, [s.id, j.currentDay])  // eslint-disable-line react-hooks/exhaustive-deps

  // which stage is in view, and is the live node off-screen?
  useEffect(() => {
    const sc = scroller.current
    if (!sc || !viewH) return undefined
    const cs = getComputedStyle(sc)
    const padT = parseFloat(cs.paddingTop) || 0
    const padB = parseFloat(cs.paddingBottom) || 0
    const line = padT + Math.max(1, viewH - padT - padB) * LINE_AT
    const byLine = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) setActive(Number(e.target.dataset.stage))
    }, { root: sc, rootMargin: `-${line}px 0px -${Math.max(0, viewH - line - 2)}px 0px` })
    sc.querySelectorAll('.learn-stage').forEach((el) => byLine.observe(el))
    const here = sc.querySelector('[data-here]')
    const byHere = new IntersectionObserver(([e]) => {
      setAway(e.isIntersecting ? null : e.boundingClientRect.top < (e.rootBounds?.top ?? 0) ? 'up' : 'down')
    }, { root: sc, rootMargin: `-${padT + 8}px 0px -${padB + 8}px 0px` })
    if (here) byHere.observe(here)
    return () => { byLine.disconnect(); byHere.disconnect() }
  }, [viewH, s.id, j.currentDay, j.stages.length])

  const back = () => { haptic.tap(); centre(!lite) }

  return (
    <main className="learn" data-mode={j.mode}>
      <Sky ref={skyRef} />
      <div className="learn-scroll" ref={scroller} role="region" aria-labelledby="learn-h1">
        <div className="learn-content">
          <h1 className="u-sr" id="learn-h1">{labels.learn.ascent}</h1>
          <Path j={j} s={s} onOpen={onOpen} />
        </div>
      </div>
      <div className="learn-top">
        <ArchiveBanner j={j} s={s} />
        <StageChip stage={j.stages[active]} />
      </div>
      <button type="button" className="learn-jump" data-dir={away || undefined} onClick={back} tabIndex={away ? 0 : -1} aria-hidden={away ? undefined : 'true'}>
        <Icon name={away === 'up' ? 'arrowUp' : 'arrowDown'} size={20} />
        <span>{labels.learn.today}</span>
      </button>
      <LaunchBar />
    </main>
  )
}
