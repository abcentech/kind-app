// Dialog — a chamfered carbon plate on a titanium rim. Confirm / cancel, or a single acknowledgement.
// Danger tone: red LED, red confirm, focus lands on Cancel, and a scrim tap does NOT dismiss — the decision must be explicit.
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { haptic } from '../fx/haptics.js'
import { sound } from '../fx/sound.js'
import { useBackClose } from './useBackClose.jsx'
import { getOverlayRoot, useOverlayLayer, usePresence } from './Sheet.jsx'
import { readMs } from './Counter.jsx'

/**
 * Dialog { open title body eyebrow confirmLabel cancelLabel tone onConfirm onCancel children silent }
 * `cancelLabel={null}` makes it a one-button acknowledgement (Esc and the scrim then confirm).
 */
export function Dialog(props) {
  const { mounted, leaving } = usePresence(props.open, readMs('--t-fast') + 30)
  if (!mounted) return null
  return createPortal(<DialogImpl {...props} leaving={leaving} />, getOverlayRoot())
}

function DialogImpl({
  open, leaving, title, body, eyebrow, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'default',
  onConfirm, onCancel, children, silent = false, className = '', ...rest
}) {
  const uid = useId()
  const layerRef = useRef(null), panelRef = useRef(null), cancelRef = useRef(null), confirmRef = useRef(null)
  const danger = tone === 'danger'
  const hasCancel = cancelLabel !== null && cancelLabel !== false && cancelLabel !== ''

  const cancel = () => { if (!silent) { sound.play('close'); haptic.tap() } (onCancel || onConfirm) && (onCancel || onConfirm)() }
  const confirm = () => { if (!silent) { sound.play('tap'); danger ? haptic.heavy() : haptic.tap() } onConfirm && onConfirm() }

  useEffect(() => { if (open && !silent) sound.play('open') }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  useBackClose(open, () => { cancel() })
  useOverlayLayer({
    active: open, layerRef, panelRef, onEscape: cancel,
    initialFocus: () => (danger && hasCancel ? cancelRef.current : confirmRef.current),
  })

  return (
    <div ref={layerRef} className="k-dialog-layer" data-leaving={leaving || undefined}>
      <div className="k-dialog-scrim" aria-hidden="true" onClick={danger ? undefined : cancel} />
      <div
        ref={panelRef}
        className={'k-dialog ' + className}
        role={danger ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={title ? uid + 't' : undefined}
        aria-describedby={body ? uid + 'b' : undefined}
        data-tone={tone}
        tabIndex={-1}
        {...rest}
      >
        <div className="k-dialog-rim">
          <div className="k-dialog-plate">
            <div className="k-dialog-top">
              <span className="k-dialog-led" aria-hidden="true" />
              {eyebrow && <span className="k-dialog-eyebrow">{eyebrow}</span>}
            </div>
            {title && <h2 className="k-dialog-title" id={uid + 't'}>{title}</h2>}
            {body && <p className="k-dialog-body" id={uid + 'b'}>{body}</p>}
            {children}
            <div className="k-dialog-actions">
              {hasCancel && (
                <button type="button" className="k-dialog-btn" data-kind="cancel" ref={cancelRef} onClick={cancel}>{cancelLabel}</button>
              )}
              <button type="button" className="k-dialog-btn" data-kind="confirm" ref={confirmRef} onClick={confirm}>{confirmLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dialog
