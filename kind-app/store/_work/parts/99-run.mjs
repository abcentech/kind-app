// ───────────────────────────────────────────────────────────────────────────
// 11 · run
// ───────────────────────────────────────────────────────────────────────────
const sha = (b) => createHash('sha256').update(b).digest('hex')
async function main() {
  const t0 = Date.now()
  const todo = JOBS.filter((j) => want(j.group))
  const results = new Array(todo.length)
  let next = 0
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < todo.length) {
      const i = next++
      const t = Date.now()
      results[i] = { ...todo[i], buf: await todo[i].make(), ms: Date.now() - t }
    }
  }))

  let changed = 0
  const rows = []
  for (const r of results) {
    const abs = join(ROOT, r.path)
    const had = existsSync(abs)
    const same = had && sha(readFileSync(abs)) === sha(r.buf)
    if (!same) changed++
    if (!CHECK && !same) { mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, r.buf) }
    rows.push(`${same ? '  =' : CHECK ? '  ≠' : '  ✎'} ${r.path.padEnd(54)} ${(r.buf.length / 1024).toFixed(1).padStart(8)} KB  ${String(r.ms).padStart(6)} ms`)
  }
  console.log(rows.join('\n'))

  const checks = await verify(results)
  const failed = checks.filter((c) => !c.pass)
  console.log('\n' + checks.map((c) => `${c.pass ? '  ✓' : '  ✗'} ${c.name}${c.detail ? '  — ' + c.detail : ''}`).join('\n'))
  console.log(`\n${results.length} files, ${changed} ${CHECK ? 'differ from disk' : 'written'}, ${checks.length - failed.length}/${checks.length} checks passed, ${((Date.now() - t0) / 1000).toFixed(1)} s`)

  if (DEV) await devSheets(results)
  if (failed.length || (CHECK && changed)) process.exit(1)
}

// review sheets (store/_work/out) — only with --dev
async function devSheets(results) {
  const OUT = join(STORE, '_work/out'); mkdirSync(OUT, { recursive: true })
  const get = (p) => results.find((r) => r.path === p)?.buf
  const tiles = []; let x = 0
  const icon = get('public/icon-512.png')
  if (icon) {
    tiles.push({ input: icon, left: 0, top: 0 }); x = 530
    for (const s of [192, 96, 64, 48, 32, 16]) { tiles.push({ input: await sharp(icon).resize(s).png().toBuffer(), left: x, top: 0 }); x += s + 14 }
    const fav = [16, 32, 48, 64].map((s) => sharp(Buffer.from(faviconSvg(s))).png().toBuffer())
    let fx = 530
    for (const p of await Promise.all(fav)) { const m = await sharp(p).metadata(); tiles.push({ input: p, left: fx, top: 300 }); fx += m.width + 14 }
    for (const [name, bg] of [['public/icon-maskable-512.png', null], ['public/icon-monochrome-512.png', '#555']]) {
      const b = get(name); if (!b) continue
      let img = sharp(b).resize(160); if (bg) img = img.flatten({ background: bg })
      tiles.push({ input: await img.png().toBuffer(), left: 530 + (name.includes('mono') ? 180 : 0), top: 352 })
    }
    await sharp({ create: { width: Math.max(x, 1100), height: 520, channels: 4, background: '#2a2a2a' } }).composite(tiles).png().toFile(join(OUT, 'sheet.png'))
  }
}

if (ARGS.some((a) => a.startsWith('--screenshots'))) await frameScreenshots()
else await main()
