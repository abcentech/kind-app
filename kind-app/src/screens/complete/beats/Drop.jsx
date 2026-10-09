// owner: complete-reward — the supply drop, the variable reward. result.drop is decided and persisted by the store
// (a refresh cannot re-roll it); opening the crate is theatre. Tap or Enter: shake, light spills, sparks, then the prize.
//   xp        a hex bolt + the counted-up +N XP          shield     the emblem lights; converted → it becomes +25 XP
//   fragment  the patch ring gains a segment, 'FRAGMENT 3 / 5' + a progress row; patchReady lights the whole ring
// The sequencer (Complete) advances on any tap, so this beat registers with Stage.intercept: the first tap opens the crate,
// the next one (while it plays) skips ahead to the prize, the one after moves on. Same for Space / Enter. CONTINUE does too.
// Lite: no shake, no sparks, no rise: tap opens, the prize cross-fades in, same sound and the same words.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Chest, ShieldEmblem } from '../../../art/index.js'
import { Button, Counter, Hex, Label, Panel, SegmentBar, Tag } from '../../../ui/index.js'
import { usePress } from '../../../ui/Button.jsx'
import { Icon } from '../../../icons.jsx'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { fx } from '../../../fx/fx.js'
import { useFxLevel } from '../../../fx/motion.js'
import { dropChrome, dropCopy, labels, ledgerCopy } from '../../../copy.js'
import { useStage } from '../Stage.jsx'

const SHAKE = 440      // ms of rattle before the lid goes
const SHOW_AT = 700    // the prize is named (counter starts, sound) this long after the tap
const TONE = { common: 'tele', rare: 'ignite', epic: 'gold' }

/* The patch ring: five arcs, one per fragment. Lit = kept, is-new = the one just found (it draws in), the rest are cold. */
const R = 38, CIRC = 2 * Math.PI * R, GAP = 7
function PatchRing({ have, of, ready }) {
  const dash = CIRC / of - GAP
  return (
    <span className="cmr-ring" data-ready={ready ? '' : undefined} aria-hidden="true">
      <svg viewBox="0 0 100 100" focusable="false">
        <path className="cmr-ring__hex" d="M50 17L78.6 33.5V66.5L50 83L21.4 66.5V33.5Z" />
        {Array.from({ length: of }, (_, i) => (
          <circle
            key={i}
            className={`cmr-ring__seg${i < have - 1 ? ' is-lit' : i === have - 1 ? ' is-new' : ''}`}
            cx="50" cy="50" r={R}
            strokeDasharray={`${dash.toFixed(2)} ${CIRC.toFixed(2)}`}
            style={{ '--len': dash.toFixed(2) }}
            transform={`rotate(${(-90 + (i * 360) / of + (GAP / 2 / CIRC) * 360).toFixed(2)} 50 50)`}
          />
        ))}
      </svg>
      <Icon.patch size={32} weight="duo" />
    </span>
  )
}

/** What rises out of the open crate. */
function Item({ drop, tone, lite }) {
  if (drop.kind === 'shield' && !drop.converted) return <ShieldEmblem size={96} state="active" decorative />
  if (drop.kind === 'shield') {
    return (
      <>
        {!lite && <span className="cmr-drop__was"><ShieldEmblem size={96} state="ready" decorative /></span>}
        <span className="cmr-drop__now"><Hex size={88} state="current" tone="tele" glow><Icon.bolt size={32} weight="solid" /></Hex></span>
      </>
    )
  }
  if (drop.kind === 'fragment') {
    const f = drop.fragment || { index: 0, of: 5 }
    return <PatchRing have={f.index + 1} of={f.of || 5} ready={!!f.patchReady} />
  }
  return <Hex size={88} state="current" tone={tone} glow><Icon.bolt size={32} weight="solid" /></Hex>
}

/** The words under the crate: title / number, the line, and for a fragment its tile. */
function Info({ drop, copy }) {
  const f = drop.fragment
  const [done, setDone] = useState(f ? f.index : 0)
  // the new segment lights after the tile has booted, so the ticker flares once
  useEffect(() => {
    if (!f) return undefined
    const t = setTimeout(() => setDone(f.index + 1), 950)
    return () => clearTimeout(t)
  }, [f])

  if (drop.kind === 'xp' || (drop.kind === 'shield' && drop.converted)) {
    const xp = drop.xp ?? drop.amount ?? 0
    return (
      <>
        <p className="cmr-drop__num"><Counter value={xp} prefix="+" /><span className="cmr-drop__unit">XP</span></p>
        {drop.converted && <Tag tone="neutral" led={false}>{ledgerCopy({ lines: [{ id: 'shield-overflow', xp }] })[0].label}</Tag>}
        <p className="cmr-drop__text">{copy.text}</p>
      </>
    )
  }
  if (drop.kind === 'shield') {
    return (
      <>
        <p className="cmr-drop__title">{copy.title}</p>
        <p className="cmr-drop__text">{copy.text}</p>
      </>
    )
  }
  const of = f?.of || 5
  const at = (f?.index ?? 0) + 1
  return (
    <>
      <p className="cmr-drop__title">{copy.title}</p>
      <Panel tone="plate" cut="sm" pad="sm" className="cmr-drop__tile" data-ready={f?.patchReady ? '' : undefined}>
        <span className="cmr-drop__tilehead">
          <Label mono size="md" tone={f?.patchReady ? 'gold' : 'ink-2'}>Fragment {at} / {of}</Label>
          {f?.patchReady && <Tag tone="gold" led={false}>Patch ready</Tag>}
        </span>
        <SegmentBar total={of} done={done} tone="gold" label={`Patch fragments, ${at} of ${of}`} />
      </Panel>
      <p className="cmr-drop__text">{f?.patchReady ? 'Every fragment found. A rare patch is ready.' : copy.text}</p>
    </>
  )
}

function DropBeat({ result, s, day, active = true, next }) {
  const drop = result?.drop || null
  const lite = useFxLevel() === 'lite'
  const stage = useStage()
  const [phase, setPhase] = useState('closed')     // closed → shaking → open
  const [shown, setShown] = useState(false)        // the prize has been named
  const [ready, setReady] = useState(false)
  const phaseRef = useRef('closed')
  const readyRef = useRef(false)
  const once = useRef({ burst: false, prize: false })
  const timers = useRef([])
  const box = useRef(null)
  const finish = useRef(null)
  const gone = useRef(false)
  usePress(box, phase !== 'closed')

  const rarity = drop?.rarity || (drop?.kind === 'fragment' ? 'epic' : drop?.kind === 'shield' ? 'rare' : 'common')
  const tone = drop?.converted ? 'tele' : TONE[rarity] || 'tele'     // a converted shield is XP now
  const copy = drop ? dropCopy(drop, `${result?.seriesId ?? s?.id}:${result?.day ?? day}`) : null
  const prize = !drop ? null
    : drop.kind === 'fragment' ? (drop.fragment?.patchReady ? 'rare' : 'reveal')
      : drop.kind === 'shield' && !drop.converted ? 'shield' : 'xp'

  // nothing to open: this beat is not part of the story
  useEffect(() => {
    if (active && !drop && !gone.current) { gone.current = true; next?.() }
  }, [active, drop, next])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const open = useCallback(() => {
    if (phaseRef.current !== 'closed' || !drop) return
    const at = (ms, fn) => { timers.current.push(setTimeout(fn, ms)) }
    const done = () => { readyRef.current = true; setReady(true) }
    const prizeCue = () => { if (once.current.prize) return; once.current.prize = true; sound.play(prize); haptic.cue(prize) }
    const burst = () => {
      const r = box.current?.getBoundingClientRect()
      if (once.current.burst || lite || !r) return
      once.current.burst = true
      const p = { x: r.left + r.width / 2, y: r.top + r.height * 0.42 }
      fx.sparks({ ...p, n: rarity === 'epic' ? 44 : 30, power: rarity === 'epic' ? 1.2 : 1, spread: 90, angle: -90, colors: [tone], gravity: 0.5, life: 900 })
      fx.shockwave({ ...p, color: tone, size: 300, ms: 660 })
      if (rarity === 'epic') fx.flash('gold', 220, { peak: 0.16, x: p.x, y: p.y })
    }
    // a second tap while it plays: everything that is left, now
    finish.current = () => { timers.current.forEach(clearTimeout); phaseRef.current = 'open'; setPhase('open'); burst(); setShown(true); prizeCue(); done() }

    sound.play('chest'); haptic.cue('chest')
    if (lite) {
      phaseRef.current = 'open'
      setPhase('open'); setShown(true)
      at(260, prizeCue)
      at(420, done)
      return
    }
    phaseRef.current = 'shaking'
    setPhase('shaking')
    if (box.current) fx.shake(box.current, { amp: 7, ms: SHAKE })
    at(SHAKE, () => { phaseRef.current = 'open'; setPhase('open'); burst() })
    at(SHOW_AT, () => { setShown(true); prizeCue() })
    at(SHOW_AT + 1000, done)
  }, [drop, lite, prize, rarity, tone])

  // the sequencer advances on any tap / Space / Enter: this beat answers first until it is ready to leave
  useEffect(() => {
    if (!active || !drop) return undefined
    return stage.intercept(() => {
      if (readyRef.current) return false
      if (phaseRef.current === 'closed') open(); else finish.current?.()
      return true
    })
  }, [active, drop, stage, open])

  if (!drop) return null
  const opened = phase === 'open'

  return (
    <section className="cmr-beat cmr-drop" role="group" aria-label={dropChrome.closed} data-phase={phase} data-tone={tone} data-kind={drop.kind} data-ready={ready ? '' : undefined}>
      <header className="cmr-head">
        <Label tone={opened ? tone : 'ignite'} size="md" dot>{copy.eyebrow}</Label>
      </header>

      <div className="cmr-drop__bay">
        <div className="cmr-drop__box" ref={box}>
          <i className="cmr-drop__spill" aria-hidden="true" />
          <div className="cmr-drop__chest"><Chest state={opened ? 'open' : 'closed'} tone={opened ? tone : 'ignite'} size={200} decorative /></div>
          {opened && <div className="cmr-drop__item" aria-hidden="true"><Item drop={drop} tone={tone} lite={lite} /></div>}
          {phase === 'closed' && <button type="button" className="cmr-drop__tap" aria-label={dropChrome.aria} onClick={open} />}
        </div>
      </div>

      <div className="cmr-drop__info">
        {!shown && <p className="cmr-drop__hint" data-hide={phase !== 'closed' ? '' : undefined}>{dropChrome.hint}</p>}
        {shown && <div className="cmr-drop__reveal" aria-hidden="true"><Info drop={drop} copy={copy} /></div>}
      </div>
      <p className="cmr-vh" role="status" aria-live="polite">{shown ? copy.aria : ''}</p>

      <footer className="cmr-foot">
        <div className="cmr-foot__go"><Button variant="primary" size="lg" full onClick={() => next?.()}>{labels.verbs.continue}</Button></div>
      </footer>
    </section>
  )
}

export default function Drop(props) {
  const [run, setRun] = useState(0)
  const was = useRef(props.active !== false)
  useEffect(() => {
    const on = props.active !== false
    if (was.current && !on) setRun((r) => r + 1)
    was.current = on
  }, [props.active])
  return <DropBeat key={run} {...props} />
}
