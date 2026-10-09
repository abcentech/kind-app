// Service-worker + install + boot tests, in a real Chromium, against a throwaway site built with the REAL index.html,
// the REAL public/sw.js + manifest, the REAL src/pwa.js and the REAL vite plugins. No framework.
//   node tools/pwa-test/sw.test.mjs            (builds v1 and v2 into tools/pwa-test/.work, runs everything, removes .work)
//   KIND_KEEP=1 node tools/pwa-test/sw.test.mjs   keep .work for inspection
//   KIND_ONLY=update node ...                  run only scenarios whose name contains "update"
//
// What "offline" means here: the server resets every connection (and still counts the attempts), so "0 hits" proves the
// worker answered from its cache without even trying the network.
import { build } from 'vite'
import { chromium } from 'playwright-core'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startSite, startThirdParty } from './server.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const app = resolve(here, '..', '..')
const work = join(here, '.work')
const only = process.env.KIND_ONLY || ''
let pass = 0, fail = 0
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ok   ' + msg) } else { fail++; console.log('  FAIL ' + msg) } }
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), a === b || JSON.stringify(a) === JSON.stringify(b) ? msg : `${msg}\n         got:  ${JSON.stringify(a)}\n         want: ${JSON.stringify(b)}`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const scenarios = []
const scenario = (name, fn) => scenarios.push([name, fn])

// ── prepare the throwaway site ────────────────────────────────────────────────────────────────────────────────
rmSync(work, { recursive: true, force: true })
mkdirSync(join(work, 'root'), { recursive: true })
for (const f of readdirSync(join(here, 'site'))) cpSync(join(here, 'site', f), join(work, 'root', f))
// The real index.html, with only the app entry swapped for the test entry.
const realHtml = readFileSync(join(app, 'index.html'), 'utf8')
if (!realHtml.includes('src="/src/main.jsx"')) throw new Error('index.html no longer loads /src/main.jsx — update the test')
writeFileSync(join(work, 'root', 'index.html'), realHtml.replace('src="/src/main.jsx"', 'src="/main.js"'))
// main.js uses Barlow so the preloaded Barlow files are genuinely used (otherwise Chrome warns, correctly).
writeFileSync(join(work, 'root', 'main.js'), readFileSync(join(work, 'root', 'main.js'), 'utf8').replace(
  "h('p', { id: 'ext' }",
  "h('p', { id: 'bar', style: { fontFamily: \"'Barlow Condensed'\", fontWeight: 600 } }, 'LAUNCH 600 ', h('b', { style: { fontWeight: 700 } }, 'GO 700')),\n    h('p', { id: 'ext' }"))
cpSync(join(app, 'public'), join(work, 'public'), { recursive: true })
writeFileSync(join(work, 'public', 'data.json'), '{"n":0}')

process.env.NODE_ENV = 'production'
async function buildVersion(v) {
  process.env.KIND_TEST_ROOT = join(work, 'root'); process.env.KIND_TEST_PUBLIC = join(work, 'public'); process.env.KIND_TEST_VERSION = v
  await build({ configFile: join(here, 'vite.config.mini.mjs'), build: { outDir: join(work, 'dist-' + v) } })
}
await buildVersion('v1')
await buildVersion('v2')

const precacheOf = (dir) => {
  const sw = readFileSync(join(dir, 'sw.js'), 'utf8')
  const body = /const PRECACHE = \[([\s\S]*?)\]\s*\/\/ \[relative/.exec(sw)[1]
  return { id: /const BUILD = '([0-9a-f]+)'/.exec(sw)[1], entries: JSON.parse('[' + body + ']') }
}
const V1 = { dir: join(work, 'dist-v1'), ...precacheOf(join(work, 'dist-v1')) }
const V2 = { dir: join(work, 'dist-v2'), ...precacheOf(join(work, 'dist-v2')) }
console.log(`built v1 ${V1.id} (${V1.entries.length} files) and v2 ${V2.id} (${V2.entries.length} files)`)

// A copy whose app script cannot load, for the boot-recovery scenario.
cpSync(V1.dir, join(work, 'dist-broken'), { recursive: true })
{
  const f = join(work, 'dist-broken', 'index.html')
  writeFileSync(f, readFileSync(f, 'utf8').replace(/<script type="module"[^>]*src="[^"]+"[^>]*><\/script>/, '<script type="module" src="./assets/does-not-exist.js"></script>'))
}
// An unstamped worker (what a dev server or a raw checkout serves) for the kill-switch scenario.
mkdirSync(join(work, 'killswitch'), { recursive: true })
cpSync(join(app, 'public', 'sw.js'), join(work, 'killswitch', 'sw.js'))
writeFileSync(join(work, 'killswitch', 'index.html'), '<!doctype html><title>ks</title><h1 id="ks">kill switch</h1>')

const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const browser = await chromium.launch({ executablePath: exe })
const site = await startSite({ dir: V1.dir })
const third = await startThirdParty()

const state = async (page) => JSON.parse(await page.locator('#state').textContent())
const cacheNames = (page) => page.evaluate(() => caches.keys())
const cachePaths = (page, name) => page.evaluate(async (n) => (await (await caches.open(n)).keys()).map((r) => new URL(r.url).pathname), name)
const newCtx = (opts = {}) => browser.newContext({ viewport: { width: 390, height: 844 }, ...opts })
const monitor = (page) => { const m = []; page.on('console', (c) => m.push(c.type() + ': ' + c.text())); page.on('pageerror', (e) => m.push('pageerror: ' + e.message)); return m }
const waitReady = async (page) => {
  await page.waitForSelector('#ver')
  await page.waitForFunction(() => window.__events.includes('ready') && !!navigator.serviceWorker.controller, null, { timeout: 20000 })
}
const unchanged = V1.entries.filter(([u, r]) => V2.entries.some(([u2, r2]) => u2 === u && r2 === r)).map(([u]) => u)
const changed = V2.entries.filter(([u, r]) => !V1.entries.some(([u1, r1]) => u1 === u && r1 === r)).map(([u]) => u)

// ── 1–8: the life of an install ───────────────────────────────────────────────────────────────────────────────
let ctx, page, msgs
scenario('first visit: precache, offline-ready, boot leaves by itself', async () => {
  site.serve(V1.dir, '/')
  ctx = await newCtx(); page = await ctx.newPage(); msgs = monitor(page)
  await page.goto(site.origin + '/')
  await waitReady(page)
  ok(await page.locator('#boot').count() === 0, 'inline #boot removed itself once React painted (no main.jsx call needed)')
  eq(await page.locator('#ver').textContent(), 'KIND test v1', 'app rendered v1')
  eq(await page.evaluate(() => window.__events), ['ready'], 'onReady fired once, onUpdate did not fire for a first install')
  const names = await cacheNames(page)
  ok(names.includes('kind-pre-' + V1.id), `precache cache is named after the build (kind-pre-${V1.id})`)
  const got = (await cachePaths(page, 'kind-pre-' + V1.id)).sort()
  const want = V1.entries.map(([u]) => '/' + u).sort()
  eq(got, want, `precache holds exactly the ${want.length} stamped entries`)
  ok(!got.some((p) => /latin-ext|vietnamese/.test(p)), 'latin-ext / vietnamese fonts are not in the precache')
  ok(got.some((p) => /inter-latin-wght-normal/.test(p)) && got.some((p) => /barlow-condensed-latin-700/.test(p)), 'latin Inter + Barlow Condensed are')
  ok(got.includes('/index.html') && got.includes('/manifest.webmanifest') && got.some((p) => /lazy-/.test(p)), 'shell, manifest and the lazy chunk are')
  const html = await (await fetch(site.origin + '/')).text()
  const pre = [...html.matchAll(/<link rel="preload" as="font" type="font\/woff2" href="([^"]+)" crossorigin>/g)].map((m) => m[1])
  eq(pre.length, 3, 'three font preloads injected into the built index.html')
  ok(pre.every((p) => p.startsWith('./assets/') && V1.entries.some(([u]) => './' + u === p)), 'preloads use the hashed names that exist in the build')
  ok(pre.some((p) => /inter-latin-wght/.test(p)) && pre.some((p) => /barlow-condensed-latin-600/.test(p)) && pre.some((p) => /barlow-condensed-latin-700/.test(p)), 'Inter + Barlow 600 + 700')
  ok(html.includes(`<meta name="kind-build" content="${V1.id}"`), 'index.html carries the build id')
  eq((await state(page)).build, V1.id, 'getBuild() reads it')
  await sleep(3500)   // Chrome reports unused preloads ~3 s after load
  const bad = msgs.filter((m) => /preload|error|pageerror/i.test(m) && !/favicon/.test(m))
  eq(bad, [], 'no console errors and no "preloaded but not used" warnings')
  ok((await state(page)).offlineReady, 'useUpdate().offlineReady is true')
})

scenario('online reload: shell + assets come from the worker, not the network', async () => {
  site.hitsReset()
  await page.reload(); await page.waitForSelector('#ver'); await sleep(700)
  const hits = site.hits()
  eq(hits.filter((h) => /^\/(index\.html)?(\?.*)?$/.test(h)), [], 'index.html not requested')
  eq(hits.filter((h) => /^\/assets\//.test(h)), [], 'no /assets/ request reached the server')
  console.log('         requests that did reach the server: ' + JSON.stringify([...new Set(hits)]))
  const fonts = await cachePaths(page, 'kind-fonts-v1')
  ok(fonts.some((p) => /inter-latin-ext/.test(p)), 'a latin-ext font used by the page was cached on demand (cache-first, own cache)')
})

scenario('offline: reload, deep links, query strings, the manifest, lazy chunks, on-demand fonts', async () => {
  site.offline = true; site.hitsReset()
  await page.reload(); await page.waitForSelector('#ver')
  eq(await page.locator('#ver').textContent(), 'KIND test v1', 'offline reload renders the app')
  eq(site.hits().filter((h) => /^\/(index\.html|assets\/|\?|$)/.test(h)), [], 'the shell never even tried the network (cache first)')
  await page.goto(site.origin + '/?source=pwa&tab=objectives'); await page.waitForSelector('#ver')
  ok(true, 'start_url with a query string loads offline')
  await page.goto(site.origin + '/some/deep/link?x=1'); await page.waitForSelector('#ver')
  eq(new URL(page.url()).pathname + new URL(page.url()).search, '/?x=1', 'an unknown in-scope path goes home (relative URLs only work from the root), query kept')
  const man = await page.goto(site.origin + '/manifest.webmanifest')
  ok(man.status() === 200 && (await man.text()).includes('"short_name": "KIND"'), 'visiting a real file directly offline is served from cache, not the shell')
  await page.goto(site.origin + '/'); await page.waitForSelector('#ver')
  eq(await page.evaluate(() => window.__lazy()), 'lazy chunk: unchanged between builds', 'a lazy chunk loads offline')
  const loaded = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.family.includes('Inter') && f.status === 'loaded').length })
  ok(loaded >= 2, `Inter latin + latin-ext both loaded offline (${loaded} faces)`)
})

scenario('same-origin data is stale-while-revalidate', async () => {
  site.offline = false
  site.override('data.json', '{"n":1}')
  const get = () => page.evaluate(() => fetch('./data.json').then((r) => r.json()).then((j) => j.n).catch(() => 'FAILED'))
  eq(await get(), 1, 'first fetch: network')
  site.override('data.json', '{"n":2}')
  eq(await get(), 1, 'second fetch: the cached copy answers immediately')
  await sleep(400)
  eq(await get(), 2, 'third fetch: the background revalidation has landed')
  site.offline = true
  eq(await get(), 2, 'offline: last good copy')
  site.offline = false
})

scenario('third-party origins are never intercepted or stored', async () => {
  const ping = () => page.evaluate((o) => fetch(o + '/yt.json', { cache: 'no-store' }).then((r) => r.json()).then((j) => j.at).catch(() => 'FAILED'), third.origin)
  eq(await ping(), 1, 'first request reaches the third party')
  eq(await ping(), 2, 'second request reaches it again (nothing answered from a cache)')
  const found = await page.evaluate(async (o) => {
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) if (r.url.startsWith(o)) return r.url
    return null
  }, third.origin)
  eq(found, null, 'no cache holds a cross-origin URL')
})

scenario('update: installs in the background, never reloads by itself, reuses unchanged files, then swaps on tap', async () => {
  console.log(`         v1 -> v2: ${changed.length} changed, ${unchanged.length} unchanged precache entries`)
  site.serve(V2.dir, '/'); site.hitsReset()
  await page.evaluate(() => { window.__marker = 123 })
  await page.evaluate(() => window.__sw.update())
  await page.waitForFunction(() => window.__events.includes('update'), null, { timeout: 20000 })
  eq(await page.evaluate(() => window.__events), ['update'], 'onUpdate fired exactly once (this page load was already installed, so no "ready")')
  eq(await page.locator('#ver').textContent(), 'KIND test v1', 'the running page is still v1')
  await page.waitForFunction(() => /"ready":true/.test(document.getElementById('state').textContent))
  ok(true, 'useUpdate().ready flipped to true')
  const names = await cacheNames(page)
  ok(names.includes('kind-pre-' + V1.id) && names.includes('kind-pre-' + V2.id), 'both builds\' caches coexist while v1 is still live')
  const hits = new Set(site.hits().map((h) => h.split('?')[0]))
  ok(hits.has('/sw.js'), 'the browser re-fetched sw.js')
  const fetchedChanged = changed.filter((u) => hits.has('/' + u))
  eq(fetchedChanged.sort(), changed.slice().sort(), `all ${changed.length} changed files were downloaded`)
  const refetchedUnchanged = unchanged.filter((u) => hits.has('/' + u))
  eq(refetchedUnchanged, [], `none of the ${unchanged.length} unchanged files (fonts, lazy chunk, icons, manifest…) were downloaded again`)
  await sleep(1500)
  eq(await page.evaluate(() => window.__marker), 123, 'no automatic reload while the update waits (a lesson in progress is safe)')
  await Promise.all([page.waitForEvent('framenavigated'), page.evaluate(() => window.__apply())])
  await page.waitForSelector('#ver')
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  eq(await page.locator('#ver').textContent(), 'KIND test v2', 'after apply() the page reloaded into v2')
  eq(await page.evaluate(() => window.__marker), undefined, '…a real reload')
  const after = await cacheNames(page)
  ok(!after.includes('kind-pre-' + V1.id) && after.includes('kind-pre-' + V2.id), 'the old build\'s cache was deleted on activation')
  ok(after.includes('kind-fonts-v1') && after.includes('kind-run-v1'), 'font + runtime caches survive the swap')
  eq(await page.evaluate(() => window.__events), [], 'a fresh load after the swap has no stale update event')
})

scenario('offline after the update serves v2', async () => {
  site.offline = true
  await page.reload(); await page.waitForSelector('#ver')
  eq(await page.locator('#ver').textContent(), 'KIND test v2', 'offline reload shows the new version')
  site.offline = false
  await ctx.close()
})

scenario('two tabs: one tab applying an update does not reload the other mid-session', async () => {
  site.serve(V2.dir, '/')          // both tabs start on v2 …
  const c = await newCtx(); const a = await c.newPage()
  await a.goto(site.origin + '/'); await waitReady(a)
  const b = await c.newPage()          // opened second so it is the foreground tab
  await b.goto(site.origin + '/'); await b.waitForSelector('#ver'); await b.waitForFunction(() => !!navigator.serviceWorker.controller)
  site.serve(V1.dir, '/')          // … then the server offers a different sw.js, which counts as an update
  await a.evaluate(() => window.__sw.update()); await b.evaluate(() => window.__sw.update())
  await a.waitForFunction(() => window.__events.includes('update'), null, { timeout: 20000 })
  await b.waitForFunction(() => window.__events.includes('update'), null, { timeout: 20000 })
  await b.evaluate(() => { window.__marker = 77 })
  const vis = await b.evaluate(() => document.visibilityState)
  await Promise.all([a.waitForEvent('framenavigated'), a.evaluate(() => window.__apply())])
  await sleep(1500)
  if (vis === 'visible') eq(await b.evaluate(() => window.__marker), 77, 'the other (visible) tab kept its session')
  else console.log('         (headless reported the second tab as hidden; the visible-tab branch could not be exercised)')
  await c.close()
})

scenario('works under a sub-path (base "./" at /sub/path/app/)', async () => {
  site.serve(V1.dir, '/sub/path/app/')
  const c = await newCtx(); const p = await c.newPage()
  await p.goto(site.origin + '/sub/path/app/')
  await waitReady(p)
  const scope = await p.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.scope))
  eq(scope, site.origin + '/sub/path/app/', 'scope is the folder sw.js lives in')
  const got = await cachePaths(p, 'kind-pre-' + V1.id)
  ok(got.length === V1.entries.length && got.every((u) => u.startsWith('/sub/path/app/')), 'every precache entry is under the sub-path')
  site.offline = true
  await p.reload(); await p.waitForSelector('#ver')
  eq(await p.locator('#ver').textContent(), 'KIND test v1', 'offline reload works under the sub-path')
  await p.goto(site.origin + '/sub/path/app/deep/link'); await p.waitForSelector('#ver')
  eq(new URL(p.url()).pathname, '/sub/path/app/', 'a stray path goes to the app root under the sub-path')
  site.offline = false; await c.close(); site.serve(V1.dir, '/')
})

// ── install prompt, connectivity, platform detection ──────────────────────────────────────────────────────────
scenario('useInstall + useOnline', async () => {
  site.serve(V1.dir, '/')
  const c = await newCtx({ serviceWorkers: 'block' }); const p = await c.newPage()
  await p.goto(site.origin + '/'); await p.waitForSelector('#ver')
  let s = await state(p)
  eq([s.platform, s.canInstall, s.isStandalone, s.needsIosGuide, s.online], ['desktop', false, false, false, true], 'initial: desktop, nothing to install yet, online')
  const prevented = await p.evaluate(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true })
    e.prompt = async () => { window.__prompted = (window.__prompted || 0) + 1 }
    e.userChoice = Promise.resolve({ outcome: 'accepted' })
    window.dispatchEvent(e); return e.defaultPrevented
  })
  ok(prevented, 'beforeinstallprompt is captured and the mini-infobar suppressed')
  await p.waitForFunction(() => JSON.parse(document.getElementById('state').textContent).canInstall)
  ok(true, 'canInstall flips to true')
  eq(await p.evaluate(() => window.__install()), 'accepted', 'install() resolves with the user\'s choice')
  eq(await p.evaluate(() => window.__prompted), 1, 'the native prompt was shown once')
  await p.waitForFunction(() => !JSON.parse(document.getElementById('state').textContent).canInstall)
  eq(await p.evaluate(() => window.__install()), 'unavailable', 'the event is one-shot: a second install() is a no-op')
  await p.evaluate(() => window.dispatchEvent(new Event('appinstalled')))
  await p.waitForFunction(() => JSON.parse(document.getElementById('state').textContent).installed)
  ok(true, 'appinstalled -> installed:true')
  await c.setOffline(true)
  await p.waitForFunction(() => !JSON.parse(document.getElementById('state').textContent).online)
  ok(true, 'useOnline() goes false when the network drops')
  await c.setOffline(false)
  await p.waitForFunction(() => JSON.parse(document.getElementById('state').textContent).online)
  ok(true, '…and back to true')
  // installed-app detection via the real display-mode media feature
  const cdp = await c.newCDPSession(p)
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'display-mode', value: 'standalone' }] })
  await p.waitForFunction(() => JSON.parse(document.getElementById('state').textContent).isStandalone)
  ok(true, '(display-mode: standalone) -> isStandalone, reactively')
  await c.close()
})

const UAS = [
  ['iPhone Safari', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1', {}, { platform: 'ios', browser: 'safari', inAppBrowser: false, needsIosGuide: true }],
  ['iPhone Chrome', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1', {}, { platform: 'ios', browser: 'chrome', inAppBrowser: false, needsIosGuide: true }],
  ['iPhone WhatsApp/WKWebView', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148', {}, { platform: 'ios', browser: 'webview', inAppBrowser: true, needsIosGuide: true }],
  ['iPhone Instagram', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0.0.12.108 (iPhone14,5; iOS 17_4; en_NG)', {}, { platform: 'ios', browser: 'webview', inAppBrowser: true }],
  ['iPhone, Home Screen app', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148', { standalone: true }, { platform: 'ios', isStandalone: true, needsIosGuide: false, canInstall: false }],
  ['iPad (desktop-class UA)', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15', { touch: 5 }, { platform: 'ios', browser: 'safari', needsIosGuide: true }],
  ['Mac Safari', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15', {}, { platform: 'desktop', needsIosGuide: false }],
  ['Android Chrome', 'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36', {}, { platform: 'android', browser: 'chrome', inAppBrowser: false, needsIosGuide: false }],
  ['Android Samsung Internet', 'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36', {}, { platform: 'android', browser: 'samsung' }],
  ['Android WebView (WhatsApp)', 'Mozilla/5.0 (Linux; Android 13; SM-A135F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36', {}, { platform: 'android', browser: 'webview', inAppBrowser: true }],
  ['Android Facebook', 'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.38.108;]', {}, { platform: 'android', inAppBrowser: true }],
  ['Windows Edge', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0', {}, { platform: 'desktop', browser: 'edge' }],
]
scenario('platform detection across the browsers our users actually have', async () => {
  site.serve(V1.dir, '/')
  for (const [name, ua, extra, want] of UAS) {
    const c = await newCtx({ serviceWorkers: 'block', userAgent: ua })
    const p = await c.newPage()
    await p.addInitScript(([standalone, touch]) => {
      if (standalone) Object.defineProperty(navigator, 'standalone', { get: () => true })
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => touch })   // this PC has a touch screen; a Mac does not
    }, [!!extra.standalone, extra.touch ?? 0])
    await p.goto(site.origin + '/'); await p.waitForSelector('#ver')
    const s = await state(p)
    const got = Object.fromEntries(Object.keys(want).map((k) => [k, s[k]]))
    eq(got, want, name)
    await c.close()
  }
})

// ── boot recovery ─────────────────────────────────────────────────────────────────────────────────────────────
scenario('boot: stall watchdog and "reset offline data" (keeps progress, leaves other apps\' caches alone)', async () => {
  site.serve(join(work, 'dist-broken'), '/')
  const c = await newCtx(); const p = await c.newPage()
  await p.goto(site.origin + '/')                       // the app script 404s -> error capture -> stalled at once
  await p.waitForSelector('#boot[data-stalled]', { timeout: 5000 })
  ok(await p.locator('#boot-reload').isVisible(), 'a broken start shows the Reload button immediately (no 9 s wait)')
  await p.evaluate(async () => {
    localStorage.setItem('kind-app-v4', '{"xp":420}')
    await navigator.serviceWorker.register('./sw.js'); await navigator.serviceWorker.ready
    await (await caches.open('someone-elses-cache')).put('/x', new Response('keep me'))
  })
  ok((await cacheNames(p)).some((n) => n.startsWith('kind-pre-')), 'precondition: a worker and kind-* caches exist')
  await Promise.all([p.waitForEvent('framenavigated'), p.locator('#boot-reset').click()])
  await p.waitForSelector('#boot')
  eq(await p.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length)), 0, 'the worker was unregistered')
  const left = await cacheNames(p)
  ok(!left.some((n) => n.startsWith('kind-')), 'every kind-* cache was deleted')
  ok(left.includes('someone-elses-cache'), 'caches that are not ours were left alone')
  eq(await p.evaluate(() => localStorage.getItem('kind-app-v4')), '{"xp":420}', 'progress (localStorage) is untouched')
  await c.close()
  // and the 9-second path for a script that hangs rather than fails
  const c2 = await newCtx({ serviceWorkers: 'block' }); const p2 = await c2.newPage()
  await p2.clock.install()
  await p2.route(/main-|index-.*\.js/, () => { /* never answered */ })
  site.serve(V1.dir, '/')
  await p2.goto(site.origin + '/', { waitUntil: 'commit' }); await p2.waitForSelector('#boot')
  ok(!(await p2.locator('#boot').getAttribute('data-stalled')), 'not stalled at first')
  await p2.clock.fastForward(9500)
  ok((await p2.locator('#boot').getAttribute('data-stalled')) === '1', 'stalled after 9 s of silence')
  await c2.close()
})

scenario('kill switch: an unstamped worker clears our caches and removes itself', async () => {
  site.serve(join(work, 'killswitch'), '/')
  const c = await newCtx(); const p = await c.newPage()
  await p.goto(site.origin + '/'); await p.waitForSelector('#ks')
  await p.evaluate(async () => {
    await (await caches.open('kind-v1')).put('/old', new Response('stale v1 cache'))
    await (await caches.open('other-app')).put('/o', new Response('not ours'))
    await navigator.serviceWorker.register('./sw.js')
  })
  await p.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).length === 0, null, { timeout: 15000 })
  const names = await cacheNames(p)
  ok(!names.includes('kind-v1'), 'legacy kind-v1 cache removed')
  ok(names.includes('other-app'), 'other caches untouched')
  await c.close()
})

scenario('storage persistence, "repair offline pack", and the reminder download in a real browser', async () => {
  site.serve(V1.dir, '/')
  const c = await newCtx(); const p = await c.newPage()
  await p.goto(site.origin + '/'); await waitReady(p)
  eq(typeof (await p.evaluate(() => window.__persist())), 'boolean', 'persistStorage() resolves to a boolean and never throws')
  await p.evaluate(() => { localStorage.setItem('kind-app-v4', '{"xp":7}'); return caches.open('someone-elses-cache') })
  const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => window.__ics({ hour: 7, min: 30, name: 'Ada Obi' }))])
  eq(dl.suggestedFilename(), 'kind-daily-reminder.ics', 'downloadICS() triggers a real file download with the right name')
  const chunks = []; for await (const ch of await dl.createReadStream()) chunks.push(ch)
  const ics = Buffer.concat(chunks).toString('utf8')
  ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n') && !/[^\r]\n/.test(ics), 'downloaded file is a CRLF calendar')
  ok(/DTSTART:\d{8}T073000\r\n/.test(ics) && ics.includes('RRULE:FREQ=DAILY') && ics.includes('Ada, today’s launch is ready'), 'carries the chosen time, the daily rule and the first name only')
  ok(ics.includes('URL:' + site.origin + '/?source=reminder'), 'event link is this app\'s own URL, tagged ?source=reminder')
  await p.evaluate(() => window.__repair({ reload: false }))
  eq(await p.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length)), 0, 'repairOfflinePack() unregistered the worker')
  const left = await cacheNames(p)
  ok(!left.some((n) => n.startsWith('kind-')) && left.includes('someone-elses-cache'), '…cleared every kind-* cache and nothing else')
  eq(await p.evaluate(() => localStorage.getItem('kind-app-v4')), '{"xp":7}', '…and left progress alone')
  await c.close()
})

scenario('offline with the shell evicted from storage: an honest page, not a browser error', async () => {
  site.serve(V1.dir, '/')
  const c = await newCtx(); const p = await c.newPage()
  await p.goto(site.origin + '/'); await waitReady(p)
  await p.evaluate(async () => { for (const k of await caches.keys()) if (k.startsWith('kind-pre-')) await caches.delete(k) })   // what storage pressure does
  site.offline = true
  const r = await p.goto(site.origin + '/')
  eq(r.status(), 503, 'the worker answers with its own 503 page')
  ok((await p.locator('body').innerText()).includes('You are offline'), 'it says so, in plain words')
  await c.close()
})

scenario('boot splash: fades normally, cuts instantly under reduced motion, removeBoot() is idempotent', async () => {
  site.serve(V1.dir, '/')
  const watch = () => { window.__fade = false; new MutationObserver((ms) => { for (const m of ms) if (m.target.id === 'boot' && String(m.target.className).includes('boot--out')) window.__fade = true }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] }) }
  for (const [label, reduce, expectFade] of [['normal', 'no-preference', true], ['reduced motion', 'reduce', false]]) {
    const c = await newCtx({ serviceWorkers: 'block', reducedMotion: reduce }); const p = await c.newPage()
    await p.addInitScript(watch)
    await p.goto(site.origin + '/'); await p.waitForSelector('#boot', { state: 'detached', timeout: 3000 })
    eq(await p.evaluate(() => window.__fade), expectFade, `${label}: ${expectFade ? 'faded out via .boot--out' : 'removed without a fade'}`)
    await p.evaluate(() => { window.__removeBoot(); window.__removeBoot() })
    ok(true, `${label}: calling removeBoot() after it is gone is harmless`)
    await c.close()
  }
})

scenario('installability (Chrome\'s own checklist) + manifest', async () => {
  site.serve(V1.dir, '/')
  const c = await newCtx(); const p = await c.newPage()
  await p.goto(site.origin + '/'); await waitReady(p)
  const cdp = await c.newCDPSession(p)
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
  eq(installabilityErrors.map((e) => e.errorId).filter((id) => id !== 'in-incognito'), [], 'Page.getInstallabilityErrors is empty (ignoring "in-incognito": Playwright contexts are incognito)')
  const { url, errors, data } = await cdp.send('Page.getAppManifest')
  const m = JSON.parse(data)
  eq(errors.filter((e) => e.critical).map((e) => e.message), [], 'no critical manifest errors')
  console.log('         manifest warnings: ' + (errors.map((e) => e.message).join(' | ') || 'none'))
  eq([m.short_name, m.display, m.orientation, m.theme_color, m.background_color, m.lang], ['KIND', 'standalone', 'portrait', '#06070d', '#06070d', 'en-NG'], 'manifest basics')
  eq(m.start_url, './?source=pwa', 'start_url')
  eq(m.shortcuts.map((s) => s.url), ['./?source=shortcut', './?tab=objectives', './?tab=shorts', './?tab=locker'], 'shortcuts')
  ok(m.icons.some((i) => i.purpose === 'maskable') && m.icons.some((i) => i.purpose === 'monochrome') && m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any'), 'icons: any 512 + maskable + monochrome')
  await c.close()
})

// ── run ───────────────────────────────────────────────────────────────────────────────────────────────────────
for (const [name, fn] of scenarios) {
  if (only && !name.includes(only)) continue
  console.log(`\n== ${name}`)
  try { await fn() } catch (e) { fail++; console.log('  FAIL (threw) ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n         ') : e)) }
}
await browser.close(); await site.close(); await third.close()
if (!process.env.KIND_KEEP) rmSync(work, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
