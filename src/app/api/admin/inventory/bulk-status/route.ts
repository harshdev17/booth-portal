import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

const EDITABLE_STATUSES = ['available', 'reserved', 'cancelled'] as const

const bulkStatusSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  status: z.enum(EDITABLE_STATUSES)
})

/**
 * Updates status for multiple shop units in one request — same 2-queries-for-
 * the-whole-batch pattern as bulk-delete (see that route's comment), instead
 * of editing units one at a time through the single-row PATCH endpoint.
 * 'allotted' is excluded from EDITABLE_STATUSES for the same reason the
 * single-edit dialog excludes it: that transition belongs to the Allotment
 * module, not a manual inventory edit.
 */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('inventory:manage')

    const body = await request.json().catch(() => null)
    const parsed = bulkStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const shopUnitIds = parsed.data.ids.map(decodeId)

    if (shopUnitIds.some(id => id === null)) {
      return NextResponse.json({ error: 'Invalid shop unit id in selection.' }, { status: 400 })
    }

    const ids = shopUnitIds as number[]
    const { status } = parsed.data

    const rows = await query<Array<{ id: number; stall_number: string; status: string }>>(
      `SELECT id, stall_number, status FROM shop_units WHERE id IN (${ids.map(() => '?').join(', ')})`,
      ids
    )

    const updatable = rows.filter(r => r.status !== 'allotted')
    const skippedAllotted = rows.length - updatable.length
    const updatableIds = updatable.map(r => r.id)

    if (updatableIds.length > 0) {
      await query(
        `UPDATE shop_units SET status = ? WHERE id IN (${updatableIds.map(() => '?').join(', ')})`,
        [status, ...updatableIds]
      )
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'inventory.status_updated',
      module: 'inventory',
      entityType: 'shop_unit',
      entityId: 'bulk',
      newValue: { stallNumbers: updatable.map(r => r.stall_number), count: updatable.length, status, skippedAllotted }
    })

    return NextResponse.json({
      updatedIds: updatable.map(r => String(r.id)),
      updatedCount: updatable.length,
      status,
      skippedAllotted
    })
  } catch (error) {
    logServerError('api.admin.inventory.bulk-status', error)

    return NextResponse.json({ error: 'Something went wrong while updating status.' }, { status: 500 })
  }
}
