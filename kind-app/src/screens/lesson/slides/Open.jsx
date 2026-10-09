// slides-read · OPEN — the title card. A giant outlined day numeral on a 31-tick month ruler, the lesson's name in serif, the
// scripture chip and '~6 min', and a one-second ignition countdown (T-3 · T-2 · T-1 · GO) that lights the numeral's outline step by
// step and flares it at GO, then hands over to BEGIN. Tap anywhere skips it. It never plays in Lite / reduced motion, when the day is
// already done (a review), or twice in one session for the same day (swiping back to the title must not replay it).
import { useCallback, useEffect, useRef, useState } from 'react'
import { Label, Tag } from '../../../ui/index.js'
import { Icon } from '../../../icons.jsx'
import { aria, launchSequence, lessonCopy, minsLabel } from '../../../copy.js'
import { estimateMinutes } from '../../../lib.js'
import { isDayDone, useStore } from '../../../store.js'
import { useFxLevel, useReducedMotion } from '../../../fx/motion.js'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { fx } from '../../../fx/fx.js'
import { Sky, rootProps, typo } from './Read.jsx'

const SEEN = new Set()      // `${series}:${day}` whose countdown has started this session
const T0 = 380              // ms: let the slide arrive before the first pip
const BEAT = 280            // ms between pips: T-3, T-2, T-1, GO inside ~1 s
const HOLD = 520            // ms the GO state is held before BEGIN is revealed
const PIPS = ['T-3', 'T-2', 'T-1', 'GO']

// 'Day 12 · Stage 2 · Faithfulness' -> the word 'Day' and 'Stage 2 · Faithfulness'; 'Day 12' alone has no sub-line.
function splitEyebrow(eyebrow) {
  const m = /^\s*(\S+)\s+\d+\s*(?:·\s*(.+))?$/.exec(eyebrow || '')
  return m ? { word: m[1], sub: m[2] || '' } : { word: 'Day', sub: eyebrow || '' }
}

export default function Open({ card, s, day, seriesId, scale, active, setFooter, review }) {
  const st = useStore()
  const level = useFxLevel()
  const reduced = useReducedMotion()
  const n = card.day ?? day
  const sid = seriesId || s?.id
  const key = `${sid}:${n}`
  const lite = level === 'lite' || reduced
  const reviewing = review ?? isDayDone(st, sid, n)
  const seen = useRef(SEEN.has(key)).current      // read once: starting the countdown marks it seen, which must not abort it
  const skip = lite || reviewing || seen

  const [step, setStep] = useState(skip ? 4 : -1)     // -1 waiting · 0..2 T-3..T-1 · 3 GO · 4 ready (BEGIN shown)
  const [ran, setRan] = useState(false)               // the countdown actually played (drives the GO flare)
  const timers = useRef([])
  const numRef = useRef(null)
  const footer = useRef(setFooter)
  footer.current = setFooter
  const on = active !== false

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const ready = useCallback(() => {
    clear()
    setStep(4)
    footer.current?.({ label: lessonCopy.cta.start, hidden: false })
  }, [])

  useEffect(() => {
    if (!on) return undefined
    if (skip) { setStep(4); footer.current?.({ label: lessonCopy.cta.start, hidden: false }); return undefined }
    SEEN.add(key)
    setRan(true)
    setStep(-1)
    footer.current?.({ hidden: true })
    const at = (ms, fn) => timers.current.push(setTimeout(fn, ms))
    PIPS.slice(0, 3).forEach((_, i) => at(T0 + BEAT * i, () => {
      setStep(i); sound.play('countdown'); haptic.cue('countdown')
    }))
    at(T0 + BEAT * 3, () => {
      setStep(3); sound.play('go'); haptic.cue('go')
      if (numRef.current) fx.shockwave({ ...fx.at(numRef.current), color: 'ignite', size: 320, ms: 760, width: 1.5 })
    })
    at(T0 + BEAT * 3 + HOLD, ready)
    return clear
  }, [on, skip, key, ready])

  const { word, sub } = splitEyebrow(card.eyebrow)
  const eyebrow = sub || s?.title || ''
  const total = s?.calendar?.length || 31
  const mins = s ? estimateMinutes(s, n) : 0
  const counting = step < 4

  return (
    <article
      className="slr slr-open"
      data-step={step}
      data-go={ran && step >= 3 ? '' : undefined}
      aria-labelledby={`slr-open-${key.replace(/\W/g, '')}`}
      onClick={counting ? ready : undefined}
      {...rootProps('open', { scale, active })}
    >
      <Sky seed={n * 11 + 5} density={0.85} />

      {eyebrow ? (
        <div className="slr-open__eyebrow slr-in" style={{ '--i': 0 }}>
          <Label mono tone="ink-2">{eyebrow}</Label>
        </div>
      ) : null}

      <div className="slr-open__day slr-in" style={{ '--i': 1 }} aria-hidden="true">
        <i className="slr-open__bloom" />
        <Label mono tone="tele" className="slr-open__word">{word}</Label>
        <span className="slr-open__num" ref={numRef}>
          {n}
          <span className="slr-open__heat">{n}</span>
        </span>
      </div>

      <div className="slr-open__ruler slr-in" style={{ '--i': 2 }} aria-hidden="true">
        <div className="slr-open__ticks">
          {Array.from({ length: total }, (_, i) => (
            <i key={i} data-k={i + 1 === n ? 'now' : i + 1 < n ? 'past' : 'next'} data-m={(i + 1) % 5 === 0 ? '' : undefined} style={{ '--i': i }} />
          ))}
        </div>
        <div className="slr-open__ends"><span>01</span><span>{total}</span></div>
      </div>

      <h1 className="slr-open__title slr-in" id={`slr-open-${key.replace(/\W/g, '')}`} style={{ '--i': 3 }}>
        <span className="slr-sr">{card.eyebrow}. </span>
        {typo(card.title)}
      </h1>

      <div className="slr-open__meta slr-in" style={{ '--i': 4 }}>
        {card.tag ? <Tag icon={card.icon || 'book'}>{card.tag}</Tag> : null}
        {mins ? (
          <span className="slr-open__mins"><Icon name="clock" size={16} />{minsLabel(mins)}</span>
        ) : null}
      </div>

      <div className="slr-open__count slr-in" style={{ '--i': 5 }}>
        {counting ? (
          <button type="button" className="slr-open__skip" onClick={ready} aria-label={aria.skip}>
            <ol className="slr-open__pips" aria-hidden="true">
              {PIPS.map((p, i) => (
                <li key={p} data-lit={step === i ? 'now' : step > i ? 'past' : 'next'} data-pip={i === 3 ? 'go' : undefined}>{p}</li>
              ))}
            </ol>
          </button>
        ) : (
          <p className="slr-open__ready" data-ran={ran ? '' : undefined}><i className="slr-led" aria-hidden="true" />{launchSequence[0]}</p>
        )}
      </div>
      <p className="slr-sr" role="status">{counting ? '' : launchSequence[0]}</p>
    </article>
  )
}
