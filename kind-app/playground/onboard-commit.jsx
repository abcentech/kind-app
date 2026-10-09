// onboard-commit specimen — Goal and Reminder inside a shell-layer frame.
//   http://localhost:5183/playground/onboard-commit.html?beat=goal|reminder   &fx=lite   &mock=1 (stand-in Beat, for when onboard.css has not landed)
//   &zone=1 not needed: the WAT tag follows the device clock. Everything the beats report is mirrored to window.__onc and a mono readout.
import { useState } from 'react'
import { mount } from './_boot.jsx'
import Goal from '../src/screens/onboard/Goal.jsx'
import Reminder from '../src/screens/onboard/Reminder.jsx'
import Onboard from '../src/screens/Onboard.jsx'
import { ShellContext } from '../src/shell.jsx'
import { activeSeriesId, getSeries, modeOf } from '../src/lib.js'
import { SegmentBar, IconButton, ToastHost, Label } from '../src/ui/index.js'
import FxLayer from '../src/fx/FxLayer.jsx'

const q = new URLSearchParams(location.search)
const FX = q.get('fx') === 'lite' ? 'lite' : 'full'
const MOCK = q.get('mock') === '1'

const css = `
.pgb { position: absolute; inset: 0; display: flex; flex-direction: column; background: var(--carbon-0); }
.pgb-top { display: flex; align-items: center; gap: var(--s-3); padding: calc(var(--sat) + var(--s-3)) var(--gutter) var(--s-2); }
.pgb-top .k-ticker, .pgb-top > :nth-child(2) { flex: 1; }
.pgb-body { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; padding: var(--s-4) var(--gutter) var(--s-4); scrollbar-width: none; }
.pgb-head { display: grid; gap: var(--s-2); margin-bottom: var(--s-5); }
.pgb-title { margin: 0; font: 700 var(--fs-2xl)/1.02 var(--font-display); letter-spacing: var(--track-label); text-transform: uppercase; }
.pgb-dek { margin: 0; color: var(--ink-2); font-size: var(--fs-md); line-height: 1.4; }
.pgb-stage { margin-top: auto; }
.pgb-foot { padding: var(--s-3) var(--gutter) calc(var(--sab) + var(--s-4)); }
.pgb-log { position: absolute; left: 0; right: 0; top: 0; z-index: var(--z-toast); padding: 2px var(--s-2); font: 10px/1.3 var(--font-mono); color: var(--ink-3); background: var(--carbon-1); pointer-events: none; opacity: .9; }
`

function MockBeat({ eyebrow, title, dek, children, footer, back }) {
  return (
    <section className="pgb">
      <header className="pgb-top">
        {back ? <IconButton icon="chevronLeft" label="Back" onClick={back} /> : <span style={{ width: 48 }} />}
        <SegmentBar total={5} done={3} current={3} tone="tele" label="Step 4 of 5" />
        <span className="t-mono-sm t-num">04/05</span>
      </header>
      <div className="pgb-body">
        <div className="pgb-head">
          <Label tone="tele" dot>{eyebrow}</Label>
          <h1 className="pgb-title">{title}</h1>
          <p className="pgb-dek">{dek}</p>
        </div>
        <div className="pgb-stage">{children}</div>
      </div>
      <footer className="pgb-foot">{footer}</footer>
    </section>
  )
}

// The real Beat lays out against the .onb size container; give it the same one (no sky) so its compact rules and ours apply.
const Host = ({ children }) => (MOCK ? children : <div className="onb">{children}</div>)

// ?flow=1 runs the real <Onboard> from the beat under test, to prove next()/onChange wiring and the Launch summary.
function Flow() {
  const at = q.get('beat') === 'reminder' ? 'remind' : 'goal'
  const s = getSeries(activeSeriesId())
  const shell = { s, seriesId: s.id, mode: modeOf(s), tab: 'learn', goTab() {}, openDay: (d) => { window.__onc = { openDay: d } }, closeLesson() {}, share() {} }
  return (
    <ShellContext.Provider value={shell}>
      <div className="shell"><div className="shell-frame"><div className="shell-layer">
        <Onboard initial={{ at, form: { name: 'Ada', role: 'teen' } }} onDone={(r) => { window.__onc = { done: r } }} />
      </div><FxLayer /><ToastHost /></div></div>
    </ShellContext.Provider>
  )
}

function App() {
  if (q.get('flow') === '1') return <Flow />
  const which = q.get('beat') === 'reminder' ? 'reminder' : 'goal'
  const [goal, setGoal] = useState(q.get('empty') === '1' ? undefined : 40)
  const [rem, setRem] = useState(q.get('empty') === '1' ? undefined : { on: false, hour: 20, min: 0 })
  const [log, setLog] = useState('')
  const w = (window.__onc = window.__onc || { changes: [], nexts: [] })
  const note = (k, v) => { w[k].push(v); setLog(`${k}: ${JSON.stringify(v)}`) }
  const Frame = MOCK ? MockBeat : undefined
  return (
    <div className="shell">
      <style>{css}</style>
      <div className="shell-frame">
        <div className="shell-layer">
          <Host>
          {which === 'goal'
            ? <Goal value={goal} onChange={(v) => { setGoal(v); note('changes', v) }} next={(v) => note('nexts', v)} back={() => note('nexts', 'back')} Frame={Frame} />
            : <Reminder value={rem} onChange={(v) => { setRem(v); note('changes', v) }} next={(v) => note('nexts', v)} back={() => note('nexts', 'back')} Frame={Frame} />}
          </Host>
        </div>
        <FxLayer />
        <ToastHost />
        <div className="pgb-log" data-testid="log">{log || 'idle'}</div>
      </div>
    </div>
  )
}

mount(<App />, { fx: FX })
