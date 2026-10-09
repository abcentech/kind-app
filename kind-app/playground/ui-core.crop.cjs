// usage: node tools/_crop.cjs in.png out.png left top width height [scale]
const sharp = require('sharp')
const [inp, out, l, t, w, h, s] = process.argv.slice(2)
;(async () => {
  const m = await sharp(inp).metadata()
  console.log('src', m.width, m.height)
  let p = sharp(inp).extract({ left: +l, top: +t, width: Math.min(+w, m.width - +l), height: Math.min(+h, m.height - +t) })
  if (s) p = p.resize({ width: Math.round(Math.min(+w, m.width - +l) * +s), kernel: 'nearest' })
  await p.toFile(out)
})()
