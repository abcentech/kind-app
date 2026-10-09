// The dev server after a config change: index.html boots (and #boot leaves by itself), a playground page still loads.
import { open } from '../browser.mjs'
const b = await open({ url: 'http://localhost:5183/', device: 'iphone', state: null })
await b.page.waitForTimeout(1200)
const r = await b.page.evaluate(() => ({ boot: !!document.getElementById('boot'), root: document.getElementById('root').children.length, display: document.documentElement.dataset.display, build: document.querySelector('meta[name=kind-build]').content, sw: navigator.serviceWorker.controller ? 'controlled' : 'none' }))
console.log('index', JSON.stringify(r), 'errors:', b.errors)
await b.shot('pwa/dev-index')
await b.close()
const p = await open({ url: 'http://localhost:5183/playground/ui-core.html', device: 'iphone' })
console.log('playground ui-core errors:', p.errors.length ? p.errors : 'none')
await p.close()
