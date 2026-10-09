// ───────────────────────────────────────────────────────────────────────────
// 5 · scenes — starfield + the Earth's limb at dawn (drawn, never photographed)
// ───────────────────────────────────────────────────────────────────────────
// Stars thicken toward the top of the frame ("the sky darkens and stars thicken as you climb").
function starfield({ w, h, seed = 7, density = 1, horizon = h, bright = 7, band = null }) {
  const rnd = mulberry32(seed)
  const n = Math.round(((w * h) / 2600) * density)
  const buckets = {}
  const add = (col, a, r, x, y) => { const k = col + '|' + a.toFixed(2); (buckets[k] ||= []).push(`<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}"/>`) }
  const tints = [[P.ink2, 0.74], [P.tele, 0.14], [P.i3, 0.08], [P.t1, 0.04]]
  const tint = () => { const t = rnd(); let a = 0; for (const [c, p] of tints) { a += p; if (t <= a) return c } return P.ink2 }
  for (let i = 0; i < n; i++) {
    const y = horizon * Math.pow(rnd(), 1.75)
    const x = rnd() * w
    const r = 0.32 + Math.pow(rnd(), 7) * 1.5
    const a = Math.round((0.18 + 0.82 * Math.pow(rnd(), 1.4)) * 8) / 8
    add(tint(), a * (0.45 + 0.55 * (1 - y / horizon)), r * (w > 900 ? 1 : 0.9), x, y)
  }
  // a faint galactic band: denser tiny stars along a diagonal, plus a haze
  let bandSvg = ''
  if (band) {
    const { cx, cy, rot, len, thick } = band
    const m = Math.round(n * 0.5)
    for (let i = 0; i < m; i++) {
      const t = (rnd() - 0.5) * len, s = (rnd() + rnd() + rnd() - 1.5) * thick
      const x = cx + t * Math.cos(rad(rot)) - s * Math.sin(rad(rot)), y = cy + t * Math.sin(rad(rot)) + s * Math.cos(rad(rot))
      if (x < 0 || x > w || y < 0 || y > horizon) continue
      add(rnd() < 0.2 ? P.tele : P.ink2, 0.2 + 0.4 * rnd(), 0.3 + rnd() * 0.45, x, y)
    }
    bandSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${f2(len * 0.55)}" ry="${f2(thick * 1.5)}" transform="rotate(${rot} ${cx} ${cy})" fill="url(#sf-haze-${seed})"/>`
  }
  const groups = Object.entries(buckets).map(([k, v]) => { const [c, a] = k.split('|'); return `<g fill="${c}" fill-opacity="${a}">${v.join('')}</g>` }).join('')
  // a few hero stars: soft bloom + hairline diffraction cross
  const heroes = []
  for (let i = 0; i < bright; i++) {
    const x = w * (0.06 + 0.88 * rnd()), y = horizon * 0.72 * Math.pow(rnd(), 1.3), r = 1.1 + rnd() * 0.9, c = tint(), L = 10 + rnd() * 12
    heroes.push(`<g><circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r * 5)}" fill="${c}" fill-opacity=".10"/><circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}" fill="${P.t1}"/><path d="M${f2(x - L)} ${f2(y)}H${f2(x + L)}M${f2(x)} ${f2(y - L)}V${f2(y + L)}" stroke="${c}" stroke-opacity=".38" stroke-width=".6"/></g>`)
  }
  return {
    defs: band ? `<radialGradient id="sf-haze-${seed}"><stop offset="0" stop-color="${P.tele2}" stop-opacity=".085"/><stop offset=".6" stop-color="${P.tele2}" stop-opacity=".03"/><stop offset="1" stop-color="${P.tele2}" stop-opacity="0"/></radialGradient>` : '',
    body: bandSvg + groups + heroes.join(''),
  }
}

// Earth's limb: a huge dark disc whose top edge crosses the frame; dawn breaks at sunX.
function limb({ id = 'lm', w, h, top, r, sunX, cx = w / 2, glow = 1, lights = true, seed = 11 }) {
  const cy = top + r
  const yAt = (x) => cy - Math.sqrt(Math.max(0, r * r - (x - cx) * (x - cx)))
  const sy = yAt(sunX)
  const sf = sunX / w
  const u = (k) => `${id}-${k}`
  const fy = Math.max(0, top - h * 0.3)
  const arc = `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}"`
  const defs = `
    <linearGradient id="${u('atm')}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${w}" y2="0">
      <stop offset="0" stop-color="${P.tele2}" stop-opacity="0"/>
      <stop offset="${f2(Math.max(0.05, sf - 0.5))}" stop-color="${P.tele2}" stop-opacity=".5"/>
      <stop offset="${f2(sf - 0.2)}" stop-color="${P.tele}" stop-opacity=".78"/>
      <stop offset="${f2(sf - 0.05)}" stop-color="${P.t1}" stop-opacity=".98"/>
      <stop offset="${f2(sf)}" stop-color="#fff"/>
      <stop offset="${f2(sf + 0.06)}" stop-color="${P.t1}" stop-opacity=".95"/>
      <stop offset="${f2(Math.min(0.98, sf + 0.28))}" stop-color="${P.tele}" stop-opacity=".6"/>
      <stop offset="1" stop-color="${P.tele2}" stop-opacity=".12"/>
    </linearGradient>
    <linearGradient id="${u('warm')}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${w}" y2="0">
      <stop offset="0" stop-color="${P.i1}" stop-opacity="0"/>
      <stop offset="${f2(Math.max(0.01, sf - 0.3))}" stop-color="${P.i1}" stop-opacity="0"/>
      <stop offset="${f2(sf - 0.07)}" stop-color="${P.i1}" stop-opacity=".55"/>
      <stop offset="${f2(sf)}" stop-color="${P.i2}" stop-opacity=".95"/>
      <stop offset="${f2(sf + 0.07)}" stop-color="${P.i1}" stop-opacity=".5"/>
      <stop offset="${f2(Math.min(0.99, sf + 0.3))}" stop-color="${P.i1}" stop-opacity="0"/>
      <stop offset="1" stop-color="${P.i1}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${u('disc')}" gradientUnits="userSpaceOnUse" x1="0" y1="${f2(top)}" x2="0" y2="${f2(top + Math.max(h * 0.5, 200))}">
      <stop offset="0" stop-color="${mix(P.c1, P.tele2, 0.07)}"/><stop offset=".12" stop-color="${P.c0}"/><stop offset="1" stop-color="${P.void}"/>
    </linearGradient>
    <radialGradient id="${u('dawn')}" gradientUnits="userSpaceOnUse" cx="${f2(sunX)}" cy="${f2(sy)}" r="${f2(w * 0.42)}" gradientTransform="translate(${f2(sunX)} ${f2(sy)}) scale(1 .5) translate(${-f2(sunX)} ${-f2(sy)})">
      <stop offset="0" stop-color="${P.i2}" stop-opacity="${f2(0.5 * glow)}"/><stop offset=".25" stop-color="${P.i1}" stop-opacity="${f2(0.2 * glow)}"/><stop offset=".6" stop-color="${P.tele2}" stop-opacity="${f2(0.05 * glow)}"/><stop offset="1" stop-color="${P.tele2}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${u('sun')}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".18" stop-color="${P.i3}" stop-opacity=".85"/><stop offset=".5" stop-color="${P.i2}" stop-opacity=".25"/><stop offset="1" stop-color="${P.i1}" stop-opacity="0"/></radialGradient>
    <filter id="${u('b4')}" filterUnits="userSpaceOnUse" x="0" y="${f2(fy)}" width="${w}" height="${f2(h - fy)}"><feGaussianBlur stdDeviation="${f2(w / 300)}"/></filter>
    <filter id="${u('b12')}" filterUnits="userSpaceOnUse" x="0" y="${f2(fy)}" width="${w}" height="${f2(h - fy)}"><feGaussianBlur stdDeviation="${f2(w / 100)}"/></filter>
    <filter id="${u('b30')}" filterUnits="userSpaceOnUse" x="0" y="${f2(fy)}" width="${w}" height="${f2(h - fy)}"><feGaussianBlur stdDeviation="${f2(w / 38)}"/></filter>
    <clipPath id="${u('clip')}"><rect x="0" y="0" width="${w}" height="${h}"/></clipPath>`
  // city lights hugging the limb (compressed vertically by the grazing view)
  let dots = ''
  if (lights) {
    const rnd = mulberry32(seed)
    const clusters = [[0.14, 70], [0.27, 46], [0.42, 90], [0.58, 56], [0.72, 80], [0.88, 62]]
    const out = []
    for (const [fx, n] of clusters) {
      for (let i = 0; i < n; i++) {
        const x = w * fx + (rnd() + rnd() + rnd() - 1.5) * w * 0.07
        const y = yAt(x) + 4 - Math.log(1 - rnd() * 0.97) * h * 0.02
        if (y > h) continue
        const a = (0.25 + 0.65 * rnd()) * Math.max(0.2, 1 - (y - yAt(x)) / (h * 0.12))
        out.push(`<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(0.5 + rnd() * 0.8)}" fill="${rnd() < 0.3 ? P.i3 : P.i2}" fill-opacity="${f2(a)}"/>`)
      }
    }
    dots = out.join('')
  }
  const body = `
    <g clip-path="url(#${u('clip')})">
      <g filter="url(#${u('b30')})" opacity="${f2(0.55 * glow)}">${arc} fill="none" stroke="url(#${u('atm')})" stroke-width="${f2(w * 0.03)}" transform="translate(0 ${f2(-w * 0.012)})"/></g>
      <rect x="0" y="0" width="${w}" height="${h}" fill="url(#${u('dawn')})"/>
      ${arc} fill="url(#${u('disc')})"/>
      <g filter="url(#${u('b12')})" opacity="${f2(0.7 * glow)}">${arc} fill="none" stroke="url(#${u('warm')})" stroke-width="${f2(w * 0.02)}"/></g>
      <g filter="url(#${u('b4')})" opacity=".7">${arc} fill="none" stroke="url(#${u('atm')})" stroke-width="${f2(w * 0.006)}"/></g>
      ${arc} fill="none" stroke="url(#${u('atm')})" stroke-width="${f2(Math.max(1.4, w * 0.0018))}"/>
      <g filter="url(#${u('b12')})" opacity=".30"><circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r - w * 0.012)}" fill="none" stroke="${P.tele2}" stroke-width="${f2(w * 0.012)}"/></g>
      ${dots}
      <circle cx="${f2(sunX)}" cy="${f2(sy)}" r="${f2(w * 0.05 * glow)}" fill="url(#${u('sun')})"/>
      <circle cx="${f2(sunX)}" cy="${f2(sy)}" r="${f2(Math.max(1.4, w * 0.0018))}" fill="#fff"/>
    </g>`
  return { defs, body, yAt, sy }
}

// fine deterministic grain (dithers the dark gradients so they never band)
let _grain
async function grainTile(size = 256, amp = 10) {
  if (_grain) return _grain
  const rnd = mulberry32(90210), px = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) { const v = 128 + Math.round((rnd() + rnd() - 1) * amp); px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v; px[i * 4 + 3] = 255 }
  return (_grain = await sharp(px, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer())
}
