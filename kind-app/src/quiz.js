// KIND v7 — the exercise engine.
// Turns a day of a series into check exercises (choice · blank · order · match · tf) that teach by
// retrieval: every item is built from what the learner has just read, never from content they
// haven't seen. Pure and self-contained (no imports, no clock): the same (series, day, options)
// always yields the same lesson, so nothing reshuffles on a re-render.
// Contract: docs/V7-CONTRACT.md §3.9. Authoring notes + response shapes: docs/QUIZ-API.md.

export const EXERCISE_TYPES = ['choice', 'blank', 'order', 'match', 'tf']
export const XP_PER_EXERCISE = 10

/* ───────────────────────────── lexicons ───────────────────────────────── */

// Words that never carry a lesson: never blanked, never offered as a distractor.
const STOP = new Set(('a about above across after again against all almost along already also although always am among an ' +
  'and another any anything are around as at away be because been before being below between both but by can cannot ' +
  'could did do does doing done down during each either else enough even ever every everyone everything few for from ' +
  'further had has have having he her here hers him himself his how however i if in into is it its itself just let like ' +
  'many may me might mine more most much must my myself neither never no nor not nothing now of off often on once only ' +
  'onto or other others our ours out over own same shall she should since so some someone something sometimes such than ' +
  'that the their theirs them themselves then there therefore these they this those though through thus till to too ' +
  'toward towards under until unto up upon us very was we well were what whatever when whenever where whether which ' +
  'while who whom whose why will with within without would yet you your yours yourself thou thee thy thine thyself ye ' +
  'hath hast doth doeth art wilt shalt mayest saith said say says one two three four five six seven ten first second ' +
  'third also anyone someone ourselves yourselves themselves alone together apart ahead forward forth aside indeed better best larger smaller bigger whole proper rather instead').split(' '))

// Archaic forms: legitimate in Scripture but poor blanks (hard to read, easy to mis-type, light on meaning).
const ARCH = /^(thereof|therein|whereof|wherewith|wherefore|forasmuch|shew|shewed|sware|whatsoever|whosoever|thereby|howbeit|notwithstanding|peradventure|habitations|discreet|mayest)$|(eth|est)$/
// Never an answer (guessable in any lesson, or too many words fit).
const RESERVED = new Set(['god', 'jesus', 'christ', 'lord', 'amen', 'father', 'holy', 'bible', 'scripture'])

// Words that mean nearly the same thing: if one is the answer, none of its cluster may appear as a
// distractor, or two options become defensible. Matched on stems, so inflections are covered.
const CLUSTERS = [
  'money wealth riches rich mammon gold silver cash income profit treasure finance financial fortune earnings salary wage fund',
  'owner master lord king ruler boss sovereign',
  'servant steward manager slave worker minister attendant',
  'give gift donate offer share generous generosity bless blessing',
  'faithful faithfulness loyal loyalty trustworthy reliable dependable trust',
  'wise wisdom understanding prudent knowledge insight discernment',
  'life living alive breath year day age decade lifetime',
  'long lasting enduring endure endurance length',
  'world earth creation universe',
  'heart soul spirit mind',
  'work labour labor job business employment diligence diligent effort',
  'save saving store keep preserve protect guard',
  'spend consume waste squander',
  'love adore cherish devotion',
  'fear afraid worry anxiety dread anxious',
  'joy gladness happy happiness rejoice cheerful merry',
  'purpose assignment goal mission plan calling',
  'resource possession goods property asset belonging thing',
  'pray prayer worship praise',
  'rest sleep peace',
  'body temple flesh',
  'grow growth increase multiply multiplication produce fruit fruitful gain',
  'tool instrument means',
  'honest integrity honesty truth righteous righteousness',
  'little small least',
  'end finish complete conclusion',
  'choose choice decide decision',
  'time season',
  'record measure track count budget',
  'obey obedience submit submission',
  'foolish fool folly',
  'person people man men human',
  'help serve service assist',
  'learn study teach train training discipline',
  'dishonest corrupt corruption cheat fraud steal',
  'eternal everlasting forever heaven heavenly',
  'story parable illustration picture',
  'speak word words say tongue voice',
  'power strength might ability',
  'good great fine excellent',
  'come go leave depart return',
  'author create form formed design craft establish ordain appoint plan build built make made shape weave woven sustain uphold number order',
  'sustain uphold maintain guard protect shield secure defend preserve keep',
  'purchase buy redeem ransom',
  'thrive flourish prosper bloom',
  'finish complete fulfil fulfill accomplish end',
  'reveal show display expose indicate prove mean demonstrate',
  'earth ground land soil dust field',
  'price cost value worth',
  'path way road journey walk',
  'seed fruit harvest crop',
  'reward prize crown increase',
  'source provider supplier supply provision',
  'master savior saviour redeemer king',
].map((s) => s.split(' '))

// Hard opposites that swap cleanly in a sentence (used to write false statements and to keep opposites
// out of blank options). Verbs that take objects (give/take) and noun/verb twins (love, trust) are left out.
const ANTONYMS = [
  ['everything', 'nothing'], ['always', 'never'], ['master', 'servant'], ['faithful', 'unfaithful'],
  ['wise', 'foolish'], ['wisdom', 'foolishness'], ['more', 'less'], ['most', 'least'], ['first', 'last'],
  ['begins', 'ends'], ['eternal', 'temporary'], ['lasting', 'temporary'], ['generous', 'selfish'],
  ['humble', 'proud'], ['humility', 'pride'], ['honest', 'dishonest'], ['honesty', 'dishonesty'],
  ['contentment', 'greed'], ['strength', 'weakness'], ['freedom', 'bondage'], ['obedience', 'disobedience'],
  ['greater', 'smaller'], ['strong', 'weak'], ['joy', 'sorrow'], ['bless', 'curse'], ['light', 'darkness'],
  ['build', 'destroy'], ['builds', 'destroys'], ['save', 'spend'], ['saves', 'spends'], ['saving', 'spending'],
  ['enjoy', 'despise'], ['rich', 'poor'], ['increase', 'decrease'],
]

// Light verbs and vague nouns fit almost any slot, so offering one as an option can make a second answer
// defensible ("…property reveals / means poor stewardship"). They are kept out of the options.
const GENERIC_WORDS = ('mean make give show reveal lead help keep bring take become creat produc requir caus allow get put set hold find see look ' +
  'seem appear remain stay use need want tell ask call come go begin start end offer thing people person way part time life world day man men ' +
  'place kind number area side case point matter reason result sort type group member state moment stuff action effect value level').split(' ')
const DET = new Set('the a an my your his her our their its this these those every each any no some thy thine whose only'.split(' '))
const MODAL = new Set('can could will would shall should may might must cannot do does did to not never always'.split(' '))
const COP = new Set('is are was were be been am being become becomes became remain remains remained stay stays'.split(' '))
const PREP = new Set('of in on at by for with from into over under through about than as like unto upon before after between without within toward against among'.split(' '))
const CONJ = new Set('and but or nor so yet because if when while that which who whom whether'.split(' '))
const NOT_ADV = new Set('family early daily holy lovely friendly lonely likely ugly july only'.split(' '))
const PRON = new Set('i you we they he she it who god jesus christ one'.split(' '))

/* ───────────────────────────── toolkit ────────────────────────────────── */

const hash = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
const mulberry = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const rngOf = (key) => mulberry(hash(String(key)))
const shuffle = (arr, rnd) => {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const uniq = (arr) => [...new Set(arr)]

const squish = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const unmd = (s) => String(s ?? '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(\S[^*]*?)\*/g, '$1')
const upFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const capWord = (s) => s.charAt(0) + s.slice(1).toLowerCase()
// Same rule the lesson deck uses, so a question names a day exactly as the lesson showed it.
const titleCase = (s) => squish(s).replace(/[A-Z][A-Z’'\-]+/g, capWord)
// The same few thousand strings are compared over and over while options are chosen, so the hot
// text helpers are memoised (bounded): a lesson then builds in a few ms even on a mid-range phone.
const memo = (fn, cap = 30000) => {
  const m = new Map()
  return (k) => {
    let v = m.get(k)
    if (v === undefined) { if (m.size > cap) m.clear(); v = fn(k); m.set(k, v) }
    return v
  }
}
const lc = (s) => { const t = String(s).toLowerCase(); return t.indexOf('’') < 0 && t.indexOf('‘') < 0 ? t : t.replace(/[’‘]/g, "'") }
const coreOf = memo((tok) => String(tok).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
const wordsOf = memo((s) => {
  const out = []
  for (const t of squish(s).split(' ')) {
    if (!t) continue
    if (/^[—–-]+$/.test(t) && out.length) out[out.length - 1] += ' ' + t
    else out.push(t)
  }
  return out
}, 8000)
const clip = (s, n) => {
  const t = squish(s)
  if (t.length <= n) return t
  const cut = t.slice(0, n - 1)
  return cut.replace(/\s+\S*$/, '').replace(/[,;:\s]+$/, '') + '…'
}

// Light stemmer: enough to treat own/owns/owned/owner/ownership as one idea.
const SUFFIXES = ['ership', 'ments', 'ment', 'ness', 'ship', 'ings', 'ing', 'ies', 'ers', 'er', 'ed', 'es', 'ly', 'ful', 'ant', 's']
const stem = memo((w) => {
  let t = lc(w).replace(/'s$/, '').replace(/[^a-z]/g, '')
  for (const sfx of SUFFIXES) {
    if (t.length - sfx.length >= 3 && t.endsWith(sfx)) { t = t.slice(0, -sfx.length); break }
  }
  return t.replace(/e$/, '').replace(/(.)\1$/, '$1')
})
const contentStems = (text) =>
  wordsOf(text).map((t) => lc(coreOf(t))).filter((w) => w.length >= 3 && !STOP.has(w)).map(stem)
const STEMS = new Map()   // memo: the same option text is compared many times while distractors are chosen
const stemSet = (text) => {
  let s = STEMS.get(text)
  if (!s) { s = new Set(contentStems(text)); if (STEMS.size > 4000) STEMS.clear(); STEMS.set(text, s) }
  return s
}
const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0
  let n = 0
  for (const x of a) if (b.has(x)) n++
  return n / (a.size + b.size - n)
}
const overlapOf = (a, b) => jaccard(stemSet(a), stemSet(b))
const share = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n }

const CLUSTER_OF = new Map()
CLUSTERS.forEach((c, i) => c.forEach((w) => {
  const k = stem(w)
  if (!CLUSTER_OF.has(k)) CLUSTER_OF.set(k, [])
  CLUSTER_OF.get(k).push(i)
}))
const GENERIC = new Set(GENERIC_WORDS.flatMap((w) => [w, stem(w)]))
const ANTONYM_OF = new Map()
ANTONYMS.forEach(([a, b]) => { ANTONYM_OF.set(stem(a), stem(b)); ANTONYM_OF.set(stem(b), stem(a)) })
const relatedStems = (x, y) => {
  if (x === y || ANTONYM_OF.get(x) === y) return true
  const cx = CLUSTER_OF.get(x), cy = CLUSTER_OF.get(y)
  return !!(cx && cy && cx.some((i) => cy.includes(i)))
}

// Sentences, without regex look-behind (older iOS/Android WebViews choke on it).
function sentences(text) {
  const t = squish(text).replace(/\.{3}/g, '…')
  const out = []
  let start = 0
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (ch !== '.' && ch !== '!' && ch !== '?') continue
    let j = i + 1
    while (j < t.length && /["”’')\]]/.test(t[j])) j++
    if (j >= t.length || (t[j] === ' ' && /^["“‘'(]?[A-Z0-9]/.test(t.slice(j + 1, j + 3)))) {
      out.push(t.slice(start, j).trim())
      start = j
      i = j - 1
    }
  }
  if (start < t.length) out.push(t.slice(start).trim())
  return out.filter(Boolean)
}

// A markdown-ish body → paragraphs of prose (list items kept apart; headings and quotes dropped).
function parseBody(body) {
  const paras = []
  let cur = null
  const flush = () => { if (cur) paras.push(cur); cur = null }
  for (const raw of String(body || '').split('\n')) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    const b = /^[-•*]\s+(.*)$/.exec(line)
    if (b) { if (!cur) cur = { text: '', items: [] }; cur.items.push(squish(unmd(b[1]))); continue }
    if (/^#{1,6}\s/.test(line) || line[0] === '>') { flush(); continue }
    if (cur && cur.items.length) flush()
    if (!cur) cur = { text: '', items: [] }
    cur.text += (cur.text ? ' ' : '') + squish(unmd(line))
  }
  flush()
  return paras
}

const BAD_START = /^(it|they|he|she|this|that|these|those|them|his|her|its|their|but|and|so|then|therefore|thus|also|because|yet|however|such|there|here|both|each|another|one of|which|who|if)\b/i
// A sentence that still makes sense lifted out of its paragraph.
function standalone(sent, min = 5, max = 20) {
  const t = squish(sent)
  const n = wordsOf(t).length
  if (n < min || n > max) return false
  if (!/[.!?]$/.test(t)) return false
  if (/[“”"()…]/.test(t)) return false
  if (BAD_START.test(t)) return false
  return /^[A-Z]/.test(t)
}

/* ── scripture references ── */
const refShort = (r) => squish(String(r || '').replace(/\s*\([A-Za-z]{2,6}\)\s*$/, ''))
const parseRef = memo((r) => parseRefRaw(r), 2000)
function parseRefRaw(r) {
  const m = /^((?:[1-3]\s)?[A-Za-z][A-Za-z ]*?)\s+(\d+)(?::\s*([\d,\s–—-]+))?$/.exec(refShort(r))
  if (!m) return { book: lc(refShort(r)), ch: 0, vs: null }
  let vs = null
  if (m[3]) {
    vs = new Set()
    for (const part of m[3].split(',')) {
      const rg = /(\d+)\s*[–—-]\s*(\d+)/.exec(part)
      if (rg) for (let v = +rg[1]; v <= +rg[2]; v++) vs.add(v)
      else { const one = /\d+/.exec(part); if (one) vs.add(+one[0]) }
    }
  }
  return { book: lc(m[1]), ch: +m[2], vs }
}
function refsOverlap(a, b) {
  const x = parseRef(a), y = parseRef(b)
  if (x.book !== y.book || x.ch !== y.ch) return false
  if (!x.vs || !y.vs) return true
  for (const v of x.vs) if (y.vs.has(v)) return true
  return false
}
const refShape = (r) => {
  const p = parseRef(r)
  return { num: /^[1-3]\s/.test(p.book), range: !!(p.vs && p.vs.size > 1), len: refShort(r).length }
}

/* ───────────────────────────── slot grammar ───────────────────────────── */

function slotOf(prevTok) {
  if (prevTok == null) return 'start'
  if (/[.!?;:—–…]$/.test(prevTok)) return 'start'
  if (/,$/.test(prevTok)) return 'comma'
  const p = lc(coreOf(prevTok))
  if (DET.has(p)) return 'det'
  if (MODAL.has(p) || PRON.has(p)) return 'verb'
  if (COP.has(p)) return 'cop'
  if (PREP.has(p)) return 'prep'
  if (CONJ.has(p)) return 'conj'
  if (p.length > 3 && p.endsWith('ly') && !NOT_ADV.has(p)) return 'adv'
  return 'other'
}
// What follows a word: separates nouns ("the master of…") from adjectives ("the sacred trust").
function nextSlotOf(tok, nextTok) {
  if (/[.!?;:—–…]$/.test(tok)) return 'end'
  if (/,$/.test(tok)) return 'comma'
  if (nextTok == null) return 'end'
  const p = lc(coreOf(nextTok))
  if (PREP.has(p)) return 'prep'
  if (COP.has(p)) return 'cop'
  if (MODAL.has(p)) return 'verb'
  if (CONJ.has(p)) return 'conj'
  if (DET.has(p)) return 'det'
  return 'other'
}
const IRREG_PAST = new Set('took gave told spent built made saw came went knew thought brought bought sold held kept left lost met ran sat stood taught understood wrote found felt heard led paid began won grew drew sent'.split(' '))
function formOf(w) {
  if (IRREG_PAST.has(w)) return 'ed'
  if (/ing$/.test(w) && w.length > 5) return 'ing'
  if (/[^e]ed$/.test(w) && w.length > 4) return 'ed'
  if (/ly$/.test(w) && w.length > 4) return 'ly'
  if (/(tion|ment|ness|ity|ship|ance|ence|dom)s?$/.test(w)) return 'abs'
  if (/(ful|ous|ive|able|ible|al|ic|ish)$/.test(w)) return 'adj'
  if (/[^s]s$/.test(w) && !/(us|is)$/.test(w)) return 'pl'
  return 'base'
}
const vowelStart = (w) => /^[aeiou]/i.test(w)

// A poor man's tagger: votes for noun / verb / adjective / adverb from where a word sits (what comes
// before and after it) and how it ends. Enough to keep "the ___ of our hearts" from offering a verb.
const PRIOR = { ing: { V: 0.5, N: 0.3, A: 0.2 }, ed: { V: 0.5, A: 0.5 }, ly: { R: 1 }, abs: { N: 1 }, adj: { A: 1 }, pl: { N: 0.25, V: 0.25 }, base: {} }
function posVotes(prevTok, tok, nextTok) {
  const v = { N: 0, V: 0, A: 0, R: 0 }
  const pv = slotOf(prevTok), nx = nextSlotOf(tok, nextTok)
  const nextEnd = nextTok != null ? lc(coreOf(nextTok)) : ''
  const vs = nx === 'other' && /[^s]s$|[^e]ed$/.test(nextEnd)
  if (pv === 'det') { if (nx === 'other' && !vs) { v.A += 0.6; v.N += 0.4 } else v.N += 1 }
  else if (pv === 'prep') { if (nx === 'other' && !vs) { v.A += 0.3; v.N += 0.7 } else v.N += 1 }
  else if (pv === 'verb') v.V += 1
  else if (pv === 'cop') { v.A += 0.6; v.N += 0.3; v.V += 0.1 }
  else if (pv === 'adv') { v.A += 0.5; v.V += 0.5 }
  else if (pv === 'start' || pv === 'comma' || pv === 'conj') {
    if (nx === 'cop' || nx === 'verb' || vs) v.N += 1
    else if (nx === 'det' || nx === 'prep') v.V += 1
    else { v.A += 0.4; v.V += 0.4; v.N += 0.2 }
  } else if (nx === 'det') v.V += 1                                       // "performs every function"
  else if (nx === 'cop' || nx === 'verb' || nx === 'end' || nx === 'comma' || nx === 'conj' || vs) { v.N += 0.7; v.V += 0.2; v.A += 0.1 }
  else { v.N += 0.4; v.V += 0.4; v.A += 0.2 }
  const pr = PRIOR[formOf(lc(coreOf(tok)))]
  for (const k in pr) v[k] += pr[k]
  return v
}
const topPos = (v) => Object.keys(v).reduce((a, b) => (v[b] > v[a] ? b : a), 'N')

/* ───────────────────────────── the corpus ─────────────────────────────── */
// Everything a series teaches, normalised once. Distractors are always drawn from here, so they
// are "from the same series" by construction.

const CORPUS = new WeakMap()

const epOfCal = (s, cal) => (cal.episode ? (s.episodes || {})[cal.episode] : cal.type === 'intro' ? s.intro : null)

function declLines(text) {
  const raw = String(text || '').split('\n').map(squish).filter(Boolean)
  const out = []
  for (const line of raw) {
    if (out.length && !/[.!?;:"”’']$/.test(out[out.length - 1])) out[out.length - 1] += ' ' + line
    else out.push(line)
  }
  return out.map((l) => l.replace(/[;:]$/, '.'))
}

function buildLesson(s, cal, ep) {
  const L = { day: cal.day, calType: cal.type, week: cal.week ?? ep.week ?? null, num: ep.num ?? null }
  L.title = titleCase(ep.title)
  const v = ep.scripture
  L.verse = v && v.text ? { text: squish(v.text).replace(/\.{3}/g, '…'), ref: refShort(v.ref) } : null
  L.supporting = (ep.supporting || []).filter((x) => x && x.text)
    .map((x) => ({ text: squish(x.text).replace(/\.{3}/g, '…'), ref: refShort(x.ref) }))
  L.truth = squish(ep.truth)
  L.truthSents = sentences(L.truth)
  L.ownDecl = declLines(ep.declaration)
  L.decl = L.ownDecl.length ? L.ownDecl : declLines((s.declaration || []).join('\n'))
  L.code = ((s.codes || []).find((c) => c.day === cal.day) || {}).line || ''
  L.code = squish(L.code)
  L.points = (ep.points || []).filter((p) => p.title || p.body).map((p, i) => {
    const paras = parseBody(p.body)
    const sents = []
    for (const pa of paras) for (const t of sentences(pa.text)) if (!/:$/.test(t)) sents.push(t)
    return { i, title: titleCase(p.title), sents, items: paras.flatMap((pa) => pa.items), thin: !squish(p.body) }
  })
  L.ill = []
  for (const pa of parseBody(ep.illustration)) for (const t of sentences(pa.text)) if (!/:$/.test(t)) L.ill.push(t)
  L.prayer = squish(unmd(ep.prayer))
  L.hook = squish(unmd(ep.hook))
  L.challenge = squish(unmd(ep.challenge))
  // What the learner has been shown (deck order: verse, truth, points, picture, first supporting verse, prayer…).
  const seenText = [L.title, L.verse?.text, L.truth, L.supporting[0]?.text, L.ill.join(' '), L.hook, L.prayer, L.challenge,
    ...L.points.flatMap((p) => [p.title, p.sents.join(' '), p.items.join(' ')])].filter(Boolean).join(' ')
  L.seen = stemSet(seenText)
  L.seenText = lc(seenText)
  L.themeStems = stemSet([L.title, ...L.points.map((p) => p.title)].join(' '))
  L.truthStems = stemSet(L.truth)
  return L
}

function corpusOf(s) {
  let C = CORPUS.get(s)
  if (C) return C
  C = { s, id: s.id, days: [], byDay: new Map(), stages: [], refs: [], themeRef: '' }
  for (const cal of s.calendar) {
    const ep = epOfCal(s, cal)
    if (!ep) continue
    const L = buildLesson(s, cal, ep)
    C.days.push(L)
    C.byDay.set(cal.day, L)
  }
  C.stages = (s.weeks || []).map((w, i) => ({
    i, f: w.f, name: capWord(squish(w.f)), title: titleCase(w.title), question: squish(w.question || ''),
    passage: refShort(w.passage || ''),
  }))
  // The reference pool: every verse the series quotes (main + supporting + theme), de-duplicated by passage.
  const seen = []
  const addRef = (ref, text, day) => {
    if (!ref || seen.some((r) => r.ref === ref)) return
    seen.push({ ref, text: text || '', day, shape: refShape(ref) })
  }
  for (const L of C.days) { if (L.verse) addRef(L.verse.ref, L.verse.text, L.day); L.supporting.forEach((x) => addRef(x.ref, x.text, L.day)) }
  if (s.themeScripture) { C.themeRef = refShort(s.themeScripture.ref); addRef(C.themeRef, squish(s.themeScripture.text), 0) }
  C.refs = seen
  C.keyStems = new Set()
  const claim = (t) => contentStems(t).forEach((x) => C.keyStems.add(x))
  for (const L of C.days) { claim(L.title); claim(L.ownDecl.join(' ')); claim(L.code) }
  for (const st of C.stages) { claim(st.name); claim(st.title) }
  claim((s.declaration || []).join(' '))
  C.stageStems = {}
  for (const L of C.days) {
    if (L.week == null) continue
    const set = C.stageStems[L.week] || (C.stageStems[L.week] = new Set())
    for (const x of stemSet([L.title, L.truth, L.ownDecl.join(' '), L.ill.join(' '), ...L.points.flatMap((p) => [p.title, p.sents.join(' ')])].join(' '))) set.add(x)
  }
  indexVocab(C)
  CORPUS.set(s, C)
  return C
}

// Vocabulary with the grammatical slots each word has been seen in — the guard that keeps blank
// options grammatical ("the ___" takes nouns, "will ___" takes verbs) without a POS tagger.
function indexVocab(C) {
  const info = new Map()
  const feed = (text, verse) => {
    const toks = wordsOf(text)
    toks.forEach((t, i) => {
      const core = coreOf(t)
      if (!core || !/^\p{L}+$/u.test(core)) return
      const w = lc(core)
      let e = info.get(w)
      if (!e) { e = { w, n: 0, nv: 0, nt: 0, prevs: new Set(), nexts: new Set(), sigs: new Set(), aw: new Set(), bw: new Set(), lower: false, pos: { N: 0, V: 0, A: 0, R: 0 } }; info.set(w, e) }
      e.n++
      if (i) e.aw.add(lc(coreOf(toks[i - 1])))
      if (toks[i + 1]) e.bw.add(lc(coreOf(toks[i + 1])))
      const pv2 = posVotes(i ? toks[i - 1] : null, t, toks[i + 1])
      for (const k in pv2) e.pos[k] += pv2[k]
      if (verse) e.nv++; else e.nt++
      if (/^[a-z]/.test(core)) e.lower = true
      const pv = slotOf(i ? toks[i - 1] : null), nx = nextSlotOf(t, toks[i + 1])
      e.prevs.add(pv); e.nexts.add(nx); e.sigs.add(pv + '>' + nx)
    })
  }
  for (const L of C.days) {
    const texts = [L.title, L.truth, L.ownDecl.join(' '), L.ill.join(' '), L.hook, L.prayer,
      ...L.points.flatMap((p) => [p.title, p.sents.join(' ')])]
    texts.filter(Boolean).forEach((t) => feed(t, false))
    ;[L.verse?.text, ...L.supporting.map((x) => x.text)].filter(Boolean).forEach((t) => feed(t, true))
  }
  for (const st of C.stages) { feed(st.title); feed(st.question) }
  feed((C.s.declaration || []).join(' '))
  for (const e of info.values()) { e.form = formOf(e.w); e.stem = stem(e.w) }
  C.vocab = info
  C.vocabList = [...info.values()].filter((e) => e.lower && e.w.length >= 4 && e.w.length <= 12 && !STOP.has(e.w) &&
    !ARCH.test(e.w) && !RESERVED.has(e.w))
  C.vocabByForm = {}
  for (const f of ['ing', 'ed', 'ly', 'abs', 'adj', 'pl', 'base']) C.vocabByForm[f] = C.vocabList.filter((e) => e.form === f)
}

/* ───────────────────────── candidate plumbing ─────────────────────────── */
// A candidate is a finished exercise body plus the metadata the planner needs. Ids, answer
// placement and true/false polarity are fixed at selection time (see `finish`).

function snippet(text, max = 9) {
  const toks = wordsOf(text)
  if (toks.length <= max) return squish(text)
  return toks.slice(0, max).join(' ').replace(/[.,;:\s—–-]+$/, '') + '…'
}
const quoteOf = (t, n = 9) => `“${snippet(t, n)}”`
// The option text for a central truth: its first sentence when that stands alone, else the first two.
const truthOpt = (t) => {
  const x = squish(t)
  const ss = sentences(x)
  if (ss[0] && ss[0].length >= 24 && ss[0].length <= 118) return ss[0]
  const two = ss.slice(0, 2).join(' ')
  return two && two.length <= 118 ? two : null     // never an option cut short with an ellipsis: a cut option gives itself away
}
const fit = (s, n = 140) => clip(s, n)
// "Prefix: a · b · c" with only the whole items that fit.
const listFit = (prefix, items, n = 140) => {
  let out = prefix.trimEnd() + ' '
  let used = 0
  for (const it of items) {
    const next = out + (used ? ' · ' : '') + it
    if (next.length > n - (used < items.length - 1 ? 2 : 0)) break
    out = next; used++
  }
  return (used ? out : fit(prefix + items[0])) + (used < items.length ? ' …' : '')
}
// “quote” — Ref, shortening the quote (never the reference) to stay inside the explain budget.
const withRef = (text, ref, n = 140) => {
  const t = squish(text).replace(/[;:,]+$/, '')
  const room = n - ref.length - 6
  return `“${t.length > room ? clip(t, room) : t}” — ${ref}`
}
const base = (m) => ({ scope: 'today', ...m })

function choiceCand(m, rnd, answer, wrong) {
  const options = shuffle([{ text: answer, ok: true }, ...wrong.map((text) => ({ text, ok: false }))], rnd)
  return { ...base(m), type: 'choice', ex: { prompt: m.prompt, quote: m.quote, cite: m.cite, options } }
}
function tfCand(m, trueText, falseText) {
  return { ...base(m), type: 'tf', text: m.text || trueText, ex: { prompt: m.prompt || 'True or false?', trueText, falseText } }
}
function matchCand(m, pairs, rnd) {
  const n = pairs.length
  let ro = [...Array(n).keys()]
  for (let t = 0; t < 40; t++) {
    ro = shuffle([...Array(n).keys()], rnd)
    if (!ro.some((v, i) => v === i)) break
    if (t === 39) ro = ro.map((_, i) => (i + 1) % n)
  }
  return { ...base(m), type: 'match', ex: { prompt: m.prompt, pairs, rightOrder: ro } }
}

/** Pick `n` option texts from `pool` ({text,…}) that are unlike `answer` (and `avoid`), similar in length. */
function choose(pool, n, { rnd, answer, avoid = [], maxOverlap = 0.34, lenTol = 0.3, bonus = () => 0 }) {
  const aSet = stemSet(answer)
  const avoidSets = avoid.filter(Boolean).map(stemSet)
  const baseList = pool.filter((x) => {
    const t = x.text
    if (!t || lc(t) === lc(answer)) return false
    const ts = stemSet(t)
    if (jaccard(ts, aSet) >= maxOverlap) return false
    return !avoidSets.some((a) => jaccard(ts, a) >= maxOverlap + 0.1)
  })
  const L0 = Math.max(answer.length, 1)
  for (const tol of [lenTol, lenTol * 1.6]) {   // never wider: an option far longer or shorter than the rest gives itself away
    const ok = baseList.filter((x) => Math.abs(x.text.length - L0) / L0 <= tol)
    if (ok.length < n) continue
    const scored = ok.map((x) => ({ x, sc: rnd() + bonus(x) })).sort((a, b) => b.sc - a.sc)
    const out = []
    for (const { x } of scored) {
      if (out.length >= n) break
      if (out.some((o) => lc(o.text) === lc(x.text) || jaccard(stemSet(o.text), stemSet(x.text)) >= 0.5)) continue
      out.push(x)
    }
    if (out.length >= n) return out
  }
  return []
}

/** `n` references that cannot be mistaken for any passage in `exclude`, shaped like `answer`. */
function refChoices(C, exclude, answer, n, rnd) {
  const a = refShape(answer)
  const sc = C.refs.filter((r) => !exclude.some((e) => refsOverlap(e, r.ref)))
    .map((r) => ({ r, s: -Math.abs(r.shape.len - a.len) * 0.3 - (r.shape.num !== a.num ? 2 : 0) - (r.shape.range !== a.range ? 1.5 : 0) + rnd() * 1.4 }))
    .sort((x, y) => y.s - x.s)
  const out = []
  const books = {}
  for (const { r } of sc) {
    if (out.length >= n) break
    const b = parseRef(r.ref).book
    if ((books[b] || 0) >= 1 && sc.length > n + 4) continue
    books[b] = (books[b] || 0) + 1
    out.push(r.ref)
  }
  return out.length === n ? out : []
}

// "Derivable": the declaration is read after the checks, so a declaration exercise is only fair
// when its words are already in what the learner has read.
function derivable(L, text) {
  const st = [...stemSet(text)]
  if (!st.length) return false
  return st.filter((x) => L.seen.has(x)).length / st.length >= 0.7
}

/* ── flipping a statement into a plausible-but-false one ── */
const NEG_STRICT = /\b(not|never|no|cannot|nothing|none)\b(?! (only|merely|just|always|automatically|every|the only))/i
const NEG = /\b(not|never|no|cannot|nothing|none|neither|nor)\b|n['’]t\b/i
const keepCase = (from, to) => (/^[A-Z]/.test(from) ? upFirst(to) : to)
function countMatches(re, t) { return (t.match(new RegExp(re.source, 'gi')) || []).length }
const AN_EXC = /^(hour|honest|honou?r|heir)/i
const A_EXC = /^(uni|use|usu|one|eu|ewe|ur[ei])/i
const fixArticles = (t) => t.replace(/\b(a|an)\s+([A-Za-z]+)/gi, (m, art, w) => {
  const an = (/^[aeiou]/i.test(w) && !A_EXC.test(w)) || AN_EXC.test(w)
  const want = an ? 'an' : 'a'
  return (art[0] === 'A' ? upFirst(want) : want) + ' ' + w
})
const HEDGED = /\b(some|many|most|few) (people|students|teenagers|teens|believers)\b|\b(think|thinks|believe|believes|feel|feels|say|says|may|might|could|would|often|sometimes|usually|perhaps)\b/i
function flipSentence(sent) {
  const t = squish(sent)
  if (t.length > 130 || HEDGED.test(t)) return null
  const one = (re, fn) => (countMatches(re, t) === 1 ? t.replace(new RegExp(re.source, 'i'), fn) : null)
  const negs = (t.match(new RegExp(NEG.source, 'gi')) || []).length
  let out = null
  if (negs === 1 && /\bnot\b[^.]*\bbut\b/i.test(t)) return null      // "not X, but Y" breaks once the not is gone
  if (negs === 1) {
    out = one(/\bcannot\b/, (m) => keepCase(m, 'can')) ||
      one(/\bnever\b/, (m) => keepCase(m, 'always')) ||
      one(/\b(is|are|was|were|must|should) not\b/, (m, v) => v) ||
      one(/\bnothing\b/, (m) => keepCase(m, 'everything')) ||
      one(/\bno longer\b/, () => 'still')
  } else if (negs === 0) {
    out = one(/\balways\b/, (m) => keepCase(m, 'never'))
    if (!out) {
      for (const [a, b] of ANTONYMS) {
        const re = new RegExp('\\b' + a + '\\b')
        if (countMatches(re, t) === 1 && !new RegExp('\\b' + b + '\\b', 'i').test(t)) { out = one(re, (m) => keepCase(m, b)); if (out) break }
      }
    }
    if (!out && countMatches(/\b(is|are)\b/, t) === 1 && !/[,;:]|\b(who|which|that|if|when|because|but|and|or|so)\b/i.test(t)) out = one(/\b(is|are)\b/, (m) => m + ' not')
  }
  return out && out !== t ? fixArticles(out) : null
}

/* ───────────────────────── blank (fill the gap) ───────────────────────── */

// The words to show around token `i`: its sentence (plus the one before when it leans on it), or —
// for a long verse — the clauses around the gap. Returns [from, to) and whether each side was cut.
function windowOf(toks, i, max = 28) {
  const n = toks.length
  const hard = (j) => /[.!?]$/.test(toks[j])
  const soft = (j) => /[.!?;:,]$/.test(toks[j])
  const grow = (a, b, test) => {
    while (a > 0 && !test(a - 1)) a--
    while (b < n && !test(b - 1)) b++
    return [a, b]
  }
  let [a, b] = grow(i, i + 1, hard)
  if (a > 0 && BAD_START.test(toks.slice(a, a + 2).join(' ')) && b - a < max - 6) [a, b] = grow(a - 1, b, hard)
  if (b - a > max) {
    const segs = []
    let st = a
    for (let j = a; j < b; j++) if (soft(j) || j === b - 1) { segs.push([st, j + 1]); st = j + 1 }
    const k = segs.findIndex(([x, y]) => i >= x && i < y)
    let lo = k, hi = k
    const len = () => segs[hi][1] - segs[lo][0]
    let left = true
    while (len() < 10) {
      const canL = lo > 0 && segs[hi][1] - segs[lo - 1][0] <= max
      const canR = hi < segs.length - 1 && segs[hi + 1][1] - segs[lo][0] <= max
      if (!canL && !canR) break
      if ((left && canL) || !canR) lo--
      else hi++
      left = !left
    }
    a = segs[lo][0]; b = segs[hi][1]
    if (b - a > max) { a = Math.max(a, i - 12); b = Math.min(b, a + max) }
  }
  return [a, b, a > 0 && !hard(a - 1), b < n && !hard(b - 1)]
}

function distractWords(C, L, { toks, i, core, w, verse }) {
  const prevTok = i ? toks[i - 1] : null
  const slot = slotOf(prevTok), next = nextSlotOf(toks[i], toks[i + 1])
  const form = formOf(w)
  const prev = prevTok ? lc(coreOf(prevTok)) : ''
  const own = stem(w)
  const sentStems = new Set(toks.map((t) => stem(coreOf(t))))
  const sig = slot + '>' + next
  const upper = /^[A-Z]/.test(core)
  // Options should feel like part of the same world: words the series actually uses, in the same register
  // (scripture words for a verse, teaching words for a line of teaching), and not one-off oddities.
  const pref = (e) => (verse ? (e.nv ? 1 : 0) : (e.nt ? 1 : 0)) + (e.n >= 2 ? 1 : 0)
  const ansPos = topPos(posVotes(prevTok, toks[i], toks[i + 1]))
  const nextCore = toks[i + 1] ? lc(coreOf(toks[i + 1])) : ''
  const stageSeen = !verse && L.week != null ? C.stageStems[L.week] : null
  const posOk = (e) => { const t = e.pos.N + e.pos.V + e.pos.A + e.pos.R; return t > 0 && e.pos[ansPos] / t >= 0.5 }
  const tiers = [(e) => e.sigs.has(sig), (e) => e.prevs.has(slot) && e.nexts.has(next), (e) => e.prevs.has(slot)]
  // Grammar matters more than distance: a verb in a noun slot gives the answer away, so options are first
  // sought among words tagged like the answer, loosening the *topic* guard (the series' own claim-words —
  // owner, source, steward… — each a true statement somewhere in the month, and this stage's vocabulary)
  // before the grammar guard.
  const strictPool = C.vocabByForm[form].filter((e) => {
    if (e.w === w || e.stem === own || sentStems.has(e.stem) || L.seen.has(e.stem)) return false
    if (Math.abs(e.w.length - w.length) > 3) return false
    if ((prev === 'a' || prev === 'an') && vowelStart(core) !== vowelStart(e.w)) return false
    if (relatedStems(e.stem, own)) return false
    if (verse && !e.nv) return false                                   // a verse is only ever completed with words a verse could use
    return !(GENERIC.has(e.stem) || GENERIC.has(e.w))
  })
  const onTopic = (e) => C.keyStems.has(e.stem) || (stageSeen && stageSeen.has(e.stem))
  // A verb has too many theologically plausible siblings ("authored / sustained by God"), so for a verb or participle
  // the only acceptable options are on-grammar *and* off-topic; otherwise the gap is not set.
  const verbish = ansPos === 'V' || form === 'ed'
  for (const [strict, tagged] of verbish ? [[true, true]] : [[true, true], [false, true], [true, false], [false, false]]) {
    const pool2 = strictPool.filter((e) => (!strict || !onTopic(e)) && (!tagged || posOk(e)))
    for (let t = 0; t < tiers.length + (tagged ? 1 : 0); t++) {
      let got = pool2.filter(tiers[t] || (() => true))
      for (const min of [2, 1]) { const g2 = got.filter((e) => pref(e) >= min); if (g2.length >= 5) { got = g2; break } }
      if (got.length >= 3) {
        const pen = t * 0.03 + (strict ? 0 : 0.06) + (tagged ? 0 : 0.4)
        return got.map((e) => ({ e, pen, near: (prev && e.aw.has(prev)) || (nextCore && e.bw.has(nextCore)), text: upper ? upFirst(e.w) : e.w }))
      }
    }
  }
  return []
}

// A word inside "a, b and c" (or one half of "x and y") can be swapped for its sibling: a second answer.
function listy(toks, i, verse) {
  const nx = toks[i + 1] ? lc(coreOf(toks[i + 1])) : '', pv = i ? lc(coreOf(toks[i - 1])) : ''
  const commaBefore = toks.slice(Math.max(0, i - 5), i).some((x) => /,$/.test(x))
  if (/,$/.test(toks[i]) && toks.slice(i + 1, i + 5).some((x) => /^(and|or)$/i.test(coreOf(x)))) return true
  if ((nx === 'and' || nx === 'or') && (commaBefore || !verse)) return true
  if ((pv === 'and' || pv === 'or') && (commaBefore || !verse)) return true
  return false
}

// One sentence → up to `take` blank candidates, each on a word that carries the sentence.
function blankCands(C, L, sentence, m, rnd, take = 2) {
  const toks = wordsOf(sentence)
  if (toks.length < 5) return []
  const cores = toks.map(coreOf)
  const stems = cores.map((c) => stem(c))
  const scored = []
  for (let i = 0; i < toks.length; i++) {
    const core = cores[i], w = lc(core)
    if (!core || !/^\p{L}+$/u.test(core) || core.length < 4 || core.length > 12) continue
    if (STOP.has(w) || RESERVED.has(w) || ARCH.test(w) || GENERIC.has(stems[i]) || GENERIC.has(w)) continue
    if (i === 0 && !m.titleCase) continue                                // a gap in the first word has no left context to fit
    const sentStart = i === 0 || /[.!?:;]$/.test(toks[i - 1])
    if (/^[A-Z]/.test(core) && !sentStart && !m.titleCase && !(C.vocab.get(w) || {}).lower) continue
    if (stems.filter((s2) => s2 === stems[i]).length > 1) continue
    if (listy(toks, i, m.source === 'scripture')) continue
    if (m.themeOnly && !L.themeStems.has(stems[i]) && !L.truthStems.has(stems[i])) continue
    let sc = 0
    if (L.themeStems.has(stems[i])) sc += 2.2
    else if (L.truthStems.has(stems[i])) sc += 1.2
    if (core.length >= 5 && core.length <= 9) sc += 0.8
    else if (core.length >= 10) sc -= 0.3
    if (i === 0) sc -= 2
    if (i === toks.length - 1) sc += 0.3
    if (formOf(w) === 'ly') sc -= 0.6
    scored.push({ i, core, w, sc: sc + rnd() * 0.9 })
  }
  scored.sort((a, b) => b.sc - a.sc)
  const out = []
  for (const s0 of scored) {
    if (out.length >= take) break
    const pool = distractWords(C, L, { toks, i: s0.i, core: s0.core, w: s0.w, verse: m.source === 'scripture' })
    if (pool.length < 3) continue
    // closest in length first; never two options of one family
    const ranked = pool.map((p) => ({ p, s: rnd() * 4 + (p.near ? 2.4 : 0) - (p.e.n >= 2 ? 0 : 1) })).sort((a, b) => b.s - a.s)
    const wrong = []
    for (const { p } of ranked) {
      if (wrong.length >= 3) break
      if (wrong.some((q) => relatedStems(q.e.stem, p.e.stem))) continue
      wrong.push(p)
    }
    if (wrong.length < 3) continue
    const [a, b, cutL, cutR] = windowOf(toks, s0.i)
    const raw = toks[s0.i]
    const at = raw.indexOf(s0.core)
    const lead = raw.slice(0, at), trail = raw.slice(at + s0.core.length)
    const before = (cutL ? '… ' : '') + (s0.i > a ? toks.slice(a, s0.i).join(' ') + ' ' : '') + lead
    const after = trail + (b > s0.i + 1 ? ' ' + toks.slice(s0.i + 1, b).join(' ') : '') + (cutR ? ' …' : '')
    const filled = (cutL ? '… ' : '') + toks.slice(a, b).join(' ').replace(/[;:,]$/, cutR ? '' : '.') + (cutR ? ' …' : '')
    const options = shuffle([{ text: s0.core, ok: true }, ...wrong.map((p) => ({ text: p.text, ok: false }))], rnd)
    const worst = Math.max(...wrong.map((p) => p.pen))
    out.push({
      ...base(m), q: m.q - worst, type: 'blank', key: (m.key || 'blank') + '#' + s0.i, text: sentence,
      ex: { prompt: m.prompt, before, after, cite: m.cite, options }, answerText: s0.core,
      explain: m.explain && m.explain.length <= 140 ? m.explain : (m.ref ? withRef(filled, m.ref) : fit(filled)),
    })
  }
  return out
}

/* ───────────────────────── order (assemble) ───────────────────────────── */

const CONJ_START = /^(and|but|so|for|because|which|that|or|nor|yet|if|when|while|then|who)\b/i
const PRONOUN_START = /^(it|it's|its|they|he|she|this|that|these|those|them|his|her|their|there)\b/i
const orderable = (t) => {
  if (/[“”"();:—–]/.test(t.replace(/^… | …$|…$/g, ''))) return false
  const body = t.replace(/^…\s*|\s*…$/g, '')
  const parts = body.split(',')
  if (parts.length > 2) return false                                   // a list reorders freely
  if (parts.length === 2) {                                            // two parallel clauses reorder freely too
    const a = wordsOf(parts[0]).length, b = wordsOf(parts[1]).length
    if (a > 2 && b > 4) return false
  }
  if (/\b\w+, \w+ (?:and|or) \w+\b/.test(body)) return false
  return true
}
// Short, self-contained lines to assemble. A whole sentence of 3–9 words is used as it stands; a longer one
// is cut at a clause boundary. Scripture clauses keep an ellipsis where the verse goes on (never a quote
// that pretends to be the whole verse); teaching clauses just stand alone.
function orderUnits(text, { verse = false } = {}) {
  const out = []
  for (const sent of sentences(text)) {
    const n = wordsOf(sent).length
    if (n >= 3 && n <= 9) { if (!PRONOUN_START.test(sent)) out.push(sent); continue }
    if (n <= 9) continue
    const parts = sent.split(/(\s+[—–]\s+|;\s+|:\s+|,\s+(?=(?:and|but|so|because|which|that|for|yet)\b))/)
    let at = 0
    for (let k = 0; k < parts.length; k += 2) {
      const raw = parts[k]
      const sep = parts[k + 1] || ''
      const last = k + 2 >= parts.length
      let p = squish(raw).replace(/[,;:—–\s]+$/, '')
      const first = at === 0
      at += raw.length + sep.length
      if (/,/.test(p)) continue                                         // a clause with a comma left in it is a list remnant
      if (CONJ_START.test(p) || PRONOUN_START.test(p)) continue
      // the denied half of a "not X — but Y" sentence would teach the wrong thing on its own
      if (NEG.test(p) && /\bbut\b|[—–]/.test(sent)) continue
      const m = wordsOf(p).length
      if (m < 4 || m > 9) continue
      if (verse) {
        const lowerStart = /^[a-z]/.test(p)
        p = (lowerStart && !first ? '…' : '') + p
        if (!/[.!?]$/.test(p)) p += last ? '.' : '…'
        out.push(p)
      } else {
        p = upFirst(p)
        out.push(/[.!?]$/.test(p) ? p : p + '.')
      }
    }
  }
  return uniq(out).filter(orderable)
}
function orderCand(m, text) {
  const toks = wordsOf(text)
  const rnd = rngOf((m.key || 'order') + '|' + text)
  const n = toks.length
  let order = [...Array(n).keys()]
  for (let t = 0; t < 40; t++) {
    order = shuffle([...Array(n).keys()], rnd)
    const fixed = order.filter((p, i) => p === i).length
    const adjacent = order.filter((p, i) => i && p === order[i - 1] + 1).length
    if (fixed <= Math.floor(n / 3) && adjacent <= Math.max(1, Math.floor(n / 3))) break
  }
  const chips = order.map((p) => toks[p])
  const answer = toks.map((_, j) => 'w' + (order.indexOf(j) + 1))
  return { ...base(m), type: 'order', text, ex: { prompt: m.prompt, cite: m.cite, chips, answer }, answerText: text }
}

/* ───────────────────────── teaching-day candidates ────────────────────── */
// Everything below is built from what the lesson on that day shows. `look` says which card holds
// the answer (verse · truth · point:N · picture · declaration · supporting:N) so a wrong answer
// can send the learner back to the exact slide.

function tfRef(C, verse, todayRefs, rnd, key, q) {
  const wrong = refChoices(C, todayRefs, verse.ref, 1, rnd)
  if (!wrong.length) return null
  const qt = quoteOf(verse.text, 9)
  return tfCand({ source: 'scripture', kind: 'tf-verse-ref', look: key === 'verse' ? 'verse' : 'supporting:0', q, key, text: verse.text,
    explain: fit(`${qt} — ${verse.ref}`) }, `${qt} is from ${verse.ref}.`, `${qt} is from ${wrong[0]}.`)
}

// The sentence of a point that says what the point says.
// `loose` also accepts the point's opening line when it shares no word with the title (fine for matching,
// where the learner reasons from what they read; too weak for a gap-fill).
function gistOf(p, L, loose = false) {
  const ts = stemSet(p.title)
  let best = null, bs = -1
  p.sents.forEach((s, k) => {
    if (!standalone(s, 5, 18)) return
    if (HEDGED.test(s) || /-/.test(s)) return
    const shared = share(stemSet(s), ts)
    if (!shared && !(loose && k < 2)) return                                           // a gist normally shares a word with what it summarises
    const sc = shared * 2 + share(stemSet(s), L.truthStems) + (s.length <= 90 ? 0.5 : 0) + (k === 0 ? 0.3 : 0) - (NEG_STRICT.test(s) ? 1.4 : 0)
    if (sc > bs) { bs = sc; best = s }
  })
  return best
}

function teachingCands(C, L, o) {
  const out = []
  const rnd = rngOf(`${C.id}:${L.day}:teach${o.salt}`)
  const push = (...a) => a.flat().forEach((c) => c && out.push(c))
  const v = L.verse
  const todayRefs = [v?.ref, ...L.supporting.map((x) => x.ref)].filter(Boolean)
  const otherDays = C.days.filter((D) => D.day !== L.day)

  /* ── the Word ── */
  if (v) {
    const qt = quoteOf(v.text, 9)
    const refs = refChoices(C, todayRefs, v.ref, 3, rnd)
    if (refs.length === 3) {
      push(choiceCand({ source: 'scripture', kind: 'ref-of-verse', look: 'verse', q: 0.78, key: 'verse', text: v.text,
        prompt: 'Where is this written?', quote: qt, explain: fit(`${quoteOf(v.text, 12)} — ${v.ref}`) }, rnd, v.ref, refs))
    }
    const ans = snippet(v.text, 8)
    const vp = C.refs.filter((r) => r.text && !todayRefs.some((e) => refsOverlap(e, r.ref)) && lc(r.text) !== lc(v.text))
      .map((r) => ({ text: snippet(r.text, 8) }))
    const wrong = choose(vp, 3, { rnd, answer: ans, avoid: [v.text], maxOverlap: 0.3, lenTol: 0.3 })
    if (wrong.length === 3) {
      push(choiceCand({ source: 'scripture', kind: 'verse-of-ref', look: 'verse', q: 0.7, key: 'verse', text: v.text,
        prompt: `Which verse is ${v.ref}?`, explain: fit(`${quoteOf(v.text, 12)} — ${v.ref}`) }, rnd, ans, wrong.map((w) => w.text)))
    }
    push(tfRef(C, v, todayRefs, rnd, 'verse', 0.7))
    push(blankCands(C, L, v.text, { source: 'scripture', kind: 'blank-verse', look: 'verse', q: 0.88, key: 'verse',
      prompt: 'Complete the verse', cite: v.ref, ref: v.ref }, rnd, 2))
    for (const unit of orderUnits(v.text, { verse: true })) {
      push(orderCand({ source: 'scripture', kind: 'order-verse', look: 'verse', q: 0.8, key: 'verse', prompt: 'Put the verse in order',
        cite: v.ref, explain: withRef(unit, v.ref) }, unit))
    }
  }
  if (L.supporting[0]) push(tfRef(C, L.supporting[0], todayRefs, rnd, 'supp0', 0.58))
  // Match each verse to where it is written: only when the lesson shows both supporting verses (opts.supporting = 2).
  if (v && o.supporting >= 2 && L.supporting.length >= 2) {
    const vs = [v, L.supporting[0], L.supporting[1]]
    const pairs = vs.map((x) => ({ left: snippet(x.text, 7), right: x.ref, ref: x.ref }))
    const distinct = pairs.every((a, i) => pairs.every((b, j) => i === j || (!refsOverlap(a.ref, b.ref) && overlapOf(a.left, b.left) < 0.5)))
    if (distinct) {
      push(matchCand({ source: 'scripture', kind: 'match-verse-ref', look: 'verse', q: 0.84, key: 'verses', text: vs.map((x) => x.text).join(' '),
        prompt: 'Match each verse to where it is written', explain: withRef(snippet(v.text, 14), v.ref) },
      pairs.map((p, i) => ({ id: 'p' + (i + 1), left: p.left, right: p.right })), rnd))
    }
  }

  /* ── the one thing ── */
  const t = L.truth
  if (t) {
    const ans = truthOpt(t)
    const pool = otherDays.map((D) => ({ text: truthOpt(D.truth), week: D.week })).filter((x) => x.text)
    const wrong = ans ? choose(pool, 3, { rnd, answer: ans, avoid: [t, L.title, ...L.points.map((p) => p.title)], maxOverlap: 0.28, lenTol: 0.3,
      bonus: (x) => (x.week !== L.week ? 0.12 : 0) }) : []
    if (wrong.length === 3) {
      push(choiceCand({ source: 'truth', kind: 'truth', look: 'truth', q: 0.8, key: 'truth', text: t,
        prompt: 'What was the one thing today?', explain: fit(t) }, rnd, ans, wrong.map((w) => w.text)))
    }
    push(blankCands(C, L, t, { source: 'truth', kind: 'blank-truth', look: 'truth', q: 0.92, key: 'truth', prompt: 'Fill in the missing word', explain: fit(t) }, rnd, 2))
    for (const unit of orderUnits(t)) {
      push(orderCand({ source: 'truth', kind: 'order-truth', look: 'truth', q: 0.82, key: 'truth', prompt: 'Put the line in order', explain: fit(t) }, unit))
    }
    for (const s1 of L.truthSents.filter((x) => standalone(x, 4, 24))) {
      const f = flipSentence(s1)
      if (f) push(tfCand({ source: 'truth', kind: 'tf-truth', look: 'truth', q: 0.8, key: 'truth', text: s1, explain: fit(s1) }, s1, f))
    }
    const other = ans ? choose(pool, 1, { rnd, answer: ans, avoid: [t, ...L.points.map((p) => p.title)], maxOverlap: 0.2, lenTol: 0.5,
      bonus: (x) => (x.week !== L.week ? 0.2 : 0) })[0] : null
    if (other) {
      push(tfCand({ source: 'truth', kind: 'tf-truth-day', look: 'truth', q: 0.62, key: 'truth', text: t, explain: fit(`Today’s one thing: ${ans}`) },
        `“${ans}” was today’s one thing.`, `“${other.text}” was today’s one thing.`))
    }
  }

  /* ── the declaration (only what the learner can already know) ── */
  const ownText = L.ownDecl.join(' ')
  const sameAsTruth = ownText && lc(ownText) === lc(L.truth)
  L.decl.forEach((line, k) => {
    if (!(o.declarationSeen || derivable(L, line))) return
    const q = (L.ownDecl.length ? 0.86 : 0.72) - (wordsOf(line).length < 6 ? 0.1 : 0)
    const key = 'decl:' + k
    push(blankCands(C, L, line, { source: 'declaration', kind: 'blank-declaration', look: 'declaration', q, key, prompt: 'Complete the declaration',
      explain: fit(`Say it: “${line}”`) }, rnd, 1).map((c) => ({ ...c, explain: fit(`Say it: “${line}”`) })))
    for (const unit of orderUnits(line)) {
      push(orderCand({ source: 'declaration', kind: 'order-declaration', look: 'declaration', q: q + (sameAsTruth ? 0 : 0.04), key,
        prompt: 'Put the declaration in order', explain: fit(`Say it: “${unit}”`) }, unit))
    }
  })

  /* ── the teaching points ── */
  if (L.points.length) {
    const mine = L.points[Math.floor(rnd() * L.points.length)]
    const pool = otherDays.flatMap((D) => D.points.map((p) => ({ text: p.title, week: D.week })))
    const wrong = choose(pool, 3, { rnd, answer: mine.title, avoid: [...L.points.map((p) => p.title), L.title, L.truth], maxOverlap: 0.25, lenTol: 0.4,
      bonus: (x) => (x.week !== L.week ? 0.1 : 0) })
    const gist = gistOf(mine, L)
    const ex = gist ? fit(`${mine.title}: ${gist}`) : fit(`Today’s one thing: ${L.truth}`)
    if (wrong.length === 3) {
      push(choiceCand({ source: 'point', kind: 'point', look: 'point:' + mine.i, q: 0.66, key: 'point:' + mine.i, text: mine.title,
        prompt: 'Which of these did today’s lesson teach?', explain: ex }, rnd, mine.title, wrong.map((w) => w.text)))
    }
    const wrong1 = choose(pool, 1, { rnd, answer: mine.title, avoid: [...L.points.map((p) => p.title), L.title, L.truth], maxOverlap: 0.2, lenTol: 0.5 })[0]
    if (wrong1) {
      push(tfCand({ source: 'point', kind: 'tf-point-of-day', look: 'point:' + mine.i, q: 0.55, key: 'point:' + mine.i, text: mine.title,
        explain: listFit('Today’s truths: ', L.points.map((p) => p.title)) },
        `“${mine.title}” was one of today’s truths.`, `“${wrong1.text}” was one of today’s truths.`))
    }
    for (const p of L.points) {
      const sents = p.sents.filter((x) => standalone(x, 5, 18))
      const best = gistOf(p, L)
      if (best) push(blankCands(C, L, best, { source: 'point', kind: 'blank-point', look: 'point:' + p.i, q: 0.78, key: 'point:' + p.i, prompt: 'Fill in the missing word',
        explain: fit(best) }, rnd, 1))
      for (const sx of sents.slice(0, 4)) {
        const f = flipSentence(sx)
        if (f) push(tfCand({ source: 'point', kind: 'tf-point', look: 'point:' + p.i, q: 0.74, key: 'point:' + p.i, text: sx, explain: fit(sx) }, sx, f))
      }
    }
    // title ↔ the sentence that says it (needs bodies; thin content has none)
    const pairs = []
    for (const p of L.points) {
      const g = gistOf(p, L, true)
      if (g && g.length <= 84) pairs.push({ left: p.title, right: g })
    }
    if (pairs.length >= 3) {
      const use = pairs.slice(0, 4)
      // a line must point at its own title more than at any other (or, sharing no word, at none of them)
      const ok = use.every((a, i) => use.every((b, j) => {
        if (i === j) return true
        const own = share(stemSet(a.right), stemSet(a.left)), cross = share(stemSet(a.right), stemSet(b.left))
        return cross < own || (own === 0 && cross === 0)
      }))
        && use.every((a) => !use.some((b) => a !== b && lc(a.right) === lc(b.right)))
      if (ok) {
        push(matchCand({ source: 'point', kind: 'match-point-gist', look: 'point:0', q: 0.8, key: 'points', text: use.map((x) => x.left + ' ' + x.right).join(' '),
          prompt: 'Match each truth to what it says', explain: fit(`${use[0].left}: ${use[0].right}`) },
        use.map((x, i) => ({ id: 'p' + (i + 1), left: x.left, right: x.right })), rnd))
      }
    }
  }

  /* ── the picture ── */
  const illBest = L.ill.filter((x) => standalone(x, 6, 16)).map((x) => ({ x, sc: share(stemSet(x), L.themeStems) + share(stemSet(x), L.truthStems) }))
    .sort((a, b) => b.sc - a.sc)[0]
  if (illBest) push(blankCands(C, L, illBest.x, { source: 'point', kind: 'blank-picture', look: 'picture', q: 0.6, key: 'picture', themeOnly: true, prompt: 'Fill in the missing word', explain: fit(illBest.x) }, rnd, 1))

  return out
}

/* ───────────────────── review days: Selah, rest, finale ───────────────── */
// A Selah day recaps the stage just walked; a rest / review / finale day looks back over the month.
// Every fact used here is a plain fact of the series structure (which lesson, which verse, which
// stage, which one-thing) — so each question has exactly one right answer.

const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']

// A pseudo-lesson for text that is not a day (a stage title, a recap sentence, the theme verse), so the
// blank engine can score and guard it like any other.
const pseudo = (text, extra = '') => ({
  day: 0, themeStems: stemSet(text), truthStems: stemSet(text), seen: stemSet(text + ' ' + extra),
})

// Choose up to `k` {left,right} pairs that cannot be confused with one another.
function pairSet(items, k, rnd, ok = () => true) {
  const out = []
  for (const it of shuffle(items, rnd)) {
    if (out.length >= k) break
    const fine = out.every((o) => lc(o.left) !== lc(it.left) && lc(o.right) !== lc(it.right) &&
      overlapOf(o.left, it.right) <= 0.34 && overlapOf(it.left, o.right) <= 0.34 && overlapOf(o.right, it.right) <= 0.5 && ok(o, it))
    if (fine) out.push(it)
  }
  return out
}

// `**takeaway** … (Ep N)` out of a Sunday recap: the bold phrase nearest each episode marker, with the clause that
// carries it. The stage headline (bold, all caps, with a dash) is not a takeaway and is dropped.
function recapPoints(su, C) {
  const out = []
  if (!su || !su.recap) return out
  const t = String(su.recap).replace(/\s+/g, ' ')
  let prev = 0
  for (const m of t.matchAll(/\(Ep\s+(\d+)\)/g)) {
    const seg = t.slice(prev, m.index).replace(/\*\*[^*]*[—–][^*]*\*\*/g, '')
    prev = m.index + m[0].length
    const L = C.days.find((x) => x.num === +m[1])
    const bolds = [...seg.matchAll(/\*\*(.+?)\*\*/g)].map((b) => squish(b[1]))
    if (!L || !bolds.length) continue
    const clause = sentences(seg).pop() || ''
    let sentence = squish(unmd(clause)).replace(/^[,;]?\s*(and|but)\s+/i, '').replace(/\s+([.,;:!?])/g, '$1').replace(/[,;:\s]+$/, '')
    sentence = titleCase(upFirst(sentence)) + (/[.!?]$/.test(sentence) ? '' : '.')
    if (wordsOf(sentence).length < 5 || wordsOf(sentence).length > 26) continue
    out.push({ phrase: bolds[bolds.length - 1], sentence, L })
  }
  return out
}

function daySetCands(C, cal, D, { whole, su, wi, scope, boost = 0, salt = '' }) {
  const s = C.s
  const out = []
  const rnd = rngOf(`${C.id}:${cal.day}:set:${scope}:${D.length}${salt}`)
  const push = (...a) => a.flat().forEach((c) => c && out.push(c))
  const stage = wi != null ? C.stages[wi] : null
  const order = shuffle(D, rnd)
  const bySc = (m) => ({ scope, ...m, q: (m.q || 0.7) + boost })
  const allTitles = C.days.map((L) => ({ text: L.title, day: L.day, week: L.week }))

  /* verse ↔ lesson */
  order.filter((L) => L.verse).slice(0, 2).forEach((X, n) => {
    const own = [X.verse.ref, ...X.supporting.map((x) => x.ref)]
    const refs = refChoices(C, own, X.verse.ref, 3, rnd)
    if (refs.length === 3) {
      push(choiceCand(bySc({ source: 'scripture', kind: 'ref-of-lesson', look: 'day:' + X.day, key: 'refl' + n, text: X.verse.text + ' ' + X.title,
        prompt: `Which verse anchored “${X.title}”?`, explain: withRef(snippet(X.verse.text, 14), X.verse.ref), q: 0.74 }), rnd, X.verse.ref, refs))
    }
    const clash = D.some((Y) => Y !== X && Y.verse && refsOverlap(Y.verse.ref, X.verse.ref))
    if (!clash) {
      const wrong = choose(allTitles.filter((t) => { const Y = C.byDay.get(t.day); return Y && Y.day !== X.day && !(Y.verse && refsOverlap(Y.verse.ref, X.verse.ref)) && !Y.supporting.some((x) => refsOverlap(x.ref, X.verse.ref)) }),
        3, { rnd, answer: X.title, avoid: [X.truth], maxOverlap: 0.3, lenTol: 0.5, bonus: (x) => (D.some((Y) => Y.day === x.day) ? 0.15 : 0) })
      if (wrong.length === 3) {
        push(choiceCand(bySc({ source: 'scripture', kind: 'lesson-of-ref', look: 'day:' + X.day, key: 'lref' + n, text: X.title + ' ' + X.verse.text,
          prompt: `Which lesson was built on ${X.verse.ref}?`, explain: withRef(snippet(X.verse.text, 14), X.verse.ref), q: 0.7 }), rnd, X.title, wrong.map((w) => w.text)))
      }
      const bad = refChoices(C, own, X.verse.ref, 1, rnd)
      if (bad.length) {
        push(tfCand(bySc({ source: 'scripture', kind: 'tf-ref-of-lesson', look: 'day:' + X.day, key: 'refl' + n, text: X.title + ' ' + X.verse.text, q: 0.66,
          explain: fit(`“${X.title}” was built on ${X.verse.ref}.`) }), `“${X.title}” was built on ${X.verse.ref}.`, `“${X.title}” was built on ${bad[0]}.`))
      }
    }
  })

  /* the one thing of a lesson */
  order.filter((L) => L.truth).slice(0, 2).forEach((X, n) => {
    const ans = truthOpt(X.truth)
    const pool = C.days.filter((Y) => Y.day !== X.day).map((Y) => ({ text: truthOpt(Y.truth), day: Y.day })).filter((x) => x.text)
    const wrong = ans ? choose(pool, 3, { rnd, answer: ans, avoid: [X.truth, X.title], maxOverlap: 0.28, lenTol: 0.3, bonus: (x) => (D.some((Y) => Y.day === x.day) ? 0.15 : 0) }) : []
    if (wrong.length === 3) {
      push(choiceCand(bySc({ source: 'truth', kind: 'truth-of-lesson', look: 'day:' + X.day, key: 'truthl' + n, text: X.truth, prompt: `Which was the one thing in “${X.title}”?`,
        explain: fit(X.truth), q: 0.78 }), rnd, ans, wrong.map((w) => w.text)))
    }
    const other = ans ? choose(pool, 1, { rnd, answer: ans, avoid: [X.truth], maxOverlap: 0.2, lenTol: 0.5 })[0] : null
    if (other) {
      push(tfCand(bySc({ source: 'truth', kind: 'tf-truth-of-lesson', look: 'day:' + X.day, key: 'truthl' + n, text: X.truth, q: 0.64,
        explain: fit(`In “${X.title}”: ${ans}`) }), `“${ans}” was the one thing in “${X.title}”.`, `“${other.text}” was the one thing in “${X.title}”.`))
    }
    push(blankCands(C, X, X.truth, { source: 'truth', kind: 'blank-truth-of-lesson', look: 'day:' + X.day, key: 'truthl' + n, q: 0.86 + boost, scope,
      prompt: 'Fill in the missing word', cite: X.title, explain: fit(X.truth) }, rnd, 1))
    for (const unit of orderUnits(X.truth).slice(0, 1)) {
      push(orderCand(bySc({ source: 'truth', kind: 'order-truth-of-lesson', look: 'day:' + X.day, key: 'truthl' + n, prompt: 'Put the line in order',
        cite: X.title, explain: fit(X.truth), q: 0.74 }), unit))
    }
    for (const s1 of X.truthSents.filter((x) => standalone(x, 4, 24)).slice(0, 1)) {
      const f = flipSentence(s1)
      if (f) push(tfCand(bySc({ source: 'truth', kind: 'tf-truth', look: 'day:' + X.day, key: 'truthl' + n, text: s1, explain: fit(s1), q: 0.72 }), s1, f))
    }
  })

  /* stage membership */
  if (!whole && stage) {
    const mine = order.slice(0, 2)
    mine.forEach((X, n) => {
      const wrong = choose(allTitles.filter((t) => { const Y = C.byDay.get(t.day); return Y && Y.week !== wi }), 3,
        { rnd, answer: X.title, avoid: D.map((Y) => Y.title), maxOverlap: 0.3, lenTol: 0.5 })
      if (wrong.length === 3) {
        push(choiceCand(bySc({ source: 'week', kind: 'lesson-of-stage', look: 'stage', key: 'stage' + n, text: X.title + ' ' + stage.name, q: 0.72,
          prompt: `Which lesson belonged to the ${stage.name} stage?`, explain: fit(`“${X.title}” was part of the ${stage.name} stage — ${stage.title}.`) }), rnd, X.title, wrong.map((w) => w.text)))
      }
    })
  }
  if (whole) {
    order.filter((L) => L.week != null && C.stages[L.week]).slice(0, 2).forEach((X, n) => {
      const st = C.stages[X.week]
      const others = shuffle(C.stages.filter((x) => x.i !== st.i), rnd).slice(0, 3)
      if (others.length === 3) {
        push(choiceCand(bySc({ source: 'week', kind: 'stage-of-lesson', look: 'stage', key: 'stage' + n, text: X.title + ' ' + st.name, q: 0.72,
          prompt: `Which stage was “${X.title}” part of?`, explain: fit(`“${X.title}” belonged to the ${st.name} stage — ${st.title}.`) }), rnd, st.name, others.map((x) => x.name)))
      }
      const o2 = shuffle(C.stages.filter((x) => x.i !== st.i), rnd)[0]
      if (o2) push(tfCand(bySc({ source: 'week', kind: 'tf-stage-of-lesson', look: 'stage', key: 'stage' + n, text: X.title + ' ' + st.name, q: 0.6,
        explain: fit(`“${X.title}” belonged to the ${st.name} stage.`) }), `“${X.title}” belonged to the ${st.name} stage.`, `“${X.title}” belonged to the ${o2.name} stage.`))
    })
  }

  /* the stages themselves */
  if (whole || stage) {
    const sts = whole ? shuffle(C.stages, rnd) : [stage]
    sts.slice(0, 2).forEach((st, n) => {
      const others = C.stages.filter((x) => x.i !== st.i)
      if (st.question && others.filter((x) => x.question).length >= 3) {
        const wrong = shuffle(others.filter((x) => x.question), rnd).slice(0, 3)
        push(choiceCand(bySc({ source: 'week', kind: 'stage-question', look: 'stage', key: 'stq' + n, text: st.question, q: 0.78,
          prompt: `Which question does the ${st.name} stage ask?`, explain: fit(`The ${st.name} stage asks: ${st.question}`) }), rnd, st.question, wrong.map((x) => x.question)))
      } else if (others.length >= 3) {
        const wrong = shuffle(others, rnd).slice(0, 3)
        push(choiceCand(bySc({ source: 'week', kind: 'stage-title', look: 'stage', key: 'stq' + n, text: st.title, q: 0.74,
          prompt: `What was the ${st.name} stage about?`, explain: fit(`The ${st.name} stage: ${st.title}.`) }), rnd, st.title, wrong.map((x) => x.title)))
      }
      const o2 = shuffle(others, rnd)[0]
      if (o2) {
        push(tfCand(bySc({ source: 'week', kind: 'tf-stage-title', look: 'stage', key: 'stt' + n, text: st.title, q: 0.6, explain: fit(`The ${st.name} stage was “${st.title}”.`) }),
          `The ${st.name} stage was “${st.title}”.`, `The ${st.name} stage was “${o2.title}”.`))
        if (whole && C.stages.length >= 3) {
          push(tfCand(bySc({ source: 'week', kind: 'tf-stage-order', look: 'stage', key: 'stt' + n, text: st.name + ' ' + ORD[st.i], q: 0.58, explain: fit(`The ${ORD[st.i]} stage was ${st.name}.`) }),
            `The ${ORD[st.i]} stage was ${st.name}.`, `The ${ORD[st.i]} stage was ${o2.name}.`))
        }
      }
      const ps = pseudo(st.title, st.name + ' ' + st.question)
      push(blankCands(C, ps, st.title, { source: 'week', kind: 'blank-stage-title', look: 'stage', key: 'stt' + n, q: 0.78 + boost, scope, titleCase: true,
        prompt: 'Complete the stage title', cite: `${st.name} stage`, explain: fit(`The ${st.name} stage: ${st.title}.`) }, rnd, 1))
      const words = wordsOf(st.title)
      if (words.length >= 4 && words.length <= 6 && !/[,;:—–]/.test(st.title)) {
        push(orderCand(bySc({ source: 'week', kind: 'order-stage-title', look: 'stage', key: 'stt' + n, prompt: 'Put the stage title in order', cite: `${st.name} stage`,
          explain: fit(`The ${st.name} stage: ${st.title}.`), q: 0.7 }), st.title))
      }
    })
  }

  /* matching */
  const want = whole || D.length >= 5 ? 4 : 3
  const stageName = stage ? stage.name : ''
  const items = (fn) => D.map(fn).filter(Boolean)
  const mkMatch = (kind, prompt, source, pairs, q, look, explain) => {
    if (pairs.length >= 3) push(matchCand(bySc({ source, kind, look, key: kind, q, text: pairs.map((p) => p.left + ' ' + p.right).join(' '), prompt,
      explain: fit(explain || `${pairs[0].left}: ${pairs[0].right}`) }),
    pairs.map((p, i) => ({ id: 'p' + (i + 1), left: p.left, right: p.right })), rnd))
  }
  mkMatch('match-title-code', 'Match each lesson to its code line', 'code',
    pairSet(items((L) => L.code && L.code.length <= 58 && L.title.length <= 38 ? { left: L.title, right: L.code } : null), want, rnd), 0.86, 'stage')
  mkMatch('match-title-ref', 'Match each lesson to its verse', 'scripture',
    pairSet(items((L) => L.verse && L.title.length <= 38 ? { left: L.title, right: L.verse.ref, ref: L.verse.ref } : null), want, rnd, (a, b) => !refsOverlap(a.ref, b.ref)), 0.8, 'stage')
  mkMatch('match-title-truth', 'Match each lesson to its one thing', 'truth',
    pairSet(items((L) => { const t = truthOpt(L.truth); return t && t.length <= 66 && L.title.length <= 38 ? { left: L.title, right: t } : null }), want, rnd), 0.82, 'stage')
  if (su) {
    const rp = recapPoints(su, C)
    // a takeaway that merely repeats its lesson's title is no puzzle; keep the ones that name the idea in other words
    const pairs = pairSet(rp.filter((r) => r.phrase.length <= 38 && r.L.title.length <= 38 && overlapOf(r.phrase, r.L.title) < 0.75)
      .map((r) => ({ left: upFirst(r.phrase), right: r.L.title })), want, rnd)
    mkMatch('match-takeaway-lesson', 'Match each takeaway to its lesson', 'week', pairs, 0.8, 'stage')
  }
  if (whole) {
    const picks = []
    const seenW = new Set()
    for (const L of shuffle(C.days, rnd)) {
      if (L.week == null || seenW.has(L.week) || !C.stages[L.week] || L.title.length > 38) continue
      seenW.add(L.week); picks.push({ left: L.title, right: C.stages[L.week].name })
    }
    mkMatch('match-lesson-stage', 'Match each lesson to its stage', 'week', pairSet(picks, want, rnd), 0.84, 'stage')
    mkMatch('match-stage-title', 'Match each stage to its title', 'week',
      pairSet(C.stages.filter((x) => x.title.length <= 40).map((x) => ({ left: x.name, right: x.title })), want, rnd, () => true), 0.88, 'stage')
    mkMatch('match-stage-question', 'Match each stage to its question', 'week',
      pairSet(C.stages.filter((x) => x.question && x.question.length <= 64).map((x) => ({ left: x.name, right: x.question })), want, rnd), 0.88, 'stage')
  }

  /* the week's recap, as Sunday wrote it */
  if (su) {
    rp: for (const r of shuffle(recapPoints(su, C), rnd).slice(0, 2)) {
      const ps = { ...pseudo(r.phrase, su.recap + ' ' + su.reading), seen: new Set([...stemSet(su.recap), ...stemSet(su.reading || ''), ...r.L.seen]) }
      for (const c of blankCands(C, ps, r.sentence, { source: 'point', kind: 'blank-recap', look: 'recap', key: 'recap:' + r.L.day, q: 0.88 + boost, scope, themeOnly: true,
        prompt: 'Fill in the missing word', cite: `Ep ${r.L.num} · ${r.L.title}`, explain: fit(r.sentence) }, rnd, 1)) { push(c); continue rp }
    }
  }
  return out
}

/** Declaration, theme verse and anything else that belongs to the month rather than a day. */
function seriesCands(C, cal, o, known, w = 0, { theme = true } = {}) {
  const s = C.s
  const out = []
  const rnd = rngOf(`${C.id}:${cal.day}:series${o.salt}`)
  const push = (...a) => a.flat().forEach((c) => c && out.push(c))
  const mk = (m) => ({ scope: 'series', ...m })
  const decl = declLines((s.declaration || []).join('\n'))
  const th = s.themeScripture
  const sunDecl = (s.sundays && s.sundays[cal.sunday] ? declLines(s.sundays[cal.sunday].declaration) : [])
  const lines = [...sunDecl.map((t) => ({ t, own: true })), ...decl.map((t) => ({ t, own: false }))]
  const ps = pseudo(decl.join(' '), '')
  lines.forEach(({ t, own }, k) => {
    if (!(o.declarationSeen || known(t))) return
    const key = 'sdecl:' + k
    const q = (own ? 0.82 : 0.8) + w + (k % lines.length === cal.day % lines.length ? 0.08 : -0.03) - (wordsOf(t).length < 6 ? 0.1 : 0)
    push(blankCands(C, ps, t, { source: 'declaration', kind: 'blank-declaration', look: 'declaration', key, q, scope: 'series', prompt: 'Complete the declaration', explain: fit(`Say it: “${t}”`) }, rnd, 1))
    for (const unit of orderUnits(t)) push(orderCand(mk({ source: 'declaration', kind: 'order-declaration', look: 'declaration', key, q: q + 0.04, prompt: 'Put the declaration in order',
      explain: fit(`Say it: “${unit}”`) }), unit))
  })
  if (theme && th && th.text && C.themeRef) {
    const refs = refChoices(C, [C.themeRef], C.themeRef, 3, rnd)
    if (refs.length === 3) {
      push(choiceCand(mk({ source: 'scripture', kind: 'theme-ref', look: 'theme', key: 'theme', text: th.text, q: 0.8 + w, quote: quoteOf(th.text, 10),
        prompt: 'Which verse is the theme of this month?', explain: withRef(snippet(th.text, 16), C.themeRef) }), rnd, C.themeRef, refs))
    }
    const tl = pseudo(th.text, s.title)
    push(blankCands(C, tl, squish(th.text), { source: 'scripture', kind: 'blank-theme', look: 'theme', key: 'theme', q: 0.86 + w, scope: 'series', prompt: 'Complete the theme verse',
      cite: C.themeRef, ref: C.themeRef }, rnd, 1))
    for (const unit of orderUnits(th.text, { verse: true })) push(orderCand(mk({ source: 'scripture', kind: 'order-theme', look: 'theme', key: 'theme', q: 0.74 + w, prompt: 'Put the theme verse in order',
      cite: C.themeRef, explain: withRef(unit, C.themeRef) }), unit))
    const wrong = C.refs.filter((r) => r.text && !refsOverlap(r.ref, C.themeRef) && lc(r.text) !== lc(th.text))
    const w1 = choose(wrong.map((r) => ({ text: snippet(r.text, 9) })), 1, { rnd, answer: snippet(th.text, 9), maxOverlap: 0.3, lenTol: 0.5 })[0]
    if (w1) {
      push(tfCand(mk({ source: 'scripture', kind: 'tf-theme', look: 'theme', key: 'theme', text: th.text, q: 0.6 + w, explain: withRef(snippet(th.text, 14), C.themeRef) }),
        `“${snippet(th.text, 9)}” is the theme verse of this month.`, `“${w1.text}” is the theme verse of this month.`))
    }
  }
  return out
}

function reviewCands(C, cal, o) {
  const s = C.s
  const out = []
  const wi = cal.week
  const su = s.sundays && s.sundays[cal.sunday]
  const selah = cal.type === 'selah'
  let D
  if (selah) D = wi != null ? C.days.filter((L) => L.week === wi && L.day < cal.day) : C.days.filter((L) => L.day < cal.day).slice(-2)
  else D = C.days.slice()
  if (D.length) out.push(...daySetCands(C, cal, D, { whole: !selah, su, wi: selah ? wi : null, scope: selah ? 'stage' : 'series', boost: selah ? 0.02 : 0, salt: o.salt }))
  const seen = selah ? stemSet([su?.recap, su?.reading, ...D.map((L) => L.title + ' ' + L.truth)].filter(Boolean).join(' ')) : null
  const known = (t) => !seen || (() => { const st = [...stemSet(t)]; return st.length && st.filter((x) => seen.has(x)).length / st.length >= 0.7 })()
  out.push(...seriesCands(C, cal, o, known, selah ? -0.14 : 0.02))
  return out
}

/* ───────────────────────── the planner ────────────────────────────────── */

// How much a type wants to sit at the start / middle / end of a lesson. Easy recognition first,
// construction last — the final exercise (build the line) leads straight into the declaration.
const POSITION = {
  first: { choice: 3, tf: 3, blank: 1.2, match: 1.2, order: 0.1 },
  mid: { blank: 3, match: 2.4, choice: 1.4, tf: 1.6, order: 1 },
  last: { order: 4, match: 1.6, blank: 1.6, tf: 0.5, choice: 0.3 },
}
const MAX_PER_TYPE = (count) => (count <= 3 ? 1 : count <= 5 ? 2 : Math.ceil(count / 2))
const subjectOf = (c) => String(c.key || '').split('#')[0]
const textOverlap = (p, c) => p.tset.size && c.tset.size ? jaccard(p.tset, c.tset) : 0

function realise(seq, byType) {
  const chosen = []
  let total = 0
  for (const t of seq) {
    let best = null, bs = -1e9
    for (const c of byType[t] || []) {
      if (chosen.includes(c)) continue
      let s = c.q + c.j
      for (const p of chosen) {
        if (p.subj === c.subj) s -= 0.34
        if (p.source === c.source) s -= 0.12
        if (p.text && c.text && (p.norm === c.norm || textOverlap(p, c) > 0.55)) s -= 0.6
      }
      if (s > bs) { bs = s; best = c }
    }
    if (!best) return null
    chosen.push(best)
    total += bs
  }
  return { chosen, total }
}

function plan(cands, count, rnd) {
  const byType = {}
  for (const c of cands) (byType[c.type] ||= []).push(c)
  const types = Object.keys(byType)
  if (!types.length) return []
  const cap = MAX_PER_TYPE(count)
  let best = null
  for (let trial = 0; trial < 45; trial++) {
    const seq = []
    const used = {}
    let ok = true
    for (let p = 0; p < count; p++) {
      const prof = POSITION[p === 0 ? 'first' : p === count - 1 ? 'last' : 'mid']
      const opts = types.filter((t) => t !== seq[p - 1] && (used[t] || 0) < cap && (used[t] || 0) < byType[t].length)
      if (!opts.length) { ok = false; break }
      const ws = opts.map((t) => (prof[t] || 0.5) * (0.55 + rnd() * 0.9))
      let r = rnd() * ws.reduce((a, b) => a + b, 0)
      let k = 0
      while (k < opts.length - 1 && (r -= ws[k]) > 0) k++
      seq.push(opts[k])
      used[opts[k]] = (used[opts[k]] || 0) + 1
    }
    if (!ok) continue
    const real = realise(seq, byType)
    if (!real) continue
    const kinds = new Set(seq).size, srcs = new Set(real.chosen.map((c) => c.source)).size
    const posScore = seq.reduce((a, t, p) => a + (POSITION[p === 0 ? 'first' : p === count - 1 ? 'last' : 'mid'][t] || 0.5), 0) * 0.22
    const score = real.total + posScore + kinds * 0.35 + srcs * 0.18
    if (!best || score > best.score) best = { score, chosen: real.chosen }
  }
  if (best) return best.chosen
  // Not enough variety to honour the plan: take the best remaining, still never two of a type in a row.
  const rest = cands.slice().sort((a, b) => b.q + b.j - (a.q + a.j))
  const out = []
  for (const c of rest) {
    if (out.length >= count) break
    if (out.length && out[out.length - 1].type === c.type) continue
    out.push(c)
  }
  for (const c of rest) if (out.length < count && !out.includes(c)) out.push(c)
  return out
}

/* ───────────────────────── finishing an exercise ──────────────────────── */

const LETTERS = 'abcdefgh'
function finish(c, fx) {
  const out = { id: fx.id, type: c.type, prompt: c.ex.prompt, xp: XP_PER_EXERCISE, explain: '', source: c.source, kind: c.kind, scope: c.scope, look: c.look }
  if (c.type === 'choice' || c.type === 'blank') {
    const opts = c.ex.options.slice()
    const ai = opts.findIndex((o) => o.ok)
    const tgt = Math.min(fx.slot, opts.length - 1)
    if (ai !== tgt) [opts[ai], opts[tgt]] = [opts[tgt], opts[ai]]
    if (c.type === 'blank') { out.before = c.ex.before; out.after = c.ex.after }
    if (c.ex.quote) out.quote = c.ex.quote
    if (c.ex.cite) out.cite = c.ex.cite
    out.options = opts.map((o, i) => ({ id: LETTERS[i], text: o.text }))
    out.answer = LETTERS[tgt]
    out.explain = c.explain
  } else if (c.type === 'order') {
    if (c.ex.cite) out.cite = c.ex.cite
    out.words = c.ex.chips.map((text, k) => ({ id: 'w' + (k + 1), text }))
    out.answer = c.ex.answer.slice()
    out.explain = c.explain
  } else if (c.type === 'match') {
    out.pairs = c.ex.pairs.map((p) => ({ id: p.id, left: p.left, right: p.right }))
    out.rightOrder = c.ex.rightOrder.map((i) => c.ex.pairs[i].id)
    out.explain = c.explain
  } else if (c.type === 'tf') {
    out.statement = fx.tfTrue ? c.ex.trueText : c.ex.falseText
    out.answer = !!fx.tfTrue
    out.explain = c.explain
  }
  out.explain = fit(out.explain || '')
  return out
}

/* ───────────────────────── candidates for a day ───────────────────────── */

// A generator that throws must never take a lesson down with it: its candidates are dropped, the error is
// recorded (tools/test-quiz.mjs fails on any), and the rest of the pool still builds.
const ERRORS = []
export const quizErrors = () => ERRORS.slice()
const guard = (label, fn) => {
  try { return fn() || [] } catch (e) { ERRORS.push(`${label}: ${e && e.message}`); return [] }
}
const calOf = (s, day) => s.calendar[Math.min(Math.max(1, Math.floor(day) || 1), s.calendar.length) - 1]

function candidatesFor(s, day, o) {
  const C = corpusOf(s)
  const cal = calOf(s, day)
  const L = C.byDay.get(cal.day)
  const selah = cal.type === 'selah'
  let cands = []
  if (L && !selah) cands.push(...guard('teaching', () => teachingCands(C, L, o)))
  if (selah || !L || cal.type === 'review' || cal.type === 'rest' || cal.type === 'celebration') cands.push(...guard('review', () => reviewCands(C, cal, o)))
  // Opt-in spaced recall: a teaching day may also draw on the earlier days of its own stage.
  if (o.recall && L && !selah && cal.type !== 'celebration' && L.week != null) {
    const mates = C.days.filter((x) => x.week === L.week && x.day <= L.day)
    if (mates.length >= 3) cands.push(...guard('recall', () => daySetCands(C, cal, mates, { whole: false, su: null, wi: L.week, scope: 'stage', salt: o.salt })))
  }
  // A day with almost nothing to ask about borrows the month's declaration (only lines its own words already cover).
  if (L && !selah && cal.type !== 'celebration' && cands.length < Math.min(o.count, 8) + 3) {
    cands.push(...guard('series', () => seriesCands(C, cal, o, (t) => derivable(L, t), -0.12, { theme: false })))
  }
  const rnd = rngOf(`${C.id}:${cal.day}:jitter${o.salt}`)
  for (const c of cands) {
    c.j = rnd() * (c.type === 'order' ? 0.3 : 0.14)
    c.subj = subjectOf(c); c.norm = lc(c.text || ''); c.tset = stemSet(c.text || '')
  }
  if (o.types) cands = cands.filter((c) => o.types.includes(c.type))
  if (o.sources) cands = cands.filter((c) => o.sources.includes(c.source))
  return { C, cal, cands }
}

const OPTS = (opts = {}) => { const o = { count: 4, declarationSeen: false, recall: false, supporting: 1, types: null, sources: null, salt: '', ...opts }; o.salt = o.salt ? ':' + o.salt : ''; return o }
const LESSONS = new WeakMap()

/** The check exercises for one day. Deterministic per (series.id, day, options). */
export function quizFor(series, day, opts) {
  const o = OPTS(opts)
  const key = JSON.stringify([day, o.count, o.declarationSeen, o.recall, o.supporting, o.types, o.sources, o.salt])
  let memo = LESSONS.get(series)
  if (!memo) LESSONS.set(series, (memo = new Map()))
  if (!memo.has(key)) memo.set(key, composeLesson(series, day, o))
  return JSON.parse(JSON.stringify(memo.get(key)))   // callers get their own copy; the cache stays pristine
}

function composeLesson(s, day, o) {
  if (!s || !Array.isArray(s.calendar) || !s.calendar.length) return []
  const { C, cal, cands } = candidatesFor(s, day, o)
  const rnd = rngOf(`${C.id}:${cal.day}:plan${o.salt}`)
  const picked = plan(cands, o.count, rnd)
  const slots = shuffle([0, 1, 2, 3], rnd)
  let k = 0, tfN = 0
  const tfPhase = (hash(C.id) % 1000) / 1000
  const used = new Set()
  return picked.map((c) => {
    let id = `${C.id}:${cal.day}:${c.kind}:${hash(c.key + '|' + (c.text || '')).toString(36)}`
    while (used.has(id)) id += 'x'
    used.add(id)
    const slot = c.type === 'choice' || c.type === 'blank' ? slots[k++ % 4] : 0
    let tfTrue = true
    if (c.type === 'tf') { tfTrue = ((cal.day * 0.6180339887 + tfPhase + tfN++ * 0.37) % 1) < 0.5 }
    return finish(c, { id, slot, tfTrue })
  })
}

/* ───────────────────────── grading ────────────────────────────────────── */

const wordText = (ex, id) => (ex.words.find((w) => w.id === id) || {}).text

/**
 * Grade a response. Response shapes (see docs/QUIZ-API.md):
 *   choice / blank → the option id        order → array of word ids, in the order placed
 *   match → { [pairId]: pairId }          tf → boolean
 * Never throws on a malformed response — it is simply wrong.
 */
export function gradeExercise(ex, response) {
  const explain = ex.explain
  switch (ex.type) {
    case 'choice':
    case 'blank': {
      const id = response && typeof response === 'object' ? response.id : response
      const opt = ex.options.find((o) => o.id === ex.answer)
      return { right: id === ex.answer, answerText: opt ? opt.text : '', explain }
    }
    case 'order': {
      const want = ex.answer.map((id) => wordText(ex, id))
      const got = (Array.isArray(response) ? response : []).map((id) => wordText(ex, id))
      // identical words are interchangeable ("the … the"), so compare what was spelled, not which chip
      const hits = got.filter((t, i) => t !== undefined && t === want[i]).length
      return { right: got.length === want.length && hits === want.length, answerText: want.join(' '), explain, detail: { placed: got.length, inPlace: hits } }
    }
    case 'match': {
      const r = response && typeof response === 'object' ? response : {}
      const wrong = ex.pairs.filter((p) => r[p.id] !== p.id).map((p) => p.id)
      return { right: wrong.length === 0, answerText: ex.pairs.map((p) => `${p.left} — ${p.right}`).join(' · '), explain, detail: { wrong } }
    }
    case 'tf': {
      const v = response === true || response === 'true' ? true : response === false || response === 'false' ? false : null
      return { right: v === ex.answer, answerText: ex.answer ? 'True' : 'False', explain }
    }
    default:
      return { right: false, answerText: '', explain }
  }
}

/** A one-line human description of an exercise, for logs and tests. */
export function describeExercise(ex) {
  const tag = `${ex.type}${ex.kind ? '/' + ex.kind : ''}`
  switch (ex.type) {
    case 'choice': {
      const a = ex.options.find((o) => o.id === ex.answer)
      return `${tag} · ${ex.prompt}${ex.quote ? ' ' + ex.quote : ''} → ${a ? a.text : '?'}`
    }
    case 'blank': {
      const a = ex.options.find((o) => o.id === ex.answer)
      return `${tag} · ${ex.before}[${a ? a.text : '?'}]${ex.after}`
    }
    case 'order':
      return `${tag} · ${ex.answer.map((id) => wordText(ex, id)).join(' ')}`
    case 'match':
      return `${tag} · ${ex.pairs.map((p) => `${p.left} = ${p.right}`).join(' | ')}`
    case 'tf':
      return `${tag} · “${ex.statement}” → ${ex.answer}`
    default:
      return String(ex && ex.type)
  }
}

/* ───────────────────────── the pool & its statistics ──────────────────── */

/**
 * Every exercise the engine could set for a day (unplanned, best first). Used by tests, audits and
 * authoring tools; a Lesson uses quizFor. Each carries `q` (0–1 quality estimate) and both true/false
 * variants of a tf appear as separate exercises.
 */
export function exercisePool(series, day, opts) {
  const o = OPTS({ count: 99, ...opts })
  const { C, cal, cands } = candidatesFor(series, day, o)
  const exercises = []
  cands.slice().sort((a, b) => b.q - a.q).forEach((c, i) => {
    const id = `${C.id}:${cal.day}:${c.kind}:${hash(c.key + '|' + (c.text || '')).toString(36)}`
    const variants = c.type === 'tf' ? [true, false] : [true]
    variants.forEach((tfTrue) => {
      const ex = finish(c, { id: variants.length > 1 ? id + (tfTrue ? ':t' : ':f') : id, slot: i % 4, tfTrue })
      ex.q = Math.round((c.q + c.j) * 1000) / 1000
      exercises.push(ex)
    })
  })
  const count = (key) => exercises.reduce((m, e) => ((m[e[key]] = (m[e[key]] || 0) + 1), m), {})
  return { series: series.id, day: cal.day, dayType: cal.type, total: exercises.length, byType: count('type'), bySource: count('source'), byKind: count('kind'), exercises }
}

/** Pool statistics for a whole series: coverage by type and source, and the thinnest days. */
export function poolStats(series, opts) {
  const days = []
  const totals = { byType: {}, bySource: {}, byKind: {} }
  const add = (into, from) => { for (const k in from) into[k] = (into[k] || 0) + from[k] }
  for (let d = 1; d <= series.calendar.length; d++) {
    const p = exercisePool(series, d, opts)
    days.push({ day: d, dayType: p.dayType, total: p.total, byType: p.byType, types: Object.keys(p.byType).length })
    add(totals.byType, p.byType); add(totals.bySource, p.bySource); add(totals.byKind, p.byKind)
  }
  const thin = days.filter((x) => x.total < 8 || x.types < 3).map((x) => x.day)
  return { series: series.id, days, totals, thin }
}

/**
 * Builds the series corpus (vocabulary, reference pool…) ahead of the first lesson. Safe to call from an
 * idle callback on the Learn screen so the first `quizFor` of a session is as fast as the rest.
 */
export function warmQuiz(series) {
  corpusOf(series)
  return true
}

/* ───────────────────────── answer-state helpers ───────────────────────── */
// The same small rules every Lesson UI needs, so every Lesson behaves the same.

/** The empty response for an exercise: null (choice, blank, tf), [] (order), {} (match). */
export const emptyResponse = (ex) => (ex.type === 'order' ? [] : ex.type === 'match' ? {} : null)

/** Whether CHECK may be enabled: an option is picked / every word placed / every pair made / a side chosen. */
export function isAnswerComplete(ex, r) {
  switch (ex.type) {
    case 'choice':
    case 'blank': { const id = r && typeof r === 'object' ? r.id : r; return ex.options.some((o) => o.id === id) }
    case 'order': return Array.isArray(r) && r.length === ex.words.length
    case 'match': return !!r && typeof r === 'object' && ex.pairs.every((p) => r[p.id] != null)
    case 'tf': return r === true || r === false
    default: return false
  }
}

/** Tap a word chip: place it (at the end) or take it back out. Returns the new response. */
export function toggleWord(ex, r, id) {
  const a = Array.isArray(r) ? r : []
  if (a.includes(id)) return a.filter((x) => x !== id)
  return ex.words.some((w) => w.id === id) && a.length < ex.words.length ? [...a, id] : a
}

/** Pair a left item with a right item (one-to-one: the right item leaves any previous partner). */
export function pairUp(ex, r, leftId, rightId) {
  const next = { ...(r && typeof r === 'object' ? r : {}) }
  for (const k of Object.keys(next)) if (next[k] === rightId) delete next[k]
  if (ex.pairs.some((p) => p.id === leftId) && ex.pairs.some((p) => p.id === rightId)) next[leftId] = rightId
  return next
}

/** Break a pair (tap a matched left item again). */
export function unpair(r, leftId) {
  const next = { ...(r && typeof r === 'object' ? r : {}) }
  delete next[leftId]
  return next
}

/** How many exercises a day wants: a little more for the finale, which closes the whole month. */
export function suggestedCount(series, day) {
  const cal = series && series.calendar ? calOf(series, day) : null
  return cal && cal.type === 'celebration' ? 5 : 4
}
