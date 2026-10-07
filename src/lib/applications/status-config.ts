// Single source of truth for how application status values are labeled/colored
// across the admin panel (list, detail, reports). Values must stay in sync
// with the `applications.status` ENUM (src/database/migrations/0003_categories_and_applications.sql)
// and .ai/APPLICATION_FLOW.md Section 2.
export const APPLICATION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  payment_pending: { label: 'Payment Pending', color: 'bg-amber-100 text-amber-800' },
  payment_failed: { label: 'Payment Failed', color: 'bg-red-100 text-red-800' },

  // Payment is mandatory for submission, so "payment success" is just Under Review (legacy value).
  payment_success: { label: 'Under Review', color: 'bg-blue-100 text-blue-800' },
  under_review: { label: 'Under Review', color: 'bg-blue-100 text-blue-800' },
  query_raised: { label: 'Query Raised', color: 'bg-orange-100 text-orange-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  selected: { label: 'Selected', color: 'bg-purple-100 text-purple-800' },
  not_selected: { label: 'Not Selected', color: 'bg-slate-100 text-slate-700' },
  payment_required: { label: 'Payment Required', color: 'bg-amber-100 text-amber-800' },
  allotted: { label: 'Allotted', color: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  re_allotted: { label: 'Re-allotted', color: 'bg-purple-100 text-purple-800' }
}

export function getApplicationStatusConfig(status: string) {
  return APPLICATION_STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-700' }
}

export const DOCUMENT_VERIFICATION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  verified: { label: 'Verified', color: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  query: { label: 'Query Raised', color: 'bg-blue-100 text-blue-800' }
}

export function getDocumentStatusConfig(status: string) {
  return DOCUMENT_VERIFICATION_STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-700' }
}

// Must stay in sync with the `payments.status` ENUM (migration 0012_payments.sql).
export const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  not_initiated: { label: 'Not Initiated', color: 'bg-slate-100 text-slate-700' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  success: { label: 'Success', color: 'bg-emerald-100 text-emerald-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'Refunded', color: 'bg-purple-100 text-purple-800' }
}

export function getPaymentStatusConfig(status: string) {
  return PAYMENT_STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-700' }
}
