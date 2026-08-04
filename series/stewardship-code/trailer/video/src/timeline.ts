// Beat timings are NOT from the written script — they were measured off the delivered
// VO (public/vo.m4a, "Stewardship Intro.m4a") with word-level ASR, then rounded to the
// nearest sensible frame. The recorded read is 37.4s, not the 45s the script planned for,
// so every shot below is shorter than 02-trailer-script.md says. Picture follows the
// voice, not the paper.
export const FPS = 30;
export const VO_DURATION = 37.4;
export const DURATION_IN_FRAMES = Math.round(VO_DURATION * FPS); // 1122

export const PALETTE = {
  navy: '#1F3864',
  navyDeep: '#0B1526',
  blue: '#2E75B6',
  gold: '#B8860B',
  goldHot: '#F0C24B',
  teal: '#2A9D8F',
  cream: '#F4EFE4',
};

export type Shot = {
  id: string;
  /** seconds */
  from: number;
  to: number;
};

// Six shots, cut on the breaths between VO phrases rather than on a fixed grid.
export const SHOTS: Shot[] = [
  {id: 'lock', from: 0.0, to: 10.2},      // "Everybody serves a master…choose."
  {id: 'chains', from: 10.2, to: 15.8},   // "Money is a great servant. And a terrible god."
  {id: 'question', from: 15.8, to: 22.3}, // "The first question was never…Whose is it?"
  {id: 'codes', from: 22.3, to: 27.4},    // the four Code names
  {id: 'work', from: 27.4, to: 32.0},     // "Be faithful in the little…"
  {id: 'sunrise', from: 32.0, to: 37.4},  // title card + CTA
];

/**
 * The four vault clicks land on the first frame of each spoken Code name.
 *
 * These are onsets measured off a 10ms RMS envelope of the delivered read, NOT the
 * ASR word timings. ASR gave "multiplication" a degenerate 60ms span starting at
 * 26.02 — it actually begins at 25.48 and runs to ~26.35. Trusting that timestamp put
 * the most important sync in the trailer half a second late, and dropped the music
 * out on top of the word instead of before it.
 */
export const CODE_CLICKS = [
  {t: 22.72, label: 'OWNERSHIP'},
  {t: 23.75, label: 'FAITHFULNESS'},
  {t: 24.60, label: 'MASTERY'},
  {t: 25.48, label: 'MULTIPLICATION'},
];

export type Cue = {from: number; to: number; text: string; gold?: boolean};

// Caption text is the SCRIPT wording (02-trailer-script.md), timed to the measured read.
// ASR mis-heard three words — "servant" as "event", "asks" as "acts", and the title as
// "stereotypical" — so the transcript was used for timing only, never for copy.
export const CUES: Cue[] = [
  {from: 0.96, to: 2.9, text: 'Everybody serves a master.'},
  {from: 3.18, to: 6.5, text: 'Most people never find out who theirs is —'},
  {from: 6.5, to: 10.1, text: 'until money asks them to choose.'},
  {from: 10.62, to: 12.6, text: 'Money is a great servant.'},
  {from: 12.9, to: 15.6, text: 'And a terrible god.'},
  {from: 16.02, to: 19.8, text: 'The first question was never\n"How much do I have?"'},
  {from: 20.16, to: 22.2, text: 'It is — "Whose is it?"'},
  {from: 22.72, to: 23.7, text: 'OWNERSHIP.', gold: true},
  {from: 23.75, to: 24.55, text: 'FAITHFULNESS.', gold: true},
  {from: 24.60, to: 25.44, text: 'MASTERY.', gold: true},
  {from: 25.48, to: 26.6, text: 'MULTIPLICATION.', gold: true},
  {from: 27.7, to: 28.9, text: 'Be faithful in the little.'},
  {from: 29.16, to: 31.9, text: "Don't bury what He puts in your hands."},
  {from: 32.32, to: 36.6, text: 'Welcome to The Stewardship Code —\nPrinciples of Managing Money.'},
];

export const sec = (s: number) => Math.round(s * FPS);
