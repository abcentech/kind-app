// Haptics — the same vocabulary on both platforms.
//   haptic.tap()  select()  success()  warning()  error()  heavy()  launch()  pattern([on, off, on, …])
//
// Android / desktop Chrome: navigator.vibrate with hand-shaped patterns.
// iOS Safari 17.4+: no Vibration API, but a hidden <input type=checkbox switch> clicked through its <label>
//   fires the system switch tick. It is a single weight, so patterns become *timed ticks*.
//   (It only fires inside a user-activation window; every UI haptic is called from a tap, so that is fine.)
// Everything is a safe no-op when unsupported, when prefs.haptics is off, or before the first user gesture.
import { prefs } from '../prefs.js'

const nav = typeof navigator !== 'undefined' ? navigator : null
const IOS = !!nav && (/iP(hone|ad|od)/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1))
const CAN_VIBRATE = !!nav && typeof nav.vibrate === 'function'

/* ── Android patterns (ms). Design §6: tap 8 · select 12 · success double-tick · warning 30 · error triple-stutter · heavy 40 ── */
// Ramp for `launch`: pulses lengthen 8→56 ms while the gaps close 120→20 ms (an engine spooling up), then a thump.
const LAUNCH = (() => {
  const a = []
  for (let i = 0; i < 11; i++) { a.push(Math.round(8 + i * 4.8), Math.round(Math.max(20, 120 - i * 10))) }
  a.push(90)
  return a
})()
const ANDROID = {
  tap: 8,
  select: 12,
  success: [10, 48, 16],
  warning: 30,
  error: [18, 44, 18, 44, 30],
  heavy: 40,
  launch: LAUNCH,
}

/* ── iOS: tick times (ms from now). The switch tick merges if two land inside ~40 ms, so keep them apart. ── */
const IOS_TICKS = (() => {
  const launch = []
  let t = 0
  let gap = 150
  while (t < 1250) { launch.push(Math.round(t)); t += gap; gap = Math.max(52, gap * 0.8) }
  launch.push(Math.round(t + 60), Math.round(t + 120))   // the thump: two close ticks read as one heavy one
  return {
    tap: [0], select: [0], success: [0, 90], warning: [0], error: [0, 85, 170], heavy: [0, 48], launch,
  }
})()

/* ── the iOS switch, created on first use ── */
let label = null
function ensureSwitch() {
  if (label) return label
  if (typeof document === 'undefined' || !document.body) return null
  const wrap = document.createElement('div')
  wrap.setAttribute('aria-hidden', 'true')   // not `inert`: WebKit may then refuse the label's synthetic activation
  wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'
  // The synthetic click would bubble to document-level "click outside" handlers (sheets, menus). Stop it here.
  wrap.addEventListener('click', (e) => e.stopPropagation())
  const l = document.createElement('label')
  const i = document.createElement('input')
  i.type = 'checkbox'
  i.setAttribute('switch', '')
  i.tabIndex = -1
  l.appendChild(i)
  wrap.appendChild(l)
  document.body.appendChild(wrap)
  label = l
  return l
}
const iosTick = () => { const l = ensureSwitch(); if (l) l.click() }

let timers = []
function clearTimers() { for (let i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers = [] }

const enabled = () => prefs.get('haptics') !== false
// Chrome logs an "[Intervention] Blocked call to navigator.vibrate" until the page has been tapped.
const activated = () => !nav.userActivation || nav.userActivation.hasBeenActive

let lastAt = 0
function fire(name, androidPattern, iosTicks) {
  if (!enabled()) return
  const now = performance.now()
  if (now - lastAt < 14) return           // two taps in one frame are one tap
  lastAt = now
  if (CAN_VIBRATE) {
    if (activated()) nav.vibrate(androidPattern || ANDROID[name])
  } else if (IOS) {
    clearTimers()
    const ticks = iosTicks || IOS_TICKS[name]
    iosTick()                              // first tick synchronous: it must stay inside the gesture
    for (let i = 1; i < ticks.length; i++) timers.push(setTimeout(iosTick, ticks[i]))
  }
}

/** Android arrays are on/off durations; on iOS each "on" entry becomes a tick at its start time. */
function pattern(arr) {
  const a = Array.isArray(arr) ? arr : [arr]
  const ticks = []
  let t = 0
  for (let i = 0; i < a.length; i++) {
    if (i % 2 === 0 && (ticks.length === 0 || t - ticks[ticks.length - 1] >= 40)) ticks.push(Math.round(t))
    t += a[i]
  }
  fire('pattern', a, ticks.length ? ticks : [0])
}

/* Every sound that confirms an action has a matching haptic (design §6). One table so a screen can say
   `haptic.cue('correct')` beside `sound.play('correct')` and they can never drift apart. */
const CUE = {
  tap: 'tap', nav: 'tap', open: 'tap', close: 'tap', next: 'tap', xp: 'tap', reveal: 'tap', countdown: 'tap', splash: 'tap',
  select: 'select', deselect: 'tap', toggle: 'select', check: 'select',
  correct: 'success', combo: 'success', shield: 'success', rare: 'success', unlock: 'success', medal: 'success', ring: 'success',
  wrong: 'error', error: 'error',
  streak: 'heavy', chest: 'heavy', ignite: 'heavy', go: 'heavy',
  launch: 'launch',
}
// The two big finales get their own shape: a double-tick, a beat, then the weight.
const FINALE = { complete: [10, 48, 16, 170, 44], rankup: [10, 40, 10, 40, 16, 140, 56] }

export const haptic = {
  tap: () => fire('tap'),
  select: () => fire('select'),
  success: () => fire('success'),
  warning: () => fire('warning'),
  error: () => fire('error'),
  heavy: () => fire('heavy'),
  launch: () => fire('launch'),
  pattern,
  /** Haptic for a sound cue name (sound.js CUES). Unknown names are ignored. */
  cue(name) {
    if (FINALE[name]) return pattern(FINALE[name])
    const k = CUE[name]
    if (k) haptic[k]()
  },
  /** Stop whatever is playing. */
  cancel() { clearTimers(); if (CAN_VIBRATE && nav.vibrate) nav.vibrate(0) },
  /** Can this device buzz at all? (iOS < 17.4 reports true but stays silent.) */
  get supported() { return CAN_VIBRATE || IOS },
  get platform() { return CAN_VIBRATE ? 'vibrate' : IOS ? 'ios-switch' : 'none' },
}
