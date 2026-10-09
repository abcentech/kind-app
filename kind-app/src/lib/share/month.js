// Month share templates — the mission report. data: { seriesTitle, declaration, themeScripture, done, total, pct, complete,
// patches:[{stage,earned,name}], xp, rank, lessons, cards }. Earned patches are in colour, the rest sit greyscale.
const TAU = Math.PI * 2

const pctOf = (d) => Math.round(100 * (d.pct ?? (d.total ? d.done / d.total : 0)))
const stats = (d) => [
  { v: `${d.done ?? 0}/${d.total ?? 31}`, k: 'Days' },
  { v: Number(d.xp || 0).toLocaleString('en-US'), k: 'XP' },
  { v: d.rank?.name || '—', k: 'Rank' },
  { v: String(d.cards ?? d.lessons ?? 0), k: d.cards != null ? 'Cards' : 'Lessons' },
]
const status = (d) => (d.complete ? 'Mission complete' : `${pctOf(d)}% complete`)
const monthLabel = (s) => [s?.month, s?.year].filter(Boolean).join(' ')

/** Title block: mono eyebrow, big Barlow title, status chip. Returns the y beneath. */
function header(ctx, H, d, series, x, y, w, { align = 'left', tone = 'dark', size = 112 } = {}) {
  const { P, F, PAPER } = H, light = tone === 'light', ax = align === 'center' ? x + w / 2 : x
  const gold = light ? PAPER.gold : H.lin(ctx, x, 0, x + w, 0, [[0, P.gold1], [1, P.gold2]])
  H.text(ctx, `Mission report${monthLabel(series) ? ' · ' + monthLabel(series) : ''}`, ax, y + 20, { family: F.mono, size: 21, ls: 4, fill: light ? PAPER.ink3 : P.ink3, align, upper: true })
  const title = String(d.seriesTitle || series?.title || '').toUpperCase()
  const fit = H.fitText(ctx, title, { w, h: size * 2.1, family: F.disp, weight: 700, min: 40, max: size, lh: 0.95, ls: 2 })
  const end = H.drawTextLines(ctx, fit.lines, ax, y + 44, { size: fit.size, lh: fit.lh, align, ls: 2, family: F.disp, weight: 700, fill: light ? PAPER.ink : P.ink })
  const sy = end + 16
  H.text(ctx, status(d), ax, sy + 30, { family: F.disp, weight: 600, size: 36, ls: 7, fill: d.complete ? gold : light ? PAPER.ink2 : P.ink2, align, upper: true })
  return sy + 52
}

/** Four numerals over hairline-separated mono labels. */
function statsRow(ctx, H, d, x, y, w, { tone = 'dark' } = {}) {
  const { P, F, PAPER } = H, light = tone === 'light', items = stats(d), cw = w / items.length
  ctx.fillStyle = light ? PAPER.rule : 'rgba(176,194,232,.2)'; ctx.fillRect(x, y, w, 1.5)
  items.forEach((it, i) => {
    const cx = x + cw * (i + 0.5), sz = H.fitLine(ctx, it.v, cw - 24, { family: F.disp, weight: 700, size: 70, min: 28 })
    if (i) ctx.fillRect(x + cw * i, y + 22, 1.5, 100)
    H.text(ctx, it.v, cx, y + 40 + sz * 0.8, { family: F.disp, weight: 700, size: sz, fill: light ? PAPER.ink : P.ink, align: 'center' })
    H.text(ctx, it.k, cx, y + 40 + 70 * 0.8 + 38, { family: F.mono, size: 19, ls: 4, fill: light ? PAPER.ink3 : P.ink3, align: 'center', upper: true })
  })
  return y + 150
}

/** Patches in a grid inside a box; earned in colour, locked greyscale; names beneath. */
async function patchGrid(ctx, H, d, series, bx, by, bw, bh, { cols, tone = 'dark', label = true } = {}) {
  const { P, F, PAPER } = H, light = tone === 'light', ps = d.patches?.length ? d.patches : (series?.weeks || []).slice(0, 4).map((_, i) => ({ stage: i, earned: false }))
  const n = ps.length, c = cols || (n <= 4 ? (bw / bh > 1.6 ? n : 2) : 3), rows = Math.ceil(n / c)
  const cw = bw / c, ch = bh / rows, cap = label ? 56 : 0, size = Math.max(60, Math.min(cw * 0.9, ch - cap))
  for (let i = 0; i < n; i++) {
    const p = ps[i], col = i % c, row = (i / c) | 0, inRow = row === rows - 1 ? n - row * c : c
    const cx = bx + (bw - inRow * cw) / 2 + (i - row * c + 0.5) * cw, top = by + row * ch + (ch - size - cap) / 2
    if (p.earned) { ctx.save(); ctx.fillStyle = H.rad(ctx, cx, top + size / 2, size * 0.3, size * 0.8, [[0, H.rgba(P.stages[p.stage % 5], 0.22)], [1, H.rgba(P.stages[p.stage % 5], 0)]]); ctx.fillRect(cx - size, top - size * 0.4, size * 2, size * 1.8); ctx.restore() }
    await H.svg(ctx, H.el(H.art.MissionPatch, { series, stage: p.stage ?? i, state: p.earned ? 'earned' : 'locked', size: Math.round(size) }), cx - size / 2, top, size, size)
    if (label) H.text(ctx, p.name || `Stage ${i + 1}`, cx, top + size + 38, { family: F.mono, size: 19, ls: 3, fill: p.earned ? (light ? PAPER.ink2 : P.ink2) : light ? PAPER.ink3 : P.ink4, align: 'center', upper: true })
  }
}
const declText = (d) => (Array.isArray(d.declaration) ? d.declaration.join(' ') : String(d.declaration || '')).replace(/\s+/g, ' ').trim()
const declFit = (ctx, H, d, w, h, o = {}) => H.fitText(ctx, declText(d), { w, h, family: H.F.serif, style: 'italic', min: 22, max: 56, lh: 1.3, ...o })

/* ── Mission Patch: the patches are the hero. ── */
async function patches(ctx, w, h, d, series, H, f) {
  const { P } = H
  H.deepSpace(ctx, w, h, { seed: 31, nebula: 'gold', limb: { cy: f.footTop - 60, tone: d.complete ? 'gold' : 'cyan', sunX: 0.3, strength: 0.7 } })
  H.hud(ctx, f, { left: 'Mission report', right: monthLabel(series) })
  const hy = header(ctx, H, d, series, f.x, f.bodyTop + 6, f.cw, { size: f.wide ? 84 : 112 })
  const sy = f.footTop - 36 - 150
  await patchGrid(ctx, H, d, series, f.x, hy + 10, f.cw, sy - hy - 24)
  statsRow(ctx, H, d, f.x, sy, f.cw)
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h)
}

/* ── Manifest: a flight manifest — one row per stage with a status lamp. ── */
async function manifest(ctx, w, h, d, series, H, f) {
  const { P, F } = H
  H.drawCarbonWeave(ctx, 0, 0, w, h, { cell: 7 })
  ctx.fillStyle = H.rad(ctx, w / 2, h / 2, Math.min(w, h) * 0.3, Math.hypot(w, h) * 0.6, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.72)']]); ctx.fillRect(0, 0, w, h)
  H.hud(ctx, f, { left: 'Flight manifest', right: monthLabel(series) })
  const hy = header(ctx, H, d, series, f.x, f.bodyTop + 6, f.cw, { size: f.wide ? 72 : 100 })
  const sy = f.footTop - 36 - 150, py = hy + 10, ph = sy - py - 24
  const gold = H.lin(ctx, f.x, py, f.right, py + ph, [[0, P.gold1], [0.45, P.gold2], [1, P.gold3]])
  H.plate(ctx, f.x, py, f.cw, ph, { cut: 40, fill: 'rgba(5,6,11,.88)', stroke: gold, lw: 2.5, shadow: { color: 'rgba(0,0,0,.6)', blur: 40, y: 18 } })
  const ps = d.patches || [], rh = Math.min(150, (ph - 40) / Math.max(1, ps.length))
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i], y = py + 20 + i * rh, cy = y + rh / 2, ps2 = Math.min(rh - 20, 120)
    if (i) { ctx.fillStyle = 'rgba(176,194,232,.14)'; ctx.fillRect(f.x + 40, y, f.cw - 80, 1.5) }
    await H.svg(ctx, H.el(H.art.MissionPatch, { series, stage: p.stage ?? i, state: p.earned ? 'earned' : 'locked', size: Math.round(ps2) }), f.x + 40, cy - ps2 / 2, ps2, ps2)
    const tx = f.x + 40 + ps2 + 30
    const tight = rh < 100
    if (!tight) H.text(ctx, `Stage ${String(i + 1).padStart(2, '0')}`, tx, cy - 8, { family: F.mono, size: 19, ls: 4, fill: P.ink3, upper: true })
    const nm = String(p.name || series?.weeks?.[i]?.f || '').toUpperCase(), ns = H.fitLine(ctx, nm, f.right - 150 - tx, { family: F.disp, weight: 700, size: 46, ls: 3, min: 24 })
    H.text(ctx, nm, tx, tight ? cy + ns * 0.3 : cy + 36, { family: F.disp, weight: 700, size: ns, ls: 3, fill: p.earned ? P.ink : P.ink3 })
    const lx = f.right - 70
    ctx.beginPath(); ctx.arc(lx, cy, 12, 0, TAU); ctx.fillStyle = p.earned ? P.go : P.c4; ctx.shadowColor = p.earned ? H.rgba(P.go, 0.8) : 'transparent'; ctx.shadowBlur = 22; ctx.fill(); ctx.shadowBlur = 0
  }
  statsRow(ctx, H, d, f.x, sy, f.cw)
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h, { alpha: 0.03 })
}

/* ── Orbit: one tick per day around a big percentage. ── */
async function orbit(ctx, w, h, d, series, H, f) {
  const { P, F } = H, total = d.total || 31, done = d.done || 0
  H.deepSpace(ctx, w, h, { seed: 47, nebula: 'tele' })
  H.hud(ctx, f, { left: 'Mission report', right: monthLabel(series) })
  const small = f.wide, hy = header(ctx, H, d, series, f.x, f.bodyTop + 6, f.cw, { size: small ? 70 : 96, align: 'center' })
  const sy = f.footTop - 36 - 150, avail = sy - hy - 30
  const R = Math.min(f.cw / 2 - 10, avail * 0.5 - 4), cx = f.cx, cy = hy + 14 + R
  H.tickRing(ctx, cx, cy, R, { count: total, len: 26, major: 0, lw: Math.max(5, R / 42), color: 'rgba(176,194,232,.22)', litColor: d.complete ? P.gold2 : P.ignite2, lit: done })
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.8, 0, TAU); ctx.strokeStyle = 'rgba(176,194,232,.1)'; ctx.lineWidth = 2; ctx.stroke()
  const ns = R * 0.6, ny = cy - R * 0.1, pct = String(pctOf(d))
  H.text(ctx, pct, cx - R * 0.05, ny + ns * 0.3, { family: F.disp, weight: 700, size: ns, fill: H.lin(ctx, 0, ny - ns * 0.5, 0, ny + ns * 0.4, [[0, P.gold1], [0.5, P.gold2], [1, P.gold3]]), align: 'center' })
  const pw = H.textWidth(ctx, pct, { family: F.disp, weight: 700, size: ns })
  H.text(ctx, '%', cx - R * 0.05 + pw / 2 + 8, ny - ns * 0.05, { family: F.disp, weight: 600, size: ns * 0.32, fill: P.ink2 })
  H.text(ctx, `${done} of ${total} days`, cx, ny + ns * 0.3 + R * 0.14, { family: F.mono, size: Math.max(16, R * 0.06), ls: 4, fill: P.ink3, align: 'center', upper: true })
  const ps = d.patches || [], pr = Math.min(R * 0.17, 60)
  for (let i = 0; i < ps.length; i++) {
    const px = cx + (i - (ps.length - 1) / 2) * pr * 2.4, py = cy + R * 0.56
    await H.svg(ctx, H.el(H.art.MissionPatch, { series, stage: ps[i].stage ?? i, state: ps[i].earned ? 'earned' : 'locked', size: Math.round(pr * 2) }), px - pr, py - pr, pr * 2, pr * 2)
  }
  statsRow(ctx, H, d, f.x, sy, f.cw)
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h)
}

/* ── Declaration: the month's declaration set large, patches beneath. ── */
async function declaration(ctx, w, h, d, series, H, f) {
  const { P, F } = H
  ctx.fillStyle = H.lin(ctx, 0, 0, 0, h, [[0, P.c0], [1, P.c1]]); ctx.fillRect(0, 0, w, h)
  H.hud(ctx, f, { left: 'Declaration', right: f.wide ? status(d) : d.seriesTitle || series?.title || '' })
  const sy = f.footTop - 36 - 150, patchH = f.wide ? 150 : 210, top = f.bodyTop + 30, bot = sy - patchH - 50
  const fit = declFit(ctx, H, d, f.cw - 30, bot - top - 150, { max: f.wide ? 60 : 72 })
  const y0 = top + Math.max(0, (bot - top - fit.height) * 0.42)
  H.text(ctx, '“', f.x - 4, y0 + 140, { family: F.serif, style: 'italic', size: 200, fill: H.rgba(P.gold2, 0.9) })
  const yy = H.drawTextLines(ctx, fit.lines, f.x + 30, y0 + 60, { size: fit.size, lh: fit.lh, family: F.serif, style: 'italic', fill: P.ink })
  ctx.fillStyle = H.lin(ctx, 0, y0 + 60, 0, yy, [[0, P.gold1], [1, P.gold3]]); ctx.fillRect(f.x, y0 + 70, 5, Math.max(20, yy - y0 - 80))
  if (!f.wide) H.text(ctx, status(d), f.x + 30, yy + 52, { family: F.disp, weight: 600, size: 34, ls: 7, fill: d.complete ? H.lin(ctx, f.x, 0, f.x + 400, 0, [[0, P.gold1], [1, P.gold2]]) : P.ink2, upper: true })
  await patchGrid(ctx, H, d, series, f.x, sy - patchH - 20, f.cw, patchH, { cols: (d.patches || []).length || 4, label: false })
  statsRow(ctx, H, d, f.x, sy, f.cw)
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h, { alpha: 0.035 })
}

/* ── Paper: a printed report on warm stock. ── */
async function paper(ctx, w, h, d, series, H, f) {
  const { PAPER: Pp } = H
  ctx.fillStyle = H.lin(ctx, 0, 0, 0, h, [[0, Pp.bg], [1, Pp.bg2]]); ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = H.rad(ctx, w / 2, h * 0.45, Math.min(w, h) * 0.35, Math.hypot(w, h) * 0.62, [[0, 'rgba(120,90,40,0)'], [1, 'rgba(120,90,40,.16)']]); ctx.fillRect(0, 0, w, h)
  H.drawGrain(ctx, w, h, { alpha: 0.07, seed: 12 })
  H.hud(ctx, f, { left: 'Mission report', right: monthLabel(series), tone: 'light' })
  const hy = header(ctx, H, d, series, f.x, f.bodyTop + 6, f.cw, { tone: 'light', size: f.wide ? 84 : 112 })
  const sy = f.footTop - 36 - 150
  await patchGrid(ctx, H, d, series, f.x, hy + 10, f.cw, sy - hy - 24, { tone: 'light' })
  statsRow(ctx, H, d, f.x, sy, f.cw, { tone: 'light' })
  await H.footer(ctx, f, { tone: 'light' })
}

/* ── Constellation: patches strung along the trajectory. ── */
async function constellation(ctx, w, h, d, series, H, f) {
  const { P, F } = H
  H.deepSpace(ctx, w, h, { seed: 59, nebula: 'tele', density: 1.3, glints: 5 })
  H.hud(ctx, f, { left: 'Trajectory', right: monthLabel(series) })
  const hy = header(ctx, H, d, series, f.x, f.bodyTop + 6, f.cw, { size: f.wide ? 76 : 104 })
  const sy = f.footTop - 36 - 150, ps = d.patches || [], n = Math.max(1, ps.length), top = hy + 40, bot = sy - 60
  const size = Math.min(f.wide ? 150 : 230, (f.cw - 80) / (f.wide ? n : 2.2))
  const pts = ps.map((_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1)
    return f.wide ? [f.x + size / 2 + t * (f.cw - size), bot - 20 - size / 2 - Math.sin(t * Math.PI) * (bot - top - size) * 0.7] : [f.cx + (i % 2 ? 1 : -1) * f.cw * 0.22, bot - size / 2 - t * (bot - top - size)]
  })
  ctx.save(); ctx.lineCap = 'round'; ctx.setLineDash([2, 14]); ctx.lineWidth = 3
  for (let i = 1; i < pts.length; i++) {
    ctx.strokeStyle = ps[i].earned ? H.rgba(P.gold2, 0.8) : 'rgba(176,194,232,.25)'
    ctx.beginPath(); ctx.moveTo(...pts[i - 1]); ctx.bezierCurveTo(pts[i - 1][0], (pts[i - 1][1] + pts[i][1]) / 2, pts[i][0], (pts[i - 1][1] + pts[i][1]) / 2, ...pts[i]); ctx.stroke()
  }
  ctx.restore()
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i], p = ps[i]
    if (p.earned) { ctx.fillStyle = H.rad(ctx, x, y, size * 0.3, size * 0.85, [[0, H.rgba(P.stages[(p.stage ?? i) % 5], 0.3)], [1, H.rgba(P.stages[(p.stage ?? i) % 5], 0)]]); ctx.fillRect(x - size, y - size, size * 2, size * 2) }
    await H.svg(ctx, H.el(H.art.MissionPatch, { series, stage: p.stage ?? i, state: p.earned ? 'earned' : 'locked', size: Math.round(size) }), x - size / 2, y - size / 2, size, size)
    const side = f.wide ? 0 : i % 2 ? 1 : -1
    if (!f.wide) {
      const nm = String(p.name || '').toUpperCase(), lx = x + side * (size / 2 + 22), room = side > 0 ? f.right - lx : lx - f.x
      const sz = H.fitLine(ctx, nm, room, { family: F.disp, weight: 700, size: 36, ls: 4, min: 16 })
      H.text(ctx, nm, lx, y + 8, { family: F.disp, weight: 700, size: sz, ls: 4, fill: p.earned ? P.ink : P.ink3, align: side > 0 ? 'left' : 'right' })
    }
  }
  statsRow(ctx, H, d, f.x, sy, f.cw)
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h)
}

export const templates = [
  { id: 'patches', label: 'Patches', draw: patches },
  { id: 'manifest', label: 'Manifest', draw: manifest },
  { id: 'orbit', label: 'Orbit', draw: orbit },
  { id: 'declaration', label: 'Declaration', draw: declaration },
  { id: 'paper', label: 'Paper', draw: paper },
  { id: 'constellation', label: 'Constellation', draw: constellation },
]
export default function draw(ctx, w, h, data, series, H, f) {
  return (templates.find((t) => t.id === H.template) || templates[0]).draw(ctx, w, h, data, series, H, f)
}
