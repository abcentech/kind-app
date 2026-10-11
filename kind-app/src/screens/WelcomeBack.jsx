// WelcomeBack — the first open after a streak ended. Kind, never shaming: the best count stays, the Word kept the place, and
// one tap launches today. Shown once per loss (flag `wb:<date the streak ended>`), after the app has settled, never over a lesson.
import { useEffect, useRef, useState } from 'react'
import { Button, Sheet } from '../ui/index.js'
import { hasFlag, launchState, setFlag, streakInfo, useStore, useToday } from '../store.js'
import { toastCopy } from '../copy.js'

const COPY = {
  eyebrow: 'WELCOME BACK',
  best: (n) => `Your best, ${n} ${n === 1 ? 'day' : 'days'}, stays on the board.`,
  was: (n) => `The ${n}-day run is behind you. The Word kept your place.`,
  shield: (n) => `You still hold ${n === 1 ? 'a shield' : n + ' shields'}. From today, one will cover a day you miss.`,
  go: 'Launch today',
  later: 'Not now',
  path: 'Back to the path',
}

export default function WelcomeBack({ s, enabled, onLaunch }) {
  const st = useStore()
  const tk = useToday()
  const [open, setOpen] = useState(false)
  const shown = useRef(null)                                   // the loss we already opened for, so a re-render never reopens it
  const info = streakInfo(st)
  const mark = st.lost?.on ? `wb:${st.lost.on}` : null
  const eligible = enabled && info.state === 'lost' && info.lostFrom >= 2 && mark && !hasFlag(st, mark)

  useEffect(() => {
    if (!eligible || shown.current === mark) return undefined
    // mark the loss only once it has opened: a dev StrictMode double-run must not cancel the only timer
    const h = setTimeout(() => { shown.current = mark; setOpen(true) }, 700)   // let the Learn path land first
    return () => clearTimeout(h)
  }, [eligible, mark])

  if (!mark) return null
  const close = () => { setOpen(false); setFlag(mark) }
  const bar = launchState(s, st)
  const canLaunch = bar.state === 'ready' || bar.state === 'archive'
  const head = toastCopy('welcomeBack', { name: st.name }, mark + tk)
  return (
    <Sheet open={open} onClose={close} title={head.title} eyebrow={COPY.eyebrow} detents={['auto']}
      footer={
        <div className="hud-wb-actions">
          <Button variant="primary" size="lg" full icon={canLaunch ? 'rocket' : undefined} onClick={() => { close(); if (canLaunch) onLaunch(bar.day) }}>
            {canLaunch ? COPY.go : COPY.path}
          </Button>
          {canLaunch ? <Button variant="ghost" size="md" full onClick={close}>{COPY.later}</Button> : null}
        </div>
      }>
      <div className="hud-wb">
        <p className="hud-wb__lead">{head.body}</p>
        <p className="hud-wb__line">{COPY.was(info.lostFrom)}</p>
        {st.best > 0 ? <p className="hud-wb__line">{COPY.best(st.best)}</p> : null}
        {st.shields > 0 ? <p className="hud-wb__line">{COPY.shield(st.shields)}</p> : null}
      </div>
    </Sheet>
  )
}
