# KIND v7 "Ascent" — copy

`src/copy.js` is the app's voice: every sentence that is not Scripture or the day's own content comes out of it.
This file is for the people building screens. It says how to sound, which function to call on which surface,
what to pass in, and what comes back. The self-check lives in `tools/test-copy.mjs` (see §9).

```js
import { launchBarCopy, verdictRight, seq, aria, labels } from '../copy.js'     // named imports only, so unused copy tree-shakes away
```

## 0. Ten rules for a screen builder

1. **Never type a user-facing sentence in a component.** Call `copy.js`. If the sentence you need does not exist, ask for it (REQUESTS), do not invent it.
2. **Never use `Math.random()` for words.** Pass a seed. Same seed, same line: a re-render never changes what the user is reading.
3. **A `Line` has `{ text, ref? }`.** If `ref` is there, `text` is Scripture: set it in Newsreader (italic, balance-wrapped) with the reference in mono small caps beneath. If there is no `ref`, it is plain UI text: Inter, never serif. *Serif is reserved for the Word.*
4. **Functions return plain data, never JSX.** Objects of strings; you choose the type and the layout.
5. **Copy is written in sentence case.** The `Label` component uppercases labels in CSS. Do not uppercase body copy, and **never apply `text-transform: uppercase` to the tagline**: it would turn "goDs" into "GODS". Set `TAGLINE` with `text-transform: none`.
6. **Times are the device clock**, written `8:00 pm`. Pass `zone: zoneTag(now())` and a Lagos clock reads `6:00 am WAT`. Never call `new Date()`; pass `now()`.
7. **A live day opens at 06:00**, not midnight (`lib.UNLOCK_HOUR`). The streak deadline is midnight. Copy says exactly that. Do not paraphrase it.
8. **Every state change is announced.** Verdicts, toasts and the Launch Bar all return an `aria` sentence. Use it.
9. **Use `aria.*` and `labels.*` for names and static labels.** They are spoken, not symbolic ("Next launch in 2 hours 14 minutes", not "T-02:14:09").
10. **Run `node tools/test-copy.mjs` before you report.** It fails on emoji, shouting, shame words and unfilled slots.

## 1. The voice

KIND sounds like a **spaceport with a chapel in it**: exact and quiet on the outside, warm and alive at the centre.
Short declaratives. Reverent, confident, never cute with kids and never clinical with Scripture.

| Do | Don't |
|---|---|
| *Not yet. Here’s the line.* | ~~Oops! Wrong answer.~~ |
| *A shield held your streak.* | ~~Phew! You were saved.~~ |
| *Streak ended at 12. Day 1 starts now.* | ~~You lost your streak. Don’t give up!~~ |
| *Faithful in little.* | ~~Amazing! You’re crushing it!~~ |
| *Day 13 opens at 6:00 am.* | ~~Day 13 unlocks soon.~~ (a time, not a mood) |
| *Nothing leaves this device.* | ~~We take your privacy very seriously.~~ |
| *Add a name to continue.* | ~~Invalid input.~~ |

**Praise comes from the Word, not from a cartoon.** About a third of right-answer lines are short KJV quotations (Matthew 25:21, Luke 16:10,
1 Corinthians 15:58, Proverbs 3:9 …); the rest are one or two spare words. **Wrong answers never shame.** The head is "Not yet", the body is the line.
**Loss is never punished.** A broken streak says what happened and where the new count starts. A long absence reads as a welcome back.

**Rules the self-check enforces:** no emoji · no `!!` · a single `!` only on genuine milestones (7, 100, 365 days, the top rank, month complete — the cap is 8 in the whole file) ·
no ALL-CAPS body copy · no "Oops", "sorry", "wrong", "incorrect", "fail", "awesome", "amazing" and friends · no straight quotes (use ’ “ ” — …) ·
no `...` (use …) · no hyphen used as a dash (use —) · British/Nigerian spelling (*labour, colour, honour, centre, programme, judgement*) · no "1 days" ·
`{name}` only ever after ", " so it drops out cleanly when there is no name.

**Launch vocabulary, lightly** (never at the cost of clarity for a 12-year-old; `glossary` has the plain-words version for the Me sheet):
mission = the month-long series · stage = a week · launch = start a lesson · ignition = a lesson opens · orbit insertion = a day completed ·
orbit reached = a mission completed · pad = home · Selah = the weekly day of rest and review · supply drop = the surprise after a lesson.

**Numbers and dates:** `Day 12`, `12 / 31`, `+40 XP`, `1,240 XP`, `T-02:14:09`, `Wed 12 Aug`, `~6 min`. All built by the formatters in §6.

**Nigerian English and WAT.** "Good evening" holds until bedtime; "Good night" is a farewell, so it only appears after midnight. "Happy new week" on Mondays,
"Happy Sunday", "Happy Friday". "Data" means mobile data ("works without data"). Times are 12-hour with a lowercase am/pm.

## 2. Plumbing

```js
pick(list, seed)           // the same seed always gives the same entry. seed: string | number | seq(key, i)
seq(key, i)                // sequence seed: successive i walk the list in a seeded shuffled order, never repeating inside one cycle
seedOf(...parts)           // seedOf(series.id, day, 'bar') -> 'stewardship-code|12|bar'
hash(str)                  // 32-bit FNV-1a + murmur finaliser (stable across engines)
plain(line)                // “text” — ref (KJV), for a clipboard or an aria-label
```

**What to seed with.** A verdict in a lesson: `seq(`${series.id}:${day}`, exerciseIndex)` so no two verdicts in a row are the same line.
A Launch Bar line that should change daily but never flicker: `seed: today()`. A completion moment: `seed: `${series.id}:${day}``.
Anything shown once per install (milestones, rank-ups): the default `''` is fine.

**Return shapes you will meet**

| Shape | Fields | Where |
|---|---|---|
| **Line** | `{ text, ref? }` | `praise`, `streakLostCopy`, `completionCopy().text` |
| **Verdict** | `{ tone:'go'\|'nogo', status:'Go'\|'No-go', head:'Correct'\|'Not yet', text, ref?, note?, cta, aria }` | `verdictRight`, `verdictWrong` |
| **Moment** | `{ eyebrow, title, text, word:Line, cta, shareCta?, aria, … }` | `milestoneCopy`, `rankUpCopy`, `completionCopy`, `monthCompleteCopy`, `dropCopy`, `chestCopy` |
| **Bar** | `{ state, eyebrow, title, meta, sub, note, readout, cta, ctaAria, tone, disabled, aria }` | `launchBarCopy` |
| **Toast spec** | `{ title, body?, icon (an Icon name), tone, key?, action?:{ label }, duration? }` | `toastCopy`, `noticeCopy` |
| **Empty spec** | `{ kind, art (an Icon name), title, body, action (label or ''), word? (a Line) }` | `emptyCopy` (journal, medals, kids, heatmap and allClear carry a verse), `errorCopy` (adds `icon`, `tone`) |
| **string** | functions that can never carry Scripture return a plain string | `greeting`, `streakLine`, `shieldLine`, `lockedCopy`, `slideLabel`, `answerLabel`, `nextMilestoneCopy`, `rewardCopy`, `rankLine` |

Slots in the pools are `{name} {n} {day} {at} …`. A pool entry whose slots the context cannot fill is skipped, never printed with a hole in it.

## 3. The inventory, by surface

Counts are variants in the pool (rule: **6+** for anything seen daily, **3+** for rare moments). `node tools/test-copy.mjs --inventory` prints the live table.

### 3.1 Ignition and the Ascent (Learn)

| Call | Context in | Returns | Notes |
|---|---|---|---|
| `greeting(name, hour, seed?, { weekday, date, zone }?)` | `hour` from `now().getHours()`; `weekday` from `now().getDay()`; `date: now()` and `zone: zoneTag(now())` for the calendar | string | 5 times of day × 6–7 lines; Sun/Mon/Fri/Sat lines about 45 % of the time; and the Nigerian calendar about two greetings in three on the day: New Year, **Children’s Day (27 May)**, **Independence Day (1 Oct, on a WAT clock)**, Christmas, Good Friday, Easter, Easter Monday (`seasonOf(date, zone)` names it). `greeting('', 7)` drops the name cleanly. |
| `launchBarCopy(ctx)` | see §4.1 | Bar | 11 states: `ready` (9 + 9 for parents) · `progress` (7) · `waiting`/`done` (9, plus 4 under an hour) · `locked` (6) · `archive` (6) · `missed` (6 shield / 6 lost / 6 away) · `atRisk` (9) · `first` (6) · `selah` (6) · `upcoming` · `complete` · plus finale and intro lines |
| `catchUpCopy({ catchUp, behind, title })` | the store's `catchUp`, `behind` | `{ eyebrow, title, sub, cta, ctaAria }` | The chip for live days behind you that are still open (8 lines). |
| `lockedCopy({ day, unlockAt, zone, seed })` | `unlockAt` from `lib.nextUnlockAt` | string | "Not yet. Day 14 opens Fri 14 Aug at 6:00 am." (9). Toast it when a locked node is tapped. |
| `streakStatus(streakInfo(st, now()), seed)` | the store's `streakInfo` | `{ title, sub, note, tone, aria }` | The flame sheet. `title` "8 days", `sub` what to do, `note` the next milestone. |
| `streakLine(n, seed)` | `n` | string | 13 tiers (0, 1, 2, 3*, 4–6, 7*, 8–13, 14*, 15–20, 21*, 22–30, 31*, 32+). "7 days. Ignition holding." |
| `nextMilestoneCopy(streakInfo.next)` | `{ at, daysTo, xp }` | string | "6 days to the 14-day mark. +50 XP." |
| `shieldLine(kind, { n }, seed)` | kind: `used` `earned` `drop` `max` `overflow` `low` `none` `cover` `next` | string | "A shield held your streak." `next` takes `{ n }` days to go. |
| `noticeCopy(event, { n }, seed)` | one of the store's notices `{ type:'grace'\|'shield'\|'lost', from? }` | Toast spec | Boot-time streak notices. The lost line is plain (a toast cannot carry a reference). |
| `labels.tabs / hud / learn`, `aria.day / stage / streak / xp / shields` | | strings | Dock and HUD names. |

### 3.2 The lesson (flight sequence)

| Call | Returns | Notes |
|---|---|---|
| `slideLabel(kind, { i, n })` | string | Mono eyebrow: `verse` "The Word", `truth` "The one thing", `point` "Truth 2 of 3", `illustration` "Picture this", `challenge` "Your move today", `ask` "Your answer", `askKids` "Ask your children", `prayer` "Pray", `declaration` "Say it out loud", … (see `lessonCopy.slide`). |
| `lessonCopy.cta` | `{ next, check, prayer:'Amen', declare:'I declare it', finish:'Complete lesson', start, gotIt }` | Button labels. |
| `lessonCopy.close` | `{ title, body, confirm, cancel, aria }` | The "Leave this lesson?" dialog. Your place is saved. |
| `lessonCopy.exercise[type]` / `checkHint(type)` | string | The instruction ("Fill the gap.") and why CHECK is disabled ("Choose a word to fill the gap."), also its accessible description. |
| `lessonCopy.keys` | string | "Press 1 to 4 to choose, Enter to check, Escape to close." |
| `lessonCopy.declare` / `.pray` / `.journal` / `.journalHelp` | pools / strings | Hints under the last slides; `journalPlaceholder(seed)` picks a placeholder (7). |
| `launchSequence` | `['All systems go','Ignition','Liftoff']` | The three beats while the lesson rises. |
| `flightCallout(0..1)` | string | Mono caption beside `T+02:10`: Liftoff · Climbing · Halfway · Final stretch · Orbit insertion. |
| `verdictRight(ex, series, seed, { combo, recycled })` | Verdict | `ex` is the quiz exercise (`type`, `source` pick the flavour); the series' own `themeScripture` joins the pool. Combos of 3, 5, 8, 12, 20 get a combo line. Pool: 25 general (9 are Scripture) plus theme, source and type lines. |
| `verdictWrong(ex, seed, { recycled })` | Verdict | Head "Not yet", status "No-go". First miss adds `note` ("This one comes back at the end."); a second showing (`recycled`) gets a gentler pool and no note. |
| `answerLabel(ex)` | string | "The answer" · "The missing word" · "The line reads" · "The pairs" · "The truth". The label above `gradeExercise().answerText`. |
| `praise({ kind, seed, day, goal, ring, n, name })` | Line | kind: `answer` `combo` `recycled` `lesson` `perfect` `recovered` `first` `late` `early` `practice` `leader` `selah` `return` `goal` `ring`. |

A verdict sheet shows **the LED, the icon, `status` and `head` together** (never colour alone), announces `aria` in a `role="status"` (go) or `role="alert"` (no-go) region,
and styles its CONTINUE to match `tone`.

### 3.3 Orbit insertion (completion) and the moments

| Call | Context in | Returns | Notes |
|---|---|---|---|
| `completionCopy({ day, kind, first, perfect, recovered, again, comeback, hour, role, series, seed })` | from the store's `finishDay` result (§4.3) | Moment | eyebrow "Orbit insertion" (or "Selah kept", "Practice complete"), title "Day 12 complete", `text` a Line. Picks `again` (practice) › `first` › `perfect` › `recovered` › `comeback` › `selah` › `leader` (parents) › `lesson`; a late (after 9 pm) or early (before 7 am) finish is acknowledged about half the time; a theme line from the series about a third of the time. |
| `ledgerCopy(result.xp)` | `{ lesson, lines:[{ id, xp }], drop, total }` | `[{ id, label, value }]` | The XP breakdown ending in `Total`. |
| `dropCopy(result.drop, seed)` | `{ kind:'xp'\|'shield'\|'fragment', xp, converted? }` | Moment-lite `{ eyebrow:'Supply drop', title, text, aria }` | A shield that converts to XP at the cap says so. `dropChrome` has "Tap to open." |
| `chestCopy({ xp }, seed)` · `rewardCopy({ xp, shield, fragments })` | | Moment-lite · string | "+25 XP" · "+150 XP · Shield · Patch fragment" |
| `milestoneCopy(n, { shield, xp, seed })` | n in `MILESTONES` = 3 7 14 21 31 50 75 100 150 200 365 (mirrors the store) | Moment or `null` | `bonus` when a shield came with it, `reward` ("+30 XP") when you pass `xp`. Three title/text pairs per milestone and one Scripture each. |
| `streakLostCopy(prev, seed)` | `prev` = the streak that ended | Line | "Streak ended at 12. Day 1 starts now." |
| `rankUpCopy(rankFor(xp), seed)` | the store's `{ index, id, name }` | Moment | Written per rank id (seeker, steward, builder, keeper, pathfinder, commander, pioneer), each with the verse the store assigned it; falls back to a seven-rung ladder if ranks are ever renamed. |
| `monthCompleteCopy(series, { days, seed })` | the library series | Moment | Carries the series' `themeScripture` as `word` and its `declaration` lines. |
| `stageClearCopy(result.stage, series, seed)` | `result.stage.clearedNow` | Moment | eyebrow "Stage 2 clear", title "Patch earned", plus a verse about that stage's theme (Ownership: Psalm 24:1 · Faithfulness: Luke 16:10 · Mastery: Luke 16:13 · Multiplication: Luke 19:13 · Foundation: Genesis 2:7 · Faith: Hebrews 10:38 · Focus: Romans 12:2 · Fitness: 1 Corinthians 6:19 · Finishing: 2 Timothy 4:7). |
| `nextUpCopy({ day, title, unlockAt, now, zone }, seed)` | `result.next` (live mode only) | `{ eyebrow, title, sub, when, aria }` | The hook at the end of a day: "Next up: Plan before you spend." and "Opens tomorrow at 6:00 am WAT". |
| `rankLine(rankFor(xp))` | | string | "Steward · 1,240 XP to Builder" · "Pioneer. The top rank." |
| `ringCopy({ id, now, goal })` | the store's ring | `{ label, sub, aria, done }` | `lesson`, `xp`, `right` (Accuracy). |
| `objectives.*` | | strings / functions | Daily and mission objective names, chest states. |

### 3.4 Locker, Journal, empty states

`emptyCopy(kind, seed)` → `{ art, title, body, action }`, three variants each, art is an `Icon` name for `<Empty art=…>`.
kinds: `journal` `cards` `patches` `medals` `kids` `heatmap` `shortsOffline` `shortsNone` `allClear` `journalDay`.
`labels.locker` has the tab names, "Unlocks with Day 8", "Clear Stage 2 to earn this patch." `aria.card / patch / medal / heat` name each cell.
Medal titles and descriptions belong to the store (`ACHIEVEMENTS`); the self-check lints them and reports anything that breaks the voice.

### 3.5 Pre-flight (onboarding) and the daily commitment

`onboardCopy` is a plain object: `splash` · `pad` (beat 1, the tagline, with `word`: Psalm 19:1, "The heavens declare the glory of God.") · `crew` (beat 2, "Who’s flying?") · `name` (beat 3) · `kids` (parents) · `goal` (beat 4) ·
`remind` (beat 5) · `finish.launching(day)` · `progress(i)` → "Step 2 of 5" · `chrome`.
`GOALS` (Casual 3 min / 20 XP · Regular 5 / 40 · Serious 10 / 60, mirrors the store) and `goalCopy(xp)` → `{ label, mins, xp, blurb, meta:'5 min a day · 40 XP' }`.
The commitment copy is the commitment device: *"Pick what you will actually keep. Small and kept beats big and dropped."*

### 3.6 Reminders (.ics)

`reminderCopy({ name, hour, min, url, zone, seed })` → `{ title:'KIND · Today’s launch is ready.', body, alarm, confirm }`. Pass `title`/`body` straight to
`makeReminderICS` (it owns the escaping of commas and newlines). The event is recurring, so title and body are fixed when it is created.
`reminderPresets` (Before school 6:30 am · After school 4:00 pm · Evening 8:00 pm · Before bed 9:30 pm), `DEFAULT_REMINDER`, `reminderChrome` (button labels and help).

### 3.7 Share captions

`shareCaption(kind, data, seed)` → `{ title, text, url, tags, alt, full }`. `full` is `text` + the url, ready for the clipboard; use `title/text/url` for `navigator.share`; `alt` is the image alt for the share card.

| kind | data | Example |
|---|---|---|
| `verse` | `{ verse:{ text, ref }, day, series, url }` | *Held on to this today.* + the verse + "Day 12 of The Stewardship Code on KIND." |
| `card` | `{ code:{ no, line, rare }, total, day, series }` | *Gold. Earned, not given.* + the line + "Code 7 of 26 · Gold" |
| `streak` | `{ n, url }` | *12 days. One lesson a day, no day off the Word.* + the tagline |
| `month` | `{ series, days, declaration }` | *Orbit reached. 31 days of The Stewardship Code, done.* |
| `rank` | `{ rank }` | *Rank up: Steward. One lesson at a time.* |
| `invite` | `{ url }` | *Want to build the habit together? KIND is free and works offline:* |

### 3.8 Me, settings, privacy

`settingsHelp.{ sound, volume, haptics, effects, textSize, reminder, goal, role, name, family, missions, install, about, privacy, reset, help }` — each `{ label, help, … }`.
`settingsHelp.privacy.line` is the line the design asks for: **"Nothing leaves this device."** (with `detail` and an honest `warn`: clearing browser data erases progress).
`settingsHelp.reset` has the confirm dialog. `glossary` is the plain-words list (14 terms) for "What do these words mean?". `labels.me` has the Pilot card strings.

### 3.9 Toasts

`toastCopy(id, ctx, seed)` returns a spec you can spread into `toast()`; add your own `onClick` to `action`. All titles ≤ 90 chars and bodies ≤ 140 (checked).

```js
const t = toastCopy('shieldUsed', { n: 12 }, seed)
toast({ ...t, action: t.action && { ...t.action, onClick: undo } })
```

Ids (`toastIds()`): `soundOn` `soundOff` `hapticsOn` `hapticsOff` `journalSaved` `copied` `copiedLink` `copiedCaption` `calendarReady` `reminderSet` `xp` `goalReached`
`ringClosed` `shieldEarned` `shieldUsed` `medalEarned` `cardEarned` `patchEarned` `rankUp` `locked` `chestOpened` `objectiveClaimed` `offline` `online` `updateReady`
`updated` `installed` `installLater` `nameSaved` `kidAdded` `kidRemoved` `goalSet` `welcomeBack` `fxLite` `placeSaved` `selahSafe` `reset`.
Context keys: `amount` `goal` `ring` `no` `stage` `name` `rank` `title` `day` `unlockAt` `zone` `hour` `min` `xp` `reward`.
`soundOn` carries the "Mute" action the design asks for on the very first sound.

### 3.10 Errors, install, accessibility

`errorCopy(kind, seed)` → `{ kind, title, body, action, icon, tone }`, calm, plain, no blame, three variants each:
`offline` `load` `share` `copy` `ics` `storage` `video` `update` `notFound` `notPublished` `generic`. `offline` is `tone:'default'`; the rest are `'nogo'`.
`storage` is the important one: private browsing means the streak cannot be kept, and it says so.

`installCopy(platform, seed)` → `{ title, body, steps:[{ icon, text }], cta, dismiss, success, note }`, platform `ios` `android` `desktop` `inapp` `standalone`.
**iOS: "Tap the Share button … Scroll down and tap Add to Home Screen. Tap Add."** The prompt card has four title/body variants and is shown after the first completed lesson.
`inapp` covers links opened inside another app's browser, which cannot install.

`aria.*` (spoken sentences): `day` `stage` `streak` `xp` `shields` `ring` `option` `step` `countdown` `launch` `tab` `rank` `card` `patch` `medal` `heat` `sheet` `verdict` `close` `grabber` `skip` `sound` `progress`.
`labels.*`: `app` `tabs` `hud` `stats` `learn` `objectives` `locker` `shorts` `me` `links` `rotate` (the portrait message) `verbs` `state`.

**First-run coach marks:** `coach.{ launch, streak, shield, rings, chest, stage, locker, shorts }` → `{ title, body }`, each a title and one or two short sentences. Show once, anchored to the thing they describe.
`missionMeta({ month, year, audience, done, total })` → "August 2026 · Teens & families · 8 of 31 done".

## 4. Wiring to the store

### 4.1 `launchState` → `launchBarCopy`

```js
const ls = launchState(series, st, now())
const info = streakInfo(st, now())
const ready = ls.state === 'ready'
const missed = ready && (info.pending.shield > 0 || info.state === 'lost')
launchBarCopy({
  ...ls,                                   // state, day, title, mins, countdown, unlockAt, next, streak, shields, hoursLeft, done/total …
  zone: zoneTag(now()), seed: today(),
  role: st.role,                           // 'parent' gets the family lines
  // the states the store does not name:
  state: missed ? 'missed' : ready && ls.atRisk && now().getHours() >= 21 ? 'atRisk' : ls.state,
  shieldUsed: info.shielded, gapDays: daysSince(st.lastDone),
  countdown: ready ? info.msLeft : ls.countdown,    // ready/atRisk: time to midnight; done/locked/upcoming: time to the unlock
})
```

| Store `state` | Bar state | Reads as |
|---|---|---|
| `ready` | `ready` (or `first` when nothing is done yet, `selah`/`intro`/`celebration` via `kind`) | "Day 12 · Cleared for launch" |
| `ready` after 9 pm with the streak alive | `atRisk` | "Streak at risk · 6-day streak · T-03:00:00" |
| `ready` after a shield or lost streak | `missed` (+ `gapDays >= 3` for a long absence) | "Back on the pad" / "Welcome back" |
| `done` | `waiting` | "Next launch · T-02:14:09 · Day 13 opens at 6:00 am WAT" |
| `locked` | `locked` | button disabled: "Opens at 6:00 am WAT" |
| `upcoming` · `archive` · `complete` | same | |

### 4.2 `streakInfo` → `streakStatus` · notices → `noticeCopy` · `rankFor` → `rankLine`

`streakStatus(info)` reads `state` (`none` `done` `rest` `at-risk` `lost`), `count`, `hoursLeft`, `lostFrom`, `next`.
The store's notices (`{ type:'grace'|'shield'|'lost' }`) go through `noticeCopy`.

### 4.3 `finishDay` result → the completion screen

```js
const r = finishDay(series.id, day, lessonXp, { right, asked })
completionCopy({ day, first: r.first, perfect: r.perfect, recovered: r.asked > r.right && !r.perfect, again: r.again,
                 comeback: r.streak.comeback, hour: now().getHours(), kind: dayType, role: st.role, series, seed })
ledgerCopy(r.xp)                                        // the breakdown
r.drop && dropCopy(r.drop, seed)                        // supply drop
r.streak.milestone && milestoneCopy(r.streak.milestone, { shield: r.streak.shieldEarned === 'shield',
                          xp: r.xp.lines.find((l) => l.id === 'milestone')?.xp })
r.rank.up && rankUpCopy(r.rank.to, seed)
r.month.completeNow && monthCompleteCopy(series, { days: r.month.total })
r.streak.shieldUsed && shieldLine('used', { n: r.streak.to }, seed)
r.streak.broke && streakLostCopy(r.streak.lostFrom, seed)
```

`tools/test-copy.mjs` runs exactly this against a simulated 31-day run of both series, so a change in either side breaks the test, not the screen.

## 5. Scripture

`WORD` is the bank (66 short KJV quotations, each `{ text, ref }`); every `Line` in a pool is one of them.
They are drawn from the series themes and the app's own words: faithfulness (Matthew 25:21, Luke 16:10, Luke 19:17, 1 Corinthians 4:2, Proverbs 28:20), labour and diligence
(Colossians 3:23, Ecclesiastes 9:10, Proverbs 13:11, 21:5, 22:29), stewardship and ownership (Psalm 24:1, 1 Chronicles 29:14, Proverbs 3:9, Romans 14:12),
getting up again (Proverbs 24:16, Micah 7:8, Lamentations 3:23), finishing (Galatians 6:9, 1 Corinthians 15:58, 2 Timothy 4:7, Hebrews 12:1, Philippians 3:14)
and one verse for each of the seven ranks. **Every quotation has been checked word for word against the KJV**: 30 against the library's own text on every run
and all 63 references online with `node tools/test-copy.mjs --verify-kjv` (bible-api.com, about two minutes). Quotations are fragments where that is the honest length;
references are written `Matthew 25:21` and the translation (`BIBLE_VERSION`, "KJV") is shown once in About and on share cards.

## 6. Formatters (all pure; pass dates in)

| | | |
|---|---|---|
| `fmtNum(1240)` | `1,240` | `xpDelta(40)` → `+40 XP` · `xpTotal(1240)` → `1,240 XP` |
| `fmtDate(d)` | `Wed 12 Aug` | `fmtDateLong(d)` → `Wednesday 12 August` |
| `fmtClock(20, 0, { zone })` | `8:00 pm` / `8:00 pm WAT` | `zoneTag(date)` → `'WAT'` on a UTC+1 device, else `''` |
| `tMinus(ms)` | `T-02:14:09` (`T-4d 04:01` past 100 h) | `tPlus(ms)` → `T+08:30` |
| `wordsDuration(ms)` | `2 hours 14 minutes` | `timeLeft(hours)` → `3 hours` · `an hour` · `30 minutes` (write "About {left} left") |
| `minsLabel(6)` | `~6 min` | `minsWords(6)` → `about 6 minutes` |
| `dayTag(12, 31)` | `Day 12 / 31` | `stageTag(2)` → `Stage 02` · `daysWord(12)` → `12 days` |
| `partOfDay(h)` | `night` `morning` `afternoon` `evening` `late` | |

## 7. Cost

Import only what you use: unused copy is tree-shaken (measured with esbuild, minified + gzip):
greeting alone 1.6 kB · Launch Bar 5.0 kB · verdicts 3.9 kB · the whole lesson set 9.1 kB · the Learn shell set (greeting, bar, labels, aria, locked, status) 8.1 kB · toasts 5.3 kB · everything 25.1 kB.
`copy.js` is one module, so the union of what the whole app imports is what ships. If the 170 kB budget gets tight, the heavy, rarely-needed parts
(onboarding, settings, glossary, install, errors, share) can move to a lazily loaded sibling file; that is a REQUEST, not something to do ad hoc.
Initialisers in `copy.js` are literals and identifier references only, so every bundler can shed what is unused. Keep it that way when you add strings.

## 8. Adding a string

1. Find the surface in §3. If a pool exists, add to it (6+ for daily moments, 3+ for rare ones). A new moment gets a new pool.
2. Write it in the voice (§1): sentence case, one idea, a full stop. Slots in `{braces}`; `{name}` only after ", ".
3. Scripture goes in `WORD` first (`const W_key = { text, ref }`, then the `WORD` map), then is referenced by identifier in the pool.
4. Register the pool in `POOLS` (the test walks it) and, if it is a new function, add a call to the test matrix (full context, minimal context, and `n = 1` where plurals matter).
5. `node tools/test-copy.mjs`. For Scripture also `--verify-kjv`.

## 9. The self-check

```
node tools/test-copy.mjs                 # every check, exit 1 on any failure (about a second)
node tools/test-copy.mjs --inventory     # also prints the pool table as markdown
node tools/test-copy.mjs --verify-kjv    # also fetches every quotation from bible-api.com and compares it to the KJV
```

It checks: emoji and symbols · `!!` · `!` outside milestones (and a cap of 8) · ALL-CAPS body strings · banned and shaming words · emoticons · American spellings ·
straight quotes, `...`, hyphen-as-dash, double or stray spaces · leaked `undefined`/`NaN`/`[object` · "1 days" · unknown slots, `{name}` placement ·
sentence start and end · pool sizes (6+ / 3+) · duplicates inside a pool and across the file · every string ≤ 140 chars (≤ 220 for static help text) ·
toast titles ≤ 90 and bodies ≤ 140 · determinism, variety and no-repeat sequences · the hash spread · the formatters · every public function with full, minimal and empty contexts ·
8,900+ rendered strings · Scripture against the library and (optionally) the KJV · **and the store**: `MILESTONES`, `UNLOCK_HOUR` and `GOALS` match, every rank id has copy,
a simulated 31-day run of both missions is read through the copy, and the store's own strings (medals, quests, ranks) and the library's day titles are linted and reported as notes for their owners.

## 10. Known gaps

- One voice, one language. Everything is in one module on purpose, so a Pidgin or a Yoruba/Hausa/Igbo pass is a second set of pools, not a rewrite.
- `bar.selah` and the milestone copy assume the August/July calendars (Selah on Sundays); a future series with a different rest rhythm would want its own lines.
- Copy cannot see the user's real timezone rules beyond the device clock: "6:00 am" is the device's 06:00, and `WAT` is shown only when the device is on UTC+1.
