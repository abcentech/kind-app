// node playground/ui-overlay.physics.mjs [device]
// Drag physics, history, focus and lite checks against the specimen sheet. Touch is real CDP touch with explicit
// timestamps (a loaded machine must not turn a flick into a pause), mouse is real Playwright mouse.
import { open } from '../tools/browser.mjs'
const device = process.argv[2] || 'iphone'
const b = await open({ url: 'http://localhost:5183/playground/ui-overlay.html', device, state: null })
const { page, ctx } = b
await page.waitForTimeout(700)
const cdp = await ctx.newCDPSession(page)
let T = Date.now() / 1000
const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }], timestamp: T })
const swipe = async (x, y0, y1, ms = 160, { hold = 0 } = {}) => {            // finger from y0 to y1 over ms
  const n = Math.max(2, Math.round(ms / 16))
  await tp('touchStart', x, y0)
  for (let i = 1; i <= n; i++) { T += 0.016; await tp('touchMove', x, y0 + ((y1 - y0) * i) / n) }
  T += hold / 1000
  await tp('touchEnd')
  T += 0.02
}
const btn = (t) => page.locator('.pg-bar .pg-btn', { hasText: t }).first()
const top = () => page.evaluate(() => { const p = document.querySelector('.k-sheet'); return p ? Math.round(p.getBoundingClientRect().top) : null })
const count = () => page.locator('.k-sheet').count()
// The machine is shared with a dozen other builds: rAF can stall for seconds. So never wait a fixed time for an
// animation; wait until the sheet reports it is at rest (no will-change, no drag, state open or gone) for 3 polls.
const rest = async () => {
  let n = 0
  for (let i = 0; i < 120 && n < 3; i++) {
    const done = await page.evaluate(() => {
      const p = document.querySelector('.k-sheet'), d = document.querySelector('.k-dialog-layer')
      if (d && d.dataset.leaving != null) return false
      if (!p) return true
      return p.style.willChange === '' && p.dataset.drag == null && p.parentElement.dataset.state === 'open'
    })
    n = done ? n + 1 : 0
    await page.waitForTimeout(100)
  }
}
const settle = async (ms = 700) => { await page.waitForTimeout(Math.min(ms, 300)); await rest() }
let pass = 0, fail = 0
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')) }
const closeAll = async () => { for (let i = 0; i < 3; i++) { if (await page.locator('.k-sheet,.k-dialog').count()) { await page.keyboard.press('Escape'); await settle(500) } } }

// T1: fast flick down closes
await btn('Sheet · auto').click(); await settle()
let t0 = await top()
let box = await page.locator('.k-sheet').boundingBox()
await swipe(box.x + box.width / 2, box.y + 14, box.y + 14 + 260, 120)
await settle()
ok('T1 flick down closes the sheet', (await count()) === 0, `top was ${t0}`)
ok('T1b focus back on opener', await page.evaluate(() => document.activeElement && document.activeElement.textContent.includes('Sheet · auto')))
ok('T1c background un-inerted, scroll unlocked', await page.evaluate(() => !document.getElementById('root').inert && document.body.style.position !== 'fixed'))

// T2: slow short drag springs back
await btn('Sheet · auto').click(); await settle()
t0 = await top()
box = await page.locator('.k-sheet').boundingBox()
await swipe(box.x + box.width / 2, box.y + 14, box.y + 14 + 50, 600, { hold: 150 })
await settle()
ok('T2 slow 50px drag returns to rest', (await count()) === 1 && Math.abs((await top()) - t0) <= 1, `${t0} -> ${await top()}`)
// T2b: mid-drag follows finger 1:1
box = await page.locator('.k-sheet').boundingBox()
await tp('touchStart', box.x + box.width / 2, box.y + 14)
const at = async (k) => { for (let i = 1; i <= k; i++) { T += 0.016; await tp('touchMove', box.x + box.width / 2, box.y + 14 + moved + i * 10) } moved += k * 10; await page.waitForTimeout(250); return top() }
let moved = 0
const m1 = await at(4), m2 = await at(4)
await page.screenshot({ path: `tools/out/ui-overlay/v2/phys-${device}-middrag.png` })
ok('T2b sheet follows the finger 1:1 from touch-down (80px of finger = 80px of sheet)', Math.abs(m2 - m1 - 40) <= 2 && Math.abs(m2 - t0 - 80) <= 3, `finger +40, sheet +${m2 - m1}; lead-in lag ${80 - (m2 - t0)}px (slop)`)
const bo = await page.evaluate(() => +document.querySelector('.k-sheet-backdrop').style.opacity)
ok('T2c backdrop opacity tied to position (<1 while dragging)', bo < 1 && bo > 0.3, 'opacity ' + bo.toFixed(2))
T += 0.5; await tp('touchEnd'); await settle(900)
await closeAll()

// T3: half + full
await btn('half+full').click(); await settle()
const tHalf = await top()
box = await page.locator('.k-sheet').boundingBox()
await swipe(box.x + box.width / 2, box.y + 14, box.y + 14 - 260, 140)
await settle()
const tFull = await top()
ok('T3 flick up from half reaches full', tFull < tHalf - 100 && (await page.locator('.k-sheet').getAttribute('data-detent')) === 'full', `${tHalf} -> ${tFull}`)
box = await page.locator('.k-sheet').boundingBox()
await swipe(box.x + box.width / 2, box.y + 14, box.y + 14 + Math.round((tHalf - tFull) * 0.9), 600)      // a deliberate pull of one detent's height, not a fling
await settle()
ok('T3b slow-ish pull down from full lands on half (not closed)', (await count()) === 1 && (await page.locator('.k-sheet').getAttribute('data-detent')) === 'half', 'detent ' + (await page.locator('.k-sheet').getAttribute('data-detent')))
box = await page.locator('.k-sheet').boundingBox()
await swipe(box.x + box.width / 2, box.y + 14, box.y + 14 + 300, 110)
await settle()
ok('T3c flick down from half closes', (await count()) === 0)

// T4: scroll hand-off inside a two-detent sheet (Journal: half + full, long content)
await btn('half+full').click(); await settle()
box = await page.locator('.k-sheet').boundingBox()
const cx = box.x + box.width / 2
const sTop0 = await top()
await swipe(cx, box.y + 300, box.y + 120, 200)             // push up inside the content: expand to full first
await settle()
const sTop1 = await top()
ok('T4 push-up inside content at half expands the sheet (no scroll yet)', sTop1 < sTop0 - 100 && (await page.evaluate(() => document.querySelector('.k-sheet-scroll').scrollTop)) < 5, `${sTop0} -> ${sTop1}`)
box = await page.locator('.k-sheet').boundingBox()
await swipe(cx, box.y + 500, box.y + 200, 200)             // now at full: the same gesture scrolls
await settle(500)
const sc = await page.evaluate(() => document.querySelector('.k-sheet-scroll').scrollTop)
ok('T4b at full, a swipe scrolls the content (scrollTop>0)', sc > 50, 'scrollTop ' + Math.round(sc))
const keep = await top()
await swipe(cx, box.y + 300, box.y + 380, 200)              // pull down while scrolled: scroll back, do not drag the sheet
await settle(500)
ok('T4c pull-down while scrolled does not move the sheet', Math.abs((await top()) - keep) <= 2, `${keep} -> ${await top()}`)
await page.evaluate(() => { document.querySelector('.k-sheet-scroll').scrollTop = 0 })
await swipe(cx, box.y + 200, box.y + 600, 160)              // at scrollTop 0 a pull-down drags the sheet down a detent
await settle()
ok('T4d at scrollTop 0 a pull-down drags the sheet down', (await top()) > keep + 100 || (await count()) === 0, `${keep} -> ${await top()}`)
await closeAll()

// T5: locked sheet
await btn('Sheet · locked').click(); await settle()
t0 = await top()
box = await page.locator('.k-sheet').boundingBox()
await swipe(box.x + box.width / 2, box.y + 14, box.y + 14 + 300, 100)
await settle()
ok('T5 locked sheet rubber-bands and stays', (await count()) === 1 && Math.abs((await top()) - t0) <= 1, `${t0} -> ${await top()}`)
await page.keyboard.press('Escape'); await settle(500)
ok('T5b Esc does not close a locked sheet', (await count()) === 1)
await page.mouse.click(10, 10); await settle(500)
ok('T5c scrim tap does not close a locked sheet', (await count()) === 1)
await page.locator('.k-sheet .pg-btn', { hasText: 'Commit' }).click(); await settle()
ok('T5d explicit action closes it', (await count()) === 0)


// T5e: Back on a locked sheet is refused and the history entry is restored
await btn('Sheet · locked').click(); await settle()
await page.goBack(); await page.waitForTimeout(500); await settle(300)
ok('T5e Back does not close a locked sheet', (await count()) === 1 && page.url().includes('ui-overlay.html'))
ok('T5f ...and a history entry is back so the next Back is also caught', await page.evaluate(() => history.state && history.state.kBack != null))
await page.locator('.k-sheet .pg-btn', { hasText: 'Commit' }).click(); await settle()

// T6: history
const h0 = await page.evaluate(() => history.length)
await btn('Sheet · auto').click(); await settle(600)
ok('T6 opening pushes a history entry', await page.evaluate(() => history.state && history.state.kBack != null))
await page.goBack(); await settle()
ok('T6b Back closes the sheet and the page stays', (await count()) === 0 && page.url().includes('ui-overlay.html'))
await btn('Sheet · auto').click(); await settle(600)
await page.locator('.k-sheet-x').click(); await settle()
ok('T6c closing with X pops its own entry', await page.evaluate(() => !(history.state && history.state.kBack != null)))
await btn('Sheet · auto').click(); await settle(600)
await page.locator('.k-sheet .pg-btn', { hasText: 'dialog on top' }).click(); await settle(700)
ok('T7 dialog opens on top of a sheet', (await page.locator('.k-dialog').count()) === 1 && (await count()) === 1)
ok('T7b sheet is inert beneath dialog, dialog is live', await page.evaluate(() => document.querySelector('.k-sheet-layer').inert === true && !document.querySelector('.k-dialog-layer').inert))
await page.keyboard.press('Escape'); await settle(700)
ok('T7c Esc closes only the dialog', (await page.locator('.k-dialog').count()) === 0 && (await count()) === 1)
ok('T7d sheet is live again, focus returned inside it', await page.evaluate(() => !document.querySelector('.k-sheet-layer').inert && document.querySelector('.k-sheet').contains(document.activeElement)))
// T8: focus trap
for (let i = 0; i < 8; i++) await page.keyboard.press('Tab')
ok('T8 Tab never leaves the sheet', await page.evaluate(() => document.querySelector('.k-sheet').contains(document.activeElement)))
for (let i = 0; i < 8; i++) await page.keyboard.press('Shift+Tab')
ok('T8b Shift+Tab never leaves the sheet', await page.evaluate(() => document.querySelector('.k-sheet').contains(document.activeElement)))
await closeAll()
const h1 = await page.evaluate(() => history.length)
ok('T6d history did not grow permanently', h1 - h0 <= 6, `${h0} -> ${h1}`)

// T9: toast swipe
await btn('Action').click(); await settle(700)
const tb = await page.locator('.k-toast').first().boundingBox()
await swipe(tb.x + tb.width / 2, tb.y + tb.height / 2, tb.y - 60, 100)
await settle(700)
ok('T9 swipe-up dismisses a toast', (await page.locator('.k-toast').count()) === 0)
await btn('Stack').click(); await settle(900)
ok('T9b stack shows exactly one front plate', (await page.locator('.k-toast[data-front]').count()) === 1, 'toasts in DOM ' + (await page.locator('.k-toast').count()))

// T10: lite mode
await page.evaluate(() => { document.documentElement.dataset.fx = 'lite' })
await page.evaluate(() => [...document.querySelectorAll('.pg-bar .pg-btn')].find((x) => x.textContent.includes('Sheet · auto')).click()); await settle(500)
const lite = await page.evaluate(() => { const p = document.querySelector('.k-sheet'); return p ? { bf: getComputedStyle(p).backdropFilter, tr: p.style.transform, op: getComputedStyle(document.querySelector('.k-sheet-layer')).opacity } : null })
ok('T10 lite sheet: no backdrop blur, fully placed, opaque', lite && lite.bf === 'none' && /, 0px\)/.test(lite.tr) && lite.op === '1', JSON.stringify(lite))
await closeAll()
await page.evaluate(() => { document.documentElement.dataset.fx = 'full' })

console.log(`\n${pass} pass, ${fail} fail`)
const errs = b.errors.filter((e) => !/404/.test(e))
console.log('errors:', errs.length ? errs : 'none (favicon 404 ignored)')
await b.close().catch(() => {})
process.exit(0)
