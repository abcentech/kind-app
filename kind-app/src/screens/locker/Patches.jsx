// Locker · Patches — the shelf of every mission patch of every series, sewn onto the quilted page.
// Earned = in colour with the day it was finished; locked = greyscale with what it still takes. Tap one for the viewer sheet.
// Also hosts <TiltArt> (the slowly swaying, pointer/gyro-tilted showpiece the Medals viewer reuses) and the fragments row.
import { useMemo, useRef, useState } from 'react'
import { MissionPatch } from '../../art/index.js'
import { Label, Progress, Sheet } from '../../ui/index.js'
import { usePointerTilt } from '../../fx/motion.js'
import { useStore, patchShelf, fragmentState } from '../../store.js'
import { allSeries, getSeries, stageSlot, keyToDate } from '../../lib.js'
import { aria, emptyCopy, fmtDate, stageTag } from '../../copy.js'

const when = (key) => { try { return fmtDate(keyToDate(key)) } catch { return key } }
const toGo = (p) => (p.total ? `Clear Stage ${p.n} — ${p.total - p.done} of ${p.total} days to go` : `Stage ${p.n} is not open yet`)
const stageStyle = (i) => { const n = stageSlot(i); return { '--stage': `var(--stage-${n})`, '--stage-glow': `var(--stage-${n}-glow)` } }

/** A showpiece that tilts with the pointer / gyro (usePointerTilt writes --rx --ry --gx --gy --tilt-on) and sways while idle. */
export function TiltArt({ children, className = '', round = true, ...rest }) {
  const ref = useRef(null)
  usePointerTilt(ref, { max: 7, glare: true })
  return (
    <div ref={ref} className={`lck-tilt ${className}`} {...rest}>
      <div className="lck-tilt__sway">{children}</div>
      <i className="lck-tilt__glare" data-round={round ? '' : undefined} aria-hidden="true" />
    </div>
  )
}

function Fragments({ fr }) {
  const pips = Array.from({ length: fr.needed }, (_, i) => i < fr.toward)
  return (
    <section className="lck-frag" aria-labelledby="lck-frag-h">
      <div className="lck-frag__main">
        <Label id="lck-frag-h" mono size="sm">Patch fragments</Label>
        <p className="lck-frag__n" aria-label={`${fr.toward} of ${fr.needed} fragments`}>
          <b>{fr.toward}</b><span> / {fr.needed}</span>
        </p>
      </div>
      <ol className="lck-frag__pips" aria-hidden="true">
        {pips.map((on, i) => <li key={i} className="lck-pip" data-on={on ? '' : undefined} style={{ '--i': i }}><i /></li>)}
      </ol>
      <p className="lck-frag__note">
        A supply drop can hold a fragment. Five build a rare patch.
        {fr.patches > 0 ? <> <b className="lck-frag__rare">{fr.patches} rare {fr.patches === 1 ? 'patch' : 'patches'} assembled.</b></> : null}
      </p>
    </section>
  )
}

function Tile({ p, series, i, onOpen }) {
  const status = p.earned ? `Earned ${when(p.on)}` : toGo(p)
  const label = `${p.name}. ${aria.patch({ stage: p.n, earned: p.earned })} ${status}.`
  return (
    <li className="lck-cell" style={{ '--i': i }}>
      <button type="button" className="lck-patch" data-earned={p.earned ? '' : undefined} style={stageStyle(p.stage)} aria-label={label} onClick={() => onOpen(p)}>
        <span className="lck-patch__art"><MissionPatch series={series} stage={p.stage} state={p.earned ? 'earned' : 'locked'} size={112} decorative /></span>
        <span className="lck-patch__stage">{stageTag(p.n)}</span>
        <span className="lck-patch__name">{p.name}</span>
        {p.earned ? (
          <span className="lck-patch__meta" data-on="">{status}</span>
        ) : (
          <>
            <span className="lck-patch__meta">{status}</span>
            <span className="lck-meter" aria-hidden="true"><i style={{ '--p': p.total ? p.done / p.total : 0 }} /></span>
          </>
        )}
      </button>
    </li>
  )
}

function Viewer({ p, series }) {
  const status = p.earned ? `Earned ${when(p.on)}` : toGo(p)
  const week = series.weeks?.[p.stage] || {}
  return (
    <div className="lck-view" style={stageStyle(p.stage)}>
      <TiltArt className="lck-view__art" data-earned={p.earned ? '' : undefined}>
        <MissionPatch series={series} stage={p.stage} state={p.earned ? 'earned' : 'locked'} size={200} title={aria.patch({ stage: p.n, earned: p.earned })} />
      </TiltArt>
      <p className="lck-view__status" data-on={p.earned ? '' : undefined} role="status">{status}</p>
      {!p.earned && p.total ? <Progress value={p.done / p.total} stage={stageSlot(p.stage)} height={6} label={`${p.done} of ${p.total} days done`} className="lck-view__bar" /> : null}
      <h3 className="lck-view__title">{week.title || p.title}</h3>
      {week.question ? <p className="lck-view__q">{week.question}</p> : null}
      {week.passage ? <p className="lck-view__ref">{week.passage}</p> : null}
    </div>
  )
}

export default function Patches({ s }) {
  const st = useStore()
  const shelf = useMemo(() => patchShelf(st), [st])
  const fr = fragmentState(st)
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(null)
  const none = !shelf.some((p) => p.earned)
  const pick = (p) => { setSel(p); setOpen(true) }

  // the series you are flying first, then the rest
  const order = [...allSeries].sort((a, b) => (b.id === s?.id) - (a.id === s?.id))
  let n = 0
  const selSeries = sel ? getSeries(sel.seriesId) : null

  return (
    <div className="lck-tab">
      <Fragments fr={fr} />
      {none ? <p className="lck-hint">{emptyCopy('patches', st.salt).body}</p> : null}
      {order.map((ser) => {
        const rows = shelf.filter((p) => p.seriesId === ser.id)
        if (!rows.length) return null
        const got = rows.filter((p) => p.earned).length
        return (
          <section key={ser.id} className="lck-group" aria-label={ser.title}>
            <header className="lck-group__head">
              <Label mono size="sm" as="h2">{ser.title}</Label>
              <span className="lck-group__n" aria-label={`${got} of ${rows.length} earned`}>{got} / {rows.length}</span>
            </header>
            <ul className="lck-patches">
              {rows.map((p) => <Tile key={p.stage} p={p} series={ser} i={n++} onOpen={pick} />)}
            </ul>
          </section>
        )
      })}
      <Sheet open={open} onClose={() => setOpen(false)} eyebrow={sel ? `${stageTag(sel.n)} · ${sel.seriesTitle}` : undefined} title={sel ? sel.name : 'Patch'} detents={['auto']}>
        {sel && selSeries ? <Viewer p={sel} series={selSeries} /> : null}
      </Sheet>
    </div>
  )
}
