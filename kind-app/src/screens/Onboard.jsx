// Onboard — pre-flight. Five beats (six for a parent), one decision each, then "Day N is ready".
//   <Onboard onDone={({ openDay }) => void} />
// Hero → Who → Name → [Family] → Goal → Reminder → Launch. The flow owns the answers (`form`); each beat is a pure view
// of its slice. Beats slide on --ease-sheet (lite / reduced motion: a short cross-fade); the sky behind them climbs from
// dusk to deep space as you go and the Earth's limb rises on the last beat (the orbit you are heading for).
//
// Goal and Reminder belong to onboard-commit: `X({ value, onChange, next, back })`, rendered inside <Beat>.
// Keyboard-safe: the stage is pinned to the *visual* viewport, so the primary action rides above the on-screen keyboard
// (iOS Safari and Chrome Android do not resize the layout viewport); the beats compact themselves by container height.
//
// Test seams (playground only; production passes none): `parts` swaps Goal/Reminder, `initial` { at, form } starts mid-flow,
// `embedded` turns off autofocus and history so several instances can share a page.
import { useCallback, useEffect, useRef, useState } from 'react'
import Horizon, { AscentSky } from '../art/Horizon.jsx'
import { useBackClose } from '../ui/index.js'
import { raf, useFxLevel } from '../fx/motion.js'
import { DEFAULT_REMINDER } from '../copy.js'
import { FlowContext } from './onboard/Beat.jsx'
import Hero from './onboard/Hero.jsx'
import Who from './onboard/Who.jsx'
import Name from './onboard/Name.jsx'
import Family from './onboard/Family.jsx'
import Goal from './onboard/Goal.jsx'
import Reminder from './onboard/Reminder.jsx'
import Launch from './onboard/Launch.jsx'
import '../styles/onboard.css'
import '../styles/onboard-commit.css'

const SLIDE_MS = 480                                 // a little over --t-slow: the leaving layer is removed after it finishes
const KEYBOARD_MIN = 80                              // px of visual-viewport loss below which it is browser chrome, not a keyboard
const FLOW = ['hero', 'who', 'name', 'goal', 'remind', 'launch']
const FLOW_PARENT = ['hero', 'who', 'name', 'family', 'goal', 'remind', 'launch']

const blank = () => ({
  name: '', role: null, familyName: '', kids: [], goal: 40,
  reminder: { on: false, hour: DEFAULT_REMINDER.hour, min: DEFAULT_REMINDER.min },
})

/** Pin `ref` to the visual viewport: --onb-kb (the keyboard's height) and --onb-vt (iOS scrolls the page up under it). */
function useVisualViewport(ref) {
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    const el = ref.current
    if (!vv || !el) return undefined
    const apply = () => {
      const top = Math.max(0, Math.round(vv.offsetTop))
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      const on = kb > KEYBOARD_MIN
      el.style.setProperty('--onb-kb', on ? `${kb}px` : '0px')
      el.style.setProperty('--onb-vt', on ? `${top}px` : '0px')
      if (on) el.setAttribute('data-kb', ''); else el.removeAttribute('data-kb')
    }
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    apply()
    return () => { vv.removeEventListener('resize', apply); vv.removeEventListener('scroll', apply) }
  }, [ref])
}

/** Ease `--onb-t` (0 to 1) on the sky toward `target`: the climb. One subscription on the shared frame clock, off when settled. */
function useClimb(ref, target, lite) {
  const cur = useRef(target)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (lite) { cur.current = target; el.style.setProperty('--onb-t', String(target)); return undefined }
    const off = raf.add((dt) => {
      cur.current += (target - cur.current) * (1 - Math.exp(-dt / 170))
      if (Math.abs(target - cur.current) < 0.002) { cur.current = target; off() }
      el.style.setProperty('--onb-t', cur.current.toFixed(4))
    })
    return off
  }, [ref, target, lite])
}

export default function Onboard({ onDone, parts, initial, embedded = false }) {
  const P = { Goal, Reminder, ...parts }
  const lite = useFxLevel() === 'lite'
  const [form, setForm] = useState(() => ({ ...blank(), ...initial?.form }))
  const patch = useCallback((p) => setForm((f) => ({ ...f, ...p })), [])
  const ids = form.role === 'parent' ? FLOW_PARENT : FLOW
  const steps = ids.length - 1
  const [at, setAt] = useState(initial?.at || 'hero')
  const [leave, setLeave] = useState(null)             // { id }: the beat sliding out
  const [dir, setDir] = useState(1)
  const root = useRef(null)
  const sky = useRef(null)
  const timer = useRef(0)
  const live = useRef({ at, ids })
  live.current = { at, ids }
  useEffect(() => () => clearTimeout(timer.current), [])

  const go = useCallback((id, d) => {
    if (!id || id === live.current.at) return
    setLeave({ id: live.current.at })
    setDir(d)
    setAt(id)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setLeave(null), SLIDE_MS)
  }, [])

  const idx = ids.indexOf(at)
  useVisualViewport(root)
  useClimb(sky, ids.length > 1 ? idx / (ids.length - 1) : 0, lite)

  // Android back / edge swipe walks the beats instead of leaving the app; one history entry covers the whole flow
  useBackClose(at !== 'hero' && !embedded, () => {
    const { at: a, ids: list } = live.current
    const i = list.indexOf(a)
    if (i <= 0) return undefined
    go(list[i - 1], -1)
    return i - 1 > 0 ? false : undefined               // still mid-flow: stay armed
  })

  const onKeyDown = (e) => {
    if (e.key !== 'Escape' || e.nativeEvent?.isComposing) return
    const { at: a, ids: list } = live.current
    const i = list.indexOf(a)
    if (i > 0) { e.preventDefault(); go(list[i - 1], -1) }
  }

  const render = (id) => {
    const i = ids.indexOf(id)
    const back = i > 0 ? () => go(ids[i - 1], -1) : null
    const next = () => go(ids[i + 1], 1)
    const flow = { step: id === 'launch' ? steps + 1 : i + 1, steps, back }
    let beat = null
    if (id === 'hero') beat = <Hero next={next} still={embedded} />
    else if (id === 'who') beat = <Who value={form.role} onChange={(role) => patch({ role })} next={next} back={back} />
    else if (id === 'name') beat = <Name value={form.name} onChange={(name) => patch({ name })} next={next} back={back} autoFocus={!embedded} />
    else if (id === 'family') beat = <Family value={form} onChange={patch} next={next} back={back} />
    else if (id === 'goal') beat = <P.Goal value={form.goal} onChange={(goal) => patch({ goal })} next={next} back={back} />
    else if (id === 'remind') beat = <P.Reminder value={form.reminder} onChange={(reminder) => patch({ reminder })} next={next} back={back} />
    else if (id === 'launch') beat = <Launch form={form} onDone={onDone} />
    return <FlowContext.Provider value={flow}>{beat}</FlowContext.Provider>
  }

  return (
    <div ref={root} className="onb" data-at={at} onKeyDown={onKeyDown}>
      <div ref={sky} className="onb-sky" aria-hidden="true">
        <AscentSky seed={3} />
        <div className="onb-sky__limb"><Horizon variant="limb" seed={2} /></div>
      </div>
      {leave ? (
        <div key={`out-${leave.id}`} className="onb-layer" data-role="out" data-dir={dir} aria-hidden="true" ref={(n) => { if (n) n.setAttribute('inert', '') }}>
          {render(leave.id)}
        </div>
      ) : null}
      <div key={at} className="onb-layer" data-role={leave ? 'in' : 'rest'} data-dir={dir}>
        {render(at)}
      </div>
    </div>
  )
}
