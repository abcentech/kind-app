import { useEffect, useState } from 'react'
import { allSeries } from '../lib.js'
import { addKid, doneDays, perfectWeeks, removeKid, resetAll, unlockedCards, updateProfile, useStore } from '../store.js'
import { LINKS, SITE } from '../config.js'
import GodsUniversity from './GodsUniversity.jsx'

export default function Me({ s, seriesId, setSeriesId }) {
  const st = useStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(st.name)
  const [kid, setKid] = useState('')
  const [install, setInstall] = useState(null)

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstall(e) }
    addEventListener('beforeinstallprompt', onPrompt)
    return () => removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const done = doneDays(st, s.id)

  return (
    <section className="screen me">
      <header className="h-top">
        <div>
          <span className="eyebrow">{st.role === 'parent' ? 'Parent' : 'Steward'}</span>
          {editing ? (
            <form className="namef" onSubmit={(e) => { e.preventDefault(); updateProfile({ name: name.trim() }); setEditing(false) }}>
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={20} />
              <button type="submit">Save</button>
            </form>
          ) : (
            <h1 onClick={() => setEditing(true)}>{st.emoji} {st.name || 'You'} <span className="pencil">✎</span></h1>
          )}
          <p className="sub">{st.familyName ? `The ${st.familyName} family` : 'Raising goDs, building nations'}</p>
        </div>
      </header>

      <div className="fcard">
        <span className="eyebrow">{s.month} at a glance</span>
        <div className="bigstats">
          <div><b>🔥 {st.streak}</b><span>streak</span></div>
          <div><b>{done.length}<i>/{s.calendar.length}</i></b><span>days</span></div>
          <div><b>🗂️ {unlockedCards(st, s.id).length}</b><span>codes</span></div>
          <div><b>⭐ {perfectWeeks(st, s.id)}</b><span>full weeks</span></div>
        </div>
      </div>

      <div className="fcard">
        <span className="eyebrow">Monthly journeys</span>
        {allSeries.map((x) => (
          <button key={x.id} className={'serrow' + (x.id === seriesId ? ' on' : '')} onClick={() => setSeriesId(x.id)}>
            <span className="sr-dot" style={{ background: x.accent }} />
            <span className="sr-meta"><b>{x.title}</b><small>{x.month} {x.year} · {x.audience}</small></span>
            {x.id === seriesId ? <i>Now</i> : <i>Open</i>}
          </button>
        ))}
      </div>

      {st.role === 'parent' && (
        <div className="fcard">
          <span className="eyebrow">Your children</span>
          <div className="kidchips">
            {st.kids.map((k, i) => (
              <button key={i} className="kchip" onClick={() => removeKid(i)}>{k.emoji} {k.name} <i>✕</i></button>
            ))}
            {st.kids.length === 0 && <p className="fp muted">No children added yet.</p>}
          </div>
          <form className="addrow" onSubmit={(e) => {
            e.preventDefault()
            if (!kid.trim()) return
            addKid({ name: kid.trim(), emoji: '🌟' }); setKid('')
          }}>
            <input value={kid} onChange={(e) => setKid(e.target.value)} placeholder="Add a child’s name" maxLength={20} />
            <button type="submit">Add</button>
          </form>
        </div>
      )}

      <GodsUniversity />

      {install && (
        <div className="fcard">
          <span className="eyebrow">Install</span>
          <p className="fp">Put KIND on your home screen — it opens full-screen and works offline.</p>
          <button className="btn" onClick={() => { install.prompt(); setInstall(null) }}>Add to home screen</button>
        </div>
      )}

      <div className="fcard">
        <span className="eyebrow">Kids Inspiring Nation</span>
        <div className="linkgrid">
          <a href={SITE} target="_blank" rel="noopener">Our website ↗</a>
          <a href={s.channel} target="_blank" rel="noopener">YouTube channel ↗</a>
          <a href={LINKS.gu} target="_blank" rel="noopener">goDs University ↗</a>
          <a href={LINKS.give} target="_blank" rel="noopener">Give ↗</a>
          <a href={LINKS.whatsapp} target="_blank" rel="noopener">WhatsApp channel ↗</a>
          <a href={LINKS.telegram} target="_blank" rel="noopener">Telegram ↗</a>
        </div>
      </div>

      <button className="linkbtn danger" onClick={() => {
        if (confirm('Erase your streak, codes and ledger on this device?')) { resetAll(); location.reload() }
      }}>Reset everything on this device</button>
    </section>
  )
}
