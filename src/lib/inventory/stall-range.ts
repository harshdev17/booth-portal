// A stall_number is normally a single value ("101"), but can also be a
// range string ("103-105") when several adjacent physical booths were
// combined into one shop_units row (one large stall). Every count shown to
// an admin (KPI cards, tab badges, category/direction breakdowns) must count
// physical booths, not rows, or a combined "103-105" row silently undercounts
// by 2.
export function getPhysicalBoothCount(stallNumber: string | null | undefined): number {
  if (!stallNumber) return 0

  const match = stallNumber.trim().match(/^(\d+)\s*-\s*(\d+)$/)

  if (!match) return 1

  return Math.abs(Number(match[2]) - Number(match[1])) + 1
}
