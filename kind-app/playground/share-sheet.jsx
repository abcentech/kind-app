// Share Studio playground — opens the sheet for each kind with real data.
//   /playground/share-sheet.html?open=verse|card|streak|month   &series=secrets-of-longevity   &engine=fake|real   &fx=lite
// engine=real uses lib/shareCanvas.js (ShareStudio imports it itself); the default is a fake engine that exercises the UI flow.
import { useState } from 'react'
import { mountScreen } from './_shell.jsx'
import { useShell } from '../src/shell.jsx'
import { codeFor } from '../src/lib.js'
import ShareStudio from '../src/screens/ShareStudio.jsx'

const q = new URLSearchParams(location.search)

/* A throwaway renderer: gradient + wrapped text + the template name, 300 ms, so skeletons and debounce are visible. */
const FAKE_T = {
  verse: ['Dusk', 'Ledger', 'Orbit', 'Paper'], card: ['Plate', 'Gold', 'Clean'], streak: ['Flame', 'Strip', 'Ring'], month: ['Patch', 'Declaration', 'Stats', 'Poster'],
}
const fake = {
  TEMPLATES: Object.fromEntries(Object.entries(FAKE_T).map(([k, v]) => [k, v.map((l) => ({ id: l.toLowerCase(), label: l }))])),
  ASPECTS: [{ id: 'story', w: 1080, h: 1920, label: 'Story' }, { id: 'square', w: 1080, h: 1080, label: 'Square' }, { id: 'portrait', w: 1080, h: 1350, label: 'Portrait' }],
  canvasToBlob: (c) => new Promise((r) => c.toBlob(r, 'image/png')),
  async renderShare({ kind, data, template, aspect }) {
    await new Promise((r) => setTimeout(r, 300))
    const a = fake.ASPECTS.find((x) => x.id === aspect)
    const c = document.createElement('canvas'); c.width = a.w; c.height = a.h
    const g = c.getContext('2d')
    const hue = { verse: 28, card: 200, streak: 18, month: 150 }[kind] + (FAKE_T[kind].findIndex((l) => l.toLowerCase() === template) * 25)
    const gr = g.createLinearGradient(0, 0, 0, a.h); gr.addColorStop(0, `hsl(${hue} 60% 14%)`); gr.addColorStop(1, `hsl(${hue + 30} 70% 32%)`)
    g.fillStyle = gr; g.fillRect(0, 0, a.w, a.h)
    g.fillStyle = '#fff'; g.font = '600 64px sans-serif'; g.textAlign = 'center'
    const text = data.text || data.line || (data.count ? `${data.count} day streak` : data.seriesTitle) || kind
    const words = String(text).split(' '); let line = '', y = a.h * 0.3
    for (const w of words) { if (g.measureText(line + w).width > a.w - 160) { g.fillText(line, a.w / 2, y); y += 84; line = '' } line += w + ' ' }
    g.fillText(line, a.w / 2, y)
    g.font = '500 40px monospace'; g.fillStyle = '#ffc43d'; g.fillText(`${kind} · ${template} · ${aspect}`, a.w / 2, a.h - 120)
    return c
  },
}
const engine = q.get('engine') === 'real' ? undefined : fake

function dataFor(kind, s) {
  const ep = Object.values(s.episodes)[11] || Object.values(s.episodes)[0]
  if (kind === 'verse') return { kind, text: ep.scripture.text, ref: ep.scripture.ref, day: 12, seriesTitle: s.title, seriesId: s.id }
  if (kind === 'card') { const c = codeFor(s, 12) || s.codes[0]; return { kind, no: c.no, day: c.day, title: c.title, line: c.line, rare: !!c.rare, stage: c.week + 1, owned: true, seriesTitle: s.title, seriesId: s.id } }
  if (kind === 'streak') return { kind, streak: 12, count: 12, xp: 1240, best: 12, shields: 1, state: 'safe' }
  return { kind, seriesTitle: s.title, seriesId: s.id, declaration: s.declaration, themeScripture: s.themeScripture, done: 31, total: 31, pct: 1, complete: true, xp: 1240 }
}

function Page() {
  const { s } = useShell()
  const [req, setReq] = useState(() => (q.get('open') ? { kind: q.get('open'), data: dataFor(q.get('open'), s) } : null))
  return (
    <div style={{ padding: 24, display: 'grid', gap: 12, alignContent: 'start', color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
      <div>share-studio · {s.title} · engine {engine ? 'FAKE' : 'real'}</div>
      {['verse', 'card', 'streak', 'month'].map((k) => (
        <button key={k} data-testid={'open-' + k} className="pg-open" onClick={() => setReq({ kind: k, data: dataFor(k, s) })}
          style={{ padding: 12, background: 'var(--carbon-2)', color: 'var(--ink)', border: '1px solid var(--line-2)', borderRadius: 12, font: 'inherit' }}>
          Open {k}
        </button>
      ))}
      {req ? <ShareStudio key={req.kind} req={req} engine={engine} onClose={() => setReq(null)} /> : null}
    </div>
  )
}

mountScreen(<Page />, { bare: true })
