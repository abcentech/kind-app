// ui-core specimen sheet — every primitive, every state. One column at 390, two-up from 900.
//   http://localhost:5183/playground/ui-core.html           (?fx=lite for the lite render)
// Hover / pressed / focus are forced with data-state="hover|active|focus" so a screenshot can show them at rest.
import { useEffect, useState } from 'react'
import { mount } from './_boot.jsx'
import {
  Button, IconButton, Chip, Tag, Panel, Row, RowGroup, Switch, Segmented, Slider, Progress, SegmentBar, Skeleton, Stat, Kbd, Empty, Label, TextField, Spinner,
} from '../src/ui/core.js'

const FX = new URLSearchParams(location.search).get('fx') === 'lite' ? 'lite' : 'full'

const Sec = ({ id, n, title, note, wide, children }) => (
  <section className={'pg-sec' + (wide ? ' pg-wide' : '')} id={id}>
    <h2><span>{title}</span><small>{n}{note ? ` · ${note}` : ''}</small></h2>
    {children}
  </section>
)
const Cell = ({ cap, children }) => <div className="pg-cell">{children}<span className="pg-cap">{cap}</span></div>

const STATES = [
  ['rest', {}],
  ['hover', { 'data-state': 'hover' }],
  ['pressed', { 'data-state': 'active' }],
  ['focus', { 'data-state': 'focus' }],
  ['disabled', { disabled: true }],
  ['loading', { loading: true }],
]

function Buttons() {
  const [busy, setBusy] = useState(false)
  return (
    <>
      <Sec id="sec-button" n="01" title="Button" note="variant × state · lg" wide>
        <div className="pg-grid">
          {['primary', 'secondary', 'ghost', 'danger', 'go'].map((v) => (
            <div className="pg-stack" key={v}>
              <Label mono>{v}</Label>
              <div className="pg-cells">
                {STATES.map(([cap, p]) => (
                  <Cell key={cap} cap={cap}><Button variant={v} silent {...p}>{v === 'go' ? 'Go' : v === 'danger' ? 'Reset' : 'Launch'}</Button></Cell>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Sec>

      <Sec id="sec-button-b" n="02" title="Button" note="sizes · icons · full · pulse">
        <div className="pg-stack">
          <div className="pg-row">
            <Button size="lg" icon="rocket" silent>Launch day 12</Button>
          </div>
          <div className="pg-row">
            <Button size="md" iconRight="arrowRight" silent>Continue</Button>
            <Button size="sm" icon="plus" silent>Add</Button>
            <Button size="md" variant="secondary" icon="calendar" silent>Remind me</Button>
            <Button size="sm" variant="secondary" silent>Skip</Button>
          </div>
          <div className="pg-row">
            <Button size="md" variant="go" icon="check" silent>Check</Button>
            <Button size="md" variant="danger" icon="trash" silent>Delete</Button>
            <Button size="sm" variant="ghost" iconRight="chevronRight" silent>Details</Button>
            <Button size="md" variant="ghost" silent>Not now</Button>
          </div>
          <Button full size="lg" pulse icon="rocket" silent>Cleared for launch</Button>
          <Button full size="md" variant="secondary" silent>Full width · secondary</Button>
          <div className="pg-row">
            <Button size="lg" icon="settings" aria-label="Settings" silent />
            <Button size="md" variant="secondary" icon="plus" aria-label="Add" silent />
            <Button size="sm" variant="ghost" icon="close" aria-label="Close" silent />
            <Button as="a" href="#sec-panel" size="md" variant="secondary" iconRight="arrowRight" silent>As a link</Button>
          </div>
          <div className="pg-row">
            <Button size="lg" loading={busy} onClick={() => { setBusy(true); setTimeout(() => setBusy(false), 2200) }}>{busy ? 'Igniting' : 'Tap to load'}</Button>
            <Button size="md" variant="secondary" loading silent>Saving</Button>
            <Button size="sm" loading silent>Wait</Button>
          </div>
        </div>
      </Sec>

      <Sec id="sec-button-c" n="03" title="Button" note="on every surface">
        <div className="pg-stack">
          <div className="pg-surface pg-row"><Button silent>On carbon-0</Button><Button variant="secondary" silent>Secondary</Button></div>
          <Panel pad="md" className="pg-row"><Button size="md" silent>On plate</Button><Button size="md" variant="secondary" silent>Secondary</Button><Button size="md" variant="ghost" silent>Ghost</Button></Panel>
          <Panel tone="raised" pad="md" className="pg-row"><Button size="md" variant="go" silent>On raised</Button><Button size="md" variant="danger" silent>Danger</Button></Panel>
          <div className="pg-stage pg-row"><Button size="md" silent>On the sky</Button><Button size="md" variant="secondary" silent>Secondary</Button></div>
        </div>
      </Sec>
    </>
  )
}

function IconButtons() {
  return (
    <Sec id="sec-iconbutton" n="04" title="Icon button" note="ghost · plate × size × state">
      <div className="pg-stack">
        {['ghost', 'plate'].map((v) => (
          <div className="pg-stack" key={v}>
            <Label mono>{v}</Label>
            <div className="pg-cells" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
              {STATES.filter(([c]) => c !== 'loading').map(([cap, p]) => (
                <Cell key={cap} cap={cap}><IconButton icon="settings" label="Settings" variant={v} silent {...p} /></Cell>
              ))}
            </div>
          </div>
        ))}
        <div className="pg-row">
          <Cell cap="sm"><IconButton icon="close" label="Close" size="sm" variant="plate" silent /></Cell>
          <Cell cap="md"><IconButton icon="close" label="Close" variant="plate" silent /></Cell>
          <Cell cap="lg"><IconButton icon="close" label="Close" size="lg" variant="plate" silent /></Cell>
          <Cell cap="badge 3"><IconButton icon="bell" label="Alerts" variant="plate" badge={3} silent /></Cell>
          <Cell cap="dot"><IconButton icon="bell" label="Alerts" variant="ghost" badge silent /></Cell>
        </div>
      </div>
    </Sec>
  )
}

function Chips() {
  const [sel, setSel] = useState('all')
  const [multi, setMulti] = useState({ a: true, b: false, c: false })
  return (
    <Sec id="sec-chip" n="05" title="Chip · Tag" note="status LEDs">
      <div className="pg-stack">
        <Label mono>tag</Label>
        <div className="pg-row">
          {['neutral', 'ignite', 'tele', 'go', 'nogo', 'gold', 'stage'].map((t) => <Tag key={t} tone={t}>{t === 'stage' ? 'Stage 2' : t}</Tag>)}
        </div>
        <div className="pg-row">
          <Tag tone="go" icon="check">Cleared</Tag>
          <Tag tone="ignite" led={false}>No LED</Tag>
          <Tag stage={3}>Stage 3</Tag>
          <Tag stage={4}>Stage 4</Tag>
          <Tag stage={5}>Stage 5</Tag>
        </div>
        <Label mono>chip · single select</Label>
        <div className="pg-row">
          {[['all', 'All'], ['week', 'This week'], ['rare', 'Gold']].map(([id, l]) => <Chip key={id} selected={sel === id} onClick={() => setSel(id)} silent>{l}</Chip>)}
        </div>
        <Label mono>chip · tones, multi</Label>
        <div className="pg-row">
          <Chip tone="ignite" selected={multi.a} onClick={() => setMulti((m) => ({ ...m, a: !m.a }))} silent>Streak</Chip>
          <Chip tone="tele" selected={multi.b} onClick={() => setMulti((m) => ({ ...m, b: !m.b }))} silent>XP</Chip>
          <Chip tone="go" selected={multi.c} onClick={() => setMulti((m) => ({ ...m, c: !m.c }))} silent>Done</Chip>
          <Chip icon="star" tone="gold" selected onClick={() => {}} silent>Rare</Chip>
        </div>
        <Label mono>chip · states</Label>
        <div className="pg-row">
          <Cell cap="rest"><Chip onClick={() => {}} silent>Rest</Chip></Cell>
          <Cell cap="hover"><Chip onClick={() => {}} data-state="hover" silent>Hover</Chip></Cell>
          <Cell cap="pressed"><Chip onClick={() => {}} data-state="active" silent>Press</Chip></Cell>
          <Cell cap="focus"><Chip onClick={() => {}} data-state="focus" silent>Focus</Chip></Cell>
          <Cell cap="selected"><Chip onClick={() => {}} selected tone="tele" silent>On</Chip></Cell>
          <Cell cap="disabled"><Chip onClick={() => {}} disabled silent>Off</Chip></Cell>
          <Cell cap="static"><Chip tone="go" selected>Readout</Chip></Cell>
        </div>
      </div>
    </Sec>
  )
}

function Panels() {
  return (
    <Sec id="sec-panel" n="06" title="Panel" note="tone × cut × pad" wide>
      <div className="pg-grid">
        {[
          ['plate', {}], ['raised', {}], ['sunk', {}], ['ignite', {}],
          ['plate', { cut: true }], ['raised', { cut: true }], ['ignite', { cut: true }], ['plate', { cut: 'sm' }],
          ['sunk', { cut: true }],
        ].map(([tone, p], i) => (
          <Panel key={i} tone={tone} pad="md" {...p}>
            <Label mono tone={tone === 'ignite' ? 'ignite' : 'neutral'}>{tone}{p.cut ? ` · cut${p.cut === 'sm' ? ' sm' : ''}` : ''}</Label>
            <div style={{ marginTop: 8, fontSize: 'var(--fs-md)', color: 'var(--ink-2)', lineHeight: 1.45 }}>Faithful in little. A surface machined from carbon, lit from above.</div>
          </Panel>
        ))}
        {[1, 2, 3, 4, 5].map((s) => (
          <Panel key={s} stage={s} cut={s % 2 ? true : false} pad="md">
            <Label stage={s} mono>stage {s}</Label>
            <div style={{ marginTop: 8, fontSize: 'var(--fs-md)', color: 'var(--ink-2)' }}>Stage-tinted — hue from the five.</div>
          </Panel>
        ))}
        {['go', 'nogo', 'tele'].map((t) => (
          <Panel key={t} tone={t} cut pad="md"><Label mono tone={t}>{t === 'tele' ? 'chosen' : t === 'go' ? 'go · correct' : 'no-go · not yet'}</Label><div style={{ marginTop: 6, color: 'var(--ink-2)', fontSize: 'var(--fs-md)' }}>Answer-plate verdict tone.</div></Panel>
        ))}
        <div className="pg-stage" style={{ gridColumn: '1 / -1' }}>
          <Panel tone="glass" pad="md"><Label mono tone="tele">glass · chrome only</Label><div style={{ marginTop: 8, color: 'var(--ink-2)', fontSize: 'var(--fs-md)' }}>Translucent HUD material over the sky.</div></Panel>
        </div>
        {[['rest', {}], ['hover', { 'data-state': 'hover' }], ['pressed', { 'data-state': 'active' }], ['focus', { 'data-state': 'focus' }]].map(([cap, st]) => (
          <Panel key={cap} onClick={() => {}} silent pad="md" tone="raised" {...st}><Label mono>pressable · {cap}</Label><div style={{ marginTop: 6, color: 'var(--ink-2)', fontSize: 'var(--fs-md)' }}>Day 12 · The Ownership Covenant</div></Panel>
        ))}
        {[['rest', {}], ['hover', { 'data-state': 'hover' }], ['pressed', { 'data-state': 'active' }], ['focus', { 'data-state': 'focus' }]].map(([cap, st]) => (
          <Panel key={cap} onClick={() => {}} silent pad="md" tone="raised" cut {...st}><Label mono tone="ignite">cut · {cap}</Label><div style={{ marginTop: 6, color: 'var(--ink-2)', fontSize: 'var(--fs-md)' }}>Card of honour — chamfered, pressable.</div></Panel>
        ))}
        <Panel tone="raised" texture="carbon" pad="md"><Label mono>texture · carbon (foundation weave)</Label></Panel>
        <Panel tone="raised" texture="none" pad="md"><Label mono>texture · none</Label></Panel>
        {['sm', 'md', 'lg'].map((p) => (
          <Panel key={p} pad={p}><Label mono>pad {p}</Label></Panel>
        ))}
      </div>
    </Sec>
  )
}

function Rows() {
  const [snd, setSnd] = useState(true)
  const [hap, setHap] = useState(false)
  return (
    <Sec id="sec-row" n="07" title="Row · RowGroup" note="inset grouped list">
      <div className="pg-stack">
        <RowGroup title="Preferences" footer="Sound follows the volume you set here. Nothing leaves this device.">
          <Row as="label" icon="soundOn" tone="tele" title="Sound" sub="Interface cues at 60%" trailing={<Switch label="Sound" checked={snd} onChange={setSnd} silent />} />
          <Row as="label" icon="vibrate" tone="go" title="Haptics" trailing={<Switch label="Haptics" checked={hap} onChange={setHap} silent />} />
          <Row icon="bell" tone="ignite" title="Reminder" value="8:00 pm" chevron onClick={() => {}} silent />
          <Row icon="textSize" title="Text size" sub="Scales the reading slides" value="110%" chevron onClick={() => {}} silent />
        </RowGroup>
        <RowGroup title="States">
          <Row title="Plain row, no icon" value="Value" />
          <Row title="Interactive · hover" chevron onClick={() => {}} data-state="hover" silent />
          <Row title="Interactive · pressed" chevron onClick={() => {}} data-state="active" silent />
          <Row title="Interactive · focus" chevron onClick={() => {}} data-state="focus" silent />
          <Row title="Disabled" chevron onClick={() => {}} disabled silent />
        </RowGroup>
        <RowGroup>
          <Row icon="trash" tone="nogo" title="Reset my progress" sub="This cannot be undone" onClick={() => {}} silent />
        </RowGroup>
      </div>
    </Sec>
  )
}

function Controls() {
  const [on, setOn] = useState({ a: true, b: false })
  const [seg, setSeg] = useState('regular')
  const [seg2, setSeg2] = useState('b')
  const [seg3, setSeg3] = useState('day')
  const [vol, setVol] = useState(60)
  const [goal, setGoal] = useState(40)
  const [size, setSize] = useState(110)
  return (
    <>
      <Sec id="sec-switch" n="08" title="Switch" note="state × tone">
        <div className="pg-row" style={{ gap: '20px 24px' }}>
          <Cell cap="off"><Switch label="Off" checked={on.b} onChange={(v) => setOn((s) => ({ ...s, b: v }))} silent /></Cell>
          <Cell cap="on"><Switch label="On" checked={on.a} onChange={(v) => setOn((s) => ({ ...s, a: v }))} silent /></Cell>
          <Cell cap="hover"><Switch label="Hover" data-state="hover" defaultChecked silent /></Cell>
          <Cell cap="pressed"><Switch label="Pressed" data-state="active" defaultChecked silent /></Cell>
          <Cell cap="focus"><Switch label="Focus" data-state="focus" defaultChecked silent /></Cell>
          <Cell cap="focus off"><Switch label="Focus off" data-state="focus" silent /></Cell>
          <Cell cap="disabled"><Switch label="Disabled" disabled silent /></Cell>
          <Cell cap="disabled on"><Switch label="Disabled on" disabled defaultChecked silent /></Cell>
          <Cell cap="ignite"><Switch label="Ignite" tone="ignite" defaultChecked silent /></Cell>
          <Cell cap="tele"><Switch label="Tele" tone="tele" defaultChecked silent /></Cell>
        </div>
      </Sec>

      <Sec id="sec-seg" n="09" title="Segmented" note="sliding thumb · arrows move">
        <div className="pg-stack">
          <Segmented label="Daily commitment" value={seg} onChange={setSeg} silent options={[{ id: 'casual', label: 'Casual' }, { id: 'regular', label: 'Regular' }, { id: 'serious', label: 'Serious' }]} />
          <Segmented label="Binary" value={seg2} onChange={setSeg2} silent options={[{ id: 'a', label: 'Teen' }, { id: 'b', label: 'Parent' }]} />
          <Segmented size="sm" label="Range" value={seg3} onChange={setSeg3} silent options={[{ id: 'day', label: 'Day' }, { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'all', label: 'All', disabled: true }]} />
          <Segmented label="With icons" value="learn" onChange={() => {}} silent options={[{ id: 'learn', label: 'Learn', icon: 'learn' }, { id: 'obj', label: 'Goals', icon: 'target' }, { id: 'lock', label: 'Locker', icon: 'lock' }]} />
          <Segmented label="Focus (forced)" value="b" data-state="focus" onChange={() => {}} silent options={[{ id: 'a', label: 'One' }, { id: 'b', label: 'Two' }, { id: 'c', label: 'Three' }, { id: 'd', label: 'Four' }]} />
          <Segmented full={false} label="Auto width" value="x" onChange={() => {}} silent options={[{ id: 'x', label: 'Auto' }, { id: 'y', label: 'Width' }]} />
        </div>
      </Sec>

      <Sec id="sec-slider" n="10" title="Slider" note="fader · gauge scale">
        <div className="pg-stack" style={{ gap: 20 }}>
          <Slider label="Volume" value={vol} onChange={setVol} format={(v) => `${v}%`} silent />
          <Slider label="Daily goal" min={20} max={60} step={20} value={goal} onChange={setGoal} format={(v) => `${v} XP`} tone="ignite" silent />
          <Slider label="Text size" min={90} max={130} step={5} value={size} onChange={setSize} format={(v) => `${v}%`} silent />
          <Slider label="Focus (forced)" value={35} data-state="focus" onChange={() => {}} silent />
          <Slider label="Disabled" value={50} disabled onChange={() => {}} silent />
          <Slider label="Min / max" value={0} onChange={() => {}} showValue={false} silent />
        </div>
      </Sec>
    </>
  )
}

function Meters() {
  const [p, setP] = useState(0.62)
  const [step, setStep] = useState(5)
  useEffect(() => { const t = setTimeout(() => setP(0.62), 0); return () => clearTimeout(t) }, [])
  return (
    <>
      <Sec id="sec-progress" n="11" title="Progress" note="instrument bar · leading cap">
        <div className="pg-stack" style={{ gap: 22 }}>
          {['ignite', 'tele', 'go', 'gold'].map((t, i) => (
            <div className="pg-stack" style={{ gap: 8 }} key={t}><Label mono>{t} · {[24, 62, 88, 40][i]}%</Label><Progress tone={t} value={[0.24, 0.62, 0.88, 0.4][i]} label={t} /></div>
          ))}
          <div className="pg-stack" style={{ gap: 8 }}><Label mono stage={2}>stage 2 · 55%</Label><Progress stage={2} value={0.55} /></div>
          <div className="pg-stack" style={{ gap: 8 }}><Label mono>0% · 100% · glow off</Label><Progress value={0} /><Progress tone="go" value={1} /><Progress tone="tele" value={0.5} glow={false} /></div>
          <div className="pg-stack" style={{ gap: 8 }}><Label mono>height 4 · 12 · 16</Label><Progress tone="tele" height={4} value={p} /><Progress tone="ignite" height={12} value={p} /><Progress tone="go" height={16} value={p} /></div>
          <div className="pg-stack" style={{ gap: 8 }}><Label mono>indeterminate</Label><Progress tone="tele" indeterminate /></div>
          <div className="pg-row"><Button size="sm" variant="secondary" silent onClick={() => setP((v) => (v >= 1 ? 0.1 : Math.min(1, v + 0.18)))}>Advance</Button></div>
        </div>
      </Sec>

      <Sec id="sec-ticker" n="12" title="Segment bar" note="the lesson ticker">
        <div className="pg-stack" style={{ gap: 20 }}>
          <div className="pg-stack" style={{ gap: 8 }}><Label mono>tele · 5 of 12</Label><SegmentBar total={12} done={step} /></div>
          <div className="pg-stack" style={{ gap: 8 }}><Label mono>ignite · 9 of 14</Label><SegmentBar total={14} done={9} tone="ignite" /></div>
          <div className="pg-stack" style={{ gap: 8 }}><Label mono>go · complete 8/8</Label><SegmentBar total={8} done={8} tone="go" /></div>
          <div className="pg-stack" style={{ gap: 8 }}><Label mono>stage 4 · 3 of 20</Label><SegmentBar total={20} done={3} stage={4} /></div>
          <div className="pg-stack" style={{ gap: 8 }}><Label mono>empty 0 of 6</Label><SegmentBar total={6} done={0} /></div>
          <div className="pg-row">
            <Button size="sm" variant="secondary" silent onClick={() => setStep((s) => (s >= 12 ? 0 : s + 1))}>Next segment</Button>
            <Button size="sm" variant="ghost" silent onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
          </div>
        </div>
      </Sec>
    </>
  )
}

function Misc() {
  return (
    <>
      <Sec id="sec-skel" n="13" title="Skeleton" note="slow sheen sweep">
        <Panel pad="md" className="pg-stack" aria-busy="true">
          <div className="pg-row" style={{ flexWrap: 'nowrap' }}>
            <Skeleton w={56} h={64} r="var(--r-sm)" />
            <div className="pg-stack" style={{ flex: 1, gap: 10 }}><Skeleton h={14} w="70%" /><Skeleton h={12} w="92%" /><Skeleton h={12} w="54%" /></div>
          </div>
          <Skeleton h={44} r="var(--r-sm)" />
          <div className="pg-row"><Skeleton w={72} h={24} r="full" /><Skeleton w={96} h={24} r="full" /></div>
        </Panel>
      </Sec>

      <Sec id="sec-stat" n="14" title="Stat" note="telemetry readouts">
        <Panel pad="md">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
            <Stat label="Streak" value="12" unit="days" icon="flame" tone="ignite" sub="Ignition holding" />
            <Stat label="XP" value="1,240" tone="tele" icon="bolt" sub="+40 today" />
            <Stat label="Rank" value="03" unit="/ 07" tone="gold" icon="medal" sub="Steward" />
          </div>
        </Panel>
        <div className="pg-row" style={{ gap: 28, alignItems: 'flex-end' }}>
          <Stat size="sm" label="Small" value="31" unit="days" />
          <Stat size="md" label="Medium" value="T-02:14" tone="tele" />
          <Stat size="lg" label="Day" value="12" unit="/ 31" tone="ignite" />
        </div>
      </Sec>

      <Sec id="sec-kbd" n="15" title="Kbd · Label">
        <div className="pg-stack">
          <div className="pg-row"><Kbd>1</Kbd><Kbd>2</Kbd><Kbd>3</Kbd><Kbd lit>4</Kbd><Kbd>Esc</Kbd><Kbd>Enter</Kbd><Kbd>Space</Kbd></div>
          <div className="pg-row" style={{ gap: 20 }}>
            <Label>Eyebrow sm</Label><Label size="md">Eyebrow md</Label><Label tone="ignite">Stage 02</Label><Label tone="tele" dot>Live</Label><Label tone="go" dot>Go</Label><Label tone="nogo" dot>No-go</Label><Label tone="gold">Rare</Label>
          </div>
          <div className="pg-row" style={{ gap: 20 }}>
            <Label mono>T-02:14:09</Label><Label mono tone="tele">Day 12/31</Label><Label mono size="md" tone="ignite">+40 XP</Label><Label mono tone="ink-2">1,240 XP</Label>
          </div>
        </div>
      </Sec>

      <Sec id="sec-empty" n="16" title="Empty" note="reticle · line · action">
        <Panel pad="sm">
          <Empty art="journal" title="Nothing written yet" body="Your own words will gather here — every answer you write in a lesson." action={<Button size="md" variant="secondary" silent>Start Day 1</Button>} />
        </Panel>
      </Sec>
    </>
  )
}


function Fields() {
  const [name, setName] = useState('Ada')
  const [note, setNote] = useState('')
  const bad = name.trim().length < 2 ? 'At least two letters.' : null
  return (
    <Sec id="sec-field" n="18" title="Field · Spinner" note="recessed well">
      <div className="pg-stack">
        <TextField label="What should we call you?" value={name} onChange={setName} error={bad} maxLength={24} placeholder="Your first name" autoComplete="given-name" enterKeyHint="next" />
        <TextField label="Rest" placeholder="Placeholder, quiet" hint="Nothing leaves this device." />
        <TextField label="Focus (forced)" data-state="focus" defaultValue="Faithful in little" />
        <TextField label="With icon" icon="search" placeholder="Search the Word" type="search" />
        <TextField label="Disabled" disabled defaultValue="Locked" />
        <TextField label="Journal" multiline rows={2} maxRows={6} maxLength={280} value={note} onChange={setNote} placeholder="Your own words gather here…" hint="Saved on this device." />
        <div className="pg-row" style={{ gap: 24 }}>
          <Cell cap="sm"><Spinner size={16} label="Loading" /></Cell>
          <Cell cap="md"><Spinner label="Loading" /></Cell>
          <Cell cap="lg tele"><Spinner size={40} label="Loading" /></Cell>
          <Cell cap="ignite"><Spinner size={32} label="Loading" style={{ color: 'var(--ignite-2)' }} /></Cell>
        </div>
      </div>
    </Sec>
  )
}

const ANSWERS = ['Be faithful over a little', 'Wait until you have more', 'Keep it to yourself', 'Hand it back unopened']

function InSitu() {
  const [pick, setPick] = useState(null)
  const [checked, setChecked] = useState(false)
  const right = pick === 0
  const reset = () => { setPick(null); setChecked(false) }
  return (
    <Sec id="sec-situ" n="19" title="In situ" note="bar · plates · HUD" wide>
      <div className="pg-grid">
        <div className="pg-stack">
          <Label mono>launch bar — on the sky</Label>
          <div className="pg-stage">
            <Panel tone="glass" cut pad="md" className="pg-bar">
              <div className="pg-bar-top"><Label mono tone="tele">Day 12 · Stage 2</Label><Tag tone="go">Cleared</Tag></div>
              <div className="pg-bar-title">The Ownership Covenant</div>
              <div className="pg-bar-meta"><Label mono>~6 min</Label><Label mono tone="ignite">+40 XP</Label></div>
              <Button full size="lg" pulse icon="rocket" silent>Launch</Button>
            </Panel>
          </div>
          <Label mono>HUD</Label>
          <Panel tone="glass" pad="sm" className="pg-hud">
            <Stat size="sm" label="Streak" value="12" icon="flame" tone="ignite" />
            <Stat size="sm" label="XP" value="1,240" icon="bolt" tone="tele" />
            <Stat size="sm" label="Shields" value="2" icon="shield" tone="gold" />
            <IconButton icon="settings" label="Settings" size="sm" silent />
          </Panel>
          <SegmentBar total={9} done={4} />
        </div>
        <div className="pg-stack">
          <Label mono>answer plates — pick one, then check</Label>
          <div className="pg-stack" style={{ gap: 12 }} role="group" aria-label="Answers">
            {ANSWERS.map((a, i) => {
              const tone = checked ? (i === 0 ? 'go' : pick === i ? 'nogo' : 'plate') : pick === i ? 'tele' : 'raised'
              return (
                <Panel key={a} as="button" cut tone={tone} pad="md" className="pg-plate" disabled={checked} silent onClick={() => setPick(i)} aria-pressed={pick === i}>
                  <Kbd lit={pick === i}>{i + 1}</Kbd><span>{a}</span>
                </Panel>
              )
            })}
          </div>
          <div className="pg-verdict" aria-live="polite">
            {checked ? <Tag tone={right ? 'go' : 'nogo'} icon={right ? 'check' : 'close'}>{right ? 'Go · correct' : 'No-go · not yet'}</Tag> : <Label mono>{pick == null ? 'choose an answer' : 'ready to check'}</Label>}
          </div>
          {checked ? <Button full variant={right ? 'go' : 'primary'} iconRight="arrowRight" silent onClick={reset}>Continue</Button> : <Button full disabled={pick == null} silent onClick={() => setChecked(true)}>Check</Button>}
        </div>
      </div>
    </Sec>
  )
}

function Page() {
  const [fx, setFx] = useState(FX)
  useEffect(() => { document.documentElement.dataset.fx = fx }, [fx])
  return (
    <div className="pg">
      <header className="pg-head">
        <Label mono tone="ignite">KIND v7 · Ascent · ui-core</Label>
        <h1 className="pg-title">Specimen <b>sheet</b></h1>
        <p className="pg-meta">18 primitives · every state · tokens only · then in situ</p>
        <Segmented size="sm" full={false} style={{ alignSelf: 'flex-start' }} label="Effects level" value={fx} onChange={setFx} silent options={[{ id: 'full', label: 'FX full' }, { id: 'lite', label: 'FX lite' }]} />
      </header>
      <div className="pg-grid">
        <Buttons />
        <IconButtons />
        <Chips />
        <Panels />
        <Rows />
        <Controls />
        <Meters />
        <Misc />
        <Fields />
        <InSitu />
      </div>
    </div>
  )
}

mount(<Page />, { fx: FX })
