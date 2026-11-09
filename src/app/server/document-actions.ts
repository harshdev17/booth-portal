'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { notifyDocumentQuery } from '@/lib/notifications/document-query'
import { requirePermission } from '@/lib/rbac/authorize'

export type DocumentActionState = {
  error?: string
  success?: string
}

const decisionSchema = z.object({
  documentId: z.coerce.number().int().positive(),
  remarks: z.string().trim().max(512).optional()
})

/**
 * Verification decision on a single uploaded document. Valid target states
 * per the `application_documents.verification_status` ENUM (verified /
 * rejected / query) — see .ai/DOCUMENT_VERIFICATION.md. Every decision is
 * audit-logged, and 'rejected'/'query' require a remark so the applicant
 * (and any future reviewer) knows what's wrong.
 */
async function decideDocument(
  _prevState: DocumentActionState,
  formData: FormData,
  toStatus: 'verified' | 'rejected' | 'query'
): Promise<DocumentActionState> {
  const parsed = decisionSchema.safeParse({
    documentId: formData.get('documentId'),
    remarks: formData.get('remarks') || undefined
  })

  if (!parsed.success) {
    return { error: 'Invalid request.' }
  }

  if (toStatus !== 'verified' && !parsed.data.remarks) {
    return { error: 'A remark is required to reject or query a document.' }
  }

  const session = await requirePermission('document:verify')

  const rows = await query<
    Array<{
      verification_status: string
      application_id: number
      original_filename: string
      document_label: string
      application_number: string
      mobile_number: string
      email: string
      representative_name: string
    }>
  >(
    `SELECT ad.verification_status, ad.application_id, ad.original_filename, cdd.label AS document_label,
            a.application_number, a.mobile_number, a.email, a.representative_name
     FROM application_documents ad
     JOIN category_document_definitions cdd ON cdd.id = ad.document_definition_id
     JOIN applications a ON a.id = ad.application_id
     WHERE ad.id = ?`,
    [parsed.data.documentId]
  )

  const current = rows[0]

  if (!current) {
    return { error: 'Document not found.' }
  }

  await query(
    `UPDATE application_documents
     SET verification_status = ?, verification_remarks = ?, verified_by_user_id = ?, verified_at = NOW()
     WHERE id = ?`,
    [toStatus, parsed.data.remarks ?? null, session.userId, parsed.data.documentId]
  )

  await logAudit({
    actorUserId: session.userId,
    actorRoleKey: session.role.key,
    action: `document.${toStatus}`,
    module: 'documents',
    entityType: 'application_document',
    entityId: String(parsed.data.documentId),
    previousValue: { verification_status: current.verification_status },
    newValue: { verification_status: toStatus, remarks: parsed.data.remarks ?? null, filename: current.original_filename }
  })

  // Keep the application's own status in step with its documents: an open
  // query puts it in 'query_raised'; once none remain it returns to
  // 'under_review'. Only these two review-stage statuses are ever touched.
  if (toStatus === 'query') {
    await query(`UPDATE applications SET status = 'query_raised' WHERE id = ? AND status IN ('under_review', 'payment_success')`, [
      current.application_id
    ])
  } else {
    const [open] = await query<Array<{ n: number }>>(
      `SELECT COUNT(*) AS n FROM application_documents WHERE application_id = ? AND verification_status = 'query'`,
      [current.application_id]
    )

    if (Number(open.n) === 0) {
      await query(`UPDATE applications SET status = 'under_review' WHERE id = ? AND status = 'query_raised'`, [
        current.application_id
      ])
    }
  }

  // Application ids in the URL are now opaque, randomly-reencrypted tokens
  // (see src/lib/security/opaque-id.ts) — encodeId() never reproduces the
  // exact token currently in the admin's address bar, so a path-specific
  // revalidatePath() can't target it. Not needed anyway: the application
  // detail page is an uncached server component that queries the DB fresh
  // on every request.
  revalidatePath('/admin/documents')

  if (toStatus === 'query') {
    // Never let a notification failure block the query action itself —
    // notifyDocumentQuery already swallows send errors (see its own doc comment).
    await notifyDocumentQuery({
      applicationId: current.application_id,
      applicationNumber: current.application_number,
      mobileNumber: current.mobile_number,
      email: current.email,
      representativeName: current.representative_name,
      documentLabel: current.document_label,
      remarks: parsed.data.remarks ?? ''
    })
  }

  const labels: Record<typeof toStatus, string> = {
    verified: 'Document verified.',
    rejected: 'Document rejected.',
    query: 'Query raised on document.'
  }

  return { success: labels[toStatus] }
}

export async function verifyDocumentAction(
  prevState: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  return decideDocument(prevState, formData, 'verified')
}

export async function rejectDocumentAction(
  prevState: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  return decideDocument(prevState, formData, 'rejected')
}

export async function queryDocumentAction(
  prevState: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  return decideDocument(prevState, formData, 'query')
}

const verifyAllSchema = z.object({ applicationId: z.coerce.number().int().positive() })

/**
 * Verifies every uploaded document on an application in one step — per
 * explicit request, so an admin who's already checked all the documents
 * doesn't have to click "Verify" once per document. Only touches documents
 * NOT already verified (an already-verified doc is left alone, same as
 * clicking Verify on it individually would be a no-op); a document
 * currently under query is also left untouched — a bulk "approve all" must
 * never silently clear an open query the admin raised on purpose.
 */
export async function verifyAllDocumentsAction(
  _prevState: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  const parsed = verifyAllSchema.safeParse({ applicationId: formData.get('applicationId') })

  if (!parsed.success) {
    return { error: 'Invalid request.' }
  }

  const session = await requirePermission('document:verify')

  const rows = await query<Array<{ id: number; verification_status: string; original_filename: string }>>(
    `SELECT id, verification_status, original_filename FROM application_documents
     WHERE application_id = ? AND verification_status != 'verified' AND verification_status != 'query'`,
    [parsed.data.applicationId]
  )

  if (rows.length === 0) {
    return { success: 'Nothing to verify — every document is already verified (or has an open query).' }
  }

  const ids = rows.map(r => r.id)

  await query(
    `UPDATE application_documents
     SET verification_status = 'verified', verification_remarks = NULL, verified_by_user_id = ?, verified_at = NOW()
     WHERE id IN (${ids.map(() => '?').join(', ')})`,
    [session.userId, ...ids]
  )

  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'document.verified',
      module: 'documents',
      entityType: 'application_document',
      entityId: String(row.id),
      previousValue: { verification_status: row.verification_status },
      newValue: { verification_status: 'verified', filename: row.original_filename, bulk: true }
    })
  }

  revalidatePath('/admin/documents')

  return { success: `Verified ${rows.length} document${rows.length === 1 ? '' : 's'}.` }
}

const applicationQuerySchema = z.object({
  applicationId: z.coerce.number().int().positive(),
  remarks: z.string().trim().min(1, 'A remark is required.').max(512)
})

/**
 * Raises a query directly against an application rather than a specific
 * document — for the case where an application has no document rows at
 * all (e.g. backfilled/imported applications never went through the
 * upload flow) and the per-document RaiseQueryButton therefore has
 * nothing to attach to. Moves the application straight to 'query_raised'
 * and notifies the applicant the same way a document-level query does,
 * just without a document_definition_id to reference.
 */
export async function queryApplicationAction(
  _prevState: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  const parsed = applicationQuerySchema.safeParse({
    applicationId: formData.get('applicationId'),
    remarks: formData.get('remarks')
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  }

  const session = await requirePermission('document:verify')

  const rows = await query<
    Array<{
      status: string
      application_number: string
      mobile_number: string
      email: string
      representative_name: string
    }>
  >(
    `SELECT status, application_number, mobile_number, email, representative_name
     FROM applications WHERE id = ?`,
    [parsed.data.applicationId]
  )

  const current = rows[0]

  if (!current) {
    return { error: 'Application not found.' }
  }

  // query_raised is included so a reviewer can send a follow-up/second
  // query while one is already outstanding — the applicant hasn't
  // responded by re-uploading anything (there's nothing to upload), so
  // there's no other event that would move this application out of
  // query_raised on its own.
  if (!['under_review', 'payment_success', 'query_raised'].includes(current.status)) {
    return { error: `This application is "${current.status}" and cannot have a query raised against it.` }
  }

  await query(`UPDATE applications SET status = 'query_raised' WHERE id = ?`, [parsed.data.applicationId])

  await logAudit({
    actorUserId: session.userId,
    actorRoleKey: session.role.key,
    action: 'application.query_raised',
    module: 'applications',
    entityType: 'application',
    entityId: String(parsed.data.applicationId),
    previousValue: { status: current.status },
    newValue: { status: 'query_raised', remarks: parsed.data.remarks }
  })

  revalidatePath('/admin/documents')

  // Never let a notification failure block the query action itself —
  // notifyDocumentQuery already swallows send errors.
  await notifyDocumentQuery({
    applicationId: parsed.data.applicationId,
    applicationNumber: current.application_number,
    mobileNumber: current.mobile_number,
    email: current.email,
    representativeName: current.representative_name,
    documentLabel: 'Required Documents',
    remarks: parsed.data.remarks
  })

  return { success: 'Query raised on application.' }
}
