import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

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
