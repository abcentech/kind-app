// learn-hud playground — the HUD in the real shell frame over a plain scroller (so the glass has something to blur).
//   ?seed=new | streak6 | risk | lost | veteran     (default: leave the saved state alone)
//   ?now=2026-08-12T21:30  (at-risk evening)  ·  ?series=secrets-of-longevity  ·  ?fx=lite
// Buttons in the page: "Lesson trip" unmounts the HUD, finishes today's day (+XP, streak), remounts it: the numbers must tick up.
import { useEffect, useState } from 'react'
import { mountScreen } from './_shell.jsx'
import { Hud } from '../src/screens/Hud.jsx'
import { dev, finishDay, snapshot } from '../src/store.js'
import { currentDay, getSeries, activeSeriesId } from '../src/lib.js'
import { useShell } from '../src/shell.jsx'

const q = new URLSearchParams(location.search)
const seed = q.get('seed')
if (seed === 'new') dev.seed('new')
else if (seed === 'streak6') { dev.seed('done-today', { days: 5 }); dev.set({ shields: 1 }) }
else if (seed === 'risk') { dev.seed('mid'); dev.set({ shields: 1 }) }
else if (seed === 'lost') dev.seed('lost')
else if (seed === 'veteran') dev.seed('veteran')

let setVisible = () => {}
function HudHost({ s }) {
  const [on, setOn] = useState(true)
  setVisible = setOn
  return on ? <Hud s={s} /> : null
}
window.__trip = async (xp = 40) => {
  const sid = activeSeriesId()
  const s = getSeries(sid)
  const st = snapshot()
  setVisible(false)
  await new Promise((r) => setTimeout(r, 300))
  const r = finishDay(sid, currentDay(s, st), xp, { right: 4, asked: 4 })
  await new Promise((r2) => setTimeout(r2, 300))
  setVisible(true)
  return r && { xp: r.xp.total, streak: r.streak.to }
}

const link = (name) => {
  const u = new URL(location.href)
  u.searchParams.set('seed', name)
  return u.toString()
}

function Page() {
  const { s, mode } = useShell()
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 5000); return () => clearInterval(id) }, [])
  return (
    <div style={{ padding: 'var(--s-4) var(--gutter) var(--s-16)', color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
      <p style={{ color: 'var(--ink-3)' }}>learn-hud · {s.id} · {mode} · seed {seed || 'saved'}</p>
      <p style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-3)' }}>
        {['new', 'streak6', 'risk', 'lost', 'veteran'].map((n) => <a key={n} href={link(n)} style={{ color: 'var(--tele)' }}>{n}</a>)}
        <button type="button" data-testid="trip" onClick={() => window.__trip(40)} style={{ color: 'var(--ignite-2)', font: 'inherit', background: 'none', border: 0, cursor: 'pointer' }}>lesson trip +40</button>
      </p>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} style={{ height: 'var(--s-12)', margin: 'var(--s-4) 0', borderRadius: 'var(--r-md)', background: i % 2 ? 'var(--ignite)' : 'var(--titanium)', opacity: 0.85 }} />
      ))}
      {Array.from({ length: 40 }, (_, i) => <p key={i}>T+ {String(i).padStart(3, '0')} · telemetry line, scroll me under the glass</p>)}
    </div>
  )
}

mountScreen(<Page />, { hud: HudHost, dock: true, tab: 'learn' })
