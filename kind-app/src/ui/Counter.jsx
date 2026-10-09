// Counter + the token-driven motion kit the instruments share (Gauge, Ring, Sheet).
// The kit reads durations and easings *from tokens.css at runtime* — cubic-bezier() and linear() springs both —
// so retuning a token retunes every instrument. It owns its own rAF loops (short-lived, one per tween) and does
// not depend on fx/motion.js, so it works whatever state that module is in.
import { useLayoutEffect, useRef, useState } from 'react'

/* ── token reading ──────────────────────────────────────────────────────── */
export function readToken(name) {
  if (typeof document === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function readMs(name, fallback = 240) {
  const m = /^(-?[\d.]+)(ms|s)$/.exec(readToken(name))
  return m ? parseFloat(m[1]) * (m[2] === 's' ? 1000 : 1) : fallback
}

/** html[data-fx="lite"], or reduced-motion unless the user forced `full`. Mirrors the CSS rules. */
export function isLite() {
  if (typeof document === 'undefined') return false
  const fx = document.documentElement.dataset.fx
  if (fx === 'lite') return true
  if (fx === 'full') return false
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

/* ── easings ────────────────────────────────────────────────────────────── */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const X = (t) => ((ax * t + bx) * t + cx) * t
  const Y = (t) => ((ay * t + by) * t + cy) * t
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {                      // Newton first, it converges in 2-3 steps
      const e = X(t) - x
      if (Math.abs(e) < 1e-5) return Y(t)
      const d = dX(t)
      if (Math.abs(d) < 1e-6) break
      t -= e / d
    }
    let lo = 0, hi = 1; t = x                          // bisection as the safety net
    for (let i = 0; i < 24; i++) {
      const e = X(t)
      if (Math.abs(e - x) < 1e-5) break
      if (x > e) lo = t; else hi = t
      t = (lo + hi) / 2
    }
    return Y(t)
  }
}

// CSS linear(a, b 20%, c, …) — what tokens.css springs are. Same semantics as the browser's.
function linearStops(src) {
  const pts = []
  src.split(',').forEach((item) => {
    const parts = item.trim().split(/\s+/)
    const y = parseFloat(parts[0])
    const xs = parts.slice(1).map((p) => parseFloat(p) / 100)
    if (xs.length === 0) pts.push({ x: null, y })
    else xs.forEach((x) => pts.push({ x, y }))
  })
  if (!pts.length) return (t) => t
  if (pts[0].x == null) pts[0].x = 0
  if (pts[pts.length - 1].x == null) pts[pts.length - 1].x = 1
  for (let i = 1, last = 0; i < pts.length; i++) {
    if (pts[i].x != null) {
      const n = i - last
      for (let k = 1; k < n; k++) pts[last + k].x = pts[last].x + ((pts[i].x - pts[last].x) * k) / n
      last = i
    }
  }
  return (t) => {
    if (t <= pts[0].x) return pts[0].y
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i].x) {
        const a = pts[i - 1], b = pts[i]
        return b.x === a.x ? b.y : a.y + ((b.y - a.y) * (t - a.x)) / (b.x - a.x)
      }
    }
    return pts[pts.length - 1].y
  }
}

const easeCache = new Map()
/** Token name ('--ease-io', '--spring-snap', …) → (t:0..1) => progress. Cached per resolved string. */
export function readEase(name) {
  const raw = readToken(name) || 'linear'
  let f = easeCache.get(raw)
  if (!f) {
    let m = /^cubic-bezier\(([^)]+)\)$/.exec(raw)
    if (m) { const [a, b, c, d] = m[1].split(',').map(Number); f = bezier(a, b, c, d) }
    else if ((m = /^linear\((.+)\)$/.exec(raw))) f = linearStops(m[1])
    else f = (t) => t
    easeCache.set(raw, f)
  }
  return f
}

/* ── tween ──────────────────────────────────────────────────────────────── */
/** rAF tween. `ease` is a function (use readEase). Returns { cancel }. ms <= 0 jumps straight to `to`. */
export function tween({ from = 0, to = 1, ms, ease = (t) => t, delay = 0, onUpdate, onDone }) {
  let raf = 0, timer = 0, t0 = 0, dead = false
  const step = (now) => {
    if (dead) return
    if (!t0) t0 = now
    const p = Math.min(1, (now - t0) / ms)
    onUpdate(from + (to - from) * ease(p), p)
    if (p < 1) raf = requestAnimationFrame(step)
    else onDone && onDone()
  }
  const start = () => {
    if (dead) return
    if (!(ms > 0)) { onUpdate(to, 1); onDone && onDone(); return }
    raf = requestAnimationFrame(step)
  }
  if (delay > 0) timer = setTimeout(start, delay); else start()
  return { cancel() { dead = true; cancelAnimationFrame(raf); clearTimeout(timer) } }
}

/* ── Counter ────────────────────────────────────────────────────────────── */
const defaultFormat = (n) => n.toLocaleString('en-US')

// Rolling-digit column. The reel is 0-9 stacked; --d picks the digit; CSS does the roll (transform only).
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
function Col({ d, i }) {
  return (
    <span className="k-counter-col" style={{ '--d': d, '--i': i }}>
      <span className="k-counter-reel">{DIGITS.map((n) => <i key={n}>{n}</i>)}</span>
    </span>
  )
}

function Roll({ text, animate }) {
  const [armed, setArmed] = useState(!animate)            // first paint shows 0s, then the reels roll to the value
  useLayoutEffect(() => { if (!armed) { const id = requestAnimationFrame(() => setArmed(true)); return () => cancelAnimationFrame(id) } }, [armed])
  const chars = [...text]
  const n = chars.length
  return chars.map((ch, idx) => {
    const fromRight = n - idx                                // key by distance from the right edge so reels persist as the length changes
    return /\d/.test(ch)
      ? <Col key={'c' + fromRight} d={armed ? +ch : 0} i={fromRight} />
      : <span key={'s' + fromRight} className="k-counter-lit">{ch}</span>
  })
}

/**
 * Counter { value duration format prefix suffix from animate round roll align }
 * Default mode counts (expo-out) from the previous value, tabular, with width reserved for the final text so
 * nothing jitters. `roll` swaps it for rolling digit reels (Apple's numeric text transition).
 */
export function Counter({
  value = 0, duration, format = defaultFormat, prefix = '', suffix = '', from = 0,
  animate = true, round = true, roll = false, align = 'start', className = '', style, ...rest
}) {
  const live = useRef(null)
  const shown = useRef(animate ? from : value)
  const finalText = prefix + format(round ? Math.round(value) : value) + suffix
  const fmt = (v) => prefix + format(round ? Math.round(v) : v) + suffix

  // Count mode owns its text node outright (no React children), so imperative writes can never fight reconciliation.
  useLayoutEffect(() => {
    if (roll) return undefined
    const el = live.current
    if (!el) return undefined
    if (el.dataset.init !== '1') { el.dataset.init = '1'; el.textContent = fmt(shown.current) }   // first paint, pre-frame
    if (shown.current === value) return undefined
    if (isLite()) { shown.current = value; el.textContent = fmt(value); return undefined }
    const t = tween({
      from: shown.current, to: value, ms: duration ?? readMs('--t-slower'), ease: readEase('--ease-out'),
      onUpdate: (v) => { shown.current = v; el.textContent = fmt(v) },
    })
    return () => t.cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, roll])

  return (
    <span className={'k-counter ' + className} data-align={align} data-roll={roll || undefined} style={style} {...rest}>
      {/* the sizer is the accessible text; the live layer is decoration that moves */}
      <span className="k-counter-final">{finalText}</span>
      {roll
        ? <span className="k-counter-live" key="roll" aria-hidden="true"><Roll text={finalText} animate={animate && !isLite()} /></span>
        : <span className="k-counter-live" key="count" aria-hidden="true" ref={live} />}
    </span>
  )
}

export default Counter
