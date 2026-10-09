// onboard-commit · Reminder — "When should we remind you?" (beat 5 of 5; Beat reads step/steps from the flow).
// value = { on, hour, min }; onChange fires on every change. `on` means "the calendar file was handed to the user at exactly
// this time": moving the time after adding flips it back to false, so the parent never records a time the calendar does not have.
// A browser cannot notify an app that is closed or offline, so the reliable reminder is the user's own calendar (src/lib/ics.js).
// `Frame` is a test seam (see Goal.jsx); callers never pass it.
import { useEffect, useState } from 'react'
import { Button, Chip, Label, Slider, toast } from '../../ui/index.js'
import { Icon } from '../../icons.jsx'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'
import { DEFAULT_REMINDER, fmtClock, onboardCopy, reminderChrome, reminderCopy, reminderPresets, toastCopy, zoneTag } from '../../copy.js'
import { useStore, usualTime } from '../../store.js'
import { prefs } from '../../prefs.js'
import { now } from '../../now.js'
import { downloadICS } from '../../lib/ics.js'
import Beat from './Beat.jsx'

const FROM = 5 * 60            // 05:00
const TO = 23 * 60             // 23:00
const STEP = 15
const HOURS = Array.from({ length: 19 }, (_, i) => 5 + i)

const p2 = (n) => String(n).padStart(2, '0')
const snap = (m) => Math.min(TO, Math.max(FROM, Math.round(m / STEP) * STEP))

export default function Reminder({ value, onChange, next, back, Frame = Beat }) {
  const copy = onboardCopy.remind
  const st = useStore()
  const zone = zoneTag(now())
  const known = Number.isFinite(value?.hour)
  const total = snap(known ? value.hour * 60 + (value.min || 0) : DEFAULT_REMINDER.hour * 60 + DEFAULT_REMINDER.min)
  const hour = Math.floor(total / 60), min = total % 60
  // minute-of-day last handed to the calendar; a beat re-entered with on:true (Back from Launch) keeps its "added" state
  const [added, setAdded] = useState(() => (value?.on && Number.isFinite(value.hour) ? snap(value.hour * 60 + (value.min || 0)) : null))
  const [busy, setBusy] = useState(false)
  const isAdded = added === total

  useEffect(() => { if (!known) onChange?.({ on: false, hour: DEFAULT_REMINDER.hour, min: DEFAULT_REMINDER.min }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setTime = (m) => onChange?.({ on: added === m, hour: Math.floor(m / 60), min: m % 60 })
  const clock = (m = total) => fmtClock(Math.floor(m / 60), m % 60, { zone })

  const usual = usualTime(st)
  const usualAt = usual ? snap(usual.hour * 60 + usual.min) : null

  const add = async () => {
    if (busy) return
    setBusy(true)
    try {
      const c = reminderCopy({ name: st.name || '', hour, min, zone, seed: 'onboard' })
      // reminderCopy sometimes opens with a verse of its own; then the .ics must not append its default one as well
      const ok = await downloadICS({ hour, min, name: st.name || '', title: c.title, body: c.body, ...(c.body.includes('“') ? { scripture: null } : null) })
      if (!ok) return
      setAdded(total)
      prefs.set('reminder', { on: true, hour, min })
      onChange?.({ on: true, hour, min })
      sound.play('go'); haptic.success()
      toast(toastCopy('calendarReady'))
    } finally { setBusy(false) }
  }

  // <Onboard>'s next() ignores arguments, so the answer travels through onChange first; next({ on:false }) is for hosts that read it.
  const skip = () => { onChange?.({ on: false, hour, min }); next?.({ on: false }) }

  const digits = `${p2(hour)}:${p2(min)}`
  return (
    <Frame
      eyebrow={copy.eyebrow} title={copy.title} dek={copy.body} back={back}
      footer={(
        <div className="onc-foot">
          <span className="u-sr" role="status">{isAdded ? `${clock()}. ${reminderChrome.done}` : ''}</span>
          {isAdded
            ? <Button full iconRight="arrowRight" onClick={() => next?.({ on: true, hour, min })}>{onboardCopy.chrome.next}</Button>
            : <Button full icon="calendar" loading={busy} onClick={add}>{reminderChrome.add}</Button>}
          <Button variant="ghost" size="sm" full onClick={isAdded ? add : skip}>
            {isAdded ? reminderChrome.add : reminderChrome.skip}
          </Button>
          <div className="onc-slot" data-added={isAdded ? '' : undefined}>
            <p className="onc-foot__note onb-note">{copy.foot}</p>
            <p className="onc-status" aria-hidden="true"><i /><span><b>{clock()}</b> {reminderChrome.done}</span></p>
          </div>
        </div>
      )}
    >
      <div className="onc-rem">
        <div className="onc-clock">
          <div className="onc-clock__face">
            <div className="onc-clock__top">
              <Label mono tone="tele" dot>{reminderChrome.time}</Label>
              <span className="onc-clock__sub">{clock()}</span>
            </div>
            <div className="onc-clock__digits" aria-hidden="true">
              {[...digits].map((ch, i) => (ch === ':'
                ? <span key="c" className="onc-colon">:</span>
                : <span key={`${i}${ch}`} className="onc-d">{ch}</span>))}
            </div>
            {/* the scrubber lives in the same housing as the readout: dial the digits, or pick a preset below */}
            <div className="onc-scrub">
              <Slider
                min={FROM} max={TO} step={STEP} value={total} onChange={setTime} showValue={false} ticks={false}
                label={reminderChrome.custom} format={(m) => clock(m)} style={{ '--k-tw': 'var(--onc-cap)' }}
              />
              <span className="onc-scale" aria-hidden="true">
                {HOURS.map((h) => (
                  <i key={h} data-major={h % 3 === 0 ? '' : undefined} data-on={h * 60 <= total ? '' : undefined} style={{ '--p': (h * 60 - FROM) / (TO - FROM) }}>
                    {h % 3 === 0 && <b>{p2(h)}</b>}
                  </i>
                ))}
              </span>
            </div>
          </div>
        </div>

        <div className="onc-presets" role="group" aria-label={reminderChrome.time}>
          {reminderPresets.map((p) => {
            const m = p.hour * 60 + p.min
            return (
              <Chip key={p.id} tone="tele" selected={total === m} onClick={() => setTime(m)} aria-label={`${p.label}, ${clock(m)}`}>{p.label}</Chip>
            )
          })}
        </div>

        {usual && usualAt !== total && (
          <div className="onc-usual">
            <Icon.clock size={16} />
            <span>You usually launch around <b>{clock(usualAt)}</b>.</span>
            <Button variant="secondary" size="sm" onClick={() => setTime(usualAt)}>Use it</Button>
          </div>
        )}

      </div>
    </Frame>
  )
}
