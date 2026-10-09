// useBackClose(open, onClose) — while `open`, the Android back gesture / iOS edge swipe / browser Back closes
// the layer instead of leaving the app.
//
// One module-level stack of layers and ONE popstate listener (per-hook listeners cannot tell which of two
// stacked layers a Back press belongs to). Every pushed entry carries its depth in history.state, so a multi-step
// Back (long-press history) closes exactly that many layers, and a stray Forward onto a stale entry is stepped off.
//
//  • Back press              → the topmost layer's onClose runs; its entry is already gone from history.
//  • Programmatic close      → the layer is marked dead; if its entry sits on top of history we `history.go(-n)`
//                              it away (one traversal even for several), so no phantom entry is left behind.
//  • A dead layer buried under a live one is skipped silently when Back reaches it.
//  • onClose returning `false` refuses the close (a non-dismissable sheet): the entry is pushed again.
//  • Pushes/pops are coalesced in a microtask, which also makes React StrictMode's mount→unmount→mount a no-op.
import { useEffect, useRef } from 'react'

const stack = []            // { id, pushed, dead, close }
let uid = 0
let selfPops = 0            // popstates we caused ourselves and must ignore
let queued = false

const sync = () => { if (!queued) { queued = true; queueMicrotask(flush) } }

function flush() {
  queued = false
  if (typeof history === 'undefined') return
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i].dead && !stack[i].pushed) stack.splice(i, 1)
  let k = 0
  while (stack.length && stack[stack.length - 1].dead) { stack.pop(); k++ }   // closed layers resting on top of history
  if (k) { selfPops++; history.go(-k); return }                              // new pushes resume on the resulting popstate
  stack.forEach((e, i) => {
    if (e.pushed) return
    const prev = history.state && typeof history.state === 'object' ? history.state : {}
    history.pushState({ ...prev, kBack: e.id, depth: i + 1 }, '')
    e.pushed = true
  })
}

function onPop() {
  if (selfPops > 0) { selfPops--; sync(); return }
  const st = history.state
  const d = st && st.kBack != null && typeof st.depth === 'number' ? st.depth : 0
  if (d > stack.length) { selfPops++; history.go(stack.length - d); return }  // Forward onto an entry whose layer is gone
  const closing = stack.splice(d)                                              // everything above `d` was just popped
  const keep = []
  for (let i = closing.length - 1; i >= 0; i--) {
    const layer = closing[i]
    if (layer.dead) continue
    if (keep.length) { keep.unshift(layer); continue }                         // a layer above refused, so these stay open too
    if (layer.close() === false) keep.unshift(layer)
  }
  keep.forEach((layer) => { layer.pushed = false; stack.push(layer) })
  sync()
}

if (typeof window !== 'undefined') {
  if (window.__kBackPop) window.removeEventListener('popstate', window.__kBackPop)   // HMR: never double-listen
  window.__kBackPop = onPop
  window.addEventListener('popstate', onPop)
}

/**
 * @param {boolean} open
 * @param {() => (void|false)} onClose  called when Back is pressed; return `false` to refuse and stay open
 * @param {{enabled?: boolean}} [opts]
 */
export function useBackClose(open, onClose, { enabled = true } = {}) {
  const fn = useRef(onClose)
  fn.current = onClose
  useEffect(() => {
    if (!open || !enabled) return undefined
    const layer = { id: ++uid, pushed: false, dead: false, close: () => (fn.current ? fn.current() : undefined) }
    stack.push(layer)
    sync()
    return () => { layer.dead = true; sync() }
  }, [open, enabled])
}

export default useBackClose
