// node playground/ui-overlay.features.mjs [device]  — the v7 polish pass: sheet footer + eyebrow, dock scrub, toast glyphs, dialog labels.
import { open } from '../tools/browser.mjs'
const device = process.argv[2] || 'iphone'
const b = await open({ url: 'http://localhost:5183/playground/ui-overlay.html', device, state: null })
const { page, ctx } = b
await page.waitForTimeout(900)
const cdp = await ctx.newCDPSession(page)
let T = Date.now() / 1000
const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }], timestamp: T })
const swipe = async (x, y0, y1, ms = 140) => {
  const n = Math.max(2, Math.round(ms / 16))
  await tp('touchStart', x, y0)
  for (let i = 1; i <= n; i++) { T += 0.016; await tp('touchMove', x, y0 + ((y1 - y0) * i) / n) }
  await tp('touchEnd'); T += 0.02
}
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
let pass = 0, fail = 0
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')) }
const btn = (t) => page.locator('.pg-bar .pg-btn', { hasText: t }).first()
const dir = `ui-overlay/v2/feat-${device}`
const vh = await page.evaluate(() => innerHeight)

// 1. sheet footer rides the visible bottom through every detent
await btn('Sheet · footer').scrollIntoViewIfNeeded()
await btn('Sheet · footer').click(); await page.waitForTimeout(300); await rest()
const footBottom = () => page.evaluate(() => Math.round(document.querySelector('.k-sheet-foot').getBoundingClientRect().bottom))
ok('F1 footer sits on the visible bottom at the half detent', Math.abs((await footBottom()) - vh) <= 1, `${await footBottom()} vs ${vh}`)
ok('F1b eyebrow renders', (await page.locator('.k-sheet-eyebrow').innerText()).includes('T-02:14:09'))
await b.shot(`${dir}-01-footer-half`, { settle: 150 })
let box = await page.locator('.k-sheet').boundingBox()
await swipe(box.x + box.width / 2, box.y + 14, box.y + 14 - 300)
await page.waitForTimeout(300); await rest()
ok('F2 footer still on the visible bottom at full', Math.abs((await footBottom()) - vh) <= 1, `${await footBottom()} vs ${vh}`)
ok('F2b sheet reached full', (await page.locator('.k-sheet').getAttribute('data-detent')) === 'full')
await page.evaluate(() => { document.querySelector('.k-sheet-scroll').scrollTop = 120 })
await page.waitForTimeout(250)
ok('F3 scrolled → header hairline + footer hairline lit', await page.evaluate(() => { const p = document.querySelector('.k-sheet'); return p.dataset.scrolled === '1' && p.dataset.more === '1' }))
await b.shot(`${dir}-02-footer-full-scrolled`, { settle: 150 })
// dismiss drag: the footer must travel with the sheet, not stay pinned
await page.evaluate(() => { document.querySelector('.k-sheet-scroll').scrollTop = 0 })
box = await page.locator('.k-sheet').boundingBox()
await tp('touchStart', box.x + box.width / 2, box.y + 14)
for (let i = 1; i <= 16; i++) { T += 0.016; await tp('touchMove', box.x + box.width / 2, box.y + 14 + i * 45) }
await page.waitForTimeout(200)
const dragFoot = await footBottom()
ok('F4 pulling the sheet below its lowest detent carries the footer with it', dragFoot > vh + 20, `foot bottom ${dragFoot} vs viewport ${vh}`)
await b.shot(`${dir}-03-footer-dismissing`, { settle: 0 })
T += 0.6; await tp('touchEnd'); await page.waitForTimeout(300); await rest()
await page.keyboard.press('Escape'); await page.waitForTimeout(400); await rest()

// 2. dialog labels centred
await btn('Dialog').click(); await page.waitForTimeout(600)
const centred = await page.evaluate(() => {
  const el = document.querySelector('.k-dialog-btn[data-kind="confirm"]'); const r = el.getBoundingClientRect()
  const range = document.createRange(); range.selectNodeContents(el); const t = range.getBoundingClientRect()
  return { dx: Math.round((t.left + t.width / 2) - (r.left + r.width / 2)) }
})
ok('D1 dialog button label is centred', Math.abs(centred.dx) <= 2, 'offset ' + centred.dx)
await page.keyboard.press('Escape'); await page.waitForTimeout(500)

// 3. toast glyphs
await btn('Go').click(); await page.waitForTimeout(500)
ok('T1 go toast carries a glyph, not just a colour', (await page.locator('.k-toast[data-tone="go"] .k-toast-lead svg').count()) === 1)
await btn('No-go').click(); await page.waitForTimeout(500)
ok('T1b no-go toast carries a glyph', (await page.locator('.k-toast[data-tone="nogo"] .k-toast-lead svg').count()) === 1)
await b.shot(`${dir}-04-toasts`, { settle: 200 })

// 4. dock scrub (mouse)
await page.locator('.k-dock').scrollIntoViewIfNeeded()
await page.evaluate(() => { const bar = document.querySelector('.pg-bar'); bar.style.display = 'none' })
await page.waitForTimeout(400)
const dock = await page.locator('.k-dock').boundingBox()
const tabs = await page.locator('.k-dock-tab').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return r.left + r.width / 2 }))
const cy = dock.y + dock.height / 2
await page.mouse.move(tabs[0], cy); await page.mouse.down()
await page.mouse.move(tabs[1], cy, { steps: 6 }); await page.mouse.move(tabs[3] - 6, cy, { steps: 10 })
await page.waitForTimeout(250)
const mid = await page.evaluate(() => ({ scrub: document.querySelector('.k-dock').hasAttribute('data-scrub'), i: +document.querySelector('.k-dock').style.getPropertyValue('--k-i'), on: [...document.querySelectorAll('.k-dock-tab')].findIndex((t) => t.hasAttribute('data-on')) }))
ok('S1 scrubbing: plate follows finger, nearest tab lit', mid.scrub && mid.i > 2.4 && mid.i < 3.2 && mid.on === 3, JSON.stringify(mid))
await b.shot(`${dir}-05-dock-scrub`, { settle: 0 })
await page.mouse.up(); await page.waitForTimeout(900)
const after = await page.evaluate(() => ({ scrub: document.querySelector('.k-dock').hasAttribute('data-scrub'), i: +document.querySelector('.k-dock').style.getPropertyValue('--k-i'), cur: document.querySelector('.k-dock-tab[aria-current]').textContent, live: document.querySelector('.pg-live').textContent }))
ok('S2 release selects the landing tab and the plate settles on it', !after.scrub && after.i === 3 && /locker/i.test(after.cur) && /locker/.test(after.live), JSON.stringify(after))
// a plain click must still work
await page.locator('.k-dock-tab').nth(0).click(); await page.waitForTimeout(500)
ok('S3 plain tap still selects (no scrub side effects)', await page.evaluate(() => /learn/.test(document.querySelector('.pg-live').textContent) && +document.querySelector('.k-dock').style.getPropertyValue('--k-i') === 0))
// keyboard
await page.locator('.k-dock-tab').nth(0).focus(); await page.keyboard.press('ArrowRight')
ok('S4 arrow keys move focus along the dock', await page.evaluate(() => document.activeElement === document.querySelectorAll('.k-dock-tab')[1]))

// 5. toasts: a keyed update replaces, never merges; loading resolves in place
await page.evaluate(() => { document.querySelector('.pg-bar').style.display = '' })
await page.waitForTimeout(2600)                                          // let the earlier toasts expire
await btn('Action').click(); await page.waitForTimeout(500)             // key 'snd': title + body + action
ok('K1 keyed toast starts with body and action', (await page.locator('.k-toast-body').count()) === 1 && (await page.locator('.k-toast-act').count()) === 1)
await page.locator('.k-toast-act').first().click(); await page.waitForTimeout(700)
await page.evaluate(() => { document.querySelector('.pg-bar').scrollLeft = 0 })
await btn('Loading').click(); await page.waitForTimeout(600)
ok('K2 loading toast shows a spinner and is busy', (await page.locator('.k-toast[aria-busy] .k-toast-spin').count()) === 1)
await b.shot(`${dir}-06-toast-loading`, { settle: 100 })
await page.waitForTimeout(2600)
const resolved = await page.evaluate(() => { const t = document.querySelector('.k-toast[data-front]'); return t ? { title: t.querySelector('.k-toast-title').textContent, body: !!t.querySelector('.k-toast-body'), spin: !!t.querySelector('.k-toast-spin'), tone: t.dataset.tone } : null })
ok('K3 resolving by key replaces in place: new title, no stale body/spinner', resolved && resolved.title === 'Saved' && !resolved.body && !resolved.spin && resolved.tone === 'go', JSON.stringify(resolved))
await b.shot(`${dir}-07-toast-resolved`, { settle: 100 })

console.log(`\n${pass} pass, ${fail} fail`)
const errs = b.errors.filter((e) => !/404/.test(e))
console.log('errors:', errs.length ? errs : 'none (favicon 404 ignored)')
await b.close().catch(() => {})
process.exit(0)
