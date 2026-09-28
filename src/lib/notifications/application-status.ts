import 'server-only'

import { sendNotification } from '@/lib/notifications/service'

// Human-readable label per application status, for the WhatsApp status-update
// template's single "new status" variable. Kept here (not duplicated in the
// admin UI) so the wording sent to applicants stays in one place.
const STATUS_LABELS: Record<string, string> = {
  under_review: 'Under Review',
  rejected: 'Rejected',
  selected: 'Selected',
  not_selected: 'Not Selected',
  payment_required: 'Payment Required',
  allotted: 'Allotted',
  cancelled: 'Cancelled',
  re_allotted: 'Re-Allotted'
}

/**
 * Sends a WhatsApp status-update notification to an applicant. Intended to
 * be called from wherever an admin action changes applications.status (the
 * admin status-change endpoint itself is not yet built — see
 * .ai/CHANGELOG.md; this is the integration point for it once it exists).
 * Never throws — a notification failure must not block the status change
 * that triggered it; failures are recorded in notification_log by
 * sendNotification() for operational follow-up.
 */
export async function notifyApplicationStatusChange(params: {
  applicationId: number
  applicationNumber: string
  mobileNumber: string
  representativeName: string
  newStatus: string
}): Promise<void> {
  const statusLabel = STATUS_LABELS[params.newStatus] ?? params.newStatus

  await sendNotification({
    category: 'status_update',
    destination: params.mobileNumber.startsWith('+') ? params.mobileNumber : `+91${params.mobileNumber}`,
    userName: params.representativeName,
    templateParams: [params.representativeName, params.applicationNumber, statusLabel],
    applicationId: params.applicationId
  })
}
