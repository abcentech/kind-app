// owner: ex-match — the Match renderer. A patch bay: terms down the left, answers (in the engine's order) down the right,
// and wires routed through the gutter between them. Contract: docs/V7-WAVE2.md §2 · value = { leftId: rightId } · pairUp/unpair in src/quiz.js.
//
//   · Tap a term, then its match (either order works). Tap a paired plate to unpair it. With a plate armed, tapping a paired
//     plate on the *other* side re-wires it instead (pairUp lets the right item leave its old partner).
//   · Nothing is judged until CHECK: a pair's colour is the colour of its *term* (stage-1..4) and its number is the term's number,
//     so neither colour nor number says anything about whether the pair is right.
//   · Graded: pairs go/nogo (dashed red wire), and every missed answer plate shows the term that belongs to it.
//   · Keys (focus inside): arrows move (Right/Left follows a wire), Enter arms / pairs / unpairs - and is CHECK once every pair is
//     made - Backspace unpairs, Esc cancels a pending pick, 1-4 pick a term, Ctrl/Cmd+Enter = onSubmit. Enter is only claimed
//     while the exercise is open, so CONTINUE keeps it.
//   · Wires are measured from layout offsets (immune to transforms, so a sheet or entry animation cannot skew them) and
//     re-measured by ResizeObserver / resize / font load. They live in the gutter only, so they never cross text.
// The prompt and the labelled group are the step's (.ex-view); this view draws only the interactive body.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { pairUp, unpair } from '../../../quiz.js'
import { Icon } from '../../../icons.jsx'
import { Label } from '../../../ui/index.js'
import { sound } from '../../../fx/sound.js'
import { haptic } from '../../../fx/haptics.js'

// Strings copy.js does not own yet (see REQUESTS): the live-region phrases and the three one-line hints.
const T = {
  terms: 'Terms', answers: 'Answers',
  tap: 'Tap a term, then its match.', now: 'Now tap its match.', full: 'Every pair made. Check it.',
  hit: 'Every pair true.', miss: 'Not yet. Each miss shows its true match.',
  paired: 'Paired', correct: 'Correct', pairsWith: 'Pairs with',
}
const COLOURS = 4          // --stage-1..4
const R = 8                // wire corner radius (px); shrinks where the gutter or the drop is tighter

const sent = (t) => (/[.!?”’"]$/.test(t) ? t : t + '.')    // a sentence for the screen reader: never '..'
const clamp = (lo, hi, x) => Math.min(hi, Math.max(lo, x))
const avg = (a) => a.reduce((s, x) => s + x.length, 0) / Math.max(1, a.length)
// A long answer column gets more room; a long term column gets more room back. Never lopsided enough to starve either side.
const ratioOf = (pairs) => { const l = avg(pairs.map((p) => p.left)), r = avg(pairs.map((p) => p.right)); return clamp(0.44, 0.56, l / (l + r || 1)) }

/** Orthogonal trace with rounded corners: out of the left plate, down its own lane in the gutter, into the right plate. */
function wirePath(x1, y1, x2, y2, lane) {
  const dy = Math.abs(y2 - y1)
  if (dy < 0.75) return `M${x1} ${y1}H${x2}`
  const s = y2 > y1 ? 1 : -1
  const r = Math.max(0.5, Math.min(R, lane - x1, x2 - lane, dy / 2))
  return `M${x1} ${y1}H${lane - r}Q${lane} ${y1} ${lane} ${y1 + s * r}V${y2 - s * r}Q${lane} ${y2} ${lane + r} ${y2}H${x2}`
}

/** The hexagonal terminal. `n` = the term's number (empty slot when null); `status` adds the go/nogo pip once graded. */
function Pin({ n, status, mini, pinRef }) {
  return (
    <span ref={pinRef} className="exm-pin" data-mini={mini ? '' : undefined} aria-hidden="true">
      <span className="exm-hex"><span className="exm-hex__in">{n == null ? '' : n}</span></span>
      {status ? <span className="exm-pip" data-s={status}><Icon name={status === 'go' ? 'check' : 'close'} size={16} /></span> : null}
    </span>
  )
}

export default function Match({ ex, value, onChange, locked = false, graded = null, onSubmit }) {
  const pairs = ex.pairs || []
  const n = pairs.length
  const byId = useMemo(() => { const m = {}; pairs.forEach((p, i) => { m[p.id] = { ...p, i } }); return m }, [pairs])
  // The engine's order, never reshuffled. (Fallback only if a hand-built exercise has no rightOrder: rotate so nothing sits level.)
  const rights = useMemo(() => {
    const ok = Array.isArray(ex.rightOrder) && ex.rightOrder.length === n && ex.rightOrder.every((id) => byId[id])
    const ids = ok ? ex.rightOrder : pairs.map((_, i) => pairs[(i + 1) % n].id)
    return ids.map((id) => byId[id])
  }, [ex.rightOrder, pairs, byId, n])
  const ri = useMemo(() => { const m = {}; rights.forEach((r, j) => { m[r.id] = j }); return m }, [rights])
  const ratio = useMemo(() => ratioOf(pairs), [pairs])

  // The response, sanitised: known ids only, one-to-one.
  const v = useMemo(() => {
    const out = {}, used = new Set()
    if (value && typeof value === 'object') for (const p of pairs) { const r = value[p.id]; if (r != null && byId[r] && !used.has(r)) { out[p.id] = r; used.add(r) } }
    return out
  }, [value, pairs, byId])
  const owner = useMemo(() => { const o = {}; for (const l of Object.keys(v)) o[v[l]] = l; return o }, [v])
  const made = Object.keys(v).length
  const judged = !!graded
  const hits = pairs.filter((p) => v[p.id] === p.id).length

  const [pending, setPending] = useState(null)       // { side: 'l'|'r', id }
  const [focusKey, setFocusKey] = useState('l0')     // roving tabindex: one tab stop for the whole board
  const [live, setLive] = useState('')
  const [geo, setGeo] = useState(null)
  const rootRef = useRef(null)
  const cells = useRef({})
  const pins = useRef({})
  const btns = useRef({})

  useEffect(() => { setPending(null); setFocusKey('l0'); setLive('') }, [ex.id])
  useEffect(() => { if (locked) setPending(null) }, [locked])

  /* ── measure ─────────────────────────────────────────────────────────── */
  // Wires hang off the hex terminals (not the plate's middle: a missed answer grows a caption below its pin).
  const measure = useCallback(() => {
    const root = rootRef.current, l0 = cells.current.l0, r0 = cells.current.r0
    if (!root || !l0 || !r0) return
    const yOf = (el) => { let y = 0, e = el; while (e && e !== root) { y += e.offsetTop; e = e.offsetParent } return y + el.offsetHeight / 2 }
    const g = { w: root.offsetWidth, h: root.offsetHeight, lx: l0.offsetLeft + l0.offsetWidth, rx: r0.offsetLeft, l: [], r: [] }
    for (let k = 0; k < n; k++) {
      const a = pins.current['l' + k], b = pins.current['r' + k]
      if (!a || !b) return
      g.l.push(yOf(a)); g.r.push(yOf(b))
    }
    setGeo((p) => (p && p.w === g.w && p.h === g.h && p.lx === g.lx && p.rx === g.rx && p.l.join() === g.l.join() && p.r.join() === g.r.join() ? p : g))
  }, [n])
  useLayoutEffect(() => { measure() }, [measure, ex.id])
  useEffect(() => {
    let raf = 0
    const go = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure) }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(go) : null
    if (ro) { ro.observe(rootRef.current); Object.values(cells.current).forEach((el) => el && ro.observe(el)) }
    window.addEventListener('resize', go)
    const fonts = typeof document !== 'undefined' ? document.fonts : null
    if (fonts) { fonts.ready.then(go); if (fonts.addEventListener) fonts.addEventListener('loadingdone', go) }
    return () => {
      cancelAnimationFrame(raf); if (ro) ro.disconnect(); window.removeEventListener('resize', go)
      if (fonts && fonts.removeEventListener) fonts.removeEventListener('loadingdone', go)
    }
  }, [measure, ex.id])

  /* ── interaction ─────────────────────────────────────────────────────── */
  const focusPlate = (side, i) => { const key = side + i; setFocusKey(key); const b = btns.current[key]; if (b) b.focus() }
  const nearest = (from, i, to) => {
    const a = cells.current[from + i]; if (!a) return 0
    const y = a.offsetTop + a.offsetHeight / 2
    let best = 0, bd = Infinity
    for (let k = 0; k < n; k++) { const c = cells.current[to + k]; if (c) { const d = Math.abs(c.offsetTop + c.offsetHeight / 2 - y); if (d < bd) { bd = d; best = k } } }
    return best
  }
  const fb = (kind) => {
    if (kind === 'pick') { sound.play('select'); haptic.select() }
    else if (kind === 'pair') { sound.play('toggle', { on: true }); haptic.select() }
    else { sound.play('deselect'); haptic.tap() }
  }

  const activate = (side, id, viaKey) => {
    if (locked || !byId[id]) return
    const isL = side === 'l'
    const item = byId[id]
    const partnerId = isL ? v[id] : owner[id]                      // the other side's id, if paired
    if (pending && pending.side !== side) {                         // armed on the other side: make the pair (re-wiring if needed)
      const l = isL ? id : pending.id, r = isL ? pending.id : id
      const next = pairUp(ex, v, l, r)
      const total = Object.keys(next).length
      setPending(null); onChange(next); fb('pair')
      setLive(`${T.paired} ${byId[l].i + 1}, ${byId[l].left}, with ${sent(byId[r].right)} ${total} of ${n}.${total === n ? ' ' + T.full : ''}`)
      if (viaKey) { const at = byId[l].i; for (let k = 1; k <= n; k++) { const j = (at + k) % n; if (next[pairs[j].id] == null) { focusPlate('l', j); break } } }
      return
    }
    if (pending && pending.id === id) { setPending(null); fb('off'); setLive(''); return }   // tap the armed plate again: disarm
    if (partnerId != null) {                                        // paired: unpair
      const l = isL ? id : partnerId
      setPending(null); onChange(unpair(v, l)); fb('off')
      setLive(`Unpaired ${byId[l].left}. ${made - 1} of ${n}.`)
      return
    }
    setPending({ side, id }); fb('pick')                            // arm
    setLive(`${sent(isL ? byId[id].left : byId[id].right)} Selected. ${isL ? 'Choose its match.' : 'Choose its term.'}`)
  }

  const onKeyDown = (e) => {
    const el = e.target.closest ? e.target.closest('[data-plate]') : null
    if (!el || e.altKey) return
    const side = el.dataset.side, i = +el.dataset.i
    const col = side === 'l' ? pairs : rights
    const stop = () => { e.preventDefault(); e.stopPropagation() }
    const k = e.key
    if (k === 'Enter' && (e.ctrlKey || e.metaKey)) { if (onSubmit && !locked) { stop(); onSubmit() } return }
    if (locked) return
    const partnerOf = side === 'l' ? v[col[i].id] : owner[col[i].id]
    if (k === 'ArrowDown') { stop(); focusPlate(side, Math.min(n - 1, i + 1)) }
    else if (k === 'ArrowUp') { stop(); focusPlate(side, Math.max(0, i - 1)) }
    else if (k === 'Home') { stop(); focusPlate(side, 0) }
    else if (k === 'End') { stop(); focusPlate(side, n - 1) }
    else if ((k === 'ArrowRight' && side === 'l') || (k === 'ArrowLeft' && side === 'r')) {
      stop()
      const to = side === 'l' ? 'r' : 'l'
      focusPlate(to, partnerOf != null ? (to === 'r' ? ri[partnerOf] : byId[partnerOf].i) : nearest(side, i, to))
    }
    else if (k === 'Enter') {
      stop()
      if (!pending && partnerOf != null && made === n && onSubmit) onSubmit()     // every pair made: Enter is CHECK, as everywhere else in the lesson (Backspace unpairs)
      else activate(side, col[i].id, true)
    }
    else if (k === 'Backspace' || k === 'Delete') { if (partnerOf != null) { stop(); activate(side, col[i].id) } }
    else if (k === 'Escape') { if (pending) { stop(); setPending(null); fb('off'); setLive('') } }
    else if (/^[1-9]$/.test(k) && +k <= n && !e.ctrlKey && !e.metaKey) { stop(); focusPlate('l', +k - 1); activate('l', pairs[+k - 1].id, true) }
  }

  /* ── render ──────────────────────────────────────────────────────────── */
  const stateOf = (side, id, partnerId) => {
    if (judged) return partnerId != null && partnerId === id ? 'go' : 'nogo'
    if (pending && pending.side === side && pending.id === id) return 'pending'
    return partnerId != null ? 'paired' : 'rest'
  }
  const targetSide = pending ? (pending.side === 'l' ? 'r' : 'l') : null

  const cell = (side, item, idx) => {
    const isL = side === 'l'
    const partnerId = isL ? v[item.id] : owner[item.id]
    const partner = partnerId != null ? byId[partnerId] : null
    const state = stateOf(side, item.id, partnerId)
    const c = isL ? item.i : partner ? partner.i : undefined         // colour = the term's
    const num = isL ? item.i + 1 : partner ? partner.i + 1 : null
    const text = isL ? item.left : item.right
    const key = side + idx
    const miss = judged && state === 'nogo'
    const status = judged ? (state === 'go' ? 'go' : 'nogo') : undefined
    let label
    if (isL) {
      label = `${item.i + 1}. ${sent(text)} ` + (judged
        ? (state === 'go' ? `${T.correct}. Paired with ${sent(partner.right)}` : `Not yet. ${partner ? `You paired it with ${sent(partner.right)}` : 'Not paired.'}`)
        : state === 'pending' ? 'Choose its match.' : partner ? `Paired with ${sent(partner.right)} Press to unpair.` : 'Not paired.')
    } else {
      const who = partner ? sent(`${partner.i + 1}, ${partner.left}`) : ''
      label = `${sent(text)} ` + (judged
        ? (state === 'go' ? `${T.correct}. Paired with ${who}` : `Not yet. ${partner ? `You paired it with ${who}` : 'Not paired.'} It pairs with ${sent(`${item.i + 1}, ${item.left}`)}`)
        : state === 'pending' ? 'Choose its term.' : partner ? `Paired with ${who} Press to unpair.` : 'Not paired.')
    }
    const pin = <Pin n={num} status={status} pinRef={(el) => { pins.current[key] = el }} />
    return (
      <li
        key={item.id}
        ref={(el) => { cells.current[key] = el }}
        className="exm-cell u-cut-frame is-block"
        data-side={side}
        data-state={state}
        data-c={c == null ? undefined : c % COLOURS}
        data-target={!judged && targetSide === side && state === 'rest' ? '' : undefined}
        style={{ '--exm-d': idx + (isL ? 0 : 1) }}
      >
        <button
          type="button"
          ref={(el) => { btns.current[key] = el }}
          className="exm-plate u-no-select"
          data-plate=""
          data-side={side}
          data-i={idx}
          tabIndex={focusKey === key ? 0 : -1}
          aria-pressed={!judged && state === 'pending'}
          aria-disabled={locked || undefined}
          aria-label={label}
          onFocus={() => setFocusKey(key)}
          onClick={(e) => activate(side, item.id, e.detail === 0)}
        >
          <span className="exm-face">
            <span className="exm-main">
              {isL ? null : pin}
              <span className="exm-text">{text}</span>
              {isL ? pin : null}
            </span>
            {!isL && miss ? (
              <span className="exm-key">
                <Label mono tone="go">{T.pairsWith}</Label>
                <span className="exm-key__row"><Pin n={item.i + 1} mini /><span className="exm-key__text">{item.left}</span></span>
              </span>
            ) : null}
          </span>
        </button>
      </li>
    )
  }

  const stub = () => {
    if (!geo || !pending || !byId[pending.id]) return null
    const l = pending.side === 'l'
    const idx = l ? byId[pending.id].i : ri[pending.id]
    const y = (l ? geo.l : geo.r)[idx]
    const x = l ? geo.lx : geo.rx
    if (y == null) return null
    const len = (geo.rx - geo.lx) * 0.55 * (l ? 1 : -1)
    return (
      <g className="exm-wire exm-wire--pending" key="pending">
        <path className="exm-stub" d={`M${x} ${y}h${len}`} />
        <circle className="exm-jack" cx={x} cy={y} r={3} />
      </g>
    )
  }

  const hint = judged ? (hits === n ? T.hit : T.miss) : pending ? T.now : made === n ? T.full : T.tap
  const meter = judged ? `${T.correct} ${hits}/${n}` : `${T.paired} ${made}/${n}`

  return (
    <div
      className="exm"
      data-judged={judged ? '' : undefined}
      data-locked={locked ? '' : undefined}
      onKeyDown={onKeyDown}
    >
      <div className="exm-head">
        <span className="exm-hint" data-tone={pending ? 'tele' : judged ? (hits === n ? 'go' : 'nogo') : undefined} aria-hidden="true">{hint}</span>
        <span className="exm-meter">
          <span className="exm-ticks" aria-hidden="true">
            {pairs.map((p, i) => {
              const on = v[p.id] != null
              return <i key={p.id} className="exm-tick" data-c={i % COLOURS} data-on={on ? '' : undefined} data-ok={judged ? (v[p.id] === p.id ? 'go' : 'nogo') : undefined} />
            })}
          </span>
          <Label mono>{meter}</Label>
        </span>
      </div>

      <div
        className="exm-grid"
        ref={rootRef}
        style={{ '--exm-lw': `${ratio.toFixed(3)}fr`, '--exm-rw': `${(1 - ratio).toFixed(3)}fr` }}
      >
        <ul className="exm-col" data-side="l" aria-label={T.terms}>{pairs.map((p, i) => cell('l', byId[p.id], i))}</ul>
        <ul className="exm-col" data-side="r" aria-label={T.answers}>{rights.map((r, j) => cell('r', r, j))}</ul>
        {geo ? (
          <svg className="exm-wires" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true" focusable="false">
            {pairs.map((p, i) => {
              const rid = v[p.id]
              if (rid == null) return null
              const yl = geo.l[i], yr = geo.r[ri[rid]]
              if (yl == null || yr == null) return null
              const miss = judged && rid !== p.id
              const d = wirePath(geo.lx, yl, geo.rx, yr, geo.lx + ((geo.rx - geo.lx) * (i + 1)) / (n + 1))
              const len = miss ? undefined : 1                      // normalised length → a draw-on that is the same speed on any wire
              return (
                <g key={p.id + '>' + rid} className="exm-wire" data-c={i % COLOURS} data-ok={judged ? (miss ? 'nogo' : 'go') : undefined}>
                  <path className="exm-trace exm-halo" d={d} pathLength={len} />
                  <path className="exm-trace exm-line" d={d} pathLength={len} />
                  <circle className="exm-jack" cx={geo.lx} cy={yl} r={3} />
                  <circle className="exm-jack" cx={geo.rx} cy={yr} r={3} />
                </g>
              )
            })}
            {stub()}
          </svg>
        ) : null}
      </div>

      <p className="u-sr" role="status" aria-live="polite">{live}</p>
    </div>
  )
}
