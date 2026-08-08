import { useEffect, useState } from 'react'
import { allSeries } from '../lib.js'
import { addKid, doneDays, perfectWeeks, removeKid, resetAll, unlockedCards, updateProfile, useStore } from '../store.js'
import { LINKS, SITE } from '../config.js'
import { Icon } from '../icons.jsx'
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
  const links = [
    ['Our website', SITE], ['YouTube channel', s.channel], ['goDs University', LINKS.gu],
    ['Give', LINKS.give], ['WhatsApp channel', LINKS.whatsapp], ['Telegram', LINKS.telegram],
  ]

  return (
    <section className="screen">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 22 }}>
        <span className="face">{(st.name || '?').trim().charAt(0).toUpperCase()}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          {editing ? (
            <form className="inline" onSubmit={(e) => { e.preventDefault(); updateProfile({ name: name.trim() }); setEditing(false) }}>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={20} />
              <button className="btn-plain" type="submit">Save</button>
            </form>
          ) : (
            <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 className="title">{st.name || 'You'}</h1><Icon.pen size={18} />
            </button>
          )}
          <p className="dek">{st.familyName ? `The ${st.familyName} family` : st.role === 'parent' ? 'Parent' : 'Steward'}</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><Icon.flame style={{ color: '#ff9600' }} /><div><b>{st.streak}</b><small>Day streak</small></div></div>
        <div className="stat"><Icon.bolt style={{ color: 'var(--bee-e)' }} /><div><b>{st.xp}</b><small>Total XP</small></div></div>
        <div className="stat"><Icon.vault style={{ color: 'var(--sky)' }} /><div><b>{unlockedCards(st, s.id).length}</b><small>Passes</small></div></div>
        <div className="stat"><Icon.trophy style={{ color: 'var(--grass)' }} /><div><b>{perfectWeeks(st, s.id)}</b><small>Units cleared</small></div></div>
      </div>

      <h2 style={{ fontSize: 19, marginBottom: 6 }}>Courses</h2>
      <div className="card">
        {allSeries.map((x) => (
          <button key={x.id} className="row" onClick={() => setSeriesId(x.id)}>
            <span className="dot" style={{ background: x.accent }} />
            <span className="row-m"><b>{x.title}</b><small>{x.month} {x.year} · {x.audience} · {
              done.length && x.id === seriesId
                ? `${done.length} of ${x.calendar.length} done`
                : `${x.calendar.length} lessons`
            }</small></span>
            <span className="row-a">{x.id === seriesId ? 'Active' : <Icon.chevron />}</span>
          </button>
        ))}
      </div>

      {st.role === 'parent' && (
        <>
          <h2 style={{ fontSize: 19, margin: '22px 0 6px' }}>Your children</h2>
          <div className="card">
            {st.kids.length > 0 && (
              <div className="chips" style={{ marginBottom: 12 }}>
                {st.kids.map((k, i) => (
                  <button key={i} className="chip" onClick={() => removeKid(i)}>{k.name}<Icon.close /></button>
                ))}
              </div>
            )}
            <form className="inline" onSubmit={(e) => {
              e.preventDefault()
              if (!kid.trim()) return
              addKid({ name: kid.trim() }); setKid('')
            }}>
              <input className="field" value={kid} onChange={(e) => setKid(e.target.value)}
                placeholder="Add a child’s name" maxLength={20} />
              <button className="btn-plain" type="submit">Add</button>
            </form>
          </div>
        </>
      )}

      <h2 style={{ fontSize: 19, margin: '22px 0 6px' }}>goDs University</h2>
      <div className="card"><GodsUniversity /></div>

      {install && (
        <div className="card sunk">
          <b style={{ fontSize: 17 }}>Install KIND</b>
          <p className="dek">Add it to your home screen — full screen, works offline.</p>
          <button className="btn grass" style={{ marginTop: 12 }} onClick={() => { install.prompt(); setInstall(null) }}>
            Add to home screen
          </button>
        </div>
      )}

      <h2 style={{ fontSize: 19, margin: '22px 0 6px' }}>Kids Inspiring Nation</h2>
      <div className="card">
        {links.map(([label, href]) => (
          <a className="row" key={label} href={href} target="_blank" rel="noopener">
            <span className="row-m"><b>{label}</b></span>
            <span className="row-a"><Icon.external /></span>
          </a>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button className="btn-plain danger" onClick={() => {
          if (confirm('Erase your streak, XP, passes and ledger on this device?')) { resetAll(); location.reload() }
        }}>Reset everything on this device</button>
      </div>
    </section>
  )
}
