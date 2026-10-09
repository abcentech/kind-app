// ui-core screenshot helper (pixels, not DOM guesses).
//   node playground/ui-core.shots.mjs <name> [--device iphone|lowend|se|pixel|tablet|desktop] [--sel "#sec-button"] [--fx lite]
//        [--full] [--dpr 3] [--w 390 --h 844] [--clip x,y,w,h] [--scale-el "#sel"] [--eval "js"] [--reduce]
// Shots land in tools/out/ui-core/<name>.png
import { open } from './ui-core.open.mjs'

const a = process.argv.slice(2)
const name = a[0] && !a[0].startsWith('--') ? a[0] : 'shot'
const get = (f, d) => { const i = a.indexOf(f); return i > -1 ? a[i + 1] : d }
const has = (f) => a.includes(f)
const fx = get('--fx', 'full')
const b = await open({
  url: `http://localhost:5183/playground/ui-core.html?fx=${fx}`,
  device: get('--device', 'iphone'),
  w: get('--w') && Number(get('--w')), h: get('--h') && Number(get('--h')), dpr: get('--dpr') && Number(get('--dpr')),
  state: null, reduceMotion: has('--reduce'),
})
const { page } = b
await page.waitForTimeout(600)
if (get('--eval')) await page.evaluate(get('--eval'))
const sel = get('--sel')
if (has('--all')) {
  const { dirname, join } = await import('node:path')
  const { mkdirSync } = await import('node:fs')
  const ids = await page.$$eval('.pg-sec', (els) => els.map((e) => e.id))
  for (const id of ids) {
    const out = join(import.meta.dirname, '..', 'tools', 'out', 'ui-core', `${name}-${id}.png`)
    mkdirSync(dirname(out), { recursive: true })
    const el = page.locator('#' + id)
    await el.scrollIntoViewIfNeeded()
    await page.waitForTimeout(250)
    await el.screenshot({ path: out })
    console.log(out)
  }
  console.log('errors:', b.errors.length ? b.errors : 'none')
  await b.close()
  process.exit(0)
}
const file = `ui-core/${name}.png`
if (sel) {
  const el = page.locator(sel).first()
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  const { dirname, join } = await import('node:path')
  const { mkdirSync } = await import('node:fs')
  const out = join(import.meta.dirname, '..', 'tools', 'out', file)
  mkdirSync(dirname(out), { recursive: true })
  const pad = Number(get('--pad', 0))
  if (pad) {
    const bb = await el.boundingBox()
    const sy = await page.evaluate(() => window.scrollY), sx = await page.evaluate(() => window.scrollX)
    await page.screenshot({ path: out, clip: { x: Math.max(0, bb.x + sx - pad), y: Math.max(0, bb.y + sy - pad), width: bb.width + pad * 2, height: bb.height + pad * 2 }, fullPage: true })
  } else await el.screenshot({ path: out })
  console.log(out)
} else if (get('--clip')) {
  const [x, y, w, h] = get('--clip').split(',').map(Number)
  const { dirname, join } = await import('node:path')
  const { mkdirSync } = await import('node:fs')
  const out = join(import.meta.dirname, '..', 'tools', 'out', file)
  mkdirSync(dirname(out), { recursive: true })
  await page.screenshot({ path: out, clip: { x, y, width: w, height: h }, fullPage: true })
  console.log(out)
} else {
  console.log(await b.shot(file, { full: has('--full') }))
}
console.log('errors:', b.errors.length ? b.errors : 'none')
await b.close()
