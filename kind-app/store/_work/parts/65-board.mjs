// ───────────────────────────────────────────────────────────────────────────
// 11b · the brand board — one picture of the whole identity (store/brand-board.png), for people, not for the app
// ───────────────────────────────────────────────────────────────────────────
const _memo = new Map()
const once = (k, f) => { if (!_memo.has(k)) _memo.set(k, f()); return _memo.get(k) }
const rrect = (w, h, r, fill = '#fff') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="${fill}"/></svg>`)
const circleMask = (n) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}"><circle cx="${n / 2}" cy="${n / 2}" r="${n / 2}" fill="#fff"/></svg>`)
const masked = async (buf, n, maskBuf) => sharp(buf).resize(n, n).ensureAlpha().composite([{ input: maskBuf, blend: 'dest-in' }]).png().toBuffer()

async function boardPng() {
  const W = 2400, H = 1500
  const lab = (t, x, y, anchor = 'start', fill = P.ink3, size = 16) => textBlock(t, { weight: 600, size, tracking: 0.3, x, y, anchor, fill }).svg
  const panel = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="url(#bd-panel)" stroke="${rgba(P.t2, 0.14)}" stroke-width="1.5"/>`
  const st = starfield({ w: W, h: H, seed: 77, horizon: H * 0.85, density: 0.75, bright: 12, band: { cx: W * 0.55, cy: H * 0.3, rot: -14, len: W * 1.1, thick: H * 0.09 } })
  // the stack lockup, drawn here with the same primitives the app uses
  const mk = placeBadge({ id: 'bdm', cx: 1200, cy: 370, height: 300, halo: true })
  const wm = placeWordmark({ x0: 1200, y0: 545, capH: 170, anchor: 'middle' })
  const tg = fitTagline(wm.w, { size: 22, x: wm.left, y: 545 + 170 + 78, fill: P.ink2 })

  const items = []
  const put = (input, left, top) => items.push({ input, left: Math.round(left), top: Math.round(top) })

  // A · hero icon
  put(await raster(iconSvg(540, { tile: 'rounded' })), 160, 200)
  // C · size ladder (app-icon art ≥ 64, the dedicated favicon art below that) + masks
  let lx = 1668
  for (const [s, fav] of [[128, false], [96, false], [64, false], [48, true], [32, true], [16, true]]) {
    put(await raster(fav ? faviconSvg(s) : iconSvg(s, { tile: 'rounded', weave: false })), lx, 410 - s)
    lx += s + 22
  }
  const maskable = await raster(iconSvg(512, { tile: 'full', scale: 0.98 }))
  const mono = await raster(monoSvg(512, '#ffffff'))
  put(await masked(maskable, 132, circleMask(132)), 1668, 560)
  put(await masked(maskable, 132, rrect(132, 132, 44)), 1830, 560)
  put(await masked(maskable, 132, rrect(132, 132, 16)), 1992, 560)
  // themed icon: the monochrome art tinted by the system
  const tint = async (fg, bg) => {
    const monoN = await sharp(mono).resize(132, 132).png().toBuffer()
    const sil = await sharp({ create: { width: 132, height: 132, channels: 4, background: fg } }).composite([{ input: monoN, blend: 'dest-in' }]).png().toBuffer()
    return sharp(rrect(132, 132, 66, bg)).composite([{ input: sil }]).png().toBuffer()
  }
  put(await tint(P.tele, P.c3), 2154, 560)
  // C2 · the maskable safe zone, and the favicon in a tab (dark + light)
  put(await sharp(maskable).resize(210, 210).png().toBuffer(), 1668, 650)
  put(await raster(faviconSvg(16)), 1982, 684)
  put(await raster(faviconSvg(16)), 1982, 774)
  const tabs = `<g>
    <path fill-rule="evenodd" d="M1668 650h210v210h-210zM1773 755m-84 0a84 84 0 1 0 168 0a84 84 0 1 0 -168 0z" fill="#000" fill-opacity=".62"/>
    <circle cx="1773" cy="755" r="84" fill="none" stroke="${P.tele}" stroke-opacity=".8" stroke-dasharray="6 5" stroke-width="1.6"/>
    ${lab('80 % SAFE CIRCLE', 1773, 884, 'middle', P.ink3, 14)}
    <rect x="1950" y="664" width="330" height="62" rx="14" fill="#202124"/><rect x="1966" y="676" width="230" height="38" rx="10" fill="#35363a"/>
    <rect x="1950" y="754" width="330" height="62" rx="14" fill="#dee1e6"/><rect x="1966" y="766" width="230" height="38" rx="10" fill="#ffffff"/>
    ${textBlock('KIND — Daily Family Devotional', { weight: 600, size: 15, x: 2008, y: 701, fill: '#e8eaed' }).svg}
    ${textBlock('KIND — Daily Family Devotional', { weight: 600, size: 15, x: 2008, y: 791, fill: '#202124' }).svg}
    ${lab('FAVICON · 16 PX · DARK AND LIGHT TABS', 2115, 884, 'middle', P.ink3, 14)}
  </g>`
  // D · a home screen: the icon among quiet neighbours (generic shapes, no real apps)
  const hsX = 130, hsY = 1000
  const neighbours = [P.c3, P.c4, mix(P.c4, P.tele2, 0.25), P.c3, mix(P.c3, P.t3, 0.3), P.c4, mix(P.c4, P.t3, 0.25), P.c3, mix(P.c3, P.tele2, 0.2), P.c4, P.c3]
  let ni = 0
  const homeIcons = []
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
    const x = hsX + 52 + c * 164, y = hsY + 70 + r * 196
    if (r === 0 && c === 2) { put(await raster(iconSvg(116, { tile: 'rounded', weave: false })), x, y); homeIcons.push(lab('KIND', x + 58, y + 150, 'middle', P.ink, 17)); continue }
    const tone = neighbours[ni++ % neighbours.length]
    const g = (ni % 3 === 0) ? `<circle cx="58" cy="58" r="20" fill="none" stroke="${P.ink4}" stroke-width="5"/>` : (ni % 3 === 1) ? `<rect x="40" y="40" width="36" height="36" rx="8" fill="${P.ink4}"/>` : `<path d="M36 76L58 36L80 76Z" fill="${P.ink4}"/>`
    put(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="116" height="116"><defs><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(tone, '#ffffff', 0.05)}"/><stop offset="1" stop-color="${mix(tone, P.void, 0.5)}"/></linearGradient></defs><rect width="116" height="116" rx="26" fill="url(#n)"/>${g}</svg>`), x, y)
    homeIcons.push(lab('APP', x + 58, y + 150, 'middle', P.ink4, 15))
  }
  // E · social + store art
  put(await sharp(await once('og', () => raster(socialSvg(1200, 630), { grain: true, palette: true }))).resize(590, 310).png().toBuffer(), 1092, 1034)
  put(await sharp(await once('fg', () => raster(featureSvg(1024, 500), { grain: true }))).resize(590, 288).png().toBuffer(), 1708, 1034)
  // palette
  const chips = [[P.c0, 'carbon-0'], [P.c2, 'carbon-2'], [P.c4, 'carbon-4'], [P.t1, 'ti-1'], [P.t3, 'ti-3'], [P.i1, 'ignite-1'], [P.i2, 'ignite-2'], [P.i3, 'ignite-3'], [P.g1, 'gold-1'], [P.tele, 'tele']]
  const chipSvg = chips.map(([c, n], i) => `<rect x="${1092 + i * 124}" y="1372" width="108" height="30" rx="8" fill="${c}" stroke="${rgba(P.t2, 0.25)}" stroke-width="1"/>${lab(n.toUpperCase(), 1092 + i * 124 + 54, 1422, 'middle', P.ink4, 11)}`).join('')

  const hdr = placeWordmark({ x0: 160, y0: 74, capH: 28, fill: P.ink })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>${sky({ id: 'bd', w: W, h: H })}${st.defs}${mk.defs}${WM_DEFS}
      <linearGradient id="bd-panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.c2}" stop-opacity=".55"/><stop offset="1" stop-color="${P.c1}" stop-opacity=".7"/></linearGradient>
      <radialGradient id="bd-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${P.i2}" stop-opacity=".16"/><stop offset="1" stop-color="${P.i2}" stop-opacity="0"/></radialGradient>
      <linearGradient id="bd-wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(P.c1, P.tele2, 0.18)}"/><stop offset="1" stop-color="${P.c0}"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bd-g)"/>${st.body}
    <ellipse cx="430" cy="480" rx="520" ry="420" fill="url(#bd-glow)"/>
    ${panel(80, 150, 700, 760)}${panel(820, 150, 760, 760)}${panel(1620, 150, 700, 760)}${panel(80, 950, 940, 480)}${panel(1060, 950, 1260, 480)}
    <rect x="${hsX}" y="${hsY}" width="840" height="410" rx="34" fill="url(#bd-wall)" stroke="${rgba(P.t2, 0.12)}"/>
    ${hdr.svg}${lab('IDENTITY  ·  V7 ASCENT  ·  GENERATED FROM CODE', 160 + hdr.w + 36, 92, 'start', P.ink3, 17)}${lab('NODE SCRIPTS/MAKE-ICONS.MJS', 2320, 92, 'end', P.ink4, 17)}
    ${lab('APP ICON  ·  512  ·  PUBLIC/ICON.SVG', 430, 880, 'middle')}${lab('LOCKUP  ·  MARK + KIND + TAGLINE', 1200, 880, 'middle')}${lab('SIZES  ·  128 96 64 / FAVICON ART 48 32 16', 1970, 232, 'middle')}
    ${lab('MASKS  ·  CIRCLE · SQUIRCLE · ROUNDED · THEMED', 1970, 528, 'middle')}${lab('THE BADGE ON A HOME SCREEN', 550, 990, 'middle')}
    ${lab('OG  1200×630', 1092, 1010)}${lab('PLAY FEATURE GRAPHIC  1024×500', 1708, 1010)}
    ${mk.body}${wm.svg}${tg.svg}${tabs}${homeIcons.join('')}${chipSvg}
  </svg>`
  const base = await sharp(Buffer.from(svg)).png().toBuffer()
  const grain = await grainTile()
  return sharp(base).composite([...items, { input: grain, tile: true, blend: 'soft-light' }]).png({ compressionLevel: 9 }).toBuffer()
}
job('board', 'store/brand-board.png', () => boardPng())
