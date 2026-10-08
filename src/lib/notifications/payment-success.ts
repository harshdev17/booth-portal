import 'server-only'

import { query } from '@/lib/db/client'
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
    const rows = await query<Array<{ application_number: string; mobile_number: string; representative_name: string }>>(
      'SELECT application_number, mobile_number, representative_name FROM applications WHERE id = ? LIMIT 1',
      [applicationId]
    )

    const application = rows[0]

    if (!application) return

    const destination = `+91${application.mobile_number}`
    const userName = application.representative_name

    await sendNotification({
      category: 'payment_confirmation',
      destination,
      userName,
      templateParams: [userName, application.application_number, String(amountPaise / 100)],
      applicationId
    })

    await sendNotification({
      category: 'application_confirmation',
      destination,
      userName,
      templateParams: [userName, application.application_number],
      applicationId
    })
  } catch (error) {
    logServerError('notifications.payment-success', error, { applicationId })
  }
}
