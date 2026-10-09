// Mount ONE screen inside the real shell frame, with a stub ShellContext and the REAL store.
//   import { mountScreen } from './_shell.jsx'
//   mountScreen(<Learn />, { hud: true, dock: true, tab: 'learn' })
//
// URL knobs (all optional):  ?series=secrets-of-longevity   ?now=2026-08-12   ?fx=lite   ?tab=objectives
// Seed progress with tools/browser.mjs open({ state }) — the store migrates whatever you write to 'kind-app-v4'.
// Navigation calls are logged to the console AND shown as a small mono readout in the corner so you can see them in screenshots.
import { useState } from 'react'
import { mount } from './_boot.jsx'
import { ShellContext } from '../src/shell.jsx'
import { activeSeriesId, getSeries, modeOf } from '../src/lib.js'
import { Dock, ToastHost, toast } from '../src/ui/index.js'
import FxLayer from '../src/fx/FxLayer.jsx'

const q = new URLSearchParams(location.search)

const TABS = [
  { id: 'learn', label: 'Learn', icon: 'learn' },
  { id: 'objectives', label: 'Objectives', icon: 'objectives' },
  { id: 'shorts', label: 'Shorts', icon: 'shorts' },
  { id: 'locker', label: 'Locker', icon: 'locker' },
  { id: 'me', label: 'Me', icon: 'me' },
]

function Frame({ children, hud: Hud, dock, tab: tab0, bare, extra }) {
  const [seriesId, setSeriesId] = useState(q.get('series') || activeSeriesId())
  const [tab, setTab] = useState(q.get('tab') || tab0 || 'learn')
  const [log, setLog] = useState('')
  const s = getSeries(seriesId)
  const note = (m) => { console.log('[shell]', m); setLog(m) }
  const value = {
    s, seriesId, setSeriesId: (id) => { note('setSeriesId ' + id); setSeriesId(id) },
    tab, goTab: (id) => { note('goTab ' + id); setTab(id) },
    openDay: (d, sid) => note(`openDay ${d}${sid ? ' @' + sid : ''}`),
    closeLesson: () => note('closeLesson'),
    share: (r) => { note('share ' + JSON.stringify(r).slice(0, 120)) },
    mode: modeOf(s),
    ...extra,
  }
  return (
    <div className="shell">
      <div className="shell-frame">
        <ShellContext.Provider value={value}>
          {Hud ? <Hud s={s} /> : null}
          <div className="shell-screens">
            <div className={'shell-screen' + (bare ? ' is-bare' : '')}>{children}</div>
          </div>
          {dock ? (
            <div className="shell-dock"><Dock tabs={TABS} value={tab} onChange={value.goTab} /></div>
          ) : null}
          <FxLayer />
          <ToastHost />
          {log ? <div className="shell-offline" style={{ top: 'auto', bottom: 96 }} data-testid="shell-log">{log}</div> : null}
        </ShellContext.Provider>
      </div>
    </div>
  )
}

/**
 * mountScreen(node, { hud: HudComponent, dock: bool, bare: bool, tab, extra: { …extra ShellContext fields } })
 *   node  — usually the screen element; if it needs a scroll container of its own set bare:true.
 */
export function mountScreen(node, opts = {}) {
  window.__toast = toast
  mount(<Frame {...opts}>{node}</Frame>, { fx: q.get('fx') === 'lite' ? 'lite' : 'full' })
}
