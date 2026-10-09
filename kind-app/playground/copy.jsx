// copy specimen — the app's voice, read in the components it will actually live in.
//   http://localhost:5183/playground/copy.html           ?seed=anything to pin the variants · the Reroll button walks them
// Every string below comes out of src/copy.js. Nothing is typed here except layout and the mock contexts.
import { useMemo, useState } from 'react'
import { mount } from './_boot.jsx'
import { Button, Chip, Empty, Label, Panel, Segmented, Tag } from '../src/ui/core.js'
import { ToastHost, toast } from '../src/ui/overlay.js'
import { Icon } from '../src/icons.jsx'
import library from '../src/content/library.json'
import * as c from '../src/copy.js'

const STEW = library.series['stewardship-code']
const LON = library.series['secrets-of-longevity']
const Q = new URLSearchParams(location.search)
const FX = Q.get('fx') === 'lite' ? 'lite' : 'full'

const Sec = ({ id, n, title, note, wide, children }) => (
  <section className={'pg-sec' + (wide ? ' pg-wide' : '')} id={id}>
    <h2><span>{title}</span><small>{n}{note ? ` · ${note}` : ''}</small></h2>
    {children}
  </section>
)
const Cell = ({ cap, children }) => <div className="pg-cell">{children}<span className="pg-cap">{cap}</span></div>
const Line = ({ l, cls = 'pc-line' }) => (l.ref ? <blockquote className="pc-word">{l.text}<cite>{l.ref}</cite></blockquote> : <p className={cls}>{l.text}</p>)

/* ── the Launch Bar ───────────────────────────────────────────────────── */
const BAR_VARIANT = { ignite: 'primary', tele: 'secondary', go: 'go', warn: 'primary' }
function Slab({ o }) {
  return (
    <div className="pc-slab" data-tone={o.tone} role="group" aria-label={o.aria}>
      <div className="pc-slab__top">
        <Label mono size="sm">{o.eyebrow}</Label>
        {o.meta ? <Label mono tone="tele" size="sm">{o.meta}</Label> : null}
      </div>
      <p className="pc-slab__title">{o.title}</p>
      {o.readout ? <p className="pc-readout">{o.readout}</p> : null}
      <p className="pc-slab__sub">{o.sub}</p>
      {o.note ? <p className="pc-note">{o.note}</p> : null}
      <Button full size="lg" variant={BAR_VARIANT[o.tone]} disabled={o.disabled} silent aria-label={o.ctaAria}>{o.cta}</Button>
    </div>
  )
}
const T = 'The Ownership Covenant'
const D = new Date(2026, 7, 13, 6, 0)
const BARS = (seed) => [
  ['ready · streak 8', { state: 'ready', day: 12, title: T, mins: 6, streak: 8, seed }],
  ['ready · parent', { state: 'ready', day: 12, title: T, mins: 6, role: 'parent', seed }],
  ['in progress', { state: 'progress', day: 12, title: T, mins: 6, step: 3, steps: 8, seed }],
  ['done · countdown to 06:00', { state: 'done', day: 12, title: T, countdown: 8049e3, unlockAt: D, zone: 'WAT', seed }],
  ['done · under an hour', { state: 'done', day: 12, title: T, countdown: 1500e3, unlockAt: D, seed }],
  ['locked · before 06:00', { state: 'locked', day: 12, title: T, mins: 6, countdown: 3 * 3600e3, unlockAt: new Date(2026, 7, 12, 6), zone: 'WAT', seed }],
  ['archive', { state: 'archive', day: 9, title: 'Know what you have', mins: 6, done: 8, total: 31, seed }],
  ['missed · shield held it', { state: 'missed', day: 13, title: 'Plan before you spend', mins: 6, streak: 12, shieldUsed: true, seed }],
  ['missed · streak ended', { state: 'missed', day: 13, title: 'Plan before you spend', mins: 6, streak: 0, seed }],
  ['9 pm · streak at risk', { state: 'atRisk', day: 12, title: T, streak: 6, hoursLeft: 3, countdown: 10800e3, mins: 6, seed }],
  ['first ever', { state: 'first', day: 1, title: 'Crack the Stewardship Code', mins: 7, seed }],
  ['Selah', { state: 'selah', day: 9, title: 'Week 1 recap', mins: 4, seed }],
  ['final launch', { state: 'ready', day: 31, title: 'The Faithful Steward', mins: 7, kind: 'celebration', seed }],
  ['upcoming mission', { state: 'upcoming', seriesTitle: 'The Stewardship Code', unlockAt: new Date(2026, 7, 1, 6), countdown: 86400e3, seed }],
  ['month complete', { state: 'complete', seriesTitle: 'The Stewardship Code', seed }],
].map(([cap, ctx]) => [cap, c.launchBarCopy(ctx)])

/* ── Go / No-Go ───────────────────────────────────────────────────────── */
function Verdict({ v, ex }) {
  return (
    <div className="pc-verdict" data-tone={v.tone} role={v.tone === 'nogo' ? 'alert' : 'status'} aria-label={v.aria}>
      <div className="pc-verdict__bar"><i className="pc-led" /><Label mono tone={v.tone === 'go' ? 'go' : 'nogo'}>{v.status}</Label></div>
      <p className="pc-verdict__head">{v.head}</p>
      <Line l={v} />
      {v.tone === 'nogo' ? <><Label mono>{c.answerLabel(ex)}</Label><p className="pc-answer">The Owner</p></> : null}
      {v.note ? <p className="pc-note">{v.note}</p> : null}
      <Button full variant={v.tone === 'go' ? 'go' : 'secondary'} silent>{v.cta}</Button>
    </div>
  )
}

/* ── moments ──────────────────────────────────────────────────────────── */
function Moment({ eyebrow, title, text, word, extra, cta }) {
  return (
    <div className="pc-moment">
      <Label mono tone="ignite">{eyebrow}</Label>
      <p className="pc-moment__hero">{title}</p>
      {text ? (typeof text === 'string' ? <p className="pc-moment__text">{text}</p> : <Line l={text} cls="pc-moment__text" />) : null}
      {word ? <Line l={word} /> : null}
      {extra ? <p className="pc-note">{extra}</p> : null}
      <Button variant="secondary" size="md" silent>{cta || 'Continue'}</Button>
    </div>
  )
}

/* ── onboarding frames ────────────────────────────────────────────────── */
const Ticks = ({ i }) => <div className="pc-ticks" aria-label={c.onboardCopy.progress(i)}>{[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= i ? 'on' : ''} />)}</div>
function Beats() {
  const o = c.onboardCopy
  return (
    <div className="pg-cells">
      <Cell cap="beat 1 · pad at dusk">
        <div className="pc-phone"><Ticks i={1} /><Label mono tone="ignite">{o.pad.eyebrow}</Label><h3 className="pc-keep-case">{o.pad.title}</h3><p>{o.pad.body}</p><div className="pc-grow" /><Button full size="lg" silent>{o.pad.cta}</Button><p className="pc-note">{o.pad.foot}</p></div>
      </Cell>
      <Cell cap="beat 2 · crew">
        <div className="pc-phone"><Ticks i={2} /><Label mono>{o.crew.eyebrow}</Label><h3>{o.crew.title}</h3><p>{o.crew.body}</p>
          <div className="pc-opt"><b>{o.crew.teen.title}</b><span>{o.crew.teen.sub}</span></div><div className="pc-opt"><b>{o.crew.parent.title}</b><span>{o.crew.parent.sub}</span></div><div className="pc-grow" /></div>
      </Cell>
      <Cell cap="beat 3 · name">
        <div className="pc-phone"><Ticks i={3} /><Label mono>{o.name.eyebrow}</Label><h3>{o.name.title}</h3>
          <div className="pc-opt"><span>{o.name.placeholder}</span></div><p className="pc-note">{o.name.help}</p><div className="pc-grow" /><Button full size="lg" disabled silent>{o.name.cta}</Button><p className="pc-note">{o.name.error}</p></div>
      </Cell>
      <Cell cap="beat 4 · daily commitment">
        <div className="pc-phone"><Ticks i={4} /><Label mono>{o.goal.eyebrow}</Label><h3>{o.goal.title}</h3><p>{o.goal.body}</p>
          {c.GOALS.map((g) => <div className="pc-opt" key={g.id} data-rec={g.id === o.goal.recommended ? '' : undefined}><b>{g.label} <span>{c.goalCopy(g.xp).meta}</span> {g.id === o.goal.recommended ? <Tag tone="ignite" led={false}>{o.goal.tag}</Tag> : null}</b><span>{g.blurb}</span></div>)}
          <div className="pc-grow" /><p className="pc-note">{o.goal.foot}</p></div>
      </Cell>
      <Cell cap="beat 5 · reminder">
        <div className="pc-phone"><Ticks i={5} /><Label mono>{o.remind.eyebrow}</Label><h3>{o.remind.title}</h3><p>{o.remind.body}</p>
          <div className="pg-chiprow">{c.reminderPresets.map((p) => <Chip key={p.id} selected={p.id === 'evening'}>{p.label} · {c.fmtClock(p.hour, p.min)}</Chip>)}</div>
          <div className="pc-grow" /><Button full size="lg" icon="calendar" silent>{o.remind.add}</Button><Button full variant="ghost" silent>{o.remind.skip}</Button><p className="pc-note">{o.remind.foot}</p></div>
      </Cell>
      <Cell cap="finish">
        <div className="pc-phone"><Ticks i={5} /><Label mono tone="ignite">{c.lessonCopy.phases.ignition}</Label><h3>{o.finish.launching(1)}</h3><div className="pc-grow" /><Button full size="lg" icon="rocket" silent>{o.finish.cta}</Button></div>
      </Cell>
    </div>
  )
}

function Specimen() {
  const [bump, setBump] = useState(0)
  const [seedText, setSeedText] = useState(Q.get('seed') || 'ada')
  const seed = `${seedText}:${bump}`
  const [role, setRole] = useState('teen')
  const bars = useMemo(() => BARS(seed), [seed])
  const pool = c.POOLS
  const countPools = useMemo(() => { let n = 0, v = 0; const walk = (x) => { if (Array.isArray(x)) { if (x.length && x.every((e) => typeof e === 'string' || (e && typeof e.text === 'string'))) { n++; v += x.length } else x.forEach(walk) } else if (x && typeof x === 'object' && !(x.text && x.ref)) Object.values(x).forEach(walk) }; walk(pool); return { n, v } }, [pool])
  const sx = (k) => c.seq(`${seedText}:${bump}:${k}`, 0)

  const ex = [{ type: 'choice', source: 'scripture' }, { type: 'blank', source: 'declaration' }, { type: 'order', source: 'truth' }, { type: 'match', source: 'week' }, { type: 'tf', source: 'point' }, { type: 'choice', source: 'code' }]
  const rights = ex.map((e, i) => c.verdictRight(e, i % 2 ? LON : STEW, c.seq(`${seedText}:${bump}:lesson`, i), { combo: [0, 0, 3, 0, 5, 8][i] }))
  const wrongs = [0, 1, 2, 3].map((i) => c.verdictWrong(ex[i], c.seq(`${seedText}:${bump}:w`, i), { recycled: i === 3 }))
  const total = Object.keys(c.WORD).length

  return (
    <div className="pg">
      <header className="pg-head">
        <h1 className="pg-title">KIND <b>voice</b></h1>
        <p className="pg-meta">copy.js · {countPools.n} variant pools · {countPools.v} variants · {total} KJV quotations · seed {seed}</p>
      </header>
      <div className="pg-bar">
        <input className="pg-seed" value={seedText} onChange={(e) => setSeedText(e.target.value)} aria-label="Seed" />
        <Button size="md" variant="secondary" icon="refresh" silent onClick={() => setBump((b) => b + 1)}>Reroll</Button>
        <Segmented size="sm" full={false} value={role} onChange={setRole} options={[{ id: 'teen', label: 'Teen' }, { id: 'parent', label: 'Parent' }]} label="Role" />
        <span className="pg-cap">same seed, same words. A re-render never changes a line.</span>
      </div>

      <div className="pg-grid">
        <Sec id="bar" n="01" title="Launch bar" note="11 states" wide>
          <div className="pg-cells">{bars.map(([cap, o]) => <Cell key={cap} cap={cap}><Slab o={role === 'parent' && o.state === 'ready' ? c.launchBarCopy({ state: 'ready', day: 12, title: T, mins: 6, role: 'parent', seed }) : o} /></Cell>)}</div>
        </Sec>

        <Sec id="verdict" n="02" title="Go / No-Go" note="six right, four not yet" wide>
          <div className="pg-cells">
            {rights.map((v, i) => <Cell key={i} cap={`right · ${ex[i].type}/${ex[i].source}${[0, 0, 3, 0, 5, 8][i] ? ' · combo ' + [0, 0, 3, 0, 5, 8][i] : ''}`}><Verdict v={v} ex={ex[i]} /></Cell>)}
            {wrongs.map((v, i) => <Cell key={i} cap={`not yet · ${ex[i].type}${i === 3 ? ' · second showing' : ''}`}><Verdict v={v} ex={ex[i]} /></Cell>)}
          </div>
        </Sec>

        <Sec id="moments" n="03" title="Moments" note="streak · rank · orbit · drop" wide>
          <div className="pg-cells">
            {[3, 7, 21, 31, 365].map((n) => { const m = c.milestoneCopy(n, { shield: n % 7 === 0, xp: 30, seed }); return <Cell key={n} cap={`milestone ${n}`}><Moment eyebrow={m.eyebrow} title={m.title} text={m.text} word={m.word} extra={[m.bonus, m.reward].filter(Boolean).join(' · ')} cta={m.cta} /></Cell> })}
            {['seeker', 'steward', 'keeper', 'pioneer'].map((id, i) => { const m = c.rankUpCopy({ id, index: [0, 1, 3, 6][i], name: id[0].toUpperCase() + id.slice(1) }, seed); return <Cell key={id} cap={`rank-up · ${id}`}><Moment eyebrow={m.eyebrow} title={m.title} text={m.text} word={m.word} cta={m.cta} /></Cell> })}
            {[['first lesson', { first: true }], ['perfect', { perfect: true }], ['after misses', { recovered: true }], ['parent leading', { role: 'parent' }], ['practice', { again: true }], ['Selah', { kind: 'selah' }]].map(([cap, f]) => { const m = c.completionCopy({ ...f, day: 12, series: STEW, seed, name: 'Tobi' }); return <Cell key={cap} cap={`completion · ${cap}`}><Moment eyebrow={m.eyebrow} title={m.title} text={m.text} cta={m.cta} /></Cell> })}
            {[[1, STEW], [3, STEW], [2, LON], [4, LON]].map(([n, sr]) => { const m = c.stageClearCopy({ n, title: sr.weeks[n - 1]?.title }, sr, seed); return <Cell key={sr.id + n} cap={`stage clear · ${sr.id.split('-')[0]} ${n}`}><Moment eyebrow={m.eyebrow} title={m.title} text={m.text} word={m.word} extra={m.stageTitle} cta={m.cta} /></Cell> })}
            {(() => { const m = c.nextUpCopy({ day: 13, title: 'Plan before you spend', unlockAt: new Date(2026, 7, 13, 6), now: new Date(2026, 7, 12, 19), zone: 'WAT' }, seed); return <Cell cap="next up (end of a day)"><div className="pc-slab"><Label mono>{m.eyebrow}</Label><p className="pc-slab__title">{m.title}</p><p className="pc-slab__sub">{m.sub}</p><p className="pc-note">{m.when}</p></div></Cell> })()}
            {(() => { const m = c.monthCompleteCopy(STEW, { days: 31, seed }); return <Cell cap="month complete"><Moment eyebrow={m.eyebrow} title={m.title} text={m.text} word={m.word} extra={m.declaration.join(' ')} cta={m.cta} /></Cell> })()}
            {[{ kind: 'xp', amount: 25 }, { kind: 'shield' }, { kind: 'fragment' }].map((d) => { const m = c.dropCopy(d, seed); return <Cell key={d.kind} cap={`supply drop · ${d.kind}`}><Moment eyebrow={m.eyebrow} title={m.title} text={m.text} cta="Collect" /></Cell> })}
          </div>
        </Sec>

        <Sec id="streak" n="04" title="Streak, shields, ledger">
          <table className="pc-table"><thead><tr><th>Day</th><th>Line</th></tr></thead><tbody>
            {[0, 1, 2, 3, 5, 7, 10, 14, 18, 21, 26, 31, 45].map((n) => <tr key={n}><td>{n}</td><td>{c.streakLine(n, seed)}</td></tr>)}
          </tbody></table>
          <table className="pc-table"><thead><tr><th>Shield</th><th>Line</th></tr></thead><tbody>
            {['used', 'earned', 'drop', 'overflow', 'max', 'low', 'none', 'cover', 'next'].map((k) => <tr key={k}><td>{k}</td><td>{c.shieldLine(k, { n: 12 }, seed)}</td></tr>)}
          </tbody></table>
          <table className="pc-table"><thead><tr><th>Status</th><th>Line</th></tr></thead><tbody>
            {['none', 'done', 'rest', 'at-risk', 'lost'].map((s) => { const r = c.streakStatus({ state: s, count: 8, hoursLeft: 4, lostFrom: 12, next: { at: 14, daysTo: 6, xp: 50 } }, seed); return <tr key={s}><td>{s}</td><td><b>{r.title}.</b> {r.sub} {r.note}</td></tr> })}
          </tbody></table>
          <table className="pc-table"><thead><tr><th>XP ledger</th><th /></tr></thead><tbody>
            {c.ledgerCopy({ lesson: 30, lines: [{ id: 'complete', xp: 20 }, { id: 'rare', xp: 20 }, { id: 'perfect', xp: 15 }, { id: 'milestone', xp: 30 }], drop: 25, total: 140 }).map((r) => <tr key={r.id}><td>{r.label}</td><td>{r.value}</td></tr>)}
          </tbody></table>
        </Sec>

        <Sec id="greet" n="05" title="Greetings" note="hour × weekday">
          <table className="pc-table"><thead><tr><th>Hour</th><th>Ada</th><th>No name · Monday</th></tr></thead><tbody>
            {[3, 7, 13, 18, 22].map((h) => <tr key={h}><td>{c.fmtClock(h, 0)}</td><td>{c.greeting('Ada', h, seed)}</td><td>{c.greeting('', h, seed + 'm', { weekday: 1 })}</td></tr>)}
          </tbody></table>
          <table className="pc-table"><thead><tr><th>Calendar</th><th>Line</th></tr></thead><tbody>
            {[['1 Jan', [2026, 0, 1], ''], ['27 May', [2026, 4, 27], ''], ['1 Oct · WAT', [2026, 9, 1], 'WAT'], ['25 Dec', [2026, 11, 25], ''], ['Good Friday', [2026, 3, 3], ''], ['Easter', [2026, 3, 5], '']].map(([n, [y, m, d], z]) => <tr key={n}><td>{n}</td><td>{[0, 1, 2, 3, 4, 5].map((i) => c.greeting('Ada', 8, seed + i, { date: new Date(y, m, d), zone: z })).filter((x, i, a) => a.indexOf(x) === i).slice(0, 2).join('  ·  ')}</td></tr>)}
          </tbody></table>
          <table className="pc-table"><thead><tr><th>Weekday</th><th>Line</th></tr></thead><tbody>
            {[['Sun', 0], ['Mon', 1], ['Fri', 5], ['Sat', 6]].map(([n, w]) => <tr key={n}><td>{n}</td><td>{[0, 1, 2, 3, 4, 5].map((i) => c.greeting('Ada', 8, seed + i, { weekday: w })).filter((x, i, a) => a.indexOf(x) === i).slice(0, 2).join('  ·  ')}</td></tr>)}
          </tbody></table>
        </Sec>

        <Sec id="onboard" n="06" title="Pre-flight" note="five beats" wide><Beats /></Sec>

        <Sec id="share" n="07" title="Share captions" note="what people post" wide>
          <div className="pg-cells">
            {[
              ['verse', { verse: { text: STEW.themeScripture.text, ref: 'Luke 16:10' }, day: 12, series: STEW, url: 'https://kidsinspiringnation.org/app' }],
              ['gold card', { code: { no: 7, line: 'Everything belongs to God, and everything in our hands must be managed as a sacred trust.', rare: true }, total: 26, day: 8, series: STEW }],
              ['streak', { n: 12, url: 'https://kidsinspiringnation.org/app' }],
              ['month', { series: STEW, days: 31, declaration: 'Christ my Master — money my servant.', url: 'https://kidsinspiringnation.org/app' }],
              ['rank', { rank: 'Steward', url: 'https://kidsinspiringnation.org/app' }],
              ['invite', { url: 'https://kidsinspiringnation.org/app' }],
            ].map(([cap, d]) => { const kind = cap === 'gold card' ? 'card' : cap; const s = c.shareCaption(kind, d, seed); return <Cell key={cap} cap={`${cap} · ${s.title}`}><div className="pc-bubble">{s.full}</div><span className="pc-alt">alt: {s.alt}</span></Cell> })}
          </div>
        </Sec>

        <Sec id="toast" n="08" title="Toasts" note="tap to fire the real thing">
          <div className="pg-chiprow">
            {c.toastIds().map((id) => <Chip key={id} onClick={() => { const t = c.toastCopy(id, { amount: 40, goal: 40, ring: 'Lesson', no: 7, stage: 2, name: 'Ada', rank: 'Steward', title: 'Faithful in little', day: 14, unlockAt: new Date(2026, 7, 14, 6), zone: 'WAT', hour: 20, min: 0, reward: { xp: 150, shield: 1 }, xp: 25 }, seed); toast({ ...t, action: t.action ? { ...t.action, onClick: () => {} } : undefined }) }}>{id}</Chip>)}
          </div>
        </Sec>

        <Sec id="empty" n="09" title="Empty states & errors" wide>
          <div className="pg-cells">
            {['journal', 'cards', 'patches', 'medals', 'kids', 'heatmap', 'shortsOffline', 'allClear'].map((k) => { const e = c.emptyCopy(k, seed); return <Cell key={k} cap={k}><Empty art={e.art} title={e.title} body={e.body} action={e.action ? <Button size="md" silent>{e.action}</Button> : null} /></Cell> })}
            {['offline', 'storage', 'video', 'share'].map((k) => { const e = c.errorCopy(k, seed); return <Cell key={k} cap={`error · ${k}`}><Empty art={e.icon} title={e.title} body={e.body} action={e.action ? <Button size="md" variant="secondary" silent>{e.action}</Button> : null} /></Cell> })}
          </div>
        </Sec>

        <Sec id="install" n="10" title="Install guide">
          {['ios', 'android', 'inapp'].map((p) => { const i = c.installCopy(p, seed); return (
            <Panel key={p} tone="raised" padded><div className="pg-stack"><Label mono>{p}</Label><b>{i.title}</b><span className="pg-cap" style={{ textTransform: 'none' }}>{i.body}</span>
              <ol className="pc-steps">{i.steps.map((s, k) => <li key={k}><span>{s.text}</span></li>)}</ol>{i.note ? <p className="pc-note">{i.note}</p> : null}<Button full variant="secondary" silent>{i.cta}</Button></div></Panel>) })}
        </Sec>

        <Sec id="settings" n="11" title="Settings help & glossary">
          <table className="pc-table"><tbody>
            {['sound', 'volume', 'haptics', 'effects', 'textSize', 'reminder', 'goal', 'install', 'privacy', 'reset'].map((k) => { const h = c.settingsHelp[k]; return <tr key={k}><td><b>{h.label || h.line}</b></td><td>{h.help || h.detail}{h.warn ? ' ' + h.warn : ''}</td></tr> })}
          </tbody></table>
          <dl className="pc-gloss">{c.glossary.map((g) => <div key={g.id}><dt>{g.term}</dt><dd>{g.plain}</dd></div>)}</dl>
        </Sec>

        <Sec id="coach" n="12" title="Coach marks & small labels" wide>
          <div className="pg-cells">
            {Object.entries(c.coach).map(([k, v]) => <Cell key={k} cap={`coach · ${k}`}><div className="pc-slab"><p className="pc-slab__title" style={{ fontSize: 'var(--fs-lg)' }}>{v.title}</p><p className="pc-slab__sub">{v.body}</p></div></Cell>)}
            <Cell cap="rotate (landscape)"><div className="pc-slab"><p className="pc-slab__title" style={{ fontSize: 'var(--fs-lg)' }}>{c.labels.rotate.title}</p><p className="pc-slab__sub">{c.labels.rotate.body}</p></div></Cell>
            <Cell cap="mission meta"><div className="pc-slab"><p className="pc-slab__sub">{c.missionMeta({ month: 'August', year: 2026, audience: 'Teens & families', done: 8, total: 31 })}</p><p className="pc-note">{c.rankLine({ name: 'Steward', next: { name: 'Builder' }, toNext: 1240 })}</p></div></Cell>
          </div>
        </Sec>

        <Sec id="aria" n="13" title="Accessible names" note="what a screen reader says" wide>
          <table className="pc-table"><tbody>
            {[
              ['day · today', c.aria.day({ day: 12, title: T, state: 'today' })], ['day · locked', c.aria.day({ day: 14, title: 'Two masters', state: 'locked', date: new Date(2026, 7, 14) })],
              ['stage', c.aria.stage({ n: 2, title: 'The Faithfulness Code', pct: 40 })], ['streak', c.aria.streak(12)], ['shields', c.aria.shields(1)],
              ['ring · xp', c.aria.ring({ id: 'xp', now: 24, goal: 40 })], ['countdown', c.aria.countdown(8049e3)], ['rank', c.aria.rank({ name: 'Steward', index: 1, pct: 42 })],
              ['launch bar · waiting', bars[3][1].aria], ['launch bar · at risk', bars[9][1].aria], ['verdict', rights[0].aria],
            ].map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
          </tbody></table>
        </Sec>
      </div>
      <ToastHost />
    </div>
  )
}

mount(<Specimen />, { fx: FX })
