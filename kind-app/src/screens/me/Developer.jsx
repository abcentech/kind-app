// Developer bay — hidden until the version line is tapped seven times. Time machine, storage, onboarding replay, FPS.
import { useEffect, useState } from 'react'
import { isSimulated, now, today } from '../../now.js'
import { updateProfile } from '../../store.js'
import { Button, Label, Row, RowGroup, Switch, TextField } from '../../ui/index.js'

const FPS_KEY = 'kind-dev-fps'
const jump = (v) => { const q = new URLSearchParams(location.search); q.set('now', v); location.search = '?' + q.toString() }

function storageBytes() {
  let all = 0, kind = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i), n = (k.length + (localStorage.getItem(k) || '').length) * 2
      all += n
      if (k.startsWith('kind')) kind += n
    }
  } catch { return null }
  return { all, kind }
}
const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`)

function useFps(on) {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    if (!on) return undefined
    let raf = 0, frames = 0, t0 = performance.now()
    const tick = (t) => {
      frames++
      if (t - t0 >= 500) { setFps(Math.round((frames * 1000) / (t - t0))); frames = 0; t0 = t }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [on])
  return fps
}

export default function Developer({ onHide }) {
  const [date, setDate] = useState(today(now()))
  const [fpsOn, setFpsOn] = useState(() => { try { return sessionStorage.getItem(FPS_KEY) === '1' } catch { return false } })
  const [size] = useState(storageBytes)
  const fps = useFps(fpsOn)
  const sim = isSimulated()
  const setFpsPref = (v) => { setFpsOn(v); try { sessionStorage.setItem(FPS_KEY, v ? '1' : '0') } catch { /* tab-only convenience */ } }

  return (
    <section className="me-sec me-dev" aria-labelledby="me-dev-h">
      <Label as="h2" id="me-dev-h" className="me-h" tone="ignite" dot>Developer</Label>

      <div className="me-dev__clock">
        <TextField
          label="Time machine" type="date" value={date} onChange={setDate}
          hint={sim ? `Clock is pretending: ${today(now())}` : 'Live clock. Pick a day to pretend it is that day.'}
        />
        <div className="me-dev__btns">
          <Button variant="secondary" size="md" onClick={() => date && jump(date)} disabled={!date}>Go to date</Button>
          <Button variant="ghost" size="md" onClick={() => jump('live')} disabled={!sim}>Back to live</Button>
        </div>
      </div>

      <RowGroup>
        <Row icon="download" title="Local storage" value={size ? kb(size.all) : 'Unavailable'} sub={size ? `KIND uses ${kb(size.kind)}` : 'Blocked in this browser'} />
        <Row icon="refresh" title="Replay onboarding" sub="Keeps your progress. Shows pre-flight again." onClick={() => { updateProfile({ onboarded: false }); location.reload() }} />
        <Row
          as="label" icon="gauge" title="FPS meter" sub={fpsOn ? 'Counting frames' : 'Off'}
          value={fpsOn ? <span className="me-fps">{fps} fps</span> : null}
          trailing={<Switch checked={fpsOn} onChange={setFpsPref} label="FPS meter" />}
        />
        <Row icon="eyeOff" title="Hide developer tools" onClick={onHide} />
      </RowGroup>
    </section>
  )
}
