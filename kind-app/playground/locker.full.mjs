import { open } from '../tools/browser.mjs'
const b = await open({ url: `http://localhost:5183/playground/locker.html?seed=full&seg=patches&now=2026-08-12`, device: 'iphone', dpr: 2, state: null })
await b.page.waitForTimeout(800)
await b.page.evaluate(() => document.querySelector('.shell-screen').scrollTo(0, 330))
console.log(await b.shot('locker-full-patches'), b.errors)
await b.close()
