// onboard · Beat — the shared pre-flight layout. Every beat (and onboard-commit's Goal / Reminder) renders inside it.
//
//   <Beat eyebrow title dek footer step steps back variant art>children</Beat>
//     eyebrow  mono-ish label above the title            title / dek   the question and its one line of help (strings or nodes)
//     children the decision itself (pushed to the thumb zone)          footer   the primary action, pinned above the keyboard
//     step     1-based current step   steps  total        back   fn → shows the back key; null/false hides it
//     variant  'default' | 'hero' | 'launch'              art    a full-bleed scene behind everything (the Hero's launch pad)  artLabel  its alt text
//   `step`, `steps` and `back` default to what <Onboard> provides through FlowContext, so a beat that only knows its own
//   content (Goal, Reminder) still gets the right ticks and a working back key.
//
// Layout: top bar (back · tick progress · counter) / scrolling body (head up top, decision at the bottom) / footer.
// The title takes focus on arrival (screen readers read the question) unless something inside the beat already holds it
// (the Name field). Entry choreography is staggered via --i; lite and reduced motion get a plain fade (onboard.css).
import { createContext, useContext, useEffect, useId, useRef } from 'react'
import { IconButton, Label, SegmentBar } from '../../ui/index.js'
import { onboardCopy } from '../../copy.js'

export const FlowContext = createContext({ step: 1, steps: 5, back: null })

const two = (n) => String(Math.max(0, n)).padStart(2, '0')

export default function Beat({
  eyebrow, title, dek, children, footer, step, steps, back, variant = 'default', art, artLabel, className, ...rest
}) {
  const flow = useContext(FlowContext)
  const total = Math.max(1, steps ?? flow.steps)
  const at = step ?? flow.step
  const goBack = back === undefined ? flow.back : back
  const root = useRef(null)
  const head = useRef(null)
  const tid = useId()

  useEffect(() => {
    const r = root.current
    if (!r || r.contains(document.activeElement)) return
    head.current?.focus({ preventScroll: true })
  }, [])

  const shown = Math.min(at, total)
  const label = onboardCopy.progress(shown).replace(/\d+$/, String(total))
  const done = Math.min(total, Math.max(0, at - 1))
  return (
    <section ref={root} className={['onb-beat', className].filter(Boolean).join(' ')} data-variant={variant} aria-labelledby={tid} {...rest}>
      {art ? <div className="onb-beat__art" {...(artLabel ? { role: 'img', 'aria-label': artLabel } : { 'aria-hidden': 'true' })}>{art}</div> : null}
      {art ? <i className="onb-beat__scrim" aria-hidden="true" /> : null}

      <header className="onb-top">
        <div className="onb-top__side">
          {typeof goBack === 'function'
            ? <IconButton icon="chevronLeft" label={onboardCopy.chrome.back} onClick={goBack} />
            : null}
        </div>
        <SegmentBar className="onb-top__bar" total={total} done={done} current={Math.min(total - 1, done)} tone="tele" label={label} />
        <span className="onb-top__count t-mono-sm t-num" aria-hidden="true">{two(shown)}<i>/</i>{two(total)}</span>
      </header>

      <div className="onb-body">
        <div className="onb-head">
          {eyebrow ? <Label className="onb-eyebrow" tone={variant === 'launch' ? 'go' : 'tele'} dot style={{ '--i': 0 }}>{eyebrow}</Label> : null}
          <h1 id={tid} ref={head} tabIndex={-1} className="onb-title" style={{ '--i': 1 }}>{title}</h1>
          {dek ? <p className="onb-dek" style={{ '--i': 2 }}>{dek}</p> : null}
        </div>
        {children ? <div className="onb-stage" style={{ '--i': 3 }}>{children}</div> : null}
      </div>

      {footer ? <footer className="onb-foot" style={{ '--i': 4 }}>{footer}</footer> : null}
    </section>
  )
}
