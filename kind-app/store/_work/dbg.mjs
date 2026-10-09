import opentype from 'opentype.js'
import { readFileSync } from 'node:fs'
const b = readFileSync('node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff')
const f = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
const t = 'Raising goDs. Building nations.·'
for (const ch of t) { const g = f.charToGlyph(ch); console.log(JSON.stringify(ch), g.index, g.advanceWidth) }
console.log(f.getKerningValue(f.charToGlyph('R'), f.charToGlyph('a')), f.getKerningValue(f.charToGlyph('g'), f.charToGlyph('o')))
