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
export function getPhysicalBoothCount(stallNumber: string | null | undefined): number {
  if (!stallNumber) return 0

  const match = stallNumber.trim().match(/^(\d+)\s*-\s*(\d+)$/)

  if (!match) return 1

  const first = Number(match[1])
  const second = Number(match[2])

  if (second <= first) return 1

  return second - first + 1
}
