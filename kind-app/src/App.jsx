import { useState } from 'react'
import Today from './screens/Today.jsx'
import Journey from './screens/Journey.jsx'
import DayView from './screens/DayView.jsx'
import Shorts from './screens/Shorts.jsx'
import Family from './screens/Family.jsx'
import Kin from './screens/Kin.jsx'
import { todayNumber } from './lib.js'

const TABS = [
  { id: 'today', label: 'Today', icon: <path d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9" /> },
  { id: 'journey', label: 'Journey', icon: <><path d="m3 20 6-11 4 6 3-4 5 9z" /><circle cx="17" cy="5" r="2" /></> },
  { id: 'shorts', label: 'Shorts', icon: <><rect x="7" y="3" width="10" height="18" rx="3" /><path d="m11 9 4 3-4 3z" /></> },
  { id: 'family', label: 'Family', icon: <><circle cx="8.5" cy="8" r="3" /><circle cx="16.5" cy="9.5" r="2.3" /><path d="M3.5 19c0-3 2.2-5 5-5s5 2 5 5M14.5 19c.2-2.4 1.6-4 3.8-4 1.4 0 2.6.7 3.2 2" /></> },
  { id: 'kin', label: 'KIN', icon: <><circle cx="12" cy="12" r="9" /><path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" /></> },
]

export default function App() {
  const [tab, setTab] = useState('today')
  const [openDay, setOpenDay] = useState(null)

  const goDay = (n) => { setOpenDay(n); setTab('day') }
  const go = (t) => { setOpenDay(null); setTab(t) }

  return (
    <div className="app">
      <div className="screens">
        {tab === 'today' && <Today goDay={goDay} />}
        {tab === 'journey' && <Journey goDay={goDay} />}
        {tab === 'day' && <DayView day={openDay ?? todayNumber()} back={() => go('today')} goJourney={() => go('journey')} />}
        {tab === 'shorts' && <Shorts />}
        {tab === 'family' && <Family goJourney={() => go('journey')} />}
        {tab === 'kin' && <Kin />}
      </div>
      <nav className="tabbar" aria-label="Main navigation">
        {TABS.map((t) => (
          <button key={t.id}
            className={'tab' + (tab === t.id || (tab === 'day' && t.id === 'today') ? ' on' : '')}
            onClick={() => go(t.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
