// Specimen sheet for the KIND identity — src/art/Brand.jsx plus every generated asset, side by side.
//   /playground/brand.html                 full sheet
//   /playground/brand.html?only=assets     one section: marks | wordmark | lockup | assets | colour | construction
//   /playground/brand.html?fx=lite         lite effects (the brand has no motion of its own; kept for parity)
import { mount } from './_boot.jsx'
import { Mark, Wordmark, Lockup, BRAND, MARK_GEOMETRY } from '../src/art/Brand.jsx'

const q = new URLSearchParams(location.search)
const only = q.get('only')
const show = (k) => !only || only === k

const css = `
.bp{min-height:100vh;background:var(--carbon-0);color:var(--ink);font-family:var(--font-ui);padding:var(--s-6) var(--gutter) var(--s-16)}
.bp *{box-sizing:border-box}
.bp-top{display:flex;flex-wrap:wrap;align-items:baseline;gap:var(--s-3) var(--s-6);padding-bottom:var(--s-4);border-bottom:1px solid var(--line)}
.bp-h{font-family:var(--font-display);font-weight:700;font-size:var(--fs-2xl);letter-spacing:var(--track-label);text-transform:uppercase;margin:0}
.bp-mono{font-family:var(--font-mono);font-size:var(--fs-2xs);letter-spacing:var(--track-mono);color:var(--ink-3);text-transform:uppercase}
.bp-sec{margin-top:var(--s-10)}
.bp-sec>.bp-mono{display:flex;gap:var(--s-3);align-items:center;margin-bottom:var(--s-4)}
.bp-sec>.bp-mono::after{content:'';flex:1;height:1px;background:var(--line)}
.bp-row{display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--s-6)}
.bp-cell{display:flex;flex-direction:column;align-items:center;gap:var(--s-2)}
.bp-cell>span{font-family:var(--font-mono);font-size:var(--fs-2xs);color:var(--ink-4);letter-spacing:var(--track-mono)}
.bp-surface{display:flex;align-items:center;justify-content:center;padding:var(--s-6);border-radius:var(--r-md)}
.bp-s0{background:var(--carbon-0);box-shadow:inset 0 0 0 1px var(--line)}
.bp-s1{background:var(--plate);box-shadow:var(--bevel),var(--shadow-1)}
.bp-s2{background:var(--carbon-4)}
.bp-s3{background:var(--ti-1);color:var(--carbon-0)}
.bp-img{display:block;max-width:100%;height:auto}
.bp-tab{display:flex;align-items:center;gap:var(--s-2);padding:6px 12px;border-radius:8px 8px 0 0;font:12px/1 var(--font-ui);width:190px}
.bp-px{image-rendering:pixelated}
.bp-safe{position:relative;width:256px;height:256px}
.bp-safe img{width:256px;height:256px;display:block}
.bp-safe i{position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 999px rgba(0,0,0,.55);pointer-events:none;margin:25.6px;inset:0;width:204.8px;height:204.8px}
.bp-chip{width:132px;border-radius:var(--r-sm);overflow:hidden;box-shadow:var(--bevel);background:var(--carbon-1)}
.bp-chip i{display:block;height:52px}
.bp-chip b{display:block;padding:var(--s-2) var(--s-3) 0;font:600 var(--fs-xs)/1.2 var(--font-ui)}
.bp-chip span{display:block;padding:2px var(--s-3) var(--s-3);font:var(--fs-2xs)/1.2 var(--font-mono);color:var(--ink-3)}
.bp-note{max-width:62ch;color:var(--ink-2);font-size:var(--fs-sm);line-height:1.5;margin:var(--s-3) 0 0}
`

const SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 160, 240]
const NAMES = {
  void: 'void', carbon0: 'carbon-0', carbon1: 'carbon-1', carbon2: 'carbon-2', carbon3: 'carbon-3', carbon4: 'carbon-4',
  ink: 'ink', ink2: 'ink-2', ink3: 'ink-3', ignite1: 'ignite-1', ignite2: 'ignite-2', ignite3: 'ignite-3', ti1: 'ti-1', ti2: 'ti-2', ti3: 'ti-3', ti4: 'ti-4',
}

function Construction({ size = 360 }) {
  const g = MARK_GEOMETRY, S = size
  const c = S / 2
  const R = g.hex.circumradius * S, Ri = g.hex.innerRadius * S
  const hex = (r) => [0, 1, 2, 3, 4, 5].map((i) => { const a = ((-90 + 60 * i) * Math.PI) / 180; return `${(c + r * Math.cos(a)).toFixed(1)},${(c + r * Math.sin(a)).toFixed(1)}` }).join(' ')
  const safe = 0.4 * S * (512 / 400) // 80 % maskable circle expressed in the mark's box
  return (
    <div style={{ position: 'relative', width: S, height: S }}>
      <Mark size={S} title="KIND mark with construction guides" />
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} fill="none" strokeWidth="1">
        <polygon points={hex(R)} stroke="var(--tele)" strokeOpacity=".7" strokeDasharray="4 4" />
        <polygon points={hex(Ri)} stroke="var(--tele)" strokeOpacity=".45" strokeDasharray="2 4" />
        <circle cx={c} cy={c} r={R} stroke="var(--tele)" strokeOpacity=".3" />
        <circle cx={c} cy={c} r={safe} stroke="var(--go)" strokeOpacity=".5" strokeDasharray="6 4" />
        <line x1={c} y1="0" x2={c} y2={S} stroke="var(--tele)" strokeOpacity=".25" />
        <line x1="0" y1={c} x2={S} y2={c} stroke="var(--tele)" strokeOpacity=".25" />
        <circle cx={g.flameTip.x * S} cy={g.flameTip.y * S} r="5" stroke="var(--ignite-3)" />
        <circle cx={g.flameTip.x * S} cy={g.flameTip.y * S} r="1.5" fill="var(--ignite-3)" />
      </svg>
    </div>
  )
}

function Specimen() {
  const tab = (bg, fg, label) => (
    <div className="bp-cell">
      <div style={{ background: bg, padding: '8px 10px 0', borderRadius: 10 }}>
        <div className="bp-tab" style={{ background: fg === '#fff' ? 'rgba(255,255,255,.12)' : '#fff', color: fg }}>
          <img src="/favicon.svg" width="16" height="16" alt="" /> <span>KIND — Daily Family…</span>
        </div>
      </div>
      <span>{label}</span>
    </div>
  )
  return (
    <div className="bp">
      <style>{css}</style>
      <header className="bp-top">
        <h1 className="bp-h">Brand</h1>
        <span className="bp-mono">src/art/Brand.jsx · generated by scripts/make-icons.mjs</span>
        <Lockup size={44} layout="row" tagline={false} style={{ marginLeft: 'auto' }} />
      </header>

      {show('marks') && (
        <section className="bp-sec">
          <div className="bp-mono">Mark · sizes (lite under 56 px)</div>
          <div className="bp-row">
            {SIZES.map((s) => (
              <div className="bp-cell" key={s}><Mark size={s} title={`KIND ${s}`} /><span>{s}</span></div>
            ))}
          </div>
          <div className="bp-mono" style={{ marginTop: 28 }}>Forced detail — full at 24/32, lite at 160</div>
          <div className="bp-row">
            <div className="bp-cell"><Mark size={24} detail="full" /><span>24 full</span></div>
            <div className="bp-cell"><Mark size={32} detail="full" /><span>32 full</span></div>
            <div className="bp-cell"><Mark size={160} detail="lite" /><span>160 lite</span></div>
            <div className="bp-cell"><Mark size={160} /><span>160 auto</span></div>
          </div>
          <div className="bp-mono" style={{ marginTop: 28 }}>Glow · off / on / 40 %</div>
          <div className="bp-row">
            <div className="bp-surface bp-s0"><Mark size={140} /></div>
            <div className="bp-surface bp-s0"><Mark size={140} glow /></div>
            <div className="bp-surface bp-s0"><Mark size={140} glow={0.4} /></div>
          </div>
          <div className="bp-mono" style={{ marginTop: 28 }}>Surfaces</div>
          <div className="bp-row">
            <div className="bp-surface bp-s0"><Mark size={96} /></div>
            <div className="bp-surface bp-s1"><Mark size={96} /></div>
            <div className="bp-surface bp-s2"><Mark size={96} /></div>
            <div className="bp-surface bp-s3"><Mark size={96} /></div>
          </div>
          <div className="bp-mono" style={{ marginTop: 28 }}>Variants · k / mono (currentColor)</div>
          <div className="bp-row">
            <div className="bp-surface bp-s0"><Mark variant="k" size={96} /></div>
            <div className="bp-surface bp-s0" style={{ color: 'var(--ink)' }}><Mark variant="mono" size={96} /></div>
            <div className="bp-surface bp-s0" style={{ color: 'var(--ti-3)' }}><Mark variant="mono" size={96} /></div>
            <div className="bp-surface bp-s0" style={{ color: 'var(--ignite-2)' }}><Mark variant="mono" size={96} /></div>
            <div className="bp-surface bp-s3"><Mark variant="mono" size={96} /></div>
            <div className="bp-surface bp-s0"><Mark variant="mono" size={20} /></div>
          </div>
          <p className="bp-note">A dozen marks on one page share no ids: each instance gets its own gradient, clip and filter names. Stable part classes for choreography: .brand-mark__rim · __plate · __ticks · __k · __flame · __glow.</p>
        </section>
      )}

      {show('wordmark') && (
        <section className="bp-sec">
          <div className="bp-mono">Wordmark · cap height 12 / 16 / 24 / 40 / 72</div>
          <div className="bp-row" style={{ alignItems: 'center' }}>
            {[12, 16, 24, 40, 72].map((s) => <Wordmark key={s} size={s} />)}
          </div>
          <div className="bp-row" style={{ alignItems: 'center', marginTop: 24 }}>
            <Wordmark size={72} tone="metal" />
            <div className="bp-surface bp-s3"><Wordmark size={48} /></div>
            <div style={{ color: 'var(--ignite-2)' }}><Wordmark size={48} /></div>
          </div>
        </section>
      )}

      {show('lockup') && (
        <section className="bp-sec">
          <div className="bp-mono">Lockup · stack 120 / 200 / 280 · row 96 / 160 · no tagline</div>
          <div className="bp-row" style={{ alignItems: 'flex-start' }}>
            <div className="bp-surface bp-s0"><Lockup size={120} /></div>
            <div className="bp-surface bp-s0"><Lockup size={200} /></div>
            <div className="bp-surface bp-s0"><Lockup size={280} glow /></div>
          </div>
          <div className="bp-row" style={{ marginTop: 24 }}>
            <div className="bp-surface bp-s0"><Lockup size={96} layout="row" /></div>
            <div className="bp-surface bp-s0"><Lockup size={160} layout="row" /></div>
            <div className="bp-surface bp-s0"><Lockup size={120} tagline={false} /></div>
          </div>
        </section>
      )}

      {show('assets') && (
        <section className="bp-sec">
          <div className="bp-mono">App icons · icon.svg · 192 · 512 · apple-touch 180</div>
          <div className="bp-row">
            <div className="bp-cell"><img src="/icon.svg" width="192" height="192" alt="icon.svg" /><span>icon.svg</span></div>
            <div className="bp-cell"><img src="/icon-192.png" width="192" height="192" alt="icon-192" /><span>192 png</span></div>
            <div className="bp-cell"><img src="/icon-512.png" width="256" height="256" alt="icon-512" /><span>512 png</span></div>
            <div className="bp-cell"><img src="/apple-touch-icon.png" width="180" height="180" style={{ borderRadius: 40 }} alt="apple-touch" /><span>apple-touch 180 (iOS rounds it)</span></div>
          </div>
          <div className="bp-mono" style={{ marginTop: 28 }}>Maskable · full-bleed, 80 % safe circle · masks: circle, squircle, rounded square</div>
          <div className="bp-row">
            <div className="bp-cell"><div className="bp-safe"><img src="/icon-maskable-512.png" alt="maskable" /><i /></div><span>outside the circle is cut</span></div>
            <div className="bp-cell"><img src="/icon-maskable-512.png" width="160" height="160" style={{ borderRadius: '50%' }} alt="" /><span>circle</span></div>
            <div className="bp-cell"><img src="/icon-maskable-512.png" width="160" height="160" style={{ borderRadius: '30%' }} alt="" /><span>squircle</span></div>
            <div className="bp-cell"><img src="/icon-maskable-512.png" width="160" height="160" style={{ borderRadius: '12%' }} alt="" /><span>rounded square</span></div>
            <div className="bp-cell"><img src="/icon-maskable-512.png" width="64" height="64" style={{ borderRadius: '50%' }} alt="" /><span>launcher 64</span></div>
          </div>
          <div className="bp-mono" style={{ marginTop: 28 }}>Monochrome (Android themed icons) · alpha only, tinted by the system</div>
          <div className="bp-row">
            {[['#2b3a67', '#d6e3ff'], ['#3b3b3b', '#f2f2f2'], ['#4a2c2c', '#ffd9d3'], ['#1f3d2b', '#c7efd1']].map(([bg, fg]) => (
              <div className="bp-cell" key={bg}>
                <div style={{ width: 112, height: 112, borderRadius: '50%', background: bg, display: 'grid', placeItems: 'center' }}>
                  <div style={{ width: 112, height: 112, background: fg, WebkitMask: 'url(/icon-monochrome-512.png) center/100% no-repeat', mask: 'url(/icon-monochrome-512.png) center/100% no-repeat' }} />
                </div>
                <span>{fg}</span>
              </div>
            ))}
          </div>
          <div className="bp-mono" style={{ marginTop: 28 }}>Favicon · 16 / 32 / 48 / 64 (pixelated 6×) and in a tab, dark + light</div>
          <div className="bp-row" style={{ alignItems: 'flex-end' }}>
            {[16, 32, 48].map((s) => (
              <div className="bp-cell" key={s}><img className="bp-px" src={`/favicon-32.png`} width={s * 6 > 192 ? 192 : s * 6} height={s * 6 > 192 ? 192 : s * 6} alt="" style={{ display: s === 16 ? 'none' : 'block' }} /><span>{s === 16 ? '' : `${s}`}</span></div>
            ))}
            <div className="bp-cell"><img src="/favicon.svg" width="16" height="16" alt="" /><span>16 (svg)</span></div>
            <div className="bp-cell"><img src="/favicon.svg" width="32" height="32" alt="" /><span>32 (svg)</span></div>
            <div className="bp-cell"><img src="/favicon.svg" width="96" height="96" alt="" /><span>96 (svg)</span></div>
            {tab('#202124', '#fff', 'tab · dark')}
            {tab('#dee1e6', '#202124', 'tab · light')}
          </div>
          <div className="bp-mono" style={{ marginTop: 28 }}>Social · og 1200×630 · twitter 1200×600</div>
          <div className="bp-row">
            <div className="bp-cell"><img className="bp-img" src="/og.png" width="600" alt="og" /><span>og.png</span></div>
            <div className="bp-cell"><img className="bp-img" src="/og-twitter.png" width="600" alt="twitter" /><span>og-twitter.png</span></div>
          </div>
          <div className="bp-mono" style={{ marginTop: 28 }}>Play Store · icon 512 · feature graphic 1024×500</div>
          <div className="bp-row">
            <div className="bp-cell"><img src="/../store/icon-512.png" width="160" height="160" alt="" /><span>store icon</span></div>
            <div className="bp-cell"><img className="bp-img" src="/../store/feature-graphic-1024x500.png" width="640" alt="feature" /><span>feature graphic</span></div>
          </div>
          <div className="bp-mono" style={{ marginTop: 28 }}>iOS startup images (3 of 21)</div>
          <div className="bp-row">
            {['apple-splash-1170x2532.png', 'apple-splash-750x1334.png', 'apple-splash-2048x2732.png'].map((f) => (
              <div className="bp-cell" key={f}><img className="bp-img" src={`/splash/${f}`} height="460" style={{ height: 460, width: 'auto' }} alt="" /><span>{f}</span></div>
            ))}
          </div>
        </section>
      )}

      {show('colour') && (
        <section className="bp-sec">
          <div className="bp-mono">Colour · hex copies of tokens.css (checked at build)</div>
          <div className="bp-row" style={{ alignItems: 'flex-start' }}>
            {Object.entries(BRAND.colors).map(([k, v]) => (
              <div className="bp-chip" key={k}><i style={{ background: v }} /><b>{NAMES[k] || k}</b><span>{v}</span></div>
            ))}
          </div>
        </section>
      )}

      {show('construction') && (
        <section className="bp-sec">
          <div className="bp-mono">Construction · hexagon R=200 of 400 · inner plate · 80 % safe circle · flame tip</div>
          <div className="bp-row" style={{ alignItems: 'flex-start' }}>
            <div className="bp-surface bp-s0"><Construction size={360} /></div>
          </div>
        </section>
      )}
    </div>
  )
}

mount(<Specimen />, { fx: q.get('fx') === 'lite' ? 'lite' : 'full' })
