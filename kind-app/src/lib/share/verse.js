// Verse share templates — Scripture set like the cover of a book. data: { text, ref, title, day, seriesTitle }.
// Every template: async draw(ctx, w, h, data, series, H, f). Text is fitted (never clipped), so a one-line verse and
// Luke 16:10–13 both land well at every aspect.
const TAU = Math.PI * 2

function parse(d, H) {
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(d.ref || '')
  return {
    text: String(d.text || '').replace(/\s+/g, ' ').trim(),
    ref: (m ? m[1] : d.ref || '').trim(), ver: m ? m[2] : H.BIBLE_VERSION,
    day: d.day, series: d.seriesTitle || '',
  }
}
const eyebrow = (v) => (v.day ? `Day ${v.day}` : 'Today’s Word')

/** Reference line: a short rule, then REF in Barlow and the translation in mono, on one baseline. Returns the y beneath. */
function refBlock(ctx, H, v, x, y, { align = 'left', fill, ruleFill, verFill, size = 38 }) {
  const { F } = H
  const o1 = { family: F.disp, weight: 600, size, ls: 5, upper: true }, o2 = { family: F.mono, size: 21, ls: 3 }
  const w1 = H.textWidth(ctx, v.ref, o1), w2 = H.textWidth(ctx, v.ver, o2), gap = 22
  const total = w1 + gap + w2
  const x0 = align === 'center' ? x - total / 2 : x
  ctx.fillStyle = ruleFill; ctx.fillRect(align === 'center' ? x - 28 : x, y, 56, 4)
  const base = y + 4 + 22 + size * 0.8
  H.text(ctx, v.ref, x0, base, { ...o1, fill: typeof fill === 'function' ? fill(x0, w1) : fill })
  H.text(ctx, v.ver, x0 + w1 + gap, base, { ...o2, fill: verFill })
  return base + 14
}

/** The verse, fitted into a box with the reference beneath. bias 0 = top, 1 = bottom of the free space. */
function scripture(ctx, H, v, o) {
  const { x, y, w, h, align = 'left', color, family = H.F.serif, style = 'normal', weight = 400, lh = 1.32, bias = 0.42, min = 20, max, gap = 52, refH = 96, shadow } = o
  const fit = H.fitText(ctx, v.text, { w, h: h - refH - gap, family, weight, style, min, max: max ?? (w > 1000 ? 120 : 112), lh })
  const total = fit.height + gap + refH
  const y0 = y + Math.max(0, (h - total) * bias)
  H.drawTextLines(ctx, fit.lines, align === 'center' ? x + w / 2 : x, y0, { size: fit.size, lh: fit.lh, align, family, weight, style, fill: color, shadow })
  const by = refBlock(ctx, H, v, align === 'center' ? x + w / 2 : x, y0 + fit.height + gap, { align, ...o.ref })
  return { fit, top: y0, bottom: y0 + fit.height, end: by }
}
const goldFill = (ctx, H) => (x, w) => H.lin(ctx, x, 0, x + Math.max(w, 1), 0, [[0, H.P.gold1], [1, H.P.gold2]])

/* ── Ascent: the hero. Starfield, the Earth's limb, the Word. ── */
async function ascent(ctx, w, h, d, series, H, f) {
  const { P } = H, v = parse(d, H)
  H.deepSpace(ctx, w, h, { seed: H.hash(v.ref + v.text), limb: { cy: f.footTop - 70, tone: 'cyan', sunX: 0.8 }, glints: 4 })
  H.hud(ctx, f, { left: eyebrow(v), right: series?.title || v.series })
  scripture(ctx, H, v, {
    x: f.x, y: f.bodyTop + 24, w: f.cw, h: f.footTop - 120 - (f.bodyTop + 24), color: P.ink, bias: 0.4,
    ref: { fill: goldFill(ctx, H), ruleFill: P.gold2, verFill: P.ink3 },
  })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h)
}

/* ── Carbon: woven carbon, a chamfered plate, a gold rule. ── */
async function carbon(ctx, w, h, d, series, H, f) {
  const { P, F } = H, v = parse(d, H)
  H.drawCarbonWeave(ctx, 0, 0, w, h, { cell: 7 })
  ctx.fillStyle = H.rad(ctx, w / 2, h / 2, Math.min(w, h) * 0.3, Math.hypot(w, h) * 0.6, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.72)']]); ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = H.lin(ctx, 0, 0, w, h, [[0, 'rgba(150,170,220,0)'], [0.42, 'rgba(150,170,220,.1)'], [0.5, 'rgba(255,255,255,.07)'], [0.58, 'rgba(150,170,220,.08)'], [1, 'rgba(150,170,220,0)']]); ctx.fillRect(0, 0, w, h)
  const px = f.x, py = f.top, pw = f.cw, ph = f.footTop - 30 - f.top
  const gold = H.lin(ctx, px, py, px + pw, py + ph, [[0, P.gold1], [0.45, P.gold2], [1, P.gold3]])
  H.plate(ctx, px, py, pw, ph, { cut: 46, fill: 'rgba(5,6,11,.9)', stroke: gold, lw: 3, shadow: { color: 'rgba(0,0,0,.65)', blur: 60, y: 26 } })
  H.plate(ctx, px + 14, py + 14, pw - 28, ph - 28, { cut: 36, stroke: H.rgba(P.gold2, 0.3), lw: 1.5 })
  for (const [bx, by] of [[px + pw - 44, py + 44], [px + 44, py + ph - 44], [px + pw - 44, py + ph - 44 - 40], [px + 44 + 40, py + 44]]) {
    ctx.beginPath(); ctx.arc(bx, by, 7, 0, TAU); ctx.fillStyle = H.lin(ctx, bx - 7, by - 7, bx + 7, by + 7, [[0, '#7a8299'], [1, '#232839']]); ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 4, by + 1); ctx.lineTo(bx + 4, by - 1); ctx.stroke()
  }
  const label = `${eyebrow(v)}${series?.title || v.series ? ' · ' + (series?.title || v.series) : ''}`
  const size = H.fitLine(ctx, label, pw - 330, { family: F.disp, weight: 600, size: 30, ls: 6, min: 18, upper: true })
  const tw = H.textWidth(ctx, label, { family: F.disp, weight: 600, size, ls: 6, upper: true }), ty = py + 100
  H.text(ctx, label, w / 2, ty, { family: F.disp, weight: 600, size, ls: 6, fill: gold, align: 'center', upper: true })
  ctx.fillStyle = H.rgba(P.gold2, 0.55)
  ctx.fillRect(px + 96, ty - size * 0.36, w / 2 - tw / 2 - 28 - (px + 96), 2); ctx.fillRect(w / 2 + tw / 2 + 28, ty - size * 0.36, px + pw - 96 - (w / 2 + tw / 2 + 28), 2)
  scripture(ctx, H, v, {
    x: px + 90, y: py + 150, w: pw - 180, h: ph - 150 - 70, align: 'center', color: P.ink, bias: 0.46,
    ref: { fill: goldFill(ctx, H), ruleFill: gold, verFill: P.ink3 },
  })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h, { alpha: 0.03 })
}

/* ── Ignition: an ember floor rising under the Word. ── */
async function ignition(ctx, w, h, d, series, H, f) {
  const { P } = H, v = parse(d, H), r = H.mulberry32(H.hash(v.text) + 11)
  ctx.fillStyle = H.lin(ctx, 0, 0, 0, h, [[0, '#06030a'], [0.6, '#0c0508'], [1, '#150604']]); ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = H.rad(ctx, w / 2, h * 1.04, 0, h * 0.95, [[0, H.rgba(P.ignite3, 0.9)], [0.1, H.rgba(P.ignite2, 0.72)], [0.3, H.rgba(P.ignite1, 0.38)], [0.62, 'rgba(90,15,5,.16)'], [1, 'rgba(90,15,5,0)']])
  ctx.fillRect(0, 0, w, h)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 170; i++) {                                       // embers, denser toward the floor
    const x = r() * w, y = h - Math.pow(r(), 2.1) * h * 0.78, s = 0.8 + Math.pow(r(), 3) * 3.4, a = 0.25 + r() * 0.75
    const c = [P.ignite3, P.ignite2, '#fff1d6'][(r() * 3) | 0]
    if (s > 1.8) { ctx.fillStyle = H.rgba(c, a * 0.18); ctx.beginPath(); ctx.arc(x, y, s * 4, 0, TAU); ctx.fill() }
    ctx.fillStyle = H.rgba(c, a); ctx.beginPath(); ctx.arc(x, y, s * 0.6, 0, TAU); ctx.fill()
  }
  ctx.restore()
  ctx.fillStyle = H.rad(ctx, w / 2, h / 2, Math.min(w, h) * 0.4, Math.hypot(w, h) * 0.62, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.5)']]); ctx.fillRect(0, 0, w, h)
  H.hud(ctx, f, { left: eyebrow(v), right: series?.title || v.series })
  const burn = (x, wd) => H.lin(ctx, x, 0, x + Math.max(wd, 1), 0, [[0, P.ignite3], [1, P.ignite2]])
  scripture(ctx, H, v, {
    x: f.x, y: f.bodyTop + 24, w: f.cw, h: f.footTop - 120 - (f.bodyTop + 24), color: P.ink, bias: 0.4,
    shadow: { color: 'rgba(0,0,0,.55)', blur: 26, y: 2 },
    ref: { fill: burn, ruleFill: H.lin(ctx, f.x, 0, f.x + 56, 0, [[0, P.ignite2], [1, P.ignite3]]), verFill: H.rgba(P.ink, 0.6) },
  })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h, { alpha: 0.05 })
}

/* ── Paper: the rare light variant — letterpress on warm stock. ── */
async function paper(ctx, w, h, d, series, H, f) {
  const { PAPER: Pp, F } = H, v = parse(d, H)
  ctx.fillStyle = H.lin(ctx, 0, 0, 0, h, [[0, Pp.bg], [1, Pp.bg2]]); ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = H.rad(ctx, w / 2, h * 0.45, Math.min(w, h) * 0.35, Math.hypot(w, h) * 0.62, [[0, 'rgba(120,90,40,0)'], [1, 'rgba(120,90,40,.16)']]); ctx.fillRect(0, 0, w, h)
  H.drawGrain(ctx, w, h, { alpha: 0.07, seed: 12 })
  const m = 40
  H.plate(ctx, f.x - m, f.top - m, f.cw + m * 2, f.bottom - f.top + m * 2, { cut: 40, stroke: Pp.ink, lw: 2 })
  H.plate(ctx, f.x - m + 10, f.top - m + 10, f.cw + m * 2 - 20, f.bottom - f.top + m * 2 - 20, { cut: 32, stroke: Pp.rule, lw: 1.5 })
  H.hud(ctx, f, { left: eyebrow(v), right: series?.title || v.series, tone: 'light' })
  H.text(ctx, '“', f.x - 6, f.bodyTop + 190, { family: F.serif, style: 'italic', size: 300, fill: Pp.gold2 })
  const top = f.bodyTop + 150
  scripture(ctx, H, v, {
    x: f.x, y: top, w: f.cw, h: f.footTop - 110 - top, color: Pp.ink, bias: 0.3, max: 104,
    ref: { fill: Pp.gold, ruleFill: Pp.gold2, verFill: Pp.ink3 },
  })
  await H.footer(ctx, f, { tone: 'light' })
}

/* ── Orbit: an instrument dial counts the day; the Word sits beneath. ── */
async function orbit(ctx, w, h, d, series, H, f) {
  const { P, F } = H, v = parse(d, H), total = Number(d.total) || 31, day = Number(v.day) || 1
  const frac = H.clamp(day / total, 0, 1)
  H.deepSpace(ctx, w, h, { seed: H.hash(v.ref) + 5, nebula: 'gold', glints: 3 })
  H.hud(ctx, f, { left: eyebrow(v), right: series?.title || v.series })
  const R = f.story ? 300 : f.wide ? 150 : 232, cx = f.cx, cy = f.bodyTop + R + 26
  H.drawHexLattice(ctx, cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2, { size: 34, color: 'rgba(176,194,232,.09)', mask: (g, ww, hh) => H.rad(g, ww / 2, hh / 2, R * 0.5, R * 1.5, [[0, '#fff'], [1, 'rgba(255,255,255,0)']]) })
  H.tickRing(ctx, cx, cy, R, { count: 124, len: 12, major: 4, majorLen: 24, lw: Math.max(2.2, R / 100), color: 'rgba(176,194,232,.3)', litColor: P.gold2, lit: Math.round(frac * 124) })
  ctx.save(); ctx.setLineDash([2, 10]); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(176,194,232,.28)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.8, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = 'rgba(176,194,232,.1)'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.6, 0, TAU); ctx.stroke()
  const a = -Math.PI / 2 + frac * TAU, mx = cx + Math.cos(a) * R * 0.8, my = cy + Math.sin(a) * R * 0.8
  ctx.fillStyle = H.rad(ctx, mx, my, 0, R * 0.11, [[0, H.rgba(P.gold1, 0.9)], [1, H.rgba(P.gold2, 0)]]); ctx.fillRect(mx - R * 0.12, my - R * 0.12, R * 0.24, R * 0.24)
  ctx.beginPath(); ctx.arc(mx, my, R * 0.035, 0, TAU); ctx.fillStyle = P.gold1; ctx.fill(); ctx.restore()
  const ds = R * 0.72, gold = H.lin(ctx, 0, cy - ds / 2, 0, cy + ds / 2, [[0, P.gold1], [1, P.gold3]])
  H.text(ctx, 'Day', cx, cy - ds * 0.5, { family: F.mono, size: Math.max(16, R * 0.075), ls: 5, fill: P.ink3, align: 'center', upper: true })
  H.text(ctx, String(day), cx, cy + ds * 0.32, { family: F.disp, weight: 700, size: ds, fill: gold, align: 'center' })
  H.text(ctx, `of ${total}`, cx, cy + ds * 0.62, { family: F.mono, size: Math.max(16, R * 0.075), ls: 5, fill: P.ink3, align: 'center', upper: true })
  const top = cy + R + (f.story ? 76 : 56)
  scripture(ctx, H, v, {
    x: f.x, y: top, w: f.cw, h: f.footTop - 70 - top, align: 'center', color: P.ink, style: 'italic', bias: 0.3, gap: 44, max: 88,
    ref: { fill: goldFill(ctx, H), ruleFill: P.gold2, verFill: P.ink3 },
  })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h)
}

/* ── Plain: carbon and type, nothing else. A single gold rule leads the eye. ── */
async function plain(ctx, w, h, d, series, H, f) {
  const { P, F } = H, v = parse(d, H)
  ctx.fillStyle = H.lin(ctx, 0, 0, 0, h, [[0, P.c0], [1, P.c1]]); ctx.fillRect(0, 0, w, h)
  const ex = `${eyebrow(v)}${v.series ? '  ·  ' + v.series : ''}`
  const es = H.fitLine(ctx, ex, f.cw, { family: F.disp, weight: 600, size: 30, ls: 6, min: 18, upper: true })
  H.text(ctx, ex, f.x, f.top + 30, { family: F.disp, weight: 600, size: es, ls: 6, fill: P.ink3, upper: true })
  const inset = 44, top = f.bodyTop + 10, bot = f.footTop - 80
  const out = scripture(ctx, H, v, {
    x: f.x + inset, y: top, w: f.cw - inset, h: bot - top, color: P.ink, bias: 0.38, max: 108, weight: 400,
    ref: { fill: P.ink2, ruleFill: P.gold2, verFill: P.ink3, size: 32 },
  })
  ctx.fillStyle = H.lin(ctx, 0, out.top, 0, out.end, [[0, P.gold1], [1, P.gold3]]); ctx.fillRect(f.x, out.top + 6, 5, out.end - out.top - 18)
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h, { alpha: 0.035 })
}

export const templates = [
  { id: 'ascent', label: 'Ascent', draw: ascent },
  { id: 'carbon', label: 'Carbon', draw: carbon },
  { id: 'ignition', label: 'Ignition', draw: ignition },
  { id: 'paper', label: 'Paper', draw: paper },
  { id: 'orbit', label: 'Orbit', draw: orbit },
  { id: 'plain', label: 'Plain', draw: plain },
]
export default function draw(ctx, w, h, data, series, H, f) {
  return (templates.find((t) => t.id === H.template) || templates[0]).draw(ctx, w, h, data, series, H, f)
}
