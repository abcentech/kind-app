// Self-check for src/copy.js — the app's voice must never ship an emoji, a shout, a shame word or an unfilled slot.
//   node tools/test-copy.mjs                 run every check (exit 1 on any failure)
//   node tools/test-copy.mjs --inventory     also print the inventory as markdown (paste into docs/COPY.md)
//   node tools/test-copy.mjs --verify-kjv    also fetch every Scripture quotation from bible-api.com and compare to the KJV
//                                            (network, ~2 minutes; the only thing here that leaves the machine)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import * as copy from '../src/copy.js'

const here = dirname(fileURLToPath(import.meta.url))
const lib = JSON.parse(readFileSync(join(here, '../src/content/library.json'), 'utf8'))
const args = new Set(process.argv.slice(2))

let failures = 0
const fail = (msg) => { failures++; console.log('  FAIL  ' + msg) }
const section = (t) => console.log('\n' + t)

/* ── the rules ─────────────────────────────────────────────────────────── */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/u
const BANNED = /\b(oops|whoops|uh-?oh|yay|hooray|awesome|amazing|epic|gotcha|lazy|fail|failed|failure|stupid|dumb|loser|wrong|incorrect|sorry|unfortunately|shame|hey|lol|omg|bro|guys)\b/i
const EMOTICON = /(:\)|:\(|;\)|<3|:D\b)/
// American spellings. Nigerian English is British-based: labour, colour, honour, programme, centre.
const US = /\b(honor|honors|honored|color|colors|colored|labor|labored|favor|favors|favorite|neighbor|neighbors|savior|behavior|center|centers|theater|organiz\w+|realiz\w+|recogniz\w+|apologiz\w+|analyz\w+|catalog|gray|defense|offense|license|program|programs|practice (?:the|it|your|this|a)|traveling|fulfill|enroll)\b/i
const CAPS_OK = new Set(['LORD', 'LORD’S', 'XP', 'KIND', 'WAT', 'ICS', 'PWA', 'KJV', 'AM', 'PM', 'T', 'OK', 'I'])
const TOKENS_OK = new Set(['name', 'n', 'day', 'goal', 'ring', 'mins', 'next', 'when', 'left', 'step', 'steps', 'pct', 'done', 'total', 'title', 'streak', 'no', 'days', 'rank', 'date', 'i', 'at', 'catchUp', 'behind', 'togo', 'xp'])
// Where a single "!" is allowed: real milestones only.
const BANG_OK = /(milestone|rank|month|bar\.finale|share\.month)/i
const BANG_CAP = 8
// Pools that are seen often enough to need six or more variants.
const FREQUENT = [/^greeting\./, /^praise\.(answer|lesson|combo)$/, /^wrong\.line$/, /^streak\.t(1|2|4|8|15|22|32)$/, /^shield\.(used|earned)$/,
  /^bar\.(ready|readyParent|waiting|progress|atRisk|archive|missedShield|missedLost)$/, /^praise\.(practice|leader)$/, /^share\.(verse|streak|invite)$/, /^lessonCopy\.journal$/]
const LABEL_PATH = /(readyEyebrow|splash\.letters)/       // short status labels, not sentences
const isFrequent = (path) => FREQUENT.some((r) => r.test(path))

const letters = (s) => s.replace(/[^A-Za-z]/g, '')
function isAllCaps(s) {
  const stripped = s.replace(/\{\w+\}/g, '').split(/\s+/).filter((w) => !CAPS_OK.has(w.replace(/[^A-Za-z’]/g, ''))).join(' ')
  const L = letters(stripped)
  if (L.length >= 4 && L === L.toUpperCase()) return true
  return /\b[A-Z]{3,}\s+[A-Z]{3,}\b/.test(stripped.replace(/\bT-\d/g, ''))
}

function lint(text, path, { sentence = false, max = 220 } = {}) {
  if (typeof text !== 'string') return fail(`${path}: not a string (${typeof text})`)
  if (!text.trim()) return fail(`${path}: empty`)
  if (EMOJI.test(text)) fail(`${path}: emoji/symbol: ${text}`)
  if (/!!/.test(text)) fail(`${path}: "!!": ${text}`)
  if (/!/.test(text) && !BANG_OK.test(path)) fail(`${path}: "!" outside a milestone: ${text}`)
  if (isAllCaps(text)) fail(`${path}: ALL-CAPS body (write sentence case; CSS uppercases labels): ${text}`)
  if (BANNED.test(text)) fail(`${path}: banned word "${text.match(BANNED)[0]}": ${text}`)
  if (EMOTICON.test(text)) fail(`${path}: emoticon: ${text}`)
  if (US.test(text)) fail(`${path}: American spelling "${text.match(US)[0]}": ${text}`)
  if (/["']/.test(text)) fail(`${path}: straight quote (use ’ “ ”): ${text}`)
  if (/\.\.\./.test(text)) fail(`${path}: "..." (use …): ${text}`)
  if (/ - | -- /.test(text)) fail(`${path}: hyphen as a dash (use —): ${text}`)
  if (/ {2,}|\n {2,}/.test(text)) fail(`${path}: double space: ${text}`)
  if (text !== text.trim()) fail(`${path}: leading/trailing space: "${text}"`)
  if (/\b1 (days|minutes|hours|lessons|answers|shields|cards|weeks)\b/.test(text)) fail(`${path}: "1 ${text.match(/\b1 (\w+)/)[1]}" (singular needed): ${text}`)
  if (/undefined|NaN|\[object|null/.test(text)) fail(`${path}: leaked value: ${text}`)
  if (/ [.,;:?!]/.test(text)) fail(`${path}: space before punctuation: ${text}`)
  if (text.length > max) fail(`${path}: ${text.length} chars (max ${max}): ${text}`)
  for (const m of text.matchAll(/\{(\w+)\}/g)) {
    if (!TOKENS_OK.has(m[1])) fail(`${path}: unknown token {${m[1]}}`)
    if (m[1] === 'name' && !/, \{name\}/.test(text)) fail(`${path}: {name} must follow ", ": ${text}`)
  }
  if (sentence) {
    if (!/^[A-Z0-9{“‘~+-]/.test(text)) fail(`${path}: sentence should start with a capital: ${text}`)
    if (!/[.?!…”’:]$/.test(text)) fail(`${path}: sentence should end with punctuation: ${text}`)
  }
}

/* ── walk the registry ─────────────────────────────────────────────────── */
const seenObj = new Set()
const allText = []            // { path, text, pool }
let poolCount = 0, lineCount = 0
function walk(node, path, pool = false) {
  if (typeof node === 'string') { allText.push({ path, text: node, pool }); return }
  if (typeof node === 'function' || node == null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    const isPool = node.every((x) => typeof x === 'string' || (x && typeof x === 'object' && typeof x.text === 'string'))
    if (isPool && node.length) {
      poolCount++
      checkPool(node, path)
      node.forEach((e, i) => {
        if (typeof e === 'string') { lineCount++; walk(e, `${path}[${i}]`, true) }
        else if (!seenObj.has(e)) {
          seenObj.add(e); lineCount++; walk(e.text, `${path}[${i}]`, true)
          for (const [k, v] of Object.entries(e)) if (k !== 'text' && k !== 'ref' && typeof v === 'string') walk(v, `${path}[${i}].${k}`, false)
        }
      })
    } else node.forEach((e, i) => walk(e, `${path}[${i}]`, pool))
    return
  }
  if (typeof node.text === 'string' && typeof node.ref === 'string') return           // a Line from WORD, walked via pools
  for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k, pool)
}
function checkPool(list, path) {
  const texts = list.map((e) => (typeof e === 'string' ? e : e.text).toLowerCase())
  const dup = texts.find((t, i) => texts.indexOf(t) !== i)
  if (dup) fail(`${path}: duplicate in pool: ${dup}`)
  const min = isFrequent(path) ? 6 : 3
  if (list.length < min) fail(`${path}: ${list.length} variants (needs ${min}+)`)
}

section('Static copy and pools')
walk(copy.POOLS, 'POOLS')
const STATIC = ['coach', 'onboardCopy', 'settingsHelp', 'glossary', 'labels', 'lessonCopy', 'objectives', 'dropChrome', 'reminderChrome', 'GOALS', 'reminderPresets', 'ringLabels']
for (const k of STATIC) walk(copy[k], k)
// Strip the POOLS. prefix for the frequency rules
for (const t of allText) {
  const p = t.path.replace(/^POOLS\./, '').replace(/\[\d+\]$/, '')
  const isCopy = !/(\.id$|\.hour$|\.min$|\.icon$|\.art$|\.action$|\.kind$)/.test(t.path)
  if (!isCopy) continue
  // lint with the pool-aware path so the rules (frequency, "!") see friendly names
  lint(t.text, t.path.replace(/^POOLS\./, ''), { sentence: t.pool && !LABEL_PATH.test(t.path), max: t.pool ? 140 : 220 })
}
// Fix: milestone/rank titles are headings, not sentences; they were linted as plain strings above (sentence=false) – fine.

// Frequency rule, evaluated on registry paths
function eachPool(node, path, fn) {
  if (Array.isArray(node)) { if (node.length && node.every((x) => typeof x === 'string' || (x && typeof x.text === 'string'))) fn(node, path); else node.forEach((e, i) => eachPool(e, `${path}[${i}]`, fn)); return }
  if (node && typeof node === 'object' && !(typeof node.text === 'string' && typeof node.ref === 'string')) for (const [k, v] of Object.entries(node)) eachPool(v, path ? `${path}.${k}` : k, fn)
}
// (pool-size failures were already raised in checkPool using the POOLS path)

// Cross-pool duplicates: any string of more than three words may appear only once in the whole inventory
// (the tagline and the shared reminder chrome are the deliberate exceptions).
const SHARED_OK = new Set([copy.TAGLINE, ...Object.values(copy.reminderChrome)].map((s) => s.toLowerCase()))
const seen = new Map()
for (const t of allText) {
  const norm = t.text.toLowerCase()
  if (norm.split(/\s+/).length <= 3 || SHARED_OK.has(norm)) continue
  if (seen.has(norm) && seen.get(norm) !== t.path) fail(`duplicate across inventory: "${t.text}" at ${seen.get(norm)} and ${t.path}`)
  else seen.set(norm, t.path)
}
const bangs = allText.filter((t) => /!/.test(t.text)).length
if (bangs > BANG_CAP) fail(`${bangs} exclamation marks in the inventory (cap ${BANG_CAP}); they are for milestones only`)
console.log(`  ${allText.length} strings · ${poolCount} variant pools · ${lineCount} pool entries · ${bangs} exclamation marks`)

/* ── Scripture ─────────────────────────────────────────────────────────── */
section('Scripture')
const norm = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const libVerses = new Map()
for (const s of Object.values(lib.series)) {
  const add = (o) => o && o.ref && o.text && libVerses.set(o.ref.replace(/ \(KJV\)$/, ''), norm(o.text))
  add(s.themeScripture)
  for (const e of Object.values(s.episodes)) { add(e.scripture); (e.supporting || []).forEach(add) }
  if (s.intro) add(s.intro.scripture)
}
let checked = 0
const unverified = []
for (const [id, w] of Object.entries(copy.WORD)) {
  lint(w.text, `WORD.${id}`, { sentence: true, max: 140 })
  if (!/^(\d )?[A-Z][a-z]+ \d+:\d+(–\d+)?$/.test(w.ref)) fail(`WORD.${id}: odd reference "${w.ref}"`)
  const hit = libVerses.get(w.ref)
  if (hit) {
    checked++
    if (!hit.includes(norm(w.text))) fail(`WORD.${id}: quotation is not in the library's ${w.ref}: “${w.text}” vs “${hit}”`)
  } else unverified.push(`${w.ref}`)
}
console.log(`  ${Object.keys(copy.WORD).length} quotations · ${checked} matched against the library's KJV text`)
const uniq = [...new Set(unverified)]
if (uniq.length) console.log(`  not in the library (run --verify-kjv or check by hand): ${uniq.join(', ')}`)
// Every Line used in a pool must be a WORD entry (so it is checked), and carry a reference.
const wordSet = new Set(Object.values(copy.WORD))
const usedLines = []
;(function scan(n) {
  if (Array.isArray(n)) n.forEach(scan)
  else if (n && typeof n === 'object') {
    if (typeof n.text === 'string' && typeof n.ref === 'string') usedLines.push(n)
    else Object.values(n).forEach(scan)
  }
})(copy.POOLS)
for (const k of ['coach', 'onboardCopy', 'settingsHelp', 'labels', 'lessonCopy']) (function scan(n) {
  if (Array.isArray(n)) n.forEach(scan)
  else if (n && typeof n === 'object') { if (typeof n.text === 'string' && typeof n.ref === 'string') usedLines.push(n); else Object.values(n).forEach(scan) }
})(copy[k])
for (const l of usedLines) if (!wordSet.has(l)) fail(`quotation outside WORD (unchecked): “${l.text}” — ${l.ref}`)

if (args.has('--verify-kjv')) {
  console.log('  verifying against bible-api.com (KJV)…')
  const byRef = new Map()
  for (const w of Object.values(copy.WORD)) { if (!byRef.has(w.ref)) byRef.set(w.ref, []); byRef.get(w.ref).push(w) }
  for (const [ref, ws] of byRef) {
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`)
      const j = await res.json()
      const text = norm(j.text || '')
      for (const w of ws) if (!text.includes(norm(w.text))) fail(`KJV mismatch ${ref}: ours “${w.text}” vs “${(j.text || '').trim().replace(/\s+/g, ' ')}”`)
    } catch (e) { fail(`could not fetch ${ref}: ${e.message}`) }
    await new Promise((r) => setTimeout(r, 2300))
  }
  console.log(`  ${byRef.size} references checked online`)
}

/* ── determinism, variety, sequences ───────────────────────────────────── */
section('Determinism and variety')
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
for (let i = 0; i < 40; i++) {
  const seed = 'seed-' + i
  const ex = { source: 'scripture', type: 'blank' }
  const ser = lib.series['stewardship-code']
  if (!same(copy.verdictRight(ex, ser, seed), copy.verdictRight(ex, ser, seed))) fail('verdictRight is not deterministic')
  if (!same(copy.praise({ kind: 'lesson', seed, day: 3 }), copy.praise({ kind: 'lesson', seed, day: 3 }))) fail('praise is not deterministic')
  if (!same(copy.greeting('Ada', 20, seed), copy.greeting('Ada', 20, seed))) fail('greeting is not deterministic')
}
const spread = (fn, n, label) => {
  const set = new Set(); for (let i = 0; i < 400; i++) set.add(fn(i)); if (set.size < n) fail(`${label}: only ${set.size} distinct lines in 400 seeds (wanted ${n}+)`)
}
spread((i) => copy.greeting('Ada', 9, 'd' + i), 6, 'greeting morning')
spread((i) => copy.greeting('Ada', 14, 'd' + i), 6, 'greeting afternoon')
spread((i) => copy.greeting('Ada', 19, 'd' + i), 6, 'greeting evening')
spread((i) => copy.praise({ kind: 'lesson', seed: 's' + i, day: 4 }).text, 10, 'praise lesson')
spread((i) => copy.verdictRight({ source: 'truth', type: 'choice' }, lib.series['stewardship-code'], 's' + i).text, 24, 'verdictRight')
spread((i) => copy.verdictWrong({}, 's' + i).text, 8, 'verdictWrong')
spread((i) => copy.streakLine(5, 's' + i), 6, 'streak 4-6')
spread((i) => copy.shieldLine('used', { n: 9 }, 's' + i), 6, 'shield used')
spread((i) => copy.launchBarCopy({ state: 'ready', day: 4, mins: 6, seed: 's' + i }).sub, 6, 'launch bar ready')
spread((i) => copy.launchBarCopy({ state: 'atRisk', streak: 6, hoursLeft: 3, mins: 6, seed: 's' + i }).sub, 6, 'launch bar at risk')
spread((i) => copy.shareCaption('streak', { n: 12 }, 's' + i).text, 6, 'share streak')
spread((i) => copy.shareCaption('invite', {}, 's' + i).text, 6, 'share invite')
// sequence mode: no repeat within a cycle, full coverage per cycle
for (const n of [3, 6, 9, 12, 20]) {
  const list = Array.from({ length: n }, (_, i) => 'x' + i)
  for (const key of ['a', 'stewardship-code:12', 'k3']) {
    const out = Array.from({ length: n * 3 }, (_, i) => copy.pick(list, copy.seq(key, i)))
    for (let c = 0; c < 3; c++) if (new Set(out.slice(c * n, c * n + n)).size !== n) fail(`pick(seq) did not cover the list in one cycle (n=${n}, key=${key})`)
    for (let i = 1; i < out.length; i++) if (out[i] === out[i - 1]) fail(`pick(seq) repeated back to back (n=${n}, key=${key})`)
  }
}
if (copy.pick([], 'x') !== undefined) fail('pick of an empty list should be undefined')
// the hash should not crowd: 1,000 numeric seeds into 12 buckets within 40% of even
{ const b = Array(12).fill(0); for (let i = 0; i < 1200; i++) b[copy.hash(String(i)) % 12]++; if (Math.min(...b) < 60 || Math.max(...b) > 140) fail(`hash spread is uneven: ${b.join(',')}`) }
console.log('  deterministic · well spread · sequences never repeat inside a cycle')

/* ── every public function, with full and minimal contexts ─────────────── */
section('Outputs')
const outs = []
const collect = (label, v) => {
  const rec = (x, p) => {
    if (typeof x === 'string') { if (x) outs.push({ label: p, text: x }) }      // optional fields may be empty
    else if (Array.isArray(x)) x.forEach((e, i) => rec(e, `${p}[${i}]`))
    else if (x && typeof x === 'object') for (const [k, y] of Object.entries(x)) if (!['tone', 'state', 'art', 'icon', 'key', 'id', 'kind', 'status', 'platform', 'cta', 'ctaAria', 'tags', 'url', 'full', 'steps'].includes(k) || k === 'steps') rec(y, `${p}.${k}`)
  }
  rec(v, label)
}
const stew = lib.series['stewardship-code'], lon = lib.series['secrets-of-longevity']
const exTypes = ['choice', 'blank', 'order', 'match', 'tf']
const exSrc = ['scripture', 'truth', 'point', 'code', 'declaration', 'week']
for (let i = 0; i < 60; i++) {
  const ex = { type: exTypes[i % 5], source: exSrc[i % 6] }
  collect('verdictRight', copy.verdictRight(ex, i % 2 ? stew : lon, copy.seq('s:' + i, i), { combo: i % 14 }))
  collect('verdictRight.recycled', copy.verdictRight(ex, stew, 's' + i, { recycled: true }))
  collect('verdictRight.bare', copy.verdictRight({}, {}, 'b' + i))
  collect('verdictWrong', copy.verdictWrong(ex, copy.seq('w', i)))
  collect('verdictWrong.recycled', copy.verdictWrong(ex, 'w' + i, { recycled: true }))
  for (const kind of ['answer', 'lesson', 'perfect', 'recovered', 'first', 'selah', 'return', 'goal', 'ring', 'combo']) collect('praise.' + kind, copy.praise({ kind, seed: 'p' + i, day: 5, goal: 40, ring: 'Lesson', n: 4, name: 'Ada' }))
  collect('praise.bare', copy.praise({ kind: 'goal', seed: 'p' + i }))
  collect('praise.default', copy.praise())
}
for (let h = 0; h < 24; h++) for (const nm of ['Ada', '', undefined]) for (const sd of ['', '2026-08-12']) collect('greeting', copy.greeting(nm, h, sd))
for (let n = 0; n <= 140; n++) { collect('streakLine', copy.streakLine(n, 'd')); collect('streakLost', copy.streakLostCopy(n, 'd').text) }
for (const n of copy.MILESTONES) for (const shield of [true, false]) collect('milestone', copy.milestoneCopy(n, { shield, seed: 'x' }))
if (copy.milestoneCopy(4) !== null) fail('milestoneCopy(4) should be null')
for (const k of ['used', 'earned', 'drop', 'max', 'low', 'none', 'cover', 'zzz']) for (let i = 0; i < 12; i++) collect('shield.' + k, copy.shieldLine(k, { n: 12, max: 2 }, 's' + i))
for (let r = 0; r <= 8; r++) for (const form of [r, { index: r, name: 'Steward' }]) collect('rankUp', copy.rankUpCopy(form, 'r'))
for (const f of [{ first: true }, { perfect: true }, { recovered: true }, { kind: 'selah' }, {}]) for (let i = 0; i < 12; i++) collect('completion', copy.completionCopy({ ...f, day: 12, seed: 's' + i }))
for (const k of ['xp', 'shield', 'fragment', 'zzz']) for (let i = 0; i < 12; i++) collect('drop.' + k, copy.dropCopy({ kind: k, amount: 25 }, 's' + i))
for (let i = 0; i < 12; i++) { collect('month', copy.monthCompleteCopy(stew, { days: 31, seed: 's' + i })); collect('month.bare', copy.monthCompleteCopy({}, { seed: 's' + i })) }
for (const id of ['lesson', 'xp', 'right', 'zzz']) { collect('ring', copy.ringCopy({ id, now: 2, goal: 3 })); collect('ring.done', copy.ringCopy({ id, now: 40, goal: 40 })) }
for (const [y, m, d] of [[2026, 0, 1], [2026, 4, 27], [2026, 9, 1], [2026, 11, 24], [2026, 11, 25], [2026, 3, 3], [2026, 3, 5], [2026, 3, 6], [2027, 2, 26], [2027, 2, 28], [2025, 3, 20], [2024, 2, 31], [2026, 7, 12]]) for (const z of ['WAT', '']) for (let h = 5; h < 22; h += 4) for (let i = 0; i < 6; i++) collect('greeting.season', copy.greeting(i % 2 ? 'Ada' : '', h, 's' + i, { date: new Date(y, m, d, h), zone: z, weekday: new Date(y, m, d).getDay() }))
for (const [y, m, d, want, z] of [[2026, 0, 1, 'newYear', ''], [2026, 4, 27, 'childrensDay', ''], [2026, 9, 1, 'independence', 'WAT'], [2026, 9, 1, null, ''], [2026, 11, 25, 'christmas', ''], [2026, 3, 3, 'goodFriday', ''], [2026, 3, 5, 'easter', ''], [2026, 3, 6, 'easterMonday', ''], [2027, 2, 26, 'goodFriday', ''], [2027, 2, 28, 'easter', ''], [2025, 3, 20, 'easter', ''], [2024, 2, 31, 'easter', ''], [2026, 7, 12, null, '']]) { const got = copy.seasonOf(new Date(y, m, d), z); if (got !== want) fail(`seasonOf(${y}-${m + 1}-${d}, "${z}") = ${got}, wanted ${want}`) }
for (let i = 0; i < 8; i++) {
  for (const sr of [stew, lon, {}]) for (const n of [1, 2, 3, 4, 5, 6]) collect('stageClear', copy.stageClearCopy({ n, title: 'The Faithfulness Code' }, sr, 's' + i))
  collect('stageClear.bare', copy.stageClearCopy({}, {}, 's' + i))
  collect('nextUp', copy.nextUpCopy({ day: 13, title: 'Plan before you spend', unlockAt: new Date(2026, 7, 13, 6), now: new Date(2026, 7, 12, 19), zone: 'WAT' }, 's' + i)); collect('nextUp.later', copy.nextUpCopy({ day: 13, title: 'Plan before you spend', unlockAt: new Date(2026, 7, 14, 6), now: new Date(2026, 7, 12, 19) }, 's' + i)); collect('nextUp.bare', copy.nextUpCopy({}, 's' + i))
}
collect('missionMeta', copy.missionMeta({ month: 'August', year: 2026, audience: 'Teens & families', done: 8, total: 31 })); collect('missionMeta.fresh', copy.missionMeta({ month: 'August', year: 2026, audience: 'Teens & families', total: 31 })); collect('missionMeta.bare', copy.missionMeta({}) || 'x')
for (let h = 0; h < 24; h++) for (const wd of [0, 1, 2, 5, 6]) collect('greeting.weekday', copy.greeting('Ada', h, 'd' + wd, { weekday: wd }))
for (let i = 0; i < 12; i++) {
  for (const f of [{ again: true }, { role: 'parent' }, { series: stew }, { series: lon, kind: 'teaching' }, { comeback: true }, { hour: 23 }, { hour: 2 }, { hour: 5 }, { hour: 5, role: 'parent' }, { hour: 14 }]) collect('completion.' + Object.keys(f)[0], copy.completionCopy({ ...f, day: 12, seed: 's' + i, name: 'Ada' }))
  collect('chest', copy.chestCopy({ xp: 25 }, 's' + i)); collect('chest.bare', copy.chestCopy({}, 's' + i))
  collect('catchUp', copy.catchUpCopy({ catchUp: 10, behind: 3, title: 'Know what you have' }, 's' + i)); collect('catchUp.one', copy.catchUpCopy({ catchUp: 10, behind: 1 }, 's' + i)); collect('catchUp.bare', copy.catchUpCopy({}, 's' + i))
  for (const ev of [{ type: 'grace' }, { type: 'shield' }, { type: 'lost', from: 12 }, { type: 'lost', from: 1 }]) collect('notice.' + ev.type, copy.noticeCopy(ev, { n: 12 }, 's' + i))
  collect('nextMark', copy.nextMilestoneCopy({ at: 14, daysTo: 6, xp: 50 }, 's' + i)); collect('nextMark.one', copy.nextMilestoneCopy({ at: 7, daysTo: 1, xp: 30 }, 's' + i)); collect('nextMark.noxp', copy.nextMilestoneCopy({ at: 7, daysTo: 3 }, 's' + i))
  for (const st of ['none', 'done', 'rest', 'at-risk', 'lost', 'zzz']) for (const hl of [1, 4, 9, undefined]) collect('streakStatus.' + st, copy.streakStatus({ state: st, count: 8, hoursLeft: hl, lostFrom: 12, next: { at: 14, daysTo: 6, xp: 50 } }, 's' + i))
  for (const n of [1, 2]) { collect('shield.next' + n, copy.shieldLine('next', { n }, 's' + i)); collect('shield.used' + n, copy.shieldLine('used', { n }, 's' + i)) }
  collect('shield.overflow', copy.shieldLine('overflow', {}, 's' + i))
}
for (const p of [0, 0.1, 0.3, 0.6, 0.8, 1, 2, -1]) collect('flightCallout', copy.flightCallout(p))
collect('ledger', copy.ledgerCopy({ lesson: 40, lines: [{ id: 'complete', xp: 20 }, { id: 'rare', xp: 20 }, { id: 'perfect', xp: 15 }, { id: 'milestone', xp: 30 }, { id: 'shield-overflow', xp: 25 }, { id: 'zzz', xp: 1 }], drop: 25, total: 190 }))
collect('ledger.bare', copy.ledgerCopy({})); collect('reward', copy.rewardCopy({ xp: 150, shield: 1, fragments: 1 })); collect('reward2', copy.rewardCopy({ xp: 40, shield: 2, fragments: 2 })); collect('reward.none', copy.rewardCopy({}))
for (const n of [3, 7, 14, 21, 31, 50, 75, 100, 150, 200, 365]) collect('milestone.reward', copy.milestoneCopy(n, { xp: 30, shield: n % 7 === 0 }))
for (const id of ['seeker', 'steward', 'builder', 'keeper', 'pathfinder', 'commander', 'pioneer']) collect('rank.' + id, copy.rankUpCopy({ id, index: 3, name: id }, 'r'))
const BAR_CASES = [
  { state: 'locked', day: 12, title: 'The Ownership Covenant', countdown: 3 * 3600e3, unlockAt: new Date(2026, 7, 12, 6, 0), zone: 'WAT' }, { state: 'locked' }, { state: 'missed', day: 13, gapDays: 5, title: 'T', mins: 6 }, { state: 'missed', day: 13, gapDays: 5, shieldUsed: true }, { state: 'done', day: 12, countdown: 8049e3, unlockAt: new Date(2026, 7, 13, 6, 0) },
  { state: 'ready', day: 12, title: 'T', mins: 6, role: 'parent' }, { state: 'ready', day: 12, title: 'T', mins: 6, streak: 1 }, { state: 'atRisk', streak: 1, hoursLeft: 2 },
  { state: 'upcoming', seriesTitle: 'The Stewardship Code', unlockAt: new Date(2026, 7, 1, 6, 0), countdown: 86400e3 },
  { state: 'ready', day: 12, title: 'The Ownership Covenant', mins: 6 }, { state: 'ready', day: 12, title: 'The Ownership Covenant', mins: 6, streak: 8 },
  { state: 'ready', day: 31, title: 'The Faithful Steward', mins: 7, kind: 'celebration' }, { state: 'ready', day: 1, title: 'Crack the code', mins: 7, kind: 'intro' },
  { state: 'ready', day: 9, mins: 4, kind: 'selah' }, { state: 'ready' }, { state: 'progress', day: 12, title: 'T', mins: 6, step: 3, steps: 8 },
  { state: 'progress', day: 12, pct: 40 }, { state: 'progress' }, { state: 'waiting', day: 12, countdown: 8049e3 }, { state: 'waiting', day: 12, countdown: 1500e3 },
  { state: 'waiting', day: 12 }, { state: 'archive', day: 9, title: 'Know what you have', mins: 6, done: 8, total: 31 }, { state: 'archive' },
  { state: 'missed', day: 13, streak: 12, shieldUsed: true }, { state: 'missed', day: 13, streak: 12 }, { state: 'missed' },
  { state: 'atRisk', day: 12, streak: 6, hoursLeft: 3, mins: 6 }, { state: 'atRisk', streak: 6, hoursLeft: 0.5 }, { state: 'atRisk', streak: 6, shields: 1, countdown: 7200e3 }, { state: 'atRisk' },
  { state: 'first', day: 1, title: 'Crack the code', mins: 7 }, { state: 'first' }, { state: 'upcoming', seriesTitle: 'The Stewardship Code', opens: new Date(2026, 7, 1), countdown: 86400e3 },
  { state: 'upcoming' }, { state: 'complete', seriesTitle: 'The Stewardship Code' }, { state: 'complete' }, { state: 'selah', day: 9 }, { state: 'zzz' }, {},
]
for (const c of BAR_CASES) for (let i = 0; i < 14; i++) {
  const o = copy.launchBarCopy({ ...c, seed: 's' + i })
  collect('launchBar.' + c.state, o)
  for (const k of ['eyebrow', 'sub', 'cta', 'ctaAria', 'aria', 'tone']) if (typeof o[k] !== 'string' || !o[k]) fail(`launchBarCopy(${JSON.stringify(c)}).${k} is empty`)
}
for (let i = 0; i < 12; i++) { collect('locked', copy.lockedCopy({ day: 14, date: new Date(2026, 7, 14), seed: 's' + i })); collect('locked.unlock', copy.lockedCopy({ day: 14, unlockAt: new Date(2026, 7, 14, 6, 0), zone: 'WAT', seed: 's' + i })); collect('locked.bare', copy.lockedCopy({ seed: 's' + i })) }
for (let i = 0; i < 10; i++) { collect('reminder', copy.reminderCopy({ name: 'Ada', hour: 20, min: 0, url: 'https://k.example/app', zone: 'WAT', seed: 's' + i })); collect('reminder.bare', copy.reminderCopy({ seed: 's' + i })) }
const SHARE_DATA = {
  verse: { verse: { text: 'He that is faithful in that which is least is faithful also in much.', ref: 'Luke 16:10' }, day: 12, series: stew, url: 'https://k.example/app' },
  card: { code: { no: 7, line: 'Everything belongs to God, and everything in our hands must be managed as a sacred trust.', rare: true }, total: 26, day: 8, series: stew },
  streak: { n: 12, url: 'https://k.example/app' }, month: { series: stew, days: 31, declaration: 'Christ my Master — money my servant.' },
  rank: { rank: 'Steward' }, invite: { name: 'Ada', url: 'https://k.example/app' },
}
for (const [kind, d] of Object.entries(SHARE_DATA)) for (let i = 0; i < 12; i++) {
  const s = copy.shareCaption(kind, d, 's' + i)
  collect('share.' + kind, s)
  if (!s.title || !s.text || !s.alt) fail(`shareCaption(${kind}) is missing a field`)
  if (d.url && !s.full.endsWith(d.url)) fail(`shareCaption(${kind}).full should end with the url`)
}
for (const kind of ['verse', 'card', 'streak', 'month', 'rank', 'invite']) collect('share.bare.' + kind, copy.shareCaption(kind, {}, 'x'))
for (const k of ['journal', 'cards', 'patches', 'medals', 'kids', 'heatmap', 'shortsOffline', 'shortsNone', 'allClear', 'journalDay', 'zzz']) for (let i = 0; i < 6; i++) collect('empty.' + k, copy.emptyCopy(k, 's' + i))
const TOAST_CTX = { rank: 'Steward', reward: { xp: 50 }, unlockAt: new Date(2026, 7, 14, 6, 0), amount: 40, goal: 40, ring: 'Lesson', no: 7, stage: 2, name: 'Ada', title: 'Faithful in little', day: 14, date: new Date(2026, 7, 14), hour: 20, min: 0, zone: 'WAT' }
for (const id of copy.toastIds()) {
  const t = copy.toastCopy(id, TOAST_CTX, 'x'); collect('toast.' + id, t)
  if (!t.title) fail(`toast ${id}: no title`)
  if (t.title.length > 90) fail(`toast ${id}: title ${t.title.length} chars (max 90)`)
  if (t.body && t.body.length > 140) fail(`toast ${id}: body ${t.body.length} chars (max 140)`)
  if (!t.icon) fail(`toast ${id}: no icon`)
  const bare = copy.toastCopy(id, {}, 'x'); collect('toast.bare.' + id, bare)
}
for (const k of ['offline', 'load', 'share', 'copy', 'ics', 'storage', 'video', 'update', 'notFound', 'notPublished', 'generic', 'zzz']) for (let i = 0; i < 6; i++) {
  const e = copy.errorCopy(k, 's' + i); collect('error.' + k, e)
  if (e.title.length > 90 || e.body.length > 140) fail(`error ${k}: too long (${e.title.length}/${e.body.length})`)
}
for (const p of ['ios', 'android', 'desktop', 'inapp', 'standalone', 'zzz']) for (let i = 0; i < 4; i++) collect('install.' + p, copy.installCopy(p, 's' + i))
const ios = copy.installCopy('ios')
if (!/Share/.test(ios.steps[0].text) || !/Add to Home Screen/.test(ios.steps[1].text)) fail('iOS install guide must say Share, then Add to Home Screen')
// function leaves inside the static objects
for (const [path, fn] of [['onboardCopy.progress', copy.onboardCopy.progress], ['onboardCopy.kids.remove', copy.onboardCopy.kids.remove], ['onboardCopy.finish.launching', copy.onboardCopy.finish.launching], ['onboardCopy.finish.opening', copy.onboardCopy.finish.opening], ['settingsHelp.about.version', copy.settingsHelp.about.version], ['labels.objectives.next', copy.labels.objectives.next], ['labels.objectives.toGo', copy.labels.objectives.toGo], ['labels.locker.unlocksWith', copy.labels.locker.unlocksWith], ['labels.locker.clearToEarn', copy.labels.locker.clearToEarn], ['labels.me.since', copy.labels.me.since], ['objectives.xp', copy.objectives.xp], ['objectives.right', copy.objectives.right], ['objectives.allDays', copy.objectives.allDays], ['objectives.lesson', copy.objectives.lesson], ['slideLabel.point', () => copy.slideLabel('point', { i: 2, n: 3 })]]) collect(path, fn(3))
const AR = copy.aria
for (const s of ['done', 'today', 'open', 'locked', 'rare', 'zzz']) collect('aria.day.' + s, AR.day({ day: 14, title: 'Two masters', state: s, date: new Date(2026, 7, 14) }))
collect('aria.stage', AR.stage({ n: 2, title: 'The Faithfulness Code', pct: 40 })); collect('aria.streak0', AR.streak(0)); collect('aria.streak', AR.streak(1)); collect('aria.streak12', AR.streak(12))
collect('aria.xp', AR.xp(1240)); collect('aria.shields', AR.shields(1)); collect('aria.ring', AR.ring({ id: 'xp', now: 24, goal: 40 })); collect('aria.option', AR.option(2, 'The Owner'))
collect('aria.step', AR.step(3, 8)); collect('aria.countdown', AR.countdown(8049e3)); collect('aria.launch', AR.launch({ day: 12, title: 'T' })); collect('aria.tab', AR.tab('learn', true))
collect('aria.rank', AR.rank({ name: 'Steward', index: 2, pct: 40.4 })); collect('aria.card', AR.card({ no: 7, line: 'L', rare: true, earned: true })); collect('aria.cardlocked', AR.card({ no: 8 }))
collect('aria.patch', AR.patch({ stage: 2, earned: false })); collect('aria.medal', AR.medal({ title: 'First launch', earned: true, tier: 'bronze' })); collect('aria.heat', AR.heat({ date: new Date(2026, 7, 12), lessons: 1 }))
collect('aria.sheet', AR.sheet('Settings')); collect('aria.sound', AR.sound(true)); collect('aria.progress', AR.progress(40))
collect('rankLine', copy.rankLine({ name: 'Steward', next: { name: 'Builder' }, toNext: 1240 })); collect('rankLine.max', copy.rankLine({ name: 'Pioneer', max: true })); collect('rankLine.bare', copy.rankLine({})); collect('slide.kids', copy.slideLabel('askKids')); collect('slide.family', copy.slideLabel('family'))
collect('onboard.goal', copy.goalCopy(40)); collect('onboard.goalx', copy.goalCopy(99))

const rendered = outs.length
for (const o of outs.splice(0)) lint(o.text, `out:${o.label}`, { max: 240 })
console.log(`  ${rendered} rendered strings linted`)

/* ── formatters ────────────────────────────────────────────────────────── */
section('Formatters')
const eq = (a, b, label) => { if (a !== b) fail(`${label}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`) }
eq(copy.tMinus(8049e3), 'T-02:14:09', 'tMinus'); eq(copy.tMinus(0), 'T-00:00:00', 'tMinus 0'); eq(copy.tMinus(-5), 'T-00:00:00', 'tMinus neg'); eq(copy.tMinus(100 * 3600e3 + 60e3), 'T-4d 04:01', 'tMinus days')
eq(copy.tPlus(510e3), 'T+08:30', 'tPlus'); eq(copy.fmtNum(1240), '1,240', 'fmtNum'); eq(copy.fmtNum(1234567), '1,234,567', 'fmtNum big'); eq(copy.fmtNum(-12), '-12', 'fmtNum neg')
eq(copy.fmtDate(new Date(2026, 7, 12)), 'Wed 12 Aug', 'fmtDate'); eq(copy.fmtDateLong(new Date(2026, 7, 12)), 'Wednesday 12 August', 'fmtDateLong')
eq(copy.fmtClock(20, 0), '8:00 pm', 'fmtClock'); eq(copy.fmtClock(0, 5), '12:05 am', 'fmtClock midnight'); eq(copy.fmtClock(12, 30), '12:30 pm', 'fmtClock noon'); eq(copy.fmtClock(6, 30, { zone: 'WAT' }), '6:30 am WAT', 'fmtClock zone')
eq(copy.xpDelta(40), '+40 XP', 'xpDelta'); eq(copy.xpTotal(1240), '1,240 XP', 'xpTotal'); eq(copy.dayTag(12, 31), 'Day 12 / 31', 'dayTag'); eq(copy.stageTag(2), 'Stage 02', 'stageTag'); eq(copy.minsLabel(5.6), '~6 min', 'minsLabel')
eq(copy.wordsDuration(8049e3), '2 hours 14 minutes', 'wordsDuration'); eq(copy.wordsDuration(60e3), '1 minute', 'wordsDuration 1m'); eq(copy.wordsDuration(10e3), 'under a minute', 'wordsDuration <1m')
eq(copy.timeLeft(3), '3 hours', 'timeLeft 3'); eq(copy.timeLeft(1), 'an hour', 'timeLeft 1'); eq(copy.timeLeft(0.5), '30 minutes', 'timeLeft .5')
eq(copy.daysWord(1), '1 day', 'daysWord 1'); eq(copy.daysWord(12), '12 days', 'daysWord 12')
eq(copy.flightCallout(0), 'Liftoff', 'flightCallout 0'); eq(copy.flightCallout(0.3), 'Climbing', 'flightCallout .3'); eq(copy.flightCallout(0.5), 'Halfway', 'flightCallout .5'); eq(copy.flightCallout(0.99), 'Final stretch', 'flightCallout .99'); eq(copy.flightCallout(1), 'Orbit insertion', 'flightCallout 1')
eq(copy.rankLine({ name: 'Steward', next: { name: 'Builder' }, toNext: 1240 }), 'Steward · 1,240 XP to Builder', 'rankLine'); eq(copy.rankLine({ name: 'Pioneer', max: true }), 'Pioneer. The top rank.', 'rankLine max')
eq(copy.partOfDay(4), 'night', 'partOfDay 4'); eq(copy.partOfDay(5), 'morning', 'partOfDay 5'); eq(copy.partOfDay(12), 'afternoon', 'partOfDay 12'); eq(copy.partOfDay(17), 'evening', 'partOfDay 17'); eq(copy.partOfDay(21), 'late', 'partOfDay 21')
eq(copy.zoneTag({ getTimezoneOffset: () => -60 }), 'WAT', 'zoneTag WAT'); eq(copy.zoneTag({ getTimezoneOffset: () => 0 }), '', 'zoneTag other')
eq(copy.greeting('', 9), copy.greeting(undefined, 9), 'greeting without a name'); if (/\{|,\s*\./.test(copy.greeting('', 9))) fail('greeting without a name leaked a slot')
eq(copy.plain({ text: 'Well done.', ref: 'Matthew 25:21' }), '“Well done.” — Matthew 25:21 (KJV)', 'plain(Line)')
console.log('  telemetry, dates, clocks, durations')

/* ── the store: constants, strings, and a simulated 31-day run ─────────── */
section('Store integration')
try {
  const { register } = await import('node:module')
  register('data:text/javascript,' + encodeURIComponent(`
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) return { format: 'module', source: 'export default ' + readFileSync(fileURLToPath(url), 'utf8'), shortCircuit: true }
  return nextLoad(url, context)
}`), import.meta.url)
  const mem = new Map()
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear() }
  const S = await import('../src/store.js')
  const L = await import('../src/lib.js')
  eq(JSON.stringify(copy.MILESTONES), JSON.stringify(S.MILESTONES), 'copy.MILESTONES must mirror the store'); eq(copy.UNLOCK_HOUR, L.UNLOCK_HOUR, 'copy.UNLOCK_HOUR must mirror lib')
  eq(JSON.stringify(copy.GOALS.map((g) => [g.id, g.xp])), JSON.stringify(S.GOALS.map((g) => [g.id, g.xp])), 'copy.GOALS must mirror the store')
  for (const r of S.RANKS) if (!copy.POOLS.rank[r.id]) fail(`no rank-up copy for the store rank "${r.id}"`)
  for (const n of S.MILESTONES) if (!copy.milestoneCopy(n)) fail(`no milestone copy for ${n}`)
  // The store's own strings: emoji is a failure; everything else is a note for the store owner.
  const notes = []
  const soft = (text, where) => { if (EMOJI.test(text)) fail(where + ': emoji: ' + text); for (const [re, why] of [[BANNED, 'banned word'], [US, 'American spelling'], [/["']/, 'straight quote'], [/\b\d{1,2}:\d{2}\b(?!\s?(am|pm))/, '24-hour time (we write 7 am)']]) if (re.test(text)) notes.push(`${where}: ${why}: ${text}`) }
  for (const a of S.ACHIEVEMENTS) { soft(a.title, 'medal ' + a.id + '.title'); soft(a.desc, 'medal ' + a.id + '.desc') }
  for (const q of S.QUESTS) soft(q.label, 'quest ' + q.id)
  for (const r of S.RANKS) soft(r.name, 'rank ' + r.id)
  if (notes.length) console.log('  notes for the store owner (not failures):\n    ' + notes.join('\n    '))

  // Content titles come from the library, not from us. Anything that would break the voice rules is noted for its owner.
  const titleNotes = new Set()
  const T = (ls) => {
    const x = ls.title || ''
    if (isAllCaps(x) || /[A-Z]{3,}/.test(x.replace(/\b(KJV|XP|KIND|LORD)\b/g, ''))) titleNotes.add('ALL-CAPS in a title: ' + x)
    if (/'/.test(x)) titleNotes.add('straight apostrophe in a title: ' + x)
    if (US.test(x)) titleNotes.add('American spelling in a title: ' + x)
    return { ...ls, title: 'Lesson title' }
  }
  // A real run: finish every day of August on its own date, and read the copy off each result.
  const aug = L.getSeries('stewardship-code')
  const lon = L.getSeries('secrets-of-longevity')
  let st = S.freshState('copy-test')
  let milestones = 0, ranks = 0, drops = 0
  for (const series of [aug, lon]) {
    st = S.freshState('copy-test-' + series.id)
    for (let day = 1; day <= series.calendar.length; day++) {
      if (series.calendar[day - 1].type === 'rest') continue
      const at = new Date(series.year, series.monthNum - 1, day, 19, 0, 0)
      const lsBefore = T(S.launchState(series, st, new Date(series.year, series.monthNum - 1, day, 9, 0, 0)))
      collect('integration.launch.' + lsBefore.state, copy.launchBarCopy({ ...lsBefore, zone: 'WAT', seed: 's' }))
      const out = S.finishPure(st, { seriesId: series.id, day, lessonXp: 30, meta: { right: 3, asked: 4 } }, at)
      if (!out) continue
      const r = out.result
      st = out.next
      collect('integration.completion', copy.completionCopy({ day, first: r.first, perfect: r.perfect, recovered: r.asked > r.right && !r.perfect, again: r.again, series, kind: series.calendar[day - 1].type, seed: 'x' }))
      collect('integration.ledger', copy.ledgerCopy(r.xp))
      if (r.drop) { drops++; collect('integration.drop', copy.dropCopy({ ...r.drop, amount: r.drop.xp }, 'x')) }
      if (r.streak.milestone) { milestones++; collect('integration.milestone', copy.milestoneCopy(r.streak.milestone, { shield: r.streak.shieldEarned === 'shield', xp: (r.xp.lines.find((l) => l.id === 'milestone') || {}).xp, seed: 'x' })) }
      if (r.rank.up) { ranks++; collect('integration.rank', copy.rankUpCopy(r.rank.to, 'x')) }
      if (r.month.completeNow) collect('integration.month', copy.monthCompleteCopy(series, { days: series.calendar.length, seed: 'x' }))
      const info = S.streakInfo(st, at)
      collect('integration.status', copy.streakStatus(info, 'x'))
      const lsAfter = T(S.launchState(series, st, at))
      collect('integration.launch.' + lsAfter.state, copy.launchBarCopy({ ...lsAfter, zone: 'WAT', seed: 's' }))
      for (const rg of S.rings(st)) collect('integration.ring', copy.ringCopy(rg))
    }
  }
  // modes: upcoming, locked, archive, complete
  for (const series of [aug, lon]) for (const when of [new Date(series.year, series.monthNum - 2, 28, 12), new Date(series.year, series.monthNum - 1, 1, 5), new Date(series.year, series.monthNum - 1, 1, 9), new Date(series.year, series.monthNum - 1, 12, 5, 30), new Date(2026, 9, 2, 9)]) {
    for (const s0 of [S.freshState('m1'), st]) {
      const ls = T(S.launchState(series, s0, when))
      const o = copy.launchBarCopy({ ...ls, zone: 'WAT', seed: 's' })
      collect('integration.mode.' + ls.state, o)
      for (const k of ['eyebrow', 'sub', 'cta', 'ctaAria', 'aria']) if (!o[k]) fail(`launchBarCopy(launchState ${ls.state}) has an empty ${k}`)
    }
  }
  if (titleNotes.size) console.log('  notes for the content / lib.js owner (day titles reach the Launch Bar through lib.dayLabel):\n    ' + [...titleNotes].join('\n    '))
  console.log(`  store constants match · simulated ${aug.title} and ${lon.title}: ${milestones} milestones, ${ranks} rank-ups, ${drops} drops read through the copy`)
} catch (e) {
  fail('store integration could not run: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e))
}
for (const o of outs.splice(0)) lint(o.text, `out:${o.label}`, { max: 240 })

/* ── contract shapes ───────────────────────────────────────────────────── */
section('Contract')
const need = ['pick', 'praise', 'verdictRight', 'verdictWrong', 'streakLine', 'shieldLine', 'milestoneCopy', 'rankUpCopy', 'greeting', 'launchBarCopy', 'reminderCopy', 'shareCaption', 'emptyCopy']
for (const n of need) if (typeof copy[n] !== 'function') fail(`contract export missing: ${n}`)
for (const n of ['onboardCopy', 'settingsHelp']) if (!copy[n] || typeof copy[n] !== 'object') fail(`contract export missing: ${n}`)
const v = copy.verdictRight({ type: 'choice', source: 'truth' }, stew, 'x')
for (const k of ['tone', 'status', 'head', 'text', 'cta', 'aria']) if (!v[k]) fail(`verdictRight is missing ${k}`)
const w = copy.verdictWrong({}, 'x')
if (w.head !== 'Not yet') fail('verdictWrong head should be "Not yet"')
if (copy.reminderCopy().title !== 'KIND · Today’s launch is ready.') fail('reminder title should be "KIND · Today’s launch is ready."')
if (copy.streakLostCopy(12, 'a').text.length < 5) fail('streakLostCopy')
if (!/Ignition holding/.test(copy.streakLine(7))) fail('7 days should read "Ignition holding"')
if (copy.shieldLine('used', { n: 1 }, 'a') === '') fail('shieldLine used')
console.log('  contract exports present and shaped')

/* ── inventory ─────────────────────────────────────────────────────────── */
if (args.has('--inventory')) {
  section('Inventory (markdown)')
  console.log('| Pool | Variants | Rule |\n|---|---|---|')
  eachPool(copy.POOLS, '', (list, path) => console.log(`| \`${path.replace(/^\./, '')}\` | ${list.length} | ${isFrequent(path.replace(/^\./, '')) ? '6+' : '3+'} |`))
  console.log(`\n${allText.length} static strings · ${poolCount} pools · ${lineCount} variants · ${Object.keys(copy.WORD).length} quotations`)
}

console.log(failures ? `\n${failures} failure${failures === 1 ? '' : 's'}.` : '\nAll copy checks passed.')
process.exit(failures ? 1 : 0)
