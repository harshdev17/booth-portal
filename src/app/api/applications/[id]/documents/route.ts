import { createHash } from 'node:crypto'

import { NextResponse } from 'next/server'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { getDocumentDefinitionsForCategory } from '@/lib/applications/categories'
import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { hasRecentVerifiedOtp } from '@/lib/notifications/otp'
import { detectFileType, isAllowedDetectedType } from '@/lib/uploads/file-signature'
import { generateStoragePath, storeFile } from '@/lib/uploads/storage'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

// Hard ceiling independent of any per-document-definition max, so an
// oversized request is rejected before it is even fully buffered.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB

const EXTENSION_BY_MIME: Record<string, 'pdf' | 'jpg' | 'png'> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png'
}

type ApplicationRow = {
  id: number
  category_id: number
  access_token_hash: string
  status: string
  mobile_number: string
}

/**
 * Uploads one document for an in-progress application. Two ownership proofs
 * are accepted: (1) the access token issued at application creation
 * (bearer token, not a query string — avoids landing in server/proxy access
 * logs, see .ai/SECURITY.md), used by the original apply flow before
 * submission; (2) for the post-submission query-response case reached from
 * the public status page (which no longer collects an access token — see
 * .ai/DECISIONS.md and the OTP-only status lookup), a recently-verified
 * WhatsApp OTP for that application's own mobile number is sufficient —
 * the OTP itself is the real ownership proof there.
 *
 * File content is validated by magic bytes, never by the client-supplied
 * filename or Content-Type header (see src/lib/uploads/file-signature.ts).
 * Storage uses a random server-generated filename outside the web root
 * (see src/lib/uploads/storage.ts) — never the original filename, never a
 * user-controlled path.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ipAddress } = getRequestMeta(request)
  const rateLimitKey = ipAddress ?? 'unknown'

  if (isRateLimited('applications.documents.upload', rateLimitKey, RATE_LIMITS.documentUpload)) {
    return NextResponse.json({ error: 'Too many uploads. Please try again shortly.' }, { status: 429 })
  }

  const { id } = await params
  const applicationId = Number(id)

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: 'Invalid application.' }, { status: 400 })
  }

  const authHeader = request.headers.get('authorization')
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  const contentLength = Number(request.headers.get('content-length') ?? '0')

  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large.' }, { status: 413 })
  }

  try {
    const rows = await query<ApplicationRow[]>(
      `SELECT id, category_id, access_token_hash, status, mobile_number FROM applications WHERE id = ? LIMIT 1`,
      [applicationId]
    )

    const application = rows[0]

    if (!application) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    // 'query_raised' is still the review stage — it is exactly the state in which
    // the applicant is expected to respond to a reviewer's query.
    const isUnderReviewNow = application.status === 'under_review' || application.status === 'query_raised'

    const tokenValid = accessToken ? verifyAccessToken(accessToken, application.access_token_hash) : false
    const otpValid = !tokenValid && isUnderReviewNow && (await hasRecentVerifiedOtp(`+91${application.mobile_number}`, 'status_lookup', 20))

    // Identical response whether the application doesn't exist or neither
    // proof holds — avoids confirming application-id existence to a guesser.
    if (!tokenValid && !otpValid) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const isPreSubmission = application.status === 'draft' || application.status === 'payment_pending'
    const isUnderReview = isUnderReviewNow

    if (!isPreSubmission && !isUnderReview) {
      return NextResponse.json({ error: 'This application can no longer accept document uploads.' }, { status: 409 })
    }

    const formData = await request.formData()
    const documentKey = formData.get('documentKey')
    const file = formData.get('file')

    if (typeof documentKey !== 'string' || !(file instanceof File)) {
      return NextResponse.json({ error: 'Malformed upload.' }, { status: 400 })
    }

    const documentDefinitions = await getDocumentDefinitionsForCategory(application.category_id)
    const definition = documentDefinitions.find(d => d.document_key === documentKey)

    if (!definition) {
      return NextResponse.json({ error: 'Unknown document type for this category.' }, { status: 400 })
    }

    // Once submitted, a document can only be replaced in direct response to a
    // reviewer's query — never to silently overwrite one still pending review
    // or already verified. See .ai/DOCUMENT_VERIFICATION.md Section 5.
    let isQueryResponse = false

    if (isUnderReview) {
      const existingRows = await query<Array<{ verification_status: string }>>(
        'SELECT verification_status FROM application_documents WHERE application_id = ? AND document_definition_id = ?',
        [applicationId, definition.id]
      )

      const existingStatus = existingRows[0]?.verification_status

      if (existingStatus !== 'query') {
        return NextResponse.json(
          { error: 'This document is not awaiting your response and cannot be replaced.' },
          { status: 409 }
        )
      }

      isQueryResponse = true
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
         reuploaded_at = ${isQueryResponse ? 'NOW()' : 'reuploaded_at'}`,
      [
        applicationId,
        definition.id,

        // Stored for display only — never used to construct a filesystem
        // path. Truncated defensively even though the column itself caps length.
        file.name.slice(0, 255),
        storagePath,
        detectedType,
        buffer.length,
        contentHash
      ]
    )

    // Last open query answered -> the application goes back to plain
    // "Under Review" so the reviewer sees it is ready for another look.
    if (isQueryResponse) {
      const [open] = await query<Array<{ n: number }>>(
        `SELECT COUNT(*) AS n FROM application_documents WHERE application_id = ? AND verification_status = 'query'`,
        [applicationId]
      )

      if (Number(open.n) === 0) {
        await query(`UPDATE applications SET status = 'under_review' WHERE id = ? AND status = 'query_raised'`, [applicationId])
      }
    }

    await logAudit({
      actorUserId: null,
      actorRoleKey: null,
      action: isQueryResponse ? 'document.reuploaded' : 'document.uploaded',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId),
      newValue: { documentKey, mimeType: detectedType, sizeBytes: buffer.length },
      ipAddress
    })

    // INSERT ... ON DUPLICATE KEY UPDATE doesn't reliably hand back the row
    // id via insertId on the update path across drivers — a follow-up
    // lookup by the unique (application_id, document_definition_id) key is
    // the simple, reliable way to get it. Needed so the frontend can link
    // straight to /api/documents/[id]/preview right after upload.
    const [insertedDoc] = await query<Array<{ id: number }>>(
      `SELECT id FROM application_documents WHERE application_id = ? AND document_definition_id = ? LIMIT 1`,
      [applicationId, definition.id]
    )

    return NextResponse.json(
      { documentKey, documentId: insertedDoc.id, status: 'uploaded', originalFilename: file.name },
      { status: 201 }
    )
  } catch (error) {
    logServerError('api.applications.documents.upload', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
