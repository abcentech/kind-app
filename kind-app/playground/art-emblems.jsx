// Collector's cabinet — specimen sheet for the art-emblems collectibles.
//   /playground/art-emblems.html                 full cabinet
//   /playground/art-emblems.html?fx=lite         lite mode
//   /playground/art-emblems.html?only=patch      one section (patch|rank|medal|card|chest|trophy|shield|flame|glyphs)
import { useEffect, useRef, useState } from 'react'
import { mount } from './_boot.jsx'
import './art-emblems.css'
import { FlameMark, MissionPatch, CodeCardArt, Medal, RankInsignia, ShieldEmblem, Chest, Trophy, PATCH_GLYPH_NAMES, MEDAL_GLYPH_NAMES } from '../src/art/emblems.js'
import { usePointerTilt } from '../src/fx/motion.js'
import { allSeries } from '../src/lib.js'

const q = new URLSearchParams(location.search)
const only = q.get('only')
const fx = q.get('fx') === 'lite' ? 'lite' : 'full'

const Cell = ({ label, children }) => <figure className="pe-cell">{children}<figcaption>{label}</figcaption></figure>
const Sec = ({ id, title, note, children }) => (only && only !== id ? null : (
  <section className="pe-sec" id={'sec-' + id}>
    <header><h2>{title}</h2><span className="pe-mono">{note}</span></header>
    {children}
  </section>
))

function Flames() {
  return (
    <Sec id="flame" title="FlameMark" note="levels 0–3 · lit / cold ember">
      {[96, 48, 24].map((s) => (
        <div key={s}>
          <h3>{s}px</h3>
          <div className="pe-row">
            {[0, 1, 2, 3].map((l) => <Cell key={l} label={`lit · L${l}`}><FlameMark size={s} level={l} /></Cell>)}
            {[0, 3].map((l) => <Cell key={'c' + l} label={`cold · L${l}`}><FlameMark size={s} lit={false} level={l} /></Cell>)}
          </div>
        </div>
      ))}
    </Sec>
  )
}

function Patches() {
  return (
    <Sec id="patch" title="MissionPatch" note="embroidered · merrowed · twill">
      {allSeries.map((se) => (
        <div key={se.id}>
          <h3>{se.title} · {se.month} {se.year} · earned @ 200</h3>
          <div className="pe-row">
            {se.weeks.map((w, i) => <Cell key={i} label={`${i + 1} · ${w.f}`}><MissionPatch series={se} stage={i} size={200} /></Cell>)}
          </div>
          <h3>locked @ 200</h3>
          <div className="pe-row">
            {se.weeks.map((w, i) => <Cell key={i} label={`${i + 1} · ${w.f}`}><MissionPatch series={se} stage={i} state="locked" size={200} /></Cell>)}
          </div>
          <h3>112 / 80 / 56 px</h3>
          <div className="pe-row">
            {[112, 80, 56].map((z) => se.weeks.slice(0, 4).map((w, i) => <MissionPatch key={z + '_' + i} series={se} stage={i} size={z} state={i === 3 ? 'locked' : 'earned'} />))}
          </div>
        </div>
      ))}
    </Sec>
  )
}

const fakeSeries = (f, accent = '#a8791f', accentDark = '#d9a441') => ({ id: 'x', title: 'Glyph proof', month: 'October', year: 2026, accent, accentDark, weeks: [{ f }, { f }, { f }, { f }, { f }] })
const GLYPH_KEYS = { ownership: 'OWNERSHIP', faithfulness: 'FAITHFULNESS', mastery: 'MASTERY', multiplication: 'MULTIPLICATION', foundation: 'FOUNDATION', faith: 'FAITH', focus: 'FOCUS', fitness: 'FITNESS', finishing: 'FINISHING', star: 'UNKNOWN' }
function Glyphs() {
  return (
    <Sec id="glyphs" title="Emblem glyphs" note="every keyword → glyph, as embroidered">
      <div className="pe-row">
        {PATCH_GLYPH_NAMES.map((g, i) => (
          <Cell key={g} label={g}><MissionPatch series={fakeSeries(GLYPH_KEYS[g], ['#a8791f', '#25704a', '#7a2f2a', '#2a4f8a', '#5a3a8a'][i % 5], ['#d9a441', '#4fbf85', '#ff8a6b', '#6ab0ff', '#b99aff'][i % 5])} stage={i % 5} size={260} /></Cell>
        ))}
      </div>
    </Sec>
  )
}

const CARDS = [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 1], [12, 0], [17, 1], [23, 0], [25, 1]]
function Tilted({ children }) {
  const ref = useRef(null)
  usePointerTilt(ref, { max: 14, glare: true, gyro: false })
  return <div className="pe-tilt"><div ref={ref}>{children}</div></div>
}
function Cards() {
  const [g, setG] = useState({ x: 50, y: 50, on: 0 })
  return (
    <Sec id="card" title="CodeCardArt" note="generative engraving · gold foil on rare">
      <h3>printed (hue by day) · gold foil (rare) — hover / drag to tilt</h3>
      <div className="pe-row">
        {CARDS.map(([d, r]) => <Cell key={d} label={`day ${d}${r ? ' · rare' : ''}`}><Tilted><CodeCardArt day={d} rare={!!r} w={170} /></Tilted></Cell>)}
      </div>
      <h3>manual light: --gx / --gy / --tilt-on written on the wrapper</h3>
      <div className="pe-ctl">
        <label>gx <input type="range" min="0" max="100" value={g.x} onChange={(e) => setG({ ...g, x: +e.target.value })} /></label>
        <label>gy <input type="range" min="0" max="100" value={g.y} onChange={(e) => setG({ ...g, y: +e.target.value })} /></label>
        <label>tilt-on <input type="range" min="0" max="1" step=".05" value={g.on} onChange={(e) => setG({ ...g, on: +e.target.value })} /></label>
      </div>
      <div className="pe-row" id="manual-light" style={{ '--gx': g.x + '%', '--gy': g.y + '%', '--tilt-on': g.on, marginTop: 16 }}>
        <Cell label="rare day 8"><CodeCardArt day={8} rare w={240} /></Cell>
        <Cell label="printed day 12"><CodeCardArt day={12} w={240} /></Cell>
        <Cell label="rare day 17 @ 120"><CodeCardArt day={17} rare w={120} /></Cell>
        <Cell label="day 5 @ 80"><CodeCardArt day={5} w={80} /></Cell>
        <Cell label="day 9 @ 56"><CodeCardArt day={9} w={56} /></Cell>
      </div>
    </Sec>
  )
}

function Medals() {
  const tiers = ['bronze', 'silver', 'gold', 'ti']
  return (
    <Sec id="medal" title="Medal" note="24 symbols · 4 tiers · earned / locked">
      <h3>every symbol, struck in each tier @ 120</h3>
      {tiers.map((t) => (
        <div className="pe-row" key={t} style={{ marginBottom: 20 }}>
          {MEDAL_GLYPH_NAMES.slice(0, 12).map((g) => <Medal key={g} id={'x'} glyph={g} tier={t} size={120} />)}
        </div>
      ))}
      <h3>second half of the set (gold, ribbonless disc)</h3>
      <div className="pe-row">{MEDAL_GLYPH_NAMES.slice(12).map((g) => <Cell key={g} label={g}><Medal glyph={g} tier="gold" ribbon={false} size={96} /></Cell>)}</div>
      <h3>locked silhouettes</h3>
      <div className="pe-row">{tiers.map((t, i) => <Cell key={t} label={t}><Medal id={['streak-7', 'perfect', 'first-lesson', 'rank-up'][i]} tier={t} earned={false} size={120} /></Cell>)}</div>
      <h3>keyword → symbol (ids as the store will pass them)</h3>
      <div className="pe-row">
        {['streak-3', 'shield-saved', 'first-launch', 'perfect-week', 'scripture-read', 'journal-5', 'night-owl', 'early-bird', 'xp-1000', 'month-complete', 'unlisted-thing', 'zzz'].map((id, i) => <Cell key={id} label={id}><Medal id={id} tier={tiers[i % 4]} size={72} /></Cell>)}
      </div>
      <h3>sizes 96 / 64 / 48 / 32 / 24</h3>
      <div className="pe-row">{[96, 64, 48, 32, 24].map((z) => <Medal key={z} id="streak-7" tier="gold" size={z} />)}{[96, 64, 48, 32, 24].map((z) => <Medal key={'l' + z} id="streak-7" earned={false} size={z} />)}</div>
    </Sec>
  )
}

function Ranks() {
  return (
    <Sec id="rank" title="RankInsignia" note="7 ranks · steel → titanium → bronze → silver → gold">
      {[160, 96, 56, 32].map((s) => (
        <div key={s}><h3>{s}px</h3><div className="pe-row">{[0, 1, 2, 3, 4, 5, 6].map((r) => <Cell key={r} label={`rank ${r}`}><RankInsignia rank={r} size={s} /></Cell>)}</div></div>
      ))}
    </Sec>
  )
}
function Shields() {
  return (
    <Sec id="shield" title="ShieldEmblem" note="ready · active · spent">
      {[128, 72, 40].map((s) => (
        <div key={s}><h3>{s}px</h3><div className="pe-row">{['ready', 'active', 'spent'].map((st) => <Cell key={st} label={st}><ShieldEmblem size={s} state={st} /></Cell>)}</div></div>
      ))}
    </Sec>
  )
}
function Chests() {
  return (
    <Sec id="chest" title="Chest" note="closed / open · four tones">
      {[160, 96, 56].map((s) => (
        <div key={s}><h3>{s}px</h3>
          <div className="pe-row">{['ignite', 'tele', 'gold', 'go'].flatMap((t) => [<Cell key={t + 'c'} label={`${t} · closed`}><Chest tone={t} size={s} /></Cell>, <Cell key={t + 'o'} label={`${t} · open`}><Chest tone={t} state="open" size={s} /></Cell>])}</div>
        </div>
      ))}
    </Sec>
  )
}
function Trophies() {
  return (
    <Sec id="trophy" title="Trophy" note="gold · silver · bronze · ti">
      {[160, 96, 56].map((s) => (
        <div key={s}><h3>{s}px</h3><div className="pe-row">{['gold', 'silver', 'bronze', 'ti'].map((t) => <Cell key={t} label={t}><Trophy tier={t} size={s} /></Cell>)}</div></div>
      ))}
    </Sec>
  )
}

const NAV = [['cabinet', 'Cabinet'], ['patch', 'Patch'], ['rank', 'Rank'], ['medal', 'Medal'], ['card', 'Card'], ['chest', 'Chest'], ['trophy', 'Trophy'], ['shield', 'Shield'], ['flame', 'Flame'], ['glyphs', 'Glyphs']]
function Bar() {
  const [lite, setLite] = useState(fx === 'lite')
  useEffect(() => { document.documentElement.dataset.fx = lite ? 'lite' : 'full' }, [lite])
  return (
    <>
      <div className="pe-top">
        <h1 className="pe-h">Collector’s cabinet</h1>
        <span className="pe-mono">KIND v7 · art-emblems</span>
        <div className="pe-bar">
          <button className="pe-btn" aria-pressed={lite} onClick={() => setLite(!lite)}>{lite ? 'Lite on' : 'Lite off'}</button>
        </div>
      </div>
      <nav className="pe-nav" aria-label="Sections">{NAV.map(([id, t]) => <a key={id} href={`?only=${id}${lite ? '&fx=lite' : ''}`}>{t}</a>)}<a href="?">All</a></nav>
    </>
  )
}

function Cabinet() {
  const [aug, jul] = allSeries
  return (
    <Sec id="cabinet" title="The cabinet" note="every collectible, on its shelf">
      <div className="pe-cab">
        <div className="pe-shelf">
          {aug.weeks.map((w, i) => <MissionPatch key={'a' + i} series={aug} stage={i} state={i < 3 ? 'earned' : 'locked'} size={176} />)}
          {jul.weeks.slice(0, 2).map((w, i) => <MissionPatch key={'j' + i} series={jul} stage={i} size={176} />)}
        </div>
        <div className="pe-shelf">
          {[0, 1, 2, 3, 4, 5, 6].map((r) => <RankInsignia key={r} rank={r} size={104} />)}
          <FlameMark size={104} level={3} /><ShieldEmblem size={104} state="active" />
        </div>
        <div className="pe-shelf">
          {['gold', 'silver', 'bronze', 'ti'].map((t, i) => <Medal key={t} id={['streak-7', 'perfect-week', 'scripture-read', 'month-complete'][i]} tier={t} size={112} />)}
          <Trophy size={128} /><Chest size={132} state="open" tone="gold" /><Chest size={116} tone="ignite" />
        </div>
        <div className="pe-shelf">
          {[[3, 0], [8, 1], [12, 0], [17, 1], [25, 1], [30, 0]].map(([d, r]) => <Tilted key={d}><CodeCardArt day={d} rare={!!r} w={132} /></Tilted>)}
        </div>
      </div>
    </Sec>
  )
}

function App() {
  return (
    <div className="pe">
      <div className="pe-wrap">
        <Bar />
        <Cabinet />
        <Ranks />
        <Shields />
        <Chests />
        <Trophies />
        <Medals />
        <Cards />
        <Glyphs />
        <Patches />
        <Flames />
      </div>
    </div>
  )
}

mount(<App />, { fx })
