// slides-read · POINT — one teaching point. The numeral comes off the label ('Truth 2 of 3'), the pips say where you are in the set,
// the title is the point in a line, the body is plain reading with hex-bulleted lists (Prose, shared with Read).
import { Eyebrow, Prose, rootProps, typo } from './Read.jsx'

function place(card) {
  const m = /(\d+)\D+(\d+)/.exec(card.label || '') || null
  if (m) return { i: +m[1], n: +m[2] }
  const id = /^p(\d+)$/.exec(card.id || '')
  return id ? { i: +id[1], n: 0 } : { i: 0, n: 0 }
}

export default function Point({ card, scale, active }) {
  const { i, n } = place(card)
  return (
    <article className="slr slr-point" aria-label={card.label || card.title} {...rootProps('point', { scale, active })}>
      <Eyebrow>{card.label}</Eyebrow>
      {i > 0 && (
        <div className="slr-point__head slr-in" style={{ '--i': 1 }} aria-hidden="true">
          <span className="slr-point__num">{i}</span>
          {n > 1 && n <= 8 && (
            <ol className="slr-point__pips">
              {Array.from({ length: n }, (_, k) => (
                <li key={k} data-s={k + 1 === i ? 'now' : k + 1 < i ? 'past' : 'next'}><i /></li>
              ))}
            </ol>
          )}
        </div>
      )}
      {card.title ? <h2 className="slr-point__title slr-in" style={{ '--i': 2 }}>{typo(card.title)}</h2> : null}
      <Prose body={card.body} lead={false} className="slr-point__body" />
    </article>
  )
}
