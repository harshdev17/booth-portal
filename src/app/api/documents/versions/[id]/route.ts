import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { getCurrentUserPermissions } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { readStoredFile } from '@/lib/uploads/storage'

type DocumentVersionRow = {
  storage_path: string
  mime_type: string
  original_filename: string
  application_status: string
}

/**
 * Serves a SUPERSEDED document version's file (the file an applicant
 * uploaded before a later re-upload replaced it — see migration 0077,
 * src/app/api/applications/[id]/documents/route.ts). Admin-only, unlike
 * the current-version route (/api/documents/[id]/preview), which also
 * accepts an applicant's own bearer token — an applicant has no reason to
 * see their own old rejected/replaced upload, only admins reviewing
 * history need this.
 *
 * [id] is application_document_versions.id, joined through to its parent
 * application_documents row so authorization is checked against the SAME
 * application the current document belongs to — never trusts that a
 * version id alone implies access.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const versionId = Number(id)

  if (!Number.isInteger(versionId) || versionId <= 0) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  try {
    const rows = await query<DocumentVersionRow[]>(
      `SELECT adv.storage_path, adv.mime_type, adv.original_filename, a.status AS application_status
       FROM application_document_versions adv
       JOIN application_documents doc ON doc.id = adv.application_document_id
       JOIN applications a ON a.id = doc.application_id
       WHERE adv.id = ?
       LIMIT 1`,
      [versionId]
    )

    const version = rows[0]

    if (!version) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    const permissions = await getCurrentUserPermissions()
    const isAllottedForPolice = ['selected', 'allotted', 're_allotted'].includes(version.application_status)

    const isAuthorized =
      !!permissions &&
      (permissions.has('document:verify') ||
        permissions.has('document:view') ||
        permissions.has('application:view') ||
        (permissions.has('police:view') && isAllottedForPolice))

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'document.version_previewed',
      module: 'documents',
      entityType: 'application_document_version',
      entityId: String(versionId),
      newValue: { filename: version.original_filename }
    })

    const fileBuffer = await readStoredFile(version.storage_path)

    const { searchParams } = new URL(request.url)
    const disposition = searchParams.get('download') === 'true' ? 'attachment' : 'inline'

    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': version.mime_type,
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(version.original_filename)}"`,
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (error) {
    logServerError('api.documents.versions.preview', error, { versionId })

    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
