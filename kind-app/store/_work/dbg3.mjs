import opentype from 'opentype.js'
import { readFileSync } from 'node:fs'
const b = readFileSync('node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff')
const f = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
const d = f.charToGlyph('S').getPath(300.5, 0, 96).toPathData(2)
console.log(d.slice(0, 300))
const shiftPath = (d, dx, dy, dec = 2) => d.replace(/([MLQCZ])([^MLQCZ]*)/g, (m, c, rest) => {
  if (c === 'Z') return 'Z'
  const n = (rest.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || []).map(Number)
  return c + n.map((v, i) => String(Math.round((v + (i % 2 ? dy : dx)) * 10 ** dec) / 10 ** dec)).join(' ')
})
console.log(shiftPath(d, -300.5, 0, 3).slice(0, 300))
