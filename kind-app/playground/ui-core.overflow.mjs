// Overflow audit at the small widths: nothing in the specimen may scroll the page sideways or poke out of its section.
import { open } from './ui-core.open.mjs'
for (const [device, w, h] of [['lowend', 360, 640], ['se', 375, 667], ['iphone', 390, 844]]) {
  const b = await open({ url: 'http://localhost:5183/playground/ui-core.html', device, w, h, state: null })
  await b.page.waitForTimeout(600)
  const r = await b.page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const bad = []
    for (const e of document.querySelectorAll('.pg *')) {
      const r = e.getBoundingClientRect()
      if (r.width && (r.right > vw + 0.5 || r.left < -0.5)) bad.push(`${e.className?.baseVal ?? e.className} ${r.left.toFixed(0)}..${r.right.toFixed(0)}`)
    }
    return { vw, sw: document.documentElement.scrollWidth, bad: [...new Set(bad)].slice(0, 20) }
  })
  console.log(device, JSON.stringify(r), 'errors:', b.errors.length ? b.errors : 'none')
  await b.close()
}
