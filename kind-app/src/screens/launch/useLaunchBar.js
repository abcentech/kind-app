// learn-launch · the Launch Bar's view-model. Store + copy in, one plain object out.
// The heavy derivation (deck, streak, copy) runs on a 30 s clock and on every store commit; the 1 Hz tick lives in <Readout>,
// so a screen left open does not re-derive the lesson every second.
import { useCallback, useMemo, useState } from 'react'
import { useStore, useClock, launchState, launchBarContext } from '../../store.js'
import { dayLabel, diffDays } from '../../lib.js'
import { now, today } from '../../now.js'
import { launchBarCopy, catchUpCopy, zoneTag } from '../../copy.js'

const DAY_MS = 24 * 3600e3
const AT_RISK_WINDOW_H = 6 // mirrors store.AT_RISK_HOURS; only used to scale the draining strip

/** 'ignite' tone → the primary launch control; the rest map to the kit's variants. */
const VARIANT = { ignite: 'primary', warn: 'primary', tele: 'secondary', go: 'go' }

/** What a tap does, and how the control looks, per state. */
const ACT = {
  ready:    { run: 'launch', icon: 'rocket' },
  first:    { run: 'launch', icon: 'rocket' },
  missed:   { run: 'launch', icon: 'rocket' },
  progress: { run: 'launch', icon: 'play' },
  archive:  { run: 'launch', icon: 'rocket' },
  atRisk:   { run: 'launch', icon: 'flame' },
  selah:    { run: 'open', icon: 'moon' },
  waiting:  { run: 'open', iconRight: 'chevronRight', variant: 'ghost', size: 'md' },
  complete: { run: 'open', icon: 'trophy' },
  upcoming: { run: 'remind', icon: 'bell' },
  locked:   { run: 'none', icon: 'lock', disabled: true },
}

export function useLaunchBar(s) {
  const st = useStore()
  const clock = useClock(30000)
  const [bump, setBump] = useState(0) // a countdown reached zero: derive again right now
  const model = useMemo(() => {
    const at = now()
    const L = launchState(s, st, at)
    let ctx = launchBarContext(s, st, at)
    // the adapter folds a not-yet-open day into 'waiting' (and would call it "complete"); the copy has a proper 'locked' state
    if (L.state === 'locked') ctx = { ...ctx, state: 'locked' }
    // today was the last day but earlier days are still open: there is no next unlock, so point at the first open one
    if (ctx.state === 'waiting' && ctx.countdown == null) {
      const d = L.catchUp ?? ctx.day
      ctx = { ...ctx, state: 'archive', day: d, title: dayLabel(s, d), mins: null }
    }
    const k = today(at)
    const lastDone = st.lastDone
    const gapDays = lastDone ? Math.max(0, diffDays(lastDone, k) - 1) : null
    const bar = launchBarCopy({
      ...ctx, unlockAt: ctx.opens, zone: zoneTag(at), gapDays,
      role: st.role === 'teen' ? undefined : 'parent',
    })
    // the one place the brief and copy.js differ: an archive that is under way reads "Continue Day N", not "Launch"
    const cont = ctx.state === 'archive' && ctx.done > 0
    const cta = cont ? `Continue Day ${ctx.day}` : bar.cta
    const ctaAria = cont ? `Continue Day ${ctx.day}${ctx.title ? ': ' + ctx.title : ''}` : bar.ctaAria || bar.cta
    const act = ACT[bar.state] || ACT.ready
    const hasClock = ctx.countdown != null && Boolean(bar.readout)
    const target = hasClock ? at.getTime() + ctx.countdown : null
    // the top-edge status strip: 0..1, or null for "lit hairline, no quantity"
    let fill = null
    if (bar.state === 'progress' && ctx.pct != null) fill = ctx.pct / 100
    else if (bar.state === 'atRisk') fill = Math.max(0.04, Math.min(1, ctx.hoursLeft / AT_RISK_WINDOW_H))
    else if (bar.state === 'waiting' || bar.state === 'locked') fill = Math.max(0.04, Math.min(1, 1 - ctx.countdown / DAY_MS))
    else if (bar.state === 'complete') fill = 1
    // days behind you that are still open (live only). Never the day the bar is already offering.
    const catchUp = L.catchUp != null && L.catchUp !== ctx.day && bar.state !== 'upcoming'
      ? catchUpCopy({ catchUp: L.catchUp, behind: L.behind, title: dayLabel(s, L.catchUp) }, k)
      : null
    return {
      ctx, bar, act, cta, ctaAria, target, fill, hasClock, catchDay: catchUp ? L.catchUp : null, catchUp,
      variant: act.variant || (act.run === 'launch' ? 'primary' : VARIANT[bar.tone] || 'primary'), key: `${bar.state}:${ctx.day}`,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, st, clock, bump])
  const refresh = useCallback(() => setBump((n) => n + 1), [])
  return { ...model, refresh }
}

export default useLaunchBar
