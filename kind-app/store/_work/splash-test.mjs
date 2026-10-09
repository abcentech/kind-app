import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'
// take the raw svg render from the dev: re-create by calling the script's functions is hard; use existing png as the "source" and requantise
const src = readFileSync('public/splash/apple-splash-1170x2532.png')
const raw = await sharp(src).raw().toBuffer({ resolveWithObject: true })
const rgb = sharp(raw.data, { raw: raw.info })
for (const [n, o] of Object.entries({
  p256d1: { palette: true, colours: 256, dither: 1 },
  p128d1: { palette: true, colours: 128, dither: 1 },
  p64d1: { palette: true, colours: 64, dither: 1 },
  p64d5: { palette: true, colours: 64, dither: 0.5 },
  p32d1: { palette: true, colours: 32, dither: 1 },
})) {
  const b = await rgb.clone().png({ ...o, effort: 10, compressionLevel: 9 }).toBuffer()
  writeFileSync(`store/_work/out/sp-${n}.png`, b)
  console.log(n, (b.length / 1024).toFixed(0), 'KB')
}
console.log(raw.info.channels)
