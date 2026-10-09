// slides-word · Pray — the prayer on a slow breathing ring (transform + opacity only, one in-and-out every ~9 s, a still halo in
// lite/reduced motion). Paragraphs arrive one by one; the closing Amen is set apart under an ignition rule. The hint beneath
// comes from copy.js: pray it, or say it in your own words.
import { useEffect } from 'react'
import { lessonCopy } from '../../../copy.js'
import { Emph, Eyebrow, readScale, smart } from './Verse.jsx'

const AMEN = /^(.*?)\s*\bAmen\b[.!\s]*$/is
const MAX_STAGGER = 8                       // paragraphs beyond this arrive together

/** body → { paras:[string], amen:boolean }. Hard-wrapped lines are re-flowed; blank lines are the author's breaths. */
export function prayer(body) {
  const paras = String(body || '').split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
  let amen = false
  if (paras.length) {
    const m = AMEN.exec(paras[paras.length - 1])
    if (m) { amen = true; if (m[1].trim()) paras[paras.length - 1] = m[1].trim(); else paras.pop() }
  }
  return { paras: paras.map(smart), amen }
}

export default function Pray({ card, scale, active, setFooter }) {
  const on = active !== false
  const { paras, amen } = prayer(card.body)

  // The shell labels CONTINUE for this slide itself; asking again after the shell's own reset keeps the word 'Amen' either way.
  useEffect(() => {
    if (!on || !setFooter) return undefined
    const t = setTimeout(() => setFooter({ label: lessonCopy.cta.prayer }), 0)
    return () => clearTimeout(t)
  }, [on, setFooter])

  return (
    <section className="slw slw-pray" data-active={on ? '' : undefined} style={readScale(scale)} aria-label={card.label}>
      <div className="slw-pray__stage">
        <Eyebrow card={card} fallback="prayer" />
        <div className="slw-ring" aria-hidden="true"><i /><i /><i /></div>
        <div className="slw-pray__body">
          {paras.map((p, i) => (
            <p key={i} className="slw-pray__p slw-in" data-short={p.length < 120 ? '' : undefined} style={{ '--i': 1 + Math.min(i, MAX_STAGGER) }}><Emph t={p} /></p>
          ))}
        </div>
        {amen ? (
          <p className="slw-amen slw-in" style={{ '--i': 2 + Math.min(paras.length, MAX_STAGGER) }}>
            <i className="slw-rule" aria-hidden="true" style={{ '--i': 2 + Math.min(paras.length, MAX_STAGGER) }} />
            Amen.
          </p>
        ) : null}
        <p className="slw-pray__hint slw-in" style={{ '--i': 3 + Math.min(paras.length, MAX_STAGGER) }}>{lessonCopy.pray}</p>
      </div>
    </section>
  )
}
