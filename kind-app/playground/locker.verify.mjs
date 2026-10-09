// locker-core probe: node playground/locker.verify.mjs [seed] [seg] [device] [--lite]
import { open } from '../tools/browser.mjs'
const [seed = 'mid', seg = 'patches', device = 'lowend'] = process.argv.slice(2)
const lite = process.argv.includes('--lite')
const url = `http://localhost:5183/playground/locker.html?seed=${seed}&seg=${seg}&now=2026-08-12${lite ? '&fx=lite' : ''}`
const b = await open({ url, device, dpr: 2, state: null })
const { page } = b
await page.waitForTimeout(1200)
const info = await page.evaluate(() => {
  const r = (s) => document.querySelector(s)?.getBoundingClientRect()
  const sc = document.querySelector('.shell-screen')
  return {
    head: document.querySelector('.lck-head')?.innerText.replace(/\n/g, ' | '),
    segs: [...document.querySelectorAll('.k-seg__opt')].map((e) => e.innerText.trim() + (e.getAttribute('aria-checked') === 'true' ? '*' : '')),
    patches: document.querySelectorAll('.lck-patch').length,
    earnedPatches: document.querySelectorAll('.lck-patch[data-earned]').length,
    medals: document.querySelectorAll('.lck-medal').length,
    earnedMedals: document.querySelectorAll('.lck-medal[data-earned]').length,
    newBadges: document.querySelectorAll('.lck-new').length,
    frag: document.querySelector('.lck-frag__n')?.innerText,
    groups: [...document.querySelectorAll('.lck-group__head')].map((e) => e.innerText.replace(/\n/g, ' ')),
    firstLocked: document.querySelector('.lck-patch:not([data-earned]) .lck-patch__meta')?.innerText,
    scrollW: [document.documentElement.scrollWidth, innerWidth, sc?.scrollWidth, sc?.clientWidth],
    cell: r('.lck-medal') && [r('.lck-medal').width, r('.lck-medal').height],
    tiles: r('.lck-patch') && [r('.lck-patch').width, r('.lck-patch').height],
    seen: JSON.parse(localStorage.getItem('kind-app-v4') || '{}').achSeen?.length,
  }
})
console.log(JSON.stringify(info, null, 1))
if (process.argv.includes('--shot')) console.log(await b.shot(`locker-${seed}-${seg}-${device}${lite ? '-lite' : ''}`))
console.log('errors:', b.errors.length ? b.errors : 'none')
await b.close()
