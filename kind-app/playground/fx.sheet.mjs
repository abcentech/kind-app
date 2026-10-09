// Contact sheet: node playground/fx.sheet.mjs out.png in1.png in2.png …   (tiles side by side, 420px tall)
import sharp from 'sharp'
const [out, ...ins] = process.argv.slice(2)
const H = +process.env.H || 900
const tiles = await Promise.all(ins.map(async (f) => { const b = await sharp(f).resize({ height: H }).toBuffer(); const m = await sharp(b).metadata(); return { b, w: m.width } }))
const W = tiles.reduce((a, t) => a + t.w + 6, 0)
let x = 0
await sharp({ create: { width: W, height: H, channels: 3, background: '#222' } }).composite(tiles.map((t) => { const o = { input: t.b, left: x, top: 0 }; x += t.w + 6; return o })).png().toFile(out)
console.log(out, W, H)
