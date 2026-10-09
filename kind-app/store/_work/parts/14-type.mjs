// ───────────────────────────────────────────────────────────────────────────
// 4 · typography — Barlow Condensed → outlines (no font at render time)
// ───────────────────────────────────────────────────────────────────────────
const FONT_DIR = join(ROOT, 'node_modules/@fontsource/barlow-condensed/files')
const _fonts = {}
function font(weight = 700) {
  if (!_fonts[weight]) {
    const b = readFileSync(join(FONT_DIR, `barlow-condensed-latin-${weight}-normal.woff`))
    _fonts[weight] = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
  }
  return _fonts[weight]
}
const CAP = 700 // Barlow Condensed cap height (units of 1000)
function flatten(path, steps = 10) {
  const polys = []; let cur = null, px = 0, py = 0
  for (const c of path.commands) {
    if (c.type === 'M') { cur = [[c.x, c.y]]; polys.push(cur); px = c.x; py = c.y }
    else if (c.type === 'L') { cur.push([c.x, c.y]); px = c.x; py = c.y }
    else if (c.type === 'Q') { for (let i = 1; i <= steps; i++) { const t = i / steps, u = 1 - t; cur.push([u * u * px + 2 * u * t * c.x1 + t * t * c.x, u * u * py + 2 * u * t * c.y1 + t * t * c.y]) } px = c.x; py = c.y }
    else if (c.type === 'C') { for (let i = 1; i <= steps; i++) { const t = i / steps, u = 1 - t; cur.push([u * u * u * px + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x, u * u * u * py + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y]) } px = c.x; py = c.y }
  }
  return polys
}
// right / left ink extent of a glyph at each sample row (font units, y up)
function profile(glyph, rows) {
  const polys = flatten(glyph.getPath(0, 0, 1000)).map((poly) => poly.map(([x, y]) => [x, -y])) // y up
  const L = rows.map(() => Infinity), R = rows.map(() => -Infinity)
  for (const poly of polys) for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]
    rows.forEach((y, k) => {
      if ((y1 <= y && y2 >= y) || (y2 <= y && y1 >= y)) {
        const x = y1 === y2 ? Math.max(x1, x2) : x1 + ((y - y1) * (x2 - x1)) / (y2 - y1)
        if (y1 === y2) { L[k] = Math.min(L[k], x1, x2); R[k] = Math.max(R[k], x1, x2) } else { L[k] = Math.min(L[k], x); R[k] = Math.max(R[k], x) }
      }
    })
  }
  return { L, R }
}
// Optical kerning: space every pair so the *clamped mean gap* between outlines equals `target` — an open mouth (K) is only
// partly credited, straight-to-straight pairs get exactly the target.  Returns extra advance per pair, in font units.
function opticalPairs(fnt, text, { target = 190, clamp = 260, lo = 20, hi = 680 } = {}) {
  const rows = []; for (let y = lo; y <= hi; y += 10) rows.push(y)
  const prof = [...text].map((ch) => profile(fnt.charToGlyph(ch), rows))
  const out = []
  for (let i = 0; i < text.length - 1; i++) {
    const a = fnt.charToGlyph(text[i]), A = prof[i], B = prof[i + 1]
    const mean = (d) => rows.reduce((s, _, k) => s + Math.min(clamp, B.L[k] + a.advanceWidth + d - A.R[k]), 0) / rows.length
    let d0 = -400, d1 = 600
    for (let it = 0; it < 40; it++) { const m = (d0 + d1) / 2; if (mean(m) < target) d0 = m; else d1 = m }
    out.push((d0 + d1) / 2)
  }
  return out
}
// own path writer: opentype's toPathData() can emit NaN for some glyph/offset combinations, so we never use it
function cmdsToD(cmds, dx = 0, dy = 0, dec = 2) {
  const r = (v) => String(Math.round(v * 10 ** dec) / 10 ** dec)
  return cmds.map((c) => c.type === 'Z' ? 'Z' : c.type === 'M' || c.type === 'L' ? c.type + r(c.x + dx) + ' ' + r(c.y + dy) : c.type === 'Q' ? 'Q' + r(c.x1 + dx) + ' ' + r(c.y1 + dy) + ' ' + r(c.x + dx) + ' ' + r(c.y + dy) : 'C' + r(c.x1 + dx) + ' ' + r(c.y1 + dy) + ' ' + r(c.x2 + dx) + ' ' + r(c.y2 + dy) + ' ' + r(c.x + dx) + ' ' + r(c.y + dy)).join('')
}
const kernOf = (fnt, a, b) => { const v = fnt.getKerningValue(a, b); return Number.isFinite(v) ? v : 0 }
// text → path data.  size = font-size in px (so cap height = size*0.7).  y = baseline.  Returns ink-tight metrics.
function textOutline(text, { weight = 700, size = 100, tracking = 0, x = 0, y = 0, optical = null, kerning = true } = {}) {
  const fnt = font(weight), k = size / 1000
  const pairs = optical ? opticalPairs(fnt, text, optical) : null
  let pen = 0, d = '', minX = Infinity, maxX = -Infinity
  const glyphs = [], parts = []
  ;[...text].forEach((ch, i) => {
    const g = fnt.charToGlyph(ch)
    const gd = cmdsToD(g.getPath(0, 0, size).commands, x + pen * k, y)
    d += gd; parts.push(gd)
    const bb = g.getBoundingBox()
    if (g.path.commands.length) { minX = Math.min(minX, pen + bb.x1); maxX = Math.max(maxX, pen + bb.x2) }
    glyphs.push({ ch, x: pen * k, adv: g.advanceWidth * k })
    if (i < text.length - 1) {
      const nxt = fnt.charToGlyph(text[i + 1])
      pen += g.advanceWidth + (pairs ? pairs[i] - 0 : (kerning ? kernOf(fnt, g, nxt) : 0) + tracking * 1000)
      if (pairs) pen += tracking * 1000
    }
  })
  return { d, parts, x0: x + minX * k, x1: x + maxX * k, width: (maxX - minX) * k, glyphs, capH: CAP * k }
}
const shiftPath = (d, dx, dy, dec = 2) => d.replace(/([MLQCZ])([^MLQCZ]*)/g, (m, c, rest) => {
  if (c === 'Z') return 'Z'
  const n = (rest.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || []).map(Number)
  return c + n.map((v, i) => String(Math.round((v + (i % 2 ? dy : dx)) * 10 ** dec) / 10 ** dec)).join(' ')
})

// Wordmark: KIND, optically spaced, ink-tight, cap top at y=0, baseline y=700 (1 unit = 1/1000 em).
const WORDMARK = (() => {
  const o = textOutline('KIND', { weight: 700, size: 1000, y: CAP, optical: { target: 196, clamp: 220 } })
  return { d: shiftPath(o.d, -o.x0, 0), w: Math.round(o.width), h: CAP }
})()


// Absolute M/L/Q/C/Z → relative m/l/q/c/z on a rounded grid, minimal separators (≈ 55 % smaller; no drift: deltas are taken between rounded points).
function compactPath(d, dec = 0) {
  const q = (v) => Math.round(v * 10 ** dec) / 10 ** dec
  const num = (v) => { let s = String(v); if (s.startsWith('0.')) s = s.slice(1); else if (s.startsWith('-0.')) s = '-' + s.slice(2); return s }
  const pack = (arr) => arr.map(num).reduce((a, s, i) => a + (i && !s.startsWith('-') ? ' ' : '') + s, '')
  let cx = 0, cy = 0, sx = 0, sy = 0, out = ''
  for (const m of d.matchAll(/([MLQCZ])([^MLQCZ]*)/g)) {
    const c = m[1], n = (m[2].match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || []).map(Number)
    if (c === 'Z') { out += 'z'; cx = sx; cy = sy; continue }
    const abs = []
    for (let i = 0; i < n.length; i += 2) abs.push([q(n[i]), q(n[i + 1])])
    const rel = abs.flatMap(([x, y]) => [q(x - cx), q(y - cy)])
    out += c.toLowerCase() + pack(rel)
    const [ex, ey] = abs[abs.length - 1]
    cx = ex; cy = ey
    if (c === 'M') { sx = ex; sy = ey }
  }
  return out
}
