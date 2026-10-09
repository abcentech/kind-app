// me-core behaviour check: rename, kids, glossary, reset dialog (cancel), mission tap, 7-tap developer unlock, lite mode. One browser, evaluate-only.
import { open } from '../tools/browser.mjs'
const b = await open({ url: 'http://localhost:5183/playground/me-core.html?seed=parent&fx=lite', device: 'lowend', dpr: 2, state: null })
const p = b.page
const out = {}
await p.waitForSelector('.me-pilot', { timeout: 30000 })
const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('kind-app-v4') || '{}'))

// rename (diacritics survive)
await p.click('.me-pilot__name')
await p.fill('.me-pilot .k-field__input', 'Ọláolúwa')
await p.keyboard.press('Enter')
await p.waitForTimeout(250)
out.rename = { stored: (await st()).name, shown: await p.textContent('.me-pilot__name'), initial: await p.textContent('.me-pilot__initial') }
// empty name is ignored
await p.click('.me-pilot__name'); await p.fill('.me-pilot .k-field__input', '   '); await p.keyboard.press('Enter'); await p.waitForTimeout(200)
out.emptyKeeps = (await st()).name

// kids: add, remove via dialog
await p.fill('.me-addkid input', 'Zainab'); await p.click('.me-addkid button[type=submit]'); await p.waitForTimeout(250)
out.kidsAfterAdd = (await st()).kids.map((k) => k.name)
await p.click('.me-kids li:last-child button'); await p.waitForSelector('.k-dialog, [role=alertdialog], [role=dialog]')
out.dialog = await p.evaluate(() => document.querySelector('[role=alertdialog],[role=dialog]')?.innerText.replace(/\n+/g, ' | '))
await p.keyboard.press('Escape'); await p.waitForTimeout(400)
out.kidsAfterCancel = (await st()).kids.length
await p.click('.me-kids li:last-child button'); await p.waitForTimeout(300)
await p.evaluate(() => [...document.querySelectorAll('[role=alertdialog] button,[role=dialog] button')].find((x) => /remove/i.test(x.textContent))?.click()); await p.waitForTimeout(400)
out.kidsAfterRemove = (await st()).kids.map((k) => k.name)

// glossary sheet
await p.evaluate(() => [...document.querySelectorAll('.k-row')].find((r) => /What do these words/.test(r.textContent)).click()); await p.waitForTimeout(700)
out.gloss = await p.evaluate(() => document.querySelectorAll('.me-gloss__item').length)
await p.keyboard.press('Escape'); await p.waitForTimeout(500)

// reset dialog: open then cancel (we do NOT erase)
await p.evaluate(() => [...document.querySelectorAll('.k-row')].find((r) => /Reset everything/.test(r.textContent)).click()); await p.waitForTimeout(500)
out.resetFocus = await p.evaluate(() => document.activeElement?.textContent)
await p.keyboard.press('Escape'); await p.waitForTimeout(400)
out.stillThere = (await st()).xp

// developer: 6 taps no, 7 yes
const tap = () => p.evaluate(() => [...document.querySelectorAll('.k-row')].find((r) => /Version/.test(r.textContent)).click())
for (let i = 0; i < 6; i++) await tap()
out.dev6 = await p.evaluate(() => !!document.querySelector('.me-dev'))
await tap(); await p.waitForTimeout(300)
out.dev7 = await p.evaluate(() => !!document.querySelector('.me-dev'))
out.devRows = await p.evaluate(() => [...document.querySelectorAll('.me-dev .k-row')].map((r) => r.innerText.replace(/\n+/g, ' | ')))
out.dateVal = await p.inputValue('.me-dev input[type=date]')
await p.evaluate(() => [...document.querySelectorAll('.k-row')].find((r) => /FPS meter/.test(r.textContent)).click()); await p.waitForTimeout(1300)
out.fps = await p.evaluate(() => document.querySelector('.me-fps')?.textContent)
// time machine navigates with ?now=
await p.fill('.me-dev input[type=date]', '2026-08-12')
const nav = p.waitForNavigation({ timeout: 20000 })
await p.evaluate(() => [...document.querySelectorAll('.me-dev button')].find((x) => /Go to date/.test(x.textContent)).click())
await nav
out.url = p.url().replace(/^.*\?/, '?')

// mission tap logs setSeriesId + goTab
await p.waitForSelector('.me-mission')
await p.evaluate(() => document.querySelectorAll('.me-mission')[1].click()); await p.waitForTimeout(500)
out.shellLog = await p.evaluate(() => document.querySelector('[data-testid=shell-log]')?.textContent)
console.log(JSON.stringify(out, null, 1))
console.log('errors', b.errors)
await b.close()
