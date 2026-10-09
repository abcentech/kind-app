// Me — the pilot's own bay: identity, instruments, missions, family, links, about. Each block is its own module in
// ./me/ and reads the store itself; this file only stacks them. Settings and Install belong to other owners.
import { useCallback, useState } from 'react'
import { useShell } from '../shell.jsx'
import { labels } from '../copy.js'
import Pilot from './me/Pilot.jsx'
import Settings from './me/Settings.jsx'
import Install from './me/Install.jsx'
import Missions from './me/Missions.jsx'
import Family from './me/Family.jsx'
import Links from './me/Links.jsx'
import About from './me/About.jsx'
import Developer from './me/Developer.jsx'
import GodsUniversity from './GodsUniversity.jsx'
import { useStore } from '../store.js'
import { Label } from '../ui/index.js'
// Styles load with the screen, not with the shell (first-load budget: docs/V7-DESIGN.md §10).
import '../styles/me.css'
import '../styles/me-settings.css'
import '../styles/me-install.css'

const KEY = 'kind-dev'
const readDev = () => { try { return sessionStorage.getItem(KEY) === '1' } catch { return false } }

export default function Me() {
  const { s } = useShell()
  const st = useStore()
  const [dev, setDev] = useState(readDev)
  const unlock = useCallback(() => {
    setDev(true)
    try { sessionStorage.setItem(KEY, '1') } catch { /* private mode: lasts until the next render */ }
  }, [])
  const lock = useCallback(() => {
    setDev(false)
    try { sessionStorage.removeItem(KEY) } catch { /* nothing to clear */ }
  }, [])

  return (
    <main className="me" aria-labelledby="me-title">
      <h1 className="me-title" id="me-title">{labels.me.title}</h1>
      <Pilot s={s} />
      <Settings s={s} />
      <Install s={s} />
      <Missions s={s} />
      {st.role === 'parent' || st.role === 'family' ?<Family s={s} /> : null}
      <section className="me-sec" aria-labelledby="me-gu-h">
        <Label as="h2" id="me-gu-h" className="me-h">{labels.me.university}</Label>
        <GodsUniversity />
      </section>
      <Links s={s} />
      <About s={s} onUnlock={unlock} />
      {dev ? <Developer s={s} onHide={lock} /> : null}
    </main>
  )
}
