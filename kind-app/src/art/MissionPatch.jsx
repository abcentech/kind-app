// MissionPatch — an embroidered round mission patch, drawn in code.
//   <MissionPatch series={series} stage={0..4} state="earned" | "locked" size={160} />
//
// What makes it read as thread and not as a badge:
//   · the MERROW border  — ~200 slanted thread wraps (one <path> per pass: shadow / body / highlight), round-capped so the
//                          outer edge scallops, the body stroked with a radial gradient so each wrap is a little cylinder
//   · TWILL field        — a 45deg ribbed weave (SVG <pattern>) with a vignette so the fabric looks pulled taut
//   · SATIN fills        — every emblem shape is a pattern of parallel stitches (bright / base / shadow line) at alternating
//                          angles, ringed in black outline thread, and sits on a soft offset shadow (the padding under satin)
//   · RUNNING stitches   — dashed rings; satin lettering on two circular paths
// Locked = a debossed ghost of the emblem on dead black cloth, a dashed outline and a tiny padlock (no merrow yet: it isn't sewn on).
// Detail steps down with size (min <= 80px: no lettering or weave; mid <= 128px: no weave) so a 56px patch stays a clean icon.
import { memo, useMemo } from 'react'
import { PATCH_GLYPHS, patchGlyphFor } from './emblem-glyphs.js'
import { clamp, cx, hash, mulberry32, oklch, pt, P, r2, rrect, spark4, toLch, tone, useUid, circ, mix } from './emblem-kit.jsx'

// mirrors tokens.css --stage-1..5 (illustration-internal: SVG attributes cannot read CSS vars)
export const STAGE_HEX = ['#f2b84b', '#5cc8ff', '#ff6b5b', '#4fe0a8', '#a98bff']
const BLACK = '#06070b'
const IVORY = { base: '#eee4cb', hi: '#fffaf0', lo: '#a89c7d' }
const GOLD = { base: '#e8b64a', hi: '#fbe6a8', lo: '#8f610f' }
const FONT = "'Barlow Condensed','Arial Narrow',Arial,sans-serif"
const CX = 100, CY = 100

/* ───────────────────────────── palette ───────────────────────────── */
function palette(accent, accentDark, stageHex) {
  const base = accent || accentDark || '#c99a3c'
  const [, aC, aH] = toLch(base)
  const [, sC, sH] = toLch(stageHex)
  const lead = accentDark || accent || stageHex
  const [, lC, lH] = toLch(lead)
  const fc = Math.min(0.055, aC * 0.5)
  const sc = Math.max(0.1, Math.min(sC, 0.17))
  return {
    field: oklch(0.2, fc, aH), fieldHi: oklch(0.285, fc * 1.15, aH), fieldLo: oklch(0.12, fc * 0.8, aH), fieldDeep: oklch(0.145, fc * 0.9, aH),
    ring: { base: oklch(0.74, Math.min(0.13, lC * 0.95), lH), hi: oklch(0.92, Math.min(0.08, lC * 0.55), lH), lo: oklch(0.42, Math.min(0.1, lC * 0.7), lH), deep: oklch(0.26, Math.min(0.07, lC * 0.5), lH) },
    p: { base: oklch(0.74, sc, sH), hi: oklch(0.9, sc * 0.6, sH), lo: oklch(0.5, sc * 0.9, sH) },
    s: { base: oklch(0.5, sc * 0.85, sH), hi: oklch(0.68, sc * 0.9, sH), lo: oklch(0.32, sc * 0.6, sH) },
    a: GOLD, w: IVORY, k: { base: '#0b0c12', hi: '#2b2f3f', lo: '#000000' },
    glow: oklch(0.7, sc, sH),
  }
}

/* ───────────────────────────── the merrowed border ───────────────────────────── */
const ribCache = new Map()
function ribs(n, r0, r1, slantDeg) {
  const key = `${n}|${r0}|${r1}|${slantDeg}`
  if (ribCache.has(key)) return ribCache.get(key)
  const pitch = 360 / n
  const seg = (off) => {
    let d = ''
    for (let i = 0; i < n; i++) {
      const a = i * pitch + off
      d += `M${P(pt(CX, CY, r0, a))}L${P(pt(CX, CY, r1, a + slantDeg))}`
    }
    return d
  }
  const out = { shadow: seg(pitch * 0.34), body: seg(0), light: seg(-pitch * 0.26), pitchLen: ((Math.PI * 2 * ((r0 + r1) / 2)) / n) }
  ribCache.set(key, out)
  return out
}

/* ───────────────────────────── pieces ───────────────────────────── */
// Satin: pattern tiles of parallel threads. Two angles so adjacent shapes catch the light differently, like real fills.
function Patterns({ u, pal, twill, pitch = 2.3 }) {
  const roles = ['p', 's', 'a', 'w', 'k']
  const mk = (id, c, ang) => (
    <pattern key={id} id={id} width={pitch} height={pitch} patternUnits="userSpaceOnUse" patternTransform={`rotate(${ang})`}>
      <rect width={pitch} height={pitch} fill={c.base} />
      <rect width={pitch} height={pitch * 0.34} fill={c.hi} opacity=".62" />
      <rect y={pitch * 0.74} width={pitch} height={pitch * 0.26} fill={c.lo} opacity=".7" />
    </pattern>
  )
  return (
    <>
      {roles.map((r) => [mk(`${u}-${r}0`, pal[r], 58), mk(`${u}-${r}1`, pal[r], -32)])}
      {mk(`${u}-ring`, pal.ring, 90)}
      {twill && (
        <pattern id={`${u}-tw`} width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="3.4" height="3.4" fill={pal.field} />
          <rect width="3.4" height="1.25" fill={pal.fieldHi} opacity=".85" />
          <rect y="2.35" width="3.4" height=".95" fill={pal.fieldLo} opacity=".9" />
          <rect x="1.2" width=".5" height="3.4" fill={pal.fieldLo} opacity=".35" />
        </pattern>
      )}
    </>
  )
}

function Thread({ shapes, u, ghost, relief, pal }) {
  return shapes.map((s, i) => {
    if (ghost) {
      const k = s.r === 'k'
      return s.st
        ? <path key={i} d={s.d} fill="none" stroke={k ? '#0b0d14' : '#1c2132'} strokeWidth={s.st} strokeLinecap={s.cap || 'butt'} strokeLinejoin="round" />
        : <path key={i} d={s.d} fillRule={s.eo ? 'evenodd' : undefined} fill={k ? '#0b0d14' : '#1a1f2f'} stroke={k ? 'none' : '#2d3448'} strokeWidth=".9" strokeLinejoin="round" />
    }
    const fill = `url(#${u}-${s.r}${i % 2})`
    if (s.st) {
      return (
        <g key={i}>
          {s.r !== 'k' && <path d={s.d} fill="none" stroke={BLACK} strokeWidth={s.st + (s.o === false ? 0 : 2)} strokeLinecap={s.cap || 'butt'} strokeLinejoin="round" opacity={s.o === false ? 0 : 0.92} />}
          <path d={s.d} fill="none" stroke={fill} strokeWidth={s.st} strokeLinecap={s.cap || 'butt'} strokeLinejoin="round" />
        </g>
      )
    }
    const isK = s.r === 'k'
    return (
      <g key={i}>
        {relief && !isK && s.o !== false && <path d={s.d} fillRule={s.eo ? 'evenodd' : undefined} transform="translate(.8 1.1)" fill="#000" opacity=".38" />}
        <path d={s.d} fillRule={s.eo ? 'evenodd' : undefined} fill={fill} stroke={isK || s.o === false ? 'none' : BLACK} strokeWidth="1.7" strokeLinejoin="round" paintOrder="stroke" />
      </g>
    )
  })
}

const padlock = (x, y, k = 1) => (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <path d="M-3.6 -1.2V-3.4a3.6 3.6 0 0 1 7.2 0V-1.2" fill="none" stroke="#6b7390" strokeWidth="1.5" strokeLinecap="round" />
    <path d={rrect(-5.4, -1.4, 10.8, 8.2, 1.8)} fill="#2c3246" stroke="#7a82a0" strokeWidth=".8" />
    <circle cx="0" cy="2.4" r="1.1" fill="#0b0d14" />
  </g>
)

/* ───────────────────────────── component ───────────────────────────── */
export const MissionPatch = memo(function MissionPatch({
  series, stage = 0, state = 'earned', size = 160, tint, title, label, detail, glint = true, decorative,
  className, style, ...rest
}) {
  const u = useUid('mp')
  const earned = state !== 'locked'
  const s = series && typeof series === 'object' ? series : null
  const weeks = s?.weeks || []
  const st = clamp(Math.round(stage), 0, Math.max(0, (weeks.length || 5) - 1))
  const f = weeks[st]?.f || ''
  const glyphKey = patchGlyphFor(f)
  const stageHex = tint || STAGE_HEX[st % STAGE_HEX.length]
  const px = typeof size === 'number' ? size : 200
  const lv = detail || (px <= 80 ? 'min' : px <= 128 ? 'mid' : 'full')
  const full = lv === 'full', min = lv === 'min'

  const topText = String(s?.title || title || 'KIND').toUpperCase()
  const botText = `KIND · ${s?.month ? String(s.month).toUpperCase() : 'MISSION'}${s?.year ? ' ' + s.year : ''}`
  const pal = useMemo(() => palette(s?.accent, s?.accentDark, stageHex), [s?.accent, s?.accentDark, stageHex])
  const rb = useMemo(() => ribs(min ? 90 : full ? 214 : 150, 89.6, 97.6, 9), [min, full])
  const stars = useMemo(() => {
    const rnd = mulberry32(hash(topText + st))
    const out = []
    for (let g = 0; out.length < 8 && g < 60; g++) {
      const a = rnd() * 360, r = 47 + rnd() * 7
      if (a > 150 && a < 210) continue                       // keep the pip row clear
      out.push([...pt(CX, CY - 2, r, a), 1.4 + rnd() * 1.8])
    }
    return out
  }, [topText, st])

  const shapes = PATCH_GLYPHS[glyphKey] || PATCH_GLYPHS.star
  const n = Math.max(weeks.length, 1)
    const aria = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label || `Mission patch, ${f ? f.toLowerCase() : topText.toLowerCase()}${weeks.length ? `, stage ${st + 1} of ${n}` : ''}, ${earned ? 'earned' : 'locked'}` }

  // lettering geometry
  const fsTop = clamp(190 / (topText.length * 0.64), 8.2, 15)
  const fsBot = clamp(205 / (botText.length * 0.74), 7, 11.5)
  const rTop = 74 - fsTop * 0.34, rBot = 74 + fsBot * 0.36
  const glyphScale = min ? 0.98 : 0.78
  const gy = min ? CY : 95
  const gT = `translate(${CX} ${gy}) scale(${glyphScale}) translate(-50 -50)`

  return (
    <svg
      className={cx('art-patch', earned ? 'is-earned' : 'is-locked', `is-${lv}`, className)}
      width={size} height={size} viewBox="0 0 200 200" style={style} data-glyph={glyphKey} data-state={earned ? 'earned' : 'locked'}
      {...aria} {...rest}
    >
      <defs>
        <Patterns u={u} pal={pal} twill={full && earned} />
        <clipPath id={u + 'cp'}><circle cx={CX} cy={CY} r="98.6" /></clipPath>
        <clipPath id={u + 'cf'}><circle cx={CX} cy={CY} r="89.6" /></clipPath>
        <radialGradient id={u + 'sh'} cx={CX} cy={CY + 7} r="106" gradientUnits="userSpaceOnUse">
          <stop offset=".84" stopColor="#000" stopOpacity=".62" /><stop offset=".92" stopColor="#000" stopOpacity=".28" /><stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={u + 'rb'} cx={CX} cy={CY} r="100" gradientUnits="userSpaceOnUse">
          <stop offset=".885" stopColor={pal.ring.deep} /><stop offset=".915" stopColor={pal.ring.base} /><stop offset=".94" stopColor={pal.ring.hi} />
          <stop offset=".965" stopColor={pal.ring.base} /><stop offset=".99" stopColor={pal.ring.lo} />
        </radialGradient>
        <linearGradient id={u + 'rl'} x1="30" y1="14" x2="170" y2="186" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".42" stopColor="#fff" stopOpacity=".28" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={u + 'rd'} x1="170" y1="186" x2="30" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#000" stopOpacity=".85" /><stop offset=".5" stopColor="#000" stopOpacity=".45" /><stop offset="1" stopColor="#000" stopOpacity=".1" />
        </linearGradient>
        <radialGradient id={u + 'fv'} cx={CX} cy={CY - 14} r="104" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity=".07" /><stop offset=".55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".5" />
        </radialGradient>
        <radialGradient id={u + 'gl'} cx={CX} cy={CY - 3} r="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={pal.glow} stopOpacity=".34" /><stop offset=".6" stopColor={pal.glow} stopOpacity=".1" /><stop offset="1" stopColor={pal.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={u + 'gs'} x1="14" y1="10" x2="150" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity=".3" /><stop offset=".34" stopColor="#fff" stopOpacity=".07" /><stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset=".78" stopColor="#000" stopOpacity=".12" /><stop offset="1" stopColor="#000" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id={u + 'gt'} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {full && earned && (
          <>
            <linearGradient id={u + 'sg'} x1="52" y1="38" x2="150" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".3" stopColor="#fff" stopOpacity=".05" />
              <stop offset=".46" stopColor="#fff" stopOpacity=".6" /><stop offset=".6" stopColor="#fff" stopOpacity=".06" />
              <stop offset=".78" stopColor="#000" stopOpacity=".2" /><stop offset="1" stopColor="#000" stopOpacity=".42" />
            </linearGradient>
            <mask id={u + 'sm'} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
              <g transform={gT}>
                {shapes.filter((x) => x.r !== 'k').map((x, i) => x.st
                  ? <path key={i} d={x.d} fill="none" stroke="#fff" strokeWidth={x.st} strokeLinecap={x.cap || 'butt'} />
                  : <path key={i} d={x.d} fillRule={x.eo ? 'evenodd' : undefined} fill="#fff" />)}
              </g>
            </mask>
          </>
        )}
        {full && (
          <>
            <path id={u + 'tt'} d={`M${CX - rTop} ${CY}A${rTop} ${rTop} 0 0 1 ${CX + rTop} ${CY}`} fill="none" />
            <path id={u + 'tb'} d={`M${CX - rBot} ${CY}A${rBot} ${rBot} 0 0 0 ${CX + rBot} ${CY}`} fill="none" />
          </>
        )}
        {lv === 'mid' && (
          <>
            <path id={u + 'tt'} d={`M${CX - rTop} ${CY}A${rTop} ${rTop} 0 0 1 ${CX + rTop} ${CY}`} fill="none" />
            <path id={u + 'tb'} d={`M${CX - rBot} ${CY}A${rBot} ${rBot} 0 0 0 ${CX + rBot} ${CY}`} fill="none" />
          </>
        )}
      </defs>

      {earned ? (
        <>
          {/* sits on the cloth: soft shadow, then the patch's own edge thickness */}
          <circle cx={CX} cy={CY + 3} r="106" fill={`url(#${u}sh)`} />
          <circle cx={CX} cy={CY} r="99.2" fill={pal.ring.deep} />
          {/* merrow: wraps of thread. shadow pass -> body (radial gradient = cylinder) -> light pass (only where the key light reaches) */}
          <circle cx={CX} cy={CY} r="93.5" fill="none" stroke={BLACK} strokeWidth="9.6" opacity=".9" />
          <path d={rb.shadow} fill="none" stroke={`url(#${u}rd)`} strokeWidth={min ? 3.4 : 1.6} strokeLinecap="round" />
          <path d={rb.body} fill="none" stroke={`url(#${u}rb)`} strokeWidth={min ? 3.8 : 2.5} strokeLinecap="round" />
          <path d={rb.light} fill="none" stroke={`url(#${u}rl)`} strokeWidth={min ? 1.4 : 0.85} strokeLinecap="round" />
          <circle cx={CX} cy={CY} r="98.4" fill="none" stroke={pal.ring.hi} strokeOpacity=".28" strokeWidth=".7" clipPath={`url(#${u}cp)`} />

          {/* the cloth */}
          <circle cx={CX} cy={CY} r="89.8" fill={BLACK} />
          <circle cx={CX} cy={CY} r="89.6" fill={full ? `url(#${u}-tw)` : pal.field} />
          <circle cx={CX} cy={CY} r="89.6" fill={`url(#${u}fv)`} />
          <circle cx={CX} cy={CY} r="89.3" fill="none" stroke="#000" strokeOpacity=".55" strokeWidth="2.4" />

          {!min && (
            <>
              <circle cx={CX} cy={CY} r="84.2" fill="none" stroke={pal.w.lo} strokeOpacity=".75" strokeWidth=".95" strokeDasharray="2.6 2.1" strokeLinecap="round" />
              <circle cx={CX} cy={CY} r="62.5" fill={pal.fieldDeep} fillOpacity=".55" />
              <circle cx={CX} cy={CY} r="63" fill="none" stroke={BLACK} strokeWidth="3.8" />
              <circle cx={CX} cy={CY} r="63" fill="none" stroke={`url(#${u}-w1)`} strokeWidth="2" />
              <circle cx={CX} cy={CY} r="58.8" fill="none" stroke={pal.w.lo} strokeOpacity=".6" strokeWidth=".8" strokeDasharray="1.8 2" strokeLinecap="round" />
            </>
          )}

          {/* lettering: satin, outlined in black thread */}
          {(full || lv === 'mid') && (
            <g fontFamily={FONT} fontWeight="700" textAnchor="middle" fill={`url(#${u}-w0)`} stroke={BLACK} strokeWidth="2.3" strokeLinejoin="round" paintOrder="stroke">
              <text fontSize={fsTop} letterSpacing={fsTop * 0.13}><textPath href={`#${u}tt`} startOffset="50%">{topText}</textPath></text>
              <text fontSize={fsBot} letterSpacing={fsBot * 0.2} fill={`url(#${u}-ring)`}><textPath href={`#${u}tb`} startOffset="50%">{botText}</textPath></text>
            </g>
          )}
          {!min && [-1, 1].map((sd) => (
            <g key={sd}>
              <path d={spark4(CX + sd * 74, CY, 6.4, 1.9)} fill={BLACK} stroke={BLACK} strokeWidth="2.2" strokeLinejoin="round" />
              <path d={spark4(CX + sd * 74, CY, 6.4, 1.9)} fill={`url(#${u}-a0)`} />
            </g>
          ))}

          {/* the inner field */}
          {!min && (
            <g>
              <circle cx={CX} cy={CY - 3} r="54" fill={`url(#${u}gl)`} />
              {full && <ellipse cx={CX} cy={CY - 2} rx="55" ry="17" transform={`rotate(-24 ${CX} ${CY - 2})`} fill="none" stroke={pal.w.lo} strokeOpacity=".72" strokeWidth=".9" strokeDasharray="2.2 2.4" strokeLinecap="round" />}
              {full && stars.map(([x, y, r], i) => <path key={i} d={spark4(x, y, r * 1.55, r * 0.46)} fill={i % 3 ? IVORY.base : GOLD.hi} opacity={i % 3 ? 0.78 : 0.95} />)}
            </g>
          )}

          {/* the emblem */}
          <g transform={gT}>
            <Thread shapes={shapes} u={u} relief={!min} pal={pal} />
          </g>
          {/* satin sheen: one diagonal band of light, masked to the emblem's own thread so it never spills onto the cloth */}
          {full && (
            <rect x="0" y="0" width="200" height="200" fill={`url(#${u}sg)`} mask={`url(#${u}sm)`} />
          )}

          {/* stage pips: how far up the mission this patch sits */}
          {full && n > 1 && n <= 6 && (
            <g>
              {Array.from({ length: n }, (_, i) => {
                const x = CX + (i - (n - 1) / 2) * 9.5, y = 147.5
                return i <= st
                  ? <g key={i}><circle cx={x} cy={y} r="3.6" fill={BLACK} /><circle cx={x} cy={y} r="2.5" fill={`url(#${u}-${i === st ? 'a' : 'p'}0)`} /></g>
                  : <circle key={i} cx={x} cy={y} r="2.4" fill="none" stroke={pal.w.lo} strokeOpacity=".7" strokeWidth=".9" />
              })}
            </g>
          )}

          {/* light: a gloss across the cloth, a single glint that sweeps once */}
          <g clipPath={`url(#${u}cp)`}>
            <circle cx={CX} cy={CY} r="99" fill={`url(#${u}gs)`} />
            {glint && !min && (
              <g className="art-patch__sweep">
                <rect x="-70" y="-30" width="46" height="260" transform="skewX(-22)" fill={`url(#${u}gt)`} />
              </g>
            )}
          </g>
        </>
      ) : (
        <>
          <circle cx={CX} cy={CY + 2} r="100" fill={`url(#${u}sh)`} opacity=".6" />
          <circle cx={CX} cy={CY} r="96" fill="#0b0d14" />
          <circle cx={CX} cy={CY} r="96" fill={`url(#${u}fv)`} />
          <circle cx={CX} cy={CY} r="96" fill="none" stroke="#3a4157" strokeWidth="1.5" strokeDasharray="5 4" strokeLinecap="round" />
          {!min && <circle cx={CX} cy={CY} r="86" fill="none" stroke="#242a3a" strokeWidth=".9" strokeDasharray="1.6 3" strokeLinecap="round" />}
          {!min && <circle cx={CX} cy={CY} r="60.5" fill="none" stroke="#242a3a" strokeWidth="1" />}
          {(full || lv === 'mid') && (
            <g fontFamily={FONT} fontWeight="700" textAnchor="middle" fill="#2a3043">
              <text fontSize={fsTop} letterSpacing={fsTop * 0.13}><textPath href={`#${u}tt`} startOffset="50%">{topText}</textPath></text>
              <text fontSize={fsBot} letterSpacing={fsBot * 0.2}><textPath href={`#${u}tb`} startOffset="50%">{botText}</textPath></text>
            </g>
          )}
          <g transform={`translate(${CX} ${gy}) scale(${glyphScale * (min ? 0.9 : 1)}) translate(-50 -50)`}>
            <Thread shapes={shapes} u={u} ghost />
          </g>
          {padlock(CX, min ? CY + 38 : 143, min ? 1.25 : 1)}
          {full && n > 1 && n <= 6 && Array.from({ length: n }, (_, i) => (
            <circle key={i} cx={CX + (i - (n - 1) / 2) * 9.5} cy="156" r="2.2" fill="none" stroke="#2c3347" strokeWidth=".9" opacity={i === st ? 1 : 0.5} />
          ))}
        </>
      )}
    </svg>
  )
})

export default MissionPatch
