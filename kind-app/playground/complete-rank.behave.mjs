// complete-rank: behaviour checks that are about logic, not looks. node playground/complete-rank.behave.mjs
import { open } from '../tools/browser.mjs'
const base = 'http://localhost:5183/playground/complete-rank.html'
const log = (k, v) => console.log(k.padEnd(34), typeof v === 'string' ? v : JSON.stringify(v))
const seenIds = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('kind-app-v4') || '{}').achSeen || [])
const nexts = (page) => page.evaluate(() => Number(window.__nexts()))
const attrs = (page) => page.evaluate(() => { const b = document.querySelector('.cmk-beat'); return b ? b.getAttributeNames().filter((a) => a.startsWith('data-')).join(' ') : null })
const title = (page) => page.evaluate(() => document.querySelector('.cmk-medal__title')?.textContent || (document.querySelector('.cmk-sum') ? '[stack]' : null))

// 1 ── medals: one by one, markSeen, the stack, a double tap on CONTINUE
{
  const b = await open({ url: `${base}?case=medals-3&bare=1`, device: 'lowend', dpr: 1 })
  await b.page.waitForTimeout(1300)
  log('medal 1', await title(b.page)); log('achSeen after 1st lands', await seenIds(b.page))
  await b.page.click('.k-btn'); await b.page.waitForTimeout(120)
  log('after tap CONTINUE', await title(b.page))
  // tap on the medal itself goes on too
  const box = await b.page.locator('.cmk-medal__art').boundingBox()
  await b.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await b.page.waitForTimeout(150)
  log('after tap on medal', await title(b.page))
  log('achSeen (3rd leaving not yet)', await seenIds(b.page))
  // hold pauses the timer: press 4 s, nothing moves
  const box3 = await b.page.locator('.cmk-medal__art').boundingBox()
  await b.page.mouse.move(box3.x + box3.width / 2, box3.y + box3.height / 2); await b.page.mouse.down()
  await b.page.waitForTimeout(4200)
  log('still 3rd after 4.2 s hold', await title(b.page)); await b.page.mouse.up(); await b.page.waitForTimeout(150)
  log('hold release did not advance', await title(b.page))
  await b.page.waitForTimeout(3300)
  log('auto advanced to stack', await title(b.page)); log('achSeen all', await seenIds(b.page))
  await b.page.dblclick('.k-btn'); await b.page.waitForTimeout(200)
  log('next() calls after double-click', await nexts(b.page))
  log('errors', b.errors); await b.close()
}

// 2 ── keyboard turns the timer off; reduced motion never starts it
{
  const b = await open({ url: `${base}?case=medals-3&bare=1`, device: 'lowend', dpr: 1 })
  await b.page.waitForTimeout(800); log('data-* before key', await attrs(b.page))
  await b.page.keyboard.press('Tab'); await b.page.waitForTimeout(200)
  log('data-* after Tab', await attrs(b.page))
  await b.page.waitForTimeout(3600); log('still on medal 1 after 3.8 s (manual)', await title(b.page))
  await b.close()
  const r = await open({ url: `${base}?case=medals-3&bare=1`, device: 'lowend', dpr: 1, reduceMotion: true })
  await r.page.waitForTimeout(3600); log('reduced motion: auto off', await attrs(r.page)); log('reduced motion: stays on medal 1', await title(r.page))
  log('reduced: rays hidden', await r.page.evaluate(() => getComputedStyle(document.querySelector('.cmk-medal__rays')).display))
  await r.close()
}

// 3 ── rank-up: a tap fast-forwards, CONTINUE once, replay is clean
{
  const b = await open({ url: `${base}?case=up-steward&bare=1`, device: 'lowend', dpr: 1 })
  await b.page.waitForTimeout(150)
  log('rank-up early', await attrs(b.page))
  await b.page.mouse.click(180, 300); await b.page.waitForTimeout(350)
  log('after FF tap', await attrs(b.page))
  await b.page.waitForTimeout(350)
  await b.page.click('.k-btn'); await b.page.click('.k-btn'); await b.page.waitForTimeout(100)
  log('next() calls (two taps)', await nexts(b.page))
  await b.page.evaluate(() => window.__replay()); await b.page.waitForTimeout(100)
  log('replay resets', await attrs(b.page))
  await b.page.waitForTimeout(2600); log('replay lands again', await attrs(b.page))
  log('verse ref == store ref', await b.page.evaluate(() => document.querySelector('.cmk-up__ref')?.textContent))
  log('errors', b.errors); await b.close()
}

// 4 ── patch + rank band flags
{
  const b = await open({ url: `${base}?case=patch-longevity&bare=1`, device: 'iphone', dpr: 1 })
  await b.page.waitForTimeout(3200)
  log('patch longevity flags', await attrs(b.page))
  log('patch text', await b.page.evaluate(() => [...document.querySelectorAll('.cmk-patch__eyebrow, .cmk-patch__earned, .cmk-patch__name, .cmk-patch__q, .cmk-patch__ref')].map((e) => e.textContent)))
  await b.page.goto(`${base}?case=rank&bare=1`, { waitUntil: 'networkidle' }); await b.page.waitForTimeout(2400)
  log('band', await b.page.evaluate(() => ({ xp: document.querySelector('.cmk-xp__n')?.textContent, gain: document.querySelector('.cmk-xp__gain')?.textContent, bar: getComputedStyle(document.querySelector('.cmk-band__gain')).transform, aria: document.querySelector('.cmk-band').getAttribute('aria-label'), live: document.querySelector('.u-sr')?.textContent })))
  log('errors', b.errors); await b.close()
}
