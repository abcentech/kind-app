# KIND — identity

One page that explains the mark, the rules for using it, and how every file in `public/` and `store/` is made.
Nothing here is drawn by hand in a design tool: the whole identity is code (`scripts/make-icons.mjs`), so it is
exact, reproducible and can never drift from `src/styles/tokens.css`.

```
node scripts/make-icons.mjs            # rebuild every asset (~2.5 min, mostly the 22 iOS splash images)
node scripts/make-icons.mjs --check    # rebuild in memory, fail if any file on disk differs (CI-friendly)
node scripts/make-icons.mjs --only=icons,jsx,meta     # fast loop (~20 s); groups: icons social store splash meta jsx board
node scripts/make-icons.mjs --screenshots             # frame store/screenshots/raw/*.png into Play screenshots
```

## 1. The idea

*A spaceport with a chapel in it.* Cold, exact hardware around a warm, living Word. The mark carries both:
a **titanium hexagon bezel** (the shape of a lesson node, a patch, a badge — the app's own geometry) holding a **K whose
upper arm lifts off the stem as a rising trajectory and ends in a flame**. Hardware outside, fire inside.

| Part | Means |
|---|---|
| Hexagon, pointy-top | The app's shape: lesson nodes, patches, badges. Six facets are machined like a hex nut. |
| Titanium rim | `--ti-*` tokens, lit from above-left: outer chamfer, flat band, inner chamfer, a 1.6 px catch-light on the lit edges. |
| 60 ticks in the bezel | The instrument ring from the *Ignition* splash, set into the plate (hidden under ~56 px). |
| K stem | A vertical, chamfered at 45° (top-left) — the Lamborghini cut. Cold, exact. |
| Arm and leg | Both leave the stem at 58°; the leg is a straight blade, the arm bends upward — the *ascent*. |
| Flame lick | The arm ends in a flame with a hot core (`--gold-1` → `--ignite-3`): ignition, the streak, "now". |
| Carbon plate | Faint woven texture, radial light from above, warmed by the flame. |

The K is the **one hot element** (design rule §3): everything else in the mark is cold neutral.

## 2. Construction

Everything is drawn on a 512 grid; the hexagon is centred on 256,256.

- Hexagon circumradius **R = 200** (400 tall, 346 wide). Rim, outside → in, measured on the apothem: 6 chamfer · 10 flat band · 5 chamfer.
- K in its own space: cap height 220, stem 42 (19 %), baseline 220; flame tip rises 34 above the cap line. Placed at (170,146) at ×1.04.
  Optical centring: the bounding box is centred, then nudged right ~4 px because the heavy stem pulls the visual mass left.
- Light azimuth −105° (from above, a touch left): this decides every facet colour — `light(n) = ½ + ½cos(n − L)`.
- Maskable art scales the badge to ×0.98 so every vertex (R = 196) clears the 80 % safe circle (r = 204.8).

`playground/brand.html?only=construction` draws these guides over the live component.

## 3. Wordmark

**KIND**, Barlow Condensed 700, converted to outlines with `opentype.js` — no font loads, nothing to subset.
Spacing is *optical*, not metric: for every pair the script solves for the offset at which the **clamped mean gap between
the two outlines** equals 196 units, so straight-to-straight pairs (I·N, N·D) get exactly that and the open mouth of the K is only
partly credited (clamp 220). Result: even colour, wide aerospace tracking (≈ 0.2 em).

**Tagline:** `RAISING goDs · BUILDING NATIONS` — Barlow Condensed 600, justified to the wordmark's width (the script solves
tracking ≈ 0.27 em). The casing is the brand: **lowercase g and o, capital D, lowercase s**. "goDs" is set one step brighter than
the rest; it is the only typographic accent in the system. Never "GODS", never "Gods", never "gods".

In running text and sentence case: *Raising goDs. Building nations.*

## 4. Lockups

| Lockup | Use | Min size |
|---|---|---|
| Mark alone | App icon, favicon, avatar, HUD, empty states | 16 px (favicon art) · 24 px in-app |
| Mark + KIND, row | Headers, share cards, the Me screen | mark 40 px |
| Mark + KIND + tagline, stack | Onboarding hero, About, store art | mark ≥ 200 px (the tagline is ~9 % of the wordmark's cap height) |
| KIND wordmark alone | Where the badge is already present (splash under the badge) | cap height 12 px |

`<Mark/>`, `<Wordmark/>`, `<Lockup/>` in `src/art/Brand.jsx`. **Clear space:** 25 % of the mark's height on all sides.

## 5. Colour

Read from `src/styles/tokens.css` at build time — if a token disappears the build fails. Hex copies are embedded in the SVG
because a logo is not themeable.

| Role | Tokens | Hex |
|---|---|---|
| Plate / tile | `--carbon-0 … --carbon-4` | `#06070d` `#0b0d15` `#11141f` `#181c2a` `#232839` |
| Bezel | `--ti-1 … --ti-4` | `#eef1f8` `#aeb5c6` `#6a7186` `#343a4c` |
| The K | `--ignite-1 → -2 → -3` (bottom-left → top-right) | `#ff4a0f` `#ff8a1c` `#ffc43d` |
| Flame core | `--ignite-3 → --gold-1` | `#ffc43d` `#fbe6a8` |
| Type on dark | `--ink`, `--ink-2` | `#f4f6fb` `#aab2c6` |
| Atmosphere (social art only) | `--tele`, `--tele-2` | `#63d8ff` `#2b8fc2` |

Shades of titanium on the facets are interpolations along the `--ti-*` ramp (the build verifies each one sits on it).
Pure `#fff` / `#000` appear only as light/shade overlays at ≤ 85 % opacity.

## 6. Don'ts

- Don't recolour the K (no blue K, no white K on dark except the mono silhouette). Don't put the ignite gradient on text.
- Don't stretch, rotate, outline, add a drop shadow other than the one the art already carries, or put the mark on a busy photo.
- Don't use the K without its hexagon at sizes where the hexagon is possible; don't use the hexagon without the K.
- Don't write the tagline in all caps ("GODS"), title case ("Raising Gods") or with the D lowercase.
- Don't pair the mark with a second hot colour. One saturated element per screen.
- Don't redraw it by hand. Change the script; regenerate.

## 7. File inventory

All generated by `scripts/make-icons.mjs`, deterministically (same input → byte-identical output).

| File | What | Notes |
|---|---|---|
| `public/icon.svg` | Master vector, 512 grid, rounded tile | ~9 KB |
| `public/icon-192.png` · `icon-512.png` | `purpose: any` | transparent corners (iOS-style squircle, r = 115) |
| `public/icon-maskable-512.png` | `purpose: maskable` | full-bleed carbon; content inside the 80 % circle — verified pixel-wise |
| `public/icon-monochrome-512.png` | `purpose: monochrome` (Android 13 themed icons) | white on transparent; inside the 61 % themed safe zone — verified |
| `public/apple-touch-icon.png` | 180 × 180, opaque | iOS rounds it itself |
| `public/favicon.ico` | 16 / 32 / 48, PNG frames | |
| `public/favicon.svg` · `favicon-32.png` | Dedicated small-size art | not scaled-down from the badge: bolder K, plain rim |
| `public/og.png` | 1200 × 630 | ≈ 300 KB (WhatsApp/Telegram previews choke above ~600 KB) |
| `public/og-twitter.png` | 1200 × 600 (`summary_large_image`) | |
| `public/splash/apple-splash-WxH.png` | 22 iOS startup images, portrait, exact device pixels | 128-colour palette + grain (no banding, ~200–400 KB each) |
| `store/icon-512.png` | Play hi-res icon, full-bleed square | Google applies the mask |
| `store/feature-graphic-1024x500.png` | Play feature graphic | key content in the centre 70 % |
| `store/splash-links.html` | the 22 `<link rel="apple-touch-startup-image">` tags | for the pwa agent |
| `store/head-tags.html` | icons, theme-color, Open Graph / Twitter meta | `SITE` placeholder |
| `store/manifest-icons.json` | manifest `icons` + `background_color` / `theme_color` (`#06070d`) | |
| `store/LISTING.md` | Play listing copy + screenshot shot-list | |
| `src/art/Brand.jsx` | React components; the block between `@generated` markers is written by the script | ≈ 4.4 KB gz |

## 8. Using the mark in the app

```jsx
import { Mark, Wordmark, Lockup, MARK_GEOMETRY } from './art/Brand.jsx'   // also re-exported from src/art
<Mark size={48} />                       // lite (no ticks/bevels) under 56 px, automatically
<Mark size={160} glow />                 // ember glow — an SVG filter, only paid for when asked
<Mark variant="k" size={96} />           // the K alone, for a Hex that already draws its own bezel
<Mark variant="mono" size={20} />        // currentColor silhouette
<Wordmark size={24} tone="metal" />      // size = cap height in px
<Lockup size={240} />                    // size = mark height; layout="row", tagline={false}
```

Parts carry stable class names for motion — `.brand-mark__rim · __plate · __ticks · __k · __flame · __glow` — and
`MARK_GEOMETRY` gives the choreography coordinates as fractions of the mark's box (`flameTip`: where the *Ignition* ember
pops; `hex.circumradius` / `innerRadius`: for tick rings and orbit paths). Every `<Mark>` on a page gets its own gradient
and filter ids, so any number can coexist.

## 9. What was verified (and how)

The build prints a checklist; `--check` makes any failure a non-zero exit.

- every PNG is exactly the size its name says (22 splash sizes included)
- any-purpose icons have transparent corners and an opaque centre; maskable, apple-touch and store icons are fully opaque
- **maskable safe zone**: pixel diff against a bare tile — no content outside the 80 % circle
- **monochrome**: every visible pixel is white; none outside the 61 % themed-icon zone
- `favicon.ico` holds 16/32/48 frames and each decodes
- size budgets: OG ≤ 450 KB, `icon.svg` ≤ 12 KB, favicon.svg ≤ 2 KB, splash total ≤ 9 MB
- `Brand.jsx`: every colour traces to `tokens.css`; parses as JSX; no `NaN`/`undefined`
- determinism: a second render of `icon-512.png` and `favicon.ico` is byte-identical

## 10. Credits

- **Barlow Condensed** — Jeremy Tribby, SIL Open Font License 1.1 (via `@fontsource/barlow-condensed`). Converted to outlines; the font file is not shipped.
- Starfield, planetary limb and city lights are generated procedurally (seeded PRNG). No photographs, no stock.
- `sharp` (libvips + librsvg) and `opentype.js` do the rasterising and outlining. Nothing paid, nothing remote.
