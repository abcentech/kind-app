// Foundation poster screenshots.  node playground/foundation.shots.mjs [tag] [--device iphone|lowend|...] [--lite] [--hc] [--sections a,b]
// Scrolls to each section, shoots the viewport, prints console errors. Shots → tools/out/foundation/<tag>-<device>-<section>.png
import { open } from '../tools/browser.mjs'

const a = process.argv.slice(2)
const tag = a[0] && !a[0].startsWith('--') ? a[0] : 'n'
const get = (f, d) => { const i = a.indexOf(f); return i > -1 ? a[i + 1] : d }
const has = (f) => a.includes(f)
const device = get('--device', 'iphone')
const only = get('--sections', '')?.split(',').filter(Boolean)
const q = new URLSearchParams()
if (has('--lite')) q.set('fx', 'lite')
if (has('--hc')) q.set('contrast', 'more')

const b = await open({ url: `http://localhost:5183/playground/foundation.html?${q}`, device, state: null, reduceMotion: has('--reduce') })
const { page } = b
// The dev server is shared with ~14 other builders: if one of them saves a half-written file, Vite paints its error overlay on
// every open page and may hot-reload mid-shot. The poster itself compiles on its own, so hide the overlay and make sure it rendered.
await page.addStyleTag({ content: 'vite-error-overlay { display: none !important }' })
for (let i = 0; i < 6 && !(await page.$('.pf-self')); i++) { await page.waitForTimeout(2500); await page.reload({ waitUntil: 'networkidle' }).catch(() => {}); await page.addStyleTag({ content: 'vite-error-overlay { display: none !important }' }) }
await page.waitForTimeout(1200)
const ids = ['top', 'colour', 'type', 'shape', 'light', 'motion', 'access', 'rules']
const steps = Number(get('--steps', 1))   // consecutive viewport pages per section
const out = []
for (const id of ids) {
  if (only?.length && !only.includes(id)) continue
  if (id === 'top') await page.evaluate(() => window.scrollTo(0, 0))
  else await page.evaluate((i) => { const el = document.getElementById(i); if (el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 60) }, id)
  for (let k = 0; k < steps; k++) {
    if (k) await page.evaluate(() => window.scrollBy(0, innerHeight - 120))
    out.push(await b.shot(`foundation/${tag}-${device}-${id}${steps > 1 ? '-' + k : ''}`, { settle: 450 }))
  }
}
if (has('--full')) out.push(await b.shot(`foundation/${tag}-${device}-full`, { full: true, settle: 600 }))
const m = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight }))
console.log(out.join('\n'))
console.log('scrollW', m.w, 'clientW', m.cw, 'scrollH', m.h, m.w > m.cw ? 'HORIZONTAL OVERFLOW' : 'ok')
console.log(b.errors.length ? 'ERRORS:\n' + b.errors.join('\n') : 'no console errors')
await b.close()
