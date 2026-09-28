import { createHash } from 'node:crypto'

import { NextResponse } from 'next/server'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { getDocumentDefinitionsForCategory } from '@/lib/applications/categories'
import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
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
}

/**
 * Uploads one document for an in-progress application. Ownership is proven
 * by the same access token issued at application creation (interim
 * mechanism, pre-OTP — see .ai/DECISIONS.md), passed as a bearer token, not
 * a query string (avoids landing in server/proxy access logs — see
 * .ai/SECURITY.md "no sensitive information in logs").
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

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0')

  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large.' }, { status: 413 })
  }

  try {
    const rows = await query<ApplicationRow[]>(
      `SELECT id, category_id, access_token_hash, status FROM applications WHERE id = ? LIMIT 1`,
      [applicationId]
    )

    const application = rows[0]

    // Identical response whether the application doesn't exist or the token
    // is wrong — avoids confirming application-id existence to a guesser.
    if (!application || !verifyAccessToken(accessToken, application.access_token_hash)) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    if (application.status !== 'draft' && application.status !== 'payment_pending') {
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
         verified_at = NULL`,
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

    await logAudit({
      actorUserId: null,
      actorRoleKey: null,
      action: 'document.uploaded',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId),
      newValue: { documentKey, mimeType: detectedType, sizeBytes: buffer.length },
      ipAddress
    })

    return NextResponse.json({ documentKey, status: 'uploaded', originalFilename: file.name }, { status: 201 })
  } catch (error) {
    logServerError('api.applications.documents.upload', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
