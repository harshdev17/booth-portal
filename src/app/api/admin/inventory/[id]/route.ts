import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

const EDITABLE_STATUSES = ['available', 'reserved', 'cancelled'] as const

type EditableStatus = (typeof EDITABLE_STATUSES)[number]

type UpdateBody = {
  stallNumber?: unknown
  shopType?: unknown
  categoryName?: unknown
  direction?: unknown
  emdAmountPaise?: unknown
  status?: unknown
}

/**
 * Edits a booth/stall unit's own fields (stall number, type, category,
 * direction, EMD) and, optionally, its status among the three
 * admin-settable values. Never used to set or clear 'allotted' — that
 * transition belongs to the Allotment module (not built yet), same
 * reasoning as the DELETE handler below. A unit currently 'allotted' can't
 * be edited from here at all, for the same reason it can't be deleted.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('inventory:manage')

    const { id } = await params
    const shopUnitId = decodeId(id)

    if (shopUnitId === null) {
      return NextResponse.json({ error: 'Invalid booth/stall unit.' }, { status: 400 })
    }

    let body: UpdateBody

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

    const status: EditableStatus | null =
      typeof body.status === 'string' && (EDITABLE_STATUSES as readonly string[]).includes(body.status)
        ? (body.status as EditableStatus)
        : null

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

    if (body.status !== undefined && status === null) {
      return NextResponse.json({ error: 'Status must be Available, Reserved, or Cancelled.' }, { status: 400 })
    }

    const rows = await query<
      Array<{ id: number; stall_number: string; shop_type: string; category_id: number; direction: string | null; emd_amount_paise: number | null; status: string }>
    >(
      `SELECT id, stall_number, shop_type, category_id, direction, emd_amount_paise, status FROM shop_units WHERE id = ? LIMIT 1`,
      [shopUnitId]
    )

    const existingUnit = rows[0]

    if (!existingUnit) {
      return NextResponse.json({ error: 'Booth/Stall unit not found.' }, { status: 404 })
    }

    if (existingUnit.status === 'allotted') {
      return NextResponse.json(
        { error: 'This stall is currently allotted and cannot be edited. Cancel the allotment first.' },
        { status: 409 }
      )
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

    const duplicateRows = await query<Array<{ id: number }>>(
      `SELECT id FROM shop_units WHERE stall_number = ? AND id != ? LIMIT 1`,
      [stallNumber, shopUnitId]
    )

    if (duplicateRows.length > 0) {
      return NextResponse.json({ error: `Stall number "${stallNumber}" already exists.` }, { status: 409 })
    }

    const nextStatus = status ?? existingUnit.status

    await query(
      `UPDATE shop_units
       SET stall_number = ?, shop_type = ?, category_id = ?, direction = ?, emd_amount_paise = ?, status = ?
       WHERE id = ?`,
      [stallNumber, shopType, categoryId, direction, emdAmountPaise, nextStatus, shopUnitId]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'inventory.updated',
      module: 'inventory',
      entityType: 'shop_unit',
      entityId: String(shopUnitId),
      previousValue: {
        stallNumber: existingUnit.stall_number,
        shopType: existingUnit.shop_type,
        direction: existingUnit.direction,
        emdAmountPaise: existingUnit.emd_amount_paise,
        status: existingUnit.status
      },
      newValue: { stallNumber, shopType, categoryName, direction, emdAmountPaise, status: nextStatus }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.inventory.update', error)

    return NextResponse.json({ error: 'Something went wrong while updating the booth/stall unit.' }, { status: 500 })
  }
}

/**
 * Deletes a single shop unit. A unit currently 'allotted' can never be
 * deleted from here — that would silently sever a real applicant's
 * allotment record with no trace beyond the audit log; cancelling an
 * allotment is a distinct, deliberate workflow (not built yet — see
 * /admin/allotment), not a side effect of an inventory row deletion.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('inventory:manage')

    const { id } = await params
    const shopUnitId = decodeId(id)

    if (shopUnitId === null) {
      return NextResponse.json({ error: 'Invalid booth/stall unit.' }, { status: 400 })
    }

    const rows = await query<Array<{ id: number; stall_number: string; status: string }>>(
      `SELECT id, stall_number, status FROM shop_units WHERE id = ? LIMIT 1`,
      [shopUnitId]
    )

    const shopUnit = rows[0]

    if (!shopUnit) {
      return NextResponse.json({ error: 'Booth/Stall unit not found.' }, { status: 404 })
    }

    if (shopUnit.status === 'allotted') {
      return NextResponse.json(
        { error: 'This stall is currently allotted and cannot be deleted. Cancel the allotment first.' },
        { status: 409 }
      )
    }

    await query(`DELETE FROM shop_units WHERE id = ?`, [shopUnitId])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'inventory.deleted',
      module: 'inventory',
      entityType: 'shop_unit',
      entityId: String(shopUnitId),
      previousValue: { stallNumber: shopUnit.stall_number, status: shopUnit.status }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.inventory.delete', error)

    return NextResponse.json({ error: 'Something went wrong while deleting the booth/stall unit.' }, { status: 500 })
  }
}
