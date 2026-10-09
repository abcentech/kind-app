// onboard-main playground.
//   onboard-main.html                    the real flow in the shell frame (brand-new user: seed state:null with tools/browser.mjs)
//   onboard-main.html?sheet=1            contact sheet: every beat at 360 x 640 side by side (static, no autofocus)
//   ?fx=lite                             lite effects      ?fake=1  force the fake Goal / Reminder
//   ?fakevv=1                            replaces window.visualViewport with a fake you drive: __vv(height) pretends the
//                                        keyboard took (innerHeight - height) px, __vv(0) puts it away
// Goal / Reminder are onboard-commit's: while their files are still stubs this page injects tiny stand-ins.
import { mount } from './_boot.jsx'
import { mountScreen } from './_shell.jsx'
import { ShellContext } from '../src/shell.jsx'
import { activeSeriesId, getSeries, modeOf } from '../src/lib.js'
import Onboard from '../src/screens/Onboard.jsx'
import Beat from '../src/screens/onboard/Beat.jsx'
import RealGoal from '../src/screens/onboard/Goal.jsx'
import RealReminder from '../src/screens/onboard/Reminder.jsx'
import { Button, Chip } from '../src/ui/index.js'
import { goalCopy, GOALS, onboardCopy } from '../src/copy.js'

const q = new URLSearchParams(location.search)
const isStub = (C) => String(C).replace(/\s/g, '').length < 100

function FakeGoal({ value, onChange, next }) {
  const c = onboardCopy.goal
  return (
    <Beat eyebrow={c.eyebrow} title={c.title} dek={c.body} footer={<Button full onClick={next}>{c.cta}</Button>}>
      <div style={{ display: 'grid', gap: 'var(--s-2)' }}>
        {GOALS.map((g) => <Chip key={g.id} selected={value === g.xp} onClick={() => onChange(g.xp)}>{goalCopy(g.xp).label} · {goalCopy(g.xp).meta}</Chip>)}
      </div>
    </Beat>
  )
}
function FakeReminder({ value, onChange, next }) {
  const c = onboardCopy.remind
  return (
    <Beat eyebrow={c.eyebrow} title={c.title} dek={c.body}
      footer={<><Button full onClick={() => { onChange({ ...value, on: true }); next() }}>{c.add}</Button><Button full variant="ghost" onClick={() => { onChange({ ...value, on: false }); next() }}>{c.skip}</Button></>}>
      <p className="t-mono">{String(value.hour).padStart(2, '0')}:{String(value.min).padStart(2, '0')}</p>
    </Beat>
  )
}
const fake = q.get('fake') === '1'
const parts = {
  Goal: fake || isStub(RealGoal) ? FakeGoal : RealGoal,
  Reminder: fake || isStub(RealReminder) ? FakeReminder : RealReminder,
}

if (q.get('fakevv') === '1') {
  const t = new EventTarget()
  const vv = Object.assign(t, { height: innerHeight, offsetTop: 0, width: innerWidth })
  Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true })
  window.__vv = (h) => { vv.height = h || innerHeight; t.dispatchEvent(new Event('resize')) }
}

window.__done = null
const onDone = (r) => { window.__done = r; console.log('[onboard] onDone', JSON.stringify(r)) }

if (q.get('sheet') === '1') {
  const s = getSeries(q.get('series') || activeSeriesId())
  const ctx = { s, seriesId: s.id, setSeriesId() {}, tab: 'learn', goTab() {}, openDay() {}, closeLesson() {}, share() {}, mode: modeOf(s) }
  const teen = { name: 'Ọlámidé', role: 'teen' }
  const parent = { name: 'Chinedu', role: 'parent', familyName: 'Okeke', kids: ['Ada', 'Ifeanyi', 'Ṣọlá'] }
  const cells = [
    ['hero', 'hero', {}],
    ['who', 'who · teen picked', { role: 'teen' }],
    ['name', 'name · diacritics', teen],
    ['family', 'family · parent', parent],
    ['goal', 'goal (stand-in)', teen],
    ['launch', 'launch · teen', { ...teen, reminder: { on: true, hour: 19, min: 30 } }],
  ]
  mount(
    <ShellContext.Provider value={ctx}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 360px)', gap: 12, padding: 12, background: 'var(--void)', width: 'max-content' }}>
        {cells.map(([at, label, form]) => (
          <div key={at} style={{ position: 'relative', width: 360, height: 640, overflow: 'hidden', borderRadius: 18, boxShadow: '0 0 0 1px var(--line-2)' }}>
            <Onboard embedded parts={parts} initial={{ at, form }} onDone={onDone} />
            <span className="t-mono-sm" style={{ position: 'absolute', left: 8, bottom: 4, color: 'var(--ink-3)', zIndex: 5 }}>{label}</span>
          </div>
        ))}
      </div>
    </ShellContext.Provider>,
    { fx: q.get('fx') === 'lite' ? 'lite' : 'full' },
  )
} else {
  mountScreen(<Onboard parts={parts} onDone={onDone} />, { bare: true })
}
