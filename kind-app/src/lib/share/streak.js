// Streak share templates. data: { count, best, shields, state, strip:[{label,flame,save,rest,today}], rank:{index,name,pct,next} }.
// Flame + a giant number + the last seven days + rank. A zero streak reads "ready for ignition", never shame.
const TAU = Math.PI * 2
const MILESTONES = [3, 7, 14, 21, 31, 50, 100, 200, 365, 500, 1000]
const nextMilestone = (n) => MILESTONES.find((m) => m > n) || n + 100
const prevMilestone = (n) => [...MILESTONES].reverse().find((m) => m <= n) || 0
const lvl = (n) => (n >= 21 ? 3 : n >= 7 ? 2 : 1)

function counts(d) {
  const n = Math.max(0, Number(d.count) || 0)
  return { n, lit: n > 0, label: n === 0 ? 'Ready for ignition' : n === 1 ? 'Day streak' : 'Day streak', sub: d.best ? `Best ${d.best}` : '' }
}

/** Seven days as hex cells: flame / shield / rest / empty, today ringed. */
function weekStrip(ctx, H, d, x, y, w, { tone = 'dark' } = {}) {
  const { P, F, PAPER } = H, light = tone === 'light'
  const cell = w / 7, r = Math.min(cell * 0.4, 56)
  ;(d.strip || []).slice(-7).forEach((c, i) => {
    const cx = x + cell * (i + 0.5), cy = y + r
    H.hexPath(ctx, cx, cy, r)
    if (c.flame) { ctx.fillStyle = H.lin(ctx, cx, cy - r, cx, cy + r, [[0, P.ignite3], [0.5, P.ignite2], [1, P.ignite1]]); ctx.fill() }
    else { ctx.fillStyle = light ? 'rgba(22,24,31,.05)' : P.c2; ctx.fill() }
    ctx.lineWidth = 2
    ctx.strokeStyle = c.flame ? H.rgba(P.ignite3, 0.9) : c.save === 'shield' ? P.tele : light ? PAPER.rule : 'rgba(176,194,232,.22)'
    ctx.save(); if (c.rest && !c.flame) ctx.setLineDash([6, 7]); ctx.stroke(); ctx.restore()
    if (c.flame) H.glyph(ctx, H.FLAME_PATH, cx, cy + 1, r * 1.0, { fill: '#1a0900' })
    else if (c.save === 'shield') H.glyph(ctx, H.SHIELD_PATH, cx, cy, r * 0.95, { stroke: P.tele, lw: 2 })
    if (c.today) { H.hexPath(ctx, cx, cy, r + 9); ctx.strokeStyle = light ? PAPER.ink : P.ink; ctx.lineWidth = 2.5; ctx.stroke() }
    H.text(ctx, c.label || 'SMTWTFS'[i], cx, cy + r + 40, { family: F.mono, size: 21, ls: 2, fill: c.today ? (light ? PAPER.ink : P.ink) : light ? PAPER.ink3 : P.ink3, align: 'center' })
  })
  return y + r * 2 + 50
}

/** Rank: insignia, name, and a progress bar to the next rank. */
async function rankRow(ctx, H, d, x, y, w, { tone = 'dark', align = 'left' } = {}) {
  const { P, F, PAPER } = H, light = tone === 'light', rk = d.rank
  if (!rk) return y
  const ih = 96, gap = 24, tw = w - ih * 0.866 - gap
  const x0 = align === 'center' ? x + w / 2 - (ih * 0.866 + gap + Math.min(tw, 520)) / 2 : x
  await H.svg(ctx, H.el(H.art.RankInsignia, { rank: rk.index || 0, size: ih }), x0, y, ih * 0.866, ih, { ax: 0, ay: 0 })
  const tx = x0 + ih * 0.866 + gap, bw = Math.min(tw, 520)
  H.text(ctx, rk.name, tx, y + 34, { family: F.disp, weight: 700, size: 42, ls: 4, fill: light ? PAPER.ink : P.ink, upper: true })
  const nm = rk.next?.name ? `Next · ${rk.next.name}` : 'Highest rank'
  H.text(ctx, nm, tx, y + 62, { family: F.mono, size: 19, ls: 3, fill: light ? PAPER.ink3 : P.ink3, upper: true })
  ctx.fillStyle = light ? PAPER.rule : P.c4; ctx.fillRect(tx, y + 78, bw, 8)
  ctx.fillStyle = light ? PAPER.gold2 : H.lin(ctx, tx, 0, tx + bw, 0, [[0, P.gold1], [1, P.gold2]]); ctx.fillRect(tx, y + 78, bw * H.clamp(rk.pct ?? 0, 0, 1), 8)
  return y + ih
}

/** Shared vertical skeleton: hero zone [top, top+heroH], strip, rank. Returns the geometry and draws strip/rank. */
async function stack(ctx, H, d, f, { tone = 'dark', align = 'left' } = {}) {
  const rankH = 100, stripH = 156, gap = 46
  const heroH = f.bodyH - rankH - stripH - gap * 2
  const hero = { top: f.bodyTop, h: heroH, cy: f.bodyTop + heroH / 2 }
  const sy = f.bodyTop + heroH + gap
  weekStrip(ctx, H, d, f.x, sy, f.cw, { tone })
  await rankRow(ctx, H, d, f.x, sy + stripH + gap - 8, f.cw, { tone, align })
  return hero
}
const gradNum = (ctx, H, y0, y1) => H.lin(ctx, 0, y0, 0, y1, [[0, H.P.gold1], [0.55, H.P.gold2], [1, H.P.gold3]])
const eyebrow = (H, ctx, f, d) => H.hud(ctx, f, { left: 'Flight log', right: d.shields ? `${d.shields} shield${d.shields > 1 ? 's' : ''} in the bay` : 'Streak' })

/* ── Ignition: the flame, the number. ── */
async function ignition(ctx, w, h, d, series, H, f) {
  const { P, F } = H, c = counts(d)
  H.deepSpace(ctx, w, h, { seed: 11, nebula: 'ember', limb: { cy: f.footTop - 60, tone: 'ember', sunX: 0.5, strength: 0.7 }, glints: 2 })
  eyebrow(H, ctx, f, d)
  const hero = await stack(ctx, H, d, f, { align: 'left' })
  const fs = Math.min(hero.h * 0.4, 400)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = H.rad(ctx, f.cx, hero.top + fs * 0.55, 0, fs * 1.2, [[0, H.rgba(P.ignite2, c.lit ? 0.4 : 0.1)], [1, H.rgba(P.ignite1, 0)]]); ctx.fillRect(0, hero.top - fs, w, fs * 3)
  ctx.restore()
  await H.svg(ctx, H.el(H.art.FlameMark, { size: fs, lit: c.lit, level: lvl(c.n) }), f.cx - fs / 2, hero.top, fs, fs)
  const numTop = hero.top + fs + 10, numH = hero.h - fs - 90
  const ns = H.fitLine(ctx, String(c.n), f.cw, { family: F.disp, weight: 700, size: Math.min(numH * 1.25, 520), min: 80 })
  H.text(ctx, String(c.n), f.cx, numTop + ns * 0.8, { family: F.disp, weight: 700, size: ns, fill: c.lit ? gradNum(ctx, H, numTop, numTop + ns) : P.ink3, align: 'center' })
  H.text(ctx, c.label, f.cx, hero.top + hero.h - 30, { family: F.disp, weight: 600, size: 38, ls: 8, fill: P.ink, align: 'center', upper: true })
  if (c.sub) H.text(ctx, c.sub, f.cx, hero.top + hero.h + 2, { family: F.mono, size: 20, ls: 4, fill: P.ink3, align: 'center', upper: true })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h)
}

/* ── Gauge: a bezel of ticks counting to the next milestone. ── */
async function gauge(ctx, w, h, d, series, H, f) {
  const { P, F } = H, c = counts(d), nxt = nextMilestone(c.n), prv = prevMilestone(c.n), frac = H.clamp((c.n - prv) / (nxt - prv), 0, 1)
  H.deepSpace(ctx, w, h, { seed: 21, nebula: 'tele', glints: 3 })
  eyebrow(H, ctx, f, d)
  const hero = await stack(ctx, H, d, f)
  const R = Math.min(f.cw / 2 - 10, hero.h / 2 - 10), cx = f.cx, cy = hero.cy
  H.drawHexLattice(ctx, cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8, { size: 36, color: 'rgba(176,194,232,.08)', mask: (g, ww, hh) => H.rad(g, ww / 2, hh / 2, R * 0.4, R * 1.3, [[0, '#fff'], [1, 'rgba(255,255,255,0)']]) })
  H.tickRing(ctx, cx, cy, R, { count: 120, len: 14, major: 10, majorLen: 30, lw: Math.max(3, R / 80), color: 'rgba(176,194,232,.26)', litColor: P.ignite2, lit: Math.round(frac * 120) })
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.82, 0, TAU); ctx.strokeStyle = 'rgba(176,194,232,.1)'; ctx.lineWidth = 2; ctx.stroke()
  const fs = R * 0.36
  await H.svg(ctx, H.el(H.art.FlameMark, { size: fs, lit: c.lit, level: lvl(c.n) }), cx - fs / 2, cy - R * 0.62, fs, fs)
  const ns = H.fitLine(ctx, String(c.n), R * 1.25, { family: F.disp, weight: 700, size: R * 0.95, min: 60 })
  H.text(ctx, String(c.n), cx, cy + ns * 0.3, { family: F.disp, weight: 700, size: ns, fill: c.lit ? gradNum(ctx, H, cy - ns * 0.5, cy + ns * 0.4) : P.ink3, align: 'center' })
  H.text(ctx, c.label, cx, cy + R * 0.5, { family: F.disp, weight: 600, size: Math.max(22, R * 0.1), ls: 6, fill: P.ink, align: 'center', upper: true })
  H.text(ctx, c.n ? `${nxt - c.n} to ${nxt}` : 'Day 1 starts now', cx, cy + R * 0.66, { family: F.mono, size: Math.max(16, R * 0.06), ls: 3, fill: P.ink3, align: 'center', upper: true })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h)
}

/* ── Ladder: the milestones as rungs; you are climbing. ── */
async function ladder(ctx, w, h, d, series, H, f) {
  const { P, F } = H, c = counts(d)
  ctx.fillStyle = H.lin(ctx, 0, 0, 0, h, [[0, P.c0], [1, P.c1]]); ctx.fillRect(0, 0, w, h)
  H.hud(ctx, f, { left: 'Flight log', right: c.sub || 'Streak' })
  const hero = await stack(ctx, H, d, f)
  const ns = H.fitLine(ctx, String(c.n), f.cw * 0.62, { family: F.disp, weight: 700, size: Math.min(hero.h * 0.7, 460), min: 80 })
  H.text(ctx, String(c.n), f.x - 6, hero.top + ns * 0.78, { family: F.disp, weight: 700, size: ns, fill: c.lit ? gradNum(ctx, H, hero.top, hero.top + ns) : P.ink3 })
  const nw = H.textWidth(ctx, String(c.n), { family: F.disp, weight: 700, size: ns })
  const fs = Math.min(ns * 0.5, 190)
  await H.svg(ctx, H.el(H.art.FlameMark, { size: fs, lit: c.lit, level: lvl(c.n) }), f.x + nw + 24, hero.top + 10, f.right - (f.x + nw + 24), fs, { ax: 0, ay: 0 })
  H.text(ctx, c.label, f.x, hero.top + ns * 0.78 + 52, { family: F.disp, weight: 600, size: 40, ls: 8, fill: P.ink, upper: true })
  const ty = hero.top + hero.h - 62, ms = [0, ...MILESTONES.filter((m) => m <= Math.max(nextMilestone(c.n), 31)).slice(0, 6)].slice(0, 6)
  const maxM = ms[ms.length - 1], X = (v) => f.x + 12 + ((f.cw - 24) * v) / maxM
  ctx.fillStyle = P.c4; ctx.fillRect(f.x + 12, ty, f.cw - 24, 6)
  ctx.fillStyle = H.lin(ctx, f.x, 0, f.right, 0, [[0, P.ignite3], [1, P.ignite1]]); ctx.fillRect(f.x + 12, ty, Math.max(0, X(Math.min(c.n, maxM)) - f.x - 12), 6)
  ms.forEach((m) => {
    const on = c.n >= m
    H.hexPath(ctx, X(m), ty + 3, 15); ctx.fillStyle = on ? P.ignite2 : P.c3; ctx.fill(); ctx.strokeStyle = on ? P.ignite3 : 'rgba(176,194,232,.3)'; ctx.lineWidth = 2; ctx.stroke()
    if (m) H.text(ctx, String(m), X(m), ty + 52, { family: F.mono, size: 20, fill: on ? P.ink : P.ink3, align: 'center' })
  })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h, { alpha: 0.035 })
}

/* ── Ember: a hot field, the number struck in white. ── */
async function ember(ctx, w, h, d, series, H, f) {
  const { P, F } = H, c = counts(d)
  ctx.fillStyle = H.lin(ctx, 0, 0, 0, h, [[0, '#0a0405'], [0.5, '#2a0b05'], [1, '#6a1a06']]); ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = H.rad(ctx, w / 2, h * 0.42, 0, h * 0.7, [[0, H.rgba(P.ignite2, 0.55)], [0.4, H.rgba(P.ignite1, 0.22)], [1, H.rgba(P.ignite1, 0)]]); ctx.fillRect(0, 0, w, h)
  const r = H.mulberry32(c.n + 5)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 120; i++) { const x = r() * w, y = h - Math.pow(r(), 1.6) * h, s = 0.8 + r() * 2.6; ctx.fillStyle = H.rgba([P.ignite3, P.ignite2, '#fff1d6'][(r() * 3) | 0], 0.2 + r() * 0.7); ctx.beginPath(); ctx.arc(x, y, s * 0.6, 0, TAU); ctx.fill() }
  ctx.restore()
  H.hud(ctx, f, { left: 'Flight log', right: c.sub || 'Streak' })
  const hero = await stack(ctx, H, d, f)
  const fl = Math.min(hero.h * 1.15, w * 0.9)
  ctx.save(); ctx.globalAlpha = 0.16; H.glyph(ctx, H.FLAME_PATH, f.cx, hero.cy, fl, { fill: P.ignite3 }); ctx.restore()
  const ns = H.fitLine(ctx, String(c.n), f.cw, { family: F.disp, weight: 700, size: Math.min(hero.h * 0.95, 600), min: 80 })
  H.text(ctx, String(c.n), f.cx, hero.cy + ns * 0.34, { family: F.disp, weight: 700, size: ns, fill: '#fff6e8', align: 'center' })
  H.text(ctx, c.label, f.cx, hero.cy + ns * 0.34 + 66, { family: F.disp, weight: 600, size: 40, ls: 9, fill: P.ignite3, align: 'center', upper: true })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h, { alpha: 0.05 })
}

/* ── Carbon: the number engraved in gold on a chamfered plate. ── */
async function carbon(ctx, w, h, d, series, H, f) {
  const { P, F } = H, c = counts(d)
  H.drawCarbonWeave(ctx, 0, 0, w, h, { cell: 7 })
  ctx.fillStyle = H.rad(ctx, w / 2, h / 2, Math.min(w, h) * 0.3, Math.hypot(w, h) * 0.6, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.72)']]); ctx.fillRect(0, 0, w, h)
  H.hud(ctx, f, { left: 'Flight log', right: c.sub || 'Streak' })
  const hero = await stack(ctx, H, d, f)
  const px = f.x, pw = f.cw, py = hero.top + 6, ph = hero.h - 12
  const gold = H.lin(ctx, px, py, px + pw, py + ph, [[0, P.gold1], [0.45, P.gold2], [1, P.gold3]])
  H.plate(ctx, px, py, pw, ph, { cut: 44, fill: 'rgba(5,6,11,.9)', stroke: gold, lw: 3, shadow: { color: 'rgba(0,0,0,.6)', blur: 50, y: 22 } })
  H.plate(ctx, px + 14, py + 14, pw - 28, ph - 28, { cut: 34, stroke: H.rgba(P.gold2, 0.28), lw: 1.5 })
  const fs = Math.min(ph * 0.22, 150)
  await H.svg(ctx, H.el(H.art.FlameMark, { size: fs, lit: c.lit, level: lvl(c.n) }), f.cx - fs / 2, py + 40, fs, fs)
  const ns = H.fitLine(ctx, String(c.n), pw - 120, { family: F.disp, weight: 700, size: ph * 0.52, min: 80 })
  H.text(ctx, String(c.n), f.cx, py + 40 + fs + ns * 0.78, { family: F.disp, weight: 700, size: ns, fill: c.lit ? H.lin(ctx, 0, py + 40 + fs, 0, py + 40 + fs + ns, [[0, P.gold1], [0.5, P.gold2], [1, P.gold3]]) : P.ink3, align: 'center' })
  H.text(ctx, c.label, f.cx, py + ph - 46, { family: F.disp, weight: 600, size: 34, ls: 8, fill: gold, align: 'center', upper: true })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h, { alpha: 0.03 })
}

/* ── Paper: light stock, ink numerals. ── */
async function paper(ctx, w, h, d, series, H, f) {
  const { PAPER: Pp, F } = H, c = counts(d)
  ctx.fillStyle = H.lin(ctx, 0, 0, 0, h, [[0, Pp.bg], [1, Pp.bg2]]); ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = H.rad(ctx, w / 2, h * 0.45, Math.min(w, h) * 0.35, Math.hypot(w, h) * 0.62, [[0, 'rgba(120,90,40,0)'], [1, 'rgba(120,90,40,.16)']]); ctx.fillRect(0, 0, w, h)
  H.drawGrain(ctx, w, h, { alpha: 0.07, seed: 12 })
  H.hud(ctx, f, { left: 'Flight log', right: c.sub || 'Streak', tone: 'light' })
  const hero = await stack(ctx, H, d, f, { tone: 'light' })
  const fs = Math.min(hero.h * 0.3, 260)
  await H.svg(ctx, H.el(H.art.FlameMark, { size: fs, lit: c.lit, level: lvl(c.n) }), f.cx - fs / 2, hero.top, fs, fs)
  const top = hero.top + fs
  const ns = H.fitLine(ctx, String(c.n), f.cw, { family: F.disp, weight: 700, size: Math.min((hero.h - fs) * 1.0, 480), min: 80 })
  H.text(ctx, String(c.n), f.cx, top + ns * 0.78, { family: F.disp, weight: 700, size: ns, fill: Pp.ink, align: 'center' })
  H.text(ctx, c.label, f.cx, hero.top + hero.h - 4, { family: F.disp, weight: 600, size: 36, ls: 9, fill: Pp.gold, align: 'center', upper: true })
  await H.footer(ctx, f, { tone: 'light' })
}

export const templates = [
  { id: 'ignition', label: 'Ignition', draw: ignition },
  { id: 'gauge', label: 'Gauge', draw: gauge },
  { id: 'ladder', label: 'Ladder', draw: ladder },
  { id: 'ember', label: 'Ember', draw: ember },
  { id: 'carbon', label: 'Carbon', draw: carbon },
  { id: 'paper', label: 'Paper', draw: paper },
]
export default function draw(ctx, w, h, data, series, H, f) {
  return (templates.find((t) => t.id === H.template) || templates[0]).draw(ctx, w, h, data, series, H, f)
}
