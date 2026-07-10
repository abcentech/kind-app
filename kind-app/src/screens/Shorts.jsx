import { series, calendar, episodes, todayNumber, shorts, shortsPlaylist } from '../lib.js'

const SKINS = ['s1', 's2', 's3']

export default function Shorts() {
  const today = todayNumber()
  const playlistUrl = shortsPlaylist
    ? `https://www.youtube.com/playlist?list=${shortsPlaylist}`
    : series.shortsUrl

  // Real shorts from the channel when mapped; otherwise derive cards from episodes reached so far.
  const cards = shorts.length
    ? shorts.slice().reverse().map((sh) => {
        const ep = sh.day ? episodes[calendar[sh.day - 1]?.episode] : null
        return {
          key: sh.videoId, title: sh.title, hook: ep ? `With Day ${sh.day}: ${ep.title}` : '',
          tag: sh.day === today ? '✦ Today' : sh.day ? `Day ${sh.day}` : 'Short',
          url: `https://www.youtube.com/shorts/${sh.videoId}`,
          img: `https://i.ytimg.com/vi/${sh.videoId}/oardefault.jpg`,
        }
      })
    : calendar
        .filter((d) => d.type === 'teaching' && d.day <= today)
        .reverse()
        .map((d, i) => {
          const ep = episodes[d.episode]
          return {
            key: ep.num, title: ep.title, hook: ep.shortHook || ep.quote,
            tag: (i === 0 ? '✦ Today · ' : '') + `Ep ${ep.num}`, url: series.shortsUrl, img: null,
          }
        })

  return (
    <section className="screen">
      <div className="shead">
        <span className="eyebrow">{series.title} · in 60 seconds</span>
        <h1>Daily Shorts</h1>
        <p className="sub">One shareable minute per episode — <a href={playlistUrl} target="_blank" rel="noopener noreferrer">full playlist ↗</a></p>
      </div>
      <div className="shorts-rail">
        {cards.map((c, i) => (
          <a key={c.key} className={'short ' + SKINS[i % 3]} href={c.url} target="_blank" rel="noopener noreferrer"
            style={c.img ? { backgroundImage: `url(${c.img})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
            <span className="tag">{c.tag}</span>
            <span className="playmini" />
            <span className="t">{c.title}</span>
            <span className="h">{c.hook}</span>
            <span className="cta">Watch · 60 sec →</span>
          </a>
        ))}
      </div>
    </section>
  )
}
