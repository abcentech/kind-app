# Trailer animation — The Stewardship Code

A Remotion build that cuts **six generated plates** together with code-rendered type,
atmosphere and the timing-critical sync layer.

Companion docs: [00-trailer-brief.md](../00-trailer-brief.md) ·
[02-trailer-script.md](../02-trailer-script.md) ·
[03-FLOW-SHOTLIST-FINAL.md](../03-FLOW-SHOTLIST-FINAL.md)

---

## Two picture layers, and why both still exist

Every shot can render either way, switched by one flag (`SceneProps.overPlate`):

- **Plate** — a generated clip in `public/plates/`, drawn behind the scene. This is what
  ships.
- **All-code** — the original vector/CSS version: geometry, silhouettes, no footage. Still
  the fallback for any plate that gets rejected in review.

Removing a shot from the `PLATES` map in `src/Trailer.tsx` reverts that shot to code. Both
paths share one set of springs, onsets and copy, so the type timings cannot drift between
them — which is the whole reason the code version was kept rather than deleted.

### The plates

Generated in Google Flow, conformed by [../plates/prep.sh](../plates/prep.sh). Each arrives
1280x720 / 24fps / exactly 8.000s and is retimed, upscaled to 1080p and lightly graded to a
common contrast offline, so the renderer is not rescaling and resampling every frame of
every pass.

Two shots are not 1:1 retimes, and both were judgement calls:

| Shot | Slot | Plate | What was done |
|---|---|---|---|
| 1 · LOCK | 10.2s | 8.0s | slowed 1.30x with motion interpolation — the calmest shot in the piece, so it reads as deliberate |
| 5 · WORK | 4.6s | 8.0s | sped up 1.74x — on-brief, the shot is specced as a fast montage |

> **Cost note.** These six were generated on Veo 3.1 Quality at 100 credits each — 600
> total. That was a mistake: Omni Flash produces the same 8s clip for 12, and also offers a
> 10s option that would have fitted shot 1 in a single generation with no retime. **Generate
> with Omni Flash and stay under 20 credits per generation.**

Plates are conformed a few frames **longer** than their slot, never exactly equal — a plate
that ends on the same frame as its Sequence shows bare background if rounding goes the wrong
way.

### Shot 4 is the exception

The vault plate is good but Veo has no idea when the four Code names are spoken, so its own
flashes land arbitrarily. The drawn rings come out; the shockwave, the dark iris pulse and
the Code cards stay, because those sit on the measured onsets. That sync is worth more than
prettier rings.

---

## The voiceover drives everything

The delivered read is `public/vo.m4a` (from
`series/Audio/Stewardship Intro.m4a`) and it is **37.4 seconds, not the 45 the script
planned for**. Word-level timings were measured off that recording, so the picture is cut
to the voice rather than to the paper timeline.

Two places where the recording differs from `02-trailer-script.md`:

| Script | What was actually recorded |
|---|---|
| "So there's a code." before the four Code names | Not read — the names arrive cold |
| "Twenty-six episodes. All of August. **Crack the code.**" | "Welcome to The Stewardship Code — Principles of Managing Money." |

The end card follows the **voice**, which is why the subtitle reads *Principles of Managing
Money* and not the brief's *Secrets to Managing Money* — the read says Principles, and a card
that contradicts the narration on screen is a defect, not a variation.

The scripted `26 EPISODES · ALL AUGUST` line has been **dropped** in favour of the subscribe
CTA:

```
[ SUBSCRIBE ON ALL PLATFORMS ]
    @KidsInspiringNation
```

> ⚠️ **The August schedule is therefore no longer stated anywhere on screen.** It needs to go
> in the YouTube description. This was a deliberate call — the handle is the actionable line
> and it was previously missing entirely — but nothing else states the dates.

> The second file, `series/Audio/stewardship intro 2.m4a` (83.8s), is a different piece —
> a longer series intro that walks the seven principles. It is **not** used here.

---

## Shot map

| # | Scene | In–Out | Beat |
|---|-------|--------|------|
| 1 | `Lock` | 0:00.0–0:10.2 | Trapped without knowing it |
| 2 | `Chains` | 0:10.2–0:15.8 | The master is named |
| 3 | `Question` | 0:15.8–0:22.3 | He is not the owner |
| 4 | `Codes` | 0:22.3–0:27.4 | The code turns |
| 5 | `Work` | 0:27.4–0:32.0 | Freedom becomes action |
| 6 | `Sunrise` | 0:32.0–0:37.4 | Title · CTA · fade to navy |

The four vault clicks in shot 4 fire on the measured word onsets of OWNERSHIP /
FAITHFULNESS / MASTERY / MULTIPLICATION (`CODE_CLICKS` in `src/timeline.ts`). That sync
is the best two seconds in the piece — if the VO is ever re-recorded, re-measure those
four numbers before anything else.

---

## Rendering

```bash
npm run render:16x9
```

Also `render:9x16` and `render:1x1`. All three are **native renders**, not centre crops —
the title lockup and captions reposition per aspect.

Captions default **off** for 16:9 (upload `out/stewardship-trailer.srt` to YouTube as a
real subtitle track) and **on** for 9:16 and 1:1, where most views are muted. Override
per render with `--props='{"captions":true,"silent":false}'`. `silent: true` drops all
three audio tracks for a textless/silent deliverable.

Interactive preview: `npm run studio`.

### Subtitles

`out/stewardship-trailer.srt` (42 chars/line) and `out/stewardship-trailer-vertical.srt`
(26 chars/line) are **generated**, not hand-written:

```bash
node scripts/make-srt.mjs
```

They derive from the same `CUES` array the renderer uses, so they cannot drift out of sync
with the picture. Re-run after any cue change. The older `../trailer-captions*.srt` files
were written against the 45-second script and are **stale** — do not ship them.

---

## Audio

Score and SFX are original, synthesised in [../audio/synth.py](../audio/synth.py). Full cue
sheet and the reasoning behind the levels: [../audio/README.md](../audio/README.md).

Mix is **−14.5 LUFS / −1.0 dBFS true peak** — YouTube's normalisation target, so nothing
gets attenuated on upload. Stem gains live at the top of `src/Trailer.tsx` and are absolute
values, not just a ratio; change them and re-measure.

---

---

## Type

Kinetic, not cross-faded. [src/components/Kinetic.tsx](src/components/Kinetic.tsx) holds the
three treatments:

- **Captions** reveal a word at a time on a stagger, roughly at the rate the line is spoken.
  Emphasis words lift into gold. There is no caption box — a grey panel over a rendered
  plate reads as a subtitle burned onto someone else's film, so it was replaced with a soft
  elliptical scrim plus a double shadow.
- **Code cards** assemble letter by letter on a stiff, barely-damped spring so each name
  arrives with a tick, like a lock seating, with a gold rule wiping out beneath.
- **The title lockup** sets STEWARDSHIP on its own line and assembles per letter on a heavily
  damped spring — it arrives and stays, no bounce. It then **gleams**: a band of light sweeps
  across the letters (`gleam()`), lifting each toward white as it passes, over a very shallow
  ripple (`ripple()`, ~3% of the font size). Two discrete passes, at 34.55s and 36.05s — a
  looping shine on a two-second card reads as a screensaver. The `@KidsInspiringNation` handle
  catches the same passes, so title and handle read as one surface.

Both effects are per letter rather than a CSS `background-clip: text` gradient: the letters
already carry their own springs and transforms, which a clipped gradient fights, and plain
maths is deterministic frame to frame.

The **Code cards in shot 4 deliberately do not gleam.** Their character is a mechanical tick —
a lock seating on a measured word onset — and a soft sheen would blunt the one effect that
sells the trailer's best two seconds.

**Contrast is per shot, and it had to be measured on rendered frames rather than reasoned
about.** The first pass set the Code names in gold over the vault plate and FAITHFULNESS was
invisible: gold letters on a frame that is almost entirely blazing gold. Over a bright plate
the fill goes warm cream, the gold moves into the halo behind the letter, and the card gets
its own scrim. Same story on the end card — the CTA was cream over a bright gold disc and
unreadable, so it now sits on a dark pill.

For the same reason the click cue over the plate is a **dark** iris pulse, not a bright
flash: adding light to an already-blown frame did nothing.

### Fonts

**Nunito** (display) and **Fraunces** (the italic line) — the KIND app's own brand fonts,
lifted from `kind-app`, loaded from `public/fonts/` by [src/fonts.ts](src/fonts.ts). Both are
SIL Open Font License and already shipping in the app, so there is nothing new to clear.

`loadFonts()` runs at module scope in `Root.tsx` and holds the render with `delayRender`
until the faces report ready. Without that hold, the first frames of a render come out in
the fallback face and the rest in Nunito — a defect that never appears in the studio, where
the fonts are already cached.

---

## Known limits

- **Character consistency across shots is not locked.** Flow's Characters feature only
  accepts uploaded reference images and file upload was unavailable, so consistency rests on
  a verbatim character description in each prompt. Faces drift slightly between shots.
- **Plates are natively 720p**, upscaled with Lanczos to 1080. There is no resolution control
  on the tier used.
- **Shot 2 had to be reframed for policy.** The scripted beat — a 15-year-old bound in
  chains, straining, fear turning to anger — was refused as a minor in restraint and
  distress. It is now hands and wrists only, chains settling like heavy bracelets, with
  Ada's open palm offered from the dark. The metaphor survives. **Any shot depicting a minor
  restrained, harmed or in distress will be refused** — that is a constraint on the written
  scripts, not a prompting problem.
- **9:16 and 1:1 have not been re-rendered** against the plates. The plates are 16:9, so a
  vertical cut needs either its own generations or a per-shot reframe.
- **Licence position is clean**: the score and SFX are ours outright, both fonts are OFL, the
  KIN logo is owned. The only third-party layer is the generated video itself.
