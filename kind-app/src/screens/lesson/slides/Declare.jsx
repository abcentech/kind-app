// Declare — the lesson's last slide, and the holiest beat. The lines of the declaration stand dim (still fully legible: they
// are what you are about to say out loud) above a hold-to-declare ring. When the ring closes the lines ignite one by one,
// a bell per line, and the tagline closes the block. The footer is a dark, disabled Complete lesson until then, GO-green after.
//
//   props (slide contract): { card:{ label, lines:[string], tagline? }, s, day, seriesId, scale, active, setFooter }
//   The tagline is card.tagline, else the series' own (s.tagline). Declared state is remembered for the sitting, so swiping
//   back to this slide shows it lit and FINISH ready; HoldToDeclare exports clearDeclared(key) for the shell to call after finishDay.
// The plain "I declare it" button replaces the hold for reduced motion, and appears after two early releases for anyone it beats.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Label } from '../../../ui/index.js'
import { sound } from '../../../fx/sound.js'
import { useReducedMotion } from '../../../fx/motion.js'
import { lessonCopy, pick } from '../../../copy.js'
import HoldToDeclare, { markDeclared, wasDeclared } from '../HoldToDeclare.jsx'

const STAGGER = 120            // ms between lines igniting
const FAILS_FOR_PLAIN = 2
// the dial already says HOLD TO DECLARE: the footer names what the hold unlocks, dark until then, GO-green after
const FOOTER = { idle: { label: lessonCopy.cta.finish, disabled: true, tone: undefined }, done: { label: lessonCopy.cta.finish, disabled: false, tone: 'go' } }
const SAY = {
  hold: 'Hold the button until the ring closes.',
  plain: 'Having trouble holding? A button that declares at once is now below.',
  done: 'Declared. Finish is ready.',
  keepHolding: 'Keep holding until the ring closes.',
  plainHint: 'Or use the button below. It counts the same.',
}

export default function Declare({ card, s, day, seriesId, scale, active = true, setFooter }) {
  const lines = useMemo(() => (card?.lines || []).map((t) => String(t).trim()).filter(Boolean), [card])
  const tagline = String(card?.tagline || s?.tagline || '').trim()
  const items = lines.length + (tagline ? 1 : 0)
  const key = `${seriesId || s?.id || 'series'}|${day ?? card?.day ?? 0}`
  const reduced = useReducedMotion()

  const was = useRef(null)
  if (was.current === null) was.current = wasDeclared(key)
  const still = useRef(was.current)                        // lit without the ignition animation (revisit, instant)
  const [declared, setDeclared] = useState(was.current)
  const [lit, setLit] = useState(was.current ? items : 0)
  const [fails, setFails] = useState(0)
  const failCount = useRef(0)
  const [nudge, setNudge] = useState(false)
  const [say, setSay] = useState('')
  const timers = useRef([])
  const nudgeTimer = useRef(0)
  const rootRef = useRef(null)
  const footerFn = useRef(setFooter)
  footerFn.current = setFooter

  const plain = reduced || fails >= FAILS_FOR_PLAIN
  const holdable = !reduced

  // footer: the shell resets it on slide change, so assert it on activation (and once more next tick, in case the
  // shell's reset effect ran after ours in the same commit)
  useEffect(() => {
    if (!active) return undefined
    const apply = () => footerFn.current && footerFn.current(declared ? FOOTER.done : FOOTER.idle)
    apply()
    const t = setTimeout(apply, 0)
    return () => clearTimeout(t)
  }, [active, declared])

  useEffect(() => () => { timers.current.forEach(clearTimeout); clearTimeout(nudgeTimer.current) }, [])

  // the slide's first announcement for a screen reader
  useEffect(() => { if (active && !declared) setSay(reduced ? '' : SAY.hold) }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  const sweep = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    for (let i = 0; i < items; i++) {
      timers.current.push(setTimeout(() => {
        setLit(i + 1)
        sound.play('ring', { step: i % 3 })                // D · F♯ · A, climbing the pentatonic as the lines catch
      }, 60 + i * STAGGER))
    }
  }

  const onDeclare = () => {
    markDeclared(key)
    setDeclared(true)
    setNudge(false)
    setSay(SAY.done)
    if (reduced) { still.current = true; setLit(items); sound.play('ring', { step: 2 }) } else sweep()
    // the hold button goes inert once declared: hand keyboard focus to FINISH so Enter lands the lesson
    timers.current.push(setTimeout(() => {
      const root = rootRef.current, a = document.activeElement
      if (!root || (a && a !== document.body && !root.contains(a))) return
      const go = root.closest('.lesson')?.querySelector('.lesson-go:not([disabled])')
      if (go) { try { go.focus({ preventScroll: true }) } catch { go.focus() } }
    }, (reduced ? 0 : 60 + items * STAGGER) + 40))
  }

  const onAttempt = () => {
    if (declared) return
    failCount.current += 1
    setFails(failCount.current)
    if (failCount.current === FAILS_FOR_PLAIN) setSay(SAY.plain)
    setNudge(true)
    clearTimeout(nudgeTimer.current)
    nudgeTimer.current = setTimeout(() => setNudge(false), 3200)
  }

  const onProgress = (p) => { if (rootRef.current) rootRef.current.style.setProperty('--sld-p', String(+p.toFixed(4))) }

  const hint = nudge ? SAY.keepHolding : plain && holdable ? SAY.plainHint : pick(lessonCopy.declare, key)
  const state = (i) => (i < lit ? (still.current ? 'still' : 'lit') : 'dim')
  const label = card?.label || 'Say it out loud'
  const style = scale ? { '--read-scale': scale } : undefined

  return (
    <section
      ref={rootRef} className="sld" data-n={Math.min(Math.max(lines.length, 1), 7)} data-declared={declared ? '' : undefined}
      style={style} aria-label={label}
    >
      <div className="sld-body">
        <div className="sld-top"><Label tone={declared ? 'ignite' : 'neutral'} dot>{label}</Label></div>
        <div className="sld-lines" role="group" aria-label={label}>
          {lines.map((t, i) => <p key={i} className="sld-line" data-state={state(i)}>{t}</p>)}
          {tagline ? <p className="sld-tag" data-state={state(lines.length)}>{tagline}</p> : null}
        </div>
      </div>
      <div className="sld-dock">
        <HoldToDeclare
          done={declared} holdable={holdable} plain={plain} hint={hint}
          onDeclare={onDeclare} onAttempt={onAttempt} onProgress={onProgress}
        />
      </div>
      <p className="sld-sr" role="status" aria-live="polite">{say}</p>
    </section>
  )
}
