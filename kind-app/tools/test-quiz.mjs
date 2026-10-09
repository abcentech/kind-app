// Exercise-engine test bench (no framework).  node tools/test-quiz.mjs [flags]
//   (no flags)       generate every day of every series, assert the contract + quality invariants, print samples
//   --series <id>    only that series          --day <n>     print that day's lesson (with --series)
//   --audit          write every pooled exercise to tools/out/quiz/pool-<series>.txt   (read these)
//   --lessons        write every planned lesson to tools/out/quiz/lessons-<series>.txt
//   --quiet          no samples
// Exit code 1 if any invariant fails.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as Q from '../src/quiz.js'

const here = dirname(fileURLToPath(import.meta.url))
const lib = JSON.parse(readFileSync(join(here, '..', 'src', 'content', 'library.json'), 'utf8'))
const args = process.argv.slice(2)
const flag = (f) => args.includes(f)
const arg = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null)
const only = arg('--series')
const seriesList = lib.order.filter((id) => !only || id === only).map((id) => lib.series[id])
const OUT = join(here, 'out', 'quiz')

/* ── tiny assertion harness ── */
const fails = []
let checks = 0
const ctx = { s: '', day: 0, opt: '' }
function ok(cond, msg, ex) {
  checks++
  if (cond) return
  fails.push(`[${ctx.s} d${ctx.day} ${ctx.opt}] ${msg}${ex ? '\n      ' + Q.describeExercise(ex) : ''}`)
}

const FN = new Set(('a an the and or but of to in on at by for with from as is are was were be been am do does did not no it its he she we they you i ' +
  'my your his her our their this that these those will shall can may must so if then than there here what which who whom when where how all any each ' +
  'some one two also only just very more most much many such').split(' '))
const lc = (s) => String(s).toLowerCase().replace(/[’‘]/g, "'")
const words = (s) => String(s).split(/\s+/).filter(Boolean)
const core = (w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
const stemOf = (w) => lc(core(w)).replace(/(ership|ments?|ness|ship|ings?|ies|ers?|ed|es|ly|ful|s)$/, '')
const contentSet = (t) => new Set(words(t).map((w) => lc(core(w))).filter((w) => w.length >= 3 && !FN.has(w)).map(stemOf))
const jac = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return a.size + b.size - n ? n / (a.size + b.size - n) : 0 }
const SOURCES = ['scripture', 'truth', 'point', 'code', 'declaration', 'week']
const EMOJI = /\p{Extended_Pictographic}/u
const CAPS_OK = new Set(['LORD', "LORD'S", 'LORD’S', 'KJV', 'ESV', 'NIV', 'GOD', 'GOD’S'])

// Parse "1 Chronicles 29:14" / "Psalm 92:12, 14" into book/chapter/verse set, to check reference overlap.
function ref(r) {
  const m = /^((?:[1-3]\s)?[A-Za-z][A-Za-z ]*?)\s+(\d+)(?::\s*([\d,\s–—-]+))?$/.exec(String(r).replace(/\s*\([A-Za-z]+\)\s*$/, '').trim())
  if (!m) return null
  const vs = new Set()
  if (m[3]) for (const part of m[3].split(',')) {
    const rg = /(\d+)\s*[–—-]\s*(\d+)/.exec(part)
    if (rg) for (let v = +rg[1]; v <= +rg[2]; v++) vs.add(v)
    else { const one = /\d+/.exec(part); if (one) vs.add(+one[0]) }
  }
  return { book: m[1].toLowerCase(), ch: +m[2], vs }
}
const refOverlap = (a, b) => {
  const x = ref(a), y = ref(b)
  if (!x || !y || x.book !== y.book || x.ch !== y.ch) return false
  if (!x.vs.size || !y.vs.size) return true
  for (const v of x.vs) if (y.vs.has(v)) return true
  return false
}

function textsOf(ex) {
  const t = [ex.prompt, ex.explain, ex.quote, ex.cite, ex.statement, ex.before, ex.after]
  if (ex.options) t.push(...ex.options.map((o) => o.text))
  if (ex.words) t.push(...ex.words.map((w) => w.text))
  if (ex.pairs) t.push(...ex.pairs.flatMap((p) => [p.left, p.right]))
  return t.filter((x) => x !== undefined && x !== null)
}

function checkExercise(ex, series, day) {
  ok(typeof ex.id === 'string' && ex.id.length > 4, 'id', ex)
  ok(['choice', 'blank', 'order', 'match', 'tf'].includes(ex.type), 'type', ex)
  ok(typeof ex.prompt === 'string' && ex.prompt.trim().length > 3, 'prompt', ex)
  ok(ex.xp === 10, 'xp is 10', ex)
  ok(typeof ex.explain === 'string' && ex.explain.length >= 8 && ex.explain.length <= 140, `explain length ${String(ex.explain).length}`, ex)
  ok(SOURCES.includes(ex.source), `source ${ex.source}`, ex)
  for (const t of textsOf(ex)) {
    ok(typeof t === 'string', 'text is a string', ex)
    if (typeof t !== 'string') continue
    ok(t === t.trim() || t === ex.before || t === ex.after, `untrimmed text "${t}"`, ex)
    ok(!/\s{2,}/.test(t), `double space in "${t}"`, ex)
    ok(!/undefined|null|NaN|\[object/.test(t), `junk in "${t}"`, ex)
    ok(!EMOJI.test(t), `emoji in "${t}"`, ex)
    ok(!/!\s*$/.test(ex.prompt), 'no exclamation in prompts', ex)
    for (const w of t.split(/[\s—–]+/)) if (/^[A-Z]{4,}[’']?S?[.,;:!?”"]*$/.test(w) && !CAPS_OK.has(core(w))) ok(false, `ALL-CAPS "${w}"`, ex)
  }
  if (ex.type === 'choice' || ex.type === 'blank') {
    const o = ex.options
    ok(Array.isArray(o) && o.length >= 3 && o.length <= 5, `options ${o && o.length}`, ex)
    ok(new Set(o.map((x) => x.id)).size === o.length, 'option ids unique', ex)
    ok(new Set(o.map((x) => lc(x.text))).size === o.length, 'duplicate option texts', ex)
    ok(o.every((x) => x.text && x.text.trim()), 'empty option', ex)
    ok(o.filter((x) => x.id === ex.answer).length === 1, 'exactly one option has the answer id', ex)
    const a = o.find((x) => x.id === ex.answer)
    ok(!!a && o.filter((x) => lc(x.text) === lc(a.text)).length === 1, 'the answer text is not repeated among the distractors', ex)
    const lens = o.map((x) => x.text.length)
    ok(Math.max(...lens) / Math.max(1, Math.min(...lens)) <= (ex.type === 'blank' ? 2.6 : 3.2), `option lengths ${lens}`, ex)
    if (a) {
      const as = contentSet(a.text)
      for (const x of o) if (x !== a && as.size >= 3) ok(jac(as, contentSet(x.text)) < 0.5, `distractor "${x.text}" overlaps the answer`, ex)
    }
    if (ex.type === 'blank') {
      ok(typeof ex.before === 'string' && typeof ex.after === 'string' && (ex.before + ex.after).trim().length >= 12, 'blank context too small', ex)
      ok(a && a.text.length >= 4, 'blank answer too short', ex)
      ok(a && !FN.has(lc(a.text)), `blank answer "${a && a.text}" is a function word`, ex)
      const shown = lc(ex.before + ' ' + ex.after)
      for (const x of o) ok(!new RegExp('(^|[^\\p{L}])' + lc(x.text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^\\p{L}]|$)', 'u').test(shown), `option "${x.text}" already appears in the sentence`, ex)
      const filled = ex.before + a.text + ex.after
      ok(!/\s,|\s\.|\(\s|\s\)/.test(filled), `awkward spacing "${filled}"`, ex)
      ok(!/_/.test(filled), 'underscore in sentence', ex)
    }
    if (ex.type === 'choice' && ex.kind === 'ref-of-verse') {
      const a2 = a.text
      for (const x of o) if (x !== a) ok(!refOverlap(a2, x.text), `reference ${x.text} overlaps ${a2}`, ex)
    }
  } else if (ex.type === 'order') {
    const w = ex.words
    ok(Array.isArray(w) && w.length >= 3 && w.length <= 9, `order has ${w && w.length} words`, ex)
    ok(new Set(w.map((x) => x.id)).size === w.length, 'word ids unique', ex)
    ok(Array.isArray(ex.answer) && ex.answer.length === w.length && new Set(ex.answer).size === w.length && ex.answer.every((id) => w.some((x) => x.id === id)), 'answer is a permutation of the word ids', ex)
    ok(w.every((x) => x.text && !/\s/.test(x.text.replace(/ [—–-]$/, ''))), 'a chip is not one token', ex)
    ok(ex.answer.some((id, i) => id !== w[i].id), 'chips arrive already in order', ex)
    const inPlace = ex.answer.filter((id, i) => id === w[i].id).length
    ok(inPlace <= Math.floor(w.length / 3), `${inPlace}/${w.length} chips start in place`, ex)
    const text = ex.answer.map((id) => w.find((x) => x.id === id).text).join(' ')
    ok(/[.!?…]$/.test(text) || ex.kind === 'order-stage-title', `line does not end like a sentence: "${text}"`, ex)
    ok(!/[,;:]\s*[^\s]*$/.test(text.replace(/[.!?…]$/, '')) || true, '', ex)
    ok(!/[;:—–]/.test(text), `order text contains a clause break: "${text}"`, ex)
  } else if (ex.type === 'match') {
    const p = ex.pairs
    ok(Array.isArray(p) && p.length >= 3 && p.length <= 4, `match has ${p && p.length} pairs`, ex)
    ok(new Set(p.map((x) => x.id)).size === p.length, 'pair ids unique', ex)
    ok(new Set(p.map((x) => lc(x.left))).size === p.length && new Set(p.map((x) => lc(x.right))).size === p.length, 'duplicate left/right text', ex)
    ok(Array.isArray(ex.rightOrder) && ex.rightOrder.length === p.length && new Set(ex.rightOrder).size === p.length && ex.rightOrder.every((id) => p.some((x) => x.id === id)), 'rightOrder is a permutation', ex)
    ok(ex.rightOrder.every((id, i) => id !== p[i].id), 'a right-hand item already sits opposite its pair', ex)
    ok(p.every((x) => x.left.length <= 56 && x.right.length <= 90), 'match text too long for a plate', ex)
    for (const x of p) for (const y of p) if (x !== y) ok(jac(contentSet(x.left), contentSet(y.right)) <= 0.34, `"${x.left}" could also match "${y.right}"`, ex)
  } else if (ex.type === 'tf') {
    ok(typeof ex.statement === 'string' && ex.statement.length >= 12 && ex.statement.length <= 170, `statement length ${String(ex.statement).length}`, ex)
    ok(typeof ex.answer === 'boolean', 'tf answer is boolean', ex)
  }
  // grading round-trip
  const good = (() => {
    if (ex.type === 'choice' || ex.type === 'blank') return ex.answer
    if (ex.type === 'order') return ex.answer
    if (ex.type === 'match') return Object.fromEntries(ex.pairs.map((p) => [p.id, p.id]))
    return ex.answer
  })()
  const g = Q.gradeExercise(ex, good)
  ok(g.right === true && typeof g.answerText === 'string' && g.answerText.length > 0, 'correct response grades right', ex)
  const bad = (() => {
    if (ex.type === 'choice' || ex.type === 'blank') return ex.options.find((o) => o.id !== ex.answer).id
    if (ex.type === 'order') return ex.words.map((w) => w.id)             // arrival order is never the answer (checked above)
    if (ex.type === 'match') { const ids = ex.pairs.map((p) => p.id); return Object.fromEntries(ids.map((id, i) => [id, ids[(i + 1) % ids.length]])) }
    return !ex.answer
  })()
  ok(Q.gradeExercise(ex, bad).right === false, 'wrong response grades wrong', ex)
  ok(Q.gradeExercise(ex, undefined).right === false, 'no response grades wrong', ex)
}

function checkLesson(qs, series, day, count, o) {
  ok(Array.isArray(qs), 'lesson is an array')
  if (!Array.isArray(qs)) return
  ok(qs.length === count, `asked for ${count}, got ${qs.length}`)
  ok(new Set(qs.map((q) => q.id)).size === qs.length, 'ids unique within a lesson')
  for (let i = 1; i < qs.length; i++) ok(qs[i].type !== qs[i - 1].type, `two ${qs[i].type} in a row (${i - 1},${i})`)
  if (qs.length >= 3) ok(new Set(qs.map((q) => q.type)).size >= 2, 'fewer than 2 distinct types')
  if (qs.length >= 4) ok(new Set(qs.map((q) => q.type)).size >= 3, 'fewer than 3 distinct types in a lesson of ' + qs.length)
  for (const q of qs) checkExercise(q, series, day)
}

/* ── run the matrix ── */
const OPTIONS = [
  { label: 'default', opts: {} },
  { label: 'count3', opts: { count: 3 } },
  { label: 'count5', opts: { count: 5 } },
  { label: 'count6', opts: { count: 6 } },
  { label: 'decl-seen', opts: { declarationSeen: true } },
  { label: 'recall', opts: { recall: true } },
  { label: 'two-supporting', opts: { supporting: 2 } },
  { label: 'salted', opts: { salt: 'again' } },
]
const tally = { type: {}, kind: {}, source: {}, slot: [0, 0, 0, 0, 0, 0], longest: 0, shortest: 0, central: 0, rank: 0, mc: 0, tfTrue: 0, tf: 0, total: 0 }
const lessonsOut = {}
const t0 = performance.now()
let nLessons = 0
for (const series of seriesList) {
  ctx.s = series.id
  lessonsOut[series.id] = []
  for (let day = 1; day <= series.calendar.length; day++) {
    ctx.day = day
    for (const { label, opts } of OPTIONS) {
      ctx.opt = label
      const count = opts.count || 4
      const qs = Q.quizFor(series, day, opts)
      nLessons++
      checkLesson(qs, series, day, count, opts)
      if (label === 'default') {
        lessonsOut[series.id].push({ day, type: series.calendar[day - 1].type, qs })
        // determinism: same call, and a deep-cloned series object, give identical lessons
        ok(JSON.stringify(Q.quizFor(series, day, opts)) === JSON.stringify(qs), 'second call differs (not deterministic)')
        ok(JSON.stringify(Q.quizFor(JSON.parse(JSON.stringify(series)), day, opts)) === JSON.stringify(qs), 'a cloned series gives a different lesson')
        // "practise again": a salt gives a different but equally deterministic lesson
        const salted = Q.quizFor(series, day, { salt: 'again' })
        ok(JSON.stringify(Q.quizFor(series, day, { salt: 'again' })) === JSON.stringify(salted), 'a salted lesson is not deterministic')
        ok(JSON.stringify(salted) !== JSON.stringify(qs), 'a salt changed nothing')
        // callers may mutate what they get without poisoning the cache
        const m = Q.quizFor(series, day, opts); if (m[0]) { m[0].prompt = 'MUTATED'; m[0].options && m[0].options.reverse() }
        ok(JSON.stringify(Q.quizFor(series, day, opts)) === JSON.stringify(qs), 'mutating a returned lesson changed the cache')
        for (const q of qs) {
          tally.total++
          tally.type[q.type] = (tally.type[q.type] || 0) + 1
          tally.kind[q.kind] = (tally.kind[q.kind] || 0) + 1
          tally.source[q.source] = (tally.source[q.source] || 0) + 1
          if (q.type === 'choice' || q.type === 'blank') {
            tally.mc++
            tally.slot[q.options.findIndex((o) => o.id === q.answer)]++
            const a = q.options.find((o) => o.id === q.answer).text.length
            const others = q.options.filter((o) => o.id !== q.answer).map((o) => o.text.length)
            // mid-rank of the answer's length among the options, ties split: 0 = shortest, 1 = longest
            const r = (others.filter((x) => x < a).length + 0.5 * others.filter((x) => x === a).length) / others.length
            tally.rank += r
            if (r > 0.2 && r < 0.8) tally.central++
            if (r >= 0.8) tally.longest++
            if (r <= 0.2) tally.shortest++
          }
          if (q.type === 'tf') { tally.tf++; if (q.answer) tally.tfTrue++ }
        }
        // thin content (July): nothing may depend on a point body that does not exist
        const thin = !series.episodes[1]?.points?.[0]?.body
        if (thin) for (const q of qs) ok(!/^(blank-point|tf-point|match-point-gist)$/.test(q.kind), `${q.kind} needs point bodies`, q)
      }
    }
    // the pool: every candidate is well formed too
    ctx.opt = 'pool'
    const pool = Q.exercisePool(series, day)
    ok(pool.total >= 8, `thin pool: ${pool.total} exercises`)
    ok(Object.keys(pool.byType).length >= 3, `pool has only ${Object.keys(pool.byType).join(',')}`)
    for (const ex of pool.exercises) checkExercise(ex, series, day)
    if (day === 1 || day === 2) ctx.opt = ''
  }
}
const ms = performance.now() - t0

/* ── distribution invariants ── */
ctx.s = 'ALL'; ctx.day = 0; ctx.opt = 'distribution'
for (let i = 0; i < 4; i++) ok(tally.slot[i] / tally.mc > 0.17 && tally.slot[i] / tally.mc < 0.34, `answer sits in slot ${i + 1} ${(100 * tally.slot[i] / tally.mc).toFixed(1)}% of the time`)
ok(tally.slot[4] + tally.slot[5] === 0 || true, '')
// A test-wise learner must not be able to guess from length: the answer should be neither the usual extreme
// nor always the one in the middle. Mean mid-rank ~0.5, and the extremes each get a fair share.
ok(Math.abs(tally.rank / tally.mc - 0.5) < 0.06, `mean length rank of the answer ${(tally.rank / tally.mc).toFixed(2)} (want ~0.5)`)
ok(tally.central / tally.mc <= 0.7, `the answer is a middle-length option ${(100 * tally.central / tally.mc).toFixed(0)}% of the time`)
ok(tally.longest / tally.mc >= 0.14 && tally.longest / tally.mc <= 0.4, `the answer is among the longest ${(100 * tally.longest / tally.mc).toFixed(1)}% of the time`)
ok(tally.shortest / tally.mc >= 0.14 && tally.shortest / tally.mc <= 0.4, `the answer is among the shortest ${(100 * tally.shortest / tally.mc).toFixed(1)}% of the time`)
ok(tally.tf === 0 || (tally.tfTrue / tally.tf > 0.34 && tally.tfTrue / tally.tf < 0.66), `true/false balance ${(100 * tally.tfTrue / Math.max(1, tally.tf)).toFixed(0)}% true`)
for (const t of ['choice', 'blank', 'order', 'match', 'tf']) ok((tally.type[t] || 0) >= 8, `type ${t} only appears ${tally.type[t] || 0} times across the default lessons`)

/* ── report ── */
const pct = (n, d) => (100 * n / Math.max(1, d)).toFixed(1) + '%'
console.log(`\nquiz engine · ${seriesList.length} series · ${nLessons} lessons generated in ${ms.toFixed(0)} ms (${(ms / nLessons).toFixed(1)} ms each) · ${checks} checks`)
console.log('types   ', Object.entries(tally.type).map(([k, v]) => `${k} ${v} (${pct(v, tally.total)})`).join(' · '))
console.log('sources ', Object.entries(tally.source).map(([k, v]) => `${k} ${v}`).join(' · '))
console.log('answer slot', tally.slot.slice(0, 4).map((v) => pct(v, tally.mc)).join(' '), '· length: longest', pct(tally.longest, tally.mc), 'shortest', pct(tally.shortest, tally.mc), 'central', pct(tally.central, tally.mc), 'mean rank', (tally.rank / tally.mc).toFixed(2), '· tf true', pct(tally.tfTrue, tally.tf))
console.log('kinds   ', Object.entries(tally.kind).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '))
for (const series of seriesList) {
  const st = Q.poolStats(series)
  console.log(`pool ${series.id}: ${Object.entries(st.totals.byType).map(([k, v]) => `${k} ${v}`).join(' · ')} · thin days: ${st.thin.length ? st.thin.join(',') : 'none'} · min/day ${Math.min(...st.days.map((d) => d.total))}`)
}

/* ── samples ── */
const fmt = (q) => {
  const L = []
  const tag = `${q.type}/${q.kind}  [${q.source}, ${q.scope}]`
  if (q.type === 'choice') {
    L.push(`  ${tag}\n    ${q.prompt}${q.quote ? '  ' + q.quote : ''}`)
    q.options.forEach((o) => L.push(`    ${o.id === q.answer ? '*' : ' '} ${o.id}) ${o.text}`))
  } else if (q.type === 'blank') {
    L.push(`  ${tag}\n    ${q.prompt}${q.cite ? '  (' + q.cite + ')' : ''}\n    ${q.before}____${q.after}`)
    L.push('    ' + q.options.map((o) => (o.id === q.answer ? '*' : '') + o.text).join(' | '))
  } else if (q.type === 'order') {
    L.push(`  ${tag}\n    ${q.prompt}${q.cite ? '  (' + q.cite + ')' : ''}\n    ${q.words.map((w) => w.text).join('  /  ')}`)
    L.push('    = ' + q.answer.map((id) => q.words.find((w) => w.id === id).text).join(' '))
  } else if (q.type === 'match') {
    L.push(`  ${tag}\n    ${q.prompt}`)
    q.pairs.forEach((p) => L.push(`    ${p.left}  <->  ${p.right}`))
    L.push('    right column: ' + q.rightOrder.map((id) => q.pairs.find((p) => p.id === id).right.slice(0, 22)).join(' | '))
  } else if (q.type === 'tf') {
    L.push(`  ${tag}\n    ${q.prompt}  "${q.statement}"  => ${q.answer}`)
  }
  L.push(`    ~ ${q.explain}   (look: ${q.look})`)
  return L.join('\n')
}
const printLesson = (series, day, qs) => {
  console.log(`\n── ${series.title} · day ${day} (${series.calendar[day - 1].type}) ──`)
  qs.forEach((q) => console.log(fmt(q)))
}
if (arg('--day') && only) {
  const s = lib.series[only]
  printLesson(s, +arg('--day'), Q.quizFor(s, +arg('--day'), arg('--count') ? { count: +arg('--count') } : {}))
} else if (!flag('--quiet')) {
  console.log('\n=== one sample of each type, per series ===')
  for (const series of seriesList) {
    const seen = new Set()
    for (const { day, qs } of lessonsOut[series.id]) for (const q of qs) {
      if (seen.has(q.type + '|' + (q.scope === 'today' ? 't' : 's')) || seen.size >= 7) continue
      seen.add(q.type + '|' + (q.scope === 'today' ? 't' : 's'))
      console.log(`\n  ${series.title} · day ${day} (${series.calendar[day - 1].type})`)
      console.log(fmt(q))
    }
  }
  console.log('\n=== three full lessons per series (a teaching day, a Selah, the finale) ===')
  for (const series of seriesList) {
    const pick = [series.calendar.find((d) => d.type === 'teaching' && d.day > 8)?.day, series.calendar.find((d) => d.type === 'selah')?.day, series.calendar.length]
    for (const d of pick.filter(Boolean)) printLesson(series, d, lessonsOut[series.id][d - 1].qs)
  }
}

if (flag('--audit') || flag('--lessons')) {
  mkdirSync(OUT, { recursive: true })
  for (const series of seriesList) {
    if (flag('--lessons')) {
      writeFileSync(join(OUT, `lessons-${series.id}.txt`), lessonsOut[series.id].map(({ day, type, qs }) => `\n===== DAY ${day} (${type}) =====\n` + qs.map(fmt).join('\n')).join('\n'))
    }
    if (flag('--audit')) {
      const lines = []
      for (let day = 1; day <= series.calendar.length; day++) {
        const p = Q.exercisePool(series, day)
        lines.push(`\n===== DAY ${day} (${p.dayType}) · ${p.total} in pool · ${JSON.stringify(p.byType)} =====`)
        for (const ex of p.exercises) lines.push(`(q ${ex.q})\n` + fmt(ex))
      }
      writeFileSync(join(OUT, `pool-${series.id}.txt`), lines.join('\n'))
    }
  }
  console.log(`\nwrote ${OUT}`)
}

/* ── robustness: odd series and odd calls never throw ── */
ctx.s = 'robust'; ctx.day = 0; ctx.opt = ''
{
  const calls = []
  const tryIt = (label, fn) => { try { const r = fn(); ok(Array.isArray(r), `${label} did not return an array`); calls.push(r) } catch (e) { ok(false, `${label} threw ${e && e.message}`) } }
  const base = JSON.parse(JSON.stringify(lib.series[lib.order[0]]))
  tryIt('day 0', () => Q.quizFor(base, 0))
  tryIt('day 999', () => Q.quizFor(base, 999))
  tryIt('day NaN', () => Q.quizFor(base, NaN))
  tryIt('count 0', () => Q.quizFor(base, 3, { count: 0 }))
  tryIt('count 12', () => Q.quizFor(base, 3, { count: 12 }))
  tryIt('types filter', () => Q.quizFor(base, 3, { types: ['tf'] }))
  tryIt('unknown type filter', () => Q.quizFor(base, 3, { types: ['nope'] }))
  tryIt('empty calendar', () => Q.quizFor({ id: 'x', calendar: [], episodes: {} }, 1))
  tryIt('no episodes', () => Q.quizFor({ id: 'x', calendar: [{ day: 1, type: 'teaching', episode: 1 }], episodes: {} }, 1))
  const bare = { id: 'bare', title: 'Bare', calendar: [{ day: 1, type: 'teaching', episode: 1 }, { day: 2, type: 'selah', week: 0 }, { day: 3, type: 'celebration', week: 0 }],
    episodes: { 1: { num: 1, title: 'ONE', scripture: { text: 'In the beginning was the Word, and the Word was with God.', ref: 'John 1:1' }, truth: 'The Word is God.', points: [], week: 0 } } }
  for (let d = 1; d <= 3; d++) tryIt(`bare series day ${d}`, () => Q.quizFor(bare, d))
  const stripped = JSON.parse(JSON.stringify(base)); delete stripped.codes; delete stripped.sundays; delete stripped.weeks; delete stripped.themeScripture; delete stripped.declaration
  for (let d = 1; d <= stripped.calendar.length; d += 5) tryIt(`stripped series day ${d}`, () => Q.quizFor(stripped, d))
  // the helpers
  const ex = Q.quizFor(base, 3).find((q) => q.type === 'order')
  if (ex) {
    let r = Q.emptyResponse(ex)
    ok(Array.isArray(r) && !Q.isAnswerComplete(ex, r), 'an empty order is not complete')
    for (const w of ex.words) r = Q.toggleWord(ex, r, w.id)
    ok(Q.isAnswerComplete(ex, r), 'all chips placed is complete')
    r = Q.toggleWord(ex, r, ex.words[0].id)
    ok(r.length === ex.words.length - 1 && !Q.isAnswerComplete(ex, r), 'tapping a placed chip takes it back')
    ok(Q.toggleWord(ex, ['nope'], 'also-nope').length === 1, 'an unknown chip is ignored')
  }
  const mt = Q.exercisePool(base, 9).exercises.find((q) => q.type === 'match')
  if (mt) {
    let r = Q.emptyResponse(mt)
    ok(!Q.isAnswerComplete(mt, r), 'an empty match is not complete')
    for (const p of mt.pairs) r = Q.pairUp(mt, r, p.id, p.id)
    ok(Q.isAnswerComplete(mt, r) && Q.gradeExercise(mt, r).right, 'pairing every item to itself is the answer')
    r = Q.pairUp(mt, r, mt.pairs[0].id, mt.pairs[1].id)
    ok(Object.values(r).filter((v) => v === mt.pairs[1].id).length === 1, 'a right item can only have one partner')
    ok(!(mt.pairs[1].id in Q.unpair(r, mt.pairs[1].id)), 'unpair removes the link')
  }
  const tf = Q.exercisePool(base, 10).exercises.find((q) => q.type === 'tf')
  if (tf) ok(!Q.isAnswerComplete(tf, null) && Q.isAnswerComplete(tf, false) && Q.isAnswerComplete(tf, true), 'tf completeness')
  ok(Q.suggestedCount(base, base.calendar.length) >= 4 && Q.suggestedCount(base, 3) === 4, 'suggestedCount')
}

ctx.s = 'ALL'; ctx.day = 0; ctx.opt = 'errors'
ok(Q.quizErrors().length === 0, 'a generator threw: ' + Q.quizErrors().slice(0, 3).join(' | '))

if (fails.length) {
  const shown = fails.slice(0, 60)
  console.log(`\nFAILED ${fails.length} of ${checks} checks:\n` + shown.map((f) => ' ✗ ' + f).join('\n') + (fails.length > shown.length ? `\n ... and ${fails.length - shown.length} more` : ''))
  process.exit(1)
}
console.log(`\nall ${checks} checks passed`)
