// node playground/slides-read.shots.mjs <name> <viewportW> <viewportH> <query> [waitMs] [dpr] -> tools/out/slides-read/<name>.png (clipped to the frame grid)
import { fileURLToPath } from 'node:url'
import { open } from '../tools/browser.mjs'

const [name, vw, vh, query = '', wait = '2600', dpr = '2'] = process.argv.slice(2)
const b = await open({
  url: `http://localhost:5183/playground/slides-read.html${query ? '?' + query : ''}`,
  device: 'desktop', w: +vw, h: +vh, dpr: +dpr, reduceMotion: /fx=lite/.test(query),
})
await b.page.waitForTimeout(+wait)
const box = await b.page.evaluate(() => {
  const g = [...document.querySelectorAll('.pg-grid')]
  const r = g.map((e) => e.getBoundingClientRect())
  const x0 = Math.min(...r.map((a) => a.left)), y0 = Math.min(...r.map((a) => a.top))
  const x1 = Math.max(...r.map((a) => a.right)), y1 = Math.max(...r.map((a) => a.bottom))
  return { x: Math.max(0, x0 - 8), y: Math.max(0, y0 - 24), width: x1 - x0 + 16, height: y1 - y0 + 24 + 36 }
})
const file = `slides-read/${name}`
await b.page.screenshot({ path: fileURLToPath(new URL(`../tools/out/${file}.png`, import.meta.url)), clip: box })
console.log('shot', file, JSON.stringify(box), 'errors', JSON.stringify(b.errors))
await b.close()
