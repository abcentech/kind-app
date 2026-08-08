import { useState } from 'react'
import { dayLabel, fmtDay, title as sentence } from '../lib.js'
import { sub, unlockedCards, useStore } from '../store.js'
import { Icon } from '../icons.jsx'
import { Hud } from './Learn.jsx'

/** The collection: passes earned, and the answers you wrote along the way. */
export default function Vault({ s, openDay }) {
  const st = useStore()
  const [tab, setTab] = useState('passes')
  const [open, setOpen] = useState(null)
  const held = unlockedCards(st, s.id)
  const notes = Object.entries(sub(st, s.id).notes).filter(([, v]) => v.trim()).sort((a, b) => a[0] - b[0])

  return (
    <>
      <Hud s={s} />
      <section className="screen">
        <span className="kicker">{s.month} {s.year}</span>
        <h1 className="title">Collection</h1>
        <p className="dek">{held.length} of {s.codes.length} passes · {notes.length} written {notes.length === 1 ? 'entry' : 'entries'}</p>

        <div className="seg" style={{ marginTop: 18 }}>
          <button className={tab === 'passes' ? 'on' : ''} onClick={() => setTab('passes')}>Passes</button>
          <button className={tab === 'ledger' ? 'on' : ''} onClick={() => setTab('ledger')}>Ledger</button>
        </div>

        {tab === 'passes' && (
          <>
            <div className="card sunk">
              <span className="kicker">The monthly declaration</span>
              {s.declaration.map((l, i) => (
                <p key={i} style={{ fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1.4, margin: '6px 0 0', fontWeight: 500 }}>{l}</p>
              ))}
            </div>
            <div className="grid">
              {s.codes.map((c) => {
                const has = held.includes(c.no)
                return (
                  <button key={c.no}
                    className={'gpass' + (has ? '' : ' shut') + (has && c.rare ? ' gold' : '')}
                    style={{ '--unit-e': `var(--u${c.week + 1}-e)` }}
                    onClick={() => (has ? setOpen(c) : openDay(c.day))}>
                    <span className="pn">Pass {String(c.no).padStart(2, '0')}</span>
                    {has ? <q>{c.line}</q> : <Icon.lock />}
                    <small>{has ? sentence(c.title) : fmtDay(s, c.day)}</small>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {tab === 'ledger' && (
          <div className="entries">
            {notes.length === 0 && (
              <p className="dek">Every lesson asks you one question of your own. Your answers collect
                here — a month of your own thinking, kept on this device.</p>
            )}
            {notes.map(([day, text]) => (
              <button key={day} className="entry" onClick={() => openDay(+day)}>
                <small>{fmtDay(s, +day)}</small>
                <b>{dayLabel(s, +day)}</b>
                <p>{text}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {open && (
        <div className="done-screen" role="dialog" onClick={() => setOpen(null)}
          style={{ '--unit': `var(--u${open.week + 1})`, '--unit-e': `var(--u${open.week + 1}-e)` }}>
          <div className={'pass-card' + (open.rare ? ' gold' : '')}>
            <span className="pn">Pass {String(open.no).padStart(2, '0')}{open.rare ? ' · gold' : ''}</span>
            <q>{open.line}</q>
            <em>{sentence(open.title)} · {fmtDay(s, open.day)}</em>
          </div>
          <div style={{ width: '100%', maxWidth: 320, marginTop: 20 }}>
            <button className="btn wide grass" onClick={() => setOpen(null)}>Close</button>
            <button className="btn-plain quiet" style={{ width: '100%' }}
              onClick={(e) => { e.stopPropagation(); openDay(open.day) }}>Practise day {open.day} again</button>
          </div>
        </div>
      )}
    </>
  )
}
