// locker-journal playground — the Journal tab in the real shell frame.
//   ?seed=0 (empty) | ?seed=15 (default, both series)   ?fx=lite   ?now=2026-08-12
import './locker-journal.seed.js'
import { mountScreen } from './_shell.jsx'
import { useShell } from '../src/shell.jsx'
import Journal from '../src/screens/locker/Journal.jsx'

function Screen() {
  const { s } = useShell()
  return <Journal s={s} />
}
mountScreen(<Screen />, { hud: null, dock: true, tab: 'locker' })
