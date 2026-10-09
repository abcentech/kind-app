// slides-word · Verse — Scripture set like the cover of a book (docs/V7-DESIGN §3: 24–34 px Newsreader, balanced, hanging
// punctuation, the reference in mono beneath, a hairline of ignition between). Copy and Share live under it.
// Also exports the small helpers Do / Pray / Ask share (`smart`, `Eyebrow`, `readScale`) so slides-word stays four files.
import { useEffect, useRef, useState } from 'react'
import { Button, Label, toast } from '../../../ui/index.js'
import { toastCopy, errorCopy, slideLabel, labels } from '../../../copy.js'
import { dayLabel } from '../../../lib.js'

/** Straight quotes → typographic ones (content is typed on a keyboard; the Word is set like a book). */
export function smart(t) {
  return String(t || '')
    .replace(/(^|[\s(\[{—–-])"/g, '$1“').replace(/"/g, '”')
    .replace(/(^|[\s(\[{—–-])'/g, '$1‘').replace(/'/g, '’')
}

/** `**bold**` and `*italic*` from the content, as real elements (no innerHTML). */
export function Emph({ t }) {
  const out = []
  const re = /\*\*(.+?)\*\*|\*(\S[^*]*?)\*/g
  let i = 0, k = 0, m
  while ((m = re.exec(t))) {
    if (m.index > i) out.push(t.slice(i, m.index))
    out.push(m[1] ? <strong key={k++}>{m[1]}</strong> : <em key={k++}>{m[2]}</em>)
    i = m.index + m[0].length
  }
  if (i < t.length) out.push(t.slice(i))
  return out
}

/** The mono eyebrow every slide opens with: the card's own label (copy.js owns the words), a status dot beside it. */
export function Eyebrow({ card, fallback }) {
  const text = card?.label || slideLabel(fallback || card?.kind || 'verse')
  return <Label as="p" mono dot size="sm" className="slw-eyebrow slw-in" style={{ '--i': 0 }}>{text}</Label>
}

/** The shell sets --read-scale itself; setting it here too keeps a slide honest when it is rendered on its own. */
export const readScale = (scale) => (Number.isFinite(scale) && scale > 0 ? { '--read-scale': scale } : undefined)

/** 'Luke 16:13 (KJV)' → ['Luke 16:13', 'KJV'] */
function splitRef(ref) {
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(ref || '')
  return m ? [m[1], m[2]] : [ref || '', '']
}

async function copyText(str) {
  try { await navigator.clipboard.writeText(str); return true } catch { /* fall through to the old path */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = str; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
    document.body.appendChild(ta); ta.select()
    const ok = document.execCommand('copy'); ta.remove()
    return ok
  } catch { return false }
}

// UI words that copy.js does not own yet (see REQUESTS): 'Copy verse', 'Copied'.
const T = { copy: 'Copy verse', copied: 'Copied' }

const lenBucket = (n) => (n <= 72 ? 'xs' : n <= 130 ? 's' : n <= 190 ? 'm' : 'l')

export default function Verse({ card, s, day, scale, active, share }) {
  const on = active !== false
  const text = smart(card.body)
  const [ref, tr] = splitRef(card.ref)
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  const doCopy = async () => {
    const ok = await copyText(`“${text}” — ${card.ref || ''}`.trim())
    if (!ok) { const e = errorCopy('copy'); toast({ title: e.title, body: e.body, icon: e.icon, tone: e.tone }); return }
    toast(toastCopy('copied'))
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1800)
  }
  const doShare = () => share?.({
    kind: 'verse',
    data: { text: card.body, ref: card.ref, title: s ? dayLabel(s, day) : undefined, day, seriesTitle: s?.title },
  })

  return (
    <section className="slw slw-verse" data-active={on ? '' : undefined} data-len={lenBucket(text.length)} style={readScale(scale)} aria-label={card.label}>
      <div className="slw-verse__sheet">
        <Eyebrow card={card} fallback="verse" />
        <blockquote className="slw-verse__text t-scripture t-quote t-hang slw-in" style={{ '--i': 1 }}>{text}</blockquote>
        <i className="slw-rule" aria-hidden="true" style={{ '--i': 2 }} />
        <cite className="slw-verse__cite t-ref slw-in" style={{ '--i': 3 }}>
          <span>{ref}</span>{tr ? <span className="slw-verse__tr">{tr}</span> : null}
        </cite>
        <div className="slw-verse__act slw-in" style={{ '--i': 4 }}>
          <Button variant="secondary" size="md" icon={copied ? 'check' : 'copy'} onClick={doCopy}>{copied ? T.copied : T.copy}</Button>
          <Button variant="secondary" size="md" icon="share" onClick={doShare}>{labels.verbs.share}</Button>
        </div>
      </div>
      <span className="u-sr" role="status">{copied ? T.copied : ''}</span>
    </section>
  )
}
