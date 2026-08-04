import { useEffect, useState } from 'react'
import Onboard from './screens/Onboard.jsx'
import Home from './screens/Home.jsx'
import Path from './screens/Path.jsx'
import Vault from './screens/Vault.jsx'
import Shorts from './screens/Shorts.jsx'
import Me from './screens/Me.jsx'
import Drop from './screens/Drop.jsx'
import { activeSeriesId, getSeries, todayNumber } from './lib.js'
import { useStore } from './store.js'

const TABS = [
  { id: 'home', label: 'Today', icon: <path d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9" /> },
  { id: 'path', label: 'Journey', icon: <><path d="m3 20 6-11 4 6 3-4 5 9z" /><circle cx="17" cy="5" r="2" /></> },
  { id: 'vault', label: 'Vault', icon: <><rect x="3" y="5" width="18" height="15" rx="3" /><circle cx="12" cy="12.5" r="3" /><path d="M12 3v2" /></> },
  { id: 'shorts', label: 'Shorts', icon: <><rect x="7" y="3" width="10" height="18" rx="3" /><path d="m11 9 4 3-4 3z" /></> },
  { id: 'me', label: 'Me', icon: <><circle cx="12" cy="8.5" r="3.4" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></> },
]

export default function App() {
  const st = useStore()
  const [seriesId, setSeriesId] = useState(activeSeriesId)
  const [tab, setTab] = useState('home')
  const [drop, setDrop] = useState(null)
  const [splash, setSplash] = useState(true)
  const s = getSeries(seriesId)

  useEffect(() => {
    document.documentElement.style.setProperty('--series', s.accent)
  }, [s.accent])

  if (splash)
    return <div className="app"><Onboard s={s} onboarded={st.onboarded} done={() => setSplash(false)} /></div>

  const openDay = (n) => setDrop(Math.max(1, Math.min(s.calendar.length, n)))

  return (
    <div className="app">
      <div className="screens">
        {tab === 'home' && <Home s={s} openDay={openDay} goVault={() => setTab('vault')} goPath={() => setTab('path')} />}
        {tab === 'path' && <Path s={s} openDay={openDay} />}
        {tab === 'vault' && <Vault s={s} openDay={openDay} />}
        {tab === 'shorts' && <Shorts s={s} />}
        {tab === 'me' && <Me s={s} seriesId={seriesId} setSeriesId={(id) => { setSeriesId(id); setTab('home') }} />}
      </div>

      <nav className="tabbar" aria-label="Main navigation">
        {TABS.map((t) => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
            {t.label}
          </button>
        ))}
      </nav>

      {drop && <Drop s={s} day={drop} close={() => setDrop(null)} />}
    </div>
  )
}
