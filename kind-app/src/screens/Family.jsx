import { useEffect, useState } from 'react'
import { series, calendar, todayNumber, cap } from '../lib.js'
import { useStore, daysCompleted, perfectWeeks, setFamilyName } from '../store.js'
import { apiConfigured, loggedIn, requestCode, verifyCode, fetchFamily, logout } from '../api.js'

const BADGES = [
  { icon: '🌅', name: 'First Step', test: (done) => done.includes(1) },
  { icon: '📖', name: 'First 7 Days', test: (done) => done.length >= 7 },
  ...series.weeks.map((w, wi) => ({
    icon: w.emoji, name: cap(w.f),
    test: (done) => calendar.filter((d) => d.week === wi).every((d) => done.includes(d.day)),
  })),
  { icon: '🏁', name: 'Finisher', test: (done) => done.length >= calendar.length },
]

export default function Family({ goJourney }) {
  const s = useStore()
  const done = daysCompleted(s)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(s.familyName)
  const today = todayNumber()
  const nextSelah = calendar.find((d) => d.day >= today && (d.type === 'selah' || d.type === 'review'))

  return (
    <section className="screen">
      <div className="fhead">
        <span className="eyebrow">Parent Corner</span>
        {editing ? (
          <form className="namef" onSubmit={(e) => { e.preventDefault(); setFamilyName(name.trim()); setEditing(false) }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Adeyemi" autoFocus maxLength={24} />
            <button type="submit">Save</button>
          </form>
        ) : (
          <h1 onClick={() => setEditing(true)} title="Tap to edit">
            {s.familyName ? `The ${s.familyName} Family` : 'Your Family'} <span className="pencil">✎</span>
          </h1>
        )}
        <div className="sub">Raising goDs, building nations — one declaration at a time.</div>
      </div>

      <div className="fcard pull">
        <span className="eyebrow">This month together</span>
        <div className="bigstats">
          <div><b>🔥 {s.streak}</b><span>day streak</span></div>
          <div><b>{done.length}<i>/{calendar.length}</i></b><span>days done</span></div>
          <div><b>⭐ {perfectWeeks(s)}</b><span>perfect weeks</span></div>
          <div><b>💎 {s.gems}</b><span>gems earned</span></div>
        </div>
      </div>

      <GodsUniversity />

      <div className="fcard">
        <span className="eyebrow">Badge shelf</span>
        <div className="badges">
          {BADGES.map((b) => (
            <div key={b.name} className={'badge' + (b.test(done) ? '' : ' locked')}>
              <div className="bic">{b.icon}</div>{b.name}
            </div>
          ))}
        </div>
      </div>

      {nextSelah && (
        <div className="fcard">
          <span className="eyebrow">{nextSelah.day === today ? 'Selah — today!' : `Selah — Day ${nextSelah.day}`}</span>
          <p className="fp">No new episode that day. Review the week together, check memory verses, and do one family activity.</p>
          <button className="btn ghost" onClick={goJourney}>See it on the journey</button>
        </div>
      )}
    </section>
  )
}

/* ---- goDs University: parent login + children attendance ---------------- */

function GodsUniversity() {
  const [stage, setStage] = useState(loggedIn() ? 'family' : 'intro') // intro | email | code | family
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [family, setFamily] = useState(null)

  useEffect(() => {
    if (stage === 'family' && loggedIn()) {
      fetchFamily().then((r) => {
        if (r.ok) setFamily(r)
        else { setFamily(null); setStage('intro'); setError(r.error === 'unauthorized' ? 'Session expired — sign in again.' : '') }
      }).catch(() => setError('Could not reach the server. Check your connection.'))
    }
  }, [stage])

  const ERRORS = {
    unknown_email: 'This email is not registered yet. Contact the goDs University team to link your family.',
    invalid_email: 'That does not look like an email address.',
    bad_code: 'Wrong or expired code — request a new one.',
  }

  const submitEmail = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const r = await requestCode(email.trim())
      if (r.ok) setStage('code')
      else setError(ERRORS[r.error] || 'Something went wrong — try again.')
    } catch { setError('Could not reach the server. Check your connection.') }
    setBusy(false)
  }

  const submitCode = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const r = await verifyCode(email.trim(), code.trim())
      if (r.ok) setStage('family')
      else setError(ERRORS[r.error] || 'Something went wrong — try again.')
    } catch { setError('Could not reach the server. Check your connection.') }
    setBusy(false)
  }

  if (!apiConfigured())
    return (
      <div className="fcard gu">
        <span className="eyebrow">goDs University · Attendance</span>
        <p className="fp">Soon you'll sign in here with your email and see each of your children's weekly attendance, invested minutes and teacher reports — straight from the goDs University records.</p>
        <p className="fp muted">Parent sign-in is being switched on — watch this space.</p>
      </div>
    )

  if (stage === 'family' && family)
    return (
      <div className="fcard gu">
        <div className="gu-head">
          <span className="eyebrow">goDs University · {family.parent.name || family.parent.email}</span>
          <button className="linkbtn" onClick={() => { logout(); setFamily(null); setStage('intro') }}>Sign out</button>
        </div>
        {family.children.map((c) => <Child key={c.code} c={c} />)}
      </div>
    )

  return (
    <div className="fcard gu">
      <span className="eyebrow">goDs University · Attendance</span>
      {stage === 'intro' && (
        <>
          <p className="fp">See your children's weekly attendance, invested minutes and teacher reports.</p>
          <button className="btn" onClick={() => setStage('email')}>Parent sign in</button>
        </>
      )}
      {stage === 'email' && (
        <form className="namef" onSubmit={submitEmail}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" autoFocus />
          <button type="submit" disabled={busy}>{busy ? '…' : 'Send code'}</button>
        </form>
      )}
      {stage === 'code' && (
        <>
          <p className="fp">We emailed a 6-digit code to <b>{email}</b>.</p>
          <form className="namef" onSubmit={submitCode}>
            <input inputMode="numeric" pattern="[0-9]{6}" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" autoFocus />
            <button type="submit" disabled={busy}>{busy ? '…' : 'Sign in'}</button>
          </form>
        </>
      )}
      {stage === 'family' && !family && <p className="fp">Loading your family…</p>}
      {error && <p className="fp err">{error}</p>}
    </div>
  )
}

function Child({ c }) {
  const [open, setOpen] = useState(false)
  const last = c.reports[c.reports.length - 1]
  return (
    <div className="child">
      <button className="child-head" onClick={() => setOpen(!open)}>
        <span className="avatar a1">{(c.name || '?')[0]}</span>
        <span className="cmeta">
          <b>{c.name}</b>
          <small>{c.pathway}{c.kin_no ? ' · ' + c.kin_no : ''}</small>
        </span>
        <span className="att-pill" data-good={c.summary.rate >= 75}>
          {c.summary.rate == null ? '—' : c.summary.rate + '%'}
        </span>
      </button>
      <div className="att-strip" aria-label="last weeks attendance">
        {c.attendance.map((a, i) => (
          <span key={i} className={'wk' + (a.attendance ? ' in' : '')} title={`${a.week}: ${a.attendance ? 'present' : 'absent'} · ${a.invested_minutes} min`} />
        ))}
      </div>
      {open && (
        <div className="child-body">
          <div className="bigstats" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div><b>{c.summary.present}<i>/{c.summary.weeks}</i></b><span>weeks present</span></div>
            <div><b>{c.summary.minutes}</b><span>invested min</span></div>
            <div><b>{c.summary.rate ?? '—'}%</b><span>attendance</span></div>
          </div>
          {last && (
            <div className="report">
              {last.celebration && <p>🎉 <b>Celebrate:</b> {last.celebration}</p>}
              {last.parent_action && <p>🏠 <b>Your part this week:</b> {last.parent_action}</p>}
              {last.growth_area && <p>🌱 <b>Growing in:</b> {last.growth_area}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
