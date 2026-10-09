// scratch: refine F2 at large scale, variants side by side (K only, big)
import sharp from 'sharp'
const OUT = 'store/_work/out'
const C = { carbon0:'#06070d', carbon1:'#0b0d15', i1:'#ff4a0f', i2:'#ff8a1c', i3:'#ffc43d', g1:'#fbe6a8' }
const V = {
  // F2 base
  F2: `M0 16 L16 0 L42 0 L42 88 C70 56 118 52 150 -30 C176 8 176 52 150 76 C128 96 96 104 70 118 L134 220 L86 220 L42 156 L42 220 L0 220 Z`,
  // G: tip hooks further, belly smaller, arm leaves steeper
  G1: `M0 16 L16 0 L42 0 L42 86 C66 54 112 50 142 -34 C170 2 178 46 154 74 C130 98 98 106 70 118 L134 220 L86 220 L42 156 L42 220 L0 220 Z`,
  // H: two-tongue flame: outer tongue + small inner lick
  H1: `M0 16 L16 0 L42 0 L42 86 C66 54 108 52 138 -34 C150 -6 150 12 146 30 C168 14 176 46 154 74 C130 98 98 106 70 118 L134 220 L86 220 L42 156 L42 220 L0 220 Z`,
  // I: calmer — arm as a long smooth curve, tip leaning right (trajectory) 
  I1: `M0 16 L16 0 L42 0 L42 90 C74 60 126 56 168 -26 C184 14 168 60 140 82 C118 98 96 106 70 118 L134 220 L86 220 L42 156 L42 220 L0 220 Z`,
}
const tiles = []; let x = 0
for (const [k, d] of Object.entries(V)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="-30 -50 250 300"><rect x="-30" y="-50" width="250" height="300" fill="${C.carbon1}"/>
  <defs><linearGradient id="ig" gradientUnits="userSpaceOnUse" x1="0" y1="220" x2="170" y2="-30"><stop offset="0" stop-color="${C.i1}"/><stop offset=".56" stop-color="${C.i2}"/><stop offset="1" stop-color="${C.i3}"/></linearGradient></defs>
  <path d="${d}" fill="url(#ig)"/></svg>`
  tiles.push({ input: await sharp(Buffer.from(svg)).png().toBuffer(), left: x, top: 0 }); x += 425
}
await sharp({ create: { width: x, height: 420, channels: 4, background: '#333' } }).composite(tiles).png().toFile(`${OUT}/sheet3.png`)
