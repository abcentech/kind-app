// owner: ex-blank-order · "Fill the gap". The Word set large in Newsreader with a glowing socket where the word goes;
// the four options sit below as chamfered tiles. A tapped tile flies into the socket (FLIP, --spring-snap) and dissolves
// into the word; tap the socket (or the tile's hollow) and it flies back. value = chosen option id.
// Graded: right -> socket goes green with a check. Wrong -> the socket flares red on the struck word, then the right tile
// flies in and the socket resolves green, while the word you chose settles back into the bank marked red.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '../../../icons.jsx'
import { Kbd } from '../../../ui/index.js'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'
import { useFxLevel } from '../../../fx/motion.js'
import { checkHint } from '../../../copy.js'
import { isLite, ms, say, useFlight, useKeys } from './flight.js'

// Strings no copy.js entry owns yet (see report: REQUESTS).
const T = {
  blank: 'Blank',
  bank: 'Word choices',
  placed: (w) => `${w} placed in the blank.`,
  removed: (w) => `${w} removed from the blank.`,
  press: 'Press to remove.',
  right: 'Correct.',
  wrong: 'Not correct.',
  answer: 'The right word.',
  yours: 'Your choice, not correct.',
}

const tailOf = (s) => { const m = /(\S*)$/.exec(s); return [s.slice(0, s.length - m[1].length), m[1]] }
const headOf = (s) => { const m = /^(\S*)/.exec(s); return [m[1], s.slice(m[1].length)] }
const lenClass = (n) => (n <= 70 ? 'l' : n <= 110 ? 'm' : 's')

function Chip({ i, o, state, locked, onPick }) {
  const live = state === 'rest' && !locked
  const Tag = live ? 'button' : 'span'
  const mark = state === 'wrong' ? 'close' : null
  return (
    <Tag
      className="exb-chip u-clip-cut-sm"
      data-state={state}
      data-flip={o.id}
      data-where="bank"
      data-text={o.text}
      {...(live ? { type: 'button', onClick: () => onPick(o.id), 'aria-keyshortcuts': i < 9 ? String(i + 1) : undefined } : {})}
    >
      {mark ? <Icon.close className="exb-chip__led" size={16} /> : i < 9 ? <Kbd className="exb-chip__key" aria-hidden="true">{i + 1}</Kbd> : null}
      <span className="exb-chip__text">{o.text}</span>
      {state === 'wrong' ? <span className="u-sr">{T.yours}</span> : null}
    </Tag>
  )
}

// The step above draws the eyebrow and ex.prompt, and owns Enter (CHECK / CONTINUE); this draws the answering surface only.
export default function Blank({ ex, value, onChange, locked, graded }) {
  const root = useRef(null)
  const live = useRef(null)
  const focusNext = useRef(null)
  const snap = useFlight(root)
  const lite = useFxLevel() === 'lite' || isLite()

  const options = ex.options || []
  const cur = value && typeof value === 'object' ? value.id : value
  const curOpt = options.find((o) => o.id === cur) || null
  const wrong = !!graded && !graded.right

  // A wrong answer is shown first as given (red, struck), then the right word flies in. Lite skips the beat.
  const [fixed, setFixed] = useState(false)
  useEffect(() => {
    if (!wrong) { setFixed(false); return undefined }
    if (lite) return undefined
    const t = setTimeout(() => { snap(); setFixed(true) }, ms('--t-hero'))
    return () => clearTimeout(t)
  }, [wrong, lite, ex.id, snap])
  const showFix = wrong && (fixed || lite)
  const shownId = showFix ? ex.answer : cur
  const shown = options.find((o) => o.id === shownId) || null

  const state = !shown ? 'empty' : !graded ? 'picked' : graded.right || showFix ? 'right' : 'wrong'
  const maxLen = options.reduce((n, o) => Math.max(n, o.text.length), 4)

  const wasFocusInside = () => !!root.current && root.current.contains(document.activeElement)
  const pick = (id) => {
    if (locked) return
    const o = options.find((x) => x.id === id)
    if (!o) return
    const placing = cur !== id
    focusNext.current = wasFocusInside() ? (placing ? 'socket' : id) : null
    snap()
    onChange(placing ? id : null)
    sound.play(placing ? 'select' : 'deselect')
    haptic.select()
    say(live, placing ? T.placed(o.text) : T.removed(o.text))
  }
  const clear = () => {
    if (locked || !curOpt) return
    focusNext.current = wasFocusInside() ? curOpt.id : null
    snap()
    onChange(null)
    sound.play('deselect')
    haptic.tap()
    say(live, T.removed(curOpt.text))
  }

  useKeys(root, (e) => {
    if (/^[1-9]$/.test(e.key)) {
      const o = options[Number(e.key) - 1]
      if (o) { e.preventDefault(); pick(o.id) }
    } else if ((e.key === 'Backspace' || e.key === 'Delete') && curOpt) {
      e.preventDefault(); clear()
    }
  }, locked)

  // after a keyboard move the tile that had focus is gone: hand focus to where it went
  useLayoutEffect(() => {
    const f = focusNext.current
    if (!f || !root.current) return
    focusNext.current = null
    const el = f === 'socket' ? root.current.querySelector('button.exb-socket') : root.current.querySelector(`button[data-flip="${CSS.escape(f)}"]`)
    if (el) el.focus({ preventScroll: true })
  })

  const [bHead, bTail] = tailOf(ex.before || '')
  const [aHead, aTail] = headOf(ex.after || '')
  const interactive = !locked && !!curOpt
  const Sock = interactive ? 'button' : 'span'
  const verdict = state === 'right' && graded ? (graded.right ? T.right : T.answer) : state === 'wrong' ? T.wrong : ''
  const name = shown ? `${T.blank}: ${shown.text}. ${verdict || (interactive ? T.press : '')}`.trim() : `${T.blank}. ${checkHint('blank')}`

  return (
    <div ref={root} className="exb exb-blank" data-graded={graded ? (graded.right ? 'right' : 'wrong') : undefined}>
      <p className="exb-passage" data-len={lenClass((ex.before || '').length + (ex.after || '').length)}>
        {bHead}
        <span className="exb-nb">
          {bTail}
          <span className="exb-slot" data-state={state} style={{ '--exb-n': maxLen }}>
            <Sock
              className="exb-socket u-clip-cut-sm"
              data-state={graded && !graded.right ? 'selected' : undefined}
              {...(interactive ? { type: 'button', onClick: clear } : { role: 'img' })}
              aria-label={name}
            >
              {shown ? (
                <span className="exb-word" data-flip={shown.id} data-where="socket" data-text={shown.text}>{shown.text}</span>
              ) : (
                <span aria-hidden="true">{' '}</span>
              )}
              <i className="exb-socket__line" aria-hidden="true" />
            </Sock>
            {graded && state !== 'empty' ? (
              <span className="exb-led" data-tone={state === 'right' ? 'go' : 'nogo'} aria-hidden="true">
                {state === 'right' ? <Icon.check size={16} /> : <Icon.close size={16} />}
              </span>
            ) : null}
          </span>
          {aHead}
        </span>
        {aTail}
      </p>
      {ex.cite ? <p className="exb-cite">{ex.cite}</p> : null}

      <div className="exb-bank" data-kind="blank" role="group" aria-label={T.bank}>
        {options.map((o, i) => {
          if (o.id === shownId) {
            return (
              <span className="exb-bay u-clip-cut-sm" key={o.id} aria-hidden="true">
                <span>{o.text}</span>
              </span>
            )
          }
          const st = !graded ? 'rest' : showFix && o.id === cur ? 'wrong' : 'dim'
          return <Chip key={o.id} i={i} o={o} state={st} locked={locked} onPick={pick} />
        })}
      </div>

      <p ref={live} className="u-sr" role="status" aria-live="polite" />
    </div>
  )
}
