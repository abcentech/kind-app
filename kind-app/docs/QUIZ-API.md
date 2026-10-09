# QUIZ-API — `src/quiz.js` (the exercise engine)

Pure ES module, no imports, no clock, no DOM. Same `(series, day, options)` in → same lesson out, every time.
Examples below were produced by running the engine on `stewardship-code` (A) and `secrets-of-longevity` (B).
`import { quizFor, gradeExercise, emptyResponse, isAnswerComplete, toggleWord, pairUp, unpair, XP_PER_EXERCISE } from '../quiz.js'`

## 1. Exports

| Export | Signature | Notes |
|---|---|---|
| `quizFor` | `(series, day, opts?) → Exercise[]` | The lesson. Memoised per series object; returns a fresh deep copy each call (mutating it is safe). |
| `gradeExercise` | `(ex, response) → { right, answerText, explain, detail? }` | Never throws on a bad *response*; throws if `ex` itself is null/undefined. |
| `emptyResponse` | `(ex) → null \| [] \| {}` | `null` choice/blank/tf, `[]` order, `{}` match. Initial `useState` value. |
| `isAnswerComplete` | `(ex, r) → boolean` | Enables CHECK. |
| `toggleWord` | `(ex, r, wordId) → string[]` | Order: place at end, or take back out if already placed. |
| `pairUp` | `(ex, r, leftId, rightId) → {}` | Match: link; one-to-one. |
| `unpair` | `(r, leftId) → {}` | Match: break a link. |
| `suggestedCount` | `(series, day) → 4 \| 5` | 5 for the celebration (finale) day, else 4. Pass as `count`. |
| `warmQuiz` | `(series) → true` | Pre-builds the corpus; call from idle on Learn so first lesson is instant. |
| `XP_PER_EXERCISE` | `10` | Same as `ex.xp`. |
| `EXERCISE_TYPES` | `['choice','blank','order','match','tf']` | |
| `describeExercise` | `(ex) → string` | One-line debug text. |
| `exercisePool`, `poolStats`, `quizErrors` | tooling | Every candidate for a day / coverage stats / generator errors. UI never needs these. |

All helpers are pure: they return a **new** response, never mutate `r`. Keep the response in React state and feed the result of each helper to `setState`.

### `quizFor` options

`{ count = 4, salt = '', declarationSeen = false, recall = false, supporting = 1, types = null, sources = null }`

- `count` — number of exercises (any integer; `0` → `[]`; `12` → 12). Use `suggestedCount(series, day)`; the app contract is 4 (`QUIZ_COUNT`).
- `salt` — "practise again": `quizFor(s, d, { salt: 'again' })` gives a *different but equally deterministic* lesson. Some ids may repeat across salts (same underlying item); ids are unique **within** a lesson.
- `declarationSeen: true` allows declaration items on days whose own text doesn't cover the declaration words (default: only if derivable from today's reading).
- `recall: true` lets a teaching day also draw on earlier days of its stage. `supporting: 2` allows verse-matching using two supporting verses. `types` / `sources` filter the pool (filtering to one type breaks the no-repeat variety rule: `types:['tf']` returns 4 tfs; an unknown type returns `[]`).
- Bad `day`: clamped to `1..calendar.length` and floored (`0 → 1`, `999 → 31`, `NaN → 1`, `2.7 → 2`). Empty calendar → `[]`. `series` must be an object (`null` throws).

## 2. Exercise — common fields

```ts
{ id: string,                 // 'stewardship-code:12:truth:11ymvsp' — unique in a lesson, stable across calls. Use as React key AND as scoreAnswer's `id`.
  type: 'choice'|'blank'|'order'|'match'|'tf',
  prompt: string,             // the instruction line ("Complete the verse"); never ends in '!'
  xp: 10,
  explain: string,            // 8–140 chars; the "why" line shown after CHECK (right or wrong)
  source: 'scripture'|'truth'|'point'|'code'|'declaration'|'week',   // what it tests (drives iconography/colour if you want)
  kind: string,               // generator name, e.g. 'blank-verse', 'tf-point', 'match-title-code' — debugging/analytics only
  scope: 'today'|'stage'|'series',   // how far back it reaches. today = this lesson; stage = review of the stage; series = whole month
  look: string }              // where the answer can be re-read: 'verse'|'truth'|'declaration'|'picture'|'recap'|'stage'|'point:N'|'supporting:N'|'day:N'
```
Optional on some types: `cite` (string, a reference or label shown near the prompt, e.g. `'Luke 14:28'`, `'Ep 3 · Title'`, `'Wisdom stage'`) and `quote` (choice only: the text to show under the prompt). Render both when present, never assume them.
All strings are trimmed, single-spaced, emoji-free, plain text (no markup). Ids inside an exercise are stable per exercise only (`'a'`, `'w1'`, `'p1'` repeat across exercises).

## 3. Per type

### choice — 4 options, one answer
Fields: `options:[{id:'a'|'b'|'c'|'d', text}]` (always exactly 4, ids a–d, answer slot is balanced across a–d), `answer: id`, optional `quote`, `cite`.
Option text can be long (a full truth sentence ≈ 100 chars) or short (a title, a reference like `John 3:16`).
```json
{"id":"stewardship-code:12:truth:11ymvsp","type":"choice","prompt":"What was the one thing today?","xp":10,
 "explain":"A budget is a plan that gives money an assignment before emotions spend it.","source":"truth","kind":"truth","scope":"today","look":"truth",
 "options":[{"id":"a","text":"Temporary resources should be used in ways that produce lasting and eternal impact."},{"id":"b","text":"A budget is a plan that gives money an assignment before emotions spend it."},{"id":"c","text":"Money becomes a servant when it is deliberately directed towards meaningful and eternal purposes."},{"id":"d","text":"Money tests character. Integrity must be stronger than the desire for quick profit."}],
 "answer":"b"}
```
Response: **option id** (`'b'`). `{id:'b'}` is also accepted by grade/complete. Keys 1–4 map to options[0..3].

### blank — fill the missing word, 4 options
Fields: `before`, `after` (sentence halves — **whitespace is meaningful**: `before` ends with a space, `after` may start with punctuation), `options` (4, short single words/phrases), `answer`, `cite`. Render `before + <slot> + after`; when picked/graded, slot shows the option text. Options never already appear in the sentence.
```json
{"id":"secrets-of-longevity:9:blank-verse:1ymqilk","type":"blank","prompt":"Complete the verse","xp":10,
 "explain":"“Now the just shall live by faith: but if any man draw back, my soul shall have no pleasure in him.” — Hebrews 10:38",
 "source":"scripture","kind":"blank-verse","scope":"today","look":"verse","cite":"Hebrews 10:38",
 "before":"Now the just shall live by ","after":": but if any man draw back, my soul shall have no pleasure in him.",
 "options":[{"id":"a","text":"faith"},{"id":"b","text":"medicine"},{"id":"c","text":"meat"},{"id":"d","text":"earth"}],"answer":"a"}
```
Response: option id (same as choice). Verses may be long; `after` can contain an ellipsis `…` where the verse is cut.

### order — assemble a line from word chips
Fields: `words:[{id:'w1'…,text}]` (**already shuffled; array order = display order of the tray**; 3–9 chips), `answer:[id,…]` (the correct sequence of word ids), `cite`. Chip text keeps its punctuation/capitalisation ("Now", "faith…", "Code."). Never starts already solved.
```json
{"id":"secrets-of-longevity:9:order-verse:1kbkzce","type":"order","prompt":"Put the verse in order","xp":10,
 "explain":"“Now the just shall live by faith…” — Hebrews 10:38","source":"scripture","kind":"order-verse","scope":"today","look":"verse","cite":"Hebrews 10:38",
 "words":[{"id":"w1","text":"by"},{"id":"w2","text":"shall"},{"id":"w3","text":"the"},{"id":"w4","text":"live"},{"id":"w5","text":"just"},{"id":"w6","text":"Now"},{"id":"w7","text":"faith…"}],
 "answer":["w6","w3","w5","w2","w4","w1","w7"]}
```
Response: **array of word ids in the order placed** (`['w6','w3']` partial is fine). Build with `toggleWord`. Complete when `r.length === words.length`.
Grading compares chip *text*, not ids — duplicate words ("the … the") are interchangeable, so any chip with the right text in a slot is right. `detail: { placed, inPlace }` (inPlace = chips in the right slot) lets you paint a near-miss.
Undo/Backspace: `r.slice(0, -1)` is the right "undo last" (the helpers have no undo; `toggleWord` on a placed id removes that one chip from anywhere).

### match — pair 3–4 items
Fields: `pairs:[{id:'p1'…, left, right}]` (3 or 4; **pairs are in the correct left-column order and ARE the answer key**), `rightOrder:[pairId,…]` (the order to *display the right-hand column*; never opposite its partner). Text caps: left ≤ 56 chars, right ≤ 90.
```json
{"id":"stewardship-code:9:match-title-code:cokbtc","type":"match","prompt":"Match each lesson to its code line","xp":10,
 "explain":"The Assignment: Everything God gives me has an assignment.","source":"code","kind":"match-title-code","scope":"stage","look":"stage",
 "pairs":[{"id":"p1","left":"The Assignment","right":"Everything God gives me has an assignment."},{"id":"p2","left":"The Owner","right":"God owns everything."},{"id":"p3","left":"Crack The Stewardship Code","right":"Jesus Christ is my Master."},{"id":"p4","left":"The Source","right":"God is my Source."}],
 "rightOrder":["p2","p3","p4","p1"]}
```
Render: left column `pairs.map(p => p.left)`; right column `rightOrder.map(id => pairs.find(p => p.id === id).right)`.
Response: **`{ [leftPairId]: rightPairId }`** — a right-hand item is identified by the id of the pair it belongs to. Correct = every `r[p.id] === p.id`. `pairUp(ex, {}, 'p1', 'p2')` → `{p1:'p2'}` (wrong pairing, legal). One-to-one: pairing `p2` to a right item already held by `p1` steals it (`{p1:'p2'}` + `pairUp(p2→p2)` → `{p2:'p2'}`; p1 is freed). Unknown ids are ignored. `unpair(r,'p1')` frees p1's partner.
`detail: { wrong: [pairId,…] }` = left items paired incorrectly (empty when right) — use it to shake only the bad links.

### tf — true/false
Fields: `statement`, `answer: boolean`. Prompt is always `"True or false?"`. About half are true (balanced per run); false statements are plausible edits of true ones (e.g. "A budget ensures that important things are ignored.").
```json
{"id":"stewardship-code:12:tf-point:1q386do","type":"tf","prompt":"True or false?","xp":10,
 "explain":"A budget ensures that important things are not ignored.","source":"point","kind":"tf-point","scope":"today","look":"point:1",
 "statement":"A budget ensures that important things are ignored.","answer":false}
```
Response: **boolean**. `gradeExercise` also accepts the strings `'true'`/`'false'`, but `isAnswerComplete` only accepts real booleans — send booleans. `explain` states the *true* version of the claim, so it reads correctly whether the statement was true or false.

## 4. Response shapes at a glance

| type | response | empty | complete when | built by |
|---|---|---|---|---|
| choice / blank | option id `'a'..'d'` | `null` | id is one of `options` | `onChange(opt.id)` |
| order | `string[]` word ids in placement order | `[]` | `length === words.length` | `toggleWord` |
| match | `{leftPairId: rightPairId}` | `{}` | every pair has a partner | `pairUp` / `unpair` |
| tf | `true \| false` | `null` | is a boolean | `onChange(bool)` |

```js
const [r, setR] = useState(() => emptyResponse(ex))
const canCheck = isAnswerComplete(ex, r)          // CHECK button disabled until true
const g = gradeExercise(ex, r)                    // { right, answerText, explain, detail? }
```

## 5. `gradeExercise(ex, response)`

Returns `{ right: boolean, answerText: string, explain: string, detail? }`.
- `answerText` — human-readable correct answer, always present (wrong *and* right): choice/blank → the option text; order → words joined by spaces (`'I will direct my money before it disappears.'`); match → `'Left — Right · Left — Right …'` (all pairs); tf → `'True'`/`'False'`. Show it in the wrong-answer banner ("Correct answer: …").
- `explain` — `ex.explain`, passed through.
- `detail` — only for `order` (`{placed, inPlace}`) and `match` (`{wrong:[ids]}`).
- Malformed responses (`undefined`, `'zz'`, wrong shape) → `right:false`, never a throw. Unknown `ex.type` → `{right:false, answerText:''}`.
Verified: `gradeExercise(choice,'b').right === true`; reversed order answer → `{right:false, detail:{placed:8,inPlace:0}}`; identity pairing → `right:true, detail:{wrong:[]}`.

## 6. Determinism, variety, quality rules

- **Deterministic**: seeded by `series.id`, day, and options. Re-rendering, reloading, or building twice gives byte-identical output (also for a deep-cloned series object). Never call `Math.random` to re-shuffle anything — chip order, option order, `rightOrder` are fixed in the data.
- **Variety**: never two consecutive exercises of the same type (except when you filter `types`); ≥ 2 distinct types when `count ≥ 3`, ≥ 3 when `count ≥ 4`; at most 1 of a type when `count ≤ 3`, 2 when `count ≤ 5`. Planner puts recognition (choice/tf) first and construction (order) last — the last exercise often leads straight into the declaration.
- **Choice/blank answer position** is balanced across a–d, and the answer is neither always longest nor shortest. Exactly one correct option; no duplicate option texts; distractors come from the same series and never overlap the answer.
- A lesson only tests what the learner has **just read**: every item is derivable from that day's content (verse, truth, points, declaration if covered). Thin July content (few/short points) never produces `*-point` kinds.
- `explain` is always 8–140 chars. No ALL-CAPS words except LORD/KJV etc.

## 7. Day types

| Calendar `type` | Set |
|---|---|
| `intro` (day 1) | Treated as teaching: today's verse/truth/point, plus the declaration. |
| `teaching` | `scope:'today'` items: verse, truth, points, picture, declaration (if derivable). |
| `selah` (rest/reflect day) | Review of the stage just finished (earlier days of that stage + the Sunday recap), `scope:'stage'`, plus declaration (`scope:'series'`). Lesson-of-verse, stage titles, "which was the one thing in …". |
| `celebration` (last day) | Whole-month review, `scope:'series'`: theme verse (`theme-ref`/`blank-theme`), match lessons↔code lines or stages↔titles, truths, declaration. Use `suggestedCount` (5). |
| `review` / `rest` (B day 30 is `review`) | Same as selah/celebration review sets. |

Check with `series.calendar[day-1].type`. Both series have 31 calendar days; the day passed is the 1-based calendar day, not the episode number.

## 8. XP

- `ex.xp` = `XP_PER_EXERCISE` = **10**. The engine does not store or award anything; call the store: `scoreAnswer(right, { seriesId, day, id: ex.id })` → returns the XP actually granted (10; **5** with `{retry:true}` for a recycled/second-chance question; **2** if the day was already finished — practice, capped 20/day; **0** for a duplicate call or a wrong answer). See `docs/STORE-API.md` §6.
- Always pass `id: ex.id` so a double-invoked effect can't pay twice. A wrong first try and its right retry are distinct (`retry:true`).

## 9. Known edge cases

- `quizFor(null, …)` throws (WeakMap key); `gradeExercise(null, …)` / `emptyResponse(undefined)` throw. Guard in the UI.
- `isAnswerComplete(tf, 'true')` is `false` though `gradeExercise` accepts it — use booleans.
- `salted` lessons share some ids with the unsalted lesson (same item, new siblings) — if you key React state by id, reset state on a new `salt`.
- If a day's pool is too thin for `count` distinct types, the planner falls back to the best remaining while still avoiding adjacent same types; `count` is still honoured (`count:12` → 12), but exercises may be near-duplicates in subject.
- `rightOrder`/`words` order is the *display* order; do not sort. `pairs` order is the *left column* order.
- Order chips like `"faith…"` include the ellipsis; the correct line may end with `…` rather than `.`.
- `options` is always 4 for choice/blank today, but write the UI against `options.length` (the contract says 3–5).
- Generators that throw are swallowed (their items dropped) and recorded in `quizErrors()`; `node tools/test-quiz.mjs` fails on any.
- Test bench: `node tools/test-quiz.mjs [--series id --day n]` prints a day's lesson; `--audit` / `--lessons` write pools/lessons to `tools/out/quiz/`.
