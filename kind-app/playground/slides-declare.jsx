// slides-declare specimen — the Declare slide inside a stand-in lesson (header, scrolling slide, footer driven by setFooter).
//   ?n=7        a 7-line declaration with long lines (the 360x640 stress case)    ?n=3 / ?n=5 …
//   ?day=12     which day's real declaration (default 12)    ?series=secrets-of-longevity    ?fx=lite
//   ?tagline=0  drop the tagline    ?scale=1.3  reading scale
import { useCallback, useMemo, useState } from 'react'
import { mountScreen } from './_shell.jsx'
import { useShell } from '../src/shell.jsx'
import { deckFor } from '../src/lib.js'
import Declare from '../src/screens/lesson/slides/Declare.jsx'

const q = new URLSearchParams(location.search)
const LONG = [
  'God owns everything.', 'I am only a steward of what He has placed in my hands.', 'I will give an account.',
  'Money is a tool, never my master.', 'I will be faithful in little, so that I may be trusted with much.',
  'My work, my words and my wealth belong to Him.', 'Christ my Master, money my servant.',
]

function Harness() {
  const { s } = useShell()
  const n = +q.get('n') || 0
  const day = +q.get('day') || 12
  const noTag = q.get('tagline') === '0'
  const card = useMemo(() => {
    if (n) return { id: 'declare', kind: 'declare', label: 'The final declaration', lines: Array.from({ length: n }, (_, i) => LONG[i % LONG.length]) }
    return deckFor(s, day).at(-1)
  }, [s, n, day])
  const [footer, setFooter] = useState({ label: 'CONTINUE', disabled: false })
  const set = useCallback((f) => setFooter((p) => ({ ...p, ...f })), [])
  const scale = +q.get('scale') || 1
  return (
    <div className="pg-lesson" style={{ '--read-scale': scale }}>
      <div className="pg-head"><span>DAY {day}</span><i /><span>9 / 9</span></div>
      <div className="lesson-slide">
        <Declare card={card} s={noTag ? { ...s, tagline: '' } : s} day={day} seriesId={s.id} scale={scale} active setFooter={set} />
      </div>
      <div className="pg-foot"><button type="button" data-testid="footer" disabled={footer.disabled}>{footer.label}</button></div>
    </div>
  )
}

mountScreen(<Harness />, { bare: true })
