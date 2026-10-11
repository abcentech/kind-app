# KIND v7 "Ascent" — build state ledger (updated by the orchestrator)

Resume point for a fresh context. Read `V7-DESIGN.md`, `V7-CONTRACT.md`, `V7-WAVE2.md` first.

## Standing constraints (from the founder)
* **We don't buy anything.** No purchases, no paid fonts/assets/services/credits. Ever.
* **Do NOT merge into the live KIN website** until the founder has tested and approved. Deploy target is the app's own repo/Pages only
  (abcentech/kind-app → https://abcentech.github.io/kind-app/). Never touch `kin-site`.
* The founder's brief: SpaceX-rocket look, Apple finesse, Lamborghini exquisiteness; "OUTDO yourself"; many parallel agents; when finished
  critique ("what is missing?") then build it. Today = 2026-10-08 (no series live → archive mode; test with `?now=`).
* The previous run died on the account's **usage limit** (resets on a ~5h window). Keep agents lean (docs/V7-WAVE2.md §0).

## Done (verified on disk; tests green)
* Tokens/fonts/base/shell CSS · icons (111 glyphs) · sound synth · fx (haptics/motion/particles) · UI kit (core + overlay) · art scenes + emblems ·
  brand (icons, OG, splash, store graphics) · store/lib (78 tests × 4 TZ) · quiz engine (208k checks) · copy (full inventory) · PWA (sw/manifest/ics) ·
  video mapping script. App shell (`src/App.jsx`, `main.jsx`, `shell.jsx`) boots with zero errors (walking skeleton).
* Docs: V7-DESIGN, V7-CONTRACT, V7-WAVE2, STORE-API, COPY. (QUIZ-API.md pending.)

## Wave plan
1. **Batch 1 (critical path, 18 modules)** — learn-path/hud/launch, lesson-shell + slides-read/word/declare, ex-step/choice/blank-order/match,
   complete-shell/streak/reward/rank, ignition, onboard-main/commit. Script: scratchpad `w2.js` (args.roles). 
2. **Batch 2 (14 modules)** — obj-core/streak/month, locker-core/cards/journal, shorts-reel/story, me-core/settings/install, share-sheet/canvas, quiz-docs. Script: `w3.js`.
3. **Assemble & polish** — one agent per screen group runs the composed screen, fixes seams, polishes.
4. **Integration QA** — journey tests (new user → onboarding → lesson → completion; month sim with `?now=`; shields; archive; July series; offline; both themes of fx),
   a11y audit, perf (4× CPU throttle), bundle size, PWA/offline/SW build test.
5. **Critics** — product/stickiness, design craft, engineering — "what is missing?" → build it.
6. **Ship** — `npm run build`, commit `kind-app/` only, push to abcentech/kind-app main, verify the live URL, Play-listing screenshots (`store/`), memory update, hand the founder the test link + `?now=` demo links.

## Log
* 2026-10-08 19:xx — batch 1 launched (18 agents, 3 workflows).

* Model policy (founder, Oct 8): Haiku for basic/mechanical work, Sonnet only for checking/integration (set `model` in agent opts). Batches 1-2 were launched on the default model before this.

* 2026-10-08 — builders done (no stubs). Assemble wave launched: wf_478d6720-706, wf_75ae2b46-912, wf_448cfd8f-274 (Sonnet; Opus for asm-lesson/asm-complete). Next: integration QA, critics, ship.

* 2026-10-08 — USAGE LIMIT hit during assemble wave. Stopped wf_478d6720-706, wf_75ae2b46-912, wf_448cfd8f-274 (edits already on disk are kept). On resume: re-run w4.js groups in "finish" mode (resumeFromRunId per workflow), then QA, critics, ship. Not yet verified: npm run build, live deploy. Nothing pushed or merged.

* 2026-10-09 — ALL builders done. Assemble wave relaunched: wf_a1bbbb76-57e (learn/lesson/complete/onboard), wf_0bddc102-4b6 (objectives/locker/shorts/me), wf_4c5db243-3c5 (share/shell/perf). Resume with w4.js resumeFromRunId if a limit error recurs. Cron f82aee06 auto-resumes. Next: build+QA, critics, ship.

* 2026-10-09 — assemble wave DONE (all 3 workflows). Next: build, fix test-store deckFor videoId failure, QA, critics, ship.

* 2026-10-09 — build OK (main 156kB gz, SW 2.2MB precache), test-store 78/78 x4 TZ. Critics launched: wf_108a990c-0d9 (product/design/engineering, Sonnet). Next: merge fixes, final build, commit kind-app/ only, push abcentech/kind-app main, verify live URL, give test link.

* 2026-10-09 — SHIPPED: commit 5b6b5fc pushed, live https://abcentech.github.io/kind-app/ verified. Await founder test. Open: bundle 263kB gz, perf on real device, month share caption, Dialog focus return.

* 2026-10-09 R2 — Founder: "fix remaining gaps, keep polishing, do it from January till date (Jan-Oct is on YouTube)". Built scripts/year-series.json from public playlists (months 1-6, 9, 10; Jul/Aug already in app). Round-2 workflows: wf_9c5ef80b-e0f (year-engine opus, copy-a/b/c haiku), wf_e3357dea-e06 (bundle, perf, design, retention sonnet). Script w5.js (args.roles). Next: Sonnet review of year-copy for accuracy, QA, ship. YouTube note: yt-dlp watch pages are bot-gated (429) - only flat public listings used; do not scrape/cookies.

* 2026-10-09 R3 — Founder supplied real guides: series/capacity-superpowers/teaching-guide.md (Sep) + series/building-nigeria/teaching-guide.md (Oct). year-engine (R2) died on DNS; relaunched as wf_7fad616a-cef (w6.js: year-engine opus + parse-sep/parse-oct sonnet -> scripts/year-copy/capacity-superpowers.json, building-nigeria.json). Copy drafts for Jan-Jun done (scripts/year-copy). R2 gap workflow wf_e3357dea-e06 still running (bundle/perf/design/retention). Next: Sonnet copy review (esp. faith-in-his-name), QA, build, push.

* 2026-10-11 R3b — wf_9c5ef80b/e3357dea/7fad616a stopped (session ended). Relaunched wf_d9370a64-f10 (w7.js): year-engine opus + 9 haiku parsers (sep-meta/1/2, oct-meta/1-6) -> Sonnet verify-sep/verify-oct merge into scripts/year-copy/capacity-superpowers.json + building-nigeria.json. R2 gap roles (bundle/perf/design/retention: w5.js) NOT yet rerun; src/copy/, WelcomeBack.jsx, FamilyRecap.jsx exist on disk. Next: rerun R2 roles on haiku, Sonnet review year-copy, QA, ship.

* 2026-10-11 — wf_d9370a64-f10 DONE: guide JSONs merged (Sep 30 days, Oct 30 days), year-engine built guide+light kinds. Launched quiz-fix (Sonnet agent) and wf_ee63bca4-200 (w8.js: bundle/perf/design/retention on Haiku). Next: Sonnet review of year-copy, QA, build, ship.

* 2026-10-11 — SHIPPED 82606d4 (Jan-Oct, guides, quiz fixes, perf, welcome-back, recap). QA 7/7 pass. Open: first-load ~260kB gz (goal 170), Oct guide accuracy review by founder.

* 2026-10-11 — Founder feedback from phone: (1) app shown in a phone bezel not full screen (desktop-site mode); fixed shell.css pointer:coarse = full-bleed. (2) Oct showed 'opens 1 Oct, T-30d' = a sticky ?now= in sessionStorage; now.js persists time travel only in dev. (3) Sundays -> GAME DAY: wf_aa5bf1a8-56f (w9.js: orbit-run opus, blitz+memory haiku, game-day opus, verify sonnet). Edits uncommitted until games verified.
