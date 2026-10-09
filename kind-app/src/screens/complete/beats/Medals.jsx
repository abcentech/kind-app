// complete-rank · Medals — result.achievements, one medal at a time, then (for two or more) the stack.
//   Each medal is struck in from above, shines once, and says what it is and how it was earned. It waits for a tap or
//   moves on by itself after MEDAL_MS (Stories rules: press and hold pauses, a tap goes on). The auto-advance is off for
//   reduced motion and for anyone driving with a keyboard; CONTINUE always works. markSeen([id]) fires as each one lands,
//   so the Locker badge never counts a medal the player has already met.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Label, Tag } from '../../../ui/index.js'
import { Medal } from '../../../art/index.js'
import { fx } from '../../../fx/fx.js'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { useReducedMotion } from '../../../fx/motion.js'
import { ACHIEVEMENTS, markSeen } from '../../../store.js'
import { aria, labels } from '../../../copy.js'
import { keyboardLast, makeClock, pad2, useBeat, useFocusWhen } from './Rank.jsx'

const MEDAL_MS = 2900   // a medal's whole slot, entrance included; also read by the segment bar in CSS
const HOLD_MS = 260     // a press shorter than this is a tap

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))
const lookup = (id) => BY_ID.get(id) || { id, title: String(id).replace(/[-_]+/g, ' '), desc: '', tier: 'bronze', icon: 'medal' }
// copper has no token of its own: bronze borrows the ember LED, silver stays plain, gold and titanium are the rare ones
const TIER = { bronze: { label: 'Bronze', tone: 'ignite' }, silver: { label: 'Silver', tone: 'neutral' }, gold: { label: 'Gold', tone: 'gold' }, ti: { label: 'Titanium', tone: 'tele' } }
const CHROME = { one: 'New medal', many: (n) => `${n} new medals` }   // REQUEST: move into copy.js

export default function Medals({ result, active = true, next }) {
  const { lite, shown, advance } = useBeat({ active, next })
  const reduced = useReducedMotion()
  const ids = result?.achievements
  const key = Array.isArray(ids) ? ids.join('|') : ''
  const list = useMemo(() => (key ? key.split('|').map(lookup) : []), [key])
  const n = list.length
  const stack = n > 1                       // the summary slot sits after the last medal
  const end = stack ? n : n - 1

  const [i, setI] = useState(0)             // 0..n-1 a medal · n the stack
  const [st, setSt] = useState({ i: 0, ph: 0 })   // phase of slot `st.i`: 1 struck · 2 words · 3 seen
  const [hold, setHold] = useState(false)
  const [manual, setManual] = useState(false)
  const iRef = useRef(0)
  const left = useRef(MEDAL_MS)
  const seen = useRef(new Set())
  const down = useRef(0)
  const art = useRef(null)
  const cta = useRef(null)
  const ph = st.i === i ? st.ph : 0
  const auto = !reduced && !manual && n > 0
  useFocusWhen(cta, shown)

  // (re)start from the first medal whenever the beat is activated
  useEffect(() => {
    iRef.current = 0; setI(0); setSt({ i: 0, ph: 0 }); setHold(false); setManual(keyboardLast())
    left.current = MEDAL_MS
    if (active && !n) advance()                  // nothing to show: never strand the flow
  }, [active, key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!active) return undefined
    const k = () => setManual(true)
    addEventListener('keydown', k, true)
    return () => removeEventListener('keydown', k, true)
  }, [active])

  // a medal counts as seen once it has been on screen: when its words land, or the moment it is left, whichever comes first
  const mark = useCallback((id) => { if (!seen.current.has(id)) { seen.current.add(id); markSeen([id]) } }, [])
  const step = useCallback(() => {
    const cur = iRef.current
    if (cur < n) mark(list[cur].id)
    if (cur >= end) { advance(); return }
    iRef.current = cur + 1
    setI(cur + 1)
  }, [end, n, list, advance, mark])

  // the choreography of the slot on show
  useEffect(() => {
    left.current = MEDAL_MS
    if (!active || !n) return undefined
    const c = makeClock()
    const set = (p) => setSt((s) => (s.i === i && s.ph >= p ? s : { i, ph: p }))
    if (i >= n) {
      c.at(lite ? 20 : 60, () => set(1))
      sound.play('next')
      return c.clear
    }
    const m = list[i]
    const tier = TIER[m.tier] ? m.tier : 'bronze'
    c.at(lite ? 30 : 60, () => set(1))
    c.at(lite ? 80 : 300, () => {                  // the medal has landed: now the sound, the light and the haptic
      sound.play('medal', { tier })
      haptic.cue('medal')
      const el = art.current
      if (el && !lite) {
        const r = el.getBoundingClientRect()
        const p = { x: r.left + r.width / 2, y: r.top + r.height * 0.5 }
        if (tier === 'gold' || tier === 'ti') fx.celebrate(p, { big: tier === 'ti' })
        else fx.pop(p, { color: tier === 'bronze' ? 'ignite' : 'ti', size: 240 })
      }
      set(2)
    })
    c.at(lite ? 120 : 520, () => { mark(m.id); set(3) })
    return c.clear
  }, [active, i, n, lite, list, mark])

  // Stories timer: runs while nothing is held; what is left carries over a pause
  useEffect(() => {
    if (!active || !auto || hold || i >= n) return undefined
    const t0 = performance.now()
    const wait = left.current
    const t = setTimeout(step, wait)
    return () => { clearTimeout(t); left.current = Math.max(0, wait - (performance.now() - t0)) }
  }, [active, auto, hold, i, n, step])

  const press = () => { down.current = performance.now(); setHold(true) }
  const lift = () => { setHold(false); if (down.current && performance.now() - down.current < HOLD_MS) step(); down.current = 0 }
  const cancel = () => { setHold(false); down.current = 0 }

  if (!n) return null
  const m = list[Math.min(i, n - 1)]
  const tier = TIER[m.tier] ? m.tier : 'bronze'
  const isStack = i >= n
  const announce = ph >= 2 ? (isStack ? CHROME.many(n) : `${aria.medal({ title: m.title, earned: true, tier: TIER[tier].label })} ${m.desc}`) : ''

  return (
    <section
      className="cmk-beat cmk-medals" data-in={shown ? '' : undefined} data-foot={shown ? '' : undefined} data-auto={auto ? '' : undefined}
      data-hold={hold ? '' : undefined} data-tier={isStack ? undefined : tier} aria-label={labels.objectives.medals} style={{ '--cmk-ms': `${MEDAL_MS}ms` }}
    >
      <div className="cmk-body">
        {stack ? (
          <ol className="cmk-segs" aria-hidden="true">
            {Array.from({ length: n }, (_, k) => <li key={k} className="cmk-seg" data-motion="essential" data-s={k < i ? 'done' : k === i ? 'cur' : 'next'} />)}
          </ol>
        ) : null}

        {isStack ? (
          <div className="cmk-sum" data-on={ph >= 1 ? '' : undefined}>
            <Label size="md" className="cmk-eyebrow">{labels.objectives.medals}</Label>
            <h2 className="cmk-sum__title">{CHROME.many(n)}</h2>
            <ul className={n > 6 ? 'cmk-sum__grid is-long' : 'cmk-sum__grid'}>
              {list.map((x, k) => {
                const tx = TIER[x.tier] ? x.tier : 'bronze'
                return (
                  <li key={x.id} className="cmk-sum__item" data-tier={tx} style={{ '--i': k }}>
                    <Medal id={x.id} tier={tx} earned ribbon={false} size={92} decorative />
                    <span className="cmk-sum__name">{x.title}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <div
            key={i} className="cmk-medal" data-hit={ph >= 1 ? '' : undefined} data-text={ph >= 2 ? '' : undefined}
            onPointerDown={press} onPointerUp={lift} onPointerCancel={cancel} onPointerLeave={cancel}
          >
            <Label size="md" className="cmk-eyebrow">
              {stack ? <>{labels.objectives.medals}<i className="cmk-eyebrow__sep" aria-hidden="true" /><span className="cmk-eyebrow__n">{pad2(i + 1)} / {pad2(n)}</span></> : CHROME.one}
            </Label>
            <div className="cmk-medal__art" ref={art}>
              <i className="cmk-medal__halo" aria-hidden="true" />
              <i className="cmk-medal__rays" aria-hidden="true" />
              <div className="cmk-medal__disc"><Medal id={m.id} tier={tier} earned size={240} decorative /></div>
            </div>
            <div className="cmk-medal__words">
              <Tag tone={TIER[tier].tone} className="cmk-medal__tier">{TIER[tier].label}</Tag>
              <h2 className="cmk-medal__title">{m.title}</h2>
              {m.desc ? <p className="cmk-medal__desc">{m.desc}</p> : null}
            </div>
          </div>
        )}
      </div>

      <div className="cmk-foot">
        <Button ref={cta} variant="primary" size="lg" full onClick={step}>{labels.verbs.continue}</Button>
      </div>
      <p className="u-sr" role="status">{announce}</p>
    </section>
  )
}
