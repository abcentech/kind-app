import { open } from '../tools/browser.mjs'
const kinds = process.argv.slice(2).length ? process.argv.slice(2) : ['verse', 'card', 'streak', 'month']
for (const kind of kinds) {
  const b = await open({ url: `http://localhost:5183/playground/share-sheet.html?engine=real&open=${kind}${kind === 'month' ? '&series=secrets-of-longevity' : ''}`, device: 'iphone', dpr: 2 })
  const t0 = Date.now()
  await b.page.waitForFunction(() => document.querySelector('.shr-frame')?.dataset.phase && document.querySelector('.shr-frame').dataset.phase !== 'loading', null, { timeout: 40000 }).catch(() => {})
  const first = Date.now() - t0
  await b.page.waitForFunction(() => { const n = document.querySelectorAll('.shr-thumb img').length; return n && n === document.querySelectorAll('.shr-tpl').length }, null, { timeout: 60000 }).catch(() => {})
  const m = await b.page.evaluate(() => ({ phase: document.querySelector('.shr-frame').dataset.phase, tpls: [...document.querySelectorAll('.shr-tname')].map((e) => e.textContent), thumbs: document.querySelectorAll('.shr-thumb img').length, canvas: [document.querySelector('.shr-canvas').width, document.querySelector('.shr-canvas').height], err: document.querySelector('.shr-err')?.textContent }))
  console.log(kind, 'firstMs', first, JSON.stringify(m), JSON.stringify(b.errors))
  // switch to 2nd template + portrait
  if (m.tpls.length > 1) {
    await b.page.click('.shr-tpl:nth-child(2)'); await b.page.click('text=Portrait')
    const t1 = Date.now()
    await b.page.waitForFunction(() => { const f = document.querySelector('.shr-frame'); return f.dataset.phase === 'ready' && !f.dataset.stale }, null, { timeout: 40000 }).catch(() => {})
    console.log(' switch ms', Date.now() - t1, 'canvas', await b.page.evaluate(() => [document.querySelector('.shr-canvas').width, document.querySelector('.shr-canvas').height]))
  }
  if (kind === 'verse' || kind === 'month') console.log(await b.shot('share-real-' + kind))
  await b.close()
}
