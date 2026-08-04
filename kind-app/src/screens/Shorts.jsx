import { title, todayNumber } from '../lib.js'

/** The 60-second rail. Real channel videos when mapped, the written Shorts otherwise. */
export default function Shorts({ s }) {
  const today = todayNumber(s)
  const mapped = s.shortsVideos || []
  const playlistUrl = s.shortsPlaylist ? `https://www.youtube.com/playlist?list=${s.shortsPlaylist}` : s.shortsUrl

  const cards = mapped.length
    ? mapped.slice().reverse().map((v) => ({
        key: v.videoId,
        title: v.title,
        line: v.day ? `Day ${v.day}` : 'Short',
        tag: v.day === today ? '✦ Today' : v.day ? `Day ${v.day}` : 'Short',
        url: `https://www.youtube.com/shorts/${v.videoId}`,
        img: `https://i.ytimg.com/vi/${v.videoId}/oardefault.jpg`,
      }))
    : s.shorts.map((sh) => {
        const day = s.calendar.find((d) => d.episode === sh.n)?.day
        return {
          key: 'w' + sh.n,
          title: title(sh.title),
          line: sh.hook,
          tag: day === today ? '✦ Today' : day ? `Day ${day}` : `Short ${sh.n}`,
          url: s.shortsUrl,
          img: null,
          quote: sh.quote,
        }
      })

  return (
    <section className="screen shorts">
      <header className="h-top">
        <div>
          <span className="eyebrow">{s.title}</span>
          <h1>60-second shorts</h1>
          <p className="sub">One sharp truth a day — made to send to a friend.</p>
        </div>
      </header>
      <a className="btn ghost wide" href={playlistUrl} target="_blank" rel="noopener">Open on YouTube ↗</a>
      <div className="shortgrid">
        {cards.map((c, i) => (
          <a key={c.key} className={'sh s' + (i % 3 + 1)} href={c.url} target="_blank" rel="noopener">
            {c.img && <img src={c.img} alt="" loading="lazy" />}
            <span className="sh-tag">{c.tag}</span>
            <div className="sh-body">
              <b>{c.title}</b>
              {c.quote ? <em>“{c.quote}”</em> : <small>{c.line}</small>}
            </div>
            <span className="sh-play">▶</span>
          </a>
        ))}
      </div>
    </section>
  )
}
