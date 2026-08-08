import { useEffect, useState } from 'react'
import { completeOnboarding } from '../store.js'
import { Icon } from '../icons.jsx'
import { buzz, reducedMotion } from './bits.jsx'

/** The mark, then three quick questions. */
export default function Onboard({ s, onboarded, done }) {
  const [phase, setPhase] = useState('mark')
  useEffect(() => {
    const id = setTimeout(() => setPhase(onboarded ? 'done' : 'ask'), reducedMotion() ? 300 : 1500)
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

  const next = () => { buzz(8); setStep(step + 1) }
  const go = () => {
    completeOnboarding({ name: name.trim(), role: role || 'family', emoji: '', familyName: familyName.trim(), kids })
    buzz([10, 30, 12])
    finish()
  }

  return (
    <div className="onb">
      <div className="onb-track">{[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>

      {step === 0 && (
        <div className="onb-step">
          <span className="kicker">{s.month} {s.year} course</span>
          <h1>{s.title}</h1>
          <p className="dek">{s.subtitle}. {s.calendar.length} lessons, a pass to collect for each one,
            and a streak worth protecting.</p>
          <div className="mascot" style={{ margin: '26px 0 18px' }}>
            <span className="pip" style={{ '--unit': 'var(--grass)', '--unit-e': 'var(--grass-e)' }}><Icon.star /></span>
            <p className="speech" style={{ margin: 0 }}>Who’s holding the phone?</p>
          </div>
          <button className="pick" onClick={() => { setRole('teen'); next() }}>
            <span className="pip"><Icon.bolt /></span>
            <span><b>I’m a teen</b><small>This course was written for you</small></span>
          </button>
          <button className="pick" onClick={() => { setRole('parent'); next() }}>
            <span className="pip"><Icon.home /></span>
            <span><b>I’m a parent</b><small>Lead it with your children</small></span>
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="onb-step">
          <span className="kicker">Step 2 of 3</span>
          <h1>What should we call you?</h1>
          <div style={{ marginTop: 22 }}>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="First name" maxLength={20} autoFocus />
          </div>
          <div className="onb-foot">
            <button className="btn wide grass" disabled={!name.trim()} onClick={next}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="onb-step">
          <span className="kicker">Step 3 of 3</span>
          <h1>{role === 'parent' ? 'Who’s learning with you?' : 'You’re all set'}</h1>
          {role === 'parent' ? (
            <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
              <input className="field" value={familyName} onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Family name" maxLength={24} />
              <form className="inline" onSubmit={(e) => {
                e.preventDefault()
                if (!kid.trim()) return
                setKids([...kids, { name: kid.trim() }]); setKid(''); buzz(6)
              }}>
                <input className="field" value={kid} onChange={(e) => setKid(e.target.value)}
                  placeholder="Add a child’s name" maxLength={20} />
                <button className="btn-plain" type="submit">Add</button>
              </form>
              {kids.length > 0 && (
                <div className="chips">
                  {kids.map((k, i) => (
                    <button key={i} className="chip" onClick={() => setKids(kids.filter((_, x) => x !== i))}>
                      {k.name}<Icon.close />
                    </button>
                  ))}
                </div>
              )}
              <p className="dek">All of this can change later. Nothing leaves this device.</p>
            </div>
          ) : (
            <p className="dek" style={{ marginTop: 16 }}>Your XP, streak and passes live on this device.
              Finish a lesson every day to keep the streak alive.</p>
          )}
          <div className="onb-foot">
            <button className="btn wide grass" onClick={go}>Start unit 1</button>
          </div>
        </div>
      )}
    </div>
  )
}
