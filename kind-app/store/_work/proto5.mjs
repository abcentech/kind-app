import sharp from 'sharp'
const OUT = 'store/_work/out'
const C = { carbon1:'#0b0d15', i1:'#ff4a0f', i2:'#ff8a1c', i3:'#ffc43d' }
const tail = 'L134 220 L86 220 L42 156 L42 220 L0 220 Z'
const head = 'M0 16 L16 0 L42 0 '
const V = {
  J1: head + `L42 90 C66 58 112 44 146 -30 C156 6 178 50 150 80 C126 102 98 108 70 118 ` + tail,
  J2: head + `L42 90 C70 60 116 40 144 -34 C150 -6 182 44 156 78 C132 100 96 108 70 118 ` + tail,
  J3: head + `L42 90 C64 62 104 52 138 -32 C146 4 176 44 152 76 C130 98 98 108 70 118 ` + tail,
  J4: head + `L42 92 C72 58 120 44 148 -32 C160 -2 168 36 156 62 C146 86 106 104 70 118 ` + tail,
}
const tiles = []; let x = 0
for (const [k, d] of Object.entries(V)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="-30 -50 250 300"><rect x="-30" y="-50" width="250" height="300" fill="${C.carbon1}"/>
  <defs><linearGradient id="ig" gradientUnits="userSpaceOnUse" x1="0" y1="220" x2="170" y2="-30"><stop offset="0" stop-color="${C.i1}"/><stop offset=".56" stop-color="${C.i2}"/><stop offset="1" stop-color="${C.i3}"/></linearGradient></defs>
  <path d="${d}" fill="url(#ig)"/></svg>`
  tiles.push({ input: await sharp(Buffer.from(svg)).png().toBuffer(), left: x, top: 0 }); x += 425
}
await sharp({ create: { width: x, height: 420, channels: 4, background: '#333' } }).composite(tiles).png().toFile(`${OUT}/sheet5.png`)
