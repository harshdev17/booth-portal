import archiver from 'archiver'
import { NextResponse } from 'next/server'
import { PassThrough, Readable } from 'node:stream'

import { query } from '@/lib/db/client'
import { buildApplicationFormPdf } from '@/lib/applications/application-form-pdf'
import { logAudit } from '@/lib/audit/log'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'
import { readStoredFile } from '@/lib/uploads/storage'

type DocumentRow = {
  id: number
  label: string
  original_filename: string
  storage_path: string
}

/**
 * One ZIP containing the application form PDF plus every document the
 * applicant actually uploaded (category-required docs never uploaded are
 * simply absent, not an empty placeholder) — per explicit request, so an
 * admin doesn't have to download each file one at a time to get a single
 * application's complete record. File names inside the ZIP are prefixed
 * with each document's own label (not document_key) so the archive reads
 * the same way the admin panel's Documents tab already does.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('application:view')

  const { id } = await params
  const applicationId = decodeId(id) ?? (Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : null)

  if (applicationId === null) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  try {
    const applicationRows = await query<Array<{ application_number: string }>>(
      `SELECT application_number FROM applications WHERE id = ? LIMIT 1`,
      [applicationId]
    )

    const application = applicationRows[0]

    if (!application) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    const [formPdf, documentRows] = await Promise.all([
      buildApplicationFormPdf(applicationId),
      query<DocumentRow[]>(
        `SELECT ad.id, cdd.label, ad.original_filename, ad.storage_path
         FROM application_documents ad
         JOIN category_document_definitions cdd ON cdd.id = ad.document_definition_id
         WHERE ad.application_id = ?
         ORDER BY cdd.display_order ASC`,
        [applicationId]
      )
    ])

    if (!formPdf) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    const archive = archiver('zip', { zlib: { level: 9 } })
    const stream = new PassThrough()

    archive.on('error', err => {
      stream.destroy(err)
    })
    archive.pipe(stream)

    archive.append(formPdf.buffer, { name: `Application-${application.application_number}.pdf` })

    for (const doc of documentRows) {
      // eslint-disable-next-line no-await-in-loop
      const fileBuffer = await readStoredFile(doc.storage_path)
      const extension = doc.original_filename.includes('.') ? doc.original_filename.split('.').pop() : null
      const safeLabel = doc.label.replace(/[\\/:*?"<>|]/g, '-')
      const entryName = extension ? `${safeLabel}.${extension}` : safeLabel

      archive.append(fileBuffer, { name: entryName })
    }

    archive.finalize()

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application.downloaded_all',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId),
      newValue: { documentCount: documentRows.length }
    })

    // Timestamp format matches the rest of the admin panel's IST display
    // convention (en-IN locale) but with filesystem-safe separators — a
    // literal "/" or ":" in a Content-Disposition filename gets silently
    // mangled or stripped by different browsers/OSes.
    const timestamp = new Date()
      .toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      .replace(/[\s,]+/g, '_')
      .replace(/\//g, '-')
      .replace(/:/g, '')

    const filename = `Application-${application.application_number}-${timestamp}.zip`

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (error) {
    logServerError('api.admin.applications.download-all', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong while building the download.' }, { status: 500 })
  }
}
