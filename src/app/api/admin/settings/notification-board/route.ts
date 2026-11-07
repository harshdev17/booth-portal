import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { detectFileType } from '@/lib/uploads/file-signature'
import { storeFile } from '@/lib/uploads/storage'

// Public-facing notice files (any site visitor may view/download these
// without logging in), served through /api/notification-files/[key] rather
// than gated like applicant documents. Stored in R2 under a
// "notifications/" prefix — same reasoning as category_maps (migration
// 0047)/server-side storage.ts: Hostinger's Business Web Hosting
// filesystem is not persistent across redeploys. Never trusted on
// filename/Content-Type: the real file bytes are magic-byte checked below.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15 MB

const EXTENSION_BY_DETECTED_TYPE: Record<string, { extension: string; fileType: 'pdf' | 'image' }> = {
  'application/pdf': { extension: 'pdf', fileType: 'pdf' },
  'image/jpeg': { extension: 'jpg', fileType: 'image' },
  'image/png': { extension: 'png', fileType: 'image' }
}

/** Admin: upload a new notification board file (PDF or image), appended to the end of display order. */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const formData = await request.formData().catch(() => null)
    const file = formData?.get('file')
    const title = formData?.get('title')
    const titleHi = formData?.get('titleHi')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 })
    }

    if (typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'A title is required.' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 15 MB).' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const detectedType = detectFileType(buffer)
    const typeInfo = detectedType ? EXTENSION_BY_DETECTED_TYPE[detectedType] : undefined

    if (!typeInfo) {
      return NextResponse.json({ error: 'Only PDF, JPG, or PNG files are accepted.' }, { status: 400 })
    }

    const filename = `${randomUUID()}.${typeInfo.extension}`

    await storeFile(`notifications/${filename}`, buffer)

    const filePath = `/api/notification-files/${filename}`

    const maxOrderRows = await query<Array<{ max_order: number | null }>>(
      `SELECT MAX(display_order) AS max_order FROM notification_files`
    )

    const nextOrder = (maxOrderRows[0]?.max_order ?? 0) + 1

    const result = await query<{ insertId: number }>(
      `INSERT INTO notification_files
         (title, title_hi, file_path, file_type, original_filename, display_order, status, uploaded_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        title.trim(),
        typeof titleHi === 'string' && titleHi.trim() ? titleHi.trim() : null,
        filePath,
        typeInfo.fileType,
        file.name || null,
        nextOrder,
        session.userId
      ]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'notification_file.created',
      module: 'settings',
      entityType: 'notification_files',
      entityId: String(result.insertId),
      newValue: { title: title.trim(), filePath, fileType: typeInfo.fileType, originalFilename: file.name }
    })

    return NextResponse.json({ success: true, id: result.insertId, filePath })
  } catch (error) {
    logServerError('api.admin.settings.notification-board.create', error)

    return NextResponse.json({ error: 'Failed to upload the notification file.' }, { status: 500 })
  }
}

/** Admin: toggle a notification file's active/inactive status. */
export async function PATCH(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = (await request.json().catch(() => ({}))) as { id?: unknown; status?: unknown }
    const id = Number(body.id)
    const status = body.status

    if (!Number.isInteger(id) || id <= 0 || (status !== 'active' && status !== 'inactive')) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    await query(`UPDATE notification_files SET status = ? WHERE id = ?`, [status, id])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'notification_file.status_updated',
      module: 'settings',
      entityType: 'notification_files',
      entityId: String(id),
      newValue: { status }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.settings.notification-board.patch', error)

    return NextResponse.json({ error: 'Failed to update the notification file.' }, { status: 500 })
  }
}

/** Admin: permanently remove a notification file row. The uploaded file itself is left in R2 (cheap to keep, matches category_maps' soft-removal pattern). */
export async function DELETE(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = (await request.json().catch(() => ({}))) as { id?: unknown }
    const id = Number(body.id)

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    await query(`DELETE FROM notification_files WHERE id = ?`, [id])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'notification_file.deleted',
      module: 'settings',
      entityType: 'notification_files',
      entityId: String(id)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.settings.notification-board.delete', error)

    return NextResponse.json({ error: 'Failed to remove the notification file.' }, { status: 500 })
  }
}
