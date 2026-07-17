// Family progress persisted in localStorage.
import { useEffect, useState } from 'react'
import { calendar, dayInfo, segmentsFor } from './lib.js'
import { reportCheckin } from './api.js'

const KEY = 'kind-app-v1'

const empty = {
  completed: {}, gems: 0, streak: 0, lastDoneDate: null, familyName: '',
  kids: [],            // [{name, emoji, gems}]
  kidDone: {},         // {dayNumber: [kidIndex, ...]}
  onboarded: false,
}

function load() {
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...empty }
  }
}
let state = load()
const listeners = new Set()
function commit(next) {
  state = next
  localStorage.setItem(KEY, JSON.stringify(state))
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

export const doneSegs = (s, day) => s.completed[day] || []
export const isDayDone = (s, day) => doneSegs(s, day).length >= segmentsFor(day).length

export function toggleSegment(day, segId) {
  const cur = new Set(doneSegs(state, day))
  const wasDone = isDayDone(state, day)
  cur.has(segId) ? cur.delete(segId) : cur.add(segId)
  const completed = { ...state.completed, [day]: [...cur] }
  let { gems, streak, lastDoneDate } = state
  const nowDone = cur.size >= segmentsFor(day).length
  let justCompleted = false
  if (nowDone && !wasDone) {
    justCompleted = true
    gems += 6
    const today = new Date().toDateString()
    if (lastDoneDate !== today) {
      const yesterday = new Date(Date.now() - 864e5).toDateString()
      streak = lastDoneDate === yesterday || streakCovered(lastDoneDate) ? streak + 1 : 1
      lastDoneDate = today
    }
  }
  commit({ ...state, completed, gems, streak, lastDoneDate })
  if (justCompleted) reportCheckin({ day, streak, gems })
  return justCompleted
}

// Selah grace: a single missed day that was a Selah/review day doesn't break the streak.
function streakCovered(lastDoneDate) {
  if (!lastDoneDate) return false
  const gap = Math.round((Date.now() - new Date(lastDoneDate)) / 864e5)
  if (gap !== 2) return false
  const missed = dayInfo(Math.max(1, Math.min(calendar.length, new Date(Date.now() - 864e5).getDate())))
  return missed && (missed.type === 'selah' || missed.type === 'review')
}

export const daysCompleted = (s) =>
  calendar.filter((d) => (s.completed[d.day] || []).length >= segmentsFor(d.day).length).map((d) => d.day)

export function weekProgress(s) {
  // fraction complete per series week (teaching + selah days)
  const byWeek = [[], [], [], [], []]
  calendar.forEach((d) => {
    if (d.week != null) byWeek[d.week].push(d.day)
  })
  const done = new Set(daysCompleted(s))
  return byWeek.map((days) => (days.length ? days.filter((x) => done.has(x)).length / days.length : 0))
}

export function perfectWeeks(s) {
  return weekProgress(s).filter((p) => p === 1).length
}

export function setFamilyName(name) {
  commit({ ...state, familyName: name })
}

export function completeOnboarding(familyName, kids) {
  commit({ ...state, familyName, kids: kids.map((k) => ({ ...k, gems: 0 })), onboarded: true })
}

export function toggleKidDone(day, kidIndex) {
  const cur = new Set(state.kidDone[day] || [])
  const kids = state.kids.map((k) => ({ ...k }))
  if (cur.has(kidIndex)) {
    cur.delete(kidIndex)
    if (kids[kidIndex]) kids[kidIndex].gems = Math.max(0, (kids[kidIndex].gems || 0) - 3)
  } else {
    cur.add(kidIndex)
    if (kids[kidIndex]) kids[kidIndex].gems = (kids[kidIndex].gems || 0) + 3
  }
  commit({ ...state, kids, kidDone: { ...state.kidDone, [day]: [...cur] } })
}
