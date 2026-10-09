// Screenshots of the sound playground.   node tools/sound-shot.mjs <name> [--device iphone|lowend|desktop] [--scroll 900] [--cue "Launch"] [--full] [--lite] [--q "selector"]
//   shots land in tools/out/sound/<name>.png
import { open } from './browser.mjs'
const a = process.argv.slice(2)
const name = a[0] && !a[0].startsWith('--') ? a[0] : 'desk'
const get = (f, d) => { const i = a.indexOf(f); return i > -1 ? a[i + 1] : d }
const b = await open({ url: 'http://localhost:5183/playground/sound.html' + (a.includes('--lite') ? '?fx=lite' : ''), device: get('--device', 'iphone'), state: null, now: '2026-08-12', args: ['--autoplay-policy=no-user-gesture-required'], reduceMotion: a.includes('--reduce') })
await b.page.waitForTimeout(1200)
const cue = get('--cue')
if (cue) { await b.page.click(`.snd-cue:has-text("${cue}")`); await b.page.waitForTimeout(1500) }
const q = get('--q'); if (q) { await b.page.locator(q).first().scrollIntoViewIfNeeded(); await b.page.waitForTimeout(300) }
const y = get('--scroll'); if (y) { await b.page.evaluate((y) => window.scrollTo(0, +y), y); await b.page.waitForTimeout(300) }
console.log(await b.shot('sound/' + name, { full: a.includes('--full'), settle: 400 }))
const ov = await b.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
console.log('overflowX', ov.sw > ov.cw ? 'YES ' + JSON.stringify(ov) : 'no', ' errors', b.errors)
await b.close()
