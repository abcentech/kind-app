// Progress persisted in localStorage, namespaced per series.
// One rule drives everything: you finish a day by swiping its deck to the end.
// That awards the day's Code Card, moves the streak, and keeps your written answer.
import { useEffect, useState } from 'react'
import { dayInfo, getSeries, codeFor } from './lib.js'
import { reportCheckin } from './api.js'

const KEY = 'kind-app-v4'

const emptySeries = () => ({
  done: {},     // { day: 'YYYY-MM-DD' }  — the date you finished it
  pos: {},      // { day: cardIndex }     — resume where you stopped
  notes: {},    // { day: 'your answer' }
  cards: [],    // unlocked code-card numbers
})
const empty = {
  v: 4,
  name: '', role: 'family', emoji: '🌟', familyName: '',
  kids: [],            // [{ name, emoji }]
  onboarded: false,
  reminderHour: 20,
  streak: 0, best: 0, lastDone: null, gems: 0,
  series: {},
}

const iso = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5)

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { ...empty, ...raw, series: raw.series || {} }
  } catch {
    return { ...empty, series: {} }
  }
}
let state = load()
const listeners = new Set()
function commit(next) {
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
  listeners.forEach((fn) => fn(state))
}

export function useStore() {
  const [s, setS] = useState(state)
  useEffect(() => {
    listeners.add(setS)
    return () => listeners.delete(setS)
  }, [])
  return s
}
export const snapshot = () => state

/* ---- reads -------------------------------------------------------------- */
export const sub = (s, id) => s.series[id] || emptySeries()
export const isDayDone = (s, id, day) => Boolean(sub(s, id).done[day])
export const noteFor = (s, id, day) => sub(s, id).notes[day] || ''
export const posFor = (s, id, day) => sub(s, id).pos[day] || 0
export const unlockedCards = (s, id) => sub(s, id).cards
export const doneDays = (s, id) => Object.keys(sub(s, id).done).map(Number).sort((a, b) => a - b)

export function weekProgress(s, id) {
  const series = getSeries(id)
  const done = new Set(doneDays(s, id))
  return series.weeks.map((_, wi) => {
    const days = series.calendar.filter((d) => d.week === wi)
    return days.length ? days.filter((d) => done.has(d.day)).length / days.length : 0
  })
}
export const perfectWeeks = (s, id) => weekProgress(s, id).filter((p) => p >= 1).length

/** Days you were meant to do but haven't — the honest "catch up" list. */
export function missedDays(s, id, today) {
  const series = getSeries(id)
  return series.calendar
    .filter((d) => d.day < today && d.type !== 'rest' && !isDayDone(s, id, d.day))
    .map((d) => d.day)
}

/* ---- writes ------------------------------------------------------------- */
export function setPos(id, day, pos) {
  const cur = sub(state, id)
  if ((cur.pos[day] || 0) >= pos) return
  commit({ ...state, series: { ...state.series, [id]: { ...cur, pos: { ...cur.pos, [day]: pos } } } })
}

export function saveNote(id, day, text) {
  const cur = sub(state, id)
  commit({ ...state, series: { ...state.series, [id]: { ...cur, notes: { ...cur.notes, [day]: text } } } })
}

/**
 * Finish a day. Returns { code, streak, first } for the celebration screen,
 * or null if it was already done.
 */
export function finishDay(id, day) {
  const cur = sub(state, id)
  if (cur.done[day]) return null
  const series = getSeries(id)
  const code = codeFor(series, day)
  const today = iso()

  let { streak, best, lastDone, gems } = state
  if (lastDone !== today) {
    const gap = lastDone ? dayDiff(lastDone, today) : null
    streak = gap === 1 || graceGap(series, lastDone, gap) ? streak + 1 : 1
    lastDone = today
    best = Math.max(best, streak)
  }
  gems += 10 + (code?.rare ? 15 : 0)

  const next = {
    ...cur,
    done: { ...cur.done, [day]: today },
    cards: code && !cur.cards.includes(code.no) ? [...cur.cards, code.no] : cur.cards,
  }
  commit({ ...state, streak, best, lastDone, gems, series: { ...state.series, [id]: next } })
  reportCheckin({ series: id, day, streak, gems })
  return { code, streak, first: Object.keys(cur.done).length === 0 }
}

/** Selah grace: skipping a single Selah day does not break the streak. */
function graceGap(series, lastDone, gap) {
  if (gap !== 2 || !lastDone) return false
  const missed = new Date(lastDone)
  missed.setDate(missed.getDate() + 1)
  if (missed.getMonth() + 1 !== series.monthNum) return false
  const d = dayInfo(series, missed.getDate())
  return d.type === 'selah' || d.type === 'rest'
}

export function completeOnboarding({ name, role, emoji, familyName, kids }) {
  commit({ ...state, name, role, emoji, familyName, kids, onboarded: true })
}
export function updateProfile(fields) {
  commit({ ...state, ...fields })
}
export function addKid(kid) {
  commit({ ...state, kids: [...state.kids, kid] })
}
export function removeKid(i) {
  commit({ ...state, kids: state.kids.filter((_, x) => x !== i) })
}
export function resetAll() {
  commit({ ...empty, series: {} })
}
