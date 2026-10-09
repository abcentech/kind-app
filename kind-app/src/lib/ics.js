// Daily reminder as a calendar file (RFC 5545). The only "notification" a no-backend PWA can promise on every platform:
// the user's own calendar fires it, even when the app is closed and the phone is offline.
//
// Choices worth knowing:
//  - DTSTART is *floating* local time (no Z, no TZID): "8 pm" stays 8 pm when the user travels.
//  - UID is constant, so importing again after changing the time updates the one event instead of stacking a second;
//    SEQUENCE rises with every issue so calendars accept it as the newer version.
//  - TRANSP:TRANSPARENT — a nudge must not make the user look busy.
//  - Lines are folded at 75 octets on code-point boundaries (never mid-UTF-8), CRLF throughout, trailing CRLF.
import { now } from '../now.js'

export const REMINDER_FILENAME = 'kind-daily-reminder.ics'
export const REMINDER_UID = 'kind-daily-reminder@kidsinspiringnation.org'
const PRODID = '-//Kids Inspiring Nation//KIND Ascent//EN'
const CRLF = '\r\n'
const enc = new TextEncoder()

export const DEFAULT_TITLE = 'KIND \u00b7 Today\u2019s launch is ready.'
export const DEFAULT_SCRIPTURE = { text: 'He that is faithful in that which is least is faithful also in much.', ref: 'Luke 16:10' } // KJV, public domain

/** RFC 5545 §3.3.11 TEXT escaping. */
export const escapeText = (s) =>
  String(s ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')

/** RFC 5545 §3.1 folding: <= 75 octets per physical line, continuation lines start with one space. */
export function foldLine(line) {
  if (enc.encode(line).length <= 75) return line
  const parts = []
  let cur = '', bytes = 0, limit = 75
  for (const ch of line) {                       // by code point, so a multi-byte character is never split
    const n = enc.encode(ch).length
    if (bytes + n > limit) { parts.push(cur); cur = ''; bytes = 0; limit = 74 }   // 74 + the leading space = 75
    cur += ch; bytes += n
  }
  parts.push(cur)
  return parts.join(CRLF + ' ')
}

const p2 = (n) => String(n).padStart(2, '0')
/** Floating local date-time: 20261002T200000 */
const local = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`
/** UTC date-time: 20261002T040000Z */
const utc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

const int = (v, lo, hi, fallback) => {
  const n = Math.trunc(Number(v))
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback
}

/** First occurrence of hh:mm strictly after `from` (today if it is still ahead, else tomorrow). */
export function firstOccurrence(hour, min, from = now()) {
  const d = new Date(from.getTime())
  d.setHours(hour, min, 0, 0)
  if (d.getTime() <= from.getTime()) d.setDate(d.getDate() + 1)
  return d
}

/** The app's own address, tagged so a tap from the calendar is attributable on-device. */
function defaultUrl() {
  try { return new URL('./?source=reminder', location.href).href } catch { return '' }
}

/**
 * Build the calendar text.
 * @param {object} o
 * @param {number} [o.hour=20] @param {number} [o.min=0]   local time of day
 * @param {string} [o.name]    the pilot's first name — personalises the description ("Ada, ...")
 * @param {string} [o.title]   event title; also the alarm text
 * @param {string} [o.body]    first line of the description
 * @param {{text:string,ref:string}|null} [o.scripture]   null leaves the verse out
 * @param {string} [o.url]     opened from the event's link
 * @param {number} [o.minutes=10]  event length
 * @param {number} [o.count] @param {Date} [o.until]   stop after N days / on a date (default: never)
 * @param {Date} [o.at]        "now", for tests
 */
export function buildReminderICS(o = {}) {
  const hour = int(o.hour, 0, 23, 20)
  const min = int(o.min, 0, 59, 0)
  const minutes = int(o.minutes, 1, 180, 10)
  const at = o.at instanceof Date ? o.at : now()
  const start = firstOccurrence(hour, min, at)
  const end = new Date(start.getTime() + minutes * 60000)
  const title = (o.title || DEFAULT_TITLE).trim()
  const name = (o.name || '').trim().split(/\s+/)[0]
  const lead = o.body || (name
    ? `${name}, today\u2019s launch is ready. A few quiet minutes in the Word keep the streak burning.`
    : 'Today\u2019s launch is ready. A few quiet minutes in the Word keep the streak burning.')
  const sc = o.scripture === null ? null : (o.scripture || DEFAULT_SCRIPTURE)
  const url = o.url ?? defaultUrl()

  const desc = [lead]
  if (sc && sc.text) desc.push('', `\u201c${sc.text}\u201d \u2014 ${sc.ref}`)
  if (url) desc.push('', `Open KIND: ${url}`)

  const rrule = ['FREQ=DAILY']
  if (o.count) rrule.push(`COUNT=${int(o.count, 1, 3660, 1)}`)
  else if (o.until instanceof Date) rrule.push(`UNTIL=${utc(new Date(o.until.getFullYear(), o.until.getMonth(), o.until.getDate(), 23, 59, 59))}`)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${REMINDER_UID}`,
    `DTSTAMP:${utc(at)}`,
    `SEQUENCE:${Math.floor(at.getTime() / 60000)}`,
    `DTSTART:${local(start)}`,
    `DTEND:${local(end)}`,
    `RRULE:${rrule.join(';')}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(desc.join('\n'))}`,
    ...(url ? [`URL:${url.replace(/[\r\n]/g, '')}`] : []),
    'CATEGORIES:KIND',
    'STATUS:CONFIRMED',
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(title)}`,
    'TRIGGER;RELATED=START:PT0S',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join(CRLF) + CRLF
}

/** The .ics as a Blob (text/calendar; UTF-8, no BOM). */
export const makeReminderICS = (o) => new Blob([buildReminderICS(o)], { type: 'text/calendar;charset=utf-8' })

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1))
const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true)

/**
 * Hand the file to the user. Accepts the reminder options or a ready Blob. Resolves true once handed off.
 * Desktop/Android: an <a download>. An iPhone app installed to the Home Screen can't "download" reliably, so it goes
 * through the share sheet (Calendar is an option there) and falls back to the anchor if sharing isn't available.
 */
export async function downloadICS(input, filename = REMINDER_FILENAME) {
  const blob = input instanceof Blob ? input : makeReminderICS(input)
  if (isIOS() && isStandalone() && typeof File === 'function' && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: 'text/calendar' })
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'KIND daily reminder' }); return true }
    } catch (e) { if (e && e.name === 'AbortError') return false /* user closed the sheet */ }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.rel = 'noopener'; a.style.display = 'none'
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)   // iOS can still be reading it a few seconds later
  return true
}
