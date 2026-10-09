import { mount } from './_boot.jsx'
import { now, today, isSimulated } from '../src/now.js'
mount(
  <div style={{ padding: 24, background: 'var(--carbon-0)', color: 'var(--ink)', minHeight: '100vh' }}>
    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 'var(--track-label)', textTransform: 'uppercase', color: 'var(--ignite-2)' }}>Stage 02 · Faithfulness</p>
    <h1 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 'var(--fs-2xl)' }}>He that is faithful in that which is least</h1>
    <p style={{ fontFamily: 'var(--font-ui)' }}>Ọlá Ẹbùn ṣe — Inter body 17px. {today()} sim={String(isSimulated())}</p>
    <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--tele)' }}>T-02:14:09 · DAY 12/31 · +40 XP</p>
  </div>
)
