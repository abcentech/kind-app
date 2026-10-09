// Locker — the trophy case. A title row, a sticky Segmented (Cards · Patches · Medals · Journal) and the active tab body.
// Each body default-exports Tab({ s }). Deep links (Complete → "see your medals") leave sessionStorage['kind-locker-seg']; it is
// read once and cleared the moment the Locker shows. The last segment is remembered in memory only, so a cold start is on Cards.
import { useEffect, useMemo, useState } from 'react'
import { useShell } from '../shell.jsx'
import { Label, Segmented } from '../ui/index.js'
import { useStore, patchShelf, medals } from '../store.js'
import { labels } from '../copy.js'
import Cards from './locker/Cards.jsx'
import Patches from './locker/Patches.jsx'
import Medals from './locker/Medals.jsx'
import Journal from './locker/Journal.jsx'
// Styles load with the screen, not with the shell (first-load budget: docs/V7-DESIGN.md §10).
import '../styles/locker.css'
import '../styles/locker-cards.css'
import '../styles/locker-journal.css'

const KEY = 'kind-locker-seg'
const BODIES = { cards: Cards, patches: Patches, medals: Medals, journal: Journal }
let last = 'cards'

/** The deep-linked segment, if one was left for us (and clear it). Remembers it so a StrictMode double-init agrees with itself. */
function take() {
  let v = null
  try {
    v = sessionStorage.getItem(KEY)
    if (v != null) sessionStorage.removeItem(KEY)
  } catch { /* storage can be blocked: the Locker still works */ }
  if (v && BODIES[v]) { last = v; return v }
  return null
}

export default function Locker() {
  const { s, tab } = useShell()
  const st = useStore()
  const [seg, setSeg] = useState(() => take() || last)

  // The Locker stays mounted while another tab is showing; a deep link may arrive while it is hidden.
  useEffect(() => {
    if (tab != null && tab !== 'locker') return
    const v = take()
    if (v) setSeg(v)
  }, [tab])

  const shelf = useMemo(() => patchShelf(st), [st])
  const all = useMemo(() => medals(st), [st])
  const patchesOn = shelf.filter((p) => p.earned).length
  const medalsOn = all.filter((m) => m.earned).length
  const fresh = all.filter((m) => m.isNew).length

  const pick = (id) => { last = id; setSeg(id) }
  const Body = BODIES[seg] || Cards
  const L = labels.locker
  const options = [
    { id: 'cards', label: L.cards },
    { id: 'patches', label: L.patches },
    {
      id: 'medals',
      label: (
        <>
          {labels.objectives.medals}
          {fresh ? <><i className="lck-dot" aria-hidden="true" /><span className="u-sr"> ({fresh} new)</span></> : null}
        </>
      ),
    },
    { id: 'journal', label: L.journal },
  ]

  return (
    <main className="lck" data-seg={seg}>
      <header className="lck-head">
        <div className="lck-head__t">
          <Label mono size="sm" tone="tele">Your collection</Label>
          <h1 className="lck-title t-display-sm">{L.title}</h1>
        </div>
        <dl className="lck-read" aria-label="Collected">
          <div><dt>Patches</dt><dd>{patchesOn} / {shelf.length}</dd></div>
          <div><dt>Medals</dt><dd>{medalsOn} / {all.length}</dd></div>
        </dl>
      </header>

      <div className="lck-bar">
        <Segmented options={options} value={seg} onChange={pick} label="Locker section" />
      </div>

      <div className="lck-body" key={seg}>
        <Body s={s} />
      </div>
    </main>
  )
}
