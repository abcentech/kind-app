// slides-word · Ask — the journal prompt, and the one place the learner writes. Newsreader prompt, a recessed field that grows
// with the words (up to the room the screen really has, then scrolls inside), debounced autosave to saveNote with a mono
// SAVED readout, and extra questions as tappable rows that write the question into the note so the answer sits beneath it.
//
// The keyboard: window.visualViewport tells us how far it intrudes into the *scrollport* (not the window — the shell's footer
// is not part of the scroller). While the field is focused and the keyboard is up, the slide goes compact (prompt → a two-line
// caption, optional rows step aside, a Done button appears beside the readout) and the field's height is capped to the room
// that is left, so the caret never sits under the keys. Enter is a newline; Escape (or Done) puts the keyboard away.
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, Label, toast } from '../../../ui/index.js'
import { Icon } from '../../../icons.jsx'
import { ACHIEVEMENTS, NOTE_MAX, hasFlag, noteFor, saveNote, setFlag, snapshot, useStore } from '../../../store.js'
import { journalPlaceholder, labels, lessonCopy, toastCopy } from '../../../copy.js'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { Eyebrow, readScale, smart } from './Verse.jsx'

const SAVE_MS = 700                       // quiet time after the last keystroke before the note is written
const KB_MIN = 80                         // an intrusion smaller than this is browser chrome, not a keyboard
// UI words that copy.js does not own yet (see REQUESTS).
const T = { saved: 'Saved', saving: 'Saving', private: 'Private', more: 'Another way in' }

function scrollerOf(el) {
  for (let n = el && el.parentElement; n; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY
    if (o === 'auto' || o === 'scroll') return n
  }
  return document.scrollingElement || document.documentElement
}

const fmt = (n) => n.toLocaleString('en-US')

export default function Ask({ card, seriesId, day, scale, active }) {
  const on = active !== false
  const id = useId()
  const st = useStore()
  const stored = noteFor(st, seriesId, day)
  const [text, setText] = useState(stored)
  const [phase, setPhase] = useState(stored.trim() ? 'saved' : 'idle')   // idle | dirty | saved
  const [blip, setBlip] = useState(0)
  const [kb, setKb] = useState(0)
  const root = useRef(null), field = useRef(null), ta = useRef(null), bar = useRef(null)
  const live = useRef({ text: stored, dirty: false, timer: 0, cap: 0 })

  const prompt = smart(card.prompt)
  const extras = useMemo(() => (card.extra || []).map(smart).filter(Boolean), [card.extra])
  const placeholder = useMemo(() => journalPlaceholder(`${seriesId}:${day}`), [seriesId, day])

  /* ── save ── */
  const flush = useCallback(() => {
    const r = live.current
    clearTimeout(r.timer); r.timer = 0
    if (!r.dirty) return
    r.dirty = false
    const had = r.text.trim().length > 0
    const medals = saveNote(seriesId, day, r.text)
    setPhase(had ? 'saved' : 'idle')
    if (had) setBlip((b) => b + 1)
    // the one-time reassurance of *where* it went; after that the SAVED readout is enough
    if (had && !hasFlag(snapshot(), 'tip:journal-saved')) { setFlag('tip:journal-saved'); toast(toastCopy('journalSaved')) }
    ;(medals || []).forEach((m) => { const a = ACHIEVEMENTS.find((x) => x.id === m); if (a) toast(toastCopy('medalEarned', { title: a.title })) })
  }, [seriesId, day])

  const edit = (v) => {
    const r = live.current
    r.text = v; r.dirty = true
    setText(v); setPhase('dirty')
    clearTimeout(r.timer); r.timer = setTimeout(flush, SAVE_MS)
  }

  useEffect(() => { if (!on) flush() }, [on, flush])
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', hide)
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hide); flush() }
  }, [flush])

  /* ── size: grow with the words, capped to the room the screen has ── */
  const fit = useCallback(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    const cap = live.current.cap
    const h = el.scrollHeight
    const over = cap > 0 && h > cap
    el.style.height = `${over ? cap : h}px`
    el.style.overflowY = over ? 'auto' : 'hidden'
  }, [])

  const capNow = useCallback(() => {
    const el = ta.current, rt = root.current, fd = field.current
    if (!el || !rt || !fd) return
    const sc = scrollerOf(rt)
    const vv = window.visualViewport
    const r = sc.getBoundingClientRect()
    const vTop = vv ? vv.offsetTop : 0
    const vBot = vv ? vv.offsetTop + vv.height : window.innerHeight
    const avail = Math.min(r.bottom, vBot) - Math.max(r.top, vTop)            // the part of the scrollport you can see
    const above = fd.getBoundingClientRect().top - r.top + sc.scrollTop       // where the field starts in the content: scroll-independent
    const room = avail - above - (bar.current ? bar.current.offsetHeight : 0) - 24
    const min = parseFloat(getComputedStyle(el).minHeight) || 0
    live.current.cap = Math.max(min, Math.floor(room))
  }, [])

  const measure = useCallback(() => {
    const el = ta.current, rt = root.current
    if (!el || !rt) return
    const sc = scrollerOf(rt)
    const vv = window.visualViewport
    const vBot = vv ? vv.offsetTop + vv.height : window.innerHeight
    const intrusion = Math.max(0, Math.round(sc.getBoundingClientRect().bottom - vBot))
    setKb(document.activeElement === el && intrusion > KB_MIN ? intrusion : 0)
    requestAnimationFrame(() => { capNow(); fit() })
  }, [capNow, fit])

  useLayoutEffect(() => { capNow(); fit() }, [text, kb, capNow, fit])
  useLayoutEffect(() => { if (kb && root.current) scrollerOf(root.current).scrollTop = 0 }, [kb > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const vv = window.visualViewport
    let raf = 0
    const kick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure) }
    vv && vv.addEventListener('resize', kick)
    vv && vv.addEventListener('scroll', kick)
    window.addEventListener('resize', kick)
    document.fonts && document.fonts.ready.then(kick)
    return () => { cancelAnimationFrame(raf); vv && vv.removeEventListener('resize', kick); vv && vv.removeEventListener('scroll', kick); window.removeEventListener('resize', kick) }
  }, [measure])

  /* ── an extra question: write it into the note and put the caret beneath it ── */
  const ask = (q) => {
    sound.play('select'); haptic.select()
    const cur = live.current.text
    const sep = !cur.trim() ? '' : cur.endsWith('\n\n') ? '' : cur.endsWith('\n') ? '\n' : '\n\n'
    const next = (cur + sep + q + '\n').slice(0, NOTE_MAX)
    edit(next)
    requestAnimationFrame(() => {
      const el = ta.current
      if (!el) return
      el.focus(); el.setSelectionRange(next.length, next.length)
    })
  }

  const eat = (e) => e.stopPropagation()    // keys and drags inside the field belong to the field, not to the lesson's swipe/shortcuts
  const near = text.length >= NOTE_MAX * 0.9
  const status = phase === 'saved' ? T.saved : phase === 'dirty' ? T.saving : T.private

  return (
    <section
      ref={root}
      className="slw slw-ask"
      data-active={on ? '' : undefined}
      data-kb={kb ? '' : undefined}
      style={{ ...readScale(scale), '--slw-kb': `${kb}px` }}
      aria-label={card.label}
    >
      <Eyebrow card={card} fallback="ask" />
      <label className="slw-ask__prompt slw-in" htmlFor={`${id}-f`} style={{ '--i': 1 }}>{prompt}</label>

      <div className="slw-field slw-in" ref={field} style={{ '--i': 2 }}>
        <textarea
          ref={ta}
          id={`${id}-f`}
          className="slw-field__input"
          value={text}
          rows={3}
          maxLength={NOTE_MAX}
          placeholder={placeholder}
          autoCapitalize="sentences"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="enter"
          dir="auto"
          data-no-swipe=""
          aria-describedby={`${id}-s ${id}-h`}
          onChange={(e) => edit(e.target.value.slice(0, NOTE_MAX))}
          onFocus={() => { measure(); setTimeout(measure, 320) }}
          onBlur={() => { flush(); measure() }}
          onKeyDown={(e) => { eat(e); if (e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur() } }}
          onKeyUp={eat}
          onPointerDown={eat}
          onTouchStart={eat}
        />
        <i className="slw-field__led" aria-hidden="true" />
      </div>

      <div className="slw-ask__bar slw-in" ref={bar} style={{ '--i': 3 }}>
        <Label as="span" mono size="sm" className="slw-status" data-phase={phase} aria-hidden="true">
          <i className="slw-status__led" key={blip} data-blip={blip ? '' : undefined} />{status}
        </Label>
        <Label as="span" mono size="sm" className="slw-count" data-near={near ? '' : undefined} aria-hidden="true">{fmt(text.length)} / {fmt(NOTE_MAX)}</Label>
        <Button className="slw-done" variant="secondary" size="sm" onClick={() => ta.current && ta.current.blur()}>{labels.verbs.done}</Button>
      </div>
      <span className="u-sr" id={`${id}-s`} role="status">{phase === 'saved' ? T.saved : ''}</span>

      {extras.length ? (
        <div className="slw-ask__more slw-in" style={{ '--i': 4 }}>
          <Label as="p" mono size="sm" className="slw-ask__more-label">{T.more}</Label>
          {extras.map((q) => {
            const used = text.includes(q)
            return (
              <button key={q} type="button" className="slw-q" aria-pressed={used} onClick={() => { if (!used) ask(q) }}>
                <Icon name={used ? 'check' : 'plus'} size={16} className="slw-q__ic" />
                <span>{q}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <p className="slw-ask__help slw-in" id={`${id}-h`} style={{ '--i': 5 }}><Icon name="lock" size={16} />{lessonCopy.journalHelp}</p>
    </section>
  )
}
