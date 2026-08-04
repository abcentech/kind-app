import { useState } from 'react'
import { dayLabel, fmtDay, title } from '../lib.js'
import { noteFor, sub, unlockedCards, useStore } from '../store.js'

/** What you own after showing up: the codes you unlocked and the words you wrote. */
export default function Vault({ s, openDay }) {
  const st = useStore()
  const [tab, setTab] = useState('codes')
  const got = unlockedCards(st, s.id)
  const notes = Object.entries(sub(st, s.id).notes).filter(([, v]) => v.trim()).sort((a, b) => a[0] - b[0])
  const [open, setOpen] = useState(null)

  return (
    <section className="screen vault">
      <header className="h-top">
        <div>
          <span className="eyebrow">{s.month} {s.year}</span>
          <h1>Your vault</h1>
          <p className="sub">{got.length} of {s.codes.length} codes · {notes.length} entries in your ledger</p>
        </div>
      </header>

      <div className="segs">
        <button className={tab === 'codes' ? 'on' : ''} onClick={() => setTab('codes')}>Codes</button>
        <button className={tab === 'ledger' ? 'on' : ''} onClick={() => setTab('ledger')}>My ledger</button>
      </div>

      {tab === 'codes' && (
        <>
          <div className="declbox">
            <span className="eyebrow">The monthly declaration</span>
            {s.declaration.map((l, i) => <p key={i}>{l}</p>)}
          </div>
          <div className="cardgrid">
            {s.codes.map((c) => {
              const has = got.includes(c.no)
              return (
                <button key={c.no} className={'gc' + (has ? ' got' : ' locked') + (c.rare ? ' rare' : '')}
                  onClick={() => (has ? setOpen(c) : openDay(c.day))}>
                  <span className="gc-no">{String(c.no).padStart(2, '0')}</span>
                  {has ? <b>{c.line}</b> : <b className="hidden">Locked</b>}
                  <small>{has ? title(c.title) : 'Day ' + c.day}</small>
                  <i className="gc-seal">{has ? s.weeks[c.week]?.emoji || '🔑' : '🔒'}</i>
                </button>
              )
            })}
          </div>
        </>
      )}

      {tab === 'ledger' && (
        <div className="ledger">
          {notes.length === 0 && (
            <p className="empty">Every day’s deck asks you one question. Your answers land here —
              a month of your own thinking, kept on this device.</p>
          )}
          {notes.map(([day, text]) => (
            <button key={day} className="lg" onClick={() => openDay(+day)}>
              <span className="eyebrow">{fmtDay(s, +day)} · Day {day}</span>
              <b>{dayLabel(s, +day)}</b>
              <p>{text}</p>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="unlock" role="dialog" onClick={() => setOpen(null)}>
          <div className={'codecard' + (open.rare ? ' rare' : '')}>
            <span className="cc-no">Code {String(open.no).padStart(2, '0')}{open.rare ? ' · gold' : ''}</span>
            <h2>{open.line}</h2>
            <p className="cc-ep">{title(open.title)}</p>
            <div className="cc-seal">{s.weeks[open.week]?.emoji || '🔑'}</div>
          </div>
          <button className="btn big" onClick={() => setOpen(null)}>Close</button>
          <button className="linkbtn" onClick={(e) => { e.stopPropagation(); openDay(open.day) }}>Revisit day {open.day}</button>
        </div>
      )}
    </section>
  )
}
