// Turns a day's episode into a few check questions, so a lesson teaches and
// then tests — the part that actually fixes a truth in memory.
// Everything is seeded by (series, day) so the options never reshuffle on a
// re-render, and no question ever depends on content the reader hasn't seen.
import { dayInfo, epOf, codeFor, title as sentence } from './lib.js'

const seeded = (n) => () => {
  n |= 0; n = (n + 0x6d2b79f5) | 0
  let t = Math.imul(n ^ (n >>> 15), 1 | n)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const shuffle = (arr, rnd) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const clip = (s, n = 92) => {
  const t = (s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t
}
const firstSentence = (s) => clip((s || '').split(/(?<=\.)\s/)[0])

/** Pick `n` distractors that differ from `right`. */
const others = (pool, right, n, rnd) =>
  shuffle(pool.filter((x) => x && x !== right), rnd).slice(0, n)

export function quizFor(s, day) {
  const d = dayInfo(s, day)
  const ep = epOf(s, d)
  const rnd = seeded(day * 7919 + s.id.length * 104729)
  const qs = []

  const refs = Object.values(s.episodes).map((e) => e.scripture?.ref).filter(Boolean)
  const lines = s.codes.map((c) => c.line).filter(Boolean)
  const truths = Object.values(s.episodes).map((e) => firstSentence(e.truth)).filter(Boolean)

  if (ep?.scripture?.ref && refs.length >= 4) {
    qs.push(build('Which scripture anchors today?', ep.scripture.ref, others(refs, ep.scripture.ref, 3, rnd), rnd,
      'Look back at the verse you read.'))
  }

  const code = codeFor(s, day)
  if (code?.line && lines.length >= 4) {
    qs.push(build('Which line is today’s code?', code.line, others(lines, code.line, 3, rnd), rnd,
      `Today: ${sentence(code.title)}`))
  }

  const truth = firstSentence(ep?.truth)
  if (truth && truths.length >= 4) {
    qs.push(build('What was the one thing today?', truth, others(truths, truth, 3, rnd), rnd,
      'The card headed “the one thing”.'))
  }

  // Selah days have no episode of their own — check the week's declaration.
  if (!qs.length && d.type === 'selah') {
    const su = s.sundays?.[d.sunday]
    const right = (su?.declaration || s.declaration.join('\n')).split('\n')[0]
    if (right && lines.length >= 4)
      qs.push(build('Which line did you declare together?', right, others(lines, right, 3, rnd), rnd, 'From the end of the guide.'))
  }

  return qs.slice(0, 3)
}

function build(prompt, right, wrong, rnd, hint) {
  const options = shuffle([{ text: right, ok: true }, ...wrong.map((text) => ({ text, ok: false }))], rnd)
  return { prompt, options, hint, answer: right }
}
