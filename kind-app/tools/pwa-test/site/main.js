// Throwaway app for the service-worker tests: the real src/pwa.js + the real fonts.css, nothing else of the app.
import '@kind/fonts'
import { createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW, useInstall, useOnline, useUpdate, getBuild, removeBoot, repairOfflinePack, persistStorage } from '@kind/pwa'
import { downloadICS } from '@kind/ics'

document.documentElement.dataset.v = __APP_VERSION__
window.__events = []
window.__sw = registerSW({
  onUpdate: (apply) => { window.__apply = apply; window.__events.push('update') },
  onReady: () => window.__events.push('ready'),
})
window.__lazy = () => import('./lazy.js').then((m) => m.default)
window.__removeBoot = removeBoot
window.__repair = repairOfflinePack
window.__persist = persistStorage
window.__ics = downloadICS

function App() {
  const inst = useInstall(), online = useOnline(), up = useUpdate()
  const { install, ...rest } = inst
  window.__install = install
  const state = { ...rest, online, ready: up.ready, offlineReady: up.offlineReady, build: getBuild() }
  return h('main', { style: { padding: 24, fontFamily: "'Inter Variable', system-ui" } },
    h('h1', { id: 'ver' }, 'KIND test ' + __APP_VERSION__),
    h('p', { id: 'ext' }, 'latin-ext sample: Ŏ ŏ Ǒ'),
    h('pre', { id: 'state' }, JSON.stringify(state)))
}
createRoot(document.getElementById('root')).render(h(App))
