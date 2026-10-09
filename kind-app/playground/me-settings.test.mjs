// node playground/me-settings.test.mjs — behaviour checks via page.evaluate; a handful of screenshots at the end.
import { open } from '../tools/browser.mjs'
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL = 'http://localhost:5183/playground/me-settings.html'
const log = []
const ok = (name, cond, extra = '') => { log.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`) }
const dir = mkdtempSync(join(tmpdir(), 'mes-'))

const b = await open({ url: URL, w: 390, h: 844, dpr: 2, now: '2026-08-12', state: { onboarded: true, name: 'Ada', role: 'teen' } })
const { page } = b
await page.waitForSelector('.mes')

// structure
const s1 = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.k-row')]
  return {
    groups: document.querySelectorAll('.k-rowgroup').length,
    rows: rows.length,
    minH: Math.min(...rows.map((r) => r.getBoundingClientRect().height)),
    overflowX: document.documentElement.scrollWidth > innerWidth,
    sw: [...document.querySelectorAll('[role=switch]')].map((e) => e.getAttribute('aria-label') + ':' + e.checked),
    sliders: [...document.querySelectorAll('[role=slider]')].map((e) => e.getAttribute('aria-label') + ':' + e.getAttribute('aria-valuetext')),
    seg: [...document.querySelectorAll('[role=radiogroup]')].map((e) => e.getAttribute('aria-label')),
  }
})
ok('4 groups', s1.groups === 4, JSON.stringify(s1))
ok('rows >= 48px', s1.minH >= 48, String(s1.minH))
ok('no horizontal overflow', !s1.overflowX)

// sound toggle
await page.click('label.k-row:has([aria-label="Sound"])')
ok('sound off via row click', (await page.evaluate(() => __mes.prefs.get('sound'))) === false)
ok('volume disabled when muted', (await page.evaluate(() => document.querySelector('.k-slider[data-disabled]') !== null)))
await page.click('label.k-row:has([aria-label="Sound"])')
ok('sound on again', (await page.evaluate(() => __mes.prefs.get('sound'))) === true)
ok('soundOn toast has Mute', await page.locator('.k-toast-act', { hasText: 'Mute' }).count() > 0)

// volume via keyboard
await page.focus('[role=slider][aria-label="Volume"]')
await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight')
ok('volume 0.7 after 2 steps', Math.abs((await page.evaluate(() => __mes.prefs.get('volume'))) - 0.7) < 0.001)

// haptics
await page.click('label.k-row:has([aria-label="Haptics"])')
ok('haptics off', (await page.evaluate(() => __mes.prefs.get('haptics'))) === false)
await page.click('label.k-row:has([aria-label="Haptics"])')
ok('haptics on', (await page.evaluate(() => __mes.prefs.get('haptics'))) === true)

// effects
await page.click('[role=radiogroup][aria-label="Effects"] [role=radio]:has-text("Lite")')
const fx = await page.evaluate(() => ({ pref: __mes.prefs.get('fx'), attr: document.documentElement.dataset.fx }))
ok('effects lite -> pref + data-fx', fx.pref === 'lite' && fx.attr === 'lite', JSON.stringify(fx))
await page.click('[role=radiogroup][aria-label="Effects"] [role=radio]:has-text("Auto")')
ok('effects auto', (await page.evaluate(() => __mes.prefs.get('fx'))) === 'auto')

// text size
const before = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.mes-sample')).fontSize))
await page.focus('[role=slider][aria-label="Text size"]')
await page.keyboard.press('End')
const after = await page.evaluate(() => ({ fs: parseFloat(getComputedStyle(document.querySelector('.mes-sample')).fontSize), ts: __mes.prefs.get('textScale'), font: getComputedStyle(document.querySelector('.mes-sample')).fontFamily.slice(0, 20) }))
ok('sample scales to 130%', Math.abs(after.fs / before - 1.3) < 0.02 && after.ts === 1.3, JSON.stringify({ before, ...after }))

// goal + role
await page.click('[role=radiogroup][aria-label="Daily goal"] [role=radio]:has-text("60")')
ok('goal 60', (await page.evaluate(() => __mes.snapshot().dailyGoalXp)) === 60)
await page.click('[role=radiogroup][aria-label="Who’s flying"] [role=radio]:has-text("Parent")')
ok('role parent', (await page.evaluate(() => __mes.snapshot().role)) === 'parent')

// backup download
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.k-row:has-text("Back up progress")')])
const bpath = join(dir, dl.suggestedFilename()); await dl.saveAs(bpath)
ok('backup filename', /^kind-backup-2026-08-12\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename())
const parsed = JSON.parse(readFileSync(bpath, 'utf8'))
ok('backup is a kind save', parsed.app === 'kind' && parsed.state.dailyGoalXp === 60)

// restore: bad json
const input = page.locator('[data-testid=mes-restore-input]')
const bad = join(dir, 'bad.json'); writeFileSync(bad, '{ not json')
await input.setInputFiles(bad)
await page.waitForTimeout(250)
ok('bad json -> toast, no dialog', (await page.locator('.k-toast', { hasText: 'could not be read' }).count()) > 0 && (await page.locator('[role=alertdialog],[role=dialog]').count()) === 0)
const wrong = join(dir, 'wrong.json'); writeFileSync(wrong, JSON.stringify({ hello: 'world' }))
await input.setInputFiles(wrong)
await page.waitForTimeout(250)
ok('not-a-kind -> toast', (await page.locator('.k-toast', { hasText: 'not a KIND backup' }).count()) > 0)

// restore: good — change state first so the restore is observable
await page.evaluate(() => { const t = __mes.exportProgress(); window.__keep = t; __mes.importProgress(JSON.stringify({ app: 'kind', schema: JSON.parse(t).schema, state: { ...JSON.parse(t).state, dailyGoalXp: 20, xp: 5 } })) })
ok('state mutated to goal 20', (await page.evaluate(() => __mes.snapshot().dailyGoalXp)) === 20)
const good = join(dir, 'good.json'); writeFileSync(good, readFileSync(bpath))
await input.setInputFiles(good)
await page.waitForSelector('[role=alertdialog], [role=dialog]')
const dlg = await page.evaluate(() => (document.querySelector('[role=alertdialog], [role=dialog]') || {}).textContent)
ok('confirm dialog before restore', /Replace progress/.test(dlg) && (await page.evaluate(() => __mes.snapshot().dailyGoalXp)) === 20, dlg.slice(0, 120))
await b.shot('mes-restore-dialog')
await page.click('[role=alertdialog] button:has-text("Restore"), [role=dialog] button:has-text("Restore")')
await page.waitForTimeout(300)
const rt = await page.evaluate(() => ({ goal: __mes.snapshot().dailyGoalXp, role: __mes.snapshot().role }))
ok('round trip restored goal 60 + role parent', rt.goal === 60 && rt.role === 'parent', JSON.stringify(rt))

// reminder sheet
await page.evaluate(() => document.querySelector('[data-testid=mes-scroll]').scrollTo(0, 0))
await page.click('.k-row:has-text("Daily reminder")')
await page.waitForSelector('.mes-clock')
await page.waitForTimeout(500)
await page.click('.mes-presets .k-chip:has-text("Before bed")')
const clock = await page.evaluate(() => document.querySelector('.mes-clock__t').textContent)
ok('preset sets clock 9:30 pm', /9:30\s*pm/.test(clock), clock)
await b.shot('mes-reminder-390')
const [icsDl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Add to my calendar")')])
const ipath = join(dir, 'r.ics'); await icsDl.saveAs(ipath)
const ics = readFileSync(ipath, 'utf8')
ok('ics DTSTART 21:30', /DTSTART:\d{8}T213000/.test(ics) && /RRULE:FREQ=DAILY/.test(ics))
const rem = await page.evaluate(() => __mes.prefs.get('reminder'))
ok('reminder saved', rem.on && rem.hour === 21 && rem.min === 30, JSON.stringify(rem))
await page.waitForTimeout(700)
const toastText = (await page.locator('.k-toast').allInnerTexts()).join(' / ')
ok('toast says Reminder set for', /Reminder set for 9:30 pm/.test(toastText), toastText.replace(/\n/g, ' | '))
const rowVal = await page.evaluate(() => [...document.querySelectorAll('.k-row__value')].map((e) => e.textContent).join(','))
ok('row value shows time', /9:30 pm/.test(rowVal), rowVal)

// hero shots
await page.evaluate(() => document.querySelector('[data-testid=mes-scroll]').scrollTo(0, 0))
await b.shot('mes-top-390')
await page.evaluate(() => { const e = document.querySelector('[data-testid=mes-scroll]'); e.scrollTo(0, e.scrollHeight) })
await b.shot('mes-bottom-390')

log.push('errors: ' + JSON.stringify(b.errors))
console.log(log.join('\n'))
await b.close()
