// Behavioural checks for src/fx/*.   node playground/fx.test.mjs      (needs the dev server on :5183)
// Real Chrome, real pixels where it matters. Exits 1 on any failure.
import { chromium } from 'playwright-core'
import { existsSync } from 'node:fs'
import { DEVICES } from '../tools/browser.mjs'

const URL = 'http://localhost:5183/playground/fx.html'
const EXE = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--hide-scrollbars'] })

let failed = 0, passed = 0
const check = (name, ok, detail = '') => { if (ok) passed++; else failed++; console.log(`${ok ? '  ok ' : ' FAIL'}  ${name}${detail ? '   ' + detail : ''}`) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const HMR_OFF = () => {
  const R = window.WebSocket
  window.WebSocket = function (u, p) { if (p === 'vite-hmr') return Object.assign(new EventTarget(), { send() {}, close() {}, readyState: 3 }); return new R(u, p) }
}

async function ctxOf({ device = 'iphone', reduced = false, ua, init, query = '' } = {}) {
  const d = DEVICES[device]
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, isMobile: d.mobile, hasTouch: d.mobile, colorScheme: 'dark', reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', ...(ua ? { userAgent: ua } : {}) })
  await ctx.addInitScript(HMR_OFF)
  if (init) await ctx.addInitScript(init)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })
  await page.goto(URL + query, { waitUntil: 'load', timeout: 90000 })
  await page.evaluate(() => document.fonts && document.fonts.ready)
  await sleep(500)
  return { ctx, page, errors }
}
const ev = (p, js) => p.evaluate(js)

/* ───────────── A. the engine, on a touch phone ───────────── */
console.log('\nA · engine + level (iPhone-size, touch)')
{
  const { ctx, page: p, errors } = await ctxOf({
    init: () => { window.__vib = []; Object.defineProperty(navigator, 'vibrate', { value: (x) => { window.__vib.push(x); return true }, configurable: true }) },
  })
  check('data-fx is set at boot', ['full', 'lite'].includes(await ev(p, 'document.documentElement.dataset.fx')))
  check('canvas + flash mounted in full', await ev(p, '!!document.querySelector("canvas.fx-layer") && !!document.querySelector(".fx-flash")'))

  // lazy GL: made at idle after mount (not before), and always before the first effect
  await sleep(3200)
  const s0 = await ev(p, 'fx.stats()')
  check('GL context prewarmed in idle time', s0.renderer === 'webgl', 'renderer=' + s0.renderer)
  check('antialias off (no MSAA buffer)', await ev(p, '(() => { const c = document.querySelector("canvas.fx-layer"); const g = c.getContext("webgl"); return g && g.getContextAttributes().antialias === false })()'))
  check('canvas hidden while idle', await ev(p, 'getComputedStyle(document.querySelector("canvas.fx-layer")).display') === 'none')

  await ev(p, 'fx.celebrate({x:195,y:420})')
  await sleep(120)
  const s1 = await ev(p, 'fx.stats()')
  check('effect runs: live particles > 0, rAF subscribed', s1.live > 0 && s1.running, 'live=' + s1.live)
  check('canvas visible while alive, DPR capped at 2', (await ev(p, 'getComputedStyle(document.querySelector("canvas.fx-layer")).display')) !== 'none' && s1.dpr <= 2, 'dpr=' + s1.dpr)

  // pool cap
  await ev(p, 'for (let i = 0; i < 12; i++) { fx.cannons(); fx.celebrate({x:100,y:300},{big:true}); fx.sparks({x:200,y:400,n:80}) }')
  const s2 = await ev(p, 'fx.stats()')
  check('live particles never exceed the 150 cap', s2.live <= 150, 'live=' + s2.live)
  check('rings never exceed the cap', s2.rings <= 10, 'rings=' + s2.rings)

  // flash gap: two flashes inside 340 ms make one animation (WCAG 2.3.1)
  await ev(p, 'fx.clear()')
  await sleep(450)
  const nAnim = await ev(p, '(() => { fx.flash("ignite", 300); fx.flash("gold", 300); fx.flash("tele", 300); return document.querySelector(".fx-flash").getAnimations().length })()')
  check('flashes are rate-limited to < 3 per second', nAnim === 1, 'animations=' + nAnim)

  // shrink on idle, then grow back and still draw
  await ev(p, 'fx.clear()')
  await sleep(8800)
  const s3 = await ev(p, 'fx.stats()')
  check('backing store released after 8 s idle', s3.shrunk === true && (await ev(p, 'document.querySelector("canvas.fx-layer").width')) === 1, 'shrunk=' + s3.shrunk)
  await ev(p, 'fx.sparks({x:195,y:420,n:30})')
  await sleep(150)
  const s4 = await ev(p, 'fx.stats()')
  check('grows back on the next effect', s4.shrunk === false && s4.w === 390 && (await ev(p, 'document.querySelector("canvas.fx-layer").width')) === 390 * s4.dpr, `w=${s4.w} dpr=${s4.dpr}`)

  // no per-frame growth in the pool bookkeeping
  const raf = await ev(p, '(() => ({ size: lab.raf.size }))()')
  check('rAF subscribers are bounded (HUD + engine)', raf.size <= 4, 'size=' + raf.size)

  // trail ↔ element lifecycle
  const trailOk = await ev(p, `(async () => {
    const el = document.createElement('div'); el.style.cssText = 'position:fixed;left:150px;top:300px;width:40px;height:40px'; document.body.appendChild(el)
    const t = fx.trail(el); await new Promise(r => setTimeout(r, 400))
    const during = fx.stats()
    el.remove(); await new Promise(r => setTimeout(r, 120))
    const afterRemove = fx.stats().trails
    t.stop(); return { live: during.live, trails: during.trails, afterRemove }
  })()`)
  check('trail emits while its element lives', trailOk.live > 8 && trailOk.trails === 1, JSON.stringify(trailOk))
  check('trail ends itself when its element leaves the DOM', trailOk.afterRemove === 0)

  // fly callbacks
  const fly = await ev(p, `(async () => { let arrived = 0, done = 0; fx.fly({ from: {x:40,y:700}, to: {x:330,y:50}, n: 4, ms: 400, onArrive: () => arrived++, onDone: () => done++ }); await new Promise(r => setTimeout(r, 1100)); return { arrived, done } })()`)
  check('fly arrives n times and calls onDone once', fly.arrived === 4 && fly.done === 1, JSON.stringify(fly))

  // lite: everything is a no-op, the state change still happens
  await ev(p, 'lab.prefs.set("fx","lite")')
  await sleep(250)
  check('lite: html[data-fx=lite]', await ev(p, 'document.documentElement.dataset.fx') === 'lite')
  check('lite: canvas unmounted', await ev(p, '!document.querySelector("canvas.fx-layer")'))
  await ev(p, 'fx.celebrate({x:100,y:100}); fx.sparks({x:1,y:1}); fx.cannons()')
  check('lite: fx calls make no particles', (await ev(p, 'fx.stats().live')) === 0)
  const litefly = await ev(p, `(() => { let a = 0, d = 0; fx.fly({ from: {x:1,y:1}, to: {x:2,y:2}, n: 5, onArrive: () => a++, onDone: () => d++ }); return { a, d } })()`)
  check('lite: fly resolves synchronously so the HUD still updates', litefly.a === 5 && litefly.d === 1, JSON.stringify(litefly))
  // the lab itself keeps two stat pollers (HUD + level panel); the engine, tilt and canvas must add nothing in lite
  check('lite: engine adds no rAF subscribers', (await ev(p, 'lab.raf.size')) === 2, 'size=' + (await ev(p, 'lab.raf.size')))
  const tilt = await ev(p, `getComputedStyle(document.querySelector('.card')).transform`)
  check('lite: .fx-tilt has no transform', tilt === 'none', tilt)
  await ev(p, 'lab.prefs.set("fx","full")')
  await sleep(300)
  check('back to full: canvas returns and works', (await ev(p, '!!document.querySelector("canvas.fx-layer")')) && (await (async () => { await ev(p, 'fx.sparks({x:100,y:300})'); await sleep(100); return ev(p, 'fx.stats().live > 0') })()))
  await ev(p, 'lab.prefs.set("fx","auto")')

  // ── hooks ──
  console.log('\nB · hooks')
  // count-up
  await p.locator('.big').first().scrollIntoViewIfNeeded()
  const cu = await ev(p, `(async () => { const out = []; const el = () => document.querySelector('.big').textContent; for (let i = 0; i < 8; i++) { out.push(el()); await new Promise(r => setTimeout(r, 220)) } return out })()`)
  check('count-up reaches its target', /1,240/.test(cu[cu.length - 1]), cu.join(' | '))
  check('count-up never overshoots (outExpo)', cu.every((t) => parseInt(t.replace(/[^\d]/g, ''), 10) <= 1240))

  // pointer tilt + glare
  await p.locator('.card').scrollIntoViewIfNeeded()
  await sleep(200)
  const box = await p.locator('.card').boundingBox()
  await p.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1, { steps: 5 })
  await sleep(70)
  check('tilt: will-change exists while it is moving', await ev(p, `document.querySelector('.card').hasAttribute('data-tilting')`))
  await sleep(630)
  const t1 = await ev(p, `(() => { const s = document.querySelector('.card').style; return { rx: parseFloat(s.getPropertyValue('--rx')), ry: parseFloat(s.getPropertyValue('--ry')), g: parseFloat(s.getPropertyValue('--tilt-on')), gx: parseFloat(s.getPropertyValue('--gx')) } })()`)
  check('tilt: top-right pointer sinks that corner (rx > 0, ry > 0)', t1.rx > 4 && t1.ry > 4, JSON.stringify(t1))
  check('tilt: glare is on and follows (gx > 70%)', t1.g > 0.9 && t1.gx > 70)
  await p.mouse.move(2, 2, { steps: 4 })
  await sleep(1400)
  const t2 = await ev(p, `(() => { const s = document.querySelector('.card').style; return { rx: parseFloat(s.getPropertyValue('--rx')), ry: parseFloat(s.getPropertyValue('--ry')), g: parseFloat(s.getPropertyValue('--tilt-on')) } })()`)
  check('tilt: springs home on leave, glare fades', Math.abs(t2.rx) < 0.3 && Math.abs(t2.ry) < 0.3 && t2.g < 0.05, JSON.stringify(t2))
  check('tilt: asleep at rest (no rAF churn, no will-change)', !(await ev(p, `document.querySelector('.card').hasAttribute('data-tilting')`)))

  // gyro (Android-style: no permission prompt)
  const gy = await ev(p, `(async () => {
    const send = (b, g) => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: b, gamma: g }))
    send(40, 0); await new Promise(r => setTimeout(r, 40)); send(40, 0)
    await new Promise(r => setTimeout(r, 60))
    send(40, 22); await new Promise(r => setTimeout(r, 700))
    const s = document.querySelector('.card').style
    return { ry: parseFloat(s.getPropertyValue('--ry')), g: parseFloat(s.getPropertyValue('--tilt-on')) }
  })()`)
  check('gyro: leaning the phone right tilts the card (ry < 0) with glare', gy.ry < -4 && gy.g > 0.4, JSON.stringify(gy))

  // scroll var + in-view
  await p.locator('.scroller').scrollIntoViewIfNeeded()
  await ev(p, `(async () => { const s = document.querySelector('.scroller'); while (s.scrollTop + s.clientHeight < s.scrollHeight - 1) { s.scrollTop += 36; await new Promise(r => setTimeout(r, 40)) } })()`)
  await sleep(600)
  const sv = await ev(p, `parseFloat(getComputedStyle(document.querySelector('.scroller').parentElement).getPropertyValue('--demo-scroll'))`)
  check('useScrollVar writes 0..1 on the target', sv > 0.97 && sv <= 1, 'var=' + sv)
  const seen = await ev(p, `[...document.querySelectorAll('.fx-reveal')].filter((e) => e.dataset.in === 'true').length`)
  check('useInView reveals every row as it enters', seen === 14, 'revealed=' + seen)

  // raf loop sleeps when hidden
  const hid = await ev(p, `(async () => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))
    await new Promise(r => setTimeout(r, 200)); const a = lab.raf.running
    Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))
    await new Promise(r => setTimeout(r, 200)); return { hidden: a, back: lab.raf.running }
  })()`)
  check('shared rAF loop pauses when the tab is hidden and resumes', hid.hidden === false && hid.back === true, JSON.stringify(hid))

  // keyboard
  console.log('\nC · keyboard + focus')
  await p.locator('.field').scrollIntoViewIfNeeded()
  await p.locator('.field').focus()
  await ev(p, 'fx.clear()')
  await p.keyboard.press('Enter')
  await sleep(120)
  check('Enter on the tap field fires the effect', (await ev(p, 'fx.stats().live')) > 0)
  const radio = p.locator('[role=radiogroup]').first().locator('[role=radio]')
  await radio.first().focus()
  await p.keyboard.press('ArrowRight')
  const sel = await ev(p, `document.querySelector('[role=radiogroup]').querySelector('[aria-checked=true]').textContent`)
  check('arrow keys move a radio group (roving tabindex)', sel === 'embers', sel)
  check('exactly one tab stop per radio group', await ev(p, `document.querySelector('[role=radiogroup]').querySelectorAll('[tabindex="0"]').length`) === 1)
  const outlines = await ev(p, `(() => { const b = document.querySelector('.chip'); b.focus(); return getComputedStyle(b).outlineStyle })()`)
  check('focus-visible ring is drawn', outlines === 'solid' || outlines === 'auto', outlines)

  // haptics on Android path
  console.log('\nD · haptics (Android path: navigator.vibrate)')
  await p.mouse.click(200, 300)       // user activation
  await ev(p, 'window.__vib.length = 0')
  const H = async (name) => { await ev(p, `lab.haptic.${name}()`); await sleep(30); return ev(p, 'window.__vib.splice(0)') }
  const vtap = await H('tap'), vsel = await H('select'), vsuc = await H('success'), vwarn = await H('warning'), verr = await H('error'), vhv = await H('heavy'), vln = await H('launch')
  check('tap = 8 ms', JSON.stringify(vtap) === '[8]', JSON.stringify(vtap))
  check('select = 12 ms', JSON.stringify(vsel) === '[12]')
  check('success = double tick', JSON.stringify(vsuc) === '[[10,48,16]]', JSON.stringify(vsuc))
  check('warning = single 30 ms', JSON.stringify(vwarn) === '[30]')
  check('error = triple stutter', JSON.stringify(verr) === '[[18,44,18,44,30]]')
  check('heavy = 40 ms', JSON.stringify(vhv) === '[40]')
  const ln = vln[0] || []
  check('launch ramps: pulses lengthen, gaps close, ends on a thump', ln.length > 12 && ln[0] < ln[ln.length - 3] && ln[1] > ln[ln.length - 2] && ln[ln.length - 1] === 90, ln.join(','))
  await ev(p, 'lab.haptic.cue("correct")'); const vc = await ev(p, 'window.__vib.splice(0)')
  check('cue("correct") maps to success', JSON.stringify(vc) === '[[10,48,16]]', JSON.stringify(vc))
  await ev(p, 'lab.haptic.cue("nonsense")'); check('cue(unknown) is ignored', (await ev(p, 'window.__vib.length')) === 0)
  await sleep(40)
  await ev(p, 'lab.prefs.set("haptics", false)'); await ev(p, 'lab.haptic.heavy()')
  check('prefs.haptics=false silences everything', (await ev(p, 'window.__vib.length')) === 0)
  await ev(p, 'lab.prefs.set("haptics", true)')

  check('no console errors in session A', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

/* ───────────── B. reduced motion ───────────── */
console.log('\nE · prefers-reduced-motion')
{
  const { ctx, page: p, errors } = await ctxOf({ reduced: true })
  check('auto + reduced-motion → lite', (await ev(p, 'document.documentElement.dataset.fx')) === 'lite' && (await ev(p, 'lab.level().reason')) === 'reduced-motion', JSON.stringify(await ev(p, 'lab.level()')))
  await ev(p, 'fx.celebrate({x:100,y:100})')
  check('…and effects stay off', (await ev(p, 'fx.stats().live')) === 0 && (await ev(p, '!document.querySelector("canvas.fx-layer")')))
  const cu = await ev(p, `document.querySelector('.big').textContent`)
  check('count-up lands immediately in lite (no flash of 0)', /1,240/.test(cu), cu)
  await ev(p, 'lab.prefs.set("fx","full")'); await sleep(250)
  check('explicit "full" overrides the OS setting', (await ev(p, 'document.documentElement.dataset.fx')) === 'full' && (await ev(p, 'lab.level().reason')) === 'user')
  await ev(p, 'lab.prefs.set("fx","auto")')
  check('no console errors', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

/* ───────────── C. iOS haptics ───────────── */
console.log('\nF · haptics (iOS path: <input switch>)')
{
  const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  const { ctx, page: p, errors } = await ctxOf({
    ua: UA,
    init: () => {
      Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true })
      window.__ticks = []
      const real = HTMLLabelElement.prototype.click
      HTMLLabelElement.prototype.click = function () { window.__ticks.push(Math.round(performance.now())); return real.call(this) }
    },
  })
  await p.mouse.click(200, 300)
  await ev(p, 'window.__ticks.length = 0')
  await ev(p, 'lab.haptic.tap()'); await sleep(80)
  check('iOS tap → one switch tick', (await ev(p, 'window.__ticks.length')) === 1, 'ticks=' + (await ev(p, 'window.__ticks.length')))
  check('switch exists, hidden from AT, not inert, offscreen', await ev(p, `(() => { const i = document.querySelector('input[type=checkbox][switch]'); const w = i.closest('div'); return !!i && w.getAttribute('aria-hidden') === 'true' && !w.hasAttribute('inert') && w.getBoundingClientRect().left < -100 })()`))
  await sleep(40); await ev(p, 'window.__ticks.length = 0')
  await ev(p, 'lab.haptic.success()'); await sleep(260)
  const sx = await ev(p, 'window.__ticks.slice()')
  check('success → two ticks ~90 ms apart', sx.length === 2 && sx[1] - sx[0] > 60 && sx[1] - sx[0] < 160, JSON.stringify(sx))
  await sleep(40); await ev(p, 'window.__ticks.length = 0')
  await ev(p, 'lab.haptic.launch()'); await sleep(1700)
  const lx = await ev(p, 'window.__ticks.slice()')
  const gaps = lx.slice(1).map((t, i) => t - lx[i])
  const avg = (x) => x.reduce((q, w) => q + w, 0) / x.length   // timers jitter on a busy machine: compare averages, not single gaps
  check('launch → an accelerating tick train', lx.length >= 9 && avg(gaps.slice(0, 3)) > avg(gaps.slice(5, 9)) * 1.5, 'ticks=' + lx.length + ' gaps=' + gaps.join(','))
  check('a tick never bubbles to document click handlers', await ev(p, `(() => { let n = 0; const f = () => n++; document.addEventListener('click', f); lab.haptic.heavy(); document.removeEventListener('click', f); return n === 0 })()`))
  check('no console errors', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

/* ───────────── D. Canvas 2D fallback ───────────── */
console.log('\nG · Canvas 2D fallback')
{
  const { ctx, page: p, errors } = await ctxOf({ query: '?renderer=2d' })
  await ev(p, 'fx.celebrate({x:195,y:420})')
  await sleep(260)
  const st = await ev(p, 'fx.stats()')
  check('?renderer=2d uses the 2D renderer', st.renderer === '2d' && st.live > 0, JSON.stringify({ r: st.renderer, live: st.live }))
  const lit = await ev(p, `(() => { const c = document.querySelector('canvas.fx-layer'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] > 8) n++; return n })()`)
  check('2D fallback actually paints pixels', lit > 200, 'lit samples=' + lit)
  await ev(p, 'fx.trail(document.querySelector(".marker"))'); await sleep(300)
  check('2D fallback: trail (diamonds, tongues) runs', (await ev(p, 'fx.stats().live')) > 6)
  check('no console errors', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

await browser.close()
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
