import { open } from '../../tools/browser.mjs'
const b = await open({ url: 'http://localhost:5183/playground/brand.html?only=marks', device: 'desktop', state: null })
b.page.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 300)))
await b.page.reload({ waitUntil: 'networkidle' })
await b.page.waitForTimeout(1500)
console.log('root len', await b.page.evaluate(() => document.getElementById('root').innerHTML.length))
console.log('errors', b.errors)
await b.close()
