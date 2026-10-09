// Streak beat — one file for the three streak moments (completionBeats: 'streak', 'shield', 'milestone').
//   <Streak result active next share beat? week? />
// `beat` is the id completionBeats() produced; pass it and each beat shows only its own news (the flame and the number / the
// shield / the milestone). Without it the beat is composite: the milestone scene when result.streak.milestone is set, else the
// streak scene carrying any shield news as a line. `week` overrides weekStrip(store) (playground, replays).
// The scene is 2.5 to 4 s, always skippable with CONTINUE; a touch or focus inside it stands the auto-advance down.
import { forwardRef, useMemo, useRef, useState } from 'react'
import { Hex, IconButton, Label, Tag } from '../../../ui/index.js'
import { FlameMark, ShieldEmblem } from '../../../art/index.js'
import { Icon } from '../../../icons.jsx'
import { fx } from '../../../fx/fx.js'
import { haptic } from '../../../fx/haptics.js'
import { sound } from '../../../fx/sound.js'
import { aria, daysWord, labels, milestoneCopy, noticeCopy, praise, shieldLine, streakLine, streakLostCopy, toastCopy, xpDelta } from '../../../copy.js'
import { fmtKey } from '../../../lib.js'
import { useStore, weekStrip } from '../../../store.js'
import { BeatFoot, tokenPx, useBeatRun, useVp } from './Rings.jsx'

const BEST = 'New best'          // copy.js has no personal-best line yet (REQUEST)
const SHIELD_MAX = 2
const AUTO = { streak: 3200, shield: 3200, milestone: 4200 }

const levelFor = (n) => (n >= 21 ? 3 : n >= 7 ? 2 : 1)   // the flame grows at 7 and 21; level 0 (no core) is left to the cold ember
const MTICKS = Array.from({ length: 31 }, (_, i) => i)

/** Which scene a beat plays. Exported so the shell (or a test) can see what a given result will show. */
export function variantOf(result, beat) {
  if (beat === 'streak' || beat === 'shield' || beat === 'milestone') return beat
  return result.streak.milestone ? 'milestone' : 'streak'
}

/* ── the number: an odometer that always rolls forward (Counter's reels would rewind a 9 to a 0) ─────────────── */
function Odo({ from, to, go }) {
  const a = String(from), b = String(to), n = Math.max(a.length, b.length)
  const cols = Array.from({ length: n }, (_, c) => {
    const f = a[c - (n - a.length)] ?? '', t = b[c - (n - b.length)] ?? ''
    return { c, f, t, ch: f !== t, d: n - 1 - c }
  })
  return (
    <span className="cms-odo" aria-hidden="true">
      {cols.map(({ c, f, t, ch, d }) => (
        <span key={c} className="cms-odo-col" data-changed={ch || undefined} data-go={(ch && go) || undefined} style={{ '--c': d }}>
          {ch ? <><i className="cms-odo-old">{f || ' '}</i><i className="cms-odo-new">{t}</i></> : <i>{t}</i>}
        </span>
      ))}
    </span>
  )
}

/* ── the flame on its pad ────────────────────────────────────────────────── */
function Pad({ flameRef, size, lit, level, bloom, n, ticks, ignited }) {
  return (
    <div className="cms-pad" style={{ '--cms-flame': size + 'px' }} data-lit={lit || undefined} data-bloom={bloom || undefined} data-ticks={ticks || undefined}>
      <i className="cms-glow" />
      <svg className="cms-orbit" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="47.5" /></svg>
      {ticks && (
        <svg className="cms-mticks" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          {MTICKS.map((i) => (
            <line key={i} className={i < n ? 'cms-mt-lit' : 'cms-mt'} x1="50" y1="1.4" x2="50" y2="6.2" transform={`rotate(${(i * 360) / 31} 50 50)`} style={{ '--i': i }} />
          ))}
        </svg>
      )}
      {bloom && [0, 1, 2].map((i) => <i key={i} className="cms-wave" style={{ '--i': i }} />)}
      <span className="cms-flame" ref={flameRef} data-lit={lit} data-ignited={ignited || undefined}>
        <FlameMark size={size} lit={lit} level={level} decorative />
      </span>
    </div>
  )
}

/* ── the week: seven hexes, the days you flew filling with a pop ─────────── */
const Week = forwardRef(function Week({ cells, go, size }, ref) {
  return (
    <ul className="cms-week" ref={ref} data-go={go || undefined}>
      {cells.map((c, i) => {
        const kind = c.flame ? 'flame' : c.save ? 'save' : c.rest ? 'rest' : 'empty'
        const filled = kind === 'flame' || kind === 'save'
        return (
          <li key={c.key} className="cms-cell" data-kind={kind} data-today={c.today || undefined} data-on={filled || undefined} style={{ '--i': i }}
            aria-label={aria.heat({ date: fmtKey(c.key), lessons: c.lessons })}>
            <span className="cms-hexbox" aria-hidden="true">
              <Hex size={size} state="open" tone="none">{kind === 'rest' ? <Icon name="moon" size={16} /> : null}</Hex>
              {filled && (
                <span className="cms-fill">
                  <Hex size={size} state="done" tone={kind === 'save' ? 'tele' : 'ignite'}>
                    <Icon name={kind === 'save' ? 'shield' : 'flame'} size={20} weight="solid" />
                  </Hex>
                </span>
              )}
            </span>
            <span className="cms-dow" aria-hidden="true">{c.label}</span>
          </li>
        )
      })}
    </ul>
  )
})

const Note = ({ icon, children, on }) => (children ? <p className="cms-note" data-on={on || undefined}><Icon name={icon} size={16} />{children}</p> : null)

export default function Streak({ result, active = true, next, share, beat, week }) {
  const k = result.streak
  const v = variantOf(result, beat)
  const solo = beat != null
  const st = useStore()
  const vp = useVp()
  const compact = vp.h < 700
  const seed = `${result.seriesId}|${result.date}|${result.day}`
  const { from, to } = k

  const [step, setStep] = useState(0)
  const [shield, setShield] = useState('ready')
  const flameRef = useRef(null)
  const weekRef = useRef(null)
  const shieldRef = useRef(null)
  const cells = useMemo(() => week || weekStrip(st), [week, st])

  // ── words (all from copy.js, seeded so a re-render never swaps a line)
  const mile = k.milestone ? milestoneCopy(k.milestone, { shield: k.shieldEarned === 'shield', xp: result.xp?.lines?.find((l) => l.id === 'milestone')?.xp, seed }) : null
  const scene = v === 'milestone' && !mile ? 'streak' : v
  const lostLine = k.broke ? streakLostCopy(k.lostFrom, seed).text : ''
  const line = lostLine || (k.comeback ? praise({ kind: 'return', seed }).text : streakLine(to, seed))
  const usedLine = k.shieldUsed ? shieldLine('used', { n: to }, seed) : ''
  const earnedLine = k.shieldEarned === 'shield' ? shieldLine('earned', {}, seed) : k.shieldEarned === 'xp' ? shieldLine('overflow', {}, seed) : ''
  const overflowXp = result.xp?.lines?.find((l) => l.id === 'shield-overflow')?.xp ?? 25
  const unit = daysWord(to).replace(/^\S+\s/, '')

  // ── geometry
  const flame = scene === 'milestone' ? (compact ? 108 : 168) : compact ? 96 : 148
  const cell = Math.max(30, Math.min(44, Math.floor((vp.w - tokenPx('--gutter', 20) * 2 - 6 * tokenPx('--s-2', 8)) / 7)))
  const lit = from > 0 || step >= 1

  const runKey = `${seed}|${result.time}|${scene}`
  const { advance, hold } = useBeatRun(active, next, (at, { advance: go, held }) => {
    const auto = (ms) => at(ms, () => { if (!held.current) go() })
    setStep(0); setShield('ready')
    if (scene === 'streak') {
      at(350, () => {
        setStep(1)
        sound.play('streak'); haptic.success()
        if (from === 0) fx.ignite(flameRef.current); else fx.pop(flameRef.current, { color: 'ignite', size: 220 })
      })
      at(850, () => setStep(2))
      at(1300, () => setStep(3))
      at(1800, () => {
        setStep(4)
        const t = weekRef.current && weekRef.current.querySelector('[data-today][data-on]')
        if (t) { haptic.tap(); fx.sparks({ ...fx.at(t), n: 12, power: 0.6, spread: 360, gravity: 0.8, life: 640 }) }
      })
      auto(AUTO.streak)
    } else if (scene === 'milestone') {
      at(300, () => {
        setStep(1)
        sound.play('streak'); haptic.heavy()
        fx.celebrate(flameRef.current, { big: k.milestone >= 14 })
      })
      at(700, () => setStep(2))
      at(1150, () => setStep(3))
      at(1750, () => setStep(4))
      at(2250, () => setStep(5))
      auto(AUTO.milestone)
    } else {
      at(350, () => {
        setStep(1)
        if (k.shieldUsed) setShield('active')
        sound.play('shield'); haptic.success()
        fx.pop(shieldRef.current, { color: 'tele', size: 240 })
      })
      at(900, () => setStep(2))
      at(1500, () => { setStep(3); if (k.shieldUsed) setShield('spent') })
      if (k.shieldEarned === 'xp') at(1300, () => { setStep(3); sound.play('xp') })
      auto(AUTO.shield)
    }
  }, runKey)

  const spoken = step >= (scene === 'milestone' ? 3 : scene === 'streak' ? 4 : 2)
    ? scene === 'milestone' ? mile.aria : [aria.streak(to), scene === 'shield' ? usedLine || earnedLine : line].join(' ')
    : ''
  const bestOn = k.newBest && to > 1

  return (
    <section className="cms-beat" data-beat={scene} data-step={step} data-compact={compact || undefined} aria-label={scene === 'shield' ? labels.hud.shields : scene === 'milestone' ? mile.eyebrow : labels.hud.streak} {...hold}>
      <div className="cms-main">
        {scene === 'streak' && (
          <>
            <Label mono tone="ignite" dot className="cms-eyebrow">{labels.hud.streak}</Label>
            <Pad flameRef={flameRef} size={flame} lit={lit} ignited={step >= 1} level={levelFor(step >= 1 ? to : from)} />
            <div className="cms-numrow" data-lit={lit || undefined}><Odo from={from} to={to} go={step >= 2} /></div>
            <span className="cms-unit">{unit}</span>
            <p className="cms-line" data-on={step >= 4 || undefined} data-tone={lostLine ? 'soft' : undefined}>{line}</p>
            <Week cells={cells} go={step >= 3} size={cell} ref={weekRef} />
            <div className="cms-chips" data-on={step >= 4 || undefined}>
              {bestOn && <Tag tone="gold" icon="trophy">{BEST}</Tag>}
              {!solo && k.shieldEarned === 'xp' && <Tag tone="tele" icon="bolt">{xpDelta(overflowXp)}</Tag>}
            </div>
            <Note icon="moon" on={step >= 4}>{k.graced ? noticeCopy({ type: 'grace' }, { n: to }).body : ''}</Note>
            {!solo && <Note icon="shield" on={step >= 4}>{usedLine}</Note>}
            {!solo && <Note icon="shield" on={step >= 4}>{earnedLine}</Note>}
          </>
        )}

        {scene === 'milestone' && (
          <>
            <Label mono tone="gold" dot className="cms-eyebrow">{mile.eyebrow}</Label>
            <Pad flameRef={flameRef} size={flame} lit ignited={step >= 1} level={step >= 1 ? 3 : levelFor(to)} bloom={step >= 1} ticks n={Math.min(to, 31)} />
            <div className="cms-numrow" data-hero data-on={step >= 2 || undefined} data-lit><Odo from={to} to={to} go={false} /></div>
            <h2 className="cms-title" data-on={step >= 3 || undefined}>{mile.title}</h2>
            <p className="cms-text" data-on={step >= 3 || undefined}>{mile.text}</p>
            <blockquote className="cms-word" data-on={step >= 4 || undefined}>
              <p>{mile.word.text}</p>
              <cite>{mile.word.ref}</cite>
            </blockquote>
            <div className="cms-chips" data-on={step >= 5 || undefined}>
              {mile.reward && <Tag tone="tele" icon="bolt">{mile.reward}</Tag>}
              {bestOn && <Tag tone="gold" icon="trophy">{BEST}</Tag>}
            </div>
            <Note icon="shield" on={step >= 5}>{mile.bonus}</Note>
          </>
        )}

        {scene === 'shield' && (
          <>
            <Label mono tone="tele" dot className="cms-eyebrow">{labels.hud.shields}</Label>
            <div className="cms-shieldpad" data-state={shield} data-used={k.shieldUsed || undefined} data-on={step >= 1 || undefined} data-xp={(k.shieldEarned === 'xp' && !k.shieldUsed && step >= 3) || undefined}
              style={{ '--cms-shield': (compact ? 112 : 148) + 'px' }}>
              <i className="cms-glow" />
              <span className="cms-shield" ref={shieldRef}><ShieldEmblem size={compact ? 112 : 148} state={shield} decorative /></span>
              <span className="cms-bolt" aria-hidden="true"><Icon name="bolt" size={32} weight="solid" /></span>
            </div>
            <p className="cms-line" data-on={step >= 2 || undefined}>{k.shieldUsed ? usedLine : earnedLine}</p>
            <div className="cms-recap" data-on={step >= 3 || undefined}>
              <FlameMark size={32} lit level={levelFor(to)} decorative />
              <b>{to}</b><span>{unit}</span>
            </div>
            <ul className="cms-bay" data-on={step >= 3 || undefined} aria-label={aria.shields(k.shields, SHIELD_MAX)}>
              {Array.from({ length: SHIELD_MAX }, (_, i) => {
                const held = Array.from({ length: Math.min(k.shields, SHIELD_MAX) }, () => 'ready')
                const bay = k.shieldUsed ? [...held, 'spent'].slice(0, SHIELD_MAX) : held
                const s = bay[i] || 'empty'
                const newest = !k.shieldUsed && s === 'ready' && i === bay.length - 1
                return (
                  <li key={i} data-s={s} data-new={newest || undefined}>
                    {s === 'empty' ? <i className="cms-slot" /> : <ShieldEmblem size={44} state={s === 'spent' && step < 3 ? 'ready' : s} decorative />}
                  </li>
                )
              })}
            </ul>
            {k.shieldUsed && k.shieldEarned && <Note icon="shield" on={step >= 3}>{earnedLine}</Note>}
            <div className="cms-chips" data-on={step >= 3 || undefined}>
              {k.shieldEarned === 'xp' && <Tag tone="tele" icon="bolt">{xpDelta(overflowXp)}</Tag>}
              {k.shieldEarned === 'shield' && <Tag tone="tele" icon="shield">{toastCopy('shieldEarned', {}, seed).title}</Tag>}
            </div>
          </>
        )}
        <p className="cms-sr" role="status">{spoken}</p>
      </div>

      <BeatFoot onContinue={advance} row={scene === 'milestone' && !!share}>
        {scene === 'milestone' && share && (
          <IconButton icon="share" variant="plate" size="lg" label={mile.shareCta} onClick={() => share({ kind: 'streak', data: { n: k.milestone } })} />
        )}
      </BeatFoot>
    </section>
  )
}
