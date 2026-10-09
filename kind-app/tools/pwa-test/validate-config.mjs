// Loads a Vite config in isolation (own cache dir, no port) so a mistake can never take down the shared dev server.
//   node tools/pwa-test/validate-config.mjs [config] [--build <outDir>]
// 1. dev: createServer in middleware mode, runs index.html through every plugin's transformIndexHtml
// 2. build (optional): vite build into <outDir>, then lists what landed there
import { createServer, build } from 'vite'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')
const args = process.argv.slice(2)
const configFile = resolve(args[0] && !args[0].startsWith('--') ? args[0] : join(root, 'vite.config.js'))
const bi = args.indexOf('--build')
const outDir = bi > -1 ? resolve(args[bi + 1]) : null
const cacheDir = resolve(process.env.KIND_VITE_CACHE || join(outDir || here, '..', '.vite-validate'))

let failed = 0
const check = (cond, msg) => { console.log((cond ? '  ok   ' : '  FAIL ') + msg); if (!cond) failed++ }

console.log('config:', configFile)
const server = await createServer({ configFile, root, cacheDir, logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
try {
  const raw = readFileSync(join(root, 'index.html'), 'utf8')
  const html = await server.transformIndexHtml('/', raw)
  console.log('\ndev transformIndexHtml')
  check(/<meta name="kind-build" content="dev"/.test(html), 'build meta is "dev" under the dev server')
  check(!/rel="preload"[^>]*font/.test(html), 'no font preloads in dev (unhashed paths would 404)')
  check(/id="boot"/.test(html) && /src="\/src\/main\.jsx"/.test(html), 'boot splash + module entry intact')
  check(/<link rel="manifest" href="\.\/manifest\.webmanifest"/.test(html), 'manifest link present')
  const swDev = readFileSync(join(root, 'public', 'sw.js'), 'utf8')
  check(swDev.includes("'__KIND_BUILD__'") && swDev.includes('/*__KIND_PRECACHE__*/'), 'public/sw.js is an unstamped template (kill-switch in dev)')
} finally { await server.close() }

if (outDir) {
  console.log('\nbuild ->', outDir)
  process.env.NODE_ENV = 'production'   // createServer above set 'development' for this process; a build must not inherit it
  await build({ configFile, root, mode: 'production', logLevel: 'info', cacheDir, build: { outDir, emptyOutDir: true, reportCompressedSize: true } })
  const list = (d, base = d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? list(join(d, e.name), base) : [join(d, e.name).slice(base.length + 1).replace(/\\/g, '/')]))
  const files = list(outDir)
  console.log('\nfiles:', files.length)
  check(files.includes('index.html') && files.includes('sw.js') && files.includes('manifest.webmanifest'), 'index.html, sw.js, manifest.webmanifest in dist')
  check(!files.some((f) => f.startsWith('playground/')), 'no playground/ in dist')
  const sw = readFileSync(join(outDir, 'sw.js'), 'utf8')
  check(!sw.includes('__KIND_BUILD__') && !sw.includes('__KIND_PRECACHE__'), 'sw.js stamped (no markers left)')
  const idx = readFileSync(join(outDir, 'index.html'), 'utf8')
  const id = /const BUILD = '([0-9a-f]{12})'/.exec(sw)?.[1]
  check(!!id && idx.includes(`name="kind-build" content="${id}"`), `index.html carries the same build id (${id})`)
  console.log('  preloads:', [...idx.matchAll(/<link rel="preload"[^>]*href="([^"]+)"/g)].map((m) => m[1]).join('\n            ') || '(none)')
  const pre = JSON.parse('[' + /const PRECACHE = \[([\s\S]*?)\]\s*\/\/ \[relative/.exec(sw)?.[1] + ']')
  check(pre.length > 3, `precache list has ${pre.length} entries`)
  check(pre.every(([u]) => existsSync(join(outDir, u))), 'every precache entry exists on disk')
  check(!pre.some(([u]) => /latin-ext|vietnamese/.test(u)), 'latin-ext / vietnamese fonts are not precached')
  check(pre.some(([u]) => /inter-latin-wght-normal/.test(u)) && (!files.some((f) => /barlow-condensed-latin-700/.test(f)) || pre.some(([u]) => /barlow-condensed-latin-700/.test(u))), 'latin Inter (+ Barlow when the app uses it) are precached')
  check(!pre.some(([u]) => u === 'sw.js'), 'sw.js is not in its own precache')
  const chunks = files.filter((f) => /^assets\/.*\.js$/.test(f)).map((f) => `${f} ${(statSync(join(outDir, f)).size / 1024).toFixed(1)}kB`)
  console.log('  js chunks:\n    ' + chunks.join('\n    '))
}
console.log(failed ? `\n${failed} FAILED` : '\nall ok')
process.exit(failed ? 1 : 0)
