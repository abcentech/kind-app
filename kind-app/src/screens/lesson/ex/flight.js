// owner: ex-blank-order. Shared by Blank.jsx and Order.jsx (a helper, not a View).
//   useFlight(rootRef, when?) -> snap(opts?)   FLIP for the word chips. Call snap() in the event handler, *before* the state change:
//     it records where every [data-flip] node is; after the commit it compares and moves things (`when` is a value whose
//     change, with no snap(), is diffed against the layout of the previous commit: a prop-driven re-layout glides too):
//       · same container, moved   -> the node slides from where it was (ease-out, --t-base)
//       · changed container       -> a ghost chip flies from the old rect to the new one on --spring-snap while the real
//                                    node waits invisible, then takes over (so a chip that grows from a 20 px tile into
//                                    the 26 px word of a verse can dissolve its plate on the way)
//     data-flip = stable id · data-where = container name · data-text = the word.
//   useKeys(rootRef, handler, off) -> window keydown, filtered so a dialog, an input or a hidden step never answers.
// Everything is a no-op without the Web Animations API; lite / reduced motion = a 120 ms cross-fade, no flight.
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

const html = () => document.documentElement
const tok = (n) => getComputedStyle(html()).getPropertyValue(n).trim()
export const ms = (n) => parseFloat(tok(n)) || 0
export const isLite = () =>
  html().dataset.fx === 'lite' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
const springOK = () => typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)')
const canAnimate = () => typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function'

function measure(root) {
  const o = root.getBoundingClientRect()
  const m = new Map()
  root.querySelectorAll('[data-flip]').forEach((n) => {
    const r = n.getBoundingClientRect()
    m.set(n.dataset.flip, {
      x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height,
      where: n.dataset.where || '', text: n.dataset.text || n.textContent || '',
      fs: parseFloat(getComputedStyle(n).fontSize) || 16,
    })
  })
  return m
}

export function useFlight(rootRef, when) {
  const first = useRef(null)
  const prev = useRef(null)                 // layout after the previous commit
  const lastWhen = useRef(when)
  const ghosts = useRef(new Map())          // id -> { el, w0, fs0, where, text }

  const killGhost = (id) => {
    const g = ghosts.current.get(id)
    if (!g) return
    ghosts.current.delete(id)
    g.el.getAnimations().forEach((a) => { a.onfinish = null; a.oncancel = null; a.cancel() })
    g.el.remove()
  }

  const snap = useCallback((opt) => {
    const root = rootRef.current
    if (!root || !canAnimate()) return
    const m = measure(root)
    const o = root.getBoundingClientRect()
    // a chip that is still flying is continued from where the eye last saw it
    ghosts.current.forEach((g, id) => {
      const r = g.el.getBoundingClientRect()
      m.set(id, { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height, where: g.where, text: g.text, fs: g.fs0 * (r.width / g.w0 || 1) })
      killGhost(id)
    })
    first.current = { m, opt: opt || {} }
  }, [rootRef])

  useLayoutEffect(() => {
    const root = rootRef.current
    let f = first.current
    first.current = null
    if (!f && lastWhen.current !== when && prev.current) f = { m: prev.current, opt: {} }
    lastWhen.current = when
    if (!root) return
    if (f) root.querySelectorAll('[data-flip]').forEach((n) => n.getAnimations().forEach((a) => { if (a.id === 'exb-nb') a.cancel() }))
    const after = measure(root)
    prev.current = after
    if (!f || !canAnimate()) return
    const { m: before, opt } = f
    const nodes = new Map()
    root.querySelectorAll('[data-flip]').forEach((n) => nodes.set(n.dataset.flip, n))
    const lite = isLite()
    const spring = springOK()
    let k = 0
    after.forEach((a, id) => {
      const b = before.get(id)
      const node = nodes.get(id)
      if (!b || !node) return
      if (b.where === a.where) {
        const dx = b.x - a.x, dy = b.y - a.y
        if (lite || (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5)) return
        node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
          id: 'exb-nb', duration: opt.dur || ms('--t-base'), easing: opt.ease || tok('--ease-out'), delay: (opt.stagger || 0) * k++, fill: 'backwards',
        })
        return
      }
      if (lite) { node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms('--t-fast'), easing: 'linear' }); return }
      // changed container: a ghost flies, the real node waits and takes over
      const dur = spring ? ms('--spring-snap-ms') : ms('--t-slow')
      const ease = spring ? tok('--spring-snap') : tok('--ease-out')
      const scale = Math.min(2, Math.max(0.5, a.fs / b.fs))
      const dx = a.x + a.w / 2 - (b.x + b.w / 2), dy = a.y + a.h / 2 - (b.y + b.h / 2)
      killGhost(id)
      const el = document.createElement('div')
      el.className = 'exb-ghost'
      el.setAttribute('aria-hidden', 'true')
      el.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;font-size:${b.fs}px`
      const tile = document.createElement('i')
      tile.className = 'exb-ghost__tile'
      const label = document.createElement('span')
      label.className = 'exb-ghost__text'
      label.textContent = b.text
      el.append(tile, label)
      root.appendChild(el)
      const info = { el, w0: b.w, fs0: b.fs, where: b.where, text: b.text }
      ghosts.current.set(id, info)
      const move = el.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${scale})` }], { duration: dur, easing: ease, fill: 'forwards' })
      el.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.7 }, { opacity: 0, offset: 1 }], { duration: dur, easing: 'linear', fill: 'forwards' })
      tile.animate([{ opacity: b.where === 'socket' ? 0 : 1 }, { opacity: a.where === 'socket' ? 0 : 1 }], { duration: dur, easing: tok('--ease-io'), fill: 'forwards' })
      node.animate([{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1, offset: 1 }], { duration: dur, easing: 'linear' })
      const done = () => { if (ghosts.current.get(id) === info) ghosts.current.delete(id); el.remove() }
      move.onfinish = done
      move.oncancel = done
    })
  })

  useEffect(() => () => { [...ghosts.current.keys()].forEach(killGhost) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return snap
}

export function useKeys(rootRef, handler, off) {
  const h = useRef(handler)
  h.current = handler
  useEffect(() => {
    if (off) return undefined
    const on = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t && (t.isContentEditable || (t.tagName && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return
      const root = rootRef.current
      if (!root || !root.isConnected || root.offsetParent === null || root.closest('[inert], [aria-hidden="true"]')) return
      const a = document.activeElement
      if (a && a.closest && a.closest('[role="dialog"], [role="alertdialog"]')) return
      h.current(e)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [off, rootRef])
}

/** Announce to a polite live region without re-rendering (a re-render could eat the pending FLIP snapshot). */
export function say(ref, text) {
  const el = ref.current
  if (!el) return
  el.textContent = el.textContent === text ? text + ' ' : text
}
