// Share-image engine — draws 1080-wide share images (Story / Square / Portrait) straight onto a <canvas>.
//
//   renderShare({ kind, data, template, aspect, series }) → Promise<HTMLCanvasElement>
//     kind     'verse' | 'card' | 'streak' | 'month'   (data = shareData(kind, …) from the store)
//     template id from TEMPLATES[kind]; unknown ids fall back to the first
//     aspect   'story' | 'square' | 'portrait' (or an ASPECTS entry)
//     series   the series object (getSeries(id)) — used for patch art + titles; a series id string also works
//   TEMPLATES / ASPECTS / canvasToBlob — see docs/V7-WAVE2.md §share.
//
// Templates live in ./share/{verse,card,streak,month}.js: each exports `templates = [{ id, label, draw }]`,
// draw(ctx, w, h, data, series, H) is async and gets this file's toolbox as H (so templates never import back — no cycle).
//
// Notes
//  * Colours are read from the design tokens at render time (readPalette) so the canvas follows tokens.css; the Paper
//    variants use PAPER, a small light palette that has no token yet (see report: REQUESTS).
//  * Art components (<Rocket>, <MissionPatch>, <CodeCardArt>, …) are serialised with react-dom/server and drawn as images.
//    react-dom/server and the art are dynamic imports, so none of it is in the main bundle. Barlow Condensed is embedded
//    in each SVG that has <text> (an SVG-as-image cannot see the page's fonts).
//  * Nothing is fetched from the network. The only fetches are same-origin font files, for that embedding.
//  * Story safe area: the central 1080 x 1420 (250 px top and bottom stay clear of the app chrome).
import { SITE } from '../config.js'
import { BIBLE_VERSION } from '../copy.js'
import * as verseK from './share/verse.js'
import * as cardK from './share/card.js'
import * as streakK from './share/streak.js'
import * as monthK from './share/month.js'
import b500 from '../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal.woff2?url'
import b600 from '../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2?url'
import b700 from '../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2?url'

const TAU = Math.PI * 2

export const ASPECTS = [
  { id: 'story', w: 1080, h: 1920, label: 'Story' },
  { id: 'square', w: 1080, h: 1080, label: 'Square' },
  { id: 'portrait', w: 1080, h: 1350, label: 'Portrait' },
]
const KINDS = { verse: verseK, card: cardK, streak: streakK, month: monthK }
export const TEMPLATES = Object.fromEntries(Object.entries(KINDS).map(([k, m]) => [k, m.templates.map(({ id, label }) => ({ id, label }))]))

export function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((res, rej) => {
    if (!canvas.toBlob) return rej(new Error('canvas.toBlob unavailable'))
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), type, quality)
  })
}

/* ───────────────────────────── colour ───────────────────────────── */
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, t) => a + (b - a) * t
export function hexRgb(c) {
  if (c[0] === '#') {
    let h = c.slice(1)
    if (h.length === 3) h = [...h].map((x) => x + x).join('')
    const n = parseInt(h.slice(0, 6), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const m = String(c).match(/[\d.]+/g)
  return m ? m.slice(0, 3).map(Number) : [255, 255, 255]
}
export const rgba = (c, a = 1) => { const [r, g, b] = hexRgb(c); return `rgba(${r},${g},${b},${a})` }
export function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b)
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('')
}

// A light palette for the Paper templates (no token for it yet).
export const PAPER = { bg: '#efe9dc', bg2: '#e4dccb', ink: '#16181f', ink2: '#4a4d59', ink3: '#777a85', gold: '#8c5f10', gold2: '#b8861f', rule: 'rgba(22,24,31,.16)', ember: '#e8541a' }

function readPalette() {
  const cs = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null
  const t = (n, f) => (cs && cs.getPropertyValue(n).trim()) || f
  return {
    c0: t('--carbon-0', '#06070d'), c1: t('--carbon-1', '#0b0d15'), c2: t('--carbon-2', '#11141f'), c3: t('--carbon-3', '#181c2a'), c4: t('--carbon-4', '#232839'),
    ink: t('--ink', '#f4f6fb'), ink2: t('--ink-2', '#aab2c6'), ink3: t('--ink-3', '#7a8299'), ink4: t('--ink-4', '#4b5268'),
    ignite1: t('--ignite-1', '#ff4a0f'), ignite2: t('--ignite-2', '#ff8a1c'), ignite3: t('--ignite-3', '#ffc43d'),
    tele: t('--tele', '#63d8ff'), tele2: t('--tele-2', '#2b8fc2'), go: t('--go', '#3ddc97'),
    gold1: t('--gold-1', '#fbe6a8'), gold2: t('--gold-2', '#e8b64a'), gold3: t('--gold-3', '#9a6a14'),
    stages: [1, 2, 3, 4, 5].map((n, i) => t('--stage-' + n, ['#f2b84b', '#5cc8ff', '#ff6b5b', '#4fe0a8', '#a98bff'][i])),
    paper: PAPER,
  }
}
const SERIF = '"Newsreader Variable", "Iowan Old Style", Georgia, serif'
// Newsreader cannot stack a tone mark over a dot-below (ẹ́ ọ̀ ṣ́): the accent drifts off the letter. Yoruba text takes a stack that can.
const SERIF_YO = 'Georgia, "Iowan Old Style", "Noto Serif", "Droid Serif", serif'
export const F = {
  disp: '"Barlow Condensed", "Arial Narrow", sans-serif',
  serif: SERIF,
  ui: '"Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono Variable", ui-monospace, Menlo, Consolas, monospace',
}

/* ───────────────────────────── rng + canvas bits ───────────────────────────── */
export function mulberry32(seed) {
  let a = (seed | 0) + 0x6d2b79f5
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c }
export const grad = (g, stops) => { for (const [o, c] of stops) g.addColorStop(o, c); return g }
export const lin = (ctx, x0, y0, x1, y1, stops) => grad(ctx.createLinearGradient(x0, y0, x1, y1), stops)
export const rad = (ctx, x, y, r0, r1, stops) => grad(ctx.createRadialGradient(x, y, r0, x, y, r1), stops)

export function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + k, y); ctx.arcTo(x + w, y, x + w, y + h, k); ctx.arcTo(x + w, y + h, x, y + h, k); ctx.arcTo(x, y + h, x, y, k); ctx.arcTo(x, y, x + w, y, k)
  ctx.closePath()
}
/** The Lamborghini cut: top-left and bottom-right corners chamfered (matches --clip-cut). */
export function chamfer(ctx, x, y, w, h, c) {
  ctx.beginPath()
  ctx.moveTo(x + c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - c); ctx.lineTo(x + w - c, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + c)
  ctx.closePath()
}
export function hexPath(ctx, cx, cy, r, pointy = true) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (TAU / 6) * i + (pointy ? -Math.PI / 2 : 0)
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
  }
  ctx.closePath()
}

/* ───────────────────────────── text ───────────────────────────── */
const HAS_LS = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype
export const setFont = (ctx, { style = 'normal', weight = 400, size, family }) => { ctx.font = `${style} ${weight} ${size}px ${family}` }

/** Width of one line at the current ctx.font, letter-spacing included (no trailing spacing). */
export function measure(ctx, text, ls = 0) {
  if (!ls) return ctx.measureText(text).width
  if (HAS_LS) {
    const p = ctx.letterSpacing; ctx.letterSpacing = ls + 'px'
    const w = ctx.measureText(text).width; ctx.letterSpacing = p
    return w - ls
  }
  let w = 0
  for (const ch of text) w += ctx.measureText(ch).width + ls
  return w - ls
}
/** One line at baseline y. align applies around x. Returns the drawn width. */
export function fillTextLS(ctx, text, x, y, ls = 0, align = 'left') {
  const w = measure(ctx, text, ls)
  let x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  if (!ls) ctx.fillText(text, x0, y)
  else if (HAS_LS) { ctx.letterSpacing = ls + 'px'; ctx.fillText(text, x0, y); ctx.letterSpacing = '0px' }
  else for (const ch of text) { ctx.fillText(ch, x0, y); x0 += ctx.measureText(ch).width + ls }
  return w
}
/** Single tracked line anchored on its baseline. o: { family, weight, style, size, ls, fill, align, upper } */
export function text(ctx, str, x, base, o = {}) {
  const { family = F.ui, weight = 400, style = 'normal', size = 24, ls = 0, fill, align = 'left', upper } = o
  setFont(ctx, { family, weight, style, size })
  if (fill) ctx.fillStyle = fill
  return fillTextLS(ctx, upper ? String(str).toUpperCase() : String(str), x, base, ls, align)
}
export function textWidth(ctx, str, o = {}) {
  const { family = F.ui, weight = 400, style = 'normal', size = 24, ls = 0, upper } = o
  setFont(ctx, { family, weight, style, size })
  return measure(ctx, upper ? String(str).toUpperCase() : String(str), ls)
}
/** Shrink a single line's size until it fits maxW. Returns the size used. */
export function fitLine(ctx, str, maxW, o = {}) {
  let size = o.size ?? 40
  const min = o.min ?? 12
  while (size > min && textWidth(ctx, str, { ...o, size }) > maxW) size -= 1
  return size
}

function wordsOf(ctx, para, maxW, ls) {
  const sp = measure(ctx, ' ', 0) + ls * 2
  const words = [], ww = []
  for (const w of para.trim().split(/\s+/).filter(Boolean)) {
    const wd = measure(ctx, w, ls)
    if (wd <= maxW) { words.push(w); ww.push(wd); continue }
    let cur = ''                                 // a token wider than the box: break it by character
    for (const ch of w) {
      if (cur && measure(ctx, cur + ch, ls) > maxW) { words.push(cur); ww.push(measure(ctx, cur, ls)); cur = ch } else cur += ch
    }
    if (cur) { words.push(cur); ww.push(measure(ctx, cur, ls)) }
  }
  return { words, ww, sp }
}
function greedy(ww, sp, W) {
  const out = []
  let start = 0, cur = 0
  for (let i = 0; i < ww.length; i++) {
    const add = i === start ? ww[i] : cur + sp + ww[i]
    if (i > start && add > W) { out.push([start, i]); start = i; cur = ww[i] } else cur = add
  }
  if (start < ww.length) out.push([start, ww.length])
  return out
}
/**
 * Greedy line-breaker with balanced lines: find the line count at maxW, then narrow the measure until one more
 * line would appear, so the lines come out even instead of a long run and a stub. Honours '\n'. Set ctx.font first.
 */
export function breakLines(ctx, textIn, maxW, { ls = 0, balance = true } = {}) {
  const out = []
  for (const para of String(textIn).split('\n')) {
    const { words, ww, sp } = wordsOf(ctx, para, maxW, ls)
    if (!words.length) { out.push(''); continue }
    let rows = greedy(ww, sp, maxW)
    if (balance && rows.length > 1) {
      let lo = Math.max(...ww), hi = maxW
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2
        if (greedy(ww, sp, mid).length <= rows.length) hi = mid; else lo = mid
      }
      rows = greedy(ww, sp, hi)
    }
    for (const [a, b] of rows) out.push(words.slice(a, b).join(' '))
  }
  return out
}
/**
 * The largest font size (binary search) at which `text` fits w x h.
 * → { size, lines, lh (px), height, width, overflow? }. opts: { w, h, family, weight, style, min, max, lh, ls, balance }
 */
export function fitText(ctx, textIn, o) {
  const { w, h, family, weight = 400, style = 'normal', min = 20, max = 140, lh = 1.3, ls = 0, balance = true } = o
  const attempt = (size) => {
    setFont(ctx, { family, weight, style, size })
    const lines = breakLines(ctx, textIn, w, { ls, balance })
    const widest = Math.max(0, ...lines.map((l) => measure(ctx, l, ls)))
    const height = lines.length * size * lh
    return { size, lines, lh: size * lh, height, width: widest, ok: widest <= w + 0.5 && height <= h }
  }
  let r = attempt(max)
  if (r.ok) return r
  let lo = min, hi = max
  r = attempt(lo)
  if (!r.ok) { r.overflow = true; return r }
  let best = r
  for (let i = 0; i < 9; i++) {
    const mid = (lo + hi) / 2
    r = attempt(mid)
    if (r.ok) { best = r; lo = mid } else hi = mid
  }
  return best
}
/** Draw pre-broken lines; y is the TOP of the first line box. Returns the y below the last line. */
export function drawTextLines(ctx, lines, x, y, o) {
  const { size, lh = size * 1.3, align = 'left', ls = 0, fill, family, weight = 400, style = 'normal', stroke, shadow } = o
  if (family) setFont(ctx, { family, weight, style, size })
  if (fill) ctx.fillStyle = fill
  const m = ctx.measureText('Hg')
  const asc = m.fontBoundingBoxAscent ?? size * 0.8, desc = m.fontBoundingBoxDescent ?? size * 0.2
  ctx.save()
  if (shadow) { ctx.shadowColor = shadow.color; ctx.shadowBlur = shadow.blur; ctx.shadowOffsetY = shadow.y || 0 }
  lines.forEach((ln, i) => {
    const base = y + i * lh + (lh - (asc + desc)) / 2 + asc
    if (stroke) { ctx.save(); ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.w; ctx.lineJoin = 'round'; ctx.strokeText(ln, align === 'center' ? x - measure(ctx, ln) / 2 : align === 'right' ? x - measure(ctx, ln) : x, base); ctx.restore() }
    fillTextLS(ctx, ln, x, base, ls, align)
  })
  ctx.restore()
  return y + lines.length * lh
}

/* ───────────────────────────── layout ───────────────────────────── */
/** The frame every template lays out inside. Story keeps content in the central 1080 x 1420. */
export function frame(w, h) {
  const story = h / w > 1.6
  const pad = Math.round(w * 0.078)
  const top = story ? Math.round((h - 1420) / 2) : pad
  const bottom = story ? h - top : h - pad
  const footTop = bottom - 104
  return {
    w, h, story, pad, x: pad, right: w - pad, cw: w - pad * 2, cx: w / 2,
    top, bottom, ch: bottom - top, hudY: top, bodyTop: top + 78, footTop, bodyBottom: footTop - 36,
    bodyH: footTop - 36 - (top + 78), wide: w / h > 0.9,
  }
}

/* ───────────────────────────── backdrops ───────────────────────────── */
export function drawStarfield(ctx, w, h, { seed = 1, density = 1, y0 = 0, y1 = h, fade = true, glints = 3, tint = true } = {}) {
  const r = mulberry32(seed)
  const n = Math.round(((w * (y1 - y0)) / 4200) * density)
  const cols = ['#f4f6fb', '#f4f6fb', '#bcd4ff', '#ffe2bf']
  ctx.save()
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = y0 + r() * (y1 - y0)
    if (fade && r() > lerp(1, 0.3, (y - y0) / (y1 - y0))) continue
    const s = 0.5 + Math.pow(r(), 6) * 2.3, a = 0.22 + r() * 0.7
    const c = tint ? cols[(r() * cols.length) | 0] : cols[0]
    if (s > 1.3) { ctx.fillStyle = rgba(c, a * 0.2); ctx.beginPath(); ctx.arc(x, y, s * 3.4, 0, TAU); ctx.fill() }
    ctx.fillStyle = rgba(c, a)
    if (s < 0.95) ctx.fillRect(x, y, 1, 1)
    else { ctx.beginPath(); ctx.arc(x, y, s * 0.62, 0, TAU); ctx.fill() }
  }
  for (let i = 0; i < glints; i++) sparkle(ctx, r() * w, y0 + r() * (y1 - y0) * 0.7, 16 + r() * 22, '#dfeaff', 0.7)
  ctx.restore()
}
/** A four-point glint: two hairlines with soft ends + a core. */
export function sparkle(ctx, x, y, len, color = '#fff', a = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    ctx.fillStyle = lin(ctx, x - dx * len, y - dy * len, x + dx * len, y + dy * len, [[0, rgba(color, 0)], [0.5, rgba(color, a)], [1, rgba(color, 0)]])
    ctx.fillRect(x - (dx ? len : 0.7), y - (dy ? len : 0.7), dx ? len * 2 : 1.4, dy ? len * 2 : 1.4)
  }
  ctx.fillStyle = rad(ctx, x, y, 0, len * 0.35, [[0, rgba(color, a)], [1, rgba(color, 0)]])
  ctx.fillRect(x - len, y - len, len * 2, len * 2)
  ctx.restore()
}

const TONES = {
  cyan: { rim: '#bfeaff', glow: '#3aa8e6', sun: '#ffe9c4', warm: '#ffb866' },
  ember: { rim: '#ffd9a8', glow: '#ff6a1f', sun: '#fff0d2', warm: '#ff8a1c' },
  gold: { rim: '#fff1c0', glow: '#e8b64a', sun: '#fff6dc', warm: '#ffc43d' },
}
/** The Earth's limb: atmosphere, dark body, scattered rim light, city lights and a sunrise bloom. cy = y of the horizon crest. */
export function drawHorizon(ctx, w, h, { cy, R = w * 2.3, tone = 'cyan', sunX = 0.5, sun = true, lights = true, seed = 7, strength = 1 } = {}) {
  const T = TONES[tone] || TONES.cyan
  const cx = w / 2, cc = cy + R
  ctx.save()
  // atmosphere on an offscreen so it can fade away from the sun
  const aH = 460, off = mk(w, aH), g = off.getContext('2d')
  g.fillStyle = rad(g, cx, aH - 60 + R, R - 2, R + 380, [
    [0, rgba(T.rim, 0.95 * strength)], [0.014, rgba(T.rim, 0.55 * strength)], [0.05, rgba(T.glow, 0.3 * strength)],
    [0.16, rgba(T.glow, 0.1 * strength)], [0.5, rgba(T.glow, 0.025 * strength)], [1, rgba(T.glow, 0)],
  ])
  g.fillRect(0, 0, w, aH)
  g.globalCompositeOperation = 'destination-in'
  g.fillStyle = lin(g, 0, 0, w, 0, [[0, 'rgba(0,0,0,.35)'], [clamp(sunX, 0.1, 0.9), '#000'], [1, 'rgba(0,0,0,.35)']])
  g.fillRect(0, 0, w, aH)
  ctx.drawImage(off, 0, cy - (aH - 60))
  // planet body
  ctx.beginPath(); ctx.arc(cx, cc, R, 0, TAU)
  ctx.fillStyle = rad(ctx, cx, cc, R - 260, R, [[0, '#02030a'], [0.55, '#03050d'], [0.92, rgba(T.glow, 0.07)], [1, rgba(T.glow, 0.34)]])
  ctx.fill()
  // thin bright rim on the body, brightest under the sun
  ctx.beginPath(); ctx.arc(cx, cc, R - 1.5, Math.PI * 1.25, Math.PI * 1.75)
  ctx.lineWidth = 3; ctx.strokeStyle = lin(ctx, 0, 0, w, 0, [[0, rgba(T.rim, 0)], [clamp(sunX, 0.1, 0.9), rgba(T.rim, 0.95 * strength)], [1, rgba(T.rim, 0)]])
  ctx.stroke()
  if (lights) {
    const r = mulberry32(seed + 99), clusters = Array.from({ length: 6 }, () => [w * (0.08 + r() * 0.84), 14 + r() * 150, 40 + r() * 120])
    for (let i = 0; i < 360; i++) {
      const [px, py, sp] = clusters[(r() * clusters.length) | 0]
      const x = px + (r() - 0.5) * sp * 2.4, depth = py + (r() - 0.5) * sp * 0.9
      const lim = cc - Math.sqrt(Math.max(0, R * R - (x - cx) ** 2))
      const y = lim + Math.abs(depth) + 6
      ctx.fillStyle = rgba(r() > 0.3 ? '#ffcf7a' : '#ffe9b8', (0.12 + r() * 0.5) * Math.max(0.2, 1 - (y - lim) / 260))
      ctx.fillRect(x, y, 1.6, 1.6)
    }
  }
  if (sun) {
    const sx = sunX * w, sy = cy + 10
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, cy + 70); ctx.clip(); ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = rad(ctx, sx, sy, 0, 760, [[0, rgba(T.sun, 0.9 * strength)], [0.05, rgba(T.warm, 0.5 * strength)], [0.22, rgba(T.glow, 0.17 * strength)], [1, rgba(T.glow, 0)]])
    ctx.fillRect(0, 0, w, cy + 70)
    ctx.translate(sx, sy); ctx.scale(1, 0.03)
    ctx.fillStyle = rad(ctx, 0, 0, 0, w * 0.85, [[0, rgba(T.sun, 0.8 * strength)], [0.3, rgba(T.warm, 0.22 * strength)], [1, rgba(T.warm, 0)]])
    ctx.fillRect(-w, -w, w * 2, w * 2)
    ctx.restore()
  }
  ctx.restore()
}

let grainTile = null
/** Anti-banding grain: a tiny tile of symmetric black/white noise laid over the whole image at very low alpha. */
export function drawGrain(ctx, w, h, { alpha = 0.045, seed = 5 } = {}) {
  if (!grainTile) {
    const t = mk(160, 160), g = t.getContext('2d'), im = g.createImageData(160, 160), r = mulberry32(seed)
    for (let i = 0; i < im.data.length; i += 4) { const v = r() < 0.5 ? 255 : 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255 * (0.35 + r() * 0.65) }
    g.putImageData(im, 0, 0); grainTile = t
  }
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = ctx.createPattern(grainTile, 'repeat'); ctx.fillRect(0, 0, w, h); ctx.restore()
}
export const drawNoise = drawGrain

/** Pointy-top hex lattice, one stroke. mask(g) → a fillStyle (alpha ramp) applied on an offscreen to fade it. */
export function drawHexLattice(ctx, x, y, w, h, { size = 46, color = 'rgba(176,194,232,.14)', lw = 1.2, mask } = {}) {
  const c = mk(w, h), g = c.getContext('2d'), sq = Math.sqrt(3) * size
  g.strokeStyle = color; g.lineWidth = lw; g.beginPath()
  for (let row = -1; row * size * 1.5 < h + size * 2; row++) {
    for (let col = -1; col * sq < w + sq; col++) {
      const cx = col * sq + (row & 1 ? sq / 2 : 0), cy = row * size * 1.5
      for (let i = 0; i < 6; i++) {
        const a = (TAU / 6) * i - Math.PI / 6, px = cx + Math.cos(a) * size, py = cy + Math.sin(a) * size
        i ? g.lineTo(px, py) : g.moveTo(px, py)
      }
      g.closePath()
    }
  }
  g.stroke()
  if (mask) { g.globalCompositeOperation = 'destination-in'; g.fillStyle = mask(g, w, h); g.fillRect(0, 0, w, h) }
  ctx.drawImage(c, x, y)
}

let weaveTiles = {}
/** Plain-weave carbon fibre: alternating lit warp/weft cells. */
export function drawCarbonWeave(ctx, x, y, w, h, { cell = 7, base = '#0a0c12', hi = 'rgba(120,140,190,.2)' } = {}) {
  const key = cell + base + hi
  if (!weaveTiles[key]) {
    const s = cell * 2, t = mk(s, s), g = t.getContext('2d')
    g.fillStyle = base; g.fillRect(0, 0, s, s)
    const cellDraw = (cx, cy, vertical) => {
      g.fillStyle = vertical
        ? lin(g, cx, 0, cx + cell, 0, [[0, 'rgba(0,0,0,.6)'], [0.45, hi], [1, 'rgba(0,0,0,.55)']])
        : lin(g, 0, cy, 0, cy + cell, [[0, 'rgba(0,0,0,.6)'], [0.45, hi], [1, 'rgba(0,0,0,.55)']])
      g.fillRect(cx, cy, cell, cell)
    }
    cellDraw(0, 0, true); cellDraw(cell, cell, true); cellDraw(cell, 0, false); cellDraw(0, cell, false)
    weaveTiles[key] = t
  }
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = ctx.createPattern(weaveTiles[key], 'repeat'); ctx.fillRect(0, 0, w, h); ctx.restore()
}

/** A seeded vertical-gradient space ground (+ optional nebula, stars, limb) — the common stage for dark templates. */
export function deepSpace(ctx, w, h, { seed = 1, limb, nebula = 'tele', density = 1, glints = 3, top = '#03040a', mid = '#070b18', bot = '#0a1226' } = {}) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, top], [0.55, mid], [1, bot]]); ctx.fillRect(0, 0, w, h)
  const r = mulberry32(seed + 3)
  if (nebula) {
    const c = nebula === 'ember' ? '#ff6a1f' : nebula === 'gold' ? '#e8b64a' : '#2b8fc2'
    for (let i = 0; i < 3; i++) {
      const x = w * (0.1 + r() * 0.8), y = h * (0.08 + r() * 0.5), rr2 = w * (0.5 + r() * 0.5)
      ctx.fillStyle = rad(ctx, x, y, 0, rr2, [[0, rgba(c, 0.1)], [1, rgba(c, 0)]]); ctx.fillRect(0, 0, w, h)
    }
  }
  drawStarfield(ctx, w, h, { seed, density, glints, y1: limb ? limb.cy : h })
  if (limb) drawHorizon(ctx, w, h, { seed, ...limb })
  ctx.fillStyle = rad(ctx, w / 2, h / 2, Math.min(w, h) * 0.45, Math.hypot(w, h) * 0.62, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.5)']]); ctx.fillRect(0, 0, w, h)
}

/* ───────────────────────────── furniture ───────────────────────────── */
/** Mission-control strip: tracked mono labels over a ruler of tick marks. Returns the y beneath it. */
export function hud(ctx, f, P, { left, right, tone = 'dark' } = {}) {
  const ink = tone === 'light' ? PAPER.ink2 : P.ink2, line = tone === 'light' ? PAPER.rule : 'rgba(176,194,232,.22)'
  const y = f.hudY
  if (left) text(ctx, left, f.x, y + 22, { family: F.mono, size: 21, ls: 3, fill: ink, upper: true })
  if (right) {
    const sz = fitLine(ctx, right, f.cw - (left ? textWidth(ctx, left, { family: F.mono, size: 21, ls: 3 }) + 40 : 0), { family: F.mono, size: 21, ls: 3, min: 14, upper: true })
    text(ctx, right, f.right, y + 22, { family: F.mono, size: sz, ls: 3, fill: ink, align: 'right', upper: true })
  }
  ctx.save(); ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.beginPath()
  const ry = y + 44
  ctx.moveTo(f.x, ry + 0.5); ctx.lineTo(f.right, ry + 0.5)
  for (let i = 0, x = f.x; x <= f.right + 0.1; i++, x += 12) { ctx.moveTo(x, ry); ctx.lineTo(x, ry + (i % 5 ? 7 : 14)) }
  ctx.stroke(); ctx.restore()
  return ry + 14
}

export function footerUrl(url) {
  const u = url || SITE
  try { const p = new URL(u); return (p.host + (p.pathname === '/' ? '' : p.pathname)).replace(/^www\./, '') } catch { return String(u).replace(/^https?:\/\//, '').replace(/\/$/, '') }
}
/** Shared footer: hairline + KIND mark + "KIND · Raising goDs. Building nations." + the app address. Returns its top y. */
export async function footer(ctx, f, P, H, { tone = 'dark', align = 'left', url } = {}) {
  const light = tone === 'light'
  const y0 = f.footTop, ink = light ? PAPER.ink : P.ink, sub = light ? PAPER.ink3 : P.ink3
  ctx.save()
  ctx.strokeStyle = light ? PAPER.rule : 'rgba(176,194,232,.2)'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(f.x, y0 + 0.5); ctx.lineTo(f.right, y0 + 0.5); ctx.stroke()
  ctx.fillStyle = light ? PAPER.gold2 : P.gold2; ctx.fillRect(f.x, y0 - 1, 56, 3.5)
  const tag = 'KIND · Raising goDs. Building nations.', addr = footerUrl(url || H.url)
  const o1 = { family: F.disp, weight: 600, size: 34, ls: 1.4 }, o2 = { family: F.mono, weight: 400, size: 21, ls: 2.4 }
  const tw = Math.max(textWidth(ctx, tag, o1), textWidth(ctx, addr, o2)), mh = 60, mw = mh * 0.9, gap = 22
  const gw = mw + gap + tw
  const x0 = align === 'center' ? f.cx - gw / 2 : f.x, my = y0 + 26
  await H.svg(ctx, H.el(H.art.Mark, { size: mh, variant: light ? 'mono' : 'badge' }), x0, my, mw, mh, { ax: 0, ay: 0.5, color: light ? PAPER.ink : undefined })
  text(ctx, tag, x0 + mw + gap, my + 26, { ...o1, fill: ink })
  text(ctx, addr, x0 + mw + gap, my + 56, { ...o2, fill: sub })
  ctx.restore()
  return y0
}

/** A ring of ticks around (cx, cy); `lit` of `count` are bright. */
export function tickRing(ctx, cx, cy, r, { count = 60, len = 14, major = 5, majorLen = 26, lw = 3, color = 'rgba(176,194,232,.28)', litColor, lit = 0, start = -Math.PI / 2 } = {}) {
  ctx.save(); ctx.lineCap = 'round'
  for (let i = 0; i < count; i++) {
    const a = start + (i / count) * TAU, L = major && i % major === 0 ? majorLen : len
    ctx.strokeStyle = i < lit ? litColor || color : color; ctx.lineWidth = lw
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - L), cy + Math.sin(a) * (r - L)); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke()
  }
  ctx.restore()
}

/** Chamfered plate with optional fill / stroke / drop shadow. */
export function plate(ctx, x, y, w, h, { cut = 28, fill, stroke, lw = 2, shadow } = {}) {
  ctx.save()
  chamfer(ctx, x, y, w, h, cut)
  if (shadow) { ctx.shadowColor = shadow.color; ctx.shadowBlur = shadow.blur; ctx.shadowOffsetY = shadow.y || 0 }
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  ctx.shadowColor = 'transparent'
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke() }
  ctx.restore()
}

export const FLAME_PATH = 'M12 1.6C12 1.6 5 8.2 5 14.4a7 7 0 0 0 14 0c0-3-1.6-5-3.2-6.6.1 2.2-1 3.7-2.4 4.2C14.4 8 13 4.6 12 1.6z'
export const SHIELD_PATH = 'M12 2 20 5v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z'
/** Draw a 24-grid Path2D glyph centred at (cx, cy) at `size` px. */
export function glyph(ctx, d, cx, cy, size, { fill, stroke, lw = 1.75 } = {}) {
  ctx.save(); ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(size / 24, size / 24)
  const p = new Path2D(d)
  if (fill) { ctx.fillStyle = fill; ctx.fill(p) }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(p) }
  ctx.restore()
}

/** Diagonal hot-foil sheen over a path (call after the art): colour-dodge band + sparkles. */
export function foilSheen(ctx, clip, x, y, w, h, { angle = 0.55, seed = 3, strength = 1, sparkles = 7 } = {}) {
  ctx.save(); clip(); ctx.clip()
  const d = Math.hypot(w, h) / 2, cx = x + w / 2, cy = y + h / 2, ca = Math.cos(angle), sa = Math.sin(angle)
  ctx.globalCompositeOperation = 'soft-light'
  ctx.fillStyle = lin(ctx, cx - ca * d, cy - sa * d, cx + ca * d, cy + sa * d, [[0, 'rgba(255,255,255,0)'], [0.32, 'rgba(255,214,120,.55)'], [0.46, 'rgba(255,255,255,.95)'], [0.58, 'rgba(255,190,120,.6)'], [0.8, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']])
  ctx.globalAlpha = strength; ctx.fillRect(x, y, w, h)
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22 * strength
  ctx.fillStyle = lin(ctx, cx - ca * d, cy - sa * d, cx + ca * d, cy + sa * d, [[0, 'rgba(255,255,255,0)'], [0.44, 'rgba(255,236,170,.5)'], [0.5, 'rgba(255,255,255,.9)'], [0.56, 'rgba(255,236,170,.4)'], [1, 'rgba(255,255,255,0)']])
  ctx.fillRect(x, y, w, h)
  ctx.restore()
  const r = mulberry32(seed)
  for (let i = 0; i < sparkles; i++) sparkle(ctx, x + r() * w, y + r() * h, 10 + r() * 20, '#fff2c8', 0.55 * strength)
}

/* ───────────────────────────── SVG art → canvas ───────────────────────────── */
let _srv = null, _artMod = null, _react = null, _fontCss = null
const _imgCache = new Map()
const loadServer = async () => (_srv ||= (await import('react-dom/server')).renderToStaticMarkup)
const loadArt = async () => (_artMod ||= await import('../art/index.js'))
const loadReact = async () => (_react ||= await import('react'))

async function b64(url) {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000))
  return btoa(s)
}
async function fontCss() {
  if (_fontCss != null) return _fontCss
  try {
    const faces = await Promise.all([[500, b500], [600, b600], [700, b700]].map(async ([wt, u]) => `@font-face{font-family:'Barlow Condensed';font-weight:${wt};src:url(data:font/woff2;base64,${await b64(u)}) format('woff2')}`))
    _fontCss = faces.join('') + ".art-rk__txt{font-family:'Barlow Condensed';font-weight:700;text-transform:uppercase}.art-rk__txt--big{font-weight:600}"
  } catch { _fontCss = '' }
  return _fontCss
}
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('svg image failed to load')); i.src = src })

/**
 * Draw a React art element (<Rocket/>, <MissionPatch/>, …) into the box x, y, w, h (contain-fit).
 * o: { ax, ay (0..1 alignment inside the box, default centre), viewBox:[x,y,w,h] (override — e.g. to let a plume spill),
 *      color (replaces currentColor), alpha, rotate (rad, about the box centre) }
 * Returns the rect actually painted { x, y, w, h } or null on failure (a failed art never kills a render).
 */
export async function drawSvgArt(ctx, element, x, y, w, h, o = {}) {
  try {
    const render = await loadServer()
    let m = render(element)
    const i = m.indexOf('<svg'), j = m.lastIndexOf('</svg>')
    if (i < 0 || j < 0) return null
    m = m.slice(i, j + 6)
    const tagEnd = m.indexOf('>') + 1
    let tag = m.slice(0, tagEnd)
    const body = m.slice(tagEnd)
    let vb = o.viewBox
    if (!vb) { const mm = /viewBox="([^"]+)"/.exec(tag); vb = mm ? mm[1].split(/[\s,]+/).map(Number) : [0, 0, +(/width="([\d.]+)"/.exec(tag) || [0, 100])[1], +(/height="([\d.]+)"/.exec(tag) || [0, 100])[1]] }
    const k = Math.min(w / vb[2], h / vb[3]), dw = Math.max(1, Math.round(vb[2] * k)), dh = Math.max(1, Math.round(vb[3] * k))
    tag = tag.replace(/\s(width|height|viewBox|xmlns|xmlns:xlink)="[^"]*"/g, '').replace(/^<svg/, `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${vb.join(' ')}" width="${dw}" height="${dh}"`)
    let svg = tag + (body.includes('<text') ? `<style>${await fontCss()}</style>` : '') + body
    if (o.color) svg = svg.replaceAll('currentColor', o.color).replace('<svg ', `<svg color="${o.color}" `)
    let img = _imgCache.get(svg)
    if (!img) {
      img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))
      if (_imgCache.size > 48) _imgCache.delete(_imgCache.keys().next().value)
      _imgCache.set(svg, img)
    }
    const px = x + (w - dw) * (o.ax ?? 0.5), py = y + (h - dh) * (o.ay ?? 0.5)
    ctx.save()
    if (o.alpha != null) ctx.globalAlpha *= o.alpha
    if (o.rotate) { ctx.translate(px + dw / 2, py + dh / 2); ctx.rotate(o.rotate); ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh) } else ctx.drawImage(img, px, py, dw, dh)
    ctx.restore()
    return { x: px, y: py, w: dw, h: dh }
  } catch (e) {
    console.warn('[shareCanvas] art failed', e)
    return null
  }
}

/* ───────────────────────────── fonts ───────────────────────────── */
const SAMPLE = 'AaGg0123“”’—·ẹọṣń'
let _fontsReady = null
export function ensureFonts() {
  if (_fontsReady) return _fontsReady
  const faces = [
    '500 64px "Barlow Condensed"', '600 64px "Barlow Condensed"', '700 64px "Barlow Condensed"',
    '400 64px "Newsreader Variable"', 'italic 400 64px "Newsreader Variable"', '500 64px "Newsreader Variable"',
    '400 32px "Inter Variable"', '600 32px "Inter Variable"', '400 22px "JetBrains Mono Variable"', '500 22px "JetBrains Mono Variable"',
  ]
  _fontsReady = Promise.all(faces.map((f) => document.fonts.load(f, SAMPLE).catch(() => null))).then(() => document.fonts.ready).then(() => true)
  return _fontsReady
}

/* ───────────────────────────── entry ───────────────────────────── */
export async function renderShare({ kind, data, template, aspect = 'story', series } = {}) {
  const mod = KINDS[kind]
  if (data && typeof data === 'object') {                                  // one composed form per string; pick the serif that can set the marks
    data = { ...data }
    for (const k of ['text', 'line', 'title', 'declaration', 'ref']) if (typeof data[k] === 'string') data[k] = data[k].normalize('NFC')
    F.serif = /[̣Ẹ-ọṢṣ]/.test(`${data.text || ''}${data.line || ''}${data.declaration || ''}`.normalize('NFD')) ? SERIF_YO : SERIF
  }
  if (!mod) throw new Error(`renderShare: unknown kind "${kind}"`)
  const asp = typeof aspect === 'object' && aspect ? aspect : ASPECTS.find((a) => a.id === aspect) || ASPECTS[0]
  const tpl = mod.templates.find((t) => t.id === template) || mod.templates[0]
  const [art, React] = await Promise.all([loadArt(), loadReact(), ensureFonts(), loadServer()])
  let ser = series
  if (typeof series === 'string') { try { ser = (await import('../lib.js')).getSeries?.(series) } catch { ser = null } }
  const canvas = mk(asp.w, asp.h), ctx = canvas.getContext('2d')
  ctx.fontKerning = 'normal'; ctx.textRendering = 'optimizeLegibility'
  const P = readPalette()
  const H = { P, F, PAPER, art, el: React.createElement, svg: drawSvgArt, url: data?.url, BIBLE_VERSION, template: tpl.id, aspect: asp,
    frame, clamp, lerp, rgba, mix, hexRgb, mulberry32, hash: hashStr, mk, grad, lin, rad, rr, chamfer, hexPath, plate, glyph, FLAME_PATH, SHIELD_PATH,
    setFont, measure, text, textWidth, fitLine, breakLines, fitText, drawTextLines, fillTextLS,
    drawStarfield, sparkle, drawHorizon, drawGrain, drawNoise, drawHexLattice, drawCarbonWeave, deepSpace, foilSheen, tickRing,
  }
  H.hud = (c, f, o) => hud(c, f, P, o)
  H.footer = (c, f, o) => footer(c, f, P, H, o)
  const fr = frame(asp.w, asp.h)
  await tpl.draw(ctx, asp.w, asp.h, data || {}, ser || null, H, fr)
  return canvas
}
export default renderShare
