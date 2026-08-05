import { useState } from 'react'
import { dayLabel, fmtDay, title as sentence } from '../lib.js'
import { sub, unlockedCards, useStore } from '../store.js'
import { Icon } from '../icons.jsx'

/** What showing up leaves behind: the passes you hold and the words you wrote. */
export default function Vault({ s, openDay }) {
  const st = useStore()
  const [tab, setTab] = useState('passes')
  const [open, setOpen] = useState(null)
  const held = unlockedCards(st, s.id)
  const notes = Object.entries(sub(st, s.id).notes).filter(([, v]) => v.trim()).sort((a, b) => a[0] - b[0])

  return (
    <section className="screen">
      <div className="hdr">
        <div className="hdr-l">
          <span className="kicker">{s.month} {s.year}</span>
          <h1 className="title">Your vault</h1>
          <p className="dek">{held.length} of {s.codes.length} passes · {notes.length} written {notes.length === 1 ? 'entry' : 'entries'}</p>
        </div>
      </div>

      <div className="seg">
        <button className={tab === 'passes' ? 'on' : ''} onClick={() => setTab('passes')}>Passes</button>
        <button className={tab === 'ledger' ? 'on' : ''} onClick={() => setTab('ledger')}>Ledger</button>
      </div>

      {tab === 'passes' && (
        <>
          <div className="creed-block">
            <p className="group-t" style={{ padding: '0 0 8px' }}>The monthly declaration</p>
            {s.declaration.map((l, i) => <p key={i}>{l}</p>)}
          </div>
          <div className="passgrid">
            {s.codes.map((c) => {
              const has = held.includes(c.no)
              return (
                <button key={c.no} className={'mini tone' + (c.week + 1) + (has ? '' : ' shut') + (c.rare && has ? ' is-gold' : '')}
                  onClick={() => (has ? setOpen(c) : openDay(c.day))}>
                  <span className="pass-no">PASS {String(c.no).padStart(2, '0')}</span>
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
            <p className="blank">Every day’s deck asks you one question. Your answers collect here —
              a month of your own thinking, kept on this device.</p>
          )}
          {notes.map(([day, text]) => (
            <button key={day} className="entry" onClick={() => openDay(+day)}>
              <span className="lead-day">{fmtDay(s, +day).toUpperCase()}</span>
              <b>{dayLabel(s, +day)}</b>
              <p>{text}</p>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className={'reward tone' + (open.week + 1)} role="dialog" onClick={() => setOpen(null)}>
          <div className={'pass' + (open.rare ? ' is-gold' : '')}>
            <div className="pass-top">
              <span className="pass-no">PASS {String(open.no).padStart(2, '0')}</span>
              {open.rare && <span className="pass-gold">Gold</span>}
            </div>
            <q>{open.line}</q>
            <p className="pass-ep">{sentence(open.title)} · {fmtDay(s, open.day)}</p>
          </div>
          <div className="reward-foot">
            <button className="btn" onClick={() => setOpen(null)}>Done</button>
            <button className="link" onClick={(e) => { e.stopPropagation(); openDay(open.day) }}>Read day {open.day} again</button>
          </div>
        </div>
      )}
    </section>
  )
}
