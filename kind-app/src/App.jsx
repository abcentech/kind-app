import { useEffect, useState } from 'react'
import Onboard from './screens/Onboard.jsx'
import Home from './screens/Home.jsx'
import Path from './screens/Path.jsx'
import Vault from './screens/Vault.jsx'
import Shorts from './screens/Shorts.jsx'
import Me from './screens/Me.jsx'
import Drop from './screens/Drop.jsx'
import { activeSeriesId, getSeries } from './lib.js'
import { useStore } from './store.js'
import { Icon } from './icons.jsx'

const TABS = [
  { id: 'home', label: 'Today', Ic: Icon.today },
  { id: 'path', label: 'Journey', Ic: Icon.journey },
  { id: 'vault', label: 'Vault', Ic: Icon.vault },
  { id: 'shorts', label: 'Shorts', Ic: Icon.shorts },
  { id: 'me', label: 'Me', Ic: Icon.me },
]

export default function App() {
  const st = useStore()
  const [seriesId, setSeriesId] = useState(activeSeriesId)
  const [tab, setTab] = useState('home')
  const [drop, setDrop] = useState(null)
  const [opening, setOpening] = useState(true)
  const s = getSeries(seriesId)

  // The series accent is the app's single tint. Each series carries a light and
  // a dark value so contrast holds in both appearances.
  useEffect(() => {
    const q = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.style.setProperty('--tint', q.matches ? s.accentDark : s.accent)
    apply()
    q.addEventListener('change', apply)
    return () => q.removeEventListener('change', apply)
  }, [s.accent, s.accentDark])

  if (opening)
    return <div className="app"><Onboard s={s} onboarded={st.onboarded} done={() => setOpening(false)} /></div>

  const openDay = (n) => setDrop(Math.max(1, Math.min(s.calendar.length, n)))

  return (
    <div className="app">
      <div className="screens">
        {tab === 'home' && <Home s={s} openDay={openDay} goVault={() => setTab('vault')} />}
        {tab === 'path' && <Path s={s} openDay={openDay} />}
        {tab === 'vault' && <Vault s={s} openDay={openDay} />}
        {tab === 'shorts' && <Shorts s={s} />}
        {tab === 'me' && <Me s={s} seriesId={seriesId} setSeriesId={(id) => { setSeriesId(id); setTab('home') }} />}
      </div>

      <nav className="tabbar" aria-label="Main">
        {TABS.map(({ id, label, Ic }) => (
          <button key={id} className={'tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}>
            <Ic />
            {label}
          </button>
        ))}
      </nav>

      {drop && <Drop s={s} day={drop} close={() => setDrop(null)} />}
    </div>
  )
}
