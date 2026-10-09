// Objectives · Streak — the flame count, the month heat-calendar, the shield bay.
// Pure read of the store (useStore + useStreak). The calendar is a 7-column honeycomb of hex cells: intensity = cell.level,
// today carries a lit rim, a flame marks a finished lesson, a star a Selah day, a shield a day a shield held.
// The section pads nothing horizontally: the composer owns the gutter.
import { useId, useMemo, useRef, useState } from 'react'
import { Icon } from '../../icons.jsx'
import { FlameMark, ShieldEmblem } from '../../art/index.js'
import { Counter, IconButton, Label, Panel } from '../../ui/index.js'
import { useInView } from '../../fx/motion.js'
import { activityByDate, calendarMonth, useStore, useStreak } from '../../store.js'
import { allSeries, fmtKey } from '../../lib.js'
import { now, today } from '../../now.js'
import { coach, shieldLine, streakStatus } from '../../copy.js'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const LEVELS = [0, 1, 2, 3, 4]
// Cell backing the empty-slot shield (same outline as ShieldEmblem's silhouette).
const SOCKET = 'M50 2L94 17V60L50 110L6 60V17Z'

const ym = (y, m) => y * 12 + (m - 1)
const unym = (n) => [Math.floor(n / 12), (n % 12) + 1]
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

/** First and last month worth showing: every month with a series or with activity, plus this one — continuous, so the chevrons never skip. */
function monthRange(st, at) {
  const all = [ym(at.getFullYear(), at.getMonth() + 1)]
  for (const s of allSeries) all.push(ym(s.year, s.monthNum))
  for (const k of Object.keys(activityByDate(st))) all.push(ym(+k.slice(0, 4), +k.slice(5, 7)))
  return [Math.min(...all), Math.max(...all)]
}

function cellLabel(c) {
  const d = fmtKey(c.key)
  const bits = []
  if (c.today) bits.push('Today')
  if (c.flame) bits.push(plural(c.lessons, 'lesson', 'lessons') + (c.xp ? `, ${c.xp} XP` : ''))
  else if (c.save === 'shield') bits.push('A shield held your streak')
  else if (c.save === 'selah' || c.rest) bits.push('Selah day')
  else if (!c.future) bits.push(c.today ? 'Not yet launched' : 'No lesson')
  return `${d}${bits.length ? '. ' + bits.join('. ') : ''}`
}

function Cell({ c, i }) {
  let glyph
  if (c.flame) glyph = <Icon name="flame" size={16} weight="solid" />
  else if (c.save === 'shield') glyph = <Icon name="shield" size={16} weight="solid" />
  else if (c.save === 'selah' || c.rest) glyph = <Icon name="star" size={16} weight="solid" />
  else glyph = <span className="obs-day">{c.day}</span>
  return (
    <li
      className="obs-cell"
      aria-label={cellLabel(c)}
      data-level={c.level}
      data-today={c.today ? '' : undefined}
      data-future={c.future ? '' : undefined}
      data-save={c.save || (c.rest && !c.flame ? 'rest' : undefined)}
      data-flame={c.flame ? '' : undefined}
      style={{ '--i': i }}
    >
      <span className="obs-hex" aria-hidden="true"><b>{glyph}</b></span>
    </li>
  )
}

function Calendar({ st, k, inView }) {
  const at = now()
  const [lo, hi] = useMemo(() => monthRange(st, at), [st]) // eslint-disable-line react-hooks/exhaustive-deps
  const [cur, setCur] = useState(() => Math.min(hi, Math.max(lo, ym(at.getFullYear(), at.getMonth() + 1))))
  const [dir, setDir] = useState(0)
  const step = (d) => { setDir(d); setCur((v) => Math.min(hi, Math.max(lo, v + d))) }
  const [y, m] = unym(Math.min(hi, Math.max(lo, cur)))
  const cal = useMemo(() => calendarMonth(st, y, m, { at, weekStart: 1 }), [st, y, m]) // eslint-disable-line react-hooks/exhaustive-deps
  const dormant = k.state === 'none' && Object.keys(st.log).length === 0 && !st.lastDone
  const head = useId()
  return (
    <Panel className="obs-cal" aria-labelledby={head}>
      <div className="obs-nav">
        <IconButton icon="chevronLeft" label="Previous month" size="sm" disabled={cur <= lo} onClick={() => step(-1)} />
        <div className="obs-month" aria-live="polite">
          <span id={head} className="obs-month__name">{cal.label}</span>
          <span className="obs-month__tele">{cal.activeDays} {cal.activeDays === 1 ? 'DAY' : 'DAYS'} LIT · {cal.lessons} {cal.lessons === 1 ? 'LESSON' : 'LESSONS'}</span>
        </div>
        <IconButton icon="chevronRight" label="Next month" size="sm" disabled={cur >= hi} onClick={() => step(1)} />
      </div>

      <div className="obs-wk" aria-hidden="true">{WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}</div>
      <ul
        key={`${y}-${m}`}
        className="obs-grid"
        aria-label={`${cal.label} activity`}
        data-dormant={dormant ? '' : undefined}
        data-in={inView ? '' : undefined}
        data-dir={dir}
      >
        {cal.weeks.flat().map((c, i) => (c ? <Cell key={c.key} c={c} i={i} /> : <li key={'pad' + i} className="obs-pad" aria-hidden="true" />))}
      </ul>

      {dormant ? (
        <p className="obs-first">
          <FlameMark size={28} lit={false} decorative />
          <span>Your first flame lights here.</span>
        </p>
      ) : null}

      <div className="obs-legend" aria-hidden="true">
        <span className="obs-key">
          <span className="t-mono-sm">LESS</span>
          {LEVELS.map((l) => <i key={l} className="obs-swatch" data-level={l} />)}
          <span className="t-mono-sm">MORE</span>
        </span>
        <span className="obs-key"><Icon name="flame" size={16} weight="solid" className="obs-key__flame" /><span className="t-mono-sm">LESSON</span></span>
        <span className="obs-key"><Icon name="star" size={16} weight="solid" className="obs-key__star" /><span className="t-mono-sm">SELAH</span></span>
        <span className="obs-key"><Icon name="shield" size={16} weight="solid" className="obs-key__shield" /><span className="t-mono-sm">SAVED</span></span>
      </div>
    </Panel>
  )
}

function ShieldBay({ k, seed }) {
  const slots = Array.from({ length: k.max }, (_, i) => i)
  const status = k.held >= k.max ? shieldLine('max', {}, seed) : k.held === 1 ? shieldLine('low', {}, seed) : shieldLine('none', {}, seed)
  return (
    <Panel className="obs-bay">
      <div className="obs-bay__row">
        <div className="obs-slots" role="img" aria-label={`${k.held} of ${k.max} shields held`}>
          {slots.map((i) => (
            i < k.held
              ? <ShieldEmblem key={i} size={52} state={i < k.pending.shield ? 'active' : 'ready'} decorative />
              : (
                <svg key={i} className="obs-socket" viewBox="0 0 100 112" width={46} height={52} aria-hidden="true">
                  <path d={SOCKET} />
                </svg>
              )
          ))}
        </div>
        <div className="obs-bay__text">
          <div className="obs-bay__head">
            <Label>Shields</Label>
            <span className="obs-tele" data-tone="tele">{k.held} / {k.max}</span>
          </div>
          <p className="obs-bay__status" aria-live="polite">{status}</p>
          <span className="obs-tele">{k.held >= k.max ? 'BAY FULL' : `NEXT SHIELD · ${plural(k.shieldIn, 'DAY', 'DAYS')}`}</span>
        </div>
      </div>
      <p className="obs-how">{coach.shield.body}</p>
    </Panel>
  )
}

export default function Streak({ s }) { // eslint-disable-line no-unused-vars
  const st = useStore()
  const k = useStreak()
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '0px 0px -8% 0px' })
  const seed = today()
  const status = streakStatus(k, seed)
  const lv = k.count >= 21 ? 3 : k.count >= 7 ? 2 : k.count >= 3 ? 1 : 0
  const titleId = useId()
  return (
    <section ref={ref} className="obs obs-streak" aria-labelledby={titleId} data-state={k.state}>
      <header className="obs-hero">
        <FlameMark className="obs-flame" size={84} lit={k.alive} level={lv} decorative />
        <div className="obs-count">
          <h2 id={titleId} className="obs-count__row" aria-label={`${k.count} day streak`}>
            <Counter key={inView ? 'in' : 'pre'} className="obs-num" value={k.count} animate={inView} data-armed={inView ? 'true' : 'false'} aria-hidden="true" />
          </h2>
          <Label className="obs-count__label" aria-hidden="true">Day streak</Label>
        </div>
        {k.best > 0 ? (
          <div className="obs-best">
            <Label mono>BEST</Label>
            <b>{k.best}</b>
          </div>
        ) : null}
      </header>

      <div className="obs-state" data-tone={status.tone} aria-live="polite">
        <p className="obs-state__sub">{status.sub}</p>
        {status.note ? <p className="obs-state__note">{status.note}</p> : null}
      </div>

      <Calendar st={st} k={k} inView={inView} />
      <ShieldBay k={k} seed={seed} />
    </section>
  )
}
