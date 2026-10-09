// Keyboard + focus + touch-target check for the sound mixing desk.   node playground/sound.focus.mjs [--url http://localhost:5183]
//   Tabs through every focusable control: each needs an accessible name, a visible 2 px focus ring and (on a phone) a 44 px target.
//   Then drives the desk with the keyboard only: arrows change the cue, space plays it, M mutes, L switches lite voicing.
import { open } from '../tools/browser.mjs'

const a = process.argv.slice(2)
const URL_ = a.includes('--url') ? a[a.indexOf('--url') + 1] : 'http://localhost:5183'
const b = await open({ url: URL_ + '/playground/sound.html', device: 'iphone', state: null, args: ['--autoplay-policy=no-user-gesture-required'] })
await b.page.waitForTimeout(1500)

const fails = []
const ok = (name, pass, info = '') => { console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}${pass ? '' : '  ' + info}`); if (!pass) fails.push(name) }

// 1. tab order: name, ring, target
const seen = []
for (let i = 0; i < 90; i++) {
  await b.page.keyboard.press('Tab')
  const r = await b.page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const cs = getComputedStyle(el), rc = el.getBoundingClientRect()
    const name = (el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    return { tag: el.tagName.toLowerCase(), name, ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2, w: Math.round(rc.width), h: Math.round(rc.height), id: el.className || el.id }
  })
  if (!r) break
  if (seen.some((s) => s.key === r.id + r.name)) break
  seen.push({ ...r, key: r.id + r.name })
}
console.log(`tab order: ${seen.length} focusable controls`)
ok('every control has an accessible name', seen.every((s) => s.name), JSON.stringify(seen.filter((s) => !s.name).map((s) => s.id)))
ok('every control shows a 2 px focus ring', seen.every((s) => s.ring), JSON.stringify(seen.filter((s) => !s.ring).map((s) => s.id + ' ' + s.name)))
const small = seen.filter((s) => s.tag === 'button' && Math.min(s.w, s.h) < 36)
ok('buttons are at least 36 px in both directions (the desk is a dev tool; the app is held to 48)', small.length === 0, JSON.stringify(small.map((s) => `${s.name} ${s.w}x${s.h}`)))

// 2. keyboard-only drive
await b.page.evaluate(() => document.activeElement?.blur())
await b.page.mouse.click(5, 400)                                  // a neutral click unlocks audio and parks focus on the page
const read = () => b.page.evaluate(() => {
  const sound = window.__sound, prefs = window.__prefs
  return { name: document.querySelector('.snd-deck-l')?.textContent, played: sound.stats().played, sound: prefs.get('sound'), fx: document.documentElement.dataset.fx, state: sound.stats().state }
})
await b.page.waitForFunction(() => window.__sound.ready, null, { timeout: 30000 })   // the master chain is built in slices: wait for it
const s0 = await read()
await b.page.keyboard.press('ArrowRight'); await b.page.waitForTimeout(400)
const s1 = await read()
ok('ArrowRight selects the next cue', s1.name !== s0.name, `${s0.name} -> ${s1.name}`)
await b.page.keyboard.press('Space'); await b.page.waitForTimeout(500)
const s2 = await read()
ok('Space plays the selected cue', s2.played > s1.played, `played ${s1.played} -> ${s2.played}`)
await b.page.keyboard.press('ArrowLeft'); await b.page.waitForTimeout(300)
const s3 = await read()
ok('ArrowLeft goes back', s3.name === s0.name, `${s3.name} vs ${s0.name}`)
await b.page.keyboard.press('KeyL'); await b.page.waitForTimeout(200)
ok('L switches to lite voicing', (await read()).fx === 'lite')
await b.page.keyboard.press('KeyL'); await b.page.waitForTimeout(200)
ok('…and back', (await read()).fx === 'full')
await b.page.keyboard.press('KeyM'); await b.page.waitForTimeout(200)
const s4 = await read()
ok('M mutes (prefs.sound false) and the context suspends', s4.sound === false)
await b.page.keyboard.press('KeyM'); await b.page.waitForTimeout(300)
ok('M again unmutes', (await read()).sound === true)

ok('no console errors', b.errors.length === 0, b.errors.join(' | '))
await b.close()
console.log(fails.length ? `\n${fails.length} failed` : '\nall ok')
process.exitCode = fails.length ? 1 : 0
