import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { listResultDocuments } from '@/lib/draw/result-documents'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { detectFileType } from '@/lib/uploads/file-signature'
import { storeFile } from '@/lib/uploads/storage'

// Official draw-result PDFs an admin posts for public download — any PDF,
// no category link (per explicit request). Same upload pattern as
// notification_files (migration 0074): stored in R2 under a "results/"
// prefix, served publicly (no auth) through /api/results/[key]. Never
// trusted on filename/Content-Type: the real file bytes are magic-byte
// checked below.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15 MB

/** Admin: upload a new result PDF. */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const formData = await request.formData().catch(() => null)
    const file = formData?.get('file')
    const title = formData?.get('title')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 15 MB).' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const detectedType = detectFileType(buffer)

    if (detectedType !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted.' }, { status: 400 })
    }

    const filename = `${randomUUID()}.pdf`

    await storeFile(`results/${filename}`, buffer)

    const filePath = `/api/results/${filename}`

    const result = await query<{ insertId: number }>(
      `INSERT INTO result_documents (title, file_path, original_filename, uploaded_by_user_id)
       VALUES (?, ?, ?, ?)`,
      [
        typeof title === 'string' && title.trim() ? title.trim() : null,
        filePath,
        file.name || 'result.pdf',
        session.userId
      ]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'result_document.created',
      module: 'results',
      entityType: 'result_documents',
      entityId: String(result.insertId),
      newValue: { title, filePath, originalFilename: file.name }
    })

    return NextResponse.json({ success: true, id: result.insertId, filePath })
  } catch (error) {
    logServerError('api.admin.results.create', error)

    return NextResponse.json({ error: 'Failed to upload the result document.' }, { status: 500 })
  }
}

/** Admin: list every uploaded result document, most recent first. */
export async function GET() {
  try {
    await requirePermission('config:manage')

    const rows = await listResultDocuments()

    return NextResponse.json({ results: rows })
  } catch (error) {
    logServerError('api.admin.results.list', error)

    return NextResponse.json({ error: 'Failed to load result documents.' }, { status: 500 })
  }
}

/** Admin: permanently remove a result document row. The uploaded file itself is left in R2 (cheap to keep, matches notification_files' pattern). */
export async function DELETE(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = (await request.json().catch(() => ({}))) as { id?: unknown }
    const id = Number(body.id)

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    await query(`DELETE FROM result_documents WHERE id = ?`, [id])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'result_document.deleted',
      module: 'results',
      entityType: 'result_documents',
      entityId: String(id)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.results.delete', error)

    return NextResponse.json({ error: 'Failed to remove the result document.' }, { status: 500 })
  }
}
