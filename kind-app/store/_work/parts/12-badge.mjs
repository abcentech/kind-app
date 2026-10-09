// ───────────────────────────────────────────────────────────────────────────
// 3 · the badge (SVG fragment builder)
// ───────────────────────────────────────────────────────────────────────────
// id        unique prefix for every gradient/filter/clip (so many badges can share a page)
// tile      'rounded' (any-purpose app icon) | 'full' (square, full-bleed) | 'none' (free-standing object)
// scale     hex scale about the centre (maskable art sits at .98 so every vertex clears the 80 % safe circle)
// detail    'full' | 'lite'  — lite drops ticks, hairlines, flame core and the K bevel (< ~56 px renders)
// weave     carbon-weave texture on the tile and plate (≥ 384 px renders only)
// glow      ember glow behind the K · glowSlot emits a marker instead, for the JSX component to fill at run time
// only      'k' → just the K (and what it needs)
function badge({ id = 'b', tile = 'rounded', scale = 1, detail = 'full', weave = detail === 'full', glow = false, glowSlot = false, shadow = tile !== 'none', halo = false, only = null, kShadow = true, mark = false } = {}) {
  const { cx, cy } = HX
  const full = detail === 'full' || mark // mark: emit everything, wrapping the detail-only parts so the component can strip them at run time
  const F = (x) => (mark ? `<!--@full-->${x}<!--@/full-->` : x)
  const u = (n) => `${id}-${n}`
  const L = -105 // light azimuth (deg): from above, a touch left
  const light = (n) => 0.5 + 0.5 * Math.cos(rad(n - L))
  const onlyK = only === 'k'
  const kx0 = K_T.x, ky1 = K_T.y + 220 * K_T.s
  const [tipX, tipY] = kAbs(150, -34)
  const kT = `translate(${K_T.x} ${K_T.y}) scale(${K_T.s})`
  const gs = (a, b) => `${a}${b}`

  // ── defs (only what the chosen options use)
  const d = []
  const kd = [] // everything the K needs (the component builds the K-only mark from this region)
  kd.push(`<linearGradient id="${u('ig')}" gradientUnits="userSpaceOnUse" x1="${f2(kx0 + 20)}" y1="${f2(ky1)}" x2="${f2(tipX + 10)}" y2="${f2(tipY)}"><stop offset="0" stop-color="${P.i1}"/><stop offset=".56" stop-color="${P.i2}"/><stop offset="1" stop-color="${P.i3}"/></linearGradient>`)
  kd.push(`<linearGradient id="${u('sheen')}" gradientUnits="userSpaceOnUse" x1="0" y1="${f2(K_T.y - 34)}" x2="0" y2="${f2(K_T.y + 150)}"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`)
  kd.push(`<clipPath id="${u('kClip')}"><path transform="${kT}" d="${K_LOCAL.body}"/></clipPath>`)
  kd.push(`<filter id="${u('blur8')}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter>`)
  if (full) {
    const fd = []
    fd.push(`<linearGradient id="${u('core')}" gradientUnits="userSpaceOnUse" x1="${f2(kx0 + 100 * K_T.s)}" y1="${f2(K_T.y + 90 * K_T.s)}" x2="${f2(kx0 + 140 * K_T.s)}" y2="${f2(K_T.y - 6 * K_T.s)}"><stop offset="0" stop-color="${P.i3}" stop-opacity="0"/><stop offset=".45" stop-color="${P.i3}" stop-opacity=".55"/><stop offset="1" stop-color="${P.g1}" stop-opacity=".95"/></linearGradient>`)
    fd.push(`<linearGradient id="${u('shade')}" gradientUnits="userSpaceOnUse" x1="0" y1="${f2(K_T.y + 120 * K_T.s)}" x2="0" y2="${f2(K_T.y + 224 * K_T.s)}"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".10"/></linearGradient>`)
    fd.push(`<linearGradient id="${u('edge')}" gradientUnits="userSpaceOnUse" x1="0" y1="${f2(K_T.y - 34)}" x2="0" y2="${f2(K_T.y + 230)}"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".35" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`)
    fd.push(`<filter id="${u('blur1')}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter>`)
    kd.push(F(fd.join('')))
  }
  if (shadow || glow || glowSlot) kd.push(`<filter id="${u('blur14')}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>`)
  d.push(mark ? `<!--@kd-->${kd.join('')}<!--@/kd-->` : kd.join(''))
  if (!onlyK) {
    d.push(`<linearGradient id="${u('ti')}" gradientUnits="userSpaceOnUse" x1="${f2(cx - 60)}" y1="${f2(cy - 200)}" x2="${f2(cx + 60)}" y2="${f2(cy + 200)}"><stop offset="0" stop-color="${P.t1}"/><stop offset=".34" stop-color="${P.t2}"/><stop offset=".62" stop-color="${P.t4}"/><stop offset="1" stop-color="${P.t2}"/></linearGradient>`)
    d.push(`<linearGradient id="${u('plate')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.c2}"/><stop offset=".6" stop-color="${P.c1}"/><stop offset="1" stop-color="${P.c0}"/></linearGradient>`)
    d.push(`<radialGradient id="${u('plateLight')}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy - 70}" r="190"><stop offset="0" stop-color="${P.c4}" stop-opacity=".55"/><stop offset="1" stop-color="${P.c4}" stop-opacity="0"/></radialGradient>`)
    d.push(`<radialGradient id="${u('bloom')}" gradientUnits="userSpaceOnUse" cx="${f2(tipX - 8)}" cy="${f2(tipY + 70)}" r="130"><stop offset="0" stop-color="${P.i2}" stop-opacity=".26"/><stop offset=".55" stop-color="${P.i1}" stop-opacity=".07"/><stop offset="1" stop-color="${P.i1}" stop-opacity="0"/></radialGradient>`)
    d.push(`<clipPath id="${u('plateClip')}"><polygon points="${hexPoints(cx, cy, RIM.R3)}"/></clipPath>`)
    if (tile !== 'none') d.push(`<radialGradient id="${u('tile')}" cx="50%" cy="26%" r="78%"><stop offset="0" stop-color="${P.c3}"/><stop offset=".5" stop-color="${P.c1}"/><stop offset="1" stop-color="${P.c0}"/></radialGradient>`)
    if (halo) d.push(`<radialGradient id="${u('halo')}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${RIM.R0 * 1.9}"><stop offset=".35" stop-color="${P.i2}" stop-opacity=".11"/><stop offset=".6" stop-color="${P.tele2}" stop-opacity=".05"/><stop offset="1" stop-color="${P.tele2}" stop-opacity="0"/></radialGradient>`)
    if (weave) d.push(`<pattern id="${u('weave')}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#fff" fill-opacity=".026"/><rect x="4" width="4" height="4" fill="#000" fill-opacity=".13"/><rect y="4" width="4" height="4" fill="#000" fill-opacity=".09"/><rect x="4" y="4" width="4" height="4" fill="#fff" fill-opacity=".012"/></pattern>`)
  }
  const defs = d.join('\n    ')

  // ── tile
  let tileSvg = ''
  if (tile === 'rounded') tileSvg = `<rect width="512" height="512" rx="115" fill="url(#${u('tile')})"/>${weave ? `<rect width="512" height="512" rx="115" fill="url(#${u('weave')})"/>` : ''}<rect x=".75" y=".75" width="510.5" height="510.5" rx="114.25" fill="none" stroke="${rgba(P.t1, 0.1)}" stroke-width="1.5"/>`
  if (tile === 'full') tileSvg = `<rect width="512" height="512" fill="url(#${u('tile')})"/>${weave ? `<rect width="512" height="512" fill="url(#${u('weave')})"/>` : ''}`

  // ── rim: six facets outside, six inside, a flat titanium band between (light from above, a touch left)
  const facets = []
  const level = [RIM.R0, RIM.R1, RIM.R2, RIM.R3]
  for (let i = 0; i < 6; i++) {
    const nOut = -60 + 60 * i
    const bOut = light(nOut), bIn = light(nOut + 180)
    const quad = (Ra, Rb) => pts([hexV(cx, cy, Ra, i), hexV(cx, cy, Ra, i + 1), hexV(cx, cy, Rb, i + 1), hexV(cx, cy, Rb, i)])
    facets.push(`<polygon points="${quad(level[0], level[1])}" fill="${metal(0.18 + 0.82 * bOut ** 1.4)}"/>`)
    facets.push(`<polygon points="${quad(level[2], level[3])}" fill="${metal(0.1 + 0.74 * bIn ** 1.5)}"/>`)
  }
  const hair = []
  if (full) for (let i = 0; i < 6; i++) {
    const b = light(-60 + 60 * i)
    const [x1, y1] = hexV(cx, cy, RIM.R0 - 0.6, i), [x2, y2] = hexV(cx, cy, RIM.R0 - 0.6, i + 1)
    hair.push(`<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="#fff" stroke-opacity="${f2(Math.max(0, (b - 0.42) * 0.95))}" stroke-width="1.6"/>`)
  }
  const hairSvg = hair.length ? F(hair.join('')) : ''
  const rim = `<g class="brand-mark__rim">
    <polygon points="${hexPoints(cx, cy, RIM.R0)}" fill="url(#${u('ti')})"/>
    ${facets.join('')}
    <polygon points="${hexPoints(cx, cy, (RIM.R1 + RIM.R2) / 2)}" fill="none" stroke="url(#${u('ti')})" stroke-width="${f2(apo(RIM.R1) - apo(RIM.R2))}" stroke-linejoin="miter"/>
    ${hairSvg}</g>`

  // ── instrument ticks: the Ignition ring, 60 of them, set into the bezel
  const ticks = []
  if (full) {
    const Rt = RIM.R3 - 9
    for (let i = 0; i < 6; i++) for (let j = 0; j < 10; j++) {
      const t = j / 10
      const [ax, ay] = hexV(cx, cy, Rt, i), [bx, by] = hexV(cx, cy, Rt, i + 1)
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t
      const ex = bx - ax, ey = by - ay, em = Math.hypot(ex, ey)
      let inx = -ey / em, iny = ex / em
      if (inx * (cx - x) + iny * (cy - y) < 0) { inx = -inx; iny = -iny } // always toward the centre
      const len = j === 0 ? 13 : 7
      ticks.push(`M${f2(x)} ${f2(y)}l${f2(inx * len)} ${f2(iny * len)}`)
    }
  }
  const tickSvg = ticks.length ? F(`<path class="brand-mark__ticks" d="${ticks.join('')}" stroke="${P.t3}" stroke-opacity=".5" stroke-width="1.8" fill="none"/>`) : ''

  // ── plate: carbon, lit from above, warmed by the flame
  const plate = `<g class="brand-mark__plate">
    <polygon points="${hexPoints(cx, cy, RIM.R3)}" fill="url(#${u('plate')})"/>
    <g clip-path="url(#${u('plateClip')})">
      <rect width="512" height="512" fill="url(#${u('plateLight')})"/>
      ${weave ? `<rect width="512" height="512" fill="url(#${u('weave')})"/>` : ''}
      <rect width="512" height="512" fill="url(#${u('bloom')})"/>
      ${tickSvg}
      <polygon points="${hexPoints(cx, cy, RIM.R3 + 2)}" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="10" filter="url(#${u('blur8')})"/>
    </g>
    <polygon points="${hexPoints(cx, cy, RIM.R3)}" fill="none" stroke="${P.void}" stroke-opacity=".9" stroke-width="1.5"/></g>`

  // ── the K, and the flame core inside its lick
  const kInner = `<g class="brand-mark__k">
    ${kShadow ? `<g filter="url(#${u('blur8')})" opacity=".7"><path transform="translate(${K_T.x} ${K_T.y + 9}) scale(${K_T.s})" d="${K_LOCAL.body}" fill="#000"/></g>` : ''}
    <path transform="${kT}" d="${K_LOCAL.body}" fill="url(#${u('ig')})"/>
    <g clip-path="url(#${u('kClip')})"><rect y="${f2(K_T.y - 40)}" width="512" height="200" fill="url(#${u('sheen')})"/></g>
    ${full ? F(`<path transform="${kT}" d="${K_LOCAL.body}" fill="none" stroke="url(#${u('edge')})" stroke-width="3.2" stroke-linejoin="round" clip-path="url(#${u('kClip')})"/>
    <g clip-path="url(#${u('kClip')})"><rect y="${f2(K_T.y + 110 * K_T.s)}" width="512" height="200" fill="url(#${u('shade')})"/></g>
    <path class="brand-mark__flame" transform="${kT}" d="${K_LOCAL.core}" fill="url(#${u('core')})" filter="url(#${u('blur1')})"/>`) : ''}</g>`

  const k = mark ? `<!--@k-->${kInner}<!--@/k-->` : kInner
  const glowLayer = `<g class="brand-mark__glow" filter="url(#${u('blur14')})" opacity="__OP__"><path transform="${kT}" d="${K_LOCAL.body}" fill="${P.i2}"/></g>`
  const kGlow = glowSlot ? '<!--@glow-->' : glow ? glowLayer.replace('__OP__', '.85') : ''

  if (onlyK) return { defs, body: kGlow + k, glowLayer }

  const haloSvg = halo ? `<circle cx="${cx}" cy="${cy}" r="${RIM.R0 * 1.9}" fill="url(#${u('halo')})"/>` : ''
  const shadowSvg = shadow ? `<g filter="url(#${u('blur14')})" opacity=".75"><polygon transform="translate(0 14)" points="${hexPoints(cx, cy, RIM.R0 - 2)}" fill="#000"/></g>` : ''
  const body = `${tileSvg}${haloSvg}<g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})">${shadowSvg}${rim}${plate}${kGlow}${k}</g>`
  return { defs, body, glowLayer }
}

const svgDoc = (w, h, vb, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${inner}</svg>`
const iconSvg = (size, opts) => { const b = badge(opts); return svgDoc(size, size, '0 0 512 512', `<defs>${b.defs}</defs>${b.body}`) }
