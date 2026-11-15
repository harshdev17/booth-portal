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
  email?: string | null
  representativeName: string
  documentLabel: string
  remarks: string
}): Promise<void> {
  await sendNotification({
    category: 'document_query',
    destination: params.mobileNumber.startsWith('+') ? params.mobileNumber : `+91${params.mobileNumber}`,
    userName: params.representativeName,

    // Approved AiSensy template (gita_mahotsav_document_query) has exactly 3
    // placeholders: {{1}} name, {{2}} application number, {{3}} the query
    // text — document label and remarks are combined into {{3}} since the
    // template has no separate slot for the document name.
    templateParams: [params.representativeName, params.applicationNumber, `${params.documentLabel}: ${params.remarks}`],
    applicationId: params.applicationId,
    email: params.email
  })
}

/**
 * Sends ONE notification covering every field queried in a single
 * multi-select "Raise Query on Multiple Fields" action, instead of one
 * notification per field — per explicit request. Reuses the same
 * 'document_query' category/template as notifyDocumentQuery() (same
 * approved AiSensy template, 3 placeholders), since this is the same kind
 * of "something needs correcting" message, just covering more than one
 * item. A single-field call produces the exact same {{3}} text
 * notifyDocumentQuery() would have ("<label>: <remarks>") — no numbering
 * noise for the common one-field case; numbering only appears once there's
 * more than one field in the same notification.
 */
export async function notifyFieldQueries(params: {
  applicationId: number
  applicationNumber: string
  mobileNumber: string
  email?: string | null
  representativeName: string
  remarks?: string
  fields?: Array<{ label: string; remarks: string }>
}): Promise<void> {
  // Use the admin's remarks directly without field name prefixes, per user request.
  // Meta/AiSensy template variables reject raw newline characters (\n) — replace with spaces.
  const rawQuery = params.remarks?.trim() || params.fields?.[0]?.remarks?.trim() || ''
  const queryText = rawQuery.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()

  await sendNotification({
    category: 'document_query',
    campaignOverride: process.env.AISENSY_CAMPAIGN_APPLICATION_FIELD_QUERY || 'igm_application_field_query',
    destination: params.mobileNumber.startsWith('+') ? params.mobileNumber : `+91${params.mobileNumber}`,
    userName: params.representativeName,
    templateParams: [params.representativeName, params.applicationNumber, queryText],
    applicationId: params.applicationId,
    email: params.email
  })
}
