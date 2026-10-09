// learn-hud · XpSheet — where your XP stands: the rank you hold, the climb to the next, today's burn against your daily goal,
// the whole ladder (Pioneer at the top — it is an ascent), and what earns XP. Props: { open, onClose }.
import { Sheet, Counter, Progress, Tag } from '../../ui/index.js'
import { RankInsignia } from '../../art/index.js'
import { Icon } from '../../icons.jsx'
import { MILESTONE_XP, RANKS, XP, rankFor, rings, useStore } from '../../store.js'
import { fmtNum, rankLine } from '../../copy.js'
import { Section, pad2 } from './parts.jsx'

const EARN = [
  ['Right first try', `+${XP.answer}`],
  ['Finish a new day', `+${XP.complete}`],
  ['Perfect lesson', `+${XP.perfect}`],
  ['Gold card day', `+${XP.rare}`],
  ['Streak milestones', `from +${MILESTONE_XP[3]}`],
]

function Ladder({ cur }) {
  const top = RANKS.length - 1
  return (
    <ol className="hud-ladder" aria-label="Rank ladder, highest first">
      {RANKS.slice().reverse().map((r) => {
        const state = r.index < cur.index ? 'passed' : r.index === cur.index ? 'current' : 'ahead'
        return (
          <li
            key={r.id} className="hud-rung" data-state={state}
            data-up={r.index < cur.index ? '' : undefined} data-down={r.index <= cur.index ? '' : undefined}
            data-top={r.index === top ? '' : undefined} data-base={r.index === 0 ? '' : undefined}
            aria-current={state === 'current' ? 'true' : undefined}
          >
            <span className="hud-rung__ins"><RankInsignia rank={r.index} size={44} decorative /></span>
            <span className="hud-rung__txt">
              <span className="hud-rung__name">{r.name}</span>
              <span className="hud-rung__xp">{fmtNum(r.xp)} XP</span>
              <span className="hud-rung__ref">{r.ref}</span>
            </span>
            <span className="hud-rung__end">
              {state === 'passed' ? <Icon.check size={20} title="Reached" className="hud-rung__tick" /> : null}
              {state === 'current' ? <Tag tone="tele">You</Tag> : null}
              {state === 'ahead' && cur.next && r.index === cur.next.index ? <span className="hud-rung__to">{fmtNum(cur.toNext)} to go</span> : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default function XpSheet({ open, onClose }) {
  const st = useStore()
  const info = rankFor(st.xp)
  const goal = rings(st)[1]
  const next = info.next
  return (
    <Sheet open={open} onClose={onClose} title="XP and rank" eyebrow={`RANK ${pad2(info.index + 1)} / ${pad2(RANKS.length)}`} detents={['half', 'full']}>
      <div className="hud-sheet hud-xp">
        <section className="hud-hero" aria-label={`${info.name}, ${fmtNum(st.xp)} XP`}>
          <div className="hud-hero__ins"><RankInsignia rank={info.index} size={112} decorative /></div>
          <div className="hud-hero__read">
            <span className="hud-rank">{info.name}</span>
            <div className="hud-bigxp"><Counter value={st.xp} from={0} /><small>XP</small></div>
            <span className="hud-ref">{info.ref}</span>
          </div>
        </section>

        <div className="hud-climb">
          <Progress value={info.pct} tone="tele" height={10} label={next ? `Progress to ${next.name}` : 'Top rank reached'} />
          <p className="hud-climb__sub">{rankLine(info)}</p>
        </div>

        <div className="hud-card hud-burn" data-done={goal.done || undefined}>
          <div className="hud-burn__head">
            <span className="hud-burn__k">Today’s burn</span>
            <span className="hud-burn__v">
              {goal.done ? <Icon.check size={16} /> : null}
              {fmtNum(goal.now)} / {fmtNum(goal.goal)} XP
            </span>
          </div>
          <Progress value={goal.value} tone={goal.done ? 'go' : 'ignite'} height={6} glow={false} label={`Daily goal, ${goal.now} of ${goal.goal} XP`} />
        </div>

        <Section title="The ladder" aside={`${info.index + 1} of ${RANKS.length}`}>
          <Ladder cur={info} />
        </Section>

        <Section title="Earn XP">
          <dl className="hud-earn">
            {EARN.map(([k, v]) => (
              <div className="hud-earn__row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </Section>
      </div>
    </Sheet>
  )
}
