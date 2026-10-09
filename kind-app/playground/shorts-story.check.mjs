// node playground/shorts-story.check.mjs  — behaviour checks via page.evaluate + 3 shots
import { open } from '../tools/browser.mjs'
const base = 'http://localhost:5183/playground/shorts-story.html'
const R = {}
const b = await open({ url: base + '?n=11', device: 'lowend', dpr: 2, now: '2026-08-12' })
const p = b.page
const st = () => p.evaluate(() => { const r = document.querySelector('.shs'); return { page: r.dataset.page, auto: r.dataset.auto, running: r.dataset.running, prog: r.dataset.progress, paused: r.dataset.paused || null } })
R.initial = await st()
await p.waitForTimeout(1200)
R.after1s = await st()
// hold = pause
const box = await p.locator('.shs__zone--next').boundingBox()
await p.mouse.move(box.x + 200, box.y + 200); await p.mouse.down(); await p.waitForTimeout(500)
R.held = await st(); const a = R.held.prog; await p.waitForTimeout(700); R.heldLater = (await st()).prog
await p.mouse.up(); await p.waitForTimeout(150); R.afterRelease = await st()
await b.shot('shs-p1', { settle: 500 })
// tap right / tap left
await p.mouse.click(box.x + 200, box.y + 200); R.tapRight = await st()
await b.shot('shs-p2', { settle: 700 })
await p.mouse.click(box.x + 200, box.y + 200); R.tap2 = await st()
await b.shot('shs-p3', { settle: 700 })
await p.mouse.click(5 + 20, box.y + 200); R.tapLeft = await st()
await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); R.keys = await st()
// fit/overflow audit on each page
R.overflow = []
for (let i = 0; i < 4; i++) {
  await p.waitForTimeout(250)
  R.overflow.push(await p.evaluate(() => {
    const f = document.querySelector('.shs__fit'), r = document.querySelector('.shs').getBoundingClientRect(), body = document.querySelector('.shs__page')
    const bb = (body || {}).getBoundingClientRect?.() || {}
    return { fs: f && getComputedStyle(f).fontSize, over: f ? f.scrollHeight - f.clientHeight : null, w: f ? f.scrollWidth - f.clientWidth : null, pageBottom: Math.round(bb.bottom), root: Math.round(r.bottom), docOver: document.documentElement.scrollWidth - innerWidth }
  }))
  await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft')
  for (let k = 0; k <= i; k++) await p.keyboard.press('ArrowRight')
}
// last page → CTA click logs openDay ; auto finish -> onDone
await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft')
for (let k = 0; k < 3; k++) await p.keyboard.press('ArrowRight')
await p.waitForTimeout(300); R.cta = await st()
await p.click('.shs__open'); R.log = await p.textContent('[data-testid=shell-log]')
await p.keyboard.press('ArrowRight'); R.done = await p.evaluate(() => window.__done)
// auto-run: time a full page
await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft')
const t0 = Date.now(); await p.waitForFunction(() => document.querySelector('.shs').dataset.page === '1', null, { timeout: 8000 }); R.hookMs = Date.now() - t0
R.errors = b.errors
console.log(JSON.stringify(R, null, 1))
await b.close()
