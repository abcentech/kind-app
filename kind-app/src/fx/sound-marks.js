// KIND v7 · sound-marks — the moments inside a cue that the picture should land on.
//
//   import { sound } from './sound.js';   const { lift } = sound.marks('launch')      // seconds from the start of the cue
//   setTimeout(flashIgniteWash, lift * 1000)                                           // the screen flashes ON the lift, not near it
//
// Tiny and dependency-free on purpose: sound.js imports it eagerly (the synth chunk is lazy), and sound-synth.js schedules its notes from
// these same numbers, so the picture and the sound cannot drift apart when a cue is re-tuned. tools/audio-render.mjs checks every mark
// against the rendered audio: there has to be a real onset at the time it names.
// Seconds at rate 1; sound.marks(cue, rate) divides by the rate the cue is played at.

export const MARKS = {
  correct: { resolve: 0.095 },                        // the second note: F# lands, A answers — flip the verdict LED here
  combo:   { top: 0.17 },                             // the bell on top of the rising triad
  streak:  { catch: 0.12 },                           // the flame catches: first rising bell, after the low fwump at 0
  unlock:  { release: 0.1 },                          // the lock lets go
  go:      { go: 0.1 },                               // mission control says go
  ring:    { close: 0.21 },                           // the ring meets its start: the glass note
  reveal:  { flip: 0.13 },                            // the card snaps over (the glass rings 40 ms later)
  chest:   { burst: 0.3, chime: 0.66 },               // the lid is up and the cascade begins · the resolving bell
  rare:    { chord: 0.56 },                           // the run lands on the held gold chord
  rankup:  { impact: 0.5 },                           // the ladder hits the wide chord: the insignia slams in
  launch:  { lift: 1.95 },                            // liftoff: the swell breaks on a D chord. flash, shake, raise the lesson
  complete:{ hit: 1.1 },                              // orbit reached: the big bell over the stacked fifths
  splash:  { redline: 0.86, wordmark: 0.78, ember: 1.04 },   // needle at the top · the wordmark tracks in · the ember pops
}

/** Marks that are gestures, not hits (the apex of a pitch glide, the start of a sweep): the audit checks the cue is sounding there, not for an onset. */
export const SOFT = { splash: ['redline', 'wordmark'] }

/** Marks of a cue in seconds at `rate` (opts.rate of the play call, default 1). Unknown cue or none → {}. */
export function marksOf(cue, rate = 1) {
  const m = MARKS[cue], r = Math.min(2, Math.max(0.5, +rate || 1)), out = {}
  if (m) for (const k in m) out[k] = m[k] / r
  return out
}
