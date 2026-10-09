// Share Studio — a full-height Sheet that turns a verse / code card / streak / finished month into an image people post.
//   <ShareStudio req={{ kind:'verse'|'card'|'streak'|'month', data }} onClose={fn} />      (App mounts it while a request is live)
//   `data` is the plain object store.shareData(kind, …) returns, or a lighter hand-built one: verse { text, ref, day? },
//   card { no, line, rare, day? } (or { code }), streak { count|streak|n }, month { done|days, declaration, seriesTitle }.
//   `data.seriesId` (else the shell's) picks the series the image is themed with.
// The pixels come from lib/shareCanvas.js (renderShare / TEMPLATES / ASPECTS / canvasToBlob), imported on first open so the
// canvas engine stays out of the main bundle. `engine` swaps it out in the playground only. Renders are memoised per (template, aspect), debounced 150 ms on change, and the preview is drawn from a
// downscaled copy; the share File is built as soon as a render lands so navigator.share still has its user gesture.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShell } from '../shell.jsx'
import { getSeries } from '../lib.js'
import { shareData, snapshot } from '../store.js'
import { shareCaption, toastCopy, errorCopy } from '../copy.js'
import { Sheet, Button, Segmented, Skeleton, Label, toast } from '../ui/index.js'
import { isLite, readMs } from '../ui/Counter.jsx'
import { haptic } from '../fx/haptics.js'
import { sound } from '../fx/sound.js'
// Styles load with the screen, not with the shell (first-load budget: docs/V7-DESIGN.md §10).
import '../styles/share.css'

// Chrome strings the copy deck does not own yet (REQUEST: move to copy.js).
const CHROME = {
  title: 'Share',
  kinds: { verse: 'Scripture card', card: 'Code card', streak: 'Streak', month: 'Mission' },
  template: 'Template', format: 'Format', preparing: 'Preparing your image', ready: 'Image ready',
  share: 'Share', save: 'Save image', copy: 'Copy caption',
  shared: { title: 'Shared', icon: 'check', tone: 'go', key: 'share' },
  saved: { title: 'Image saved', body: 'Look in your downloads.', icon: 'download', tone: 'go', key: 'share' },
}
const RATIO = { story: '9:16', square: '1:1', portrait: '4:5' }
const PREVIEW_LONG = 960          // longest side of the downscaled preview copy, px
const THUMB = 128                 // template thumbnail, px (shown at 64 css px)
const LS_ASPECT = 'kind-share-aspect'

const lsGet = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const lsSet = (k, v) => { try { localStorage.setItem(k, v) } catch { /* private mode: fine */ } }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const asToast = (e) => ({ title: e.title, body: e.body, icon: e.icon, tone: e.tone, key: 'share-err' })

/** Everything shareCaption wants, from whichever shape the caller passed. */
function captionInput(kind, d = {}, series) {
  const base = { day: d.day, series: { title: d.seriesTitle || series.title } }
  if (kind === 'verse') {
    const v = d.verse || { text: d.text, ref: d.ref }
    return { ...base, verse: { ...v, ref: String(v.ref || '').replace(/\s*\([A-Z]{2,6}\)\s*$/, '') } }   // the caption adds the translation itself
  }
  if (kind === 'card') {
    const code = d.code || { no: d.no, line: d.line, rare: d.rare }
    return { ...base, day: d.day ?? code.day, code, total: d.total || series.codes?.length }
  }
  if (kind === 'streak') return { ...base, n: d.count ?? d.streak ?? d.n }
  const decl = d.declaration || series.declaration
  const lines = Array.isArray(decl) ? decl : decl ? [decl] : []
  const text = lines.join(' ')
  return { ...base, days: d.done ?? d.days ?? d.total, declaration: text.length <= 160 ? text : lines[0] }
}

/** Callers pass light data ({ seriesId, day } / { n } / { streak, xp } / { text, ref }): fill the rest from the store so the image is never half-empty. */
function hydrate(kind, d = {}, series) {
  const own = Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined && v !== null))
  let base = null
  try {
    const st = snapshot()
    if (kind === 'card' && own.line == null && !own.code) base = shareData('card', st, series.id, own.day)
    else if (kind === 'streak') base = shareData('streak', st, series.id)
    else if (kind === 'month' && !own.patches) base = shareData('month', st, series.id)
  } catch { base = null }
  const out = { seriesTitle: series.title, ...(base || {}), ...own }
  if (kind === 'streak') {
    const n = own.count ?? own.streak ?? own.n
    if (n != null) out.count = Number(n) || 0
  }
  if (kind === 'month') {
    const done = Number(own.done ?? own.days ?? out.done ?? 0)
    const total = Number(out.total) || series.codes?.length || 31
    Object.assign(out, { done, total, pct: own.pct ?? done / total, complete: own.complete ?? done >= total })
  }
  return out
}

function drawPreview(dst, src) {
  const k = Math.min(1, PREVIEW_LONG / Math.max(src.width, src.height))
  const w = Math.max(1, Math.round(src.width * k)), h = Math.max(1, Math.round(src.height * k))
  if (dst.width !== w) dst.width = w
  if (dst.height !== h) dst.height = h
  const g = dst.getContext('2d')
  g.imageSmoothingQuality = 'high'
  g.clearRect(0, 0, w, h)
  g.drawImage(src, 0, 0, w, h)
}

function thumbOf(src) {
  const c = document.createElement('canvas')
  c.width = c.height = THUMB
  const g = c.getContext('2d')
  g.imageSmoothingQuality = 'high'
  const s = Math.min(src.width, src.height)                          // cover-crop from the top-left of the centre square
  g.drawImage(src, (src.width - s) / 2, (src.height - s) / 2, s, s, 0, 0, THUMB, THUMB)
  return c.toDataURL('image/jpeg', 0.82)
}

function download(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.rel = 'noopener'
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch { /* fall through */ }
  try {
    const t = document.createElement('textarea')
    t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(t); t.select()
    const ok = document.execCommand('copy'); t.remove()
    return ok
  } catch { return false }
}

/** Short phones (≤ 700 px tall): the footer folds to one row so the preview keeps its room. */
function useShort() {
  const q = '(max-height: 700px)'
  const [v, setV] = useState(() => typeof matchMedia === 'function' && matchMedia(q).matches)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined
    const m = matchMedia(q), on = () => setV(m.matches)
    on(); m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return v
}

export default function ShareStudio({ req, onClose, engine }) {
  const shell = useShell()
  const { kind = 'verse', data: rawData = {} } = req || {}
  const series = useMemo(() => getSeries(rawData.seriesId || shell.seriesId), [rawData.seriesId, shell.seriesId])
  const rawKey = useMemo(() => { try { return JSON.stringify(rawData) } catch { return String(Math.random()) } }, [rawData])
  const data = useMemo(() => hydrate(kind, rawData, series), [kind, rawKey, series]) // eslint-disable-line react-hooks/exhaustive-deps
  const [eng, setEng] = useState(engine || null)
  const [engErr, setEngErr] = useState(false)
  useEffect(() => {
    if (eng) return undefined
    let dead = false
    import('../lib/shareCanvas.js').then((m) => { if (!dead) setEng(m) }).catch(() => { if (!dead) setEngErr(true) })
    return () => { dead = true }
  }, [eng])
  const { renderShare, canvasToBlob } = eng || {}
  const templates = (eng && eng.TEMPLATES && eng.TEMPLATES[kind]) || []
  const aspects = (eng && eng.ASPECTS) || []

  const [open, setOpen] = useState(true)
  const [pickedTemplate, setTemplate] = useState(null)
  const [pickedAspect, setAspect] = useState(() => lsGet(LS_ASPECT) || 'story')
  const template = templates.some((t) => t.id === pickedTemplate) ? pickedTemplate : templates[0]?.id
  const aspect = aspects.some((a) => a.id === pickedAspect) ? pickedAspect : aspects[0]?.id || 'story'
  const [phase0, setPhase] = useState('loading')               // loading | ready | error
  const [drawn, setDrawn] = useState(null)                    // the aspect id the preview canvas currently holds
  const [busy, setBusy] = useState('')                        // '' | 'share' | 'save'
  const [thumbs, setThumbs] = useState({})                    // template id -> data URL
  const [size, setSize] = useState('')
  const phase = engErr ? 'error' : phase0

  const dataKey = useMemo(() => { try { return JSON.stringify(data) } catch { return String(Math.random()) } }, [data])
  const caption = useMemo(
    () => shareCaption(kind, captionInput(kind, data, series), `${series.id}|${kind}`),
    [kind, dataKey, series], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const compact = useShort()
  const alt = caption.alt                                    // the verse text / card line / streak count, for the image

  const canvasRef = useRef(null)
  const fulls = useRef(new Map())                             // key -> Promise<canvas>   (≤ 4 full-size renders alive)
  const files = useRef(new Map())                             // key -> Promise<File>
  const first = useRef(true)
  const closing = useRef(false)
  const busyRef = useRef('')                                   // synchronous guard: state lags a same-tick double tap
  const key = `${template}|${aspect}`

  const full = useCallback((tpl, asp) => {
    if (!renderShare) return Promise.reject(new Error('engine not ready'))
    const k = `${tpl}|${asp}`
    let p = fulls.current.get(k)
    if (!p) {
      p = Promise.resolve(renderShare({ kind, data, template: tpl, aspect: asp, series }))
      fulls.current.set(k, p)
      p.catch(() => fulls.current.delete(k))
      while (fulls.current.size > 4) { const old = fulls.current.keys().next().value; fulls.current.delete(old); files.current.delete(old) }
    }
    return p
  }, [renderShare, kind, dataKey, series]) // eslint-disable-line react-hooks/exhaustive-deps

  const fileFor = useCallback((tpl, asp) => {
    const k = `${tpl}|${asp}`
    let p = files.current.get(k)
    if (!p) {
      p = full(tpl, asp).then((c) => canvasToBlob(c)).then((b) => new File([b], `kind-${kind}-${tpl || 'card'}-${asp}.png`, { type: 'image/png' }))
      files.current.set(k, p)
      p.catch(() => files.current.delete(k))
    }
    return p
  }, [full, canvasToBlob, kind])

  // The data (or kind) changed under us: everything memoised is stale.
  useEffect(() => () => { fulls.current.clear(); files.current.clear() }, [kind, dataKey, series])

  /* ── the preview: debounce 150 ms after a change, instant when it is already rendered ── */
  useEffect(() => {
    if (!eng) return undefined
    let dead = false
    setPhase('loading')
    const cached = fulls.current.has(key)
    const t = setTimeout(async () => {
      try {
        const c = await full(template, aspect)
        if (dead) return
        if (!c || !c.width || !c.height) throw new Error('empty canvas')
        if (canvasRef.current) drawPreview(canvasRef.current, c)
        setDrawn(aspect); setSize(`${c.width} × ${c.height}`); setPhase('ready')
        fileFor(template, aspect).catch(() => {})             // warm the File so Share keeps its gesture
      } catch { if (!dead) setPhase('error') }
    }, first.current || cached ? 0 : 150)
    first.current = false
    return () => { dead = true; clearTimeout(t) }
  }, [eng, key, full, fileFor]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── template thumbnails: square renders, one at a time, after the first preview is up ── */
  const [started, setStarted] = useState(false)
  useEffect(() => { if (phase === 'ready') setStarted(true) }, [phase])
  useEffect(() => {
    if (!started || templates.length < 2) return undefined
    let dead = false
    setThumbs({})
    ;(async () => {
      for (const t of templates) {
        if (dead) return
        try {
          const c = await Promise.resolve(renderShare({ kind, data, template: t.id, aspect: 'square', series }))
          if (dead) return
          const url = thumbOf(c)
          setThumbs((m) => ({ ...m, [t.id]: url }))
        } catch { /* a missing thumb falls back to its skeleton */ }
        await wait(isLite() ? 0 : 60)
      }
    })()
    return () => { dead = true }
  }, [started, kind, dataKey, series]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── actions ── */
  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    setOpen(false)
    setTimeout(() => onClose && onClose(), isLite() ? readMs('--t-fast') : readMs('--t-slower') + 120)
  }, [onClose])

  const pickAspect = (id) => { setAspect(id); lsSet(LS_ASPECT, id) }
  const pickTemplate = (id) => { if (id === template) return; sound.play('select', { gain: 0.6 }); haptic.select(); setTemplate(id) }

  const onShare = async () => {
    if (busyRef.current) return
    busyRef.current = 'share'; setBusy('share')
    try {
      const file = await fileFor(template, aspect)
      const payload = { files: [file], title: caption.title, text: caption.full }
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share(payload)
        haptic.success(); toast(CHROME.shared)
      } else {
        download(file, file.name)
        haptic.success(); toast(CHROME.saved)
      }
    } catch (e) {
      if (e && e.name === 'AbortError') { /* the person closed the share sheet: not an error */ } else toast(asToast(errorCopy('share', kind)))
    }
    busyRef.current = ''; setBusy('')
  }
  const onSave = async () => {
    if (busyRef.current) return
    busyRef.current = 'save'; setBusy('save')
    try {
      const file = await fileFor(template, aspect)
      download(file, file.name)
      haptic.success(); toast(CHROME.saved)
    } catch { toast(asToast(errorCopy('share', kind))) }
    busyRef.current = ''; setBusy('')
  }
  const onCopy = async () => {
    const ok = await copyText(caption.full)
    if (ok) { haptic.success(); toast(toastCopy('copiedCaption')) } else toast(asToast(errorCopy('copy', kind)))
  }

  /* radiogroup keys: arrows / Home / End move the selection and the focus */
  const stripRef = useRef(null)
  const onStripKey = (e) => {
    const i = templates.findIndex((t) => t.id === template)
    let n = i
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = Math.min(templates.length - 1, i + 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = Math.max(0, i - 1)
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = templates.length - 1
    else return
    e.preventDefault()
    pickTemplate(templates[n].id)
    stripRef.current?.querySelectorAll('[role=radio]')[n]?.focus()
  }
  useEffect(() => {                                           // keep the chosen template in view
    const el = stripRef.current?.querySelector('[aria-checked="true"]')
    if (el && el.scrollIntoView) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: isLite() ? 'auto' : 'smooth' })
  }, [template])

  const asp = aspects.find((a) => a.id === aspect) || { w: 9, h: 16 }
  const aspOptions = aspects.map((a) => ({
    id: a.id,
    label: <span className="shr-asp"><span>{a.label}</span><small>{RATIO[a.id] || `${a.w}:${a.h}`}</small></span>,
  }))
  const loading = phase === 'loading'
  const status = phase === 'error' ? errorCopy('share', kind).title : loading ? CHROME.preparing : CHROME.ready

  return (
    <Sheet
      open={open}
      onClose={close}
      title={CHROME.title}
      eyebrow={CHROME.kinds[kind]}
      detents={['full']}
      className="shr-sheet"
      footer={(
        <div className="shr-actions" data-compact={compact || undefined}>
          <Button variant="primary" size="md" full icon="share" onClick={onShare} loading={busy === 'share'} disabled={phase === 'error'}>{CHROME.share}</Button>
          <div className="shr-row">
            <Button variant="secondary" size="md" full={!compact} icon="download" aria-label={CHROME.save} onClick={onSave} loading={busy === 'save'} disabled={phase === 'error'}>{compact ? null : CHROME.save}</Button>
            <Button variant="secondary" size="md" full={!compact} icon="copy" aria-label={CHROME.copy} onClick={onCopy}>{compact ? null : CHROME.copy}</Button>
          </div>
        </div>
      )}
    >
      <div className="shr" data-kind={kind}>
        <div className="shr-stage" aria-busy={loading}>
          <i className="shr-mark" data-c="tl" aria-hidden="true" /><i className="shr-mark" data-c="tr" aria-hidden="true" />
          <i className="shr-mark" data-c="bl" aria-hidden="true" /><i className="shr-mark" data-c="br" aria-hidden="true" />
          <div className="shr-frame" style={{ '--ar': `${asp.w} / ${asp.h}` }} data-phase={phase} data-stale={drawn !== aspect || undefined}>
            <canvas ref={canvasRef} className="shr-canvas" role="img" aria-label={alt} />
            {loading ? <Skeleton className="shr-skel" w="100%" h="100%" r="0" /> : null}
            {phase === 'error' ? <p className="shr-err">{errorCopy('share', kind).body}</p> : null}
          </div>
          <p className="shr-meta" aria-hidden="true"><span className="shr-led" data-phase={phase} />{size ? `${size} · PNG` : '—'}</p>
        </div>
        <p className="shr-sr" role="status" aria-live="polite">{status}</p>

        {templates.length > 1 ? (
          <section className="shr-sec" aria-label={CHROME.template}>
            <Label size="sm" mono className="shr-h">{CHROME.template}</Label>
            <div className="shr-strip" ref={stripRef} role="radiogroup" aria-label={CHROME.template} onKeyDown={onStripKey}>
              {templates.map((t) => (
                <button
                  key={t.id} type="button" role="radio" className="shr-tpl"
                  aria-checked={t.id === template} tabIndex={t.id === template ? 0 : -1}
                  onClick={() => pickTemplate(t.id)}
                >
                  <span className="shr-thumb">
                    {thumbs[t.id] ? <img src={thumbs[t.id]} alt="" draggable="false" /> : <Skeleton w="100%" h="100%" r="0" />}
                  </span>
                  <span className="shr-tname">{t.label}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="shr-sec" aria-label={CHROME.format}>
          <Label size="sm" mono className="shr-h">{CHROME.format}</Label>
          {aspOptions.length ? <Segmented options={aspOptions} value={aspect} onChange={pickAspect} label={CHROME.format} /> : <Skeleton w="100%" h="var(--tap)" r="var(--r-full)" />}
        </section>
      </div>
    </Sheet>
  )
}
