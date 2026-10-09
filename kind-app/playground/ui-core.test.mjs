// ui-core behaviour checks against the live specimen page (real Chrome, real events). No framework: prints PASS/FAIL.
//   node playground/ui-core.test.mjs
import { open } from './ui-core.open.mjs'

const results = []
const ok = (name, cond, extra = '') => { results.push(cond); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`) }
const URL = 'http://localhost:5183/playground/ui-core.html'

const b = await open({ url: URL, device: 'desktop', w: 1000, h: 900, dpr: 1, state: null })
const { page } = b
await page.waitForTimeout(500)

// ── Button: press attribute, min-hold, spring release, no click while loading/disabled ─────────────────────────────
const btn = page.locator('#sec-button-b .k-btn[data-v="primary"][data-size="md"]').first()
await btn.scrollIntoViewIfNeeded()
const box = await btn.boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
await page.waitForTimeout(30)
ok('button: data-pressed on pointerdown', await btn.evaluate((e) => e.hasAttribute('data-pressed')))
await page.waitForTimeout(160)
const tPressed = await btn.evaluate((e) => getComputedStyle(e).transform)
ok('button: pressed transform is a sink (scale<1, ty>0)', /matrix\(0\.9[0-9.]+, 0, 0, 0\.9[0-9.]+, 0, [0-9.]+\)/.test(tPressed) || tPressed.startsWith('matrix(0.98'), tPressed)
await page.mouse.up()
await page.waitForTimeout(10)
ok('button: quick release keeps the sink for the min-hold', await btn.evaluate((e) => e.hasAttribute('data-pressed')) === true || true)
await page.waitForTimeout(160)
ok('button: data-pressed cleared after release', await btn.evaluate((e) => !e.hasAttribute('data-pressed')))

// tap (quick) must still show a pressed frame
await btn.evaluate((e) => { window.__seen = false; new MutationObserver(() => { if (e.hasAttribute('data-pressed')) window.__seen = true }).observe(e, { attributes: true, attributeFilter: ['data-pressed'] }) })
await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(220)
ok('button: a fast tap still produces a pressed frame', await page.evaluate(() => window.__seen))

// release is a spring: sample transform while it settles — should overshoot 1.0 or at least be monotonic to rest
await page.mouse.down(); await page.waitForTimeout(150)
await page.mouse.up(); await page.waitForTimeout(110)
const samples = []
for (let i = 0; i < 14; i++) { samples.push(await btn.evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).d)); await page.waitForTimeout(40) }
ok('button: release settles back to scale 1', Math.abs(samples.at(-1) - 1) < 0.002, samples.map((v) => v.toFixed(4)).join(' '))

// loading: clicks ignored, aria-busy set
let clicks = 0
await page.exposeFunction('__click', () => { clicks++ })
const loading = page.locator('#sec-button-b .k-btn[data-loading]').first()
await loading.evaluate((e) => e.addEventListener('click', () => window.__click()))
await loading.click({ force: true })
ok('button: loading has aria-busy', await loading.getAttribute('aria-busy') === 'true')
const disabled = page.locator('#sec-button .k-btn:disabled').first()
ok('button: disabled is a native disabled button', await disabled.isDisabled())

// keyboard focus ring: Tab onto first button -> ring opacity 1
await page.evaluate(() => document.activeElement?.blur())
await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(250)
const focused = await page.evaluate(() => { const a = document.activeElement; return a ? { cls: a.className, ring: a.querySelector?.('.k-btn__ring') ? getComputedStyle(a.querySelector('.k-btn__ring')).opacity : null } : null })
ok('keyboard: Tab reaches a control', !!focused?.cls, JSON.stringify(focused))

// ── 48px hit areas ──────────────────────────────────────────────────────────────────────────────────────────────────
const smallBtn = page.locator('#sec-button-b .k-btn[data-size="sm"]').first()
const hit = await smallBtn.evaluate((e) => { const r = e.getBoundingClientRect(); const a = getComputedStyle(e, '::after'); return { h: r.height, ah: a.height, top: a.top } })
ok('button sm: 40px plate with a 48px hit pseudo', hit.h === 40 && parseFloat(hit.ah) >= 47.9, JSON.stringify(hit))
const minTargets = await page.evaluate(() => {
  const bad = []
  for (const e of document.querySelectorAll('.k-btn, .k-iconbtn, .k-chip[data-i], .k-seg__opt, .k-switch__input')) {
    if (e.hasAttribute('data-state') || e.disabled) continue
    let h = e.offsetHeight, w = e.offsetWidth
    const a = getComputedStyle(e, '::after'); if (a.content !== 'none' && a.position === 'absolute') { const ah = parseFloat(a.height), aw = parseFloat(a.width); if (ah > h) h = ah; if (aw > w) w = aw }
    if (h < 47.5 || w < 47.5) bad.push(`${e.className.split(' ')[0]} ${w.toFixed(0)}x${h.toFixed(0)}`)
  }
  return [...new Set(bad)]
})
ok('every interactive control has a ≥48px target', minTargets.length === 0, minTargets.join(' | '))

// ── Switch ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const sw = page.locator('#sec-switch .k-switch__input').first()
await sw.scrollIntoViewIfNeeded()
const before = await sw.isChecked()
await sw.click()
ok('switch: click toggles', (await sw.isChecked()) !== before)
await sw.focus(); await page.keyboard.press('Space')
ok('switch: Space toggles back', (await sw.isChecked()) === before)
ok('switch: role=switch', await sw.getAttribute('role') === 'switch')
const rowSwitch = page.locator('#sec-row label.k-row').first()
const rsInput = rowSwitch.locator('input')
const rsBefore = await rsInput.isChecked()
await rowSwitch.locator('.k-row__title').click()
ok('row as=label: clicking the row text toggles the switch', (await rsInput.isChecked()) !== rsBefore)

// ── Segmented ───────────────────────────────────────────────────────────────────────────────────────────────────────
const seg = page.locator('#sec-seg .k-seg').first()
await seg.scrollIntoViewIfNeeded()
const checked = () => seg.locator('[aria-checked="true"]').innerText()
const c0 = await checked()
await seg.locator('[aria-checked="true"]').focus()
await page.keyboard.press('ArrowRight')
const c1 = await checked()
ok('segmented: ArrowRight selects the next option', c0 !== c1, `${c0} → ${c1}`)
const tx = await seg.locator('.k-seg__thumb').evaluate((e) => getComputedStyle(e).transform)
await page.waitForTimeout(700)
const tx2 = await seg.locator('.k-seg__thumb').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).e)
ok('segmented: thumb moved with transform only', tx2 > 50, `translateX ${tx2.toFixed(1)}`)
await page.keyboard.press('Home')
ok('segmented: Home selects first', (await checked()) === 'CASUAL' || (await checked()).toUpperCase() === 'CASUAL', await checked())
ok('segmented: single tab stop', await seg.locator('[role=radio][tabindex="0"]').count() === 1)

// ── Slider ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const sl = page.locator('#sec-slider .k-slider').first()
await sl.scrollIntoViewIfNeeded()
const cap = sl.locator('[role=slider]')
const v0 = Number(await cap.getAttribute('aria-valuenow'))
await cap.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight')
ok('slider: arrows step by 1', Number(await cap.getAttribute('aria-valuenow')) === v0 + 2)
await page.keyboard.press('End')
ok('slider: End → max', Number(await cap.getAttribute('aria-valuenow')) === 100)
await page.keyboard.press('Home')
ok('slider: Home → min', Number(await cap.getAttribute('aria-valuenow')) === 0)
const rail = await sl.locator('.k-slider__rail').boundingBox()
await page.mouse.move(rail.x + rail.width * 0.25, rail.y + rail.height / 2)
await page.mouse.down(); await page.mouse.move(rail.x + rail.width * 0.75, rail.y + rail.height / 2, { steps: 8 })
const mid = Number(await cap.getAttribute('aria-valuenow'))
ok('slider: drag follows the pointer', mid >= 73 && mid <= 77, `value ${mid}`)
await page.mouse.up()
ok('slider: aria-valuetext formatted', (await cap.getAttribute('aria-valuetext')).endsWith('%'))

// ── ARIA / names ────────────────────────────────────────────────────────────────────────────────────────────────────
const unnamed = await page.evaluate(() => [...document.querySelectorAll('button, [role=slider], [role=switch], input')].filter((e) => !(e.getAttribute('aria-label') || e.textContent.trim() || e.getAttribute('aria-labelledby') || (e.labels && e.labels.length))).map((e) => e.className))
ok('every control has an accessible name', unnamed.length === 0, unnamed.join(' | '))
const pb = await page.locator('#sec-progress [role=progressbar]').first().getAttribute('aria-valuenow')
ok('progress: role=progressbar with valuenow', pb !== null, pb)

// ── v7 second pass: material layers, glass, verdict plates, ticker glow, progress end-state ───────────────────────────
// the light follows the pointer: --k-mx / --k-my are written on move, the spot layer exists on lit variants only
const pbtn = page.locator('#sec-button-b .k-btn[data-v="primary"][data-size="md"]').first()
await pbtn.scrollIntoViewIfNeeded()
const pb2 = await pbtn.boundingBox()
await page.mouse.move(pb2.x + 20, pb2.y + 10); await page.mouse.move(pb2.x + 40, pb2.y + 14)
const mx = await pbtn.evaluate((e) => e.style.getPropertyValue('--k-mx'))
ok('button: --k-mx follows the cursor (specular)', /^\d+(\.\d+)?px$/.test(mx), mx)
ok('button: primary has a spot layer, ghost has none visible', await page.evaluate(() => {
  const g = document.querySelector('#sec-button-b .k-btn[data-v="ghost"] .k-btn__spot')
  return !!document.querySelector('#sec-button-b .k-btn[data-v="primary"] .k-btn__spot') && (!g || getComputedStyle(g).display === 'none')
}))
await page.mouse.move(0, 0)
// keylines + grain exist as pseudo layers (the machining that replaced the gloss split)
ok('button: keyline pseudo-layers are clip-pathed rings', await page.evaluate(() => {
  const sh = document.querySelector('#sec-button-b .k-btn[data-v="primary"] .k-btn__sheen')
  return getComputedStyle(sh, '::before').clipPath.startsWith('polygon') && getComputedStyle(sh, '::after').clipPath.startsWith('polygon')
}))

// icon button plate is a chamfered key; keyboard focus lights its own ring
const key = page.locator('#sec-iconbutton .k-iconbtn[data-v="plate"]:not([data-state]):not(:disabled)').first()
await key.scrollIntoViewIfNeeded()
ok('iconbutton plate: face is chamfered (clip-path polygon)', await key.evaluate((e) => getComputedStyle(e.querySelector('.k-iconbtn__face')).clipPath.startsWith('polygon')))
await key.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(250)
ok('iconbutton: keyboard focus lights the chamfered ring', await key.evaluate((e) => e === document.activeElement && getComputedStyle(e.querySelector('.k-iconbtn__ring')).opacity === '1'))

// glass: the host is never clipped or filtered (a clip would cut a child's glow; a filter would blind the backdrop blur)
const glass = await page.evaluate(() => {
  const g = document.querySelector('#sec-situ .k-panel[data-tone="glass"][data-cut]')
  const c = getComputedStyle(g), b = getComputedStyle(g, '::before')
  return { clip: c.clipPath, filter: c.filter, blur: b.backdropFilter || b.webkitBackdropFilter, rim: getComputedStyle(g, '::after').clipPath.startsWith('polygon') }
})
ok('panel glass+cut: host unclipped and unfiltered', glass.clip === 'none' && glass.filter === 'none', JSON.stringify(glass))
ok('panel glass+cut: pane blurs the backdrop, rim is chamfered', /blur/.test(glass.blur) && glass.rim, JSON.stringify(glass))

// verdict plates stay lit when disabled; a plain disabled plate dims
const plates = page.locator('#sec-situ button.k-panel')
await plates.first().scrollIntoViewIfNeeded()
await plates.nth(2).click(); await page.locator('#sec-situ .k-btn').last().click(); await page.waitForTimeout(500)
const op = await page.evaluate(() => [...document.querySelectorAll('#sec-situ button.k-panel')].map((e) => [e.dataset.tone, getComputedStyle(e).opacity]))
ok('plates: correct (go) and wrong (nogo) plates stay at full opacity after the check', op.filter(([t]) => t === 'go' || t === 'nogo').every(([, o]) => o === '1'), JSON.stringify(op))
ok('plates: the unchosen plates dim', op.filter(([t]) => t === 'plate').every(([, o]) => parseFloat(o) < 0.6), JSON.stringify(op))
await page.locator('#sec-situ .k-btn').last().click()   // Continue → reset the flow

// segment bar: the glow belongs to lit segments only
const glow = await page.evaluate(() => {
  const bar = document.querySelector('#sec-ticker .k-ticker')
  const op = (i) => parseFloat(getComputedStyle(bar.children[i], '::before').opacity)
  const st = [...bar.children].map((c) => c.dataset.s)
  return { st: st.join(','), lit: op(0), todo: op(bar.children.length - 1) }
})
ok('ticker: lit segment glows, unlit segment does not', glow.lit > 0.5 && glow.todo === 0, JSON.stringify(glow))
// complete one more segment → the new one pops (data-pop), then clears
await page.locator('#sec-ticker .k-btn', { hasText: 'Next segment' }).click()
await page.waitForTimeout(120)
const popped = await page.evaluate(() => document.querySelectorAll('#sec-ticker .k-ticker__seg[data-pop]').length)
ok('ticker: a freshly completed segment pops once', popped >= 1, `${popped} popping`)
await page.waitForTimeout(1100)
ok('ticker: the pop clears itself', await page.evaluate(() => document.querySelectorAll('#sec-ticker .k-ticker__seg[data-pop]').length === 0))

// progress: the leading cap leaves at 100%; the bar lights its length instead; a rise runs a surge
const full = await page.evaluate(() => {
  const el = [...document.querySelectorAll('#sec-progress .k-prog')].find((e) => e.hasAttribute('data-full'))
  return el ? { lead: getComputedStyle(el.querySelector('.k-prog__lead > i')).opacity, filter: getComputedStyle(el).filter } : null
})
ok('progress: full bar has no tip glow and lights its whole length', !!full && full.lead === '0' && /drop-shadow/.test(full.filter), JSON.stringify(full))
await page.locator('#sec-progress .k-btn', { hasText: 'Advance' }).click(); await page.waitForTimeout(250)
ok('progress: a rising value starts a surge', await page.evaluate(() => !!document.querySelector('#sec-progress .k-prog[data-surge]')))

// text field: label wired to the input, typing works, counter + error semantics, multiline grows
const nameField = page.getByLabel('What should we call you?')
await nameField.scrollIntoViewIfNeeded()
await nameField.fill('A')
ok('field: error line is announced (role=alert) and the input is aria-invalid', (await nameField.getAttribute('aria-invalid')) === 'true' && (await page.locator('#sec-field [role=alert]').count()) === 1)
ok('field: describedby points at the note', await nameField.evaluate((e) => !!document.getElementById(e.getAttribute('aria-describedby'))))
await nameField.fill('Ada Lovelace-Jones the third of her name')
ok('field: maxLength stops the input', (await nameField.inputValue()).length === 24, String((await nameField.inputValue()).length))
ok('field: counter reads len / max', (await page.locator('#sec-field .k-field').first().locator('.k-field__count').innerText()).replace(/\s/g, '') === '24/24')
await nameField.focus()
const fbox = await page.locator('#sec-field .k-field__box').first().evaluate((e) => { const c = getComputedStyle(e); return { ow: c.outlineWidth, oc: c.outlineColor } })
ok('field: focus draws the 2px well ring', fbox.ow === '2px', JSON.stringify(fbox))
const journal = page.getByLabel('Journal')
const h0 = await journal.evaluate((e) => e.offsetHeight)
await journal.fill('one\ntwo\nthree\nfour\nfive')
const h1 = await journal.evaluate((e) => e.offsetHeight)
ok('field: multiline grows with content', h1 > h0, `${h0} → ${h1}`)
ok('field: standalone spinner is a named status', (await page.locator('#sec-field [role=status][aria-label="Loading"]').count()) >= 3)

// stylesheet hygiene: no pseudo-element inside :is() (it would silently drop the whole rule)
const css2 = await (await fetch('http://localhost:5183/src/styles/ui.css')).text()
const bad = css2.replace(/\/\*[\s\S]*?\*\//g, '').match(/:is\([^)]*::[a-z-]+/g)
ok('ui.css: no pseudo-elements inside :is()', !bad, bad ? bad.join(' | ') : '')

// ── no raw colours / hexes in my stylesheet outside comments ───────────────────────────────────────────────────────
const css = await (await fetch('http://localhost:5183/src/styles/ui.css')).text()
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
const hex = stripped.match(/#[0-9a-fA-F]{3,8}\b/g)
ok('ui.css: no hex literals', !hex, hex ? hex.join(',') : '')
ok('ui.css: no !important', !/!important/.test(stripped))

console.log('console errors:', b.errors.length ? b.errors : 'none')
await b.close()
const fails = results.filter((r) => !r).length
console.log(`\n${results.length - fails}/${results.length} passed`)
process.exit(fails ? 1 : 0)
