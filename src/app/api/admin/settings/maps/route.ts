import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { clearCategoryMapsCache } from '@/lib/settings/category-maps'
import { detectFileType } from '@/lib/uploads/file-signature'

// Public-facing assets (any site visitor may open these without logging in,
// same as any other static file), so — unlike applicant document uploads —
// these are written under public/ rather than the private uploads root.
// They're still never trusted on filename/Content-Type: the real file
// bytes are magic-byte checked below, same rule as every other upload path.
const MAP_DIR = join(process.cwd(), 'public', 'images', 'public', 'map')
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

    await mkdir(MAP_DIR, { recursive: true })

    const filename = `${randomUUID()}.${extension}`

    await writeFile(join(MAP_DIR, filename), buffer)

    const filePath = `/images/public/map/${filename}`

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
