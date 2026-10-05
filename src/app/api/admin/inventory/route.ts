import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { encodeId } from '@/lib/security/opaque-id'

type CreateBody = {
  stallNumber?: unknown
  shopType?: unknown
  categoryName?: unknown
  direction?: unknown
  emdAmountPaise?: unknown
}

/**
 * Creates one booth/stall unit directly from the admin UI — the single-row
 * counterpart to the CSV bulk-import wizard (/api/admin/inventory/import),
 * for adding or correcting one stall without a spreadsheet round-trip.
 * Category matching (name or slug, case/whitespace-insensitive) mirrors the
 * import route so both paths accept the same inputs.
 */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('inventory:manage')

    let body: CreateBody

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
    }

    const stallNumber = typeof body.stallNumber === 'string' ? body.stallNumber.trim() : ''
    const shopType = body.shopType === 'single' || body.shopType === 'double' ? body.shopType : null
    const categoryName = typeof body.categoryName === 'string' ? body.categoryName.trim() : ''
    const direction = typeof body.direction === 'string' && body.direction.trim() ? body.direction.trim() : null
    const emdAmountRaw = body.emdAmountPaise

    const emdAmountPaise =
      emdAmountRaw === null || emdAmountRaw === undefined || emdAmountRaw === '' ? null : Number(emdAmountRaw)

    if (!stallNumber) {
      return NextResponse.json({ error: 'Stall number is required.' }, { status: 400 })
    }

    if (!shopType) {
      return NextResponse.json({ error: 'Type must be Single or Double.' }, { status: 400 })
    }

    if (!categoryName) {
      return NextResponse.json({ error: 'Category is required.' }, { status: 400 })
    }

    if (emdAmountPaise !== null && (!Number.isFinite(emdAmountPaise) || emdAmountPaise < 0)) {
      return NextResponse.json({ error: 'EMD amount must be a non-negative number.' }, { status: 400 })
    }

    const categoryRows = await query<Array<{ id: number }>>(
      `SELECT id FROM categories
       WHERE status != 'archived' AND (LOWER(TRIM(name)) = LOWER(TRIM(?)) OR LOWER(TRIM(slug)) = LOWER(TRIM(?)))
       LIMIT 1`,
      [categoryName, categoryName]
    )

    const categoryId = categoryRows[0]?.id

    if (!categoryId) {
      return NextResponse.json({ error: `Unknown category: "${categoryName}".` }, { status: 400 })
    }

    const existing = await query<Array<{ id: number }>>(
      `SELECT id FROM shop_units WHERE stall_number = ? LIMIT 1`,
      [stallNumber]
    )

    if (existing.length > 0) {
      return NextResponse.json({ error: `Stall number "${stallNumber}" already exists.` }, { status: 409 })
    }

    const result = await query<{ insertId: number }>(
      `INSERT INTO shop_units (category_id, stall_number, shop_type, direction, emd_amount_paise, status)
       VALUES (?, ?, ?, ?, ?, 'available')`,
      [categoryId, stallNumber, shopType, direction, emdAmountPaise]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'inventory.created',
      module: 'inventory',
      entityType: 'shop_unit',
      entityId: String(result.insertId),
      newValue: { stallNumber, shopType, categoryName, direction, emdAmountPaise }
    })

    return NextResponse.json({ id: encodeId(result.insertId) }, { status: 201 })
  } catch (error) {
    logServerError('api.admin.inventory.create', error)

    return NextResponse.json({ error: 'Something went wrong while creating the booth/stall unit.' }, { status: 500 })
  }
}
