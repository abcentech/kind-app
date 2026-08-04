import { useEffect, useState } from 'react'
import { completeOnboarding } from '../store.js'
import { buzz, reducedMotion, Stars } from './bits.jsx'

const EMOJIS = ['🌟', '🦁', '🦋', '🦅', '🌺', '🚀', '🐘', '🎈', '🔑', '👑']

/** Splash, then three questions. Nothing optional is asked twice. */
export default function Onboard({ s, onboarded, done }) {
  const [phase, setPhase] = useState('splash')
  useEffect(() => {
    const wait = reducedMotion() ? 400 : 2100
    const id = setTimeout(() => setPhase(onboarded ? 'done' : 'ask'), wait)
    return () => clearTimeout(id)
  }, [onboarded])
  useEffect(() => { if (phase === 'done') done() }, [phase])

  if (phase !== 'ask')
    return (
      <div className="splash">
        <Stars n={26} />
        <div className="sun" />
        <div className="wordmark">
          <span>K</span><span>I</span><span>N</span><span>D</span>
        </div>
        <p className="tag">Raising goDs, Building Nations</p>
      </div>
    )

  return <Ask s={s} finish={done} />
}

function Ask({ s, finish }) {
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('')
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🌟')
  const [familyName, setFamilyName] = useState('')
  const [kids, setKids] = useState([])
  const [kid, setKid] = useState('')

  const next = () => { buzz(10); setStep(step + 1) }
  const go = () => {
    completeOnboarding({ name: name.trim(), role: role || 'family', emoji, familyName: familyName.trim(), kids })
    buzz([12, 40, 18])
    finish()
  }

  return (
    <div className="onb">
      <div className="onb-pips">{[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>

      {step === 0 && (
        <div className="onb-step">
          <span className="eyebrow">Welcome to the KIND App</span>
          <h1>{s.title}</h1>
          <p className="lede">{s.month} {s.year} — {s.subtitle}. A two-minute daily deck, a code card for every day you show up.</p>
          <p className="q">Who’s holding the phone?</p>
          <div className="pickrow">
            <button className={'pick' + (role === 'teen' ? ' on' : '')} onClick={() => { setRole('teen'); next() }}>
              <b>🎧</b>I’m a teen<small>This month is written for you</small>
            </button>
            <button className={'pick' + (role === 'parent' ? ' on' : '')} onClick={() => { setRole('parent'); next() }}>
              <b>🏠</b>I’m a parent<small>Lead it with your children</small>
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="onb-step">
          <span className="eyebrow">Step 2 of 3</span>
          <h1>What should we call you?</h1>
          <input className="bigin" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Your first name" maxLength={20} autoFocus />
          <p className="q">Pick your mark</p>
          <div className="emojirow">
            {EMOJIS.map((e) => (
              <button key={e} className={'em' + (emoji === e ? ' on' : '')} onClick={() => { setEmoji(e); buzz(6) }}>{e}</button>
            ))}
          </div>
          <button className="btn big" disabled={!name.trim()} onClick={next}>Continue</button>
        </div>
      )}

      {step === 2 && (
        <div className="onb-step">
          <span className="eyebrow">Step 3 of 3</span>
          <h1>{role === 'parent' ? 'Who’s doing it with you?' : 'Almost in'}</h1>
          {role === 'parent' ? (
            <>
              <input className="bigin" value={familyName} onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Family name (e.g. Adeyemi)" maxLength={24} />
              <form className="addrow" onSubmit={(e) => {
                e.preventDefault()
                if (!kid.trim()) return
                setKids([...kids, { name: kid.trim(), emoji: EMOJIS[(kids.length + 1) % EMOJIS.length] }])
                setKid(''); buzz(8)
              }}>
                <input value={kid} onChange={(e) => setKid(e.target.value)} placeholder="Add a child’s name" maxLength={20} />
                <button type="submit">Add</button>
              </form>
              <div className="kidchips">
                {kids.map((k, i) => (
                  <button key={i} className="kchip" onClick={() => setKids(kids.filter((_, x) => x !== i))}>
                    {k.emoji} {k.name} <i>✕</i>
                  </button>
                ))}
              </div>
              <p className="fine">You can change all of this later. Nothing leaves this device unless you sign in.</p>
            </>
          ) : (
            <p className="lede">Your answers and code cards stay on this device. Finish a day, unlock a code —
              {' '}{s.codes.length} of them this month.</p>
          )}
          <button className="btn big" onClick={go}>Start day one</button>
        </div>
      )}
    </div>
  )
}
