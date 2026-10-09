// onboard · Hero — beat 1. The launch pad at dusk, the line, the one button. Pressing it lets the engines catch for a
// beat (anticipation) before the next beat slides in; lite and reduced motion skip the wait.
import { useEffect, useRef, useState } from 'react'
import LaunchPad from '../../art/LaunchPad.jsx'
import { Button } from '../../ui/index.js'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'
import { useFxLevel } from '../../fx/motion.js'
import { onboardCopy } from '../../copy.js'
import Beat from './Beat.jsx'

const lines = (t) => (t.match(/[^.]+\./g) || [t]).map((x) => x.trim())

export default function Hero({ next, still = false }) {
  const c = onboardCopy.pad
  const lite = useFxLevel() === 'lite'
  const [lit, setLit] = useState(false)
  const busy = useRef(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  const begin = () => {
    if (busy.current) return
    busy.current = true
    if (lite || still) { next(); return }
    setLit(true)
    sound.play('ignite', { gain: 0.55 })
    haptic.heavy()
    timer.current = setTimeout(next, 420)
  }

  return (
    <Beat
      variant="hero"
      eyebrow={c.eyebrow}
      title={lines(c.title).map((l) => <span key={l} className="onb-title__line">{l}</span>)}
      dek={c.body}
      art={<LaunchPad flame={lit ? 'idle' : 'off'} steam twinkle={!lite} />}
      artLabel={c.alt}
      footer={(
        <>
          <Button full icon="rocket" silent onClick={begin} >{c.cta}</Button>
          <p className="onb-note">{c.foot}</p>
        </>
      )}
    >
      <figure className="onb-word">
        <blockquote className="onb-word__text">{c.word.text}</blockquote>
        <figcaption className="onb-word__ref t-ref">{c.word.ref}</figcaption>
      </figure>
    </Beat>
  )
}
