// Screenshots of index.html's inline boot splash — the frame a user sees before any JS has run.
//   node tools/pwa-test/boot-shot.mjs [url] [outDir]
// The app's module script is held (never answered) so only the HTML + inline CSS are in play.
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const url = process.argv[2] || 'http://localhost:5183/'
const out = process.argv[3] || join(here, '..', 'out', 'pwa')
mkdirSync(out, { recursive: true })
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const browser = await chromium.launch({ executablePath: exe })
const sizes = [['iphone', 390, 844, 3], ['lowend', 360, 640, 2], ['tablet', 820, 1180, 2]]
const errors = []
for (const [name, w, h, dpr] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: name === 'iphone' ? 6 : dpr, isMobile: w < 600, hasTouch: w < 600, colorScheme: 'dark', serviceWorkers: 'block' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  await page.clock.install()
  await page.route(/\/src\/main\.jsx|\/assets\/index-.*\.js/, () => { /* hold forever */ })
  await page.goto(url, { waitUntil: 'commit' })
  await page.waitForSelector('#boot')
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, `boot-${name}.png`) })
  if (name === 'iphone') {
    await page.screenshot({ path: join(out, 'boot-mark-zoom.png'), clip: { x: 145, y: 340, width: 100, height: 130 }, scale: 'device' })
    await page.clock.fastForward(9500)
    await page.waitForTimeout(200)
    await page.screenshot({ path: join(out, `boot-stalled-${name}.png`) })
  }
  await ctx.close()
}
console.log(errors.length ? 'ERRORS ' + errors.join('\n') : 'no page errors', '->', out)
await browser.close()
