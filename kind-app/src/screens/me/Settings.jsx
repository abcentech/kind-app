// Me · Settings — the instruments. iOS-style grouped rows in carbon: Experience (sound, volume, haptics, effects, text size),
// Your commitment (daily goal, role), Reminder (a sheet), Your data (back up / restore).
// Every write goes straight to prefs.set or a store verb; the controls read the same sources back, so there is no local copy to drift.
// `s` (the series) is accepted for the section contract but nothing here is series-specific.
import { useEffect, useRef, useState } from 'react'
import { Button, Chip, Dialog, Row, RowGroup, Segmented, Sheet, Slider, Switch, toast } from '../../ui/index.js'
import { Icon } from '../../icons.jsx'
import { usePrefs } from '../../prefs.js'
import { now } from '../../now.js'
import { sound } from '../../fx/sound.js'
import { haptic } from '../../fx/haptics.js'
import { applyFxLevel, getFxReason, useFxLevel } from '../../fx/motion.js'
import { downloadICS } from '../../lib/ics.js'
import { exportProgress, importProgress, setDailyGoal, updateProfile, usualTime, useStore } from '../../store.js'
import {
  DEFAULT_REMINDER, GOALS, errorCopy, fmtClock, fmtDate, fmtNum, goalCopy, reminderChrome, reminderCopy, reminderPresets,
  settingsHelp as H, toastCopy, zoneTag,
} from '../../copy.js'

// Strings copy.js does not own yet (see REQUESTS): the honest reminder note, backup toasts and the restore dialog.
const X = {
  honest: 'Browsers cannot send notifications while KIND is closed and offline, so the alert from your calendar is the reliable reminder.',
  usual: (t) => `You usually launch around ${String(t).replace(/\s+(?=[ap]m$)/i, ' ')}`,
  use: 'Use',
  off: 'Off',
  turnOff: 'Turn reminder off',
  offNote: 'Your calendar still has the event. Delete it there to stop the alerts.',
  backup: { label: 'Back up progress', help: 'Saves your whole save as one file. Keep it somewhere safe.', done: 'Backup saved', doneBody: 'Keep the file safe. It holds your streak, XP, cards and Journal.' },
  restore: { label: 'Restore from backup', help: 'Replaces the progress on this device with a backup file.', title: 'Replace progress on this device?', confirm: 'Restore' },
  restoreBody: (xp, when) => `This swaps everything on this device for the backup${when ? ` from ${when}` : ''} (${fmtNum(xp)} XP). It cannot be undone.`,
  restored: (r) => ({ title: 'Progress restored', body: `${fmtNum(r.xp)} XP, ${r.lessons} ${r.lessons === 1 ? 'lesson' : 'lessons'}, streak ${r.streak}.` }),
  bad: {
    'bad-json': 'That file could not be read. Choose the kind-backup file you saved.',
    'not-a-kind-backup': 'That file is not a KIND backup. Choose the kind-backup file you saved.',
    read: 'The file could not be opened. Try again.',
  },
  now: 'Running',
  reasons: { 'reduced-motion': 'reduced motion is on', 'save-data': 'data saver is on', 'low-memory': 'low memory', 'few-cores': 'a slower processor', user: '', attribute: '', auto: '' },
  levels: { full: 'Full', lite: 'Lite' },
}

const pad2 = (n) => String(n).padStart(2, '0')
const roundTo5 = (m) => Math.min(23 * 60 + 55, Math.round(m / 5) * 5)

/** Build a name for the backup file from the app clock (never `new Date()`). */
const backupName = () => { const d = now(); return `kind-backup-${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}.json` }

const isIOS = () => typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1))
const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true)

/** Hand a text file to the user. Home-Screen iPhone apps cannot download reliably, so they get the share sheet. Resolves false if the user closed it. */
async function saveText(text, filename, type) {
  const blob = new Blob([text], { type })
  if (isIOS() && isStandalone() && typeof File === 'function' && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type })
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: filename }); return true }
    } catch (e) { if (e && e.name === 'AbortError') return false }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.rel = 'noopener'; a.style.display = 'none'
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
  return true
}

/** Cheap look inside a backup so a wrong file is turned away before the scary dialog. importProgress stays the judge. */
function peekBackup(text) {
  let raw
  try { raw = JSON.parse(text) } catch { return { ok: false, error: 'bad-json' } }
  if (!raw || raw.app !== 'kind' || !raw.state || typeof raw.state !== 'object') return { ok: false, error: 'not-a-kind-backup' }
  const when = raw.exportedAt ? new Date(raw.exportedAt) : null
  return { ok: true, xp: Number(raw.state.xp) || 0, when: when && !Number.isNaN(when.getTime()) ? fmtDate(when) : '' }
}

const failToast = (error) => {
  const e = errorCopy('generic', error)
  toast({ title: e.title, body: X.bad[error] || e.body, icon: e.icon, tone: e.tone, key: 'backup' })
  haptic.error()
}

/** A slider row's title with its live value on the right. The Slider's own head is hidden (it only carries the accessible name). */
const Title = ({ children, value }) => (
  <span className="mes-title"><span>{children}</span>{value != null ? <output className="mes-val" aria-hidden="true">{value}</output> : null}</span>
)

/* ── Experience ─────────────────────────────────────────────────────────── */

function SoundRows() {
  const [p, set] = usePrefs()
  const on = p.sound !== false
  const pct = Math.round((p.volume ?? 0.6) * 100)

  const toggleSound = (next) => {
    if (next) {
      set('sound', true)
      sound.unlock()
      sound.play('toggle', { on: true })
      haptic.select()
      toast({ ...toastCopy('soundOn'), action: { label: toastCopy('soundOn').action.label, onClick: () => set('sound', false) } })
    } else {
      sound.play('toggle', { on: false })   // the click that confirms "off" is the last thing it says
      set('sound', false)
      toast(toastCopy('soundOff'))
    }
  }
  const settle = () => { if (on) sound.play('tap') }
  const volume = (v) => set('volume', Math.round(v) / 100)

  return (
    <>
      <Row as="label" icon={on ? 'soundOn' : 'soundOff'} tone={on ? 'tele' : 'neutral'} title={H.sound.label} sub={H.sound.help}
        trailing={<Switch checked={on} silent label={H.sound.label} onChange={toggleSound} />} />
      <Row className="mes-tall" icon="gauge" tone={on ? 'tele' : 'neutral'} title={<Title value={`${pct}%`}>{H.volume.label}</Title>} sub={H.volume.help}>
        <div className="mes-ctl" onPointerUp={settle} onKeyUp={settle}>
          <Slider className="mes-slider" label={H.volume.label} min={0} max={100} step={5} value={pct} showValue={false} disabled={!on} onChange={volume} format={(v) => `${v}%`} />
        </div>
      </Row>
    </>
  )
}

function HapticsRow() {
  const [p, set] = usePrefs()
  const on = p.haptics !== false
  return (
    <Row as="label" icon="vibrate" tone={on ? 'tele' : 'neutral'} title={H.haptics.label} sub={H.haptics.help}
      trailing={<Switch checked={on} silent label={H.haptics.label} onChange={(next) => {
        set('haptics', next)
        if (next) haptic.tap()            // enabled() reads prefs on every call, so the buzz arrives on the very tap that turned it on
        toast(toastCopy(next ? 'hapticsOn' : 'hapticsOff'))
        sound.play('toggle', { on: next })
      }} />} />
  )
}

function EffectsRow() {
  const [p, set] = usePrefs()
  const level = useFxLevel()
  const fx = ['auto', 'full', 'lite'].includes(p.fx) ? p.fx : 'auto'
  const why = fx === 'auto' ? X.reasons[getFxReason()] : ''
  return (
    <Row className="mes-tall" icon="sparkle" tone="tele" title={H.effects.label} sub={H.effects.help}>
      <div className="mes-ctl">
        <Segmented label={H.effects.label} value={fx} onChange={(v) => { set('fx', v); applyFxLevel() }}
          options={['auto', 'full', 'lite'].map((id) => ({ id, label: H.effects.options[id] }))} />
        <p className="mes-note" aria-live="polite">
          {H.effects.optionHelp[fx]}
          {fx === 'auto' ? <span className="mes-now"> {X.now}: {X.levels[level] || level}{why ? ` (${why})` : ''}</span> : null}
        </p>
      </div>
    </Row>
  )
}

function TextSizeRow() {
  const [p, set] = usePrefs()
  const pct = Math.round(Math.min(1.3, Math.max(0.9, p.textScale || 1)) * 100)
  return (
    <Row className="mes-tall" icon="textSize" tone="tele" title={<Title value={`${pct}%`}>{H.textSize.label}</Title>} sub={H.textSize.help}>
      <div className="mes-ctl">
        <Slider className="mes-slider" label={H.textSize.label} min={90} max={130} step={5} value={pct} showValue={false} format={(v) => `${v}%`}
          onChange={(v) => set('textScale', Math.round(v) / 100)} />
        <p className="mes-sample" style={{ '--mes-scale': pct / 100 }}>{H.textSize.sample}</p>
      </div>
    </Row>
  )
}

/* ── Your commitment ────────────────────────────────────────────────────── */

function GoalRow({ st }) {
  const g = goalCopy(st.dailyGoalXp)
  return (
    <Row className="mes-tall" icon="target" tone="go" title={H.goal.label} sub={H.goal.help}>
      <div className="mes-ctl">
        <Segmented label={H.goal.label} value={g.xp}
          onChange={(xp) => { setDailyGoal(xp); toast(toastCopy('goalSet', { goal: xp })) }}
          options={GOALS.map((x) => ({ id: x.xp, label: `${x.xp} XP` }))} />
        <p className="mes-note" aria-live="polite"><b className="mes-strong">{g.label}</b> {g.meta}</p>
      </div>
    </Row>
  )
}

function RoleRow({ st }) {
  const role = st.role === 'parent' || st.role === 'family' ? 'parent' : 'teen'   // a "family" save reads as parent here
  return (
    <Row className="mes-tall" icon="user" tone="go" title={H.role.label} sub={H.role.help}>
      <div className="mes-ctl">
        <Segmented label={H.role.label} value={role} onChange={(r) => updateProfile({ role: r })}
          options={[{ id: 'teen', label: 'Teen' }, { id: 'parent', label: 'Parent' }]} />
      </div>
    </Row>
  )
}

/* ── Reminder ───────────────────────────────────────────────────────────── */

function ReminderSheet({ open, onClose, st }) {
  const [p, set] = usePrefs()
  const rem = p.reminder || { on: false, ...DEFAULT_REMINDER }
  const [mins, setMins] = useState(() => (rem.hour ?? DEFAULT_REMINDER.hour) * 60 + (rem.min ?? DEFAULT_REMINDER.min))
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setMins((rem.hour ?? DEFAULT_REMINDER.hour) * 60 + (rem.min ?? DEFAULT_REMINDER.min)) }, [open])   // eslint-disable-line react-hooks/exhaustive-deps
  const hour = Math.floor(mins / 60), min = mins % 60
  const zone = zoneTag(now())
  const usual = usualTime(st)
  const usualMins = usual ? roundTo5(usual.hour * 60 + usual.min) : null
  const h12 = hour % 12 || 12

  const add = async () => {
    setBusy(true)
    try {
      const c = reminderCopy({ name: st.name, hour, min, zone, seed: 'settings' })
      const ok = await downloadICS({ hour, min, name: st.name, title: c.title, body: c.body, scripture: null })
      if (ok === false) return                         // the share sheet was closed: nothing was handed over, so nothing is saved
      set('reminder', { on: true, hour, min })
      updateProfile({ reminderHour: hour })
      haptic.success()
      toast({ ...toastCopy('reminderSet', { hour, min, zone }), body: reminderChrome.done })
      onClose()
    } catch {
      const e = errorCopy('ics', 'settings')
      toast({ title: e.title, body: e.body, icon: e.icon, tone: e.tone })
      haptic.error()
    } finally { setBusy(false) }
  }
  const turnOff = () => {
    set('reminder', { ...rem, on: false })
    toast({ title: 'Reminder off', body: X.offNote, icon: 'bellOff' })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} eyebrow={H.reminder.label} title={reminderChrome.title}
      footer={<Button full icon="calendar" loading={busy} onClick={add}>{reminderChrome.add}</Button>}>
      <div className="mes-rem">
        <div className="mes-clock" role="group" aria-label={reminderChrome.time}>
          <output className="mes-clock__t" aria-live="polite" aria-label={fmtClock(hour, min, { zone })}>
            <span aria-hidden="true">{h12}:{pad2(min)}</span>
            <span className="mes-clock__ap" aria-hidden="true">{hour < 12 ? 'am' : 'pm'}</span>
          </output>
          {zone ? <span className="mes-clock__z" aria-hidden="true">{zone}</span> : null}
        </div>

        <div className="mes-ctl">
          <Slider className="mes-slider" label={reminderChrome.time} min={0} max={23 * 60 + 55} step={5} value={mins} showValue={false}
            format={(v) => fmtClock(Math.floor(v / 60), v % 60, { zone })} onChange={setMins} />
        </div>

        <div className="mes-presets" role="group" aria-label={reminderChrome.custom}>
          {reminderPresets.map((r) => {
            const on = mins === r.hour * 60 + r.min
            return (
              <Chip key={r.id} selected={on} aria-pressed={on} aria-label={`${r.label}, ${fmtClock(r.hour, r.min)}`} onClick={() => setMins(r.hour * 60 + r.min)}>{r.label}</Chip>
            )
          })}
        </div>

        {usualMins != null ? (
          <div className="mes-usual">
            <span>{X.usual(fmtClock(Math.floor(usualMins / 60), usualMins % 60))}</span>
            <Button variant="secondary" size="sm" onClick={() => setMins(usualMins)}>{X.use}</Button>
          </div>
        ) : null}

        <p className="mes-honest"><Icon name="info" size={16} />{X.honest} {reminderChrome.change}</p>
        {rem.on ? <Button variant="ghost" size="md" icon="bellOff" onClick={turnOff}>{X.turnOff}</Button> : null}
      </div>
    </Sheet>
  )
}

function ReminderRow({ st }) {
  const [p] = usePrefs()
  const [open, setOpen] = useState(false)
  const rem = p.reminder || {}
  return (
    <>
      <Row icon="bell" tone={rem.on ? 'go' : 'neutral'} title={H.reminder.label} value={rem.on ? fmtClock(rem.hour, rem.min, { zone: zoneTag(now()) }) : X.off}
        chevron onClick={() => setOpen(true)} aria-haspopup="dialog" />
      <ReminderSheet open={open} onClose={() => setOpen(false)} st={st} />
    </>
  )
}

/* ── Your data ──────────────────────────────────────────────────────────── */

function DataRows() {
  const input = useRef(null)
  const [ask, setAsk] = useState(null)       // { text, xp, when } while the confirm is open
  const lastAsk = useRef(null)
  if (ask) lastAsk.current = ask
  const shown = ask || lastAsk.current

  const backup = async () => {
    try {
      const done = await saveText(exportProgress(), backupName(), 'application/json')
      if (done === false) return
      haptic.success()
      toast({ title: X.backup.done, body: X.backup.doneBody, icon: 'download', tone: 'go', key: 'backup' })
    } catch {
      const e = errorCopy('generic', 'backup')
      toast({ title: e.title, body: e.body, icon: e.icon, tone: e.tone, key: 'backup' })
    }
  }

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''                      // so choosing the same file twice still fires
    if (!f) return
    let text
    try { text = await f.text() } catch { failToast('read'); return }
    const peek = peekBackup(text)
    if (!peek.ok) { failToast(peek.error); return }
    setAsk({ text, xp: peek.xp, when: peek.when })
  }

  const restore = () => {
    const r = importProgress(ask.text)
    setAsk(null)
    if (!r.ok) { failToast(r.error); return }
    haptic.success()
    sound.play('unlock')
    toast({ ...X.restored(r), icon: 'checkCircle', tone: 'go', key: 'backup' })
  }

  return (
    <>
      <Row icon="download" title={X.backup.label} sub={X.backup.help} onClick={backup} />
      <Row icon="upload" title={X.restore.label} sub={X.restore.help} onClick={() => input.current && input.current.click()} />
      <input ref={input} type="file" accept=".json,application/json" hidden onChange={onFile} data-testid="mes-restore-input" />
      <Dialog open={!!ask} tone="danger" title={X.restore.title} body={shown ? X.restoreBody(shown.xp, shown.when) : ''}
        confirmLabel={X.restore.confirm} cancelLabel={H.reset.cancel} onConfirm={restore} onCancel={() => setAsk(null)} />
    </>
  )
}

/* ── Settings ───────────────────────────────────────────────────────────── */

export default function Settings() {
  const st = useStore()
  return (
    <div className="mes">
      <RowGroup title={H.sections.experience}>
        <SoundRows />
        <HapticsRow />
        <EffectsRow />
        <TextSizeRow />
      </RowGroup>
      <RowGroup title={H.sections.commitment}>
        <GoalRow st={st} />
        <RoleRow st={st} />
      </RowGroup>
      <RowGroup title={H.sections.reminder} footer={H.reminder.help}>
        <ReminderRow st={st} />
      </RowGroup>
      <RowGroup title={H.sections.data} footer={`${H.privacy.line} ${H.privacy.warn}`}>
        <DataRows />
      </RowGroup>
    </div>
  )
}
