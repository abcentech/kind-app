// Contact sheet of every onboard-main beat at 360 x 640 — one browser, two cropped screenshots, DOM checks.
//   node playground/onboard-main.sheet.mjs [lite]
import { open } from '../tools/browser.mjs'

const lite = process.argv.includes('lite')
const b = await open({
  url: `http://localhost:5183/playground/onboard-main.html?sheet=1${lite ? '&fx=lite' : ''}&now=2026-08-12`,
  device: 'desktop', w: 1140, h: 1330, dpr: 2, state: null, reduceMotion: lite,
})
await b.page.waitForTimeout(1600)
const report = await b.page.evaluate(() => {
  const cells = [...document.querySelectorAll('.onb')].map((root) => {
    const r = root.getBoundingClientRect()
    const body = root.querySelector('.onb-body')
    const foot = root.querySelector('.onb-foot')
    const stage = root.querySelector('.onb-stage')
    const t = root.querySelector('.onb-title')
    const fr = foot?.getBoundingClientRect()
    return {
      at: root.dataset.at,
      scrolls: body ? body.scrollHeight - body.clientHeight : null,
      footBottomGap: fr ? Math.round(r.bottom - fr.bottom) : null,
      footTop: fr ? Math.round(fr.top - r.top) : null,
      stageBottom: stage ? Math.round(stage.getBoundingClientRect().bottom - r.top) : null,
      titleFont: t ? getComputedStyle(t).fontFamily.split(',')[0] : null,
      titleSize: t ? getComputedStyle(t).fontSize : null,
      titleH: t ? Math.round(t.getBoundingClientRect().height) : null,
    }
  })
  return cells
})
console.table(report)
await b.page.screenshot({ path: 'tools/out/onboard-main/sheet-a.png', clip: { x: 0, y: 0, width: 1140, height: 664 } })
await b.page.screenshot({ path: 'tools/out/onboard-main/sheet-b.png', clip: { x: 0, y: 664, width: 1140, height: 664 } })
console.log('errors', b.errors)
await b.close()
