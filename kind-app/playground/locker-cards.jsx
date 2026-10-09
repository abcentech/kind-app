// locker-cards playground — only the Cards tab, in the real shell frame.
//   ?seed=0 | 12 (default: 10 plain + 2 gold) | all        ?series=secrets-of-longevity      ?fx=lite
import { mountScreen } from './_shell.jsx'
import { activeSeriesId, getSeries } from '../src/lib.js'
import { snapshot } from '../src/store.js'
import Cards from '../src/screens/locker/Cards.jsx'

const q = new URLSearchParams(location.search)
const sid = q.get('series') || activeSeriesId()
const seed = q.get('seed') || '12'
const codes = getSeries(sid).codes
let pick = []
if (seed === 'all') pick = codes
else if (seed !== '0') {
  const gold = codes.filter((c) => c.rare).slice(0, 2)
  pick = [...codes.filter((c) => !c.rare).slice(0, Number(seed) - gold.length), ...gold]
}
const done = {}
pick.forEach((c) => { done[c.day] = '2026-08-10' })
const cur = snapshot()
window.__kind.set({ onboarded: true, name: 'Ada', series: { ...cur.series, [sid]: { ...(cur.series?.[sid] || {}), done, cards: pick.map((c) => c.no) } } })

function Screen() {
  const s = getSeries(sid)
  return (
    <div style={{ paddingTop: 'calc(var(--sat) + var(--s-4))' }}>
      <Cards s={s} />
    </div>
  )
}
mountScreen(<Screen />, { bare: true, dock: true, tab: 'locker' })
