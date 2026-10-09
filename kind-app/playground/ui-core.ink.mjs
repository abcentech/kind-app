import sharp from 'sharp'
const [file, x0, x1, thr, mode] = [process.argv[2], +process.argv[3], +process.argv[4], +(process.argv[5]||70), process.argv[6]||'dark']
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, C = info.channels
let top = H, bot = 0, faceTop = H, faceBot = 0
for (let y = 0; y < H; y++) {
  let hit = 0
  for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * C
    const l = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2]
    if (mode === 'dark' ? l < thr : l > thr) hit++
  }
  if (hit > 2) { top = Math.min(top, y); bot = Math.max(bot, y) }
}
console.log({ W, H, inkTop: top, inkBot: bot, inkCenter: (top + bot) / 2 })
