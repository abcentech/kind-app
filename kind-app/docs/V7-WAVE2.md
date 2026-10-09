# KIND v7 — Wave 2 build contract (screens, split into small modules)

Read `V7-DESIGN.md` (art direction), `V7-CONTRACT.md` (rules of engagement §0, module APIs §3, verification §5), `STORE-API.md`, `COPY.md`.
**This file overrides the contract where they differ** — it splits every screen into small modules so ~30 specialists can build in
parallel, each against a fixed interface. The foundations (tokens, base, icons, sound, fx, UI kit, art, brand, store, quiz, copy, PWA) are DONE
and importable: `src/ui/index.js`, `src/art/index.js`, `src/icons.jsx`, `src/fx/*.js`, `src/store.js`, `src/lib.js`, `src/quiz.js`, `src/copy.js`, `src/prefs.js`, `src/now.js`.
Use them; never re-implement a primitive that exists. If one is missing or buggy, put it in REQUESTS and work around it locally.

## 0. Lean-run rules (the previous run hit the usage limit — these are not optional)

* **Tool-call budget ≈ 60.** Plan, then build. No exploratory wandering. Never run filesystem-wide `find`/`grep` (only inside `src/`, `docs/`, `playground/`).
* **Screenshots ≤ 8 total.** Open with `open({ dpr: 2 })` (not 3); crop or `clip` to the area you are checking; never a full-page image taller than ~2500 px.
  Verify behaviour with `page.evaluate` (DOM text, computed style, bounding boxes, `document.querySelector(...).getBoundingClientRect()`), not by eyeballing every state.
  Spend your screenshots on the 2-3 states that matter most (the hero state, the narrowest 360x640, one edge case).
* **Do not re-read large files twice.** Read docs once at the start (skim `COPY.md`/`STORE-API.md` for the functions you need only). Read the source of the UI-kit components you use (their header comments are the API).
* If the shell rejects a command (heredoc/quote problems), write the script to a file with the Write tool and run that.
* Stop when done. One build pass, one honest self-review pass, report. No endless polishing — a separate polish wave follows.

## 1. Environment

Working dir `C:/Users/ADMIN/Documents/KIN/KIND/Monthly Devotional/kind-app`. Dev server: **http://localhost:5183** (already running). Build in `playground/<id>.{html,jsx}`
(copy `playground/_template.html`; use `mountScreen(node, opts)` from `playground/_shell.jsx` for whole screens, `mount()` from `_boot.jsx` for isolated modules).
Seed state with `open({ state })` from `tools/browser.mjs` (the store migrates it); fake the date with `?now=2026-08-12` (live, mid-August), `?now=2026-08-01`, `?now=2026-08-31`, none = archive (today 8 Oct 2026); both series: `?series=secrets-of-longevity`.
**Every module you own has its own stylesheet** (listed below, already imported by `src/styles/index.css`): wrap rules in `@layer screen { }`, prefix classes as given, tokens only, no `!important`, nothing global.
Navigation/context: `const { s, openDay, goTab, share, mode } = useShell()` (src/shell.jsx). Progress: `useStore()` + the verbs in STORE-API.md. Copy: import from `src/copy.js`, never hard-code UI strings that copy.js already owns.
Everything must degrade under `html[data-fx="lite"]`/reduced motion, work at 360x640 → 820x1180 + the desktop frame, and be accessible (names, roles, focus ring, 48 px targets, `aria-live` for verdicts/changes).

## 2. Module map (owner = the role id in the brief; you own ONLY your files)

Stubs already exist for every file below so cross-imports resolve; overwrite your own stubs.

### learn
| role | files | css (prefix) |
|---|---|---|
| `learn-path` | `screens/Learn.jsx`, `screens/learn/{Path,Node,StageDivider,Sky,ArchiveBanner}.jsx` | `learn.css` (`.learn-`) |
| `learn-hud` | `screens/Hud.jsx`, `screens/hud/*.jsx` (sheets: StreakSheet, XpSheet, ShieldSheet, MissionSheet) | `hud.css` (`.hud-`) |
| `learn-launch` | `screens/LaunchBar.jsx`, `screens/launch/*.jsx` | `launchbar.css` (`.launch-`) |
`Learn.jsx` renders `<LaunchBar />` (pinned above the dock; sets `--launch-h`, default 148px) and its scroller reserves `padding-bottom: calc(var(--launch-h) + var(--dock-h) + var(--sab) + var(--s-6))`.
`Hud` (`<Hud s />`) is rendered by App on every tab above all screens (`.shell-screen` already pads `var(--hud-h)` for it); it must be a fixed glass bar `z-index: var(--z-hud)`.

### lesson (the flight sequence)
| role | files | css |
|---|---|---|
| `lesson-shell` | `screens/Lesson.jsx`, `screens/lesson/{Slide,steps}.jsx`, `screens/lesson/slides/index.js` | `lesson.css` (`.lesson-`) |
| `slides-read` | `slides/{Open,Watch,Read,Truth,Point,Quote}.jsx` | `slides.css` (`.slr-`) |
| `slides-word` | `slides/{Verse,Do,Ask,Pray}.jsx` | `slides-word.css` (`.slw-`) |
| `slides-declare` | `slides/Declare.jsx`, `lesson/HoldToDeclare.jsx` | `declare.css` (`.sld-`) |
(all `slides/*` are under `src/screens/lesson/slides/`)
**Slide contract** — every slide file default-exports `function SlideX({ card, s, day, seriesId, scale, active, next, back, setFooter, share })`:
`card` = a `deckFor()` card (docs STORE-API §4); `scale` = reading scale 0.9–1.3 (apply via `font-size: calc(1em * var(--read-scale, 1))`, the shell sets `--read-scale`);
`active` = it is the visible slide (start/stop animations); `next()`/`back()` advance; `setFooter({ label?, disabled?, hidden?, tone? })` overrides the shell's CONTINUE button for this slide
(reset automatically on slide change; `declare` uses it to show `FINISH`); `share({ kind:'verse', data:{ text, ref } })` opens the Share Studio.
A slide fills a flex column `.lesson-slide` (shell-provided, scrolls with a fade mask, safe padding) — render your content as the child; do not render the footer, header or progress. One thought per slide, typographic, Newsreader for the Word.
`lesson-shell` owns: steps = deck leaves (minus declare) + `quizFor` exercises + declare last; resume (`setPos`); header (close + `SegmentBar` + mono counter); footer; swipe/keys; the close `Dialog`; entry animation; `finishDay` → `<Complete s day result onClose />`; the `ExerciseStep` hand-off; replay-in-review behaviour.

### exercises (Go / No-Go)
| role | files | css |
|---|---|---|
| `ex-step` | `screens/lesson/Exercises.jsx` (exports `ExerciseStep`, default), `lesson/ex/{Verdict,index}.jsx|js` | `exercises.css` (`.ex-`) |
| `ex-choice` | `lesson/ex/{Choice,TrueFalse,Plate}.jsx` | `ex-choice.css` (`.exc-`) |
| `ex-blank-order` | `lesson/ex/{Blank,Order}.jsx` | `ex-blank.css` (`.exb-`) |
| `ex-match` | `lesson/ex/Match.jsx` | `ex-match.css` (`.exm-`) |
**`ExerciseStep` props**: `{ ex, isRetry, onGraded({ right, response, answerText, retry }), onNext() }` — full-height step owning its footer (CHECK → verdict sheet → CONTINUE). Calls `onGraded` once at CHECK, `onNext` at CONTINUE; uses `gradeExercise`, `verdictRight/verdictWrong`, sound/haptic/fx.
**Renderer contract** — each `ex/<Type>.jsx` default-exports `function View({ ex, value, onChange, locked, graded, onSubmit })` (`locked` after CHECK; `graded` = `{ right, answerText }|null` for painting right/wrong; `onSubmit()` = Enter key / "check" shortcut), and named-exports nothing else. Response shapes + helpers (`emptyResponse, isAnswerComplete, toggleWord, pairUp, unpair`) are in `src/quiz.js` (read its exported helpers + `docs/QUIZ-API.md` if present). `ex/index.js` maps `type → View`. Keys: 1–4 select, Enter check/continue, Backspace undo (order). `Plate` (ex-choice) is the shared chamfered answer plate (`{ keycap, state:'rest'|'selected'|'right'|'wrong'|'dim', onClick, children }`) — others may import it.

### complete (orbit insertion)
| role | files | css |
|---|---|---|
| `complete-shell` | `screens/Complete.jsx`, `complete/beats/{index.js,Xp,Month,Actions}.jsx`, `complete/Stage.jsx` | `complete.css` (`.cmp-`) |
| `complete-streak` | `beats/{Rings,Streak}.jsx` (Streak covers streak + shield + milestone) | `complete-streak.css` (`.cms-`) |
| `complete-reward` | `beats/{Card,Drop}.jsx` | `complete-reward.css` (`.cmr-`) |
| `complete-rank` | `beats/{Rank,Medals,Patch}.jsx` | `complete-rank.css` (`.cmk-`) |
(all `beats/*` under `src/screens/complete/beats/`)
**Beat contract** — default-export `function BeatX({ result, s, day, active, next, skip, share })`: `result` = the `finishDay` object (STORE-API §9); beats are chosen/ordered by `completionBeats(result)` (`xp rings streak shield milestone card drop rank|rank-up medals patch month actions`); a beat renders full-screen content on the shared deep-space stage (`Stage.jsx` from complete-shell draws the starfield/limb and the persistent top bar with Skip), calls `next()` when its choreography ends or the user taps CONTINUE, and is idempotent/replayable. `ids → files`: xp→Xp, rings→Rings, streak|shield|milestone→Streak (one file handles all three, picking the right variant from `result`), card→Card, drop→Drop, rank|rank-up→Rank, medals→Medals, patch→Patch, month→Month, actions→Actions. Sounds/haptics/fx per DESIGN §4.5; lite = cross-fades with the same information.

### onboarding
| role | files | css |
|---|---|---|
| `ignition` | `screens/Ignition.jsx` | `ignition.css` (`.ign-`) |
| `onboard-main` | `screens/Onboard.jsx`, `onboard/{Beat,Hero,Who,Name,Family,Launch}.jsx` | `onboard.css` (`.onb-`) |
| `onboard-commit` | `onboard/{Goal,Reminder}.jsx` | `onboard-commit.css` (`.onc-`) |
`Goal`/`Reminder` default-export `function X({ value, onChange, next, back })` (`Goal` value `20|40|60`; `Reminder` value `{ on, hour, min }`; both render *inside* the shared beat layout `onboard/Beat.jsx` — they import `Beat` from `./Beat.jsx` (owned by onboard-main, a stub exists with props `{ eyebrow, title, dek, children, footer, step, steps, back }`).
Ignition: `<Ignition first onDone />`. Onboard: `<Onboard onDone={({ openDay })=>void} />` ending in `completeOnboarding(...)`.

### objectives
| role | files | css |
|---|---|---|
| `obj-core` | `screens/Objectives.jsx` (composer), `objectives/{Rings,Today}.jsx` | `objectives.css` (`.obj-`) |
| `obj-streak` | `objectives/{Streak,Rank}.jsx` | `objectives-streak.css` (`.obs-`) |
| `obj-month` | `objectives/{Month,MedalsPreview,Recap}.jsx` | `objectives-month.css` (`.obm-`) |
Sections default-export `function Section({ s })` (read the store themselves) and render a self-contained block with its own heading rhythm; the composer stacks them with `--s-8` gaps in the order Rings, Today, Streak, Rank, Month, MedalsPreview, Recap.

### locker
| role | files | css |
|---|---|---|
| `locker-core` | `screens/Locker.jsx` (Segmented Cards·Patches·Medals·Journal, `sessionStorage['kind-locker-seg']`), `locker/{Patches,Medals}.jsx` | `locker.css` (`.lck-`) |
| `locker-cards` | `locker/{Cards,CardViewer}.jsx` | `locker-cards.css` (`.lcc-`) |
| `locker-journal` | `locker/Journal.jsx` | `locker-journal.css` (`.lcj-`) |
Tabs default-export `function Tab({ s })`.

### shorts
| role | files | css |
|---|---|---|
| `shorts-reel` | `screens/Shorts.jsx`, `ui/LiteYouTube.jsx`, `screens/shorts/Reel.jsx` | `shorts.css` (`.sho-`) |
| `shorts-story` | `screens/shorts/Story.jsx` (`function Story({ short, s, day, active, onDone })` — a text-short story poster, tap/hold/auto-progress) | `shorts-story.css` (`.shs-`) |

### me
| role | files | css |
|---|---|---|
| `me-core` | `screens/Me.jsx`, `me/{Pilot,Missions,Family,Links,About,Developer}.jsx` | `me.css` (`.me-`) |
| `me-settings` | `me/Settings.jsx` (Instruments, reading size, daily goal, reminder, back-up/restore) | `me-settings.css` (`.mes-`) |
| `me-install` | `me/Install.jsx` (exports default `InstallCard`, named `InstallPrompt`, `IosGuideSheet`), `screens/GodsUniversity.jsx` | `me-install.css` (`.mei-`) |
Sections default-export `function X({ s })`.

### share
| role | files | css |
|---|---|---|
| `share-sheet` | `screens/ShareStudio.jsx` | `share.css` (`.shr-`) |
| `share-canvas` | `lib/shareCanvas.js`, `lib/share/{verse,card,streak,month}.js` | — |
`shareCanvas.js` exports `renderShare({ kind, data, template, aspect, series }) → Promise<HTMLCanvasElement>`, `TEMPLATES = { verse:[{id,label}], card:[…], streak:[…], month:[…] }`, `ASPECTS = [{id:'story',w:1080,h:1920,label},{id:'square',…},{id:'portrait',…}]`, `canvasToBlob(canvas) → Promise<Blob>`. `ShareStudio` props `{ req:{ kind, data }, onClose }`.

## 3. Definition of done (every module)
A playground page that renders your module in the real shell frame (zero console errors) · the 2–3 key screenshots reviewed · lite mode + 360x640 checked · keyboard path where relevant · no files outside your ownership · report: `BUILT / DECISIONS / REQUESTS / KNOWN GAPS / SHOTS`.
