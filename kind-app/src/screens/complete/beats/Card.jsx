// owner: complete-reward — the day's code card, dealt face-down onto the stage, held for a beat, flipped.
// Beat contract: docs/V7-WAVE2.md. Reads result.code only; the card is already decided, this is theatre.
//   fresh   deal (spring, 3D) → beat → flip → sound / haptic / (gold: shockwave + sparks + foil that follows the tilt)
//   lite    no deal, no flip: the face is simply there, 120 ms cross-fade, same sound and the same information
//   not new "Already in your Locker" — face up, calm, no fanfare even if it is gold
// The sequencer (Complete) advances on any tap. While the choreography runs the first tap fast-forwards it (Stage.intercept)
// and swallows itself; the next tap, or CONTINUE, moves on. The card itself keeps its taps (data-cmp-own): that tap is the iOS gyro permission.
import { useEffect, useId, useRef, useState } from 'react'
import { CodeCardArt, Mark } from '../../../art/index.js'
import { Button, Label, Tag } from '../../../ui/index.js'
import { Icon } from '../../../icons.jsx'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { fx } from '../../../fx/fx.js'
import { gyroStatus, useFxLevel, usePointerTilt } from '../../../fx/motion.js'
import { aria, labels } from '../../../copy.js'
import { useStage } from '../Stage.jsx'

const DEAL_LAND = 275    // ms into the deal (--t-hero, 1100) where the card first meets the table: spring-bounce crosses 1.0 at ~25 %
const FLIP_AT = 1300     // the held beat: deal settles, the back glints, then it turns
const W = 300, H = 420, C = 26

// The same chamfered silhouette CodeCardArt cuts (TL + BR), as a stroke path inset by i.
const frame = (i) => `M${i + C} ${i}H${W - i}V${H - i - C}L${W - i - C} ${H - i}H${i}V${i + C}Z`

/** The back: carbon plate, a fine honeycomb that fades out under a mask, a triple chamfered frame, the K in its hex. */
function Back({ rare }) {
  const id = useId().replace(/\W/g, '')
  return (
    <div className="cmr-card__back" data-rare={rare ? '' : undefined} aria-hidden="true">
      <svg className="cmr-card__back-art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <pattern id={`${id}h`} width="27" height="15.588" patternUnits="userSpaceOnUse">
            <path className="cmr-card__lat" d="M0 7.794L4.5 0H13.5L18 7.794L13.5 15.588H4.5zM18 7.794H27M13.5 0L18 -7.794M13.5 15.588L18 23.382" />
          </pattern>
          <radialGradient id={`${id}g`} cx="50%" cy="50%" r="62%">
            <stop offset=".18" stopColor="#fff" stopOpacity="0" />
            <stop offset=".7" stopColor="#fff" stopOpacity=".85" />
            <stop offset="1" stopColor="#fff" stopOpacity=".2" />
          </radialGradient>
          <mask id={`${id}m`}><rect width={W} height={H} fill={`url(#${id}g)`} /></mask>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2=".4" y2="1">
            <stop offset="0" className="cmr-card__bg-a" />
            <stop offset="1" className="cmr-card__bg-b" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#${id}b)`} />
        <rect width={W} height={H} fill={`url(#${id}h)`} mask={`url(#${id}m)`} />
        <path className="cmr-card__fr is-1" d={frame(10)} />
        <path className="cmr-card__fr is-2" d={frame(18)} />
        <path className="cmr-card__fr is-3" d={frame(21.5)} />
      </svg>
      <div className="cmr-card__mark"><Mark size={96} /></div>
      <i className="cmr-card__glint" />
    </div>
  )
}

function CardBeat({ result, s, day, active = true, next, share }) {
  const code = result?.code || null
  const lite = useFxLevel() === 'lite'
  const stage = useStage()
  const fresh = !!code && code.isNew !== false
  const rare = !!code?.rare
  const drama = fresh && !lite
  const n = code?.day ?? result?.day ?? day

  const [face, setFace] = useState(drama ? 'down' : 'up')
  const [ready, setReady] = useState(false)
  const [said, setSaid] = useState('')
  const [hint, setHint] = useState('')
  const tilt = useRef(null)
  const finish = useRef(null)
  const isReady = useRef(false)
  usePointerTilt(tilt, { max: rare ? 15 : 9 })

  useEffect(() => {
    if (!active) return undefined
    const T = []
    const at = (ms, fn) => { T.push(setTimeout(fn, ms)) }
    let turned = false, burst = false
    const done = () => { isReady.current = true; setReady(true) }
    // the turn: the sound lands as the card passes edge-on, once, however we got here
    const turn = () => {
      if (turned) return
      turned = true
      sound.play(rare && fresh ? 'rare' : 'reveal')
      if (rare && fresh) haptic.heavy(); else haptic.cue('reveal')
    }
    const flare = () => {
      const el = tilt.current
      if (burst || !rare || !fresh || lite || !el) return
      burst = true
      const p = fx.at(el)
      fx.shockwave({ ...p, color: 'gold', size: 400, ms: 780, width: 2 })
      fx.sparks({ ...p, n: 30, power: 1.05, colors: ['gold'], gravity: 0.5, life: 1000 })
      fx.flash('gold', 240, { peak: 0.2, x: p.x, y: p.y })
    }
    const announce = () => {
      if (!code) { setSaid('No new card this time.'); return }
      setSaid(`${aria.card({ no: code.no, line: code.line, rare, earned: true })} Day ${n}.${fresh ? '' : ' Already in your Locker.'}`)
      if (rare && fresh && !lite) {
        const g = gyroStatus()
        setHint(g === 'unsupported' ? 'Move over the card to catch the light.' : g === 'on' ? 'Tilt your phone to catch the light.' : 'Tap the card, then tilt your phone.')
      }
    }
    finish.current = () => { T.forEach(clearTimeout); setFace('up'); if (fresh) turn(); flare(); announce(); done() }

    if (!code || !fresh) {
      announce()
      at(320, done)
    } else if (lite) {
      turn()
      announce()
      at(320, done)
    } else {
      at(DEAL_LAND, () => { sound.play('tap'); haptic.tap() })
      at(FLIP_AT, () => setFace('up'))
      at(FLIP_AT + 130, turn)
      at(FLIP_AT + 280, flare)
      at(FLIP_AT + 560, announce)
      at(FLIP_AT + 1200, done)
    }
    const off = stage.intercept(() => { if (isReady.current) return false; finish.current?.(); return true })
    return () => { T.forEach(clearTimeout); off() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const onShare = () => share?.({ kind: 'card', data: { seriesId: result?.seriesId ?? s?.id, day: n } })
  const kind = !code ? 'none' : !fresh ? 'dupe' : rare ? 'rare' : 'normal'
  const eyebrow = kind === 'rare' ? 'Gold card' : kind === 'normal' ? 'New code card' : 'Code card'

  return (
    <section className="cmr-beat cmr-card" role="group" aria-label={eyebrow} data-kind={kind} data-face={face} data-ready={ready ? '' : undefined}>
      <header className="cmr-head">
        <Label tone={rare ? 'gold' : 'tele'} size="md" dot>{eyebrow}</Label>
      </header>

      <div className="cmr-card__stage">
        {rare && fresh && <i className="cmr-card__halo" aria-hidden="true" />}
        <i className="cmr-card__ground" aria-hidden="true" />
        {code ? (
          <div className="cmr-card__tilt" ref={tilt} data-cmp-own="">
            <div className="cmr-card__deal">
              <div className="cmr-card__flip">
                <Back rare={rare} />
                <div className="cmr-card__face cmr-card__front">
                  <CodeCardArt day={n} rare={rare} w="100%" h="100%" title={aria.card({ no: code.no, line: code.line, rare, earned: true })} />
                  <i className="cmr-card__sweep" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="cmr-card__slot" aria-hidden="true"><Icon.card size={32} /></div>
        )}
      </div>

      <div className="cmr-card__meta">
        {code ? (
          <>
            <p className="cmr-card__no">
              <Label mono size="md" tone="ink-2">CODE {code.no} · DAY {n}</Label>
              {rare && <Tag tone="gold" led={false}>Gold</Tag>}
            </p>
            <p className="cmr-card__line" data-long={code.line.length > 64 ? '' : undefined}>{`“${code.line}”`}</p>
            {kind === 'dupe' && <p className="cmr-card__note"><Icon.check size={16} /> Already in your Locker</p>}
            {kind === 'rare' && <p className="cmr-card__note is-gold">Gold. Earned, not given.</p>}
            {hint && <p className="cmr-card__hint">{hint}</p>}
          </>
        ) : (
          <p className="cmr-card__line">No new card this time.</p>
        )}
      </div>
      <p className="cmr-vh" role="status" aria-live="polite">{said}</p>

      <footer className="cmr-foot">
        {code && <Button variant="secondary" size="lg" icon="share" onClick={onShare}>{labels.verbs.share}</Button>}
        <div className="cmr-foot__go"><Button variant="primary" size="lg" full onClick={() => next?.()}>{labels.verbs.continue}</Button></div>
      </footer>
    </section>
  )
}

// A beat that is switched off and on again starts from the top (the deal replays) instead of resuming mid-flip.
export default function Card(props) {
  const [run, setRun] = useState(0)
  const was = useRef(props.active !== false)
  useEffect(() => {
    const on = props.active !== false
    if (was.current && !on) setRun((r) => r + 1)
    was.current = on
  }, [props.active])
  return <CardBeat key={run} {...props} />
}
