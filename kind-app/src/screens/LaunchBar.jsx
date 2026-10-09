// learn-launch · the Launch Bar — one tap from app-open to lesson.
// A glass slab pinned above the dock. Every string comes from copy.launchBarCopy(launchBarContext(...)); every state
// (ready · progress · atRisk · waiting · locked · archive · complete · upcoming · first · missed · selah) is one layout of the same parts.
//
// Mounting contract (Learn): render <LaunchBar /> as a SIBLING of the scroller, inside a positioned, non-scrolling wrapper
// (it is position:absolute against the nearest positioned ancestor, so inside the scroller it would scroll away).
// It publishes its true height as --launch-h on <html> (default 148px, removed on unmount) for the scroller's bottom padding.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useShell } from '../shell.jsx'
import { Button, Chip, Label, Panel, toast } from '../ui/index.js'
import { Icon } from '../icons.jsx'
import { sound } from '../fx/sound.js'
import { haptic } from '../fx/haptics.js'
import { fx } from '../fx/fx.js'
import { downloadICS } from '../lib/ics.js'
import { reminderCopy, zoneTag } from '../copy.js'
import { UNLOCK_HOUR } from '../lib.js'
import { now } from '../now.js'
import useLaunchBar from './launch/useLaunchBar.js'
import Readout from './launch/Readout.jsx'

/** Publish the bar's laid-out height (slab + any catch-up chip) as --launch-h on <html>. Skips 0 so a hidden screen keeps the last value. */
function usePublishHeight(ref) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const root = document.documentElement
    const set = () => { const h = el.offsetHeight; if (h > 0) root.style.setProperty('--launch-h', `${h}px`) }
    set()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(set) : null
    ro?.observe(el)
    return () => { ro?.disconnect(); root.style.removeProperty('--launch-h') }
  }, [ref])
}

export default function LaunchBar() {
  const { s, openDay } = useShell()
  const m = useLaunchBar(s)
  const { ctx, bar, act, cta, ctaAria, target, fill, hasClock, catchUp, catchDay, variant, key } = m
  const rootRef = useRef(null)
  const ctaRef = useRef(null)
  usePublishHeight(rootRef)

  // the entrance plays once; a later state change cross-fades the body only
  const [armed, setArmed] = useState(false)
  useEffect(() => { setArmed(true) }, [])

  // polite announcement for state changes only (not for the ticking digits); the region label stays live
  const [said, setSaid] = useState('')
  const lastKey = useRef(key)
  useEffect(() => {
    if (lastKey.current === key) return
    lastKey.current = key
    setSaid(bar.aria)
  }, [key, bar.aria])

  // a locked bar opening in front of you: one quiet chime
  const prevState = useRef(bar.state)
  useEffect(() => {
    const was = prevState.current
    prevState.current = bar.state
    const closed = (x) => x === 'waiting' || x === 'locked'
    if (closed(was) && !closed(bar.state)) { sound.play('unlock'); haptic.success() }
  }, [bar.state])

  const remind = useCallback(async () => {
    const at = now()
    const copy = reminderCopy({ hour: UNLOCK_HOUR, min: 0, zone: zoneTag(at), seed: ctx.seed })
    const ok = await downloadICS({ hour: UNLOCK_HOUR, min: 0, title: copy.title, body: copy.body, count: s.calendar.length })
    if (ok) toast({ title: copy.confirm, tone: 'tele', icon: 'bell' })
  }, [ctx.seed, s.calendar.length])

  const onPress = () => {
    if (act.run === 'launch') {
      // press → ignite cue + launch haptic + wash/rings/sparks off the button; the Lesson plays the 'launch' swell itself
      sound.play('ignite'); haptic.launch(); fx.launch(ctaRef.current)
      openDay(ctx.day)
    } else if (act.run === 'open') openDay(ctx.day)
    else if (act.run === 'remind') remind()
  }
  const silent = act.run === 'launch'
  const clock = hasClock && bar.state === 'waiting'
  const topClock = hasClock && !clock

  const button = (
    <Button
      ref={ctaRef}
      className="launch-cta"
      variant={variant}
      size={act.size || 'lg'}
      full={!clock}
      icon={act.icon}
      iconRight={act.iconRight}
      silent={silent}
      pulse={act.run === 'launch' && bar.state !== 'archive' && bar.state !== 'progress'}
      disabled={act.disabled}
      aria-label={ctaAria}
      onClick={onPress}
    >
      {cta}
    </Button>
  )

  return (
    <div ref={rootRef} className="launch" data-state={bar.state} data-tone={bar.tone}>
      {catchUp ? (
        <Chip className="launch-chip" tone="tele" selected aria-pressed={undefined}
          aria-label={`${catchUp.ctaAria}. ${catchUp.sub}`} onClick={() => openDay(catchDay)}>
          {catchUp.eyebrow}
        </Chip>
      ) : null}
      <div className="launch-main">
        <i className="launch-aura" aria-hidden="true" />
        <Panel as="section" tone="glass" cut className="launch-slab" aria-label={bar.aria}>
          <i className="launch-strip" aria-hidden="true" data-lit={fill == null ? '' : undefined}>
            <i style={{ '--p': fill == null ? 1 : fill }} />
          </i>
          <div className="launch-body" key={key} data-swap={armed ? '' : undefined} data-layout={clock ? 'clock' : 'stack'}>
            <div className="launch-top">
              <Label mono dot tone="ink-2" className="launch-eyebrow"><span className="launch-eyebrow__t">{bar.eyebrow}</span></Label>
              {topClock ? <Readout target={target} onZero={m.refresh} /> : null}
              {!topClock && !clock && bar.meta ? (
                <span className="launch-meta"><Icon name="clock" size={16} />{bar.meta}</span>
              ) : null}
            </div>
            {clock ? (
              <div className="launch-clock">
                <div className="launch-clock__main">
                  <Readout target={target} size="xl" onZero={m.refresh} />
                  <p className="launch-title">{bar.title}</p>
                  <p className="launch-sub">{bar.sub}</p>
                </div>
                {button}
              </div>
            ) : (
              <>
                {bar.title ? <p className="launch-title">{bar.title}</p> : null}
                <p className="launch-sub">{bar.sub}</p>
                {bar.note ? <p className="launch-note"><Icon name="flame" size={16} weight="solid" />{bar.note}</p> : null}
                {button}
              </>
            )}
          </div>
          <p className="u-sr" role="status" aria-live="polite" aria-atomic="true">{said}</p>
        </Panel>
      </div>
    </div>
  )
}
