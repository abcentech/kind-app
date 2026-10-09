// ArchiveBanner — the mission-status strip under the HUD. Only when the month is not live:
//   archive   MISSION COMPLETE — August 2026 · 12 of 31 flown      (the calendar month is over; the count is what YOU flew)
//   upcoming  NEXT MISSION — August 2026 · opens Sat 1 Aug
// One mono line with a status LED. It is a status, not a button, so it takes no pointer events.
import { fmtDate } from '../../copy.js'

export default function ArchiveBanner({ j, s }) {
  if (!j || j.mode === 'live') return null
  const upcoming = j.mode === 'upcoming'
  const { done, total } = j.progress
  const opens = j.stages[0]?.nodes[0]?.unlockAt
  // "Mission complete" is only true once every day is flown; an archive mission you have not finished is just open
  const head = upcoming ? 'Next mission' : total > 0 && done >= total ? 'Mission complete' : 'Archive mission'
  const rest = upcoming
    ? `${s.month} ${s.year}${opens ? ` · opens ${fmtDate(opens)}` : ''}`
    : `${s.month} ${s.year} · ${done} of ${total} flown`
  return (
    <div className="learn-banner" data-mode={j.mode} role="status">
      <i className="learn-banner__led" aria-hidden="true" />
      <b className="learn-banner__head">{head}</b>
      <span className="learn-banner__dash" aria-hidden="true">—</span>
      <span className="learn-banner__rest">{rest}</span>
    </div>
  )
}
