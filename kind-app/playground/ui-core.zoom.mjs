// Zoom helper: screenshot several elements in ONE browser launch, at a high DPR, viewport coordinates (no fullPage — fast).
//   node playground/ui-core.zoom.mjs [--dpr 4] [--pad 20] [--fx lite] [--w 900] [--h 900] [--reduce] -- name=selector[@nth] name=selector[@nth] …
// Shots land in tools/out/ui-core/<name>.png
import { open } from './ui-core.open.mjs'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

const a = process.argv.slice(2)
const split = a.indexOf('--')
const flags = split > -1 ? a.slice(0, split) : []
const jobs = split > -1 ? a.slice(split + 1) : a
const get = (f, d) => { const i = flags.indexOf(f); return i > -1 ? flags[i + 1] : d }
const dpr = Number(get('--dpr', 4)), pad = Number(get('--pad', 20)), fx = get('--fx', 'full')
const b = await open({ url: `http://localhost:5183/playground/ui-core.html?fx=${fx}`, device: 'desktop', w: Number(get('--w', 900)), h: Number(get('--h', 900)), dpr, state: null, reduceMotion: flags.includes('--reduce') })
const { page } = b
await page.waitForTimeout(500)
for (const j of jobs) {
  const eq = j.indexOf('=')
  const name = j.slice(0, eq)
  let sel = j.slice(eq + 1), nth = 0
  const at = sel.lastIndexOf('@')
  if (at > -1 && /^\d+$/.test(sel.slice(at + 1))) { nth = Number(sel.slice(at + 1)); sel = sel.slice(0, at) }
  const el = page.locator(sel).nth(nth)
  await el.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(350)
  const bb = await el.boundingBox()
  const out = join(import.meta.dirname, '..', 'tools', 'out', 'ui-core', `${name}.png`)
  mkdirSync(dirname(out), { recursive: true })
  const vw = page.viewportSize()
  const x = Math.max(0, bb.x - pad), y = Math.max(0, bb.y - pad)
  const clip = { x, y, width: Math.min(vw.width - x, bb.width + pad * 2), height: Math.min(vw.height - y, bb.height + pad * 2) }
  await page.screenshot({ path: out, clip })
  console.log(name, JSON.stringify(clip))
}
console.log('errors:', b.errors.length ? b.errors : 'none')
await b.close()
