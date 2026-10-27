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

  for (const p of IST_PARTS.formatToParts(new Date(value))) {
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
