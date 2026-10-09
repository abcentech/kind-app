// lesson-shell · Lesson — the flight sequence. Props { s, day, close }; App renders it inside a .shell-layer.
//
// One lesson is a plan of steps (lesson/steps.js): the reading cards, the check exercises, the declaration last. This
// file owns everything *around* a step and nothing inside one: the header (close · ticker · counter), the glass
// footer (BACK · CONTINUE), the pager that moves between steps (buttons, keys and swipes are one code path), resume,
// the retry queue, the leave-confirmation, and the hand-off to Orbit insertion (finishDay → <Complete />).
//
// The pager. Every step is an absolutely positioned layer; at most two exist at once (the settled one and the one it is
// moving to). A swipe drags both together with the finger (the next slide is really there, peeking in), then settles
// on a spring: forward if you pulled past a third of the width or flicked, back otherwise. Buttons and keys play the
// same slide from rest. Swipes only ever page between *reading* cards — a check is entered by CONTINUE, never by a
// stray flick — and a pull against an edge rubber-bands. html[data-fx=lite]/reduced motion: the finger still drags,
// but steps cross-fade instead of travelling.
//
// Slide contract (docs/V7-WAVE2.md): <SlideX card s day seriesId scale active next back setFooter share />.
// Extra, unlisted: any element inside a slide with `data-noswipe` suppresses paging that starts on it (text areas,
// iframes and inputs already do). `next()` from a slide always advances (the declare slide calls it when the hold
// completes); the CONTINUE button, Enter/Space/→ and swipes respect setFooter({ hidden, disabled }).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useShell } from '../shell.jsx'
import { Button, Dialog, IconButton, Label, SegmentBar, useBackClose } from '../ui/index.js'
import { Starfield } from '../art/index.js'
import { fx } from '../fx/fx.js'
import { sound } from '../fx/sound.js'
import { haptic } from '../fx/haptics.js'
import { usePrefs } from '../prefs.js'
import { aria, flightCallout, lessonCopy } from '../copy.js'
import { finishDay, isDayDone, posFor, scoreAnswer, setPos, snapshot } from '../store.js'
import Slide, { Guard } from './lesson/Slide.jsx'
import ExerciseStep from './lesson/Exercises.jsx'
import { SLIDES } from './lesson/slides/index.js'
import { clearDeclared } from './lesson/HoldToDeclare.jsx'
import { buildSteps, clearTally, freshTally, loadTally, pendingRetries, retryOf, saveTally, savedPos, withRetries } from './lesson/steps.js'
import Complete from './Complete.jsx'
// Styles load with the screen, not with the shell (first-load budget: docs/V7-DESIGN.md §10).
import '../styles/lesson.css'
import '../styles/slides.css'
import '../styles/slides-word.css'
import '../styles/declare.css'
import '../styles/exercises.css'
import '../styles/ex-choice.css'
import '../styles/ex-blank.css'
import '../styles/ex-match.css'
import '../styles/complete.css'
import '../styles/complete-streak.css'
import '../styles/complete-reward.css'
import '../styles/complete-rank.css'

/* ---- small helpers ------------------------------------------------------ */
const pad = (n) => String(n).padStart(2, '0')
const token = (name, fb) => { try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb } catch { return fb } }
const tokenMs = (name, fb) => {
  const m = /^(-?[\d.]+)(ms|s)$/.exec(token(name, ''))
  return m ? parseFloat(m[1]) * (m[2] === 's' ? 1000 : 1) : fb
}
const lite = () => {
  const f = document.documentElement.dataset.fx
  if (f === 'lite') return true
  if (f === 'full') return false
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}
const px = (x) => ({ transform: `translate3d(${x}px,0,0)` })
const NO_SWIPE = 'textarea, input, select, iframe, [contenteditable], [data-noswipe]'
const reset = (el) => {
  if (!el) return
  if (el.getAnimations) el.getAnimations().forEach((a) => a.cancel())
  el.style.transform = ''
  el.style.opacity = ''
}

/** What the lesson looks like when it is first opened (and how far in it resumes): decided once per mount. */
function plan(s, day) {
  const base = buildSteps(s, day)
  const practice = isDayDone(snapshot(), s.id, day)         // a finished day is replayed from the top, for a little XP
  const tally = practice ? null : loadTally(s.id, day)
  let start = 0
  if (!practice) {
    start = Math.min(posFor(snapshot(), s.id, day), Math.max(0, base.length - 1))
    const firstCheck = base.findIndex((t) => t.type === 'ex')
    if (!tally && firstCheck >= 0 && start > firstCheck) start = firstCheck      // the answers were lost with the session: ask them again
  }
  return { base, practice, start, tally: tally || freshTally(), retries: pendingRetries(base, tally) }
}

export default function Lesson({ s, day, close, slides = SLIDES, Exercise = ExerciseStep }) {
  const shell = useShell() || {}
  const [prefs] = usePrefs()
  const scale = Math.min(1.3, Math.max(0.9, Number(prefs.textScale) || 1))
  const [init] = useState(() => plan(s, day))
  const { base, practice } = init
  const completable = base.length > 0 && base[base.length - 1].kind === 'declare'

  const [retries, setRetries] = useState(init.retries)
  const steps = useMemo(() => withRetries(base, retries), [base, retries])
  const n = steps.length

  const [cur, setCur] = useState(init.start)              // the settled step
  const [tr, setTr] = useState(null)                      // { to, dir, mode:'drag'|'anim'|'cancel', dx, fade, id }
  const [feet, setFeet] = useState({})                    // per-step footer overrides from setFooter
  const [asking, setAsking] = useState(false)             // the leave dialog
  const [said, setSaid] = useState('')                    // aria-live announcement of the new step
  const [phase, setPhase] = useState('play')              // 'play' | 'out' (fading to orbit) | 'done'
  const [result, setResult] = useState(null)

  const act = tr && tr.mode === 'anim' ? tr.to : cur      // the step the learner is "on" (ticker, counter, footer follow it)

  /* refs: the latest of everything, for handlers that outlive a render */
  const stageRef = useRef(null)
  const footRef = useRef(null)
  const rootRef = useRef(null)
  const layers = useRef(new Map())
  const gesture = useRef(null)
  const lock = useRef(false)
  const idc = useRef(0)
  const entered = useRef(false)
  const finished = useRef(false)
  const tally = useRef(init.tally)
  const timers = useRef([])
  const R = useRef({})
  R.current = { cur, tr, steps, feet, asking, act, base, completable, practice, close, s, day }

  const layerEl = (i) => layers.current.get(i)
  const canGo = (i, dir) => {                              // may a swipe/BACK move from step i by dir? (reading cards only)
    const { steps: st, feet: ft } = R.current
    const here = st[i], to = st[i + dir]
    if (!here || here.type !== 'card' || !to || to.type !== 'card') return false
    if (dir > 0) { const f = ft[i]; if (f && (f.hidden || f.disabled)) return false }
    return true
  }

  /* ---- entry: ignition ------------------------------------------------- */
  useEffect(() => {
    if (entered.current) return undefined
    entered.current = true
    try { fx.flash('ignite', 420, { peak: init.start ? 0.22 : 0.38 }) } catch { /* effects are decoration */ }
    sound.play('launch')
    return undefined
  }, [init.start])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // the footer's measured height clears the slides' bottom padding (a fallback lives in lesson.css)
  useLayoutEffect(() => {
    const f = footRef.current, root = rootRef.current
    if (!f || !root || typeof ResizeObserver !== 'function') return undefined
    const put = () => root.style.setProperty('--lesson-foot-h', f.offsetHeight + 'px')
    put()
    const ro = new ResizeObserver(put)
    ro.observe(f)
    return () => ro.disconnect()
  }, [])

  /* ---- leaving, finishing ---------------------------------------------- */
  const leave = useCallback(() => {
    const { practice: p, base: b, cur: c, s: ss, day: d, close: cl } = R.current
    if (!p) setPos(ss.id, d, savedPos(c, b))
    cl()
  }, [])
  const requestClose = useCallback(() => {
    if (lock.current || finished.current || R.current.asking) return
    const progressed = R.current.cur > 0 || tally.current.seen.length > 0
    if (progressed) setAsking(true); else leave()
  }, [leave])

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    const { s: ss, day: d, close: cl } = R.current
    const t = tally.current
    let r = null
    try { r = finishDay(ss.id, d, t.xp, { right: t.right, asked: t.seen.length }) } catch (err) { console.error('[kind] finishDay failed', err) }
    clearTally(ss.id, d)
    try { clearDeclared(`${ss.id}|${d}`) } catch { /* a replay simply starts lit */ }
    if (!r) { cl(); return }
    haptic.success()
    setPhase('out')
    timers.current.push(setTimeout(() => { setResult(r); setPhase('done') }, tokenMs('--t-base', 240)))
  }, [])

  // Back = the same question as the close button (App also listens, one layer down: leaving without progress closes both)
  useBackClose(true, () => {
    const r = R.current
    if (finished.current || (r.cur === 0 && tally.current.seen.length === 0)) { r.close(); return undefined }
    if (!r.asking) setAsking(true)
    return false
  })

  /* ---- the pager ------------------------------------------------------- */
  const finalize = useCallback((t) => {
    flushSync(() => { if (t.mode === 'anim') setCur(t.to); setTr(null) })
    lock.current = false
  }, [])

  // starts the settle animation whenever a transition is requested
  useLayoutEffect(() => {
    if (!tr || tr.mode === 'drag') return undefined
    const a = layerEl(cur), b = layerEl(tr.to)
    if (!a || !b || typeof a.animate !== 'function') { Promise.resolve().then(() => finalize(tr)); return undefined }
    const W = stageRef.current ? stageRef.current.clientWidth : 360
    const back = tr.mode === 'cancel'
    let ms = tr.fade ? tokenMs('--t-fast', 140) : back ? tokenMs('--spring-snap-ms', 550) : tokenMs('--t-slow', 420)
    if (!tr.fade && !back && tr.v > 0.3) ms = Math.round(Math.max(200, Math.min(ms, (W - Math.abs(tr.dx || 0)) / tr.v)))
    const ease = tr.fade ? 'linear' : back ? token('--spring-snap', 'ease-out') : token('--ease-sheet', 'ease-out')
    const run = (el, kf) => {
      try { return el.animate(kf, { duration: ms, easing: ease, fill: 'forwards' }) } catch { return el.animate(kf, { duration: ms, easing: 'ease-out', fill: 'forwards' }) }
    }
    const dx = tr.dx || 0, dir = tr.dir
    let anims
    if (tr.fade) anims = [run(a, [{ opacity: 1 }, { opacity: 0 }]), run(b, [{ opacity: 0 }, { opacity: 1 }])]
    else if (back) anims = [run(a, [px(dx), px(0)]), run(b, [px(dx + dir * W), px(dir * W)])]
    else anims = [run(a, [px(dx), px(-dir * W)]), run(b, [px(dx + dir * W), px(0)])]
    let dead = false
    Promise.all(anims.map((x) => x.finished)).then(() => { if (!dead) finalize(tr) }, () => { /* cancelled: the lesson went away */ })
    return () => { dead = true; anims.forEach((x) => { try { x.cancel() } catch { /* already gone */ } }) }
  }, [tr]) // eslint-disable-line react-hooks/exhaustive-deps
  // once nothing is moving, whatever the drag left on the settled layer is wiped
  useLayoutEffect(() => { if (!tr) reset(layerEl(cur)) }, [tr, cur])

  const applyDrag = useCallback((eff) => {
    const { cur: c, tr: t } = R.current
    const a = layerEl(c)
    if (a) a.style.transform = `translate3d(${eff}px,0,0)`
    if (t && t.mode === 'drag') {
      const b = layerEl(t.to)
      if (b) b.style.transform = `translate3d(${eff + t.dir * (stageRef.current ? stageRef.current.clientWidth : 360)}px,0,0)`
    }
  }, [])
  useLayoutEffect(() => { if (tr && tr.mode === 'drag') applyDrag(gesture.current ? gesture.current.dx : 0) }, [tr, applyDrag])

  const navigate = useCallback((to, dir, o = {}) => {
    const { cur: c, steps: st, base: b, practice: p, s: ss, day: d } = R.current
    if (lock.current || !st[to]) return
    lock.current = true
    sound.play(dir > 0 ? 'next' : 'tap')
    haptic.tap()
    if (!p && to > c) setPos(ss.id, d, savedPos(to, b))
    setSaid(aria.step(to + 1, st.length))
    setTr({ to, dir, mode: o.cancel ? 'cancel' : 'anim', dx: o.dx || 0, v: o.v || 0, fade: !o.cancel && lite(), id: ++idc.current })
  }, [])

  const advance = useCallback((o = {}) => {
    const { cur: c, steps: st, feet: ft, completable: ok, close: cl } = R.current
    if (lock.current || finished.current || gesture.current?.state === 'drag') return
    const step = st[c]
    if (!step) return
    if (o.user && step.type === 'card') { const f = ft[c]; if (f && (f.hidden || f.disabled)) return }
    if (c >= st.length - 1) { if (ok) finish(); else cl(); return }
    navigate(c + 1, 1)
  }, [navigate, finish])
  const goBack = useCallback(() => {
    const c = R.current.cur
    if (lock.current || !canGo(c, -1)) return
    navigate(c - 1, -1)
  }, [navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- swipes ---------------------------------------------------------- */
  const onPointerDown = (e) => {
    if (e.button > 0 || e.isPrimary === false || lock.current || R.current.asking) return
    if (R.current.steps[R.current.cur]?.type !== 'card') return                     // checks are never paged by a swipe
    if (e.target.closest && e.target.closest(NO_SWIPE)) return
    gesture.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lastX: e.clientX, lastT: e.timeStamp, v: 0, dx: 0, state: 'maybe', dir: 0, ok: false }
  }
  const onPointerMove = (e) => {
    const d = gesture.current
    if (!d || e.pointerId !== d.id) return
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0
    if (d.state === 'maybe') {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { gesture.current = null; return }     // it is a scroll
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.3) return
      d.state = 'drag'
      d.dir = dx < 0 ? 1 : -1
      d.ok = canGo(R.current.cur, d.dir)
      try { stageRef.current.setPointerCapture(e.pointerId) } catch { /* the pointer is already gone */ }
      stageRef.current.setAttribute('data-drag', '')
      if (d.ok && !lite()) setTr({ to: R.current.cur + d.dir, dir: d.dir, mode: 'drag', dx: 0, id: ++idc.current })
    }
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.v = 0.8 * ((e.clientX - d.lastX) / dt) + 0.2 * d.v
    d.lastX = e.clientX; d.lastT = e.timeStamp
    let eff = dx
    if (d.ok) { if (-d.dir * dx < 0) eff = 0 }                                                   // pulled back past the start: hold
    else eff = Math.sign(dx) * Math.min(Math.abs(dx) * 0.3, 56)                                  // an edge: rubber-band
    d.dx = eff
    applyDrag(eff)
  }
  const endDrag = (e, cancelled) => {
    const d = gesture.current
    if (!d || e.pointerId !== d.id) return
    gesture.current = null
    if (d.state !== 'drag') return
    const stage = stageRef.current
    stage.removeAttribute('data-drag')
    try { stage.releasePointerCapture(e.pointerId) } catch { /* released already */ }
    const W = stage.clientWidth || 360
    const a = layerEl(R.current.cur)
    const settledBack = () => {                                      // nothing was paged: spring the slide home
      if (!a || !d.dx) { reset(a); return }
      if (lite() || typeof a.animate !== 'function') { reset(a); return }
      let an
      try { an = a.animate([px(d.dx), px(0)], { duration: tokenMs('--spring-snap-ms', 550), easing: token('--spring-snap', 'ease-out'), fill: 'forwards' }) } catch { reset(a); return }
      an.finished.then(() => reset(a), () => {})
    }
    if (!d.ok) { settledBack(); return }
    const commit = !cancelled && -d.dir * d.dx > 0 && (Math.abs(d.dx) > W * 0.3 || -d.dir * d.v > 0.45)       // forward is leftward: dx and dir have opposite signs
    if (lite()) { reset(a); if (commit) navigate(R.current.cur + d.dir, d.dir); return }
    if (commit) navigate(R.current.cur + d.dir, d.dir, { dx: d.dx, v: -d.dir * d.v })           // v: px/ms along the swipe, so a flick settles faster
    else { lock.current = true; setTr({ to: R.current.cur + d.dir, dir: d.dir, mode: 'cancel', dx: d.dx, id: ++idc.current }) }
  }

  /* ---- keyboard: Enter/Space/→ continue · ← back · Esc leave ------------ */
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const r = R.current
      if (r.asking || finished.current) return
      if (e.key === 'Escape') { e.preventDefault(); requestClose(); return }
      const step = r.steps[r.cur]
      if (!step || step.type !== 'card' || gesture.current?.state === 'drag') return          // checks own their keys
      const t = e.target
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      const onControl = t && t.closest && t.closest('button, a[href], [role="button"], summary')
      if (e.key === 'Enter' || e.key === ' ') {
        if (onControl) return                                        // the control's own click does the work
        e.preventDefault()
        if (!e.repeat) advance({ user: true })
      } else if (e.key === 'ArrowRight') { e.preventDefault(); if (!e.repeat) advance({ user: true }) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (!e.repeat) goBack() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, goBack, requestClose])

  /* ---- slide plumbing -------------------------------------------------- */
  const setters = useRef({})
  const footerFor = (i) => setters.current[i] || (setters.current[i] = (f) => setFeet((m) => {
    if (f == null) return m[i] === undefined ? m : { ...m, [i]: undefined }
    const next = { ...(m[i] || {}), ...f }
    const same = m[i] && Object.keys(next).length === Object.keys(m[i]).length && Object.keys(next).every((k) => next[k] === m[i][k])
    return same ? m : { ...m, [i]: next }
  }))

  const onGraded = useCallback((step, g) => {
    const { s: ss, day: d, practice: p } = R.current
    const t = tally.current
    const id = String(step.ex.id)
    const right = Boolean(g && g.right)
    const gain = scoreAnswer(right, { seriesId: ss.id, day: d, id: step.ex.id, retry: step.retry }) || 0
    t.xp += gain
    if (step.retry) { if (!t.retried.includes(id)) t.retried.push(id) }
    else if (!t.seen.includes(id)) {
      t.seen.push(id)
      if (right) t.right += 1
      else { t.missed.push(id); setRetries((r) => (r.some((x) => String(x.ex.id) === id) ? r : [...r, retryOf(step)])) }   // once, at the end of the queue
    }
    if (!p) saveTally(ss.id, d, t)
    return gain                                         // the verdict pops what the store actually paid (2 on a replay)
  }, [])

  /* ---- render ---------------------------------------------------------- */
  if (result) return <div className="lesson-complete"><Complete s={s} day={day} result={result} onClose={close} /></div>

  const step = steps[act] || steps[0]
  const f = feet[act] || {}
  const kind = step && step.type === 'card' ? step.kind : null
  const footHidden = !kind || f.hidden || phase !== 'play'
  const canBack = !!kind && canGo(act, -1)
  const lastStep = act >= n - 1
  const label = f.label || (kind === 'open' ? lessonCopy.cta.start : lastStep ? (completable ? lessonCopy.cta.finish : lessonCopy.cta.gotIt) : lessonCopy.cta.next)
  const variant = f.tone === 'go' ? 'go' : f.tone === 'secondary' ? 'secondary' : 'primary'
  const moving = Boolean(tr)
  const checkIdx = steps.reduce((a, st, i) => (st.type === 'ex' && !st.retry ? [...a, i] : a), [])

  const renderLayer = (i) => {
    const st = steps[i]
    if (!st) return null
    const isTo = tr && tr.to === i && i !== cur
    const active = i === cur || (isTo && tr.mode === 'anim')
    const style = isTo ? (tr.fade ? { opacity: 0 } : { transform: `translate3d(${tr.dir * 100}%,0,0)` }) : undefined
    let body
    if (st.type === 'card') {
      const View = slides[st.kind]
      body = (
        <Slide card={st.card} scale={scale}>
          {View ? (
            <View
              card={st.card} s={s} day={day} seriesId={s.id} scale={scale} active={active} review={practice}
              next={() => { if (R.current.act === i) advance() }}
              back={goBack}
              setFooter={footerFor(i)}
              share={shell.share}
            />
          ) : null}
        </Slide>
      )
    } else {
      body = (
        <div className="lesson-ex">
          <Guard fallback={<ExFallback ex={st.ex} onContinue={() => advance()} />}>
            <Exercise
              key={st.ex.id} ex={st.ex} isRetry={st.retry} seriesId={s.id} day={day}
              index={st.retry ? undefined : checkIdx.indexOf(i)} total={checkIdx.length}
              onGraded={(g) => onGraded(st, g)} onNext={() => advance()}
            />
          </Guard>
        </div>
      )
    }
    return (
      <div
        key={'s' + i}
        ref={(el) => { if (el) layers.current.set(i, el); else layers.current.delete(i) }}
        className="lesson-layer"
        data-type={st.type}
        data-moving={moving ? '' : undefined}
        aria-hidden={i !== act ? 'true' : undefined}
        inert={i !== act ? '' : undefined}
        style={style}
      >
        {body}
      </div>
    )
  }
  const shown = tr && tr.to !== cur ? [cur, tr.to].sort((a, b) => a - b) : [cur]

  return (
    <div ref={rootRef} className="lesson" data-phase={phase} data-foot={footHidden ? 'off' : 'on'} style={{ '--read-scale': scale }}>
      <Starfield className="lesson-sky" density={0.55} seed={day} />

      <header className="lesson-head">
        <IconButton icon="close" label={lessonCopy.close.aria} onClick={requestClose} className="lesson-close" />
        <div className="lesson-gauge">
          <SegmentBar total={n} done={phase === 'play' ? act : n} current={act} />
          <div className="lesson-readout">
            <Flight progress={n > 1 ? act / (n - 1) : 0} running={phase === 'play'} />
            <span className="lesson-count" aria-hidden="true"><b>{pad(Math.min(act + 1, n))}</b>/{pad(n)}</span>
          </div>
        </div>
      </header>
      {practice && <div className="lesson-practice"><Label mono dot>{lessonCopy.practiceTag || 'Practice'}</Label></div>}

      <div
        ref={stageRef}
        className="lesson-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e, false)}
        onPointerCancel={(e) => endDrag(e, true)}
      >
        {shown.map(renderLayer)}
      </div>

      <div ref={footRef} className="lesson-foot" data-glass data-off={footHidden ? '' : undefined} inert={footHidden ? '' : undefined}>
        {canBack && <IconButton icon="chevronLeft" label="Back" size="lg" variant="plate" silent onClick={goBack} className="lesson-back" />}
        <Button
          className="lesson-go" variant={variant} size="lg" silent pulse={kind === 'open' && act === 0}
          disabled={Boolean(f.disabled)} iconRight={lastStep ? undefined : 'arrowRight'}
          onClick={() => advance({ user: true })}
        >
          {label}
        </Button>
      </div>

      <p className="u-sr" role="status" aria-live="polite">{said}</p>
      <Dialog
        open={asking}
        eyebrow={`${pad(Math.min(act + 1, n))} / ${pad(n)}`}
        title={lessonCopy.close.title}
        body={lessonCopy.close.body}
        confirmLabel={lessonCopy.close.confirm}
        cancelLabel={lessonCopy.close.cancel}
        onConfirm={() => { setAsking(false); leave() }}
        onCancel={() => setAsking(false)}
      />
    </div>
  )
}

/** The mission clock and call-out: telemetry is the ornament. Elapsed time counts only while the lesson is on screen. */
function Flight({ progress, running }) {
  const [ms, setMs] = useState(0)
  useEffect(() => {
    if (!running) return undefined
    let last = performance.now()
    const id = setInterval(() => { const now = performance.now(); if (!document.hidden) setMs((m) => m + (now - last)); last = now }, 1000)
    return () => clearInterval(id)
  }, [running])
  const sec = Math.floor(ms / 1000)
  const word = flightCallout(progress)
  return (
    <span className="lesson-tele" aria-hidden="true">
      T+{pad(Math.floor(sec / 60))}:{pad(sec % 60)}<i>·</i><em key={word}>{word}</em>
    </span>
  )
}

/** If a check ever throws, the learner is never stranded behind a hidden footer. */
function ExFallback({ ex, onContinue }) {
  return (
    <div className="lesson-ex__fallback">
      <Label mono>{lessonCopy.phases.check}</Label>
      <p>{ex && ex.prompt}</p>
      <Button variant="primary" onClick={onContinue}>{lessonCopy.cta.next}</Button>
    </div>
  )
}
