// obj-month playground — the three sections stacked the way the composer will (--s-8 gaps), inside the real shell frame.
//   ?now=2026-08-15 (Saturday)  ?series=secrets-of-longevity  ?fx=lite
import { mountScreen } from './_shell.jsx'
import { useShell } from '../src/shell.jsx'
import Month from '../src/screens/objectives/Month.jsx'
import MedalsPreview from '../src/screens/objectives/MedalsPreview.jsx'
import Recap from '../src/screens/objectives/Recap.jsx'

function Stack() {
  const { s } = useShell()
  return (
    <div data-testid="stack" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-8)', padding: '0 var(--s-4)' }}>
      <Month s={s} />
      <MedalsPreview s={s} />
      <Recap s={s} />
    </div>
  )
}
mountScreen(<Stack />, { hud: null, dock: true, tab: 'objectives' })
