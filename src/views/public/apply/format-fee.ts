/**
 * Formats a fee for display, in rupees, from a paise amount. Never computes
 * GST client-side — the total and its base/GST breakdown both come from the
 * server (see getFeeBreakdown in src/lib/applications/categories.ts), so a
 * future fee change made via admin configuration is reflected automatically
 * without any frontend code change.
 */
export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export function formatFeeBreakdownLine(feeBasePaise: number | null, gstPercent: number | null): string | null {
  if (feeBasePaise === null || gstPercent === null) return null

  // getFeeBreakdown() already normalizes gstPercent to a clean number
  // (MySQL DECIMAL columns arrive as strings like "18.00" via mysql2) —
  // Number(...) here is defense in depth, not the primary fix.
  return `${formatRupees(feeBasePaise)} + ${Number(gstPercent)}% GST`
}
