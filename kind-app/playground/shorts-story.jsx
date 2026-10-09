// shorts-story playground — ?n=11&series=secrets-of-longevity&fx=lite&active=0&long=1  (long=1 swaps in a 400-char hook)
import { mountScreen } from './_shell.jsx'
import { getSeries, activeSeriesId } from '../src/lib.js'
import Story from '../src/screens/shorts/Story.jsx'

const q = new URLSearchParams(location.search)
const s = getSeries(q.get('series') || activeSeriesId())
let short = s.shorts.find((x) => x.n === Number(q.get('n') || 4)) || s.shorts[0]
if (q.get('long')) short = { ...short, hook: (short.hook + ' ').repeat(3).trim(), truth: (short.truth + ' ').repeat(2).trim() }
const dayOf = q.get('day') === '0' ? 0 : s.calendar.find((d) => d.episode === short.n)?.day || 12
window.__done = 0

function Page() {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Story short={short} s={s} day={dayOf} active={q.get('active') !== '0'} onDone={() => { window.__done++; console.log('onDone') }} />
    </div>
  )
}
mountScreen(<Page />, { bare: true, tab: 'shorts' })
