// Node — one day on the climb: a bevelled <Hex> + a telemetry label. States come straight from dayState():
//   done     stage-tinted (gold if it minted a gold card), a check          current  large, ignition ring that pulses, the rocket perched above
//   open     carbon + numeral (archive: everything)                          rare     gold hex + numeral (a gold card waits behind it)
//   locked   carbon + padlock, mono "Unlocks Wed 12 Aug"                     marks    intro flag · selah star · celebration trophy (a chip on the hex)
// "Here" is the day the rocket sits on (j.currentDay). It is also the node when that day is already done (rocket parked, no flame)
// and day 1 before a mission opens (rocket on the pad, engines off).
// The hex is the only button; a ::after stretches its hit area over the label. Geometry for the curve is read from [data-pt].
import { memo } from 'react'
import { Hex } from '../../ui/index.js'
import { Rocket } from '../../art/index.js'
import { Icon } from '../../icons.jsx'
import { aria, fmtDate, labels } from '../../copy.js'

const SIZE = { node: 72, here: 96 }          // hex widths (px): the Hex API takes numbers
const ROCKET = 92                            // px tall; the plume spills below
const MARK = { intro: 'flag', selah: 'star', celebration: 'trophy' }
const KIND = { intro: labels.learn.intro, selah: labels.learn.selah, celebration: labels.learn.finale }
const HEX_PTS = '50,0 100,28.87 100,86.6 50,115.47 0,86.6 0,28.87'   // the Hex outline in its own 100 x 115.47 box

const same = (a, b) =>
  a.here === b.here && a.live === b.live && a.f === b.f && a.tilt === b.tilt && a.onOpen === b.onOpen &&
  a.n.day === b.n.day && a.n.state === b.n.state && a.n.rare === b.n.rare && a.n.title === b.n.title &&
  a.n.published === b.n.published && (a.n.unlockAt?.getTime() ?? 0) === (b.n.unlockAt?.getTime() ?? 0)

const Node = memo(function Node({ n, here, live, f, tilt, onOpen }) {
  const locked = n.state === 'locked'
  const state = n.rare && n.state === 'open' ? 'rare' : n.state
  const tone = n.state === 'done' ? (n.rare ? 'gold' : 'stage') : undefined
  const size = here ? SIZE.here : SIZE.node
  const kind = KIND[n.type]
  const mark = MARK[n.type]
  const sub = !n.published ? 'Coming soon' : locked ? (n.unlockAt ? `Unlocks ${fmtDate(n.unlockAt)}` : 'Locked') : ''
  const today = here && live && n.state === 'current'
  const name = aria.day({
    day: n.day, title: locked ? '' : n.title, date: n.unlockAt,
    state: locked ? 'locked' : n.state === 'done' ? 'done' : today ? 'today' : n.rare ? 'rare' : 'open',
  })

  return (
    <div className="learn-node" data-state={n.state} data-type={n.type}>
      <div className="learn-hexwrap" data-pt={'d' + n.day} data-f={f} data-here={here ? '' : undefined} style={{ width: size }}>
        <Hex
          className="learn-hex" size={size} state={state} tone={tone} ring={here && n.state === 'current' ? true : undefined}
          aria-label={name} onClick={(e) => onOpen(n, e.currentTarget)}
        >
          {locked || n.state === 'done' ? undefined : n.day}
        </Hex>
        {here && n.state === 'current' ? (
          <svg className="learn-pulse" viewBox="0 0 100 115.47" aria-hidden="true" focusable="false">
            <polygon points={HEX_PTS} /><polygon points={HEX_PTS} />
          </svg>
        ) : null}
        {mark ? <span className="learn-mark" data-kind={n.type} aria-hidden="true"><Icon name={mark} size={16} weight="solid" /></span> : null}
        {here ? (
          <div className="learn-rocket" aria-hidden="true">
            <Rocket size={ROCKET} flame={n.state === 'current' ? 'idle' : 'off'} tilt={tilt} float={n.state === 'current'} />
          </div>
        ) : null}
      </div>
      <span className="learn-label" aria-hidden="true">
        <span className="learn-label__day">
          {`Day ${n.day}`}{kind ? ` · ${kind}` : ''}{today ? ` · ${labels.learn.today}` : ''}
          {n.rare && !locked ? <Icon name="star" size={16} weight="solid" className="learn-label__gold" /> : null}
        </span>
        {sub ? <span className="learn-label__sub">{sub}</span> : <span className="learn-label__title">{n.title}</span>}
      </span>
    </div>
  )
}, same)

export default Node
