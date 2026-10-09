// Focus-ring close-ups: node playground/foundation.focus.mjs [tag]
// Focuses each part of the "Focus follows the shape" lab with the keyboard and shoots the card, so the ring can be judged by eye.
import { open } from '../tools/browser.mjs'

const tag = process.argv[2] || 'f'
const b = await open({ url: 'http://localhost:5183/playground/foundation.html', device: 'iphone', state: null })
const { page } = b
await page.addStyleTag({ content: 'vite-error-overlay { display: none !important } .pf-nav { display: none !important }' })
await page.waitForTimeout(1200)
const cards = await page.$$('.pf-focuslab')
const names = ['chamfer', 'hex', 'field', 'round', 'fallback']
const out = []
for (let i = 0; i < cards.length; i++) {
  await cards[i].scrollIntoViewIfNeeded()
  await cards[i].$eval('button, input', (el) => el.focus({ focusVisible: true }))
  await page.waitForTimeout(250)
  const box = await cards[i].boundingBox()
  const file = `${process.cwd()}/tools/out/foundation/${tag}-focus-${names[i] || i}.png`
  await page.screenshot({ path: file, clip: { x: box.x - 6, y: box.y - 6, width: box.width + 12, height: box.height + 12 } })
  out.push(file)
}
console.log(out.join('\n'))
console.log(b.errors.length ? 'ERRORS ' + b.errors.join(' | ') : 'no console errors')
await b.close()
