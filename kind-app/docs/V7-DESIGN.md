# KIND v7 "Ascent" — art direction

Read this top to bottom before you write a line. It is the *why*. `V7-CONTRACT.md` is the *how*.

## 0. The brief, in the founder's words

> "An app that looks like a well-designed SpaceX rocket, that has the finesse of an Apple product,
> and the exquisiteness of a Lamborghini. Make me scream for the level of detail and excellence."
> "Hold this against the standard of the best apps that ever existed."

Three previous looks were rejected on sight (candy "Sunrise", gold-on-black "Vault", restrained "Apple"),
and a Duolingo clone (v6) was built after. The *mechanics* of v6 are right and stay: a course you walk,
lessons that teach then test, XP, daily quests, a streak you protect. **Everything you can see, hear or feel
is new.** v6 looked like Duolingo. v7 must look like nothing else on the home screen.

The users: Nigerian teens and families, mostly mid-range Android on mobile data, some iPhones. The content:
a daily devotional (Scripture, one central truth, teaching points, a challenge, a prayer, a declaration)
for the NGO Kids Inspiring Nation — *"Raising goDs, Building Nations."* This is a **spaceport with a chapel in it**.
The hardware is cold and exact; the Word at the centre of it is warm and alive. That tension is the whole design.

## 1. The three references, turned into rules

### SpaceX → *mission control, not sci-fi toy*
- Black, white, one hot colour. Nothing decorative that isn't also information.
- **Telemetry is the ornament.** Tiny monospaced readouts (`T+ 08`, `DAY 12/31`, `STAGE 02`, `+40 XP`) are how we add
  richness. Numbers are tabular (`font-variant-numeric: tabular-nums`) and live in `--font-mono` or `--font-display`.
- Vocabulary of a launch (used sparingly, *never* at the cost of clarity for a 12-year-old):
  mission = the month-long series · stage = a week · launch = start a lesson · orbit = finish the month.
  Countdowns read `T-02:14:09`. A lesson opens with *Ignition*. A finished lesson reaches *Orbit insertion*.
- Scale and negative space: one giant number or one giant verse per screen, everything else hairline-small.
- Vertical ascent. Day 1 sits on the pad at the **bottom** of the Learn screen; Day 31 is in orbit at the top.
  The sky darkens and stars thicken as you climb.

### Apple → *finesse is physics, restraint and consistency*
- Springs, not tweens. Every press has mass: scale to .97 on down, overshoot back on release (`--spring-snap`).
- Concentric corners (inner radius = outer − padding), optical alignment, 4px grid, 48px minimum targets.
- Depth through *light*, not through borders: a 1px top-edge catch-light, a soft tinted shadow, a sheen.
- Sheets with a grabber that follow the finger. Rubber-banding. Momentum. The iOS sheet curve `--ease-sheet`.
- Translucent "glass" is a **material for chrome only** (HUD, dock, sheets) — never for content cards.
- Nothing moves without a reason; nothing that moves is allowed to stutter. 60 fps or cut the effect.
- Haptics and sound are part of the UI, designed with the same care as the pixels (§5, §6).

### Lamborghini → *exquisite materials, aggression in the geometry*
- **The chamfer.** Key hardware elements (primary buttons, answer plates, tags, cards of honour) have two opposite
  corners cut at 45° (`--clip-cut`). The hexagon (`--clip-hex`) is the shape of a lesson node, a patch, a badge.
- **Materials are real:** carbon (a faint woven texture), titanium (`--titanium` gradient bezels), anodised glass,
  gold foil (`--gold`, rare and holographic), stitched-leather quilting on the Locker. Each has a sheen and a rim light.
- **The cluster.** Gauges with ticks, needles that sweep to redline and settle at start-up (the Ignition splash),
  rings that close with a glow. Instruments, not progress bars.
- **The start button.** The primary launch control is a deliberate, weighty object — big, ignition-orange, chamfered, with
  an inner sheen; on press it sinks, and sound + haptic punctuate it. Pressing it should feel like a decision.
- Colour discipline: matte near-black everywhere; **one** saturated element per screen.

## 2. What this is NOT (the rejected looks — do not drift back)
- ✗ Candy colours, chunky 4px "button edge" pressables, rounded bubbly nodes (that is v6/Duolingo).
- ✗ Emoji anywhere in the interface (they are gone since v5). All glyphs come from `src/icons.jsx` or the art set.
- ✗ Cartoon mascots. The "character" of the app is the rocket, the flame and the gauge.
- ✗ Gradients on text, except the ignition gradient on a single hero numeral. ✗ Rainbow anything.
- ✗ Glassmorphism on cards. ✗ Drop shadows that are grey; shadows are black, large, low-alpha, and tinted by glow when lit.
- ✗ Sci-fi kitsch: no Orbitron, no neon grids, no "holographic" blue wireframes, no lens flare overdose.
- ✗ Anything that needs a purchase: fonts, stock art, sounds, icons. Everything is built or OFL/MIT-licensed.

## 3. Visual system

**Colour budget per screen.** Carbon neutrals (≈ 90 %), ink text, **one** hot element — `--ignite` on the primary
action or the live node — plus *information colour* used only where it carries meaning: `--tele` for data/XP,
`--go`/`--nogo` for correctness, `--gold` for rarity, `--stage-N` to identify a stage. If a screen has two orange
things competing, one of them is wrong.

**Type.**
| Role | Face | Use |
|---|---|---|
| Display / labels | **Barlow Condensed** 500–700, UPPERCASE, `--track-label` | eyebrows, stage titles, CTAs, big numerals |
| UI & body | **Inter Variable**, 17 px base, `--track-tight` ≥ 20 px | everything else |
| The Word | **Newsreader Variable** (roman + italic) | Scripture, verses, declarations, titles of lessons. Large. Generous leading (1.35–1.5). |
| Telemetry | **JetBrains Mono Variable**, 11–13 px, `--track-mono` | `T-02:14:09`, `DAY 12/31`, XP deltas, keycaps |

Scripture is the hero of the product: set it like the cover of a book. Large (24–34 px), `text-wrap: balance`,
hanging punctuation where supported, the reference in mono small caps beneath. Never below 20 px.

**Geometry.** 4 px grid. Radii: 8 / 12 / 18 / 26 / 36. Chamfer `--cut` 14 px (8 px small). Hex nodes. Hairlines are
1 px `--line` (use 0.5 px with `border-width: .5px` where retina allows, via `@media (min-resolution: 2dppx)`).

**Light.** Every raised surface has: `--plate` fill, `--bevel` (top rim light + bottom shade), `--shadow-1/2/3`.
Lit/active things add a `--glow-*`. Backgrounds: `--carbon-0` with the global grain at ~4 % and, on Learn/Lesson/
Onboard, the starfield. Gradients are long, soft and low-contrast (carbon → slightly bluer carbon), never banded.

**Imagery.** We have no photographs and buy none. All imagery is **drawn in code**: SVG scenes (launch pad at dusk,
the Earth's limb, orbit), generative engravings on code cards, procedural mission patches. It must look *photographic-grade
in its lighting* (rim light, atmospheric falloff, bloom) despite being vector. If a drawing looks like clip-art, redo it.

**Iconography.** One family, 24 px grid, 1.75 px stroke, round caps/joins, `currentColor`. Three weights per glyph where
useful: `line` (default), `solid` (active tab, earned), `duo` (line + 20 % fill). Optical sizes: 16/20/24/32.

## 4. Motion

- **Physics.** Presses: `transform: scale(.97)` in `--t-instant`; release with `--spring-snap`. Arrivals: `--ease-out`
  + `--t-base/slow`. Sheets: `--ease-sheet`. Celebrations: `--spring-bounce`/`--spring-slam`.
- **Choreography.** Stagger children 40–60 ms. Never animate more than ~6 things at once. Hero moments get a **beat**:
  anticipation (slight pull-back) → action → settle.
- **Signature moments** (these are where the app earns its reputation; spend the effort here):
  1. **Ignition** — cold-start splash: tick ring draws, needle sweeps to redline and back, KIND wordmark tracks in, an ember pops.
  2. **The Ascent** — Learn screen: parallax stars, sky that darkens with `--scroll`, rocket marker with live exhaust on today's node, lit flight path.
  3. **Launch** — tapping the launch control: button sinks → screen flashes ignite-wash → lesson rises with a sheet curve; a low rumble swells (sound).
  4. **Go / No-Go** — answer verdict sheet: LED lights, correct chime or soft thud, XP delta flies to the HUD.
  5. **Orbit insertion** — completion: rocket climbs through the frame on a particle trail while XP counts up, rings close, the code card is dealt face-down, flips, and (if gold) catches the light as you tilt your phone.
  6. **Rank-up / milestone / month complete** — a full-bleed moment, ≤ 4 s, always skippable with a tap.
- **Reduced motion / Lite.** `html[data-fx="lite"]`: no parallax, no canvas particles, no infinite loops, no backdrop blur;
  state changes become 120 ms cross-fades. The *information* of every animation (what changed) must survive without it.
- **Budget.** Animate only `transform`, `opacity`, `filter` (sparingly) and SVG `stroke-dashoffset`. No layout animation.
  `will-change` only while animating. Canvas ≤ 150 live particles, one rAF loop for the whole app, paused when hidden.

## 5. Sound

Synthesised in WebAudio (`src/fx/sound.js`) — no audio files shipped. One sonic world:
**D major pentatonic (D E F♯ A B)** for every pitched cue so any two can overlap without clashing; **airy, glassy,
instrument-panel timbres** (sine/triangle + a touch of FM, short noise transients, a slight stereo spread) over
a faint low "engine" body for the big moments. Think: a very expensive car door closing; a cockpit confirmation chime.
- Loudness: peak ≤ −3 dBFS, UI cues ≈ −20 LUFS-ish, celebrations up to −14. Nothing harsh above 6 kHz.
- Cues are 40–250 ms (UI) or ≤ 3 s (`launch`, `complete`). A cue never repeats within 60 ms (debounce).
- **Off by default? No: on by default at 60 % volume, one tap in Settings to disable, and it respects the system mute switch** (WebAudio on iOS follows ringer when using HTMLAudio; we accept that WebAudio does not — so the first tap shows a quiet "Sound on" toast with a mute button once).
- Cue list and intent is in the contract (§3.1).

## 6. Haptics

`navigator.vibrate` on Android; on iOS Safari use the hidden `<input type="checkbox" switch>` label-click trick
(iOS 17.4+). Map: `tap` 8 ms · `select` 12 ms · `success` double-tick · `warning` single 30 ms · `error` triple-stutter ·
`heavy` 40 ms · `launch` ramping pulses. Every sound that confirms an action has a matching haptic. User can disable.

## 7. Voice & copy

Confident, spare, reverent. Short declaratives. Never cute with kids, never clinical with Scripture.
- Launch vocabulary lightly: "Cleared for launch", "Stage 2", "Orbit reached", "T-02:14:09 to tonight's episode".
- Praise comes from the **Word**, not from a cartoon: *"Faithful in little."* *"Well done, good and faithful servant."*
  (Matt 25:21) *"Your labour is not in vain."* (1 Cor 15:58). Wrong answers: *"Not yet — here's the line."* Never shame, never "Oops!".
- Streak: *"7 days. Ignition holding."* Shield used: *"A shield held your streak."* Lost: *"Streak ended at 12. Day 1 starts now."*
- Reminders (calendar text): *"KIND · Today's launch is ready."*
- No exclamation marks except for genuine milestones. No emoji. No ALL-CAPS body copy (labels only).
- Numbers: `Day 12`, `12 / 31`, `+40 XP`, `T-02:14:09`, `1,240 XP`. Dates: `Wed 12 Aug`.

## 8. The experience (one paragraph per surface)

**Ignition (cold start).** 1.4 s. Black. A thin instrument ring of 60 ticks draws; the needle sweeps 0 → redline → rests;
"K · I · N · D" tracks in from wide to tight spacing; a single ember; tagline fades. Tap skips. Returning users get a 0.6 s version
(wordmark only). First run unlocks audio on that first tap.

**Pre-flight (onboarding).** Cinematic, five beats, one decision each, thin tick progress. (1) Launch pad at dusk — "Raising goDs.
Building nations." (2) *Who's flying?* — teen / parent leading kids. (3) *What should we call you?* (4) *Your daily commitment* —
Casual 3 min · Regular 5 · Serious 10 (sets the daily XP goal 20/40/60 — **commitment device**). (5) *When should we remind you?* — time
picker + "Add to my calendar" (downloads a recurring .ics with the app link) + "Skip". It ends by launching **Day N** directly:
value inside 60 seconds, before any account, before any permission.

**Learn (the Ascent).** A glass HUD on top (streak flame gauge · XP · shields). Below, the 31-day trajectory climbs the screen:
hex nodes on a glowing flight path, stage banners as hairline slabs with a big stage numeral and a patch that is greyscale until the
stage is cleared. Today's node has the rocket on it, exhaust flickering. Locked days are carbon with a padlock and say when they unlock.
Pinned above the dock: **the Launch Bar** — one glass slab, "DAY 12 · The Ownership Covenant · ~6 min", one huge ignition button.
When today is done it flips to a live countdown to the next unlock. When the month is over (archive mode) it offers the first unfinished day.

**Lesson (the flight sequence).** Full screen, no chrome except a segmented progress ticker and a close ✕. Each Scripture/truth/point/
challenge/prayer slide is one thought, typographic, with a tiny mono eyebrow. Then **checks** (5 exercise types: choose, fill the gap,
order the words, match pairs, true/false) on chamfered answer plates with keycaps 1–4. CHECK is disabled until you commit; the
verdict sheet rises with a status LED, the line, and a CONTINUE that matches the verdict. Missed questions return at the end once.
The declaration is always last — the lesson ends on the Word, not on a score.

**Orbit insertion (completion).** See §4.5. Then the **supply drop** (a variable reward: XP, a Shield, or a rare patch fragment),
the rings close, rank progress ticks, **Share** (Studio) and **Continue**.

**Objectives.** Three Apple-style concentric rings (Lesson · XP · Accuracy) on a gauge-bezel; today's objectives with rewards;
a month heat-calendar of flames; rank progress; medals. **Shorts.** Snap-scroll vertical feed, lite-embed facade (no iframe until play).
**Locker.** Code cards in a quilted grid that tilt with the phone, gold ones with foil; stage patches; the Journal (every answer you wrote).
**Me.** Pilot card (avatar hex, rank insignia), instruments, settings (Sound, Haptics, Effects, Text size, Reminder), missions list,
family, goDs University, install guide, privacy line: *"Nothing leaves this device."*

## 9. Stickiness inventory (every item must exist and be tuned)
Cue→action→variable reward→investment: a **time-boxed daily lesson** (5–6 min) · **one-tap launch** from the Launch Bar ·
**streak** with flame gauge, **Shield** (earned; auto-spent on a missed day) and Selah grace · **3 rings** (Lesson / 40 XP / 3 correct) ·
**daily objectives** with chests · **XP + ranks** with insignia and rank-up moments · **variable supply drops** (persisted per day so a
refresh cannot reroll) · **medals** (≥ 24) · **patches** per cleared stage · **code cards** (gold every 7th, holographic) ·
**Journal** (investment: your own words accumulate) · **share cards** (verse / card / streak / month) · **loss aversion** copy at 9 pm
("your streak is 6h from ending" in the Launch Bar) · **calendar reminder** (.ics) · **install prompt** timed after the first completed
lesson · **commitment device** (daily goal chosen in onboarding) · **missed-question recycling** · **milestones** (3/7/14/21/31).

## 10. Quality bar (non-negotiable)
- **Performance:** first load ≤ 170 kB gz JS+CSS (fonts excluded, lazy-load screens other than Learn), LCP < 2.0 s on a throttled
  Slow-4G Moto-G, 60 fps scroll on Learn on a 4-core/2 GB device (CPU-throttle 4× in testing), no layout thrash, no long tasks > 50 ms in a lesson.
- **Offline-first:** everything after first load works with no network; video/Shorts degrade to a "Watch on YouTube" link.
- **Accessibility:** WCAG 2.2 AA contrast; every control has a name; focus ring (`--tele`, 2 px, offset 2) visible on every focusable;
  verdicts announced via `aria-live`; full keyboard path through a lesson (Enter/Space, 1–4, Esc); `prefers-reduced-motion` honoured;
  text size 90–130 % in Settings scales the reading slides; hit targets ≥ 48 px; no information by colour alone (icon + text on verdicts).
- **Devices:** 360×640 (low-end Android) · 375×667 (iPhone SE) · 390×844 · 412×915 · 820×1180 tablet · desktop (centred 480 px column on
  a starfield). Safe areas respected. Landscape phones show a "rotate" gracefully (we lock portrait in the manifest).
- **Privacy:** no analytics, no third-party requests except YouTube (privacy-enhanced domain, only after a tap) and the KIN site JSON.
- **Free:** no paid fonts, assets, services or APIs. Ever.
