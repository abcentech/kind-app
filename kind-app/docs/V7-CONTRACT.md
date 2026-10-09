# KIND v7 "Ascent" — engineering contract

`V7-DESIGN.md` says what it must feel like. This says exactly how the pieces plug together, who owns which file,
and the rules that let ~15 people (agents) build in parallel without stepping on each other.
**If this document and your instinct disagree, this document wins; if it is silent, use judgement and say what you decided.**

## 0. Rules of engagement

1. **You own only the files listed for your role (§1).** Do not edit anything else. Need a change elsewhere (a missing token,
   a missing icon, a bug in someone's module)? Do **not** patch it — list it under `REQUESTS` in your final report. The orchestrator routes it.
   Exception: you may *read* anything.
2. **No raw values.** Colours, radii, font sizes, durations and easings come from `src/styles/tokens.css` (frozen). No hex literals in
   CSS or JSX (SVG art may use hex for *illustration-internal* shading; UI chrome never). Missing token → REQUESTS.
3. **CSS layers.** Wrap every rule in your stylesheet in the single layer given in §1 (`@layer ui { … }`). Class names are
   prefixed per owner (§1) so nothing collides. No `!important`. No global element selectors outside `base.css`.
4. **State your design intent in code comments only when non-obvious.** Match the density of the existing code: short, dry, why-not-what.
5. **Free only.** No paid anything. npm packages: do **not** run `npm install` (package.json is shared and installed already). Allowed libs:
   `react`, `react-dom`, `sharp`, `opentype.js`, `playwright-core` (dev), fonts already installed. Need another lib? Don't — write it; or REQUESTS.
6. **No git.** Never commit, stash, reset, checkout or push. The orchestrator commits.
7. **Don't run `npm run build` / `npm run dev`** (they write `dist/` and regenerate content, racing other agents). A shared dev server is already
   running at **http://localhost:5183** (Vite, HMR). Build your module in isolation in `playground/` (§4) and verify *with real pixels* (§5).
8. **Everything must degrade** under `html[data-fx="lite"]` and `prefers-reduced-motion` (design §4) and work at 360×640.
9. **Accessible by construction** (design §10): names, roles, focus rings, 48 px targets, `aria-live` where state changes.
10. **Be your own harshest reviewer.** Before you report: screenshot your work at 390×844 *and* 360×640, look at it, list what is
    weakest, fix the top three. "Works" is not the bar; "would a Lamborghini designer sign this" is. Compare against the references
    in the design doc. Redo anything that looks like clip-art, a default browser control, or a generic dashboard template.
11. **Report format** (your final message): `BUILT` (files + exports, 1 line each) · `DECISIONS` (anything you chose that others must know) ·
    `REQUESTS` (changes needed in files you don't own) · `KNOWN GAPS` (honest list) · `SHOTS` (paths of your best 3 screenshots).

## 1. Ownership map

| Role | Owns (create/overwrite) | CSS layer · class prefix |
|---|---|---|
| **foundation** | `src/styles/base.css`, `playground/foundation.*` | `reset`/`base` · none (element + `.t-*`, `.u-*` utilities) |
| **icons** | `src/icons.jsx`, `playground/icons.*` | `ui` · `.k-icon` |
| **sound** | `src/fx/sound.js`, `tools/audio-render.mjs`, `playground/sound.*` | — |
| **fx** | `src/fx/haptics.js`, `src/fx/motion.js`, `src/fx/fx.js`, `src/fx/FxLayer.jsx`, `src/styles/fx.css`, `playground/fx.*` | `fx` · `.fx-` |
| **ui-core** | `src/ui/{Button,IconButton,Chip,Tag,Panel,Row,Switch,Segmented,Slider,Progress,SegmentBar,Skeleton,Stat,Kbd,Empty,Label}.jsx`, `src/ui/core.js`, `src/styles/ui.css`, `playground/ui-core.*` | `ui` · `.k-` |
| **ui-overlay** | `src/ui/{Sheet,Dialog,Toast,Gauge,Ring,Hex,Dock,Bubble,Counter,useBackClose}.jsx`, `src/ui/overlay.js`, `src/styles/ui-overlay.css`, `playground/ui-overlay.*` | `ui` · `.k-` |
| **art-scenes** | `src/art/{Starfield,Horizon,Rocket,Flame,LaunchPad,OrbitScene,Earth,Comet}.jsx`, `src/art/scenes.js`, `src/styles/art.css`, `playground/art-scenes.*` | `ui` · `.art-` |
| **art-emblems** | `src/art/{MissionPatch,RankInsignia,Medal,CodeCardArt,Chest,Trophy,ShieldEmblem,FlameMark}.jsx`, `src/art/emblems.js`, `src/styles/art2.css`, `playground/art-emblems.*` | `ui` · `.art-` |
| **brand** | `src/art/Brand.jsx`, `scripts/make-icons.mjs`, `public/icon*.{svg,png}`, `public/favicon*`, `public/og.png`, `public/splash/**`, `store/**` | — |
| **pwa** | `public/sw.js`, `public/manifest.webmanifest`, `index.html`, `vite.config.js`, `src/pwa.js`, `src/lib/ics.js` | — |
| **store** | `src/store.js`, `src/lib.js`, `docs/STORE-API.md`, `tools/test-store.mjs` | — |
| **quiz** | `src/quiz.js`, `docs/QUIZ-API.md`, `tools/test-quiz.mjs` | — |
| **copy** | `src/copy.js`, `docs/COPY.md` | — |
| **video** | `scripts/videos.json`, `scripts/map-videos.mjs` | — |
| *orchestrator* | `src/main.jsx`, `src/App.jsx`, `src/now.js`, `src/prefs.js`, `src/styles/{tokens,fonts,index,shell}.css`, `src/ui/index.js`, `src/art/index.js`, `docs/*` (this file) | `screen` · `.shell-` |
| *(wave 2)* screens | `src/screens/**` + each screen's own stylesheet | `screen` · `.<screen>-` |

Existing files you may *read* for reference: `src/screens/*.jsx` (v6 — being replaced), `scripts/build-content.mjs`, `src/content/library.json`.

## 2. Data model

`import { allSeries, getSeries, activeSeriesId, … } from './lib.js'`. A **series** (`library.series[id]`):

```
{ id, title, subtitle, tagline, audience, month:'August', year:2026, monthNum:8,
  accent, accentDark,                       // series colours (hex) — art uses them for the patch/card tint
  themeScripture:{text,ref}, declaration:[string], channel, shortsUrl, shortsPlaylist,
  weeks:[{ f:'OWNERSHIP', title, emoji(ignore), question, passage, dir }],      // = "stages"
  calendar:[{ day:1..31, type:'intro'|'teaching'|'selah'|'celebration'|'rest', episode?:n, week:0..3|null, sunday?:n, videoId }],
  episodes:{ [n]: { num,title,date,scripture:{text,ref},truth,hook,points:[{title,body}],supporting,illustration,
                    challenge,prayer,declaration,transition,questions,apply,week } },
  sundays:{ [i]: { title,recap,reading,questions:[],prayer,declaration } },
  shorts:[{ n,title,hook,scripture,truth,… }], shortsVideos, codes:[{ no,day,episode,week,title,line,rare }],
  intro: {…} }
```
Two series ship: **The Stewardship Code** (Aug 2026, 4 stages, dated calendar) and **Secrets of Longevity** (Jul 2026, 5 stages).
Today's real date is **2 Oct 2026**, i.e. **no series is live** → the app runs in **archive mode** (every day open; "current" = first unfinished day).
Always test with the clock set: `?now=2026-08-12` (mid-August, live), `?now=2026-08-01`, `?now=2026-08-31`, none (archive).

**The clock.** Never `new Date()`. `import { now, today, isSimulated } from './now.js'` (honours `?now=`).

**Persistence.** Progress → `src/store.js` (localStorage `kind-app-v4`, schema v6 after your migration). Settings → `src/prefs.js`
(`kind-prefs`). Do not invent a third place.

## 3. Module APIs (build to these; if you must deviate, document it in DECISIONS)

### 3.1 `src/fx/sound.js` — WebAudio synth
```js
export const sound = {
  unlock(),                        // call from the first user gesture (App does); idempotent; resumes the AudioContext
  play(cue, opts?),                // opts: { gain=1, rate=1, delay=0 }  — no-op when prefs.sound is false or ctx locked
  duck(ms),                        // lower everything else (for long cues)
  get ready(), 
}
export const CUES = ['tap','select','deselect','toggle','nav','open','close','next','check','correct','wrong','combo',
  'xp','streak','shield','chest','reveal','rare','unlock','ignite','launch','complete','rankup','medal','error','countdown','go','ring','splash']
```
Read `prefs.get('sound')` / `prefs.get('volume')` on every `play`. Debounce identical cues < 60 ms. Intent of the loud ones: `launch` ≈ 2.5 s
(low engine body swelling + filtered-noise wash + rising pentatonic arpeggio, resolves on D); `complete` ≈ 2.8 s fanfare (stacked fifths + shimmer);
`correct` rising two-note glass chime (F♯→A); `wrong` soft low double-thud (never a buzzer); `splash` the ignition: tick-ring ticks, needle-sweep glide, a warm D2 body.
`tools/audio-render.mjs` renders every cue offline in headless Chrome, reports peak/RMS per cue, fails if peak > −3 dBFS or any cue is silent/clipped, writes WAVs to `tools/out/sound/`.

### 3.2 `src/fx/haptics.js`
```js
export const haptic = { tap(), select(), success(), warning(), error(), heavy(), launch(), pattern(arr) }   // all safe no-ops when unsupported/disabled (prefs.haptics)
```
iOS: create once a visually-hidden `<input type="checkbox" switch>` + `<label>`; `label.click()` fires a native tick on iOS ≥ 17.4. Android: `navigator.vibrate`.

### 3.3 `src/fx/motion.js`
```js
export function applyFxLevel()                    // sets <html data-fx="full|lite"> from prefs.fx + reduced-motion + device heuristics
                                                  //   (deviceMemory ≤ 2, hardwareConcurrency ≤ 4, saveData → lite). Re-applies on prefs change. Call once at boot.
export const useFxLevel = () => 'full' | 'lite'   // reactive
export const useReducedMotion = () => boolean
export function useCountUp(to, { from = 0, duration = 900, ease = 'outExpo', start = true, round = true }) → number
export function usePointerTilt(ref, { max = 10, glare = true, gyro = true })   // sets --rx --ry --gx --gy (+ --tilt-on) on the element; uses DeviceOrientation (iOS permission on first tap) else pointer
export function useScrollVar(ref, name = '--scroll', { invert = false })       // rAF-throttled 0..1 progress written to a CSS var on `ref`
export function useInView(ref, { once = true, margin = '0px' }) → boolean
export const wait = (ms) => Promise<void>
export const stagger = (i, step = 50, base = 0) => ({ transitionDelay: `${base + i*step}ms`, animationDelay: `${base + i*step}ms` })
export const raf = { add(fn), remove(fn) }        // the app's single shared rAF loop (pauses when document.hidden)
```
### 3.4 `src/fx/fx.js` + `FxLayer.jsx` — canvas effects
`<FxLayer />` is mounted once by App (fixed, full-screen canvas, `pointer-events:none`, `z-index: var(--z-fx)`). Imperative API (all no-ops in lite):
```js
fx.sparks({ x, y, n = 24, power = 1, spread = 360, angle = -90, colors?, gravity = .6, life = 900 })   // embers/sparks: ignite→gold, additive blend
fx.embers({ x, y, w, n })           // slow rising embers along a line (completion, rank-up)
fx.confetti({ x, y, n })            // thin metallic foil shards (NOT paper): ti/gold/ignite
fx.shockwave({ x, y, color, size }) // expanding hairline ring (CSS or canvas)
fx.flash(color, ms = 260)           // full-screen additive wash
fx.shake(el, { amp = 6, ms = 320 })
fx.trail(el)                         // returns { stop() }: rocket exhaust particle trail anchored to an element
```
Coordinates are viewport px. Helper: `fx.at(el)` → `{x,y}` centre of an element.

### 3.5 `src/ui/*` — primitives (all forward `className`, `style`, `...rest`; all have `aria-*`)
```
Button      { variant:'primary'|'secondary'|'ghost'|'danger'|'go'  size:'lg'|'md'|'sm'  icon iconRight full loading disabled silent as }   // primary = ignition, chamfered; sound.play('tap') + haptic.tap() unless `silent`
IconButton  { icon label size:'md'|'sm'|'lg' variant:'ghost'|'plate' badge }
Chip        { selected icon tone onClick }          Tag { tone:'neutral'|'ignite'|'tele'|'go'|'nogo'|'gold'|'stage' icon }
Panel       { tone:'plate'|'raised'|'glass'|'ignite'|'stage'|'sunk'  cut:boolean|'sm'  padded pad:'sm'|'md'|'lg'  as }
Row         { icon title sub value trailing onClick chevron tone }     RowGroup { title footer children }
Switch      { checked onChange label }          Segmented { options:[{id,label,icon}] value onChange size }       Slider { min max step value onChange label format }
Progress    { value:0..1 tone:'ignite'|'tele'|'go'|'stage'|'gold' height glow label }     SegmentBar { total done current tone }   // lesson ticker
Skeleton { w h r }   Stat { label value unit icon tone sub }   Kbd { children }   Empty { art title body action }
Label       { as tone children mono }          // the uppercase Barlow / mono eyebrow, 2 sizes: size:'sm'|'md'
// overlay.js
Sheet       { open onClose title detents:['auto'|'half'|'full'] grabber dismissable children labelledBy }   // portal, drag-to-dismiss, Esc, focus trap, back-button aware
Dialog      { open title body confirmLabel cancelLabel tone:'default'|'danger' onConfirm onCancel }
toast(opts) { title body icon tone:'default'|'go'|'nogo'|'ignite'|'tele' duration action:{label,onClick} }  →  id      <ToastHost />  (mounted by App)
Gauge       { value:0..1 min max label unit size ticks tone needle sweep }      // radial instrument; `sweep` plays the ignition needle sweep on mount
Ring        { value:0..1 size stroke tone icon glow animate label }             Rings { rings:[{id,value,tone,icon,label}] size }   // concentric Apple-style, closing animation + haptic when a ring completes
Hex         { size state:'locked'|'open'|'current'|'done'|'rare' tone:'stage'|'ignite'|'tele'|'gold' ring children glow }      // bevelled hex plate
Dock        { tabs:[{id,label,icon,badge}] value onChange }                      // floating glass tab dock with sliding indicator
Bubble      { placement tone children }      Counter { value duration format prefix suffix }
useBackClose(open, onClose)                  // pushes a history entry while `open` so the Android back gesture closes the layer instead of exiting the app
```
### 3.6 `src/art/*` — drawn-in-code imagery (SVG/CSS; each takes `size|width|height`, `className`, and respects `data-fx`)
```
// scenes.js
Starfield   { density=1 seed=1 twinkle parallax className }     // layered CSS stars; `parallax` reads --scroll
Horizon     { variant:'pad'|'limb'|'space' }                     // dusk pad w/ gantry · Earth limb w/ atmosphere glow · pure space
Rocket      { size flame:'off'|'idle'|'burn' tilt variant:'stack'|'capsule' }    // photographic-lighting vector rocket w/ grid fins, panel lines, soot, KIND roundel
Flame       { size intensity }     LaunchPad {…scene}     OrbitScene {…scene}     Earth { size }     Comet
// emblems.js
MissionPatch { series stage:0..4 state:'locked'|'earned' size }   // embroidered round patch, procedural from series.title / weeks[stage].f / accent, merrow-border texture
RankInsignia { rank:0..6 size }    Medal { id tier:'bronze'|'silver'|'gold'|'ti' earned size }    CodeCardArt { day rare hue w h }  // generative engraving seeded by day
Chest { state:'closed'|'open' tone size }   Trophy { size }   ShieldEmblem { size state }   FlameMark { size lit:boolean level }
// Brand.jsx
Mark { size glow }   Wordmark { size }   Lockup { size }
```
### 3.7 `src/icons.jsx`
`import { Icon } from './icons.jsx'` → `<Icon.flame size={24} weight="solid" />` and `<Icon name="flame" />`. **Names (camelCase):**
learn objectives shorts locker me · flame bolt shield chest rocket star trophy flag lock unlock check checkCircle close medal card patch target sparkle crown heart gift key ·
chevronRight chevronLeft chevronUp chevronDown arrowRight arrowLeft arrowUp plus minus more search filter info warning help refresh undo trash copy link external share download upload settings sliders ·
book verse quote pen journal mic headphones play pause video clock calendar bell bellOff hourglass textSize bookmark hint ·
soundOn soundOff vibrate moon wifiOff install phone globe mail user users home family · youtube whatsapp telegram instagram · gauge orbit satellite stage signal radar thruster countdown.
Props: `size` (16/20/24/32, default 24), `weight` `'line'|'solid'|'duo'` (default line), `title` (adds `<title>` + role=img; otherwise `aria-hidden`), `className`, `style`.

### 3.8 `src/store.js` + `src/lib.js` (owner: store — authoritative list in `docs/STORE-API.md` when they finish)
Required behaviours (names are the store agent's to finalise, but every one of these must exist and be documented):
- Everything date-based uses `now()`. Migration from schema v5. All writes go through one `commit()`; `useStore()` hook; pure selectors.
- **Modes:** `modeOf(series)` → `'upcoming'|'live'|'archive'`. `currentDay(series, st)` → in *live*: today's day number (capped to month length);
  in *archive*: the first unfinished day (or the last day if all done). `isUnlocked(series, day, st)`; archive unlocks everything.
- **Streak:** day-based on `now()`; **Shields** (max 2) earned every 7-day streak and via supply drops, auto-spent on a missed day (before Selah grace);
  `graceGap`; streak repair is *not* purchasable (we sell nothing).
- **XP/ranks:** `RANKS` (≥ 7, faith-appropriate names, thresholds), `rankFor(xp)` → `{index,name,xp,next,toNext,pct}`.
- **Daily goal:** `dailyGoalXp` from onboarding choice (20/40/60). **`rings(st)`** → three `{id:'lesson'|'xp'|'right', value:0..1, now, goal}`.
- **Objectives:** `QUESTS` + `questState(st)`; month-long objectives; chest rewards.
- **Achievements:** `ACHIEVEMENTS` (≥ 24, tiers) with `id,title,desc,tier,icon,test(st)`; `checkAchievements()` returns newly earned ids; stored with date.
- **Activity heat-map:** `activityByDate(st)` → `{ 'YYYY-MM-DD': { lessons, xp } }`.
- **Supply drops:** `rollDrop(seed)` deterministic per `(seriesId, day)` and persisted so reload cannot re-roll; kinds `xp`/`shield`/`fragment`.
- **`finishDay(seriesId, day, lessonXp, meta)`** → `{ xp:{lesson,bonus,drop,total}, streak:{from,to,shieldUsed,milestone}, code, drop, rank:{from,to,up}, achievements:[id], rings:{before,after}, first }` — one object the completion screen can animate from.
- `scoreAnswer(right)`, `setPos`, `saveNote`, `noteFor`, `isDayDone`, `doneDays`, `weekProgress`, `perfectWeeks`, `unlockedCards`, `missedDays`, profile/kids/onboarding fns (keep existing), plus `completeOnboarding({ name, role, familyName, kids, dailyGoal })`.
- `tools/test-store.mjs` — a node test (no framework) that fakes `localStorage`/`now` and asserts streak, shield, mode, ring, rank, drop-determinism and migration behaviour.

### 3.9 `src/quiz.js` (owner: quiz)
```js
quizFor(series, day, { count = 4 } = {}) → Exercise[]       // deterministic per (series.id, day); never reshuffles on re-render
gradeExercise(ex, response) → { right:boolean, answerText:string, explain?:string }
// Exercise (all have id, type, prompt, xp:10, explain, source:'scripture'|'truth'|'point'|'code'|'declaration'|'week')
{ type:'choice', options:[{id,text}], answer:id }                                           // "Which scripture anchors today?"
{ type:'blank',  before, after, options:[{id,text}], answer:id }                            // fill the missing word of the verse / declaration
{ type:'order',  words:[{id,text}] (shuffled), answer:[id,…] }                              // assemble the declaration / short verse
{ type:'match',  pairs:[{ id, left, right }] (3–4)  }                                       // response = {leftId: rightId}; stage→question, code→line…
{ type:'tf',     statement, answer:boolean }                                                // plausible-but-false variants built from other days
```
Variety rule: a lesson never has two consecutive exercises of the same type; ≥ 2 distinct types when `count ≥ 3`. Selah/celebration/intro days get day-appropriate sets.
Distractors come from the same series; never ambiguous (two defensible answers is a bug); never leak the answer through length or position. Works for **both** series (legacy July dialect has thin points).
`tools/test-quiz.mjs` generates every day of both series and asserts: unique correct answer, no duplicates in options, determinism, type variety, no empty strings, answer not equal to a distractor.

### 3.10 `src/copy.js` (owner: copy)
Deterministic-by-seed (`pick(list, seed)`) so text never flickers on re-render:
`praise(ctx)`, `verdictRight(ex, series, seed)`, `verdictWrong(ex, seed)`, `streakLine(n)`, `shieldLine(kind)`, `milestoneCopy(n)`, `rankUpCopy(rank)`, `greeting(name, hour)`,
`launchBarCopy({ state, day, title, mins, countdown, streak, hoursLeft })`, `reminderCopy()`, `shareCaption(kind, data)`, `emptyCopy(kind)`, `onboardCopy`, `settingsHelp`. Document tone rules and the full string inventory in `docs/COPY.md`.

### 3.11 `src/pwa.js` + `src/lib/ics.js` (owner: pwa)
```js
registerSW({ onUpdate })                  // returns { update() }; skipWaiting flow with a "New version — Refresh" callback
useInstall() → { canInstall, install(), isStandalone, platform:'ios'|'android'|'desktop', needsIosGuide }
useOnline() → boolean
makeReminderICS({ hour, min, name, url, title, body }) → Blob      // recurring daily VEVENT (RRULE:FREQ=DAILY), with VALARM; and `downloadICS()`
```
SW strategy: precache the app shell + fonts + icons with a build-time manifest (Vite plugin in `vite.config.js`), navigation fallback to `index.html`,
stale-while-revalidate for same-origin, network-only for YouTube. Versioned cache name from the build hash. Must work at any base path (`base: './'`).

## 4. Playgrounds

Each role builds in `playground/<role>.html` + `playground/<role>.jsx` (copy `_template.html`; import `{ mount }` from `./_boot.jsx`).
Served at `http://localhost:5183/playground/<role>.html`. The playground should be a *specimen sheet*: every component, every state,
dark carbon page, labelled in mono. It is your test bench **and** the design review artefact. Playgrounds are excluded from the production build.

## 5. Verifying with real pixels

```js
import { open } from '../tools/browser.mjs'        // from a script in tools/ or playground/
const b = await open({ url: 'http://localhost:5183/playground/ui-core.html', device: 'iphone', now: '2026-08-12' })
await b.page.click('text=Button'); await b.shot('ui-core/buttons')     // → tools/out/ui-core/buttons.png  (then Read the PNG to look at it)
console.log(b.errors); await b.close()
```
or `node tools/shot.mjs <name> --url <url> --device lowend --now 2026-08-12 --click "text=Start" --full`.
Devices: `iphone` 390×844@3 · `se` 375×667 · `pixel` 412×915 · `lowend` 360×640 · `tablet` · `desktop`. Always namespace shots under your role folder.
Always check `b.errors` is empty. If Vite re-optimises deps mid-run ("page reloaded"), just retry once.
**Look at your screenshots** (Read the PNG). Zoom with `page.screenshot({ clip })` on any detail you doubt. Do not report success from DOM assertions alone.

## 6. Definition of done (every role)
Specimen playground renders with **zero console errors** · screenshots reviewed at two sizes · lite mode checked · keyboard/focus checked for interactive pieces ·
no raw values · no files outside your ownership touched · report in the §0.11 format.
