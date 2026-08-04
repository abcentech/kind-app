# THE STEWARDSHIP CODE — Animated Series
## Series bible · 4 episodes · 3–5 min each

An anime-style animated adaptation of the August 2026 devotional month. Four episodes, one
per Code, built from the 26 existing shorts rather than invented from scratch.

Source of truth for content: [`../00-series-overview.md`](../00-series-overview.md) and
`../shorts/`. Source of truth for look and cast: the trailer
([`../trailer/00-trailer-brief.md`](../trailer/00-trailer-brief.md)) — this series is its
continuation, not a reboot.

---

## The four episodes

| Ep | Code | Sub-theme | Passage | Question the episode answers | Draws on shorts |
|----|------|-----------|---------|------------------------------|-----------------|
| 1 | **THE OWNERSHIP CODE** | God owns it; I manage it | Luke 16:1–2 · Ps 24:1 | Whose is it, actually? | 02–07 |
| 2 | **THE FAITHFULNESS CODE** | Manage little before asking for more | Luke 16:10–12 | Can God trust me with what's already in my hands? | 08–13 |
| 3 | **THE MASTERY CODE** | Christ my Master, money my servant | Luke 16:9–13 | Do I control money, or does it control me? | 14–19 |
| 4 | **THE MULTIPLICATION CODE** | Build it, grow it, send it ahead | Luke 19:11–26 | What am I doing to increase what He gave me? | 20–26 |

Each episode ends on the same two lines — **"Christ my Master. Money my servant."** — spoken
by Micah, and each time he means it more.

---

## Format (locked)

**Runtime 3:45–4:15.** Not 5: at 12 credits per 10-second generation, every extra 30 seconds
of runtime is 3 more generations per episode. 4 minutes is the honest maximum for the budget.

| Beat | Time | Function |
|------|------|----------|
| Cold open | 0:00–0:30 | A concrete teenage situation. No narration, no scripture. Just the problem. |
| Title | 0:30–0:38 | THE STEWARDSHIP CODE + the Code of the week |
| Complication | 0:38–1:45 | Micah acts on his assumption and it costs him something |
| The turn | 1:45–2:25 | Ada, or the Voice, asks the question that reframes it. Scripture lands here. |
| The Code | 2:25–3:15 | The principle taught plainly, with one concrete image |
| Decision | 3:15–3:45 | Micah chooses. Visible, physical, not a feeling. |
| Challenge + end card | 3:45–4:10 | The week's challenge, the declaration, subscribe |

**Aspect:** 16:9 master first (YouTube), 9:16 cutdown second. Generate plates in 16:9 only —
the 9:16 pass gets its own generations later, not centre crops. That lesson is already paid
for; see the trailer's `prep9.sh`.

---

## Cast

Unchanged from the trailer — same character descriptions, verbatim, in every Flow prompt.
Flow's Characters feature needs an uploaded reference image and file upload is blocked in
this environment, so verbatim description is the only consistency mechanism available.

**MICAH — 15, male.** Warm brown skin, short cropped black hair faded at the sides, dark
brown eyes with gold flecks, a navy hoodie with a thin gold zip over a white tee, dark jeans,
worn canvas sneakers.

**ADA — 15, female.** Deep brown skin, black box braids gathered back with one gold cuff,
warm hazel-brown eyes, a teal denim jacket over a cream tee, dark jeans.

**MR OKAFOR — 50s, male.** New for the series. Runs the corner electronics shop. Grey at the
temples, wire-rim glasses, short-sleeved patterned shirt. He is the adult who asks questions
instead of giving answers.

### Policy boundary — read before writing any prompt

Veo **refused** a trailer shot depicting a 15-year-old bound in chains and straining. A minor
in restraint or distress is a hard refusal, regardless of styling. Refusals aren't charged,
but they cost time.

The workaround that passed: **hands and objects, no faces, no stated age, no struggle.**
Chains "settle like heavy bracelets"; hands "stay relaxed." Every prompt keeps the words
*anime, cel-shaded, illustrated* — they are load-bearing, not decoration.

---

## Look

Carried from the trailer: **cel-shaded 2D anime with subtle 3D camera depth.** Deep navy
shadows, hot molten gold highlights, one accent of warm teal. Volumetric god-rays. Clean
confident linework. Never photorealistic.

**Negative prompt, every generation:**
```
no text, no letters, no numbers, no watermarks, no currency, no banknotes, no coins with
faces, no portrait busts, no eagles, no crests, no heraldry, not photorealistic, no extra
fingers, no distorted hands
```
Gold discs are **blank and smooth on both faces** — a coin with a face on it reads as real
currency and drags in the whole minefield of national symbols.

---

## Audio architecture

Three separate stems, mixed in Remotion, exactly as the trailer. Target **−14.5 LUFS /
−1.0 dBFS true peak** so YouTube doesn't attenuate it.

**Flow plates are used silent.** Omni Flash generates native audio, but it cannot be relied
on to speak a scripted line, and the voice changes between generations. Picture and speech
are kept separate so both stay controllable — `prep` strips audio from every plate.

### Voice casting and why it splits across two engines

ElevenLabs has roughly **3,000 credits ≈ 3,000 characters**. Four episodes of full dialogue
is ~11,000 characters, so ElevenLabs cannot carry the whole series. It goes where it counts:

| Role | Engine | Voice | Rationale |
|------|--------|-------|-----------|
| **NARRATOR** | ElevenLabs v3 | *Adeola — Conversational African Female* | The teaching voice. Carries the authority of the series and is the one voice in every episode. Premium here buys the most. |
| **MICAH** | edge-tts | `en-NG-AbeoNeural` +18Hz / +6% | Lightened toward a teenager. **This is the weakest link** — see below. |
| **ADA** | edge-tts | `en-NG-EzinneNeural` +12Hz / +4% | Holds up well; the warmth suits the character. |
| **MR OKAFOR** | edge-tts | `en-KE-ChilembaNeural` −6% | Older, slower, unhurried. |

Nigerian and Kenyan English throughout — KIN is a Nigerian organisation and a wall of
American accents would be a strange choice for this audience.

**Honest limitation:** no neural TTS has a convincing 15-year-old boy. Pitching an adult
voice up gets close enough to cut picture against, and teenagers will still clock it. Budget
narration to ~750 characters per episode to stay inside ElevenLabs, and treat Micah and Ada
as replaceable — one afternoon with two young voice actors upgrades the whole series without
touching a frame.

### Score and SFX

Original, synthesised — same approach and licence position as the trailer
(`../trailer/audio/synth.py`): owned outright, cleared, no attribution, no platform terms.
Each episode gets its own cue sheet in D minor, resolving to D major on the decision beat.

ElevenLabs Music is available and is the alternative if bespoke scoring proves too slow, but
it puts the soundtrack under a platform licence that a human has to read and accept, and
brief §7 wants every asset cleared. Synthesis stays the default.

---

## Budget

| Item | Per episode | Series |
|------|-------------|--------|
| Flow generations (Omni Flash, 10s, 12cr) | ~24 = 288 cr | ~1,150 cr |
| Re-rolls at 40% | ~115 cr | ~460 cr |
| **Flow total** | | **~1,600 of 10,000** |
| ElevenLabs narration | ~750 chars | ~3,000 of 3,000 |

**Hard rule: nothing above 20 credits per generation.** Veo 3.1 Quality is 100 credits and is
not used in this series — at 96 generations it would cost 9,600 credits for four episodes.
Omni Flash also uniquely offers **10-second** clips where Quality is fixed at 8, which is
what makes 24 generations per episode enough.

Nothing is purchased. If credits run out, the series stops and we discuss — it does not get
topped up.

---

## Build order per episode

1. Script locked (`0N-ep-script.md`) — timed to the beat table above
2. Voice generated (`voices/`) — narration and dialogue as separate stems
3. **Picture cut to the measured VO**, never to the paper timings. The trailer's most
   important sync was half a second late because an ASR word timestamp was trusted over the
   waveform. Onsets get measured off a 10 ms RMS envelope.
4. Shot list written against the real timings (`0N-shotlist.md`)
5. Flow generations, downloaded and QC'd against the checklist
6. Score and SFX to the locked picture
7. Assemble in Remotion, render, measure loudness

### Downloading from Flow — known trap

Flow's download button produces **22-byte empty ZIPs** (`PK\x05\x06`, no entries) when the
batch path fires with nothing selected. It fails silently: you get a file, it contains
nothing. Pull plates from the signed CDN URL on the `<video>` element instead, and ffprobe
every one before filing it.

---

## QC checklist (every plate)

- [ ] No text, letters or numbers anywhere in frame
- [ ] Gold discs blank — no faces, busts, eagles, crests
- [ ] Hands: five fingers, no distortion
- [ ] Character matches the description — no face drift between shots
- [ ] Illustrated anime, not photoreal
- [ ] Empty space where type has to land
- [ ] Audio stripped
