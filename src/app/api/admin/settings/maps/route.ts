import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { clearCategoryMapsCache } from '@/lib/settings/category-maps'
import { detectFileType } from '@/lib/uploads/file-signature'
import { storeFile } from '@/lib/uploads/storage'

// Public-facing assets (any site visitor may open these without logging
// in), served through /api/maps/[key] (src/app/api/maps/[key]/route.ts)
// rather than gated like applicant documents. Stored in R2 under a "maps/"
// prefix — moved off local disk (public/images/public/map/) for the same
// reason applicant documents were (2026-10-29/31): Hostinger's Business Web
// Hosting filesystem is not persistent across redeploys. Never trusted on
// filename/Content-Type: the real file bytes are magic-byte checked below,
// same rule as every other upload path.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15 MB — a scanned A3/A4 layout can run large

// A map may be supplied as a PDF or as a plain image (a photographed/scanned
// layout board, or an exported image of the same layout) — both are
// accepted and just linked the same way on the public page.
const EXTENSION_BY_DETECTED_TYPE: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png'
}

/**
 * Replaces one Stall/Booth Locations map file (PDF or image) — either the
 * single "Full Map" row (categoryId omitted/null) or one specific
 * category's map row (migration 0047). Admin-only (config:manage), written
 * straight into public/ since these are meant to be publicly viewable, not
 * gated behind an authorized read like applicant documents.
 */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const formData = await request.formData().catch(() => null)
    const file = formData?.get('file')
    const categoryIdRaw = formData?.get('categoryId')

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
      return NextResponse.json({ error: 'Only PDF, JPG, or PNG files are accepted for stall/booth location maps.' }, { status: 400 })
    }

    const categoryId = categoryIdRaw && categoryIdRaw !== 'null' ? Number(categoryIdRaw) : null

    if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    }

    const filename = `${randomUUID()}.${extension}`

    await storeFile(`maps/${filename}`, buffer)

    const filePath = `/api/maps/${filename}`

    await query(
      `INSERT INTO category_maps (category_id, pdf_path, original_filename, updated_by_user_id)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE pdf_path = VALUES(pdf_path), original_filename = VALUES(original_filename),
         updated_by_user_id = VALUES(updated_by_user_id)`,
      [categoryId, filePath, file.name || null, session.userId]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'settings.category_map_updated',
      module: 'settings',
      entityType: 'category_maps',
      entityId: categoryId === null ? 'full-map' : String(categoryId),
      newValue: { categoryId, pdfPath: filePath, originalFilename: file.name }
    })

    clearCategoryMapsCache()

    return NextResponse.json({ success: true, pdfPath: filePath })
  } catch (error) {
    logServerError('api.admin.settings.maps', error)

    return NextResponse.json({ error: 'Failed to upload the map file.' }, { status: 500 })
  }
}

/**
 * Removes one Stall/Booth Locations map (either the single "Full Map" row,
 * categoryId omitted/null, or one specific category's map). This is the
 * single switch that hides the "View Stall/Booth Location" banner on the
 * apply page, category detail page, and Guidelines page all at once (per
 * explicit request, 2026-10-28) — each of those pages shows the banner only
 * when a map row exists for that category, so deleting the row here is the
 * one place that turns it off everywhere, and re-uploading turns it back on
 * everywhere. The uploaded file itself is intentionally left on disk (not
 * deleted) — same reasoning as other soft-removal patterns in this codebase:
 * cheap to keep, and re-uploading replaces it anyway.
 */
export async function DELETE(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = (await request.json().catch(() => ({}))) as { categoryId?: unknown }
    const categoryId = body.categoryId !== undefined && body.categoryId !== null ? Number(body.categoryId) : null

    if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    }

    const result = await query<{ affectedRows: number }>(
      categoryId === null
        ? `DELETE FROM category_maps WHERE category_id IS NULL`
        : `DELETE FROM category_maps WHERE category_id = ?`,
      categoryId === null ? [] : [categoryId]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'settings.category_map_removed',
      module: 'settings',
      entityType: 'category_maps',
      entityId: categoryId === null ? 'full-map' : String(categoryId),
      newValue: { categoryId }
    })

    clearCategoryMapsCache()

    return NextResponse.json({ success: true, affectedRows: result.affectedRows ?? 0 })
  } catch (error) {
    logServerError('api.admin.settings.maps.delete', error)

    return NextResponse.json({ error: 'Failed to remove the map.' }, { status: 500 })
  }
}
