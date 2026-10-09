// obj-streak playground — the two sections in the real shell frame, with the composer's gutter and --s-8 rhythm faked.
//   ?seed=new|streak6|lost|midrank|maxrank   ?now=2026-08-12   ?series=secrets-of-longevity   ?fx=lite   ?only=streak|rank
import { mountScreen } from './_shell.jsx'
import { useShell } from '../src/shell.jsx'
import Streak from '../src/screens/objectives/Streak.jsx'
import Rank from '../src/screens/objectives/Rank.jsx'

const only = new URLSearchParams(location.search).get('only')

function Page() {
  const { s } = useShell()
  return (
    <div style={{ padding: 'var(--s-4) var(--gutter) var(--s-8)', display: 'flex', flexDirection: 'column', gap: 'var(--s-8)' }}>
      {only !== 'rank' ? <Streak s={s} /> : null}
      {only !== 'streak' ? <Rank s={s} /> : null}
    </div>
  )
}

mountScreen(<Page />, { dock: true, tab: 'objectives' })
