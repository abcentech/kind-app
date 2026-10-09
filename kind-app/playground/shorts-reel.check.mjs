import { open } from '../tools/browser.mjs'
const base = 'http://localhost:5183/playground/shorts-reel.html'
const log = (...a) => console.log(...a)
async function probe(b, tag) {
  const r = await b.page.evaluate(() => {
    const sc = document.querySelector('.sho-scroll'); if (!sc) return { none: true, txt: document.body.innerText.slice(0, 120) }
    const items = [...sc.querySelectorAll('.sho-item')]
    const h = sc.clientHeight
    return {
      h, n: items.length, sh: sc.scrollHeight, itemH: items[0].getBoundingClientRect().height,
      kinds: items.map((i) => i.dataset.kind + ':' + i.getAttribute('aria-label')).slice(0, 6),
      iframes: document.querySelectorAll('iframe').length,
      hud: document.querySelector('[class*=hud]')?.getBoundingClientRect().bottom,
      meta: document.querySelector('.sho-meta')?.getBoundingClientRect().top,
      foot: document.querySelector('.sho-foot')?.getBoundingClientRect().bottom,
      dock: document.querySelector('.shell-dock')?.getBoundingClientRect().top,
      live: document.querySelector('.sho-sr')?.textContent,
      title: document.querySelector('.sho-title')?.textContent,
      imgs: [...document.querySelectorAll('.sho-art__img')].map((i) => i.naturalWidth + 'x' + i.naturalHeight),
    }
  })
  log(tag, JSON.stringify(r))
}
let b = await open({ url: base + '?series=secrets-of-longevity', now: '2026-07-12', device: 'lowend', dpr: 2 })
await b.page.waitForTimeout(1500)
await probe(b, 'secrets live 360x640')
await b.shot('shorts-reel/s-poster-360')
// keyboard: focus scroller, arrow down
await b.page.focus('.sho-scroll'); await b.page.keyboard.press('ArrowDown'); await b.page.waitForTimeout(900)
await probe(b, 'after ArrowDown')
await b.page.keyboard.press('Enter'); await b.page.waitForTimeout(1500)
await probe(b, 'after Enter (play)')
log('player box', JSON.stringify(await b.page.evaluate(() => { const r = document.querySelector('.sho-player')?.getBoundingClientRect(); return r && { w: r.width, h: r.height, top: r.top, bottom: r.bottom } })))
log('iframe src', await b.page.evaluate(() => document.querySelector('iframe')?.src))
await b.shot('shorts-reel/s-playing-360')
await b.page.focus('.sho-scroll'); await b.page.keyboard.press('PageDown'); await b.page.waitForTimeout(1200)
await probe(b, 'scrolled away (iframes should be 0)')
// offline
await b.ctx.setOffline(true); await b.page.waitForTimeout(600)
await b.page.evaluate(() => window.dispatchEvent(new Event('offline')))
await b.page.waitForTimeout(500)
log('offline text', await b.page.evaluate(() => document.querySelector('.sho-reel')?.innerText.replace(/\n/g, ' | ')))
await b.shot('shorts-reel/s-offline-360')
log('errors', JSON.stringify(b.errors)); await b.close()

// stewardship archive + lite
b = await open({ url: base + '?series=stewardship-code&fx=lite', device: 'lowend', dpr: 2 })
await b.page.waitForTimeout(1200)
await probe(b, 'stewardship archive lite')
log('story wrapper', await b.page.evaluate(() => { const s = document.querySelector('.sho-story'); return s && JSON.stringify(s.getBoundingClientRect()) }))
log('errors', JSON.stringify(b.errors)); await b.close()
// live stewardship mid-Aug: today first, descending
b = await open({ url: base + '?series=stewardship-code', now: '2026-08-12', device: 'iphone', dpr: 2 })
await b.page.waitForTimeout(1000)
log('live order', await b.page.evaluate(() => [...document.querySelectorAll('.sho-item')].map((i) => i.getAttribute('aria-label').match(/Day (\d+)/)[1]).join(',')))
log('errors', JSON.stringify(b.errors)); await b.close()
