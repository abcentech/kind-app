// A warm Chromium for screenshots. Launching a browser per shot is ruinous when the machine is shared with a dozen
// other builders; this keeps one alive and takes shots on request.
//   node playground/art-scenes.daemon.mjs            (leave running)
//   curl "http://127.0.0.1:5391/shot?name=art-scenes/x&device=iphone&clip=0,0,390,844&fx=lite&batch=a|0,0,10,10;b|.sel"
// Query: name · url · device · w · h · dpr · fx · reduce=1 · now · wait · clip · sel · full=1 · eval (run before) · ret (expression returned in JSON, after) · batch
import http from 'node:http'
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '..', 'tools', 'out')
const DEVICES = {
  iphone: { w: 390, h: 844, dpr: 3, mobile: true }, se: { w: 375, h: 667, dpr: 2, mobile: true }, pixel: { w: 412, h: 915, dpr: 2.625, mobile: true },
  lowend: { w: 360, h: 640, dpr: 2, mobile: true }, tablet: { w: 820, h: 1180, dpr: 2, mobile: true }, desktop: { w: 1440, h: 900, dpr: 1, mobile: false },
}
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--hide-scrollbars'] })

async function shot(q) {
  const d = DEVICES[q.device || 'iphone'] || DEVICES.iphone
  const ctx = await browser.newContext({
    viewport: { width: Number(q.w || d.w), height: Number(q.h || d.h) }, deviceScaleFactor: Number(q.dpr || d.dpr),
    isMobile: d.mobile, hasTouch: d.mobile, colorScheme: 'dark', reducedMotion: q.reduce ? 'reduce' : 'no-preference', serviceWorkers: 'block',
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })
  let url = q.url || 'http://localhost:5183/playground/art-scenes.html'
  if (q.now) url += (url.includes('?') ? '&' : '?') + 'now=' + q.now
  await page.goto(url, { waitUntil: 'load', timeout: 120000 })
  await page.evaluate(() => Promise.race([document.fonts ? document.fonts.ready : 0, new Promise((r) => setTimeout(r, 6000))]))
  if (q.fx) await page.evaluate((v) => { document.documentElement.dataset.fx = v }, q.fx)
  if (q.eval) await page.evaluate(q.eval)
  await page.waitForTimeout(Number(q.wait || 700))
  const files = []
  const shoot = async (nm, spec) => {
    const file = join(OUT, nm.endsWith('.png') ? nm : nm + '.png')
    mkdirSync(dirname(file), { recursive: true })
    if (spec && /^\d/.test(spec)) {
      const [x, y, w, h] = spec.split(',').map(Number)
      await page.screenshot({ path: file, clip: { x, y, width: w, height: h } })
    } else if (spec && spec !== 'full') {
      const el = page.locator(spec).first()
      await el.scrollIntoViewIfNeeded()
      await page.waitForTimeout(150)
      await el.screenshot({ path: file })
    } else await page.screenshot({ path: file, fullPage: spec === 'full' || !!q.full })
    files.push(file)
  }
  if (q.batch) for (const it of q.batch.split(';')) { const [n, s] = it.split('|'); await shoot(n, s) }
  else await shoot(q.name || 'art-scenes/probe', q.clip || q.sel)
  let ret
  if (q.ret) ret = await page.evaluate(q.ret)
  await ctx.close()
  return { files, errors, ret }
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x')
  if (u.pathname === '/quit') { res.end('bye'); await browser.close(); process.exit(0) }
  const q = Object.fromEntries(u.searchParams)
  const t = Date.now()
  try { const r = await shot(q); res.end(JSON.stringify({ ...r, ms: Date.now() - t }, null, 1) + '\n') }
  catch (e) { res.statusCode = 500; res.end('ERR ' + e.message + '\n') }
}).listen(5391, '127.0.0.1', () => console.log('art-scenes shot daemon on :5391'))
