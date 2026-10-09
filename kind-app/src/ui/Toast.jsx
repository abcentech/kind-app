// Toast — a "dynamic island" pill that drops from the top safe area.
//   toast('Saved')                      toast({ title, body, icon, tone, duration, action: { label, onClick }, key, loading })
//   loading: true shows a spinner and never times out; call again with the same `key` to resolve it in place.
//   <ToastHost />                       mounted once by App
// Newest toast is in front; older ones tuck behind it (scaled, dimmed, max 3 visible). Only the front toast's dwell
// timer runs, so a burst of three is not three times as long. Swipe up to dismiss (spring back otherwise). A repeated
// `key` updates the live toast in place instead of stacking. Tone = a status LED, never a coloured banner.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../icons.jsx'
import { haptic } from '../fx/haptics.js'
import { sound } from '../fx/sound.js'
import { ensureRoot } from './Sheet.jsx'
import { readMs } from './Counter.jsx'

/* ── the store ──────────────────────────────────────────────────────────── */
const MAX_LIVE = 4
let list = []
let seq = 0
const subs = new Set()
const emit = () => subs.forEach((f) => f())
const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
const snapshot = () => list

const patch = (id, fn) => { list = list.map((t) => (t.id === id ? fn(t) : t)); emit() }

export function toast(input) {
  const o = typeof input === 'string' ? { title: input } : { ...input }
  const dwell = o.duration ?? (o.loading ? 0 : o.action ? 5400 : 3600)
  if (o.key != null) {
    const live = list.find((t) => t.key === o.key && !t.leaving)
    // an update with the same key is a *replacement*: nothing of the old content (body, icon, action, spinner) may leak into the new
    if (live) { patch(live.id, (t) => ({ tone: 'default', ...o, duration: dwell, id: t.id, n: t.n + 1, leaving: false })); fire(o); return live.id }
  }
  const id = ++seq
  list = [...list, { tone: 'default', ...o, duration: dwell, id, n: 0, leaving: false }]
  const live = list.filter((t) => !t.leaving)
  if (live.length > MAX_LIVE) toast.dismiss(live[0].id)
  emit()
  fire(o)
  return id
}
// Cues are opt-in: callers already play their own sound for the thing the toast confirms.
function fire(o) {
  if (o.haptic && haptic[o.haptic]) haptic[o.haptic]()
  else if (o.tone === 'nogo') haptic.warning()
  if (o.sound) sound.play(o.sound)
}
toast.dismiss = (id) => patch(id, (t) => (t.leaving ? t : { ...t, leaving: true }))
toast.clear = () => { list = list.map((t) => ({ ...t, leaving: true })); emit() }
const remove = (id) => { list = list.filter((t) => t.id !== id); emit() }

const TONE_ICON = { go: 'checkCircle', nogo: 'warning' }

/* ── one toast ──────────────────────────────────────────────────────────── */
const rubber = (x) => 24 * (1 - 1 / ((x * 0.55) / 24 + 1))        // pulling down is resisted hard

function ToastItem({ t, depth }) {
  const el = useRef(null)
  const drag = useRef(null)
  const left = useRef(t.duration)
  const [held, setHeld] = useState(false)
  const [focused, setFocused] = useState(false)
  const pause = held || focused
  const sticky = !(t.duration > 0) || !Number.isFinite(t.duration)

  useEffect(() => { left.current = t.duration }, [t.n]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (t.leaving || sticky || depth !== 0 || pause) return undefined
    const at = performance.now()
    const id = setTimeout(() => toast.dismiss(t.id), left.current)
    return () => { clearTimeout(id); left.current = Math.max(0, left.current - (performance.now() - at)) }
  }, [t.n, t.leaving, depth, pause, sticky]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!t.leaving) return undefined
    const id = setTimeout(() => remove(t.id), readMs('--t-base') + 40)
    return () => clearTimeout(id)
  }, [t.leaving, t.id])

  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (e.target.closest('button')) return
    drag.current = { y: e.clientY, dy: 0, s: [{ t: e.timeStamp, y: e.clientY }] }
    el.current.style.transition = 'none'
    try { el.current.setPointerCapture(e.pointerId) } catch { /* not capturable */ }
    setHeld(true)
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d) return
    const raw = e.clientY - d.y
    d.dy = raw > 0 ? rubber(raw) : raw
    el.current.style.transform = `translate3d(0, ${d.dy}px, 0)`
    d.s.push({ t: e.timeStamp, y: e.clientY })
    if (d.s.length > 8) d.s.shift()
  }
  const onUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    try { el.current.releasePointerCapture(e.pointerId) } catch { /* released */ }
    const a = d.s[0], b = d.s[d.s.length - 1]
    const v = b.t > a.t && e.timeStamp - b.t < 80 ? (b.y - a.y) / (b.t - a.t) : 0
    const node = el.current
    node.style.transition = ''
    if (d.dy < -22 || v < -0.45) {
      haptic.select()
      toast.dismiss(t.id)                                              // the slot plays the exit; the drag offset carries on upward
    } else {
      node.style.transform = ''                                        // CSS spring (--spring-snap) takes it home
      setHeld(false)
    }
  }

  const onAction = () => { sound.play('tap'); haptic.tap(); t.action.onClick && t.action.onClick(); toast.dismiss(t.id) }
  const onKeyDown = (e) => { if (e.key === 'Escape') { e.stopPropagation(); toast.dismiss(t.id) } }

  const role = t.tone === 'nogo' ? 'alert' : undefined             // the host is the one polite live region; nesting role=status would announce twice
  // verdicts never rely on colour alone (design §10): go / no-go carry a glyph even when the caller passed none
  const auto = t.icon == null ? TONE_ICON[t.tone] : null
  const glyph = typeof t.icon === 'string' ? <Icon name={t.icon} size={20} /> : t.icon || (auto && <Icon name={auto} size={20} weight="duo" />)
  const hidden = depth >= 3

  return (
    <div
      className="k-toast-slot" style={{ '--i': depth }} data-leaving={t.leaving || undefined} data-hidden={hidden || undefined}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHeld(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && !drag.current && setHeld(false)}
    >
      <div className="k-toast-fly" data-leaving={t.leaving || undefined}>
        <div
          ref={el}
          className="k-toast"
          role={role}
          aria-busy={t.loading || undefined}
          data-tone={t.tone}
          data-front={depth === 0 || undefined}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={onKeyDown}
          {...(hidden ? { inert: '' } : null)}
        >
          <span className="k-toast-lead" aria-hidden="true">
            {t.loading ? (
              <svg className="k-toast-spin" viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="8.5" pathLength="100" /></svg>
            ) : glyph || <span className="k-toast-led" />}
          </span>
          <span className="k-toast-text" key={"t" + t.n}>
            <span className="k-toast-title">{t.title}</span>
            {t.body && <span className="k-toast-body">{t.body}</span>}
          </span>
          {t.action && <button type="button" className="k-toast-act" onClick={onAction}>{t.action.label}</button>}
          {!sticky && (
            <span
              key={"f" + t.n} className="k-toast-fuse" aria-hidden="true"
              data-run={(depth === 0 && !pause && !t.leaving) || undefined} style={{ '--k-dur': t.duration + 'ms' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ── the host ───────────────────────────────────────────────────────────── */
export function ToastHost() {
  const items = useSyncExternalStore(subscribe, snapshot, snapshot)
  const [root, setRoot] = useState(null)
  useEffect(() => { setRoot(ensureRoot('toast-root', 'k-toast-root', true)) }, [])
  if (!root) return null
  return createPortal(
    <div className="k-toast-host" role="region" aria-label="Notifications" aria-live="polite">
      {items.map((t, i) => (
        <ToastItem key={t.id} t={t} depth={items.slice(i + 1).filter((x) => !x.leaving).length} />
      ))}
    </div>,
    root,
  )
}

export default ToastHost
