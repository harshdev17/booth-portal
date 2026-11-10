import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const updateCategoryFeeSchema = z.object({
  categoryId: z.number().int().positive().optional(),

  // When provided (and non-empty), the same fee/GST is applied to every
  // listed category in one request — for events where multiple/all
  // categories genuinely share one flat fee, so an admin doesn't have to
  // repeat identical values per category.
  categoryIds: z.array(z.number().int().positive()).optional(),
  feeBasePaise: z.number().int().min(0).nullable(),
  gstPercent: z.number().min(0).max(100).nullable(),
  feePaise: z.number().int().min(0).nullable(),

  // Only ever applied to the single `categoryId` case (never `categoryIds`'
  // bulk-apply) — selection_method is a structural, per-category business
  // decision (draw-service.ts, the payment flow, and the public category
  // card all branch on it), not something that should silently change for
  // every category in a bulk fee update.
  selectionMethod: z.enum(['draw', 'manual', 'auction', 'tender', 'application_fee']).optional()
})

/**
 * Admin API: Update fee & GST settings for one or more categories.
 * Accessible only to authenticated admins with 'config:manage' permission.
 */
export async function PATCH(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = await request.json()
    const parsed = updateCategoryFeeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid fee configuration parameters.' }, { status: 400 })
    }

    const { feeBasePaise, gstPercent, feePaise, selectionMethod } = parsed.data
    const isBulk = Boolean(parsed.data.categoryIds?.length)
    const targetIds = parsed.data.categoryIds?.length ? parsed.data.categoryIds : parsed.data.categoryId ? [parsed.data.categoryId] : []

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'No category specified.' }, { status: 400 })
    }

    if (!isBulk && selectionMethod) {
      await query(
        `UPDATE categories
         SET fee_base_paise = ?,
             gst_percent = ?,
             fee_paise = ?,
             selection_method = ?
         WHERE id = ?`,
        [feeBasePaise, gstPercent, feePaise, selectionMethod, targetIds[0]]
      )
    } else {
      await query(
        `UPDATE categories
         SET fee_base_paise = ?,
             gst_percent = ?,
             fee_paise = ?
         WHERE id IN (${targetIds.map(() => '?').join(',')})`,
        [feeBasePaise, gstPercent, feePaise, ...targetIds]
      )
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: targetIds.length > 1 ? 'category.fee_bulk_updated' : 'category.fee_updated',
      module: 'settings',
      entityType: 'category',
      entityId: targetIds.join(','),
      newValue: { feeBasePaise, gstPercent, feePaise, selectionMethod, categoryIds: targetIds }
    })

    return NextResponse.json({
      success: true,
      message: targetIds.length > 1 ? `Fee applied to ${targetIds.length} categories.` : 'Fee settings updated successfully.'
    })
  } catch (error) {
    logServerError('api.admin.categories.fee', error)

    return NextResponse.json({ error: 'Failed to update fee configuration.' }, { status: 500 })
  }
}
