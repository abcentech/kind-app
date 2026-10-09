// ───────────────────────────────────────────────────────────────────────────
// 9 · src/art/Brand.jsx — the generated block (markup + geometry); the components are hand-written around it
// ───────────────────────────────────────────────────────────────────────────
const tight = (s) => s.replace(/\s*\n\s*/g, '')
function monoMarkup() {
  const ringW = 22
  const ring = `M${hexPoints(256, 256, RIM.R0).replace(/ /g, 'L')}ZM${hexPoints(256, 256, fromApo(apo(RIM.R0) - ringW)).replace(/ /g, 'L')}Z`
  return `<path class="brand-mark__rim" fill-rule="evenodd" fill="currentColor" d="${ring}"/><path class="brand-mark__k" transform="translate(${K_T.x} ${K_T.y}) scale(${K_T.s})" d="${K_LOCAL.body}" fill="currentColor"/>`
}
const TAG_UNITS = 96 // tagline font-size in wordmark units (cap 700): lands at ~.26em tracking when justified to the wordmark
function taglineUnits() {
  const t = fitTagline(WORDMARK.w, { size: TAG_UNITS })
  const g = font(600).charToGlyph('g').getBoundingBox()
  return { main: compactPath(shiftPath(t.main, -t.o.x0, 0, 3), 0), emph: compactPath(shiftPath(t.emph, -t.o.x0, 0, 3), 0), cap: +(CAP * TAG_UNITS / 1000).toFixed(2), desc: +(-g.y1 * TAG_UNITS / 1000).toFixed(2), tracking: +t.tracking.toFixed(3) }
}

function brandBlock() {
  const mk = (o) => { const b = badge({ id: '__ID__', ...o }); return tight(`<defs>${b.defs}</defs>${b.body}`) }
  const badgeFull = mk({ tile: 'none', mark: true, weave: false, glowSlot: true, shadow: false })
  const glowLayer = tight(badge({ id: '__ID__', tile: 'none', glow: true }).glowLayer)
  const [tipX, tipY] = kAbs(150, -34)
  const kw = 170 * K_T.s, kh = 254 * K_T.s
  const geo = {
    box: { x: 56, y: 56, w: 400, h: 400 },
    kBox: { x: +(K_T.x - 4).toFixed(1), y: +(K_T.y - 34 * K_T.s - 4).toFixed(1), w: +(kw + 8).toFixed(1), h: +(kh + 8).toFixed(1) },
    flameTip: { x: +((tipX - 56) / 400).toFixed(4), y: +((tipY - 56) / 400).toFixed(4) },
    stemTop: { x: +((K_T.x + 21 * K_T.s - 56) / 400).toFixed(4), y: +((K_T.y - 56) / 400).toFixed(4) },
    hex: { circumradius: HX.R0 / 400, innerRadius: RIM.R3 / 400 }, // 0..1 of the box height, for tick rings and orbit paths
  }
  const colors = Object.fromEntries(Object.entries({ void: P.void, carbon0: P.c0, carbon1: P.c1, carbon2: P.c2, carbon3: P.c3, carbon4: P.c4, ink: P.ink, ink2: P.ink2, ink3: P.ink3, ignite1: P.i1, ignite2: P.i2, ignite3: P.i3, ti1: P.t1, ti2: P.t2, ti3: P.t3, ti4: P.t4 }))
  const tag = taglineUnits()
  const J = JSON.stringify
  return `/* @generated:begin — scripts/make-icons.mjs · do not edit */
const MARK = {
  badge: ${J(badgeFull)},
  mono: ${J(monoMarkup())},
  glow: ${J(glowLayer)},
}
const WORDMARK = { w: ${WORDMARK.w}, h: ${WORDMARK.h}, d: ${J(compactPath(WORDMARK.d, 0))} }
const TAGLINE = { cap: ${tag.cap}, desc: ${tag.desc}, main: ${J(tag.main)}, emph: ${J(tag.emph)} }

/** 0..1 coordinates are fractions of the Mark's box (square, hexagon point-to-point tall). */
export const MARK_GEOMETRY = ${J(geo, null, 2)}

export const BRAND = {
  name: 'KIND',
  tagline: 'Raising goDs. Building nations.',
  taglineCaps: 'RAISING goDs · BUILDING NATIONS',
  colors: ${J(colors)},
  metal: ${J([[0, P.t1], [0.55, P.t2], [1, mix(P.t2, P.t3, 0.55)]])},
}
/* @generated:end */`
}

const JSX_PATH = join(ROOT, 'src/art/Brand.jsx')
function brandJsx() {
  const cur = readFileSync(JSX_PATH, 'utf8')
  const a = cur.indexOf('/* @generated:begin'), b = cur.indexOf('/* @generated:end */')
  if (a < 0 || b < 0) throw new Error('Brand.jsx is missing its @generated markers')
  return Buffer.from(cur.slice(0, a) + brandBlock() + cur.slice(b + '/* @generated:end */'.length))
}
job('jsx', 'src/art/Brand.jsx', async () => brandJsx())
