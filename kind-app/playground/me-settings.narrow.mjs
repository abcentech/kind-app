// node playground/me-settings.narrow.mjs — 360x640, lite fx, seeded progress (so the "you usually launch" hint shows), keyboard path.
import { open } from '../tools/browser.mjs'

const b = await open({ url: 'http://localhost:5183/playground/me-settings.html?fx=lite', w: 360, h: 640, dpr: 2, now: '2026-08-12', state: { onboarded: true, name: 'Ada', role: 'teen' } })
const { page } = b
await page.waitForSelector('.mes')
await page.evaluate(() => window.__kind.seed('mid'))
await page.waitForTimeout(300)
const out = []

const geo = await page.evaluate(() => ({
  lite: document.documentElement.dataset.fx,
  overflow: document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll('.mes *')].some((e) => e.getBoundingClientRect().right > innerWidth + 1),
  seg: [...document.querySelectorAll('.k-seg')].map((e) => Math.round(e.getBoundingClientRect().width)),
}))
out.push('geo ' + JSON.stringify(geo))

// keyboard order verified separately: Sound > Volume > Haptics > Effects > Text size > Goal > Role > Reminder > Back up > Restore
await page.evaluate(() => document.querySelector('[data-testid=mes-scroll]').scrollTo(0, 0))
await b.shot('mes-top-360', { settle: 900 })

await page.click('.k-row:has-text("Daily reminder")')
await page.waitForSelector('.mes-clock')
await page.waitForTimeout(700)
const hint = await page.evaluate(() => (document.querySelector('.mes-usual') || {}).textContent || null)
out.push('usual hint ' + hint)
const sheet = await page.evaluate(() => { const s = document.querySelector('.k-sheet'); const r = s.getBoundingClientRect(); return { h: Math.round(r.height), top: Math.round(r.top), vh: innerHeight, ov: s.scrollWidth > s.clientWidth } })
out.push('sheet ' + JSON.stringify(sheet))
await b.shot('mes-reminder-360', { settle: 500 })
await page.keyboard.press('Escape')
await page.waitForTimeout(500)

await page.evaluate(() => { const e = document.querySelector('[data-testid=mes-scroll]'); e.scrollTo(0, e.scrollHeight) })
await b.shot('mes-bottom-360', { settle: 900 })

out.push('errors ' + JSON.stringify(b.errors))
console.log(out.join('\n'))
await b.close()
