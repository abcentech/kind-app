// Shared headless-browser helper for visual QA — real pixels, not DOM guesses.
//   import { open } from './browser.mjs'
//   const b = await open({ url, w: 390, h: 844, dpr: 2, dark: true, now: '2026-08-12', state: {...} })
//   await b.page.click('text=Start'); await b.shot('learn'); await b.close()
// Shots land in tools/out/<name>.png unless `name` is an absolute path.
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const OUT = join(here, 'out')
const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
]
export const DEVICES = {
  iphone:  { w: 390, h: 844, dpr: 3, mobile: true },   // iPhone 14/15
  se:      { w: 375, h: 667, dpr: 2, mobile: true },   // smallest we support
  pixel:   { w: 412, h: 915, dpr: 2.625, mobile: true },
  lowend:  { w: 360, h: 640, dpr: 2, mobile: true },   // common Android in Nigeria
  tablet:  { w: 820, h: 1180, dpr: 2, mobile: true },
  desktop: { w: 1440, h: 900, dpr: 1, mobile: false },
}

/**
 * state: object written to localStorage['kind-app-v4'] before the app boots, e.g.
 *   { onboarded: true, name: 'Ada', role: 'teen' }
 * Pass `state: null` to boot as a first-time user.
 */
export async function open({
  url = 'http://localhost:5190/', device = 'iphone', w, h, dpr, dark = true,
  now, state = { onboarded: true, name: 'Ada', role: 'teen' }, reduceMotion = false,
  storeKey = 'kind-app-v4', headless = true, args = [],
} = {}) {
  const d = DEVICES[device] || DEVICES.iphone
  const exe = CHROMES.find(existsSync)
  const browser = await chromium.launch({ executablePath: exe, headless, args: ['--hide-scrollbars', ...args] })
  const ctx = await browser.newContext({
    viewport: { width: w || d.w, height: h || d.h },
    deviceScaleFactor: dpr || d.dpr, isMobile: d.mobile, hasTouch: d.mobile,
    colorScheme: dark ? 'dark' : 'light', reducedMotion: reduceMotion ? 'reduce' : 'no-preference',
    serviceWorkers: 'block',
  })
  if (state) await ctx.addInitScript(([k, s]) => {
    if (!localStorage.getItem(k + ':seeded')) { localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem(k + ':seeded', '1') }
  }, [storeKey, state])
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })
  const u = new URL(url); if (now) u.searchParams.set('now', now)
  await page.goto(u.toString(), { waitUntil: 'load' })
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
