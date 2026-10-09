// complete-rank · Rank — two beats in one file. result.rank.up decides which one the shell asked for:
//   'rank'     the band: XP lands on the bar, the counter climbs, the readout says what is left to the next rank.
//   'rank-up'  the full-bleed moment: the insignia is struck in with a light sweep, the name rises letter by letter,
//              the Word and the next target follow. ~1.6 s to rest, a tap anywhere fast-forwards, CONTINUE ends it.
// The beat paints on the shared stage (Stage.jsx) and reserves --cmp-top for its top bar. Everything that moves is a
// CSS transition keyed to data-* flags the clock below flips, so lite mode (transforms instant, opacity 140 ms) is the same
// markup with the same information, and fast-forward is "set every flag now".
// The small helpers at the top are shared with Medals.jsx and Patch.jsx.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Counter, Label, Tag } from '../../../ui/index.js'
import { RankInsignia } from '../../../art/index.js'
import { Icon } from '../../../icons.jsx'
import { fx } from '../../../fx/fx.js'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { useFxLevel } from '../../../fx/motion.js'
import { RANKS, rankFor } from '../../../store.js'
import { aria, labels, rankLine, rankUpCopy } from '../../../copy.js'

/* ── shared by the three beats ─────────────────────────────────────────── */

export const cx = (...a) => a.filter(Boolean).join(' ')

/** A list of timeouts that can be cancelled together or run out of order at once (fast-forward). */
export function makeClock() {
  const q = []
  return {
    at(ms, fn) { const e = { fn, done: false, id: 0 }; e.id = setTimeout(() => { e.done = true; fn() }, ms); q.push(e) },
    flush() { for (const e of q) if (!e.done) { clearTimeout(e.id); e.done = true; e.fn() } },
    clear() { for (const e of q) clearTimeout(e.id); q.length = 0 },
  }
}

/**
 * The frame every beat sits in: the lite flag, the fade-in flag, and an idempotent, replayable advance().
 * `rev` bumps whenever the beat is (re)activated so effects can restart their choreography.
 */
export function useBeat({ active = true, next }) {
  const lite = useFxLevel() === 'lite'
  const [shown, setShown] = useState(false)
  const done = useRef(false)
  const nextRef = useRef(next)
  nextRef.current = next
  useEffect(() => {
    done.current = false
    if (!active) { setShown(false); return undefined }
    const a = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(a)
  }, [active])
  const advance = useCallback(() => {
    if (done.current) return
    done.current = true
    nextRef.current?.()
  }, [])
  return { lite, shown, advance }
}

/* Was the last thing the user did a key press? Then CONTINUE takes focus when it appears (keyboard flows stay unbroken);
   after a tap it does not (no ring flashing at a thumb). One listener pair for the whole module. */
let kbd = false
if (typeof window !== 'undefined') {
  addEventListener('keydown', () => { kbd = true }, true)
  addEventListener('pointerdown', () => { kbd = false }, true)
}
export const keyboardLast = () => kbd

export function useFocusWhen(ref, on) {
  useEffect(() => {
    if (!on || !kbd) return undefined
    const el = ref.current
    const t = setTimeout(() => {
      const a = document.activeElement
      if (el && (!a || a === document.body)) el.focus({ preventScroll: true })
    }, 60)
    return () => clearTimeout(t)
  }, [on, ref])
}

export const pad2 = (n) => String(n).padStart(2, '0')
const ranksOf = (result) => {
  const r = result?.rank || {}
  const to = r.to || rankFor(0)
  return { from: r.from || to, to, up: Boolean(r.up) }
}

const FILL = 1100   // ms the XP band takes to fill; the CSS reads it back through --cmk-fill

export default function Rank(props) {
  return props.result?.rank?.up ? <RankUp {...props} /> : <RankBand {...props} />
}

/* ═════════════════════════════ the band ═════════════════════════════ */

function RankBand({ result, active = true, next }) {
  const { lite, shown, advance } = useBeat({ active, next })
  const { from, to } = ranksOf(result)
  const same = from.index === to.index
  const a = same ? from.pct : 0
  const b = to.pct
  const gain = Math.max(0, to.xp - from.xp)
  const [run, setRun] = useState(false)
  const tip = useRef(null)
  const cta = useRef(null)
  useFocusWhen(cta, shown)

  useEffect(() => {
    setRun(false)
    if (!active) return undefined
    const clock = makeClock()
    const lead = lite ? 60 : 520
    clock.at(lead, () => { setRun(true); if (gain > 0) { sound.play('xp'); haptic.cue('xp') } })
    if (gain > 0) clock.at(lead + FILL + 40, () => fx.pop(tip.current, { color: 'tele', size: 120 }))
    return clock.clear
  }, [active, lite, gain, from.xp, to.xp])

  const line = rankLine(to)
  return (
    <section
      className="cmk-beat cmk-bar" data-in={shown ? '' : undefined} data-foot={shown ? '' : undefined} data-run={run ? '' : undefined}
      aria-label={labels.objectives.rank} style={{ '--cmk-fill': `${FILL}ms`, '--a': a, '--b': b, '--p': a }}
    >
      <div className="cmk-body">
        <Label size="md" className="cmk-eyebrow">
          {labels.objectives.rank}<i className="cmk-eyebrow__sep" aria-hidden="true" />
          <span className="cmk-eyebrow__n">{pad2(to.index + 1)} / {pad2(RANKS.length)}</span>
        </Label>

        <div className="cmk-bar__ins" aria-hidden="true">
          <span className="cmk-bar__halo" />
          <RankInsignia rank={to.index} size={112} decorative />
        </div>
        <h2 className="cmk-bar__name">{to.name}</h2>

        <div className="cmk-xp">
          {gain > 0 ? <Tag tone="tele" led={false} className="cmk-xp__gain">+{gain} XP</Tag> : null}
          <div className="cmk-xp__row">
            <Counter className="cmk-xp__n" value={run ? to.xp : from.xp} from={from.xp} duration={FILL} />
            <span className="cmk-xp__u">XP</span>
          </div>
        </div>

        <div className="cmk-bandwrap">
          <RankInsignia rank={to.index} size={32} decorative className="cmk-bandwrap__end" />
          <div className="cmk-band" role="progressbar" aria-label={aria.rank({ ...to, pct: to.pct * 100 })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(b * 100)}>
            <span className="cmk-band__track" />
            <span className="cmk-band__base" />
            <span className="cmk-band__gain" />
            <span className="cmk-band__run"><i className="cmk-band__tip" ref={tip} /></span>
          </div>
          {to.next ? <RankInsignia rank={to.next.index} size={32} decorative className="cmk-bandwrap__end is-next" /> : <span className="cmk-bandwrap__end" />}
        </div>
        <p className="cmk-togo">{line}</p>
        <p className="u-sr" role="status">{run ? `${aria.xp(to.xp)} ${line}` : ''}</p>
      </div>

      <div className="cmk-foot">
        <Button ref={cta} variant="primary" size="lg" full onClick={advance}>{labels.verbs.continue}</Button>
      </div>
    </section>
  )
}

/* ═════════════════════════════ the moment ═════════════════════════════ */

const REST = { hit: 520, name: 260, word: 360, next: 360, foot: 140 }   // ms between phases once the insignia lands (hit = the sound's own impact mark)

function RankUp({ result, active = true, next }) {
  const { lite, shown, advance } = useBeat({ active, next })
  const { to } = ranksOf(result)
  const copy = useMemo(() => rankUpCopy(to, String(result?.day ?? '')), [to, result?.day])
  const [ph, setPh] = useState(0)   // 0 dim · 1 insignia struck · 2 name · 3 word · 4 next target · 5 CONTINUE
  const [ffd, setFfd] = useState(false)
  const clock = useRef(null)
  const ins = useRef(null)
  const cta = useRef(null)
  useFocusWhen(cta, ph >= 5)

  useEffect(() => {
    setPh(0); setFfd(false)
    if (!active) return undefined
    const c = makeClock()
    clock.current = c
    const impact = lite ? 60 : Math.round((sound.marks('rankup').impact ?? 0.5) * 1000)
    let t = impact
    const strike = () => {
      setPh((p) => Math.max(p, 1))
      if (!lite && ins.current) {
        fx.celebrate(ins.current, { big: true })
        fx.embers({ x: innerWidth / 2, y: innerHeight * 0.94, w: innerWidth * 0.8, n: 18, delay: 500 })
      }
    }
    // the sound's own build-up runs ahead of the picture; the haptic weight is timed to land on the hit
    sound.play('rankup')
    if (!lite) c.at(Math.max(0, impact - 250), () => haptic.cue('rankup')); else haptic.cue('rankup')
    c.at(impact, strike)
    for (const [i, k] of ['name', 'word', 'next', 'foot'].entries()) {
      t += lite ? 40 : REST[k]
      c.at(t, () => setPh((p) => Math.max(p, i + 2)))
    }
    return () => { c.clear(); clock.current = null }
  }, [active, lite, to.index])

  // a tap while it plays: land everything now (the hit still fires, so the moment is never lost)
  const fastForward = () => { if (ph < 5) { setFfd(true); clock.current?.flush() } }
  const on = (n) => (ph >= n ? '' : undefined)

  const nextT = to.next
  const fit = Math.min(1, 7.4 / Math.max(1, to.name.length))
  return (
    <section
      className="cmk-beat cmk-up" data-in={shown ? '' : undefined} data-hit={on(1)} data-name={on(2)} data-word={on(3)} data-next={on(4)} data-foot={on(5)}
      data-ff={ffd ? '' : undefined} aria-label={copy.aria} style={{ '--cmk-fit': fit }} onPointerDown={fastForward}
    >
      <div className="cmk-up__veil" aria-hidden="true" />
      <div className="cmk-body">
        <Label size="md" className="cmk-eyebrow cmk-up__eyebrow" dot>
          {copy.eyebrow}<Icon name="arrowUp" size={16} className="cmk-up__arrow" />
        </Label>

        <div className="cmk-up__ins" ref={ins} aria-hidden="true">
          <i className="cmk-up__bloom" /><i className="cmk-up__rays" />
          <RankInsignia rank={to.index} size={184} decorative />
          <span className="cmk-up__sweep" />
        </div>

        <h2 className="cmk-up__name" aria-label={to.name}>
          {[...to.name].map((ch, i) => <span key={i} className="cmk-up__ch" style={{ '--i': i }} aria-hidden="true">{ch}</span>)}
        </h2>
        <p className="cmk-up__text">{copy.text}</p>
        <figure className="cmk-up__word">
          <blockquote className="t-scripture-sm cmk-up__verse">{copy.word.text}</blockquote>
          <figcaption className="t-ref cmk-up__ref">{copy.word.ref}</figcaption>
        </figure>

        <div className="cmk-up__next">
          {nextT ? (
            <>
              <RankInsignia rank={nextT.index} size={36} decorative className="cmk-up__next-ins" />
              <div className="cmk-up__next-t">
                <span className="cmk-up__next-name">{nextT.name}</span>
                <span className="cmk-up__next-xp">{labels.objectives.toGo(to.toNext)}</span>
                <span className="cmk-up__next-bar" aria-hidden="true"><i style={{ transform: `scaleX(${to.pct})` }} /></span>
              </div>
            </>
          ) : <span className="cmk-up__next-name">{rankLine(to)}</span>}
        </div>
      </div>

      <div className="cmk-foot">
        <Button ref={cta} variant="primary" size="lg" full onClick={advance}>{copy.cta || labels.verbs.continue}</Button>
      </div>
      <p className="u-sr" role="status">{ph >= 1 ? copy.aria : ''}</p>
    </section>
  )
}
