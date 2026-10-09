// Device preferences — tiny, dependency-free, shared by fx/ui/screens. (Progress lives in store.js; this is *settings*.)
//   import { prefs, usePrefs } from './prefs.js'
//   prefs.get('sound')            → boolean
//   prefs.set('sound', false)
//   const [p, setPref] = usePrefs()   // re-renders on change
import { useSyncExternalStore } from 'react'

const KEY = 'kind-prefs'
export const DEFAULT_PREFS = {
  sound: true,          // UI sounds
  haptics: true,        // vibration
  fx: 'auto',           // 'auto' (low-end devices + reduced-motion → lite) | 'full' | 'lite'
  volume: 0.6,          // 0..1
  textScale: 1,         // 0.9..1.3  — reading slides
  reminder: { on: false, hour: 20, min: 0 },
  installDismissed: 0,  // ms timestamp the install card was last dismissed
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
let state = { ...DEFAULT_PREFS, ...load() }
const subs = new Set()
const notify = () => subs.forEach((f) => f())
const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }

export const prefs = {
  get: (k) => state[k],
  all: () => state,
  set(k, v) {
    state = { ...state, [k]: v }
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private mode */ }
    notify()
  },
  subscribe,
}

export function usePrefs() {
  const snap = useSyncExternalStore(subscribe, () => state, () => state)
  return [snap, prefs.set]
}
