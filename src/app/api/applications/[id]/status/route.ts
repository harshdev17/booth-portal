import { NextResponse } from 'next/server'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'

type StatusRow = {
  id: number
  status: string
  access_token_hash: string
  category_name: string
  category_name_hi: string | null
  category_slug: string
  fee_paise: number | null
  fee_base_paise: number | null
  gst_percent: number | string | null
  allotment_payment_enabled: number
  allotment_amount_paise: number | null
  allotment_payment_deadline_at: string | Date | null
  submitted_at: string | null
  stall_number: string | null
  allotment_payment_status: string | null
  allotment_payment_amount_paise: number | null
  allotment_paid_at: string | null
}

/**
 * Re-fetches the same status payload POST /api/applications/status returns,
 * by the access token issued on that call — for the public /status page to
 * survive a refresh without re-sending an OTP. Deliberately does NOT
 * reissue a fresh access_token_hash (unlike the OTP-verified POST route):
 * this is a read-only re-fetch of an already-granted session, not a new
 * grant, so the same token keeps working for the window the client holds
 * onto it (status/index.tsx caps that at 5 minutes client-side — see
 * access-session.ts's doc comment on sessionStorage being a UX mechanism,
 * not the security boundary; the server-side check here is the real one).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const applicationId = Number(id)

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: 'Invalid application.' }, { status: 400 })
  }

  const authHeader = request.headers.get('authorization')
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
  }

  try {
    const rows = await query<StatusRow[]>(
      `SELECT a.id, a.status, a.access_token_hash,
              c.name AS category_name, c.name_hi AS category_name_hi, c.slug AS category_slug,
              c.fee_paise, c.fee_base_paise, c.gst_percent,
              c.allotment_payment_enabled, c.allotment_amount_paise, c.allotment_payment_deadline_at,
              a.submitted_at,
              COALESCE(su.stall_number, da_su.stall_number) AS stall_number,
              COALESCE(allotment_payment.status, da.payment_status) AS allotment_payment_status,
              COALESCE(allotment_payment.amount_paise, da.payment_amount_paise) AS allotment_payment_amount_paise,
              (SELECT pt.created_at FROM payment_transactions pt
                WHERE pt.payment_id = allotment_payment.id AND pt.type IN ('checkout_success', 'webhook_confirmed')
                ORDER BY pt.created_at DESC LIMIT 1) AS allotment_paid_at
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
       LEFT JOIN payments allotment_payment
         ON allotment_payment.application_id = a.id AND allotment_payment.purpose = 'pay_now'
       LEFT JOIN direct_allotments da ON da.application_id = a.id AND da.status = 'active'
       LEFT JOIN shop_units da_su ON da_su.id = da.shop_unit_id
       WHERE a.id = ?
       LIMIT 1`,
      [applicationId]
    )

    const application = rows[0]

    // Same generic 401 whether the application doesn't exist or the token
    // doesn't match — never confirms an application id exists to a guesser.
    if (!application || !verifyAccessToken(accessToken, application.access_token_hash)) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const documents = await query<
      Array<{
        documentId: number | null
        documentKey: string
        label: string
        labelHi: string | null
        isRequired: number
        allowedMimeTypes: string
        maxSizeBytes: number
        verificationStatus: string
        verificationRemarks: string | null
        originalFilename: string | null
      }>
    >(
      `SELECT ad.id AS documentId, cdd.document_key AS documentKey, cdd.label, cdd.label_hi AS labelHi,
              cdd.is_required AS isRequired, cdd.allowed_mime_types AS allowedMimeTypes, cdd.max_size_bytes AS maxSizeBytes,
              ad.verification_status AS verificationStatus,
              ad.verification_remarks AS verificationRemarks, ad.original_filename AS originalFilename
       FROM category_document_definitions cdd
       LEFT JOIN application_documents ad
         ON ad.document_definition_id = cdd.id AND ad.application_id = ?
       WHERE cdd.category_id = (SELECT category_id FROM applications WHERE id = ?) AND cdd.status = 'active'
       ORDER BY cdd.display_order ASC`,
      [application.id, application.id]
    )

    // See POST /api/applications/status's identical query for why this
    // exists — full query history (application-level and document-level),
    // not just the latest one.
    const queryHistory = await query<
      Array<{
        documentLabel: string | null
        remarks: string
        createdAt: string
      }>
    >(
      `(SELECT NULL AS documentLabel, JSON_UNQUOTE(JSON_EXTRACT(al.new_value, '$.remarks')) AS remarks, al.created_at AS createdAt
        FROM audit_logs al
        WHERE al.entity_type = 'application' AND al.entity_id = ? AND al.action = 'application.query_raised')
       UNION ALL
       (SELECT cdd.label AS documentLabel, JSON_UNQUOTE(JSON_EXTRACT(al.new_value, '$.remarks')) AS remarks, al.created_at AS createdAt
        FROM audit_logs al
        JOIN application_documents ad ON ad.id = al.entity_id
        JOIN category_document_definitions cdd ON cdd.id = ad.document_definition_id
        WHERE al.entity_type = 'application_document' AND al.action = 'document.query' AND ad.application_id = ?)
       ORDER BY createdAt DESC`,
      [String(application.id), application.id]
    )

    return NextResponse.json({
      applicationId: application.id,
      accessToken,
      status: application.status,
      applicationQueryRemarks: queryHistory.find(q => q.documentLabel === null)?.remarks ?? null,
      queryHistory,
      stallNumber: application.stall_number ?? null,
      allotmentPaymentEnabled: Boolean(application.allotment_payment_enabled),
      allotmentAmountPaise: application.allotment_payment_amount_paise ?? application.allotment_amount_paise ?? null,
      allotmentPaymentDeadlineAt: application.allotment_payment_deadline_at ?? null,
      allotmentPaymentStatus: application.allotment_payment_status ?? null,
      allotmentPaidAt: application.allotment_paid_at ?? null,
      categoryName: application.category_name,
      categoryNameHi: application.category_name_hi,
      categorySlug: application.category_slug,
      feePaise: application.fee_paise,
      feeBasePaise: application.fee_base_paise,
      gstPercent: application.gst_percent ? Number(application.gst_percent) : null,
      submittedAt: application.submitted_at,
      documents
    })
  } catch (error) {
    logServerError('api.applications.status.refresh', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
