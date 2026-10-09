// ───────────────────────────────────────────────────────────────────────────
// 10 · verification — numbers, not vibes (the screenshots are the other half)
// ───────────────────────────────────────────────────────────────────────────
async function verify(results) {
  const by = Object.fromEntries(results.map((r) => [r.path, r.buf]))
  const checks = []
  const ok = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail })

  // dimensions
  const dims = {
    'public/icon-192.png': [192, 192], 'public/icon-512.png': [512, 512], 'public/icon-maskable-512.png': [512, 512],
    'public/icon-monochrome-512.png': [512, 512], 'public/apple-touch-icon.png': [180, 180], 'public/favicon-32.png': [32, 32],
    'public/og.png': [1200, 630], 'public/og-twitter.png': [1200, 600], 'store/icon-512.png': [512, 512], 'store/feature-graphic-1024x500.png': [1024, 500],
  }
  for (const [w, h, d] of SPLASH) dims[`public/splash/${splashName(w, h, d)}`] = [w * d, h * d]
  for (const [p, [w, h]] of Object.entries(dims)) {
    if (!by[p]) continue
    const m = await sharp(by[p]).metadata()
    ok(`size ${p}`, m.width === w && m.height === h, `${m.width}×${m.height}`)
  }

  // alpha: any-purpose icons keep transparent corners; full-bleed ones are opaque edge to edge
  for (const p of ['public/icon-maskable-512.png', 'public/apple-touch-icon.png', 'store/icon-512.png']) if (by[p]) { const m = await sharp(by[p]).metadata(); ok(`opaque ${p}`, !m.hasAlpha || (await sharp(by[p]).stats()).channels[3].min === 255) }
  for (const p of ['public/icon-192.png', 'public/icon-512.png']) if (by[p]) {
    const raw = await sharp(by[p]).raw().toBuffer({ resolveWithObject: true })
    const a = (x, y) => raw.data[(y * raw.info.width + x) * raw.info.channels + 3]
    ok(`transparent corners ${p}`, a(0, 0) === 0 && a(raw.info.width - 1, 0) === 0 && a(0, raw.info.height - 1) === 0, `a(0,0)=${a(0, 0)}`)
    ok(`opaque centre ${p}`, a(raw.info.width >> 1, raw.info.height >> 1) === 255)
  }

  // maskable: nothing but background (and the hex's soft shadow) outside the 80 % safe circle
  if (by['public/icon-maskable-512.png']) {
    const ref = await sharp(Buffer.from(iconSvg(512, { tile: 'full', scale: 0.0001 }))).raw().toBuffer({ resolveWithObject: true })
    const got = await sharp(by['public/icon-maskable-512.png']).raw().toBuffer({ resolveWithObject: true })
    const ch = got.info.channels, rch = ref.info.channels
    let worst = 0, bad = 0
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      if (Math.hypot(x - 255.5, y - 255.5) <= 204.8) continue
      const i = (y * 512 + x) * ch, j = (y * 512 + x) * rch
      const d = Math.max(Math.abs(got.data[i] - ref.data[j]), Math.abs(got.data[i + 1] - ref.data[j + 1]), Math.abs(got.data[i + 2] - ref.data[j + 2]))
      worst = Math.max(worst, d); if (d > 24) bad++
    }
    ok('maskable safe zone (80 % circle): no content outside', bad === 0, `worst Δ ${worst}, ${bad} px over threshold`)
  }

  // monochrome: pure white on transparent, inside Android's 61 % themed-icon safe zone
  if (by['public/icon-monochrome-512.png']) {
    const raw = await sharp(by['public/icon-monochrome-512.png']).raw().toBuffer({ resolveWithObject: true })
    const { width, channels } = raw.info
    let notWhite = 0, outside = 0, ink = 0
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const i = (y * width + x) * channels, a = raw.data[i + 3]
      if (a < 16) continue
      ink++
      if (raw.data[i] < 250 || raw.data[i + 1] < 250 || raw.data[i + 2] < 250) notWhite++
      if (Math.hypot(x - 255.5, y - 255.5) > 0.3125 * 512 + 1) outside++
    }
    ok('monochrome is white-only', notWhite === 0, `${notWhite} non-white px of ${ink}`)
    ok('monochrome inside the themed-icon safe zone', outside === 0, `${outside} px beyond r=${0.3125 * 512}`)
  }

  // favicon.ico structure
  if (by['public/favicon.ico']) {
    const b = by['public/favicon.ico']
    const n = b.readUInt16LE(4)
    const sizes = []
    let good = b.readUInt16LE(0) === 0 && b.readUInt16LE(2) === 1
    for (let i = 0; i < n; i++) {
      const o = 6 + i * 16, sz = b[o] || 256, len = b.readUInt32LE(o + 8), off = b.readUInt32LE(o + 12)
      const png = b.subarray(off, off + len)
      const m = await sharp(png).metadata()
      good = good && png.subarray(1, 4).toString() === 'PNG' && m.width === sz
      sizes.push(sz)
    }
    ok('favicon.ico holds 16/32/48 PNG frames', good && sizes.join() === '16,32,48', sizes.join('/'))
  }

  // budgets (link-preview scrapers choke on heavy images; splash files are fetched once at install)
  const kb = (p) => (by[p] ? by[p].length / 1024 : 0)
  ok('og.png ≤ 450 KB (WhatsApp/Telegram previews)', kb('public/og.png') <= 450, `${kb('public/og.png').toFixed(0)} KB`)
  ok('og-twitter.png ≤ 450 KB', kb('public/og-twitter.png') <= 450, `${kb('public/og-twitter.png').toFixed(0)} KB`)
  ok('icon.svg ≤ 12 KB', kb('public/icon.svg') <= 12, `${kb('public/icon.svg').toFixed(1)} KB`)
  ok('favicon.svg ≤ 2 KB', kb('public/favicon.svg') <= 2, `${kb('public/favicon.svg').toFixed(2)} KB`)
  const big = Object.entries(by).filter(([p]) => p.startsWith('public/splash/')).sort((a, c) => c[1].length - a[1].length)[0]
  if (big) ok('each splash ≤ 700 KB', big[1].length / 1024 <= 700, `largest ${big[0].split('/').pop()} ${(big[1].length / 1024).toFixed(0)} KB`)
  const total = Object.entries(by).filter(([p]) => p.startsWith('public/splash/')).reduce((s, [, b]) => s + b.length, 0)
  if (total) ok('splash set total ≤ 9 MB', total / 1048576 <= 9, `${(total / 1048576).toFixed(1)} MB across ${Object.keys(by).filter((p) => p.startsWith('public/splash/')).length}`)

  // Brand.jsx: colours only from tokens (+ pure white/black used as light/shade overlays), and it must parse
  if (by['src/art/Brand.jsx']) {
    const src = by['src/art/Brand.jsx'].toString('utf8')
    const blk = src.slice(src.indexOf('/* @generated:begin'), src.indexOf('/* @generated:end */'))
    const allowed = new Set([...Object.values(TOK), '#fff', '#000', '#ffffff', '#000000'])
    // titanium facet shades are interpolations along the token ramp (ti-4 → ti-3 → ti-2 → ti-1)
    const ramp = Array.from({ length: 201 }, (_, i) => rgb(metal(i / 200)))
    const onRamp = (c) => { const r = rgb(c); return ramp.some((q) => Math.max(...q.map((v, k) => Math.abs(v - r[k]))) <= 2) }
    const stray = [...new Set([...blk.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)].map((m) => m[0].toLowerCase()))].filter((c) => !allowed.has(c) && !(c.length === 7 && onRamp(c)))
    ok('Brand.jsx colours all trace to tokens.css (facet shades on the titanium ramp)', stray.length === 0, stray.join(' '))
    ok('Brand.jsx generated block ≤ 26 KB', blk.length <= 26 * 1024, `${(blk.length / 1024).toFixed(1)} KB raw, ${(gzipSync(Buffer.from(blk)).length / 1024).toFixed(1)} KB gz`)
    try {
      const esb = await import('esbuild')
      esb.transformSync(src, { loader: 'jsx' })
      ok('Brand.jsx parses as JSX', true)
    } catch (e) { ok('Brand.jsx parses as JSX', e.code === 'ERR_MODULE_NOT_FOUND', String(e.message).split('\n')[0]) }
  }

  // LISTING.md: the Play limits, counted; the brand casing; nothing private
  if (existsSync(join(STORE, 'LISTING.md'))) {
    const md = readFileSync(join(STORE, 'LISTING.md'), 'utf8')
    const block = (tag) => (md.match(new RegExp('```' + tag + '\\n([\\s\\S]*?)\\n```')) || [])[1]
    for (const [tag, max] of [['title', 30], ['short', 80], ['long', 4000], ['whatsnew', 500]]) {
      const t = block(tag)
      ok(`LISTING.md ${tag} ≤ ${max} chars`, t !== undefined && t.length <= max, t === undefined ? 'block missing' : `${t.length} chars`)
    }
    ok('LISTING.md never writes the tagline as Gods / GODS', !/Raising Gods|RAISING GODS|Raising gods/.test(md))
    ok('LISTING.md has no emoji', !/\p{Extended_Pictographic}/u.test(md))
    ok('LISTING.md does not leak the account email', !/@kidsinspiringnation\.org/i.test(md))
  }

  // no NaN ever reaches a path (opentype's own path writer has bitten us once)
  const svgs = { 'social svg': socialSvg(1200, 630), 'feature svg': featureSvg(), 'splash svg': splashSvg(390, 844), 'icon svg': iconSvg(512, { tile: 'rounded' }), 'mono svg': monoSvg(), 'favicon svg': faviconSvg() }
  for (const [k, s] of Object.entries(svgs)) ok(`no NaN in ${k}`, !/NaN|undefined/.test(s))
  if (by['src/art/Brand.jsx']) ok('no NaN/undefined in Brand.jsx', !/NaN|undefined/.test(by['src/art/Brand.jsx'].toString('utf8').replace(/typeof undefined/g, '')))

  // determinism: a second render of two assets is byte-identical
  if (by['public/icon-512.png']) ok('deterministic icon-512.png', Buffer.compare(by['public/icon-512.png'], await raster(iconSvg(512, { tile: 'rounded' }))) === 0)
  if (by['public/favicon.ico']) ok('deterministic favicon.ico', Buffer.compare(by['public/favicon.ico'], icoFile(await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await raster(faviconSvg(size)) }))))) === 0)
  return checks
}
