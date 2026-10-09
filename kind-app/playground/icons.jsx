// Specimen sheet + audit bench for src/icons.jsx.
//   /playground/icons.html                           full sheet (responsive: 2-up cards on phones)
//   /playground/icons.html?only=flame,bolt&size=192  inspector: big, with keylines (&grid=0 to hide, &weights=line,solid)
//   /playground/icons.html?strip=a,b,c&weight=line   rows at real sizes 16/20/24/32 (no labels) for 1:1 legibility checks
//   /playground/icons.html?audit=1                   automated audit: contract coverage, edge clipping, centring, optical mass, solid≠line
//                                                    (results also land on window.__iconAudit for scripts)
//   /playground/icons.html?fx=lite                   lite mode (icons have no motion either way; kept for parity)
import { useEffect, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { mount } from './_boot.jsx'
import { Icon, ICON_NAMES, ICON_GROUPS } from '../src/icons.jsx'

const q = new URLSearchParams(location.search)
const WEIGHTS = ['line', 'duo', 'solid']
const SIZES = [16, 20, 24, 32]
const NARROW = typeof matchMedia === 'function' && matchMedia('(max-width: 480px)').matches
// Where a glyph earns its colour in the product (information colour, never decoration).
const TONE = {
  flame: 'var(--ignite-2)', bolt: 'var(--tele)', shield: 'var(--tele)', chest: 'var(--gold-2)', rocket: 'var(--ink)', star: 'var(--gold-2)',
  trophy: 'var(--gold-2)', medal: 'var(--gold-2)', crown: 'var(--gold-2)', heart: 'var(--nogo)', check: 'var(--go)', checkCircle: 'var(--go)',
  gauge: 'var(--tele)', signal: 'var(--tele)', radar: 'var(--tele)', countdown: 'var(--ignite-2)', thruster: 'var(--ignite-2)', warning: 'var(--warn)',
}

const css = `
.ip{min-height:100vh;background:var(--carbon-0);color:var(--ink);font-family:var(--font-ui);padding:var(--s-6) var(--gutter) var(--s-16)}
.ip *{box-sizing:border-box}
.ip-top{display:flex;flex-wrap:wrap;align-items:baseline;gap:var(--s-3) var(--s-6);padding-bottom:var(--s-4);border-bottom:1px solid var(--line)}
.ip-h{font-family:var(--font-display);font-weight:700;font-size:var(--fs-2xl);letter-spacing:var(--track-label);text-transform:uppercase;margin:0}
.ip-mono{font-family:var(--font-mono);font-size:var(--fs-2xs);letter-spacing:var(--track-mono);color:var(--ink-3);text-transform:uppercase}
.ip-sec{margin-top:var(--s-10)}
.ip-sec>.ip-mono{display:flex;gap:var(--s-3);align-items:center;margin-bottom:var(--s-4)}
.ip-sec>.ip-mono::after{content:'';flex:1;height:1px;background:var(--line)}
.ip-row{display:flex;flex-wrap:wrap;gap:var(--s-3)}
.ip-grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:var(--s-3)}
.ip-heroes{display:grid;grid-template-columns:repeat(auto-fill,minmax(236px,1fr));gap:var(--s-3)}
.ip-hero{display:flex;flex-direction:column;align-items:center;gap:var(--s-3);padding:var(--s-4) var(--s-3);background:var(--plate);border-radius:var(--r-md);box-shadow:var(--bevel),var(--shadow-1)}
.ip-hero .ip-set{display:flex;gap:var(--s-2)}
.ip-hero .ip-cell{display:grid;place-items:center;width:68px;height:68px}
.ip-card{background:var(--plate);border-radius:var(--r-sm);box-shadow:var(--bevel);padding:var(--s-3)}
.ip-card h4{margin:0 0 var(--s-2);font-family:var(--font-mono);font-weight:500;font-size:var(--fs-xs);color:var(--ink-2);letter-spacing:var(--track-mono)}
.ip-card .ip-line{display:flex;align-items:center;justify-content:space-between;gap:var(--s-2);height:36px}
.ip-card .ip-line>span{width:28px;font-family:var(--font-mono);font-size:var(--fs-2xs);color:var(--ink-4);text-transform:uppercase}
.ip-card .ip-line>i{display:grid;place-items:center;font-style:normal;flex:1}
.ip-dock{display:flex;gap:var(--s-1);padding:var(--s-2);width:100%;max-width:480px;background:var(--carbon-1);border:1px solid var(--line-2);border-radius:var(--r-lg);box-shadow:var(--bevel),var(--shadow-2)}
.ip-tab{all:unset;cursor:pointer;display:flex;flex:1 1 0;min-width:0;flex-direction:column;align-items:center;justify-content:center;gap:var(--s-1);height:var(--dock-h);border-radius:var(--r-md);color:var(--ink-3);transition:color var(--t-fast) var(--ease-out)}
.ip-tab:focus-visible{outline:2px solid var(--tele);outline-offset:2px}
.ip-tab[aria-selected=true]{color:var(--ignite-2);background:var(--ignite-wash)}
.ip-tab span{font-family:var(--font-display);font-weight:600;font-size:var(--fs-2xs);letter-spacing:var(--track-label);text-transform:uppercase;white-space:nowrap}
.ip-ctx{display:flex;flex-wrap:wrap;gap:var(--s-3);align-items:center}
.ip-chip{display:inline-flex;align-items:center;gap:var(--s-2);height:36px;padding:0 var(--s-3);border-radius:var(--r-full);background:var(--carbon-2);box-shadow:var(--bevel);font-family:var(--font-mono);font-size:var(--fs-xs);color:var(--ink)}
.ip-btn{display:inline-flex;align-items:center;gap:var(--s-2);height:var(--tap);padding:0 var(--s-5);background:var(--ignite);color:var(--ink-on-ignite);font-family:var(--font-display);font-weight:700;letter-spacing:var(--track-label);text-transform:uppercase;clip-path:var(--clip-cut)}
.ip-insp{display:flex;flex-wrap:wrap;gap:var(--s-6);margin-top:var(--s-6)}
.ip-insp figure{margin:0;display:flex;flex-direction:column;gap:var(--s-2);align-items:flex-start}
.ip-stage{position:relative;background:var(--carbon-1);box-shadow:var(--bevel);border-radius:var(--r-xs)}
.ip-stage>svg.k-icon,.ip-stage>.ip-grid{position:absolute;inset:0}
.ip-grid{pointer-events:none;color:var(--tele)}
.ip-px{display:flex;flex-direction:column;gap:var(--s-2);background:var(--carbon-1);box-shadow:var(--bevel);border-radius:var(--r-sm);padding:var(--s-3);overflow-x:auto;max-width:100%;width:fit-content}
.ip-pxrow{display:flex;align-items:center;gap:var(--s-3);flex:none}
.ip-pxrow>span{width:64px;flex:none;font-family:var(--font-mono);font-size:var(--fs-2xs);color:var(--ink-4);text-transform:uppercase}
.ip-pxrow>i{display:grid;place-items:center;width:28px;flex:none;font-style:normal}
.ip-aud table{border-collapse:collapse;width:100%;font-family:var(--font-mono);font-size:var(--fs-xs)}
.ip-aud th,.ip-aud td{text-align:left;padding:var(--s-1) var(--s-2);border-bottom:1px solid var(--line)}
.ip-aud th{color:var(--ink-3);font-weight:500;text-transform:uppercase;letter-spacing:var(--track-mono)}
.ip-aud .bad{color:var(--nogo)}.ip-aud .warn{color:var(--warn)}.ip-aud .ok{color:var(--go)}
@media (max-width:480px){
  .ip{padding:var(--s-5) var(--s-4) var(--s-12)}
  .ip-grid-cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s-2)}
  .ip-card{padding:var(--s-2) var(--s-2) var(--s-1)}
  .ip-card .ip-line{height:34px;gap:var(--s-1)}
  .ip-card .ip-line>span{width:24px}
  .ip-heroes{grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s-2)}
  .ip-hero{padding:var(--s-3) var(--s-2)}
  .ip-hero .ip-cell{width:44px;height:44px}
  .ip-tab span{letter-spacing:var(--track-mono)}
}
`

// Keylines: 1u grid, live area (2..22), keyline circle/square, centre cross.
const Grid = ({ size }) => (
  <svg className="ip-grid" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    {Array.from({ length: 23 }, (_, i) => i + 1).map((n) => (
      <g key={n} strokeOpacity={n % 4 === 0 ? 0.2 : 0.07} strokeWidth=".4">
        <path d={`M${n} 0V24M0 ${n}H24`} />
      </g>
    ))}
    <rect x="2" y="2" width="20" height="20" strokeOpacity=".5" strokeWidth=".4" strokeDasharray="1 1" />
    <circle cx="12" cy="12" r="10" strokeOpacity=".4" strokeWidth=".4" />
    <rect x="3" y="3" width="18" height="18" strokeOpacity=".28" strokeWidth=".4" />
    <path d="M12 0V24M0 12H24" strokeOpacity=".35" strokeWidth=".4" />
  </svg>
)

const Hero = ({ name, size = NARROW ? 40 : 64 }) => (
  <div className="ip-hero" style={{ color: TONE[name] || 'var(--ink)' }}>
    <div className="ip-set">{WEIGHTS.map((w) => <div className="ip-cell" key={w}><Icon name={name} size={size} weight={w} /></div>)}</div>
    <span className="ip-mono">{name}</span>
  </div>
)

const TABS = [['learn', 'Learn'], ['objectives', 'Objectives'], ['shorts', 'Shorts'], ['locker', 'Locker'], ['me', 'Me']]
function Dock({ initial = 0 }) {
  const [i, set] = useState(initial)
  return (
    <div className="ip-dock" role="tablist" aria-label="Tab bar specimen">
      {TABS.map(([n, label], k) => (
        <button key={n} className="ip-tab" role="tab" aria-selected={k === i} onClick={() => set(k)}>
          <Icon name={n} size={24} weight={k === i ? 'solid' : 'line'} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

const Card = ({ name }) => (
  <div className="ip-card" style={{ color: TONE[name] || 'var(--ink)' }}>
    <h4>{name}</h4>
    {WEIGHTS.map((w) => (
      <div className="ip-line" key={w}>
        <span>{w}</span>
        {SIZES.map((s) => <i key={s}><Icon name={name} size={s} weight={w} /></i>)}
      </div>
    ))}
  </div>
)

// 1:1 pixel check: the glyphs that carry the product, at the sizes they ship at. One unwrapped row per weight × size.
function PixelCheck({ names }) {
  return (
    <div className="ip-px">
      {['line', 'duo', 'solid'].flatMap((w) => [16, 20, 24].map((s) => (
        <div className="ip-pxrow" key={w + s}>
          <span>{w} {s}</span>
          {names.map((n) => <i key={n} style={{ color: TONE[n] || 'var(--ink)' }}><Icon name={n} size={s} weight={w} /></i>)}
        </div>
      )))}
    </div>
  )
}

function Inspector({ names, size, grid, weights }) {
  return (
    <div className="ip ip-inspector">
      <style>{css}</style>
      <div className="ip-insp">
        {names.map((n) => weights.map((w) => (
          <figure key={n + w} style={{ color: TONE[n] || 'var(--ink)' }}>
            <div className="ip-stage" style={{ width: size, height: size }}>
              {grid && <Grid size={size} />}
              <Icon name={n} size={size} weight={w} />
            </div>
            <span className="ip-mono">{n} · {w}</span>
          </figure>
        )))}
      </div>
    </div>
  )
}

function Strip({ names, weight }) {
  return (
    <div className="ip" style={{ padding: 'var(--s-4)', minHeight: 0 }}>
      <style>{css}</style>
      <div className="ip-strip" style={{ display: 'inline-flex', flexDirection: 'column', gap: 12, padding: 12, background: 'var(--carbon-1)' }}>
        {[16, 20, 24, 32].map((sz) => (
          <div key={sz} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {names.map((n) => <span key={n} style={{ color: TONE[n] || 'var(--ink)', display: 'grid', placeItems: 'center', width: 36, height: 36 }}><Icon name={n} size={sz} weight={weight} /></span>)}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────────────── audit ───────────────────────────────────
   Rasterises every glyph in every weight at 8 px per unit and measures it. Catches what eyes miss at 24 px:
   clipped glyphs, glyphs off-centre, glyphs that are too light/heavy for the family, a `solid` that is secretly the `line`,
   and any contract name that has no drawing. */
const CONTRACT = `learn objectives shorts locker me flame bolt shield chest rocket star trophy flag lock unlock check checkCircle close medal card patch target sparkle crown heart gift key
chevronRight chevronLeft chevronUp chevronDown arrowRight arrowLeft arrowUp plus minus more search filter info warning help refresh undo trash copy link external share download upload settings sliders
book verse quote pen journal mic headphones play pause video clock calendar bell bellOff hourglass textSize bookmark hint
soundOn soundOff vibrate moon wifiOff install phone globe mail user users home family youtube whatsapp telegram instagram gauge orbit satellite stage signal radar thruster countdown`.split(/\s+/)
const REQUIRED_SOLID = 'learn objectives shorts locker me flame bolt shield chest rocket star trophy heart check lock play bell bookmark medal target crown card patch gift key flag home user'.split(' ')
const MINIMAL = new Set(['minus', 'more', 'grip', 'signal', 'menu', 'plus', 'check', 'close'])   // a few strokes by nature: exempt from the ink-mass check
const PPU = 8                                                            // pixels per grid unit
const DIM = 24 * PPU

const raster = (name, weight) => new Promise((resolve) => {
  const svg = renderToStaticMarkup(<Icon name={name} size={DIM} weight={weight} />)
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/currentColor/g, '#fff')
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = c.height = DIM
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, DIM, DIM)
    const d = x.getImageData(0, 0, DIM, DIM).data
    let x0 = DIM, y0 = DIM, x1 = -1, y1 = -1, mass = 0, mx = 0, my = 0, edge = 0
    for (let j = 0; j < DIM; j++) for (let i = 0; i < DIM; i++) {
      const a = d[(j * DIM + i) * 4 + 3]
      if (a < 24) continue
      if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j
      mass += a / 255; mx += (a / 255) * i; my += (a / 255) * j
      if (i < 2 || j < 2 || i >= DIM - 2 || j >= DIM - 2) edge++
    }
    if (x1 < 0) return resolve({ empty: true, ink: 0 })
    resolve({
      ink: mass / (DIM * DIM), bbox: [x0 / PPU, y0 / PPU, (x1 + 1) / PPU, (y1 + 1) / PPU], edge,
      cx: mx / mass / PPU, cy: my / mass / PPU,
    })
  }
  img.onerror = () => resolve({ error: true, ink: 0 })
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
})

async function runAudit() {
  const rows = [], issues = []
  const flag = (sev, name, weight, msg) => issues.push({ sev, name, weight, msg })
  for (const n of CONTRACT) if (!ICON_NAMES.includes(n)) flag('bad', n, '-', 'contract name has no drawing')
  const grouped = new Set(Object.values(ICON_GROUPS).flat())
  for (const n of ICON_NAMES) if (!grouped.has(n)) flag('warn', n, '-', 'not listed in ICON_GROUPS (absent from the specimen sheet)')
  for (const n of grouped) if (!ICON_NAMES.includes(n)) flag('bad', n, '-', 'ICON_GROUPS lists a name with no drawing')
  const med = {}
  for (const n of ICON_NAMES) {
    const m = {}
    for (const w of WEIGHTS) m[w] = await raster(n, w)
    rows.push({ name: n, ...m })
  }
  for (const w of WEIGHTS) {
    const xs = rows.map((r) => r[w].ink).filter(Boolean).sort((a, b) => a - b)
    med[w] = xs[Math.floor(xs.length / 2)]
  }
  for (const r of rows) {
    for (const w of WEIGHTS) {
      const m = r[w]
      if (m.error) { flag('bad', r.name, w, 'svg failed to rasterise'); continue }
      if (m.empty || m.ink < 0.004) { flag('bad', r.name, w, 'renders empty'); continue }
      const [x0, y0, x1, y1] = m.bbox
      if (m.edge > 6) flag('bad', r.name, w, `touches the canvas edge (${m.edge}px) — clipped`)
      if (x0 < 1.2 || y0 < 1.2 || x1 > 22.8 || y1 > 22.8) flag('warn', r.name, w, `outside live area: ${x0.toFixed(1)},${y0.toFixed(1)} → ${x1.toFixed(1)},${y1.toFixed(1)}`)
      // Optical, not geometric: a play triangle's bbox is off-centre by design (its mass sits on the axis); an arrow's mass is
      // off-centre by design (its bbox sits on the axis). Flag only when *both* say the glyph has drifted.
      const bd = Math.max(Math.abs((x0 + x1) / 2 - 12), Math.abs((y0 + y1) / 2 - 12)), md = Math.max(Math.abs(m.cx - 12), Math.abs(m.cy - 12))
      if (bd > 1.0 && md > 1.0) flag('warn', r.name, w, `off-centre: bbox ${((x0 + x1) / 2).toFixed(1)},${((y0 + y1) / 2).toFixed(1)} · mass ${m.cx.toFixed(1)},${m.cy.toFixed(1)}`)
      if (w === 'line' && !MINIMAL.has(r.name)) {
        const k = m.ink / med.line
        if (k > 2.1) flag('warn', r.name, w, `heavy for the family (${k.toFixed(1)}× median ink)`)
        if (k < 0.3) flag('warn', r.name, w, `light for the family (${k.toFixed(1)}× median ink)`)
      }
    }
    if (REQUIRED_SOLID.includes(r.name)) {
      if (r.solid.ink - r.line.ink < 0.01) flag('bad', r.name, 'solid', 'solid is not heavier than line — no true solid drawing')
    }
    if (r.duo.ink - r.line.ink < 0.0005 && r.line.ink > 0) { /* stroke-only glyphs have no area to tint: expected */ }
  }
  const out = { count: ICON_NAMES.length, contract: CONTRACT.length, issues, rows: rows.map((r) => ({ name: r.name, line: +r.line.ink?.toFixed(4), duo: +r.duo.ink?.toFixed(4), solid: +r.solid.ink?.toFixed(4), bbox: r.line.bbox })), median: med }
  window.__iconAudit = out
  return out
}

function Audit() {
  const [res, setRes] = useState(null)
  useEffect(() => { runAudit().then(setRes) }, [])
  const bad = res?.issues.filter((i) => i.sev === 'bad').length ?? 0
  const warn = res?.issues.filter((i) => i.sev === 'warn').length ?? 0
  return (
    <div className="ip ip-aud">
      <style>{css}</style>
      <header className="ip-top">
        <h1 className="ip-h">Icon audit</h1>
        <span className="ip-mono" id="ip-audit-sum">
          {res ? `${res.count} glyphs · ${res.contract} contract names · ` : 'running…'}
          {res && <span className={bad ? 'bad' : 'ok'}>{bad} errors</span>}{res && ' · '}{res && <span className={warn ? 'warn' : 'ok'}>{warn} warnings</span>}
        </span>
      </header>
      {res && (
        <section className="ip-sec">
          <div className="ip-mono">Findings</div>
          <table>
            <thead><tr><th>sev</th><th>glyph</th><th>weight</th><th>finding</th></tr></thead>
            <tbody>
              {res.issues.length === 0 && <tr><td className="ok" colSpan="4">clean</td></tr>}
              {res.issues.map((i, k) => <tr key={k}><td className={i.sev}>{i.sev}</td><td>{i.name}</td><td>{i.weight}</td><td>{i.msg}</td></tr>)}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

function Sheet() {
  const heroNames = [...ICON_GROUPS.nav, ...ICON_GROUPS.hero]
  return (
    <div className="ip">
      <style>{css}</style>
      <header className="ip-top">
        <h1 className="ip-h">Icons</h1>
        <span className="ip-mono">{ICON_NAMES.length} glyphs · 24 grid · 1.75 stroke · line / duo / solid · optical 16 / 20 / 24 / 32</span>
      </header>

      <section className="ip-sec">
        <div className="ip-mono">Tab bar · line at rest, solid when active</div>
        <div className="ip-row"><Dock initial={0} /><Dock initial={1} /><Dock initial={4} /></div>
      </section>

      <section className="ip-sec">
        <div className="ip-mono">Hero glyphs · {NARROW ? 40 : 64} px · line / duo / solid</div>
        <div className="ip-heroes">{heroNames.map((n) => <Hero key={n} name={n} />)}</div>
      </section>

      <section className="ip-sec">
        <div className="ip-mono">Pixel check · 1:1 at 16 / 20 / 24 · nav + hero</div>
        <PixelCheck names={heroNames} />
      </section>

      <section className="ip-sec">
        <div className="ip-mono">In context · the way the product uses them</div>
        <div className="ip-ctx">
          <span className="ip-chip" style={{ color: 'var(--ignite-2)' }}><Icon name="flame" size={20} weight="solid" /><span style={{ color: 'var(--ink)' }}>12</span></span>
          <span className="ip-chip" style={{ color: 'var(--tele)' }}><Icon name="bolt" size={20} weight="solid" /><span style={{ color: 'var(--ink)' }}>1,240 XP</span></span>
          <span className="ip-chip" style={{ color: 'var(--tele)' }}><Icon name="shield" size={20} weight="duo" /><span style={{ color: 'var(--ink)' }}>2</span></span>
          <span className="ip-chip" style={{ color: 'var(--ink-2)' }}><Icon name="clock" size={16} /><span>~6 min</span></span>
          <span className="ip-chip" style={{ color: 'var(--ink-3)' }}><Icon name="lock" size={16} />Day 14 · T-02:14:09</span>
          <span className="ip-btn"><Icon name="rocket" size={24} weight="solid" />Launch</span>
          <span className="ip-chip" style={{ color: 'var(--go)' }}><Icon name="checkCircle" size={20} weight="solid" />Go</span>
          <span className="ip-chip" style={{ color: 'var(--nogo)' }}><Icon name="close" size={20} weight="solid" />No-go</span>
        </div>
      </section>

      <section className="ip-sec">
        <div className="ip-mono">API · edge cases (a11y, aliases, fallbacks)</div>
        <div className="ip-ctx" id="ip-api" style={{ color: 'var(--ink)' }}>
          <Icon.flame title="Streak: 12 days" size={32} />
          <Icon name="vault" size={32} />
          <Icon name="nope" size={32} />
          <Icon name="flame" size="1.5em" />
          <Icon name="bolt" weight="fill" size={32} />
          <Icon name="star" strokeWidth={1} size={48} />
          <Icon.chevron size={32} />
          <Icon.quests size={32} weight="solid" />
          <span style={{ display: 'inline-flex', width: 64, gap: 4 }}><Icon name="rocket" size={32} /><Icon name="rocket" size={32} /><Icon name="rocket" size={32} /></span>
        </div>
        <p className="ip-mono" style={{ marginTop: 'var(--s-3)' }}>titled → role=img + aria-label · others aria-hidden · vault/chevron/quests are v6 aliases · "nope" renders the boxed ? · the last row is three 32 px icons in a 64 px flex box: they must not squash</p>
      </section>

      {Object.entries(ICON_GROUPS).map(([g, names]) => (
        <section className="ip-sec" key={g}>
          <div className="ip-mono">{g} · {names.length}</div>
          <div className="ip-grid-cards">{names.map((n) => <Card key={n} name={n} />)}</div>
        </section>
      ))}
    </div>
  )
}

const only = (q.get('only') || '').split(',').filter(Boolean)
const strip = (q.get('strip') || '').split(',').filter(Boolean)
mount(
  q.get('audit') ? <Audit /> : strip.length ? <Strip names={strip} weight={q.get('weight') || 'line'} /> : only.length
    ? <Inspector names={only} size={+(q.get('size') || 160)} grid={q.get('grid') !== '0'} weights={(q.get('weights') || 'line,duo,solid').split(',')} />
    : <Sheet />,
  { fx: q.get('fx') === 'lite' ? 'lite' : 'full' },
)
