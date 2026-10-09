// LiteYouTube — a thumbnail facade for a YouTube video. Nothing from YouTube loads until the viewer asks for it:
// a lazy poster, a hex play control with an ignition ring, and (on activation) the youtube-nocookie iframe.
//   <LiteYouTube videoId title ratio="16/9"|"9/16" autoplay onPlay priority />
//   autoplay  start already activated (the parent was itself a tap — the Shorts reel does this)
//   onPlay    fired once, on activation (tap, Enter or Space)
//   priority  load the poster eagerly (first item on screen)
// The box is an aspect-ratio box, so poster → iframe → fallback never shifts layout. Sized by its container's width; round it
// with --lyt-radius. Offline, or if the iframe never answers, a plain "Watch on YouTube" link takes its place.
// Styles live in src/styles/shorts.css (.lyt-), because this module is owned by the Shorts reel but used by the lesson too.
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../icons.jsx'
import { Hex } from './Hex.jsx'
import { Spinner } from './Button.jsx'
import { useOnline } from '../pwa.js'
import { sound } from '../fx/sound.js'
import { haptic } from '../fx/haptics.js'
import { emptyCopy, labels } from '../copy.js'
import '../styles/shorts.css'   // the .lyt- rules live with the reel's styles; Lesson's Watch slide and the reel both load this module

// Poster candidates, best first. oardefault is the true vertical frame of a Short; maxresdefault 404s on older uploads.
const POSTERS = {
  '9/16': ['oardefault', 'hqdefault'],
  '16/9': ['maxresdefault', 'mqdefault'],
}
const poster = (id, ratio, i) => `https://i.ytimg.com/vi/${id}/${(POSTERS[ratio] || POSTERS['16/9'])[i]}.jpg`
const SLOW_MS = 9000

export const youtubeUrl = (id, ratio) => (ratio === '9/16' ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`)
export const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&modestbranding=1&autoplay=1`

export default function LiteYouTube({ videoId, title, ratio = '16/9', autoplay = false, onPlay, priority = false, className = '' }) {
  const online = useOnline()
  const [on, setOn] = useState(Boolean(autoplay))
  const [loaded, setLoaded] = useState(false)
  const [slow, setSlow] = useState(false)
  const [src, setSrc] = useState(0)             // which poster candidate we are on; past the end = none
  const [shown, setShown] = useState(false)     // poster decoded → fade in
  const told = useRef(false)
  const vertical = ratio === '9/16'
  const name = title ? `Play video: ${title}` : 'Play video'

  // A new video resets the box (the Watch slide can swap ids without remounting).
  const seen = useRef(videoId)
  useEffect(() => {
    if (seen.current === videoId) return
    seen.current = videoId
    setOn(Boolean(autoplay)); setLoaded(false); setSlow(false); setSrc(0); setShown(false); told.current = false
  }, [videoId]) // eslint-disable-line react-hooks/exhaustive-deps

  // autoplay still reports onPlay, once.
  useEffect(() => { if (on && !told.current) { told.current = true; onPlay?.() } }, [on]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!on || loaded || !online) return undefined
    const t = setTimeout(() => setSlow(true), SLOW_MS)
    return () => clearTimeout(t)
  }, [on, loaded, online, videoId])

  const activate = () => { sound.play('tap'); haptic.tap(); setOn(true) }
  const exhausted = src >= (POSTERS[ratio] || POSTERS['16/9']).length
  const link = youtubeUrl(videoId, ratio)

  if (!online && on) {
    const e = emptyCopy('shortsOffline', videoId)
    return (
      <div className={'lyt ' + className} style={{ '--lyt-r': ratio }} data-state="offline">
        <div className="lyt-card" role="group" aria-label={title || labels.shorts.youtube}>
          <Icon name="wifiOff" size={32} />
          <p className="lyt-card__t">{e.title}</p>
          <a className="lyt-link" href={link} target="_blank" rel="noopener noreferrer">
            {labels.shorts.youtube}<Icon name="external" size={16} />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={'lyt ' + className} style={{ '--lyt-r': ratio }} data-state={on ? (loaded ? 'playing' : 'loading') : 'idle'} data-vertical={vertical ? '' : undefined}>
      {!exhausted && !loaded ? (
        <img
          key={src} className="lyt-poster" src={poster(videoId, ratio, src)} alt="" draggable="false"
          loading={priority ? 'eager' : 'lazy'} decoding="async" fetchpriority={priority ? 'high' : undefined}
          data-shown={shown ? '' : undefined}
          onLoad={(e) => (e.currentTarget.naturalWidth <= 120 ? setSrc((i) => i + 1) : setShown(true))}  // YouTube answers a missing size with a 120 px grey stand-in
          onError={() => setSrc((i) => i + 1)}
        />
      ) : null}
      <i className="lyt-scrim" aria-hidden="true" />

      {on ? (
        <>
          <iframe
            className="lyt-frame" src={embedUrl(videoId)} title={title || 'Video'}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin" data-loaded={loaded ? '' : undefined}
            onLoad={() => { setLoaded(true); setSlow(false) }}
          />
          {!loaded ? (
            <span className="lyt-wait" role="status">
              <Spinner size={28} label={labels.shorts.loading} />
            </span>
          ) : null}
          {slow && !loaded ? (
            <a className="lyt-link lyt-link--float" href={link} target="_blank" rel="noopener noreferrer">
              {labels.shorts.youtube}<Icon name="external" size={16} />
            </a>
          ) : null}
        </>
      ) : (
        <button type="button" className="lyt-hit" aria-label={name} onClick={activate}>
          <span className="lyt-play" aria-hidden="true">
            <svg className="lyt-ring" viewBox="0 0 100 115.47" focusable="false"><path d="M50 2L91.6 26V89.5L50 113.5L8.4 89.5V26Z" /></svg>
            <Hex size={72} state="current" tone="ignite"><Icon name="play" size={32} weight="solid" /></Hex>
          </span>
        </button>
      )}
    </div>
  )
}

export { LiteYouTube }
