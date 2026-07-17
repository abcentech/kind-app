import { useEffect, useState } from 'react'
import { Stars, buzz } from './bits.jsx'
import { completeOnboarding } from '../store.js'

const KID_EMOJIS = ['🦁', '🦋', '🌟', '🦅', '🌺', '🚀', '🐘', '🎈']

/** Animated opening: sun rises over the hills, wordmark blooms, then
 *  first-run onboarding (family name + kids). Skips itself after first run. */
export default function Splash({ onboarded, done }) {
  const [phase, setPhase] = useState('rise') // rise → brand → (form | out)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('brand'), 900)
    const t2 = setTimeout(() => (onboarded ? out() : setPhase('form')), 2300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  const [leaving, setLeaving] = useState(false)
  const out = () => { setLeaving(true); setTimeout(done, 650) }

  return (
    <div className={'splash' + (leaving ? ' leave' : '')}>
      <Stars n={30} />
      <div className={'sun ' + phase} />
      <svg className="s-hills" viewBox="0 0 396 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 120 L0 70 Q70 24 150 58 T300 48 T396 60 L396 120 Z" fill="rgba(10,40,26,.6)" />
        <path d="M0 120 L0 88 Q90 56 190 80 T396 78 L396 120 Z" fill="rgba(8,32,20,.9)" />
      </svg>

      {phase !== 'rise' && (
        <div className="s-brand">
          <div className="s-logo">🌿</div>
          <h1>KIND</h1>
          <p>Raising goDs · Building Nations</p>
        </div>
      )}

      {phase === 'form' && <Onboard onDone={out} />}
    </div>
  )
}

function Onboard({ onDone }) {
  const [step, setStep] = useState(0)
  const [family, setFamily] = useState('')
  const [kids, setKids] = useState([])
  const [kidName, setKidName] = useState('')

  const addKid = () => {
    const name = kidName.trim()
    if (!name) return
    setKids([...kids, { name, emoji: KID_EMOJIS[kids.length % KID_EMOJIS.length] }])
    setKidName('')
    buzz(12)
  }
  const finish = () => {
    completeOnboarding(family.trim() || 'KIND', kids)
    buzz([20, 40, 30])
    onDone()
  }

  return (
    <div className="s-form">
      {step === 0 && (
        <>
          <h2>What's your family name?</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (family.trim()) setStep(1) }}>
            <input value={family} onChange={(e) => setFamily(e.target.value)} placeholder="e.g. Ehimen" maxLength={24} autoFocus />
            <button type="submit" className="s-btn" disabled={!family.trim()}>Next →</button>
          </form>
          <button className="s-skip" onClick={finish}>Skip for now</button>
        </>
      )}
      {step === 1 && (
        <>
          <h2>Who's on the journey?</h2>
          <p className="s-sub">Add your children — each gets their own gems 💎</p>
          <div className="s-kids">
            {kids.map((k, i) => <span key={i} className="s-kid">{k.emoji} {k.name}</span>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); addKid() }}>
            <input value={kidName} onChange={(e) => setKidName(e.target.value)} placeholder="Child's name" maxLength={18} autoFocus />
            <button type="submit" className="s-btn ghost" disabled={!kidName.trim()}>+ Add</button>
          </form>
          <button className="s-btn" onClick={finish}>
            {kids.length ? `Start the journey with ${kids.length} ${kids.length === 1 ? 'child' : 'children'} →` : 'Start the journey →'}
          </button>
        </>
      )}
    </div>
  )
}
