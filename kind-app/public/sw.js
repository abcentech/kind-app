/* KIND service worker.
 * The two markers below are stamped at build time by vite.config.js (kindServiceWorker); an unstamped copy
 * (dev server, a raw checkout) turns itself into a kill switch instead of caching anything.
 *
 *  precache     app shell, every JS/CSS chunk, latin fonts, icons — one cache per build, entries reused between builds
 *  navigations  the precached index.html for the scope root with any query string: instant, offline, and always the
 *               HTML that matches the precached assets (other paths redirect to the root). New builds arrive via the
 *               update flow in src/pwa.js
 *  same-origin  precache first; latin-ext/vietnamese fonts cache-first on demand; everything else stale-while-revalidate
 *  cross-origin never touched: YouTube, the KIN site and anything else go straight to the network and are never stored
 *
 * Scope is wherever this file lives, so the app works at the domain root or under any sub-path.
 */
const BUILD = '__KIND_BUILD__'
const PRECACHE = [/*__KIND_PRECACHE__*/]   // [relative url, revision | ''] — '' for content-hashed file names

const DEV = BUILD.charAt(0) === '_'
const SCOPE = self.registration.scope                     // https://host/base/
const SCOPE_PATH = new URL(SCOPE).pathname
const SHELL = new URL('index.html', SCOPE).href
const PRE = 'kind-pre-' + BUILD                           // versioned; deleted when a newer build activates
const FONTS = 'kind-fonts-v1'                             // content-hashed files: never need invalidating
const RUN = 'kind-run-v1'                                 // runtime stale-while-revalidate
const RUN_MAX = 80
const REV = 'x-kind-rev'

// ── lifecycle ────────────────────────────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  if (DEV) { self.skipWaiting(); return }
  event.waitUntil(precache())                             // all-or-nothing: if anything fails the old worker stays in charge
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (DEV) {
      await wipe()
      await self.registration.unregister()
      for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url).catch(() => {})
      return
    }
    const keep = new Set([PRE, FONTS, RUN])
    for (const k of await caches.keys()) if (k.startsWith('kind-') && !keep.has(k)) await caches.delete(k)   // incl. the v1 worker's 'kind-v1'
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type
  if (type === 'SKIP_WAITING') self.skipWaiting()
  else if (type === 'GET_VERSION' && event.source) event.source.postMessage({ type: 'VERSION', build: BUILD, dev: DEV, entries: PRECACHE.length })
  else if (type === 'CLEAR_CACHES') event.waitUntil(wipe())
})

// ── precache ─────────────────────────────────────────────────────────────────────────────────────────────────────
const abs = (rel) => new URL(rel, SCOPE).href

async function precache() {
  const cache = await caches.open(PRE)
  const older = (await caches.keys()).filter((k) => k.startsWith('kind-pre-') && k !== PRE)
  const jobs = PRECACHE.map(([rel, rev]) => async () => {
    const url = abs(rel)
    if (await cache.match(url)) return                                  // a retried install: this one already landed
    const kept = await reuse(older, url, rev)
    if (kept) return cache.put(url, kept)
    const res = await fetch(new Request(url, { cache: 'reload' }))      // never trust the HTTP cache for the shell
    if (!res.ok) throw new Error('precache ' + rel + ' -> ' + res.status)
    return cache.put(url, await clean(res, rev))
  })
  await pool(jobs, 6)
}

/** An unchanged file (same URL and revision) is copied from the previous build's cache instead of downloaded again — a code-only
 *  update costs a few KB on mobile data, not the whole shell. */
async function reuse(names, url, rev) {
  for (const name of names) {
    const hit = await (await caches.open(name)).match(url)
    if (hit && (hit.headers.get(REV) || '') === (rev || '')) return hit
  }
  return null
}

/** A clean, non-redirected copy tagged with its revision (a redirected response can't be served to a navigation). */
async function clean(res, rev) {
  const headers = new Headers(res.headers)
  headers.set(REV, rev || '')
  for (const h of ['content-encoding', 'content-length', 'vary']) headers.delete(h)   // the body is already decoded
  return new Response(await res.blob(), { status: 200, statusText: 'OK', headers })
}

async function pool(jobs, size) {
  const queue = jobs.slice()
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => { for (let j; (j = queue.shift());) await j() }))
}

async function wipe() {
  for (const k of await caches.keys()) if (k.startsWith('kind-')) await caches.delete(k)
}

// ── fetch ────────────────────────────────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (DEV) return
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return                       // YouTube, the KIN site, anything third-party: network, never stored
  if (!url.pathname.startsWith(SCOPE_PATH)) return                      // same origin, outside this app
  if (req.headers.has('range')) return                                  // media seeking
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return
  const rel = url.pathname.slice(SCOPE_PATH.length)
  if (rel === 'sw.js') return                                           // the update check must always see the network
  event.respondWith(req.mode === 'navigate' ? navigate(req, url, rel) : asset(event, req, rel))
})

async function navigate(req, url, rel) {
  // Someone opened a real file directly (the manifest, an icon): that is not the app shell.
  if (/\.[a-z0-9]+$/i.test(rel) && !/\.html?$/i.test(rel)) {
    try { return await fetch(req) } catch { return (await caches.match(req, { ignoreSearch: true, ignoreVary: true })) || offlinePage() }
  }
  // The app uses relative URLs, so only the scope root can load it. Any other path (a mistyped or stale link) goes home, query kept.
  if (rel !== '' && !/^index\.html?$/i.test(rel)) return Response.redirect(SCOPE + url.search, 302)
  const shell = await caches.match(SHELL, { cacheName: PRE })
  if (shell) return shell
  try { return await fetch(req) } catch { return offlinePage() }
}

async function asset(event, req, rel) {
  const pre = await caches.match(req, { cacheName: PRE, ignoreSearch: true, ignoreVary: true })
  if (pre) return pre
  if (/\.woff2?$/i.test(rel)) return cacheFirst(event, req, FONTS)
  return staleWhileRevalidate(event, req)
}

async function cacheFirst(event, req, name) {
  const cache = await caches.open(name)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok && res.type === 'basic') event.waitUntil(cache.put(req, res.clone()).catch(() => {}))
  return res
}

async function staleWhileRevalidate(event, req) {
  const cache = await caches.open(RUN)
  const hit = await cache.match(req)
  const refresh = fetch(req)
    .then(async (res) => {
      if (res.ok && res.status === 200 && res.type === 'basic') {
        try { await cache.put(req, res.clone()); await trim(cache, RUN_MAX) } catch { /* quota or Vary:* — serve it anyway */ }
      }
      return res
    })
    .catch(() => null)
  if (hit) { event.waitUntil(refresh); return hit }
  return (await refresh) || Response.error()
}

async function trim(cache, max) {
  const keys = await cache.keys()                                       // insertion order: oldest first
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

/** First ever visit, offline, shell not stored yet (or evicted). Carbon, the K, one honest line. */
function offlinePage() {
  const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<meta name="color-scheme" content="dark"><title>KIND</title>' +
    '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#06070d;color:#aab2c6;font:17px/1.5 system-ui,sans-serif;text-align:center;padding:24px">' +
    '<main><p style="font:700 28px/1 system-ui,sans-serif;letter-spacing:.3em;color:#f4f6fb;margin:0 0 16px">KIND</p>' +
    '<p style="margin:0 0 6px">You are offline, and KIND has not been saved to this device yet.</p>' +
    '<p style="margin:0;color:#7a8299;font-size:15px">Reconnect once and open it again. After that it works anywhere.</p></main>'
  return new Response(html, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}
