// owner: ex-blank-order · "Put the declaration in order". A ruled answer line above, the word bank below. Tapping a bank
// tile flies it into the line (a hollow marks where it came from, so the bank never reshuffles under a thumb); tapping a
// placed word, the undo key, or Backspace takes the last one back. value = array of word ids in the order placed.
// Graded: the line is marked word by word (green in place, red out of place); when wrong, the words then glide into the
// correct sequence, the ones you misplaced keeping their red mark. Words that repeat ("I … I") are matched by their text,
// exactly as gradeExercise does, so an identical twin is never reported as a mistake.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../../icons.jsx'
import { Kbd } from '../../../ui/index.js'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { useFxLevel } from '../../../fx/motion.js'
import { toggleWord } from '../../../quiz.js'
import { checkHint } from '../../../copy.js'
import { isLite, ms, say, useFlight, useKeys } from './flight.js'

// Strings no copy.js entry owns yet (see report: REQUESTS).
const T = {
  line: (n, m) => `Your line, ${n} of ${m} words`,
  bank: 'Word bank',
  undo: 'Undo last word',
  placed: (w, n, m) => `${w} placed. ${n} of ${m} words in the line.`,
  removed: (w, n, m) => `${w} removed. ${n} of ${m} words in the line.`,
  inPlace: 'in place',
  ok: 'In place.',
  miss: 'Out of place.',
}

/** Which placed words are out of place, and the sequence they belong in (matching by text, keeping every word that is already right). */
function revealOrder(words, answer, placed) {
  const text = new Map(words.map((w) => [w.id, w.text]))
  const want = answer.map((id) => text.get(id))
  const out = new Array(want.length).fill(null)
  const pool = []
  const miss = new Set()
  placed.forEach((id, i) => {
    if (text.get(id) === want[i]) out[i] = id
    else { pool.push(id); miss.add(id) }
  })
  words.forEach((w) => { if (!placed.includes(w.id)) pool.push(w.id) })
  for (let i = 0; i < out.length; i++) {
    if (out[i] != null) continue
    const k = pool.findIndex((id) => text.get(id) === want[i])
    out[i] = pool.splice(k >= 0 ? k : 0, 1)[0]
  }
  return { order: out.filter((id) => id != null), miss }
}

function Chip({ id, text, i, where, state, onPick }) {
  const live = state === 'rest' && onPick
  const Tag = live ? 'button' : 'span'
  const led = state === 'ok' ? 'check' : state === 'miss' ? 'close' : null
  return (
    <Tag
      className="exb-chip u-clip-cut-sm"
      data-state={state}
      data-flip={id}
      data-where={where}
      data-text={text}
      {...(live ? { type: 'button', onClick: () => onPick(id), 'aria-keyshortcuts': i != null && i < 9 ? String(i + 1) : undefined } : {})}
    >
      {led ? (
        <Icon name={led} className="exb-chip__led" size={16} />
      ) : where === 'bank' && i != null && i < 9 ? (
        <Kbd className="exb-chip__key" aria-hidden="true">{i + 1}</Kbd>
      ) : null}
      <span className="exb-chip__text">{text}</span>
      {led ? <span className="u-sr">{state === 'ok' ? T.ok : T.miss}</span> : null}
    </Tag>
  )
}

// The step above draws the eyebrow and ex.prompt, and owns Enter (CHECK / CONTINUE); this draws the answering surface only.
export default function Order({ ex, value, onChange, locked, graded }) {
  const root = useRef(null)
  const live = useRef(null)
  const focusNext = useRef(null)
  const snap = useFlight(root, graded ? 1 : 0)
  const lite = useFxLevel() === 'lite' || isLite()

  const words = ex.words || []
  const n = words.length
  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words])
  const placed = useMemo(() => (Array.isArray(value) ? value : []).filter((id, i, a) => byId.has(id) && a.indexOf(id) === i), [value, byId])
  const wrong = !!graded && !graded.right
  const rev = useMemo(() => (graded ? revealOrder(words, ex.answer, placed) : null), [graded, words, ex.answer, placed])

  // wrong: the line is marked as it was given, then the words glide into the right sequence (lite shows the end at once)
  const [fixed, setFixed] = useState(false)
  useEffect(() => {
    if (!wrong) { setFixed(false); return undefined }
    if (lite) return undefined
    const t = setTimeout(() => { snap({ dur: ms('--t-slower'), stagger: 36 }); setFixed(true) }, ms('--t-hero'))
    return () => clearTimeout(t)
  }, [wrong, lite, ex.id, snap])
  const showFix = wrong && (fixed || lite)
  const line = showFix ? rev.order : placed

  const wasFocusInside = () => !!root.current && root.current.contains(document.activeElement)
  const act = (id) => {
    if (locked) return
    const w = byId.get(id)
    if (!w) return
    const next = toggleWord(ex, placed, id)
    if (next === placed) return
    const adding = next.length > placed.length
    focusNext.current = wasFocusInside() ? id : null
    snap()
    onChange(next)
    sound.play(adding ? 'select' : 'deselect')
    haptic.select()
    say(live, (adding ? T.placed : T.removed)(w.text, next.length, n))
  }
  const undo = () => {
    if (locked || !placed.length) return
    const id = placed[placed.length - 1]
    focusNext.current = null
    snap()
    onChange(placed.slice(0, -1))
    sound.play('deselect')
    haptic.tap()
    say(live, T.removed(byId.get(id).text, placed.length - 1, n))
  }

  useKeys(root, (e) => {
    if (/^[1-9]$/.test(e.key)) {
      const w = words[Number(e.key) - 1]
      if (w) { e.preventDefault(); act(w.id) }
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      if (placed.length) { e.preventDefault(); undo() }
    }
  }, locked)

  useLayoutEffect(() => {
    const f = focusNext.current
    if (!f || !root.current) return
    focusNext.current = null
    const el = root.current.querySelector(`button[data-flip="${CSS.escape(f)}"]`)
    if (el) el.focus({ preventScroll: true })
  })

  const inPlace = rev ? n - rev.miss.size : 0
  const mark = (id) => (rev ? (rev.miss.has(id) ? 'miss' : 'ok') : 'rest')

  return (
    <div ref={root} className="exb exb-order" data-graded={graded ? (graded.right ? 'right' : 'wrong') : undefined} data-full={placed.length === n ? '' : undefined}>
      <header className="exb-head">
        {ex.cite ? <span className="exb-cite">{ex.cite}</span> : <span />}
        {graded ? (
          <span className="exb-meter" data-tone={graded.right ? 'go' : 'nogo'}>
            {inPlace} / {n} {T.inPlace}
          </span>
        ) : (
          <div className="exb-head__tools">
            <span className="exb-meter" aria-hidden="true">{placed.length} / {n}</span>
            <button type="button" className="exb-undo u-clip-cut-sm" onClick={undo} disabled={locked || !placed.length} aria-label={T.undo}>
              <Icon.undo size={20} />
            </button>
          </div>
        )}
      </header>

      <div className="exb-tray" data-state={graded ? (graded.right ? 'right' : 'selected') : undefined} role="group" aria-label={T.line(placed.length, n)}>
        {placed.length === 0 && !locked ? <span className="exb-tray__hint">{checkHint('order')}</span> : null}
        {line.map((id) => (
          <Chip key={id} id={id} text={byId.get(id).text} where="tray" state={graded ? mark(id) : 'rest'} onPick={locked ? null : act} />
        ))}
      </div>

      {!locked ? (
        <div className="exb-bank" data-kind="order" role="group" aria-label={T.bank}>
          {words.map((w, i) =>
            placed.includes(w.id) ? (
              <span className="exb-bay u-clip-cut-sm" key={w.id} aria-hidden="true">
                <Kbd className="exb-chip__key">{i < 9 ? i + 1 : ''}</Kbd>
                <span>{w.text}</span>
              </span>
            ) : (
              <Chip key={w.id} id={w.id} text={w.text} i={i} where="bank" state="rest" onPick={act} />
            ),
          )}
        </div>
      ) : null}

      <p ref={live} className="u-sr" role="status" aria-live="polite" />
    </div>
  )
}
