// Foundation poster — the design-system reference for every builder. Reads tokens LIVE from the stylesheet
// (nothing here is a picture of a value), so it can never drift from tokens.css / base.css.
import React, { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { mount } from './_boot.jsx'
import './foundation.css'

/* ───────────────────────────────────────────────────────────── live token + colour maths */
const rootEl = () => document.documentElement
const tok = (name) => getComputedStyle(rootEl()).getPropertyValue(name).trim()
const px = (name) => { const v = tok(name); return v.endsWith('rem') ? parseFloat(v) * 16 : parseFloat(v) }

let probeEl
const probe = () => {
  if (!probeEl) {
    probeEl = document.createElement('i'); probeEl.setAttribute('aria-hidden', 'true')
    probeEl.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;forced-color-adjust:none'
    probeEl.style.setProperty('transition', 'none', 'important')   // lite cross-fades colour; a measuring probe must not
    document.body.appendChild(probeEl)
  }
  return probeEl
}
const resolveColor = (expr) => { const el = probe(); el.style.color = ''; el.style.color = expr; return getComputedStyle(el).color }
const parseRGBA = (s) => {
  let m = s.match(/^rgba?\(([^)]+)\)$/)
  if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p[3] ?? 1] }
  m = s.match(/^color\(srgb ([^)]+)\)$/)
  if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1] }
  // oklab(), lab(), color(display-p3 ...): let a canvas convert it
  const c = (parseRGBA.cv ||= document.createElement('canvas').getContext('2d', { willReadFrequently: true }))
  c.clearRect(0, 0, 1, 1); c.fillStyle = '#000'; c.fillStyle = s; c.fillRect(0, 0, 1, 1)
  const d = c.getImageData(0, 0, 1, 1).data
  return [d[0], d[1], d[2], d[3] / 255]
}
const rgbaOf = (expr) => parseRGBA(resolveColor(expr))
const over = (fg, bg) => (fg[3] >= 1 ? fg : [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1))
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const ratioOf = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const contrast = (fgExpr, bgExpr) => { const bg = rgbaOf(bgExpr); return ratioOf(over(rgbaOf(fgExpr), bg), bg) }
const V = (name) => `var(${name})`
const grade = (r) => (r >= 7 ? 'aaa' : r >= 4.5 ? 'aa' : r >= 3 ? 'ui' : 'fail')
const GRADE_LABEL = { aaa: 'AAA', aa: 'AA', ui: 'UI·LARGE', fail: 'FAIL' }

const obs = { mo: null }   // the root-attribute observer, so a self-test can discard its own mutations
const RevCtx = createContext(0)
const useRev = () => useContext(RevCtx)
function RevProvider({ children }) {
  const [rev, setRev] = useState(0)
  useEffect(() => {
    const bump = () => setRev((r) => r + 1)
    const mo = new MutationObserver(bump)
    mo.observe(rootEl(), { attributes: true, attributeFilter: ['data-contrast', 'data-fx'] }); obs.mo = mo
    const mqs = ['(prefers-contrast: more)', '(forced-colors: active)', '(prefers-reduced-motion: reduce)'].map((q) => matchMedia(q))
    mqs.forEach((m) => m.addEventListener('change', bump))
    return () => { mo.disconnect(); mqs.forEach((m) => m.removeEventListener('change', bump)) }
  }, [])
  return <RevCtx.Provider value={rev}>{children}</RevCtx.Provider>
}

function useMedia(q) {
  const [m, setM] = useState(() => matchMedia(q).matches)
  useEffect(() => { const mq = matchMedia(q); const f = () => setM(mq.matches); f(); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f) }, [q])
  return m
}
function useBeat(ms) {
  const [n, setN] = useState(0)
  useEffect(() => { const id = setInterval(() => setN((x) => x + 1), ms); return () => clearInterval(id) }, [ms])
  return [n, () => setN((x) => x + 1)]
}
function useMetrics(ref) {
  const [m, setM] = useState('')
  useEffect(() => {
    const el = ref.current; if (!el) return undefined
    const read = () => {
      const s = getComputedStyle(el); const fs = parseFloat(s.fontSize); const lh = parseFloat(s.lineHeight)
      setM(`${Math.round(fs * 10) / 10}px · w${s.fontWeight} · lh ${Number.isFinite(lh) ? Math.round((lh / fs) * 100) / 100 : s.lineHeight}`)
    }
    read(); const ro = new ResizeObserver(read); ro.observe(el); return () => ro.disconnect()
  }, [ref])
  return m
}
function useUptime() {
  const t0 = useRef(Date.now()); const [t, setT] = useState('T+00:00:00')
  useEffect(() => {
    const id = setInterval(() => { const s = Math.floor((Date.now() - t0.current) / 1000); const p = (n) => String(n).padStart(2, '0'); setT(`T+${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`) }, 1000)
    return () => clearInterval(id)
  }, [])
  return t
}

/* ───────────────────────────────────────────────────────────── page chrome */
const SECTIONS = [['colour', '01', 'Colour'], ['type', '02', 'Type'], ['shape', '03', 'Geometry'], ['light', '04', 'Light'], ['motion', '05', 'Motion'], ['access', '06', 'Access'], ['rules', '07', 'Rules']]

function useFx() {
  const [fx, set] = useState(() => rootEl().dataset.fx || 'full')
  useEffect(() => { rootEl().dataset.fx = fx }, [fx])
  return [fx, set]
}
function useContrastToggle() {
  const [on, set] = useState(() => rootEl().dataset.contrast === 'more')
  useEffect(() => { if (on) rootEl().dataset.contrast = 'more'; else delete rootEl().dataset.contrast }, [on])
  return [on, set]
}

/* Phone: the bar slides away as you read down and returns the moment you scroll up (Safari's own rhythm), so the
   sheet gets back 109 px of a 640 px screen. Desktop keeps it pinned. Focus inside the bar, or a tap on a section
   link, always shows it; a section jump never hides it on arrival. */
function useAutoHide(navRef) {
  const [hidden, setHidden] = useState(false)
  const hold = useRef(0)
  useEffect(() => {
    let last = scrollY; let ticking = false
    const onScroll = () => {
      if (ticking) return; ticking = true
      requestAnimationFrame(() => {
        ticking = false
        const y = scrollY; const dy = y - last
        if (Math.abs(dy) < 8) return
        last = y
        if (matchMedia('(min-width: 900px)').matches || performance.now() < hold.current) { setHidden(false); return }
        setHidden(dy > 0 && y > 220 && !navRef.current?.contains(document.activeElement))
      })
    }
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [navRef])
  return [hidden, () => { hold.current = performance.now() + 1100; setHidden(false) }, () => setHidden(false)]
}

function Nav({ active }) {
  const [fx, setFx] = useFx(); const [hc, setHc] = useContrastToggle()
  const navRef = useRef(null); const rowRef = useRef(null)
  const [hidden, hold, show] = useAutoHide(navRef)
  useEffect(() => {   // keep the current section's link centred in the strip
    const row = rowRef.current; const el = row?.querySelector('[aria-current="true"]'); if (!row || !el) return
    const left = el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2
    row.scrollTo({ left, behavior: rootEl().dataset.fx === 'lite' ? 'auto' : 'smooth' })
  }, [active])
  return (
    <nav ref={navRef} className="pf-nav" data-glass data-hidden={hidden ? 'true' : undefined} aria-label="Sections" onFocus={show}>
      <div className="pf-wrap pf-nav__bar">
        <a className="pf-brand t-label-sm" href="#top" onClick={hold}><i className="pf-brand__hex" aria-hidden="true" /><span><b>KIND</b> · V7<span className="pf-brand__more"> · FOUNDATION</span></span></a>
        <div className="pf-seg t-label-sm" role="group" aria-label="Effects level">
          <button type="button" aria-pressed={fx === 'full'} onClick={() => setFx('full')}>Full</button>
          <button type="button" aria-pressed={fx === 'lite'} onClick={() => setFx('lite')}>Lite</button>
        </div>
        <button type="button" className="pf-toggle t-label-sm" aria-pressed={hc} aria-label="Contrast plus" onClick={() => setHc(!hc)}><i className="pf-led" aria-hidden="true" /><span className="pf-toggle__t" aria-hidden="true">Contrast+</span><span className="pf-toggle__s" aria-hidden="true">HC</span></button>
        <div ref={rowRef} className="pf-nav__links u-scroll-x u-noscrollbar u-fade-x">
          {SECTIONS.map(([id, n, label]) => (
            <a key={id} href={`#${id}`} className="pf-link t-label" aria-current={active === id ? 'true' : undefined} onClick={hold}><i className="t-mono-sm">{n}</i>{label}</a>
          ))}
        </div>
      </div>
    </nav>
  )
}

function Sec({ id, n, title, kicker, children }) {
  return (
    <section id={id} className="pf-sec" aria-labelledby={`${id}-h`}>
      <div className="pf-wrap">
        <div className="pf-sechead">
          <span className="pf-secnum t-display" aria-hidden="true">{n}</span>
          <div><h2 id={`${id}-h`} className="t-title">{title}</h2><p className="t-mono-sm">{kicker}</p></div>
        </div>
        <div className="u-ruler" aria-hidden="true" />
        {children}
      </div>
    </section>
  )
}
/* --tokens and .classes in a note must never break at their hyphen: wrap each in a nowrap span */
const Note = ({ children }) => (typeof children !== 'string' ? children : children.split(/((?:--|\.)[a-z][a-z0-9-]*(?:\*)?)/g).map((t, i) => (i % 2 ? <span key={i} className="u-nowrap">{t}</span> : t)))
const Sub = ({ title, note, children }) => (
  <div className="pf-sub"><h3 className="t-label">{title}</h3>{note && <p className="t-caption pf-note"><Note>{note}</Note></p>}{children}</div>
)

function Badge({ a, b, label }) {
  useRev()
  const r = contrast(a, b); const g = grade(r)
  return <span className={`pf-badge is-${g}`} title={label}><span>{r.toFixed(r >= 10 ? 1 : 2)}</span>{GRADE_LABEL[g]}</span>
}

/* ───────────────────────────────────────────────────────────── hero */
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const STARS = (() => { const r = mulberry(7); return Array.from({ length: 96 }, (_, i) => ({ x: r() * 100, y: r() * 100, r: 0.4 + r() * 1.0, o: 0.2 + r() * 0.7, tw: i % 8 === 0, d: r() * 3 })) })()

function countTokens() {
  const names = new Set(); let layers = 6
  const walk = (rules) => { for (const r of rules) { if (r.nameList) layers = r.nameList.length; if (r.selectorText && r.selectorText.trim() === ':root') for (const p of r.style) if (p.startsWith('--')) names.add(p); if (r.cssRules) walk(r.cssRules) } }
  for (const s of document.styleSheets) { try { walk(s.cssRules) } catch { /* cross-origin sheet */ } }
  return { tokens: names.size, layers, springs: [...names].filter((n) => /^--spring-[a-z]+$/.test(n)).length }
}

const TEXT_ROWS = ['--ink', '--ink-2', '--ink-3', '--tele', '--tele-2', '--ignite-1', '--ignite-2', '--ignite-3', '--ignite-flat', '--go', '--nogo', '--warn', '--gold-1', '--gold-2', '--stage-1', '--stage-2', '--stage-3', '--stage-4', '--stage-5']
const BGS = ['--carbon-0', '--carbon-1', '--carbon-2', '--carbon-3', '--carbon-4']
const TEXT_BGS = BGS.slice(0, 4)   // carbon-4 is the strongest fill (tracks, pressed): never a reading surface

function failingPairs() {
  const out = []
  for (const t of TEXT_ROWS) for (const b of TEXT_BGS) { const r = contrast(V(t), V(b)); if (r < 4.5) out.push({ t, b, r }) }
  return out
}

function Hero() {
  const rev = useRev(); const up = useUptime(); const [gk, setGk] = useState(0)
  const info = useMemo(countTokens, [])
  const fails = useMemo(failingPairs, [rev])
  const [fx] = useFx()
  const check = useSelfCheckSummary()
  return (
    <header id="top" className="pf-wrap pf-hero">
      <div>
        <p className="pf-eyebrow t-label-sm">Design system · Foundation sheet · Ascent</p>
        <div className="pf-hero__num">
          <span className="t-display t-display-xl t-ignite" aria-label="Version 7">V7</span>
          <span className="t-display t-display-sm pf-hero__word" aria-hidden="true">Ascent</span>
          <Gauge label="V7" className="pf-hero__gauge-m" k={gk} onReplay={() => setGk((x) => x + 1)} />
        </div>
        <p className="pf-hero__tag">A spaceport with a chapel in it.</p>
        <p className="t-body-sm pf-hero__lede">Cold, exact hardware around a warm, living Word. This sheet is the ground every screen stands on: tokens, type, light, motion and the access layer. Every value on it is read live from the stylesheet.</p>
        <svg className="pf-flight" viewBox="0 0 600 150" role="img" aria-label="Decorative flight path from pad to orbit">
          <path className="a" d="M6 140 C 200 140, 380 118, 594 22" />
          <path className="b" pathLength="1" d="M6 140 C 200 140, 380 118, 594 22" />
          {[[6, 140, 'T+00:00 PAD', 0, 22, 'start'], [150, 133, 'LIFTOFF', 0, -12, 'middle'], [300, 112, 'MAX-Q', 0, 22, 'middle'], [450, 74, 'MECO', 0, -12, 'middle'], [594, 22, 'ORBIT', -8, -10, 'end']].map(([x, y, l, dx, dy, an]) => (
            <g key={l}><circle cx={x} cy={y} r="2.5" /><text x={x + dx} y={y + dy} textAnchor={an}>{l}</text></g>
          ))}
        </svg>
      </div>
      <div className="pf-hero__side">
      <Gauge label="V7" className="pf-hero__gauge is-xl" k={gk} onReplay={() => setGk((x) => x + 1)} />
      <div className="pf-readout u-carbon u-clip-cut">
        <header><span className="t-label-sm">Telemetry</span><span className="t-mono-sm" aria-live="off">{up}</span></header>
        <dl className="t-mono">
          <dt>TOKENS</dt><dd>{info.tokens}</dd>
          <dt>LAYERS</dt><dd>{info.layers}</dd>
          <dt>FAMILIES</dt><dd>4</dd>
          <dt>SPRINGS</dt><dd>{info.springs}</dd>
          <dt>TEXT PAIRS &lt; 4.5:1</dt><dd className={fails.length ? 'is-warn' : ''}>{fails.length}</dd>
          <dt>FX</dt><dd>{fx.toUpperCase()}</dd>
          <dt>CONTRAST</dt><dd>{rootEl().dataset.contrast === 'more' ? 'MORE' : 'STANDARD'}</dd>
          <dt>SELF-CHECK</dt><dd>{check}</dd>
        </dl>
      </div>
      </div>
    </header>
  )
}

/* ───────────────────────────────────────────────────────────── 01 colour */
function Swatch({ token, role, ink = '--ink', tall, onLabel }) {
  useRev()
  return (
    <div className="pf-card pf-sw">
      <div className={`pf-sw__chip${tall ? ' is-tall' : ''}`} style={{ background: V(token), color: V(ink) }}>
        <span className="pf-sw__aa">Aa</span>
        <Badge a={V(ink)} b={V(token)} label={onLabel} />
      </div>
      <div className="pf-sw__meta"><b>{token}</b><span>{tok(token)}</span>{role && <em>{role}</em>}</div>
    </div>
  )
}
function GradBar({ token, stops, label }) {
  useRev()
  return (
    <div>
      <div className="pf-bar" role="img" aria-label={label} style={{ background: V(token) }} />
      <div className="pf-stops t-mono-sm">{stops.map((s) => <span key={s}>{s}<br />{tok(s)}</span>)}</div>
    </div>
  )
}
function StageHex({ n }) {
  return (
    <div className="pf-stage" style={{ '--stage': V(`--stage-${n}`), '--stage-glow': V(`--stage-${n}-glow`) }}>
      <div className="pf-stage__glow"><div className="pf-stage__hex"><span>{n}</span></div></div>
      <div className="t-mono-sm">--stage-{n}<br />{tok(`--stage-${n}`)}</div>
    </div>
  )
}

const MX = [
  ['Ink', [['--ink', 1], ['--ink-2', 1], ['--ink-3', 1], ['--ink-4', 0]]],
  ['Signal', [['--tele', 1], ['--tele-2', 1], ['--ignite-1', 1], ['--ignite-2', 1], ['--ignite-3', 1], ['--ignite-flat', 1], ['--go', 1], ['--nogo', 1], ['--warn', 1]]],
  ['Foil + metal', [['--gold-1', 1], ['--gold-2', 1], ['--gold-3', 0], ['--ti-2', 1], ['--ti-3', 0]]],
  ['Stage', [['--stage-1', 1], ['--stage-2', 1], ['--stage-3', 1], ['--stage-4', 1], ['--stage-5', 1]]],
]
function ContrastMatrix() {
  const rev = useRev()
  const rows = useMemo(() => MX.map(([g, list]) => [g, list.map(([t, isText]) => [t, isText, BGS.map((b) => contrast(V(t), V(b)))])]), [rev])
  return (
    <div className="pf-mx" role="region" aria-label="Contrast matrix, scrolls sideways" tabIndex={0}>
      <table>
        <thead><tr><th scope="col" style={{ textAlign: 'left', paddingLeft: 'var(--s-3)' }}>TOKEN ON ›</th>{BGS.map((b) => <th key={b} scope="col">{b.replace('--carbon-', 'C')}</th>)}</tr></thead>
        <tbody>
          {rows.map(([g, list]) => (
            <React.Fragment key={g}>
              <tr className="is-group"><th colSpan={BGS.length + 1} scope="colgroup">{g}</th></tr>
              {list.map(([t, isText, rs]) => (
                <tr key={t}>
                  <th scope="row" className={isText ? undefined : 'is-decor'} title={isText ? t : `${t}: decorative only, never text`}><i style={{ '--dot': V(t) }} />{t.slice(2)}</th>
                  {rs.map((r, i) => {
                    const bad = isText && r < 4.5 && TEXT_BGS.includes(BGS[i])
                    return (
                      <td key={BGS[i]}>
                        <div className={`pf-cell${bad ? ' is-fail' : ''}${isText ? '' : ' is-decor'}`} style={{ background: V(BGS[i]) }}>
                          <b style={{ color: V(t), fontSize: 'var(--fs-md)' }}>Aa</b>
                          <small style={{ color: V('--ink-2') }}>{r.toFixed(r >= 10 ? 1 : 2)}{bad ? ' ×' : ''}</small>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const SUGGEST = { '--ink-3': '#8890a7' }
const hexContrast = (hex, bg) => contrast(hex, V(bg))
function ContrastReport() {
  const rev = useRev()
  const fails = useMemo(failingPairs, [rev])
  const edge = useMemo(() => ({ line3: contrast(V('--line-3'), V('--carbon-1')), ink3: contrast(V('--ink-3'), V('--carbon-1')) }), [rev])
  const byTok = fails.reduce((m, f) => ((m[f.t] ||= []).push(f), m), {})
  return (
    <div className="u-stack" style={{ '--gap': 'var(--s-3)' }}>
      {fails.length === 0
        ? <div className="pf-callout is-ok"><p className="t-label">All text tokens clear 4.5:1 on carbon-0 to carbon-3</p><p className="t-caption">carbon-4 is a fill (tracks, pressed states), never a reading surface.</p></div>
        : (
          <div className="pf-callout" role="note">
            <p className="t-label">Request · {fails.length} text pair{fails.length === 1 ? '' : 's'} below 4.5:1</p>
            <ul>
              {Object.entries(byTok).map(([t, list]) => (
                <li key={t} className="t-mono-sm">
                  <b className="t-c-ink">{t}</b> fails on {list.map((f) => `${f.b.replace('--carbon-', 'C')} ${f.r.toFixed(2)}`).join(' · ')}
                  {SUGGEST[t] && <span> → suggest <b className="t-c-go u-nowrap">{SUGGEST[t]}</b>: {BGS.map((b) => hexContrast(SUGGEST[t], b).toFixed(2)).join(' / ')} on C0–C4</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      <div className="pf-callout" role="note">
        <p className="t-label">Control boundaries need 3:1 (WCAG 1.4.11)</p>
        <p className="t-mono-sm">--line-3 on carbon-1 = <b className="t-c-ink">{edge.line3.toFixed(2)}</b>{edge.line3 < 3 ? ' ×  — hairlines are decoration, never the only edge of an input, switch or unselected chip.' : ' ✓'}</p>
        <p className="t-mono-sm">--ink-3 on carbon-1 = <b className="t-c-ink">{edge.ink3.toFixed(2)}</b> ✓ — use it as the border colour of controls, or add <b className="t-c-go u-nowrap">--edge: #68708a</b> ({[0, 1, 2, 3].map((i) => hexContrast('#68708a', BGS[i]).toFixed(2)).join(' / ')} on C0–C3).</p>
      </div>
    </div>
  )
}

function Colour() {
  useRev()
  return (
    <Sec id="colour" n="01" title="Colour" kicker="CARBON · INK · IGNITION · TELEMETRY · FOIL · STAGES">
      <Sub title="Carbon" note="The material the app is machined from. ~90% of every screen. Each tile shows --ink on it, with its WCAG ratio." />
      <div className="pf-grid c6 is-sw">
        {[['--void', 'Letterbox, behind everything'], ['--carbon-0', 'App background'], ['--carbon-1', 'Panels'], ['--carbon-2', 'Raised panels, inputs'], ['--carbon-3', 'Hover, pressed, chips'], ['--carbon-4', 'Strongest fill, tracks']].map(([t, r]) => <Swatch key={t} token={t} role={r} />)}
      </div>

      <Sub title="Ink" note="Four rungs of text. ink-4 is decorative only: it fails 3:1 on every surface. Ratios are against carbon-0." />
      <div className="pf-grid c6 is-sw">
        {[['--ink', 'Primary text'], ['--ink-2', 'Secondary'], ['--ink-3', 'Captions, tertiary'], ['--ink-4', 'Disabled · decorative only']].map(([t, r]) => (
          <div className="pf-card pf-sw" key={t}>
            <div className="pf-sw__chip" style={{ background: V('--carbon-0') }}>
              <span className="pf-sw__aa" style={{ color: V(t) }}>Aa</span>
              <Badge a={V(t)} b={V('--carbon-0')} />
            </div>
            <div className="pf-sw__meta"><b>{t}</b><span>{tok(t)}</span><em>{r}</em></div>
          </div>
        ))}
        <div className="pf-card pf-sw"><div className="pf-sw__chip" style={{ background: V('--carbon-0') }}><span className="pf-sw__aa" style={{ color: V('--ink-word'), fontFamily: 'var(--font-serif)', fontWeight: 380 }}>Aa</span><Badge a={V('--ink-word')} b={V('--carbon-0')} /></div><div className="pf-sw__meta"><b>--ink-word</b><span>ink + 10% gold-1</span><em>Scripture only. Warm paper in a cold cockpit.</em></div></div>
      </div>

      <Sub title="Ignition" note="The one hot colour: the primary action, the flame, the live node. If two orange things compete on a screen, one is wrong." />
      <div className="u-stack" style={{ '--gap': 'var(--s-5)' }}>
        <GradBar token="--ignite" stops={['--ignite-1', '--ignite-2', '--ignite-3']} label="Ignition gradient" />
        <div className="pf-grid is-wide is-sw">
          <Swatch token="--ignite-flat" role="Flat fallback · caret · accent-color" ink="--ink-on-ignite" />
          <div className="pf-card pf-sw">
            <div className="pf-sw__chip" style={{ background: V('--carbon-0'), alignItems: 'flex-start' }}>
              <span className="t-mono-sm" style={{ color: V('--ink-3') }}>--ink-on-ignite on stops</span>
              <div className="u-row u-wrap" style={{ '--gap': 'var(--s-1)' }}>{['--ignite-1', '--ignite-2', '--ignite-3', '--ignite-flat'].map((s) => <span key={s} className="pf-badge" style={{ background: V(s), color: V('--ink-on-ignite') }}><span style={{ color: 'inherit' }}>{contrast(V('--ink-on-ignite'), V(s)).toFixed(1)}</span></span>)}</div>
            </div>
            <div className="pf-sw__meta"><b>--ink-on-ignite</b><span>{tok('--ink-on-ignite')}</span><em>The only text colour that works on ignition. White fails (2.4–3.4).</em></div>
          </div>
          <div className="pf-card pf-sw">
            <div className="pf-sw__chip" style={{ background: V('--carbon-0'), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 'var(--s-5)' }}>
              <span className="pf-badge" style={{ boxShadow: V('--glow-ignite'), background: V('--carbon-1') }}>glow</span>
              <span className="pf-badge" style={{ background: V('--ignite-wash') }}>wash</span>
            </div>
            <div className="pf-sw__meta"><b>--ignite-glow · --ignite-wash</b><span>{tok('--ignite-glow')}</span><em>Glow is for lit things only. Wash tints a surface that is “on”.</em></div>
          </div>
        </div>
      </div>

      <Sub title="Telemetry & status" note="Information colour, only where it carries meaning. Verdicts are never colour alone: pair with an icon and words." />
      <div className="pf-grid is-sw">
        <Swatch token="--tele" role="Data, links, XP, focus ring" ink="--carbon-0" />
        <Swatch token="--tele-2" role="Quiet data; not for text on C3/C4" ink="--carbon-0" />
        <Swatch token="--go" role="Correct · go" ink="--carbon-0" />
        <Swatch token="--nogo" role="Incorrect · no-go" ink="--carbon-0" />
        <Swatch token="--warn" role="Caution · freeze shield" ink="--carbon-0" />
      </div>

      <Sub title="Lines, rims & washes" note="Hairlines and light, drawn here on carbon-1. Ratios are against carbon-1: a line is decoration until it reaches 3:1, and none of them does. A control's edge needs its own token (see the request below)." />
      <div className="pf-lines">
        {[['--line', 'Hairline', 'line'], ['--line-2', 'Hairline, stronger', 'line'], ['--line-3', 'Hairline, strongest', 'line'], ['--rim-hi', 'Top-edge catch-light', 'rim'], ['--rim-lo', 'Faint rim', 'rim'], ['--ignite-wash', 'Surface that is “on”', 'wash'], ['--tele-wash', 'Data surface', 'wash'], ['--go-wash', 'Correct', 'wash'], ['--nogo-wash', 'Incorrect', 'wash']].map(([t, r, k]) => (
          <div key={t} className="pf-line">
            <span className={`pf-line__s is-${k}`} style={{ '--c': V(t) }} />
            <span className="pf-line__m"><b>{t}</b><em>{r}</em></span>
            <Badge a={V(t)} b={V('--carbon-1')} label={`${t} on carbon-1`} />
          </div>
        ))}
      </div>

      <Sub title="Foil & metal" note="Rare things only: every 7th code card, perfect weeks. Titanium is the bezel; gold is the reward." />
      <div className="u-stack" style={{ '--gap': 'var(--s-5)' }}>
        <GradBar token="--gold" stops={['--gold-1', '--gold-2', '--gold-3']} label="Gold foil gradient" />
        <GradBar token="--titanium" stops={['--ti-1', '--ti-2', '--ti-3', '--ti-4']} label="Titanium gradient" />
      </div>

      <Sub title="Stage hues" note="One per week. A component sets --stage / --stage-glow, then paints with them. Series may use up to five." />
      <div className="pf-hexrow">{[1, 2, 3, 4, 5].map((n) => <StageHex key={n} n={n} />)}</div>

      <Sub title="Contrast · WCAG 2.2" note="Every text-capable token on carbon-0 to carbon-4. Hatched red cells are text pairs under 4.5:1 on a reading surface. Toggle Contrast+ and watch the numbers move." />
      <div className="u-stack" style={{ '--gap': 'var(--s-4)' }}>
        <ContrastMatrix />
        <div className="u-row u-wrap t-mono-sm" style={{ '--gap': 'var(--s-4)' }}>
          <span className="pf-badge is-aaa"><span>≥ 7</span>AAA</span><span className="pf-badge is-aa"><span>≥ 4.5</span>AA text</span><span className="pf-badge is-ui"><span>≥ 3</span>large text · UI</span><span className="pf-badge is-fail"><span>&lt; 3</span>FAIL</span><span className="pf-badge"><i className="pf-decor" aria-hidden="true" />dim italic row: decorative only</span>
        </div>
        <ContrastReport />
      </div>
    </Sec>
  )
}

/* ───────────────────────────────────────────────────────────── 02 type */
function Spec({ cls, as: Tag = 'p', note, children, lang }) {
  const ref = useRef(null); const m = useMetrics(ref)
  return (
    <div className="pf-spec">
      <div className="pf-spec__meta"><span className="pf-code">.{cls.split(' ').join(' .')}</span><span className="t-mono-sm">{m}</span>{note && <span className="t-caption"><Note>{note}</Note></span>}</div>
      <div className="pf-spec__sample"><Tag ref={ref} className={cls} lang={lang}>{children}</Tag></div>
    </div>
  )
}
const FAMILIES = [
  ['Barlow Condensed', '--font-display', '500 · 600 · 700', 'Eyebrows, stage titles, CTAs, big numerals. Always uppercase.', { fontWeight: 700, textTransform: 'uppercase' }],
  ['Inter Variable', '--font-ui', '100 – 900', 'Interface and body. 17 px base; tight tracking from 20 px up.', { fontWeight: 560 }],
  ['Newsreader Variable', '--font-serif', '200 – 800 · italic', 'The Word: verses, declarations, lesson titles. Large, warm, generous leading.', { fontWeight: 380 }],
  ['JetBrains Mono', '--font-mono', '100 – 800', 'Telemetry: T-02:14:09, DAY 12/31, +40 XP. Tabular, slashed zero.', { fontWeight: 500 }],
]
const SCALE_FAMS = [
  { id: 'display', name: 'Barlow', v: '--font-display', text: ['Stage 02 · Ownership', 'Ownership', '31'], st: () => ({ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 'calc(var(--track-label) * .15)', lineHeight: 1 }) },
  { id: 'ui', name: 'Inter', v: '--font-ui', text: ['Raising goDs, building nations', 'Raising goDs', 'Day'], st: (i) => ({ fontWeight: 560, letterSpacing: i >= 5 ? 'var(--track-tight)' : 'normal', lineHeight: 1.1 }) },
  { id: 'word', name: 'Newsreader', v: '--font-serif', text: ['The Lord is my shepherd; I shall not want.', 'The Lord is my shepherd', 'Word'], st: () => ({ fontWeight: 380, lineHeight: 1.1 }) },
  { id: 'mono', name: 'Mono', v: '--font-mono', text: ['T-02:14:09 · DAY 12/31 · +40 XP', 'T-02:14:09', '12/31'], st: () => ({ fontWeight: 500, letterSpacing: 'var(--track-mono)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums slashed-zero' }) },
]
function TypeSec() {
  const [scale, setScale] = useState(1)
  const [fam, setFam] = useState('display')
  return (
    <Sec id="type" n="02" title="Type" kicker="FOUR FAMILIES · ONE SCALE · FLUID BETWEEN 360 AND 480">
      <Sub title="Families" />
      <div className="pf-grid is-wide">
        {FAMILIES.map(([name, v, w, role, st]) => (
          <div className="pf-card" key={v}>
            <div className="pf-fam">
              <span className="t-mono-sm">{v}</span>
              <span className="pf-fam__aa" style={{ fontFamily: V(v), ...st }}>Aa</span>
              <div><p className="t-label" style={{ color: V('--ink') }}>{name}</p><p className="t-mono-sm" style={{ color: V('--ink-3') }}>{w}</p><p className="t-caption" style={{ marginTop: 'var(--s-1)', color: V('--ink-2') }}>{role}</p></div>
            </div>
          </div>
        ))}
      </div>

      <Sub title="The Word, set like the cover of a book" note="Newsreader, balanced, oldstyle numerals, warm --ink-word with a candle of ignite behind it, and an optional gold opening quote (.t-quote). Never below 20 px, even at 90% text size. The reference sits beneath in mono." />
      <div className="pf-cover" style={{ '--read-scale': scale }}>
        <span className="t-label-sm" style={{ color: V('--gold-2') }}>The declaration</span>
        <p className="t-scripture-lg t-quote u-ta-c">Well done, thou good and faithful servant: thou hast been faithful over a few things.”</p>
        <span className="pf-cover__rule" aria-hidden="true" />
        <p className="t-ref">Matthew 25:21</p>
        <label className="pf-range t-mono-sm"><span>--read-scale</span><input type="range" min="0.9" max="1.3" step="0.05" value={scale} onChange={(e) => setScale(Number(e.target.value))} /><span className="t-num" style={{ color: V('--ink') }}>{scale.toFixed(2)}×</span></label>
      </div>

      <Sub title="Every class" note="Sizes are fluid between the 360 px and 480 px column: clamp(token, vw, token). The readouts are measured from the live element at this viewport." />
      <div style={{ '--read-scale': scale }}>
        <Spec cls="t-display t-display-xl" as="p" note="The one giant number on a screen.">31</Spec>
        <Spec cls="t-display" as="p" note="Stage titles, big numerals, CTAs.">Ownership</Spec>
        <Spec cls="t-display t-display-sm" as="p">Stage 02 · Faithful</Spec>
        <Spec cls="t-display t-display-xl t-ignite" as="p" note="Ignition gradient: one hero numeral per screen, never on words.">12</Spec>
        <Spec cls="t-title" as="p" note="Screen and card titles. Inter 640, tight.">The Ownership Covenant</Spec>
        <Spec cls="t-title-serif" as="p" note="A lesson’s own title: it belongs to the Word.">Faithful in little</Spec>
        <Spec cls="t-scripture-lg" as="p" note="Hero verse.">The Lord is my shepherd; I shall not want.</Spec>
        <Spec cls="t-scripture" as="p" note="Verse on a slide. 24 → 34 px.">He that is faithful in that which is least is faithful also in much.</Spec>
        <Spec cls="t-scripture-sm" as="p" note="Verse in a list. Floor of 20 px.">Your labour is not in vain in the Lord.</Spec>
        <Spec cls="t-ref" as="p" note="The reference, beneath the verse.">1 Corinthians 15:58</Spec>
        <Spec cls="t-lead" as="p" note="Lede and teaching openers.">Stewardship is not ownership. It is faithful care of what is not yours.</Spec>
        <Spec cls="t-body" as="p" note="Reading copy. 17 px / 1.5.">Every gift you hold was handed to you. The question of the day is not “what do I own?” but “what have I been trusted with?”</Spec>
        <Spec cls="t-body-sm" as="p">Secondary reading copy. Used in cards, hints and verdict explanations where the main line already did the talking.</Spec>
        <Spec cls="t-caption" as="p">Captions and tertiary notes. ink-3 on carbon-2 or lighter.</Spec>
        <Spec cls="t-label" as="p">Day 12 · Ownership</Spec>
        <Spec cls="t-label-sm" as="p">Stage 02 · Cleared for launch</Spec>
        <Spec cls="t-mono" as="p">T-02:14:09 · DAY 12/31 · +40 XP</Spec>
        <Spec cls="t-mono-sm" as="p">11 PX MICRO · NOT FOR BODY</Spec>
      </div>

      <Sub title="Tabular numerals" note=".t-num locks digit width so counters never jitter. Left: proportional. Right: tabular." />
      <div className="pf-tab">
        <div><span className="t-mono-sm">PROPORTIONAL</span>{['1,111', '8,888', '1,240'].map((n) => <span key={n} className="t-title">{n}</span>)}</div>
        <div><span className="t-mono-sm">.t-num</span>{['1,111', '8,888', '1,240'].map((n) => <span key={n} className="t-title t-num">{n}</span>)}</div>
      </div>

      <Sub title="Scale, in every family" note="The eleven --fs-* steps, measured live, set in each of the four faces. Pick a family: the same size reads very differently in a condensed face, a UI sans, a book serif and a mono." />
      <div className="pf-seg t-label-sm" role="group" aria-label="Family for the scale" style={{ marginBottom: 'var(--s-3)' }}>
        {SCALE_FAMS.map((f) => <button key={f.id} type="button" aria-pressed={fam === f.id} onClick={() => setFam(f.id)}>{f.name}</button>)}
      </div>
      <div className="pf-scale" data-fam={fam}>
        {['2xs', 'xs', 'sm', 'md', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'].map((k, i) => {
          const f = SCALE_FAMS.find((x) => x.id === fam)
          const tier = i >= 9 ? 2 : i >= 7 ? 1 : 0
          return (
            <div key={k}><span className="t-mono-sm">--fs-{k} · {Math.round(px(`--fs-${k}`) * 10) / 10}</span>
              <span className="pf-scale__s" style={{ fontFamily: V(f.v), fontSize: V(`--fs-${k}`), ...f.st(i) }}>{f.text[tier]}</span></div>
          )
        })}
      </div>

      <Sub title="Our letters" note="Yoruba, Igbo and Hausa must set cleanly in every family: tone marks, dot-below vowels, hooked consonants. A fallback glyph here is a bug." />
      <div className="pf-glyphs">
        {[['Barlow Condensed', '--font-display', 'Ọlá Ẹbùn · Ń Ǹ ṣ Ṣ · Ụ ụ Ị ị · Ɓ ɗ Ƙ ƙ', { textTransform: 'uppercase', fontWeight: 600, letterSpacing: V('--track-label'), fontSize: 'var(--fs-lg)' }],
          ['Inter', '--font-ui', 'Ọlá Ẹbùn ṣe · ẹ̀ ọ́ ń ǹ · Chukwuemeka Ụbọchị Ọma · ɓ ɗ ƙ ƴ', { fontSize: 'var(--fs-lg)' }],
          ['Newsreader', '--font-serif', 'Ọlá Ẹbùn ṣe · ẹ̀ ọ́ ń ǹ · Chukwuemeka Ụbọchị Ọma · ɓ ɗ ƙ ƴ', { fontSize: 'var(--fs-xl)', fontWeight: 380 }],
          ['JetBrains Mono', '--font-mono', 'Ọlá Ẹbùn ṣe · ẹ̀ ọ́ ń ǹ · Ụ ụ Ị ị', { fontSize: 'var(--fs-md)' }]].map(([n, v, s, st]) => (
          <div key={v}><span className="t-mono-sm">{n}{v === '--font-serif' ? ' · Ǹ ǹ fall out of the font: a detached accent. Request below.' : ''}</span><p style={{ fontFamily: V(v), ...st }}>{s}</p></div>
        ))}
        <div><span className="t-mono-sm">Newsreader → Inter as the next family (requested stack)</span><p style={{ fontFamily: "'Newsreader Variable', 'Inter Variable', serif", fontSize: 'var(--fs-xl)', fontWeight: 380 }}>Ọlá Ẹbùn ṣe · ẹ̀ ọ́ ń ǹ · Chukwuemeka Ụbọchị Ọma · ɓ ɗ ƙ ƴ</p></div>
      </div>
    </Sec>
  )
}

/* ───────────────────────────────────────────────────────────── 03 geometry */
function Shape({ clip, label, rect }) {
  return (
    <figure>
      <span className={`pf-shape${rect ? ' is-rect' : ''}`} style={{ clipPath: V(clip), aspectRatio: rect ? undefined : undefined, ...(clip.includes('hex-flat') ? { aspectRatio: 1.1547 } : clip.includes('hex') ? { aspectRatio: 0.866, width: 84 } : {}) }}>
        <span className="pf-shape__in" style={{ clipPath: V(clip) }} />
      </span>
      <figcaption className="t-mono-sm">{label}</figcaption>
    </figure>
  )
}
function Geometry() {
  const [grid, setGrid] = useState(false)
  const frameRef = useRef(null)
  return (
    <Sec id="shape" n="03" title="Geometry" kicker="4 PX GRID · CONCENTRIC RADII · CHAMFER · HEX">
      <div className="pf-geo" data-grid={grid ? 'on' : 'off'}>
        <div className="u-row" style={{ justifyContent: 'flex-end', marginTop: 'var(--s-4)' }}>
          <button type="button" className="pf-toggle t-label-sm" aria-pressed={grid} onClick={() => setGrid(!grid)}><i className="pf-led" aria-hidden="true" />8 px grid</button>
        </div>
        <Sub title="Space" note="A 4 px grid. Page gutter 20. Touch targets never below --tap (48)." />
        <div className="pf-card"><div className="pf-space pf-gridable">
          {['1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20'].map((k) => <div key={k} className="pf-space__row"><span className="t-mono-sm">--s-{k}</span><span className="pf-space__bar"><i style={{ width: V(`--s-${k}`) }} /></span><span className="t-mono-sm pf-space__px">{px(`--s-${k}`)}</span></div>)}
        </div></div>

        <Sub title="Radii" note="Concentric: inner radius = outer radius − the padding between them. Three pairs are exact in the token set." />
        <div className="u-stack" style={{ '--gap': 'var(--s-6)' }}>
          <div className="pf-radii">
            {['xs', 'sm', 'md', 'lg', 'xl', 'full'].map((k) => (
              <div className="pf-radius" key={k}><i style={{ borderRadius: V(`--r-${k}`), ...(k === 'full' ? { width: 120, borderRadius: V('--r-full') } : {}) }} /><span className="t-mono-sm">--r-{k} · {k === 'full' ? '∞' : px(`--r-${k}`)}</span></div>
            ))}
          </div>
          <div className="pf-radii">
            {[['--r-lg', '--s-2', '--r-md'], ['--r-xl', '--s-6', '--r-sm'], ['--r-sm', '--s-1', '--r-xs']].map(([o, p, i]) => (
              <div className="pf-conc" key={o}>
                <div className="pf-conc__o" style={{ borderRadius: V(o), padding: V(p) }}><div className="pf-conc__i" style={{ borderRadius: V(i) }}><span className="t-mono-sm" style={{ color: 'inherit' }}>{px(o)} − {px(p)} = {px(i)}</span></div></div>
                <span className="t-mono-sm">{o.slice(2)} ⊃ {i.slice(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <Sub title="Chamfer & hex" note="Key hardware: primary buttons, answer plates, tags, cards of honour. clip-path also clips shadows and outlines, so wrap the part in .u-cut-frame (below)." />
        <div className="pf-shapes">
          <Shape clip="--clip-cut" rect label="--clip-cut · 14" /><Shape clip="--clip-cut-sm" rect label="--clip-cut-sm · 8" />
          <Shape clip="--clip-cut-tr" rect label="--clip-cut-tr" /><Shape clip="--clip-cut-bl" rect label="--clip-cut-bl" />
          <Shape clip="--clip-hex" label="--clip-hex · pointy" /><Shape clip="--clip-hex-flat" label="--clip-hex-flat" />
        </div>

        <Sub title="Focus follows the shape" note="Press Tab. A normal outline follows border-radius. A chamfer or hex would clip it away, so the part lives inside .u-cut-frame and the ring is drawn on the wrapper’s silhouette. Bottom right: the fallback when you forget the wrapper (ring pulled inside)." />
        <div className="pf-focusgrid">
          <div className="pf-card pf-focuslab"><span className="t-label-sm">Chamfer · .u-cut-frame</span>
            <span className="u-cut-frame pf-glow" ref={frameRef}><button type="button" className="pf-btn u-clip-cut u-press"><span>Launch</span></button></span>
            <span className="t-caption">Ring + ignite glow share the wrapper. Ring colour: --ring. Air gap: --ring-gap.</span></div>
          <div className="pf-card pf-focuslab"><span className="t-label-sm">Hex · .u-cut-frame</span>
            <span className="u-cut-frame"><button type="button" className="pf-hexbtn" aria-label="Hex node"><span className="t-display t-display-sm" style={{ fontSize: 'var(--fs-xl)' }}>12</span></button></span>
            <span className="t-caption">Same wrapper, any silhouette.</span></div>
          <div className="pf-card pf-focuslab"><span className="t-label-sm">Radius · plain outline</span>
            <input className="pf-field" placeholder="Search the Word" aria-label="Search the Word" />
            <span className="t-caption">2 px --tele, 2 px off, follows --r-sm.</span></div>
          <div className="pf-card pf-focuslab"><span className="t-label-sm">Round · plain outline</span>
            <button type="button" className="pf-round u-press" aria-label="Streak"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 2.5 1.5 2.5C10 9 10.5 6 12 3z" /></svg></button>
            <span className="t-caption">Circles get circular rings for free.</span></div>
          <div className="pf-card pf-focuslab"><span className="t-label-sm">Chamfer · no wrapper (fallback)</span>
            <button type="button" className="pf-btn is-secondary u-clip-cut-sm u-press" style={{ clipPath: V('--clip-cut-sm') }}><span>Cancel</span></button>
            <span className="t-caption">Ring pulled inside the clip. Fine for the small chamfer; use the wrapper for anything bigger.</span></div>
        </div>
      </div>
    </Sec>
  )
}

/* ───────────────────────────────────────────────────────────── 04 light & materials */
/* The cluster: a titanium bezel, an engraved face, 51 ticks on a 270-degree sweep, a redline, an ignite needle with a
   counterweight and a glass glare. One component, three places (hero, hero on a phone, Light). The real gauge is
   ui-overlay's; this one exists to show what the materials look like when they are used together. */
const GA = (v) => -135 + v * 27                                  // value 0..10 -> degrees clockwise from 12 o'clock
const GP = (v, r) => { const a = (GA(v) * Math.PI) / 180; return [+(100 + r * Math.sin(a)).toFixed(2), +(100 - r * Math.cos(a)).toFixed(2)] }
const TICKS = Array.from({ length: 51 }, (_, i) => { const v = i / 5; const major = i % 5 === 0; const [x1, y1] = GP(v, 87); const [x2, y2] = GP(v, major ? 77 : 82.5); return { i, major, red: v >= 8, x1, y1, x2, y2 } })
const NUMS = [0, 2, 4, 6, 8, 10].map((v) => ({ v, p: GP(v, 63) }))
function Gauge({ label = 'V7', sub = 'ASCENT', value = 7, k = 0, className = '', onReplay }) {
  const id = `pg${useId().replace(/:/g, '')}`
  const [rx1, ry1] = GP(8, 91.5); const [rx2, ry2] = GP(10, 91.5)
  return (
    <div className={`pf-ti ${className}`} style={{ '--rest': `${GA(value)}deg` }}>
      <Wrap onReplay={onReplay}>
      <svg viewBox="0 0 200 200" role={onReplay ? undefined : 'img'} aria-hidden={onReplay ? 'true' : undefined} aria-label={onReplay ? undefined : `Instrument cluster specimen, needle at ${value} of 10`}>
        <defs>
          <linearGradient id={`${id}-ti`} x1=".15" y1="0" x2=".85" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--ti-1)' }} /><stop offset=".34" style={{ stopColor: 'var(--ti-2)' }} />
            <stop offset=".62" style={{ stopColor: 'var(--ti-4)' }} /><stop offset="1" style={{ stopColor: 'var(--ti-2)' }} />
          </linearGradient>
          <radialGradient id={`${id}-face`} cx=".5" cy=".36" r=".72">
            <stop offset="0" style={{ stopColor: 'var(--carbon-3)' }} /><stop offset=".8" style={{ stopColor: 'var(--carbon-0)' }} /><stop offset="1" style={{ stopColor: 'var(--void)' }} />
          </radialGradient>
          <linearGradient id={`${id}-glare`} x1="0" y1="0" x2=".35" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--ink)', stopOpacity: 0.2 }} /><stop offset="1" style={{ stopColor: 'var(--ink)', stopOpacity: 0 }} />
          </linearGradient>
          <linearGradient id={`${id}-nd`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style={{ stopColor: 'var(--ignite-3)' }} /><stop offset=".5" style={{ stopColor: 'var(--ignite-flat)' }} /><stop offset="1" style={{ stopColor: 'var(--ignite-1)' }} />
          </linearGradient>
        </defs>
        <circle className="g-bez" cx="100" cy="100" r="99" fill={`url(#${id}-ti)`} />
        <circle className="g-lip" cx="100" cy="100" r="93.5" />
        <circle cx="100" cy="100" r="91" fill={`url(#${id}-face)`} />
        <path className="g-red" d={`M${rx1} ${ry1} A91.5 91.5 0 0 1 ${rx2} ${ry2}`} />
        {TICKS.map((t) => <line key={t.i} className={`g-tick${t.major ? ' is-major' : ''}${t.red ? ' is-red' : ''}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />)}
        {NUMS.map((n) => <text key={n.v} className={`g-num${n.v >= 8 ? ' is-red' : ''}`} x={n.p[0]} y={n.p[1]} textAnchor="middle" dominantBaseline="central">{n.v}</text>)}
        <text className="g-brand" x="100" y="74" textAnchor="middle">KIND</text>
        <text className="g-label" x="100" y="141" textAnchor="middle">{label}</text>
        <text className="g-sub" x="100" y="153" textAnchor="middle">{sub}</text>
        <g key={k} className="g-needle"><path d="M100 20 L102.3 98 L101.3 114 L98.7 114 L97.7 98 Z" fill={`url(#${id}-nd)`} /><path className="g-needle__hi" d="M100 26 L100 96" /></g>
        <circle className="g-hub" cx="100" cy="100" r="9.5" fill={`url(#${id}-ti)`} /><circle className="g-hubdot" cx="100" cy="100" r="3.4" />
        <path className="g-glare" d="M18 82 C 30 38 66 14 100 14 C 134 14 170 38 182 82 C 150 52 52 52 18 82 Z" fill={`url(#${id}-glare)`} />
      </svg>
      </Wrap>
    </div>
  )
}
const Wrap = ({ onReplay, children }) => (onReplay ? <button type="button" className="pf-ti__btn u-press" onClick={onReplay} aria-label="Replay the ignition sweep">{children}</button> : children)
function GaugeSpecimen() {
  const [k, setK] = useState(0)
  return (
    <div className="pf-mat">
      <div className="pf-mat__stage"><Gauge label="DAY 12" sub="OF 31" k={k} className="is-md" onReplay={() => setK((x) => x + 1)} /></div>
      <div><p className="t-label">Titanium bezel · cluster</p><p className="t-caption">--titanium rim, engraved face, 51 ticks, redline, ignite needle. Tap it to replay the ignition sweep: one pass, never a loop.</p></div>
    </div>
  )
}

/* Everything at once: only foundation classes and tokens, no ui-core. If this does not feel like a launch console with a chapel in it, the system is wrong, not the mock. */
function Composed() {
  return (
    <div className="pf-mat">
      <div className="pf-scene">
        <div className="pf-scene__sky" aria-hidden="true"><svg preserveAspectRatio="none">{STARS.slice(0, 72).map((st, i) => <circle key={i} className="pf-star" cx={`${st.x}%`} cy={`${st.y * 0.8}%`} r={st.r * 0.8} opacity={st.o * 0.85} />)}</svg></div>
        <header className="pf-scene__hud u-glass" data-glass>
          <span className="t-mono-sm" style={{ color: V('--ignite-2') }}>● STREAK 7</span>
          <span className="t-mono-sm">DAY 12 / 31</span>
          <span className="t-mono-sm" style={{ color: V('--tele') }}>1,240 XP</span>
        </header>
        <div className="pf-scene__body">
          <span className="t-label-sm" style={{ color: V('--gold-2') }}>Stage 02 · Faithful</span>
          <p className="t-scripture u-ta-c">He that is faithful in that which is least is faithful also in much.</p>
          <p className="t-ref">Luke 16:10</p>
        </div>
        <div className="pf-scene__bar u-glass" data-glass>
          <div className="u-grow">
            <p className="t-label-sm">Day 12 · ~6 min</p>
            <p className="t-title" style={{ fontSize: 'var(--fs-lg)' }}>The Ownership Covenant</p>
            <p className="t-mono-sm" style={{ marginTop: 'var(--s-1)' }}>T-02:14:09 TO TONIGHT’S EPISODE</p>
          </div>
          <span className="u-cut-frame pf-glow"><button type="button" className="pf-btn u-clip-cut u-press"><span>Launch</span></button></span>
        </div>
      </div>
      <div><p className="t-label">One screen, foundation only</p><p className="t-caption">Glass HUD and launch bar over a night sky; Newsreader verse with its candle; mono telemetry; one ignition control. Colour budget: carbon, ink, and a single orange.</p></div>
    </div>
  )
}

function Light() {
  const [fx] = useFx()
  return (
    <Sec id="light" n="04" title="Light" kicker="DEPTH BY LIGHT · SHADOW · GLOW · MATERIALS · GRAIN · GLASS">
      <Sub title="Shadows" note="Black, large, low-alpha: they only read on a lifted surface, so the floor here is carbon-4. Never grey." />
      <div className="pf-floor">
        {[1, 2, 3].map((n) => <div key={n} className="pf-plateau" style={{ '--s': V(`--shadow-${n}`) }}><span className="t-mono-sm">--shadow-{n}</span></div>)}
      </div>

      <Sub title="Glow" note="Lit things only: an active node, a verdict LED, the primary action. Each is a 1 px rim + a soft bloom." />
      <div className="pf-glows">
        {[['ignite', '--glow-ignite'], ['tele', '--glow-tele'], ['go', '--glow-go'], ['nogo', '--glow-nogo']].map(([n, t]) => <div key={t} className="pf-tile" style={{ boxShadow: V(t) }}><span className="t-mono-sm">{t}</span></div>)}
      </div>

      <Sub title="Surface" note="Every raised surface: a plate fill, a bevel (top rim light + bottom shade), a shadow. Sheen sits on top." />
      <div className="pf-grid">
        {[['--plate', { background: V('--plate'), boxShadow: `${V('--bevel')}, ${V('--shadow-1')}` }], ['--plate-hi', { background: V('--plate-hi'), boxShadow: `${V('--bevel')}, ${V('--shadow-1')}` }], ['plate + --sheen', { background: `${V('--sheen')}, ${V('--plate')}`, boxShadow: `${V('--bevel')}, ${V('--shadow-1')}` }], ['--bevel only', { background: V('--carbon-1'), boxShadow: V('--bevel') }]].map(([n, st]) => <div key={n} className="pf-tile" style={st}><span className="t-mono-sm">{n}</span></div>)}
      </div>

      <Sub title="Materials" note="Carbon, titanium, gold foil. Real surfaces have a lit edge and a weave." />
      <div className="pf-grid c2">
        <div className="pf-mat"><div className="pf-mat__stage"><div className="pf-carbon u-carbon u-clip-cut"><span className="t-label">Carbon</span></div></div><div><p className="t-label">.u-carbon · 2/2 twill</p><p className="t-caption">Each strand passes over two, under two, so the ribs run diagonal. Lit top-left, dark where it dives. Faint on purpose: a surface, not a pattern.</p></div></div>
        <div className="pf-mat"><div className="pf-mat__stage"><div className="pf-carbon u-clip-cut" style={{ background: `${V('--carbon-weave')}, ${V('--plate')}`, backgroundSize: '48px 48px, auto' }}><span className="t-label">×3 loupe</span></div></div><div><p className="t-label">The twill, magnified</p><p className="t-caption">The tile is 16 px of 4 px strands; shown at 48 px so you can see the over/under shading.</p></div></div>
        <GaugeSpecimen />
        <div className="pf-mat"><div className="pf-mat__stage"><div className="pf-foil"><span className="t-display t-display-sm">Gold</span></div></div><div><p className="t-label">--gold · foil</p><p className="t-caption">Rare things only. The glare is one slow pass, not a shimmer loop in lite.</p></div></div>
      </div>

      <Sub title="Grain" note="soft-light at 4% over everything: invisible on the black, alive wherever there is light. Left to right: none, the real overlay (gone in lite), the tile at full strength, enlarged." />
      <div className="pf-grainrow">
        {[['off', 'no grain'], ['on', '4 % · the overlay'], ['max', 'tile ×3 · 100 %']].map(([k, l]) => (
          <div key={k} className={`pf-grain is-${k}`}><span className="pf-grain__layer" /><span className="t-mono-sm pf-grain__cap">{l}</span></div>
        ))}
      </div>

      <Sub title="Glass" note="Chrome only: HUD, dock, sheets (this page’s nav is glass). Never on content cards. In lite the blur goes and the plate turns solid carbon, automatically, for anything marked data-glass." />
      <div className="pf-grid c2">
        <div className="pf-mat"><div className="pf-mat__stage"><span className="pf-backdrop" /><div className="pf-glass u-glass" data-glass><span className="t-label">HUD · [data-glass]</span><span className="t-caption">fx is {fx}: {fx === 'full' ? 'blur 22 px + saturate' : 'solid carbon-1, no backdrop-filter'}</span></div></div></div>
        <div className="pf-mat"><div className="pf-mat__stage"><span className="pf-backdrop" /><div className="pf-glass is-solid"><span className="t-label">Lite fallback</span><span className="t-caption">What every glass element becomes under html[data-fx=lite].</span></div></div></div>
      </div>

      <Sub title="All of it, at once" note="The tokens, type, materials and utilities above, composed into one lesson-start screen with nothing but foundation classes." />
      <Composed />
    </Sec>
  )
}

/* ───────────────────────────────────────────────────────────── 05 motion */
const nums = (s) => (s.match(/-?\d*\.?\d+/g) || []).map(Number)
function BezierPlot({ name }) {
  const [x1, y1, x2, y2] = nums(tok(name))
  const X = (v) => v * 100; const Y = (v) => 100 - v * 100
  return (
    <svg className="pf-plot" viewBox="-6 -26 112 136" aria-hidden="true">
      <rect className="grid" x="0" y="0" width="100" height="100" /><line className="grid one" x1="0" y1="0" x2="100" y2="0" />
      <line className="ctl" x1="0" y1="100" x2={X(x1)} y2={Y(y1)} /><line className="ctl" x1="100" y1="0" x2={X(x2)} y2={Y(y2)} />
      <circle className="hnd" cx={X(x1)} cy={Y(y1)} r="3.5" /><circle className="hnd" cx={X(x2)} cy={Y(y2)} r="3.5" />
      <path className="cv" d={`M0 100 C ${X(x1)} ${Y(y1)}, ${X(x2)} ${Y(y2)}, 100 0`} />
    </svg>
  )
}
function SpringPlot({ name }) {
  const pts = nums(tok(name)); const n = pts.length
  return (
    <svg className="pf-plot" viewBox="-6 -26 112 136" aria-hidden="true">
      <rect className="grid" x="0" y="0" width="100" height="100" /><line className="grid one" x1="0" y1="0" x2="100" y2="0" />
      <polyline className="cv" points={pts.map((v, i) => `${(i / (n - 1)) * 100},${100 - v * 100}`).join(' ')} />
    </svg>
  )
}
function Curve({ name, use }) {
  return (
    <div className="pf-card pf-curve">
      <div className="pf-curve__top"><BezierPlot name={name} /><div><p className="pf-code">{name}</p><p className="t-mono-sm">{tok(name)}</p><p className="t-caption" style={{ marginTop: 'var(--s-1)' }}>{use}</p></div></div>
      <div className="pf-track"><span className="pf-ball is-loop" style={{ '--e': V(name) }} /></div>
    </div>
  )
}
function Spring({ name, use, b, flip }) {
  const ms = `${name}-ms`
  return (
    <button type="button" className="pf-card pf-curve" onClick={flip} style={{ textAlign: 'left' }} aria-label={`Replay ${name}`}>
      <div className="pf-curve__top"><SpringPlot name={name} /><div><p className="pf-code">{name}</p><p className="t-mono-sm">settles {tok(ms)}</p><p className="t-caption" style={{ marginTop: 'var(--s-1)' }}>{use}</p></div></div>
      <div className="pf-track"><span className={`pf-ball is-spring${b ? ' is-b' : ''}`} style={{ '--e': V(name), '--ms': V(ms) }} /></div>
    </button>
  )
}
function Motion() {
  const [n, flip] = useBeat(2600)
  const [race] = useBeat(2800)
  const b = n % 2 === 1
  return (
    <Sec id="motion" n="05" title="Motion" kicker="SPRINGS, NOT TWEENS · EXPO CURVES · iOS SHEET CURVE">
      <Sub title="Curves" note="Shown at 3.3 s a lap so you can see the shape. Real durations are the --t-* tokens below." />
      <div className="pf-curves">
        <Curve name="--ease-out" use="Arrivals. Expo-out: fast in, long settle." />
        <Curve name="--ease-in" use="Departures. Expo-in." />
        <Curve name="--ease-io" use="Loops, gauges, anything symmetrical." />
        <Curve name="--ease-sheet" use="Sheets. The iOS curve." />
      </div>

      <Sub title="Springs" note="Sampled from real damped-spring physics (tools/spring.mjs) and used as transition-timing-function. They overshoot on purpose. Tap a card to replay." />
      <div className="pf-curves">
        <Spring name="--spring-snap" use="Press release. Settles ~550 ms." b={b} flip={flip} />
        <Spring name="--spring-soft" use="Quiet settle, no overshoot." b={b} flip={flip} />
        <Spring name="--spring-bounce" use="Celebrations. Overshoots 19%." b={b} flip={flip} />
        <Spring name="--spring-slam" use="A thing landing hard." b={b} flip={flip} />
      </div>

      <Sub title="Durations" note="Instant is for the press. Hero is for the one moment per screen." />
      <div className="pf-card pf-race">
        {['instant', 'fast', 'base', 'slow', 'slower', 'hero'].map((k) => (
          <div key={`${k}${race}`}><span className="pf-code">--t-{k}</span><span className="pf-race__track"><span className="pf-race__fill" style={{ '--d': V(`--t-${k}`) }} /></span><span className="t-mono-sm">{tok(`--t-${k}`)}</span></div>
        ))}
      </div>

      <Sub title="Press physics" note="Down: scale .97 in --t-instant. Up: --spring-snap overshoots back. Hold either one. Needs a touchstart listener on iOS for :active (see REQUESTS)." />
      <div className="pf-card pf-press">
        <button type="button" className="pf-pressbox u-press t-label" aria-label="Press and hold me">Hold me</button>
        <span className="u-cut-frame pf-glow"><button type="button" className="pf-btn u-clip-cut u-press"><span>Ignite</span></button></span>
        <span className="u-cut-frame"><button type="button" className="pf-btn is-secondary u-clip-cut u-press"><span>Abort</span></button></span>
      </div>
    </Sec>
  )
}

/* ───────────────────────────────────────────────────────────── self-check: does base.css do what it says? */
function runChecks() {
  const out = []; const add = (name, ok, got) => out.push({ name, ok: !!ok, got })
  const host = document.createElement('div'); host.setAttribute('aria-hidden', 'true'); host.style.cssText = 'position:fixed;left:-9999px;top:0;width:300px'
  document.body.appendChild(host)
  const style = document.createElement('style')
  style.textContent = '@layer ui { .pfx-flex { display: flex } .pfx-wide { position: relative; width: 100px; height: 40px; overflow: visible } }'
  document.head.appendChild(style)
  const mk = (html) => { const d = document.createElement('div'); d.innerHTML = html; host.appendChild(d); return d.firstElementChild }
  const cs = (e, pseudo) => getComputedStyle(e, pseudo)
  const html = rootEl(); const prevFx = html.dataset.fx
  try {
    add('every box is border-box', cs(mk('<div></div>')).boxSizing === 'border-box', 'border-box')
    add('page is carbon-0 and fills the viewport', cs(document.body).backgroundColor === resolveColor('var(--carbon-0)') && document.body.getBoundingClientRect().height >= innerHeight - 1, cs(document.body).backgroundColor)
    add('font synthesis is off (no fake bold)', cs(document.body).fontSynthesisWeight === 'none', cs(document.body).fontSynthesisWeight)
    const h = mk('<div class="pfx-flex" hidden></div>'); add('[hidden] beats a component display: flex', cs(h).display === 'none', cs(h).display)
    const sr = mk('<div class="pfx-wide u-sr"></div>'); add('.u-sr cannot be un-hidden by a component', cs(sr).width === '1px' && cs(sr).position === 'absolute', `${cs(sr).width} ${cs(sr).position}`)
    const b = mk('<button type="button">x</button>'); b.style.setProperty('transition', 'none', 'important'); b.focus({ focusVisible: true })
    const rw = tok('--ring-w') || '2px'
    add(`focus ring: ${rw.replace('px', ' px')} --tele, 2 px off`, b.matches(':focus-visible') && cs(b).outlineWidth === rw && cs(b).outlineColor === resolveColor('var(--tele)') && cs(b).outlineOffset === '2px', `${cs(b).outlineWidth} ${cs(b).outlineOffset}`)
    b.blur()
    const fr = mk('<span class="u-cut-frame"><button type="button" class="u-clip-cut">x</button></span>'); fr.style.setProperty('transition', 'none', 'important')
    fr.firstElementChild.focus({ focusVisible: true })
    add('.u-cut-frame draws the ring on the silhouette', fr.firstElementChild.matches(':focus-visible') && (cs(fr).filter.match(/drop-shadow/g) || []).length === 8 && cs(fr.firstElementChild).outlineStyle === 'none', `${(cs(fr).filter.match(/drop-shadow/g) || []).length} drop-shadows`)
    fr.firstElementChild.blur()
    const t = mk('<i class="u-tap" style="display:inline-block;width:24px;height:24px"></i>'); const ta = cs(t, '::after')
    add('.u-tap grows a 24 px glyph to a 48 px target', Math.round(parseFloat(ta.width)) === 48 && Math.round(parseFloat(ta.height)) === 48, `${ta.width} x ${ta.height}`)
    const sc = mk('<p class="t-scripture-sm" style="--read-scale:.9">In the beginning</p>'); const scpx = parseFloat(cs(sc).fontSize)
    add('Scripture never drops below 20 px at 90 % text size', scpx >= 19.99, `${Math.round(scpx * 10) / 10} px`)
    const qb = cs(mk('<p class="t-scripture t-quote">x</p>'), '::before')
    add('.t-quote: a gold opening quote with an empty text alternative', qb.content.includes('“') && qb.color === resolveColor('var(--gold-2)'), qb.content)
    const fd = mk('<div class="u-fade-x u-scroll-x u-noscrollbar" style="width:200px"></div>')
    add('.u-fade-x: masked edges, padding = fade length, scrolls sideways', /gradient/.test(cs(fd).maskImage || cs(fd).webkitMaskImage) && cs(fd).paddingLeft === '24px' && cs(fd).overflowX === 'auto' && cs(fd).scrollbarWidth === 'none', `${cs(fd).paddingLeft} · ${cs(fd).overflowX}`)
    const l = mk('<a href="#x">link</a>'); add('prose link is --tele and underlined', cs(l).color === resolveColor('var(--tele)') && cs(l).textDecorationLine === 'underline', cs(l).color)
    add('hairline is 1 px, 0.5 px on retina', tok('--hair') === (matchMedia('(-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx)').matches ? '.5px' : '1px'), tok('--hair'))
    html.dataset.fx = 'lite'
    const a = mk('<i style="animation: pf-fill 2s infinite"></i>'); const e = mk('<i data-motion="essential" style="animation: pf-fill 2s infinite"></i>')
    add('lite: animations jump to the end and run once', parseFloat(cs(a).animationDuration) < 0.001 && cs(a).animationIterationCount === '1', `${cs(a).animationDuration} x${cs(a).animationIterationCount}`)
    add('lite: data-motion="essential" is left alone', cs(e).animationDuration === '2s', cs(e).animationDuration)
    const tr = mk('<i style="transition: transform 600ms, opacity 600ms; display:block"></i>'); const tp = cs(tr).transitionProperty.split(', '); const td = cs(tr).transitionDuration.split(', ')
    add('lite: transforms are instant, opacity cross-fades', parseFloat(td[tp.indexOf('transform')]) < 0.001 && parseFloat(td[tp.indexOf('opacity')]) === parseFloat(tok('--t-fast')) / 1000, `${td[tp.indexOf('transform')]} / ${td[tp.indexOf('opacity')]}`)
    const g = mk('<div class="u-glass"></div>'); add('lite: glass loses its blur and goes solid', cs(g).backdropFilter === 'none' && cs(g).backgroundColor === resolveColor('var(--carbon-1)'), cs(g).backdropFilter)
    add('lite: grain overlay is removed', cs(document.body, '::after').display === 'none', cs(document.body, '::after').display)
  } finally {
    if (prevFx === undefined) delete html.dataset.fx; else html.dataset.fx = prevFx
    style.remove(); host.remove()
    obs.mo?.takeRecords()   // our own data-fx flip must not re-trigger us
  }
  return out
}
const CheckCtx = createContext({ rs: [], set: () => {} })
function CheckProvider({ children }) {
  const rev = useRev(); const [rs, setRs] = useState([])
  useEffect(() => { const id = setTimeout(() => setRs(runChecks()), 450); return () => clearTimeout(id) }, [rev])   // let first-paint transitions settle
  return <CheckCtx.Provider value={rs}>{children}</CheckCtx.Provider>
}
function useSelfCheckSummary() { const rs = useContext(CheckCtx); if (!rs.length) return '…'; const bad = rs.filter((r) => !r.ok).length; return bad ? `${bad} FAIL` : `${rs.length}/${rs.length}` }
function SelfCheck() {
  const rs = useContext(CheckCtx); const ref = useRef(null)
  const bad = rs.filter((r) => !r.ok).length
  useEffect(() => { if (bad && ref.current) ref.current.open = true }, [bad])   // a failure is never hidden behind a fold
  return (
    <details ref={ref} className="pf-card pf-self">
      <summary className="pf-self__head"><span className="t-label">Does base.css do what it says?</span><span className={`pf-badge ${bad ? 'is-fail' : 'is-aa'}`}><span>{rs.length - bad}/{rs.length}</span>{bad ? 'FAIL' : 'PASS'}</span></summary>
      <ul role="list">{rs.map((r) => <li key={r.name} className={r.ok ? 'is-ok' : 'is-bad'}><span className="pf-tick" aria-hidden="true">{r.ok ? '✓' : '×'}</span><span className="t-body-sm">{r.name}<span className="u-sr">{r.ok ? ' passed' : ' failed'}</span></span><span className="t-mono-sm">{r.got}</span></li>)}</ul>
    </details>
  )
}

/* ───────────────────────────────────────────────────────────── 06 access + utilities */
function Status() {
  useRev()
  const rm = useMedia('(prefers-reduced-motion: reduce)'); const hc = useMedia('(prefers-contrast: more)'); const fc = useMedia('(forced-colors: active)')
  const rt = useMedia('(prefers-reduced-transparency: reduce)'); const hv = useMedia('(hover: hover)'); const co = useMedia('(pointer: coarse)')
  const [vp, setVp] = useState('')
  useEffect(() => { const f = () => setVp(`${innerWidth}×${innerHeight} @${devicePixelRatio}x`); f(); addEventListener('resize', f); return () => removeEventListener('resize', f) }, [])
  const yn = (v) => (v ? 'YES' : 'no')
  return (
    <dl className="pf-card pf-status t-mono">
      <dt>data-fx</dt><dd>{rootEl().dataset.fx || '—'}</dd><dt>data-contrast</dt><dd>{rootEl().dataset.contrast || '—'}</dd>
      <dt>prefers-reduced-motion</dt><dd>{yn(rm)}</dd><dt>prefers-contrast: more</dt><dd>{yn(hc)}</dd>
      <dt>forced-colors</dt><dd>{yn(fc)}</dd><dt>reduced-transparency</dt><dd>{yn(rt)}</dd>
      <dt>hover · coarse pointer</dt><dd>{yn(hv)} · {yn(co)}</dd><dt>viewport</dt><dd>{vp}</dd>
      <dt>--hair</dt><dd>{tok('--hair')}</dd><dt>--grain-opacity</dt><dd>{tok('--grain-opacity')}</dd>
    </dl>
  )
}
function Util({ cls, title, children, note }) {
  return <div className="pf-card pf-u"><div><span className="pf-code">{cls}</span><p className="t-caption" style={{ marginTop: 'var(--s-1)' }}><Note>{note}</Note></p></div><div className="pf-u__demo">{children}</div><p className="t-label-sm" style={{ color: V('--ink-3') }}>{title}</p></div>
}
function Access() {
  const [reveal, setReveal] = useState(false)
  return (
    <Sec id="access" n="06" title="Access" kicker="FOCUS · REDUCED MOTION · CONTRAST · FORCED COLOURS · UTILITIES">
      <Sub title="What the page is seeing" note="Live. Toggle your OS settings, or Full/Lite and Contrast+ up top, and watch these and everything above respond." />
      <Status />

      <Sub title="Self-check" note="Runs in your browser right now: builds throw-away elements, flips lite on and off inside one frame, and reads back computed style." />
      <SelfCheck />

      <Sub title="The a11y layer" note="Last in the cascade, so it beats every component. It is the only place !important lives, because an inline style must lose." />
      <div className="pf-grid c3">
        <div className="pf-card pf-u"><span className="t-label">Lite / reduced motion</span><p className="t-body-sm">Animations jump to their end state in 0.01 ms (so animationend and transitionend still fire). Loops run once. Transforms are instant; colour and opacity cross-fade in --t-fast. Blur and grain are removed. Opt out with <code className="pf-code">data-motion="essential"</code> for a spinner.</p></div>
        <div className="pf-card pf-u"><span className="t-label">More contrast</span><p className="t-body-sm">Secondary text becomes full ink, hairlines become real boundaries (≥ 3:1), the focus ring thickens to 3 px, grain and the verse halo go. Applies from <code className="pf-code">prefers-contrast: more</code> or <code className="pf-code">html[data-contrast=more]</code>.</p></div>
        <div className="pf-card pf-u"><span className="t-label">Forced colours</span><p className="t-body-sm">System colours take over, shadows and gradients are stripped. Controls get a 1 px boundary, chamfers un-clip so it shows, gradient numerals fall back to text colour.</p></div>
      </div>

      <Sub title="Utilities" note="They live in the base layer, so a component or screen always wins over them. Compose with custom props, not by fighting." />
      <div className="pf-ug">
        <Util cls=".u-stack · .u-row · .u-grow" note="--gap sets the gap; both are plain flex." title="Layout">
          <div className="u-stack" style={{ '--gap': 'var(--s-2)' }}><div className="u-row" style={{ '--gap': 'var(--s-2)' }}><span className="pf-box">A</span><span className="pf-box u-grow">.u-grow</span><span className="pf-box is-hot">B</span></div><div className="u-center pf-box" style={{ minHeight: 'var(--s-12)' }}>.u-center</div></div>
        </Util>
        <Util cls=".u-truncate · .u-clamp-2" note="One line with an ellipsis; or two." title="Overflow">
          <div style={{ width: 180 }} className="u-stack"><p className="u-truncate t-body-sm">Faithful in little, faithful in much, faithful in all</p><p className="u-clamp-2 t-body-sm">Faithful in little, faithful in much, faithful in all things, to the end of the age and beyond.</p></div>
        </Util>
        <Util cls=".u-hairline · .u-ruler" note="1 px that is 0.5 px on retina; a ruler with minor and major ticks." title="Lines">
          <div className="u-stack" style={{ '--gap': 'var(--s-3)' }}><div className="u-hairline pf-box" style={{ borderRadius: 'var(--r-sm)' }}>.u-hairline</div><div className="u-hairline-b" style={{ paddingBottom: 'var(--s-2)' }}><span className="t-mono-sm">.u-hairline-b</span></div><div className="u-ruler" /></div>
        </Util>
        <Util cls=".u-safe-t · .u-safe-b" note="Padding for the notch and the home bar. --sat / --sab are set here to 44 / 28 px." title="Safe areas">
          <div className="u-center"><div className="pf-phone"><div className="pf-phone__t t-mono-sm u-safe-t">.u-safe-t</div><div className="pf-phone__m t-mono-sm">content</div><div className="pf-phone__b t-mono-sm u-safe-b">.u-safe-b</div></div></div>
        </Util>
        <Util cls=".u-tap" note="A 24 px glyph with a 48 px hit target. The dashed outline is the real hit area." title="Hit target">
          <div className="u-row u-wrap" style={{ '--gap': 'var(--s-5)', padding: 'var(--s-4)' }}>
            <button type="button" className="pf-hit u-tap" aria-label="Close" style={{ '--tap': '48px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
            <span className="t-caption">24 px visible · 48 px target</span>
          </div>
        </Util>
        <Util cls=".u-scroll-x · .u-fade-x · .u-noscrollbar" note="A row that scrolls sideways with no bar, dissolving at its edges so the thumb can see there is more. Padding equals the fade, so the first chip starts clear." title="Scrolling rows">
          <div className="u-scroll-x u-noscrollbar u-fade-x u-row" role="region" aria-label="Scrolling chips" tabIndex={0} style={{ '--gap': 'var(--s-2)', marginInline: 'calc(var(--s-3) * -1)' }}>
            {['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9'].map((d, i) => <span key={d} className={`pf-box t-label-sm u-nowrap${i === 3 ? ' is-hot' : ''}`} style={{ flex: 'none', minHeight: 'var(--s-10)', paddingInline: 'var(--s-4)' }}>{d}</span>)}
          </div>
        </Util>
        <Util cls=".u-scroll-y" note="Momentum, and the scroll never chains to the page behind it." title="Scroller">
          <div className="pf-scroller u-scroll-y" tabIndex={0} role="region" aria-label="Scrolling example">{[1, 2, 3, 4, 5, 6].map((i) => <p key={i} className="t-body-sm">Line {i}. Overscroll is contained, so a lesson never drags the page.</p>)}</div>
        </Util>
        <Util cls=".u-sr · .u-skip" note="Hidden from sight, announced to screen readers. Lives in the a11y layer so nothing can un-hide it." title="Screen reader">
          <div className={`u-stack ${reveal ? 'pf-reveal' : ''}`} style={{ '--gap': 'var(--s-3)' }}>
            <button type="button" className="pf-round" aria-label="Streak"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 2.5 1.5 2.5C10 9 10.5 6 12 3z" /></svg><span className="u-sr">Streak, 12 days</span></button>
            <button type="button" className="pf-toggle t-label-sm" aria-pressed={reveal} onClick={() => setReveal(!reveal)}><i className="pf-led" aria-hidden="true" />Reveal .u-sr</button>
          </div>
        </Util>
        <Util cls=".u-press" note="Weight on the way down, overshoot on the way up." title="Press">
          <div className="u-row" style={{ '--gap': 'var(--s-4)' }}><button type="button" className="pf-pressbox u-press t-label-sm" style={{ width: 88, height: 88 }}>Hold</button></div>
        </Util>
      </div>
    </Sec>
  )
}

/* ───────────────────────────────────────────────────────────── 07 rules */
const LAYERS = [
  ['reset', 'Neutralise the UA. Changes nothing about how we look.', 'foundation'],
  ['base', 'Cockpit defaults, .t-* type, .u-* utilities.', 'foundation'],
  ['ui', 'Primitives and art: .k-, .art-', 'ui · art'],
  ['screen', 'Screens: .shell-, .learn-, .lesson-…', 'screens'],
  ['fx', 'Canvas and effect layers: .fx-', 'fx'],
  ['a11y', 'Focus, [hidden], .u-sr, lite, contrast, forced colours. Wins over everything.', 'foundation'],
]
function Rules() {
  return (
    <Sec id="rules" n="07" title="Rules" kicker="THE CASCADE · THE CHEAT SHEET">
      <Sub title="Six layers" note="Declared once in tokens.css. A later layer always wins, whatever the specificity. Every stylesheet wraps its rules in exactly one." />
      <div className="pf-layers">
        {LAYERS.map(([n, d, o], i) => (
          <div key={n} className={`pf-layer${n === 'a11y' ? ' is-top' : ''}`} style={{ '--i': i }}>
            <span className="pf-layer__n">{String(i + 1).padStart(2, '0')}</span>
            <div><p className="t-label" style={{ color: V('--ink') }}>@layer {n} <span className="t-mono-sm" style={{ marginLeft: 'var(--s-2)', color: V('--ink-3') }}>{o}</span></p><p className="t-caption"><Note>{d}</Note></p></div>
          </div>
        ))}
      </div>

      <Sub title="Cheat sheet" />
      <div className="pf-grid is-xwide">
        {[
          ['Chamfered control with ring + glow', '<span class="u-cut-frame" style="--frame-filter: drop-shadow(…)">\n  <button class="k-btn u-clip-cut">…</button>\n</span>'],
          ['Anything that blurs behind itself', '<header data-glass class="shell-hud">\n/* lite → solid carbon-1, automatically */'],
          ['Motion that must survive lite', '<svg class="spinner" data-motion="essential">'],
          ['Reading size (0.9–1.3)', '.lesson-reader { --read-scale: 1.15 }\n/* scales .t-scripture*, .t-lead, .t-body, .t-body-sm only */'],
          ['A 48 px hit target on a 24 px icon', '<button class="k-icon-btn u-tap">…</button>\n/* uses ::after: do not also style it */'],
          ['Tune the focus ring', '.thing { --ring: var(--go); --ring-off: -4px }'],
          ['Hairline that is crisp on retina', '.u-hairline  /* border: var(--hair) solid var(--line) */'],
          ['One hero numeral, ignition gradient', '<span class="t-display t-display-xl t-ignite">12</span>'],
        ].map(([t, c]) => <div key={t} className="pf-card pf-u"><p className="t-label">{t}</p><pre className="pf-code">{c}</pre></div>)}
      </div>

      <Sub title="Never" note="From the art direction. If a screen needs one of these, the screen is wrong." />
      <div className="pf-never">
        {['Emoji in the interface. Glyphs come from the icon set or the art set.', 'Candy colours, chunky 4 px “button edge” pressables, bubbly nodes.', 'Gradient on text, except one hero numeral per screen.', 'Glass on content cards. Glass is chrome: HUD, dock, sheets.', 'Grey shadows. Shadows are black, large, low-alpha, tinted by glow when lit.', 'Two orange things competing on one screen.', 'Raw hex, px radii or ms durations in a component stylesheet.', '!important anywhere outside the a11y layer.', 'Verdicts by colour alone: icon and words, always.', 'Sci-fi kitsch: Orbitron, neon grids, wireframe holograms, lens-flare overdose.'].map((t) => <p key={t} className="t-body-sm"><i aria-hidden="true">×</i>{t}</p>)}
      </div>

      <div className="pf-foot"><span className="t-mono-sm">KIND V7 · ASCENT · FOUNDATION</span><span className="t-mono-sm">Raising goDs. Building nations.</span></div>
    </Sec>
  )
}

/* ───────────────────────────────────────────────────────────── app */
function Sky() {
  return (
    <div className="pf-sky" aria-hidden="true">
      <svg preserveAspectRatio="none">{STARS.map((s, i) => <circle key={i} className={`pf-star${s.tw ? ' is-tw' : ''}`} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} opacity={s.o} style={s.tw ? { animationDelay: `${s.d}s` } : undefined} />)}</svg>
    </div>
  )
}

function App() {
  const [active, setActive] = useState('colour')
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-40% 0px -55% 0px' })
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])
  return (
    <RevProvider><CheckProvider>
      <div className="pf">
        <Sky />
        <Nav active={active} />
        <main>
          <Hero />
          <Colour />
          <TypeSec />
          <Geometry />
          <Light />
          <Motion />
          <Access />
          <Rules />
        </main>
      </div>
    </CheckProvider></RevProvider>
  )
}

if (new URLSearchParams(location.search).get('contrast') === 'more') document.documentElement.dataset.contrast = 'more'   // before first render, so the toggle starts in the right state
mount(<App />, { fx: new URLSearchParams(location.search).get('fx') === 'lite' ? 'lite' : 'full' })
