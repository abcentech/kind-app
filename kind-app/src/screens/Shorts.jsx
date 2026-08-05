import { title as sentence, todayNumber } from '../lib.js'
import { Icon } from '../icons.jsx'

/** The 60-second rail. Real thumbnails when a video is mapped, typography when not. */
export default function Shorts({ s }) {
  const today = todayNumber(s)
  const mapped = s.shortsVideos || []
  const playlist = s.shortsPlaylist ? `https://www.youtube.com/playlist?list=${s.shortsPlaylist}` : s.shortsUrl

  const clips = mapped.length
    ? mapped.slice().reverse().map((v) => ({
        key: v.videoId, title: v.title, line: '',
        tag: v.day === today ? 'TODAY' : v.day ? 'DAY ' + v.day : 'SHORT',
        url: `https://www.youtube.com/shorts/${v.videoId}`,
        img: `https://i.ytimg.com/vi/${v.videoId}/oardefault.jpg`,
        tone: 1,
      }))
    : s.shorts.map((sh) => {
        const d = s.calendar.find((x) => x.episode === sh.n)
        return {
          key: 'w' + sh.n, title: sentence(sh.title), line: sh.quote || sh.hook,
          tag: d?.day === today ? 'TODAY' : d ? 'DAY ' + d.day : 'SHORT ' + sh.n,
          url: s.shortsUrl, img: null, tone: (d?.week ?? 0) + 1,
        }
      })

  return (
    <section className="screen">
      <div className="hdr">
        <div className="hdr-l">
          <span className="kicker">{s.title}</span>
          <h1 className="title">Sixty seconds</h1>
          <p className="dek">One sharp truth a day — made to send to someone.</p>
        </div>
      </div>

      <a className="btn quiet wide" href={playlist} target="_blank" rel="noopener"
        style={{ marginBottom: 20 }}>Watch on YouTube</a>

      <div className="reel">
        {clips.map((c) => (
          <a key={c.key} className={'clip tone' + c.tone + (c.img ? '' : ' plain')} href={c.url} target="_blank" rel="noopener">
            {c.img && <img src={c.img} alt="" loading="lazy" />}
            <span className="clip-tag">{c.tag}</span>
            <Icon.play />
            <span className="clip-b">
              <b>{c.title}</b>
              {c.line && <p>{c.line}</p>}
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
