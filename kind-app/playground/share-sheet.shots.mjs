import { open } from '../tools/browser.mjs'
const [,, kind = 'verse', device = 'iphone', name = 'share', w, h, extra = ''] = process.argv
const b = await open({ url: `http://localhost:5183/playground/share-sheet.html?engine=fake&open=${kind}${extra}`, device, w: w && +w, h: h && +h, dpr: 2 })
await b.page.waitForTimeout(500)
const early = await b.page.evaluate(() => ({ phase: document.querySelector('.shr-frame')?.dataset.phase, busy: document.querySelector('.shr-stage')?.getAttribute('aria-busy') }))
await b.page.waitForFunction(() => document.querySelectorAll('.shr-thumb img').length >= 3, null, { timeout: 15000 }).catch(() => {})
const m = await b.page.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)] }
  return { vh: innerHeight, compact: document.querySelector('.shr-actions')?.dataset.compact, stage: r('.shr-stage'), frame: r('.shr-frame'), strip: r('.shr-strip'), seg: r('.k-seg'), foot: r('.k-sheet-foot'), sc: [document.querySelector('.k-sheet-scroll').scrollHeight, document.querySelector('.k-sheet-scroll').clientHeight], btns: [...document.querySelectorAll('.shr-actions button')].map((e) => { const b = e.getBoundingClientRect(); return [e.getAttribute('aria-label') || e.textContent.trim(), Math.round(b.width), Math.round(b.height)] }) }
})
console.log(JSON.stringify({ early, m, errors: b.errors }))
console.log(await b.shot(name))
await b.close()
