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
      <div className="hdr">
        <div className="hdr-l" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span className="avatar-lg">{(st.name || '?').trim().charAt(0).toUpperCase()}</span>
          <div style={{ minWidth: 0 }}>
            {editing ? (
              <form className="inline-form" onSubmit={(e) => { e.preventDefault(); updateProfile({ name: name.trim() }); setEditing(false) }}>
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={20} />
                <button className="link" type="submit">Save</button>
              </form>
            ) : (
              <h1 className="title" style={{ fontSize: 26 }} onClick={() => setEditing(true)}>{st.name || 'You'}</h1>
            )}
            <p className="dek">{st.familyName ? `The ${st.familyName} family` : st.role === 'parent' ? 'Parent' : 'Steward'}</p>
          </div>
        </div>
      </div>

      <div className="figures" style={{ marginBottom: 26, gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div><b>{st.streak}</b><span>streak</span></div>
        <div><b>{done.length}</b><span>days</span></div>
        <div><b>{unlockedCards(st, s.id).length}</b><span>passes</span></div>
        <div><b>{perfectWeeks(st, s.id)}</b><span>full weeks</span></div>
      </div>

      <p className="group-t">Monthly journeys</p>
      <div className="group">
        {allSeries.map((x) => (
          <button key={x.id} className="row inset" onClick={() => setSeriesId(x.id)}>
            <span className="dot" style={{ background: x.accent }} />
            <span className="row-m"><b>{x.title}</b><small>{x.month} {x.year} · {x.audience}</small></span>
            <span className="row-a">{x.id === seriesId ? 'Now' : <Icon.chevron />}</span>
          </button>
        ))}
      </div>

      {st.role === 'parent' && (
        <>
          <p className="group-t">Your children</p>
          <div className="group">
            {st.kids.length > 0 && (
              <div className="chips">
                {st.kids.map((k, i) => (
                  <button key={i} className="chip" onClick={() => removeKid(i)}>{k.name}<Icon.close /></button>
                ))}
              </div>
            )}
            <form className="row" onSubmit={(e) => {
              e.preventDefault()
              if (!kid.trim()) return
              addKid({ name: kid.trim() }); setKid('')
            }}>
              <span className="row-m">
                <input className="field" style={{ background: 'none', height: 24, padding: 0 }}
                  value={kid} onChange={(e) => setKid(e.target.value)} placeholder="Add a child’s name" maxLength={20} />
              </span>
              <button className="row-a" type="submit" aria-label="Add"><Icon.plus /></button>
            </form>
          </div>
        </>
      )}

      <p className="group-t">goDs University</p>
      <div className="group"><GodsUniversity /></div>

      {install && (
        <>
          <p className="group-t">Install</p>
          <div className="group">
            <div className="pad">
              <p className="dek">Add KIND to your home screen. It opens full-screen and works offline.</p>
              <button className="btn quiet" onClick={() => { install.prompt(); setInstall(null) }}>Add to home screen</button>
            </div>
          </div>
        </>
      )}

      <p className="group-t">Kids Inspiring Nation</p>
      <div className="group">
        {links.map(([label, href]) => (
          <a className="row inset" key={label} href={href} target="_blank" rel="noopener">
            <span className="row-m"><b>{label}</b></span>
            <span className="row-a"><Icon.external /></span>
          </a>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button className="link destructive" onClick={() => {
          if (confirm('Erase your streak, passes and ledger on this device?')) { resetAll(); location.reload() }
        }}>Reset everything on this device</button>
      </div>
    </section>
  )
}
