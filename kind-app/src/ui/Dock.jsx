// Dock — the floating glass capsule tab bar. Inset from the edges, above the safe area, never touching them.
// A single ignition plate slides under the active tab on --spring-snap (translateX in whole-tab units, so there is
// no measuring and no layout); a keyed inner element stretches once per change for the squash. Icons crossfade
// line → solid. Full fx: real blur. Lite: opaque carbon, 120 ms fades.
// Scrub: press anywhere on the capsule and slide — the plate follows the finger (fractional --k-i, short ease instead
// of the spring), the nearest tab lights, a detent tick fires each time you cross into a new one, and releasing selects it.
//   Footprint for screens to reserve: calc(var(--dock-h) + var(--s-3) * 2 + var(--sab)).
import { useRef, useState } from 'react'
import { Icon } from '../icons.jsx'
import { haptic } from '../fx/haptics.js'
import { sound } from '../fx/sound.js'

const SCRUB_SLOP = 8
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const panOf = (i, n) => (n > 1 ? (i / (n - 1)) * 2 - 1 : 0)       // the nav chime sits where the tab does (sound.js: "pan it to the tab")

/**
 * Dock { tabs:[{id,label,icon,badge}] value onChange(id, {reselect}) }
 * extras: hidden (slides away for full-screen flows) · label (the nav landmark's name)
 */
export function Dock({ tabs = [], value, onChange, hidden = false, label = 'Primary', className = '', style, ...rest }) {
  const idx = Math.max(0, tabs.findIndex((t) => t.id === value))
  const btns = useRef([])
  const nav = useRef(null)
  const [near, setNear] = useState(null)                   // tab index lit while scrubbing (null = not scrubbing)
  const live = useRef({})
  live.current = { idx, tabs, onChange, value }
  const drag = useRef(null)

  const pick = (id) => {
    const reselect = id === value
    if (reselect) haptic.tap(); else { sound.play('nav', { pan: panOf(tabs.findIndex((t) => t.id === id), tabs.length) }); haptic.select() }
    onChange && onChange(id, { reselect })
  }
  const onKey = (e, i) => {
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null
    if (to == null) return
    e.preventDefault()
    const el = btns.current[(to + tabs.length) % tabs.length]
    el && el.focus()
  }

  /* ---- scrub ------------------------------------------------------- */
  const frac = (clientX) => {
    const r = nav.current.getBoundingClientRect()
    const pad = 8                                         // --k-pad (var(--s-2)): the track is inset by it
    const w = (r.width - pad * 2) / live.current.tabs.length
    return clamp((clientX - r.left - pad) / w - 0.5, 0, live.current.tabs.length - 1)
  }
  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = { id: e.pointerId, x: e.clientX, on: false, near: live.current.idx }
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    if (!d.on) {
      if (Math.abs(e.clientX - d.x) < SCRUB_SLOP) return
      d.on = true
      try { nav.current.setPointerCapture(e.pointerId) } catch { /* not capturable */ }
      nav.current.setAttribute('data-scrub', '')
    }
    const f = frac(e.clientX)
    nav.current.style.setProperty('--k-i', f.toFixed(3))
    const n = Math.round(f)
    if (n !== d.near) { d.near = n; haptic.select(); sound.play('detent', { step: n, pan: panOf(n, live.current.tabs.length) }); setNear(n) } else if (near == null) setNear(n)
  }
  const onUp = (e) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    drag.current = null
    if (!d.on) return
    try { nav.current.releasePointerCapture(e.pointerId) } catch { /* released */ }
    const { tabs: ts, value: v, onChange: cb } = live.current
    const to = clamp(d.near, 0, ts.length - 1)
    nav.current.removeAttribute('data-scrub')
    nav.current.style.setProperty('--k-i', String(to))      // glide to the landing tab on the spring
    setNear(null)
    const tab = ts[to]
    // landing back on the tab you started from is a cancelled scrub, not a re-select (screens scroll to top on re-select)
    if (tab && tab.id !== v) { sound.play('nav', { pan: panOf(to, ts.length) }); haptic.select(); cb && cb(tab.id, { reselect: false }) }
    // a parent that refuses the change must not leave the plate stranded
    requestAnimationFrame(() => nav.current && nav.current.style.setProperty('--k-i', String(live.current.idx)))
  }

  return (
    <nav
      ref={nav}
      className={'k-dock ' + className} aria-label={label} data-hidden={hidden || undefined}
      style={{ '--k-n': tabs.length, '--k-i': idx, ...style }} {...(hidden ? { inert: '', 'aria-hidden': true } : null)}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} {...rest}
    >
      <span className="k-dock-glass" aria-hidden="true" />
      <span className="k-dock-track" aria-hidden="true">
        <span className="k-dock-ind"><span className="k-dock-ind-in" key={near == null ? idx : 'scrub'} /></span>
      </span>
      <ul className="k-dock-list">
        {tabs.map((t, i) => {
          const active = t.id === value
          const lit = near == null ? active : near === i
          const count = typeof t.badge === 'number' ? t.badge : null
          return (
            <li key={t.id} className="k-dock-cell">
              <button
                type="button" className="k-dock-tab" ref={(el) => { btns.current[i] = el }} data-on={lit || undefined}
                aria-current={active ? 'page' : undefined} onClick={() => pick(t.id)} onKeyDown={(e) => onKey(e, i)}
              >
                <span className="k-dock-ico">
                  <span className="k-dock-ico-line"><Icon name={t.icon} size={24} weight="line" /></span>
                  <span className="k-dock-ico-solid"><Icon name={t.icon} size={24} weight="solid" /></span>
                  {t.badge ? (
                    <span className="k-dock-badge" data-count={count != null || undefined}>
                      {count != null ? (count > 9 ? '9+' : count) : null}
                      <span className="k-sr-only">{count != null ? `, ${count} new` : ', new'}</span>
                    </span>
                  ) : null}
                </span>
                <span className="k-dock-label">{t.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default Dock
