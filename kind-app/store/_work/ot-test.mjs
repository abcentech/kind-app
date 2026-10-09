import opentype from 'opentype.js'
import { readFileSync } from 'node:fs'
const root = 'C:/Users/ADMIN/Documents/KIN/KIND/Monthly Devotional/kind-app/node_modules/'
const b = readFileSync(root + '@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff')
const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
const f = opentype.parse(ab)
console.log('barlow', f.unitsPerEm, f.ascender, f.descender, f.glyphs.length, f.names.fontFamily?.en, f.tables.os2?.sCapHeight, f.tables.os2?.sxHeight)
for (const ch of 'KIND') { const g = f.charToGlyph(ch); console.log(ch, g.advanceWidth, g.getBoundingBox().x1, g.getBoundingBox().x2, g.getBoundingBox().y2) }
console.log('kern KI', f.getKerningValue(f.charToGlyph('K'), f.charToGlyph('I')), f.getKerningValue(f.charToGlyph('N'), f.charToGlyph('D')))
try {
  const m = readFileSync(root + '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2')
  const mf = opentype.parse(m.buffer.slice(m.byteOffset, m.byteOffset + m.byteLength))
  console.log('jb', mf.glyphs.length)
} catch (e) { console.log('woff2 fail:', e.message) }
