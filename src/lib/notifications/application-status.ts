import 'server-only'

import { sendNotification } from '@/lib/notifications/service'

// Human-readable label per application status, for the WhatsApp status-update
// template's single "new status" variable. Kept here (not duplicated in the
// admin UI) so the wording sent to applicants stays in one place.
const STATUS_LABELS: Record<string, string> = {
  under_review: 'Under Review',

  // Matches the "Verified" wording the applicant-facing status/print pages
  // use for this status (src/views/public/status/index.tsx) — 'approved' is
  // the internal "Approved for Draw" workflow name (migration 0052), not
  // something the applicant needs to see.
  approved: 'Verified',
  rejected: 'Rejected',
  selected: 'Selected',
  not_selected: 'Not Selected',
  payment_required: 'Payment Required',
  allotted: 'Allotted',
  cancelled: 'Cancelled',
  re_allotted: 'Re-Allotted',
  selected_for_auction: 'Selected For Auction',
  auction_fee_paid: 'Auction Fee Paid',
  auction_won: 'Auction Won'
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
  email?: string | null
  representativeName: string
  newStatus: string
}): Promise<void> {
  const statusLabel = STATUS_LABELS[params.newStatus] ?? params.newStatus

  await sendNotification({
    category: 'status_update',
    destination: params.mobileNumber.startsWith('+') ? params.mobileNumber : `+91${params.mobileNumber}`,
    userName: params.representativeName,
    templateParams: [params.representativeName, params.applicationNumber, statusLabel],
    applicationId: params.applicationId,
    email: params.email
  })
}

/**
 * Sends the "application approved, moving to the next step" notification.
 * Kept distinct from notifyApplicationStatusChange (even though it falls
 * back to the same status_update campaign until its own dedicated
 * AISENSY_CAMPAIGN_APPLICATION_APPROVED template is approved) so the wording
 * can mention "next process" without having to overload the generic status
 * label used for every other status change.
 *
 * IMPORTANT: while AISENSY_CAMPAIGN_APPLICATION_APPROVED is unset,
 * aisensy.ts's getCampaignName() silently falls back to
 * AISENSY_CAMPAIGN_STATUS_UPDATE — but that live template expects 3
 * variables ([name, applicationNumber, statusLabel]), not this category's
 * own 2. Sending only 2 params through it fails at AiSensy with "Template
 * params does not match the campaign" (confirmed live, 2026-11-10 — WhatsApp
 * leg failed while email still sent fine, since email doesn't go through
 * AiSensy). So templateParams here must match whichever campaign is
 * ACTUALLY being used — matching the env var's presence, same logic
 * aisensy.ts itself uses to decide the campaign, rather than hardcoding one
 * param shape.
 */
export async function notifyApplicationApproved(params: {
  applicationId: number
  applicationNumber: string
  mobileNumber: string
  email?: string | null
  representativeName: string
}): Promise<void> {
  const usingDedicatedTemplate = Boolean(process.env.AISENSY_CAMPAIGN_APPLICATION_APPROVED)

  await sendNotification({
    category: 'application_approved',
    destination: params.mobileNumber.startsWith('+') ? params.mobileNumber : `+91${params.mobileNumber}`,
    userName: params.representativeName,
    templateParams: usingDedicatedTemplate
      ? [params.representativeName, params.applicationNumber]
      : [params.representativeName, params.applicationNumber, STATUS_LABELS.approved],
    applicationId: params.applicationId,
    email: params.email
  })
}

/**
 * Sends the "application rejected" notification, carrying the admin's
 * rejection reason as the template's 3rd variable. Requires its own
 * AiSensy template (see .ai/NOTIFICATIONS.md) since status_update's
 * approved wording has no slot for a reason — until that template is
 * approved, the WhatsApp leg fails safely (logged, not thrown) while the
 * email leg already carries the reason.
 */
export async function notifyApplicationRejected(params: {
  applicationId: number
  applicationNumber: string
  mobileNumber: string
  email?: string | null
  representativeName: string
  reason: string
}): Promise<void> {
  await sendNotification({
    category: 'application_rejected',
    destination: params.mobileNumber.startsWith('+') ? params.mobileNumber : `+91${params.mobileNumber}`,
    userName: params.representativeName,
    templateParams: [params.representativeName, params.applicationNumber, params.reason],
    applicationId: params.applicationId,
    email: params.email
  })
}
