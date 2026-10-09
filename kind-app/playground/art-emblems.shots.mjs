// art-emblems screenshot helper (real pixels).
//   node playground/art-emblems.shots.mjs <name> [--only patch] [--sel "#sec-patch"] [--device iphone|lowend|desktop] [--dpr 3]
//        [--fx lite] [--full] [--clip x,y,w,h] [--eval "js"] [--w 390 --h 844] [--wait 600] [--q key=value]
// Shots land in tools/out/art-emblems/<name>.png
import { open } from '../tools/browser.mjs'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

const a = process.argv.slice(2)
const name = a[0] && !a[0].startsWith('--') ? a[0] : 'shot'
const get = (f, d) => { const i = a.indexOf(f); return i > -1 ? a[i + 1] : d }
const has = (f) => a.includes(f)
const qs = new URLSearchParams()
if (get('--only')) qs.set('only', get('--only'))
if (get('--fx')) qs.set('fx', get('--fx'))
for (const e of a.flatMap((x, i) => (x === '--q' ? [a[i + 1]] : []))) { const [k, v] = e.split('='); qs.set(k, v) }
const b = await open({
  url: `http://localhost:5183/playground/art-emblems.html${[...qs].length ? '?' + qs : ''}`,
  device: get('--device', 'desktop'),
  w: get('--w') && Number(get('--w')), h: get('--h') && Number(get('--h')), dpr: get('--dpr') && Number(get('--dpr')),
  state: null, reduceMotion: has('--reduce'),
})
const { page } = b
await page.waitForTimeout(Number(get('--wait', 700)))
// content-visibility:auto cards only paint once they have been near the viewport: walk the page first
await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)) } window.scrollTo(0, 0) })
if (get('--eval')) { await page.evaluate(get('--eval')); await page.waitForTimeout(250) }
const out = join(import.meta.dirname, '..', 'tools', 'out', 'art-emblems', `${name}.png`)
mkdirSync(join(out, '..'), { recursive: true })
const sel = get('--sel')
if (sel) {
  const el = page.locator(sel).first()
  await el.evaluate((e) => e.scrollIntoView({ block: 'center', inline: 'center' }))
  await page.waitForTimeout(300)
  const bb = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } })
  const pad = Number(get('--pad', 0))
  await page.screenshot({ path: out, clip: { x: Math.max(0, bb.x - pad), y: Math.max(0, bb.y - pad), width: bb.width + pad * 2, height: bb.height + pad * 2 } })
} else if (get('--clip')) {
  const [x, y, w, h] = get('--clip').split(',').map(Number)
  await page.screenshot({ path: out, clip: { x, y, width: w, height: h }, fullPage: true })
} else await page.screenshot({ path: out, fullPage: has('--full') })
console.log(out)
console.log('errors:', b.errors.length ? b.errors : 'none')
await b.close()
