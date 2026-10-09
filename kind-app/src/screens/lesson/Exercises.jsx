// ex-step · the Go / No-Go step shell. One exercise, full height, owning its footer:
//   eyebrow + prompt + the renderer View  ->  CHECK  ->  grade  ->  verdict sheet  ->  CONTINUE.
//
//   <ExerciseStep ex isRetry onGraded({ right, response, answerText, retry }) onNext() />
//   optional context from the lesson shell:  index (0-based) · total · seriesId · day
//     (without them the eyebrow loses its "2 / 4" and the series/day are read off ex.id, which is "<series>:<day>:…")
//
// Contract with the shell
//   · onGraded fires exactly once, at CHECK (payload also carries `combo`, the run of rights). If it returns a number that is the XP the verdict pops (scoreAnswer's real
//     answer: 10, 5 on a retry, 2 on a replayed day, 0 for a duplicate); otherwise the delta is 10, halved on a retry.
//   · onNext fires exactly once, at CONTINUE. It is ignored for 380 ms after the verdict lands, so a double-tap on CHECK
//     cannot skip the verdict. The step keys itself on (ex.id, isRetry): a new exercise is a clean step.
//   · Enter = CHECK, then Enter = CONTINUE. 1-4 / Backspace belong to the Views.
//
// The Views (ex/*.jsx) draw only the answering surface; this file owns everything around it.
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, Kbd, Label, Tag } from '../../ui/index.js'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'
import { fx } from '../../fx/fx.js'
import { useFxLevel } from '../../fx/motion.js'
import { emptyResponse, gradeExercise, isAnswerComplete, XP_PER_EXERCISE } from '../../quiz.js'
import { answerLabel, lessonCopy, seq, verdictRight, verdictWrong, xpDelta } from '../../copy.js'
import { getSeries } from '../../lib.js'
import { VIEWS } from './ex/index.js'
import Verdict from './ex/Verdict.jsx'

const ARM_MS = 380                          // the sheet takes ~420 ms to arrive; a tap before it is a double-tap on CHECK
const COMBO_AT = [3, 5, 8, 12, 20]          // mirrors copy.js: the rights-in-a-row that earn a combo line (and the combo chime)
const SECOND_CHANCE = lessonCopy.secondChance || 'Second chance'

/* A run of rights, kept at module level because the step remounts for every question. It belongs to one lesson
   (seriesId:day) and dies on a wrong, on a different lesson, or when question 1 of a lesson is graded again. */
let run = { key: '', n: 0 }
export const resetCombo = () => { run = { key: '', n: 0 } }
function bump(key, right, fresh) {
  if (fresh || run.key !== key) run = { key, n: 0 }
  run.n = right ? run.n + 1 : 0
  return run.n
}

/** Where the answer lives on screen, so the sparks land on it. The Views mark painted plates with data-state. */
function plateIn(view) {
  if (!view) return null
  return view.querySelector('[data-state="right"]')
    || view.querySelector('[data-state="selected"], [aria-checked="true"], [aria-pressed="true"]')
    || view
}

function Step({ ex, isRetry = false, index, total, seriesId: sid, day: dayProp, onGraded, onNext }) {
  const uid = useId()
  const promptId = `${uid}-prompt`
  const hintId = `${uid}-hint`
  const View = VIEWS[ex.type]
  const lite = useFxLevel() === 'lite'

  const [value, setValue] = useState(() => emptyResponse(ex))
  const [graded, setGraded] = useState(null)
  const [leaving, setLeaving] = useState(false)

  const rootRef = useRef(null)
  const bodyRef = useRef(null)
  const viewRef = useRef(null)
  const footRef = useRef(null)
  const sheetRef = useRef(null)
  const ctaRef = useRef(null)

  // The latest props and answer, for handlers that must stay stable (the Enter listener, the Views' callbacks).
  const valueRef = useRef(value)
  const gradedRef = useRef(null)
  const armedAt = useRef(0)
  const fired = useRef(false)
  const advanced = useRef(false)
  const live = useRef({})
  live.current = { ex, isRetry, index, onGraded, onNext }

  const parts = String(ex.id).split(':')
  const seriesId = sid || (parts.length >= 3 ? parts[0] : undefined)
  const day = dayProp ?? (parts.length >= 3 ? parts[1] : '')
  const lessonKey = `${seriesId || ''}:${day}`
  const series = useMemo(() => getSeries(seriesId), [seriesId])

  const change = useCallback((next) => {
    if (fired.current) return
    const v = typeof next === 'function' ? next(valueRef.current) : next
    valueRef.current = v
    setValue(v)
  }, [])

  const check = useCallback(() => {
    const { ex: e, isRetry: retry, index: i, onGraded: cb } = live.current
    if (fired.current) return
    const response = valueRef.current
    if (!isAnswerComplete(e, response)) return
    fired.current = true

    const g = gradeExercise(e, response)
    const n = bump(lessonKey, g.right, i === 0 && !retry)
    const seed = seq(lessonKey, (i || 0) + (retry ? 17 : 0))
    const verdict = g.right
      ? verdictRight(e, series, seed, { combo: n, recycled: retry })
      : verdictWrong(e, seed, { recycled: retry })

    let xp = g.right ? (retry ? Math.floor((e.xp ?? XP_PER_EXERCISE) / 2) : (e.xp ?? XP_PER_EXERCISE)) : 0
    let real
    try { real = cb && cb({ right: g.right, response, answerText: g.answerText, retry: !!retry, combo: n }) } catch (err) { console.error(err) }
    if (g.right && typeof real === 'number') xp = real

    const result = { ...g, verdict, xp, combo: n }
    gradedRef.current = result
    armedAt.current = performance.now() + ARM_MS
    setGraded(result)

    if (g.right) {
      sound.play('correct'); haptic.success()
      if (COMBO_AT.includes(n)) sound.play('combo', { delay: 160 })
    } else {
      sound.play('wrong'); haptic.warning()
    }
  }, [lessonKey, series])

  const next = useCallback(() => {
    if (!gradedRef.current || advanced.current) return
    if (performance.now() < armedAt.current) return
    advanced.current = true
    sound.play('next'); haptic.cue('next')
    setLeaving(true)
    const { onNext: cb } = live.current
    if (cb) cb()
  }, [])

  // No renderer for this type (should not happen): let the learner move on rather than strand them.
  const skip = useCallback(() => {
    if (advanced.current) return
    advanced.current = true
    const { onNext: cb } = live.current
    if (cb) cb()
  }, [])

  // Enter = CHECK, then CONTINUE. It also stops the focused plate or button from re-firing its own click.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter' || e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      if (e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) return
      if (gradedRef.current) { e.preventDefault(); next() }
      else if (isAnswerComplete(live.current.ex, valueRef.current)) { e.preventDefault(); check() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [check, next])

  // The sheet covers the footer and the bottom of the answers: tell the body how much, so it can scroll clear of it.
  useLayoutEffect(() => {
    const root = rootRef.current
    const sheet = sheetRef.current
    const foot = footRef.current
    if (!root) return undefined
    if (!graded || !sheet) { root.style.removeProperty('--ex-sheet-h'); return undefined }
    const apply = () => {
      root.style.setProperty('--ex-sheet-h', `${sheet.offsetHeight}px`)
      root.style.setProperty('--ex-foot-h', `${foot ? foot.offsetHeight : 0}px`)
    }
    apply()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(apply)
    ro.observe(sheet); if (foot) ro.observe(foot)
    return () => ro.disconnect()
  }, [graded])

  // The moment itself: focus to CONTINUE, the effect on the plate, and the answered plate scrolled out from under the sheet.
  useEffect(() => {
    if (!graded) return undefined
    const view = viewRef.current
    const plate = plateIn(view)
    if (ctaRef.current) ctaRef.current.focus({ preventScroll: true })
    if (graded.right) fx.go(plate)
    else if (view) fx.shake(view, { amp: 7, ms: 340 })
    const id = requestAnimationFrame(() => {
      const body = bodyRef.current, sheet = sheetRef.current, root = rootRef.current
      const target = plateIn(viewRef.current)
      if (!body || !sheet || !root || !target || target === viewRef.current) return
      const over = target.getBoundingClientRect().bottom - (root.getBoundingClientRect().bottom - sheet.offsetHeight - 12)
      if (over > 0) body.scrollBy({ top: over, behavior: lite ? 'auto' : 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [graded, lite])

  const ready = isAnswerComplete(ex, value)
  const word = ex.source === 'scripture' || ex.source === 'declaration' || ex.type === 'order'
  const eyebrow = lessonCopy.phases.check + (index != null ? ` ${index + 1}${total ? ` / ${total}` : ''}` : '')
  const hasNumKeys = ex.type === 'choice' || ex.type === 'blank'
  const stop = (t) => (/[.!?…”"’)]$/.test(t) ? t : `${t}.`)
  const announce = graded
    ? [graded.verdict.aria, graded.right ? '' : stop(`${answerLabel(ex)}: ${graded.answerText}`), graded.explain && stop(graded.explain), graded.right && graded.xp ? xpDelta(graded.xp) : '']
        .filter(Boolean).join(' ')
    : ''

  return (
    <section
      ref={rootRef}
      className="ex-step"
      aria-labelledby={promptId}
      data-ex-type={ex.type}
      data-graded={graded ? (graded.right ? 'go' : 'nogo') : undefined}
    >
      <div ref={bodyRef} className="ex-body">
        <div className="ex-eyebrow">
          <Label mono tone="tele" dot>{eyebrow}</Label>
          {isRetry && <Tag tone="ignite">{SECOND_CHANCE}</Tag>}
        </div>

        <h2 id={promptId} className="ex-prompt" data-word={word ? '' : undefined}>{ex.prompt}</h2>

        {ex.type === 'choice' && ex.quote && (
          <figure className="ex-ctx"><blockquote>{ex.quote}</blockquote></figure>
        )}

        <div ref={viewRef} className="ex-view" role="group" aria-labelledby={promptId} aria-describedby={hintId}>
          {View ? (
            <View ex={ex} value={value} onChange={change} locked={!!graded} graded={graded} onSubmit={check} />
          ) : (
            <p className="ex-missing" role="alert">This check can’t be shown. Continue to the next one.</p>
          )}
        </div>
      </div>

      <footer ref={footRef} className="ex-foot">
        <span id={hintId} className="u-sr">{ready ? lessonCopy.keys : lessonCopy.checkHint[ex.type]}</span>
        {View ? (
          <Button variant="primary" size="lg" full silent pulse={ready} disabled={!ready || !!graded} aria-describedby={hintId}
            onClick={check}>
            {lessonCopy.cta.check}
          </Button>
        ) : (
          <Button variant="secondary" size="lg" full iconRight="arrowRight" onClick={skip}>
            {lessonCopy.cta.next}
          </Button>
        )}
        <div className="ex-keys" aria-hidden="true">
          {hasNumKeys && <span><Kbd>1</Kbd>–<Kbd>4</Kbd> choose</span>}
          <span><Kbd>↵</Kbd> {graded ? lessonCopy.cta.next : lessonCopy.cta.check}</span>
        </div>
      </footer>

      {graded && (
        <Verdict
          right={graded.right}
          verdict={graded.verdict}
          ex={ex}
          answerText={graded.answerText}
          explain={graded.explain}
          xp={graded.xp}
          leaving={leaving}
          onContinue={next}
          ctaRef={ctaRef}
          rootRef={sheetRef}
        />
      )}

      <div className="u-sr" aria-live="assertive" aria-atomic="true">{announce}</div>
    </section>
  )
}

export function ExerciseStep(props) {
  const { ex, isRetry } = props
  if (!ex) return null
  return <Step key={`${ex.id}|${isRetry ? 'r' : 'f'}`} {...props} />
}

export default ExerciseStep
