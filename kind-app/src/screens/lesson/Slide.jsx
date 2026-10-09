// lesson-shell · Slide — the `.lesson-slide` column every reading slide renders into.
//   <Slide card scale>{<SlideX … />}</Slide>
//
// What it gives a slide: a flex column that scrolls on its own, dissolving into the page at whichever edge has more
// behind it (data-up / data-down, painted by lesson.css), safe padding that clears the glass footer, and the reading
// scale as --read-scale (a slide sets `font-size: calc(1em * var(--read-scale, 1))`). Keyboard users can scroll a long
// slide: it becomes a focusable region only when it actually overflows.
//
// What it guarantees the lesson: a slide that throws, or renders nothing, never leaves a blank screen. The card's own
// words are shown instead, set plainly — the Word is always readable even when the art around it is not.
import { Component, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Label } from '../../ui/index.js'

const bullet = (l) => l.replace(/^\s*[-•]\s*/, '')

function Fallback({ card }) {
  const c = card || {}
  const eyebrow = c.label || c.eyebrow
  const text = c.body || c.prompt || (c.lines || []).join('\n') || ''
  const word = c.kind === 'verse' || c.kind === 'declare' || c.kind === 'quote'
  return (
    <div className="lesson-fallback" data-word={word ? '' : undefined}>
      {eyebrow && <Label mono>{eyebrow}</Label>}
      {c.title && <h2 className="lesson-fallback__title">{c.title}</h2>}
      {text.split('\n').filter(Boolean).map((l, i) => <p key={i}>{bullet(l)}</p>)}
      {c.ref && <p className="lesson-fallback__ref">{c.ref}</p>}
    </div>
  )
}

export class Guard extends Component {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  componentDidCatch(err) { console.error('[kind] slide failed — showing the card text', err) }
  render() { return this.state.err ? (this.props.fallback ?? <Fallback card={this.props.card} />) : this.props.children }
}

export default function Slide({ card, scale = 1, children, className = '', ...rest }) {
  const ref = useRef(null)
  const [bare, setBare] = useState(false)

  // a slide that rendered nothing: show the card's text
  useLayoutEffect(() => {
    const el = ref.current
    if (el && el.childElementCount === 0) setBare(true)
  }, [])

  // scroll edges -> data-up / data-down; focusable only while there is something to scroll to
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    let raf = 0
    const measure = () => {
      raf = 0
      const max = el.scrollHeight - el.clientHeight
      el.toggleAttribute('data-up', el.scrollTop > 2)
      el.toggleAttribute('data-down', max - el.scrollTop > 2)
      el.tabIndex = max > 2 ? 0 : -1
    }
    const queue = () => { if (!raf) raf = requestAnimationFrame(measure) }
    measure()
    el.addEventListener('scroll', queue, { passive: true })
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(queue) : null
    if (ro) { ro.observe(el); Array.from(el.children).forEach((c) => ro.observe(c)) }
    const t = setTimeout(queue, 500)                         // entrance choreography can change a slide's height
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue)
    return () => { cancelAnimationFrame(raf); clearTimeout(t); el.removeEventListener('scroll', queue); if (ro) ro.disconnect() }
  }, [bare])

  const name = card && (card.label || card.eyebrow || card.title)
  return (
    <div
      ref={ref}
      className={'lesson-slide ' + className}
      data-kind={card && card.kind}
      role="region"
      aria-label={name || undefined}
      style={{ '--read-scale': scale }}
      {...rest}
    >
      <Guard card={card}>{children}</Guard>
      {bare && <Fallback card={card} />}
    </div>
  )
}
