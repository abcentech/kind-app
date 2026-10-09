// How the screens are expected to fire cues, as data: steps = [cue, atMs, opts?].
// One source for the playground's Sequences row and for tools/audio-render.mjs, which renders every flow offline through the real master
// (ducks and all) and fails the audit if a stack of cues clips. These are also the reference for the wave-2 screens: if a flow here
// sounds crowded, the screen that fires it will too.
import { MARKS } from '../src/fx/sound-marks.js'

const L = MARKS.launch.lift * 1000

export const FLOWS = [
  { id: 'lesson', label: 'Lesson flow', hint: 'dock, sheet, next, answer, check, correct, +XP ticks, combo',
    steps: [['nav', 0], ['open', 380], ['next', 950], ['select', 1500], ['check', 2000], ['correct', 2200], ['xp', 2650, { step: 0 }], ['xp', 2740, { step: 1 }], ['xp', 2830, { step: 2 }], ['combo', 3200]] },
  { id: 'wrong', label: 'Wrong answer', hint: 'never a buzzer: select, check, soft double-thud, next',
    steps: [['select', 0], ['check', 500], ['wrong', 700], ['next', 1600]] },
  { id: 'launch', label: 'Launch', hint: 'the start button, then the swell that lifts on a mark',
    steps: [['ignite', 0], ['launch', 380], ['open', 380 + L]] },
  { id: 'orbit', label: 'Orbit insertion', hint: 'fanfare, +XP counting, rings closing, supply drop: chest, card flip, gold',
    steps: [['complete', 0], ['xp', 1000, { step: 0 }], ['xp', 1100, { step: 1 }], ['xp', 1200, { step: 2 }], ['xp', 1300, { step: 3 }], ['ring', 1600, { step: 0 }], ['ring', 2000, { step: 1 }], ['ring', 2400, { step: 2 }], ['chest', 3600], ['reveal', 5200], ['rare', 6000]] },
  { id: 'cold', label: 'Cold start', hint: 'the ignition splash, then the first tap',
    steps: [['splash', 0], ['tap', 3000]] },
  { id: 'streak7', label: 'Streak day 7', hint: 'flame, shield earned, medal',
    steps: [['streak', 0], ['shield', 1500], ['medal', 3000, { tier: 'gold' }]] },
  { id: 'rank', label: 'Rank up', hint: 'ladder into impact, then the medal that came with it',
    steps: [['rankup', 0], ['medal', 2400, { tier: 'silver' }]] },
  { id: 'count', label: 'Countdown', hint: 'T-3, T-2, T-1, then mission control says go (go replaces the final pip: they share D5 and A5)',
    steps: [['countdown', 0], ['countdown', 1000], ['countdown', 2000], ['go', 3000]] },
  { id: 'settings', label: 'Settings', hint: 'toggle on/off, a slider scrubbed up the scale, unlock, error, select',
    steps: [['toggle', 0, { on: true }], ['toggle', 700, { on: false }], ...[0, 1, 2, 3, 4, 5, 6].map((s, i) => ['detent', 1300 + i * 70, { step: s }]), ['unlock', 2100], ['error', 2900], ['select', 3500], ['deselect', 3900]] },
]
