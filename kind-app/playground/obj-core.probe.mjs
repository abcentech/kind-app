import { open } from '../tools/browser.mjs'
const b = await open({ url: 'http://localhost:5183/playground/obj-core.html?seed=mid', device: 'lowend', state: null })
await b.page.waitForTimeout(1500)
console.log(JSON.stringify(await b.page.evaluate(() => [...document.querySelectorAll('.obj-page > *, .obj-rows, .obj-row, .obj-chest')].map((e) => [e.className, Math.round(e.getBoundingClientRect().height)]))))
console.log(JSON.stringify(await b.page.evaluate(() => { const e = document.querySelector('.shell-screen'); return [e.scrollHeight, e.clientHeight, getComputedStyle(e).overflowY] })))
await b.page.evaluate(() => { const e = document.querySelector('.obj-sec'); e.scrollIntoView({ block: 'start' }) })
await b.page.waitForTimeout(500)
await b.page.screenshot({ path: 'tools/out/obj-core/mid-360-today.png' })
await b.close()
