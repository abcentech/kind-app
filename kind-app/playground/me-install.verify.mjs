// node playground/me-install.verify.mjs  — routes, a11y facts, overflow, console errors. Shots -> tools/out/me-install-*.png
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync } from 'node:fs'
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const BASE = 'http://localhost:5183/playground/me-install.html'
const UA = {
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.153 Mobile/15E148 Safari/604.1',
  iosWhatsapp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/24.10',
  android: 'Mozilla/5.0 (Linux; Android 13; Tecno KI5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  androidFb: 'Mozilla/5.0 (Linux; Android 13; Tecno KI5; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0]',
}
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--hide-scrollbars'] })
mkdirSync('tools/out', { recursive: true })
const out = []
const only = process.argv[2]

async function run(name, { ua, w = 360, h = 640, qs = '', dpr = 2, shot, act, lite } = {}) {
  if (only && only !== name) return
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, colorScheme: 'dark', serviceWorkers: 'block', ...(ua ? { userAgent: UA[ua] } : {}) })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()) })
  await page.goto(BASE + '?' + qs + (lite ? '&fx=lite' : ''), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts && document.fonts.ready)
  await page.waitForTimeout(700)
  const info = await page.evaluate(() => ({
    cardTitle: document.querySelector('.mei-card__title')?.textContent || null,
    cardCta: document.querySelector('.mei-card__actions .k-btn')?.textContent || null,
    prompt: document.querySelector('.mei-prompt__title')?.textContent || null,
    promptBtn: document.querySelector('.mei-prompt .k-btn')?.textContent || null,
    fold: !!document.querySelector('.mei-fold'),
    hasMei: document.querySelectorAll('.mei-card, .mei-prompt, .mei-fold').length,
    overflowX: document.documentElement.scrollWidth > innerWidth,
  }))
  let extra = {}
  if (act) extra = (await act(page)) || {}
  if (shot) await page.screenshot({ path: `tools/out/me-install-${shot}.png` })
  out.push({ name, ...info, ...extra, errs })
  await ctx.close()
}

const sheetFacts = (page) => page.evaluate(() => {
  const s = document.querySelector('.mei-sheet') || document.querySelector('[role=dialog]')
  const r = s?.getBoundingClientRect()
  const art = document.querySelector('.mei-art')?.getBoundingClientRect()
  return { sheet: !!s, sheetBottom: r && Math.round(r.bottom), vh: innerHeight, artW: art && Math.round(art.width), artH: art && Math.round(art.height), head: document.querySelector('.mei-head')?.textContent, text: document.querySelector('.mei-text')?.textContent, count: document.querySelector('.mei-count')?.textContent, footBtns: [...document.querySelectorAll('.mei-foot .k-btn')].map((b) => b.textContent.trim() || b.getAttribute('aria-label')), labelled: s?.getAttribute('aria-labelledby') ? true : s?.getAttribute('aria-label') }
})

await run('android-shot', { ua: 'android', qs: 'mode=android&show=card', shot: 'android-card' })
await run('android', { ua: 'android', qs: 'mode=android&show=card',
  act: async (p) => { await p.click('.mei-card__actions .k-btn'); await p.waitForTimeout(300); return { prompted: await p.evaluate(() => window.__prompted || 0), afterInstallCardGone: await p.evaluate(() => document.querySelectorAll('.mei-card').length) } } })
await run('android-prompt', { ua: 'android', qs: 'mode=android&show=prompt', shot: 'prompt-360',
  act: async (p) => ({ promptH: await p.evaluate(() => Math.round(document.querySelector('.mei-prompt').getBoundingClientRect().height)), markShown: await p.evaluate(() => getComputedStyle(document.querySelector('.mei-prompt__mark')).display),
    dismiss: await (async () => { await p.click('.mei-prompt .k-iconbtn'); await p.waitForTimeout(250); return p.evaluate(() => ({ gone: !document.querySelector('.mei-prompt'), stamp: JSON.parse(localStorage.getItem('kind-prefs')).installDismissed > 0 })) })() }) })
await run('android-manual (no event)', { ua: 'android', qs: 'show=card', shot: 'android-manual' })
await run('desktop-none', { qs: 'show=card' , ua: undefined })
await run('ios', { ua: 'ios', qs: 'show=card', shot: 'ios-card',
  act: async (p) => {
    await p.click('.mei-card__actions .k-btn'); await p.waitForTimeout(900)
    const f0 = await sheetFacts(p)
    await p.screenshot({ path: 'tools/out/me-install-ios-step1.png' })
    await p.click('.mei-foot .k-btn[data-full]'); await p.waitForTimeout(500)
    const f1 = await sheetFacts(p)
    await p.screenshot({ path: 'tools/out/me-install-ios-step2.png' })
    await p.click('.mei-foot .k-btn[data-full]'); await p.waitForTimeout(500)
    const f2 = await sheetFacts(p)
    await p.screenshot({ path: 'tools/out/me-install-ios-step3.png' })
    await p.click('.mei-foot .k-btn[data-full]'); await p.waitForTimeout(700)
    return { f0, f1, f2, closed: await p.evaluate(() => !document.querySelector('.mei-sheet')) }
  } })
await run('ios-chrome', { ua: 'iosChrome', qs: 'show=card&sheet=ios&show2=x', act: async (p) => { await p.click('text=Open guide').catch(() => {}); return { note: await p.evaluate(() => document.querySelector('.mei-note')?.textContent) } } })
await run('ios-whatsapp', { ua: 'iosWhatsapp', qs: 'show=card', shot: 'inapp-card',
  act: async (p) => { await p.click('.mei-card__actions .k-btn'); await p.waitForTimeout(900); await p.screenshot({ path: 'tools/out/me-install-inapp-sheet.png' }); return { steps: await p.evaluate(() => [...document.querySelectorAll('.mei-steps__t')].map((x) => x.textContent)) } } })
await run('android-fb', { ua: 'androidFb', qs: 'show=card' })
await run('standalone', { ua: 'ios', qs: 'mode=standalone' })
await run('dismissed-ios', { ua: 'ios', qs: 'show=card&dismissed=1', shot: 'folded' })
await run('ios-lite-390', { ua: 'ios', w: 390, h: 844, qs: 'show=card', lite: true,
  act: async (p) => { await p.click('.mei-card__actions .k-btn'); await p.waitForTimeout(500); return { f: await sheetFacts(p) } } })
await run('gu', { qs: 'show=gu', ua: 'android', shot: 'gu',
  act: async (p) => {
    await p.click('text=Parent sign in').catch(() => {})
    await p.waitForTimeout(200)
    const email = await p.evaluate(() => !!document.querySelector('input[type=email]'))
    return { email, demoText: await p.evaluate(() => document.querySelector('.mei-gu--demo .mei-gu__dek')?.textContent.slice(0, 40)) }
  } })
await run('child', { qs: 'show=child', ua: 'android', shot: 'family',
  act: async (p) => {
    await p.click('.mei-gu__head'); await p.waitForTimeout(500)
    await p.screenshot({ path: 'tools/out/me-install-family-open.png' })
    return { expanded: await p.evaluate(() => document.querySelector('.mei-gu__head').getAttribute('aria-expanded')), notes: await p.evaluate(() => document.querySelectorAll('.mei-gu__note').length), strip: await p.evaluate(() => document.querySelector('.mei-gu__strip').getAttribute('aria-label')), overflow: await p.evaluate(() => document.querySelector('.shell-screen').scrollWidth > document.querySelector('.shell-screen').clientWidth) }
  } })
await browser.close()
console.log(JSON.stringify(out, null, 1))
