# Play screenshots

`raw/NN-slug.png` — the real app, captured with `tools/browser.mjs` (`device: 'iphone'`, `now: '2026-08-12'`; see `../LISTING.md`).
`captions.json` — the headline for each shot (≤ 4 words).
`play/` — framed output, 1080×1920 (phone) or 1600×2560 (tablet), written by `node scripts/make-icons.mjs --screenshots`.

Nothing in `raw/` ships; it is the source. Retake a shot whenever its screen changes.
