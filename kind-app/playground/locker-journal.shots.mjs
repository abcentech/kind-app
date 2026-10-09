import { open } from '../tools/browser.mjs'
const b = await open({ url: 'http://localhost:5183/playground/locker-journal.html?seed=15&now=2026-08-12', device: 'lowend', dpr: 2, state: null })
const { page } = b
await page.waitForSelector('.lcj-card, .lcj-empty', { timeout: 8000 }).catch(() => {})
const r = await page.evaluate(() => ({
  cards: document.querySelectorAll('.lcj-card').length,
  count: document.querySelector('.lcj-count')?.innerText,
  chips: [...document.querySelectorAll('.lcj-chips .k-chip')].map((c) => c.innerText),
  more: document.querySelectorAll('.lcj-more').length,
  clamp: [...document.querySelectorAll('.lcj-quote__text')].map((e) => [e.scrollHeight, e.clientHeight]).slice(0, 5),
  hscroll: document.documentElement.scrollWidth > innerWidth,
  first: document.querySelector('.lcj-card')?.innerText.slice(0, 300),
}))
console.log(JSON.stringify(r, null, 1))
console.log('errors', b.errors)
await b.shot('lj-hero')
await b.close()
