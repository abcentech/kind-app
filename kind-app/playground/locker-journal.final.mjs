// locker-journal final pass: 390x844 search state, 360x640 empty + lite, keyboard path, persistence.
import { open } from '../tools/browser.mjs'
const log = (k, v) => console.log(k, JSON.stringify(v))
{
  const b = await open({ url: 'http://localhost:5183/playground/locker-journal.html?seed=15&now=2026-08-12', device: 'iphone', dpr: 2, state: null })
  const { page } = b
  await page.waitForSelector('.lcj-card')
  await page.fill('.lcj-search input', 'steward')
  await page.evaluate(() => document.querySelector('.lcj-meta').scrollIntoView({ block: 'start' }))
  await page.evaluate(() => document.querySelector('.shell-screen').scrollBy(0, -20))
  await b.shot('lj-search', { settle: 700 })
  // keyboard path
  await page.fill('.lcj-search input', '')
  await page.locator('.lcj-card').first().locator('.k-iconbtn').focus()
  await page.keyboard.press('Enter'); await page.waitForTimeout(700)
  log('sheet open via keyboard', await page.evaluate(() => ({ dlg: document.querySelectorAll('[role=dialog]').length, focus: document.activeElement?.innerText?.slice(0, 30) || document.activeElement?.className })))
  await page.keyboard.press('Escape'); await page.waitForTimeout(700)
  log('closed, focus back', await page.evaluate(() => ({ dlg: document.querySelectorAll('[role=dialog]').length, focus: document.activeElement?.getAttribute('aria-label')?.slice(0, 40) })))
  // targets
  log('targets <44', await page.evaluate(() => [...document.querySelectorAll('.lcj button, .lcj input')].map((e) => { const r = e.getBoundingClientRect(); return [e.className.slice(0, 20), Math.round(r.width), Math.round(r.height)] }).filter((x) => x[2] < 44 && x[2] > 0).slice(0, 6)))
  // edit persisted
  await page.locator('.lcj-card').nth(3).locator('.k-iconbtn').click(); await page.waitForTimeout(600)
  await page.getByText('Edit', { exact: true }).click(); await page.waitForTimeout(800)
  await page.fill('textarea', 'Persisted edit ẹ̀ṣẹ̀'); await page.getByRole('button', { name: /save/i }).click(); await page.waitForTimeout(700)
  log('persist', await page.evaluate(() => [...document.querySelectorAll('.lcj-quote__text')].map((e) => e.innerText).filter((t) => t.startsWith('Persisted')).length + ' ' + document.querySelector('.lcj-quote__text').innerText.slice(0, 20)))
  log('errors', b.errors)
  await b.close()
}
{
  const b = await open({ url: 'http://localhost:5183/playground/locker-journal.html?seed=0&fx=lite&now=2026-08-12', device: 'lowend', dpr: 2, state: null, reduceMotion: true })
  const { page } = b
  await page.waitForSelector('.lcj-empty')
  await b.shot('lj-empty-lite', { settle: 600 })
  log('empty', await page.evaluate(() => document.querySelector('.lcj-empty').innerText))
  await page.getByRole('button', { name: /launch/i }).click(); await page.waitForTimeout(200)
  log('shell log', await page.evaluate(() => document.querySelector('[data-testid=shell-log]')?.innerText))
  log('errors', b.errors)
  await b.close()
}
{
  const b = await open({ url: 'http://localhost:5183/playground/locker-journal.html?seed=15&fx=lite&now=2026-08-12', device: 'lowend', dpr: 2, state: null, reduceMotion: true })
  const { page } = b
  await page.waitForSelector('.lcj-card')
  log('lite anim', await page.evaluate(() => getComputedStyle(document.querySelector('.lcj-item')).animationName))
  await b.close()
}
