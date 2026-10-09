// Path — the climb itself. The journey is rendered bottom-up: the DOM runs orbit → pad (so the scroller can open on the live node and
// the visual order is the reading order), each stage = its nodes (last day first) then its gate slab. ONE curve sits behind it all:
// lit with the ignition gradient up to the live node, hairline-dashed beyond.
//
// Geometry is measured, never declared. Every node, patch and the orbit cap carries [data-pt]; y comes from layout (offsetTop chain)
// and x from the sine lane (the container's half-width + lane * --amp). offset* and not getBoundingClientRect on purpose: the screen
// may be mid-entrance (scaled) when we measure. Points → Catmull-Rom → one cubic per gap. It re-measures on resize and font load.
//
// The lane is one full sine S per stage and is zero at the gates, so the path runs straight through every patch and the S flows on
// across stages without a kink.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import Node from './Node.jsx'
import StageDivider, { stageVars } from './StageDivider.jsx'
import { Icon } from '../../icons.jsx'
import { labels } from '../../copy.js'

const TAU = Math.PI * 2
const lane = (k, n) => Math.sin((TAU * (k + 1)) / (n + 1))
const heading = (k, n) => Math.cos((TAU * (k + 1)) / (n + 1)) * (TAU / (n + 1))        // d(lane)/dk: which way the path leans here
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const r1 = (v) => Math.round(v * 10) / 10
const NEAR = 6                                                                               // nodes either side of "here" that play the entrance
const STEP = 50                                                                              // ms between entrance beats (stagger)

function offsetY(el, root) {
  let y = 0
  for (let e = el; e && e !== root; e = e.offsetParent) y += e.offsetTop
  return y
}

/** Catmull-Rom through pts (bottom → top) as one cubic per gap. Tangents use the neighbours, so the lit/dashed split stays smooth. */
function splines(p) {
  const out = []
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(p.length - 1, i + 2)]
    out.push(`C${r1(b.x + (c.x - a.x) / 6)} ${r1(b.y + (c.y - a.y) / 6)} ${r1(c.x - (d.x - b.x) / 6)} ${r1(c.y - (d.y - b.y) / 6)} ${r1(c.x)} ${r1(c.y)}`)
  }
  return out
}

export default function Path({ j, s, onOpen }) {
  const wrap = useRef(null)
  const last = useRef('')
  const [geo, setGeo] = useState(null)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const here = j.currentDay
  const complete = j.progress.complete
  const live = j.mode === 'live'
  const latest = useRef({ here, complete })
  latest.current = { here, complete }

  const measure = useCallback(() => {
    const el = wrap.current
    if (!el) return
    const W = el.clientWidth
    const amp = el.querySelector('.learn-amp')?.offsetWidth || 0
    if (!W) return                                                  // the screen is hidden; the ResizeObserver calls us again when it shows
    const pts = Array.from(el.querySelectorAll('[data-pt]'), (a) => ({
      k: a.dataset.pt, x: W / 2 + (parseFloat(a.dataset.f) || 0) * amp, y: offsetY(a, el) + a.offsetHeight / 2,
    })).sort((a, b) => b.y - a.y)
    if (pts.length < 2) return
    const seg = splines(pts)
    let idx = pts.findIndex((p) => p.k === 'd' + latest.current.here)
    if (idx < 0) idx = 0
    if (latest.current.complete) idx = pts.length - 1
    const lit = `M${r1(pts[0].x)} ${r1(pts[0].y)}${seg.slice(0, idx).join('')}`
    const dash = idx < pts.length - 1 ? `M${r1(pts[idx].x)} ${r1(pts[idx].y)}${seg.slice(idx).join('')}` : ''
    const H = el.offsetHeight
    const key = `${W}|${H}|${lit}|${dash}`
    if (key === last.current) return
    last.current = key
    setGeo({ w: W, h: H, lit, dash, y0: pts[0].y, y1: pts[idx].y })
  }, [])

  useLayoutEffect(() => { measure() }, [measure, here, complete, s.id])
  useEffect(() => {
    const el = wrap.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    document.fonts?.ready?.then(measure)
    return () => ro.disconnect()
  }, [measure])

  const stages = [...j.stages].reverse()
  return (
    <div className="learn-path" ref={wrap} data-mode={j.mode}>
      <i className="learn-amp" aria-hidden="true" />
      {geo ? (
        <svg className="learn-curve" width={geo.w} height={geo.h} aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={uid} gradientUnits="userSpaceOnUse" x1="0" y1={geo.y0} x2="0" y2={geo.y1}>
              <stop offset="0" style={{ stopColor: 'var(--ignite-1)' }} />
              <stop offset=".62" style={{ stopColor: 'var(--ignite-2)' }} />
              <stop offset="1" style={{ stopColor: 'var(--ignite-3)' }} />
            </linearGradient>
          </defs>
          {geo.dash ? <path className="learn-curve__dash" d={geo.dash} /> : null}
          <g key={here}>
            <path className="learn-curve__halo" d={geo.lit} pathLength="100" />
            <path className="learn-curve__body" d={geo.lit} pathLength="100" stroke={`url(#${uid})`} />
            <path className="learn-curve__core" d={geo.lit} pathLength="100" />
          </g>
        </svg>
      ) : null}

      <div className="learn-orbit" data-lit={complete || undefined}>
        <span className="learn-orbit__ring" data-pt="cap" data-f="0"><Icon name="satellite" size={24} /></span>
        <b>{labels.learn.orbit}</b>
      </div>

      {stages.map((stg) => {
        const nodes = stg.nodes
        return (
          <section key={stg.index} className="learn-stage" data-stage={stg.index} data-state={stg.state} style={stageVars(stg.slot)} aria-labelledby={`${uid}s${stg.index}`}>
            <ol className="learn-nodes" role="list">
              {nodes.map((_, ri) => {
                const k = nodes.length - 1 - ri
                const n = nodes[k]
                const isHere = n.day === here
                const dist = Math.abs(n.day - here)
                const f = lane(k, nodes.length)
                return (
                  <li
                    key={n.day} className="learn-row" data-live={isHere || undefined} data-enter={dist <= NEAR || undefined}
                    style={{ '--f': f.toFixed(3), '--d': `${dist * STEP}ms` }}
                  >
                    <Node n={n} here={isHere} live={live} f={+f.toFixed(3)} tilt={isHere ? Math.round(clamp(heading(k, nodes.length) * 11, -10, 10)) : 0} onOpen={onOpen} />
                  </li>
                )
              })}
            </ol>
            <StageDivider stage={stg} s={s} id={`${uid}s${stg.index}`} />
          </section>
        )
      })}

      <div className="learn-pad" aria-hidden="true"><span>T-0</span><b>{labels.learn.pad}</b></div>
    </div>
  )
}
