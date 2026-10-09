// me-settings playground: the Settings section inside the real shell frame, scrolling like it will on Me.
//   ?fx=lite  ?now=2026-08-12   — and window.__mes exposes the store/prefs verbs for round-trip checks.
import { mountScreen } from './_shell.jsx'
import Settings from '../src/screens/me/Settings.jsx'
import { exportProgress, importProgress, snapshot } from '../src/store.js'
import { prefs } from '../src/prefs.js'
import { getSeries, activeSeriesId } from '../src/lib.js'

window.__mes = { exportProgress, importProgress, snapshot, prefs }

function Page() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 'var(--s-6) var(--s-4) calc(var(--s-20) + var(--sab))' }} data-testid="mes-scroll">
      <Settings s={getSeries(activeSeriesId())} />
    </div>
  )
}

mountScreen(<Page />, { tab: 'me', dock: true, bare: true })
