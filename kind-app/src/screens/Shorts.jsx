// Shorts — a vertical snap-scroll reel. One page per day-with-a-Short: a video Short (s.shortsVideos) or, for days that only
// have a text short (s.shorts via shortFor), a story poster. Live: today first, then backwards. Archive: ascending.
//
// The scroller is the screen (the shell mounts this tab `bare`): pages are 100% of its height and run under the glass HUD and
// dock; their content is padded clear of both. A single IntersectionObserver names the page that is >= 60 % in view; only that
// page may hold the one live iframe, and the key is dropped the moment it changes (or the whole tab is hidden → all ratios 0).
// Pages further than two away from the cursor render as empty placeholders, so a 30-page reel never holds 30 poster images.
// Keys: ArrowDown/PageDown next · ArrowUp/PageUp previous · Home/End · Enter on the reel plays.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShell } from '../shell.jsx'
import { currentDay, shortFor } from '../lib.js'
import { useStore } from '../store.js'
import { useOnline } from '../pwa.js'
import { Button, Empty, IconButton } from '../ui/index.js'
import { emptyCopy, labels } from '../copy.js'
import { haptic } from '../fx/haptics.js'
import { sound } from '../fx/sound.js'
import Reel, { cleanTitle } from './shorts/Reel.jsx'
import Story from './shorts/Story.jsx'
// Styles load with the screen, not with the shell (first-load budget: docs/V7-DESIGN.md §10).
import '../styles/shorts.css'
import '../styles/shorts-story.css'

const FALLBACK_URL = 'https://www.youtube.com/@KidsInspiringNation/shorts'
const NEAR = 2

/** The reel's pages for a series: [{ key, kind:'video'|'story', day, ... }]. */
export function reelItems(s, mode, st) {
  const vids = new Map()
  for (const v of s.shortsVideos || []) if (v && v.videoId && !vids.has(v.day)) vids.set(v.day, v)
  const out = []
  for (const d of s.calendar) {
    const v = vids.get(d.day)
    if (v) { out.push({ key: `v${d.day}`, kind: 'video', day: d.day, short: v }); continue }
    const t = shortFor(s, d)
    if (t) out.push({ key: `s${d.day}`, kind: 'story', day: d.day, short: t })
  }
  if (mode === 'live') {
    const today = currentDay(s, st)
    return out.filter((i) => i.day <= today).sort((a, b) => b.day - a.day)
  }
  return out.sort((a, b) => a.day - b.day)
}

const calm = () => document.documentElement.dataset.fx === 'lite' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function Shorts() {
  const { s, openDay, mode } = useShell()
  const st = useStore()
  const online = useOnline()
  const items = useMemo(() => reelItems(s, mode, st), [s, mode]) // eslint-disable-line react-hooks/exhaustive-deps
  const n = items.length
  const scroller = useRef(null)
  const [active, setActive] = useState(0)        // -1 when nothing is in view (tab hidden)
  const [cursor, setCursor] = useState(0)        // last page that was in view: the centre of the render window
  const [playing, setPlaying] = useState(null)   // key of the one page allowed an iframe

  useEffect(() => { setActive(0); setCursor(0); setPlaying(null) }, [s.id])

  // Which page is in view.
  useEffect(() => {
    const root = scroller.current
    if (!root || !n || typeof IntersectionObserver === 'undefined') return undefined
    const ratio = new Array(n).fill(0)
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) ratio[Number(e.target.dataset.i)] = e.intersectionRatio
      let best = 0
      ratio.forEach((r, i) => { if (r > ratio[best]) best = i })
      if (ratio[best] >= 0.6) { setActive(best); setCursor(best) } else if (ratio[best] < 0.05) setActive(-1)
    }, { root, threshold: [0, 0.05, 0.25, 0.5, 0.6, 0.75, 1] })
    root.querySelectorAll('[data-i]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [n, s.id])

  // One iframe, on the page in view only.
  useEffect(() => { if (playing && items[active]?.key !== playing) setPlaying(null) }, [active, playing, items])

  const goto = useCallback((i) => {
    const root = scroller.current
    if (!root || !n) return
    const to = Math.min(Math.max(i, 0), n - 1)
    root.scrollTo({ top: to * root.clientHeight, behavior: calm() ? 'auto' : 'smooth' })
  }, [n])
  const step = (d) => { const from = active < 0 ? cursor : active; if (from + d < 0 || from + d > n - 1) return; sound.play('nav'); haptic.select(); goto(from + d) }

  const onKeyDown = (e) => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return
    const from = active < 0 ? cursor : active
    const map = { ArrowDown: from + 1, PageDown: from + 1, ArrowUp: from - 1, PageUp: from - 1, Home: 0, End: n - 1 }
    if (e.key in map) { e.preventDefault(); goto(map[e.key]) }
    else if (e.key === 'Enter' && items[from]?.kind === 'video' && online) { e.preventDefault(); setPlaying(items[from].key) }
  }

  if (!n) {
    const e = emptyCopy(online ? 'shortsNone' : 'shortsOffline', s.id)
    return (
      <div className="sho sho--empty">
        <Empty art={e.art} title={e.title} body={e.body} action={
          <Button as="a" size="md" variant="primary" iconRight="external" href={s.shortsUrl || s.channel || FALLBACK_URL} target="_blank" rel="noopener noreferrer">{e.action}</Button>
        } />
      </div>
    )
  }

  const here = active < 0 ? cursor : active
  const cur = items[here]
  return (
    <main className="sho" data-testid="shorts">
      <div
        key={s.id} ref={scroller} className="sho-scroll" role="region" aria-roledescription="reel"
        aria-label={labels.shorts.title} tabIndex={0} onKeyDown={onKeyDown}
      >
        {items.map((it, i) => {
          const near = Math.abs(i - cursor) <= NEAR
          const on = i === active
          const name = `Day ${it.day} Short, ${i + 1} of ${n}`
          return (
            <section key={it.key} className="sho-item" data-i={i} data-kind={it.kind} aria-label={name} aria-posinset={i + 1} aria-setsize={n}>
              {!near ? null : it.kind === 'video' ? (
                <Reel
                  short={it.short} index={i} count={n} active={on} near={near} online={online}
                  playing={playing === it.key} onPlay={() => setPlaying(it.key)} openDay={openDay} firstRun={i === 0}
                />
              ) : (
                <div className="sho-story">
                  <Story short={it.short} s={s} day={it.day} active={on} onDone={() => { if (on) goto(i + 1) }} />
                </div>
              )}
            </section>
          )
        })}
      </div>

      <div className="sho-rail" aria-hidden="true">
        <i style={{ height: `${100 / n}%`, transform: `translateY(${here * 100}%)` }} />
      </div>
      {n > 1 ? (
        <div className="sho-nav">
          <IconButton icon="chevronUp" label="Previous Short" variant="plate" size="md" silent disabled={here <= 0} onClick={() => step(-1)} />
          <IconButton icon="chevronUp" label={labels.shorts.next} variant="plate" size="md" silent disabled={here >= n - 1} onClick={() => step(1)} className="sho-nav__down" />
        </div>
      ) : null}
      <p className="sho-sr" aria-live="polite">{cur ? `Short ${here + 1} of ${n}. Day ${cur.day}.${cur.kind === 'video' ? ' ' + cleanTitle(cur.short.title) : ''}` : ''}</p>
    </main>
  )
}
