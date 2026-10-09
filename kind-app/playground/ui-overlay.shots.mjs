// node playground/ui-overlay.shots.mjs [tag]   — baseline pixels at 390x844 and 360x640, every overlay opened.
import { open } from '../tools/browser.mjs'
const tag = process.argv[2] || 'a'
const LITE = process.env.LITE === '1'
const URL = 'http://localhost:5183/playground/ui-overlay.html' + (LITE ? '?fx=lite' : '')
const DEVICES = (process.env.DEVICES || 'iphone,lowend').split(',')
for (const device of DEVICES) {
  const b = await open({ url: URL, device, state: null })
  const { page } = b
  await page.waitForTimeout(900)
  const dir = `ui-overlay/v2/${tag}${LITE ? '-lite' : ''}-${device}`
  await b.shot(`${dir}-00-full`, { full: true, settle: 800 })
  for (const sec of ['s1', 's2', 's3', 's4', 's5', 's6']) {
    await page.evaluate((id) => document.getElementById(id).scrollIntoView(), sec)
    await b.shot(`${dir}-${sec}`, { settle: 1400 })
  }
  console.log(device, 'errors:', b.errors.length ? b.errors : 'none')
  await b.close()
}
