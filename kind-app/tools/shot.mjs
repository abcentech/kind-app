// Quick one-off screenshot:  node tools/shot.mjs <name> [--url U] [--device iphone|se|pixel|lowend|tablet|desktop]
//   [--light] [--now 2026-08-12] [--fresh] [--full] [--click "text=Start"] [--wait 800]
import { open } from './browser.mjs'
const a = process.argv.slice(2)
const name = a[0] && !a[0].startsWith('--') ? a[0] : 'shot'
const get = (f, d) => { const i = a.indexOf(f); return i > -1 ? a[i + 1] : d }
const has = (f) => a.includes(f)
const b = await open({
  url: get('--url', 'http://localhost:5190/'), device: get('--device', 'iphone'), dark: !has('--light'),
  now: get('--now'), state: has('--fresh') ? null : undefined, reduceMotion: has('--reduce'),
})
for (const c of a.flatMap((x, i) => (x === '--click' ? [a[i + 1]] : []))) { await b.page.click(c); await b.page.waitForTimeout(500) }
await b.page.waitForTimeout(Number(get('--wait', 600)))
console.log(await b.shot(name, { full: has('--full') }))
if (b.errors.length) console.log('ERRORS:\n' + b.errors.join('\n'))
await b.close()
