// Art scenes — the matte painter's specimen sheet. Every scene full-bleed at 390 × 844 on carbon, the rocket at three
// sizes × three flame states, the capsule, the flame and comet on their own, and a Lite switch that flips html[data-fx].
//   http://localhost:5183/playground/art-scenes.html           (?fx=lite to start lite)
import { useEffect, useState } from 'react'
import { mount } from './_boot.jsx'
import { AscentSky, Comet, Earth, Flame, Horizon, LaunchPad, OrbitScene, Rocket, Starfield } from '../src/art/scenes.js'
import './art-scenes.css'

const Spec = ({ id, title, aside, children, w = 390, h = 844, vars }) => (
  <figure className="spec" data-spec={id}>
    <figcaption><b>{title}</b><span>{aside}</span></figcaption>
    <div className="spec__frame" style={{ width: w, height: h, ...vars }}>{children}</div>
  </figure>
)

function Lab() {
  const [lite, setLite] = useState(() => new URLSearchParams(location.search).get('fx') === 'lite')
  const [lift, setLift] = useState(0)
  useEffect(() => { document.documentElement.dataset.fx = lite ? 'lite' : 'full' }, [lite])
  return (
    <div className="lab">
      <header className="lab__bar">
        <div><h1>Art scenes</h1><p>KIND v7 · Ascent — drawn in code, no photographs, no filters</p></div>
        <label className="lab__toggle"><input type="checkbox" checked={lite} onChange={(e) => setLite(e.target.checked)} /><span>Lite</span></label>
      </header>

      <section className="lab__row" data-spec="scenes">
        <Spec id="launchpad" title="LaunchPad" aside="flame off · twinkle"><LaunchPad /></Spec>
        <Spec id="launchpad-idle" title="LaunchPad" aside="flame idle"><LaunchPad flame="idle" seed={9} /></Spec>
        <Spec id="liftoff" title="LaunchPad · liftoff" aside="tap to play">
          <LaunchPad key={lift} liftoff={lift > 0} seed={4} />
          <button className="lab__play" onClick={() => setLift((n) => n + 1)}>{lift ? 'Replay' : 'Launch'}</button>
        </Spec>
        <Spec id="orbit" title="OrbitScene" aside="animate · sunrise right"><OrbitScene /></Spec>
        <Spec id="orbit-static" title="OrbitScene" aside="progress .5 · sunrise left"><OrbitScene progress={0.5} sun="left" animate={false} seed={11} /></Spec>
        <Spec id="limb" title="Horizon · limb" aside="no children"><Horizon variant="limb" seed={3} twinkle /></Spec>
        <Spec id="pad" title="Horizon · pad" aside="no children"><Horizon variant="pad" seed={2} /></Spec>
        <Spec id="space" title="Horizon · space" aside="stars + nebula"><Horizon variant="space" seed={5} twinkle /></Spec>
        <Spec id="stars" title="Starfield" aside="density 1.6 · parallax"><Starfield density={1.6} seed={8} twinkle parallax /></Spec>
        {[0, 0.5, 1].map((v) => (
          <Spec key={v} id={`ascent-${v}`} title="AscentSky" aside={`--scroll ${v}`} vars={{ '--scroll': v }}><AscentSky /></Spec>
        ))}
      </section>

      <section className="lab__sec" data-spec="rockets">
        <h2>Rocket <small>sizes × flame</small></h2>
        <div className="lab__rockets">
          {[['off', 'flame off'], ['idle', 'idle'], ['burn', 'burn']].map(([fl, label]) => (
            <div className="lab__cell" key={fl}>
              <div className="lab__sizes">
                <Rocket size={132} flame={fl} />
                <Rocket size={220} flame={fl} />
                <Rocket size={380} flame={fl} />
              </div>
              <span className="lab__tag">{label} · 132 / 220 / 380</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lab__sec" data-spec="rocket-hero">
        <h2>Rocket <small>hero · 760 px · burn</small></h2>
        <div className="lab__hero"><Rocket size={760} flame="burn" /></div>
      </section>

      <section className="lab__sec" data-spec="capsule">
        <h2>Capsule <small>variant='capsule'</small></h2>
        <div className="lab__sizes lab__sizes--cap">
          <Rocket variant="capsule" size={96} flame="off" /><Rocket variant="capsule" size={180} flame="idle" /><Rocket variant="capsule" size={300} flame="burn" /><Rocket variant="capsule" size={420} flame="off" />
        </div>
      </section>

      <section className="lab__sec" data-spec="small">
        <h2>Rocket <small>marker sizes — as on a Learn node</small></h2>
        <div className="lab__sizes lab__sizes--cap">
          <Rocket size={44} flame="idle" float /><Rocket size={64} flame="idle" float /><Rocket size={88} flame="idle" float /><Rocket size={120} flame="burn" /><Rocket size={64} tilt={24} flame="burn" />
        </div>
      </section>

      <section className="lab__sec" data-spec="flames">
        <h2>Flame <small>intensity 0.1 / 0.4 / 1</small></h2>
        <div className="lab__sizes lab__sizes--cap">
          <Flame size={150} intensity={0.1} /><Flame size={190} intensity={0.4} /><Flame size={300} intensity={1} />
        </div>
      </section>

      <section className="lab__sec" data-spec="earth">
        <h2>Earth <small>dusk over Nigeria · sun phase · lights off</small></h2>
        <div className="lab__sizes lab__sizes--cap">
          <Earth size={360} />
          <Earth size={240} sun={40} phase={34} lon={10} lat={-4} />
          <Earth size={160} sun={120} phase={18} lon={30} lat={8} lights={false} />
          <Earth size={72} />
        </div>
      </section>

      <section className="lab__sec" data-spec="comet">
        <h2>Comet</h2>
        <div className="lab__sizes lab__sizes--cap">
          <Comet size={360} /><Comet size={240} angle={-34} /><Comet size={140} angle={12} />
        </div>
      </section>
    </div>
  )
}

// ?scene=launchpad|idle|liftoff|orbit|orbit-static|limb|pad|space|stars  → that scene alone, full-bleed in the viewport
// (so `--device lowend` shows it at the real 360 × 640)
function Solo({ scene }) {
  const Scenes = {
    launchpad: () => <LaunchPad />, idle: () => <LaunchPad flame="idle" seed={9} />, liftoff: () => <LaunchPad liftoff />,
    orbit: () => <OrbitScene />, 'orbit-static': () => <OrbitScene progress={0.5} sun="left" animate={false} seed={11} />,
    limb: () => <Horizon variant="limb" seed={3} twinkle />, pad: () => <Horizon variant="pad" seed={2} />,
    space: () => <Horizon variant="space" seed={5} twinkle />, stars: () => <Starfield density={1.6} seed={8} twinkle parallax />,
  }
  // ?scene=rocket&zoom=top|mid|base|nose&flame=burn → a 1500 px vehicle seen through a 600 px window, for 3x detail review
  if (scene === 'rocket') {
    const H = 1500, W = (H * 120) / 372
    const tops = { top: 40, nose: 100, mid: 300 - 0.44 * H, base: 300 - 0.9 * H, fins: 300 - 0.44 * H }
    const z = q.get('zoom') || 'top'
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--carbon-0)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 300 - W / 2, top: tops[z] ?? 40 }}><Rocket size={H} flame={q.get('flame') || 'burn'} variant={q.get('variant') || 'stack'} /></div>
      </div>
    )
  }
  const S = Scenes[scene] || Scenes.launchpad
  return <div style={{ position: 'fixed', inset: 0, background: 'var(--carbon-0)' }}><S /></div>
}
const q = new URLSearchParams(location.search)
mount(q.get('scene') ? <Solo scene={q.get('scene')} /> : <Lab />, { fx: q.get('fx') === 'lite' ? 'lite' : 'full' })
