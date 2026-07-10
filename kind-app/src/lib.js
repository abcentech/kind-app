import data from './content/series.json'

export const { series, calendar, intro, episodes, shorts, shortsPlaylist } = data

export function todayNumber(now = new Date()) {
  if (now.getFullYear() === series.year && now.getMonth() + 1 === series.monthNum)
    return now.getDate()
  return Math.min(Math.max(1, now.getDate()), calendar.length) // demo fallback outside July
}

export const dayInfo = (n) => calendar[n - 1]

// Ordered segment list for a given calendar day.
export function segmentsFor(day) {
  const d = dayInfo(day)
  if (d.type === 'teaching') {
    const ep = episodes[d.episode]
    return [
      { id: 'hook', k: 'Hook', icon: '🪝', title: hookTitle(ep), body: ep.hook },
      { id: 'scripture', k: 'Scripture', icon: '📖', title: ep.scripture.ref, body: `"${ep.scripture.text}"`, scripture: true },
      { id: 'idea', k: 'Big Idea', icon: '💡', title: 'The one thing to remember', body: ep.bigIdea, idea: true },
      { id: 'apply', k: 'Do This Today', icon: '👟', title: 'Put it into practice', body: ep.application.map((a) => '• ' + a).join('\n') },
      { id: 'prayer', k: 'Pray Together', icon: '🙏', title: 'Family prayer', body: ep.prayer, scripture: true },
      { id: 'talk', k: 'Talk About It · Family', icon: '💬', title: 'Tonight’s question', body: ep.talk || ep.reflection.join('\n'), talk: true },
      { id: 'short', k: '60-Second Short', icon: '🎬', title: 'Watch & share today’s Short', body: ep.shortHook, link: series.shortsUrl },
    ]
  }
  if (d.type === 'intro')
    return [
      { id: 'hook', k: 'Welcome', icon: '🌅', title: 'The Gift of Long Life', body: intro.hook },
      { id: 'scripture', k: 'Theme Scripture', icon: '📖', title: intro.scripture.ref, body: `"${intro.scripture.text}"`, scripture: true },
      { id: 'vision', k: "God's Vision", icon: '🌳', title: 'Like the days of a tree', body: intro.why },
      { id: 'prayer', k: 'Pray Together', icon: '🙏', title: 'Family prayer', body: intro.prayer, scripture: true },
      { id: 'talk', k: 'Talk About It', icon: '💬', title: 'Tonight’s question', body: intro.talk, talk: true },
    ]
  const wk = series.weeks[d.week]
  if (d.type === 'selah')
    return [
      { id: 'review', k: 'Selah · Review', icon: wk.emoji, title: `Look back on ${cap(wk.f)}`, body: `No new episode today. Take it slow.\nTalk through this week's episodes together: what stuck with each person?` },
      { id: 'memory', k: 'Memory Verse', icon: '🧠', title: 'Say it from memory', body: `"${series.themeScripture.text}"\n— ${series.themeScripture.ref}`, scripture: true },
      { id: 'talk', k: 'Family Discussion', icon: '💬', title: 'Around the table', body: `Which day of ${cap(wk.f)} week challenged you most — and what will you do about it?`, talk: true },
      { id: 'activity', k: 'Family Activity', icon: '🎨', title: 'Do something together', body: 'Pick one: act out this week’s Bible story · make a memory-verse poster · pray for one neighbour by name.' },
    ]
  if (d.type === 'review')
    return [
      { id: 'recap', k: 'The Journey So Far', icon: '🗺️', title: 'Five F’s, one story', body: series.weeks.map((w) => `${w.emoji} ${cap(w.f)} — ${w.title}`).join('\n') },
      { id: 'testimony', k: 'Testimonies', icon: '🗣️', title: 'What did God do this month?', body: 'Let every family member share one thing God taught or did in them during the journey.', talk: true },
    ]
  // celebration
  return [
    { id: 'recap', k: 'Celebrate', icon: '🎉', title: 'You climbed the mountain!', body: series.weeks.map((w) => `${w.emoji} ${cap(w.f)} — ${w.title}`).join('\n') },
    { id: 'declare', k: 'Declaration', icon: '📜', title: '2 Timothy 4:7', body: '"I have fought a good fight, I have finished my course, I have kept the faith."', scripture: true },
    { id: 'testimony', k: 'Share It', icon: '🗣️', title: 'Tell somebody', body: 'Share one testimony from this month with a friend or your church group — and invite them to next month’s journey.', talk: true },
    { id: 'prayer', k: 'Commissioning Prayer', icon: '🙏', title: 'Sent into a new month', body: 'Father, thank You for 31 days of Your Word. Seal what You have planted in us, and help us live every decade for the glory of Jesus. Amen.', scripture: true },
  ]
}

export function dayTitle(n) {
  const d = dayInfo(n)
  if (d.type === 'intro') return intro.title
  if (d.type === 'teaching') return episodes[d.episode].title
  if (d.type === 'selah') return 'Selah — Family Day'
  if (d.type === 'review') return 'The Journey So Far'
  return 'Celebration Day'
}
export function dayRef(n) {
  const d = dayInfo(n)
  if (d.type === 'teaching') return episodes[d.episode].scripture.ref
  if (d.type === 'intro') return intro.scripture.ref
  if (d.type === 'celebration') return '2 Timothy 4:7'
  return series.themeScripture.ref
}
export function dayEyebrow(n) {
  const d = dayInfo(n)
  const wk = d.week != null ? series.weeks[d.week] : null
  if (d.type === 'teaching') return `Day ${n} · Week ${d.week + 1} — ${cap(wk.f)} · Episode ${d.episode}`
  if (d.type === 'intro') return `Day ${n} · Introduction`
  return `Day ${n} · ${wk ? 'Week ' + (d.week + 1) + ' — ' + cap(wk.f) : ''}`
}
export function dayHookline(n) {
  const d = dayInfo(n)
  if (d.type === 'teaching') return firstLine(episodes[d.episode].shortHook || episodes[d.episode].hook)
  if (d.type === 'intro') return firstLine(intro.shortHook)
  if (d.type === 'selah') return 'No new episode — review, remember, and rest together.'
  if (d.type === 'review') return 'Look back over the whole climb before the summit.'
  return 'The summit! Celebrate 31 days of walking with God.'
}
const firstLine = (s) => (s || '').split('\n')[0].trim()
function hookTitle(ep) {
  const l = firstLine(ep.hook).replace(/[*_]/g, '')
  return l.length > 46 ? l.slice(0, 44).trimEnd() + '…' : l
}
export const cap = (s) => s.charAt(0) + s.slice(1).toLowerCase()

export function fmtDate(now = new Date()) {
  return now.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })
}
export function greeting(now = new Date()) {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
