// me-install playground — InstallCard / InstallPrompt / IosGuideSheet / goDs University, inside the real shell frame.
//   ?mode=android      dispatches a fake beforeinstallprompt before mount (native route)
//   ?mode=standalone   dispatches appinstalled (everything install-related must disappear)
//   (iOS / in-app routes come from the browser's userAgent: use Playwright's context userAgent, see me-install.verify.mjs)
//   ?show=card|prompt|sheet|gu|child   which block to render (default: all)       ?sheet=ios|android|inapp   mode of the open sheet
//   ?dismissed=1       simulates "Not now" (installDismissed = now)               ?fx=lite
import { useState } from 'react'
import { mountScreen } from './_shell.jsx'
import InstallCard, { InstallPrompt, IosGuideSheet } from '../src/screens/me/Install.jsx'
import GodsUniversity, { Child } from '../src/screens/GodsUniversity.jsx'
import { prefs } from '../src/prefs.js'
import { Button, Label, Panel } from '../src/ui/index.js'

const q = new URLSearchParams(location.search)
const mode = q.get('mode')

if (mode === 'android') {
  const ev = new Event('beforeinstallprompt', { cancelable: true })
  ev.prompt = async () => { window.__prompted = (window.__prompted || 0) + 1 }
  ev.userChoice = Promise.resolve({ outcome: 'accepted' })
  window.dispatchEvent(ev)
}
if (mode === 'standalone') window.dispatchEvent(new Event('appinstalled'))
prefs.set('installDismissed', q.get('dismissed') ? Date.now() : 0)

const KID = {
  code: 'k1', name: 'Tobi', pathway: 'Nation Builders', kin_no: 'KIN-0042',
  summary: { rate: 75, present: 3, weeks: 4, minutes: 135 },
  attendance: [{ week: 'W1', attendance: 1, invested_minutes: 45 }, { week: 'W2', attendance: 1, invested_minutes: 50 }, { week: 'W3', attendance: 0, invested_minutes: 0 }, { week: 'W4', attendance: 1, invested_minutes: 40 },
    { week: 'W5', attendance: 1, invested_minutes: 45 }, { week: 'W6', attendance: 1, invested_minutes: 45 }, { week: 'W7', attendance: 0, invested_minutes: 0 }, { week: 'W8', attendance: 1, invested_minutes: 45 }],
  reports: [{ celebration: 'Tobi led the group prayer without being asked.', parent_action: 'Ask him to teach you the Stewardship Code.', growth_area: 'Finishing what he starts.' }],
}
const KID2 = { ...KID, code: 'k2', name: 'Ada', kin_no: '', summary: { rate: null, present: 0, weeks: 0, minutes: 0 }, attendance: [], reports: [] }

const Cap = ({ children }) => <Label mono tone="neutral" style={{ display: 'block', margin: 'var(--s-6) 0 var(--s-3)' }}>{children}</Label>

function Page() {
  const show = q.get('show')
  const [open, setOpen] = useState(Boolean(q.get('sheet')))
  const all = !show
  return (
    <div style={{ padding: 'var(--s-4) var(--gutter) var(--s-16)' }}>
      {(all || show === 'card') && <><Cap>InstallCard</Cap><InstallCard s={null} /></>}
      {(all || show === 'prompt') && <><Cap>InstallPrompt</Cap><InstallPrompt /></>}
      {(all || show === 'sheet') && (
        <>
          <Cap>IosGuideSheet</Cap>
          <Button variant="secondary" onClick={() => setOpen(true)}>Open guide</Button>
          <IosGuideSheet open={open} onClose={() => setOpen(false)} mode={q.get('sheet') || 'ios'} />
        </>
      )}
      {(all || show === 'gu') && (
        <>
          <Cap>GodsUniversity · demo (KIND_API empty)</Cap>
          <GodsUniversity />
          <Cap>GodsUniversity · signed out (configured)</Cap>
          <GodsUniversity configured />
        </>
      )}
      {(all || show === 'child') && (
        <>
          <Cap>Family (signed in)</Cap>
          <div className="mei-gu">
            <Panel pad="sm" className="mei-gu__who"><span className="mei-gu__icon" /><span className="mei-gu__who-t"><b>Mrs. Adebayo</b><small>Signed in</small></span><Button variant="ghost" size="sm">Sign out</Button></Panel>
            <Child c={KID} /><Child c={KID2} />
          </div>
        </>
      )}
    </div>
  )
}

mountScreen(<Page />, { tab: 'me' })
