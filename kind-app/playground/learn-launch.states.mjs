// node playground/learn-launch.states.mjs <device> <scn,scn,…|all> [--shot] [--lite]
// Walks the seeded scenarios, reads the bar's DOM (copy, CTA, --launch-h, gaps, truncation, ticking) and, with --shot,
// writes a clip of the bottom of the screen to tools/out/learn-launch/<device>-<scn>.png
import { open } from '../tools/browser.mjs'

const URL = 'http://localhost:5183/playground/learn-launch.html'
const ALL = ['ready', 'progress', 'atRisk', 'waiting', 'locked', 'archive', 'complete', 'upcoming', 'first', 'missed', 'shield', 'selah', 'catchup', 'finale', 'parent']
const args = process.argv.slice(2)
const flags = args.filter((a) => a.startsWith('--'))
const pos = args.filter((a) => !a.startsWith('--'))
const device = pos[0] || 'iphone'
const names = !pos[1] || pos[1] === 'all' ? ALL : pos[1].split(',')
const lite = flags.includes('--lite')

const b = await open({ url: `${URL}?scn=${names[0]}${lite ? '&fx=lite' : ''}`, device, dpr: 2, state: null })
const read = () => b.page.evaluate(() => {
  const $ = (s) => document.querySelector(s)
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom) } }
  const bar = $('.launch'), slab = $('.launch-slab'), cta = $('.launch-cta'), dock = $('.k-dock'), main = $('.launch-main')
  if (!bar) return { missing: true }
  const clamp = (el) => (el ? el.scrollHeight > el.clientHeight + 1 : false)
  const ro = $('.launch-readout')
  const cs = getComputedStyle(cta)
  return {
    state: bar.dataset.state, tone: bar.dataset.tone, layout: $('.launch-body')?.dataset.layout,
    region: slab.getAttribute('aria-label'),
    eyebrow: $('.launch-eyebrow')?.textContent, eyebrowCut: $('.launch-eyebrow__t') ? $('.launch-eyebrow__t').scrollWidth > $('.launch-eyebrow__t').clientWidth : false,
    meta: $('.launch-meta')?.textContent || '', title: $('.launch-title')?.textContent, titleCut: clamp($('.launch-title')),
    sub: $('.launch-sub')?.textContent, subCut: clamp($('.launch-sub')), note: $('.launch-note') && getComputedStyle($('.launch-note')).display !== 'none' ? $('.launch-note').textContent : '',
    readout: ro?.textContent || '', roW: ro ? Math.round(ro.getBoundingClientRect().width * 10) / 10 : 0,
    cta: cta.textContent, ctaAria: cta.getAttribute('aria-label'), ctaDisabled: cta.disabled, ctaV: cta.dataset.v, ctaH: Math.round(rect(cta).h), ctaW: Math.round(rect(cta).w), ctaFont: cs.fontFamily.split(',')[0],
    chip: $('.launch-chip')?.textContent || '', chipPressed: $('.launch-chip')?.getAttribute('aria-pressed'),
    launchH: document.documentElement.style.getPropertyValue('--launch-h'), barH: bar.offsetHeight,
    gapToDock: Math.round(dock.getBoundingClientRect().top - rect(main).b), slabX: [rect(slab).x, rect(slab).x + rect(slab).w], dockX: [rect(dock).x, rect(dock).x + rect(dock).w],
    barTop: rect(bar).y, vh: innerHeight, live: $('[role=status]')?.textContent?.slice(0, 60),
    hscroll: document.documentElement.scrollWidth > innerWidth,
  }
})

for (const k of names) {
  await b.page.goto(`${URL}?scn=${k}${lite ? '&fx=lite' : ''}`, { waitUntil: 'networkidle' })
  await b.page.waitForSelector('.launch-cta', { timeout: 8000 }).catch(() => {})
  await b.page.waitForTimeout(1000)
  const r = await read()
  let tick = ''
  if (r.readout) {
    await b.page.waitForTimeout(1150)
    const r2 = await read()
    tick = `${r.readout} -> ${r2.readout}  width ${r.roW} -> ${r2.roW}  ${r.readout !== r2.readout && r.roW === r2.roW ? 'OK' : 'CHECK'}`
  }
  console.log(`\n== ${k}  [${device}${lite ? ' lite' : ''}]`)
  console.log(JSON.stringify(r, null, 0))
  if (tick) console.log('tick:', tick)
  if (flags.includes('--shot')) {
    const vp = b.page.viewportSize()
    const top = Math.max(0, r.barTop - 24)
    await b.page.screenshot({ path: `tools/out/learn-launch/${device}-${k}${lite ? '-lite' : ''}.png`, clip: { x: 0, y: top, width: vp.width, height: vp.height - top } })
  }
}
console.log('\nerrors:', JSON.stringify(b.errors))
await b.close()
