// node playground/share-sheet.verify.mjs [fake|real]  — drives the Share Studio in headless Chrome, prints measurements.
import { open } from '../tools/browser.mjs'
const eng = process.argv[2] || 'fake'
const base = `http://localhost:5183/playground/share-sheet.html?engine=${eng}`
const out = {}

async function run(device, w, h, kind, shot) {
  const b = await open({ url: `${base}&open=${kind}`, device, w, h, dpr: 2 })
  await b.page.waitForSelector('.shr-canvas', { state: 'attached', timeout: 8000 }).catch(async (e) => { console.log('NOCANVAS', kind, w, h, b.errors, await b.page.evaluate(() => document.body.innerText.slice(0, 200))); throw e })
  await b.page.waitForTimeout(1500)
  const m = await b.page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } }
    const foot = r('.k-sheet-foot'), btns = [...document.querySelectorAll('.shr-actions button')].map((e) => { const b = e.getBoundingClientRect(); return [e.textContent.trim(), Math.round(b.width), Math.round(b.height), Math.round(b.bottom)] })
    const c = document.querySelector('.shr-canvas')
    return {
      vh: innerHeight, stage: r('.shr-stage'), frame: r('.shr-frame'), strip: r('.shr-strip'), seg: r('.k-seg'), foot, btns,
      canvas: { w: c.width, h: c.height, role: c.getAttribute('role'), label: c.getAttribute('aria-label') },
      thumbs: document.querySelectorAll('.shr-thumb img').length, tpls: document.querySelectorAll('.shr-tpl').length,
      scrollH: document.querySelector('.k-sheet-scroll')?.scrollHeight, scrollC: document.querySelector('.k-sheet-scroll')?.clientHeight,
    }
  })
  out[`${kind}@${w}x${h}`] = m
  if (shot) await b.shot(shot)
  return b
}

let b = await run('iphone', 390, 844, 'verse', 'share-verse-390')
// interaction: pick template 2 + aspect square, check debounce + re-render
await b.page.click('.shr-tpl:nth-child(2)')
await b.page.click('text=Square')
const t0 = Date.now()
await b.page.waitForFunction(() => document.querySelector('.shr-frame')?.dataset.phase === 'ready' && !document.querySelector('.shr-frame').dataset.stale)
out.reRenderMs = Date.now() - t0
out.frameSquare = await b.page.evaluate(() => { const r = document.querySelector('.shr-frame').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] })
out.checked = await b.page.evaluate(() => [...document.querySelectorAll('.shr-tpl')].map((e) => e.getAttribute('aria-checked')))
// copy caption → toast
await b.ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
await b.page.click('text=Copy caption')
await b.page.waitForTimeout(500)
out.toast = await b.page.evaluate(() => document.querySelector('[data-k-toast], .k-toast')?.textContent || document.body.innerText.match(/Caption copied/)?.[0] || null)
out.clip = await b.page.evaluate(() => navigator.clipboard.readText().catch((e) => 'ERR ' + e.message))
// save → download event
const [dl] = await Promise.all([b.page.waitForEvent('download', { timeout: 4000 }).catch(() => null), b.page.click('text=Save image')])
out.download = dl ? dl.suggestedFilename() : null
// share fallback (headless has no files share) → also downloads
const [dl2] = await Promise.all([b.page.waitForEvent('download', { timeout: 4000 }).catch(() => null), b.page.click('.shr-actions .k-btn[data-variant="primary"], .shr-actions button:first-child')])
out.shareFallback = dl2 ? dl2.suggestedFilename() : null
// keyboard on the strip
await b.page.focus('.shr-tpl[aria-checked="true"]')
await b.page.keyboard.press('ArrowRight')
out.afterArrow = await b.page.evaluate(() => [...document.querySelectorAll('.shr-tpl')].map((e) => e.getAttribute('aria-checked')))
await b.shot('share-verse-390-square')
// close
await b.page.keyboard.press('Escape')
await b.page.waitForTimeout(1200)
out.closedSheet = await b.page.evaluate(() => !!document.querySelector('.k-sheet'))
out.errors = b.errors
await b.close()

for (const k of ['card', 'streak', 'month']) { const x = await run('iphone', 390, 844, k, null); out[`errors-${k}`] = x.errors; await x.close() }
b = await run('lowend', 360, 640, 'verse', 'share-verse-360'); out.err360 = b.errors; await b.close()

console.log(JSON.stringify(out, null, 1))
