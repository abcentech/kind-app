// locker/Cards — the code-card collection: a quilted two-column grid of 5:7 faces (the engraved plate's own ratio),
// the code line set underneath like a collector's binder. Owned cards open the CardViewer; locked ones are dark
// hex-embossed silhouettes that shake and say what unlocks them.
// Perf: faces are static art (no filters, no per-card listeners beyond the button); only gold cards carry a CSS-only
// transform sweep. The entrance is a one-shot stagger on transform/opacity, capped to what fits on a screen.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { allSeries } from '../../lib.js'
import { lockerCards, useStore } from '../../store.js'
import { useShell } from '../../shell.jsx'
import { aria, emptyCopy, labels } from '../../copy.js'
import { CodeCardArt } from '../../art/index.js'
import { Icon } from '../../icons.jsx'
import { Button, Chip, Empty, Tag, toast } from '../../ui/index.js'
import { requestGyro, stagger, useCountUp } from '../../fx/motion.js'
import { haptic } from '../../fx/haptics.js'
import CardViewer from './CardViewer.jsx'

const STAGGER_CAP = 12

const Tile = memo(function Tile({ c, i, onOpen, onLocked }) {
  const owned = c.owned
  const style = { ...stagger(Math.min(i, STAGGER_CAP), 40), '--i': i }
  return (
    <li className="lcc-cell" data-no={c.no}>
      <button
        type="button"
        className="lcc-card"
        data-owned={owned ? '' : undefined}
        data-rare={c.rare ? '' : undefined}
        style={style}
        aria-label={owned ? aria.card({ no: c.no, line: c.line, rare: c.rare, earned: true }) : `${aria.card({ no: c.no, line: c.line, rare: c.rare, earned: false })} Finish day ${c.day} to deal it.`}
        onClick={(e) => (owned ? onOpen(c, e.currentTarget) : onLocked(c, e.currentTarget))}
      >
        {owned ? (
          <span className="lcc-face">
            <CodeCardArt day={c.day} rare={c.rare} w="100%" decorative />
            {c.rare ? <i className="lcc-shine" aria-hidden="true" /> : null}
          </span>
        ) : (
          <span className="lcc-face lcc-face--locked" aria-hidden="true">
            <span className="lcc-plate">
              <i className="lcc-hex" />
              <b className="lcc-num">{c.day}</b>
              <Icon name="lock" size={16} className="lcc-lock" />
            </span>
          </span>
        )}
        <span className="lcc-cap" aria-hidden="true">
          <span className="lcc-day">DAY {c.day}{owned && c.rare ? <em> · {labels.locker.gold.toUpperCase()}</em> : null}</span>
          {owned ? <span className="lcc-line">{c.line}</span> : <span className="lcc-redact"><i /><i /></span>}
        </span>
      </button>
    </li>
  )
})

export default function Tab({ s }) {
  const st = useStore()
  const { openDay } = useShell()
  const [sid, setSid] = useState(s.id)
  const [viewer, setViewer] = useState(null)   // { no, from }
  const gridRef = useRef(null)
  useEffect(() => { setSid(s.id) }, [s.id])

  const cards = useMemo(() => lockerCards(st, sid), [st, sid])
  const owned = useMemo(() => cards.filter((c) => c.owned), [cards])
  const gold = owned.filter((c) => c.rare).length
  const goldTotal = cards.filter((c) => c.rare).length
  const shown = useCountUp(owned.length, { duration: 700 })

  // series chips only once a second series has something in it
  const withCards = useMemo(
    () => allSeries.filter((x) => x.id === sid || (st.series?.[x.id]?.cards?.length || 0) > 0),
    [st, sid],
  )

  const onOpen = useCallback((c, el) => {
    requestGyro()   // iOS only grants motion access from inside a tap; this is the first one
    const face = el.querySelector('.lcc-face')
    setViewer({ no: c.no, from: face ? face.getBoundingClientRect() : null })
  }, [])

  const onLocked = useCallback((c, el) => {
    haptic.warning()
    el.classList.remove('is-shake')
    void el.offsetWidth
    el.classList.add('is-shake')
    toast({ key: 'lcc-locked', title: `Finish Day ${c.day} to deal this card.`, icon: 'lock' })
  }, [])

  const getRect = useCallback((no) => {
    const f = gridRef.current && gridRef.current.querySelector(`[data-no="${no}"] .lcc-face`)
    return f ? f.getBoundingClientRect() : null
  }, [])

  const empty = owned.length === 0
  const next = cards.find((c) => !c.on) || cards[0]
  const copy = empty ? emptyCopy('cards', sid) : null
  const sOf = allSeries.find((x) => x.id === sid) || s

  return (
    <section className="lcc" aria-label={labels.locker.cards}>
      <header className="lcc-head">
        <div className="lcc-count">
          <span className="lcc-eyebrow">COLLECTED</span>
          <p className="lcc-big" aria-label={`${owned.length} of ${cards.length} collected`}>
            <b>{shown}</b><span> / {cards.length}</span>
          </p>
        </div>
        <Tag tone={gold ? 'gold' : 'neutral'} aria-label={`${gold} of ${goldTotal} gold cards`}>GOLD {gold}/{goldTotal}</Tag>
        <div className="lcc-meter" aria-hidden="true" key={sid}>
          {cards.map((c, i) => <i key={c.no} style={{ '--i': i }} data-on={c.owned ? '' : undefined} data-rare={c.rare ? '' : undefined} />)}
        </div>
      </header>

      {withCards.length > 1 ? (
        <div className="lcc-series" role="group" aria-label="Mission">
          {withCards.map((x) => (
            <Chip key={x.id} selected={x.id === sid} onClick={() => setSid(x.id)}>{x.title}</Chip>
          ))}
        </div>
      ) : null}

      {empty ? (
        <Empty
          className="lcc-empty"
          art={copy.art}
          title={copy.title}
          body={copy.body}
          action={next ? <Button size="md" onClick={() => openDay(next.day, sid)}>{copy.action}</Button> : null}
        />
      ) : null}

      <ul className="lcc-grid" role="list" ref={gridRef} key={sid}>
        {cards.map((c, i) => <Tile key={c.no} c={c} i={i} onOpen={onOpen} onLocked={onLocked} />)}
      </ul>

      {viewer ? (
        <CardViewer
          cards={owned}
          no={viewer.no}
          seriesId={sOf.id}
          from={viewer.from}
          getRect={getRect}
          onClose={() => setViewer(null)}
        />
      ) : null}
    </section>
  )
}
