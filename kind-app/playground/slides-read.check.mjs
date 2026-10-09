// slides-read DOM check — no pixels: errors, overflow, fonts, key boxes. node playground/slides-read.check.mjs [device] [query]
import { open } from '../tools/browser.mjs'

const device = process.argv[2] || 'iphone'
const query = process.argv[3] || ''
const b = await open({ url: `http://localhost:5183/playground/slides-read.html${query ? '?' + query : ''}`, device, dpr: 1 })
await b.page.waitForTimeout(2600)   // the Open countdown finishes at ~1.8 s
const rows = await b.page.evaluate(() => [...document.querySelectorAll('.pg-fig')].map((fig) => {
  const slide = fig.querySelector('.lesson-slide')
  const root = fig.querySelector('.slr')
  const kids = root ? [...root.children].filter((e) => !e.classList.contains('slr-sky')) : []
  const cs = (el) => getComputedStyle(el)
  const text = root?.innerText?.replace(/\s+/g, ' ').slice(0, 110)
  const hs = [...root.querySelectorAll('.slr-lead, .slr-truth__text, .slr-point__title, .slr-quote__text, .slr-open__title, .slr-open__num, p')].slice(0, 1)
  return {
    id: fig.dataset.frame,
    kind: root?.dataset.kind,
    slideH: slide.clientHeight, contentH: slide.scrollHeight, scrolls: slide.scrollHeight > slide.clientHeight + 1,
    xOver: slide.scrollWidth > slide.clientWidth + 1,
    rootH: Math.round(root.getBoundingClientRect().height),
    font: hs[0] ? cs(hs[0]).fontFamily.split(',')[0] + ' ' + cs(hs[0]).fontSize : '',
    text,
    step: root?.dataset.step,
    log: fig.querySelector('.pg-log').textContent.trim(),
  }
}))
for (const r of rows) console.log(JSON.stringify(r))
console.log('errors', JSON.stringify(b.errors))
await b.close()
