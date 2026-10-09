import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { join, resolve, sep } from 'node:path'
import { splitLibrary } from './scripts/split-library.mjs'

/* ============================================================================================================
 *  KIND build: two small plugins that make the shell a first-class installed app.
 *    kindHtml            index.html: font preloads (hashed names resolved from the bundle), whatever icons/splash/og
 *                        images the brand step has produced, absolute og/canonical URLs when KIND_SITE_URL is set
 *    kindServiceWorker   after the bundle is written: stamp public/sw.js with a content-hash build id and the precache
 *                        list, stamp the build id into index.html, write _headers, validate the manifest
 *  Both are exported so tools/pwa-test can run them against a throwaway site.
 * ========================================================================================================== */

const sha = (buf, n = 10) => createHash('sha1').update(buf).digest('hex').slice(0, n)
const kb = (n) => (n / 1024).toFixed(1) + ' kB'

/** Relative paths (posix) of every file under `dir`. */
function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name), base) : [join(dir, e.name).slice(base.length + 1).split(sep).join('/')])
}

/** Width/height from a PNG's IHDR — 24 bytes, no decoder needed. */
function pngSize(file) {
  const fd = openSync(file, 'r')
  try {
    const b = Buffer.alloc(24)
    readSync(fd, b, 0, 24, 0)
    return b.readUInt32BE(0) === 0x89504e47 ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null
  } finally { closeSync(fd) }
}

// ── index.html ─────────────────────────────────────────────────────────────────────────────────────────────
// Fonts the first screens paint with. Preloading more than this fights the JS for a slow connection; the rest is precached by the SW.
export const FONT_PRELOADS = [/inter-latin-wght-normal/, /barlow-condensed-latin-600-normal/, /barlow-condensed-latin-700-normal/]

// iOS only shows a launch image whose media query matches the device exactly. Portrait pixel size -> [css w, css h, dpr].
const IOS_SCREENS = {
  '640x1136': [320, 568, 2], '750x1334': [375, 667, 2], '828x1792': [414, 896, 2], '1125x2436': [375, 812, 3],
  '1242x2208': [414, 736, 3], '1242x2688': [414, 896, 3], '1170x2532': [390, 844, 3], '1284x2778': [428, 926, 3],
  '1179x2556': [393, 852, 3], '1290x2796': [430, 932, 3], '1206x2622': [402, 874, 3], '1320x2868': [440, 956, 3],
  '1536x2048': [768, 1024, 2], '1620x2160': [810, 1080, 2], '1640x2360': [820, 1180, 2], '1668x2224': [834, 1112, 2],
  '1668x2388': [834, 1194, 2], '2048x2732': [1024, 1366, 2], '1488x2266': [744, 1133, 2],
  '1260x2736': [420, 912, 3], '1668x2420': [834, 1210, 2], '2064x2752': [1032, 1376, 2],
}

export function kindHtml({ preload = FONT_PRELOADS } = {}) {
  let config
  return {
    name: 'kind-html',
    configResolved(c) { config = c },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const pub = config.publicDir
        const has = (f) => !!pub && existsSync(join(pub, f))
        const base = config.base === './' || config.base === '' ? './' : config.base
        const href = (f) => base + f
        const site = (process.env.KIND_SITE_URL || '').replace(/\/?$/, '/')
        const absolute = (f) => (process.env.KIND_SITE_URL ? new URL(f, site).href : href(f))
        const tags = []
        const link = (attrs) => tags.push({ tag: 'link', attrs, injectTo: 'head' })
        const meta = (attrs) => tags.push({ tag: 'meta', attrs, injectTo: 'head' })

        // 1. Preload the latin Inter / Barlow files under their hashed names (build only: dev serves them unhashed from node_modules).
        if (ctx.bundle) {
          const names = Object.keys(ctx.bundle).filter((n) => n.endsWith('.woff2'))
          for (const re of preload) {
            const name = names.find((n) => re.test(n))
            if (name) link({ rel: 'preload', as: 'font', type: 'font/woff2', href: base + name, crossorigin: true })
          }
        }

        // 2. Icons the brand step has produced beyond the ones index.html names itself.
        if (has('favicon.svg')) html = html.replace(/(<link rel="icon" href=")[^"]*(" type="image\/svg\+xml")/, `$1${href('favicon.svg')}$2`)   // the small-size cut of the mark
        if (has('favicon.ico')) link({ rel: 'icon', href: href('favicon.ico'), sizes: '32x32' })
        if (has('favicon-32.png')) link({ rel: 'icon', type: 'image/png', sizes: '32x32', href: href('favicon-32.png') })
        if (has('favicon-16.png')) link({ rel: 'icon', type: 'image/png', sizes: '16x16', href: href('favicon-16.png') })
        if (has('apple-touch-icon.png')) html = html.replace(/(<link rel="apple-touch-icon" href=")[^"]*(")/, `$1${href('apple-touch-icon.png')}$2`)

        // 3. Share card.
        if (has('og.png')) {
          const sz = pngSize(join(pub, 'og.png'))
          meta({ property: 'og:image', content: absolute('og.png') })
          meta({ property: 'og:image:alt', content: 'KIND — the daily devotional launch console' })
          if (sz) { meta({ property: 'og:image:width', content: String(sz.w) }); meta({ property: 'og:image:height', content: String(sz.h) }) }
          meta({ name: 'twitter:image', content: absolute(has('og-twitter.png') ? 'og-twitter.png' : 'og.png') })
        }
        if (process.env.KIND_SITE_URL) {
          link({ rel: 'canonical', href: site })
          meta({ property: 'og:url', content: site })
        }

        // 4. iOS launch images, matched to whatever sizes exist in public/splash.
        const dir = pub && join(pub, 'splash')
        if (dir && existsSync(dir)) {
          const seen = new Set()
          for (const f of readdirSync(dir).filter((n) => /\.png$/i.test(n)).sort()) {
            const sz = pngSize(join(dir, f))
            if (!sz) continue
            const land = sz.w > sz.h
            const dev = IOS_SCREENS[land ? `${sz.h}x${sz.w}` : `${sz.w}x${sz.h}`]
            const key = `${sz.w}x${sz.h}`
            if (!dev || seen.has(key)) continue
            seen.add(key)
            const [w, h, r] = dev
            link({
              rel: 'apple-touch-startup-image', href: href('splash/' + f),
              media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: ${land ? 'landscape' : 'portrait'})`,
            })
          }
        }
        return { html, tags }
      },
    },
  }
}

// ── service worker ─────────────────────────────────────────────────────────────────────────────────────────
const NEVER = [/^sw\.js$/, /^_headers$/, /\.map$/, /^splash\//, /^screenshots\//, /^store\//, /^og\./, /-maskable|-monochrome/, /^playground\//,
  /^\.well-known\//, /\.(mp4|webm|mov|mp3|wav|ogg|m4a)$/i]
const NON_LATIN_FONT = /-(latin-ext|vietnamese|cyrillic(-ext)?|greek(-ext)?)-|\.woff$/   // cached on demand, not up front
const ROOT_FILES = /^(index\.html|manifest\.webmanifest|icon[\w.-]*\.(png|svg)|favicon[\w.-]*|apple-touch-icon[\w.-]*)$/

/** Is this dist file part of the offline pack? App shell + every chunk + latin fonts + icons. */
export function isPrecached(f) {
  if (NEVER.some((re) => re.test(f))) return false
  if (/\.woff2?$/.test(f) && NON_LATIN_FONT.test(f)) return false
  return f.startsWith('assets/') || ROOT_FILES.test(f)
}

const HEADERS = `# Written by vite.config.js (kindServiceWorker). Netlify / Cloudflare Pages read this file. GitHub Pages ignores it (it serves
# max-age=600), which is fine: the worker registers with updateViaCache:'none', so sw.js is always revalidated. Elsewhere, apply the same rules.
/sw.js
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
  Content-Type: application/manifest+json
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`

/**
 * Stamp a finished dist folder. Order matters: manifest first (it is hashed into the pack), then the build id (a hash of the
 * whole pack, so identical sources give an identical id), then index.html's build meta, then sw.js.
 */
export function stampDist(outDir, log = console) {
  const swFile = join(outDir, 'sw.js')
  if (!existsSync(swFile) || !existsSync(join(outDir, 'index.html'))) { log.warn('[kind] sw.js or index.html missing from ' + outDir + ' — nothing stamped'); return null }
  const template = readFileSync(swFile, 'utf8')
  if (!/const BUILD = '__KIND_BUILD__'/.test(template) || !template.includes('/*__KIND_PRECACHE__*/')) {
    log.warn('[kind] sw.js has no build markers (already stamped?) — left as is'); return null
  }
  const strict = process.env.KIND_STRICT === '1'
  const problems = []

  // The manifest must not point at files that are not there. Brand produces them in parallel, so this warns (KIND_STRICT=1 fails).
  const manFile = join(outDir, 'manifest.webmanifest')
  if (existsSync(manFile)) {
    const man = JSON.parse(readFileSync(manFile, 'utf8'))
    const refs = [...(man.icons || []), ...(man.shortcuts || []).flatMap((s) => s.icons || []), ...(man.screenshots || [])].map((i) => i.src)
    for (const src of new Set(refs)) if (!existsSync(join(outDir, src))) problems.push(`manifest references ${src}, which is not in public/`)
    // Rich install sheet on Android Chrome: screenshots/*.png, if the brand step has made any.
    const shotsDir = join(outDir, 'screenshots')
    if (!man.screenshots && existsSync(shotsDir)) {
      const shots = readdirSync(shotsDir).filter((n) => /\.png$/i.test(n)).sort().map((n) => {
        const sz = pngSize(join(shotsDir, n)); return sz && { src: 'screenshots/' + n, sizes: `${sz.w}x${sz.h}`, type: 'image/png', form_factor: sz.w >= sz.h ? 'wide' : 'narrow' }
      }).filter(Boolean)
      if (shots.length) { man.screenshots = shots; writeFileSync(manFile, JSON.stringify(man, null, 2) + '\n') }
    }
  }

  const all = walk(outDir)
  if (all.some((f) => /^(playground|tools)\//.test(f))) problems.push('playground/ or tools/ leaked into the build')
  const files = all.filter(isPrecached).sort()
  const entry = (f) => [f, f.startsWith('assets/') ? '' : sha(readFileSync(join(outDir, f)))]   // /assets/* carry a content hash in the name
  let entries = files.map(entry)
  const id = sha([...entries.map((e) => e.join('|')), sha(template)].join('\n'), 12)

  const htmlFile = join(outDir, 'index.html')
  let html = readFileSync(htmlFile, 'utf8')
  if (/<meta name="kind-build" content="[^"]*"/.test(html)) {
    html = html.replace(/(<meta name="kind-build" content=")[^"]*(")/, `$1${id}$2`)
    writeFileSync(htmlFile, html)
    entries = files.map(entry)                                           // index.html changed: re-hash it
  } else problems.push('index.html has no <meta name="kind-build">')

  const stamped = template
    .replace("const BUILD = '__KIND_BUILD__'", `const BUILD = '${id}'`)
    .replace('/*__KIND_PRECACHE__*/', entries.map((e) => JSON.stringify(e)).join(',\n  '))
  writeFileSync(swFile, stamped)

  if (!existsSync(join(outDir, '_headers'))) writeFileSync(join(outDir, '_headers'), HEADERS)
  if (!existsSync(join(outDir, '.nojekyll'))) writeFileSync(join(outDir, '.nojekyll'), '')   // GitHub Pages' Jekyll would drop assets/_commonjsHelpers-*.js

  let raw = 0, gz = 0
  for (const f of files) { const b = readFileSync(join(outDir, f)); raw += b.length; gz += /\.(woff2|png|jpe?g|webp)$/.test(f) ? b.length : gzipSync(b).length }
  log.info(`[kind] service worker ${id}: ${files.length} files precached, ${kb(raw)} (${kb(gz)} over the wire)`)
  if (raw > 2.5 * 1024 * 1024) problems.push(`offline pack is ${kb(raw)} — more than 2.5 MB is a lot to ask of a first install on mobile data`)
  for (const p of problems) log.warn('[kind] ' + p)
  if (strict && problems.length) throw new Error('[kind] KIND_STRICT: ' + problems.join('; '))
  return { id, files: entries, bytes: raw, problems }
}

export function kindServiceWorker() {
  let config
  return {
    name: 'kind-service-worker',
    apply: 'build',
    enforce: 'post',
    configResolved(c) { config = c },
    closeBundle: {
      order: 'post',
      handler() {
        const out = resolve(config.root, config.build.outDir)
        if (existsSync(join(out, 'index.html'))) stampDist(out, config.logger)
      },
    },
  }
}


// ── content split ──────────────────────────────────────────────────────────────────────────────────────────
// lib.js imports library.json; in the Vite graph that import becomes the small core and the lesson bodies become one lazy
// chunk per series ('virtual:kind-heavy'). Node (tests, tools) is untouched and sees the full JSON. See scripts/split-library.mjs.
export function kindContent() {
  const LIB = fileURLToPath(new URL('./src/content/library.json', import.meta.url))
  let split = null
  const get = () => split || (split = splitLibrary(LIB))
  const CORE = '\0kind:core', HEAVY = '\0kind:heavy'
  return {
    name: 'kind-content',
    enforce: 'pre',
    config: () => ({ define: { __KIND_SPLIT__: 'true' } }),
    buildStart() { this.addWatchFile(LIB) },
    watchChange(id) { if (id.endsWith('library.json')) split = null },
    resolveId(source, importer) {
      if (source === './content/library.json' && importer && /[\/]src[\/]lib\.js$/.test(importer)) return CORE
      if (source === 'virtual:kind-heavy') return HEAVY
      if (source.startsWith(HEAVY + '/')) return source
    },
    load(id) {
      if (id === CORE) return 'export default ' + JSON.stringify(get().core)
      if (id === HEAVY) return 'export default {\n' + Object.keys(get().heavy).map((s) => `  ${JSON.stringify(s)}: () => import(${JSON.stringify(HEAVY + '/' + s)}),`).join('\n') + '\n}'
      if (id.startsWith(HEAVY + '/')) return 'export default ' + JSON.stringify(get().heavy[id.slice(HEAVY.length + 1)])
    },
  }
}

// ── config ─────────────────────────────────────────────────────────────────────────────────────────────────
export default defineConfig({
  // relative base so the app works at the domain root or any subpath (e.g. kidsinspiringnation.org/app/)
  base: './',
  plugins: [kindContent(), react(), kindHtml(), kindServiceWorker()],
  server: {
    port: 5183,
    // screenshots and throwaway builds are written constantly; none of it is source
    watch: { ignored: ['**/tools/out/**', '**/tools/pwa-test/**', '**/dist/**'] },
  },
  // Pre-bundle React up front so a second playground page never triggers "dependencies changed, reloading" mid-session.
  // The scan skips playground/_template.html (it points at a file that does not exist, which fails the whole scan).
  optimizeDeps: {
    entries: ['index.html', 'playground/*.html', '!playground/_template.html'],
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  build: {
    // playground/ is dev-only: the only entry is index.html (Vite's default) and nothing links there; stampDist fails loudly if it ever leaks
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'       // cached across every release
          if (id.startsWith('\0kind:heavy/')) return 'content-' + id.slice(12)   // one chunk per series, fetched on idle
        },
      },
    },
    chunkSizeWarningLimit: 400,
  },
})
