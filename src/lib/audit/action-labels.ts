/**
 * Plain-English label for an audit log `action` value (e.g.
 * "application.aadhaar_viewed" → "Aadhaar number viewed"), for any admin UI
 * that shows an Audit Trail to a non-technical office admin. Per the same
 * feedback that drove permission-label humanizing (2026-11-10): "ye bhi
 * admin friendly bana de."
 *
 * Falls back to humanizing the raw key (dots/underscores → spaces, Title
 * case) for any action not yet in this list, so a new action added
 * elsewhere never shows a bare `module.action_key` string — it just reads a
 * little more generic until someone adds its real label here.
 */
const ACTION_LABELS: Record<string, string> = {
  'al.action': 'Allotment letter action',
  'allotment.cancelled': 'Allotment cancelled',
  'application.aadhaar_viewed': 'Aadhaar number viewed',
  'application.allotment_letter_downloaded': 'Allotment letter downloaded',
  'application.approved': 'Application approved',
  'application.edited': 'Application details edited',
  'application.exported': 'Applications exported',
  'application.payment_reminder_sent': 'Payment reminder sent',
  'application.query_raised': 'Query raised with applicant',
  'application.receipt_downloaded': 'Payment receipt downloaded',
  'application.rejected': 'Application rejected',
  'application.summary_downloaded': 'Application summary downloaded',
  'auth.login.failed': 'Login attempt failed',
  'auth.login.failed_disabled': 'Login attempt failed (account disabled)',
  'auth.login.failed_locked': 'Login attempt failed (account locked)',
  'auth.login.success': 'Logged in',
  'auth.password_changed': 'Password changed',
  'category.allotment_payment_updated': 'Category allotment fee updated',
  'category.content_updated': 'Category content updated',
  'category.created': 'Category created',
  'direct_allotment.created': 'Direct allotment created',
  'direct_allotment.interchanged': 'Stall interchanged',
  'direct_category.created': 'Custom category created',
  'document.previewed': 'Document previewed',
  'document.uploaded_by_admin': 'Document uploaded by admin',
  'document.verified': 'Document verified',
  'document.rejected': 'Document rejected',
  'document.query': 'Query raised on document',
  'inventory.created': 'Shop/stall unit created',
  'inventory.created_and_allotted': 'Shop/stall created and allotted',
  'inventory.deleted': 'Shop/stall unit deleted',
  'inventory.exported': 'Inventory exported',
  'inventory.imported': 'Inventory imported',
  'inventory.interchanged': 'Stall interchanged',
  'inventory.status_updated': 'Shop/stall status updated',
  'inventory.updated': 'Shop/stall unit updated',
  'notice.created': 'Notice created',
  'notice.deleted': 'Notice deleted',
  'notice.updated': 'Notice updated',
  'notification.test_email': 'Test email sent',
  'notification.test_send': 'Test notification sent',
  'notification_file.created': 'Notification file uploaded',
  'notification_file.deleted': 'Notification file deleted',
  'notification_file.status_updated': 'Notification file status updated',
  'payment.admin_reconciled': 'Payment reconciled by admin',
  'payment.order_created': 'Payment order created',
  'payment.success': 'Payment successful',
  'payment.test_connection': 'Payment gateway test connection',
  'payment.test_connection_failed': 'Payment gateway test connection failed',
  'payment.verification_failed': 'Payment verification failed',
  'payment.webhook_confirmed': 'Payment confirmed via webhook',
  'payment.webhook_failed': 'Payment webhook failed',
  'payment_link.regenerated': 'Payment link regenerated',
  'report.exported': 'Report exported',
  'settings.category_map_removed': 'Stall location map removed',
  'settings.category_map_updated': 'Stall location map updated',
  'settings.contact_updated': 'Contact information updated',
  'settings.whatsapp_notifications_toggled': 'WhatsApp notifications toggled',
  'stall.created': 'Stall created',
  'user.created': 'Staff account created',
  'role.permission_granted': 'Permission granted to role',
  'role.permission_revoked': 'Permission revoked from role',
  'application.field_checked': 'Applicant field marked verified',
  'application.field_unchecked': 'Applicant field unmarked verified',
  'application.approval_checklist_viewed': 'Approval checklist viewed'
}

function humanizeFallback(action: string): string {
  return action
    .replace(/[._]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Known system role keys get a fixed display name; a custom one-person role
// created via Add Staff User (named after the staff member, e.g.
// "priya_sharma") falls back to humanizing its key the same way an unknown
// action does, since its real display name (roles.name) isn't always loaded
// alongside an audit entry's actor_role_key.
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  allotment_staff: 'Allotment Staff',
  verification_staff: 'Verification Staff',
  reports_readonly: 'Reports / Read-only Staff',
  police_user: 'Police User'
}

export function getRoleDisplayName(roleKey: string): string {
  return ROLE_DISPLAY_NAMES[roleKey] ?? humanizeFallback(roleKey)
}

export function getAuditActionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]

  // Dynamic actions like "notification.sent.whatsapp" / "notification.sent.email"
  if (action.startsWith('notification.sent.')) {
    const channel = action.split('.').pop()

    return `Notification sent (${channel === 'whatsapp' ? 'WhatsApp' : channel === 'email' ? 'Email' : channel})`
  }

  return humanizeFallback(action)
}
