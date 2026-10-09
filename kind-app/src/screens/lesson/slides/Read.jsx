// slides-read · READ — a passage of teaching: the hook, the picture, a recap. Mono eyebrow, then prose set for a small screen.
// Also hosts the prose renderer the Point slide shares (Prose, typo): card bodies are "markdown-ish" — blank-line paragraphs,
// hard-wrapped lines inside a paragraph, `- ` lists, the odd `> ` pull, **bold**, *italic* — and deckFor() hands most of them over raw.
import { useMemo } from 'react'
import { Label } from '../../../ui/index.js'
import { Starfield } from '../../../art/index.js'

/** Body-copy typography: apostrophes, ellipses, curly quotes. Never run on the Word itself (Scripture arrives as written). */
export function typo(t) {
  return String(t)
    .replace(/\.\.\./g, '…')
    .replace(/(\w)'(?=\w)/g, '$1’')
    .replace(/(^|[\s([{—–*])"/g, '$1“').replace(/"/g, '”')
    .replace(/(^|[\s([{—–*])'/g, '$1‘').replace(/'/g, '’')
}

const EMPH = /\*\*(.+?)\*\*|\*(\S[^*]*?)\*/g
function inline(str) {
  const out = []
  let last = 0, k = 0, m
  EMPH.lastIndex = 0
  while ((m = EMPH.exec(str))) {
    if (m.index > last) out.push(str.slice(last, m.index))
    out.push(m[1] != null ? <strong key={k++}>{m[1]}</strong> : <em key={k++}>{m[2]}</em>)
    last = EMPH.lastIndex
  }
  if (last < str.length) out.push(str.slice(last))
  return out
}

/** body → [{ t:'p'|'h'|'q'|'ul'|'ol', text | items }]. A single newline inside a paragraph is a soft wrap, not a break. */
export function blocks(body) {
  const out = []
  let para = [], list = null, quote = null
  const flushP = () => { if (para.length) { out.push({ t: 'p', text: para.join(' ') }); para = [] } }
  const flushL = () => { if (list) { out.push(list); list = null } }
  const flushQ = () => { if (quote) { out.push({ t: 'q', text: quote.join(' ') }); quote = null } }
  const flush = () => { flushP(); flushL(); flushQ() }
  for (const raw of String(body || '').replace(/\r/g, '').split('\n')) {
    const line = raw.trim()
    let m
    if (!line) { flush(); continue }
    if ((m = line.match(/^#{1,6}\s+(.*)$/))) { flush(); out.push({ t: 'h', text: m[1] }); continue }
    if ((m = line.match(/^>\s?(.*)$/))) { flushP(); flushL(); (quote ||= []).push(m[1]); continue }
    if ((m = line.match(/^[-•]\s+(.*)$/)) || (m = line.match(/^\*\s+(.*)$/))) {
      flushP(); flushQ()
      if (list?.t !== 'ul') { flushL(); list = { t: 'ul', items: [] } }
      list.items.push(m[1]); continue
    }
    if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      flushP(); flushQ()
      if (list?.t !== 'ol') { flushL(); list = { t: 'ol', items: [] } }
      list.items.push(m[1]); continue
    }
    if (list) { list.items[list.items.length - 1] += ' ' + line; continue }   // wrapped list item
    if (quote) { quote.push(line); continue }
    para.push(line)
  }
  flush()
  return out
}

const rich = (t) => inline(typo(t))

/**
 * <Prose body lead="auto"|true|false />. The first paragraph becomes a lead (bigger, brighter) when it is short enough to hold
 * a whole thought — that is the entry point a 12-year-old's eye needs; the rest is plain body. Lists get hex bullets (CSS).
 */
export function Prose({ body, lead = 'auto', className = '' }) {
  const bs = useMemo(() => blocks(body), [body])
  const first = bs[0]
  const leads = lead === true || (lead === 'auto' && first?.t === 'p' && first.text.length <= (bs.length === 1 ? 240 : 170))
  return (
    <div className={('slr-prose ' + className).trim()}>
      {bs.map((b, i) => {
        const style = { '--i': i + 1 }
        if (b.t === 'p') return <p key={i} className={'slr-in' + (leads && i === 0 ? ' slr-lead' : '')} style={style}>{rich(b.text)}</p>
        if (b.t === 'h') return <h3 key={i} className="slr-in slr-prose__h" style={style}>{rich(b.text)}</h3>
        if (b.t === 'q') return <blockquote key={i} className="slr-in slr-prose__q" style={style}>{rich(b.text)}</blockquote>
        const List = b.t
        return (
          <List key={i} className="slr-in slr-list" style={style}>
            {b.items.map((it, j) => <li key={j}><span>{rich(it)}</span></li>)}
          </List>
        )
      })}
    </div>
  )
}

/** Mono eyebrow with a status LED and a hairline that runs out to the margin. Shared by every reading slide. */
export function Eyebrow({ children, tone = 'tele', className = '' }) {
  if (!children) return null
  return (
    <div className={('slr-eyebrow slr-in ' + className).trim()} style={{ '--i': 0 }}>
      <Label mono dot tone={tone}>{children}</Label>
      <i className="slr-eyebrow__rule" aria-hidden="true" />
    </div>
  )
}

/** The sky behind a hero slide: a soft-edged patch of stars (the edge fades out, so the slide's own padding never shows as a box). */
export function Sky({ seed = 1, density = 0.7, fade = 'both' }) {
  return (
    <div className="slr-sky" aria-hidden="true">
      <Starfield density={density} seed={seed} twinkle fade={fade} />
    </div>
  )
}

/** Props every slide root takes: the reading scale, and "this slide is the visible one". */
export const rootProps = (kind, { scale, active }) => ({
  'data-kind': kind,
  'data-on': active !== false ? 'true' : 'false',
  style: Number.isFinite(scale) ? { '--read-scale': scale } : undefined,
})

export default function Read({ card, scale, active }) {
  return (
    <article className="slr slr-read" aria-label={card.label} {...rootProps('read', { scale, active })}>
      <Eyebrow>{card.label}</Eyebrow>
      <Prose body={card.body} />
    </article>
  )
}
