import { useEffect, useId, useState } from 'react'
import { apiConfigured, loggedIn, requestCode, verifyCode, fetchFamily, logout } from '../api.js'
import { Icon } from '../icons.jsx'
import { Button, Label, Panel, Skeleton, Stat, Tag, TextField } from '../ui/index.js'

/**
 * Parent sign-in over the goDs University records: attendance, minutes, reports.
 * v7 skin over the v6 flow: the stages (intro → email → code → family), the API calls and the demo mode are unchanged.
 */
// `configured` exists only so a playground can show the signed-out stages; the app never passes it.
export default function GodsUniversity({ configured = apiConfigured() } = {}) {
  const [stage, setStage] = useState(configured && loggedIn() ? 'family' : 'intro')
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

  if (!configured)
    return (
      <Panel tone="sunk" padded className="mei-gu mei-gu--demo">
        <div className="mei-gu__top">
          <Tag tone="tele" led>Switching on shortly</Tag>
        </div>
        <p className="mei-gu__dek">Sign in here to see each child’s weekly attendance, invested minutes and teacher
          reports, straight from the goDs University records.</p>
        <div className="mei-gu__ghost" aria-hidden="true">
          <Stat size="sm" label="Present" value="—" />
          <Stat size="sm" label="Invested" value="—" unit="min" />
          <Stat size="sm" label="Attendance" value="—" unit="%" />
        </div>
      </Panel>
    )

  if (stage === 'family' && family)
    return (
      <div className="mei-gu">
        <Panel pad="sm" className="mei-gu__who">
          <span className="mei-gu__icon" aria-hidden="true"><Icon name="user" size={20} /></span>
          <span className="mei-gu__who-t"><b>{family.parent.name || family.parent.email}</b><small>Signed in</small></span>
          <Button variant="ghost" size="sm" onClick={() => { logout(); setFamily(null); setStage('intro') }}>Sign out</Button>
        </Panel>
        {family.children.map((c) => <Child key={c.code} c={c} />)}
      </div>
    )

  return (
    <Panel padded className="mei-gu" aria-busy={busy || (stage === 'family' && !family) || undefined}>
      {stage === 'intro' && (
        <div className="mei-gu__stack">
          <Label mono tone="tele" dot>Parent access</Label>
          <p className="mei-gu__dek">See each child’s weekly attendance, invested minutes and teacher reports.</p>
          <Button variant="secondary" icon="user" onClick={() => setStage('email')}>Parent sign in</Button>
        </div>
      )}
      {stage === 'email' && (
        <form className="mei-gu__stack" onSubmit={run(() => requestCode(email.trim()), 'code')}>
          <TextField label="Parent email" type="email" required value={email} onChange={setEmail} icon="mail"
            placeholder="your@email.com" autoComplete="email" enterKeyHint="send" autoFocus />
          <Button type="submit" full loading={busy} iconRight="arrowRight">Send code</Button>
        </form>
      )}
      {stage === 'code' && (
        <form className="mei-gu__stack" onSubmit={run(() => verifyCode(email.trim(), code.trim()), 'family')}>
          <p className="mei-gu__dek">We emailed a six-digit code to <b>{email}</b>.</p>
          <TextField label="Six-digit code" inputMode="numeric" pattern="[0-9]{6}" required value={code} onChange={setCode} icon="key"
            placeholder="123456" autoComplete="one-time-code" enterKeyHint="go" className="mei-gu__code" autoFocus />
          <Button type="submit" full loading={busy} iconRight="check">Sign in</Button>
        </form>
      )}
      {stage === 'family' && !family && (
        <div className="mei-gu__stack" role="status">
          <p className="mei-gu__dek">Loading your family…</p>
          <Skeleton h={56} r="var(--r-sm)" />
        </div>
      )}
      {error && <p className="mei-gu__err" role="alert"><Icon name="warning" size={16} /><span>{error}</span></p>}
    </Panel>
  )
}

export function Child({ c }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const last = c.reports[c.reports.length - 1]
  const rate = c.summary.rate
  const present = c.attendance.filter((a) => a.attendance).length
  return (
    <Panel className="mei-gu__child" data-open={open ? '' : undefined}>
      <button type="button" className="mei-gu__head" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span className="mei-gu__av" aria-hidden="true">{(c.name || '?')[0]}</span>
        <span className="mei-gu__who-t"><b>{c.name}</b><small>{c.pathway}{c.kin_no ? ' · ' + c.kin_no : ''}</small></span>
        <span className="mei-gu__rate">{rate == null ? '—' : <>{rate}<i>%</i></>}</span>
        <Icon name="chevronDown" size={16} className="mei-gu__chev" />
      </button>
      <div className="mei-gu__body">
        <div className="mei-gu__strip" role="img" aria-label={`Recent attendance: present ${present} of ${c.attendance.length} weeks`}>
          {c.attendance.map((a, i) => (
            <i key={i} data-in={a.attendance ? '' : undefined}
              title={`${a.week}: ${a.attendance ? 'present' : 'absent'} · ${a.invested_minutes} min`} />
          ))}
        </div>
      </div>
      {open && (
        <div className="mei-gu__more" id={id}>
          <div className="mei-gu__figs">
            <Stat size="sm" label="Present" value={`${c.summary.present}/${c.summary.weeks}`} />
            <Stat size="sm" label="Invested" value={c.summary.minutes} unit="min" />
            <Stat size="sm" label="Attendance" value={rate ?? '—'} unit={rate == null ? undefined : '%'} />
          </div>
          {last && (last.celebration || last.parent_action || last.growth_area) && (
            <dl className="mei-gu__notes">
              {last.celebration && <Note icon="sparkle" tone="go" k="Celebrate" v={last.celebration} />}
              {last.parent_action && <Note icon="target" tone="tele" k="Your part this week" v={last.parent_action} />}
              {last.growth_area && <Note icon="arrowUp" tone="neutral" k="Growing in" v={last.growth_area} />}
            </dl>
          )}
        </div>
      )}
    </Panel>
  )
}

function Note({ icon, tone, k, v }) {
  return (
    <div className="mei-gu__note" data-tone={tone}>
      <dt><Icon name={icon} size={16} />{k}</dt>
      <dd>{v}</dd>
    </div>
  )
}
