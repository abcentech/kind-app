import { useState } from 'react'
import { series, dayInfo, dayTitle, dayRef, dayEyebrow, segmentsFor } from '../lib.js'
import { useStore, doneSegs, toggleSegment, isDayDone, toggleKidDone } from '../store.js'
import { Stars, buzz } from './bits.jsx'
import Celebrate from './Celebrate.jsx'
import MemoryGame from './MemoryGame.jsx'

export default function DayView({ day, back, goJourney }) {
  const s = useStore()
  const segs = segmentsFor(day)
  const done = new Set(doneSegs(s, day))
  const [celebrating, setCelebrating] = useState(false)
  const [open, setOpen] = useState(() => segs.find((x) => !done.has(x.id))?.id ?? segs[0].id)
  const d = dayInfo(day)
  const complete = isDayDone(s, day)

  const onToggle = (id) => {
    const wasDone = done.has(id)
    const justCompleted = toggleSegment(day, id)
    if (justCompleted) setCelebrating(true)
    else if (!wasDone) {
      buzz(14)
      const idx = segs.findIndex((x) => x.id === id)
      const next = segs.slice(idx + 1).find((x) => !done.has(x.id)) || segs.find((x) => x.id !== id && !done.has(x.id))
      if (next) setOpen(next.id)
    }
  }

  return (
    <section className={'screen dayview theme-' + (d.week ?? 'x') + ' type-' + d.type}>
      {celebrating && (
        <Celebrate day={day} streak={s.streak} kids={s.kids} kidDone={s.kidDone[day]} onClose={() => setCelebrating(false)} />
      )}
      <div className="dayhead">
        <Stars n={16} />
        <button className="back" onClick={back}>‹ Back</button>
        <span className="eyebrow gold-ey">{dayEyebrow(day)}</span>
        <h1>{dayTitle(day)}</h1>
        <div className="ref">{dayRef(day)} · {series.title}</div>
        <div className="seg-dots" aria-hidden="true">
          {segs.map((x) => <i key={x.id} className={done.has(x.id) ? 'on' : ''} />)}
        </div>
      </div>

      {d.type !== 'selah' && <Video day={day} />}
      {(d.type === 'selah' || d.type === 'review') && (
        <div className="fcard memcard">
          <span className="eyebrow">🧠 Memory verse game</span>
          <MemoryGame text={series.themeScripture.text} refr={series.themeScripture.ref} />
        </div>
      )}

      {complete && !celebrating && (
        <div className="complete-banner show">🎉 Day {day} complete · 🔥 {s.streak} · tap any segment to revisit</div>
      )}

      {segs.map((seg) => (
        <div key={seg.id} className={'seg' + (done.has(seg.id) ? ' done' : '') + (seg.talk ? ' talk' : '')}>
          <button className="head" onClick={() => setOpen(open === seg.id ? null : seg.id)}>
            <span className="ic">{seg.icon}</span>
            <span><span className="k">{seg.k}</span><b>{seg.title}</b></span>
            <span className="tick" role="checkbox" aria-checked={done.has(seg.id)} tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onToggle(seg.id) }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggle(seg.id) } }}>✓</span>
          </button>
          {open === seg.id && (
            <div className="body">
              <Body seg={seg} />
              {seg.talk && s.kids.length > 0 && <KidRow day={day} s={s} />}
              {!done.has(seg.id) && (
                <button className="mark" onClick={() => onToggle(seg.id)}>Mark done ✓</button>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="dayfoot">
        <button className="btn ghost" onClick={goJourney}>View the full climb →</button>
      </div>
    </section>
  )
}

/** Each child taps their own “I did it!” — their gems, their moment. */
function KidRow({ day, s }) {
  const marked = new Set(s.kidDone[day] || [])
  return (
    <div className="kidrow">
      <span className="kidrow-l">Who did it?</span>
      {s.kids.map((k, i) => (
        <button key={i} className={'kidchip' + (marked.has(i) ? ' on' : '')}
          onClick={() => { toggleKidDone(day, i); buzz(12) }}>
          <span className="ke">{k.emoji}</span>{k.name}
          {marked.has(i) && <span className="kplus">+3💎</span>}
        </button>
      ))}
    </div>
  )
}

function Video({ day }) {
  const { videoId } = dayInfo(day)
  const [playing, setPlaying] = useState(false)
  if (!videoId)
    return (
      <a className="video" href={series.channel} target="_blank" rel="noopener noreferrer">
        <Thumb />
        <div className="cap"><span><b>Watch tonight’s episode</b> · replay of the 8PM premiere</span><span className="yt">▶ YouTube</span></div>
      </a>
    )
  if (playing)
    return (
      <div className="video">
        <iframe className="ytframe" src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title="Today's episode" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        <div className="cap"><span><b>Today’s episode</b> · from the 8PM premiere</span>
          <a className="yt" href={`https://youtu.be/${videoId}`} target="_blank" rel="noopener noreferrer">▶ YouTube</a></div>
      </div>
    )
  return (
    <button className="video asbtn" onClick={() => setPlaying(true)}>
      <Thumb img={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} />
      <div className="cap"><span><b>Watch today’s episode</b> · tap to play</span><span className="yt">▶ YouTube</span></div>
    </button>
  )
}

function Thumb({ img }) {
  return (
    <div className="thumb" style={img ? { backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
      {!img && (
        <svg className="mtn" viewBox="0 0 396 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 60 L70 18 L120 44 L190 6 L260 48 L330 22 L396 60 Z" fill="rgba(255,255,255,.12)" />
        </svg>
      )}
      <div className="play" />
    </div>
  )
}

function Body({ seg }) {
  const cls = seg.scripture ? 'scripture' : seg.idea ? 'bigidea' : ''
  return (
    <>
      {seg.body.split('\n\n').map((p, i) => (
        <p key={i} className={cls}>{p.split('\n').map((l, j) => <span key={j}>{j > 0 && <br />}{strip(l)}</span>)}</p>
      ))}
      {seg.link && <p><a href={seg.link} target="_blank" rel="noopener noreferrer">Open on YouTube Shorts →</a></p>}
    </>
  )
}
const strip = (s) => s.replace(/\*\*?([^*]+)\*\*?/g, '$1').replace(/^> ?/, '')
