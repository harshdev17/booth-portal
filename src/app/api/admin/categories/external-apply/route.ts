import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { detectFileType } from '@/lib/uploads/file-signature'
import { storeFile } from '@/lib/uploads/storage'

// Public-facing document (any site visitor may view it without logging in),
// served through /api/category-documents/[key] — same R2-prefix-plus-
// serving-route pattern as category_maps (migration 0047) / notification
// board (migration 0074). Never trusted on filename/Content-Type: the real
// file bytes are magic-byte checked below.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15 MB

const EXTENSION_BY_DETECTED_TYPE: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png'
}

/**
 * Admin: update an "external-apply" category's Google Form link, Total
 * Booths, and/or Last Date — plain field edits, no file involved (file
 * upload/removal is handled by POST/DELETE below, same split as
 * /api/admin/settings/maps).
 */
const patchSchema = z.object({
  categoryId: z.number().int().positive(),
  externalApplyUrl: z.string().trim().max(500).nullable().optional(),
  totalBooths: z.number().int().min(0).nullable().optional(),

  // "YYYY-MM-DD" or null to clear — matches the <input type="date"> the
  // admin UI sends.
  lastDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
})

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const rawBody = await request.json().catch(() => null)
    const parsed = patchSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const { categoryId, externalApplyUrl, totalBooths, lastDate } = parsed.data

    const setClauses: string[] = []
    const setParams: Array<string | number | null> = []

    if (externalApplyUrl !== undefined) {
      setClauses.push('external_apply_url = ?')
      setParams.push(externalApplyUrl && externalApplyUrl.length > 0 ? externalApplyUrl : null)
    }

    if (totalBooths !== undefined) {
      setClauses.push('total_booths = ?')
      setParams.push(totalBooths)
    }

    if (lastDate !== undefined) {
      setClauses.push('last_date = ?')
      setParams.push(lastDate)
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No changes submitted.' }, { status: 400 })
    }

    const result = await query<{ affectedRows: number }>(
      `UPDATE categories SET ${setClauses.join(', ')} WHERE id = ?`,
      [...setParams, categoryId]
    )

    if (!result.affectedRows) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 })
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'category.external_apply_updated',
      module: 'settings',
      entityType: 'category',
      entityId: String(categoryId),
      newValue: { externalApplyUrl, totalBooths, lastDate }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.categories.external-apply.patch', error)

    return NextResponse.json({ error: 'Failed to update this category.' }, { status: 500 })
  }
}

/** Admin: upload/replace an external-apply category's "View Details" PDF. */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const formData = await request.formData().catch(() => null)
    const file = formData?.get('file')
    const categoryIdRaw = formData?.get('categoryId')
    const categoryId = typeof categoryIdRaw === 'string' ? Number(categoryIdRaw) : NaN

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 15 MB).' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const detectedType = detectFileType(buffer)
    const extension = detectedType ? EXTENSION_BY_DETECTED_TYPE[detectedType] : undefined

    if (!extension) {
      return NextResponse.json({ error: 'Only PDF, JPG, or PNG files are accepted.' }, { status: 400 })
    }

    const filename = `${randomUUID()}.${extension}`

    await storeFile(`category-documents/${filename}`, buffer)

    const filePath = `/api/category-documents/${filename}`

    const result = await query<{ affectedRows: number }>(
      `UPDATE categories SET pdf_path = ?, pdf_original_filename = ? WHERE id = ?`,
      [filePath, file.name || null, categoryId]
    )

    if (!result.affectedRows) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 })
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'category.pdf_uploaded',
      module: 'settings',
      entityType: 'category',
      entityId: String(categoryId),
      newValue: { pdfPath: filePath, originalFilename: file.name }
    })

    return NextResponse.json({ success: true, pdfPath: filePath, originalFilename: file.name })
  } catch (error) {
    logServerError('api.admin.categories.external-apply.upload', error)

    return NextResponse.json({ error: 'Failed to upload the file.' }, { status: 500 })
  }
}

/** Admin: remove an external-apply category's "View Details" PDF. The uploaded file itself is left in R2 (cheap to keep, same as other soft-removal patterns here). */
export async function DELETE(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = (await request.json().catch(() => ({}))) as { categoryId?: unknown }
    const categoryId = Number(body.categoryId)

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    }

    await query(`UPDATE categories SET pdf_path = NULL, pdf_original_filename = NULL WHERE id = ?`, [categoryId])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'category.pdf_removed',
      module: 'settings',
      entityType: 'category',
      entityId: String(categoryId)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.categories.external-apply.delete', error)

    return NextResponse.json({ error: 'Failed to remove the file.' }, { status: 500 })
  }
}
