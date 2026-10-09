// slides-word · Do — the challenge, typeset so it can be done. A lead line, then numbered steps on a hairline rail; one
// instruction alone becomes the hero of the slide. Beneath: the commit plate — the real <Switch> seated in a chamfered
// slab. Flipping it writes a tiny investment, setFlag(`do:${seriesId}:${day}`), and arms the rail (numerals go green).
// Committing is optional: it never gates CONTINUE.
import { useRef } from 'react'
import { Label, Switch } from '../../../ui/index.js'
import { hasFlag, setFlag, useStore } from '../../../store.js'
import { fmtKey } from '../../../lib.js'
import { fx } from '../../../fx/fx.js'
import { Emph, Eyebrow, readScale, smart } from './Verse.jsx'

// UI words that copy.js does not own yet (see REQUESTS).
const T = {
  eyebrow: 'Commit', title: 'I’ll do this', off: 'Tap to commit.', on: 'Committed. Go and do it.', logged: 'Logged',
}

const BULLET = /^\s*(?:[-*•–—]|\d{1,2}[.)])\s+(.*\S)\s*$/

/** body → [{ k:'p', t } | { k:'s', t }]: paragraphs and list items, in the order they were written. */
export function brief(body) {
  const out = []
  let para = []
  let prevBlank = true
  const flush = () => { if (para.length) { out.push({ k: 'p', t: para.join(' ') }); para = [] } }
  for (const raw of String(body || '').split(/\r?\n/)) {
    const b = BULLET.exec(raw)
    const last = out[out.length - 1]
    if (b) { flush(); out.push({ k: 's', t: b[1] }) }
    else if (!raw.trim()) { flush(); prevBlank = true; continue }
    else if (last && last.k === 's' && !para.length && !prevBlank) last.t += ' ' + raw.trim()   // a wrapped list item
    else para.push(raw.trim())
    prevBlank = false
  }
  flush()
  return out
}

const pad2 = (n) => String(n).padStart(2, '0')

export default function Do({ card, seriesId, day, scale, active }) {
  const on = active !== false
  const st = useStore()
  const key = `do:${seriesId}:${day}`
  const armed = hasFlag(st, key)
  const stamp = st.flags?.[key]
  const plate = useRef(null)

  const blocks = brief(smart(card.body))
  const solo = blocks.length === 1 && blocks[0].k === 'p'
  // group consecutive steps into one list so assistive tech reads "list, 4 items"
  const groups = []
  let n = 0
  for (const b of blocks) {
    if (b.k === 's') {
      const g = groups[groups.length - 1]
      n += 1
      if (g && g.k === 'ol') g.items.push({ n, t: b.t }); else groups.push({ k: 'ol', items: [{ n, t: b.t }] })
    } else groups.push({ k: 'p', t: b.t, tail: n > 0 })
  }

  const toggle = (next) => {
    setFlag(key, next)
    if (next) {
      const el = plate.current && plate.current.querySelector('.k-switch')
      if (el) fx.sparks({ ...fx.at(el), n: 16, power: .7 })
    }
  }

  let i = 0
  return (
    <section className="slw slw-do" data-active={on ? '' : undefined} data-armed={armed ? '' : undefined} style={readScale(scale)} aria-label={card.label}>
      <Eyebrow card={card} fallback="challenge" />
      <div className="slw-do__brief">
        {groups.map((g, gi) => {
          i += 1
          const st8 = { '--i': i }
          if (g.k === 'ol') {
            return (
              <ol key={gi} className="slw-do__steps slw-in" role="list" start={g.items[0].n} style={st8}>
                {g.items.map((it) => (
                  <li key={it.n} className="slw-do__step">
                    <span className="slw-do__n" aria-hidden="true">{pad2(it.n)}</span>
                    <p className="slw-do__t"><Emph t={it.t} /></p>
                  </li>
                ))}
              </ol>
            )
          }
          return <p key={gi} className={g.tail ? 'slw-do__note slw-in' : 'slw-do__lead slw-in'} data-solo={solo ? '' : undefined} style={st8}><Emph t={g.t} /></p>
        })}
      </div>

      <div className="slw-dock slw-in" style={{ '--i': i + 1 }}>
        <div className="slw-frame u-cut-frame">
          <label className="slw-commit" ref={plate}>
            <span className="slw-commit__txt">
              <Label mono size="sm" className="slw-commit__eyebrow">{T.eyebrow}</Label>
              <span className="slw-commit__title">{T.title}</span>
              {armed
                ? <span className="slw-commit__sub" data-mono>{T.logged}{stamp ? ` · ${fmtKey(stamp)}` : ''}</span>
                : <span className="slw-commit__sub">{T.off}</span>}
            </span>
            <span className="slw-commit__sw"><Switch checked={armed} onChange={toggle} label={T.title} tone="go" /></span>
          </label>
        </div>
      </div>
      <span className="u-sr" role="status">{armed ? T.on : ''}</span>
    </section>
  )
}
