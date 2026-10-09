// Specimen sheet for the ui-overlay role: every overlay, instrument and state, on the real tokens.
//   http://localhost:5183/playground/ui-overlay.html            ?fx=lite  forces lite
import { useRef, useState } from 'react'
import { mount } from './_boot.jsx'
import { Sheet, Dialog, toast, ToastHost, Gauge, Ring, Rings, Hex, Dock, Bubble, Counter } from '../src/ui/overlay.js'
import { Icon } from '../src/icons.jsx'

const qs = new URLSearchParams(location.search)
const FX = qs.get('fx') === 'lite' ? 'lite' : 'full'

const Btn = ({ children, tone, on, ...p }) => <button className="pg-btn" data-tone={tone} data-on={on || undefined} {...p}>{children}</button>
const Sec = ({ n, title, note, children }) => (
  <section className="pg-sec" id={'s' + n}>
    <header><span>{String(n).padStart(2, '0')}</span><h2>{title}</h2>{note && <p>{note}</p>}</header>
    {children}
  </section>
)
const Cell = ({ cap, children }) => <div className="pg-cell">{children}<span className="pg-cap">{cap}</span></div>
const Ctl = ({ label, value, set, step = 0.01, max = 1, fmt = (v) => Math.round(v * 100) + '%' }) => (
  <label className="pg-ctl"><span>{label} <output>{fmt(value)}</output></span>
    <input type="range" min="0" max={max} step={step} value={value} onChange={(e) => set(+e.target.value)} />
  </label>
)

const Verse = () => (
  <>
    <p className="pg-eyebrow">Day 12 · Stage 02 · Faithfulness</p>
    <blockquote className="pg-verse">“Moreover it is required in stewards, that a man be found faithful.”</blockquote>
    <p className="pg-ref">1 CORINTHIANS 4:2</p>
    <p className="pg-p">Stewardship is not about how much you hold. It is about whether the One who handed it to you can trust what you do with it.</p>
  </>
)
const Rows = ({ n = 30 }) => Array.from({ length: n }, (_, i) => (
  <div className="pg-item" key={i}><small>DAY {String(i + 1).padStart(2, '0')}</small><span>{['The Ownership Covenant', 'Little Is Not Small', 'The Ledger of Heaven', 'Margin & Mercy'][i % 4]}</span></div>
))

function App() {
  const [sheet, setSheet] = useState(null)             // 'auto' | 'half' | 'long' | 'locked' | 'form'
  const [dlg, setDlg] = useState(null)                 // 'default' | 'danger' | 'ack'
  const [lastDetent, setLastDetent] = useState('-')
  const [lite, setLite] = useState(FX === 'lite')
  const [gv, setGv] = useState(0.62)
  const [sweep, setSweep] = useState(1)
  const [rs, setRs] = useState([0.72, 0.4, 0.15])
  const [n, setN] = useState(1240)
  const [tab, setTab] = useState('learn')
  const [hidden, setHidden] = useState(false)
  const [prog, setProg] = useState(0.4)
  const [nested, setNested] = useState(false)

  const setFx = (on) => { setLite(on); document.documentElement.dataset.fx = on ? 'lite' : 'full' }

  return (
    <div className="pg">
      <div className="pg-bar">
        <b>ui-overlay</b>
        <Btn onClick={() => setSheet('auto')}>Sheet · auto</Btn>
        <Btn onClick={() => setSheet('half')}>Sheet · half+full</Btn>
        <Btn onClick={() => setSheet('long')}>Sheet · long</Btn>
        <Btn onClick={() => setSheet('locked')}>Sheet · locked</Btn>
        <Btn onClick={() => setSheet('form')}>Sheet · form</Btn>
        <Btn onClick={() => setSheet('foot')}>Sheet · footer</Btn>
        <Btn onClick={() => setDlg('default')}>Dialog</Btn>
        <Btn onClick={() => setDlg('danger')}>Danger</Btn>
        <Btn onClick={() => setDlg('ack')}>Ack</Btn>
        <Btn tone="ignite" onClick={() => toast({ title: 'Streak extended', body: '7 days. Ignition holding.', tone: 'ignite', icon: 'flame' })}>Toast</Btn>
        <Btn onClick={() => toast({ title: 'Answer saved', tone: 'go' })}>Go</Btn>
        <Btn onClick={() => toast({ title: 'Not yet — here’s the line.', tone: 'nogo' })}>No-go</Btn>
        <Btn onClick={() => toast({ title: 'Sound on', body: 'Tap to mute.', tone: 'tele', action: { label: 'Mute', onClick: () => toast('Muted') }, key: 'snd' })}>Action</Btn>
        <Btn onClick={() => { toast({ key: 'save', title: 'Saving your journal', body: 'Nothing leaves this device.', loading: true, tone: 'tele' }); setTimeout(() => toast({ key: 'save', title: 'Saved', tone: 'go' }), 1800) }}>Loading</Btn>
        <Btn onClick={() => { for (let i = 1; i <= 4; i++) toast({ title: 'Stacked toast ' + i, body: i % 2 ? 'with a second line of detail' : undefined, tone: ['go', 'tele', 'ignite', 'default'][i - 1] }) }}>Stack ×4</Btn>
        <Btn on={lite} onClick={() => setFx(!lite)}>{lite ? 'Lite ✓' : 'Lite'}</Btn>
      </div>

      <Sec n={1} title="Gauge" note="270° instrument. 60-division titanium bezel, gradient arc that lights the ticks, bladed needle with counterweight, Barlow numerals. Sweep plays the ignition start-up: 0 → redline → value.">
        <div className="pg-row">
          <Cell cap="hero · 232 · sweep · redline .88 · peak"><Gauge size={232} value={gv} min={0} max={100} label="Streak" unit="days" sweep={sweep} redline={0.88} peak={Math.min(1, gv + 0.12)} /></Cell>
          <Cell cap="tele · 176 · xp"><Gauge size={176} value={gv} min={0} max={1000} label="XP today" tone="tele" /></Cell>
          <Cell cap="gold · 144"><Gauge size={144} value={gv} max={31} label="Day" unit="of 31" tone="gold" /></Cell>
          <Cell cap="go · 112"><Gauge size={112} value={gv} tone="go" label="Accuracy" unit="%" /></Cell>
          <Cell cap="compact · 80 / 56"><div className="pg-row" style={{ gap: 16, alignItems: 'center' }}>
            <Gauge size={80} value={gv} tone="ignite" /><Gauge size={56} value={gv} tone="tele" ticks={false} />
          </div></Cell>
          <div style={{ display: 'grid', gap: 16 }}>
            <Ctl label="value" value={gv} set={setGv} />
            <Btn onClick={() => setSweep((s) => s + 1)}>Replay start-up sweep</Btn>
          </div>
        </div>
      </Sec>

      <Sec n={2} title="Rings" note="Concentric. Round caps, angular gradient, a bloom riding the head. Closing a ring pops it, throws a one-shot sparkle, and fires haptic.success + sound ring.">
        <div className="pg-row">
          <Cell cap="lesson · xp · accuracy">
            <Rings size={200} rings={[
              { id: 'lesson', value: rs[0], tone: 'ignite', icon: 'flame', label: 'Lesson' },
              { id: 'xp', value: rs[1], tone: 'tele', icon: 'bolt', label: 'XP' },
              { id: 'right', value: rs[2], tone: 'go', icon: 'check', label: 'Accuracy' },
            ]}>
              <Counter value={Math.round(((rs[0] + rs[1] + rs[2]) / 3) * 100)} suffix="%" style={{ font: '600 var(--fs-2xl)/1 var(--font-display)' }} />
            </Rings>
          </Cell>
          <Cell cap="Ring · 96 · gold"><Ring size={96} value={rs[0]} tone="gold" icon="star" /></Cell>
          <Cell cap="Ring · 64 · stage"><Ring size={64} value={rs[1]} tone="stage" /></Cell>
          <Cell cap="Ring · 48 · lite-safe"><Ring size={48} value={rs[2]} tone="tele" glow={false} /></Cell>
          <div style={{ display: 'grid', gap: 12 }}>
            <Ctl label="lesson" value={rs[0]} set={(v) => setRs([v, rs[1], rs[2]])} />
            <Ctl label="xp" value={rs[1]} set={(v) => setRs([rs[0], v, rs[2]])} />
            <Ctl label="accuracy" value={rs[2]} set={(v) => setRs([rs[0], rs[1], v])} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn tone="ignite" onClick={() => setRs([1, 1, 1])}>Close all</Btn><Btn onClick={() => setRs([0.05, 0.05, 0.05])}>Reset</Btn>
            </div>
          </div>
        </div>
      </Sec>

      <Sec n={3} title="Hex" note="Bevelled plates machined from stacked clip-paths: extrusion foot, titanium rim, reversed-light slope, carbon plate. Glow sits outside the clip. Press the interactive one.">
        <div className="pg-row" style={{ gap: 28 }}>
          {['locked', 'open', 'current', 'done', 'rare'].map((s, i) => (
            <Cell key={s} cap={s}><Hex size={80} state={s}>{s === 'locked' || s === 'done' || s === 'rare' ? undefined : String(12 + i)}</Hex></Cell>
          ))}
        </div>
        <div className="pg-row" style={{ gap: 28, marginTop: 40 }}>
          {[1, 2, 3, 4, 5].map((k) => (
            <div key={k} style={{ '--stage': `var(--stage-${k})`, '--stage-glow': `var(--stage-${k}-glow)` }}>
              <Cell cap={'stage ' + k + ' · done'}><Hex size={72} state="done" glow /></Cell>
            </div>
          ))}
          <Cell cap="tele"><Hex size={72} state="open" tone="tele">7</Hex></Cell>
        </div>
        <div className="pg-row" style={{ gap: 28, marginTop: 40 }}>
          <Cell cap="48"><Hex size={48} state="current">3</Hex></Cell>
          <Cell cap="72 · ring .4"><Hex size={72} state="current" ring={prog}>12</Hex></Cell>
          <Cell cap="104 · ring"><Hex size={104} state="done" ring /></Cell>
          <Cell cap="interactive · press me"><Hex size={88} state="open" onClick={() => toast({ title: 'Launching Day 12', tone: 'ignite' })}>12</Hex></Cell>
          <Ctl label="ring progress" value={prog} set={setProg} />
        </div>
        <div className="pg-row" style={{ gap: 40, marginTop: 40, alignItems: 'flex-start' }}>
          <div className="pg-path" aria-label="the ascent, in context">
            {/* centres of each node; the flight path is a polyline through them, lit up to the current one */}
            <svg width="240" height="520" viewBox="0 0 240 520" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
              <polyline points="120,470 160,385 100,300 70,215 130,130 90,45" fill="none" stroke="var(--ti-4)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="120,470 160,385 100,300" fill="none" stroke="var(--stage-1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px var(--stage-1-glow))' }} />
            </svg>
            <Hex size={60} state="done" style={{ left: 90, top: 435 }} />
            <Hex size={60} state="done" style={{ left: 130, top: 350 }} />
            <Hex size={72} state="current" style={{ left: 64, top: 258 }}>3</Hex>
            <Hex size={60} state="open" style={{ left: 40, top: 180 }}>4</Hex>
            <Hex size={60} state="locked" style={{ left: 100, top: 95 }} />
            <Hex size={60} state="rare" style={{ left: 60, top: 10 }} />
          </div>
        </div>
      </Sec>

      <Sec n={4} title="Counter" note="Tabular, width-reserved, expo-out count; or rolling digit reels (Apple's numeric text transition).">
        <div className="pg-row" style={{ alignItems: 'center' }}>
          <Cell cap="count"><Counter value={n} suffix=" XP" style={{ font: '700 var(--fs-3xl)/1 var(--font-display)' }} /></Cell>
          <Cell cap="roll"><Counter roll value={n} suffix=" XP" style={{ font: '700 var(--fs-3xl)/1.1 var(--font-display)' }} /></Cell>
          <Cell cap="+prefix · roll"><Counter roll value={40} prefix="+" suffix=" XP" style={{ font: '600 var(--fs-xl)/1.2 var(--font-mono)', color: 'var(--tele)' }} /></Cell>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn onClick={() => setN((v) => v + 40)}>+40</Btn><Btn onClick={() => setN((v) => v + 1240)}>+1,240</Btn>
            <Btn onClick={() => setN(999)}>999</Btn><Btn onClick={() => setN(1000)}>1,000</Btn><Btn onClick={() => setN(0)}>0</Btn>
          </div>
        </div>
      </Sec>

      <Sec n={5} title="Bubble" note="Coach-mark: chamfered, tail cut into the same clip-path as the body so the outline is one continuous 1px line.">
        <div className="pg-grid" style={{ paddingTop: 0 }}>
          {['top', 'bottom', 'left', 'right', 'top-start', 'bottom-end'].map((p, i) => (
            <div className="pg-cell pg-cell--cap-first" key={p}>
              <span className="pg-cap">{p}</span>
              <div className="pg-anchor"><i />
                <Bubble placement={p} tone={i === 1 ? 'ignite' : i === 2 ? 'tele' : 'default'} float={i < 4}>{i === 1 ? 'Tap to launch Day 12' : i === 2 ? 'Your streak lives here' : 'Faithful in little.'}</Bubble>
              </div>
            </div>
          ))}
        </div>
      </Sec>

      <Sec n={6} title="Dock" note="Floating glass capsule, inset and above the safe area. The ignition plate slides on a spring; line icons crossfade to solid. Press and slide across it to scrub: the plate follows your finger, a detent ticks at each tab, release selects.">
        <div className="pg-row" style={{ alignItems: 'flex-start' }}>
          <div className="pg-phone" aria-label="mock phone">
            <div className="pg-phone-body">
              <p className="pg-eyebrow">Mock phone · 390 wide</p>
              {[0, 1, 2].map((i) => <div className="pg-phone-card" key={i} />)}
            </div>
            <Dock
              style={{ width: 'calc(100% - var(--gutter) * 2)' }}   /* the mock frame is the viewport here; a fixed dock otherwise sizes against 100vw */
              hidden={hidden} value={tab} onChange={(id, o) => { setTab(id); toast({ title: o.reselect ? 'Scroll to top' : 'Tab: ' + id, tone: 'tele', duration: 1200, key: 'tab' }) }}
              tabs={[
                { id: 'learn', label: 'Learn', icon: 'learn' }, { id: 'objectives', label: 'Objectives', icon: 'objectives', badge: true },
                { id: 'shorts', label: 'Shorts', icon: 'shorts' }, { id: 'locker', label: 'Locker', icon: 'locker', badge: 3 }, { id: 'me', label: 'Me', icon: 'me' },
              ]}
            />
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <Btn onClick={() => setHidden((h) => !h)}>{hidden ? 'Show dock' : 'Hide dock'}</Btn>
            <span className="pg-live">tab = {tab}</span>
          </div>
        </div>
      </Sec>

      {/* ── overlays under test ── */}
      <Sheet open={sheet === 'auto'} onClose={() => setSheet(null)} title="Today's launch">
        <Verse />
        <Btn tone="ignite" onClick={() => setDlg('default')}>Open a dialog on top</Btn>
      </Sheet>
      <Sheet open={sheet === 'half'} onClose={() => setSheet(null)} title="Journal" detents={['half', 'full']} onDetentChange={setLastDetent}>
        <Verse />
        <p className="pg-live">detent: {lastDetent}</p>
        <Rows n={12} />
      </Sheet>
      <Sheet open={sheet === 'long'} onClose={() => setSheet(null)} title="All 31 days" detents={['auto', 'full']}>
        <Rows n={31} />
      </Sheet>
      <Sheet open={sheet === 'locked'} onClose={() => setSheet(null)} title="Choose your pace" dismissable={false} detents={['auto']}>
        <p className="pg-p">This sheet cannot be dragged away, tapped away, or closed with Esc or Back. It rubber-bands instead.</p>
        <Btn tone="ignite" onClick={() => setSheet(null)}>Commit</Btn>
      </Sheet>
      <Sheet
        open={sheet === 'foot'} onClose={() => setSheet(null)} title="Launch Day 12" eyebrow="T-02:14:09 · Stage 02" detents={['half', 'full']}
        footer={<Btn tone="ignite" style={{ width: '100%', minHeight: 'var(--tap)' }} onClick={() => setSheet(null)}>Launch</Btn>}
      >
        <Verse />
        <Rows n={14} />
      </Sheet>
      <Sheet open={sheet === 'form'} onClose={() => setSheet(null)} title="Reminder">
        <p className="pg-p">The keyboard must not hide this field (visualViewport inset).</p>
        <input className="pg-input" placeholder="What should we call you?" aria-label="Name" />
        <input className="pg-input" placeholder="Reminder time" aria-label="Time" />
      </Sheet>

      <Dialog
        open={dlg === 'default'} eyebrow="Cleared for launch" title="Start Day 12?" body="The Ownership Covenant · about 6 minutes. Your streak is protected until 9 pm."
        confirmLabel="Launch" cancelLabel="Not now" onConfirm={() => setDlg(null)} onCancel={() => setDlg(null)}
      />
      <Dialog
        open={dlg === 'danger'} tone="danger" eyebrow="Caution" title="Leave this lesson?" body="You will lose today's progress. Your answers so far are not saved."
        confirmLabel="Leave" cancelLabel="Stay" onConfirm={() => setDlg(null)} onCancel={() => setDlg(null)}
      />
      <Dialog open={dlg === 'ack'} title="Streak ended at 12" body="Day 1 starts now." confirmLabel="Begin again" cancelLabel={null} onConfirm={() => setDlg(null)} />
      <ToastHost />
    </div>
  )
}

mount(<App />, { fx: FX })
