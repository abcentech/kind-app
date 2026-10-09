import opentype from 'opentype.js'
import { readFileSync } from 'node:fs'
const root = 'node_modules/@fontsource/barlow-condensed/files/'
for (const w of [600, 700, 800]) {
  const b = readFileSync(root + `barlow-condensed-latin-${w}-normal.woff`)
  const f = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
  const g = f.charToGlyph('K')
  console.log(w, g.advanceWidth, JSON.stringify(g.path.commands.map(c => c.type + (c.x!==undefined? ` ${c.x},${c.y}`:''))))
}
