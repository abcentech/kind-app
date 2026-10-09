// Shorts reel in the real shell frame. ?series=secrets-of-longevity | stewardship-code  ?now=2026-08-12  ?fx=lite
// ?spec=1 swaps in a LiteYouTube specimen (16/9 + 9/16) instead of the reel.
import { mountScreen } from './_shell.jsx'
import Shorts from '../src/screens/Shorts.jsx'
import Hud from '../src/screens/Hud.jsx'
import LiteYouTube from '../src/ui/LiteYouTube.jsx'

const q = new URLSearchParams(location.search)
if (q.get('spec')) {
  mountScreen(
    <div style={{ padding: 20, display: 'grid', gap: 20 }}>
      <LiteYouTube videoId="wbZw4faMAyE" title="Secrets of Longevity, day 1" ratio="16/9" />
      <div style={{ width: 180 }}><LiteYouTube videoId="57osZrTgQTk" title="The Truth about INSTANT Prayers" ratio="9/16" /></div>
    </div>, { hud: Hud, dock: true, tab: 'shorts' })
} else {
  mountScreen(<Shorts />, { hud: Hud, dock: true, bare: true, tab: 'shorts' })
}
