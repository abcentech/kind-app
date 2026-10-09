// Child process for split-library.mjs: prints { seriesId: { mins: [...], steps: [...] } } (index = day - 1) from the real lib.js.
import { register } from 'node:module'
import { readFileSync } from 'node:fs'
register('data:text/javascript,' + encodeURIComponent(`
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) return { format: 'module', source: 'export default ' + readFileSync(fileURLToPath(url), 'utf8'), shortCircuit: true }
  return nextLoad(url, context)
}`), import.meta.url)
const L = await import('../src/lib.js')
const out = {}
for (const s of L.allSeries) {
  const days = s.calendar.map((d) => d.day)
  out[s.id] = { mins: days.map((n) => L.estimateMinutes(s, n)), steps: days.map((n) => L.deckFor(s, n).length) }
}
console.log(JSON.stringify(out))
