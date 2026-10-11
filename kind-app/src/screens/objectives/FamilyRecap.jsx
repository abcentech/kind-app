// Objectives · Family week — the parent's Monday-to-Sunday read of the crew's flying, off activityByDate and the journal dates.
// Honest by construction: KIND keeps one flight log per device, not one per child. So the numbers are the household's together;
// each child shows as a crew chip, never with a figure we did not measure.
import { useId, useMemo } from 'react'
import { activityByDate, streakInfo, useStore, useToday } from '../../store.js'
import { fmtNum } from '../../copy.js'
import { Button, Chip, Label, Panel, Stat } from '../../ui/index.js'
import { now, today } from '../../now.js'
import { useShell } from '../../shell.jsx'
import '../../styles/objectives-family.css'

const plural = (n, w) => (n === 1 ? w : w + 's')
const COPY = {
  eyebrow: 'Family week',
  quiet: 'A quiet week so far.',
  quietP: 'One lesson together is all it takes to light the board.',
  note: 'KIND keeps one flight log per device, so these are your crew’s numbers together.',
  share: 'Share the family streak',
}

/** The Monday-first week containing `at`, as 7 date keys. */
function weekKeys(at) {
  const lead = (at.getDay() + 6) % 7
  return Array.from({ length: 7 }, (_, i) => today(new Date(at.getFullYear(), at.getMonth(), at.getDate() - lead + i)))
}

export default function FamilyRecap() {
  const st = useStore()
  const { share } = useShell()
  const tk = useToday()
  const id = useId()
  const at = useMemo(() => now(), [tk]) // eslint-disable-line react-hooks/exhaustive-deps -- re-derive only when the date rolls
  const kids = st.kids || []
  const w = useMemo(() => {
    const keys = new Set(weekKeys(at))
    const act = activityByDate(st)
    let lessons = 0, xp = 0, reflections = 0
    for (const k of keys) { lessons += act[k]?.lessons || 0; xp += act[k]?.xp || 0 }
    for (const sb of Object.values(st.series)) for (const [d, k] of Object.entries(sb.notesAt || {})) if (keys.has(k) && (sb.notes[d] || '').trim()) reflections++
    return { lessons, xp, reflections }
  }, [st, at])
  if (st.role !== 'parent' && !kids.length) return null

  const streak = streakInfo(st, at).count
  const crew = [st.name || 'You', ...kids.map((k) => k.name)]
  return (
    <Panel as="section" tone="plate" cut="sm" className="obm-sec obf-family" aria-labelledby={id + '-h'}>
      <div className="obm-slab">
        <Label as="h2" id={id + '-h'} mono size="md" tone="tele" dot>{COPY.eyebrow}</Label>
        <p className="obm-sub">
          {w.lessons ? `${fmtNum(w.lessons)} ${plural(w.lessons, 'lesson')} finished this week.` : COPY.quiet}
          {' '}{w.lessons ? '' : COPY.quietP}
        </p>
        <ul className="obf-crew" aria-label="Crew">
          {crew.map((n, i) => <li key={n + i}><Chip tone={i === 0 ? 'tele' : 'neutral'}>{n}</Chip></li>)}
        </ul>
        <div className="obm-stats obf-stats">
          <Stat size="md" label="Lessons" tone="ink" value={fmtNum(w.lessons)} />
          <Stat size="md" label="XP" tone="tele" value={fmtNum(w.xp)} />
          <Stat size="md" label="Reflections" tone="go" value={fmtNum(w.reflections)} />
        </div>
        <p className="obf-note">{COPY.note}</p>
        <Button variant="secondary" size="md" full icon="share" disabled={!w.lessons && !streak}
          onClick={() => share({ kind: 'streak', data: { streak, xp: w.xp } })}>
          {COPY.share}
        </Button>
      </div>
    </Panel>
  )
}
