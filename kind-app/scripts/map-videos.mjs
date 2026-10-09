#!/usr/bin/env node
/* ============================================================================
 * map-videos.mjs — maps the real uploads of @KidsInspiringNation onto the app's days.
 *
 *   node scripts/map-videos.mjs               map, validate, print a diff, write scripts/videos.json
 *   node scripts/map-videos.mjs --dry-run     same, but write nothing
 *   node scripts/map-videos.mjs --series stewardship-code -v      one series, with the evidence table
 *   node scripts/map-videos.mjs --validate-only                   just check every mapped id still resolves
 *
 * Other flags: --no-validate  --offline (cache only)  --refresh (ignore cache)  --all-feeds  --help
 *
 * Read-only: public channel pages, public RSS, i.ytimg.com thumbnails and oEmbed. Never /watch pages (they sit
 * behind a CAPTCHA for scripts, which we do not touch). <= 3.3 requests/second. No cookies, no consent flags.
 *
 * What it trusts, strongest first
 *   exact date   the RSS <published> stamp (channel feed + series-playlist feeds: only the 15 newest of each, and
 *                YouTube's feeds intermittently answer 404, so they are retried and never required).
 *   scripture    Bible references in the RSS description vs. the episode's own references.
 *   order-fit    two anchors fix a stretch of the timeline; if the number of uploads inside it equals the number of
 *                lessons inside it, they pair off in order. A count mismatch is NEVER guessed: it is reported.
 *   thumb time   i.ytimg.com's ETag on a custom thumbnail is its upload time in epoch seconds, set hours before the
 *                premiere. Used only to bound a window and to veto an impossible slot, never to choose a slot.
 *   title echo   (shorts only, which have no dates at all) the short's title repeats the matched episode's title.
 *
 * Confidence written to _meta:  confirmed (>= 2 independent strong signals)  ·  high (order-fit with exact count)  ·
 *   title (shorts: title/hook echo, no date).  Anything weaker is not written: it goes to _unmatched with candidates.
 *
 * Re-running is safe: entries with no provenance, or with source "manual"/"curated", are never changed or removed
 * (a contradiction is printed as CONFLICT); auto entries are only ever upgraded; nothing is deleted without --prune.
 * Output is deterministic: no timestamps, stable ordering, so an unchanged channel gives an empty diff.
 * ========================================================================= */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'videos.json')
const LIB = join(HERE, '..', 'src', 'content', 'library.json')
const CACHE_DIR = join(tmpdir(), 'kind-map-videos')

const HANDLE = '@KidsInspiringNation'
const CHANNEL_ID = 'UCnQYGxz4gBIJWHR159IT0lg'
const UA = 'Mozilla/5.0 (compatible; KIND-app-video-mapper/1.0; +https://kidsinspiringnation.org)'
const MIN_GAP_MS = 300 // ~3.3 req/s, under the 4 req/s ceiling
// Observed: August 2026 episodes premiered at 17:00 UTC (= 18:00 WAT), not the 20:00 WAT the brief assumed.
const PREMIERE_UTC_HOUR = 17
const WAT_H = 1
const DAY = 86400e3

const argv = process.argv.slice(2)
const has = (f) => argv.includes(f)
const opt = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null }
const FLAGS = {
  dry: has('--dry-run'), offline: has('--offline'), refresh: has('--refresh'), noValidate: has('--no-validate'),
  validateOnly: has('--validate-only'), allFeeds: has('--all-feeds'), prune: has('--prune'),
  verbose: has('--verbose') || has('-v'), only: (opt('--series') || '').split(',').filter(Boolean),
}
if (has('--help') || has('-h')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 33).map((l) => l.replace(/^ ?\* ?/, '')).join('\n'))
  process.exit(0)
}

const say = (...a) => console.log(...a)
const warn = (...a) => console.log('!', ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const uniq = (a) => [...new Set(a)]
const decode = (s) => (s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
const fmtDay = (ms) => new Date(ms).toISOString().slice(0, 10)
const fmtUtc = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z')
const watDay = (ms) => new Date(ms + WAT_H * 3600e3).getUTCDate()

/* ---------------------------------------------------------------------------
 * HTTP: one global limiter, a tiny disk cache, retries for the flaky bits.
 * ------------------------------------------------------------------------- */
let lastReq = 0
async function http(url, o = {}) {
  const { method = 'GET', body, headers = {}, ttlH = 1, retries = 2, accept = [200], retry404 = false } = o
  const key = createHash('sha1').update(`${method} ${url} ${body || ''}`).digest('hex').slice(0, 24)
  const file = join(CACHE_DIR, key + '.json')
  if (!FLAGS.refresh && existsSync(file)) {
    try {
      const c = JSON.parse(readFileSync(file, 'utf8'))
      if (FLAGS.offline || Date.now() - c.ts < ttlH * 3600e3) return c
    } catch { /* fall through to the network */ }
  }
  if (FLAGS.offline) return { status: 0, text: '', headers: {}, offline: true }
  for (let a = 0; a <= retries; a++) {
    const wait = lastReq + MIN_GAP_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastReq = Date.now()
    let r
    try {
      r = await fetch(url, {
        method, body, redirect: 'follow', signal: AbortSignal.timeout(30000),
        headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9', ...headers },
      })
    } catch (e) {
      if (a === retries) return { status: -1, text: '', headers: {}, error: e.cause?.code || e.message }
      await sleep(1500 * (a + 1)); continue
    }
    const text = method === 'HEAD' ? '' : await r.text()
    const res = { status: r.status, text, headers: { etag: r.headers.get('etag') || '', len: r.headers.get('content-length') || '' }, ts: Date.now() }
    if (accept.includes(r.status)) {
      mkdirSync(CACHE_DIR, { recursive: true })
      writeFileSync(file, JSON.stringify(res))
      return res
    }
    if (r.status === 429 || r.status >= 500 || (r.status === 404 && retry404)) { await sleep(2500 * (a + 1)); continue }
    return res
  }
  return { status: -2, text: '', headers: {} }
}

/* ---------------------------------------------------------------------------
 * YouTube page scraping (ytInitialData) + continuation paging
 * ------------------------------------------------------------------------- */
function walk(o, fn) {
  if (Array.isArray(o)) { for (const x of o) walk(x, fn) } else if (o && typeof o === 'object') { fn(o); for (const k in o) walk(o[k], fn) }
}
function ytData(html) {
  const m = html.match(/<script id="yt-initial-data"[^>]*>(\{.*?\})<\/script>/s)
  if (m) { try { return JSON.parse(m[1]) } catch { /* try the other form */ } }
  const i = html.indexOf('ytInitialData = ')
  if (i < 0) return null
  const s = html.indexOf('{', i)
  let depth = 0, inStr = false, esc = false
  for (let j = s; j < html.length; j++) {
    const c = html[j]
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) { try { return JSON.parse(html.slice(s, j + 1)) } catch { return null } }
  }
  return null
}
const UNIT_MS = { s: 1e3, m: 60e3, h: 3600e3, d: DAY, w: 7 * DAY, mo: 30.44 * DAY, y: 365.25 * DAY }
function relRange(rel) {
  // "3 months ago", "2w ago", "1d ago" -> [youngest, oldest] possible age in ms (deliberately generous)
  const m = (rel || '').match(/(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|wks?|months?|mos?|years?|yrs?|mo|[smhdwy])\b/i)
  if (!m) return null
  const n = +m[1], u = m[2].toLowerCase()
  const k = /^mo|^month/.test(u) ? 'mo' : /^s/.test(u) ? 's' : /^min|^m$/.test(u) ? 'm' : /^h/.test(u) ? 'h' : /^d/.test(u) ? 'd' : /^w/.test(u) ? 'w' : 'y'
  return [Math.max(0, n - 1) * UNIT_MS[k], (n + 1) * UNIT_MS[k]]
}
const durSec = (t) => (t || '').split(':').reduce((a, b) => a * 60 + +b, 0) || 0
function lockups(data) {
  const out = []
  walk(data, (o) => {
    const l = o.lockupViewModel
    if (l && l.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
      const md = l.metadata?.lockupMetadataViewModel
      const parts = (md?.metadata?.contentMetadataViewModel?.metadataRows || []).flatMap((r) => (r.metadataParts || []).map((p) => p.text?.content || ''))
      const dur = JSON.stringify(l).match(/"text":"(\d+:\d\d(?::\d\d)?)"/)?.[1]
      out.push({ kind: 'video', id: l.contentId, title: decode(md?.title?.content || ''), rel: parts.find((p) => /ago/i.test(p)) || '', durSec: durSec(dur) })
    } else if (l && l.contentType === 'LOCKUP_CONTENT_TYPE_PLAYLIST') {
      out.push({ kind: 'playlist', id: l.contentId, title: decode(l.metadata?.lockupMetadataViewModel?.title?.content || '') })
    }
    const s = o.shortsLockupViewModel
    if (s) out.push({ kind: 'short', id: s.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId, title: decode(s.overlayMetadata?.primaryText?.content || ''), rel: '', durSec: 0 })
  })
  return out.filter((x) => x.id)
}
const continuations = (data) => { const t = []; walk(data, (o) => { const k = o.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token; if (k) t.push(k) }); return t }

async function crawlTab(tab, wantTitle) {
  const r = await http(`https://www.youtube.com/${HANDLE}/${tab}`, { ttlH: 1 })
  if (r.status !== 200) return { ok: false, why: `HTTP ${r.status}${r.error ? ' ' + r.error : ''}`, items: [] }
  const data = ytData(r.text)
  if (!data) return { ok: false, why: 'no ytInitialData in page', items: [] }
  const sel = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.find((t) => t.tabRenderer?.selected)?.tabRenderer?.title
  if (sel !== wantTitle) return { ok: true, absent: true, why: `channel has no "${wantTitle}" tab (page fell back to "${sel}")`, items: [] }
  const key = r.text.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1]
  const ver = r.text.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/)?.[1]
  let items = lockups(data), tokens = continuations(data), pages = 1
  while (key && ver && tokens.length && pages < 60) {
    const tok = tokens.shift()
    const c = await http(`https://www.youtube.com/youtubei/v1/browse?key=${key}&prettyPrint=false`, {
      method: 'POST', ttlH: 1, headers: { 'content-type': 'application/json', origin: 'https://www.youtube.com' },
      body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: ver, hl: 'en', gl: 'NG' } }, continuation: tok }),
    })
    if (c.status !== 200) break
    let j; try { j = JSON.parse(c.text) } catch { break }
    pages++
    items.push(...lockups(j))
    tokens.push(...continuations(j))
  }
  const seen = new Set()
  return { ok: true, items: items.filter((x) => !seen.has(x.id) && seen.add(x.id)), pages }
}

/* RSS: exact publish stamps + full descriptions for the 15 newest entries of a feed. 404s are routine -> retry. */
async function feed(param, id) {
  const r = await http(`https://www.youtube.com/feeds/videos.xml?${param}=${id}`, { ttlH: 1, retries: 4, retry404: true })
  if (r.status !== 200) return null
  return [...r.text.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
    const e = m[1], g = (re) => (e.match(re) || [])[1]
    return { id: g(/<yt:videoId>([^<]+)/), title: decode(g(/<media:title>([^<]*)/)), published: Date.parse(g(/<published>([^<]+)/)), desc: decode(g(/<media:description>([\s\S]*?)<\/media:description>/) || '') }
  }).filter((x) => x.id && Number.isFinite(x.published))
}

/* i.ytimg.com: does the id resolve, and (custom thumbnails only) when was the thumbnail set? */
async function thumb(id) {
  const r = await http(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`, { method: 'HEAD', ttlH: 24 * 7 })
  const epoch = /^"?(\d{9,10})"?$/.exec(r.headers?.etag || '')
  const t = epoch ? +epoch[1] * 1000 : null
  return { ok: r.status === 200 && +r.headers?.len > 1500, status: r.status, at: t && t > Date.UTC(2010, 0, 1) && t < Date.now() + DAY ? t : null }
}
async function oembed(id) {
  const r = await http(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}&format=json`, { ttlH: 24 * 7, accept: [200, 401, 404] })
  if (r.status === 200) { try { const j = JSON.parse(r.text); return { ok: true, title: decode(j.title), mine: new RegExp(HANDLE.slice(1), 'i').test(j.author_url || '') } } catch { /* below */ } }
  return { ok: false, status: r.status }
}

/* ---------------------------------------------------------------------------
 * Bible references and text similarity
 * ------------------------------------------------------------------------- */
const BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Psalm', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation']
const REF_RE = new RegExp(`\\b(${BOOKS.map((b) => b.replace(/^([1-3]) /, '$1\\s?').replace(/ /g, '\\s+')).join('|')})\\s+(\\d{1,3})\\s*[:.]\\s*(\\d{1,3})(?:\\s*[–—-]\\s*(\\d{1,3}))?`, 'gi')
const bookKey = (b) => b.toLowerCase().replace(/\s+/g, '').replace('psalms', 'psalm')
function refsIn(text) {
  const out = []
  for (const m of (text || '').matchAll(REF_RE)) out.push({ book: bookKey(m[1]), ch: +m[2], v1: +m[3], v2: +(m[4] || m[3]) })
  return out
}
const refLabel = (r) => `${r.book} ${r.ch}:${r.v1}${r.v2 !== r.v1 ? '-' + r.v2 : ''}`
/** 3 = the episode's main verse, 2 = its chapter, 1.5/1 = a supporting verse/chapter, 0 = none; -1 = description cites scripture but none of ours */
function scriptureScore(descRefs, ep) {
  if (!descRefs.length || !ep) return { score: 0, hit: null }
  const mine = [ep.scripture?.ref, ...(ep.supporting || []).map((s) => s.ref)].map((r) => refsIn((r || '').replace(/\(.*?\)/g, ''))[0]).filter(Boolean)
  if (!mine.length) return { score: 0, hit: null }
  let best = { score: -1, hit: null }
  mine.forEach((m, i) => {
    for (const d of descRefs) {
      if (d.book !== m.book || d.ch !== m.ch) continue
      const verse = d.v1 <= m.v2 && m.v1 <= d.v2
      const s = i === 0 ? (verse ? 3 : 2) : verse ? 1.5 : 1
      if (s > best.score) best = { score: s, hit: refLabel(m) }
    }
  })
  return best
}

const STOP = new Set('a an the and or but if of to in on at by for with from as is are was were be been being it its this that these those you your yours i me my we our us they them their he him his she her not no do does did done so than then too very can will just about into over under again more most some any all each every how what why when where who whom which there here out up down off one two get got have has had also only own same such both few other now still yet even ever never always god lord shall may must make made take come going know thing things way people man life day days isnt dont cant wont'.split(' '))
const stem = (w) => w.replace(/(ing|edly|ed|eth|est|es|s|ly)$/, '').replace(/(.)\1$/, '$1')
const toks = (t) => (t || '').toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)).map(stem).filter((w) => w.length > 2)

/* ---------------------------------------------------------------------------
 * Existing file (old flat July shape -> per-series) and the library
 * ------------------------------------------------------------------------- */
function loadExisting() {
  let raw = {}
  if (existsSync(OUT)) { try { raw = JSON.parse(readFileSync(OUT, 'utf8')) } catch (e) { throw new Error(`videos.json is not valid JSON (${e.message}); refusing to overwrite it`) } }
  if (raw.days && !raw['secrets-of-longevity']) {
    raw = { 'secrets-of-longevity': { days: raw.days, shorts: raw.shorts || [], shortsPlaylist: raw.shortsPlaylist ?? null }, ...(raw._exclude ? { _exclude: raw._exclude } : {}) }
  }
  return raw
}
function loadLibrary() {
  if (!existsSync(LIB)) throw new Error('src/content/library.json is missing; run `node scripts/build-content.mjs` first')
  const lib = JSON.parse(readFileSync(LIB, 'utf8'))
  return lib.order.map((id) => lib.series[id]).sort((a, b) => a.year - b.year || a.monthNum - b.monthNum)
}
function slotsOf(s) {
  const dated = Object.values(s.episodes).some((e) => e.date)
  const slots = s.calendar.filter((d) => d.episode && s.episodes[d.episode]).map((d) => {
    const ep = s.episodes[d.episode]
    return { day: d.day, n: d.episode, ep, type: d.type, time: dated ? Date.UTC(s.year, s.monthNum - 1, d.day, PREMIERE_UTC_HOUR) : null }
  })
  slots.sort((a, b) => a.n - b.n)
  return { dated, slots }
}
const episodeDoc = (ep) => toks([ep.title, ep.title, ep.title, ep.truth, ep.truth, ep.hook, ep.illustration, ep.challenge, ep.scripture?.text, ...(ep.supporting || []).map((x) => x.text), ...(ep.points || []).flatMap((p) => [p.title, p.title, p.body]), ep.transition, ...(ep.apply || [])].join(' '))
const shortDoc = (sh) => toks([sh?.title, sh?.title, sh?.hook, sh?.hook, sh?.truth, sh?.quote, sh?.challenge].join(' '))

/* BM25 of a title against every slot's text; idf is computed over all slots of all series so shared words count for little. */
function topicIndex(seriesList) {
  const docs = []
  for (const s of seriesList) {
    const { slots } = slotsOf(s)
    for (const sl of slots) {
      const sh = s.shorts.find((x) => x.n === sl.n)
      const verse = new Set(toks([sl.ep.scripture?.text, ...(sl.ep.supporting || []).map((x) => x.text)].join(' ')))
      docs.push({ series: s.id, day: sl.day, n: sl.n, ep: toks(sl.ep.title), tk: episodeDoc(sl.ep), tkShort: [...episodeDoc(sl.ep), ...shortDoc(sh)], short: sh, verse })
    }
  }
  const df = new Map()
  for (const d of docs) for (const w of new Set(d.tkShort)) df.set(w, (df.get(w) || 0) + 1)
  const N = docs.length, idf = (w) => Math.log((N + 1) / (1 + (df.get(w) || 0))) + 0.01
  const avg = docs.reduce((a, d) => a + d.tkShort.length, 0) / N
  for (const d of docs) { d.tf = new Map(); for (const w of d.tkShort) d.tf.set(w, (d.tf.get(w) || 0) + 1) }
  const bm25 = (q, d) => { let s = 0; for (const w of new Set(q)) { const f = d.tf.get(w) || 0; if (f) s += idf(w) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.tkShort.length / avg)) } return s }
  return { docs, bm25 }
}

/* ---------------------------------------------------------------------------
 * Main
 * ------------------------------------------------------------------------- */
async function main() {
  const library = loadLibrary()
  const picked = library.filter((s) => !FLAGS.only.length || FLAGS.only.includes(s.id))
  const existing = loadExisting()
  const exclude = new Set(existing._exclude || [])
  const next = { _comment: '', ...Object.fromEntries(Object.entries(existing).filter(([k]) => !k.startsWith('_') && !library.some((s) => s.id === k))) }
  const unmatched = {}
  const log = { add: [], change: [], warn: [], keep: 0 }

  /* ---- 1. harvest ---- */
  const up = { videos: [], shorts: [], playlists: [] }
  let reachable = true
  if (!FLAGS.validateOnly) {
    const v = await crawlTab('videos', 'Videos')
    if (!v.ok) {
      reachable = false
      warn(`cannot read the channel's Videos tab from this machine (${v.why}).`)
      warn('videos.json is left exactly as it is. Re-run from a network that can reach youtube.com.')
      process.exitCode = 2
    } else {
      up.videos = v.items.filter((x) => x.kind === 'video')
      const sh = await crawlTab('shorts', 'Shorts')
      up.shorts = sh.items.filter((x) => x.kind === 'short')
      const pl = await crawlTab('playlists', 'Playlists')
      up.playlists = pl.items.filter((x) => x.kind === 'playlist')
      const lv = await crawlTab('streams', 'Live')
      if (lv.items.length) up.videos.push(...lv.items.filter((x) => x.kind === 'video' && !up.videos.some((y) => y.id === x.id)))
      say(`channel: ${up.videos.length} videos, ${up.shorts.length} shorts, ${up.playlists.length} playlists${lv.absent ? ' (no Live tab)' : ''}`)
    }
  }
  const byId = new Map()
  up.videos.forEach((u, i) => byId.set(u.id, { ...u, idx: i, relR: relRange(u.rel) }))
  up.shorts.forEach((u, i) => byId.set(u.id, { ...u, idx: i, relR: null }))

  /* RSS: channel feed + the feed of each playlist that carries a series' name (or all of them with --all-feeds) */
  const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const seriesPlaylist = new Map()
  for (const s of picked) {
    const p = up.playlists.find((x) => norm(x.title) === norm(s.title))
    if (p) seriesPlaylist.set(s.id, p.id)
  }
  if (reachable && !FLAGS.validateOnly) {
    const feeds = [['channel_id', CHANNEL_ID], ...[...new Set([...seriesPlaylist.values(), ...(FLAGS.allFeeds ? up.playlists.map((p) => p.id) : [])])].map((id) => ['playlist_id', id])]
    let got = 0
    for (const [param, id] of feeds) {
      const es = await feed(param, id)
      if (!es) { if (FLAGS.verbose) say(`  feed ${param}=${id.slice(0, 14)}: unavailable (YouTube answers these with a 404 at random)`); continue }
      got++
      for (const e of es) {
        const u = byId.get(e.id)
        if (u) { u.exact = e.published; u.desc = e.desc } else byId.set(e.id, { id: e.id, title: e.title, kind: 'video', exact: e.published, desc: e.desc, idx: -1, durSec: 0, rel: '' })
      }
    }
    say(`rss: ${got}/${feeds.length} feeds answered`)
    // sanity: exact stamps must run monotonically along the upload order, or "order" evidence is untrustworthy
    const ex = up.videos.map((u) => byId.get(u.id)).filter((u) => u.exact)
    for (let i = 1; i < ex.length; i++) if (ex[i].exact > ex[i - 1].exact) warn(`upload order is not chronological around ${ex[i].id} (${fmtUtc(ex[i].exact)})`)
  }

  /* re-uploads: same duration (to the second) as an earlier upload AND either a clean "Ep N ·" title or the same
     scripture set in the description. The premiere (the earlier one) is the one the app wants. Duration alone is not
     enough: with ~10-minute episodes, unrelated uploads collide on the same second. */
  const alt = new Map()
  {
    const all = [...byId.values()].filter((u) => u.kind === 'video' && u.idx >= 0).sort((a, b) => b.idx - a.idx)
    const chapters = (u) => uniq(refsIn(u.desc).map((r) => `${r.book} ${r.ch}`))
    all.forEach((u, p) => {
      if (!u.durSec) return
      const epTitle = /^\s*ep(isode)?\.?\s*\d+\s*[·:|–—-]/i.test(u.title)
      const mine = chapters(u)
      const near = all.slice(0, p).filter((v) => v.durSec && Math.abs(v.durSec - u.durSec) <= 1)
      const same = near.filter((v) => { const t = chapters(v); return mine.length && t.length && mine.filter((x) => t.includes(x)).length / uniq([...mine, ...t]).length >= 0.6 })
      if (!epTitle && !same.length) return
      // which earlier upload is the original? the one whose title shares most words; if none does, say so rather than guess
      const mineT = new Set(toks(u.title))
      const ranked = (same.length ? same : near).map((v) => ({ v, s: toks(v.title).filter((w) => mineT.has(w)).length })).sort((a, b) => b.s - a.s)
      const sure = ranked.length === 1 || (ranked[0].s > 0 && ranked[0].s > ranked[1].s)
      alt.set(u.id, { of: sure ? ranked[0].v.id : null, several: ranked.length })
    })
  }

  /* ---- 2. per series: episodes ---- */
  const claimed = new Set()
  for (const s of library) for (const id of Object.values(existing[s.id]?.days || {})) claimed.add(id)
  for (const s of library) for (const x of existing[s.id]?.shorts || []) claimed.add(x.videoId)
  const topics = topicIndex(library)
  const assigned = {} // seriesId -> Map(day -> {id, conf, evidence, source, n})
  const results = {}

  for (const s of picked) {
    const prev = existing[s.id] || {}
    const prevMeta = prev._meta || { days: {}, shorts: {} }
    const { dated, slots } = slotsOf(s)
    const A = new Map() // day -> assignment
    assigned[s.id] = A
    for (const sl of slots) {
      const have = prev.days?.[sl.day]
      if (have) {
        const m = prevMeta.days?.[sl.day] || {}
        A.set(sl.day, { id: have, conf: m.confidence || 'manual', source: m.source || 'manual', evidence: m.evidence || [], n: sl.n, kept: true })
      }
    }
    if (!reachable || FLAGS.validateOnly) { results[s.id] = { slots, dated, why: new Map() }; continue }

    // pool of long-form candidates for this series, oldest -> newest
    const monthStart = Date.UTC(s.year, s.monthNum - 1, 1), monthEnd = Date.UTC(s.year, s.monthNum, 1) - 1
    const winLo = (dated ? slots[0].time : monthStart) - 7 * DAY
    const winHi = (dated ? slots[slots.length - 1].time : monthEnd) + 6 * 3600e3
    const now = Date.now()
    const coarse = [...byId.values()].filter((u) => u.kind === 'video' && u.idx >= 0 && (!u.relR || (now - u.relR[1] <= winHi + 45 * DAY && now - u.relR[0] >= winLo - 45 * DAY)))
    for (const u of coarse) if (u.thumbAt === undefined) { const t = await thumb(u.id); u.thumbOk = t.ok; u.thumbAt = t.at }
    const chron = [...byId.values()].filter((u) => u.kind === 'video' && u.idx >= 0).sort((a, b) => b.idx - a.idx)
    chron.forEach((u, i) => { u.pos = i })
    const known = (u) => u.exact ?? u.thumbAt ?? null
    // A thumbnail's ETag moves whenever it is re-uploaded, so an old video can carry a "new" date. Require the
    // coarse relative age ("5 months ago") to agree before trusting it.
    const ageOk = (u) => !u.relR || (now - u.relR[1] <= winHi + 20 * DAY && now - u.relR[0] >= winLo - 20 * DAY)
    const neighbour = (u, dir) => { for (let i = u.pos + dir; i >= 0 && i < chron.length; i += dir) { if (!ageOk(chron[i])) continue; const k = known(chron[i]); if (k != null) return k } return null }
    const approx = (u) => known(u) ?? neighbour(u, -1) // a lower bound for undated uploads: the nearest older dated one
    const inWindow = (u) => {
      if (!ageOk(u)) return false
      const k = known(u)
      if (k != null) return k >= winLo && k <= winHi
      const lo = neighbour(u, -1), hi = neighbour(u, 1)
      return lo != null && hi != null && lo >= winLo && hi <= winHi
    }
    // (thumbnails precede the premiere, so the slack belongs at the END of the month, not the start)
    const inMonth = (u) => { const t = approx(u); return t != null && t >= monthStart && t <= monthEnd + 2 * DAY }
    const taken = (u) => [...A.values()].some((a) => a.id === u.id)
    const pool = chron.filter((u) => inWindow(u) && !alt.has(u.id) && !exclude.has(u.id) && (!claimed.has(u.id) || taken(u)) && u.thumbOk !== false)
    const why = new Map()
    const mark = (sl, id, conf, evidence) => { A.set(sl.day, { id, conf, source: 'auto', evidence, n: sl.n }); claimed.add(id) }

    // exact stamp on the slot's day -> pair it, judged by the description's scripture
    if (dated) {
      for (const sl of slots) {
        if (A.has(sl.day)) continue
        const day = pool.filter((u) => u.exact && watDay(u.exact) === sl.day && !taken(u))
        if (!day.length) continue
        const scored = day.map((u) => ({ u, sc: scriptureScore(refsIn(u.desc), sl.ep) })).sort((a, b) => b.sc.score - a.sc.score || a.u.exact - b.u.exact)
        const top = scored[0]
        const rivals = scored.filter((x) => x.u !== top.u && x.sc.score >= top.sc.score - 0.5)
        if (top.sc.score >= 1 && !rivals.length) mark(sl, top.u.id, 'confirmed', [`rss-published ${fmtUtc(top.u.exact)}`, `scripture ${top.sc.hit}`])
        else if (scored.length === 1 && top.sc.score >= 0) mark(sl, top.u.id, 'confirmed', [`rss-published ${fmtUtc(top.u.exact)}`, 'only upload that day'])
        else why.set(sl.day, `${scored.length} uploads on ${fmtDay(sl.time)} and the description scripture does not single one out: ${scored.map((x) => x.u.id).join(', ')}`)
      }
    }

    // order-fit between anchors
    const anchors = () => slots.map((sl, i) => ({ i, sl, a: A.get(sl.day) })).filter((x) => x.a).map((x) => ({ ...x, u: byId.get(x.a.id) })).filter((x) => x.u && x.u.pos != null)
    const inOrder = (list) => { const out = []; for (const x of list) if (!out.length || x.u.pos > out[out.length - 1].u.pos) out.push(x); return out }
    const fit = (lo, hi) => {
      const M = slots.filter((sl, i) => i > lo.i && i < hi.i && !A.has(sl.day))
      if (!M.length) return
      const C = pool.filter((u) => u.pos > lo.pos && u.pos < hi.pos && !taken(u))
      const label = `${M.map((x) => x.n).join(',')}`
      if (C.length !== M.length) { for (const sl of M) why.set(sl.day, C.length ? `count mismatch: ${C.length} candidate upload(s) for ${M.length} lesson(s) between eps ${lo.n} and ${hi.n} [${C.map((u) => u.id).join(', ')}]` : `no upload between the videos for eps ${lo.n} and ${hi.n}`); return }
      // The calendar date vetoes a pairing only while the schedule is being kept; if a neighbouring anchor itself shows the
      // premieres running late, the calendar is no longer evidence and order alone decides.
      const slipped = dated && [lo, hi].some((b) => b.u && known(b.u) != null && known(b.u) > slots[b.i].time + 6 * 3600e3)
      const bad = !slipped && M.find((sl, k) => dated && (C[k].exact ? watDay(C[k].exact) !== sl.day : C[k].thumbAt != null && C[k].thumbAt > sl.time + 6 * 3600e3))
      if (bad) { for (const sl of M) why.set(sl.day, `order-fit would break the date: ${bad.n}`); return }
      M.forEach((sl, k) => mark(sl, C[k].id, 'high', [`order-fit ${C.length}/${M.length} between eps ${lo.n} and ${hi.n}${slipped ? ' (premieres were running late here)' : ''}`, ...(C[k].thumbAt != null && dated ? [`thumb-set ${fmtUtc(C[k].thumbAt)}`] : [])]))
    }
    const A0 = inOrder(anchors().map((x) => ({ ...x, pos: x.u.pos, n: x.sl.n })))
    const head = { i: -1, pos: -1, n: 'start' }, tail = { i: slots.length, pos: chron.length, n: 'end' }
    const bounds = [head, ...A0.map((x) => ({ i: x.i, pos: x.u.pos, n: x.sl.n, u: x.u })), tail]
    for (let k = 0; k + 1 < bounds.length; k++) fit(bounds[k], bounds[k + 1])

    // synthetic calendars: premieres can run out of lesson order; swap two neighbours when each title's best slot is the other's
    if (!dated) {
      const docs = topics.docs.filter((d) => d.series === s.id)
      const best = (u) => { const q = toks(u.title); const sc = docs.map((d) => [topics.bm25(q, d), d]).sort((a, b) => b[0] - a[0]); return { top: sc[0][1], v: sc[0][0], second: sc[1][0] } }
      const mine = slots.filter((sl) => A.get(sl.day)?.source === 'auto')
      for (let k = 0; k + 1 < mine.length; k++) {
        const a = A.get(mine[k].day), b = A.get(mine[k + 1].day)
        if (mine[k + 1].n !== mine[k].n + 1) continue
        const ba = best(byId.get(a.id)), bb = best(byId.get(b.id))
        if (ba.top.n === mine[k + 1].n && bb.top.n === mine[k].n && ba.v - ba.second >= 1 && bb.v - bb.second >= 1) {
          const note = 'title names this lesson, not its neighbour (premiere order differs from lesson order)'
          A.set(mine[k].day, { ...b, n: mine[k].n, evidence: [...b.evidence, note] })
          A.set(mine[k + 1].day, { ...a, n: mine[k + 1].n, evidence: [...a.evidence, note] })
          k++
        }
      }
    }
    for (const sl of slots) if (!A.has(sl.day) && !why.has(sl.day)) why.set(sl.day, dated ? 'no upload found for this date or between its neighbours' : 'no anchor to order against: add one manual day to videos.json')
    const leftovers = pool.filter((u) => !taken(u) && inMonth(u))
    const altHere = [...alt.entries()].filter(([id]) => { const u = byId.get(id); return u && ageOk(u) && inMonth(u) })
    results[s.id] = { slots, dated, why, altHere, leftovers, pool }
  }

  /* ---- 3. shorts: no dates exist, so only a title that echoes the matched episode (or a very specific hook) is accepted ---- */
  const shortsOut = {}
  const shortDiag = []
  const usedShorts = new Set([...claimed])
  for (const s of library) for (const a of (assigned[s.id] || new Map()).values()) usedShorts.add(a.id)
  if (reachable && !FLAGS.validateOnly) {
    // Three routes, all strict (precision over recall: a short with no clear owner stays unmatched). Words are weighted
    // by how rare they are across ALL the channel's titles, so "secret", "life", "money" count for almost nothing.
    //  echo : repeats >= 2 rare words (>= 60 % of the short's title) of exactly one matched episode video's title/summary
    //  verse: repeats >= 2 rare words of exactly one lesson's own scripture text ("count the cost" -> Luke 14:28)
    //  hook : lands hard on one lesson's text: >= 2 distinct words, BM25 >= 8 and clearly ahead of the runner-up
    // Candidates are bounded to shorts newer than the series' first manual short (or, failing that, ~1 per day since its
    // start): it keeps 2025 shorts from "matching" 2026 lessons on a stray word.
    const titleDf = new Map()
    for (const u of byId.values()) for (const w of new Set(toks(u.title))) titleDf.set(w, (titleDf.get(w) || 0) + 1)
    const idfT = (w) => Math.log((byId.size + 1) / (1 + (titleDf.get(w) || 0)))
    const weight = (ws) => ws.reduce((a, w) => a + idfT(w), 0)
    const manualIdx = library.flatMap((s) => (existing[s.id]?.shorts || []).map((x) => byId.get(x.videoId)?.idx)).filter((i) => i != null && i >= 0)
    const firstStart = Math.min(...picked.map((s) => Date.UTC(s.year, s.monthNum - 1, 1)))
    const shortLimit = manualIdx.length ? Math.max(...manualIdx) + 3 : Math.ceil((Date.now() - firstStart) / DAY) + 5
    const cands = up.shorts.map((u) => byId.get(u.id)).filter((u) => u.idx <= shortLimit && !usedShorts.has(u.id) && !exclude.has(u.id))
    const docs = topics.docs.filter((d) => picked.some((s) => s.id === d.series))
    const epVideo = (series, n) => {
      const a = [...(assigned[series] || new Map()).values()].find((x) => x.n === n)
      const u = a && byId.get(a.id)
      return u ? new Set(toks(u.title + ' ' + (u.desc || '').split(/\n\s*\n|Time ?stamps/i).slice(0, 2).join(' ').slice(0, 400))) : null
    }
    const vt = new Map(docs.map((d) => [d, epVideo(d.series, d.n)]))
    const perSlot = new Map()
    for (const c of cands) {
      const q = uniq(toks(c.title))
      if (q.length < 2) continue
      const rows = docs.map((d) => {
        const v = vt.get(d)
        const echoW = v ? q.filter((w) => v.has(w)) : []
        const verseW = q.filter((w) => d.verse.has(w))
        const hit = q.filter((w) => d.tf.has(w))
        return { d, bm: topics.bm25(q, d), echoW, echo: v ? echoW.length / q.length : 0, verseW, hit }
      })
      const best = (key) => [...rows].sort((a, b) => weight(b[key]) - weight(a[key]))
      const [e1, e2] = best('echoW'), [v1, v2] = best('verseW'), [h1, h2] = [...rows].sort((a, b) => b.bm - a.bm)
      let pick = null, via = ''
      if (e1.echoW.length >= 2 && e1.echo >= 0.6 && weight(e1.echoW) >= 12 && weight(e2.echoW) <= weight(e1.echoW) * 0.5) { pick = e1; via = `title echoes the episode video ("${e1.echoW.join(' ')}")` }
      else if (v1.verseW.length >= 2 && v1.verseW.length / q.length >= 0.5 && weight(v1.verseW) >= 8 && weight(v2.verseW) <= weight(v1.verseW) * 0.5) { pick = v1; via = `repeats the lesson's own verse ("${v1.verseW.join(' ')}")` }
      else if (h1.hit.length >= 3 && h1.bm >= 8.8 && h1.bm - h2.bm >= 3) { pick = h1; via = `hook/lesson text match (bm25 ${h1.bm.toFixed(1)}, runner-up ${h2.bm.toFixed(1)})` }
      else if (e1.d === h1.d && e1.echoW.length >= 2 && weight(e1.echoW) >= 8 && h1.bm >= 8 && h1.bm - h2.bm >= 3) { pick = h1; via = `title echoes the episode video ("${e1.echoW.join(' ')}") and the hook text lands on the same lesson (bm25 ${h1.bm.toFixed(1)}, runner-up ${h2.bm.toFixed(1)})` }
      // a short we can date must fall inside (or shortly after) the series' month
      const ser = pick && library.find((x) => x.id === pick.d.series)
      if (pick && c.exact && (c.exact < Date.UTC(ser.year, ser.monthNum - 1, 1) - 3 * DAY || c.exact > Date.UTC(ser.year, ser.monthNum, 1) + 30 * DAY)) pick = null
      if (FLAGS.verbose && (pick || weight(e1.echoW) >= 6 || weight(v1.verseW) >= 6 || h1.bm >= 7)) shortDiag.push(`    ${pick ? 'ACCEPT' : 'reject'} #${c.idx} ${c.id} "${c.title.slice(0, 44)}" | echo d${e1.d.day} ${weight(e1.echoW).toFixed(1)} [${e1.echoW.join(' ')}] | verse d${v1.d.day} ${weight(v1.verseW).toFixed(1)} [${v1.verseW.join(' ')}] | hook d${h1.d.day} ${h1.bm.toFixed(1)}/${h2.bm.toFixed(1)}`)
      if (!pick) continue
      const k = pick.d.series + ':' + pick.d.n
      const list = perSlot.get(k) || []
      list.push({ day: pick.d.day, n: pick.d.n, series: pick.d.series, videoId: c.id, title: c.title, via, strength: weight([...pick.echoW, ...pick.verseW]) + pick.bm / 100 })
      perSlot.set(k, list)
    }
    for (const list of perSlot.values()) for (const x of list.sort((a, b) => b.strength - a.strength).slice(0, 3)) (shortsOut[x.series] ||= []).push(x)
  }

  /* ---- 4. validate what we are about to write, then assemble ---- */
  const resolves = new Map()
  const check = async (id) => {
    if (resolves.has(id)) return resolves.get(id)
    if (FLAGS.noValidate || FLAGS.offline && !existsSync(CACHE_DIR)) { const r = { ok: true, skipped: true }; resolves.set(id, r); return r }
    const t = await thumb(id)
    const o = t.ok ? await oembed(id) : { ok: false }
    const r = { ok: t.ok && o.ok && (o.mine !== false), title: o.title, embeddable: o.ok, status: t.status, thumbAt: t.at }
    resolves.set(id, r)
    return r
  }

  for (const s of library) {
    const prev = existing[s.id]
    const picks = picked.includes(s)
    if (!picks && prev) { next[s.id] = prev; continue }
    if (!picks) continue
    const res = results[s.id] || { slots: [], why: new Map() }
    const days = {}, metaDays = {}, metaShorts = {}, shorts = []
    const prevMeta = prev?._meta || {}
    const A = assigned[s.id] || new Map()
    // days
    for (const [day, a] of [...A.entries()].sort((x, y) => x[0] - y[0])) {
      const old = prev?.days?.[day]
      const manual = old && (!prevMeta.days?.[day] || ['manual', 'curated'].includes(prevMeta.days[day].source))
      const chk = await check(a.id)
      if (!chk.ok && !a.kept) { log.warn.push(`${s.id} day ${day}: ${a.id} does not resolve (thumbnail ${chk.status}); not written`); continue }
      if (!chk.ok && a.kept) log.warn.push(`${s.id} day ${day}: existing ${a.id} no longer resolves (thumbnail ${chk.status}) - kept, please check`)
      if (old && old !== a.id) {
        if (manual) { log.warn.push(`CONFLICT ${s.id} day ${day}: file has ${old}, evidence says ${a.id} - manual entry kept`); days[day] = old; metaDays[day] = prevMeta.days?.[day] || { source: 'manual' }; continue }
      }
      days[day] = a.id
      const u = byId.get(a.id)
      const rank = { title: 0, high: 1, confirmed: 2, manual: 3 }
      const keepPrev = prevMeta.days?.[day]
      const m = { source: a.source, confidence: a.conf, episode: a.n, title: chk.title || u?.title || keepPrev?.title, evidence: uniq([...(keepPrev?.id === a.id || old === a.id ? keepPrev?.evidence || [] : []), ...a.evidence]).sort() }
      if (u?.exact) m.published = fmtUtc(u.exact); else if (keepPrev?.published && old === a.id) m.published = keepPrev.published
      if (old === a.id && keepPrev) { m.source = keepPrev.source || m.source; if ((rank[keepPrev.confidence] ?? 0) > (rank[m.confidence] ?? 0)) m.confidence = keepPrev.confidence; for (const k of Object.keys(keepPrev)) if (!(k in m)) m[k] = keepPrev[k] }
      if (u?.kind === 'short') m.kind = 'short'
      if (!m.evidence?.length) delete m.evidence
      metaDays[day] = m
      if (!old) log.add.push(`${s.id} day ${day} (ep ${a.n}) -> ${a.id}  [${m.confidence}] ${m.title || ''}`)
      else if (old !== a.id) log.change.push(`${s.id} day ${day}: ${old} -> ${a.id}`)
      else log.keep++
    }
    // days that are not episode slots (the July intro, say) are carried over untouched, and still checked
    for (const [day, id] of Object.entries(prev?.days || {})) {
      if (days[day]) continue
      const chk = await check(id)
      if (!chk.ok) log.warn.push(`${s.id} day ${day}: existing ${id} no longer resolves (thumbnail ${chk.status}) - kept, please check`)
      const keepPrev = prevMeta.days?.[day] || { source: 'manual', confidence: 'manual', evidence: [] }
      days[day] = id
      metaDays[day] = { ...keepPrev, ...(chk.title ? { title: chk.title } : {}), ...(byId.get(id)?.kind === 'short' ? { kind: 'short' } : {}) }
      log.keep++
    }
    // shorts: keep every existing one, refresh its title, then add the new matches
    const have = new Map((prev?.shorts || []).map((x) => [x.videoId, x]))
    for (const x of prev?.shorts || []) {
      const chk = await check(x.videoId)
      if (!chk.ok) log.warn.push(`${s.id} short day ${x.day}: ${x.videoId} no longer resolves (thumbnail ${chk.status}) - kept, please check`)
      const title = chk.title || x.title
      if (title !== x.title) log.change.push(`${s.id} short ${x.videoId}: title "${x.title}" -> "${title}"`)
      shorts.push({ day: x.day, videoId: x.videoId, title })
      metaShorts[x.videoId] = prevMeta.shorts?.[x.videoId] || { source: 'manual' }
    }
    for (const x of shortsOut[s.id] || []) {
      if (have.has(x.videoId)) continue
      const chk = await check(x.videoId)
      if (!chk.ok) continue
      shorts.push({ day: x.day, videoId: x.videoId, title: chk.title || x.title })
      metaShorts[x.videoId] = { source: 'auto', confidence: 'title', episode: x.n, evidence: [x.via] }
      log.add.push(`${s.id} short for day ${x.day} (ep ${x.n}) -> ${x.videoId}  [title] ${x.title}`)
    }
    shorts.sort((a, b) => a.day - b.day || (metaShorts[a.videoId]?.source === 'manual' ? -1 : 1))
    // unmatched
    const dayRows = res.slots.filter((sl) => !days[sl.day]).map((sl) => ({ day: sl.day, episode: sl.n, title: sl.ep.title, reason: res.why.get(sl.day) || 'not matched', ...(existing._notes?.[s.id]?.[sl.day] ? { note: existing._notes[s.id][sl.day] } : {}) }))
    const lessonShort = new Set(shorts.filter((x) => metaShorts[x.videoId]?.episode != null).map((x) => x.day))
    const shortDays = res.slots.map((sl) => sl.day).filter((d) => !lessonShort.has(d))
    const loose = (res.leftovers || []).map((u) => ({ videoId: u.id, title: u.title, note: 'published in this month but fits no lesson' }))
    // re-uploads recognised in this series' month, recorded in _meta so nobody maps the later copy by mistake
    const altRows = (res.altHere || []).map(([id, a]) => ({ videoId: id, ...a, title: byId.get(id).title }))
    const prevUnm = existing._unmatched?.[s.id]
    if (dayRows.length || shortDays.length) {
      unmatched[s.id] = { days: dayRows, daysWithoutLessonShort: shortDays, ...(loose.length ? { unusedUploads: loose } : {}) }
    } else if (prevUnm && !res.slots.length) unmatched[s.id] = prevUnm
    const entry = { ...(prev || {}) }
    delete entry._meta
    entry.playlist = seriesPlaylist.get(s.id) || prev?.playlist || undefined
    entry.days = days
    entry.shorts = shorts
    entry.shortsPlaylist = prev?.shortsPlaylist ?? null
    entry._meta = { days: metaDays, shorts: metaShorts, ...(altRows.length ? { reUploads: Object.fromEntries(altRows.map((r) => [r.videoId, { title: r.title, ...(r.of ? { of: r.of } : { note: `same length as ${r.several} earlier uploads; the original is ambiguous` }) }])) } : prevMeta.reUploads ? { reUploads: prevMeta.reUploads } : {}), ...(prevMeta.corrections ? { corrections: prevMeta.corrections } : {}) }
    if (entry.playlist === undefined) delete entry.playlist
    next[s.id] = entry
  }

  /* ---- 5. emit ---- */
  next._comment = 'Per-series map of day -> YouTube id (and Shorts) for the lesson "watch" slide and the Shorts feed. Generated by scripts/map-videos.mjs; edit by hand freely: entries without _meta, or with source "manual"/"curated", are never overwritten (a contradiction is printed as CONFLICT). days = the evening episode premiere; shorts[].day = the lesson day a short accompanies. _meta records the evidence; _unmatched lists what could not be mapped confidently and why.'
  next._unmatched = { ...(existing._unmatched || {}), ...unmatched }
  for (const s of picked) if (!unmatched[s.id]) delete next._unmatched[s.id]
  if (!Object.keys(next._unmatched).length) delete next._unmatched
  if (existing._exclude) next._exclude = existing._exclude
  if (existing._notes) next._notes = existing._notes
  const order = ['_comment', ...library.map((s) => s.id), ...Object.keys(next).filter((k) => !k.startsWith('_') && !library.some((s) => s.id === k)), '_exclude', '_notes', '_unmatched']
  const sorted = Object.fromEntries(order.filter((k) => next[k] !== undefined).map((k) => [k, next[k]]))
  const text = serialize(sorted)
  const before = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''

  say('')
  if (FLAGS.verbose && shortDiag.length) { say('shorts considered (strict: echo or hook):'); for (const l of shortDiag.slice(0, 120)) say(l); say('') }
  for (const l of log.add) say('+', l)
  for (const l of log.change) say('~', l)
  for (const l of log.warn) warn(l)
  say(`= ${log.keep} existing day mapping(s) re-confirmed`)
  for (const s of picked) {
    const e = sorted[s.id]
    if (!e) continue
    const slots = slotsOf(s).slots
    const total = slots.length, got = slots.filter((sl) => e.days[sl.day]).length
    say(`  ${s.id}: ${got}/${total} lesson days have an episode video, ${e.shorts.length} short(s) mapped${(sorted._unmatched?.[s.id]?.days || []).length ? `, ${sorted._unmatched[s.id].days.length} day(s) unmatched` : ''}`)
    if (FLAGS.verbose) for (const sl of slots) { const m = e._meta.days[sl.day]; say(`    day ${String(sl.day).padStart(2)} ep ${String(sl.n).padStart(2)} ${(e.days[sl.day] || '-----------').padEnd(11)} ${(m?.confidence || '').padEnd(9)} ${(m?.evidence || []).join(' | ') || (sorted._unmatched?.[s.id]?.days.find((d) => d.day === sl.day)?.reason || '')}`) }
  }
  if (!reachable) return
  if (text === before) { say('videos.json is already up to date.'); return }
  {
    const have = new Map()
    for (const l of before.split('\n')) have.set(l, (have.get(l) || 0) + 1)
    const added = []
    for (const l of text.split('\n')) { const c = have.get(l) || 0; if (c) have.set(l, c - 1); else added.push(l) }
    const removed = [...have].flatMap(([l, c]) => Array(c).fill(l))
    const cap = FLAGS.verbose ? Infinity : 24, cut = (l) => (l.length > 150 ? l.slice(0, 147) + '...' : l)
    say(`diff: +${added.length} / -${removed.length} line(s) in videos.json`)
    for (const l of removed.slice(0, cap)) say('  -', cut(l.trim()))
    for (const l of added.slice(0, cap)) say('  +', cut(l.trim()))
    if (added.length > cap) say(`  ... ${added.length - cap} more added line(s) (use -v to see all)`)
  }
  if (FLAGS.dry) { say('(dry run: nothing written)'); return }
  const tmp = OUT + '.tmp'
  writeFileSync(tmp, text)
  renameSync(tmp, OUT)
  say(`wrote ${OUT}`)
}

/* Layout: one lesson, one short, one piece of evidence per line, so a diff reads like the change it is. */
const J = (v) => JSON.stringify(v)
const inl = (v) => v === null || typeof v !== 'object' ? J(v)
  : Array.isArray(v) ? '[' + v.map(inl).join(', ') + ']'
  : Object.keys(v).length ? '{ ' + Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => `${J(k)}: ${inl(x)}`).join(', ') + ' }' : '{}'
function pp(v, ind) {
  if (v === null || typeof v !== 'object') return J(v)
  const inner = ind + '  '
  if (Array.isArray(v)) {
    if (!v.length) return '[]'
    const flat = inl(v)
    return v.every((x) => x === null || typeof x !== 'object') && flat.length <= 110 ? flat : '[\n' + v.map((x) => inner + pp(x, inner)).join(',\n') + '\n' + ind + ']'
  }
  const ents = Object.entries(v).filter(([, x]) => x !== undefined)
  if (!ents.length) return '{}'
  const flat = inl(v)
  if (flat.length <= 118) return flat
  return '{\n' + ents.map(([k, x]) => inner + J(k) + ': ' + pp(x, inner)).join(',\n') + '\n' + ind + '}'
}
function seriesBlock(e) {
  const ORDER = ['playlist', 'days', 'shorts', 'shortsPlaylist', '_meta']
  const keys = [...ORDER.filter((k) => k in e), ...Object.keys(e).filter((k) => !ORDER.includes(k))]
  const rows = keys.map((k) => {
    const v = e[k]
    if (k === 'days') return Object.keys(v).length ? `    "days": {\n${Object.entries(v).map(([d, id]) => `      ${J(d)}: ${J(id)}`).join(',\n')}\n    }` : '    "days": {}'
    if (k === 'shorts') return v.length ? `    "shorts": [\n${v.map((x) => `      ${inl(x)}`).join(',\n')}\n    ]` : '    "shorts": []'
    if (k === '_meta') {
      const parts = Object.entries(v).filter(([, mv]) => mv && Object.keys(mv).length).map(([mk, mv]) => Array.isArray(mv)
        ? `      ${J(mk)}: [\n${mv.map((x) => `        ${J(x)}`).join(',\n')}\n      ]`
        : `      ${J(mk)}: {\n${Object.entries(mv).map(([id, m]) => `        ${J(id)}: ${inl(m)}`).join(',\n')}\n      }`)
      return `    "_meta": {\n${parts.join(',\n')}\n    }`
    }
    return `    ${J(k)}: ${pp(v, '    ')}`
  })
  return `{\n${rows.join(',\n')}\n  }`
}
function serialize(o) {
  const keys = Object.keys(o)
  const rows = keys.map((k, i) => {
    const v = o[k], comma = i < keys.length - 1 ? ',' : ''
    return `  ${J(k)}: ${v && typeof v === 'object' && !Array.isArray(v) && (v.days || v.shorts) ? seriesBlock(v) : pp(v, '  ')}${comma}`
  })
  return '{\n' + rows.join('\n') + '\n}\n'
}

main().catch((e) => { console.error('map-videos failed:', e.message); process.exit(1) })
