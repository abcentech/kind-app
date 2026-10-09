// node playground/learn-launch.probe.mjs <device> <scn> — box model of the slab's parts (inset check)
import { open } from '../tools/browser.mjs'
const [device = 'lowend', scn = 'atRisk'] = process.argv.slice(2)
const b = await open({ url: `http://localhost:5183/playground/learn-launch.html?scn=${scn}`, device, dpr: 2, state: null })
await b.page.waitForSelector('.launch-cta')
await b.page.waitForTimeout(900)
const r = await b.page.evaluate(() => {
  const R = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10, Math.round(r.bottom * 10) / 10] }
  const cs = getComputedStyle(document.querySelector('.launch-slab'))
  return { slab: R('.launch-slab'), body: R('.launch-body'), cta: R('.launch-cta'), face: R('.k-btn__face'), top: R('.launch-top'), title: R('.launch-title'), sub: R('.launch-sub'), pad: cs.padding, h: document.documentElement.style.getPropertyValue('--launch-h') }
})
console.log(JSON.stringify(r))
console.log('errors', JSON.stringify(b.errors))
await b.close()
