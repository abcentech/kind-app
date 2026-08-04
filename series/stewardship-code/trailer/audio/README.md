# Score & SFX — *The Stewardship Code* trailer

Everything in this folder is **synthesised from scratch** by [synth.py](synth.py) — no sample
libraries, no AI music service, no third-party stems, no loops.

That was a deliberate choice. Brief §7 wants every asset cleared for commercial use with the
licence logged, and AI-generated music sits under a platform's terms that a human has to read
and accept. Code we wrote ourselves needs nobody's permission. **Licence status: owned,
cleared, no attribution required.**

## Files

| File | What it is |
|---|---|
| `music-bed.wav` | the score alone — 37.55s, 48 kHz stereo |
| `sfx.wav` | every sound effect alone, same length |
| `music-and-sfx.wav` | the two pre-balanced, for cutting outside Remotion |
| `synth.py` | the source. Regenerate with `python synth.py` |

The video build uses AAC copies at `video/public/music.m4a` and `video/public/sfx.m4a`.
Re-encode after any change:

```bash
ffmpeg -i audio/music-bed.wav -c:a aac -b:a 256k -ar 48000 video/public/music.m4a -y
```

## The score

**D minor throughout, turning to D major on the final chord.** That Picardy third is the whole
emotional arc in one move — trapped resolves to free. 92 BPM.

Instruments are all built in code: a bowed-string stack (detuned voices, independent drift,
vibrato), a darker cello variant with bow noise for the drone, an "ah" choir with formant
filtering and breath, a struck piano with inharmonic partials, and sub pulses. Reverb is
convolution against a synthetic hall impulse.

| Shot | Time | What the score does |
|---|---|---|
| 1 · LOCK | 0.0–10.2 | low cello drone on D, nothing else — the VO owns this shot |
| 2 · CHAINS | 10.2–15.8 | drone rises, the fifth tightens to a minor sixth; drops dark and quiet on *"a terrible god"* |
| 3 · QUESTION | 15.8–22.3 | near-silence — one sustained high string in a wide hall, 14 dB below the peak |
| 4 · CODES | 22.3–27.4 | struck piano chord on each vault click; **music cut dead** in the gap before click four |
| 5 · WORK | 27.4–32.0 | four climbing string entries, percussion on the beat |
| 6 · SUNRISE | 32.0–37.4 | full strings and choir resolving to one sustained D, ringing into the fade |

### Verified, not assumed

Measured per-second RMS off the rendered file:

```
open  −28 dB  ·  chains peak  −15 dB  ·  QUESTION −29 dB  ·  click four −17 dB  ·  tail −28 dB
```

The pre-click-four silence measures **−70 dB** against −18 dB either side. It needed gating
**after** the reverb pass as well as before; gating only the dry signal left the hall tail
smearing across the gap and it measured as a 13 dB dip rather than a cut.

### The clicks are measured, not transcribed

The four vault clicks fall at **22.72 · 23.75 · 24.60 · 25.48**, taken from a 10 ms RMS
envelope of the read.

The ASR pass used to build the first cut gave *"multiplication"* a degenerate 60 ms span
starting at 26.02. It actually begins at **25.48**. Trusting the transcript put the single most
important sync in the trailer half a second late and dropped the music out *underneath the
spoken word* instead of before it — the exact opposite of the intended effect. Word timings
from ASR are reliable for ordinary speech and unreliable at phrase ends; anything load-bearing
gets measured off the waveform.

One honest deviation: the script asks for a half-second of silence before click four. The
delivered read leaves only **260 ms** of true gap between "mastery" and "multiplication", so
the gate is 300 ms. Holding the full 500 ms would have muted the music under a spoken word.

## Levels

The finished mix is **−14.5 LUFS integrated, −1.0 dBFS true peak** — YouTube's normalisation
target, so nothing gets turned down on upload.

An earlier pass sat at −10.6 LUFS with 0.2 dB of headroom. That is a common trailer mistake:
it sounds louder in isolation, then every platform attenuates it and the dynamic range that
the quiet shots depend on is gone. Levels were solved by pre-mixing the three stems with
ffmpeg and measuring, rather than by re-rendering the video each time.

## SFX cue sheet

Every cue is an absolute second and matches `src/timeline.ts`. Change one, change both.

| Time | Cue |
|---|---|
| 0.15 | blank disc spinning to rest on wood |
| 6.15 | phone buzz — lands on the buzz-flash in `Lock.tsx` |
| 10.55 | chains erupt and coil |
| 12.25 | the taut creak after |
| 13.35 | low impact on *"a terrible god"* |
| 15.85 | one distant swell, then near-silence by design |
| 22.72 / 23.75 / 24.60 / 25.48 | the four vault clicks, each heavier than the last |
| 25.50 | glass shattering into wind chimes |
| 27.52 → 32.0 | pencil · broom · disc ring · hammer, on 92 BPM beats |
| 32.05 / 32.55 | title impact, then the disc ringing as it's caught |

## Stem balance

Set in `src/Trailer.tsx`: **VO 0.635 · SFX 0.368 · music 0.267**. No dynamic ducking — the
score was composed around the voice, with the quiet shots written quiet rather than compressed
quiet. Change these and re-check the integrated loudness; they are absolute, not just a ratio.

## If you want changes

Edit the cue sheet at the bottom of `synth.py` and re-run. Common asks:

- **More weight on the vault clicks** — raise the `weight=` argument in the `vault_click` loop
- **Warmer strings** — drop `bright=` on the `strings()` calls
- **Longer tail** — raise `DUR` and the release on the final `strings(D5, …)`
