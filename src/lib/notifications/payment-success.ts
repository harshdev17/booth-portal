import 'server-only'

import { query } from '@/lib/db/client'
import { notifyApplicationStatusChange } from '@/lib/notifications/application-status'
import { sendNotification } from '@/lib/notifications/service'
import { logServerError } from '@/lib/security/error-log'

/**
 * Sends the two WhatsApp messages an applicant should get once their fee is
 * confirmed: the payment confirmation and the "application received"
 * confirmation (payment is what completes a submission, so both go out at
 * the same moment). Called from every path that records a successful
 * payment first (checkout verify, Razorpay webhook), so the applicant is
 * told exactly once however the payment was confirmed. Never throws — a
 * notification failure must not affect the payment (failures land in
 * notification_log via sendNotification()).
 */
export async function notifyPaymentSuccess(applicationId: number, amountPaise: number): Promise<void> {
  try {
    const rows = await query<Array<{ application_number: string; mobile_number: string; representative_name: string; email: string }>>(
      'SELECT application_number, mobile_number, representative_name, email FROM applications WHERE id = ? LIMIT 1',
      [applicationId]
    )

    const application = rows[0]

    if (!application) return

    const destination = `+91${application.mobile_number}`
    const userName = application.representative_name

    // A free category has no payment to confirm — only the application confirmation.
    // Registration fee confirmation uses its own dedicated template
    // (AISENSY_CAMPAIGN_PAYMENT_CONFIRMATION = gita_mahotsav_payment_confirmation),
    // distinct from the allotment/auction payment confirmation template — do
    // NOT fall back to AISENSY_ALLOTMENT_PAYMENT_CONFIRMATION here, that is
    // the allotment-specific one (see notifyAllotmentPaymentSuccess below).
    if (amountPaise > 0) {
      await sendNotification({
        category: 'payment_confirmation',
        campaignOverride: process.env.AISENSY_CAMPAIGN_PAYMENT_CONFIRMATION || undefined,
        destination,
        userName,
        templateParams: [userName, application.application_number, String(amountPaise / 100)],
        applicationId,
        email: application.email
      })
    }

    await sendNotification({
      category: 'application_confirmation',
      destination,
      userName,
      templateParams: [userName, application.application_number],
      applicationId,
      email: application.email
    })
  } catch (error) {
    logServerError('notifications.payment-success', error, { applicationId })
  }
}

/**
 * Sends notifications once an allotment payment ('pay_now') is successfully confirmed:
 * 1. Payment confirmation notification with the paid amount.
 * 2. Status update notification moving status to 'allotted'.
 */
export async function notifyAllotmentPaymentSuccess(applicationId: number, amountPaise: number): Promise<void> {
  try {
    const rows = await query<Array<{ application_number: string; mobile_number: string; representative_name: string; email: string }>>(
      'SELECT application_number, mobile_number, representative_name, email FROM applications WHERE id = ? LIMIT 1',
      [applicationId]
    )

    const application = rows[0]

    if (!application) return

    const destination = `+91${application.mobile_number}`
    const userName = application.representative_name

    if (amountPaise > 0) {
      await sendNotification({
        category: 'payment_confirmation',
        campaignOverride:
          process.env.AISENSY_ALLOTMENT_PAYMENT_CONFIRMATION ||
          process.env.AISENSY_CAMPAIGN_PAYMENT_CONFIRMATION ||
          undefined,
        destination,
        userName,
        templateParams: [userName, application.application_number, String(amountPaise / 100)],
        applicationId,
        email: application.email
      })
    }

    await notifyApplicationStatusChange({
      applicationId,
      applicationNumber: application.application_number,
      mobileNumber: application.mobile_number,
      representativeName: application.representative_name,
      email: application.email,
      newStatus: 'allotted'
    })
  } catch (error) {
    logServerError('notifications.allotment-payment-success', error, { applicationId })
  }
}

/**
 * Sends notifications once an Auction Participation Fee ('auction_fee') is
 * confirmed: payment confirmation + a status update to 'auction_fee_paid'
 * (NOT 'allotted' — a stall is only reserved later, when the admin uploads
 * the physical auction's results).
 */
export async function notifyAuctionFeePaymentSuccess(applicationId: number, amountPaise: number): Promise<void> {
  try {
    const rows = await query<Array<{ application_number: string; mobile_number: string; representative_name: string; email: string }>>(
      'SELECT application_number, mobile_number, representative_name, email FROM applications WHERE id = ? LIMIT 1',
      [applicationId]
    )

    const application = rows[0]

    if (!application) return

    const destination = `+91${application.mobile_number}`
    const userName = application.representative_name

    if (amountPaise > 0) {
      await sendNotification({
        category: 'payment_confirmation',

        // Dedicated template (gita_mahotsav_auction_payment_success,
        // 2026-11-17) — distinct from the generic allotment payment
        // confirmation, since this one must say the participation fee (not
        // a final stall amount) was paid. Not yet approved in AiSensy/Meta
        // at integration time, so it falls back to the generic payment
        // confirmation campaign until AISENSY_CAMPAIGN_AUCTION_PAYMENT_SUCCESS
        // is set and live.
        campaignOverride:
          process.env.AISENSY_CAMPAIGN_AUCTION_PAYMENT_SUCCESS ||
          process.env.AISENSY_ALLOTMENT_PAYMENT_CONFIRMATION ||
          process.env.AISENSY_CAMPAIGN_PAYMENT_CONFIRMATION ||
          undefined,
        destination,
        userName,
        templateParams: [userName, application.application_number, String(amountPaise / 100)],
        applicationId,
        email: application.email
      })
    }

    await notifyApplicationStatusChange({
      applicationId,
      applicationNumber: application.application_number,
      mobileNumber: application.mobile_number,
      representativeName: application.representative_name,
      email: application.email,
      newStatus: 'auction_fee_paid'
    })
  } catch (error) {
    logServerError('notifications.auction-fee-payment-success', error, { applicationId })
  }
}
