// KIND brand build — every icon, social card, splash and store asset, generated from code.
//
//   node scripts/make-icons.mjs            regenerate everything (deterministic)
//   node scripts/make-icons.mjs --check    regenerate in memory, fail if any file on disk differs
//   node scripts/make-icons.mjs --dev      also write review sheets to store/_work/out
//
// No npm installs, no fonts at render time: the wordmark is Barlow Condensed (OFL) converted to outlines with
// opentype.js; colours are read from src/styles/tokens.css so the brand can never drift from the app.
import sharp from 'sharp'
import opentype from 'opentype.js'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const PUB = join(ROOT, 'public')
const STORE = join(ROOT, 'store')
const ARGS = process.argv.slice(2)
const CHECK = ARGS.includes('--check')
const DEV = ARGS.includes('--dev')
const ONLY = (ARGS.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean)
const want = (k) => !ONLY.length || ONLY.includes(k)

// ───────────────────────────────────────────────────────────────────────────
// 0 · tokens → palette
// ───────────────────────────────────────────────────────────────────────────
const tokenCss = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8')
const TOK = {}
for (const m of tokenCss.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) TOK[m[1]] = m[2].toLowerCase()
const need = (k) => { if (!TOK[k]) throw new Error(`token --${k} not found in tokens.css`); return TOK[k] }
const P = {
  void: need('void'), c0: need('carbon-0'), c1: need('carbon-1'), c2: need('carbon-2'), c3: need('carbon-3'), c4: need('carbon-4'),
  ink: need('ink'), ink2: need('ink-2'), ink3: need('ink-3'), ink4: need('ink-4'), onIgnite: need('ink-on-ignite'),
  i1: need('ignite-1'), i2: need('ignite-2'), i3: need('ignite-3'),
  tele: need('tele'), tele2: need('tele-2'),
  g1: need('gold-1'), g2: need('gold-2'), g3: need('gold-3'),
  t1: need('ti-1'), t2: need('ti-2'), t3: need('ti-3'), t4: need('ti-4'),
}
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)) }
const rgba = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})` }
// titanium ramp: brightness 0..1 → metal (tokens only)
const metal = (b) => {
  const stops = [[0, P.t4], [0.34, P.t3], [0.68, P.t2], [1, P.t1]]
  b = Math.max(0, Math.min(1, b))
  for (let i = 1; i < stops.length; i++) if (b <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (b - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]))
  return P.t1
}

// ───────────────────────────────────────────────────────────────────────────
// 1 · small maths
// ───────────────────────────────────────────────────────────────────────────
const f2 = (n) => (Math.round(n * 100) / 100).toString()
const rad = (d) => (d * Math.PI) / 180
const hexV = (cx, cy, R, i) => [cx + R * Math.cos(rad(-90 + 60 * i)), cy + R * Math.sin(rad(-90 + 60 * i))]
const pts = (arr) => arr.map(([x, y]) => f2(x) + ',' + f2(y)).join(' ')
const hexPoints = (cx, cy, R) => pts([0, 1, 2, 3, 4, 5].map((i) => hexV(cx, cy, R, i)))
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// ───────────────────────────────────────────────────────────────────────────
// 2 · the mark — geometry (512 space; the hexagon is centred on 256,256)
// ───────────────────────────────────────────────────────────────────────────
const HX = { cx: 256, cy: 256, R0: 200 }
// Rim, outside in (apothem widths): outer chamfer 6 · flat band 10 · inner chamfer 5.
const apo = (R) => R * Math.cos(rad(30))
const fromApo = (a) => a / Math.cos(rad(30))
const RIM = (() => {
  const a0 = apo(HX.R0)
  return { R0: HX.R0, R1: fromApo(a0 - 6), R2: fromApo(a0 - 16), R3: fromApo(a0 - 21) }
})()

// The K, drawn in its own space: stem 0..42, cap line y=0, baseline y=220; the flame rises above the cap line.
// Arm and leg both leave the stem at 58°; the arm bends up into a flame lick (the "rising trajectory").
const K_LOCAL = {
  body: 'M0 16 L16 0 L42 0 L42 82 C66 50 112 40 144 -34 C150 -4 182 42 156 76 C132 100 96 108 70 118 L134 220 L86 220 L42 156 L42 220 L0 220 Z',
  // hot core: a smaller flame inside the lick (large sizes only)
  core: 'M104 84 C126 80 148 64 144 44 C142 30 138 18 139 -2 C128 24 108 42 94 62 C90 72 94 86 104 84 Z',
  box: { x0: 0, y0: -34, x1: 170, y1: 220 },
}
const K_T = { x: 170, y: 146, s: 1.04 } // placement in the 512 space
const kAbs = (x, y) => [K_T.x + x * K_T.s, K_T.y + y * K_T.s]

