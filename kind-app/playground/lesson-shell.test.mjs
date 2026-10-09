// lesson-shell behaviour test:  node playground/lesson-shell.test.mjs   (dev server on :5183)
// Walks a whole lesson through the fake slide/exercise registry: step count, ticker, keyboard, swipes, retry queue,
// finishDay once, resume, practice mode, the leave dialog, header/footer geometry at 360x640.
import { open } from '../tools/browser.mjs'

const URL = 'http://localhost:5183/playground/lesson-shell.html?day=12'
let fails = 0
const ok = (c, m, extra = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m + (extra ? '  ' + extra : '')) }

const b = await open({ url: URL, device: 'lowend', dpr: 1 })
const { page } = b
const wait = (ms) => page.waitForTimeout(ms)
const reload = async () => { await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForSelector('.lesson', { timeout: 90000 }); await wait(1400) }
const read = () => page.evaluate(() => {
  const el = (s) => document.querySelector(s)
  return {
    valuenow: el('.k-ticker')?.getAttribute('aria-valuenow'), valuemax: el('.k-ticker')?.getAttribute('aria-valuemax'),
    count: el('.lesson-count')?.textContent, layers: document.querySelectorAll('.lesson-layer').length,
    kind: el('.lesson-layer:not([aria-hidden]) .lesson-slide')?.getAttribute('data-kind') || (el('.lesson-layer:not([aria-hidden]) [data-testid=ex]') ? 'EX' : null),
    foot: el('.lesson-foot')?.hasAttribute('data-off') ? 'off' : 'on', cta: el('.lesson-go')?.textContent?.trim(),
    back: !!el('.lesson-back'), exRetry: el('.lesson-layer:not([aria-hidden]) [data-testid=ex]')?.getAttribute('data-retry'),
    closed: !!el('[data-testid=closed]'), complete: !!el('.lesson-complete'), dialog: !!el('.k-dialog'), practice: !!el('.lesson-practice'),
    said: el('.lesson-layer ~ * , [role=status]')?.textContent,
  }
})
const store = () => page.evaluate(async () => {
  const lib = await import('/src/lib.js'); const m = await import('/src/store.js')
  const sid = lib.activeSeriesId(); const st = m.snapshot(); const sub = st.series[sid] || { done: {}, pos: {}, results: {} }
  return { sid, xp: st.xp, pos: sub.pos[12] || 0, done: !!sub.done[12], result: sub.results[12] || null, streak: st.streak }
})
const settle = async () => { await wait(90); await page.waitForFunction(() => document.querySelectorAll('.lesson-layer').length === 1, null, { timeout: 8000 }).catch(() => {}); await wait(80) }
const press = async (k) => { await page.keyboard.press(k); await settle() }
const swipe = async (dx, y = 300) => {
  const x0 = dx < 0 ? 300 : 60
  await page.mouse.move(x0, y); await page.mouse.down()
  const steps = 8
  for (let i = 1; i <= steps; i++) { await page.mouse.move(x0 + (dx * i) / steps, y + (i % 2)); await wait(12) }
  await page.mouse.up(); await settle()
}
const click = async (sel) => { await page.click(sel); await settle() }

await wait(1500)
let r = await read(), s0 = await store()
ok(r.valuemax === '17', 'step count = 13 cards + 4 checks (17)', JSON.stringify([r.valuemax, r.count]))
ok(r.valuenow === '0' && r.count === '01/17' && r.kind === 'open' && r.cta === 'Begin', 'opens on the open card, 0 done, BEGIN', JSON.stringify(r))
ok(r.layers === 1 && !r.back, 'one layer, no BACK on step 1')

const tele = await page.evaluate(() => document.querySelector('.lesson-tele')?.textContent)
ok(/^T\+00:\d\d.*liftoff/i.test(tele || ''), 'telemetry line: mission clock + Liftoff call-out', tele)
// fps (rAF) while idle on the open slide
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res(Math.round(n / ((performance.now() - t0) / 1000))) }; requestAnimationFrame(f) }))
console.log('INFO idle rAF fps', fps)

// keyboard
await press('Enter'); r = await read()
ok(r.count === '02/17' && r.valuenow === '1' && r.layers === 1, 'Enter advances to 02/17 (settled, one layer)', JSON.stringify(r))
ok(r.back, 'BACK appears from step 2')
await press('ArrowRight'); await press('ArrowLeft'); r = await read()
ok(r.count === '02/17', 'ArrowRight then ArrowLeft returns to 02/17', r.count)
ok((await store()).pos === 2, 'setPos saved the furthest step (forward only, index 2)', JSON.stringify(await store()))
// Enter on the focused CONTINUE button must advance exactly once (no double-fire)
await page.focus('.lesson-go'); await press('Enter'); r = await read()
ok(r.count === '03/17', 'Enter on focused CONTINUE advances once', r.count)
await press(' '); r = await read()
ok(r.count === '04/17', 'Space advances', r.count)

// swipes: full left swipe pages; a small one springs back; back swipe returns
await swipe(-220); r = await read()
ok(r.count === '05/17' && r.layers === 1, 'swipe left pages forward', JSON.stringify([r.count, r.layers]))
await swipe(-30); r = await read()
ok(r.count === '05/17' && r.layers === 1, 'short swipe springs back (no page)', JSON.stringify([r.count, r.layers]))
await swipe(220); r = await read()
ok(r.count === '04/17', 'swipe right pages back', r.count)
// vertical scroll intent must not page
await page.mouse.move(180, 200); await page.mouse.down(); await page.mouse.move(185, 330, { steps: 6 }); await page.mouse.up(); await wait(700)
r = await read(); ok(r.count === '04/17', 'vertical drag does not page', r.count)
// leave dialog + Esc
await page.keyboard.press('Escape'); await wait(500); r = await read()
ok(r.dialog, 'Esc with progress opens the leave dialog')
await page.keyboard.press('Escape'); await wait(500); r = await read()
ok(!r.dialog && !r.closed, 'Esc again keeps going (dialog closes, lesson stays)', JSON.stringify(r))

// the browser/Android Back gesture asks first (history entry pushed by the lesson)
await page.goBack(); await wait(600); r = await read()
ok(r.dialog && !r.closed, 'Back with progress opens the leave dialog instead of leaving', JSON.stringify([r.dialog, r.closed]))
await page.keyboard.press('Escape'); await wait(500)
ok(!(await read()).dialog, 'dialog dismissed')

// walk the readings to the first check
let guard = 0
while ((await read()).kind !== 'EX' && guard++ < 20) await press('Enter')
r = await read()
ok(r.kind === 'EX' && r.foot === 'off', 'first check reached; shell footer is hidden on checks', JSON.stringify(r))
ok(r.count === '13/17', 'first check is step 13/17 (12 reading cards before it)', r.count)
await swipe(-220); r = await read(); ok(r.count === '13/17', 'swipe on a check never pages', r.count)
const before = await store()
// ex1 wrong -> retry queued (n 17 -> 18); ex2 right; ex3 right; ex4 right
await click('[data-t=wrong]'); await click('[data-t=cont]')
r = await read(); ok(r.valuemax === '18', 'a wrong first answer appends one retry (18 steps)', r.valuemax)
await click('[data-t=right]'); await click('[data-t=cont]')
await click('[data-t=right]'); await click('[data-t=cont]')
await click('[data-t=right]'); await click('[data-t=cont]')
r = await read(); ok(r.kind === 'EX' && r.exRetry === '1', 'the recycled question comes back after the checks', JSON.stringify(r))
await click('[data-t=wrong]'); await click('[data-t=cont]')
r = await read(); ok(r.valuemax === '18', 'a wrong retry is not queued again (still 18)', r.valuemax)
ok(r.kind === 'declare' && r.count === '18/18', 'the declaration is last', JSON.stringify(r))
ok(r.foot === 'off' || r.cta === 'Finish' || r.cta === 'Complete lesson', 'declare footer follows setFooter({hidden:true})', JSON.stringify(r))
await page.keyboard.press('Enter'); await wait(500)
ok((await read()).kind === 'declare' && !(await read()).complete, 'Enter cannot finish while the footer is hidden')
await click('[data-t=hold]'); r = await read()
ok(r.foot === 'on' && r.cta === 'Finish', 'setFooter label override shows FINISH', JSON.stringify(r))
const xp0 = (await store()).xp
await page.click('.lesson-go'); await page.click('.lesson-go', { timeout: 300 }).catch(() => {}); await wait(900)
r = await read(); const after = await store()
ok(r.complete, 'FINISH hands over to <Complete />')
ok(after.done && after.result && after.result.asked === 4 && after.result.right === 3, 'finishDay recorded the lesson: asked 4, right 3 (first-try)', JSON.stringify(after.result))
ok(after.xp - xp0 > 0 && after.streak >= 1, 'xp banked once', JSON.stringify([xp0, after.xp, before.xp]))

// practice mode: reopen -> top, practice label
await reload(); r = await read()
ok(r.count === '01/17' && r.practice, 'a finished day reopens at step 1 in practice mode', JSON.stringify(r))
// ✕ at step 1 closes without a dialog
await page.click('.lesson-close'); await wait(400); r = await read()
ok(r.closed && !r.dialog, 'close on step 1 leaves immediately')

// resume: fresh day state (clear done) -> advance to step 6 -> reload -> resumes at 6
await page.evaluate(async () => { const m = await import('/src/store.js'); const lib = await import('/src/lib.js'); const sid = lib.activeSeriesId(); const st = m.snapshot(); const sub = st.series[sid]; const done = { ...sub.done }; delete done[12]; const pos = { ...sub.pos }; delete pos[12]; localStorage.setItem('kind-app-v4', JSON.stringify({ ...st, series: { ...st.series, [sid]: { ...sub, done, pos } } })); sessionStorage.clear() })
await reload()
for (let i = 0; i < 5; i++) await press('Enter')
r = await read(); ok(r.count === '06/17', 'advanced to 06/17', r.count)
await reload(); r = await read()
ok(r.count === '06/17' && !r.practice, 'reload resumes at the saved position (06/17)', JSON.stringify(r))
await page.click('.lesson-close'); await wait(500); r = await read()
ok(r.dialog, 'close with progress opens the dialog')
await page.click('.k-dialog-btn[data-kind=confirm]'); await wait(500); r = await read()
ok(r.closed, 'Leave closes the lesson')
ok((await store()).pos === 5, 'position persisted', JSON.stringify(await store()))

// geometry at 360x640
await page.click('[data-testid=closed] button'); await wait(1400)
const g = await page.evaluate(() => {
  const bb = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
  return { close: bb('.lesson-close'), ticker: bb('.lesson-ticker'), count: bb('.lesson-count'), foot: bb('.lesson-foot'), go: bb('.lesson-go'), vw: innerWidth, vh: innerHeight, hscroll: document.documentElement.scrollWidth > innerWidth }
})
console.log('GEOM', JSON.stringify(g))
ok(g.close.w >= 48 && g.close.h >= 48 && g.go.h >= 48 && !g.hscroll, 'targets >= 48px, no horizontal scroll at 360x640')
ok(g.foot.y + g.foot.h <= g.vh + 1 && g.count.x + g.count.w <= g.vw, 'footer and counter sit inside the viewport')

console.log('ERRORS', JSON.stringify(b.errors))
ok(b.errors.length === 0, 'zero console errors')
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
await Promise.race([b.close().catch(() => {}), new Promise((r) => setTimeout(r, 4000))])
process.exit(fails ? 1 : 0)
