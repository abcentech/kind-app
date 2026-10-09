// node playground/share-canvas.shots.mjs sheet <kind> [variant]     → tools/out/share-canvas/sheet-<kind>[-variant].png
// node playground/share-canvas.shots.mjs <kind> <template> <aspect> [variant]   → full-size PNG
// node playground/share-canvas.shots.mjs all                         → every kind x template x aspect, full size
import { open, OUT } from '../tools/browser.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(OUT, 'share-canvas'); mkdirSync(dir, { recursive: true })
const [a0, a1, a2, a3] = process.argv.slice(2)
const URL0 = 'http://localhost:5183/playground/share-canvas.html'
const save = (name, d) => writeFileSync(join(dir, name + '.png'), Buffer.from(d.split(',')[1], 'base64'))

if (a0 === 'sheet') {
  const b = await open({ url: `${URL0}?kind=${a1}${a2 ? '&v=' + a2 : ''}`, device: 'desktop', w: 1100, h: 900, dpr: 1 })
  await b.page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 240000 })
  console.log('errors', b.errors, await b.page.evaluate(() => window.__error))
  await b.page.screenshot({ path: join(dir, `sheet-${a1}${a2 ? '-' + a2 : ''}.png`), fullPage: true })
  await b.close()
} else {
  const b = await open({ url: URL0 + '?nosheet=1', device: 'desktop', w: 1200, h: 900, dpr: 1 })
  await b.page.waitForFunction(() => window.__share)
  const jobs = a0 === 'all'
    ? await b.page.evaluate(() => Object.entries(window.__share.TEMPLATES).flatMap(([k, ts]) => ts.flatMap((t) => window.__share.ASPECTS.map((a) => [k, t.id, a.id]))))
    : [[a0, a1, a2, a3]]
  for (const [k, t, a, v] of jobs) {
    const ms = await b.page.evaluate(([k, t, a, v]) => window.__share.timing(k, t, a, v), [k, t, a, v])
    const d = await b.page.evaluate(([k, t, a, v]) => window.__share.dataUrl(k, t, a, v), [k, t, a, v])
    save(`${k}-${t}-${a}${v ? '-' + v : ''}`, d); console.log(k, t, a, v || '', ms + 'ms')
  }
  console.log('errors', b.errors)
  await b.close()
}
