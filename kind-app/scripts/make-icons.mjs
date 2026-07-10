// Rasterize public/icon.svg into the PNG sizes PWA installs and app stores need.
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pub = join(here, '..', 'public')
const svg = readFileSync(join(pub, 'icon.svg'))

const jobs = [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [512, 'icon-maskable-512.png', true],
]
for (const [size, name, maskable] of jobs) {
  let img = sharp(svg, { density: 300 }).resize(maskable ? Math.round(size * 0.78) : size, maskable ? Math.round(size * 0.78) : size)
  if (maskable) {
    // pad to full size on the night background so the safe zone survives circular masks
    img = sharp({ create: { width: size, height: size, channels: 4, background: '#131c36' } })
      .composite([{ input: await img.png().toBuffer(), gravity: 'center' }])
  }
  await img.png().toFile(join(pub, name))
  console.log('icons:', name)
}
