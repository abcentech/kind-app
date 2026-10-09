// ───────────────────────────────────────────────────────────────────────────
// 12 · Play screenshots — frame raw captures of the real app (run with --screenshots)
// ───────────────────────────────────────────────────────────────────────────
// raw/NN-slug.png → play/NN-slug.png.  Whole device in frame, caption above, starfield + horizon behind. No invented UI: the
// screen is the raw capture, untouched except for the rounded-corner mask.
async function frameScreenshot(rawBuf, caption, index = 0) {
  const meta = await sharp(rawBuf).metadata()
  const tablet = meta.width / meta.height > 0.62
  const W = tablet ? 1600 : 1080, H = tablet ? 2560 : 1920
  const k = W / 1080
  const capSize = 118 * k
  // caption: shrink to fit 86 % of the width, never above two lines' worth of height
  let cap = textBlock(caption, { weight: 700, size: capSize, x: W / 2, y: 0, anchor: 'middle' })
  const maxW = W * 0.86
  const fit = cap.width > maxW ? capSize * (maxW / cap.width) : capSize
  const capY = 250 * k
  cap = textBlock(caption, { weight: 700, size: fit, x: W / 2, y: capY, anchor: 'middle', fill: P.ink })
  const sub = textBlock('KIND  ·  DAILY FAMILY DEVOTIONAL', { weight: 600, size: 24 * k, tracking: 0.36, x: W / 2, y: capY - fit * 0.7 - 44 * k, anchor: 'middle', fill: P.ink3 })

  const bez = 14 * k, r = (tablet ? 56 : 84) * k
  const devTop = 360 * k, devBottom = H - 72 * k
  const screenH = devBottom - devTop - 2 * bez
  const screenW = Math.round((screenH * meta.width) / meta.height)
  const devW = screenW + 2 * bez, devH = screenH + 2 * bez
  const devX = Math.round((W - devW) / 2)
  const st = starfield({ w: W, h: H, seed: 40 + index, horizon: H * 0.85, density: 0.9, bright: 6 })
  const lm = limb({ id: 'sh', w: W, h: H, top: H * 0.9, r: W * 1.6, sunX: W * (0.3 + 0.4 * ((index * 0.37) % 1)), glow: 0.8, lights: false })
  const base = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>${sky({ id: 'sh', w: W, h: H })}${st.defs}${lm.defs}
      <filter id="sh-shadow" x="-20%" y="-10%" width="140%" height="130%"><feGaussianBlur stdDeviation="${f2(34 * k)}"/></filter>
      <linearGradient id="sh-bezel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.t3}"/><stop offset=".5" stop-color="${P.c3}"/><stop offset="1" stop-color="${P.t3}"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#sh-g)"/>${st.body}${lm.body}
    <g filter="url(#sh-shadow)" opacity=".8"><rect x="${devX}" y="${devTop + 30 * k}" width="${devW}" height="${devH}" rx="${r + bez}" fill="#000"/></g>
    <rect x="${devX}" y="${devTop}" width="${devW}" height="${devH}" rx="${r + bez}" fill="url(#sh-bezel)"/>
    <rect x="${devX + 1}" y="${devTop + 1}" width="${devW - 2}" height="${devH - 2}" rx="${r + bez - 1}" fill="#000"/>
    ${sub.svg}${cap.svg}
  </svg>`
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${screenW}" height="${screenH}"><rect width="${screenW}" height="${screenH}" rx="${r}" fill="#fff"/></svg>`)
  const screen = await sharp(rawBuf).resize(screenW, screenH, { fit: 'fill' }).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  const rim = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${devX + 0.75}" y="${devTop + 0.75}" width="${devW - 1.5}" height="${devH - 1.5}" rx="${r + bez - 0.75}" fill="none" stroke="${P.t1}" stroke-opacity=".5" stroke-width="2"/></svg>`)
  const frame = await sharp(Buffer.from(base)).png().toBuffer()
  const grain = await grainTile()
  return sharp(frame)
    .composite([{ input: screen, left: devX + Math.round(bez), top: Math.round(devTop + bez) }, { input: rim, left: 0, top: 0 }, { input: grain, tile: true, blend: 'soft-light' }])
    .png({ compressionLevel: 9 }).toBuffer()
}

async function frameScreenshots() {
  const arg = (ARGS.find((a) => a.startsWith('--screenshots=')) || '').slice(14)
  const rawDir = arg ? resolve(arg) : join(STORE, 'screenshots/raw'), outDir = arg ? join(resolve(arg), '../framed') : join(STORE, 'screenshots/play')
  mkdirSync(outDir, { recursive: true })
  const capFile = join(STORE, 'screenshots/captions.json')
  const caps = existsSync(capFile) ? JSON.parse(readFileSync(capFile, 'utf8')) : {}
  const files = existsSync(rawDir) ? readdirSync(rawDir).filter((f) => f.toLowerCase().endsWith('.png')).sort() : []
  if (!files.length) { console.log('no raw screenshots in store/screenshots/raw — capture them first (see store/LISTING.md)'); return }
  let i = 0
  for (const f of files) {
    const slug = f.replace(/\.png$/i, '')
    const caption = caps[slug] || slug.replace(/^\d+-/, '').replace(/-/g, ' ')
    const out = await frameScreenshot(readFileSync(join(rawDir, f)), caption, i++)
    writeFileSync(join(outDir, f), out)
    const m = await sharp(out).metadata()
    console.log(`  ✎ ${relative(ROOT, join(outDir, f)).split('\\').join('/')}  ${m.width}×${m.height}  "${caption}"`)
  }
}
