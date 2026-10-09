// Ignition playground — the splash in the real shell frame, exactly as App mounts it (shell > frame > is-splash layer, FxLayer beside).
//   ?first=1 (default) the first-run ceremony   ?first=0 the 0.6 s returning splash   ?fx=lite  the 300 ms Mark fade
// Everything the verification script needs is on window.__ign:  { events:[{name,t}], pressAt, doneAt:[…], replay(first?) }  (ms since mount)
import { useState } from 'react'
import { mount } from './_boot.jsx'
import Ignition from '../src/screens/Ignition.jsx'
import FxLayer from '../src/fx/FxLayer.jsx'

const q = new URLSearchParams(location.search)
const T0 = performance.now()
const now = () => Math.round(performance.now() - T0)
const ign = (window.__ign = { t0: T0, events: [], doneAt: [], pressAt: null, liftAt: null })

document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('.ign-btn, .ign-lite-go')) { ign.pressAt = ign.pressAt ?? now(); ign.events.push({ name: 'press', t: now() }) }
  if (e.target.closest && e.target.closest('.ign-hit')) { ign.liftAt = now(); ign.events.push({ name: 'lift', t: now() }) }
}, true)

const mono = { font: '500 11px/1.4 var(--font-mono)', letterSpacing: '.04em', color: 'var(--ink-2)' }
const link = { ...mono, color: 'var(--tele)', textDecoration: 'none', padding: '2px 6px', border: '1px solid var(--line-2)', borderRadius: 4, background: 'var(--carbon-1)' }

function Stage() {
  const [run, setRun] = useState(0)
  const [first, setFirst] = useState(q.get('first') !== '0')
  const [count, setCount] = useState(0)
  ign.replay = (f) => { ign.pressAt = null; ign.liftAt = null; ign.doneAt = []; ign.events = []; if (typeof f === 'boolean') setFirst(f); setCount(0); setRun((n) => n + 1) }
  const onDone = () => { ign.doneAt.push(now()); ign.events.push({ name: 'done', t: now() }); setCount((n) => n + 1) }
  return (
    <>
      <div className="shell">
        <div className="shell-frame">
          <div className="shell-layer is-splash" key={run}>
            <Ignition first={first} onDone={onDone} />
          </div>
        </div>
        <FxLayer />
      </div>
      <div hidden={q.has('bare')} style={{ position: 'fixed', left: 8, bottom: 8, zIndex: 200, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', opacity: 0.75 }}>
        <button style={link} onClick={() => ign.replay()}>replay</button>
        <a style={link} href="?first=1">first</a>
        <a style={link} href="?first=0">returning</a>
        <a style={link} href="?first=1&fx=lite">first · lite</a>
        <a style={link} href="?first=0&fx=lite">ret · lite</a>
        <span style={mono} data-testid="ign-log">first={String(first)} · onDone×{count}</span>
      </div>
    </>
  )
}

mount(<Stage />, { fx: q.get('fx') === 'lite' ? 'lite' : 'full' })
