/**
 * Generic partial-masking helper for sensitive identifiers (Razorpay
 * order/payment IDs, etc.) shown to roles that don't need full visibility —
 * see .ai/SECURITY.md Section 11 ("Data masking") and .ai/RBAC.md. Keeps a
 * short trailing slice visible for support/reconciliation conversations
 * ("...ends in a1b2") without exposing the full identifier.
 */
export function maskIdentifier(value: string | null | undefined, visibleTrailingChars = 4): string {
  if (!value) return '—'
  if (value.length <= visibleTrailingChars) return value

  return `${'•'.repeat(6)}${value.slice(-visibleTrailingChars)}`
}
