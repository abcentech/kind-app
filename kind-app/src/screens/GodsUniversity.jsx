import { useEffect, useState } from 'react'
import { apiConfigured, loggedIn, requestCode, verifyCode, fetchFamily, logout } from '../api.js'

/** Parent sign-in over the goDs University records: attendance, minutes, reports. */
export default function GodsUniversity() {
  const [stage, setStage] = useState(loggedIn() ? 'family' : 'intro') // intro | email | code | family
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [family, setFamily] = useState(null)

  useEffect(() => {
    if (stage !== 'family' || !loggedIn()) return
    fetchFamily().then((r) => {
      if (r.ok) setFamily(r)
      else { setFamily(null); setStage('intro'); setError(r.error === 'unauthorized' ? 'Session expired — sign in again.' : '') }
    }).catch(() => setError('Could not reach the server. Check your connection.'))
  }, [stage])

  const ERRORS = {
    unknown_email: 'This email is not registered yet. Contact the goDs University team to link your family.',
    invalid_email: 'That does not look like an email address.',
    bad_code: 'Wrong or expired code — request a new one.',
  }
  const run = (fn, then) => async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const r = await fn()
      if (r.ok) setStage(then)
      else setError(ERRORS[r.error] || 'Something went wrong — try again.')
    } catch { setError('Could not reach the server. Check your connection.') }
    setBusy(false)
  }

  if (!apiConfigured())
    return (
      <div className="fcard gu">
        <span className="eyebrow">goDs University · Attendance</span>
        <p className="fp">Soon you’ll sign in here with your email and see each of your children’s weekly
          attendance, invested minutes and teacher reports — straight from the goDs University records.</p>
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
          <p className="fp">See your children’s weekly attendance, invested minutes and teacher reports.</p>
          <button className="btn" onClick={() => setStage('email')}>Parent sign in</button>
        </>
      )}
      {stage === 'email' && (
        <form className="namef" onSubmit={run(() => requestCode(email.trim()), 'code')}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" autoFocus />
          <button type="submit" disabled={busy}>{busy ? '…' : 'Send code'}</button>
        </form>
      )}
      {stage === 'code' && (
        <>
          <p className="fp">We emailed a 6-digit code to <b>{email}</b>.</p>
          <form className="namef" onSubmit={run(() => verifyCode(email.trim(), code.trim()), 'family')}>
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
        <span className="cmeta"><b>{c.name}</b><small>{c.pathway}{c.kin_no ? ' · ' + c.kin_no : ''}</small></span>
        <span className="att-pill" data-good={c.summary.rate >= 75}>{c.summary.rate == null ? '—' : c.summary.rate + '%'}</span>
      </button>
      <div className="att-strip" aria-label="last weeks attendance">
        {c.attendance.map((a, i) => (
          <span key={i} className={'wk' + (a.attendance ? ' in' : '')}
            title={`${a.week}: ${a.attendance ? 'present' : 'absent'} · ${a.invested_minutes} min`} />
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
