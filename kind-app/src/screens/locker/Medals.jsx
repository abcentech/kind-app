// Locker · Medals — all 48 in a three-column case. Earned medals hang on their ribbons and carry the day they were won; locked ones
// are empty slots (a silhouette in a progress ring) that say what they take. NEW marks medals not yet seen; they are marked seen once
// this tab has been on screen for 1.5 s, but keep their badge until you leave so you can find them.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Medal } from '../../art/index.js'
import { Chip, Counter, Empty, Label, Progress, Sheet } from '../../ui/index.js'
import { useShell } from '../../shell.jsx'
import { useStore, medals, markSeen } from '../../store.js'
import { keyToDate } from '../../lib.js'
import { aria, emptyCopy, fmtDate } from '../../copy.js'
import { TiltArt } from './Patches.jsx'

const SEEN_AFTER = 1500
const TIERS = [['bronze', 'Bronze'], ['silver', 'Silver'], ['gold', 'Gold'], ['ti', 'Titanium']]
const TIER_NAME = Object.fromEntries(TIERS)
const FILTERS = [['all', 'All'], ['earned', 'Earned'], ['locked', 'Locked']]

const when = (key) => { try { return fmtDate(keyToDate(key)) } catch { return key } }
const short = (key) => when(key).split(' ').slice(1).join(' ')
const ratio = (m) => (m.progress && m.progress.goal ? Math.min(1, m.progress.now / m.progress.goal) : 0)

/** A progress ring around a silhouette: the 0..1 fill is drawn with stroke-dasharray over a normalised path. */
function Dial({ value, children }) {
  return (
    <span className="lck-dial">
      <svg viewBox="0 0 76 76" aria-hidden="true">
        <circle className="lck-dial__track" cx="38" cy="38" r="35" pathLength="100" />
        {value > 0 ? <circle className="lck-dial__fill" cx="38" cy="38" r="35" pathLength="100" style={{ '--p': Math.max(2, value * 100) }} /> : null}
      </svg>
      {children}
    </span>
  )
}

function Cell({ m, i, isNew, onOpen }) {
  const status = m.earned ? `Earned ${when(m.on)}` : m.progress ? `${m.progress.now} of ${m.progress.goal}` : 'Not yet earned'
  const spoken = [aria.medal(m), m.earned ? status : m.desc, !m.earned && m.progress ? status : '', isNew ? 'New.' : ''].filter(Boolean).join(' ')
  return (
    <li className="lck-cell" style={{ '--i': i }}>
      <button type="button" className="lck-medal" data-lck-tier={m.tier} data-earned={m.earned ? '' : undefined} aria-label={spoken} onClick={() => onOpen(m)}>
        {isNew ? <span className="lck-new" aria-hidden="true">New</span> : null}
        <span className="lck-medal__art">
          {m.earned
            ? <Medal id={m.id} tier={m.tier} earned size={84} decorative />
            : <Dial value={ratio(m)}><Medal id={m.id} tier={m.tier} earned={false} ribbon={false} size={52} decorative /></Dial>}
        </span>
        <span className="lck-medal__title">{m.title}</span>
        {m.earned
          ? <span className="lck-medal__meta" data-on="">{short(m.on)}</span>
          : (
            <>
              <span className="lck-medal__desc">{m.desc}</span>
              {m.progress ? <span className="lck-medal__meta">{m.progress.now} / {m.progress.goal}</span> : null}
            </>
          )}
      </button>
    </li>
  )
}

function Detail({ m }) {
  return (
    <div className="lck-view" data-lck-tier={m.tier}>
      <TiltArt className="lck-view__art" round={false} data-earned={m.earned ? '' : undefined}>
        <Medal id={m.id} tier={m.tier} earned={m.earned} size={148} title={aria.medal(m)} />
      </TiltArt>
      <p className="lck-view__status" data-on={m.earned ? '' : undefined} role="status">{m.earned ? `Earned ${when(m.on)}` : 'Not yet earned'}</p>
      <p className="lck-view__q">{m.desc}</p>
      {!m.earned && m.progress ? (
        <>
          <Progress value={ratio(m)} height={6} label={`${m.progress.now} of ${m.progress.goal}`} className="lck-view__bar" />
          <p className="lck-view__ref">{m.progress.now} / {m.progress.goal}</p>
        </>
      ) : null}
    </div>
  )
}

export default function Medals() {
  const st = useStore()
  const { tab } = useShell() || {}
  const all = useMemo(() => medals(st), [st])
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(null)

  // NEW stays on screen for the life of this tab even after markSeen clears the store's flag.
  const shown = useRef(new Set())
  for (const m of all) if (m.isNew) shown.current.add(m.id)
  const pending = all.filter((m) => m.isNew).map((m) => m.id)
  const key = pending.join()
  const visible = tab == null || tab === 'locker'
  useEffect(() => {
    if (!pending.length || !visible) return undefined
    const t = setTimeout(() => { if (document.visibilityState !== 'hidden') markSeen(pending) }, SEEN_AFTER)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, visible])

  const earned = all.filter((m) => m.earned).length
  const list = filter === 'earned' ? all.filter((m) => m.earned) : filter === 'locked' ? all.filter((m) => !m.earned) : all
  const count = { all: all.length, earned, locked: all.length - earned }
  const per = TIERS.map(([id, name]) => {
    const of = all.filter((m) => m.tier === id)
    return { id, name, n: of.filter((m) => m.earned).length, total: of.length }
  })
  const empty = filter === 'locked' ? { title: 'Every medal is yours.', body: 'The case is full. Keep going; your streak still counts.' } : emptyCopy('medals', st.salt)
  const pick = (m) => { setSel(m); setOpen(true) }
  const cur = sel ? all.find((m) => m.id === sel.id) || sel : null

  return (
    <div className="lck-tab">
      <section className="lck-mhead" aria-labelledby="lck-m-h">
        <div className="lck-mhead__top">
          <Label id="lck-m-h" mono size="sm">Medals</Label>
          <p className="lck-mhead__n" aria-label={`${earned} of ${all.length} medals`}>
            <b><Counter value={earned} /></b><span> / {all.length}</span>
          </p>
        </div>
        <ul className="lck-tiers" aria-label="Tiers">
          {per.map((t) => (
            <li key={t.id} data-lck-tier={t.id} aria-label={`${t.name}: ${t.n} of ${t.total}`}>
              <span className="lck-tiers__row"><i className="lck-tiers__dot" aria-hidden="true" /><span>{t.name}</span><b>{t.n} / {t.total}</b></span>
              <span className="lck-meter" aria-hidden="true"><i style={{ '--p': t.total ? t.n / t.total : 0 }} /></span>
            </li>
          ))}
        </ul>
      </section>

      <div className="lck-filters" role="group" aria-label="Filter medals">
        {FILTERS.map(([id, name]) => (
          <Chip key={id} selected={filter === id} onClick={() => setFilter(id)}>{name} <span className="lck-filters__n">{count[id]}</span></Chip>
        ))}
      </div>
      <p className="u-sr" role="status" aria-live="polite">Showing {list.length} {filter === 'all' ? '' : filter + ' '}medals.</p>

      {list.length ? (
        <ul className="lck-grid" key={filter}>
          {list.map((m, i) => <Cell key={m.id} m={m} i={i} isNew={shown.current.has(m.id)} onOpen={pick} />)}
        </ul>
      ) : (
        <Empty art="medal" title={empty.title} body={empty.body} />
      )}

      <Sheet open={open} onClose={() => setOpen(false)} eyebrow={cur ? `${TIER_NAME[cur.tier] || cur.tier} medal` : undefined} title={cur ? cur.title : 'Medal'} detents={['auto']}>
        {cur ? <Detail m={cur} /> : null}
      </Sheet>
    </div>
  )
}
