// Reel — one video Short as a full-height page of the reel: the vertical poster edge to edge, a dark gradient, mono telemetry,
// the title, a big hex play control. Tapping it mounts the one live <LiteYouTube autoplay> (the parent keeps a single `playing`
// key and drops it when the page scrolls away, so there is never more than one iframe). Offline it becomes a "Watch on YouTube" card.
//   <Reel short={{ day, videoId, title }} index count active near playing onPlay openDay online />
import { useState } from 'react'
import { Button, Empty, Label, Hex } from '../../ui/index.js'
import LiteYouTube, { youtubeUrl } from '../../ui/LiteYouTube.jsx'
import { Icon } from '../../icons.jsx'
import { emptyCopy, labels } from '../../copy.js'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'

// Hashtags and emoji are YouTube-title habits; the interface has neither.
export const cleanTitle = (t = '') => {
  const c = t.replace(/#\S+/g, '').replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s+/g, ' ').trim()
  return c || t.trim()
}
const pad = (n) => String(n).padStart(2, '0')
const POSTERS = ['oardefault', 'hqdefault']

export default function Reel({ short, index, count, active, near, playing, onPlay, openDay, online, firstRun }) {
  const { day, videoId } = short
  const title = cleanTitle(short.title)
  const [p, setP] = useState(0)                       // poster candidate; past the end = no art, the carbon stands in
  const watching = playing && active && online
  const label = `Day ${day} · Short`
  const link = youtubeUrl(videoId, '9/16')

  const play = () => { if (!online) return; sound.play('open'); haptic.tap(); onPlay() }
  const art = near && online && p < POSTERS.length

  const meta = (
    <header className="sho-meta">
      <Label mono tone="tele" size="sm" className="sho-meta__day">{`DAY ${day} · SHORT`}</Label>
      <span className="sho-meta__n" aria-hidden="true">{pad(index + 1)}<i>/</i>{pad(count)}</span>
    </header>
  )

  if (!online) {
    const e = emptyCopy('shortsOffline', videoId)
    return (
      <article className="sho-reel is-offline" data-active={active ? '' : undefined} aria-label={`${label}. ${title}`}>
        {meta}
        <div className="sho-offline">
          <Empty art={e.art} title={e.title} body={title} action={
            <Button as="a" variant="primary" size="md" iconRight="external" href={link} target="_blank" rel="noopener noreferrer">{labels.shorts.youtube}</Button>
          } />
        </div>
      </article>
    )
  }

  return (
    <article className="sho-reel" data-active={active ? '' : undefined} data-playing={watching ? '' : undefined} aria-label={`${label}. ${title}`}>
      <div className="sho-art" aria-hidden="true">
        {art ? (
          <img
            key={p} className="sho-art__img" src={`https://i.ytimg.com/vi/${videoId}/${POSTERS[p]}.jpg`} alt="" draggable="false"
            loading={index === 0 ? 'eager' : 'lazy'} decoding="async" fetchpriority={index === 0 ? 'high' : undefined}
            onLoad={(e) => { if (e.currentTarget.naturalWidth <= 120) setP((i) => i + 1); else e.currentTarget.dataset.shown = '' }}
            onError={() => setP((i) => i + 1)}
          />
        ) : null}
      </div>
      <i className="sho-scrim sho-scrim--top" aria-hidden="true" />
      <i className="sho-scrim sho-scrim--bot" aria-hidden="true" />
      {meta}

      {watching ? (
        <div className="sho-stage">
          <div className="sho-player"><LiteYouTube videoId={videoId} title={title} ratio="9/16" autoplay /></div>
        </div>
      ) : (
        <>
          {/* A tap anywhere on the poster plays; the hex is the one focusable control so assistive tech hears a single "Play". */}
          <div className="sho-tap" onClick={play} aria-hidden="true" />
          <div className="sho-centre">
            <span className="sho-ring" aria-hidden="true"><svg viewBox="0 0 100 115.47" focusable="false"><path d="M50 2L91.6 26V89.5L50 113.5L8.4 89.5V26Z" /></svg></span>
            <Hex as="button" size={88} state="current" tone="ignite" onClick={play} aria-label={`${labels.shorts.play}: ${title}`}>
              <Icon name="play" size={32} weight="solid" />
            </Hex>
          </div>
        </>
      )}

      <footer className="sho-foot">
        {!watching ? <h2 className="sho-title">{title}</h2> : null}
        <div className="sho-actions">
          <Button variant="secondary" size="md" icon="video" onClick={() => openDay(day)}>Watch the full episode</Button>
          {watching ? (
            <Button as="a" variant="ghost" size="md" icon="external" aria-label="Open on YouTube" href={link} target="_blank" rel="noopener noreferrer" />
          ) : (
            <Button as="a" variant="ghost" size="md" iconRight="external" href={link} target="_blank" rel="noopener noreferrer">Open on YouTube</Button>
          )}
        </div>
        {firstRun && !watching ? (
          <p className="sho-hint"><Icon name="chevronUp" size={16} />{labels.shorts.swipe}</p>
        ) : null}
      </footer>
    </article>
  )
}
