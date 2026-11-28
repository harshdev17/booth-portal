// A stall_number is normally a single value ("101"), but can also be a
// range string ("103-105") when several adjacent physical booths were
// combined into one shop_units row (one large stall). Every count shown to
// an admin (KPI cards, tab badges, category/direction breakdowns) must count
// physical booths, not rows, or a combined "103-105" row silently undercounts
// by 2.
//
// NOT every "N-M" looking string is a real range, though — "270-1" and
// "442-1" are single booths using a "<main number>-<sub number>" suffix
// convention (confirmed live, 2026-11-28: these inflated the Total Units KPI
// from ~387 to 1097, since `|1 - 270| + 1 = 270` was being counted for what
// is really one booth). A genuine combined range always counts UP (the
// second number is the larger one, e.g. "396-401", "670-675", "91-92") —
// "270-1"'s second number being smaller than the first is exactly what
// distinguishes a suffix from a real range, confirmed by the admin: "270-1
// hai to ye single hai ... if 270-272 hai to ye range hai".
/**
 * Parses a stall_number into its numeric span: a plain value like "101"
 * is the single-point span [101, 101]; a genuine combined range like
 * "103-105" is [103, 105]. A "<main>-<sub>" suffix like "270-1" (second
 * number not larger than the first) is NOT a range — see the note above —
 * so it's also treated as a single-point span at its first number.
 */
export function parseStallSpan(stallNumber: string | null | undefined): { start: number; end: number } | null {
  if (!stallNumber) return null

  const trimmed = stallNumber.trim()
  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/)

  if (rangeMatch) {
    const first = Number(rangeMatch[1])
    const second = Number(rangeMatch[2])

    if (second > first) return { start: first, end: second }

    return { start: first, end: first }
  }

  const singleMatch = trimmed.match(/^(\d+)$/)

  if (singleMatch) {
    const value = Number(singleMatch[1])

    return { start: value, end: value }
  }

  return null
}

/** Whether two stall_number values' numeric spans overlap at all. */
export function stallSpansOverlap(a: string | null | undefined, b: string | null | undefined): boolean {
  const spanA = parseStallSpan(a)
  const spanB = parseStallSpan(b)

  if (!spanA || !spanB) return false

  return spanA.start <= spanB.end && spanB.start <= spanA.end
}

export function getPhysicalBoothCount(stallNumber: string | null | undefined): number {
  if (!stallNumber) return 0

  const span = parseStallSpan(stallNumber)

  if (!span) return 1

  return span.end - span.start + 1
}
