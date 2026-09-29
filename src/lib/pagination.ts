// Shared page-size handling for every admin list table (Applications,
// Applicants, Documents, Audit Logs). Restricted to a fixed whitelist rather
// than an arbitrary user-supplied number, since these values get interpolated
// directly into a SQL LIMIT clause (see .ai/SECURITY.md — never trust
// unbounded/unvalidated input into a query, even a numeric one).
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

/** Safety ceiling applied when "All" is selected — prevents a single request from pulling an unbounded table. */
export const ALL_ROWS_CAP = 2000

export function parsePageSize(raw: string | undefined, fallback: number): number | 'all' {
  if (raw === 'all') return 'all'

  const parsed = Number(raw)

  if (PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])) return parsed

  return fallback
}

export function resolveLimit(pageSize: number | 'all'): number {
  return pageSize === 'all' ? ALL_ROWS_CAP : pageSize
}
