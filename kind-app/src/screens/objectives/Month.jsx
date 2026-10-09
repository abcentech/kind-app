// Objectives · This month — the mission goals as a stack of instrument rows.
// Clear Stage N carries its own patch (earned from 'ready' on); the rest sit on a hex. A row is locked (a bar still filling),
// ready (CLAIM) or claimed (locked green). Progress counts up the first time the block is seen in a session, then rests.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../icons.jsx'
import { claimObjective, medals, objectives, useStore, markSeen } from '../../store.js'
import { fmtNum, labels, monthCompleteCopy, toastCopy } from '../../copy.js'
import { Button, Counter, Hex, Label, Panel, Progress, Tag, toast } from '../../ui/index.js'
import { MissionPatch, Trophy } from '../../art/index.js'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'
import { fx } from '../../fx/fx.js'
import { useInView } from '../../fx/motion.js'

// Blocks already counted up this session: coming back to the tab shows them at rest.
const counted = new Set()

/** useFirstView(key, enabled?) -> { ref, go, was }  go: start the count-up (in view); was: it already ran this session, render at rest. */
export function useFirstView(key, enabled = true) {
  const ref = useRef(null)
  const was = useRef(counted.has(key)).current
  const seen = useInView(ref, { once: true, threshold: 0.2 }) && enabled      // enabled: a collapsed block waits until it is opened
  useEffect(() => { if (seen) counted.add(key) }, [seen, key])
  return { ref, go: was || seen, was }
}

const stageOf = (n) => (n % 5) + 1

function Rewards({ reward = {}, dim }) {
  return (
    <ul className="obm-rewards" data-dim={dim ? '' : undefined} aria-label="Reward">
      {reward.xp ? <li className="obm-reward" data-k="xp"><Icon name="bolt" size={16} weight="solid" />+{fmtNum(reward.xp)} XP</li> : null}
      {reward.shield ? <li className="obm-reward" data-k="shield"><Icon name="shield" size={16} />Shield</li> : null}
      {reward.fragments ? <li className="obm-reward" data-k="frag"><Icon name="patch" size={16} />{reward.fragments > 1 ? `${reward.fragments} fragments` : 'Fragment'}</li> : null}
    </ul>
  )
}

function Row({ o, s, go, was, fresh, onClaim }) {
  const stageRow = o.kind === 'stage'
  const claimed = o.state === 'claimed'
  const ready = o.state === 'ready'
  const tone = claimed ? 'go' : ready ? (stageRow ? 'stage' : 'tele') : 'plate'
  const st = stageRow ? stageOf(o.stage) : undefined
  const pct = go ? o.pct : 0
  const stateWord = claimed ? 'claimed' : ready ? 'ready to claim' : 'in progress'
  return (
    <li className="obm-li">
      <Panel
        className="obm-row" tone={tone} stage={ready && stageRow ? st : undefined} cut={ready ? 'sm' : undefined}
        role="group" data-st={o.state} data-fresh={fresh ? '' : undefined}
        aria-label={`${o.title}. ${o.desc}. ${fmtNum(o.now)} of ${fmtNum(o.goal)}. ${stateWord}.`}
      >
        <div className="obm-thumb" aria-hidden="true">
          {stageRow
            ? <MissionPatch series={s} stage={o.stage} state={ready || claimed ? 'earned' : 'locked'} size={56} decorative />
            : <Hex size={52} state={ready ? 'current' : 'open'} tone={ready ? 'tele' : undefined}><Icon name={o.icon} size={20} /></Hex>}
        </div>
        <div className="obm-body">
          <div className="obm-top">
            <h3 className="obm-title">{o.title}</h3>
            {claimed
              ? <span className="obm-check" aria-hidden="true"><Icon name="check" size={16} weight="solid" /></span>
              : (
                <span className="obm-frac" aria-hidden="true">
                  <Counter value={go ? o.now : 0} animate={!was} duration={900} /><i>/</i>{fmtNum(o.goal)}
                </span>
              )}
          </div>
          <p className="obm-desc">{o.desc}</p>
          <Progress
            className="obm-bar" height={6} label={o.title} value={claimed ? 1 : pct} animate={!was}
            tone={claimed ? 'go' : 'tele'} stage={stageRow && !claimed ? st : undefined} glow={!claimed}
          />
          <div className="obm-foot">
            <Rewards reward={o.reward} dim={o.state === 'locked'} />
            {claimed ? <span className="obm-claimed">Claimed</span> : null}
          </div>
          {ready ? (
            <Button className="obm-claim" size="sm" full icon="unlock" onClick={(e) => onClaim(o, e.currentTarget)}>
              Claim
            </Button>
          ) : null}
        </div>
      </Panel>
    </li>
  )
}

export default function Month({ s }) {
  const st = useStore()
  const view = useMemo(() => objectives(st, s.id).mission, [st, s.id])
  const { ref, go, was } = useFirstView('month:' + s.id)
  const [fresh, setFresh] = useState(() => new Set())
  const [said, setSaid] = useState('')

  const total = view.length
  const claimed = view.filter((o) => o.state === 'claimed').length
  const ready = view.filter((o) => o.state === 'ready').length
  const complete = total > 0 && claimed === total
  const upNext = useMemo(() => {
    const open = view.filter((o) => o.state === 'locked')
    return open.sort((a, b) => b.pct - a.pct)[0]
  }, [view])

  // Long lists fold: claimable rows and the three closest locked ones stay up; claimed rows and the far ones fold away.
  const [all, setAll] = useState(false)
  const foldable = total > 5
  const shown = useMemo(() => {
    if (!foldable || all) return view
    const near = new Set(view.filter((o) => o.state === 'locked').sort((a, b) => b.pct - a.pct).slice(0, 3).map((o) => o.id))
    return view.filter((o) => o.state === 'ready' || near.has(o.id) || fresh.has(o.id))
  }, [view, foldable, all, fresh])

  const onClaim = (o, btn) => {
    const at = fx.at(btn)
    const r = claimObjective(o.id)
    if (!r) return
    sound.play('unlock'); haptic.success()
    fx.sparks({ ...at, n: 34, power: 1.1, gravity: 0.7, colors: o.kind === 'stage' ? undefined : ['tele', 'ignite'] })
    toast(toastCopy('objectiveClaimed', { reward: r.reward, title: o.title }, o.id))
    const all = medals(st)
    for (const id of (r.achievements || []).slice(0, 2)) toast({ ...toastCopy('medalEarned', { title: all.find((m) => m.id === id)?.title || '' }, id), key: 'medal:' + id })
    if (r.achievements?.length) markSeen(r.achievements)
    if (r.rank?.up) toast(toastCopy('rankUp', { rank: r.rank.to.name }, o.id))
    setFresh((f) => new Set(f).add(o.id))
    setSaid(`${o.title} claimed.`)
  }

  const finale = complete ? monthCompleteCopy(s) : null
  return (
    <section className="obm-sec obm-month" ref={ref} aria-labelledby="obm-month-h" data-complete={complete ? '' : undefined}>
      <header className="obm-head">
        <div className="obm-head-l">
          <Label tone={complete ? 'gold' : 'tele'} mono size="md">{labels.objectives.month} · {s.month} {s.year}</Label>
          <h2 className="obm-h" id="obm-month-h">Mission objectives</h2>
          <p className="obm-sub">
            {complete ? 'Every objective claimed.'
              : ready ? `${ready} ready to claim.`
              : upNext ? `Next: ${upNext.title}, ${fmtNum(upNext.goal - upNext.now)} to go.` : 'Nothing to claim yet.'}
          </p>
        </div>
        <div className="obm-tally" aria-label={`${claimed} of ${total} claimed`}>
          <span className="obm-tally-n" aria-hidden="true"><Counter value={go ? claimed : 0} animate={!was} format={(n) => String(n).padStart(2, '0')} /></span>
          <span className="obm-tally-of" aria-hidden="true">/ {String(total).padStart(2, '0')}</span>
        </div>
      </header>

      <ul className="obm-list">
        {shown.map((o) => <Row key={o.id} o={o} s={s} go={go} was={was} fresh={fresh.has(o.id)} onClaim={onClaim} />)}
      </ul>
      {foldable && (shown.length < total || all) ? (
        <Button className="obm-fold" variant="secondary" size="md" full aria-expanded={all} iconRight={all ? 'chevronUp' : 'chevronDown'} onClick={() => setAll((v) => !v)}>
          {all ? 'Show fewer' : `Show all ${total} objectives`}
        </Button>
      ) : null}

      {finale ? (
        <Panel className="obm-finale" tone="raised" cut>
          <Trophy size={72} />
          <div className="obm-finale-t">
            <Tag tone="gold">{finale.eyebrow}</Tag>
            <h3 className="obm-finale-h">{finale.title}</h3>
            <p className="obm-finale-p">{finale.text}</p>
          </div>
        </Panel>
      ) : null}
      <p className="u-sr" role="status" aria-live="polite">{said}</p>
    </section>
  )
}
