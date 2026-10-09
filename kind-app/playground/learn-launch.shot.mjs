// node playground/learn-launch.shot.mjs <device> <scn> [--lite] [--dpr=2] — one clip of the bottom of the screen
// (leaner than states.mjs: domcontentloaded + selector wait, so a busy shared dev server cannot stall it)
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const DEV = { iphone: [390, 844], se: [375, 667], lowend: [360, 640], pixel: [412, 915], tablet: [820, 1180] }
const [device = 'iphone', scn = 'ready', ...flags] = process.argv.slice(2)
const lite = flags.includes('--lite')
const [w, h] = DEV[device]
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 768, hasTouch: w < 768, colorScheme: 'dark', serviceWorkers: 'block' })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto(`http://localhost:5183/playground/learn-launch.html?scn=${scn}${lite ? '&fx=lite' : ''}`, { waitUntil: 'domcontentloaded', timeout: 40000 })
await page.waitForSelector('.launch-cta', { timeout: 20000 })
await page.waitForTimeout(1100)
const top = await page.evaluate(() => Math.max(0, document.querySelector('.launch').getBoundingClientRect().top - 24))
mkdirSync('tools/out/learn-launch', { recursive: true })
const file = `tools/out/learn-launch/${device}-${scn}${lite ? '-lite' : ''}.png`
await page.screenshot({ path: file, clip: { x: 0, y: top, width: w, height: h - top } })
console.log(file, 'errors', JSON.stringify(errors))
await browser.close()
