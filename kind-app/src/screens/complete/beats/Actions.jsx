// complete-shell · beat "actions" — the last beat: what the day was worth, what is next, and the way out.
//
//   · the day's Moment (copy.completionCopy): title + one line of the Word
//   · a summary slab: Day · XP (the full total, supply drop included) · Streak · Accuracy, and where you stand in the rank
//   · "earned this flight" tags, so anything Skip jumped over is still accounted for
//   · next up (copy.nextUpCopy): live missions show the T-minus to the 6:00 unlock; archive missions say it is open now
//   · Share (the streak card) and a big CONTINUE, which is the only thing in the sequence that closes it.
// CONTINUE arms 700 ms after the beat appears (the tap that brought you here must not close it) and then takes focus.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Panel, Progress, Stat, Tag } from '../../../ui/index.js'
import { useFxLevel } from '../../../fx/motion.js'
import { nextUpCopy, rankLine, tMinus, zoneTag } from '../../../copy.js'
import { dayLabel, epOf } from '../../../lib.js'
import { shareData, useClock, useStore } from '../../../store.js'
import { momentFor } from '../Stage.jsx'

const ARM = 700
const CARRY = { teen: 'Carry it today', parent: 'At the table tonight' }

/** One thing to take out of the lesson: a teen's move for the day, a parent's question for the children. Plain string or ''. */
function carryOf(s, day, role) {
  const ep = epOf(s, s.calendar?.find((c) => c.day === day) || {})
  if (!ep) return null
  const first = (x) => String(x || '').replace(/^[-*\s]+/, '').split(String.fromCharCode(10))[0].trim()
  const ask = first(ep.talk || ep.questions?.[0])
  if ((role === 'parent' || role === 'family') && ask) return { label: CARRY.parent, text: ask }
  const move = first(ep.challenge || ep.apply?.[0])
  return move ? { label: CARRY.teen, text: move } : null
}
const TXT = {
  day: 'Day', xp: 'XP', streak: 'Streak', acc: 'Accuracy', days: 'days', dayOne: 'day', rank: 'Rank progress',
  open: 'Open now', share: 'Share', card: 'Code', gold: 'Gold card', shield: 'Shield earned', used: 'Shield used', miles: 'milestone',
  up: 'Rank', medal: 'medal', medals: 'medals', patch: 'Stage patch', frag: 'Patch fragment',
}

function earnedTags(r) {
  const out = []
  if (r.rank?.up) out.push({ id: 'rank', tone: 'ignite', icon: 'star', text: `${TXT.up}: ${r.rank.to.name}` })
  if (r.streak?.milestone) out.push({ id: 'mile', tone: 'ignite', icon: 'flame', text: `${r.streak.milestone}-${TXT.dayOne} ${TXT.miles}` })
  if (r.streak?.shieldEarned === 'shield') out.push({ id: 'shield', tone: 'tele', icon: 'shield', text: TXT.shield })
  else if (r.streak?.shieldUsed) out.push({ id: 'used', tone: 'tele', icon: 'shield', text: TXT.used })
  if (r.code?.isNew) out.push({ id: 'card', tone: r.code.rare ? 'gold' : 'neutral', icon: 'card', text: r.code.rare ? TXT.gold : `${TXT.card} ${r.code.no}` })
  if (r.drop?.kind === 'fragment') out.push({ id: 'frag', tone: 'gold', icon: 'patch', text: TXT.frag })
  if (r.stage?.clearedNow) out.push({ id: 'patch', tone: 'stage', icon: 'patch', text: `${TXT.patch} ${r.stage.n}` })
  const m = r.achievements?.length || 0
  if (m) out.push({ id: 'medals', tone: 'gold', icon: 'medal', text: `${m} ${m === 1 ? TXT.medal : TXT.medals}` })
  return out
}

export default function Actions({ result, s, day, active, share, onClose }) {
  const lite = useFxLevel() === 'lite'
  const st = useStore()
  const nx = result.next
  const unlockAt = nx?.unlockAt ? new Date(nx.unlockAt) : null
  const clock = useClock(unlockAt ? 1000 : 60000)
  const moment = useMemo(() => momentFor(result, s, day, st), [result, s, day, st.role])      // eslint-disable-line react-hooks/exhaustive-deps
  const nextCopy = useMemo(
    () => (nx?.day ? nextUpCopy({ day: nx.day, title: dayLabel(s, nx.day), unlockAt, now: clock, zone: zoneTag(clock) }, `${s.id}:${day}`) : null),
    [nx?.day, s, day, unlockAt && unlockAt.getTime(), clock.getDate()])                       // eslint-disable-line react-hooks/exhaustive-deps
  const msLeft = unlockAt ? unlockAt.getTime() - clock.getTime() : 0
  const waiting = nx?.mode === 'live' && unlockAt && msLeft > 0
  const tags = useMemo(() => earnedTags(result), [result])
  const carry = useMemo(() => carryOf(s, day, st.role), [s, day, st.role])

  const total = s.calendar?.length || result.month?.total || 0
  const k = result.streak?.to ?? 0
  const acc = result.asked > 0 ? Math.round((100 * result.right) / result.asked) : null
  const rank = result.rank?.to

  const [armed, setArmed] = useState(false)
  const go = useRef(null)
  useEffect(() => {
    if (!active) return undefined
    const t = setTimeout(() => setArmed(true), lite ? 200 : ARM)
    return () => clearTimeout(t)
  }, [active, lite])
  useEffect(() => { if (armed && active && go.current) go.current.focus({ preventScroll: true }) }, [armed, active])

  const streakData = useMemo(() => shareData('streak', st, s.id), [st, s.id])
  let i = 0
  const seq = () => ({ '--i': i++ })

  return (
    <section className="cmp-act" aria-label={moment.aria}>
      <div className="cmp-act__scroll">
        <header className="cmp-act__head cmp-rise" style={seq()}>
          <h2 className="cmp-act__title">{moment.title}</h2>
          <p className="cmp-act__line">
            <span>{moment.text.text}</span>
            {moment.text.ref ? <cite>{moment.text.ref}</cite> : null}
          </p>
        </header>

        <Panel tone="raised" cut padded pad="md" className="cmp-act__slab cmp-rise" style={seq()}>
          <div className="cmp-act__grid">
            <Stat size="sm" label={TXT.day} value={day} unit={total ? `/ ${total}` : undefined} />
            <Stat size="sm" label={TXT.xp} value={`+${result.xp?.total ?? 0}`} tone="tele" icon="bolt" />
            <Stat size="sm" label={TXT.streak} value={k} unit={k === 1 ? TXT.dayOne : TXT.days} tone="ignite" icon="flame" />
            <Stat size="sm" label={TXT.acc} value={acc == null ? '–' : acc} unit={acc == null ? undefined : '%'} tone={result.perfect ? 'go' : 'ink'} />
          </div>
          {rank ? (
            <div className="cmp-act__rank">
              <span>{rankLine(rank)}</span>
              <Progress value={rank.pct} tone="tele" height={4} glow={false} label={TXT.rank} />
            </div>
          ) : null}
        </Panel>

        {tags.length ? (
          <ul className="cmp-act__tags cmp-rise" style={seq()}>
            {tags.map((t) => <li key={t.id}><Tag tone={t.tone} icon={t.icon}>{t.text}</Tag></li>)}
          </ul>
        ) : null}

        {carry ? (
          <div className="cmp-act__next cmp-act__carry cmp-rise" style={seq()}>
            <p className="cmp-act__next-k">{carry.label}</p>
            <p className="cmp-act__carry-t">{carry.text}</p>
          </div>
        ) : null}

        {nextCopy ? (
          <div className="cmp-act__next cmp-rise" style={seq()} aria-label={nextCopy.aria}>
            <p className="cmp-act__next-k">{nextCopy.eyebrow}</p>
            <p className="cmp-act__next-t">{nextCopy.title}</p>
            <p className="cmp-act__next-w">
              <span>{nextCopy.when || TXT.open}</span>
              {waiting ? <b aria-hidden="true">{tMinus(msLeft)}</b> : null}
            </p>
          </div>
        ) : null}
      </div>

      <footer className="cmp-act__foot cmp-rise" style={seq()}>
        {k >= 1 ? <Button variant="secondary" size="lg" icon="share" onClick={() => share({ kind: 'streak', data: streakData })}>{TXT.share}</Button> : null}
        <Button variant="primary" size="lg" full ref={go} disabled={!armed} className="cmp-act__go" onClick={onClose}>{moment.cta}</Button>
      </footer>
    </section>
  )
}
