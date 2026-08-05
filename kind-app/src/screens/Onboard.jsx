import { useEffect, useState } from 'react'
import { completeOnboarding } from '../store.js'
import { Icon } from '../icons.jsx'
import { buzz, reducedMotion } from './bits.jsx'

/** The mark, then three questions. Nothing decorative, nothing asked twice. */
export default function Onboard({ s, onboarded, done }) {
  const [phase, setPhase] = useState('mark')
  useEffect(() => {
    const id = setTimeout(() => setPhase(onboarded ? 'done' : 'ask'), reducedMotion() ? 300 : 1700)
    return () => clearTimeout(id)
  }, [onboarded])
  useEffect(() => { if (phase === 'done') done() }, [phase])

  if (phase !== 'ask')
    return (
      <div className="open-screen">
        <div className="mark"><span>K</span><span>I</span><span>N</span><span>D</span></div>
        <p className="mark-sub">Raising goDs, Building Nations</p>
      </div>
    )

  return <Ask s={s} finish={done} />
}

function Ask({ s, finish }) {
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('')
  const [name, setName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [kids, setKids] = useState([])
  const [kid, setKid] = useState('')

  const next = () => { buzz(6); setStep(step + 1) }
  const go = () => {
    completeOnboarding({ name: name.trim(), role: role || 'family', emoji: '', familyName: familyName.trim(), kids })
    buzz([8, 26, 10])
    finish()
  }

  return (
    <div className="onb">
      <div className="onb-rail">{[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>

      {step === 0 && (
        <div className="onb-step">
          <span className="kicker">{s.month} {s.year}</span>
          <h1 className="title">{s.title}</h1>
          <p className="dek">{s.subtitle}. A two-minute deck each day, and a pass to keep for every day you show up.</p>
          <p className="onb-q">Who’s holding the phone?</p>
          <button className="choice" onClick={() => { setRole('teen'); next() }}>
            <span className="choice-n">01</span>
            <span className="choice-m"><b>I’m a teen</b><small>This month was written for you</small></span>
            <span className="row-a"><Icon.chevron /></span>
          </button>
          <button className="choice" onClick={() => { setRole('parent'); next() }}>
            <span className="choice-n">02</span>
            <span className="choice-m"><b>I’m a parent</b><small>Lead it with your children</small></span>
            <span className="row-a"><Icon.chevron /></span>
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="onb-step">
          <span className="kicker">Two of three</span>
          <h1 className="title">What should we call you?</h1>
          <div style={{ marginTop: 26 }}>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="First name" maxLength={20} autoFocus />
          </div>
          <div className="onb-foot">
            <button className="btn wide" disabled={!name.trim()} onClick={next}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="onb-step">
          <span className="kicker">Three of three</span>
          <h1 className="title">{role === 'parent' ? 'Who’s doing it with you?' : 'That’s everything'}</h1>
          {role === 'parent' ? (
            <>
              <div style={{ marginTop: 24, display: 'grid', gap: 10 }}>
                <input className="field" value={familyName} onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Family name" maxLength={24} />
                <form className="inline-form" onSubmit={(e) => {
                  e.preventDefault()
                  if (!kid.trim()) return
                  setKids([...kids, { name: kid.trim() }]); setKid(''); buzz(6)
                }}>
                  <input className="field" value={kid} onChange={(e) => setKid(e.target.value)}
                    placeholder="Add a child’s name" maxLength={20} />
                  <button className="link" type="submit">Add</button>
                </form>
              </div>
              {kids.length > 0 && (
                <div className="chips" style={{ padding: '14px 0 0' }}>
                  {kids.map((k, i) => (
                    <button key={i} className="chip" onClick={() => setKids(kids.filter((_, x) => x !== i))}>
                      {k.name}<Icon.close />
                    </button>
                  ))}
                </div>
              )}
              <p className="dek" style={{ marginTop: 18 }}>All of this can change later. Nothing leaves this device.</p>
            </>
          ) : (
            <p className="dek">Your answers and your passes stay on this device — {s.codes.length} passes to
              collect this month.</p>
          )}
          <div className="onb-foot">
            <button className="btn wide" onClick={go}>Open day one</button>
          </div>
        </div>
      )}
    </div>
  )
}
