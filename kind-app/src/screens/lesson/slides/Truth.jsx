// slides-read · TRUTH — the Central Truth, one huge serif statement. First sentence at full ink, the rest a step down:
// the thing to remember is the first thing the eye lands on. Size steps down by length so ~90 characters (the median) is
// still set like a book cover, and nothing ever needs to scroll at 100 %.
import { md } from '../../../lib.js'
import { Eyebrow, Sky, rootProps, typo } from './Read.jsx'

const sentences = (t) => t.match(/[^.!?]+(?:[.!?]+["”’)]*\s*|$)/g)?.map((x) => x.trim()).filter(Boolean) || [t]
const sizeOf = (n) => (n <= 64 ? 'xl' : n <= 104 ? 'l' : n <= 140 ? 'm' : n <= 190 ? 's' : 'xs')

export default function Truth({ card, day, scale, active }) {
  const text = typo(md(card.body).replace(/\s+/g, ' ').trim())
  const [head, ...rest] = sentences(text)
  return (
    <article className="slr slr-truth" aria-label={card.label} {...rootProps('truth', { scale, active })}>
      <Sky seed={(day || 1) * 7 + 3} density={0.55} />
      <Eyebrow>{card.label}</Eyebrow>
      <p className="slr-truth__text slr-in" data-size={sizeOf(text.length)} style={{ '--i': 1 }}>
        <span className="slr-truth__lead">{head}</span>
        {rest.length ? <> <span className="slr-truth__rest">{rest.join(' ')}</span></> : null}
      </p>
      <i className="slr-truth__rule slr-in" style={{ '--i': 3 }} aria-hidden="true" />
    </article>
  )
}
