// complete-shell · Stage — the deep-space set every Orbit-insertion beat plays on, plus the helpers beats share.
//
//   <Stage label plan index phase beatId bank ctx hintOn canSkip onSkip>{beat}</Stage>
//
//   LAYERS (back to front)   earth limb (drops away on ascent) · starfield · contrast shade · month gleam
//                            beats (.cmp-beat, one per child) · top bar (label, skip, ticker + XP bank) · hint
//   WHAT BEATS CAN RELY ON   .cmp-beat is a flex column, centred, padded for the bar and the hint. Two vars are set on
//                            .cmp so a beat can opt into its own layout:  --cmp-top  --cmp-bottom.
//   useStage()               { dockRef, bankDone(), setPhase('pad'|'climb'|'orbit'), intercept(fn), holdDrop }
//                            dockRef  the XP chip in the bar (the HUD corner); fly things to it with fx.fly.
//                            intercept(fn) registers a tap handler for the beat: return true to swallow the tap
//                            (used to fast-forward a choreography before the next tap advances).
//   momentFor(result, s, day, st)  the completionCopy Moment for this finish (the label, the title and the praise line).
import { createContext, useContext } from 'react'
import { Button, Label, SegmentBar, Tag, Counter } from '../../ui/index.js'
import { Horizon, Starfield } from '../../art/index.js'
import { completionCopy } from '../../copy.js'

const NOOP = () => {}
export const StageCtx = createContext({ dockRef: { current: null }, bankDone: NOOP, setPhase: NOOP, intercept: () => NOOP, holdDrop: false })
export const useStage = () => useContext(StageCtx)

const CHROME = { skip: 'Skip', tap: 'Tap to continue', key: 'Space to continue', progress: 'Orbit insertion progress', xp: 'XP' }

/** The completionCopy Moment for a finishDay result (deterministic per series + day, so it never flickers between beats). */
export function momentFor(result, s, day, st) {
  const type = s?.calendar?.find((c) => c.day === day)?.type
  const hour = parseInt(String(result.time || '').split(':')[0], 10)
  return completionCopy({
    day, first: result.first, perfect: result.perfect, recovered: result.asked > result.right && !result.perfect, again: result.again,
    comeback: result.streak?.comeback, hour: Number.isFinite(hour) ? hour : undefined, kind: type === 'selah' ? 'selah' : type === 'intro' ? 'intro' : 'teaching',
    role: st?.role, series: s, seed: `${s?.id}:${day}`,
  })
}

export default function Stage({ label, total, index, phase, beatId, bank, ctx, hintOn, canSkip, onSkip, rootRef, children, ...rest }) {
  return (
    <StageCtx.Provider value={ctx}>
      <div ref={rootRef} className="cmp" data-phase={phase} data-beat={beatId} tabIndex={-1} {...rest}>
        <div className="cmp-earth" aria-hidden="true"><Horizon variant="limb" stars={false} /></div>
        <div className="cmp-stars" aria-hidden="true"><Starfield seed={7} density={1.35} twinkle fade="bottom" /></div>
        <i className="cmp-shade" aria-hidden="true" />
        <i className="cmp-gleam" aria-hidden="true" />

        {children}

        <header className="cmp-bar">
          <div className="cmp-bar__top">
            <Label mono dot tone="tele" className="cmp-label">{label}</Label>
            <Button variant="ghost" size="sm" silent iconRight="chevronRight" className="cmp-skip" data-off={canSkip ? undefined : ''} tabIndex={canSkip ? undefined : -1} aria-hidden={canSkip ? undefined : 'true'} onClick={onSkip}>{CHROME.skip}</Button>
          </div>
          <div className="cmp-bar__meter">
            <SegmentBar total={total} done={index} current={index} tone={beatId === 'month' ? 'gold' : 'tele'} label={CHROME.progress} />
            <span className="cmp-bank" ref={ctx.dockRef}>
              <Tag tone="tele" icon="bolt">
                <Counter value={bank.value} from={bank.from} duration={900} align="end" /> {CHROME.xp}
              </Tag>
            </span>
          </div>
        </header>

        <p className="cmp-hint" data-on={hintOn && canSkip ? '' : undefined} aria-hidden="true">
          <span className="cmp-hint__touch">{CHROME.tap}</span>
          <span className="cmp-hint__key">{CHROME.key}</span>
        </p>
      </div>
    </StageCtx.Provider>
  )
}
