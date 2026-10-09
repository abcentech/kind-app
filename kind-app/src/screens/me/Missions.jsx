// Missions — every series as a row; tap one to make it the active mission and fly back to Learn.
import { allSeries, modeOf, seriesProgress } from '../../lib.js'
import { labels, missionMeta, settingsHelp } from '../../copy.js'
import { useStore } from '../../store.js'
import { useShell } from '../../shell.jsx'
import { MissionPatch } from '../../art/index.js'
import { Icon } from '../../icons.jsx'
import { Label, Panel, Tag } from '../../ui/index.js'

const MODE = { live: { tone: 'go', text: 'Live' }, archive: { tone: 'neutral', text: 'Archive' }, upcoming: { tone: 'tele', text: 'Upcoming' } }

export default function Missions() {
  const st = useStore()
  const { seriesId, setSeriesId, goTab } = useShell()
  const pick = (id) => { setSeriesId?.(id); goTab?.('learn') }

  return (
    <section className="me-sec" aria-labelledby="me-missions-h">
      <Label as="h2" id="me-missions-h" className="me-h">{labels.me.missions}</Label>
      <p className="me-help">{settingsHelp.missions.help}</p>
      <ul className="me-list">
        {allSeries.map((x) => {
          const p = seriesProgress(x, st)
          const active = x.id === seriesId
          const mode = MODE[modeOf(x)] || MODE.archive
          const stage = p.stagesCleared > 0 ? p.stagesCleared - 1 : 0
          return (
            <li key={x.id}>
              <Panel
                tone={active ? 'tele' : 'plate'} cut="sm" pad="sm" onClick={() => pick(x.id)} className="me-mission" data-active={active || undefined}
                aria-current={active ? 'true' : undefined}
                aria-label={`${x.title}. ${missionMeta({ month: x.month, year: x.year, done: p.done, total: p.total })}. ${mode.text}.${active ? ' Active mission.' : ' Switch to this mission.'}`}
              >
                <MissionPatch series={x} stage={stage} state={p.stagesCleared > 0 ? 'earned' : 'locked'} size={64} decorative />
                <span className="me-mission__body">
                  <span className="me-mission__title">{x.title}</span>
                  <span className="me-mission__meta">{x.month} {x.year}</span>
                  <span className="me-mission__prog" aria-hidden="true">
                    <i style={{ transform: `scaleX(${p.pct})` }} />
                  </span>
                  <span className="me-mission__count">{p.done} / {p.total} done</span>
                </span>
                <span className="me-mission__side">
                  <Tag tone={mode.tone}>{mode.text}</Tag>
                  {active ? <span className="me-mission__on"><Icon name="check" size={16} aria-hidden="true" />{labels.me.active}</span> : null}
                </span>
              </Panel>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
