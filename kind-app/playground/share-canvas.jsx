// share-canvas playground — a contact sheet of every template x aspect for one kind, plus window.__share for full-size dumps.
//   ?kind=verse|card|streak|month   &v=<variant>   &nosheet=1 (skip the sheet; use window.__share from a script)
import '../src/styles/index.css'
import { renderShare, TEMPLATES, ASPECTS } from '../src/lib/shareCanvas.js'
import { getSeries } from '../src/lib.js'

const series = getSeries('stewardship-code')
const LONG = 'He that is faithful in that which is least is faithful also in much: and he that is unjust in the least is unjust also in much. If therefore ye have not been faithful in the unrighteous mammon, who will commit to your trust the true riches? And if ye have not been faithful in that which is another man’s, who shall give you that which is your own? No servant can serve two masters: for either he will hate the one, and love the other; or else he will hold to the one, and despise the other. Ye cannot serve God and mammon.'
const strip = (flames, today = 6) => 'SMTWTFS'.split('').map((label, i) => ({ label, flame: flames[i] === 1, save: flames[i] === 2 ? 'shield' : null, rest: flames[i] === 3, today: i === today }))
const rank = (index, name, pct, next) => ({ index, name, pct, xp: 900, next: { name: next } })
const NAMES = ['Ownership', 'Faithfulness', 'Mastery', 'Multiplication']
const month = (done, complete, earned, xp, rk) => ({
  seriesTitle: series.title, declaration: series.declaration, themeScripture: series.themeScripture, done, total: 31, pct: done / 31, complete,
  cards: done, rare: 2, patches: NAMES.map((name, s) => ({ stage: s, n: s + 1, earned: s < earned, name })), xp, rank: rk, lessons: done,
})
const DATA = {
  verse: {
    med: { text: 'He that is faithful in that which is least is faithful also in much.', ref: 'Luke 16:10 (KJV)', day: 12, seriesTitle: series.title },
    short: { text: 'Jesus wept.', ref: 'John 11:35 (KJV)', day: 3, seriesTitle: series.title },
    long: { text: LONG, ref: 'Luke 16:10–13 (KJV)', day: 12, seriesTitle: series.title },
  },
  card: {
    common: { no: 12, day: 12, title: 'Faithful With The Least', line: 'Small things done well are never small to God.', rare: false, stage: 1, owned: true, seriesTitle: series.title },
    rare: { no: 20, day: 20, title: 'Build It, Grow It, Send It Ahead', line: 'What you send ahead, you keep forever.', rare: true, stage: 3, owned: true, seriesTitle: series.title },
  },
  streak: {
    mid: { count: 12, best: 14, shields: 1, state: 'done', strip: strip([1, 1, 2, 1, 1, 1, 1]), rank: rank(2, 'Builder', 0.46, 'Keeper') },
    zero: { count: 0, best: 9, shields: 0, state: 'lost', strip: strip([0, 0, 0, 0, 0, 0, 0]), rank: rank(0, 'Seeker', 0.2, 'Steward') },
    big: { count: 100, best: 100, shields: 2, state: 'done', strip: strip([1, 1, 1, 1, 1, 1, 1]), rank: rank(5, 'Commander', 0.8, 'Pioneer') },
  },
  month: {
    part: month(17, false, 2, 1260, rank(2, 'Builder', 0.7, 'Keeper')),
    full: month(31, true, 4, 2810, rank(4, 'Pathfinder', 0.3, 'Commander')),
    none: month(2, false, 0, 80, rank(0, 'Seeker', 0.3, 'Steward')),
  },
}
const FIRST = { verse: 'med', card: 'common', streak: 'mid', month: 'part' }
const q = new URLSearchParams(location.search)

window.__share = {
  DATA, TEMPLATES, ASPECTS, series,
  render: (kind, template, aspect, variant) => renderShare({ kind, data: DATA[kind][variant || FIRST[kind]], template, aspect, series }),
  async dataUrl(kind, template, aspect, variant) { return (await this.render(kind, template, aspect, variant)).toDataURL('image/png') },
  async timing(kind, template, aspect, variant) { const t = performance.now(); await this.render(kind, template, aspect, variant); return Math.round(performance.now() - t) },
}

async function sheet() {
  const kind = q.get('kind') || 'verse', variant = q.get('v') || FIRST[kind]
  document.body.style.cssText = 'margin:0;background:var(--carbon-0);color:var(--ink);font:12px var(--font-mono);padding:16px'
  const root = document.getElementById('root')
  root.innerHTML = `<div style="margin-bottom:12px">${kind} · ${variant}</div>`
  const grid = document.createElement('div'); grid.style.cssText = 'display:grid;gap:14px'
  root.append(grid)
  for (const t of TEMPLATES[kind]) {
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:14px;align-items:flex-start'
    row.innerHTML = `<div style="width:70px;padding-top:4px">${t.label}</div>`
    grid.append(row)
    for (const a of ASPECTS) {
      const c = await renderShare({ kind, data: DATA[kind][variant], template: t.id, aspect: a.id, series })
      const th = document.createElement('canvas')
      th.width = 240; th.height = Math.round((a.h * 240) / 1080); th.getContext('2d').drawImage(c, 0, 0, th.width, th.height)
      th.style.cssText = 'display:block;border:1px solid var(--line-2)'
      row.append(th)
    }
  }
  window.__ready = true
}
if (!q.has('nosheet')) sheet().catch((e) => { document.body.append(String(e.stack || e)); window.__error = String(e.stack || e) })
else window.__ready = true
