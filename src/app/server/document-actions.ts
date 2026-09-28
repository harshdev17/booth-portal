'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
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

  const rows = await query<Array<{ verification_status: string; application_id: number; original_filename: string }>>(
    'SELECT verification_status, application_id, original_filename FROM application_documents WHERE id = ?',
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

  revalidatePath('/admin/documents')
  revalidatePath(`/admin/applications/${current.application_id}`)

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
