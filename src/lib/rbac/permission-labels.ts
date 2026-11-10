/**
 * Plain-English label + grouping for each permission key, shown instead of
 * the raw `module:action` key (e.g. "allotment:perform") anywhere a
 * non-technical office admin reads this list — the Permission Matrix
 * (/admin/roles) and the Add Staff User dialog both use this. Per explicit
 * feedback (2026-11-10): "ye developer ke liye nahi, normal client ke liye
 * hai." Falls back to the permission's own DB `description` (and
 * ultimately its raw key) for any permission not yet in this lookup, so a
 * newly added permission never silently disappears from the UI.
 */
export const PERMISSION_LABELS: Record<string, { label: string; group: string }> = {
  'dashboard:view': { label: 'View the Admin Dashboard', group: 'Administration' },
  'application:view': { label: 'View applications', group: 'Applications' },
  'application:approve': { label: 'Approve applications', group: 'Applications' },
  'application:reject': { label: 'Reject applications', group: 'Applications' },
  'application:edit': { label: 'Edit applicant details', group: 'Applications' },
  'application:cancel': { label: 'Cancel an allotment/application', group: 'Applications' },
  'document:view': { label: 'View uploaded documents', group: 'Applications' },
  'document:verify': { label: 'Verify applicant documents', group: 'Applications' },
  'payment:view': { label: 'View payments', group: 'Payments' },
  'payment:reconcile': { label: 'Reconcile payments', group: 'Payments' },
  'payment:refund': { label: 'Issue refunds', group: 'Payments' },
  'payment:activate_paynow': { label: 'Activate "Pay Now" for an applicant', group: 'Payments' },
  'payment:reminder': { label: 'Send payment reminders', group: 'Payments' },
  'inventory:view': { label: 'View shop/stall inventory', group: 'Inventory & Allotment' },
  'inventory:manage': { label: 'Add or edit shop/stall inventory', group: 'Inventory & Allotment' },
  'draw:run': { label: 'Run the draw', group: 'Inventory & Allotment' },
  'draw:view': { label: 'View draw results', group: 'Inventory & Allotment' },
  'allotment:perform': { label: 'Allot a shop to an applicant', group: 'Inventory & Allotment' },
  'allotment:reallot': { label: 'Re-allot a reclaimed shop', group: 'Inventory & Allotment' },
  'qr:decode': { label: 'Scan allotment QR codes', group: 'Inventory & Allotment' },
  'qr:revoke': { label: 'Cancel an allotment QR code', group: 'Inventory & Allotment' },
  'report:view': { label: 'View reports', group: 'Reports' },
  'report:export': { label: 'Export reports (Excel/CSV/PDF)', group: 'Reports' },
  'audit:view': { label: 'View activity/audit logs', group: 'Reports' },
  'config:manage': { label: 'Change portal settings', group: 'Administration' },
  'user:manage': { label: 'Create or edit staff accounts', group: 'Administration' },
  'role:manage': { label: 'Manage staff access levels', group: 'Administration' },
  'police:view': { label: 'View the Police Verification Portal', group: 'Administration' }
}

export const PERMISSION_GROUP_ORDER = ['Applications', 'Payments', 'Inventory & Allotment', 'Reports', 'Administration', 'Other']

export function getPermissionLabel(key: string, fallback: string | null): string {
  return PERMISSION_LABELS[key]?.label ?? fallback ?? key
}

export function getPermissionGroup(key: string): string {
  return PERMISSION_LABELS[key]?.group ?? 'Other'
}
