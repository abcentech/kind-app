// Launch Bar specimen: the bar over a dummy tall scroller, in the real shell frame, seeded per scenario.
//   ?scn=ready|progress|atRisk|waiting|locked|archive|complete|upcoming|first|missed|shield|selah|catchup|finale|parent
//   (each scenario carries its own ?now= and ?series=; ?fx=lite works too). Seeding writes demo progress to this origin's store.
import './learn-launch.css'
import { mountScreen } from './_shell.jsx'
import LaunchBar from '../src/screens/LaunchBar.jsx'
import { dev, setPos } from '../src/store.js'
import { activeSeriesId } from '../src/lib.js'
import { now } from '../src/now.js'

const DAY = 864e5
export const SCENARIOS = {
  ready:    { now: '2026-08-12', seed: 'mid' },
  progress: { now: '2026-08-12', seed: 'mid', pos: 3 },
  atRisk:   { now: '2026-08-12T20:30', seed: 'mid' },
  waiting:  { now: '2026-08-12', seed: 'done-today' },
  locked:   { now: '2026-08-12T05:10', seed: 'mid' },
  archive:  { now: '2026-10-08', seed: 'mid' },
  complete: { now: '2026-10-08', seed: 'veteran' },
  upcoming: { now: '2026-07-20', series: 'stewardship-code', seed: 'fresh' },
  first:    { now: '2026-08-12', seed: 'fresh' },
  missed:   { now: '2026-08-12', seed: 'lost' },
  shield:   { now: '2026-08-12', seed: 'mid', back: 1, shields: 1 },
  selah:    { now: '2026-08-09', seed: 'mid' },
  catchup:  { now: '2026-08-14', seed: 'mid', back: 2, shields: 0 },
  finale:   { now: '2026-08-31', seed: 'mid' },
  parent:   { now: '2026-08-12', seed: 'mid', role: 'parent' },
}

const q = new URLSearchParams(location.search)
const scn = q.get('scn')
const def = SCENARIOS[scn]

if (def && !q.has('now')) {
  // each scenario knows its own clock (and series): add them and reload once
  const u = new URL(location.href)
  u.searchParams.set('now', def.now)
  if (def.series && !u.searchParams.has('series')) u.searchParams.set('series', def.series)
  location.replace(u.toString())
} else {
  if (def) {
    const sid = q.get('series') || activeSeriesId()
    dev.seed(def.seed, { seriesId: sid, ...(def.back ? { at: new Date(now().getTime() - def.back * DAY) } : {}) })
    const patch = {}
    if (def.shields != null) patch.shields = def.shields
    if (def.role) patch.role = def.role
    if (Object.keys(patch).length) dev.set(patch)
    if (def.pos) {
      // the first open day of the series is the one the bar offers: mark a few steps done on it
      const day = Number(window.__launchDay || 12)
      setPos(sid, day, def.pos)
    }
  }
  mountScreen(<Stage />, { dock: true, bare: true })
}

function Stage() {
  return (
    <div className="pg-stage">
      <div className="pg-scroll">
        <p className="pg-h">launch bar · {scn || 'no scenario (store as-is)'}</p>
        <nav className="pg-menu" aria-label="Scenarios">
          {Object.keys(SCENARIOS).map((k) => (
            <a key={k} href={`?scn=${k}`} aria-current={k === scn ? 'page' : undefined}>{k}</a>
          ))}
        </nav>
        {Array.from({ length: 22 }, (_, i) => (
          <div className="pg-row" key={i}><b>NODE {String(i + 1).padStart(2, '0')}</b><span>dummy path content</span></div>
        ))}
      </div>
      <LaunchBar />
    </div>
  )
}
