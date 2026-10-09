// complete-rank playground — the Rank, Rank-up, Medals and Patch beats on a stand-in stage (deep field + limb + a Skip bar the
// size of the real one), with hand-built finishDay results.
//   ?case=rank | up-steward | up-pioneer | up-pathfinder | medal-1 | medals-3 | medals-rare | patch-stewardship | patch-longevity
//   &bare=1  hides the picker   &fx=lite   &active=0  mounts inactive   (the real store is used: markSeen() writes to localStorage)
import { useCallback, useEffect, useMemo, useState } from 'react'
import { mount } from './_boot.jsx'
import './complete-rank.css'
import { ShellContext } from '../src/shell.jsx'
import { getSeries } from '../src/lib.js'
import { rankFor } from '../src/store.js'
import { Horizon } from '../src/art/index.js'
import { ToastHost } from '../src/ui/index.js'
import FxLayer from '../src/fx/FxLayer.jsx'
import Rank from '../src/screens/complete/beats/Rank.jsx'
import Medals from '../src/screens/complete/beats/Medals.jsx'
import Patch from '../src/screens/complete/beats/Patch.jsx'

const q = new URLSearchParams(location.search)

const R = (a, b) => { const from = rankFor(a), to = rankFor(b); return { from, to, up: from.index !== to.index } }
const stageOf = (seriesId, index) => {
  const w = getSeries(seriesId).weeks[index]
  const name = w.f.charAt(0) + w.f.slice(1).toLowerCase()
  return { index, n: index + 1, name, title: w.title, done: 7, total: 7, cleared: true, clearedNow: true }
}
const result = (o) => ({
  seriesId: 'stewardship-code', day: 9, again: false, first: false, xp: { lesson: 40, bonus: 20, drop: 0, total: 60, lines: [] },
  rank: R(412, 472), achievements: [], stage: { index: 0, n: 1, name: 'Ownership', title: '', done: 3, total: 9, cleared: false, clearedNow: false },
  ...o,
})

const CASES = {
  rank: { Beat: Rank, label: 'Rank band', r: result({ rank: R(412, 472) }) },
  'up-steward': { Beat: Rank, label: 'Rank-up · Steward', r: result({ rank: R(260, 330), xp: { total: 70 } }) },
  'up-pathfinder': { Beat: Rank, label: 'Rank-up · Pathfinder', r: result({ rank: R(2200, 2290), xp: { total: 90 } }) },
  'up-pioneer': { Beat: Rank, label: 'Rank-up · Pioneer', r: result({ rank: R(5160, 5240), xp: { total: 80 } }) },
  'medal-1': { Beat: Medals, label: '1 medal', r: result({ achievements: ['first-launch'] }) },
  'medals-3': { Beat: Medals, label: '3 medals', r: result({ achievements: ['perfect-day', 'streak-7', 'full-month'] }) },
  'medals-rare': { Beat: Medals, label: '2 rare', r: result({ achievements: ['streak-21', 'streak-100'] }) },
  'patch-stewardship': { Beat: Patch, label: 'Patch · Stewardship', r: result({ seriesId: 'stewardship-code', stage: stageOf('stewardship-code', 1) }) },
  'patch-longevity': { Beat: Patch, label: 'Patch · Longevity', r: result({ seriesId: 'secrets-of-longevity', stage: stageOf('secrets-of-longevity', 2) }) },
}
const KEYS = Object.keys(CASES)

function Page() {
  const [key, setKey] = useState(CASES[q.get('case')] ? q.get('case') : 'rank')
  const [run, setRun] = useState(0)
  const [nexts, setNexts] = useState(0)
  const [active, setActive] = useState(q.get('active') !== '0')
  const c = CASES[key]
  useEffect(() => { window.__replay = () => setRun((n) => n + 1) }, [])
  const s = getSeries(c.r.seriesId)
  const next = useCallback(() => { setNexts((n) => n + 1); console.log('[beat] next()') }, [])
  const ctx = useMemo(() => ({ s, seriesId: s.id, tab: 'learn', goTab() {}, openDay() {}, closeLesson() {}, share() {}, mode: 'archive' }), [s])
  return (
    <ShellContext.Provider value={ctx}>
      <div className="shell"><div className="shell-frame">
        <div className="pgr-stage">
          <Horizon variant="limb" stars />
          <div className="pgr-top"><span className="pgr-skip">Skip</span></div>
          <c.Beat key={key + run} result={c.r} s={s} day={c.r.day} active={active} next={next} skip={() => {}} share={() => {}} />
        </div>
        <FxLayer /><ToastHost />
      </div></div>
      {q.get('bare') ? null : (
        <div className="pgr-pick" data-testid="picker">
          {KEYS.map((k) => <button key={k} className={k === key ? 'is-on' : ''} onClick={() => { setKey(k); setRun((n) => n + 1) }}>{CASES[k].label}</button>)}
          <button onClick={() => setRun((n) => n + 1)}>replay</button>
          <button onClick={() => setActive((a) => !a)}>active: {String(active)}</button>
          <span data-testid="nexts">next() x{nexts}</span>
        </div>
      )}
      <span hidden data-testid="nexts-count">{nexts}</span>
    </ShellContext.Provider>
  )
}
window.__nexts = () => document.querySelector('[data-testid=nexts-count]')?.textContent
mount(<Page />, { fx: q.get('fx') === 'lite' ? 'lite' : 'full' })
