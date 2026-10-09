// Objectives · Rank — the insignia you hold, the climb to the next, and the whole ladder in a sheet.
// Reads xp from the store; everything else is derived by rankFor(). The section pads nothing horizontally: the composer owns the gutter.
import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '../../icons.jsx'
import { RankInsignia } from '../../art/index.js'
import { Button, Counter, Label, Panel, Progress, Sheet } from '../../ui/index.js'
import { useInView } from '../../fx/motion.js'
import { RANKS, rankFor, useStore } from '../../store.js'
import { rankUpCopy } from '../../copy.js'

const nf = new Intl.NumberFormat('en-US')

function Ladder({ xp, cur }) {
  const here = useRef(null)
  useEffect(() => {
    const t = setTimeout(() => { try { here.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) } catch { /* old webviews */ } }, 480)
    return () => clearTimeout(t)
  }, [])
  // Top of the ladder first: you climb upward, like the Learn screen.
  const rows = RANKS.slice().reverse()
  return (
    <ol className="obs-ladder">
      {rows.map((r) => {
        const state = r.index < cur ? 'earned' : r.index === cur ? 'current' : 'ahead'
        const togo = Math.max(0, r.xp - xp)
        return (
          <li
            key={r.id}
            ref={state === 'current' ? here : undefined}
            className="obs-rung"
            data-state={state}
            data-first={r.index === RANKS.length - 1 ? '' : undefined}
            data-last={r.index === 0 ? '' : undefined}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="obs-rung__badge"><RankInsignia rank={r.index} size={64} decorative /></span>
            <span className="obs-rung__text">
              <span className="obs-rung__name">{r.name}</span>
              <span className="obs-rung__ref">{r.ref}</span>
              <span className="obs-tele">{nf.format(r.xp)} XP</span>
            </span>
            <span className="obs-rung__state" data-state={state}>
              {state === 'earned' ? <><Icon name="check" size={16} /><span className="obs-tele">EARNED</span></> : null}
              {state === 'current' ? <span className="obs-rung__here">YOU ARE HERE</span> : null}
              {state === 'ahead' ? <span className="obs-tele">{nf.format(togo)} TO GO</span> : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default function Rank({ s }) { // eslint-disable-line no-unused-vars
  const st = useStore()
  const r = rankFor(st.xp)
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '0px 0px -8% 0px' })
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const dek = rankUpCopy(r).text
  const target = r.next ? r.next.xp : r.xp
  return (
    <section ref={ref} className="obs obs-rank" aria-labelledby={titleId} data-max={r.max ? '' : undefined}>
      <div className="obs-stage">
        <i className="obs-stage__halo" aria-hidden="true" />
        <i className="obs-stage__orbit" aria-hidden="true" />
        <div className="obs-insignia" data-in={inView ? '' : undefined}>
          <RankInsignia rank={r.index} size={136} title={`${r.name} insignia`} />
        </div>
      </div>

      <header className="obs-rankhead">
        <Label mono>RANK {r.index + 1} / {RANKS.length}</Label>
        <h2 id={titleId} className="obs-rankname">{r.name}</h2>
        <p className="obs-ref">{r.ref}</p>
        <p className="obs-dek">{dek}</p>
      </header>

      <Panel className="obs-climb">
        <div className="obs-climb__row">
          <Label>{r.max ? 'Top of the ladder' : `Toward ${r.next.name}`}</Label>
          <span className="obs-xp">
            <Counter key={inView ? 'in' : 'pre'} value={r.xp} animate={inView} data-armed={inView ? 'true' : 'false'} />
            {r.max ? ' XP' : <> / {nf.format(target)} XP</>}
          </span>
        </div>
        <Progress
          label={r.max ? 'Top rank reached' : `Progress to ${r.next.name}`}
          value={inView ? r.pct : 0}
          tone={r.max ? 'gold' : 'tele'}
          height={10}
        />
        <p className="obs-tele obs-climb__note">
          {r.max ? 'FULL ASCENT' : `${nf.format(r.toNext)} XP TO ${r.next.name.toUpperCase()}`}
        </p>
      </Panel>

      <Button variant="secondary" size="md" full icon="medal" onClick={() => setOpen(true)} aria-haspopup="dialog">See all ranks</Button>

      <Sheet open={open} onClose={() => setOpen(false)} title="All ranks" eyebrow={`THE LADDER · ${RANKS.length} RANKS`} detents={['full']}>
        <Ladder xp={r.xp} cur={r.index} />
      </Sheet>
    </section>
  )
}
