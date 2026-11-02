import { createHash } from 'node:crypto'

import { NextResponse } from 'next/server'

import { getDocumentDefinitionsForCategory } from '@/lib/applications/categories'
import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { detectFileType, isAllowedDetectedType } from '@/lib/uploads/file-signature'
import { generateStoragePath, storeFile } from '@/lib/uploads/storage'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { decodeId } from '@/lib/security/opaque-id'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB — same ceiling as the applicant-facing upload route

const EXTENSION_BY_MIME: Record<string, 'pdf' | 'jpg' | 'png'> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png'
}

type ApplicationRow = { id: number; category_id: number }

/**
 * Lets an authorized admin (application:edit) upload/replace a document on
 * an applicant's behalf — e.g. the applicant can't manage it themselves and
 * calls/emails the office directly — per explicit request (2026-11-03).
 * Deliberately a separate route from the applicant-facing
 * POST /api/applications/[id]/documents rather than adding an admin-session
 * branch to it: that route's authorization (access token / OTP) is a
 * delicate, already-shipped security boundary for the public apply/status
 * flows, and keeping this admin path entirely separate means neither can
 * accidentally weaken the other.
 *
 * No "must already be in query_raised" gate, unlike the applicant's own
 * route — an admin acting on the applicant's behalf is trusted to upload
 * whatever document needs uploading/replacing regardless of the
 * application's current review state, the same way they're already trusted
 * to verify/reject/query a document outright.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('application:edit')
  const { ipAddress } = getRequestMeta(request)

  const { id } = await params
  const applicationId = decodeId(id)

  if (applicationId === null) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0')

  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large.' }, { status: 413 })
  }

  try {
    const rows = await query<ApplicationRow[]>(`SELECT id, category_id FROM applications WHERE id = ? LIMIT 1`, [
      applicationId
    ])

    const application = rows[0]

    if (!application) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    const formData = await request.formData().catch(() => null)
    const documentKey = formData?.get('documentKey')
    const file = formData?.get('file')

    if (typeof documentKey !== 'string' || !(file instanceof File)) {
      return NextResponse.json({ error: 'Malformed upload.' }, { status: 400 })
    }

    const documentDefinitions = await getDocumentDefinitionsForCategory(application.category_id)
    const definition = documentDefinitions.find(d => d.document_key === documentKey)

    if (!definition) {
      return NextResponse.json({ error: 'Unknown document type for this category.' }, { status: 400 })
    }

    if (file.size > definition.max_size_bytes) {
      const maxMb = Math.round(definition.max_size_bytes / (1024 * 1024))

      return NextResponse.json(
        { error: `File size exceeds the allowed limit of ${maxMb} MB. Please upload a smaller file.` },
        { status: 413 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const detectedType = detectFileType(buffer)
    const allowedTypes = definition.allowed_mime_types.split(',')

    if (!isAllowedDetectedType(detectedType, allowedTypes)) {
      return NextResponse.json(
        { error: 'The uploaded file does not match an allowed document type (PDF, JPG, or PNG).' },
        { status: 400 }
      )
    }

    const extension = EXTENSION_BY_MIME[detectedType]
    const storagePath = generateStoragePath(applicationId, extension)
    const contentHash = createHash('sha256').update(buffer).digest('hex')

    await storeFile(storagePath, buffer)

    // Uploading as an admin resets verification to 'pending' just like a
    // normal applicant re-upload — a freshly placed file always needs a
    // fresh look, never silently inherits a prior 'verified'/'query' state.
    await query(
      `INSERT INTO application_documents
         (application_id, document_definition_id, original_filename, storage_path, mime_type, size_bytes, content_sha256)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         original_filename = VALUES(original_filename),
         storage_path = VALUES(storage_path),
         mime_type = VALUES(mime_type),
         size_bytes = VALUES(size_bytes),
         content_sha256 = VALUES(content_sha256),
         verification_status = 'pending',
         verification_remarks = NULL,
         verified_by_user_id = NULL,
         verified_at = NULL,
         reuploaded_at = NOW()`,
      [applicationId, definition.id, file.name.slice(0, 255), storagePath, detectedType, buffer.length, contentHash]
    )

    const [insertedDoc] = await query<Array<{ id: number }>>(
      `SELECT id FROM application_documents WHERE application_id = ? AND document_definition_id = ? LIMIT 1`,
      [applicationId, definition.id]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'document.uploaded_by_admin',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId),
      newValue: { documentKey, mimeType: detectedType, sizeBytes: buffer.length, filename: file.name },
      ipAddress
    })

    return NextResponse.json({
      documentKey,
      documentId: insertedDoc.id,
      status: 'uploaded',
      originalFilename: file.name
    })
  } catch (error) {
    logServerError('api.admin.applications.documents', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
