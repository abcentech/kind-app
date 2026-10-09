// learn-path playground — the Ascent in the real shell frame (HUD + dock + the real store).
//   ?now=2026-08-12   live, mid-August        (none)  archive, 8 Oct 2026        ?series=secrets-of-longevity   the other series
//   ?fx=lite          lite                    ?now=2026-07-20&series=stewardship-code   upcoming
// Seed progress with tools/browser.mjs open({ state: { series: { 'stewardship-code': { done: { 1: '2026-08-01', … } } } } }).
import { mountScreen } from './_shell.jsx'
import Learn from '../src/screens/Learn.jsx'
import Hud from '../src/screens/Hud.jsx'

mountScreen(<Learn />, { hud: Hud, dock: true, bare: true })
