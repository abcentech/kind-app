import library from './content/library.json'

export const seriesIds = library.order
export const allSeries = seriesIds.map((id) => library.series[id])
export const getSeries = (id) => library.series[id] || library.series[library.activeId]

/** The month whose journey is live right now (falls back to the newest). */
export function activeSeriesId(now = new Date()) {
  const hit = allSeries.find((s) => s.year === now.getFullYear() && s.monthNum === now.getMonth() + 1)
  return (hit || library.series[library.activeId]).id
}

/** Which day of that month's journey today is. */
export function todayNumber(s, now = new Date()) {
  if (now.getFullYear() === s.year && now.getMonth() + 1 === s.monthNum) return now.getDate()
  return s.calendar.length // a finished month opens on its last day
}
export const isLive = (s, now = new Date()) =>
  now.getFullYear() === s.year && now.getMonth() + 1 === s.monthNum

export const dayInfo = (s, n) => s.calendar[Math.min(Math.max(1, n), s.calendar.length) - 1]
export const epOf = (s, d) => (d.episode ? s.episodes[d.episode] : d.type === 'intro' ? s.intro : null)
export const weekOf = (s, d) => (d && d.week != null ? s.weeks[d.week] : null)
export const shortFor = (s, d) => (d.episode ? s.shorts.find((x) => x.n === d.episode) || null : null)
export const codeFor = (s, day) => s.codes.find((c) => c.day === day) || null

/* ---- the deck: one thought per card ------------------------------------- */
export function deckFor(s, day) {
  const d = dayInfo(s, day)
  const wk = weekOf(s, d)
  const cards = []
  const push = (c) => cards.push({ id: c.id || `c${cards.length}`, ...c })

  if (d.type === 'selah') {
    const su = s.sundays?.[d.sunday]
    push({ kind: 'open', eyebrow: `Day ${day} · Selah`, title: su?.title || 'Selah — rest and review', tag: 'No new episode today', emoji: wk?.emoji || '🕊️' })
    if (su?.recap) push({ kind: 'read', label: 'This week', body: md(su.recap) })
    if (su?.reading) push({ kind: 'read', label: 'Bible reading', body: md(su.reading) })
    push({ kind: 'ask', label: 'Talk about it', prompt: su?.questions?.[0] || 'What stood out most this week?', extra: su?.questions?.slice(1) || [] })
    if (su?.prayer) push({ kind: 'pray', label: 'Pray together', body: su.prayer })
    push({ kind: 'declare', label: 'Declare together', lines: (su?.declaration || s.declaration.join('\n')).split('\n').filter(Boolean) })
    return cards
  }

  if (d.type === 'rest' || d.type === 'review') {
    push({ kind: 'open', eyebrow: `Day ${day}`, title: 'A quiet day', tag: 'No episode scheduled', emoji: '🌙' })
    push({ kind: 'read', label: 'The journey so far', body: s.weeks.map((w) => `${w.emoji} ${cap(w.f)} — ${w.title}`).join('\n') })
    push({ kind: 'ask', label: 'Look back', prompt: 'Which day of this month has changed something in you?', extra: [] })
    push({ kind: 'declare', label: 'Say it anyway', lines: s.declaration })
    return cards
  }

  const ep = epOf(s, d)
  // Celebration days without their own episode (e.g. July) close the month out
  // of what the month already gave you.
  if (!ep) {
    const finale = d.type === 'celebration'
    push({
      kind: 'open', emoji: finale ? '🏆' : '⏳',
      eyebrow: `Day ${day}`,
      title: finale ? 'You finished the month' : 'Coming soon',
      tag: finale ? s.title : 'This day is not published yet',
    })
    if (!finale) return cards
    push({ kind: 'read', label: 'The whole climb', body: s.weeks.map((w) => `${w.emoji} ${cap(w.f)} — ${w.title}`).join('\n') })
    push({ kind: 'verse', label: 'Theme scripture', body: s.themeScripture.text, ref: s.themeScripture.ref })
    push({ kind: 'ask', label: 'Testimony', prompt: 'What did God do in you this month?', extra: [] })
    push({ kind: 'declare', label: 'The final declaration', lines: s.declaration })
    return cards
  }

  const isFinale = d.type === 'celebration'
  push({
    kind: 'open',
    eyebrow: d.type === 'intro' ? `Day ${day} · Series launch`
      : isFinale ? `Day ${day} · Grand finale`
      : `Day ${day} · ${wk ? 'The ' + cap(wk.f) + ' Code' : 'Episode ' + d.episode}`,
    title: title(ep.title),
    tag: ep.scripture?.ref || '',
    emoji: isFinale ? '🏆' : d.type === 'intro' ? '🚀' : wk?.emoji || '📖',
  })
  if (d.videoId) push({ kind: 'watch', label: 'Tonight’s episode', videoId: d.videoId, title: title(ep.title) })
  if (ep.hook) push({ kind: 'read', label: 'Start here', body: ep.hook })
  if (ep.scripture?.text) push({ kind: 'verse', label: 'The Word', body: ep.scripture.text, ref: ep.scripture.ref })
  if (ep.truth) push({ kind: 'truth', label: 'The one thing', body: ep.truth })
  // Series that only give us point *titles* (no body) get one summary card
  // instead of three near-empty ones.
  const pts = ep.points.filter((p) => p.title || p.body)
  if (pts.length && pts.every((p) => !p.body))
    push({ kind: 'read', id: 'pts', label: 'What today covers', body: pts.map((p) => '- ' + title(p.title)).join('\n') })
  else
    pts.forEach((p, i) =>
      push({ kind: 'point', id: 'p' + i, label: `Truth ${i + 1} of ${pts.length}`, title: title(p.title), body: p.body })
    )
  if (ep.illustration) push({ kind: 'read', label: 'Picture this', body: ep.illustration })
  ;(ep.supporting || []).slice(0, 1).forEach((v, i) =>
    push({ kind: 'verse', id: 'sv' + i, label: 'Also written', body: v.text, ref: v.ref })
  )
  if (ep.challenge) push({ kind: 'do', label: 'Your move today', body: ep.challenge })
  if (ep.apply?.length) push({ kind: 'do', id: 'apply', label: 'Do this today', body: ep.apply.map((a) => '- ' + a).join('\n') })
  push({
    kind: 'ask',
    label: 'Your answer',
    prompt: ep.talk || ep.questions?.[0] || wk?.question || 'Where does this land in your life today?',
    extra: ep.questions?.slice(1) || [],
  })
  if (ep.prayer) push({ kind: 'pray', label: 'Pray', body: ep.prayer })
  const sh = shortFor(s, d)
  if (sh?.quote) push({ kind: 'quote', label: '60-second short', body: sh.quote, sub: sh.challenge })
  push({
    kind: 'declare',
    label: isFinale ? 'The final declaration' : 'Say it out loud',
    lines: (ep.declaration || s.declaration.join('\n')).split('\n').filter(Boolean),
  })
  return cards
}

/* ---- text helpers ------------------------------------------------------- */
export const cap = (s) => (s || '').charAt(0) + (s || '').slice(1).toLowerCase()
/** ALL-CAPS titles read as shouting in the UI — sentence-case them. */
export const title = (s) => (s || '').replace(/[A-Z][A-Z’'’\-]+/g, (w) => cap(w))
/** strip the markdown emphasis we don't render */
export const md = (s) => (s || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(\S[^*]*?)\*/g, '$1')

export function dayLabel(s, n) {
  const d = dayInfo(s, n)
  if (d.type === 'selah') return s.sundays?.[d.sunday]?.title || 'Selah'
  if (d.type === 'rest' || d.type === 'review') return 'A quiet day'
  const ep = epOf(s, d)
  if (ep) return title(ep.title)
  return d.type === 'celebration' ? 'You finished the month' : 'Coming soon'
}
export function dayEyebrow(s, n) {
  const d = dayInfo(s, n)
  const wk = weekOf(s, d)
  if (d.type === 'intro') return 'Series launch'
  if (d.type === 'celebration') return 'Grand finale'
  if (d.type === 'selah') return 'Selah · rest & review'
  if (d.type === 'rest' || d.type === 'review') return 'No episode'
  return wk ? `The ${cap(wk.f)} Code` : `Episode ${d.episode}`
}
export function dayHookline(s, n) {
  const d = dayInfo(s, n)
  if (d.type === 'selah') return 'Look back over the week, then say the code together.'
  if (d.type === 'rest' || d.type === 'review') return 'Nothing new today — keep the declaration going.'
  const sh = shortFor(s, d)
  return sh?.hook || firstLine(epOf(s, d)?.truth) || ''
}
const firstLine = (s) => (s || '').split('\n')[0].trim()

export const fmtDay = (s, n) =>
  new Date(s.year, s.monthNum - 1, n).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export function greeting(now = new Date()) {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
