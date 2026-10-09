// The build plugins against assets the brand step will produce (apple-touch icon, favicons, og card, iOS launch images,
// store screenshots) — made here with sharp — and against assets it has not produced yet.
//   node tools/pwa-test/plugin.test.mjs
import { build } from 'vite'
import sharp from 'sharp'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const app = resolve(here, '..', '..')
const work = join(here, '.work-plugin')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const section = (s) => console.log('\n== ' + s)

rmSync(work, { recursive: true, force: true })
mkdirSync(join(work, 'root'), { recursive: true })
writeFileSync(join(work, 'root', 'main.js'), "document.title = 'plugin test'\n")
writeFileSync(join(work, 'root', 'index.html'), readFileSync(join(app, 'index.html'), 'utf8').replace('src="/src/main.jsx"', 'src="/main.js"'))
cpSync(join(app, 'public'), join(work, 'public'), { recursive: true })
const brandNow = readdirSync(join(app, 'public'))      // whatever the brand step has shipped so far (checked in the last section)
// Start the synthetic sections from a public/ that has none of the optional brand assets.
for (const f of ['splash', 'screenshots', 'apple-touch-icon.png', 'favicon-32.png', 'favicon-16.png', 'favicon.ico', 'favicon.svg', 'og.png', 'og-twitter.png', 'icon-monochrome-512.png'])
  rmSync(join(work, 'public', f), { recursive: true, force: true })

const png = (file, w, h, rgb = '#06070d') => sharp({ create: { width: w, height: h, channels: 3, background: rgb } }).png().toFile(file)
const pub = (...p) => join(work, 'public', ...p)
mkdirSync(pub('splash'), { recursive: true }); mkdirSync(pub('screenshots'), { recursive: true })
await Promise.all([
  png(pub('apple-touch-icon.png'), 180, 180), png(pub('favicon-32.png'), 32, 32), png(pub('favicon-16.png'), 16, 16), png(pub('og.png'), 1200, 630),
  png(pub('icon-monochrome-512.png'), 512, 512),
  png(pub('splash', 'iphone-14.png'), 1170, 2532), png(pub('splash', 'iphone-14-copy.png'), 1170, 2532), png(pub('splash', 'ipad-pro-12.png'), 2048, 2732),
  png(pub('splash', 'iphone-14-landscape.png'), 2532, 1170), png(pub('splash', 'unknown.png'), 500, 500),
  png(pub('screenshots', '1-learn.png'), 1080, 1920), png(pub('screenshots', '2-lesson.png'), 1080, 1920), png(pub('screenshots', '3-wide.png'), 1920, 1080),
])
writeFileSync(pub('favicon.ico'), Buffer.from([0, 0, 1, 0]))
const list = (d, base = d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? list(join(d, e.name), base) : [join(d, e.name).slice(base.length + 1).replace(/\\/g, '/')]))

process.env.NODE_ENV = 'production'
async function run(outName, env = {}) {
  Object.assign(process.env, { KIND_TEST_ROOT: join(work, 'root'), KIND_TEST_PUBLIC: join(work, 'public'), KIND_TEST_VERSION: 'p' }, env)
  const out = join(work, outName)
  try { await build({ configFile: join(here, 'vite.config.mini.mjs'), build: { outDir: out } }) }
  finally { for (const k of Object.keys(env)) delete process.env[k] }
  return out
}
const swEntries = (out) => JSON.parse('[' + /const PRECACHE = \[([\s\S]*?)\]\s*\/\/ \[relative/.exec(readFileSync(join(out, 'sw.js'), 'utf8'))[1] + ']').map(([u]) => u)

section('with brand assets present, KIND_SITE_URL set')
{
  const out = await run('dist-a', { KIND_SITE_URL: 'https://kidsinspiringnation.org/app/' })
  const html = readFileSync(join(out, 'index.html'), 'utf8')
  ok(html.includes('<link rel="apple-touch-icon" href="./apple-touch-icon.png"'), 'apple-touch-icon now points at the 180 px file')
  ok(/rel="icon" href="\.\/favicon\.ico" sizes="32x32"/.test(html) && html.includes('href="./favicon-32.png"') && html.includes('href="./favicon-16.png"'), 'favicon.ico / 32 / 16 links added')
  ok(html.includes('property="og:image" content="https://kidsinspiringnation.org/app/og.png"') && html.includes('name="twitter:image" content="https://kidsinspiringnation.org/app/og.png"'), 'og:image + twitter:image are absolute')
  ok(html.includes('og:image:width" content="1200"') && html.includes('og:image:height" content="630"'), 'og image dimensions read from the PNG header')
  ok(html.includes('rel="canonical" href="https://kidsinspiringnation.org/app/"') && html.includes('property="og:url"'), 'canonical + og:url')
  const splash = [...html.matchAll(/<link rel="apple-touch-startup-image" href="([^"]+)" media="([^"]+)"/g)]
  ok(splash.length === 3, `3 launch images (iPhone 14 portrait, iPad Pro, iPhone 14 landscape); duplicate + unknown size skipped (got ${splash.length})`)
  ok(splash.some(([, h, m]) => /iphone-14(-copy)?\.png/.test(h) && m === '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'), 'iPhone 14 media query is exact')
  ok(splash.some(([, h, m]) => /ipad-pro-12/.test(h) && m.includes('1024px') && m.includes('1366px')), 'iPad Pro 12.9 media query')
  ok(splash.some(([, h, m]) => /landscape/.test(h) && m.includes('orientation: landscape') && m.includes('390px')), 'landscape image matched to its device')
  ok(!html.includes('unknown.png'), 'a PNG that matches no iOS screen is ignored')
  const man = JSON.parse(readFileSync(join(out, 'manifest.webmanifest'), 'utf8'))
  ok(man.screenshots?.length === 3 && man.screenshots.filter((s) => s.form_factor === 'narrow').length === 2 && man.screenshots.some((s) => s.form_factor === 'wide' && s.sizes === '1920x1080'), 'screenshots merged into the manifest with form_factor')
  const pre = swEntries(out)
  ok(!pre.some((u) => /^(splash|screenshots)\/|^og\./.test(u)), 'launch images, screenshots and og card are not precached')
  ok(pre.includes('apple-touch-icon.png') && pre.includes('favicon.ico') && pre.includes('icon-192.png') && pre.includes('icon.svg'), 'app icons are')
  ok(!pre.includes('icon-monochrome-512.png') && !pre.some((u) => /maskable/.test(u)), 'maskable / monochrome (install-time only) are not')
  ok(existsSync(join(out, '_headers')) && existsSync(join(out, '.nojekyll')), '_headers and .nojekyll written')
  ok(readFileSync(join(out, '_headers'), 'utf8').includes('/sw.js\n  Cache-Control: no-cache'), 'sw.js is no-cache in _headers')
  ok(!list(out).some((f) => /^(playground|tools)\//.test(f)), 'nothing from playground/ or tools/ in the build')
}

section('same build, same id (reproducible); a one-byte change gives a new one')
{
  const idOf = (o) => /const BUILD = '([0-9a-f]+)'/.exec(readFileSync(join(o, 'sw.js'), 'utf8'))[1]
  const a = idOf(join(work, 'dist-a'))
  const out = await run('dist-b', { KIND_SITE_URL: 'https://kidsinspiringnation.org/app/' })
  ok(idOf(out) === a, `identical inputs -> identical build id (${a})`)
  writeFileSync(join(work, 'root', 'main.js'), "document.title = 'plugin test 2'\n")
  ok(idOf(await run('dist-c', { KIND_SITE_URL: 'https://kidsinspiringnation.org/app/' })) !== a, 'changed source -> new build id')
}

section('without brand assets: nothing dangling is emitted, and the gap is reported')
{
  rmSync(pub('splash'), { recursive: true }); rmSync(pub('screenshots'), { recursive: true })
  for (const f of ['apple-touch-icon.png', 'favicon-32.png', 'favicon-16.png', 'favicon.ico', 'og.png', 'icon-monochrome-512.png']) rmSync(pub(f))
  const out = await run('dist-d')
  const html = readFileSync(join(out, 'index.html'), 'utf8')
  ok(!/startup-image|og:image|twitter:image|canonical|favicon\./.test(html), 'no startup-image / og:image / favicon / canonical tags for files that do not exist')
  ok(html.includes('<link rel="apple-touch-icon" href="./icon-192.png"'), 'apple-touch-icon falls back to icon-192.png')
  ok(!('screenshots' in JSON.parse(readFileSync(join(out, 'manifest.webmanifest'), 'utf8'))), 'manifest has no screenshots key')
  let threw = ''
  try { await run('dist-e', { KIND_STRICT: '1' }) } catch (e) { threw = String(e.message || e) }
  ok(/icon-monochrome-512\.png/.test(threw), `KIND_STRICT=1 fails the build when the manifest names a missing icon (${threw.slice(0, 90)}…)`)
}

section('against the real public/ as it stands today (brand output)')
{
  rmSync(join(work, 'public'), { recursive: true, force: true })
  cpSync(join(app, 'public'), join(work, 'public'), { recursive: true })
  const out = await run('dist-real', { KIND_SITE_URL: 'https://kidsinspiringnation.org/app/' })
  const html = readFileSync(join(out, 'index.html'), 'utf8')
  const shipped = existsSync(join(app, 'public', 'splash')) ? readdirSync(join(app, 'public', 'splash')).filter((f) => f.endsWith('.png')) : []
  const tags = [...html.matchAll(/rel="apple-touch-startup-image"/g)].length
  ok(tags === shipped.length, `every shipped launch image got a media-matched tag (${tags} of ${shipped.length})`)
  if (brandNow.includes('favicon.svg')) ok(html.includes('rel="icon" href="./favicon.svg"'), 'favicon.svg replaces icon.svg as the tab icon')
  if (brandNow.includes('og-twitter.png')) ok(html.includes('name="twitter:image" content="https://kidsinspiringnation.org/app/og-twitter.png"'), 'twitter card uses og-twitter.png')
  if (brandNow.includes('og.png')) ok(html.includes('property="og:image" content="https://kidsinspiringnation.org/app/og.png"'), 'og:image uses og.png')
  const pre = swEntries(out)
  console.log('         precache: ' + pre.length + ' files, ' + (pre.reduce((n, u) => n + readFileSync(join(out, u)).length, 0) / 1024).toFixed(0) + ' kB')
  ok(!pre.some((u) => /^splash\/|^og/.test(u)), 'none of the share/launch art is precached')
}

rmSync(work, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
