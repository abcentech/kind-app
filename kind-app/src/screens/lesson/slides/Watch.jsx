// slides-read · WATCH — tonight's episode in a titanium bezel. The player is the lite facade (no iframe until a tap) and is unmounted
// whenever the slide is not the visible one, so swiping on stops the sound. Offline it becomes a quiet panel and a way past it.
import { Icon } from '../../../icons.jsx'
import { lessonCopy } from '../../../copy.js'
import { useOnline } from '../../../pwa.js'
import * as Lite from '../../../ui/LiteYouTube.jsx'
import { Eyebrow, rootProps, typo } from './Read.jsx'

const LiteYouTube = Lite.default || Lite.LiteYouTube
// copy.js has no line for this one yet (see REQUESTS); it will win as soon as it appears.
const SKIP = lessonCopy.watch.skip || 'Offline? Skip this one'

export default function Watch({ card, scale, active, next }) {
  const online = useOnline()
  const shown = active !== false
  return (
    <article className="slr slr-watch" aria-label={card.label} {...rootProps('watch', { scale, active })}>
      <Eyebrow>{card.label || lessonCopy.slide.watch}</Eyebrow>
      {card.title ? <h2 className="slr-watch__title slr-in" style={{ '--i': 1 }}>{typo(card.title)}</h2> : null}
      <div className="slr-watch__bezel slr-in" style={{ '--i': 2 }}>
        <div className="slr-watch__frame">
          <div className="slr-watch__screen" data-online={online ? 'true' : 'false'}>
            {online ? (
              shown && LiteYouTube ? <LiteYouTube videoId={card.videoId} title={card.title} ratio="16/9" /> : <div className="slr-watch__off" />
            ) : (
              <div className="slr-watch__off" role="img" aria-label={lessonCopy.watch.offline}>
                <Icon name="wifiOff" size={32} />
                <span>{lessonCopy.watch.offline}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="slr-watch__foot slr-in" style={{ '--i': 3 }}>
        {online ? <p className="slr-watch__hint">{lessonCopy.watch.hint}</p> : null}
        <div className="slr-watch__links">
          {card.url ? (
            <a className="slr-link" href={card.url} target="_blank" rel="noopener noreferrer">
              <Icon name="youtube" size={20} />
              <span>{lessonCopy.watch.youtube}</span>
              <Icon name="external" size={16} />
            </a>
          ) : null}
          {online ? null : (
            <button type="button" className="slr-link slr-link--quiet" onClick={() => next?.()}>{SKIP}</button>
          )}
        </div>
      </div>
    </article>
  )
}
