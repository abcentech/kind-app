// Drives real pointer states on the specimen and shoots them: hover (cursor specular), press (fingertip bloom), release (spring).
//   node playground/ui-core.states.mjs   → tools/out/ui-core/st-*.png
import { open } from './ui-core.open.mjs'
import { join } from 'node:path'
const b = await open({ url: 'http://localhost:5183/playground/ui-core.html', device: 'desktop', w: 900, h: 900, dpr: 4, state: null })
const { page } = b
await page.waitForTimeout(500)
const out = (n) => join(import.meta.dirname, '..', 'tools', 'out', 'ui-core', `${n}.png`)
const btn = page.locator('#sec-button-b .k-btn[data-v=primary]').first()
await btn.evaluate((e) => e.scrollIntoView({ block: 'center' }))
await page.waitForTimeout(300)
const bb = await btn.boundingBox()
const clip = { x: Math.max(0, bb.x - 24), y: bb.y - 24, width: bb.width + 48, height: bb.height + 48 }
await page.mouse.move(bb.x + bb.width * 0.25, bb.y + bb.height * 0.4, { steps: 6 })
await page.waitForTimeout(900)
await page.screenshot({ path: out('st-hover-left'), clip })
await page.mouse.move(bb.x + bb.width * 0.8, bb.y + bb.height * 0.6, { steps: 6 })
await page.waitForTimeout(700)
await page.screenshot({ path: out('st-hover-right'), clip })
await page.mouse.down()
await page.waitForTimeout(250)
await page.screenshot({ path: out('st-press'), clip })
await page.mouse.up()
await page.waitForTimeout(170)
await page.screenshot({ path: out('st-release'), clip })
console.log('errors:', b.errors.length ? b.errors : 'none')
await b.close()
