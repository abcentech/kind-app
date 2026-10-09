// lesson-shell playground — the REAL Lesson in the real shell frame.
// The slide and exercise modules are built in parallel, so by default this page swaps in a temporary registry of
// placeholder slides + a fake ExerciseStep (props on Lesson that exist for exactly this). ?real=1 uses the real modules.
//   ?day=12  ?series=secrets-of-longevity  ?now=2026-08-12  ?fx=lite  ?real=1  ?long=1 (tall slides to test scroll fades)
// Events land in window.__log; the close prop increments window.__closed.
import { useEffect, useState } from 'react'
import { mount } from './_boot.jsx'
import { ShellContext } from '../src/shell.jsx'
import { activeSeriesId, getSeries, modeOf } from '../src/lib.js'
import { Button, Label, ToastHost } from '../src/ui/index.js'
import FxLayer from '../src/fx/FxLayer.jsx'
import Lesson from '../src/screens/Lesson.jsx'

const q = new URLSearchParams(location.search)
const long = q.has('long')
window.__log = []
window.__closed = 0
const log = (m) => { window.__log.push(m); console.log('[lesson]', m) }

const body = (t) => (long ? Array.from({ length: 7 }, () => t || 'Placeholder text.').join('\n') : t)

const fake = (kind) => function FakeSlide({ card, active, setFooter, next, scale }) {
  useEffect(() => {
    if (kind === 'declare') setFooter({ hidden: true })
    if (kind === 'pray') setFooter({ label: 'Amen' })
  }, [setFooter])
  return (
    <div className="pg-slide" data-kind={kind} data-active={active ? '1' : '0'} style={{ fontSize: 'calc(1em * var(--read-scale, 1))', margin: 'auto 0' }}>
      <Label mono>{card.label || card.eyebrow || kind}</Label>
      {card.title && <h2 className="pg-title">{card.title}</h2>}
      {(card.body || card.prompt || card.lines) && (body(card.body || card.prompt || (card.lines || []).join(' / ')) || '').split('\n').map((l, i) => <p key={i} className="pg-p">{l}</p>)}
      {kind === 'ask' && <textarea className="pg-ta" rows={3} placeholder="textarea — swipes starting here must not page" />}
      {kind === 'declare' && <Button variant="secondary" data-t="hold" onClick={() => setFooter({ hidden: false, label: 'Finish' })}>Pretend the hold completed</Button>}
      {kind === 'declare' && <Button variant="ghost" data-t="slide-next" onClick={next}>slide next()</Button>}
    </div>
  )
}
const SLIDES = Object.fromEntries(['open', 'watch', 'read', 'truth', 'point', 'quote', 'verse', 'do', 'ask', 'pray', 'declare'].map((k) => [k, q.has('blank') ? () => null : fake(k)]))   // ?blank=1: every slide renders nothing -> the shell's card-text fallback

function FakeEx({ ex, isRetry, onGraded, onNext }) {
  const [g, setG] = useState(null)
  return (
    <div className="pg-ex" data-testid="ex" data-retry={isRetry ? '1' : '0'} data-ex={ex.id}>
      <Label mono>{isRetry ? 'Retry' : 'Check'} · {ex.type}</Label>
      <p className="pg-p">{ex.prompt}</p>
      {!g ? (
        <div className="pg-row">
          <Button variant="go" size="md" data-t="right" onClick={() => { setG('right'); onGraded({ right: true, response: null, answerText: '', retry: !!isRetry }) }}>Right</Button>
          <Button variant="danger" size="md" data-t="wrong" onClick={() => { setG('wrong'); onGraded({ right: false, response: null, answerText: '', retry: !!isRetry }) }}>Wrong</Button>
        </div>
      ) : <Button size="md" data-t="cont" onClick={onNext}>Continue ({g})</Button>}
    </div>
  )
}

function Frame() {
  const [seriesId] = useState(q.get('series') || activeSeriesId())
  const [closed, setClosed] = useState(false)
  const s = getSeries(seriesId)
  const day = Number(q.get('day')) || 12
  const real = q.has('real')
  const value = {
    s, seriesId, setSeriesId() {}, tab: 'learn', goTab() {}, openDay() {},
    closeLesson() {}, share: (r) => log('share ' + JSON.stringify(r).slice(0, 80)), mode: modeOf(s),
  }
  return (
    <div className="shell">
      <div className="shell-frame">
        <ShellContext.Provider value={value}>
          {closed ? (
            <div className="shell-fault" data-testid="closed"><h1>Closed</h1><Button onClick={() => setClosed(false)}>Reopen</Button></div>
          ) : (
            <div className="shell-layer" role="dialog" aria-modal="true" aria-label={`Day ${day}`}>
              <Lesson
                key={s.id + day} s={s} day={day}
                close={() => { window.__closed += 1; log('close'); setClosed(true) }}
                {...(real ? {} : { slides: SLIDES, Exercise: FakeEx })}
              />
            </div>
          )}
        </ShellContext.Provider>
        <FxLayer />
        <ToastHost />
      </div>
    </div>
  )
}

mount(<Frame />, { fx: q.get('fx') === 'lite' ? 'lite' : 'full' })
