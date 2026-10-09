// A deliberately dumb static server for the service-worker tests.
//  - logs every request that reaches it (so "the SW answered from cache" is provable: zero hits)
//  - `offline = true` resets every connection, i.e. a dead network that still lets us count the attempts
//  - no SPA fallback and no compression: the worker alone must provide both
//  - mounts the site under any prefix, to prove the worker works at any base path
import http from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
}

export async function startSite({ dir, mount = '/' } = {}) {
  const state = { dir, mount, offline: false, hits: [], overrides: new Map() }
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    state.hits.push(url.pathname + url.search)
    if (state.offline) { req.socket.destroy(); return }
    if (!url.pathname.startsWith(state.mount)) { res.writeHead(404); res.end('outside mount'); return }
    const rel = decodeURIComponent(url.pathname.slice(state.mount.length)) || 'index.html'
    const key = rel.endsWith('/') ? rel + 'index.html' : rel
    if (state.overrides.has(key)) {
      const o = state.overrides.get(key)
      res.writeHead(200, { 'content-type': TYPES[extname(key)] || 'text/plain', 'cache-control': 'no-cache' }); res.end(o); return
    }
    const file = normalize(join(state.dir, key))
    if (!file.startsWith(normalize(state.dir) + sep) && file !== normalize(state.dir)) { res.writeHead(403); res.end(); return }
    let st
    try { st = statSync(file) } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found: ' + key); return }
    if (!st.isFile()) { res.writeHead(404); res.end(); return }
    const immutable = key.startsWith('assets/')
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream', 'content-length': st.size,
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    createReadStream(file).pipe(res)
  })
  await new Promise((r) => server.listen(0, r))
  const port = server.address().port
  return {
    port, origin: `http://localhost:${port}`,
    set offline(v) { state.offline = v }, get offline() { return state.offline },
    serve(dir2, mount2 = state.mount) { state.dir = dir2; state.mount = mount2 },
    override(rel, body) { state.overrides.set(rel, body) },
    clearOverrides() { state.overrides.clear() },
    hitsReset() { state.hits.length = 0 },
    hits: () => state.hits.slice(),
    count: (re) => state.hits.filter((h) => re.test(h)).length,
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r) }),
  }
}

/** A different origin standing in for YouTube / the KIN site. */
export async function startThirdParty() {
  const hits = []
  const server = http.createServer((req, res) => {
    hits.push(req.url)
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=3600' })
    res.end(JSON.stringify({ third: 'party', at: hits.length }))
  })
  await new Promise((r) => server.listen(0, r))
  const port = server.address().port
  return { origin: `http://127.0.0.1:${port}`, hits, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r) }) }
}
