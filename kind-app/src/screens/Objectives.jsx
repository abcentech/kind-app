// Objectives — the instrument panel. Composer only: each section reads the store itself and draws its own block.
// Order is the story: today's rings -> today's chest -> streak -> rank -> the month -> medals -> recap.
import { useShell } from '../shell.jsx'
import { useToday } from '../store.js'
import { fmtKey } from '../lib.js'
import { labels } from '../copy.js'
import { Label } from '../ui/index.js'
import Rings from './objectives/Rings.jsx'
import Today from './objectives/Today.jsx'
import Streak from './objectives/Streak.jsx'
import Rank from './objectives/Rank.jsx'
import Month from './objectives/Month.jsx'
import MedalsPreview from './objectives/MedalsPreview.jsx'
import Recap from './objectives/Recap.jsx'
// Styles load with the screen, not with the shell (first-load budget: docs/V7-DESIGN.md §10).
import '../styles/objectives.css'
import '../styles/objectives-streak.css'
import '../styles/objectives-month.css'

export default function Objectives() {
  const { s } = useShell()
  const day = useToday()
  return (
    <main className="obj-page" aria-labelledby="obj-title">
      <header className="obj-head">
        <Label as="h1" id="obj-title" mono size="md" dot tone="ink" className="obj-title">{labels.objectives.title}</Label>
        <span className="obj-date" aria-hidden="true">{fmtKey(day)}</span>
      </header>
      <Rings s={s} />
      <Today s={s} />
      <Streak s={s} />
      <Rank s={s} />
      <Month s={s} />
      <MedalsPreview s={s} />
      <Recap s={s} />
    </main>
  )
}
