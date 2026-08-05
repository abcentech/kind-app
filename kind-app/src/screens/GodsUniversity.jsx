import { useEffect, useState } from 'react'
import { apiConfigured, loggedIn, requestCode, verifyCode, fetchFamily, logout } from '../api.js'
import { Icon } from '../icons.jsx'

/** Parent sign-in over the goDs University records: attendance, minutes, reports. */
export default function GodsUniversity() {
  const [stage, setStage] = useState(loggedIn() ? 'family' : 'intro')
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
    unknown_email: 'That email is not registered yet. Ask the goDs University team to link your family.',
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
      <div className="pad">
        <p className="dek">Sign in here to see each child’s weekly attendance, invested minutes and teacher
          reports, straight from the goDs University records. Being switched on shortly.</p>
      </div>
    )

  if (stage === 'family' && family)
    return (
      <>
        <div className="row">
          <span className="row-m"><b>{family.parent.name || family.parent.email}</b><small>Signed in</small></span>
          <button className="link" onClick={() => { logout(); setFamily(null); setStage('intro') }}>Sign out</button>
        </div>
        {family.children.map((c) => <Child key={c.code} c={c} />)}
      </>
    )

  return (
    <div className="pad">
      {stage === 'intro' && (
        <>
          <p className="dek">See each child’s weekly attendance, invested minutes and teacher reports.</p>
          <button className="btn quiet" onClick={() => setStage('email')}>Parent sign in</button>
        </>
      )}
      {stage === 'email' && (
        <form className="inline-form" onSubmit={run(() => requestCode(email.trim()), 'code')}>
          <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com" autoFocus />
          <button className="link" type="submit" disabled={busy}>{busy ? '…' : 'Send code'}</button>
        </form>
      )}
      {stage === 'code' && (
        <>
          <p className="dek">We emailed a six-digit code to {email}.</p>
          <form className="inline-form" style={{ marginTop: 10 }} onSubmit={run(() => verifyCode(email.trim(), code.trim()), 'family')}>
            <input className="field" inputMode="numeric" pattern="[0-9]{6}" required value={code}
              onChange={(e) => setCode(e.target.value)} placeholder="123456" autoFocus />
            <button className="link" type="submit" disabled={busy}>{busy ? '…' : 'Sign in'}</button>
          </form>
        </>
      )}
      {stage === 'family' && !family && <p className="dek">Loading your family…</p>}
      {error && <p className="dek" style={{ color: '#e0523f' }}>{error}</p>}
    </div>
  )
}

function Child({ c }) {
  const [open, setOpen] = useState(false)
  const last = c.reports[c.reports.length - 1]
  return (
    <>
      <button className="row inset" onClick={() => setOpen(!open)}>
        <span className="avatar-lg" style={{ width: 30, height: 30, fontSize: 14 }}>{(c.name || '?')[0]}</span>
        <span className="row-m"><b>{c.name}</b><small>{c.pathway}{c.kin_no ? ' · ' + c.kin_no : ''}</small></span>
        <span className="row-a">{c.summary.rate == null ? '—' : c.summary.rate + '%'}<Icon.chevron /></span>
      </button>
      <div className="strip" aria-label="recent attendance">
        {c.attendance.map((a, i) => (
          <i key={i} className={a.attendance ? 'in' : ''}
            title={`${a.week}: ${a.attendance ? 'present' : 'absent'} · ${a.invested_minutes} min`} />
        ))}
      </div>
      {open && (
        <div className="pad">
          <div className="figures">
            <div><b>{c.summary.present}/{c.summary.weeks}</b><span>weeks present</span></div>
            <div><b>{c.summary.minutes}</b><span>invested min</span></div>
            <div><b>{c.summary.rate ?? '—'}%</b><span>attendance</span></div>
          </div>
          {last && (
            <div style={{ marginTop: 14 }}>
              {last.celebration && <p className="dek">Celebrate — {last.celebration}</p>}
              {last.parent_action && <p className="dek">Your part this week — {last.parent_action}</p>}
              {last.growth_area && <p className="dek">Growing in — {last.growth_area}</p>}
            </div>
          )}
        </div>
      )}
    </>
  )
}
