import { useState } from 'react'
import Onboard from './screens/Onboard.jsx'
import Learn from './screens/Learn.jsx'
import Quests from './screens/Quests.jsx'
import Vault from './screens/Vault.jsx'
import Shorts from './screens/Shorts.jsx'
import Me from './screens/Me.jsx'
import Lesson from './screens/Lesson.jsx'
import { activeSeriesId, getSeries } from './lib.js'
import { useStore } from './store.js'
import { Icon } from './icons.jsx'

const TABS = [
  { id: 'learn', label: 'Learn', Ic: Icon.learn },
  { id: 'quests', label: 'Quests', Ic: Icon.quests },
  { id: 'shorts', label: 'Shorts', Ic: Icon.shorts },
  { id: 'vault', label: 'Collection', Ic: Icon.vault },
  { id: 'me', label: 'Profile', Ic: Icon.me },
]

export default function App() {
  const st = useStore()
  const [seriesId, setSeriesId] = useState(activeSeriesId)
  const [tab, setTab] = useState('learn')
  const [lesson, setLesson] = useState(null)
  const [opening, setOpening] = useState(true)
  const s = getSeries(seriesId)

  if (opening)
    return <div className="app"><Onboard s={s} onboarded={st.onboarded} done={() => setOpening(false)} /></div>

  const openDay = (n) => setLesson(Math.max(1, Math.min(s.calendar.length, n)))

  return (
    <div className="app">
      <div className="screens">
        {tab === 'learn' && <Learn s={s} openDay={openDay} />}
        {tab === 'quests' && <Quests s={s} openDay={openDay} />}
        {tab === 'shorts' && <Shorts s={s} />}
        {tab === 'vault' && <Vault s={s} openDay={openDay} />}
        {tab === 'me' && <Me s={s} seriesId={seriesId} setSeriesId={(id) => { setSeriesId(id); setTab('learn') }} />}
      </div>

      <nav className="tabbar" aria-label="Main">
        {TABS.map(({ id, label, Ic }) => (
          <button key={id} className={'tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}
            aria-label={label} aria-current={tab === id ? 'page' : undefined}>
            <Ic />
          </button>
        ))}
      </nav>

      {lesson && <Lesson s={s} day={lesson} close={() => setLesson(null)} />}
    </div>
  )
}
