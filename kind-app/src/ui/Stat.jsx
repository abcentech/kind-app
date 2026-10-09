// ui-core · Stat — a telemetry readout: mono eyebrow, a big tabular Barlow numeral, a small unit, an optional sub-line.
import { cx, renderIcon, stageVars } from './Button.jsx'

export function Stat({ label, value, unit, icon, tone = 'ink', sub, size = 'md', stage, className, style, ...rest }) {
  return (
    <div className={cx('k-stat', className)} data-tone={stage ? 'stage' : tone} data-size={size} style={stageVars(stage, style)} {...rest}>
      {label != null && (
        <div className="k-stat__label">
          {icon ? renderIcon(icon, 16, { className: 'k-stat__icon' }) : null}
          <span>{label}</span>
        </div>
      )}
      <div className="k-stat__val">
        <span className="k-stat__num">{value}</span>
        {unit != null && <span className="k-stat__unit">{unit}</span>}
      </div>
      {sub != null && <div className="k-stat__sub">{sub}</div>}
    </div>
  )
}

export default Stat
