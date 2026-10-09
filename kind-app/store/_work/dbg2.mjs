import opentype from 'opentype.js'
import { readFileSync } from 'node:fs'
const b = readFileSync('node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff')
const f = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
for (const ch of 'RAISING goDs·BUL') { const d = f.charToGlyph(ch).getPath(0, 0, 96).toPathData(2); const bad = /[HVhvlmcqzsatSAT]/.test(d); console.log(ch, bad ? 'HAS-OTHER:' + d.match(/[HVhvlmcqzsatSAT]/g).join('') : 'ok', d.length) }
