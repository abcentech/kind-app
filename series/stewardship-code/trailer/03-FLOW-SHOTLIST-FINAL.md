# FLOW SHOT LIST — FINAL · *The Stewardship Code* trailer

> **This file supersedes the timings in [01-google-flow-prompts.md](01-google-flow-prompts.md).**
> The prompt bodies there were written for a 45-second cut. The **delivered VO is 37.4s**
> (`series/Audio/Stewardship Intro.m4a`), so every shot is shorter and the four vault clicks
> land at different times. Use the timings and prompts **on this page**.

**8 generations total** — 6 shots, with shot 1 split in two because it needs 10.2s and Flow
caps at 8s. Do the 16:9 pass first and only re-run 9:16 for shots that actually get used.

---

## What to generate, and how long each must survive

Times are absolute seconds in the finished trailer, measured from the delivered read.

| # | Shot | In–Out | **Needs** | Flow gives | Note |
|---|------|--------|-----------|-----------|------|
| 1A | THE LOCK — the boy | 0.0–5.4 | 5.4s | 8s | trim the tail |
| 1B | THE LOCK — the reveal | 5.4–10.2 | 4.8s | 8s | trim the tail |
| 2 | THE CHAINS | 10.2–15.8 | 5.6s | 8s | |
| 3 | THE QUESTION | 15.8–22.3 | 6.5s | 8s | |
| 4 | THE FOUR CODES | 22.3–27.4 | 5.1s | 8s | ⭐ generate the most variants here |
| 5 | PUT IT TO WORK | 27.4–32.0 | 4.6s | 8s | |
| 6 | SUNRISE | 32.0–37.4 | 5.4s | 8s | leave sky headroom for the title |

**The four vault clicks in shot 4 fall at 22.66 · 23.82 · 24.72 · 26.02.** Those are measured
word onsets from your read — the gap before the fourth is deliberately the longest, and the
score already goes dead silent for the half-second before it. Shot 4 only has to *contain*
four distinct ring slams; I'll retime them onto those exact frames in the edit.

---

## Settings

- **Model:** newest Veo available · **Ratio:** 16:9 first, then 9:16 · **Resolution:** highest offered
- **Lock characters first.** Generate one still each of Micah and Ada, then attach them as
  **Ingredients** on every shot they appear in. Skipping this is the single biggest cause of a
  trailer that falls apart between cuts.
- **3–4 variants per shot.** Roughly one in three is usable.
- **Negative prompt** (paste on every single generation):

```
photorealistic, live action, real human children, 3D Pixar style, claymation, text, letters,
words, numbers, watermark, logo, subtitles, captions, currency, banknotes, coins with faces,
portrait busts, eagles, crests, heraldry, distorted hands, extra fingers, extra limbs, warped
faces, blurry, low resolution, oversaturated neon, chaotic composition, grotesque, horror,
flickering, morphing faces
```

> **On the coins.** Every prompt below says **blank unmarked discs**, never just "coins."
> Asking a model for coins pulls real minted currency out of its training data — we lost three
> clips to a monarch's profile and `EUR` lettering on the last trailer. Name the *object*
> ("smooth blank disc"), never the *category*, and it behaves.

---

## SHOT 1A — THE LOCK · 0:00–5.4 · *needs 5.4s*
**VO over this:** *"Everybody serves a master. Most people never find out who theirs is…"*

```
Modern anime, cel-shaded 2D-look with subtle 3D camera depth. A 15-year-old boy named MICAH —
warm brown skin, short cropped black hair faded at the sides, dark brown eyes with gold flecks,
navy hoodie with a thin gold zip over a white tee, dark jeans — sits alone on the floor of a dim
bedroom at night, back against the bed, knees drawn up. A few smooth blank unmarked gold discs
and a glowing phone lie on the rug in front of him. The phone light is the only light on his
face and it makes him look small. He stares down at the discs, then slowly lifts his head toward
camera. Camera: one slow deliberate push in on his face. Dust motes drift through the phone glow.

Style: cinematic anime film quality, high-budget theatrical anime opening. Clean confident
linework, high-contrast dramatic lighting, volumetric god-rays, lens flare, fine floating dust.
Palette: deep navy and midnight indigo shadows, hot molten gold highlights, one accent of warm
teal. Anamorphic lens, shallow depth of field, deliberate weighty camera movement. Mood:
lonely, quiet, watched.

No text, no letters, no numbers in frame. The gold discs are completely blank and smooth on both
faces. Stylized illustrated anime — not photorealistic.
```

## SHOT 1B — THE LOCK, THE REVEAL · 5.4–10.2 · *needs 4.8s*
**VO:** *"…until money asks them to choose."*
*Use the last frame of 1A as the first frame of 1B (Frames to Video) so the room matches.*

```
Modern anime, cel-shaded 2D-look with subtle 3D camera depth. The same 15-year-old boy MICAH —
warm brown skin, short cropped black hair faded at the sides, navy hoodie with a thin gold zip
over a white tee — sits on the floor of his dim bedroom at night, lit only by a glowing phone.
Camera: one continuous smooth pull back and upward, revealing that the shadows thrown across the
bedroom wall behind him have resolved into the shape of an enormous circular vault lock with
concentric rings and tumbler notches — and MICAH is sitting at its exact centre, small, like a
keyhole. He does not move. The shadow lock is subtle at first and unmistakable by the end.

Style: cinematic anime film quality, high-budget theatrical anime opening. Clean confident
linework, high-contrast dramatic lighting, volumetric god-rays, fine floating dust. Palette: deep
navy and midnight indigo shadows, hot molten gold highlights. Anamorphic lens, single continuous
pull-back, deliberate and weighty. Mood: dawning unease, trapped without knowing it.

No text, no letters, no numbers in frame. Stylized illustrated anime — not photorealistic.
```

---

## SHOT 2 — THE CHAINS · 10.2–15.8 · *needs 5.6s*
**VO:** *"Money is a great servant. And a terrible god."*
*The chains must be beautiful. Mammon is attractive, not repulsive — that's the theology.*

```
Modern anime, cel-shaded 2D-look with subtle 3D camera depth. The 15-year-old boy MICAH — warm
brown skin, short cropped black hair faded at the sides, dark brown eyes with gold flecks, navy
hoodie with a thin gold zip over a white tee — reaches for the glowing phone. As his hand closes
on it, chains of molten gold erupt from the blank gold discs and coil fast around both of his
wrists and forearms, pulling taut. He strains against them, fear turning to anger. The chains are
beautiful — ornate, jewelry-like, glowing, seductive, not ugly. Behind him a 15-year-old girl
named ADA — deep brown skin, black box braids gathered back with one gold cuff, warm hazel-brown
eyes, teal denim jacket over a cream tee — steps out of the dark and extends one open hand toward
him, calm and certain. Camera: fast snap-zoom to the wrists as the chains strike, then a steady
slow arc around to hold both teens — Micah bound in the foreground, Ada open-handed behind him.
In the final second the light goes cold and dim, and the gold dulls.

Style: cinematic anime film quality, high-budget theatrical anime opening. Clean confident
linework, high-contrast dramatic lighting, volumetric god-rays, lens flare. Palette: deep navy
and midnight indigo shadows, hot molten gold highlights, one accent of warm teal. Anamorphic
lens, shallow depth of field. Mood: urgent, tense, on the edge of hope.

No text, no letters, no numbers in frame. The gold discs are completely blank and smooth.
Stylized illustrated anime — not photorealistic.
```

---

## SHOT 3 — THE QUESTION · 15.8–22.3 · *needs 6.5s*
**VO:** *"The first question was never 'How much do I have?' It is — 'Whose is it?'"*
*The theological hinge. It must read as relief, never defeat. The score is near-silent here —
this shot carries itself on scale alone, so keep the camera slow and unbroken.*

```
Modern anime, cel-shaded 2D-look with subtle 3D camera depth. Extreme close-up on the bound hands
of MICAH — a 15-year-old boy with warm brown skin, short cropped black hair faded at the sides,
navy hoodie with a thin gold zip — golden chains still wrapped around his wrists as he grips the
glowing phone. The camera drifts slowly upward past his face and the bedroom walls fall away
entirely, dissolving into a vast starfield. Revealed in a single continuous move: the blank gold
discs, the phone, the bedroom and the whole sleeping city far below are all tiny objects resting
in the palm of an enormous open hand made of soft golden light, filling the sky. The hand is
open, welcoming, made of warm light — providing, never grasping. MICAH looks up at it and his
expression changes from fear to stunned quiet relief, the look of someone realising a weight was
never his to carry.

Style: cinematic anime film quality, high-budget theatrical anime opening. Clean confident
linework, awe-inspiring scale, volumetric god-rays, soft golden light, deep starfield, fine
floating dust. Palette: deep navy and midnight indigo, hot molten gold, one accent of warm teal.
Anamorphic lens, one slow continuous vertical camera move, epic scale against a small figure.
Mood: reverent, vast, unexpectedly tender.

No text, no letters, no numbers in frame. Stylized illustrated anime — not photorealistic.
```

---

## SHOT 4 — THE FOUR CODES · 22.3–27.4 · *needs 5.1s* ⭐
**VO:** *"Ownership. Faithfulness. Mastery. Multiplication."*
**The money shot. Generate 4–6 variants.** If it comes back as chaotic mush, split it into two
generations of two rings each and I'll join them.

```
Modern anime, cel-shaded 2D-look with subtle 3D camera depth. MICAH — warm brown skin, short
cropped black hair faded at the sides, navy hoodie with a thin gold zip — takes ADA's hand; ADA
has deep brown skin, black box braids with one gold cuff, and a teal denim jacket. The bedroom
dissolves into a vast dark vault interior. Four enormous concentric rings of a vault lock, carved
with abstract geometric patterns, hang in the air around the two teens. One after another, each
ring rotates and slams into alignment — four distinct heavy locks in clear sequence, evenly
spaced, each impact firing a shockwave of gold light outward past camera. On the fourth
alignment the golden chains on Micah's wrists shatter into a thousand fragments of light that
rise like embers. He stands to his full height, chest open, chin lifting, freed. Camera: a push
on each rotating ring in turn, then a heroic low-angle hold on the two teens standing together as
the light explodes upward past them.

Style: cinematic anime film quality, high-budget theatrical anime opening. Clean confident
linework, extreme high-contrast dramatic lighting, volumetric god-rays, brilliant lens flares,
embers and rising light fragments. Palette: deep navy and midnight indigo shadows, hot molten
gold highlights, one accent of warm teal. Anamorphic lens, epic scale. Mood: triumphant
revelation.

No text, no letters, no numbers in frame. Stylized illustrated anime — not photorealistic.
```

---

## SHOT 5 — PUT IT TO WORK · 27.4–32.0 · *needs 4.6s*
**VO:** *"Be faithful in the little. Don't bury what He puts in your hands."*
*Only 4.6s survives, so ask for **four** beats, not five — Veo blurs past three or four actions.*

```
Modern anime, cel-shaded 2D-look with subtle 3D camera depth. A fast rhythmic montage of four
brief moments, each about one second, with threads of golden light trailing between them and
gathering upward. One: MICAH — warm brown skin, short cropped black hair faded at the sides, navy
hoodie with a thin gold zip — sits at a desk writing carefully in a notebook by lamplight. Two:
ADA — deep brown skin, black box braids with one gold cuff, teal denim jacket — sweeps the floor
of a small shop, sleeves pushed up, working hard and unbothered. Three: a close shot of a single
smooth blank gold disc being pressed firmly into another teenager's open palm, both hands held a
moment. Four: a tiny green seedling pushing up through soil in a glass jar on a sunlit
windowsill. Camera: four quick confident cuts, each with a small push-in, gold light streaking
between the transitions.

Style: cinematic anime film quality, high-budget theatrical anime opening. Clean confident
linework, warm practical lighting, volumetric god-rays, streaks of gold light between cuts.
Palette: deep navy shadows, hot molten gold highlights, one accent of warm teal. Anamorphic lens,
energetic rhythmic editing. Mood: purposeful, building, alive.

No text, no letters, no numbers in frame. The gold disc is completely blank and smooth on both
faces. Stylized illustrated anime — not photorealistic.
```

---

## SHOT 6 — SUNRISE · 32.0–37.4 · *needs 5.4s*
**VO:** *"Welcome to The Stewardship Code — Principles of Managing Money."*
**Leave the sky empty.** The title lockup and the KIN logo land in that space — if the frame is
full, there is nowhere to put them.

```
Modern anime, cel-shaded 2D-look with subtle 3D camera depth. Dawn. MICAH — warm brown skin,
short cropped black hair faded at the sides, navy hoodie with a thin gold zip over a white tee —
and ADA — deep brown skin, black box braids with one gold cuff, teal denim jacket over a cream
tee — stand together on a city rooftop at sunrise, wind moving their clothes, the skyline warm
and hazy below them. Micah flips a single smooth blank gold disc high into the air; it catches
the sunrise and spins in slow motion. He catches it and closes it firmly inside his fist — a
decision, not a grab. Both teens look up and out toward the light. Camera: slow-motion follow on
the spinning disc against the sun, whip down to the closing fist, then a steady rise and pull
back into a wide silhouette of the two of them against an enormous rising sun, with generous
empty sky above their heads and the two figures low in the frame.

Style: cinematic anime film quality, high-budget theatrical anime opening. Clean confident
linework, warm golden-hour rim light, volumetric god-rays, anamorphic lens flare, dust and haze.
Palette: deep navy shadows giving way to hot molten gold and warm amber, one accent of warm teal.
Shallow depth of field, sweeping camera. Mood: hopeful, resolved, sent out.

No text, no letters, no numbers in frame. The gold disc is completely blank and smooth on both
faces. Stylized illustrated anime — not photorealistic.
```

---

## Where to put the downloads

Save them here, named exactly like this — the assembly step reads these filenames:

```
series/stewardship-code/trailer/plates/
    shot1a_16x9.mp4    shot1a_9x16.mp4
    shot1b_16x9.mp4    shot1b_9x16.mp4
    shot2_16x9.mp4     shot2_9x16.mp4
    shot3_16x9.mp4     shot3_9x16.mp4
    shot4_16x9.mp4     shot4_9x16.mp4
    shot5_16x9.mp4     shot5_9x16.mp4
    shot6_16x9.mp4     shot6_9x16.mp4
```

If you generate several variants of a shot, drop them all in and suffix them `_v1`, `_v2` —
send word and I'll QC them and pick, rather than you having to judge the currency and hand
anatomy checks yourself.

**Partial deliveries are fine.** Every shot you land gets swapped in for the code-rendered
version of that shot; the rest keep the current animation. The trailer stays watchable at every
stage, so there's no need to wait until all eight are done.

---

## QC — reject a take if any of these are true

1. Any text, letter or number is legible anywhere in frame
2. A disc shows a face, bust, eagle, crest or any marking — it must be blank
3. Malformed hands: extra fingers, fused fingers, wrong count
4. Micah's or Ada's face drifts from the previous shot
5. The image reads as photorealistic rather than illustrated anime
6. Shot 4 doesn't have four clearly separate ring slams
7. Shot 6 has no empty sky for the title

---

## What happens after you deliver

I'll grade all the plates to a common gold, retime shot 4 so the ring slams land on
22.66 / 23.82 / 24.72 / 26.02, drop them into the existing Remotion timeline behind the title
cards and captions, and re-render all three aspects against the score. The audio is already
finished and locked — see [audio/README.md](audio/README.md).
