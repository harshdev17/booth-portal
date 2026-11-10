import 'server-only'

import { query } from '@/lib/db/client'
import { sendNotification } from '@/lib/notifications/service'

// Human-readable label per application status, for the WhatsApp status-update
// template's single "new status" variable. Kept here (not duplicated in the
// admin UI) so the wording sent to applicants stays in one place.
const STATUS_LABELS: Record<string, string> = {
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  selected: 'Selected',
  not_selected: 'Not Selected',
  payment_required: 'Payment Required',
  allotted: 'Allotted',
  cancelled: 'Cancelled',
  re_allotted: 'Re-Allotted',
  selected_for_auction: 'Selected for Auction',
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

/**
 * Sends the "selected for the physical auction, pay the participation fee"
 * notification — sent instead of the normal pay_now_activation message when
 * a draw winner's category has selection_method = 'auction' (migration
 * 0077's Auction Payment Flow). Includes a payment link, same shape as
 * pay_now_activation's own link in draw-service.ts.
 */
export async function notifyAuctionFeeActivation(params: {
  applicationId: number
  applicationNumber: string
  mobileNumber: string
  email?: string | null
  representativeName: string
  payLink: string
}): Promise<void> {
  await sendNotification({
    category: 'auction_fee_activation',
    destination: params.mobileNumber.startsWith('+') ? params.mobileNumber : `+91${params.mobileNumber}`,
    userName: params.representativeName,
    templateParams: [params.representativeName, params.applicationNumber, params.payLink],
    buttonParam: params.applicationNumber,
    applicationId: params.applicationId,
    email: params.email
  })
}

/**
 * Sends the "you won the physical auction, pay your specific final amount"
 * notification — triggered immediately after the admin's Auction Results
 * CSV upload matches this application (src/app/api/admin/applications/auction-results/route.ts).
 * amountRupees is the Excel-supplied, per-person final auction amount, not
 * a fixed category fee.
 */
export async function notifyAuctionFinalPayment(params: {
  applicationId: number
  applicationNumber: string
  mobileNumber: string
  email?: string | null
  representativeName: string
  amountRupees: number
  payLink: string
}): Promise<void> {
  await sendNotification({
    category: 'auction_final_payment',
    destination: params.mobileNumber.startsWith('+') ? params.mobileNumber : `+91${params.mobileNumber}`,
    userName: params.representativeName,
    templateParams: [params.representativeName, params.applicationNumber, String(params.amountRupees), params.payLink],
    buttonParam: params.applicationNumber,
    applicationId: params.applicationId,
    email: params.email
  })
}

/**
 * Sends the "auction participation fee received" confirmation + moves
 * status forward — called once the auction_fee payment is confirmed
 * (checkout verify / webhook / admin reconcile), mirroring
 * notifyAllotmentPaymentSuccess()'s own shape/signature (looks the
 * application up itself from just an id + amount) but targeting the new
 * 'auction_fee_paid' intermediate status instead of 'allotted' (a fee
 * payment is NOT the end of this flow — the physical auction and a second,
 * variable-amount payment still follow).
 */
export async function notifyAuctionFeePaymentSuccess(applicationId: number, amountPaise: number): Promise<void> {
  const rows = await query<Array<{ application_number: string; mobile_number: string; representative_name: string; email: string }>>(
    'SELECT application_number, mobile_number, representative_name, email FROM applications WHERE id = ? LIMIT 1',
    [applicationId]
  )

  const application = rows[0]

  if (!application) return

  const destination = `+91${application.mobile_number}`

  if (amountPaise > 0) {
    await sendNotification({
      category: 'payment_confirmation',
      destination,
      userName: application.representative_name,
      templateParams: [application.representative_name, application.application_number, String(amountPaise / 100)],
      applicationId,
      email: application.email
    })
  }

  await notifyApplicationStatusChange({
    applicationId,
    applicationNumber: application.application_number,
    mobileNumber: application.mobile_number,
    email: application.email,
    representativeName: application.representative_name,
    newStatus: 'auction_fee_paid'
  })
}
