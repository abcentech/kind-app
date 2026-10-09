// ex-choice · Plate — the chamfered carbon answer slab, shared by Choice, TrueFalse and anyone who needs one.
//   <Plate keycap={1} state="rest|selected|right|wrong|dim" onClick>option text</Plate>
// Extras: layout="tile" (+ tone="go|nogo", glyph="check|close") is the big True/False plate · frozen = graded, no press ·
// label = accessible name · any other prop (role, tabIndex, aria-*, ref) lands on the <button>.
// The silhouette is drawn by clipped children; the glow is a filter on the (unclipped) root, because clip-path eats box-shadow.
// `useRadios` is the roving-tabindex radiogroup the renderers share: arrows, 1–N keys, Enter = submit once a plate is chosen.
import { forwardRef, useEffect, useRef } from 'react'
import { Kbd } from '../../../ui/index.js'
import { cx, useMergedRef, usePress } from '../../../ui/Button.jsx'
import { Icon } from '../../../icons.jsx'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'

export const Plate = forwardRef(function Plate(
  { keycap, state = 'rest', layout = 'row', tone, glyph, frozen = false, label, onClick, children, className, ...rest },
  fwd,
) {
  const own = useRef(null)
  const ref = useMergedRef(own, fwd)
  usePress(own, frozen)

  const verdict = state === 'right' ? 'check' : state === 'wrong' ? 'close' : null
  const handle = (e) => {
    if (frozen) { e.preventDefault(); return }
    if (state !== 'selected') { sound.play('select'); haptic.select() }
    // Safari does not focus a button on click; keep focus on the plate so the arrows and Enter keep working.
    if (document.activeElement !== e.currentTarget) e.currentTarget.focus({ preventScroll: true })
    onClick?.(e)
  }

  const cap = keycap != null && keycap !== false ? <Kbd className="exc-plate__cap">{keycap}</Kbd> : null
  const led = (
    <span className="exc-plate__led" data-kind={verdict || undefined}>
      {verdict ? <Icon name={verdict} size={16} /> : null}
    </span>
  )

  return (
    <button
      ref={ref}
      type="button"
      className={cx('exc-plate', className)}
      data-state={state}
      data-layout={layout === 'tile' ? 'tile' : undefined}
      data-tone={tone || undefined}
      data-frozen={frozen ? '' : undefined}
      aria-label={label}
      aria-keyshortcuts={keycap != null && keycap !== false ? String(keycap) : undefined}
      {...rest}
      onClick={handle}
    >
      <span className="exc-plate__ring" aria-hidden="true" />
      <span className="exc-plate__face" aria-hidden="true">
        <span className="exc-plate__fill" />
        <span className="exc-plate__sheen" />
        <span className="exc-plate__glint" />
      </span>
      {layout === 'tile' ? (
        <span className="exc-plate__in">
          <span className="exc-plate__top" aria-hidden="true">{cap}{led}</span>
          <span className="exc-plate__glyph" aria-hidden="true">{glyph ? <Icon name={glyph} size={32} /> : null}</span>
          <span className="exc-plate__body">{children}</span>
        </span>
      ) : (
        <span className="exc-plate__in">
          <span className="exc-plate__lead" aria-hidden="true">{cap}{led}</span>
          <span className="exc-plate__body">{children}</span>
        </span>
      )}
    </button>
  )
})

const EDITABLE = /^(INPUT|TEXTAREA|SELECT)$/

/**
 * Roving-tabindex radiogroup. `index` = the chosen plate (-1 none); `frozen` = graded; `onPick(i)` fires on a changed choice.
 *   const r = useRadios({ count, index, frozen, onPick, onSubmit, keys: { t: 0, f: 1 } })
 *   <div {...r.group}> <Plate {...r.item(i)} …/> </div>
 * Keys — digits 1–N anywhere on the page (unless a field or dialog has focus, or the group is hidden/inert);
 * arrows/Home/End move focus and choose (WAI-ARIA radio); Enter on the chosen plate = onSubmit, on an unchosen plate = choose it.
 */
export function useRadios({ count, index, frozen = false, onPick, onSubmit, keys }) {
  const refs = useRef([])
  const live = useRef({})
  live.current = { count, index, frozen, onPick, onSubmit, keys }

  useEffect(() => {
    const onKey = (e) => {
      const L = live.current
      if (L.frozen || e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t && (t.isContentEditable || EDITABLE.test(t.tagName) || (t.closest && t.closest('[role="dialog"],[role="alertdialog"],[aria-modal="true"]')))) return
      const k = String(e.key).toLowerCase()
      let i = /^[1-9]$/.test(k) ? Number(k) - 1 : L.keys && L.keys[k] != null ? L.keys[k] : -1
      if (i < 0 || i >= L.count) return
      const el = refs.current[i]
      if (!el || el.closest('[inert],[aria-hidden="true"]')) return
      e.preventDefault()
      el.focus()
      el.click()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (i) => {
    const el = refs.current[i]
    if (!el) return
    el.focus()
    if (!live.current.frozen) el.click()
  }
  const onKeyDown = (e) => {
    const L = live.current
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const here = refs.current.indexOf(document.activeElement)
    const n = L.count
    let to = -1
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') to = (here + 1) % n
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') to = (here - 1 + n) % n
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = n - 1
    if (to >= 0) { e.preventDefault(); go(to); return }
    if (e.key === 'Enter' && !L.frozen && L.index >= 0 && here === L.index) {
      e.preventDefault(); e.stopPropagation()
      L.onSubmit?.()
    }
  }

  return {
    group: { role: 'radiogroup', 'aria-readonly': frozen || undefined, onKeyDown },
    item: (i) => ({
      ref: (el) => { refs.current[i] = el },
      role: 'radio',
      'aria-checked': index === i,
      'aria-posinset': i + 1,
      'aria-setsize': count,
      tabIndex: i === (index >= 0 ? index : 0) ? 0 : -1,
    }),
    count,
  }
}

export default Plate
