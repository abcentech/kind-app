// ───────────────────────────────────────────────────────────────────────────
// 6 · compositions — social cards, Play feature graphic, iOS splash
// ───────────────────────────────────────────────────────────────────────────
// A line of display type as outlines.  anchor: start | middle | end — measured on ink, not advance.
function textBlock(text, { weight = 700, size = 60, tracking = 0, x = 0, y = 0, anchor = 'start', fill = P.ink, opacity = 1, optical = null, gradient = null }) {
  const o = textOutline(text, { weight, size, tracking, optical })
  const dx = anchor === 'middle' ? x - (o.x0 + o.x1) / 2 : anchor === 'end' ? x - o.x1 : x - o.x0
  const f = gradient ? `url(#${gradient})` : fill
  return { svg: `<path d="${shiftPath(o.d, dx, y)}" fill="${f}"${opacity < 1 ? ` fill-opacity="${opacity}"` : ''}/>`, width: o.width, x0: dx + o.x0, x1: dx + o.x1, capH: o.capH }
}

// the badge as a free-standing object, centred on (cx,cy), `height` px tall (hex point to point)
function placeBadge({ id, cx, cy, height, ...opts }) {
  const s = height / (2 * RIM.R0)
  const b = badge({ id, tile: 'none', ...opts })
  return { defs: b.defs, body: `<g transform="translate(${f2(cx - 256 * s)} ${f2(cy - 256 * s)}) scale(${f2(s * 1000) / 1000})">${b.body}</g>` }
}
// KIND wordmark: x0 = left ink edge, y0 = cap top, capH = cap height in px
function placeWordmark({ x0, y0, capH, fill = 'url(#wm-metal)', anchor = 'start' }) {
  const k = capH / CAP, w = WORDMARK.w * k
  const left = anchor === 'middle' ? x0 - w / 2 : anchor === 'end' ? x0 - w : x0
  return { svg: `<path transform="translate(${f2(left)} ${f2(y0)}) scale(${f2(k * 10000) / 10000})" d="${WORDMARK.d}" fill="${fill}"/>`, w, left }
}
const WM_DEFS = `<linearGradient id="wm-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.t1}"/><stop offset=".55" stop-color="${P.t2}"/><stop offset="1" stop-color="${mix(P.t2, P.t3, 0.55)}"/></linearGradient>`

const TAGLINE = 'RAISING goDs · BUILDING NATIONS'
// tagline justified to a given ink width: pick the tracking that lands exactly on it (size fixed).
// "goDs" is set one step brighter than the rest — the brand's one typographic accent.
const EMPH = [TAGLINE.indexOf('goDs'), TAGLINE.indexOf('goDs') + 4]
function fitTagline(width, { size, weight = 600, x = 0, y = 0, anchor = 'start', fill = P.ink2, emphFill = P.ink }) {
  let lo = 0, hi = 1.2
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (textOutline(TAGLINE, { weight, size, tracking: m }).width < width) lo = m; else hi = m }
  const tracking = (lo + hi) / 2
  const o = textOutline(TAGLINE, { weight, size, tracking })
  const dx = anchor === 'middle' ? x - (o.x0 + o.x1) / 2 : anchor === 'end' ? x - o.x1 : x - o.x0
  const main = o.parts.filter((_, i) => i < EMPH[0] || i >= EMPH[1]).join('')
  const emph = o.parts.slice(EMPH[0], EMPH[1]).join('')
  return { svg: `<path d="${shiftPath(main, dx, y)}" fill="${fill}"/><path d="${shiftPath(emph, dx, y)}" fill="${emphFill}"/>`, tracking, width: o.width, main, emph, o }
}

// Shared night-sky ground: void → carbon, grain added after rasterising.
function sky({ id, w, h, topFade = 0 }) {
  return `<linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.void}"/><stop offset=".55" stop-color="${P.c0}"/><stop offset="1" stop-color="${mix(P.c0, P.c1, 0.8)}"/></linearGradient>
    <radialGradient id="${id}-v" cx="50%" cy="38%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>`
}

// 1200×630 Open Graph / 1200×600 Twitter: badge on the horizon, the line beneath it
function socialSvg(w, h) {
  const id = 'so'
  const st = starfield({ w, h, seed: 5, horizon: h * 0.78, density: 1.1, bright: 9, band: { cx: w * 0.28, cy: h * 0.3, rot: -22, len: w * 1.0, thick: h * 0.075 } })
  const lm = limb({ id: 'oglm', w, h, top: h * 0.885, r: w * 1.5, sunX: w * 0.58, glow: 1 })
  const mk = placeBadge({ id: 'ogb', cx: w / 2, cy: h * 0.325, height: h * 0.5, glow: false, halo: true })
  const head = textBlock('Raising goDs. Building nations.', { weight: 700, size: h * 0.112, x: w / 2, y: h * 0.735, anchor: 'middle', fill: P.ink })
  const eyebrow = textBlock('KIDS INSPIRING NATION  ·  DAILY FAMILY DEVOTIONAL', { weight: 600, size: h * 0.034, tracking: 0.34, x: w / 2, y: h * 0.79, anchor: 'middle', fill: P.ink3 })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>${sky({ id, w, h })}${st.defs}${lm.defs}${mk.defs}${WM_DEFS}</defs>
    <rect width="${w}" height="${h}" fill="url(#${id}-g)"/>
    ${st.body}${lm.body}${mk.body}
    ${head.svg}${eyebrow.svg}
    <rect width="${w}" height="${h}" fill="url(#${id}-v)"/>
  </svg>`
}

// 1024×500 Google Play feature graphic: lockup left-of-centre, horizon across the foot. Keep the key content inside the centre ~70 %.
function featureSvg(w = 1024, h = 500) {
  const id = 'fg'
  const st = starfield({ w, h, seed: 23, horizon: h * 0.8, density: 1.0, bright: 7, band: { cx: w * 0.7, cy: h * 0.25, rot: -18, len: w * 0.95, thick: h * 0.08 } })
  const lm = limb({ id: 'fglm', w, h, top: h * 0.88, r: w * 1.4, sunX: w * 0.76, glow: 0.9 })
  const mk = placeBadge({ id: 'fgb', cx: w * 0.255, cy: h * 0.47, height: h * 0.66, halo: true })
  const capH = h * 0.3, wmx = w * 0.455, y0 = h * 0.26
  const wm = placeWordmark({ x0: wmx, y0, capH })
  const tag = fitTagline(wm.w, { size: h * 0.04, x: wmx, y: y0 + capH + h * 0.115, fill: P.ink2 })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>${sky({ id, w, h })}${st.defs}${lm.defs}${mk.defs}${WM_DEFS}</defs>
    <rect width="${w}" height="${h}" fill="url(#${id}-g)"/>
    ${st.body}${lm.body}${mk.body}
    ${wm.svg}${tag.svg}
    <rect width="${w}" height="${h}" fill="url(#${id}-v)"/>
  </svg>`
}

// iOS startup image: the badge on a carbon field, a faint dawn on the horizon.  Portrait w×h in device pixels.
function splashSvg(w, h) {
  const id = 'sp'
  const base = Math.min(w, h * 0.56)
  const st = starfield({ w, h, seed: 3, horizon: h * 0.8, density: 0.55, bright: 4 })
  const lm = limb({ id: 'splm', w, h, top: h * 0.905, r: w * 1.6, sunX: w * 0.5, glow: 0.55, lights: false })
  const markH = base * 0.42
  const cy = h * 0.435
  const mk = placeBadge({ id: 'spb', cx: w / 2, cy, height: markH, halo: true })
  const capH = markH * 0.13
  const wm = placeWordmark({ x0: w / 2, y0: cy + markH / 2 + markH * 0.16, capH, anchor: 'middle' })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>${sky({ id, w, h })}${st.defs}${lm.defs}${mk.defs}${WM_DEFS}</defs>
    <rect width="${w}" height="${h}" fill="url(#${id}-g)"/>
    ${st.body}${lm.body}${mk.body}${wm.svg}
    <rect width="${w}" height="${h}" fill="url(#${id}-v)"/>
  </svg>`
}

// ───────────────────────────────────────────────────────────────────────────
// 7 · small-size art — monochrome (Android themed icons) and the favicon
// ───────────────────────────────────────────────────────────────────────────
// Alpha-only silhouette: ring + K, no tile.  Android keeps ~61 % of the layer, so the ring sits at R=150 of 512.
function monoSvg(size = 512, color = '#fff') {
  const R = 152, ringW = 15, m = R / RIM.R0
  const ring = `<path fill-rule="evenodd" d="M${hexPoints(256, 256, R).replace(/ /g, 'L')}ZM${hexPoints(256, 256, fromApo(apo(R) - ringW)).replace(/ /g, 'L')}Z" fill="${color}"/>`
  const kScale = m * 1.12
  return svgDoc(size, size, '0 0 512 512', `${ring}<g transform="translate(256 256) scale(${f2(kScale * 1000) / 1000}) translate(-256 -256)"><path transform="translate(${K_T.x} ${K_T.y}) scale(${K_T.s})" d="${K_LOCAL.body}" fill="${color}"/></g>`)
}
