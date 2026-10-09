import { open } from '../../tools/browser.mjs'
const sec = process.argv[2] || ''
const w = Number(process.argv[3] || 1100), h = Number(process.argv[4] || 900)
const b = await open({ url: 'http://localhost:5183/playground/brand.html' + (sec ? `?only=${sec}` : ''), w, h, dpr: 1, device: 'desktop', state: null })
await b.page.waitForTimeout(800)
const f = await b.shot(`brand/${sec || 'full'}`, { full: true })
console.log(f, 'errors:', b.errors)
await b.close()
