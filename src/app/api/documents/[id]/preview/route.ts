import { NextResponse } from 'next/server'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { getSession } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { getCurrentUserPermissions } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { readStoredFile } from '@/lib/uploads/storage'

type DocumentRow = {
  id: number
  application_id: number
  storage_path: string
  mime_type: string
  original_filename: string
  access_token_hash: string
}

/**
 * Serves the actual bytes of one uploaded document — nothing in this
 * codebase could do this before (confirmed: readStoredFile() in storage.ts
 * had no caller anywhere), so neither the applicant nor an admin could ever
 * see what was actually inside a file they'd uploaded/were reviewing, only
 * its filename and verification status.
 *
 * Two independent ownership proofs are accepted, reusing exactly the checks
 * that already exist elsewhere rather than inventing a third:
 * (1) the applicant's own bearer access token for that application (same
 *     token used to upload the file in the first place — verifyAccessToken,
 *     see documents/route.ts's POST handler);
 * (2) an authenticated admin session with `document:verify` OR
 *     `application:view` (whichever this document's application would be
 *     reachable through in the admin panel) — every preview by an admin is
 *     audit-logged, matching the "view sensitive applicant data" pattern
 *     used elsewhere (e.g. unmasked Razorpay ids on /admin/payments).
 *
 * Deliberately returns the SAME generic 404 whether the document does not
 * exist or the caller simply isn't authorized for it — never reveals which
 * document ids exist to an unauthorized caller.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const documentId = Number(id)

  if (!Number.isInteger(documentId) || documentId <= 0) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  try {
    const rows = await query<DocumentRow[]>(
      `SELECT doc.id, doc.application_id, doc.storage_path, doc.mime_type, doc.original_filename,
              a.access_token_hash
       FROM application_documents doc
       JOIN applications a ON a.id = doc.application_id
       WHERE doc.id = ?
       LIMIT 1`,
      [documentId]
    )

    const document = rows[0]

    if (!document) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

    const ownsViaBearerToken = !!bearerToken && verifyAccessToken(bearerToken, document.access_token_hash)

    let isAuthorizedAdmin = false

    if (!ownsViaBearerToken) {
      const session = await getSession()

      if (session) {
        const permissions = await getCurrentUserPermissions()

        isAuthorizedAdmin = !!permissions && (permissions.has('document:verify') || permissions.has('application:view'))

        if (isAuthorizedAdmin) {
          await logAudit({
            actorUserId: session.userId,
            actorRoleKey: session.role.key,
            action: 'document.previewed',
            module: 'documents',
            entityType: 'application_document',
            entityId: String(documentId),
            newValue: { applicationId: document.application_id, filename: document.original_filename }
          })
        }
      }
    }

    if (!ownsViaBearerToken && !isAuthorizedAdmin) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    const fileBuffer = await readStoredFile(document.storage_path)

    // inline (not attachment): opens in the browser's own PDF/image viewer
    // rather than forcing a download, for a preview.
    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': document.mime_type,
        'Content-Disposition': `inline; filename="${encodeURIComponent(document.original_filename)}"`,
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (error) {
    logServerError('api.documents.preview', error, { documentId })

    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
