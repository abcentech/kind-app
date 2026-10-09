// Plays the answer-plate flow for real (pick → check → verdict) and shoots each beat.   node playground/ui-core.plates.mjs [right|wrong]
import { open } from './ui-core.open.mjs'
import { join } from 'node:path'
const wrong = process.argv[2] === 'wrong'
const b = await open({ url: 'http://localhost:5183/playground/ui-core.html', device: 'iphone', w: 390, h: 844, dpr: 3, state: null })
const { page } = b
await page.waitForTimeout(500)
const sec = page.locator('#sec-situ .pg-stack').nth(1)
await sec.evaluate((e) => e.scrollIntoView({ block: 'center' }))
await page.waitForTimeout(300)
const out = (n) => join(import.meta.dirname, '..', 'tools', 'out', 'ui-core', `${n}.png`)
const shot = async (n) => { const bb = await sec.boundingBox(); await page.screenshot({ path: out(n), clip: { x: 0, y: Math.max(0, bb.y - 8), width: 390, height: Math.min(844 - Math.max(0, bb.y - 8), bb.height + 16) } }) }
await shot('pl-0-rest')
await sec.locator('.k-panel').nth(wrong ? 2 : 0).tap()
await page.waitForTimeout(400)
await shot('pl-1-picked')
await sec.locator('.k-btn').first().tap()
await page.waitForTimeout(700)
await shot('pl-2-verdict')
console.log('errors:', b.errors.length ? b.errors : 'none')
await b.close()
