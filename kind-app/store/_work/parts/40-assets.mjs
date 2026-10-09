// ───────────────────────────────────────────────────────────────────────────
// 7b · favicon art — drawn for 16 px, not scaled down from the badge
// ───────────────────────────────────────────────────────────────────────────
// The hexagon IS the icon here (no tile), the rim is a plain titanium band, the K is fattened with a round-joined
// stroke so its stem still lands on a whole pixel column at 16.
function faviconSvg(size = 64) {
  const R = 31.4, ring = 4.2, cx = 32, cy = 32
  const Rin = fromApo(apo(R) - ring)
  const s = 0.125, kx = 32.4 - 85 * s, ky = 32.2 - 93 * s
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="f-ti" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.t1}"/><stop offset=".5" stop-color="${P.t2}"/><stop offset="1" stop-color="${P.t3}"/></linearGradient>
    <linearGradient id="f-pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.c2}"/><stop offset="1" stop-color="${P.c0}"/></linearGradient>
    <linearGradient id="f-ig" gradientUnits="userSpaceOnUse" x1="20" y1="226" x2="150" y2="-40"><stop offset="0" stop-color="${P.i1}"/><stop offset=".55" stop-color="${P.i2}"/><stop offset="1" stop-color="${P.i3}"/></linearGradient>
  </defs>
  <polygon points="${hexPoints(cx, cy, R)}" fill="url(#f-ti)"/>
  <polygon points="${hexPoints(cx, cy, Rin)}" fill="url(#f-pl)"/>
  <g transform="translate(${f2(kx)} ${f2(ky)}) scale(${s})"><path d="${K_LOCAL.body}" fill="url(#f-ig)" stroke="url(#f-ig)" stroke-width="10" stroke-linejoin="round"/></g>
</svg>`
}

// PNG-in-ICO (Vista+; every browser). entries: [{ size, png }]
function icoFile(entries) {
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4)
  let off = 6 + entries.length * 16
  const dir = entries.map(({ size, png }) => {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size; e[1] = size >= 256 ? 0 : size; e[2] = 0; e[3] = 0
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(png.length, 8); e.writeUInt32LE(off, 12)
    off += png.length
    return e
  })
  return Buffer.concat([head, ...dir, ...entries.map((e) => e.png)])
}

// ───────────────────────────────────────────────────────────────────────────
// 8 · the job list — every file this script owns
// ───────────────────────────────────────────────────────────────────────────
// iOS portrait startup images: [css-width, css-height, dpr, example devices]
const SPLASH = [
  [440, 956, 3, 'iPhone 16 Pro Max, 17 Pro Max'],
  [420, 912, 3, 'iPhone Air'],
  [402, 874, 3, 'iPhone 16 Pro, 17, 17 Pro'],
  [430, 932, 3, 'iPhone 16 Plus, 15 Plus, 15 Pro Max, 14 Pro Max'],
  [393, 852, 3, 'iPhone 16, 15, 15 Pro, 14 Pro'],
  [428, 926, 3, 'iPhone 14 Plus, 13 Pro Max, 12 Pro Max'],
  [390, 844, 3, 'iPhone 14, 13, 13 Pro, 12, 12 Pro'],
  [414, 896, 3, 'iPhone 11 Pro Max, XS Max'],
  [414, 896, 2, 'iPhone 11, XR'],
  [375, 812, 3, 'iPhone 13 mini, 12 mini, 11 Pro, XS, X'],
  [414, 736, 3, 'iPhone 8 Plus, 7 Plus, 6s Plus'],
  [375, 667, 2, 'iPhone SE (2nd/3rd gen), 8, 7, 6s'],
  [320, 568, 2, 'iPhone SE (1st gen), 5s'],
  [1032, 1376, 2, 'iPad Pro 13" (M4)'],
  [1024, 1366, 2, 'iPad Pro 12.9"'],
  [834, 1210, 2, 'iPad Pro 11" (M4)'],
  [834, 1194, 2, 'iPad Pro 11" (1st-4th gen)'],
  [834, 1112, 2, 'iPad Pro 10.5", iPad Air (3rd gen)'],
  [820, 1180, 2, 'iPad Air 10.9" / 11", iPad (10th gen)'],
  [810, 1080, 2, 'iPad 10.2"'],
  [744, 1133, 2, 'iPad mini (6th gen+)'],
  [768, 1024, 2, 'iPad 9.7", iPad mini (5th gen)'],
]
const splashName = (w, h, d) => `apple-splash-${w * d}x${h * d}.png`

async function raster(svg, { grain = false, palette = false, colors = 256, dither = 1 } = {}) {
  let buf = await sharp(Buffer.from(svg)).png().toBuffer()
  if (grain) buf = await sharp(buf).composite([{ input: await grainTile(), tile: true, blend: 'soft-light' }]).png().toBuffer()
  return sharp(buf).png(palette ? { palette: true, colours: colors, dither, effort: 10, compressionLevel: 9 } : { compressionLevel: 9, effort: 10 }).toBuffer()
}

// 128 colours + grain: the grain dithers the dark gradients (no banding) and the palette keeps each file ~200–400 KB
const SPLASH_OPTS = { grain: true, palette: true, colors: 128 }
const JOBS = []
const job = (group, path, make) => JOBS.push({ group, path, make })

// app icons ------------------------------------------------------------
job('icons', 'public/icon.svg', async () => Buffer.from(iconSvg(512, { id: 'k', tile: 'rounded' })))
job('icons', 'public/icon-192.png', () => raster(iconSvg(192, { tile: 'rounded', weave: false })))
job('icons', 'public/icon-512.png', () => raster(iconSvg(512, { tile: 'rounded' })))
job('icons', 'public/icon-maskable-512.png', () => raster(iconSvg(512, { tile: 'full', scale: 0.98 })))
job('icons', 'public/icon-monochrome-512.png', () => raster(monoSvg(512, '#ffffff')))
job('icons', 'public/apple-touch-icon.png', () => raster(iconSvg(180, { tile: 'full', weave: false })))
job('icons', 'public/favicon.svg', async () => Buffer.from(faviconSvg(64)))
job('icons', 'public/favicon-32.png', () => raster(faviconSvg(32)))
job('icons', 'public/favicon.ico', async () => icoFile(await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await raster(faviconSvg(size)) })))))

// social ---------------------------------------------------------------
job('social', 'public/og.png', () => once('og', () => raster(socialSvg(1200, 630), { grain: true, palette: true })))
job('social', 'public/og-twitter.png', () => raster(socialSvg(1200, 600), { grain: true, palette: true }))

// Play Store ------------------------------------------------------------
job('store', 'store/icon-512.png', () => raster(iconSvg(512, { tile: 'full', scale: 0.98 })))
job('store', 'store/feature-graphic-1024x500.png', () => once('fg', () => raster(featureSvg(1024, 500), { grain: true })))

// iOS startup images -------------------------------------------------------
const SPLASH_ONLY = (ARGS.find((a) => a.startsWith('--splash=')) || '').slice(9)
for (const [w, h, d] of SPLASH.filter(([w]) => !SPLASH_ONLY || String(w) === SPLASH_ONLY)) job('splash', `public/splash/${splashName(w, h, d)}`, () => raster(splashSvg(w * d, h * d), SPLASH_OPTS))
