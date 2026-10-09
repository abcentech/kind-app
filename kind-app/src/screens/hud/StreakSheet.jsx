// learn-hud · StreakSheet — the flame, in full: the streak numeral, what to do about it today, the month as a heat calendar,
// and how shields stand behind it. Props: { open, onClose, onSwap(kind) }  (onSwap closes this and opens another HUD sheet).
import { useMemo, useState } from 'react'
import { Sheet, Button, IconButton, SegmentBar, Counter, Label } from '../../ui/index.js'
import { FlameMark, ShieldEmblem } from '../../art/index.js'
import { Icon } from '../../icons.jsx'
import { useShell } from '../../shell.jsx'
import { activityByDate, calendarMonth, lifetimeStats, shareData, useStore, useStreak, useToday } from '../../store.js'
import { currentDay } from '../../lib.js'
import { fmtDate, shieldLine, streakStatus } from '../../copy.js'
import { now } from '../../now.js'
import { AFTER_SHEET, Readout, Section, flameLevel, pad2 } from './parts.jsx'

const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S']                       // weekStart 1: Monday first, like the store's default
const WD_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function cellName(c, y, m) {
  const date = fmtDate(new Date(y, m - 1, c.day))
  const what = c.lessons
    ? `${c.lessons} ${c.lessons === 1 ? 'lesson' : 'lessons'}, ${c.xp} XP`
    : c.save === 'shield' ? 'a shield held your streak'
    : c.save === 'selah' ? 'Selah rest day, streak kept'
    : c.future ? 'still ahead'
    : c.rest ? 'rest day'
    : 'no lesson'
  return `${date}${c.today ? ' (today)' : ''}: ${what}`
}

function Glyph({ c }) {
  if (c.flame) return <Icon.flame size={16} weight="solid" />
  if (c.save === 'shield') return <Icon.shield size={16} weight="duo" />
  if (c.save === 'selah' || (c.rest && !c.future)) return <Icon.moon size={16} weight={c.save ? 'duo' : 'line'} />
  return null
}

function Calendar() {
  const st = useStore()
  const t = now()
  const cur = t.getFullYear() * 12 + t.getMonth()
  const first = useMemo(() => {
    const k = Object.keys(activityByDate(st)).sort()[0]
    if (!k) return cur
    const [y, m] = k.split('-').map(Number)
    return Math.min(cur, y * 12 + (m - 1))
  }, [st, cur])
  const [idx, setIdx] = useState(cur)
  const [dir, setDir] = useState(0)
  const y = Math.floor(idx / 12)
  const m = (idx % 12) + 1
  const cal = calendarMonth(st, y, m)
  const go = (d) => { setDir(d); setIdx((i) => Math.min(cur, Math.max(first, i + d))) }
  return (
    <Section title="Your month" aside={`${cal.activeDays} active ${cal.activeDays === 1 ? 'day' : 'days'}`}>
      <div className="hud-cal">
        <div className="hud-cal__nav">
          <IconButton icon="chevronLeft" label="Previous month" disabled={idx <= first} onClick={() => go(-1)} />
          <div className="hud-cal__month" aria-live="polite">{cal.label}</div>
          <IconButton icon="chevronRight" label="Next month" disabled={idx >= cur} onClick={() => go(1)} />
        </div>
        <div role="table" aria-label={`${cal.label}, daily activity`} className="hud-cal__grid" key={idx} data-dir={dir}>
          <div role="row" className="hud-cal__row hud-cal__head">
            {WD.map((d, i) => <span role="columnheader" aria-label={WD_LONG[i]} key={i}>{d}</span>)}
          </div>
          {cal.weeks.map((w, wi) => (
            <div role="row" className="hud-cal__row" key={wi}>
              {w.map((c, ci) => c ? (
                <div
                  role="cell" key={c.key} className="hud-cell" aria-label={cellName(c, y, m)}
                  data-level={c.level} data-today={c.today || undefined} data-future={c.future || undefined}
                  data-save={c.save || undefined} data-rest={c.rest && !c.flame && !c.save ? '' : undefined}
                >
                  <span className="hud-cell__d" aria-hidden="true">{c.day}</span>
                  <span className="hud-cell__g" aria-hidden="true"><Glyph c={c} /></span>
                </div>
              ) : <span role="cell" className="hud-cell is-pad" key={'p' + ci} aria-hidden="true" />)}
            </div>
          ))}
        </div>
        <div className="hud-legend" aria-hidden="true">
          <span className="hud-legend__scale">Less{[0, 1, 2, 3, 4].map((l) => <i className="hud-sw" data-level={l} key={l} />)}More</span>
          <span className="hud-legend__key"><Icon.shield size={16} weight="duo" />Shield</span>
          <span className="hud-legend__key"><Icon.moon size={16} />Selah</span>
        </div>
      </div>
    </Section>
  )
}

function ShieldCard({ info, onSwap }) {
  const toward = 7 - info.shieldIn
  return (
    <Section title="Shields" aside={`${info.held} / ${info.max} held`}>
      <div className="hud-card">
        <div className="hud-card__row">
          <ShieldEmblem size={52} state="ready" decorative className={info.held ? undefined : 'is-empty'} />
          <div className="hud-card__txt">
            <p className="hud-card__lead">{info.held >= info.max ? shieldLine('max', {}, 'streak') : shieldLine('next', { n: info.shieldIn }, 'streak-' + info.shieldIn)}</p>
            <p className="hud-card__sub">A missed day spends a shield instead of ending your streak. Selah rest days are always free.</p>
          </div>
        </div>
        {info.held < info.max ? (
          <SegmentBar total={7} done={toward} current={-1} tone="tele" label={`${toward} of 7 days toward your next shield`} />
        ) : null}
        <button type="button" className="hud-link" onClick={() => onSwap('shield')}>
          How shields work<Icon.chevronRight size={16} />
        </button>
      </div>
    </Section>
  )
}

export default function StreakSheet({ open, onClose, onSwap }) {
  const st = useStore()
  const info = useStreak()
  const k = useToday()
  const { s, seriesId, openDay, share } = useShell() || {}
  const status = streakStatus(info, k)
  const life = lifetimeStats(st)
  const lit = info.doneToday
  const later = (fn) => { onClose(); setTimeout(fn, AFTER_SHEET) }

  const footer = lit ? (
    <Button variant="secondary" icon="share" full onClick={() => later(() => share?.({ kind: 'streak', data: shareData('streak', st, seriesId) }))}>
      Share my streak
    </Button>
  ) : (
    <Button variant="primary" icon="rocket" full onClick={() => later(() => s && openDay?.(currentDay(s, st)))}>
      {info.state === 'lost' || info.state === 'none' ? 'Start today’s launch' : 'Launch today'}
    </Button>
  )

  return (
    <Sheet open={open} onClose={onClose} title="Streak" eyebrow={info.count > 0 ? `T+ ${pad2(info.count)} DAYS` : 'STANDING BY'} detents={['full']} footer={footer}>
      <div className="hud-sheet hud-streak" data-state={info.state}>
        <section className="hud-hero" aria-label={status.aria}>
          <div className="hud-hero__mark" data-lit={lit || undefined} data-risk={info.state === 'at-risk' || undefined}>
            <FlameMark size={96} lit={lit} level={flameLevel(info.count)} decorative />
          </div>
          <div className="hud-hero__read">
            <div className="hud-big"><Counter value={info.count} from={0} /></div>
            <Label mono tone="ink-2">Day streak</Label>
          </div>
        </section>

        <div className="hud-says">
          <p className="hud-status">{status.sub}</p>
          {status.ref ? <p className="hud-ref">{status.ref}</p> : null}
          {status.note ? <p className="hud-note">{status.note}</p> : null}
        </div>

        <dl className="hud-reads">
          <Readout label="Best" value={Math.max(info.best, info.count)} unit=" days" />
          <Readout label="Days active" value={life.daysActive} />
          <Readout label="Lessons" value={life.lessons} />
        </dl>

        <Calendar />
        <ShieldCard info={info} onSwap={onSwap} />
      </div>
    </Sheet>
  )
}
