// locker/CardViewer — one card, held in the light. A full-screen layer (portalled to the overlay root, z-sheet) that
// FLIPs the card up out of its grid tile, tilts with the phone (gyro) or the pointer, and swipes between owned cards on a spring.
//   <CardViewer cards={owned} no={7} seriesId from={rect} getRect={(no)=>rect} onClose />
// Only the visible card is mounted with its neighbours; only the active one listens for tilt. The swipe writes the
// track transform directly while dragging (no React state per pointermove) and hands over to a CSS spring on release.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CodeCardArt } from '../../art/index.js'
import { Button, IconButton, Tag, getOverlayRoot, useBackClose } from '../../ui/index.js'
import { readMs, readToken } from '../../ui/Counter.jsx'
import { useShell } from '../../shell.jsx'
import { gyroStatus, useFxLevel, usePointerTilt } from '../../fx/motion.js'
import { haptic } from '../../fx/haptics.js'
import { sound } from '../../fx/sound.js'
import { labels } from '../../copy.js'

const base = (i) => `translate3d(${-i * 100}%, 0, 0)`
const spring = () => (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)') ? readToken('--spring-soft') : readToken('--ease-out')) || 'ease-out'
const pad2 = (n) => String(n).padStart(2, '0')

// One card in the carousel. `active` = the visible one: it alone listens for tilt and runs the idle sheen.
function Face({ card, active, lite }) {
  const tiltRef = useRef(null)
  const [engaged, setEngaged] = useState(false)   // a pointer is on it: the idle sweep steps aside
  usePointerTilt(tiltRef, { max: card.rare ? 14 : 10, glare: true, gyro: active })
  const idle = active && !lite && !engaged && gyroStatus() !== 'on'
  return (
    <div className="lcc-fly">
      <div
        ref={tiltRef}
        className="lcc-tilt"
        data-rare={card.rare ? '' : undefined}
        onPointerEnter={(e) => { if (e.pointerType !== 'touch') setEngaged(true) }}
        onPointerLeave={() => setEngaged(false)}
      >
        <i className="lcc-halo" aria-hidden="true" />
        <CodeCardArt day={card.day} rare={card.rare} w="100%" decorative />
        <i className="lcc-spec" aria-hidden="true" />
        {card.rare && idle ? <i className="lcc-shine lcc-shine--viewer" aria-hidden="true" /> : null}
      </div>
    </div>
  )
}

export default function CardViewer({ cards, no, seriesId, from, getRect, onClose }) {
  const { openDay, share } = useShell()
  const lite = useFxLevel() === 'lite'
  const n = cards.length
  const [i, setI] = useState(() => Math.max(0, cards.findIndex((c) => c.no === no)))
  const [closing, setClosing] = useState(false)
  const iRef = useRef(i)
  const closingRef = useRef(false)
  const layerRef = useRef(null)
  const stageRef = useRef(null)
  const trackRef = useRef(null)
  const closeRef = useRef(null)
  const opener = useRef(typeof document !== 'undefined' ? document.activeElement : null)
  const card = cards[Math.min(i, n - 1)]

  useBackClose(true, onClose)

  const activeFly = () => trackRef.current && trackRef.current.querySelector('[data-active] .lcc-fly')

  /* ── index changes ── */
  const go = useCallback((k, quiet) => {
    const nk = Math.max(0, Math.min(n - 1, k))
    const tr = trackRef.current
    if (tr) { tr.removeAttribute('data-drag'); tr.style.transform = base(nk) }
    if (nk === iRef.current) return
    iRef.current = nk
    setI(nk)
    if (!quiet) { haptic.select(); sound.play('detent') }
  }, [n])

  /* ── open: FLIP out of the tile ── */
  useLayoutEffect(() => {
    if (lite || !from) return undefined
    const el = activeFly()
    if (!el || !el.animate) return undefined
    const r = el.getBoundingClientRect()
    if (!r.width) return undefined
    const dx = from.left + from.width / 2 - (r.left + r.width / 2)
    const dy = from.top + from.height / 2 - (r.top + r.height / 2)
    const a = el.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${from.width / r.width})` }, { transform: 'translate(0px, 0px) scale(1)' }],
      { duration: readMs('--t-slower', 700), easing: spring() },
    )
    return () => a.cancel()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sound.play(card && card.rare ? 'rare' : 'open'); haptic.tap()
    if (closeRef.current) closeRef.current.focus({ preventScroll: true })
    const back = opener.current
    return () => { if (back && back.isConnected && typeof back.focus === 'function') back.focus({ preventScroll: true }) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── close: card flies home ── */
  const finish = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    sound.play('close'); haptic.tap()
    const fly = activeFly()
    const t = lite ? null : getRect && getRect(cards[Math.min(iRef.current, n - 1)].no)
    const ms = readMs('--t-base', 240)
    let wait = readMs('--t-fast', 140)
    if (fly && fly.animate && t && t.bottom > 0 && t.top < window.innerHeight) {
      const r = fly.getBoundingClientRect()
      const dx = t.left + t.width / 2 - (r.left + r.width / 2)
      const dy = t.top + t.height / 2 - (r.top + r.height / 2)
      fly.animate(
        [{ transform: 'translate(0px, 0px) scale(1)' }, { transform: `translate(${dx}px, ${dy}px) scale(${t.width / r.width})` }],
        { duration: ms * 1.4, easing: readToken('--ease-sheet') || 'ease-in-out', fill: 'forwards' },
      )
      wait = ms * 1.4
    }
    setTimeout(onClose, wait)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lite, n, onClose, getRect, cards])

  /* ── keys: Esc, arrows, and a focus trap ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); finish() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(iRef.current - 1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(iRef.current + 1) }
      else if (e.key === 'Tab' && layerRef.current) {
        const f = [...layerRef.current.querySelectorAll('button:not([disabled])')]
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (!layerRef.current.contains(document.activeElement)) { e.preventDefault(); first.focus() }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish, go])

  /* ── swipe ── */
  const onPointerDown = (e) => {
    if (e.button > 0 || closingRef.current) return
    const stage = stageRef.current, tr = trackRef.current
    if (!stage || !tr) return
    const d = { x0: e.clientX, y0: e.clientY, dx: 0, on: false, v: 0, lx: e.clientX, lt: e.timeStamp, w: stage.clientWidth || 1 }
    const move = (ev) => {
      const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0
      if (!d.on) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return
        d.on = true
        tr.setAttribute('data-drag', '')
      }
      const k = iRef.current
      d.dx = (k === 0 && dx > 0) || (k === n - 1 && dx < 0) ? dx * 0.32 : dx    // rubber band at the ends
      const dt = ev.timeStamp - d.lt
      if (dt > 0) d.v = d.v * 0.6 + ((ev.clientX - d.lx) / dt) * 0.4
      d.lx = ev.clientX; d.lt = ev.timeStamp
      tr.style.transform = `translate3d(calc(${-k * 100}% + ${d.dx}px), 0, 0)`
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (!d.on) return
      const dir = Math.abs(d.dx) > d.w * 0.2 || Math.abs(d.v) > 0.45 ? (d.dx < 0 || d.v < -0.45 ? 1 : -1) : 0
      go(iRef.current + dir)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const goDay = () => { onClose(); openDay(card.day, seriesId) }
  const doShare = () => share({ kind: 'card', data: { seriesId, day: card.day } })

  const root = getOverlayRoot()
  if (!root || !card) return null
  return createPortal(
    <div
      ref={layerRef}
      className={`lcc-viewer${closing ? ' is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lcc-vtitle"
      data-rare={card.rare ? '' : undefined}
    >
      <div className="lcc-col">
        <div className="lcc-top">
          <IconButton ref={closeRef} icon="close" label={labels.verbs.close} onClick={finish} />
          <div className="lcc-pager">
            <IconButton icon="chevronLeft" label="Previous card" size="sm" disabled={i === 0} onClick={() => go(i - 1)} />
            <span className="lcc-vcount" aria-live="polite">{pad2(i + 1)} / {pad2(n)}</span>
            <IconButton icon="chevronRight" label="Next card" size="sm" disabled={i === n - 1} onClick={() => go(i + 1)} />
          </div>
          <div className="lcc-topr">{card.rare ? <Tag tone="gold">{labels.locker.gold.toUpperCase()}</Tag> : null}</div>
        </div>

        <div className="lcc-stage" ref={stageRef} onPointerDown={onPointerDown}>
          <div className="lcc-track" ref={trackRef} style={{ transform: base(i) }}>
            {cards.map((c, k) => (
              <div className="lcc-slide" key={c.no} data-active={k === i ? '' : undefined} aria-hidden={k === i ? undefined : true}>
                {Math.abs(k - i) <= 1 ? <Face card={c} active={k === i} lite={lite} /> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="lcc-info" key={card.no} aria-live="polite">
          <p className="lcc-meta">CODE {pad2(card.no)} · DAY {card.day}</p>
          <h2 className="lcc-vtitle" id="lcc-vtitle">{card.title}</h2>
          <p className="lcc-quote">{card.line}</p>
        </div>

        <div className="lcc-actions">
          <Button variant="secondary" size="md" icon="share" onClick={doShare}>{labels.verbs.share}</Button>
          <Button size="md" iconRight="arrowRight" onClick={goDay}>Go to day</Button>
        </div>
      </div>
    </div>,
    root,
  )
}
