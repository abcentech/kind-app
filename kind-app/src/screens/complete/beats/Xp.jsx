// complete-shell · beat "xp" — the climb.
//
//   FULL FX   t 0      launch cue + pulse; the limb starts to drop away; the rocket (burn) lifts on a particle trail, ALT/VEL spool up
//             t 2.2s   the telemetry ledger counts in, row by row (Lesson XP · Bonus · Accuracy) — the rocket has left the frame
//             t 3.2s   the total lands as the one giant ignition numeral; complete cue; celebrate
//             t 5.4s   it eases to the XP chip in the bar (the HUD corner) on a comet arc, and the bank ticks up
//   LITE      no climb: the ledger and total are simply there, cross-faded in, same numbers.
//   PRACTICE  (result.again) is the lite composition with a lighter cue: no launch, no celebration.
//   TAP       the first tap fast-forwards to the landed total (Stage.intercept); the next tap advances. The beat never advances itself.
// The supply drop's XP is NOT in this total while a drop beat is coming (Stage ctx.holdDrop): the drop must stay a surprise.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Counter } from '../../../ui/index.js'
import { Rocket } from '../../../art/index.js'
import { fx } from '../../../fx/fx.js'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { useFxLevel } from '../../../fx/motion.js'
import { ledgerCopy } from '../../../copy.js'
import { momentFor, useStage } from '../Stage.jsx'

const T = { ledger: 1200, total: 1800, dock: 2450 }                   // ms from mount, full fx
const ALT = 408, VEL = 78                                              // an orbit's worth of telemetry: km, and 7.8 km/s (÷10 on display)
const TXT = { xp: 'XP', lesson: 'Lesson XP', bonus: 'Bonus', acc: 'Accuracy', earned: 'XP earned', alt: 'ALT', vel: 'VEL', km: ' KM', kms: ' KM/S', list: 'XP breakdown' }

export default function Xp({ result, s, day, active }) {
  const lite = useFxLevel() === 'lite'
  const stage = useStage()
  const again = !!result.again
  const cinematic = !lite && !again
  const [step, setStep] = useState(cinematic ? 0 : 2)                   // 0 climb · 1 ledger · 2 total landed · 3 docked
  const [docked, setDocked] = useState(false)                          // the total is on its way to the XP chip
  const [gone, setGone] = useState(false)                              // the rocket has left the frame (unmount it, and its trail)
  const stepRef = useRef(step); stepRef.current = step
  const rootRef = useRef(null), totalRef = useRef(null), rocketRef = useRef(null)
  const rocketPx = useMemo(() => Math.round(Math.max(150, Math.min(240, window.innerHeight * 0.27))), [])

  /* ── the numbers ── */
  const xp = result.xp || {}
  const earned = Math.max(0, (xp.total || 0) - (stage.holdDrop ? xp.drop || 0 : 0))
  const rows = useMemo(() => {
    const ledger = ledgerCopy(xp)
    const out = [{ id: 'lesson', label: TXT.lesson, value: xp.lesson || 0, prefix: '+' }]
    if (xp.bonus) out.push({ id: 'bonus', label: TXT.bonus, value: xp.bonus, prefix: '+',
      sub: (xp.lines || []).map((l) => { const r = ledger.find((x) => x.id === l.id); return r ? `${r.label} ${r.value.replace(` ${TXT.xp}`, '')}` : '' }).filter(Boolean).join(' · ') })
    if (!stage.holdDrop && xp.drop) out.push({ id: 'drop', label: ledger.find((x) => x.id === 'drop')?.label || 'Supply drop', value: xp.drop, prefix: '+' })
    if (result.asked > 0) out.push({ id: 'acc', label: TXT.acc, value: Math.round((100 * result.right) / result.asked), suffix: '%', tone: result.perfect ? 'go' : undefined })
    return out
  }, [xp, result.asked, result.right, result.perfect, stage.holdDrop])

  /* ── the choreography ── */
  useEffect(() => {
    if (!active) return undefined
    const ids = [], raf = []
    const at = (ms, fn) => ids.push(setTimeout(fn, ms))
    if (cinematic) {
      sound.play('launch'); haptic.launch()
      raf.push(requestAnimationFrame(() => raf.push(requestAnimationFrame(() => stage.setPhase('climb')))))   // let 'pad' paint first, so the limb really moves
      const frame = rootRef.current && rootRef.current.closest('.cmp')
      if (frame) fx.shake(frame, { amp: 2.5, ms: 1400 })
      at(T.ledger, () => setStep((s) => Math.max(s, 1)))
      at(T.total, () => setStep((s) => Math.max(s, 2)))
      at(T.dock, () => setStep((s) => Math.max(s, 3)))
    } else {
      sound.play(again ? 'xp' : 'complete'); haptic.cue(again ? 'xp' : 'complete')
      stage.bankDone()
    }
    return () => { ids.forEach(clearTimeout); raf.forEach(cancelAnimationFrame) }
  }, [active])                                                        // eslint-disable-line react-hooks/exhaustive-deps

  // exhaust: a particle trail anchored to the rocket while it climbs
  useEffect(() => {
    if (!active || !cinematic || !rocketRef.current) return undefined
    const tr = fx.trail(rocketRef.current, { where: 'bottom', dir: 90, rate: 90, scale: 1.1, dy: Math.round(rocketPx * 0.34) })
    return () => tr.stop()
  }, [active, cinematic, rocketPx])

  // the landing and the dock
  useEffect(() => {
    if (!active || !cinematic) return undefined
    if (step === 2) {
      sound.play('complete'); haptic.cue('complete')
      const id = requestAnimationFrame(() => totalRef.current && fx.celebrate(totalRef.current))
      return () => cancelAnimationFrame(id)
    }
    if (step === 3) {
      const el = totalRef.current, to = stage.dockRef.current
      if (!el || !to) { stage.bankDone(); return undefined }
      const a = el.getBoundingClientRect(), b = to.getBoundingClientRect()
      el.style.setProperty('--cmp-dx', `${(b.left + b.width / 2 - (a.left + a.width / 2)).toFixed(1)}px`)
      el.style.setProperty('--cmp-dy', `${(b.top + b.height / 2 - (a.top + a.height / 2)).toFixed(1)}px`)
      el.style.setProperty('--cmp-ds', String(Math.max(0.1, b.height / a.height).toFixed(3)))
      setDocked(true)
      const safety = setTimeout(() => stage.bankDone(), 2000)         // the bank must tick even if the comets are cleared mid-flight
      fx.fly({ from: el, to, n: 6, color: 'tele', ms: 720, onDone: () => { stage.bankDone(); fx.pop(to, { color: 'tele', size: 84 }); sound.play('xp'); haptic.tap() } })
      return () => clearTimeout(safety)
    }
    return undefined
  }, [step, active, cinematic])                                       // eslint-disable-line react-hooks/exhaustive-deps

  // first tap: fast-forward to the landed total. The Stage then sends the next tap to "advance".
  useEffect(() => {
    if (!active) return undefined
    return stage.intercept(() => { if (stepRef.current < 2) { setStep(2); return true } return false })
  }, [active])                                                        // eslint-disable-line react-hooks/exhaustive-deps

  const showRows = step >= 1
  const title = useMemo(() => momentFor(result, s, day, null).title, [result, s, day])
  return (
    <div ref={rootRef} className="cmp-xp" data-step={step} data-lite={lite || again ? '' : undefined}>
      {cinematic && !gone && (
        <div className="cmp-xp__flight" aria-hidden="true" data-gone={step >= 1 ? '' : undefined}>
          <div className="cmp-xp__rocket" ref={rocketRef} onAnimationEnd={(e) => { if (e.target === e.currentTarget) setGone(true) }}><Rocket size={rocketPx} flame="burn" /></div>
          <dl className="cmp-xp__tele">
            <div><dt>{TXT.alt}</dt><dd><Counter value={ALT} duration={1500} suffix={TXT.km} /></dd></div>
            <div><dt>{TXT.vel}</dt><dd><Counter value={VEL} duration={1500} format={(n) => (n / 10).toFixed(1)} suffix={TXT.kms} /></dd></div>
          </dl>
        </div>
      )}

      <h2 className="cmp-xp__head" data-on={showRows ? '' : undefined}>{title}</h2>

      <ul className="cmp-xp__rows" style={{ '--n': rows.length }} aria-label={TXT.list}>
        {showRows && rows.map((r, i) => (
          <li key={r.id} className="cmp-xp__row" data-tone={r.tone} style={{ '--i': i }}>
            <span className="cmp-xp__k">{r.label}</span>
            <i className="cmp-xp__lead" aria-hidden="true" />
            <Counter className="cmp-xp__v" value={r.value} prefix={r.prefix} suffix={r.suffix} duration={1100} align="end" />
            {r.sub ? <small className="cmp-xp__sub">{r.sub}</small> : null}
          </li>
        ))}
      </ul>

      <div className="cmp-xp__total" ref={totalRef} data-on={step >= 2 ? '' : undefined} data-fly={docked ? '' : undefined}>
        {step >= 2 && <Counter className="cmp-xp__num t-ignite" value={earned} prefix="+" duration={1100} />}
        <span className="cmp-xp__unit">{TXT.earned}</span>
      </div>
    </div>
  )
}
