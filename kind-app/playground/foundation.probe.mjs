// Quick DOM probe: node playground/foundation.probe.mjs <device> "<js expression returning JSON>"
import { open } from '../tools/browser.mjs'
const device = process.argv[2] || 'iphone'
const expr = process.argv[3] || 'document.title'
const b = await open({ url: 'http://localhost:5183/playground/foundation.html', device, state: null })
await b.page.waitForTimeout(900)
console.log(JSON.stringify(await b.page.evaluate(expr), null, 1))
if (b.errors.length) console.log('ERRORS', b.errors)
await b.close()
