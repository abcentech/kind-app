// Objectives · Medals — the case in miniature: the latest six earned on a shelf, the three closest to done in progress rings.
import { useMemo } from 'react'
import { medals, nextMedals, useStore } from '../../store.js'
import { aria, emptyCopy, fmtNum, labels } from '../../copy.js'
import { Button, Counter, Label, Panel, Ring, Tag } from '../../ui/index.js'
import { Medal } from '../../art/index.js'
import { useShell } from '../../shell.jsx'
import { useFirstView } from './Month.jsx'

const RING_TONE = { bronze: 'ignite', silver: 'tele', gold: 'gold', ti: 'tele' }
const fmtOn = (k) => (k ? new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '')

export default function MedalsPreview() {
  const st = useStore()
  const { goTab } = useShell()
  const { ref, go, was } = useFirstView('medals')
  const all = useMemo(() => medals(st), [st])
  const earned = useMemo(
    () => all.map((m, i) => ({ ...m, i })).filter((m) => m.earned)
      .sort((a, b) => (b.on || '').localeCompare(a.on || '') || b.i - a.i).slice(0, 6),
    [all],
  )
  const next = useMemo(() => nextMedals(st, 3), [st])
  const total = all.length
  const have = all.filter((m) => m.earned).length
  const empty = useMemo(() => emptyCopy('medals', 'obm'), [])

  const seeAll = () => {
    try { sessionStorage.setItem('kind-locker-seg', 'medals') } catch { /* private mode: the Locker opens on its default tab */ }
    goTab('locker')
  }

  return (
    <section className="obm-sec obm-medals" ref={ref} aria-labelledby="obm-medals-h">
      <header className="obm-head">
        <div className="obm-head-l">
          <Label tone="gold" mono size="md">{labels.objectives.medals}</Label>
          <h2 className="obm-h" id="obm-medals-h">Latest medals</h2>
        </div>
        <div className="obm-tally" aria-label={`${have} of ${total} medals earned`}>
          <span className="obm-tally-n" aria-hidden="true"><Counter value={go ? have : 0} animate={!was} format={(n) => String(n).padStart(2, '0')} /></span>
          <span className="obm-tally-of" aria-hidden="true">/ {String(total).padStart(2, '0')}</span>
        </div>
      </header>

      {earned.length ? (
        <ul className="obm-shelf" aria-label="Latest earned medals" tabIndex={0}>
          {earned.map((m) => (
            <li className="obm-medal" key={m.id}>
              <span className="obm-medal-art">
                <Medal id={m.id} tier={m.tier} earned size={72} title={aria.medal({ title: m.title, earned: true, tier: m.tier })} />
                {m.isNew ? <Tag className="obm-new" tone="ignite" led={false}>New</Tag> : null}
              </span>
              <span className="obm-medal-t">{m.title}</span>
              <span className="obm-medal-d">{fmtOn(m.on)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="obm-none">
          <ul className="obm-ghosts" aria-hidden="true">
            {all.slice(0, 3).map((m) => <li key={m.id}><Medal id={m.id} tier={m.tier} earned={false} size={56} decorative /></li>)}
          </ul>
          <p className="obm-none-t">{empty.title}</p>
          <p className="obm-none-b">{empty.body}</p>
        </div>
      )}

      {next.length ? (
        <div className="obm-next">
          <Label size="sm" mono tone="ink-2">Next up</Label>
          <ul className="obm-next-grid">
            {next.map((m) => (
              <Panel as="li" pad="sm" className="obm-up" key={m.id} aria-label={`${m.title}, ${m.tier}. ${fmtNum(m.progress.now)} of ${fmtNum(m.progress.goal)}.`}>
                <Ring value={go ? m.ratio : 0} animate={!was} size={84} stroke={5} tone={RING_TONE[m.tier] || 'tele'} glow={m.ratio > 0.5} label={m.title}>
                  <Medal id={m.id} tier={m.tier} earned={false} ribbon={false} size={50} decorative />
                </Ring>
                <span className="obm-up-t">{m.title}</span>
                <span className="obm-up-n" aria-hidden="true"><Counter value={go ? m.progress.now : 0} animate={!was} />/{fmtNum(m.progress.goal)}</span>
              </Panel>
            ))}
          </ul>
        </div>
      ) : null}

      <Button className="obm-all" variant="secondary" size="md" full iconRight="chevronRight" onClick={seeAll}>See all medals</Button>
    </section>
  )
}
