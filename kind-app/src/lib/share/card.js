// Code-card share templates. data: { no, day, title, line, rare, stage, owned, seriesTitle }.
// The engraved plate comes from <CodeCardArt> (5:7); the title and line are set around it. Gold cards get hot-foil.
const TAU = Math.PI * 2

/** Where the card and its caption go: stacked on story/portrait, side by side on square. */
function layout(f, capH = 270) {
  if (f.wide) {
    const ch = f.bodyH - 10, cw = ch / 1.4
    return { cw, ch, x: f.x + 6, y: f.bodyTop + 5, capX: f.x + cw + 64, capY: f.bodyTop + 5, capW: f.cw - cw - 64, capH: ch, side: true }
  }
  const ch = Math.min(f.bodyH - capH - 30, f.cw * 1.4 * 0.86), cw = ch / 1.4
  return { cw, ch, x: f.cx - cw / 2, y: f.bodyTop + 10 + (f.bodyH - capH - 30 - ch) / 2, capX: f.x, capY: f.bodyTop + 10 + (f.bodyH - capH - 30 - ch) / 2 + ch + 44, capW: f.cw, capH, side: false }
}

/** The card itself: shadow, art, and (gold) foil + halo. rot in radians about its centre. */
async function drawCard(ctx, H, d, x, y, cw, ch, { rot = 0, day = d.day, rare = d.rare, halo, shadow = 0.7, sheen = rare ? 1 : 0, seed = 3 } = {}) {
  const { P } = H, cut = cw * 0.0867
  ctx.save()
  ctx.translate(x + cw / 2, y + ch / 2); ctx.rotate(rot); ctx.translate(-cw / 2, -ch / 2)
  if (halo) {
    ctx.fillStyle = H.rad(ctx, cw / 2, ch / 2, cw * 0.2, cw * 1.05, [[0, H.rgba(halo, 0.42)], [1, H.rgba(halo, 0)]])
    ctx.fillRect(-cw, -cw * 0.6, cw * 3, ch + cw * 1.2)
  }
  H.plate(ctx, 0, 0, cw, ch, { cut, fill: '#05060b', shadow: { color: `rgba(0,0,0,${shadow})`, blur: cw * 0.1, y: cw * 0.05 } })
  await H.svg(ctx, H.el(H.art.CodeCardArt, { day, rare: !!rare, w: 300, h: 420 }), 0, 0, cw, ch)
  if (sheen) H.foilSheen(ctx, () => H.chamfer(ctx, 0, 0, cw, ch, cut), 0, 0, cw, ch, { strength: sheen, seed, angle: 0.62 })
  H.chamfer(ctx, 0, 0, cw, ch, cut)
  ctx.strokeStyle = rare ? H.rgba(P.gold1, 0.75) : 'rgba(176,194,232,.35)'; ctx.lineWidth = 2; ctx.stroke()
  ctx.restore()
}

/** Eyebrow, title, line. tone: dark | light. Returns the y beneath. */
function caption(ctx, H, d, x, y, w, { align = 'left', tone = 'dark', h = 270 } = {}) {
  const { P, F, PAPER } = H, light = tone === 'light'
  const ink = light ? PAPER.ink : P.ink, sub = light ? PAPER.ink3 : P.ink3
  const gold = light ? PAPER.gold : H.lin(ctx, x, 0, x + w, 0, [[0, P.gold1], [1, P.gold2]])
  const ax = align === 'center' ? x + w / 2 : x
  const eb = `Code card No. ${d.no ?? d.day}${d.rare ? '  ·  Gold' : ''}`
  H.text(ctx, eb, ax, y + 20, { family: F.mono, size: 21, ls: 4, fill: d.rare ? gold : sub, align, upper: true })
  const title = String(d.title || '').toUpperCase()
  const tsz = H.fitLine(ctx, title, w, { family: F.disp, weight: 700, size: h > 250 ? 74 : 62, ls: 2, min: 30 })
  H.text(ctx, title, ax, y + 20 + 24 + tsz * 0.85, { family: F.disp, weight: 700, size: tsz, ls: 2, fill: ink, align })
  const top = y + 20 + 24 + tsz + 22
  const fit = H.fitText(ctx, d.line || '', { w, h: Math.max(60, y + h - top), family: F.serif, style: 'italic', min: 22, max: 44, lh: 1.3 })
  return H.drawTextLines(ctx, fit.lines, ax, top, { size: fit.size, lh: fit.lh, align, family: F.serif, style: 'italic', fill: light ? PAPER.ink2 : P.ink2 })
}
const tint = (H, d) => (d.rare ? H.P.gold2 : H.P.stages[(Math.max(1, d.stage || 1) - 1) % 5])
const hudL = (d) => `Day ${d.day}`

/* ── Hangar: under the lights, over the Earth's limb. ── */
async function hangar(ctx, w, h, d, series, H, f) {
  const { P } = H, L = layout(f)
  H.deepSpace(ctx, w, h, { seed: d.day * 7, limb: { cy: f.footTop - 60, tone: d.rare ? 'gold' : 'cyan', sunX: 0.2 }, nebula: d.rare ? 'gold' : 'tele' })
  H.hud(ctx, f, { left: hudL(d), right: d.seriesTitle || series?.title })
  const cx = L.x + L.cw / 2
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = H.lin(ctx, 0, L.y - 60, 0, L.y + L.ch + 60, [[0, H.rgba(tint(H, d), 0.0)], [0.4, H.rgba(tint(H, d), 0.1)], [1, H.rgba(tint(H, d), 0)]])
  ctx.beginPath(); ctx.moveTo(cx - L.cw * 0.4, L.y - 60); ctx.lineTo(cx + L.cw * 0.4, L.y - 60); ctx.lineTo(cx + L.cw * 1.3, L.y + L.ch + 60); ctx.lineTo(cx - L.cw * 1.3, L.y + L.ch + 60); ctx.fill()
  ctx.restore()
  await drawCard(ctx, H, d, L.x, L.y, L.cw, L.ch, { halo: tint(H, d) })
  caption(ctx, H, d, L.capX, L.capY, L.capW, { align: L.side ? 'left' : 'center', h: L.capH })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h)
}

/* ── Tilt: thrown onto carbon, a ghost numeral behind. ── */
async function tilt(ctx, w, h, d, series, H, f) {
  const { P, F } = H, L = layout(f, 250)
  H.drawCarbonWeave(ctx, 0, 0, w, h, { cell: 7 })
  ctx.fillStyle = H.rad(ctx, w / 2, h / 2, Math.min(w, h) * 0.3, Math.hypot(w, h) * 0.6, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.75)']]); ctx.fillRect(0, 0, w, h)
  const big = String(d.day).padStart(2, '0')
  ctx.save(); ctx.globalAlpha = 0.07
  H.text(ctx, big, f.cx, f.bodyTop + L.ch * 0.95, { family: F.disp, weight: 700, size: w * 0.95, fill: P.ink, align: 'center' })
  ctx.restore()
  H.hud(ctx, f, { left: hudL(d), right: d.seriesTitle || series?.title })
  await drawCard(ctx, H, d, L.x, L.y, L.cw, L.ch, { rot: -0.075, shadow: 0.85, halo: d.rare ? P.gold2 : null })
  caption(ctx, H, d, L.capX, L.capY, L.capW, { align: L.side ? 'left' : 'center', h: L.capH })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h, { alpha: 0.03 })
}

/* ── Burst: rays and a hex lattice radiating from the card. ── */
async function burst(ctx, w, h, d, series, H, f) {
  const { P } = H, L = layout(f), c = tint(H, d), cx = L.x + L.cw / 2, cy = L.y + L.ch / 2
  ctx.fillStyle = H.lin(ctx, 0, 0, 0, h, [[0, '#04050a'], [1, '#0a0b14']]); ctx.fillRect(0, 0, w, h)
  const r = H.mulberry32(d.day + 40), n = 28
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.1, wd = 0.03 + r() * 0.05, R = Math.hypot(w, h)
    ctx.fillStyle = H.rad(ctx, cx, cy, L.cw * 0.4, R * 0.7, [[0, H.rgba(c, 0.2 + r() * 0.12)], [1, H.rgba(c, 0)]])
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a, a + wd); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
  H.drawHexLattice(ctx, 0, 0, w, h, { size: 52, color: H.rgba(c, 0.13), mask: (g, ww, hh) => H.rad(g, cx, cy, L.cw * 0.5, ww * 0.9, [[0, 'rgba(255,255,255,0)'], [0.35, '#fff'], [1, 'rgba(255,255,255,0)']]) })
  H.hud(ctx, f, { left: hudL(d), right: d.seriesTitle || series?.title })
  await drawCard(ctx, H, d, L.x, L.y, L.cw, L.ch, { halo: c })
  const r2 = H.mulberry32(d.day + 9)
  for (let i = 0; i < 9; i++) H.sparkle(ctx, cx + (r2() - 0.5) * L.cw * 2.2, cy + (r2() - 0.5) * L.ch * 1.2, 14 + r2() * 26, d.rare ? '#fff0c2' : '#dfeaff', 0.6)
  caption(ctx, H, d, L.capX, L.capY, L.capW, { align: L.side ? 'left' : 'center', h: L.capH })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h)
}

/* ── Specimen: the museum plate. Light stock, a label card beneath. ── */
async function specimen(ctx, w, h, d, series, H, f) {
  const { PAPER: Pp } = H, L = layout(f, 250)
  ctx.fillStyle = H.lin(ctx, 0, 0, 0, h, [[0, Pp.bg], [1, Pp.bg2]]); ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = H.rad(ctx, w / 2, h * 0.4, Math.min(w, h) * 0.3, Math.hypot(w, h) * 0.62, [[0, 'rgba(120,90,40,0)'], [1, 'rgba(120,90,40,.16)']]); ctx.fillRect(0, 0, w, h)
  H.drawGrain(ctx, w, h, { alpha: 0.07, seed: 12 })
  H.hud(ctx, f, { left: `Specimen ${String(d.no ?? d.day).padStart(2, '0')}`, right: d.seriesTitle || series?.title, tone: 'light' })
  ctx.fillStyle = H.rad(ctx, L.x + L.cw / 2, L.y + L.ch + 10, 0, L.cw * 0.8, [[0, 'rgba(60,40,10,.22)'], [1, 'rgba(60,40,10,0)']])
  ctx.fillRect(L.x - L.cw, L.y + L.ch - 40, L.cw * 3, 120)
  await drawCard(ctx, H, d, L.x, L.y, L.cw, L.ch, { shadow: 0.35 })
  caption(ctx, H, d, L.capX, L.capY, L.capW, { align: L.side ? 'left' : 'center', tone: 'light', h: L.capH })
  await H.footer(ctx, f, { tone: 'light' })
}

/* ── Fan: the day's card in front, its neighbours behind. ── */
async function fan(ctx, w, h, d, series, H, f) {
  const { P } = H, L = layout(f), c = tint(H, d)
  H.deepSpace(ctx, w, h, { seed: d.day * 3 + 1, nebula: d.rare ? 'gold' : 'tele' })
  H.hud(ctx, f, { left: hudL(d), right: d.seriesTitle || series?.title })
  const s = 0.9, cw = L.cw * s, ch = L.ch * s, cx = L.x + L.cw / 2, cy = L.y + L.ch / 2
  const side = (k, dir) => drawCard(ctx, H, d, cx - cw / 2 + dir * L.cw * 0.42, cy - ch / 2 + 22, cw, ch, { rot: dir * 0.16, day: Math.max(1, d.day + dir * k), rare: false, shadow: 0.8, sheen: 0 })
  await side(2, -1); await side(2, 1)
  ctx.fillStyle = 'rgba(5,6,11,.45)'; ctx.fillRect(0, L.y - 40, w, L.ch + 120)
  await drawCard(ctx, H, d, L.x, L.y, L.cw, L.ch, { halo: c, shadow: 0.85 })
  caption(ctx, H, d, L.capX, L.capY, L.capW, { align: L.side ? 'left' : 'center', h: L.capH })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h)
}

/* ── Foil: black, one big card, the light moving across it. ── */
async function foil(ctx, w, h, d, series, H, f) {
  const { P } = H, L = layout(f, 230), c = tint(H, d)
  ctx.fillStyle = '#030408'; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = H.rad(ctx, L.x + L.cw / 2, L.y + L.ch / 2, 0, w * 0.9, [[0, H.rgba(c, 0.26)], [0.5, H.rgba(c, 0.06)], [1, H.rgba(c, 0)]]); ctx.fillRect(0, 0, w, h)
  H.hud(ctx, f, { left: hudL(d), right: d.rare ? 'Gold foil' : d.seriesTitle || series?.title })
  const g = L.cw * 0.06, X = L.x - g, W = L.cw + g * 2
  await drawCard(ctx, H, d, L.x - g, L.y - g * 1.4, W, W * 1.4, { sheen: d.rare ? 1.2 : 0.55, shadow: 0.9, halo: c, seed: 21 })
  caption(ctx, H, d, L.capX, L.capY + g * 1.4, L.capW, { align: L.side ? 'left' : 'center', h: L.capH - 30 })
  await H.footer(ctx, f, {})
  H.drawGrain(ctx, w, h, { alpha: 0.05 })
}

export const templates = [
  { id: 'hangar', label: 'Hangar', draw: hangar },
  { id: 'tilt', label: 'Tilt', draw: tilt },
  { id: 'burst', label: 'Burst', draw: burst },
  { id: 'specimen', label: 'Specimen', draw: specimen },
  { id: 'fan', label: 'Fan', draw: fan },
  { id: 'foil', label: 'Foil', draw: foil },
]
export default function draw(ctx, w, h, data, series, H, f) {
  return (templates.find((t) => t.id === H.template) || templates[0]).draw(ctx, w, h, data, series, H, f)
}
