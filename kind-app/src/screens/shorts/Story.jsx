// shorts-story · Story — a text Short as an Instagram-style story poster, painted from our own art.
//   <Story short s day active onDone />
//     short   a series short { n, title, hook, scripture, truth, … }   s  the series   day  the day number (or { day }) it belongs to
//     active  this poster is the one on screen (timer + keys run only then)      onDone()  called once, after the last page
//
// Pages: 1 HOOK (huge Newsreader italic) · 2 SCRIPTURE (book cover + ref + share) · 3 TRUTH (a statement) · 4 "Open Day N".
// With no `day` the CTA page is dropped (three pages). Segments fill linearly (PAGE_MS) off the app's single frame clock.
//   tap right → next · tap left → back · press and hold → pause · ← → keys · Space → pause (auto) / next (tap-only)
//   auto-progress only while: active && tab visible && fx full (no lite attr) && !reduced-motion. Otherwise it is tap-only and the current segment is lit solid.
// Text is fitted by measuring (binary search on font-size inside its box), so nothing overflows at 360 × 640.
// Hook for the feed: the root fills its parent; override `--shs-pb` (bottom inset, default safe-area + s-6) if a dock overlaps it.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { stageOf, stageSlot } from '../../lib.js'
import { useShell } from '../../shell.jsx'
import { Button, IconButton } from '../../ui/index.js'
import { Horizon } from '../../art/index.js'
import { raf, useFxLevel, useReducedMotion } from '../../fx/motion.js'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'

const PAGE_MS = 5000          // base dwell per page; truth stretches with length, the CTA lingers
const HOLD_MS = 220           // a press longer than this is a hold (pause), not a tap
const MOVE_PX = 16            // a press that travels further than this is a drag (scroll), not a tap
const TAP_SPLIT = 0.33        // left third = back, the rest = next

/* ── content ─────────────────────────────────────────────────────────────── */

/** "“No servant can serve two masters…” — Luke 16:13" → { text, ref } (outer quote marks removed; the cover draws its own). */
export function splitScripture(raw = '') {
  const s = String(raw)
  let i = s.lastIndexOf(' — ')
  if (i < 0) i = s.lastIndexOf(' – ')
  const text = (i > 0 ? s.slice(0, i) : s).trim().replace(/^[“"]+\s*/, '').replace(/\s*[”"]+$/, '')
  return { text, ref: i > 0 ? s.slice(i + 3).trim() : '' }
}

/** First sentence of the truth (a lead worth setting brighter) and the rest. */
function splitLead(t = '') {
  const m = /^(.{18,}?[.?!…])(\s+)(?=\S)/.exec(t)
  return m ? [m[1], t.slice(m[0].length)] : [t, '']
}

const pad2 = (n) => String(n).padStart(2, '0')

/* ── fit text by measuring ───────────────────────────────────────────────── */

const px = (el, v) => { el.style.fontSize = v; return parseFloat(getComputedStyle(el).fontSize) || 0 }

/** Sets the largest font-size on `ref` (between the --shs-fit-min / --shs-fit-max it carries) at which its content does not overflow. */
function useFit(ref, deps) {
  useLayoutEffect(() => {
    const box = ref.current
    if (!box) return undefined
    let frame = 0
    const fit = () => {
      const lo0 = px(box, 'var(--shs-fit-min)')
      const hi0 = px(box, 'var(--shs-fit-max)')
      let lo = Math.min(lo0, hi0), hi = Math.max(lo0, hi0)
      const over = () => box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1
      box.style.fontSize = hi + 'px'
      if (!over()) return
      for (let i = 0; i < 9; i++) {
        const mid = (lo + hi) / 2
        box.style.fontSize = mid + 'px'
        if (over()) hi = mid; else lo = mid
      }
      box.style.fontSize = lo + 'px'
    }
    const queue = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit) }
    fit()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(queue) : null
    ro?.observe(box)
    document.fonts?.ready?.then(queue)
    return () => { cancelAnimationFrame(frame); ro?.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function useVisible() {
  const [v, setV] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')
  useEffect(() => {
    const f = () => setV(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [])
  return v
}

/** "Effects are lite": the fx engine's level, OR the attribute on <html> (what the CSS actually keys off), OR reduced motion. */
function useLite() {
  const fx = useFxLevel()
  const reduced = useReducedMotion()
  const [attr, setAttr] = useState(() => document.documentElement.dataset.fx === 'lite')
  useEffect(() => {
    const el = document.documentElement
    const f = () => setAttr(el.dataset.fx === 'lite')
    f()
    const mo = new MutationObserver(f)
    mo.observe(el, { attributes: true, attributeFilter: ['data-fx'] })
    return () => mo.disconnect()
  }, [])
  return fx === 'lite' || attr || reduced
}

/* ── pages ───────────────────────────────────────────────────────────────── */

function Hook({ short, eyebrow, hint }) {
  const box = useRef(null)
  useFit(box, [short.hook])
  return (
    <div className="shs__page shs__page--hook" key="hook">
      <p className="shs__eyebrow"><i className="shs__tick" aria-hidden="true" />{eyebrow}</p>
      <div className="shs__fit shs__fit--hook" ref={box}>
        <p className="shs__hook">{short.hook}</p>
      </div>
      {hint ? <p className="shs__hint" aria-hidden="true">Tap to continue</p> : null}
    </div>
  )
}

function Scripture({ text, reference }) {
  const box = useRef(null)
  useFit(box, [text])
  return (
    <div className="shs__page shs__page--word" key="word">
      <figure className="shs__book">
        <figcaption className="shs__eyebrow shs__eyebrow--gold">The Word</figcaption>
        <div className="shs__fit shs__fit--word" ref={box}>
          <blockquote className="shs__verse"><span className="shs__q" aria-hidden="true">“</span>{text}<span className="shs__q" aria-hidden="true">”</span></blockquote>
        </div>
        {reference ? <p className="shs__ref">{reference}</p> : null}
      </figure>
    </div>
  )
}

function Truth({ truth }) {
  const box = useRef(null)
  useFit(box, [truth])
  const [lead, rest] = useMemo(() => splitLead(truth), [truth])
  return (
    <div className="shs__page shs__page--truth" key="truth">
      <p className="shs__eyebrow"><i className="shs__tick" aria-hidden="true" />The truth</p>
      <div className="shs__fit shs__fit--truth" ref={box}>
        <p className="shs__truth"><strong>{lead}</strong>{rest ? ' ' + rest : ''}</p>
      </div>
    </div>
  )
}

function Cta({ short, day, onOpen }) {
  return (
    <div className="shs__page shs__page--cta" key="cta">
      <p className="shs__eyebrow"><i className="shs__tick" aria-hidden="true" />Keep going</p>
      <p className="shs__daynum" aria-hidden="true">Day {day}</p>
      <p className="shs__ctatitle">{short.title}</p>
      <Button className="shs__open" size="lg" full pulse iconRight="arrowRight" onClick={onOpen}>{`Open Day ${day}`}</Button>
    </div>
  )
}

/* ── the story ───────────────────────────────────────────────────────────── */

export default function Story({ short, s, day, active = true, onDone }) {
  const shell = useShell() || {}
  const dayN = typeof day === 'object' && day ? day.day : day || 0
  const lite = useLite()
  const visible = useVisible()
  const auto = !!active && visible && !lite

  const { text, ref } = useMemo(() => splitScripture(short?.scripture), [short?.scripture])
  const total = dayN ? 4 : 3
  const slot = s && dayN ? stageSlot(stageOf(s, dayN)) : 1

  const [page, setPage] = useState(0)
  const [held, setHeld] = useState(false)       // a finger is down (hold-to-pause)
  const [parked, setParked] = useState(false)   // paused by Space or by opening Share; ends on the next interaction
  const run = useRef({ ms: 0, page: 0, done: false, total, onDone, auto: false })
  const segs = useRef([])
  const root = useRef(null)
  Object.assign(run.current, { total, onDone })

  const dwell = (p) => (p === 2 ? Math.min(8000, PAGE_MS + Math.max(0, (short?.truth?.length || 0) - 200) * 10) : p === total - 1 && total === 4 ? 6000 : p === 1 ? 5500 : PAGE_MS)

  /** paint the current segment: inline fill in auto mode, CSS (solid) otherwise */
  const paint = useCallback((p) => {
    segs.current.forEach((el, i) => {
      if (!el) return
      if (run.current.auto && i === run.current.page) el.style.transform = `scaleX(${p})`
      else el.style.removeProperty('transform')
    })
    root.current?.setAttribute('data-progress', p.toFixed(2))
  }, [])

  const go = useCallback((to, user = true) => {
    const r = run.current
    if (to >= r.total) {
      if (!r.done) { r.done = true; r.onDone?.() }
      return
    }
    const next = Math.max(0, to)
    if (user) { sound.play('next'); haptic.tap() }
    r.ms = 0; r.page = next; r.done = false
    setPage(next)
    paint(0)
  }, [paint])

  // a new short, or the poster leaving the screen, starts over
  useEffect(() => { run.current.ms = 0; run.current.page = 0; run.current.done = false; setPage(0); setHeld(false); setParked(false) }, [short?.n, s?.id])
  useEffect(() => { if (!active) { run.current.ms = 0; run.current.page = 0; run.current.done = false; setPage(0); setHeld(false); setParked(false) } }, [active])
  useLayoutEffect(() => { run.current.auto = auto; run.current.page = page; paint(auto ? run.current.ms / dwell(page) : 0) })

  const running = auto && !held && !parked
  useEffect(() => {
    if (!running) return undefined
    const tick = (dt) => {
      const r = run.current
      r.ms += dt
      const p = Math.min(1, r.ms / dwell(r.page))
      paint(p)
      if (p >= 1) go(r.page + 1, false)
    }
    return raf.add(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, page, go, paint])

  // keyboard (only the active poster listens)
  useEffect(() => {
    if (!active) return undefined
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target
      const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      if (typing) return
      if (e.key === 'ArrowRight') { e.preventDefault(); setParked(false); go(run.current.page + 1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setParked(false); go(run.current.page - 1) }
      else if (e.key === ' ' || e.code === 'Space') {
        if (t && /^(BUTTON|A)$/.test(t.tagName)) return          // a focused button keeps its own Space
        e.preventDefault()
        if (run.current.auto) setParked((v) => !v); else go(run.current.page + 1)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, go])

  /* press-and-hold / tap zones */
  const press = useRef(null)
  const down = (e) => {
    if (e.button > 0) return
    clearTimeout(press.current?.timer)
    const p = { x: e.clientX, y: e.clientY, held: false, moved: false, id: e.pointerId }
    p.timer = setTimeout(() => { p.held = true; setHeld(true) }, HOLD_MS)
    press.current = p
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* not capturable */ }
  }
  const move = (e) => {
    const p = press.current
    if (!p || p.moved) return
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_PX) { p.moved = true; clearTimeout(p.timer) }
  }
  const end = (dir) => (e) => {
    const p = press.current
    if (!p) return
    clearTimeout(p.timer); press.current = null
    setHeld(false)
    if (e.type === 'pointercancel' || p.held || p.moved) return    // a hold or a drag is not a tap
    setParked(false)
    go(run.current.page + dir)
  }
  // keyboard activation of a zone button (Enter/Space → click with detail 0); pointer clicks are handled above
  const kclick = (dir) => (e) => { if (e.detail === 0) { setParked(false); go(run.current.page + dir) } }

  const share = () => {
    haptic.tap()
    setParked(true)
    shell.share?.({ kind: 'verse', data: { text, ref } })
  }
  const open = () => shell.openDay?.(dayN)

  if (!short) return null
  const eyebrow = dayN ? `DAY ${dayN} · SHORT` : `SHORT ${pad2(short.n)}`
  const paused = held || parked

  return (
    <section
      ref={root}
      className="shs"
      style={{ '--stage': `var(--stage-${slot})`, '--stage-glow': `var(--stage-${slot}-glow)` }}
      data-page={page}
      data-auto={auto ? 'true' : 'false'}
      data-held={held ? 'true' : undefined}
      data-paused={paused ? 'true' : undefined}
      data-running={running ? 'true' : 'false'}
      data-progress="0.00"
      aria-roledescription="story"
      aria-label={`Short ${short.n}: ${short.title}`}
    >
      <div className="shs__bg" aria-hidden="true">
        <Horizon variant="limb" seed={short.n * 7 + 3} twinkle={!lite} />
        <i className="shs__tint" />
        <i className="shs__scrim" />
      </div>

      <button type="button" className="shs__zone shs__zone--back" aria-label="Previous page"
        onPointerDown={down} onPointerMove={move} onPointerUp={end(-1)} onPointerCancel={end(-1)} onContextMenu={(e) => e.preventDefault()} onClick={kclick(-1)} />
      <button type="button" className="shs__zone shs__zone--next" aria-label={page === total - 1 ? 'Finish' : 'Next page'}
        onPointerDown={down} onPointerMove={move} onPointerUp={end(1)} onPointerCancel={end(1)} onContextMenu={(e) => e.preventDefault()} onClick={kclick(1)} />

      <header className="shs__top">
        <div className="shs__bar" role="progressbar" aria-label="Story progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={page + 1} aria-valuetext={`Page ${page + 1} of ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <i key={i} className="shs__seg" data-s={i < page ? 'done' : i === page ? 'now' : 'next'}>
              <b className="shs__fill" ref={(el) => { segs.current[i] = el }} />
            </i>
          ))}
        </div>
        <div className="shs__head">
          <p className="shs__title"><span>{short.title}</span></p>
          {paused ? <span className="shs__paused" data-motion="essential">Paused</span> : null}
          <IconButton className="shs__share" icon="share" label="Share this verse" size="md" onClick={share} />
        </div>
      </header>

      <div className="shs__body" aria-live="polite" aria-atomic="true">
        {page === 0 && <Hook short={short} eyebrow={eyebrow} hint={!auto} />}
        {page === 1 && <Scripture text={text} reference={ref} />}
        {page === 2 && <Truth truth={short.truth || ''} />}
        {page === 3 && dayN ? <Cta short={short} day={dayN} onOpen={open} /> : null}
      </div>
    </section>
  )
}
