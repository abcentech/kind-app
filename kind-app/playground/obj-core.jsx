// obj-core playground — the Objectives screen in the real shell frame, HUD and dock on.
//   /playground/obj-core.html?seed=new|mid|closed|opened   &goal=20|40|60   &series=secrets-of-longevity   &now=2026-08-12   &fx=lite
//   &seen=1 (with seed=closed) marks the ring ceremonies as already played today.
import { mountScreen } from './_shell.jsx'
import Objectives from '../src/screens/Objectives.jsx'
import Hud from '../src/screens/Hud.jsx'

mountScreen(<Objectives />, { hud: Hud, dock: true, tab: 'objectives' })
