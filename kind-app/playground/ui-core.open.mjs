// Same contract as tools/browser.mjs `open()`, plus one thing: the Vite HMR socket is neutralised before the page boots.
// ~15 agents edit shared modules (icons, fx, sound) while the dev server runs; every edit re-executes the playground
// mid-test, detaches the element under the cursor and double-mounts React. A test bench must hold still.
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { DEVICES, OUT } from '../tools/browser.mjs'

const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
]

export async function open({
  url = 'http://localhost:5183/playground/ui-core.html', device = 'iphone', w, h, dpr, dark = true,
  state = null, reduceMotion = false, args = [], hmr = false,
} = {}) {
  const d = DEVICES[device] || DEVICES.iphone
  const browser = await chromium.launch({ executablePath: CHROMES.find(existsSync), headless: true, args: ['--hide-scrollbars', ...args] })
  const ctx = await browser.newContext({
    viewport: { width: w || d.w, height: h || d.h },
    deviceScaleFactor: dpr || d.dpr, isMobile: d.mobile, hasTouch: d.mobile,
    colorScheme: dark ? 'dark' : 'light', reducedMotion: reduceMotion ? 'reduce' : 'no-preference',
    serviceWorkers: 'block',
  })
  if (!hmr) {
    await ctx.addInitScript(() => {
      const WS = window.WebSocket
      window.WebSocket = function (u, p) {
        if (p === 'vite-hmr' || (Array.isArray(p) && p.includes('vite-hmr'))) {
          return { readyState: 3, close() {}, send() {}, addEventListener() {}, removeEventListener() {} }
        }
        return new WS(u, p)
      }
      window.WebSocket.prototype = WS.prototype
      Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 })
    })
  }
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts && document.fonts.ready)
  const shot = async (name, opts = {}) => {
    const file = isAbsolute(name) ? name : join(OUT, name.endsWith('.png') ? name : name + '.png')
    mkdirSync(dirname(file), { recursive: true })
    await page.waitForTimeout(opts.settle ?? 350)
    await page.screenshot({ path: resolve(file), fullPage: !!opts.full })
    return resolve(file)
  }
  return { browser, ctx, page, errors, shot, close: () => browser.close() }
}
