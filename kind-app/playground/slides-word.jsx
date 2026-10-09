// slides-word playground — Verse · Do · Ask · Pray inside the real shell frame, with a stand-in lesson chrome (header, scroller, footer).
//   ?kind=verse|do|ask|pray   ?series=secrets-of-longevity   ?day=N   ?idx=0 (nth card of that kind)   ?scale=1.3   ?fx=lite
//   ?x=longverse|longpray|steps|solo|extras   synthetic / longest-in-library cards
//   ?note=short|long|yoruba   pre-fills the journal note for (series, day) before render
import { useCallback, useState } from 'react'
import { mountScreen } from './_shell.jsx'
import { useShell } from '../src/shell.jsx'
import { deckFor, getSeries, dayInfo } from '../src/lib.js'
import { saveNote } from '../src/store.js'
import { Button, SegmentBar, IconButton } from '../src/ui/index.js'
import Verse from '../src/screens/lesson/slides/Verse.jsx'
import Do from '../src/screens/lesson/slides/Do.jsx'
import Ask from '../src/screens/lesson/slides/Ask.jsx'
import Pray from '../src/screens/lesson/slides/Pray.jsx'

const SLIDES = { verse: Verse, do: Do, ask: Ask, pray: Pray }
const q = new URLSearchParams(location.search)

// every card of a kind across the series, with its day
function allCards(s, kind) {
  const out = []
  for (let d = 1; d <= 31; d++) {
    let deck = []
    try { deck = deckFor(s, d) } catch { /* day without content */ }
    deck.forEach((c) => { if (c.kind === kind) out.push({ day: d, card: c }) })
  }
  return out
}
const longest = (list, f) => list.reduce((a, b) => ((f(b.card) || '').length > (f(a.card) || '').length ? b : a), list[0])

function pick(s, kind) {
  const list = allCards(s, kind)
  const x = q.get('x')
  if (x === 'longverse' && kind === 'verse') return longest(list, (c) => c.body)
  if (x === 'longpray' && kind === 'pray') return longest(list, (c) => c.body)
  if (x === 'steps' && kind === 'do') return list.find((e) => (e.card.body.match(/^\s*[-*]/gm) || []).length >= 3) || list[0]
  if (x === 'solo' && kind === 'do') return list.find((e) => !/\n/.test(e.card.body)) || list[0]
  if (x === 'extras' && kind === 'ask') return list.find((e) => (e.card.extra || []).length >= 2) || list[0]
  if (q.get('day')) return list.find((e) => e.day === +q.get('day')) || list[0]
  return list[+(q.get('idx') || 0)] || list[0]
}

function Lesson() {
  const { s, seriesId, share } = useShell()
  const kind = q.get('kind') || 'verse'
  const scale = +(q.get('scale') || 1)
  const [footer, setFooter] = useState({})
  const [init] = useState(() => {
    const hit = pick(s, kind)
    const n = q.get('note')
    if (n && hit) {
      const text = n === 'long' ? 'Ọlọ́run ni olùgbàlà mi. '.repeat(160) : n === 'yoruba' ? 'Ẹ̀mí Mímọ́ ń ràn mí lọ́wọ́ láti ṣe ohun tí ó tọ́ — ọ̀rọ̀ Ọlọ́run, Ṣàngó, Igbo: ụlọ ọma, ọgụgụ.' : 'I have been feeding my body and starving my spirit.'
      saveNote(seriesId, hit.day, text)
    }
    return hit
  })
  const log = useCallback((m) => { console.log('[slide]', m); window.__pg = { ...(window.__pg || {}), last: m } }, [])
  const Slide = SLIDES[kind]
  const { day, card } = init
  window.__pg = { ...(window.__pg || {}), kind, day, card, footer }
  return (
    <div className="pg-lesson" style={{ '--read-scale': scale }}>
      <header className="pg-head">
        <IconButton icon="close" label="Close lesson" size="sm" />
        <SegmentBar total={9} done={4} current={4} />
        <span className="pg-tag">D{day} · {kind}</span>
      </header>
      <div className="lesson-slide pg-slide" data-testid="slide-scroller">
        <Slide key={`${seriesId}:${day}:${kind}`} card={card} s={s} day={day} seriesId={seriesId} scale={scale} active
          next={() => log('next')} back={() => log('back')} setFooter={(f) => { setFooter((p) => ({ ...p, ...f })); log('footer ' + JSON.stringify(f)) }} share={share} />
      </div>
      <footer className="pg-foot" data-testid="lesson-footer">
        <Button full onClick={() => log('continue')}>{footer.label || 'Continue'}</Button>
      </footer>
    </div>
  )
}

mountScreen(<Lesson />, { bare: true })
