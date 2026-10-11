// KIND fx facade. `import { fx } from './fx/fx.js'` is unchanged for every screen; the particle engine itself (engine.js, ~29 kB min)
// is a lazy chunk, so it is not part of the first-load bundle. App warms it right after first paint (preloadFx).
//
//   • Same API as engine.js. Every call before the engine has arrived is queued behind one import(), in order.
//   • fx.at() is synchronous (screens spread its result into other calls), so it lives here.
//   • fx.trail() returns a handle at once; stop() works whether or not the engine has loaded yet.
//   • fx.fly() callbacks (onArrive / onDone) change real state, so if the engine can never load they still fire.
//   • fx.stats() is dev/test only: returns {} until the engine is in.

let eng = null
let loading = null
const load = () => loading || (loading = import('./engine.js').then((m) => (eng = m.fx)))

/** Start fetching the engine (idempotent). Safe to call early and often. */
export const preloadFx = () => { load().catch(() => {}) }

/** Run `name` on the engine now if it is loaded, else as soon as it is. Decoration only: a failed load is swallowed. */
const defer = (name) => (...a) => {
  if (eng) return eng[name](...a)
  load().then((e) => e[name](...a)).catch(() => {})
}

/** Viewport point for an element / ref / event / {x,y}. Mirror of engine.js `at` (kept here because callers need it synchronously). */
function at(t, edge = 'center') {
  if (!t) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  if (typeof t.clientX === 'number') return { x: t.clientX, y: t.clientY }
  if (typeof t.x === 'number' && typeof t.y === 'number' && !t.getBoundingClientRect) return { x: t.x, y: t.y }
  const el = t.current || t
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2
  return edge === 'top' ? { x: cx, y: r.top } : edge === 'bottom' ? { x: cx, y: r.bottom }
    : edge === 'left' ? { x: r.left, y: cy } : edge === 'right' ? { x: r.right, y: cy } : { x: cx, y: cy }
}

function trail(t, o) {
  if (eng) return eng.trail(t, o)
  let real = null, stopped = false
  load().then((e) => { if (!stopped) real = e.trail(t, o) }).catch(() => {})
  return { stop() { stopped = true; if (real) real.stop() } }
}

function fly(o = {}) {
  if (eng) return eng.fly(o)
  load().then((e) => e.fly(o)).catch(() => {
    const n = o.n ?? 5
    if (o.onArrive) for (let i = 0; i < n; i++) o.onArrive(i, n)
    if (o.onDone) o.onDone()
  })
}

const stats = () => (eng ? eng.stats() : {})

export const fx = {
  sparks: defer('sparks'), embers: defer('embers'), confetti: defer('confetti'), shockwave: defer('shockwave'), flash: defer('flash'),
  shake: defer('shake'), trail, at, fly, launch: defer('launch'), celebrate: defer('celebrate'), cannons: defer('cannons'),
  go: defer('go'), nogo: defer('nogo'), pop: defer('pop'), ignite: defer('ignite'), clear: defer('clear'), stats,
  setQuality: defer('setQuality'), setRenderer: defer('setRenderer'),
}
