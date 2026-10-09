// learn-hud · the few pieces the four HUD sheets share (and the flame ladder the bar uses). Private to src/screens/hud + Hud.jsx.
import { cx } from '../../ui/Button.jsx'

export const pad2 = (n) => String(Math.max(0, Math.floor(n) || 0)).padStart(2, '0')

/** Flame size follows the streak: a spark under 3 days, a full burn from 14. Matches FlameMark's 0-3 levels. */
export const flameLevel = (n) => (n >= 14 ? 3 : n >= 7 ? 2 : n >= 3 ? 1 : 0)

/** The sheet's own pace for leaving a sheet before the next thing opens (Sheet exits in ~one --t-base). */
export const AFTER_SHEET = 300

/** A hairline-ruled heading: TITLE ————— aside. */
export function Section({ title, aside, className, children, ...rest }) {
  return (
    <section className={cx('hud-sec', className)} {...rest}>
      <header className="hud-sec__head">
        <h3 className="hud-sec__title">{title}</h3>
        {aside ? <span className="hud-sec__aside">{aside}</span> : null}
      </header>
      {children}
    </section>
  )
}

/** A telemetry readout: tiny mono caption over a display numeral. Use inside <dl className="hud-reads">. */
export function Readout({ label, value, unit, tone }) {
  return (
    <div className="hud-read" data-tone={tone}>
      <dt className="hud-read__k">{label}</dt>
      <dd className="hud-read__v">{value}{unit ? <small>{unit}</small> : null}</dd>
    </div>
  )
}
