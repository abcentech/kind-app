# KIND v7 — store & lib reference

`src/store.js` is the brain of the stickiness loop (progress, streaks, shields, XP, ranks, medals, drops, objectives).
`src/lib.js` is the content + calendar logic (modes, today, unlocking, stages, the lesson deck). This file is the
authoritative reference for screen builders. **Everything below is exercised by `node tools/test-store.mjs` (78 tests × 4 time zones, incl. a 120-life randomized streak fuzz).**

```js
import { … } from './store.js'   // state, writes, selectors that need progress
import { … } from './lib.js'     // content + calendar (pure; some take `st` to read done-days)
```

## 0. Ten rules to build against

1. **The clock is `now()`** (`now.js`, honours `?now=`). Nothing here calls `new Date()`. Every clock-dependent function takes an optional last
   argument `at` (a `Date`) so you can ask "what would this look like at 21:00?" — screens never need to, but tests and previews can.
2. **Dates are keys**: `'YYYY-MM-DD'`, local calendar day. Day arithmetic is UTC-day-number based, so DST never moves a day.
3. **Never read `st.streak` for display.** It goes stale overnight. Use `streakInfo(st)` / `useStreak()` (§5.2) — they apply the missed-day
   rules *at read time* without writing anything.
4. **Selectors are pure** (`(st, …) → value`). Call them in render. **Writes are the verbs** in §6–§9 and each is exactly **one commit**
   (one `localStorage` write, one re-render notification).
5. **Medals are awarded inside writes** — you never "grant" one. `finishDay()` / `claimObjective()` / `completeOnboarding()` / `saveNote()` /
   `addKid()` / `updateProfile()` return the ids they earned. Mid-lesson `scoreAnswer()` deliberately does *not* sweep medals, so
   the completion screen receives everything the lesson earned in one list.
6. **Drops, chests and codes are deterministic and persisted.** A reload can never re-roll anything.
7. **Nothing is purchasable, ever.** No gems, no streak repair, no top-ups. (`gems` survives only as a frozen legacy field.)
8. **Missed days are never shaming.** Rules in §5. The word "lost" appears in data (`state:'lost'`); the copy module owns how it is said.
9. **Everything degrades:** if `localStorage` throws (private mode / quota) the app keeps running in memory; garbage in storage migrates to a valid state.
10. **Test with the clock, not the calendar** — see §11 (`?now=…`, `__kind.seed()`).

## 1. Modes — archive, live, upcoming

`modeOf(series, at?)` → `'upcoming' | 'live' | 'archive'` (a series is *live* during its own calendar month).

| mode | `currentDay(s, st)` | `isUnlocked(s, day, st)` | notes |
|---|---|---|---|
| **live** (e.g. Aug 2026 on `?now=2026-08-12`) | today's day number, capped to the month length | a day opens at **06:00 local on its own date** and stays open | missed days stay open for catch-up (`missedDays`) |
| **upcoming** | `1` | nothing | `nextUnlockAt(s, 1)` = the first launch |
| **archive** (today, 2 Oct 2026 — **no series is live**) | the **first unfinished** day (rest days skipped); the last day once all are done | everything | no "missed", only "not yet" |

`activeSeriesId(at?)`: the live series; else the **newest finished**; else the soonest upcoming. (On 2 Oct 2026 → `stewardship-code`.)

```js
const s = getSeries(activeSeriesId())
currentDay(s, st)                   // 1 for a new archive user, 12 on ?now=2026-08-12
nextUnlockAt(s, 13)                 // Date 2026-08-13 06:00 local, or null if already open / archived
isUnlocked(s, 13, st)               // false on 12 Aug 09:00
```

## 2. The Learn screen's data

```js
const j = journey(s, st)            // { id, mode, currentDay, stages:[{ …stageStats, nodes:[dayState] }], progress }
```
Day 1 is `j.stages[0].nodes[0]` — render bottom-up (the pad is at the bottom).

`stageStats(s, st, index)` / `stages(s, st)` → `{ index, n (1-based), slot (1–5: use var(--stage-N)), f ('FAITHFULNESS'), name ('Faithfulness'), title, question, passage, days:[…], first, last, total, done, pct, cleared, rare (gold cards in the stage), state }`
with `state: 'cleared' | 'current' | 'open' | 'locked'`. A **stage is a week**: Aug is `[9,7,7,8]` days, July `[5,6,6,6,8]`. Days that sit between weeks
(Aug 2, July 1 carry no `week`) join their neighbour, so every day belongs to exactly one stage (`stageOf(s, day)`, `stageDays(s)`).

`dayState(s, day, st)` → `{ day, type, stage, title, eyebrow, done, unlocked, current, published, state, rare, code, key, unlockAt }`
- `state`: `'done' | 'current' | 'open' | 'locked'`. **`rare`** is separate: paint the node gold when `rare` (it mints a gold card). Map for `<Hex>`: `done→'done'`, `current→'current'`, `open→'open'`, `locked→'locked'`, and `'rare'` when `rare && !done && state !== 'locked'`.
- `title` is sentence-cased (`'Faithful in Little'`); `eyebrow` is `'Stage 2 · Faithfulness'`; `unlockAt` is a `Date` for a locked live day (show "unlocks Thu 13 Aug"), else `null`.
- `published:false` ⇒ the episode isn't in the library yet ("Coming soon").

`seriesProgress(s, st)` → `{ done, total, pct, complete, cards, cardsTotal, rareCards, rareTotal, stagesCleared, stagesTotal }`.
`weekProgress(st, id)` → `[0..1 per stage]`, `perfectWeeks(st, id)`, `missedDays(st, id, todayNo?)` (live only; `[]` in archive/upcoming).

## 3. The Launch Bar

```js
const L = launchState(s, st)        // or useLaunch(s) — re-renders every second for the countdown
```
`L.state`: `'ready'` (today's open) · `'done'` (today's finished → countdown) · `'locked'` (before 06:00) · `'upcoming'` · `'archive'` (offers the first unfinished day) · `'complete'` (everything done).
Fields: `{ state, mode, seriesId, day, title, eyebrow, teaser, mins, key, published, unlockAt, countdown (ms), next, catchUp (first missed day, live only), remaining, behind, streak, atRisk, hoursLeft, msLeft, doneToday, shields }`.
`mins` = `estimateMinutes()` (the reading time of the deck + four checks; typical teaching day 4–6). `teaser` = `teaserFor()` (one clean line, ≈ 90 chars, never above 112).
Format the countdown with `fmtCountdown(L.countdown, { prefix: 'T-' })` → `T-02:14:09`.

**For `copy.launchBarCopy` use the adapter** — it speaks the copy module's vocabulary exactly:
```js
const ctx = launchBarContext(s, st)     // → { state, kind, day, title, mins, countdown, streak, shields, hoursLeft, step, steps, pct, done, total, shieldUsed, next, seriesTitle, opens, seed }
const bar = launchBarCopy(ctx)          // { eyebrow, title, meta, sub, note, readout, cta, tone, aria }
```
State precedence on an open day: `first` (nothing ever finished) › `missed` (a shield covered yesterday / the streak ended) › `progress` (you're mid-lesson; `step`/`steps` are
an estimate — deck cards + 4 checks) › `atRisk` (streak alive, today undone, ≤ `AT_RISK_HOURS` = 6 to midnight; `countdown` = time to midnight) › `archive` › `selah` › `ready`.
A finished day or a locked one is `waiting` (`countdown`/`next`). `upcoming` carries `opens` (a `Date`) and `seriesTitle`.

## 4. The lesson deck (`lib.js`)

`deckFor(s, day)` → an array of cards (a **fresh copy every call** — pop/splice freely). Each card has a **stable semantic `id`** (`'open'`, `'verse'`, `'truth'`, `'p1'…`, `'sv1'`, `'move'`, `'ask'`, `'pray'`, `'quote'`, `'declare'`… never a position) and **`secs`** (reading-time estimate).
The deck always starts with `open` and **always ends with `declare`**. No card carries an emoji; the open card carries an `icon` name instead.

| kind | fields | |
|---|---|---|
| `open` | `eyebrow` ('Day 12 · Stage 2 · Faithfulness' · 'Day 1 · Launch' · 'Day 31 · Orbit' · 'Day 9 · Selah'), `title`, `tag` (scripture ref), `icon` (`book`/`rocket`/`trophy`/`moon`/`hourglass`), `day`, `stage` | |
| `watch` | `label`, `videoId`, `url`, `thumb`, `title` | only when the day has a video (`d.videoId`, else `s.videos[day]`); `videoOf(s, d)` resolves it |
| `read` | `label`, `body` (markdown-ish; use `md()`) | hook, picture, recaps |
| `verse` | `label`, `body`, `ref` | the Word; also a supporting verse |
| `truth` | `label`, `body` | the one thing |
| `point` | `label` ('Truth 2 of 3'), `title`, `body` | |
| `do` | `label`, `body` | challenge / apply |
| `ask` | `label`, `prompt`, `extra:[]` | the journal prompt (your answer → `saveNote`) |
| `pray` | `label`, `body` | |
| `quote` | `label`, `body`, `sub` | the 60-second short |
| `declare` | `label`, `lines:[string]` | always last |

Legacy (July) days with thin points get a single `read` card ("What today covers") instead of empty point cards; July Selah days build their recap from that week's episodes.
Other helpers: `estimateMinutes(s, day)` (2–12), `teaserFor(s, day)`, `oneLine(text, max)`, `QUIZ_COUNT` (4), `dayLabel`, `dayEyebrow`, `dayHookline` (= teaser), `epOf`, `shortFor`, `codeFor`, `weekOf`, `hasContent`, `isPlayable`.
Text: `title('FAITHFUL IN LITTLE') → 'Faithful in Little'` (small words lowered, acronyms kept, mixed case untouched), `cap`, `md`, `fmtKey('2026-08-12') → 'Wed 12 Aug'`, `fmtDay(s, n)`, `fmtCountdown(ms, { prefix })`, `greeting(at?)`.

## 5. Streaks, shields, grace

### 5.1 The rules
- A streak is **consecutive calendar days on which you finished a lesson** (new or a practice replay). A second lesson the same day changes nothing.
- When you return after missing days, **each missed day is processed in order**:
  1. a **rest day** is forgiven free (*Selah grace*); then
  2. if you hold one, a **shield** is spent; else
  3. the streak **ends** at that day (`best` is kept; the next lesson is day 1 again).
  Shields are **all-or-nothing**: if the gap can't be bridged in full, the streak ends and *no shield is consumed* — a shield that holds nothing is never spent.
  Grace is tried *before* shields so a free pass never wastes one you earned. (The contract text read "shield before grace"; the user-friendly order is deliberate — see DECISIONS.) Bridged days don't add to the count, they just don't break it.
- **Rest day** = inside a series' month: the series calendar says `selah`/`rest`/`review` (July's Selah days are *not* Sundays; Aug's are). Outside every series' month (archive): **Sunday** is Selah, the same rule August follows. A live Sunday that is a *teaching* day is **not** free.
- **Shields**: max **2**. +1 each time a streak reaches a multiple of 7 (7, 14, 21…), and via supply drops (25 %). Earning one while holding 2 converts it to **+25 XP** (`shieldEarned:'xp'`). Never purchasable.
- A device clock set **backwards** neither punishes nor rewards. Midnight is local midnight; DST-safe.
- **Milestones** `MILESTONES = [3, 7, 14, 21, 31, 50, 75, 100, 150, 200, 365]` pay `MILESTONE_XP` (15, 30, 50, 75, 120, 150, 200, 300, 400, 500, 1000).
- **Comeback**: finishing after ≥ 4 days since the last lesson is recorded (`streak.comeback`, the *Back on the Pad* medal). No shame copy.

### 5.2 Reading it
```js
const k = streakInfo(st)            // or useStreak()
// { state, count, best, alive, doneToday, atRisk, restDay, msLeft, hoursLeft, shields, held, max, pending:{shield,grace}, shielded, lostFrom, next:{at,daysTo,xp}|null, shieldIn, lastDone }
```
`state`: `'none'` (never started) · `'done'` (finished today) · `'rest'` (today is a Selah day; the streak rests) · `'at-risk'` (alive, today's lesson to do) · `'lost'`.
`count` is what to show (0 when lost). `shields` is what you'll have *after* any shield a missed day is about to spend; `held` is what's in the bay now; `pending.shield > 0` ⇒ "A shield will hold your streak".
`lostFrom` is the length that ended (for "Streak ended at 12. Day 1 starts now."). `shieldIn` = days until the next shield. `weekStrip(st)` gives the 7-cell HUD strip.

### 5.3 Materialising it
`settleStreak()` writes any pending shield spends / grace days / loss into state **once** and queues `notices` (`[{ id, type:'shield'|'grace'|'lost', date, from? }]`, max 12). Idempotent; returns the events it applied.
**In a browser the store runs it for you** — at boot, whenever the tab becomes visible, and ~1.5 s after each local midnight — so by the time a screen renders, the spend or the loss is already in state with a queued notice. You only *show* `notices(st)` (toast "A shield held your streak" / "Streak ended at 12") and `ackNotices(ids?)` them.
(`finishDay` settles too, so correctness never depends on the timers.)

## 6. XP, rings, ranks

**XP sources** (`XP` constants): correct answer **10** · recycled-question correct **5** · correct answer on an already-finished day (practice) **2**, capped at **20/day** · finishing a new day **+20** · gold card day **+20** · perfect lesson (every check right first try) **+10** · streak milestone (table above) · drop XP (10–30) · chest XP (10–25) · mission objective rewards.

```js
scoreAnswer(true)                           // → 10   (returns the XP so you can fly "+10" to the HUD)
scoreAnswer(true, { retry: true })          // → 5
scoreAnswer(true, { seriesId, day })        // → 2 if that day is already done, else 10
scoreAnswer(true, { seriesId, day, id: ex.id })   // …and counted ONCE per (day, exercise id, first/retry): a duplicate call returns 0
```
**Always pass `id: exercise.id`** — React 18 double-invokes updaters/effects in dev, and a re-render must never pay twice. A wrong first try and its right retry are different answers (`retry:true`), each counted once. The dedupe list lives in today's tally, so it survives a reload mid-lesson and resets at midnight.

**Rings** — `rings(st)` → `[{ id:'lesson'|'xp'|'right', label:'Lesson'|'XP'|'Accuracy', now, goal, value:0..1, done }]`. Goals: 1 lesson · `dailyGoalXp(st)` (20/40/60, chosen in pre-flight) · 3 correct. They reset at local midnight (`todayTally(st)` reads zero for a stale day). `ringsClosed(st)`.
`GOALS = [{ id:'casual', xp:20, mins:3 }, { id:'regular', xp:40, mins:5 }, { id:'serious', xp:60, mins:10 }]`, `setDailyGoal(20|40|60|'serious')`.
`QUESTS` / `questState(st)` — the v5 quest board kept; its XP quest follows the chosen goal.

**Ranks** — `RANKS` (7): `Seeker 0 · Steward 300 · Builder 800 · Keeper 1,400 · Pathfinder 2,250 · Commander 3,500 · Pioneer 5,200`, each with `{ index, id, name, xp, ref }` (a Scripture reference; `RankInsignia rank={index}` takes 0–6).
`rankFor(xp)` → `{ index, id, name, ref, xp (what you passed), floor, ceil, next:{index,id,name,xp}|null, toNext, pct (0..1 in the band), max }`.
Tuning (simulated by the test: 80 % accuracy, opens every chest, ≈ 95 XP/day): Steward ≈ day 4, Builder 9, Keeper 15, Pathfinder 24, Commander 37, Pioneer 54 — every 4–6 days at first, then 9, 13, 17. A flawless August lands on Pathfinder; Pioneer is what finishing both missions earns.
`lifetimeStats(st)` → the Me screen's instruments: `{ xp, rank, lessons, perfect, right, asked, accuracy, best, journal, cards, rare, stagesCleared, missions, medals, medalsTotal, fragments, patches, shieldsUsed, comebacks, daysActive, goalDays, since }`.

## 7. Supply drops & chests

`rollDrop(seed)` → `{ kind:'xp', xp:10|15|20|25|30, rarity:'common'|'rare' } | { kind:'shield', rarity:'rare' } | { kind:'fragment', rarity:'epic' }` — **≈ 60 % / 25 % / 15 %** (xp mean ≈ 17), pure and deterministic.
`finishDay` rolls with the seed `` `${st.salt}|${seriesId}|${day}` `` (`dropSeedFor(st, seriesId, day)`; `salt` is a per-install random string so drops aren't predictable from the calendar) and **persists** the result under `series[id].drops[day]`; a stored drop always wins.
`dropFor(st, seriesId, day)` reads it. A shield drop while holding 2 becomes `{ converted:true, xp:25 }`. A fragment carries `fragment:{ index (0–4), of:5, total, patchReady }`; five fragments assemble a rare patch (`fragmentState(st)` → `{ count, needed, patches, toward, pct }`).
`rollChest(seed)` → `{ kind:'xp', xp:10–25 }` for the daily chest.

## 8. Medals (`ACHIEVEMENTS`, 48)

`ACHIEVEMENTS[i]` = `{ id, title, desc, tier:'bronze'|'silver'|'gold'|'ti', icon (an icons.jsx name), test(st) → boolean, progress(st) → {now,goal}|null }` (`TIERS` lists tiers low→high; `Medal id tier earned` takes the id).
Medals are **derived** from state, so a migrated v5 save earns what it already deserved (marked seen — history, not news).

```js
medals(st)         // [{ …medal (no fns), earned, on:'YYYY-MM-DD'|null, isNew, progress:{now,goal}|null }]  — Locker grid, in display order
earnedMedals(st) · nextMedals(st, 3)       // the 3 unearned medals closest to done (with .ratio) — "next up" shelf
unseenMedals(st) · markSeen(ids?)          // Locker badge / toast queue.  markSeen() with no argument marks all; markSeen([]) does nothing
checkAchievements()                         // re-run the tests now (every write already does); returns newly earned ids
```
Generated from the code (bronze 20 · silver 15 · gold 10 · ti 3):

| id | title | tier | icon | how |
|---|---|---|---|---|
| `preflight` | Pre-flight Complete | bronze | `check` | Finish setup and choose your daily goal. |
| `first-launch` | First Launch | bronze | `rocket` | Finish your first lesson. |
| `perfect-day` | Perfect Day | bronze | `target` | Answer every check right on the first try. |
| `lessons-10` | Ten Launches | bronze | `flag` | Finish 10 lessons. |
| `lessons-25` | Twenty-five Flights | silver | `flag` | Finish 25 lessons. |
| `lessons-50` | Half-century | gold | `flag` | Finish 50 lessons. |
| `streak-3` | Ignition Holding | bronze | `flame` | Reach a 3-day streak. |
| `streak-7` | Seven Days Aloft | silver | `flame` | Reach a 7-day streak. |
| `streak-14` | Two Weeks Strong | silver | `flame` | Reach a 14-day streak. |
| `streak-21` | Habit Forged | gold | `flame` | Reach a 21-day streak. |
| `streak-31` | Full Orbit | gold | `flame` | Reach a 31-day streak. |
| `streak-100` | Centurion | ti | `flame` | Reach a 100-day streak. |
| `early-bird` | Early Bird | bronze | `sparkle` | Finish a lesson before 7:00. |
| `night-owl` | Night Owl | bronze | `moon` | Finish a lesson after 9 pm. |
| `scripture-scholar` | Scripture Scholar | silver | `book` | Finish 10 perfect lessons. |
| `flawless-5` | Flawless Five | gold | `target` | Five perfect lessons in a row. |
| `sharp-100` | Sharpshooter | bronze | `check` | Answer 100 checks correctly. |
| `sharp-250` | Dead Centre | silver | `check` | Answer 250 checks correctly. |
| `first-words` | First Words | bronze | `pen` | Write your first journal entry. |
| `journal-10` | Journal ×10 | silver | `journal` | Write 10 journal entries. |
| `journal-25` | Chronicler | gold | `journal` | Write 25 journal entries. |
| `shield-saver` | Shield Saver | bronze | `shield` | Let a shield save your streak. |
| `fully-shielded` | Fully Shielded | silver | `shield` | Hold two shields at once. |
| `stage-1` | Stage 1 Clear | bronze | `patch` | Clear the first stage of a mission. |
| `stage-2` | Stage 2 Clear | silver | `patch` | Clear the second stage of a mission. |
| `stage-3` | Stage 3 Clear | silver | `patch` | Clear the third stage of a mission. |
| `stage-4` | Stage 4 Clear | gold | `patch` | Clear the fourth stage of a mission. |
| `full-month` | Full Month | gold | `trophy` | Finish every day of a mission. |
| `all-gold` | All Gold | gold | `card` | Collect every gold code card of a mission. |
| `double-mission` | Double Mission | ti | `crown` | Finish every day of two missions. |
| `rare-card` | Gold Foil | silver | `card` | Earn your first gold code card. |
| `collector-10` | Collector | bronze | `card` | Hold 10 code cards. |
| `collector-25` | Curator | silver | `card` | Hold 25 code cards. |
| `xp-500` | First Burn | bronze | `bolt` | Earn 500 XP. |
| `xp-1500` | Climbing Power | silver | `bolt` | Earn 1,500 XP. |
| `xp-3000` | Full Thrust | gold | `bolt` | Earn 3,000 XP. |
| `rank-1` | Rank: Steward | bronze | `star` | Reach the rank of Steward. |
| `rank-3` | Rank: Keeper | silver | `star` | Reach the rank of Keeper. |
| `rank-6` | Rank: Pioneer | ti | `crown` | Reach the rank of Pioneer. |
| `goal-getter` | Goal Getter | silver | `target` | Reach your daily XP goal on 7 days. |
| `relic-found` | Relic Found | bronze | `sparkle` | Find a patch fragment in a supply drop. |
| `patch-assembled` | Patch Assembled | gold | `patch` | Collect 5 fragments to build a rare patch. |
| `comeback` | Back on the Pad | bronze | `refresh` | Return after 3 or more days away. |
| `selah-keeper` | Selah Keeper | bronze | `heart` | Finish 3 Selah days. |
| `crew` | Crew Assembled | bronze | `users` | Add a family member to your crew. |
| `wide-orbit` | Wide Orbit | bronze | `orbit` | Finish a lesson in two different missions. |
| `chest-1` | First Chest | bronze | `chest` | Open a daily chest. |
| `chest-7` | Seven Chests | silver | `chest` | Open 7 daily chests. |

The test plays a thorough player for 128 days and asserts **every** medal is earnable.

## 9. Writing a lesson

```js
setPos(seriesId, day, i)            // resume position; only ever moves forward.  resetPos(seriesId, day) to start over
saveNote(seriesId, day, text)       // the journal answer; blank clears it. Returns medal ids earned.
const xp = scoreAnswer(right, opts) // per answer (see §6)
const r  = finishDay(seriesId, day, lessonXp, { right, asked })   // the lesson ended on its declaration
```
`lessonXp` = the sum of what `scoreAnswer` returned during the lesson. `meta.right` = answers right **on the first try**, `meta.asked` = distinct questions; `meta.perfect` overrides (`right >= asked` by default).
`finishDay` returns **`null`** for an unknown series/day or a live day that hasn't unlocked yet. **Disable your Finish button after the first tap**: a second call returns an `again:true` practice result.
Finishing an already-finished day is a **practice run**: it keeps the day's streak alive but pays no completion bonus, code, drop, or perfect record (`again:true`).

### The result object (everything the Orbit-insertion screen animates from)
```js
{
  seriesId, day, date:'2026-08-12', time:'19:00',
  again,                    // practice run
  first,                    // the very first lesson ever  (→ copy.completionCopy)   firstOfSeries
  right, asked, perfect,
  xp: { lesson, bonus, drop, total,                         // total === lesson + bonus + drop === what the bank grew by
        lines:[{ id:'complete'|'rare'|'perfect'|'milestone'|'shield-overflow', xp }] },   // → copy.ledgerCopy(r.xp)
  streak: { from, to, extended, shieldUsed, graced, shieldEarned:'shield'|'xp'|null, shields, milestone:number|null,
            broke, lostFrom, best, newBest, comeback },
  code: { …codeCard, title (sentence-cased), isNew } | null,            // the card dealt face-down
  drop: { kind:'xp'|'shield'|'fragment', rarity, xp?, converted?, fragment?:{ index, of, total, patchReady } } | null,   // → copy.dropCopy(r.drop)
  rank: { from:rankFor(...), to:rankFor(...), up },                     // both full rankFor objects (→ copy.rankUpCopy(r.rank.to))
  achievements: ['first-launch', …],                                    // new medal ids, in definition order → markSeen(ids) after showing them
  rings: { before:[3], after:[3], closed:['lesson','xp'] },             // "before" = the day as it was when this lesson began
  goal: { xp, goal, met, justMet },
  stage: { index, n, name, title, done, total, cleared, clearedNow },   // clearedNow → award the patch
  month: { done, total, pct, complete, completeNow },                   // completeNow → the full-bleed month-complete moment
  next: { day, unlockAt:Date|null, mode, catchUp },                     // live: tomorrow + its 06:00 (catchUp = your first missed day); archive: the next unfinished day; day:null when done
}
```

### The beat order
`completionBeats(result)` → the ids of the beats that apply, in dramatic order: `xp → rings → streak → shield → milestone → card → drop → rank | rank-up → medals → patch → month → actions`
(small to large, ending on the actions). Skip beats freely; don't reorder them. `copy.completionCopy / ledgerCopy / dropCopy / rankUpCopy / milestoneCopy / monthCompleteCopy` take the matching pieces of the result directly.

## 10. Objectives, chests, collections, profile

**Objectives** (`objectives(st, seriesId)`) re-expresses the v5 quest board as the three rings + a chest, plus mission goals:
```js
{ daily:   { date, rings:[3], closed, chest:{ id:'chest:2026-10-02', state:'locked'|'ready'|'opened', reward:{kind,xp}|null } },
  mission: [{ id:'m:<series>:stage-1'…, kind, title, desc, icon, now, goal, pct, state:'locked'|'ready'|'claimed', reward:{ xp, shield?, fragments? } }] }
```
The chest is `ready` once all three rings are closed; its reward stays a surprise (`reward:null`) until opened. Mission goals: one **Clear Stage N** per stage (40 + 10·N XP), **Halfway** (50), **Sharp Shooter** (3 perfect lessons, 40), **In Your Words** (5 journal entries, 30),
**All Gold** (all gold cards, 60 XP + a fragment), **Orbit** (every day, 150 XP + a shield).
`claimObjective(id)` → `{ id, reward, rank:{from,to,up}, achievements }` or `null` (not claimable / already claimed / yesterday's chest). Rewards feed `copy.rewardCopy(reward)` / `copy.chestCopy(reward)`.

**Heat-map:** `activityByDate(st)` → `{ 'YYYY-MM-DD': { lessons, xp, right, goal } }`. `calendarMonth(st, 2026, 8, { at?, weekStart:1 })` → `{ year, month, label:'August 2026', weeks:[[cell|null ×7]], cells, lessons, activeDays }` with
`cell = { key, day, lessons, xp, level:0..4, flame, goal, save:'shield'|'selah'|null, rest, today, future }` (level scales with your daily goal: any → 1, ≥ goal → 2, ≥ 1.5× → 3, ≥ 2× → 4). `weekStrip(st)` = the last 7 days for the HUD.
**Locker:** `lockerCards(st, seriesId)` → `[{ …code, title, owned, on, stage }]` (`rare` = gold); `unlockedCards(st, id)`. **Patches:** `patchShelf(st)` → every patch of every series `[{ seriesId, seriesTitle, stage, n, name, title, earned, on, done, total }]` (greyscale until `earned`; `MissionPatch series stage state`). **Fragments:** `fragmentState(st)`.
**Share Studio:** `shareData(kind, st, seriesId, day?)` → plain data for `'verse'` (`{ text, ref, title, day, seriesTitle }`), `'card'` (`{ no, day, title, line, rare, stage, owned, on, seriesTitle }`), `'streak'` (`{ count, best, shields, state, strip, rank }`) and `'month'` (`{ seriesTitle, declaration, themeScripture, done, total, pct, complete, cards…, patches, xp, rank, lessons }`); captions come from `copy.shareCaption`.
**Journal:** `journalEntries(st, seriesId?)` → newest first `[{ seriesId, day, text, date, title, ref, prompt }]`; `noteFor(st, id, day)`.

**Profile:** `completeOnboarding({ name, role:'teen'|'parent', familyName, kids:[name|{name}], dailyGoal:20|40|60|'casual'|'regular'|'serious' })` (returns `['preflight']` — the first medal inside a minute),
`updateProfile({ name, role, emoji, familyName, kids, reminderHour, dailyGoal })` (whitelisted), `setDailyGoal(g)`, `addKid(nameOrObj)`, `removeKid(i)`, `resetAll()`.
`usualTime(st)` → `{ hour, min, n }` — the median clock time of your last 14 lessons (null before 3): offer it in the reminder picker ("You usually launch around 7:20 pm").
**One-time marks:** `hasFlag(st, 'tip:shield')` / `setFlag(id, on = true)` for coach marks and "seen this moment" (stored with the date).
**Backup:** `exportProgress()` → a JSON string for a file (Me → Back up progress); `importProgress(text)` → `{ ok:true, xp, streak, lessons } | { ok:false, error:'bad-json'|'not-a-kind-backup' }` replaces this device's progress (confirm first). `NOTE_MAX` = 4000 characters per journal entry.

## 11. State, persistence, testing

`useStore()` → the state (React `useSyncExternalStore`), `snapshot()` outside React, `reload()` re-reads storage (other tabs also sync via the `storage` event).
`useClock(ms)` → a ticking `Date`; `useToday()` → today's key, rolling over at midnight; `useStreak()`; `useLaunch(s)`.

State v6 (`localStorage['kind-app-v4']`, `v: 6`): `salt, name, role, emoji, familyName, kids, onboarded, onboardedAt, dailyGoalXp, reminderHour, xp, streak, best, lastDone, covered, lost, shields, fragments, gems (legacy, frozen),
daily:{date,xp,right,asked,lessons,practice}, log:{date:{lessons,xp,right,goal}}, saves:{date:'shield'|'selah'}, stats:{…counters}, achievements:{id:date}, achSeen:[ids], claims:{id:date}, notices:[…],
series:{ [id]: { done:{day:date}, pos, notes, notesAt, cards:[codeNo], results:{day:{date,time,right,asked,perfect,xp}}, drops:{day:drop} } }`.
**Migration from v5** (`migrate(raw)`, idempotent): nothing is lost; the old save is also kept at `kind-app-v4:pre-v6`; the heat-map log is derived from finished dates (≥ 20 XP/day, a true lower bound); a streak that had run n days gets `min(2, ⌊n/7⌋)` shields; medals are awarded retroactively (and marked seen);
`dailyGoalXp` defaults to 40; bad or partial data (a `{ onboarded, name }` seed, garbage JSON) becomes a valid state.

**Dev tools** (also in the browser console): `__kind.seed('mid')` · `'new'` (not onboarded) · `'fresh'` · `'mid'` (10 evenings of lessons ending *yesterday* → streak at risk) · `'done-today'` · `'veteran'` · `'lost'`; `__kind.reset()`, `__kind.set({ shields: 2 })`, `__kind.snapshot()`.
`demoState(name, { at?, days?, seriesId?, goal?, kids? })` builds the same states purely; `playLessonPure` / `finishPure` / `settlePure` run history on any clock with no storage.
Handy clocks: `?now=2026-08-12` (live, mid-month) · `?now=2026-08-01` · `?now=2026-08-31` · `?now=2026-08-09T21:00` (a Selah evening) · `?now=2026-07-20` (Aug upcoming) · none (archive).
`node tools/test-store.mjs` (all four time zones: Lagos, New York — which changes DST on 1 Nov 2026 — Auckland, UTC; `--once` for the current zone, `--verbose` for names).

## 12. Known limits (honest)
- Content: Aug episode 11's title is cut in the source markdown ("Faithful with Another Person’s…"); `title()` can't recover the missing word.
- `launchBarContext.steps` is an estimate; the Lesson screen owns the true step count and should pass its own `step`/`steps`/`pct` when it has them.
- The 06:00 unlock is local time. copy.js's `waiting` lines currently say "opens at midnight" — they should say "6 am".
- `reportCheckin` still posts lifetime XP in the `gems` column (api.js / the sheet should rename it).
- **Weight:** `lib.js` statically imports `content/library.json` — 187 kB raw / **59 kB gz** (episodes 62+61 kB, shorts 23+15 kB) — into the first chunk. Everything reaches content through `epOf` / `shortFor` / `deckFor`, so a build step that precomputes `title`/`teaser`/`mins` into the calendar and lazy-loads `episodes`/`sundays`/`shorts` per series would let Learn paint from a ~6 kB meta chunk; lib.js would then need an `await ensureContent(series)` gate before `deckFor`.
- The chosen series (`setSeriesId` in the shell) is not persisted by the store; use `prefs` if reloads should remember it.
