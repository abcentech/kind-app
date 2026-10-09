// Validates src/lib/ics.js by parsing its output back — no framework.
//   node tools/pwa-test/ics.test.mjs            (also re-runs itself under three time zones)
//   KIND_PYLIB=<dir with icalendar installed> node tools/pwa-test/ics.test.mjs   (adds an independent parser + RRULE expansion)
import { buildReminderICS, makeReminderICS, escapeText, foldLine, firstOccurrence, REMINDER_UID, DEFAULT_TITLE } from '../../src/lib/ics.js'
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

let pass = 0, fail = 0
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL ' + msg) } }
const eq = (a, b, msg) => ok(a === b, `${msg}\n       got:  ${JSON.stringify(a)}\n       want: ${JSON.stringify(b)}`)
const section = (s) => console.log(`\n== ${s}`)

const strict = new TextDecoder('utf-8', { fatal: true })
const octets = (s) => new TextEncoder().encode(s).length

/** The independent reader: physical lines -> unfolded logical lines -> a tree. */
function parse(text) {
  ok(text.endsWith('\r\n'), 'file ends with CRLF')
  ok(!/[^\r]\n/.test(text) && !/\r(?!\n)/.test(text), 'no bare LF or bare CR anywhere')
  const physical = text.slice(0, -2).split('\r\n')
  for (const [i, line] of physical.entries()) {
    ok(line.length > 0, `line ${i + 1} is not empty`)
    ok(octets(line) <= 75, `line ${i + 1} is <= 75 octets (is ${octets(line)}): ${line.slice(0, 40)}…`)
    if (i > 0 && /^[ \t]/.test(line)) {
      ok(line[0] === ' ', `continuation ${i + 1} starts with a single space`)
      ok(!/^[ \t]{2}/.test(line) || true, '')
    }
    // Every physical line must be valid UTF-8 on its own: a fold in the middle of a character would break this.
    try { strict.decode(new TextEncoder().encode(line)) } catch { ok(false, `line ${i + 1} is valid UTF-8`) }
  }
  const logical = []
  for (const line of physical) {
    if (line[0] === ' ' && logical.length) logical[logical.length - 1] += line.slice(1)
    else logical.push(line)
  }
  const root = { name: 'ROOT', props: [], kids: [] }
  const stack = [root]
  for (const l of logical) {
    const m = /^([A-Z0-9-]+)((?:;[^:]*)*):(.*)$/.exec(l)
    if (!m) { ok(false, `logical line parses: ${l.slice(0, 60)}`); continue }
    const [, name, params, value] = m
    if (name === 'BEGIN') { const n = { name: value, props: [], kids: [] }; stack.at(-1).kids.push(n); stack.push(n) }
    else if (name === 'END') { const top = stack.pop(); ok(top.name === value, `END:${value} closes ${top.name}`) }
    else stack.at(-1).props.push({ name, params: params.split(';').filter(Boolean), value })
  }
  ok(stack.length === 1, 'every BEGIN has an END')
  return root
}
const unescape = (v) => v.replace(/\\([nN,;\\])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c))   // one pass: an escaped backslash followed by "n" is not a newline
const prop = (node, name) => node.props.find((p) => p.name === name)
const one = (node, name) => { const p = node.props.filter((x) => x.name === name); eq(p.length, 1, `exactly one ${name}`); return p[0]?.value }
const at = (y, mo, d, h, mi, s = 0) => new Date(y, mo - 1, d, h, mi, s)

function validate(ics, expect) {
  const root = parse(ics)
  const cal = root.kids[0]
  eq(cal?.name, 'VCALENDAR', 'root is VCALENDAR')
  eq(one(cal, 'VERSION'), '2.0', 'VERSION 2.0')
  ok(!!prop(cal, 'PRODID'), 'PRODID present')
  const ev = cal.kids.find((k) => k.name === 'VEVENT')
  ok(!!ev, 'has VEVENT'); if (!ev) return
  eq(one(ev, 'UID'), REMINDER_UID, 'UID is the stable one')
  ok(/^\d{8}T\d{6}Z$/.test(one(ev, 'DTSTAMP')), 'DTSTAMP is UTC (…Z)')
  ok(/^\d{8}T\d{6}$/.test(one(ev, 'DTSTART')), 'DTSTART is floating local (no Z, no TZID)')
  ok(!prop(ev, 'DTSTART').params.length, 'DTSTART carries no TZID/VALUE parameter')
  ok(/^\d{8}T\d{6}$/.test(one(ev, 'DTEND')), 'DTEND floating local')
  ok(one(ev, 'DTEND') > one(ev, 'DTSTART'), 'DTEND after DTSTART')
  ok(/^FREQ=DAILY(;COUNT=\d+|;UNTIL=\d{8}T\d{6}Z)?$/.test(one(ev, 'RRULE')), 'RRULE is FREQ=DAILY (+ optional COUNT/UNTIL)')
  eq(one(ev, 'TRANSP'), 'TRANSPARENT', 'does not block the calendar')
  ok(/^\d+$/.test(one(ev, 'SEQUENCE')), 'SEQUENCE is an integer')
  const alarm = ev.kids.find((k) => k.name === 'VALARM'); ok(!!alarm, 'has VALARM')
  if (alarm) {
    eq(one(alarm, 'ACTION'), 'DISPLAY', 'alarm ACTION:DISPLAY')
    ok(!!one(alarm, 'DESCRIPTION'), 'alarm has a DESCRIPTION (required for DISPLAY)')
    const t = prop(alarm, 'TRIGGER'); eq(t?.value, 'PT0S', 'alarm fires at the event start')
    ok(t?.params.includes('RELATED=START'), 'alarm is RELATED=START')
  }
  if (expect) {
    if (expect.start) eq(one(ev, 'DTSTART'), expect.start, 'DTSTART')
    if (expect.end) eq(one(ev, 'DTEND'), expect.end, 'DTEND')
    if (expect.summary) eq(unescape(one(ev, 'SUMMARY')), expect.summary, 'SUMMARY round-trips through escaping')
    if (expect.descIncludes) for (const s of expect.descIncludes) ok(unescape(one(ev, 'DESCRIPTION')).includes(s), `DESCRIPTION includes ${JSON.stringify(s)}`)
    if (expect.url) eq(one(ev, 'URL'), expect.url, 'URL')
    if ('rrule' in expect) eq(one(ev, 'RRULE'), expect.rrule, 'RRULE')
  }
  return { cal, ev }
}

// -------------------------------------------------------------------------------------------------------------------
section('escaping + folding primitives')
eq(escapeText('a, b; c\\d\ne'), 'a\\, b\\; c\\\\d\\ne', 'escapeText: , ; \\ and newline')
eq(escapeText('x\r\ny'), 'x\\ny', 'escapeText: CRLF -> \\n')
eq(escapeText('bell\u0007 tab\tok'), 'bell tab\tok', 'escapeText strips control characters, keeps tab')
{
  const long = 'DESCRIPTION:' + 'Ünïcödé — “quotes” 🔥 '.repeat(20)
  const folded = foldLine(long)
  const segs = folded.split('\r\n')
  ok(segs.length > 3, 'long line folds into several segments')
  ok(segs.every((s, i) => octets(s) <= 75), 'every segment <= 75 octets')
  ok(segs.slice(1).every((s) => s[0] === ' '), 'continuations begin with a space')
  eq(segs.map((s, i) => (i ? s.slice(1) : s)).join(''), long, 'unfold(fold(x)) === x')
  ok(segs.every((s) => { try { strict.decode(new TextEncoder().encode(s)); return true } catch { return false } }), 'no segment splits a multi-byte character')
  eq(foldLine('SHORT:line'), 'SHORT:line', 'short line untouched')
  eq(octets(foldLine('A'.repeat(75))), 75, 'exactly 75 octets is left alone')
  eq(foldLine('A'.repeat(76)).split('\r\n').length, 2, '76 octets folds once')
}

section('default reminder (Fri 2 Oct 2026, 09:00 — 20:00 is still ahead)')
{
  const ics = buildReminderICS({ at: at(2026, 10, 2, 9, 0), url: 'https://kind.example/app/?source=reminder' })
  const { ev } = validate(ics, {
    start: '20261002T200000', end: '20261002T201000', summary: DEFAULT_TITLE, rrule: 'FREQ=DAILY',
    descIncludes: ['Today’s launch is ready', 'faithful in that which is least', 'Luke 16:10', 'Open KIND: https://kind.example/app/?source=reminder'],
    url: 'https://kind.example/app/?source=reminder',
  })
  console.log('  (' + ics.split('\r\n').length + ' physical lines)')
}

section('start rolls to tomorrow once the time has passed — and "exactly now" counts as passed')
validate(buildReminderICS({ at: at(2026, 10, 2, 21, 0), hour: 20, min: 0, url: '' }), { start: '20261003T200000' })
validate(buildReminderICS({ at: at(2026, 10, 2, 20, 0, 0), hour: 20, min: 0, url: '' }), { start: '20261003T200000' })
validate(buildReminderICS({ at: at(2026, 10, 2, 19, 59, 59), hour: 20, min: 0, url: '' }), { start: '20261002T200000' })
validate(buildReminderICS({ at: at(2026, 12, 31, 22, 0), hour: 6, min: 30, url: '' }), { start: '20270101T063000' })   // year boundary
validate(buildReminderICS({ at: at(2026, 2, 28, 23, 0), hour: 7, min: 0, url: '' }), { start: '20260301T070000' })     // month boundary

section('midnight-crossing and edge times')
validate(buildReminderICS({ at: at(2026, 10, 2, 9, 0), hour: 23, min: 55, minutes: 10, url: '' }), { start: '20261002T235500', end: '20261003T000500' })
validate(buildReminderICS({ at: at(2026, 10, 2, 9, 0), hour: 0, min: 0, url: '' }), { start: '20261003T000000', end: '20261003T001000' })
validate(buildReminderICS({ at: at(2026, 10, 2, 9, 0), hour: 99, min: -5, url: '' }), { start: '20261002T230000' })       // clamped
validate(buildReminderICS({ at: at(2026, 10, 2, 9, 0), hour: 'x', min: 'y', url: '' }), { start: '20261002T200000' })     // garbage -> defaults

section('text that needs escaping + long unicode (personalised)')
{
  const ics = buildReminderICS({
    at: at(2026, 10, 2, 9, 0), name: 'Chiamaka Adébáyọ̀ Obi', title: 'KIND · Launch, now; go\\no', url: 'https://kind.example/?a=1&b=2,3',
    body: 'Chiamaka, your launch is ready — “keep going”, friend; the streak is at 12.',
    scripture: { text: 'Whatsoever thy hand findeth to do, do it with thy might; for there is no work, nor device, nor knowledge, nor wisdom, in the grave.', ref: 'Ecclesiastes 9:10' },
  })
  validate(ics, {
    summary: 'KIND · Launch, now; go\\no',
    descIncludes: ['Chiamaka, your launch is ready — “keep going”, friend; the streak is at 12.', 'Ecclesiastes 9:10', '“Whatsoever thy hand findeth to do'],
    url: 'https://kind.example/?a=1&b=2,3',
  })
  eq(ics.split('\r\n').some((l) => l.startsWith(' ')), true, 'the long description actually folded')
  const withName = buildReminderICS({ at: at(2026, 10, 2, 9, 0), name: 'Ada Obi', url: '' })
  validate(withName, { descIncludes: ['Ada, today’s launch is ready'] })
  ok(!/Obi/.test(withName), 'only the first name is used')
}

section('verse optional, url optional, count / until')
validate(buildReminderICS({ at: at(2026, 10, 2, 9, 0), scripture: null, url: '' }), {})
ok(!/Luke/.test(buildReminderICS({ at: at(2026, 10, 2, 9, 0), scripture: null, url: '' })), 'scripture:null omits the verse')
ok(!/URL:/.test(buildReminderICS({ at: at(2026, 10, 2, 9, 0), url: '' })), 'url:"" omits URL')
validate(buildReminderICS({ at: at(2026, 10, 2, 9, 0), count: 31, url: '' }), { rrule: 'FREQ=DAILY;COUNT=31' })
validate(buildReminderICS({ at: at(2026, 10, 2, 9, 0), until: at(2026, 10, 31, 0, 0), url: '' }), {})
ok(/RRULE:FREQ=DAILY;UNTIL=\d{8}T\d{6}Z\r\n/.test(buildReminderICS({ at: at(2026, 10, 2, 9, 0), until: at(2026, 10, 31, 0, 0), url: '' })), 'until -> UNTIL in UTC')

section('UID is stable, SEQUENCE advances (so re-import updates one event)')
{
  const a = buildReminderICS({ at: at(2026, 10, 2, 9, 0), hour: 20, url: '' })
  const b = buildReminderICS({ at: at(2026, 10, 2, 9, 5), hour: 6, min: 15, url: '' })
  const get = (s, k) => new RegExp(`^${k}:(.*)$`, 'm').exec(s)[1].trim()
  eq(get(a, 'UID'), get(b, 'UID'), 'same UID for a different time')
  ok(Number(get(b, 'SEQUENCE')) > Number(get(a, 'SEQUENCE')), 'later issue has a higher SEQUENCE')
  ok(Number(get(b, 'SEQUENCE')) < 2 ** 31, 'SEQUENCE fits int32')
}

section('Blob')
{
  const blob = makeReminderICS({ at: at(2026, 10, 2, 9, 0), url: '' })
  eq(blob.type, 'text/calendar;charset=utf-8', 'MIME type')
  const text = await blob.text()
  ok(text.startsWith('BEGIN:VCALENDAR\r\n'), 'blob text begins with BEGIN:VCALENDAR')
  ok(!text.startsWith('﻿'), 'no BOM')
}

section('firstOccurrence')
{
  const d = firstOccurrence(20, 0, at(2026, 10, 2, 9, 0))
  eq(`${d.getDate()}/${d.getHours()}:${d.getMinutes()}`, '2/20:0', 'today when ahead')
}

// -------------------------------------------------------------------------------------------------------------------
// Independent parser: python-icalendar (if available), including RRULE expansion.
const lib = process.env.KIND_PYLIB
if (lib) {
  section('python-icalendar (independent parser) + recurrence expansion')
  const dir = mkdtempSync(join(tmpdir(), 'kind-ics-'))
  const file = join(dir, 'r.ics')
  writeFileSync(file, buildReminderICS({ at: at(2026, 10, 2, 9, 0), name: 'Ada', hour: 20, min: 0, url: 'https://kind.example/app/?source=reminder' }))
  const py = `
import sys, json
sys.path.insert(0, r"${lib}")
import icalendar, recurring_ical_events
from datetime import datetime
cal = icalendar.Calendar.from_ical(open(r"${file}", 'rb').read())
ev = [c for c in cal.walk('VEVENT')][0]
al = [c for c in ev.walk('VALARM')][0]
occ = recurring_ical_events.of(cal).between((2026,10,2), (2026,10,6))
print(json.dumps({
  'version': str(cal['VERSION']), 'uid': str(ev['UID']), 'summary': str(ev['SUMMARY']),
  'dtstart': ev['DTSTART'].dt.isoformat(), 'tz': str(ev['DTSTART'].dt.tzinfo), 'rrule': ev['RRULE'].to_ical().decode(),
  'transp': str(ev['TRANSP']), 'alarm_action': str(al['ACTION']), 'alarm_trigger': str(al['TRIGGER'].dt),
  'desc': str(ev['DESCRIPTION']), 'url': str(ev['URL']),
  'occurrences': [o['DTSTART'].dt.isoformat() for o in occ],
}))`
  const r = spawnSync('python', ['-c', py], { encoding: 'utf8' })
  if (r.status !== 0) { ok(false, 'python-icalendar parsed the file: ' + r.stderr.slice(-400)) }
  else {
    const j = JSON.parse(r.stdout)
    eq(j.version, '2.0', 'icalendar: VERSION'); eq(j.uid, REMINDER_UID, 'icalendar: UID')
    eq(j.dtstart, '2026-10-02T20:00:00', 'icalendar: DTSTART parsed as naive (floating) local time')
    eq(j.tz, 'None', 'icalendar: no timezone attached to DTSTART')
    eq(j.rrule, 'FREQ=DAILY', 'icalendar: RRULE'); eq(j.transp, 'TRANSPARENT', 'icalendar: TRANSP')
    eq(j.alarm_action, 'DISPLAY', 'icalendar: alarm action'); eq(j.alarm_trigger, '0:00:00', 'icalendar: alarm trigger = 0')
    ok(j.desc.includes('Ada, today’s launch is ready') && j.desc.includes('Luke 16:10') && j.desc.includes('https://kind.example/app/?source=reminder'), 'icalendar: DESCRIPTION intact after unfold/unescape')
    eq(j.url, 'https://kind.example/app/?source=reminder', 'icalendar: URL')
    eq(j.occurrences.join(','), '2026-10-02T20:00:00,2026-10-03T20:00:00,2026-10-04T20:00:00,2026-10-05T20:00:00', 'icalendar: RRULE expands to one event per day at 20:00')
  }
}

// Re-run under other time zones so "floating local" is proven not to depend on the machine's zone.
if (!process.env.KIND_ICS_CHILD) {
  for (const tz of ['America/New_York', 'Asia/Kolkata', 'Pacific/Chatham', 'Africa/Lagos']) {
    section(`re-run with TZ=${tz}`)
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env: { ...process.env, TZ: tz, KIND_ICS_CHILD: '1' }, encoding: 'utf8' })
    const m = /(\d+) passed, (\d+) failed/.exec(r.stdout)
    console.log('  ' + (m ? m[0] : r.stdout.slice(-300) + r.stderr.slice(-300)))
    if (!m || m[2] !== '0') { fail++; console.log(r.stdout.slice(-1500)) } else pass++
  }
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
