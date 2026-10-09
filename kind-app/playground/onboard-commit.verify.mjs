// Drives the onboard-commit specimen and prints measurements. Shots land in tools/out/onboard-commit/.
//   node playground/onboard-commit.verify.mjs [goal|reminder|lite]      MOCK=0 uses the real Beat instead of the stand-in
import { open } from '../tools/browser.mjs'

const BASE = 'http://localhost:5183/playground/onboard-commit.html'
const which = process.argv[2] || 'goal'
const mock = process.env.MOCK === '0' ? '' : '&mock=1'
const out = (k, v) => console.log(k.padEnd(28), typeof v === 'string' ? v : JSON.stringify(v))

async function goal(device, shot) {
  const b = await open({ url: `${BASE}?beat=goal${mock}`, device, dpr: 2 })
  const p = b.page
  await p.waitForSelector('.onc-opt')
  await p.waitForTimeout(1600) // entry + gauge sweep
  out(`[${device}] viewport`, await p.evaluate(() => [innerWidth, innerHeight, document.documentElement.scrollWidth]))
  out(`[${device}] plates`, await p.evaluate(() => [...document.querySelectorAll('.onc-opt')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height), Math.round(r.width)] })))
  out(`[${device}] effect/cta`, await p.evaluate(() => { const g = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)] }; return { effect: g('.onc-effect'), cta: g('.pgb-foot .k-btn') } }))
  out(`[${device}] checked`, await p.evaluate(() => [...document.querySelectorAll('.onc-opt__in')].map((i) => `${i.value}:${i.checked}`)))
  if (shot) await b.shot(`onboard-commit/goal-${device}`)
  if (device === 'lowend') {
    await p.focus('.onc-opt__in:checked')
    await p.keyboard.press('ArrowDown')
    await p.waitForTimeout(150)
    out('after ArrowDown', await p.evaluate(() => [window.__onc.changes, document.querySelector('.onc-opt[data-on] .onc-plate__name').textContent, document.querySelector('.onc-effect__val').textContent]))
    await p.click('.onc-opt:nth-child(1)') // pointer pick: Casual
    await p.waitForTimeout(700)
    out('after click Casual', await p.evaluate(() => [window.__onc.changes, document.querySelector('.onc-effect__val').textContent, document.querySelector('[role=status]').textContent]))
    out('radio names', await p.evaluate(() => { const i = document.querySelector('.onc-opt__in'); return [document.getElementById(i.getAttribute('aria-labelledby')).textContent, document.getElementById(i.getAttribute('aria-describedby')).textContent] }))
    await p.click('.pgb-foot .k-btn')
    out('next()', await p.evaluate(() => window.__onc.nexts))
    out('tap targets <48', await p.evaluate(() => [...document.querySelectorAll('.onc-opt, .pgb-foot .k-btn')].filter((e) => e.getBoundingClientRect().height < 48).length))
  }
  out(`[${device}] errors`, b.errors)
  await b.close()
}

async function reminder(device, shot) {
  const b = await open({ url: `${BASE}?beat=reminder${mock}`, device, dpr: 2 })
  const p = b.page
  await p.waitForSelector('.onc-clock')
  await p.waitForTimeout(900)
  const digits = () => p.evaluate(() => document.querySelector('.onc-clock__digits').textContent)
  out(`[${device}] viewport`, await p.evaluate(() => [innerWidth, innerHeight, document.documentElement.scrollWidth]))
  out(`[${device}] digits / sub`, await p.evaluate(() => [document.querySelector('.onc-clock__digits').textContent, document.querySelector('.onc-clock__sub').textContent, document.querySelector('.onc-clock__digits').getBoundingClientRect().width | 0]))
  out(`[${device}] layout`, await p.evaluate(() => {
    const g = (s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && [Math.round(r.top), Math.round(r.bottom)] }
    const body = document.querySelector('.pgb-body') || document.querySelector('.onb-body')
    return { clock: g('.onc-clock'), presets: g('.onc-presets'), slider: g('.k-slider'), why: g('.onc-why'), foot: g('.pgb-foot') || g('.onb-foot'), scrollH: body.scrollHeight, clientH: body.clientHeight }
  }))
  if (shot) await b.shot(`onboard-commit/reminder-${device}`)
  await p.focus('[role=slider]')
  for (const [key, exp] of [['ArrowRight', '20:15'], ['ArrowLeft', '20:00'], ['Home', '05:00'], ['End', '23:00'], ['PageDown', null]]) {
    await p.keyboard.press(key)
    await p.waitForTimeout(120)
    out(`key ${key}`, [await digits(), exp ? (await digits()) === exp : '-', await p.evaluate(() => { const s = document.querySelector('[role=slider]'); return [s.getAttribute('aria-valuenow'), s.getAttribute('aria-valuetext')] })])
  }
  await p.click('.onc-presets .k-chip:nth-child(1)')
  await p.waitForTimeout(200)
  out('preset Before school', [await digits(), await p.evaluate(() => [...document.querySelectorAll('.onc-presets .k-chip')].map((c) => c.getAttribute('aria-pressed')))])
  await p.evaluate(() => { const o = URL.createObjectURL.bind(URL); URL.createObjectURL = (bl) => { window.__blob = bl; return o(bl) } })
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.pgb-foot .k-btn:not([data-v=ghost]), .onb-foot .k-btn:not([data-v=ghost])')])
  out('download name', dl.suggestedFilename())
  const text = await p.evaluate(async () => window.__blob.text())
  const lines = text.split('\r\n')
  out('ics', { type: await p.evaluate(() => window.__blob.type), bytes: text.length, VEVENT: text.includes('BEGIN:VEVENT'), RRULE: text.includes('RRULE:FREQ=DAILY'), crlfOnly: text.includes('\r\n') && !/[^\r]\n/.test(text), endsCRLF: text.endsWith('\r\n'), dtstart: lines.find((l) => l.startsWith('DTSTART')), alarm: text.includes('BEGIN:VALARM'), summary: lines.find((l) => l.startsWith('SUMMARY')), longestOctets: Math.max(...lines.map((l) => new TextEncoder().encode(l).length)) })
  out('ics description', lines.filter((l) => l.startsWith('DESCRIPTION') || l.startsWith(' ')).join('|').slice(0, 420))
  await p.waitForTimeout(700)
  out('after add', await p.evaluate(() => ({ changes: window.__onc.changes.slice(-1), prefs: JSON.parse(localStorage.getItem('kind-prefs') || '{}').reminder, toast: document.querySelector('.k-toast')?.textContent?.slice(0, 80), status: document.querySelector('[role=status]')?.textContent, buttons: [...document.querySelectorAll('.pgb-foot .k-btn, .onb-foot .k-btn')].map((x) => x.textContent) })))
  if (shot) await b.shot(`onboard-commit/reminder-added-${device}`)
  await p.focus('[role=slider]')
  await p.keyboard.press('ArrowRight')
  await p.waitForTimeout(200)
  out('moved after add', await p.evaluate(() => ({ last: window.__onc.changes.slice(-1), buttons: [...document.querySelectorAll('.pgb-foot .k-btn, .onb-foot .k-btn')].map((x) => x.textContent) })))
  await p.click('.pgb-foot .k-btn[data-v=ghost], .onb-foot .k-btn[data-v=ghost]')
  out('skip -> next()', await p.evaluate(() => window.__onc.nexts))
  out(`[${device}] errors`, b.errors)
  await b.close()
}

async function lite() {
  const b = await open({ url: `${BASE}?beat=goal&fx=lite${mock}`, device: 'lowend', dpr: 2 })
  await b.page.waitForSelector('.onc-opt')
  await b.page.waitForTimeout(500)
  out('lite anim', await b.page.evaluate(() => { const c = getComputedStyle(document.querySelector('.onc-opt')); return [document.documentElement.dataset.fx, c.animationDuration, c.transitionDuration] }))
  out('lite errors', b.errors)
  await b.close()
  const r = await open({ url: `${BASE}?beat=reminder&fx=lite${mock}`, device: 'lowend', dpr: 2, reduceMotion: true })
  await r.page.waitForSelector('.onc-colon')
  await r.page.waitForTimeout(300)
  out('lite colon', await r.page.evaluate(() => { const c = getComputedStyle(document.querySelector('.onc-colon')); return [c.animationDuration, c.animationIterationCount] }))
  out('lite rem errors', r.errors)
  await r.close()
}

// The real <Onboard>: Goal -> Reminder -> Launch, on the short phone. Measures fit, then proves next()/onChange reach the Launch summary.
async function flow(add, shot) {
  const b = await open({ url: `${BASE}?flow=1&beat=goal`, device: 'lowend', dpr: 2 })
  const p = b.page
  const fit = () => p.evaluate(() => {
    const L = [...document.querySelectorAll('.onb-layer')].pop()
    const body = L.querySelector('.onb-body'), foot = L.querySelector('.onb-foot')
    const last = [...L.querySelectorAll('.onc-effect, .onc-scale, .onc-presets')].pop()
    const r = (e) => e && [Math.round(e.getBoundingClientRect().top), Math.round(e.getBoundingClientRect().bottom)]
    return { body: [body.clientHeight, body.scrollHeight], foot: r(foot), lastDecisionEl: last?.className, last: r(last), title: L.querySelector('.onb-title')?.textContent, blurbShown: getComputedStyle(L.querySelector('.onc-plate__blurb') || document.body).display }
  })
  await p.waitForSelector('.onc-opt')
  await p.waitForTimeout(1400)
  out('flow goal fit', await fit())
  await p.click('.onb-layer:last-child .onb-foot .k-btn')
  await p.waitForSelector('.onc-clock')
  await p.waitForTimeout(1200)
  out('flow reminder fit', await fit())
  if (shot) await b.shot('onboard-commit/flow-reminder-lowend')
  if (add) {
    await Promise.all([p.waitForEvent('download'), p.click('.onb-layer:last-child .onb-foot .k-btn:not([data-v=ghost])')])
    await p.waitForTimeout(500)
    await p.click('.onb-layer:last-child .onb-foot .k-btn:not([data-v=ghost])') // Continue
  } else {
    await p.click('.onb-layer:last-child .onb-foot .k-btn[data-v=ghost]') // Skip
  }
  await p.waitForSelector('.onb-check__row', { timeout: 8000, state: 'attached' }).catch(async () => out('launch missing', await p.evaluate(() => [...document.querySelectorAll('.onb-layer')].map((l) => l.innerText.slice(0, 160)))))
  await p.waitForTimeout(900)
  out(add ? 'launch summary (added)' : 'launch summary (skipped)', await p.evaluate(() => [...document.querySelectorAll('.onb-layer:last-child .onb-check__row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim())))
  if (add) {
    await p.click('.onb-layer:last-child .onb-top__side button')   // Back from Launch
    await p.waitForSelector('.onc-clock')
    await p.waitForTimeout(1100)
    out('back -> reminder', await p.evaluate(() => ({ buttons: [...document.querySelectorAll('.onb-layer:last-child .onb-foot .k-btn')].map((x) => x.textContent), digits: document.querySelector('.onc-clock__digits').textContent })))
  }
  out('flow errors', b.errors)
  await b.close()
}

// tall phone, keyboard focus ring, lite + reduced motion, and the "parent passed nothing" defaults
async function extra() {
  let b = await open({ url: `${BASE}?flow=1&beat=goal`, device: 'iphone', dpr: 2 })
  let p = b.page
  await p.waitForSelector('.onc-opt')
  await p.waitForTimeout(1600)
  out('iphone goal', await p.evaluate(() => { const L = [...document.querySelectorAll('.onb-layer')].pop(); const body = L.querySelector('.onb-body'); return { body: [body.clientHeight, body.scrollHeight], blurb: getComputedStyle(L.querySelector('.onc-plate__blurb')).display, plates: [...L.querySelectorAll('.onc-opt')].map((e) => Math.round(e.getBoundingClientRect().height)) } }))
  await p.keyboard.press('Tab')
  out('Tab -> focus', await p.evaluate(() => { const a = document.activeElement; const w = a.closest('.onc-opt'); return { el: a.className, wrapperFilter: w && getComputedStyle(w).filter.slice(0, 140), ownOutline: getComputedStyle(a).outlineStyle, vis: a.matches(':focus-visible') } }))
  await p.keyboard.press('ArrowUp')
  await p.waitForTimeout(300)
  out('ArrowUp -> checked', await p.evaluate(() => [...document.querySelectorAll('.onc-opt__in')].map((i) => `${i.value}:${i.checked}`)))
  out('iphone errors', b.errors)
  await b.close()

  b = await open({ url: `${BASE}?flow=1&beat=goal&fx=lite`, device: 'lowend', dpr: 2, reduceMotion: true })
  p = b.page
  await p.waitForSelector('.onc-opt')
  await p.waitForTimeout(500)
  out('lite goal', await p.evaluate(() => { const o = getComputedStyle(document.querySelector('.onc-opt')); return { fx: document.documentElement.dataset.fx, anim: o.animationDuration, needles: [...document.querySelectorAll('.k-gauge-needle')].map((n) => n.style.transform), body: (() => { const x = [...document.querySelectorAll('.onb-layer')].pop().querySelector('.onb-body'); return [x.clientHeight, x.scrollHeight] })() } }))
  out('lite errors', b.errors)
  await b.close()

  for (const beat of ['goal', 'reminder']) {
    b = await open({ url: `${BASE}?beat=${beat}&empty=1&mock=1`, device: 'lowend', dpr: 2 })
    p = b.page
    await p.waitForTimeout(900)
    out(`empty ${beat}`, await p.evaluate(() => window.__onc.changes))
    await b.close()
  }
}

const devices = process.argv[3] ? [process.argv[3]] : ['lowend', 'iphone']
if (which === 'extra') { await extra(); process.exit(0) }
if (which === 'flow') { await flow(process.argv[3] === 'add', process.argv[4] === 'shot'); process.exit(0) }
if (which === 'goal') { for (const d of devices) await goal(d, true) }
else if (which === 'reminder') { for (const d of devices) await reminder(d, true) }
else if (which === 'lite') await lite()
