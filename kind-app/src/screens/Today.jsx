import { series, calendar, todayNumber, dayInfo, dayTitle, dayRef, dayEyebrow, dayHookline, segmentsFor, fmtDate, greeting, cap, episodes } from '../lib.js'
import { useStore, doneSegs, perfectWeeks } from '../store.js'
import { Stars, Countdown, Mountain } from './bits.jsx'

export default function Today({ goDay }) {
  const s = useStore()
  const n = todayNumber()
  const d = dayInfo(n)
  const segs = segmentsFor(n)
  const done = doneSegs(s, n).length
  const votd = d.type === 'teaching' ? episodes[d.episode].scripture : series.themeScripture
  const CIRC = 119.4
  const fam = s.familyName ? `${s.familyName} family` : 'friend of God'

  return (
    <section className="screen">
      <div className="sky">
        <Stars n={26} />
        <div className="moonsun" />
        <svg className="hills" viewBox="0 0 396 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 90 L0 55 Q60 20 130 48 T260 42 T396 50 L396 90 Z" fill="rgba(14,51,32,.55)" />
          <path d="M0 90 L0 70 Q80 45 170 66 T340 60 T396 66 L396 90 Z" fill="rgba(14,51,32,.85)" />
        </svg>
        <div className="date">{fmtDate()} · Day {n} of {calendar.length}</div>
        <h1>{greeting()},<br />{fam} 🌿</h1>
        <div className="votd">
          <div className="lbl">✦ Verse of the Day</div>
          <div className="v">"{votd.text}"</div>
          <div className="r">
            <span>{votd.ref}</span>
            <button className="share" onClick={() => shareVerse(votd)}>Share ↗</button>
          </div>
        </div>
      </div>

      <div className="float-up">
        <div className="statrow">
          <div className="stat"><b><span className="flame">🔥</span> {s.streak}</b><span>family streak</span></div>
          <div className="stat"><b>⭐ {perfectWeeks(s)}</b><span>perfect weeks</span></div>
          <div className="stat"><b>💎 {s.gems}</b><span>family gems</span></div>
        </div>

        <div className="daycard">
          <div className={'daycover cover-' + d.type + (d.week != null ? ' w' + d.week : '')}>
            <Mountain className="mtn" />
            <span className="chip">{d.week != null ? `Week ${d.week + 1} · ${series.weeks[d.week].f}` : cap(d.type)}</span>
            <span className="chip2">Day {n}</span>
            <h2>{dayTitle(n)}</h2>
            <div className="hookline">{dayHookline(n)}</div>
          </div>
          <div className="daybody">
            <div className="ringrow">
              <svg className="ring" viewBox="0 0 46 46">
                <circle className="bg" cx="23" cy="23" r="19" />
                <circle className="fg" cx="23" cy="23" r="19" strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - done / segs.length)} transform="rotate(-90 23 23)" />
                <text x="23" y="27" textAnchor="middle">{done}/{segs.length}</text>
              </svg>
              <div className="t">
                <b>{done === 0 ? 'Tonight’s devotional is waiting' : done === segs.length ? 'Day complete — well done!' : 'Pick up where you stopped'}</b>
                <span>{dayEyebrow(n)} · {dayRef(n)}</span>
              </div>
            </div>
            <button className="btn" onClick={() => goDay(n)}>
              {done === segs.length ? 'Revisit Day ' + n : done > 0 ? `Continue Day ${n} →` : `Start Day ${n} →`}
            </button>
          </div>
        </div>

        <div className="premiere">
          <span className="live"><i />Nightly Premiere</span>
          <Countdown />
          <small>UNTIL 8:00 PM WAT · LIVE ON YOUTUBE</small>
          <p>Scripture declarations, teaching &amp; prayer — live with the whole K.I.N.D. family. 639 children. One movement.</p>
          <a className="btn gold" href={series.streamsUrl} target="_blank" rel="noopener noreferrer">🔔 Set my reminder</a>
        </div>
      </div>
    </section>
  )
}

function shareVerse(v) {
  const text = `"${v.text}" — ${v.ref}\n\nFrom the KIND daily devotional 🌿 ${series.channel}`
  if (navigator.share) navigator.share({ text }).catch(() => {})
  else navigator.clipboard?.writeText(text)
}
