// Today — the three rings as instrument rows, then the daily chest (locked -> ready -> opened) and the midnight countdown.
// The chest is the one pressable object here: when all three rings are closed it glows, and a tap claims it.
import { useMemo, useRef, useState } from 'react'
import { claimObjective, objectives as objectivesOf, useClock, useStore, useToday } from '../../store.js'
import { msToMidnight } from '../../lib.js'
import { now } from '../../now.js'
import { chestCopy, coach, labels, objectives as copy, rewardCopy, ringCopy, toastCopy } from '../../copy.js'
import { Icon } from '../../icons.jsx'
import { Chest } from '../../art/index.js'
import { Panel, Progress, toast } from '../../ui/index.js'
import { fx } from '../../fx/fx.js'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'

const TONE = { lesson: 'ignite', xp: 'tele', right: 'go' }
const ICON = { lesson: 'book', xp: 'bolt', right: 'target' }
const pad = (n) => String(n).padStart(2, '0')

// Its own component: one re-render a second must not touch the rows or the chest.
function Reset() {
  const ms = msToMidnight(useClock(1000) && now())
  const t = Math.max(0, Math.floor(ms / 1000))
  const text = `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`
  return (
    <span className="obj-reset">
      <span aria-hidden="true">Resets in <time>{text}</time></span>
      <span className="obj-sr">Today’s rings reset at midnight.</span>
    </span>
  )
}

const rowTitle = (r) => (r.id === 'lesson' ? copy.lesson() : r.id === 'xp' ? copy.xp(r.goal) : copy.right(r.goal))

function Row({ r }) {
  const c = ringCopy(r)
  return (
    <li className="obj-row" data-ring={r.id} data-done={r.done ? '' : undefined} aria-label={`${rowTitle(r)}. ${c.aria}`}>
      <span className="obj-row-ico" aria-hidden="true"><Icon name={r.done ? 'check' : ICON[r.id]} size={20} weight={r.done ? 'line' : 'duo'} /></span>
      <span className="obj-row-title">{rowTitle(r)}</span>
      <span className="obj-row-val" aria-hidden="true"><b>{r.now}</b><em>/{r.goal}</em></span>
      <Progress className="obj-row-bar" value={r.value} tone={TONE[r.id]} height={6} label={c.label} />
    </li>
  )
}

function ChestCard({ chest, closed }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const { state, reward } = chest
  const ready = state === 'ready'
  const opened = state === 'opened'
  const done = opened ? chestCopy(reward || {}, chest.id) : null

  const claim = () => {
    if (!ready || busy) return
    setBusy(true)
    const res = claimObjective(chest.id)
    if (!res) { setBusy(false); return }
    const at = fx.at(ref.current)
    sound.play('chest'); haptic.success()
    fx.sparks({ ...at, n: 36, power: 1.1, spread: 360, angle: -90 })
    toast(toastCopy('chestOpened', { xp: res.reward.xp }, chest.id))
    if (res.rank?.up) toast(toastCopy('rankUp', { rank: res.rank.to.name }))
  }

  const title = opened ? done.title : ready ? copy.chest.ready : copy.chest.closed
  const body = opened ? done.text : ready ? 'Three rings closed. Tap to open today’s chest.' : coach.chest.body
  const El = ready ? 'button' : 'div'
  return (
    <Panel
      as={El} tone={ready ? 'ignite' : opened ? 'raised' : 'plate'} cut className="obj-chest" data-state={state}
      onClick={ready ? claim : undefined} disabled={ready ? busy : undefined}
      aria-label={ready ? `${copy.chest.ready}. ${body}` : undefined}
      aria-live={ready ? undefined : 'polite'}
    >
      <span ref={ref} className="obj-chest-art" aria-hidden="true">
        <Chest state={opened ? 'open' : 'closed'} tone={opened ? 'gold' : 'ignite'} size={96} decorative />
      </span>
      <span className="obj-chest-copy">
        <span className="obj-chest-eyebrow">{opened ? labels.objectives.today : 'Daily chest'}</span>
        <span className="obj-chest-title" data-reward={opened ? '' : undefined}>{title}</span>
        <span className="obj-chest-body">{body}</span>
        {state === 'locked' ? (
          <span className="obj-pips" aria-hidden="true">
            {[0, 1, 2].map((i) => <i key={i} className="obj-pip" data-on={i < closed ? '' : undefined} />)}
            <span className="obj-pips-n">{closed} / 3</span>
          </span>
        ) : null}
        {opened && reward ? <span className="obj-chest-reward">{rewardCopy(reward)}</span> : null}
      </span>
    </Panel>
  )
}

export default function Today({ s }) {
  const st = useStore()
  const day = useToday()
  const o = useMemo(() => objectivesOf(st, s.id).daily, [st, s.id, day])  // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="obj-sec" aria-labelledby="obj-today-h">
      <header className="obj-sec-head">
        <h2 className="obj-h2" id="obj-today-h">{labels.objectives.today}</h2>
        <Reset />
      </header>
      <ul className="obj-rows">{o.rings.map((r) => <Row key={r.id} r={r} />)}</ul>
      <ChestCard chest={o.chest} closed={o.closed} />
    </section>
  )
}
