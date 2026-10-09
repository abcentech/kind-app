// learn-hud · MissionSheet — every mission, with where you stand in each. One tap switches the whole app to it.
// Props: { open, onClose }.  The switch itself is the shell's setSeriesId; this sheet only chooses.
import { Sheet, Panel, Progress, Tag } from '../../ui/index.js'
import { MissionPatch } from '../../art/index.js'
import { Icon } from '../../icons.jsx'
import { useShell } from '../../shell.jsx'
import { useStore } from '../../store.js'
import { allSeries, modeOf, seriesProgress } from '../../lib.js'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'
import { daysWord } from '../../copy.js'

const ORDER = { live: 0, upcoming: 1, archive: 2 }
const TAG = { live: ['go', 'Live'], upcoming: ['tele', 'Soon'], archive: ['neutral', 'Archive'] }

function Mission({ series, st, active, onPick }) {
  const mode = modeOf(series)
  const p = seriesProgress(series, st)
  const [tone, tag] = TAG[mode]
  const stage = Math.min(series.weeks.length - 1, p.stagesCleared)         // the stage you are flying: its colour tints the bar
  const left = p.total - p.done
  return (
    <Panel
      as="button" tone={active ? 'raised' : 'plate'} cut pad="md" className="hud-mis" aria-current={active ? 'true' : undefined}
      aria-label={`${series.title}, ${series.month} ${series.year}. ${tag}. ${p.done} of ${p.total} days done.${active ? ' Current mission.' : ''}`}
      onClick={() => onPick(series)} silent
      style={{ '--hud-mis': series.accent }}
    >
      <span className="hud-mis__patch"><MissionPatch series={series} stage={0} state="earned" size={64} decorative /></span>
      <span className="hud-mis__body">
        <span className="hud-mis__top">
          <Tag tone={tone}>{tag}</Tag>
          {active ? <span className="hud-mis__on"><Icon.check size={16} />Current</span> : null}
        </span>
        <span className="hud-mis__name">{series.title}</span>
        <span className="hud-mis__meta">{series.month} {series.year} · {series.weeks.length} stages</span>
        <span className="hud-mis__bar">
          <Progress value={p.pct} tone="stage" stage={(stage % 5) + 1} height={6} glow={false} label={`${series.title} progress`} />
          <span className="hud-mis__n">{p.complete ? 'Complete' : p.done === 0 ? 'Not started' : `${p.done} / ${p.total} · ${daysWord(left)} left`}</span>
        </span>
      </span>
    </Panel>
  )
}

export default function MissionSheet({ open, onClose }) {
  const st = useStore()
  const { seriesId, setSeriesId } = useShell() || {}
  const list = allSeries.slice().sort((a, b) => ORDER[modeOf(a)] - ORDER[modeOf(b)])
  const pick = (series) => {
    if (series.id !== seriesId) { sound.play('select'); haptic.select(); setSeriesId?.(series.id) } else haptic.tap()
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Missions" eyebrow={`${list.length} ON THE BOARD`} detents={['auto', 'full']}>
      <div className="hud-sheet hud-missions">
        <ul className="hud-mis__list">
          {list.map((series) => (
            <li key={series.id}><Mission series={series} st={st} active={series.id === seriesId} onPick={pick} /></li>
          ))}
        </ul>
        <p className="hud-fine">A live mission opens one day at a time, at 6 am. An archive mission is open all at once, so you can fly it at your own pace.</p>
      </div>
    </Sheet>
  )
}
