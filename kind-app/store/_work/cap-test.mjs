import { open } from '../../tools/browser.mjs'
const b = await open({ url: 'http://localhost:5183/playground/brand.html?only=marks', device: 'iphone', state: null })
await b.page.waitForTimeout(600)
await b.shot('C:/Users/ADMIN/Documents/KIN/KIND/Monthly Devotional/kind-app/store/_work/rawtest/01-ascent.png')
const b2 = await open({ url: 'http://localhost:5183/playground/brand.html?only=lockup', device: 'iphone', state: null })
await b2.page.waitForTimeout(600)
await b2.shot('C:/Users/ADMIN/Documents/KIN/KIND/Monthly Devotional/kind-app/store/_work/rawtest/02-word.png')
await b.close(); await b2.close()
