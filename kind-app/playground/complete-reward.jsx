// complete-reward — Card + Drop beats in the real shell frame, on a stand-in stage.
//   /playground/complete-reward.html?case=gold            normal | gold | dupe | none | xp | xp-rare | shield | shield-converted | fragment | fragment-ready | nodrop
//   add ?fx=lite for the cross-fade version; the top bar's Replay turns the beat off and on again (it must start from the top)
import { useState } from 'react'
import { mountScreen } from './_shell.jsx'
import { Starfield, Horizon } from '../src/art/index.js'
import { getSeries } from '../src/lib.js'
import Card from '../src/screens/complete/beats/Card.jsx'
import Drop from '../src/screens/complete/beats/Drop.jsx'

const q = new URLSearchParams(location.search)
const id = q.get('case') || 'normal'

const series = getSeries('stewardship-code')
const plain = series.codes.find((c) => !c.rare && c.no === 3)
const gold = series.codes.find((c) => c.rare)
const code = (c, over = {}) => ({ ...c, title: c.title.charAt(0) + c.title.slice(1).toLowerCase(), isNew: true, ...over })

const CASES = {
  normal: { kind: 'card', code: code(plain) },
  gold: { kind: 'card', code: code(gold) },
  dupe: { kind: 'card', code: code(plain, { isNew: false }) },
  none: { kind: 'card', code: null },
  xp: { kind: 'drop', drop: { kind: 'xp', rarity: 'common', xp: 15 } },
  'xp-rare': { kind: 'drop', drop: { kind: 'xp', rarity: 'rare', xp: 30 } },
  shield: { kind: 'drop', drop: { kind: 'shield', rarity: 'rare' } },
  'shield-converted': { kind: 'drop', drop: { kind: 'shield', rarity: 'rare', converted: true, xp: 25 } },
  fragment: { kind: 'drop', drop: { kind: 'fragment', rarity: 'epic', fragment: { index: 2, of: 5, total: 3, patchReady: false } } },
  'fragment-ready': { kind: 'drop', drop: { kind: 'fragment', rarity: 'epic', fragment: { index: 4, of: 5, total: 5, patchReady: true } } },
  nodrop: { kind: 'drop', drop: null },
}
const spec = CASES[id] || CASES.normal
const result = { seriesId: series.id, day: spec.code ? spec.code.day : 12, code: spec.code ?? null, drop: spec.drop ?? null }
const Beat = spec.kind === 'drop' ? Drop : Card

function Stage() {
  const [active, setActive] = useState(true)
  const [log, setLog] = useState('')
  const note = (m) => { console.log('[beat]', m); setLog(m) }
  return (
    <div className="pg-stage" data-testid="stage">
      <div className="pg-sky" aria-hidden="true"><Starfield density={1.2} seed={7} twinkle /><Horizon variant="limb" /></div>
      <div className="pg-bar">
        <span>Orbit insertion · {id}</span>
        <button type="button" onClick={() => { setActive(false); setTimeout(() => setActive(true), 80) }}>Replay</button>
      </div>
      <div className="pg-body">
        <Beat result={result} s={series} day={result.day} active={active} next={() => note('next()')} skip={() => note('skip()')} share={(r) => note('share ' + JSON.stringify(r))} />
      </div>
      <div className="pg-log" data-testid="pg-log">{log}</div>
    </div>
  )
}

function Nav() {
  return (
    <nav className="pg-nav" aria-label="cases">
      {Object.keys(CASES).map((k) => <a key={k} href={`?case=${k}${q.get('fx') ? '&fx=' + q.get('fx') : ''}`} aria-current={k === id ? 'page' : undefined}>{k}</a>)}
    </nav>
  )
}

mountScreen(<><Nav /><Stage /></>, { bare: true })
