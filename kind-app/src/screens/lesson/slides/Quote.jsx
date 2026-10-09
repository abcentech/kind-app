// slides-read · QUOTE — the sixty-second short as a pull-quote. A 0:00–1:00 tick scale is the furniture (sixty ticks, a bigger one
// every five and fifteen), the line is Newsreader italic under the gold opening quote the base type system already draws,
// and the short's own challenge sits under a hairline as 'Your move today'.
import { lessonCopy } from '../../../copy.js'
import { md } from '../../../lib.js'
import { Eyebrow, Sky, rootProps, typo } from './Read.jsx'

const TICKS = Array.from({ length: 61 }, (_, i) => i)
const unquote = (t) => t.replace(/^["“]([\s\S]*)["”]$/, '$1').trim()   // the ornament is the opening quote
const sizeOf = (n) => (n <= 48 ? 'xl' : n <= 80 ? 'l' : n <= 120 ? 'm' : 's')

export default function Quote({ card, day, scale, active }) {
  const text = typo(unquote(md(card.body).replace(/\s+/g, ' ').trim()))
  const sub = card.sub ? typo(md(card.sub).replace(/\s+/g, ' ').trim()) : ''
  return (
    <article className="slr slr-quote" aria-label={card.label} {...rootProps('quote', { scale, active })}>
      <Sky seed={(day || 1) * 5 + 1} density={0.4} fade="top" />
      <Eyebrow>{card.label}</Eyebrow>
      <div className="slr-quote__scale slr-in" style={{ '--i': 1 }} aria-hidden="true">
        <div className="slr-quote__ticks">
          {TICKS.map((t) => (
            <i key={t} data-m={t % 15 === 0 ? '15' : t % 5 === 0 ? '5' : undefined} style={{ '--i': t }} />
          ))}
        </div>
        <div className="slr-quote__ends"><span>0:00</span><span>1:00</span></div>
      </div>
      <blockquote className="slr-quote__text t-quote slr-in" data-size={sizeOf(text.length)} style={{ '--i': 2 }}>{text}</blockquote>
      {sub ? (
        <div className="slr-quote__sub slr-in" style={{ '--i': 4 }}>
          <span className="slr-quote__subtag">{lessonCopy.slide.challenge}</span>
          <p>{sub}</p>
        </div>
      ) : null}
    </article>
  )
}
