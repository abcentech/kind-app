// Sheet — bottom sheet with real physics. Also hosts the overlay plumbing Dialog shares.
//
// Position model: the panel is as tall as its tallest detent (H) and sits flush to the bottom; `y` is how far it is
// translated down. y = 0 is the tallest detent, y = H - h(detent) the others, y = H + SLACK is parked below the fold.
// All motion writes `transform` on the panel and `opacity` on the scrim directly (no custom-property churn, no layout).
//
//  • Touch: native non-passive listeners (React's are passive, so preventDefault would be ignored) and a scroll
//    hand-off: a pull-down at scrollTop 0 drags the sheet, a push-up on a lower detent expands it, everything else scrolls.
//  • Mouse / pen: pointer events, from the grabber and header only (never selects text in the content).
//  • Follows the finger 1:1 from the moment it engages, rubber-bands past the top (and below the lowest detent when
//    not dismissable), samples velocity over the last ~90 ms, projects momentum, and lands on a detent (or closes)
//    with a damped spring that starts at the release velocity. The spring constants are --spring-snap's
//    (tools/spring.mjs: zeta .72, 2.2 Hz), so a released sheet and a tokened CSS spring feel like the same material.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../icons.jsx'
import { haptic } from '../fx/haptics.js'
import { sound } from '../fx/sound.js'
import { useBackClose } from './useBackClose.jsx'
import { isLite, readEase, readMs, tween } from './Counter.jsx'

/* ── overlay root, inert background, scroll lock ───────────────────────── */
let rootEl = null
function ensureRoot(id, cls, keep) {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('div')
    el.id = id
    el.className = cls
    if (keep) el.setAttribute('data-k-keep', '')
    document.body.appendChild(el)
  }
  return el
}
/** The portal target for sheets and dialogs. Created on first use. */
export function getOverlayRoot() {
  if (!rootEl || !rootEl.isConnected) rootEl = ensureRoot('overlay-root', 'k-overlay-root', true)
  return rootEl
}
export { ensureRoot }

const layers = []                  // open sheets/dialogs, topmost last
const inerted = new WeakSet()      // elements WE made inert (never un-inert someone else's)
const setInert = (el, on) => {
  if (on) { if (!el.inert) { el.inert = true; inerted.add(el) } }
  else if (inerted.has(el)) { el.inert = false; inerted.delete(el) }
}

let lock = null
function lockScroll() {
  if (lock) return
  const b = document.body
  const y = window.scrollY
  const gap = window.innerWidth - document.documentElement.clientWidth      // desktop scrollbar: don't let the page jump sideways
  lock = { y, style: b.getAttribute('style') }
  Object.assign(b.style, { position: 'fixed', top: `-${y}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' })
  if (gap > 0) b.style.paddingRight = gap + 'px'
}
function unlockScroll() {
  if (!lock) return
  const { y, style } = lock
  lock = null
  if (style == null) document.body.removeAttribute('style'); else document.body.setAttribute('style', style)
  window.scrollTo(0, y)
}

function syncLayers() {
  const any = layers.length > 0
  for (const el of document.body.children) {
    if (el === rootEl || el.hasAttribute('data-k-keep') || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(el.tagName)) continue
    setInert(el, any)
  }
  layers.forEach((l, i) => setInert(l.el, i < layers.length - 1))             // only the topmost layer is live
  if (any) lockScroll(); else unlockScroll()
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"],summary'
const focusables = (root) => [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)

function trapTab(e, panel) {
  const items = focusables(panel)
  if (!items.length) { e.preventDefault(); panel.focus({ preventScroll: true }); return }
  const first = items[0], last = items[items.length - 1], a = document.activeElement
  if (e.shiftKey && (a === first || a === panel || !panel.contains(a))) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && (a === last || !panel.contains(a))) { e.preventDefault(); first.focus() }
}

/** Registers a layer while `active`: inert background, scroll lock, Esc, focus trap, focus restore. Shared with Dialog. */
export function useOverlayLayer({ active, layerRef, panelRef, onEscape, initialFocus }) {
  const esc = useRef(onEscape)
  esc.current = onEscape
  useEffect(() => {
    if (!active) return undefined
    const entry = { el: layerRef.current }
    const opener = document.activeElement
    getOverlayRoot()
    layers.push(entry)
    syncLayers()
    const onKey = (e) => {
      if (layers[layers.length - 1] !== entry) return
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); esc.current && esc.current(e) }
      else if (e.key === 'Tab' && panelRef.current) trapTab(e, panelRef.current)
    }
    document.addEventListener('keydown', onKey, true)
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) {
      const target = (initialFocus && initialFocus()) || panel
      target.focus({ preventScroll: true })
    }
    return () => {
      document.removeEventListener('keydown', onKey, true)
      const i = layers.indexOf(entry)
      if (i > -1) layers.splice(i, 1)
      syncLayers()
      if (opener && opener !== document.body && opener.isConnected && typeof opener.focus === 'function') opener.focus({ preventScroll: true })
    }
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Keeps something mounted until its exit animation has played. */
export function usePresence(open, exitMs) {
  const [mounted, setMounted] = useState(open)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (open) { setMounted(true); setLeaving(false); return undefined }
    if (!mounted) return undefined
    setLeaving(true)
    const t = setTimeout(() => { setMounted(false); setLeaving(false) }, exitMs)
    return () => clearTimeout(t)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  return { mounted: mounted || open, leaving: leaving && !open }
}

/* ── physics ───────────────────────────────────────────────────────────── */
const SLACK = 72        // px beyond the fold the panel parks, so its upward shadow is fully gone
const BLEED = 48        // the panel extends this far below the fold: a rubber-banded sheet never shows a gap
const SLOP = 6          // px a press may wander before it becomes a drag (below the browser's own pan slop)
const FLICK = 0.45      // px/ms — a flick this fast moves a detent even if the finger barely travelled
const PROJECT = 180     // ms of momentum projected forward when choosing a landing detent
const MIN_H = 160
const SNAP = { zeta: 0.72, omega: 2 * Math.PI * 2.2 }          // --spring-snap
const THROW = { zeta: 1, omega: 2 * Math.PI * 2.8 }            // dismissal: critically damped, no bounce on the way out

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const rubber = (x, d) => d * (1 - 1 / ((x * 0.55) / d + 1))     // Apple's formula, c = .55
const nearest = (arr, v) => arr.reduce((bi, a, i) => (Math.abs(a - v) < Math.abs(arr[bi] - v) ? i : bi), 0)

// Closed-form damped spring (no integration error, trivially interruptible). Units: px and px/ms.
function spring({ from, to, v0 = 0, zeta, omega, onUpdate, onDone, until }) {
  const t0 = performance.now()
  const d0 = from - to
  const v = v0 * 1000
  const wd = omega * Math.sqrt(Math.max(1e-6, 1 - zeta * zeta))
  const B = zeta >= 1 ? v + omega * d0 : (v + zeta * omega * d0) / wd
  const x = (t) => (zeta >= 1
    ? to + Math.exp(-omega * t) * (d0 + B * t)
    : to + Math.exp(-zeta * omega * t) * (d0 * Math.cos(wd * t) + B * Math.sin(wd * t)))
  let raf = 0, dead = false
  const step = (now) => {
    if (dead) return
    const t = (now - t0) / 1000
    const y = x(t)
    const vel = (x(t + 0.004) - y) / 4                             // px/ms
    if (until && until(y)) { onUpdate(y, vel); onDone && onDone(); return }
    if ((Math.abs(y - to) < 0.3 && Math.abs(vel) < 0.015) || t > 1.8) { onUpdate(to, 0); onDone && onDone(); return }
    onUpdate(y, vel)
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return { cancel() { dead = true; cancelAnimationFrame(raf) } }
}

const NAMES = ['auto', 'half', 'full']

/* ── the component ─────────────────────────────────────────────────────── */
/**
 * Sheet { open onClose title detents grabber dismissable children labelledBy detent onDetentChange closeLabel eyebrow footer silent }
 * detents: any of 'auto' (content height) | 'half' | 'full'. Opens at the first one listed (or `detent`).
 * eyebrow: a mono telemetry line above the title ('DAY 12 · STAGE 02').
 * silent: no open/close cue or tap haptic (for a sheet that already has its own sound, e.g. the lesson verdict).
 * footer: a pinned action bar. It rides the *visible* bottom edge through every detent (the panel is as tall as its tallest
 * detent, so a plain bottom-aligned footer would hang below the fold at 'half'), and travels with the sheet when dismissed.
 */
export function Sheet(props) {
  const { open } = props
  const [mounted, setMounted] = useState(open)
  useEffect(() => { if (open) setMounted(true) }, [open])
  if (!mounted && !open) return null
  return createPortal(<SheetImpl {...props} onExited={() => setMounted(false)} />, getOverlayRoot())
}

function SheetImpl({
  open, onClose, onExited, title, detents, detent: detentProp, onDetentChange, grabber = true, dismissable = true,
  children, labelledBy, className = '', style, closeLabel = 'Close', eyebrow, footer, silent = false, ...rest
}) {
  const titleId = useId()
  const layerRef = useRef(null), backdropRef = useRef(null), panelRef = useRef(null)
  const scrollRef = useRef(null), contentRef = useRef(null), chromeRef = useRef(null), probeRef = useRef(null), footRef = useRef(null)
  const hasFoot = footer != null && footer !== false

  const names = (detents && detents.length ? detents : ['auto']).filter((d) => NAMES.includes(d))
  const nameKey = names.join()
  const startName = detentProp && names.includes(detentProp) ? detentProp : names[0]
  const [detentName, setDetentName] = useState(startName)
  const multi = names.length > 1

  // Everything native listeners need, kept current without re-binding them.
  const latest = useRef({})
  latest.current = { open, onClose, onExited, dismissable, silent, onDetentChange, names, nameKey, startName, detentProp, detentName }

  // g: the live physics state. Mutated freely; never rendered from.
  const g = useRef({
    y: 0, H: 0, hLow: 1, ys: [0], nameY: {}, anim: null, press: null, samples: [], startIdx: 0, nearIdx: 0,
    closing: false, exitV: 0, kb: 0, dragging: false, idx: 0,
  }).current

  /* ---- placing the panel ------------------------------------------- */
  const setY = (y) => {
    g.y = y
    const panel = panelRef.current, back = backdropRef.current
    if (!panel) return
    panel.style.transform = `translate3d(0, ${y}px, 0)`
    if (back) back.style.opacity = String(clamp((g.H - y) / g.hLow, 0, 1))
    const top = y <= 0.5 ? '1' : '0'
    if (panel.dataset.top !== top) panel.dataset.top = top
    const foot = footRef.current
    if (foot) foot.style.transform = `translate3d(0, ${-clamp(y, 0, g.ys[g.ys.length - 1])}px, 0)`
  }

  // top / bottom scroll edges: a hairline under the header once content has scrolled, one above the footer while more is below
  const syncEdges = () => {
    const sc = scrollRef.current, panel = panelRef.current
    if (!sc || !panel) return
    const scrolled = sc.scrollTop > 2 ? '1' : '0'
    const more = sc.scrollHeight - sc.clientHeight - sc.scrollTop > 2 ? '1' : '0'
    if (panel.dataset.scrolled !== scrolled) panel.dataset.scrolled = scrolled
    if (panel.dataset.more !== more) panel.dataset.more = more
  }

  const stopAnim = () => { if (g.anim) { g.anim.cancel(); g.anim = null } if (panelRef.current) panelRef.current.style.willChange = '' }

  const run = (to, { v0 = 0, kind = 'snap', after } = {}) => {
    stopAnim()
    const panel = panelRef.current
    if (!panel) return
    if (Math.abs(to - g.y) < 0.5 && Math.abs(v0) < 0.02) { setY(to); after && after(); return }
    panel.style.willChange = 'transform'
    const done = () => { g.anim = null; panel.style.willChange = ''; after && after() }
    if (isLite()) {
      g.anim = tween({ from: g.y, to, ms: readMs('--t-fast'), ease: readEase('--ease-out'), onUpdate: setY, onDone: done })
    } else if (kind === 'snap') {
      g.anim = spring({ from: g.y, to, v0, ...SNAP, onUpdate: setY, onDone: done })
    } else if (kind === 'throw') {
      const park = g.H + SLACK
      g.anim = spring({ from: g.y, to: park + 80, v0, ...THROW, onUpdate: setY, onDone: done, until: (y) => y >= park })
    } else {                                                          // 'sheet': programmatic enter / exit on the iOS curve
      const ms = readMs(kind === 'sheet-in' ? '--t-slow' : '--t-base')
      g.anim = tween({ from: g.y, to, ms, ease: readEase('--ease-sheet'), onUpdate: setY, onDone: done })
    }
  }

  // detent index (by y order) → the first listed name that lands there
  const nameForIdx = (idx) => latest.current.names.find((n) => Math.abs(g.nameY[n] - g.ys[idx]) < 0.5) || latest.current.names[0]
  const settle = (idx) => {
    g.idx = idx
    const nm = nameForIdx(idx)
    if (nm !== latest.current.detentName) {
      setDetentName(nm)
      latest.current.onDetentChange && latest.current.onDetentChange(nm)
    }
  }

  /* ---- measuring --------------------------------------------------- */
  const measure = useCallback(() => {
    const layer = layerRef.current, panel = panelRef.current
    if (!layer || !panel || !contentRef.current) return
    const layerH = layer.clientHeight
    const fullH = Math.max(MIN_H, Math.min(layerH, probeRef.current.offsetHeight) - g.kb)
    const natural = chromeRef.current.offsetHeight + contentRef.current.offsetHeight
    const heights = { auto: Math.min(natural, fullH), half: Math.min(Math.round(layerH * 0.5), fullH), full: fullH }
    const list = latest.current.names.map((n) => Math.max(MIN_H, heights[n]))
    const hs = [...new Set(list)].sort((a, b) => b - a)               // tallest first → ys ascending from 0
    const H = hs[0]
    const prevH = g.H
    g.H = H
    g.hLow = hs[hs.length - 1]
    g.ys = hs.map((h) => H - h)
    g.nameY = {}
    latest.current.names.forEach((n, i) => { g.nameY[n] = H - Math.max(MIN_H, heights[n]) })
    panel.style.height = H + BLEED + 'px'
    if (prevH && prevH !== H && !g.closing && !g.dragging && layer.dataset.state === 'open') {
      // content or viewport changed: hold the top edge where it was (visible = H - y stays put), then glide to the new detent
      setY(clamp(g.y + (H - prevH), -BLEED, H))
      run(g.ys[clamp(g.idx, 0, g.ys.length - 1)], { kind: 'snap' })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const targetIdx = () => {
    const nm = latest.current.detentProp && latest.current.names.includes(latest.current.detentProp)
      ? latest.current.detentProp : latest.current.names[0]
    return nearest(g.ys, g.nameY[nm])
  }

  /* ---- open / close ------------------------------------------------ */
  const enter = () => {
    const layer = layerRef.current
    g.closing = false
    layer.dataset.state = 'open'
    const idx = targetIdx()
    g.idx = idx
    if (isLite()) { stopAnim(); setY(g.ys[idx]); return }
    run(g.ys[idx], { kind: 'sheet-in' })
  }
  const exit = () => {
    const layer = layerRef.current
    g.closing = true
    layer.dataset.state = 'closing'
    const v0 = g.exitV; g.exitV = 0
    const finish = () => latest.current.onExited && latest.current.onExited()
    if (isLite()) { stopAnim(); setTimeout(finish, readMs('--t-fast')); return }
    if (v0 > 0.05) run(g.H + SLACK, { v0, kind: 'throw', after: finish })
    else run(g.H + SLACK, { kind: 'sheet-out', after: finish })
  }

  const requestClose = () => {
    const L = latest.current
    if (!L.dismissable) return false
    if (!L.silent) sound.play('close')
    L.onClose && L.onClose()
    return true
  }

  useBackClose(open, () => (requestClose() ? undefined : false))
  useOverlayLayer({ active: open, layerRef, panelRef, onEscape: () => requestClose() })

  useLayoutEffect(() => {
    layerRef.current.style.setProperty('--k-bleed', BLEED + 'px')
    if (footRef.current) panelRef.current.style.setProperty('--k-foot', footRef.current.offsetHeight + 'px')   // before the first measure: no entrance hiccup
    measure()
    setY(g.H + SLACK)                                                  // parked, before first paint
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) { measure(); enter(); if (!latest.current.silent) { sound.play('open'); haptic.tap() } }
    else exit()
    return () => stopAnim()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // re-measure when content, chrome or viewport change; track the on-screen keyboard
  useEffect(() => {
    const syncFoot = () => {
      const f = footRef.current, panel = panelRef.current
      if (panel) { if (f) panel.style.setProperty('--k-foot', f.offsetHeight + 'px'); else panel.style.removeProperty('--k-foot') }
    }
    const ro = new ResizeObserver(() => { syncFoot(); measure(); syncEdges() })
    ro.observe(contentRef.current); ro.observe(chromeRef.current); ro.observe(probeRef.current)
    if (footRef.current) ro.observe(footRef.current)
    syncFoot()
    const sc = scrollRef.current
    sc.addEventListener('scroll', syncEdges, { passive: true })
    const vv = window.visualViewport
    const onVV = () => {
      const kb = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0
      if (kb === g.kb) return
      g.kb = kb
      layerRef.current && layerRef.current.style.setProperty('--k-kb', kb + 'px')
      measure()
    }
    vv && vv.addEventListener('resize', onVV)
    return () => { ro.disconnect(); sc.removeEventListener('scroll', syncEdges); vv && vv.removeEventListener('resize', onVV) }
  }, [measure, nameKey, hasFoot]) // eslint-disable-line react-hooks/exhaustive-deps

  // a controlled `detent` prop (or a changed detent list) re-targets the open sheet
  useEffect(() => {
    if (!open || g.dragging || g.closing) return
    measure()
    const idx = targetIdx()
    run(g.ys[idx], { kind: 'snap', after: () => settle(idx) })
  }, [detentProp, nameKey]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- the gesture ------------------------------------------------- */
  useEffect(() => {
    const panel = panelRef.current
    const scroller = scrollRef.current
    const noDrag = '[data-k-nodrag],input,textarea,select,[contenteditable="true"],[role="slider"]'

    const constrain = (yRaw) => {
      const lowY = g.ys[g.ys.length - 1]
      if (yRaw < 0) return -rubber(-yRaw, BLEED)
      if (!latest.current.dismissable && yRaw > lowY) return lowY + rubber(yRaw - lowY, 120)
      return Math.min(yRaw, g.H + SLACK)
    }

    const begin = (target, x, y, kind, t) => {
      if (g.closing) return
      const moving = !!g.anim
      if (moving) stopAnim()
      g.press = {
        x, y, t, kind, target, engaged: moving, dead: false,
        inScroll: scroller.contains(target),
        noDrag: !!(target.closest && target.closest(noDrag)),
        baseY: y, y0: g.y,
      }
      g.samples = []
      if (moving) startDrag(y, t)
    }

    const startDrag = (y, t) => {
      const p = g.press
      p.engaged = true; p.baseY = p.y; p.y0 = g.y                       // 1:1 from touch-down: the slop is absorbed in one jump, never as lag
      g.dragging = true
      g.startIdx = nearest(g.ys, g.y)
      g.nearIdx = g.startIdx
      g.samples = [{ t, y: g.y }]
      panel.dataset.drag = '1'
      panel.style.willChange = 'transform'
    }

    const move = (x, y, t, e) => {
      const p = g.press
      if (!p || p.dead) return
      if (!p.engaged) {
        const dx = x - p.x, dy = y - p.y
        if (Math.abs(dy) < SLOP && Math.abs(dx) < SLOP) return
        if (Math.abs(dx) > Math.abs(dy)) { p.dead = true; return }      // a sideways gesture belongs to someone else
        if (p.noDrag) { p.dead = true; return }
        if (p.inScroll && p.kind === 'touch') {
          const atTop = scroller.scrollTop <= 0
          const expanded = g.y <= 0.5
          if (dy > 0 && !atTop) { p.dead = true; return }                // content still has room above: let it scroll
          if (dy < 0 && expanded) { p.dead = true; return }              // already tallest: scroll the content up
        }
        startDrag(y, t)
      }
      if (e.cancelable) e.preventDefault()
      setY(constrain(p.y0 + (y - p.baseY)))
      g.samples.push({ t, y: g.y })
      if (g.samples.length > 12) g.samples.shift()
      const ni = nearest(g.ys, g.y)
      if (ni !== g.nearIdx && g.y >= 0 && g.y <= g.ys[g.ys.length - 1]) {                       // a detent "click"
        g.nearIdx = ni; haptic.select()
        if (!latest.current.silent) sound.play('detent', { step: g.ys.length - 1 - ni })
      }
    }

    const velocity = (t) => {
      const s = g.samples
      if (s.length < 2 || t - s[s.length - 1].t > 70) return 0           // a pause before release kills the flick
      let i = s.length - 1
      while (i > 0 && s[s.length - 1].t - s[i - 1].t <= 90) i--
      const a = s[i], b = s[s.length - 1]
      return b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0
    }

    const end = (t) => {
      const p = g.press
      g.press = null
      if (!p || !p.engaged) return
      g.dragging = false
      delete panel.dataset.drag
      const v = velocity(t)
      const { ys, H } = g
      const L = latest.current
      const last = ys.length - 1
      const proj = g.y + v * PROJECT
      let idx = nearest(ys, proj)
      const thr = Math.min(0.35 * (H - ys[last]), 160)
      let close = L.dismissable && (proj > ys[last] + thr || (v > FLICK && g.startIdx === last))
      if (!close && Math.abs(v) > FLICK && idx === g.startIdx) idx = clamp(g.startIdx + (v > 0 ? 1 : -1), 0, last)
      if (close) {
        g.exitV = Math.max(v, 0.6)
        requestClose()
        // a parent that ignores onClose must not leave the sheet stranded mid-air
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (latest.current.open && !g.closing) run(ys[nearest(ys, g.y)], { kind: 'snap', after: () => settle(nearest(ys, g.y)) })
        }))
        return
      }
      if (idx !== g.startIdx) haptic.select()
      run(ys[idx], { v0: v, kind: 'snap', after: () => settle(idx) })
    }

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) { g.press = null; return }
      const t = e.touches[0]
      begin(e.target, t.clientX, t.clientY, 'touch', e.timeStamp)
    }
    const onTouchMove = (e) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      move(t.clientX, t.clientY, e.timeStamp, e)
    }
    const onTouchEnd = (e) => end(e.timeStamp)

    const onPointerDown = (e) => {
      if (e.pointerType === 'touch' || e.button !== 0) return           // touch is handled above
      if (!e.target.closest('[data-k-drag]')) return
      begin(e.target, e.clientX, e.clientY, 'mouse', e.timeStamp)
      if (g.press && !g.press.noDrag) { try { panel.setPointerCapture(e.pointerId) } catch { /* not capturable */ } }
    }
    const onPointerMove = (e) => { if (e.pointerType !== 'touch' && g.press) move(e.clientX, e.clientY, e.timeStamp, e) }
    const onPointerUp = (e) => {
      if (e.pointerType === 'touch') return
      try { panel.releasePointerCapture(e.pointerId) } catch { /* already released */ }
      end(e.timeStamp)
    }

    panel.addEventListener('touchstart', onTouchStart, { passive: true })
    panel.addEventListener('touchmove', onTouchMove, { passive: false })
    panel.addEventListener('touchend', onTouchEnd)
    panel.addEventListener('touchcancel', onTouchEnd)
    panel.addEventListener('pointerdown', onPointerDown)
    panel.addEventListener('pointermove', onPointerMove)
    panel.addEventListener('pointerup', onPointerUp)
    panel.addEventListener('pointercancel', onPointerUp)
    return () => {
      panel.removeEventListener('touchstart', onTouchStart)
      panel.removeEventListener('touchmove', onTouchMove)
      panel.removeEventListener('touchend', onTouchEnd)
      panel.removeEventListener('touchcancel', onTouchEnd)
      panel.removeEventListener('pointerdown', onPointerDown)
      panel.removeEventListener('pointermove', onPointerMove)
      panel.removeEventListener('pointerup', onPointerUp)
      panel.removeEventListener('pointercancel', onPointerUp)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- keyboard on the grabber (window-splitter pattern) ----------- */
  const stepDetent = (delta) => {
    const idx = clamp(g.idx + delta, 0, g.ys.length - 1)
    if (idx === g.idx) { haptic.warning(); return }
    haptic.select()
    run(g.ys[idx], { kind: 'snap', after: () => settle(idx) })
  }
  const onGrabKey = (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); stepDetent(-1) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); stepDetent(1) }
    else if (e.key === 'Home') { e.preventDefault(); stepDetent(-99) }
    else if (e.key === 'End') { e.preventDefault(); stepDetent(99) }
  }

  const ariaLabelledBy = title ? titleId : labelledBy
  const rank = nearest(g.ys, g.nameY[detentName] ?? 0)                  // 0 = tallest
  const pct = g.ys.length > 1 ? Math.round((1 - rank / (g.ys.length - 1)) * 100) : 100

  return (
    <div ref={layerRef} className="k-sheet-layer" data-state="parked" data-multi={multi || undefined}>
      <div ref={backdropRef} className="k-sheet-backdrop" aria-hidden="true" onClick={dismissable ? requestClose : undefined} />
      <div ref={probeRef} className="k-sheet-probe" aria-hidden="true" />
      <div
        ref={panelRef}
        className={'k-sheet ' + className}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        data-detent={detentName}
        data-top="0"
        data-foot={hasFoot || undefined}
        {...rest}
      >
        <div ref={chromeRef} className="k-sheet-chrome">
          {grabber && (
            <div className="k-sheet-grab" data-k-drag>
              {multi ? (
                <div
                  className="k-sheet-grabber" role="separator" aria-orientation="horizontal" tabIndex={0}
                  aria-label="Sheet size" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
                  aria-valuetext={detentName} onKeyDown={onGrabKey}
                />
              ) : <span className="k-sheet-grabber" aria-hidden="true" />}
            </div>
          )}
          {title && (
            <header className="k-sheet-head" data-k-drag data-grabless={grabber ? undefined : ''}>
              <span className="k-sheet-head-side" aria-hidden="true" />
              <div className="k-sheet-headtext">
                {eyebrow && <span className="k-sheet-eyebrow">{eyebrow}</span>}
                <h2 className="k-sheet-title" id={titleId}>{title}</h2>
              </div>
              {dismissable ? (
                <button type="button" className="k-sheet-x" data-k-nodrag aria-label={closeLabel} onClick={requestClose}>
                  <Icon name="close" size={20} />
                </button>
              ) : <span className="k-sheet-head-side" aria-hidden="true" />}
            </header>
          )}
        </div>
        <div ref={scrollRef} className="k-sheet-scroll">
          <div ref={contentRef} className="k-sheet-content">{children}</div>
        </div>
        {hasFoot && <div ref={footRef} className="k-sheet-foot">{footer}</div>}
      </div>
    </div>
  )
}

export default Sheet
