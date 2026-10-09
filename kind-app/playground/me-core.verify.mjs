// me-core verification: structure via evaluate, then a few cropped shots. node playground/me-core.verify.mjs
import { open } from '../tools/browser.mjs'
const U = 'http://localhost:5183/playground/me-core.html'

const probe = () => {
  const $ = (s) => document.querySelector(s)
  const scroller = $('.shell-screen')
  const over = [...document.querySelectorAll('.me *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed').map((e) => e.className || e.tagName).slice(0, 6)
  const small = [...document.querySelectorAll('.me button, .me a, .me input')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.height < 44) }).map((e) => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height)).slice(0, 8)
  return {
    secs: [...document.querySelectorAll('.me > *')].map((e) => e.className.split(' ')[0] + (e.getAttribute('aria-labelledby') || '')),
    name: $('.me-pilot__name')?.textContent, rank: $('.me-pilot__rankname')?.textContent, role: $('.me-pilot__role')?.textContent,
    gauges: [...document.querySelectorAll('.me-inst .k-gauge-val')].map((e) => e.textContent),
    missions: [...document.querySelectorAll('.me-mission')].map((e) => e.innerText.replace(/\n+/g, ' | ')),
    kids: [...document.querySelectorAll('.me-kids li')].map((e) => e.textContent),
    links: [...document.querySelectorAll('.k-row[href]')].map((e) => e.getAttribute('href')),
    version: [...document.querySelectorAll('.k-row')].find((r) => /Version/.test(r.textContent))?.textContent,
    docW: document.documentElement.scrollWidth, scrollH: scroller?.scrollHeight, over, small,
    dev: !!$('.me-dev'),
  }
}

for (const [seed, dev] of (process.argv[2] ? [process.argv[2].split(':')] : [['new', 'lowend'], ['parent', 'iphone'], ['adv', 'lowend']])) {
  const b = await open({ url: `${U}?seed=${seed}`, device: dev, dpr: 2, state: null })
  await b.page.waitForSelector('.me-pilot', { timeout: 15000 })
  await b.page.waitForTimeout(1400)
  console.log(seed, dev, JSON.stringify(await b.page.evaluate(probe)))
  if (seed === 'parent') {
    await b.page.locator('.me-pilot').screenshot({ path: 'tools/out/me-core/parent-pilot.png' }).catch(() => {})
  }
  console.log('errors', b.errors)
  await b.close()
}
