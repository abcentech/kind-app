// Pilot card — who is flying: avatar hex (tap to rename), rank insignia + progress, and four lifetime instruments.
import { useEffect, useRef, useState } from 'react'
import { MILESTONES, lifetimeStats, updateProfile, useStore } from '../../store.js'
import { allSeries } from '../../lib.js'
import { fmtNum, labels, settingsHelp } from '../../copy.js'
import { Icon } from '../../icons.jsx'
import { RankInsignia } from '../../art/index.js'
import { Counter, Gauge, Hex, Panel, Progress, TextField } from '../../ui/index.js'

const NAME_MAX = 24
const ROLE = { teen: 'Teen', parent: 'Parent', family: 'Family' }
const CARDS_TOTAL = allSeries.reduce((n, x) => n + x.codes.length, 0)
const STAGES_TOTAL = allSeries.reduce((n, x) => n + x.weeks.length, 0)

// First *grapheme*, so a decomposed "Ọ́" keeps its marks.
function initialOf(name) {
  const t = (name || '').trim()
  if (!t) return 'K'
  try {
    const first = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)[Symbol.iterator]().next().value.segment
    return first.toLocaleUpperCase()
  } catch { return Array.from(t)[0].toLocaleUpperCase() }
}

function sinceLabel(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '')
  if (!m) return ''
  return labels.me.since(new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }))
}

function Instrument({ label, now, min = 0, max, tone, aria }) {
  const span = (max || 0) - min
  return (
    <li className="me-inst">
      <Gauge
        size={66} value={span > 0 ? Math.min(1, Math.max(0, (now - min) / span)) : 0} min={min} max={span > 0 ? max : min + 1} tone={tone}
        label={aria || label} format={fmtNum} glow={false}
      />
      <span className="me-inst__label">{label}</span>
    </li>
  )
}

export default function Pilot() {
  const st = useStore()
  const L = lifetimeStats(st)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const box = useRef(null)
  const name = st.name || 'Pilot'

  const start = () => { setDraft(st.name || ''); setEditing(true) }
  const commit = () => {
    const next = draft.normalize('NFC').trim()
    if (next && next !== st.name) updateProfile({ name: next })
    setEditing(false)
  }
  useEffect(() => { if (editing) { box.current?.focus(); box.current?.select?.() } }, [editing])   // select the old name so typing replaces it

  const rk = L.rank
  const role = [ROLE[st.role] || ROLE.teen, st.role === 'parent' || st.role === 'family' ? st.familyName : ''].filter(Boolean).join(' · ')
  const nextMile = MILESTONES.find((m) => m > L.best) || L.best || 1

  return (
    <section className="me-pilot" aria-label={labels.me.pilot}>
      <Panel cut tone="raised" pad="md" as="div" className="me-pilot__card">
        <div className="me-pilot__top">
          <Hex size={72} state="open" tone="tele" glow={false} onClick={start} tabIndex={-1} aria-hidden="true">
            <span className="me-pilot__initial" aria-hidden="true">{initialOf(st.name)}</span>
          </Hex>
          <div className="me-pilot__id">
            {editing ? (
              <TextField
                ref={box} label={settingsHelp.name.label} value={draft} maxLength={NAME_MAX} onChange={setDraft}
                autoComplete="given-name" autoCapitalize="words" enterKeyHint="done" spellCheck={false}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } else if (e.key === 'Escape') { e.preventDefault(); setDraft(st.name || ''); setEditing(false) } }}
              />
            ) : (
              <>
                <button type="button" className="me-pilot__name" onClick={start} aria-label={`${settingsHelp.name.label}: ${name}. Tap to change.`}>
                  <span lang="yo">{name}</span>
                  <Icon name="pen" size={16} aria-hidden="true" />
                </button>
                <p className="me-pilot__role">{role}</p>
                <p className="me-pilot__since">{sinceLabel(L.since)}</p>
              </>
            )}
          </div>
        </div>

        <div className="me-pilot__rank">
          <RankInsignia rank={rk.index} size={76} />
          <div className="me-pilot__rankbody">
            <p className="me-pilot__eyebrow">Rank {rk.index + 1} / 7</p>
            <p className="me-pilot__rankname">{rk.name}</p>
            <p className="me-pilot__xp"><Counter value={L.xp} format={fmtNum} /> <span>XP</span></p>
          </div>
        </div>
        <Progress value={rk.pct} tone="tele" height={6} label={`Progress to ${rk.next ? rk.next.name : rk.name}`} />
        <p className="me-pilot__next">{rk.next ? `${labels.objectives.next(rk.next.name)} · ${labels.objectives.toGo(rk.toNext)}` : 'Top rank reached.'}</p>

        <ul className="me-insts" aria-label={labels.me.instruments}>
          <Instrument label="Streak" aria={`Best streak, ${L.best} days`} now={L.best} max={nextMile} tone="ignite" />
          <Instrument label="XP" aria={`${fmtNum(L.xp)} XP`} now={L.xp} min={rk.floor} max={rk.ceil ?? L.xp} tone="tele" />
          <Instrument label="Cards" aria={`${L.cards} of ${CARDS_TOTAL} cards`} now={L.cards} max={CARDS_TOTAL} tone="gold" />
          <Instrument label="Stages" aria={`${L.stagesCleared} of ${STAGES_TOTAL} stages cleared`} now={L.stagesCleared} max={STAGES_TOTAL} tone="go" />
        </ul>
      </Panel>
    </section>
  )
}
