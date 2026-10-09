// learn-hud · ShieldSheet — the shield bay: what you hold, how a shield is earned, spent and kept, and how far the next one is.
// Shields are never sold; the sheet says so. Props: { open, onClose }.
import { Sheet, SegmentBar } from '../../ui/index.js'
import { ShieldEmblem } from '../../art/index.js'
import { Icon } from '../../icons.jsx'
import { SHIELD_EVERY, XP, useStore, useStreak, useToday } from '../../store.js'
import { shieldLine } from '../../copy.js'
import { Readout, Section } from './parts.jsx'

const STEPS = [
  ['Earn', `A shield for every ${SHIELD_EVERY} days of streak. A supply drop can hold one too.`],
  ['Spend', 'Miss a day and a shield covers it on its own. Selah rest days never cost one.'],
  ['Keep', `The bay holds two. A third turns into +${XP.shieldOverflow} XP, so nothing is wasted.`],
]

export default function ShieldSheet({ open, onClose }) {
  const st = useStore()
  const info = useStreak()
  const k = useToday()
  const held = Math.min(info.max, info.held)
  const ever = (st.stats?.shieldsEarned || 0) > 0 || held > 0
  const kind = held === 0 ? (ever ? 'none' : null) : info.shielded || info.state === 'at-risk' ? 'cover' : held >= info.max ? 'max' : 'low'
  const toward = SHIELD_EVERY - info.shieldIn
  return (
    <Sheet open={open} onClose={onClose} title="Shields" eyebrow={`SHIELD BAY · ${held} / ${info.max}`} detents={['half', 'full']}>
      <div className="hud-sheet hud-shields">
        <section className="hud-bays" aria-label={`${held} of ${info.max} shields held`}>
          {Array.from({ length: info.max }, (_, i) => (
            <div className="hud-slot" data-filled={i < held ? '' : undefined} key={i}>
              {i < held
                ? <ShieldEmblem size={96} state="ready" decorative />
                : <span className="hud-slot__void" aria-hidden="true"><Icon.shield size={32} /></span>}
              <span className="hud-slot__k" aria-hidden="true">{i < held ? 'Ready' : 'Empty'}</span>
            </div>
          ))}
        </section>

        {kind ? <p className="hud-status hud-status--c" aria-live="polite">{shieldLine(kind, { n: info.count }, k)}</p> : null}

        {held < info.max ? (
          <div className="hud-card">
            <div className="hud-card__row hud-card__row--tight">
              <span className="hud-card__lead">{shieldLine('next', { n: info.shieldIn }, 'bay-' + info.shieldIn)}</span>
              <span className="hud-card__aside">{toward} / {SHIELD_EVERY}</span>
            </div>
            <SegmentBar total={SHIELD_EVERY} done={toward} current={-1} tone="tele" label={`${toward} of ${SHIELD_EVERY} days toward your next shield`} />
          </div>
        ) : null}

        <Section title="How shields work">
          <ol className="hud-steps">
            {STEPS.map(([t, body], i) => (
              <li className="hud-step" key={t}>
                <span className="hud-step__n" aria-hidden="true">{i + 1}</span>
                <span className="hud-step__txt"><b>{t}</b>{body}</span>
              </li>
            ))}
          </ol>
          <p className="hud-fine">Shields are earned, never bought.</p>
        </Section>

        <dl className="hud-reads">
          <Readout label="Earned" value={st.stats?.shieldsEarned || 0} />
          <Readout label="Used" value={st.stats?.shieldsUsed || 0} />
          <Readout label="Bay" value={`${held}/${info.max}`} />
        </dl>
      </div>
    </Sheet>
  )
}
