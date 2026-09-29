import 'server-only'

import { sendNotification } from '@/lib/notifications/service'

/**
 * Sends a WhatsApp notification when a reviewer raises a query on an
 * applicant's document, per .ai/DOCUMENT_VERIFICATION.md Section 5 ("the
 * applicant must be notified"). Mirrors notifyApplicationStatusChange's
 * shape — never throws, a notification failure must not block the query
 * action that triggered it (failures land in notification_log via
 * sendNotification() for operational follow-up).
 */
export async function notifyDocumentQuery(params: {
  applicationId: number
  applicationNumber: string
  mobileNumber: string
  representativeName: string
  documentLabel: string
  remarks: string
}): Promise<void> {
  await sendNotification({
    category: 'document_query',
    destination: params.mobileNumber.startsWith('+') ? params.mobileNumber : `+91${params.mobileNumber}`,
    userName: params.representativeName,
    templateParams: [params.representativeName, params.applicationNumber, params.documentLabel, params.remarks],
    applicationId: params.applicationId
  })
}
