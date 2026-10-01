import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(500)
})

/**
 * Deletes multiple shop units in one request. Single-row deletes
 * (/api/admin/inventory/[id]) were reported slow — root cause: each delete
 * ran 3 sequential round-trips to a remote DB (~325ms each, confirmed by
 * direct measurement) AND the client followed up with router.refresh(),
 * which re-ran every query the Inventory page needs (another ~800ms) — so
 * deleting N stalls one at a time cost N × ~1.8s. This endpoint does the
 * existence/status check and the delete as 2 queries total for the WHOLE
 * batch (not per row), and the caller updates its own local state instead
 * of refreshing the page — see InventoryTable.tsx.
 */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('inventory:manage')

    const body = await request.json().catch(() => null)
    const parsed = bulkDeleteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const shopUnitIds = parsed.data.ids.map(decodeId)

    if (shopUnitIds.some(id => id === null)) {
      return NextResponse.json({ error: 'Invalid shop unit id in selection.' }, { status: 400 })
    }

    const ids = shopUnitIds as number[]

    const rows = await query<Array<{ id: number; stall_number: string; status: string }>>(
      `SELECT id, stall_number, status FROM shop_units WHERE id IN (${ids.map(() => '?').join(', ')})`,
      ids
    )

    const deletable = rows.filter(r => r.status !== 'allotted')
    const skippedAllotted = rows.length - deletable.length
    const deletableIds = deletable.map(r => r.id)

    if (deletableIds.length > 0) {
      await query(`DELETE FROM shop_units WHERE id IN (${deletableIds.map(() => '?').join(', ')})`, deletableIds)
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'inventory.deleted',
      module: 'inventory',
      entityType: 'shop_unit',
      entityId: 'bulk',
      previousValue: { stallNumbers: deletable.map(r => r.stall_number), count: deletable.length, skippedAllotted }
    })

    return NextResponse.json({
      deletedIds: deletable.map(r => String(r.id)),
      deletedCount: deletable.length,
      skippedAllotted
    })
  } catch (error) {
    logServerError('api.admin.inventory.bulk-delete', error)

    return NextResponse.json({ error: 'Something went wrong while deleting.' }, { status: 500 })
  }
}
