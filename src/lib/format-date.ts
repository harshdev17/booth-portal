// Date formatting for public pages that render on BOTH the server and the
// browser. toLocaleString('hi-IN', ...) is not safe there: Node's ICU data and
// Chrome's spell some months differently ("अक्तूबर" vs "अक्टूबर"), and a
// different default time zone shifts the wall-clock time — both produce a
// React hydration mismatch. This builds the text from fixed tables and always
// uses Indian Standard Time, so server and client output is identical.

const HINDI_MONTHS = [
  'जनवरी',
  'फ़रवरी',
  'मार्च',
  'अप्रैल',
  'मई',
  'जून',
  'जुलाई',
  'अगस्त',
  'सितंबर',
  'अक्टूबर',
  'नवंबर',
  'दिसंबर'
]

const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const IST_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23'
})

function istParts(value: string | Date) {
  const get: Record<string, number> = {}

  // A plain DB DATETIME string ("2026-10-28 18:30:00", no timezone suffix)
  // IS already IST wall-clock time (see parseIstDateTime below for why a
  // bare `new Date(...)` on it is unsafe — it's parsed in the server
  // process's own local timezone, not IST, which silently broke this on a
  // UTC-timezone host). A real `Date` object (already a precise instant,
  // e.g. `new Date()` for "now") needs no such correction.
  const asDate = typeof value === 'string' ? parseIstDateTime(value) : value

  for (const p of IST_PARTS.formatToParts(asDate)) {
    if (p.type !== 'literal') get[p.type] = Number(p.value)
  }

  return get
}

/** "20 October 2026" / "20 अक्टूबर 2026" */
export function formatDate(value: string | Date, lang: 'hi' | 'en'): string {
  const p = istParts(value)
  const month = (lang === 'hi' ? HINDI_MONTHS : ENGLISH_MONTHS)[p.month - 1]

  return `${p.day} ${month} ${p.year}`
}

/** "20 October 2026, 11:59 pm" / "20 अक्टूबर 2026, 11:59 pm" */
export function formatDateTime(value: string | Date, lang: 'hi' | 'en'): string {
  const p = istParts(value)
  const hour12 = p.hour % 12 === 0 ? 12 : p.hour % 12
  const suffix = p.hour >= 12 ? 'pm' : 'am'

  return `${formatDate(value, lang)}, ${hour12}:${String(p.minute).padStart(2, '0')} ${suffix}`
}

/** "11:59 pm" — the time-of-day portion only, IST. */
export function formatTime(value: string | Date): string {
  const p = istParts(value)
  const hour12 = p.hour % 12 === 0 ? 12 : p.hour % 12
  const suffix = p.hour >= 12 ? 'pm' : 'am'

  return `${hour12}:${String(p.minute).padStart(2, '0')} ${suffix}`
}

/**
 * Parses a MySQL DATETIME string read with `dateStrings: true` (e.g.
 * "2026-10-28 18:30:00") as IST wall-clock time, into the correct UTC
 * instant — independent of the Node process's own local timezone.
 *
 * `new Date("2026-10-28 18:30:00")` is NOT safe for this: a string with no
 * timezone offset is parsed in the *server process's own* local timezone,
 * not IST. On a machine/host where that happens to be IST this looks
 * correct by accident; on a host running in UTC (confirmed live on
 * Hostinger) the same string is parsed 5.5 hours off, which silently
 * broke `isCategoryAcceptingApplications()`'s opens/closes comparison —
 * a category whose window had genuinely already opened still showed
 * "Applications Closed" live, while the identical code on a locally-IST
 * dev machine worked fine against the exact same DB values. Every
 * open/closes-at comparison against "now" must go through this, not a
 * bare `new Date(...)`.
 */
export function parseIstDateTime(value: string | Date): Date {
  if (value instanceof Date) return value

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/)

  if (!match) return new Date(value)

  const [, year, month, day, hour, minute, second] = match

  // IST is UTC+5:30 with no DST — constructing the UTC instant directly
  // (via Date.UTC, then subtracting the offset) is immune to whatever
  // timezone the running process itself is in.
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)) -
      5.5 * 60 * 60 * 1000
  )
}
