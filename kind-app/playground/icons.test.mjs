// Headless checks for src/icons.jsx.   node playground/icons.test.mjs        (dev server on :5183 must be running)
//   · the in-page audit: every contract name drawn, no glyph clipped / empty / off-centre / wildly heavy, every required solid is a real solid
//   · API behaviour on the specimen sheet: a11y (title → role=img, otherwise aria-hidden), aliases, unknown-name fallback, flex squash, sizes
//   · DOM hygiene: no duplicate ids across ~330 mounted glyphs (masks are id-referenced), zero console errors
// Exit code 1 on any failure. Screens land in tools/out/icons/.
import { open } from '../tools/browser.mjs'

const URL_ = process.env.ICONS_URL || 'http://localhost:5183/playground/icons.html'
let fails = 0
const check = (ok, msg, detail = '') => { console.log(`${ok ? '  ok ' : ' FAIL'}  ${msg}${!ok && detail ? '  → ' + detail : ''}`); if (!ok) fails++ }

// 1 ── audit
{
  const b = await open({ url: URL_ + '?audit=1', device: 'desktop', dpr: 1, state: null })
  await b.page.waitForFunction(() => window.__iconAudit, null, { timeout: 120000 })
  const r = await b.page.evaluate(() => window.__iconAudit)
  const bad = r.issues.filter((i) => i.sev === 'bad'), warn = r.issues.filter((i) => i.sev === 'warn')
  console.log(`audit: ${r.count} glyphs, ${r.contract} contract names`)
  check(r.count >= 96, 'at least 96 glyphs (every contract name)')
  check(bad.length === 0, 'audit: no errors', bad.map((i) => `${i.name}/${i.weight}: ${i.msg}`).join('; '))
  check(warn.length === 0, 'audit: no warnings', warn.map((i) => `${i.name}/${i.weight}: ${i.msg}`).join('; '))
  check(b.errors.length === 0, 'audit page: zero console errors', b.errors.join('; '))
  await b.close()
}

// 2 ── API + DOM hygiene on the full sheet
{
  const b = await open({ url: URL_, device: 'iphone', state: null })
  const p = b.page
  const q = (fn, arg) => p.evaluate(fn, arg)
  const titled = await q(() => { const s = document.querySelector('#ip-api svg[data-icon="flame"]'); return s && { role: s.getAttribute('role'), label: s.getAttribute('aria-label'), hidden: s.getAttribute('aria-hidden'), title: s.querySelector('title')?.textContent } })
  check(titled && titled.role === 'img' && titled.label === 'Streak: 12 days' && titled.title === 'Streak: 12 days' && !titled.hidden, 'title → role=img + aria-label + <title>, not aria-hidden', JSON.stringify(titled))
  const hidden = await q(() => { const s = document.querySelector('.ip-dock svg'); return { hidden: s.getAttribute('aria-hidden'), focusable: s.getAttribute('focusable'), role: s.getAttribute('role') } })
  check(hidden.hidden === 'true' && hidden.focusable === 'false' && !hidden.role, 'untitled glyph is aria-hidden and not focusable', JSON.stringify(hidden))
  const alias = await q(() => ({ vault: document.querySelector('#ip-api svg[data-icon="vault"]')?.innerHTML.length, locker: document.querySelector('.ip-dock svg[data-icon="locker"]')?.innerHTML.length }))
  check(alias.vault > 40, 'v6 alias "vault" resolves to a drawing (not the fallback)', JSON.stringify(alias))
  const nope = await q(() => document.querySelector('#ip-api svg[data-icon="nope"]')?.innerHTML.includes('M9.7 9.8'))
  check(nope === true, 'unknown name renders the boxed ? and does not throw')
  const sizes = await q(() => [...document.querySelectorAll('#ip-api svg')].map((s) => Math.round(s.getBoundingClientRect().width)))
  check(sizes.slice(0, 1)[0] === 32 && sizes.includes(48), 'sizes honoured (32 / 48)', sizes.join(','))
  const em = await q(() => { const s = document.querySelector('#ip-api svg[data-icon="flame"][width="1.5em"]'); return s && Math.round(s.getBoundingClientRect().width) })
  check(em > 8, 'size="1.5em" (string) renders', String(em))
  const squash = await q(() => { const w = document.querySelector('#ip-api > span'); return [...w.querySelectorAll('svg')].map((s) => Math.round(s.getBoundingClientRect().width)) })
  check(squash.every((x) => x === 32), 'three 32 px glyphs in a 64 px flex box do not squash', squash.join(','))
  const dupes = await q(() => { const m = {}; document.querySelectorAll('[id]').forEach((e) => { m[e.id] = (m[e.id] || 0) + 1 }); return Object.entries(m).filter(([, n]) => n > 1).map(([k]) => k) })
  const total = await q(() => document.querySelectorAll('svg.k-icon').length)
  check(dupes.length === 0, `no duplicate ids across ${total} mounted glyphs`, dupes.slice(0, 5).join(','))
  const overflow = await q(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check(overflow <= 0, 'no horizontal page scroll at 390 px', String(overflow))
  check(b.errors.length === 0, 'sheet: zero console errors', b.errors.join('; '))
  await b.close()
}

// 3 ── 360 px phone: the tab-bar specimen must fit
{
  const b = await open({ url: URL_, device: 'lowend', state: null })
  const o = await b.page.evaluate(() => ({ page: document.documentElement.scrollWidth - document.documentElement.clientWidth, dock: [...document.querySelectorAll('.ip-tab')].filter((t) => t.scrollWidth > t.clientWidth + 1).length }))
  check(o.page <= 0, 'no horizontal page scroll at 360 px', String(o.page))
  check(o.dock === 0, 'tab labels fit their tabs at 360 px', String(o.dock))
  check(b.errors.length === 0, '360: zero console errors', b.errors.join('; '))
  await b.close()
}

console.log(fails ? `\n${fails} check(s) failed` : '\nall icon checks passed')
process.exit(fails ? 1 : 0)
