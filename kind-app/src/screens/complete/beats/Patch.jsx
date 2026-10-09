// complete-rank · Patch — result.stage.clearedNow: the stage patch is sewn on.
//   1 the patch is pressed onto the frame (scale-in, a little overshoot) · 2 a running stitch draws round its edge, a
//   bright point riding its head (stroke-dashoffset, haptic tick per stitch) · 3 the last stitch: gloss pass, 'unlock', foil
//   · 4 the stage name, its question and the Word · 5 CONTINUE. Lite: the patch fades in, already stitched.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button, Label } from '../../../ui/index.js'
import { MissionPatch } from '../../../art/index.js'
import { fx } from '../../../fx/fx.js'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { aria, labels, stageClearCopy } from '../../../copy.js'
import { getSeries, title as titleCase } from '../../../lib.js'
import { makeClock, useBeat, useFocusWhen } from './Rank.jsx'

const SEW = 1050        // ms the running stitch takes to go round (CSS reads it as --cmk-sew)
const STITCHES = 8      // haptic ticks along the way

export default function Patch({ result, s, day, active = true, next }) {
  const { lite, shown, advance } = useBeat({ active, next })
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const series = useMemo(() => getSeries(result?.seriesId) || s, [result?.seriesId, s])
  const stage = result?.stage || {}
  const idx = stage.index ?? 0
  const n = stage.n ?? idx + 1
  const slot = ((n - 1) % 5) + 1
  const week = series?.weeks?.[idx]
  const name = stage.name || titleCase(week?.f || '') || `Stage ${n}`
  const question = week?.question || week?.title || (stage.title && stage.title !== name ? stage.title : '')
  const copy = useMemo(() => stageClearCopy(stage, series, `${result?.seriesId}:${day}`), [stage, series, result?.seriesId, day])

  const [ph, setPh] = useState(0)   // 1 pressed on · 2 stitching · 3 stitched · 4 words · 5 CONTINUE
  const [ffd, setFfd] = useState(false)
  const clock = useRef(null)
  const art = useRef(null)
  const cta = useRef(null)
  useFocusWhen(cta, ph >= 5)

  useEffect(() => {
    setPh(0); setFfd(false)
    if (!active) return undefined
    const c = makeClock()
    clock.current = c
    const to = (p) => setPh((x) => Math.max(x, p))
    if (lite) {
      c.at(30, () => to(3))
      c.at(60, () => { sound.play('unlock'); haptic.cue('unlock'); to(5) })
      return () => { c.clear(); clock.current = null }
    }
    c.at(120, () => to(1))
    c.at(460, () => {
      to(2)
      haptic.pattern(Array.from({ length: STITCHES }, () => [6, Math.round(SEW / STITCHES) - 6]).flat())
    })
    c.at(460 + SEW, () => {
      to(3)
      sound.play('unlock')
      haptic.cue('unlock')
      const el = art.current
      if (el) {
        const tint = getComputedStyle(el).getPropertyValue('--stage').trim() || 'gold'
        fx.pop(el, { color: tint, size: 360 })
        fx.confetti({ ...fx.at(el), n: 44, power: 1.05 })
      }
    })
    c.at(460 + SEW + 260, () => to(4))
    c.at(460 + SEW + 560, () => to(5))
    return () => { c.clear(); clock.current = null }
  }, [active, lite, idx, result?.seriesId])

  const fastForward = () => { if (ph < 5) { setFfd(true); clock.current?.flush() } }
  const on = (k) => (ph >= k ? '' : undefined)
  const fit = Math.min(1, 11 / Math.max(1, name.length))

  return (
    <section
      className="cmk-beat cmk-patch" data-in={shown ? '' : undefined} data-hit={on(1)} data-sew={on(2)} data-done={on(3)} data-text={on(4)} data-foot={on(5)} data-ff={ffd ? '' : undefined}
      aria-label={copy.aria} onPointerDown={fastForward}
      style={{ '--stage': `var(--stage-${slot})`, '--stage-glow': `var(--stage-${slot}-glow)`, '--cmk-sew': `${SEW}ms`, '--cmk-fit': fit }}
    >
      <div className="cmk-body">
        <Label size="md" stage={slot} className="cmk-eyebrow cmk-patch__eyebrow" dot>{copy.eyebrow}</Label>

        <div className="cmk-patch__art" ref={art}>
          <i className="cmk-patch__glow" aria-hidden="true" />
          <div className="cmk-patch__piece">
            <MissionPatch series={series} stage={idx} state="earned" size={224} glint={false} label={aria.patch({ stage: n, earned: true })} />
          </div>
          <svg className="cmk-patch__ring" viewBox="0 0 220 220" aria-hidden="true" focusable="false">
            <defs>
              <mask id={`${uid}m`} maskUnits="userSpaceOnUse" x="0" y="0" width="220" height="220">
                <circle className="cmk-patch__reveal" cx="110" cy="110" r="104" pathLength="100" fill="none" stroke="#fff" strokeWidth="14" transform="rotate(-90 110 110)" />
              </mask>
            </defs>
            <circle className="cmk-patch__stitch" cx="110" cy="110" r="104" fill="none" mask={`url(#${uid}m)`} />
            {[' is-glow', ''].map((m) => (
              <circle key={m} className={`cmk-patch__head${m}`} cx="110" cy="110" r="104" pathLength="100" transform="rotate(-90 110 110)" />
            ))}
          </svg>
          <i className="cmk-patch__gloss" aria-hidden="true" />
        </div>

        <div className="cmk-patch__words">
          <p className="cmk-patch__earned t-mono">{copy.title}</p>
          <h2 className="cmk-patch__name">{name}</h2>
          {question ? <p className="cmk-patch__q">{question}</p> : null}
          <figure className="cmk-patch__word">
            <blockquote className="t-scripture-sm cmk-patch__verse">{copy.word.text}</blockquote>
            <figcaption className="t-ref cmk-patch__ref">{copy.word.ref}</figcaption>
          </figure>
        </div>
      </div>

      <div className="cmk-foot">
        <Button ref={cta} variant="primary" size="lg" full onClick={advance}>{copy.cta || labels.verbs.continue}</Button>
      </div>
      <p className="u-sr" role="status">{ph >= 3 ? copy.aria : ''}</p>
    </section>
  )
}
