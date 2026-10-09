// locker-journal · the Journal tab — every answer you wrote, kept like a private book.
//   default export  Tab({ s })   (Locker's Journal segment)
// Reads the store itself: journalEntries(st) (both series, newest first). Writes only through saveNote (edit / delete).
// A card is a serif quote on a carbon plate with a stage-coloured spine. Search folds diacritics (typing "ese" finds "ẹ̀ṣẹ̀"),
// highlights what matched, and opens a clamped answer so the match is never hidden. Per-entry actions and Export are sheets;
// delete is an explicit danger Dialog (a scrim tap never deletes). Nothing here leaves the device unless the user taps Share.
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, Chip, Dialog, Empty, IconButton, Row, RowGroup, Sheet, Tag, TextField, toast } from '../../ui/index.js'
import { Icon } from '../../icons.jsx'
import { useShell } from '../../shell.jsx'
import { NOTE_MAX, journalEntries, saveNote, useStore } from '../../store.js'
import { currentDay, dateKey, fmtKey, getSeries, stageOf, stageSlot } from '../../lib.js'
import { emptyCopy, fmtNum, lessonCopy } from '../../copy.js'

/* ── helpers ─────────────────────────────────────────────────────────── */

const plural = (n, one, many = one + 's') => `${fmtNum(n)} ${n === 1 ? one : many}`
const words = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0)
const keyOf = (e) => `${e.seriesId}:${e.day}`

/** Diacritic-folded lower-case copy of `str` plus a map from folded index to original index (so highlights land on the real text). */
function fold(str) {
  let f = ''
  const map = []
  let i = 0
  for (const ch of str) {
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    for (let k = 0; k < base.length; k += 1) map.push(i)
    f += base
    i += ch.length
  }
  map.push(i)
  return { f, map }
}
const foldQuery = (q) => fold(q.trim()).f

/** Original-text [start, end) ranges where the folded query occurs. */
function matchRanges(text, fq) {
  if (!fq) return []
  const { f, map } = fold(text)
  const out = []
  let at = f.indexOf(fq)
  while (at !== -1 && out.length < 60) {
    out.push([map[at], map[at + fq.length]])
    at = f.indexOf(fq, at + fq.length)
  }
  return out
}

function Marked({ text, fq }) {
  const ranges = useMemo(() => matchRanges(text, fq), [text, fq])
  if (!ranges.length) return text
  const out = []
  let cur = 0
  ranges.forEach(([a, b], i) => {
    if (a > cur) out.push(text.slice(cur, a))
    out.push(<mark key={i} className="lcj-mark">{text.slice(a, b)}</mark>)
    cur = b
  })
  if (cur < text.length) out.push(text.slice(cur))
  return out
}

const haystack = (e, fseries) => fold(`${e.text}\n${e.title}\n${e.ref}\n${fseries(e)}`).f

function dateLabel(e) {
  if (!e.date) return `Day ${e.day}`
  const yr = e.date.slice(0, 4)
  return `${fmtKey(e.date)}${yr !== dateKey().slice(0, 4) ? ` ${yr}` : ''}`
}

/** One entry as plain text — the same shape for Copy and for the export file. */
function entryText(e) {
  const series = getSeries(e.seriesId)
  const lines = [`${dateLabel(e)} · Day ${e.day} · ${series.title}`, e.title]
  if (e.ref) lines.push(e.ref)
  if (e.prompt) lines.push('', `Q: ${e.prompt}`)
  lines.push('', e.text.trim())
  return lines.join('\n')
}

function exportText(entries, name) {
  const head = [`KIND Journal${name ? ` — ${name}` : ''}`, `${plural(entries.length, 'entry', 'entries')} · exported ${fmtKey(dateKey())}`]
  const rule = '\n\n— — —\n\n'
  return `${head.join('\n')}${rule}${entries.map(entryText).join(rule)}\n`
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch { return false }
}

function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** Keeps the last non-null value so a closing sheet or dialog still has its content while it animates out. */
function useLatched(v) {
  const r = useRef(v)
  if (v != null) r.current = v
  return v ?? r.current
}

/* ── one entry ───────────────────────────────────────────────────────── */

const Entry = memo(function Entry({ e, i, fq, showSeries, onMore }) {
  const textRef = useRef(null)
  const [manual, setManual] = useState(null)     // the reader's own Read more / Show less; null = automatic
  const [clipped, setClipped] = useState(false)
  const series = getSeries(e.seriesId)
  const slot = stageSlot(stageOf(series, e.day))
  const searching = Boolean(fq)
  const expanded = manual ?? (searching && clipped && matchRanges(e.text, fq).length > 0)
  useEffect(() => setManual(null), [fq])

  // Is the answer taller than its six-line window? Re-measured when the width or the web font changes.
  useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return undefined
    const measure = () => { // taller than the six-line window? (line maths, so it holds open or closed)
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 0
      setClipped(lh > 0 && el.scrollHeight > lh * 6 + 2)
    }
    measure()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [e.text])

  const titleId = `lcj-t-${e.seriesId}-${e.day}`
  return (
    <li className="lcj-item" style={{ '--i': Math.min(i, 8) }}>
      <article
        className="lcj-card"
        aria-labelledby={titleId}
        style={{ '--stage': `var(--stage-${slot})`, '--stage-glow': `var(--stage-${slot}-glow)` }}
      >
        <header className="lcj-card__top">
          <p className="lcj-card__meta">{dateLabel(e)} <i aria-hidden="true">·</i> Day {e.day}</p>
          <IconButton
            icon="more" label={`Actions for Day ${e.day}: ${e.title}`} size="sm"
            onClick={(ev) => onMore(e, ev.currentTarget)}
          />
        </header>
        <h3 className="lcj-card__title" id={titleId}>{e.title}</h3>
        <div className="lcj-card__refs">
          {e.ref ? <Tag tone="tele" icon="verse">{e.ref}</Tag> : null}
          {showSeries ? <span className="lcj-card__series">{series.title}</span> : null}
        </div>
        {e.prompt ? <p className="lcj-card__prompt">{e.prompt}</p> : null}
        <blockquote className="lcj-quote" data-open={expanded ? '' : undefined}>
          <p className="lcj-quote__text" ref={textRef}><Marked text={e.text} fq={fq} /></p>
        </blockquote>
        {clipped ? (
          <button
            type="button" className="lcj-more" aria-expanded={expanded}
            onClick={() => setManual(!expanded)}
          >
            {expanded ? 'Show less' : 'Read more'}
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={16} />
          </button>
        ) : null}
      </article>
    </li>
  )
})

/* ── sheets ──────────────────────────────────────────────────────────── */

function EditSheet({ entry, open, onClose, onSaved }) {
  const [value, setValue] = useState(entry?.text || '')
  const box = useRef(null)
  useEffect(() => { setValue(entry?.text || '') }, [entry])
  // the sheet is still sliding in when autoFocus fires, so focus lands on the sheet; take it into the field once it has settled
  useEffect(() => {
    if (!open) return undefined
    const t = setTimeout(() => {
      const ta = box.current && box.current.querySelector('textarea')
      if (ta && document.activeElement !== ta) { ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length) }
    }, 380)
    return () => clearTimeout(t)
  }, [open])
  if (!entry) return null
  const blank = !value.trim()
  const same = value === entry.text
  const save = () => {
    if (blank || same) return
    saveNote(entry.seriesId, entry.day, value)
    onSaved(entry)
  }
  return (
    <Sheet
      open={open} onClose={onClose} detents={['full']} eyebrow={`EDIT · DAY ${entry.day}`} title={entry.title}
      footer={(
        <div className="lcj-foot">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button size="md" icon="check" disabled={blank || same} onClick={save}>Save</Button>
        </div>
      )}
    >
      <div className="lcj-edit" ref={box}>
        {entry.prompt ? <p className="lcj-edit__prompt">{entry.prompt}</p> : null}
        <TextField
          multiline rows={6} maxRows={12} maxLength={NOTE_MAX} value={value} onChange={setValue} autoFocus
          label="Your answer" className="lcj-edit__field" spellCheck
          hint={blank ? 'An empty answer cannot be saved. Use Delete to remove it.' : lessonCopy.journalHelp}
        />
      </div>
    </Sheet>
  )
}

function ActionSheet({ entry, open, onClose, onEdit, onCopy, onOpenDay, onDelete }) {
  if (!entry) return null
  return (
    <Sheet open={open} onClose={onClose} detents={['auto']} eyebrow={`${dateLabel(entry).toUpperCase()} · DAY ${entry.day}`} title={entry.title}>
      <div className="lcj-actions">
        <RowGroup>
          <Row icon="pen" title="Edit" sub="Change your words" onClick={onEdit} />
          <Row icon="copy" title="Copy" sub="This answer, as text" onClick={onCopy} />
          <Row icon="book" title={`Open Day ${entry.day}`} sub="Read the lesson again" chevron onClick={onOpenDay} />
          <Row icon="trash" tone="nogo" title="Delete" sub="Remove it from this device" onClick={onDelete} />
        </RowGroup>
      </div>
    </Sheet>
  )
}

function ExportSheet({ open, entries, name, onClose }) {
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const text = useMemo(() => (open ? exportText(entries, name) : ''), [open, entries, name])
  const stamp = dateKey()
  const copyAll = async () => {
    const ok = await copyText(text)
    toast(ok ? { title: 'Journal copied', body: plural(entries.length, 'entry', 'entries'), icon: 'copy', tone: 'go', key: 'lcj-export' }
      : { title: 'Could not copy', body: 'Try the download instead.', icon: 'warning', tone: 'nogo', key: 'lcj-export' })
    if (ok) onClose()
  }
  const save = () => {
    download(text, `kind-journal-${stamp}.txt`)
    toast({ title: 'Journal saved', body: `kind-journal-${stamp}.txt`, icon: 'download', tone: 'go', key: 'lcj-export' })
    onClose()
  }
  const share = async () => {
    try { await navigator.share({ title: 'My KIND Journal', text }); onClose() } catch { /* dismissed */ }
  }
  return (
    <Sheet open={open} onClose={onClose} detents={['auto']} eyebrow={plural(entries.length, 'entry', 'entries').toUpperCase()} title="Export your Journal">
      <div className="lcj-actions">
        <p className="lcj-actions__note">Plain text, newest first. It stays on this device until you send it.</p>
        <RowGroup>
          <Row icon="copy" title="Copy all" sub="Paste into Notes or a message" onClick={copyAll} />
          <Row icon="download" title="Download .txt" sub={`kind-journal-${stamp}.txt`} onClick={save} />
          {canShare ? <Row icon="share" title="Share…" sub="Send it with another app" onClick={share} /> : null}
        </RowGroup>
      </div>
    </Sheet>
  )
}

/* ── the tab ─────────────────────────────────────────────────────────── */

export default function Journal({ s }) {
  const st = useStore()
  const { openDay } = useShell()
  const [q, setQ] = useState('')
  const [only, setOnly] = useState('all')
  const [target, setTarget] = useState(null)       // entry whose actions are open
  const targetL = useLatched(target)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const editL = useLatched(editing)
  const confirmL = useLatched(confirm)
  const [exporting, setExporting] = useState(false)
  const feedRef = useRef(null)

  const all = useMemo(() => journalEntries(st), [st])
  const seriesWith = useMemo(() => [...new Set(all.map((e) => e.seriesId))], [all])
  const filter = seriesWith.length > 1 && seriesWith.includes(only) ? only : 'all'
  const fq = foldQuery(q)

  const seriesName = useCallback((e) => getSeries(e.seriesId).title, [])
  const shown = useMemo(() => all.filter((e) => (filter === 'all' || e.seriesId === filter) && (!fq || haystack(e, seriesName).includes(fq))), [all, filter, fq, seriesName])
  const totalWords = useMemo(() => all.reduce((n, e) => n + words(e.text), 0), [all])
  const empty = useMemo(() => emptyCopy('journal', String(st.name || '')), [st.name])

  const onMore = useCallback((e) => setTarget(e), [])
  const closeAll = () => { setTarget(null); setEditing(null) }

  const doCopy = async () => {
    const e = target
    const ok = await copyText(entryText(e))
    setTarget(null)
    toast(ok ? { title: 'Copied', body: `Day ${e.day} answer`, icon: 'copy', tone: 'go', key: 'lcj-copy' }
      : { title: 'Could not copy', icon: 'warning', tone: 'nogo', key: 'lcj-copy' })
  }
  const doDelete = () => {
    const e = confirm
    saveNote(e.seriesId, e.day, '')
    setConfirm(null)
    toast({ title: 'Entry deleted', body: `Day ${e.day}`, icon: 'trash', key: 'lcj-del' })
    requestAnimationFrame(() => feedRef.current?.focus())
  }

  /* — empty — */
  if (!all.length) {
    return (
      <section className="lcj lcj--empty" aria-label="Journal">
        <Empty
          className="lcj-empty"
          art={empty.art} title={empty.title} body={empty.body}
          action={(
            <>
              {empty.word ? (
                <figure className="lcj-empty__word">
                  <blockquote>{empty.word.text}</blockquote>
                  <figcaption>{empty.word.ref}</figcaption>
                </figure>
              ) : null}
              <Button variant="ghost" icon="arrowRight" onClick={() => openDay(currentDay(s, st))}>{empty.action}</Button>
            </>
          )}
        />
      </section>
    )
  }

  return (
    <section className="lcj" aria-label="Journal">
      <header className="lcj-bar">
        <div className="lcj-count">
          <span className="lcj-count__n">{fmtNum(all.length)}</span>
          <span className="lcj-count__t">
            <b>{all.length === 1 ? 'entry' : 'entries'}</b>
            <span>{plural(totalWords, 'word')} written</span>
          </span>
        </div>
        <Button variant="secondary" size="sm" icon="share" onClick={() => setExporting(true)}>Export</Button>
      </header>

      <TextField
        className="lcj-search" icon="search" type="search" value={q} onChange={setQ}
        placeholder="Search your Journal" aria-label="Search your Journal"
        enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck={false}
        suffix={q ? (
          <button type="button" className="lcj-search__clear" aria-label="Clear search" onClick={() => setQ('')}>
            <Icon name="closeCircle" size={20} />
          </button>
        ) : null}
      />

      {seriesWith.length > 1 ? (
        <div className="lcj-chips" role="group" aria-label="Filter by series">
          <Chip selected={filter === 'all'} onClick={() => setOnly('all')}>All · {all.length}</Chip>
          {seriesWith.map((id) => (
            <Chip key={id} selected={filter === id} onClick={() => setOnly(id)}>
              {getSeries(id).title.replace(/^The /, '')} · {all.filter((e) => e.seriesId === id).length}
            </Chip>
          ))}
        </div>
      ) : null}

      <p className="lcj-meta" role="status" aria-live="polite">
        {fq || filter !== 'all' ? `${shown.length} of ${plural(all.length, 'entry', 'entries')}` : 'Newest first'}
      </p>

      {shown.length ? (
        <ol className="lcj-feed" ref={feedRef} tabIndex={-1} aria-label="Journal entries">
          {shown.map((e, i) => (
            <Entry key={keyOf(e)} e={e} i={i} fq={fq} showSeries={seriesWith.length > 1} onMore={onMore} />
          ))}
        </ol>
      ) : (
        <Empty
          className="lcj-empty lcj-empty--none" art="search" title="Nothing matches."
          body={q.trim() ? `No entry mentions “${q.trim()}”.` : 'No entries in this series yet.'}
          action={<Button variant="ghost" icon="closeCircle" onClick={() => { setQ(''); setOnly('all') }}>Clear search</Button>}
        />
      )}

      <ActionSheet
        entry={targetL} open={Boolean(target)}
        onClose={() => setTarget(null)}
        onEdit={() => { setEditing(target); setTarget(null) }}
        onCopy={doCopy}
        onOpenDay={() => { const e = target; setTarget(null); openDay(e.day, e.seriesId) }}
        onDelete={() => { setConfirm(target); setTarget(null) }}
      />
      <EditSheet
        entry={editL} open={Boolean(editing)}
        onClose={closeAll}
        onSaved={(e) => { closeAll(); toast({ title: 'Saved', body: `Day ${e.day} updated`, icon: 'check', tone: 'go', key: 'lcj-edit' }) }}
      />
      <Dialog
        open={Boolean(confirm)} tone="danger" eyebrow="DELETE ENTRY"
        title={confirmL ? `Delete your Day ${confirmL.day} answer?` : ''}
        body="It is removed from this device and cannot be brought back."
        confirmLabel="Delete" cancelLabel="Keep it"
        onConfirm={doDelete} onCancel={() => setConfirm(null)}
      />
      <ExportSheet open={exporting} entries={all} name={st.name} onClose={() => setExporting(false)} />
    </section>
  )
}
