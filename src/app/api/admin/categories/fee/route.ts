import { NextResponse } from 'next/server'
import { z } from 'zod'

import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const updateCategoryFeeSchema = z.object({
  categoryId: z.number().int().positive(),
  feeBasePaise: z.number().int().min(0).nullable(),
  gstPercent: z.number().min(0).max(100).nullable(),
  feePaise: z.number().int().min(0).nullable()
})

/**
 * Admin API: Update category fee & GST settings.
 * Accessible only to authenticated admins with 'config:manage' permission.
 */
export async function PATCH(request: Request) {
  try {
    await requirePermission('config:manage')

    const body = await request.json()
    const parsed = updateCategoryFeeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid fee configuration parameters.' }, { status: 400 })
    }

    const { categoryId, feeBasePaise, gstPercent, feePaise } = parsed.data

    await query(
      `UPDATE categories
       SET fee_base_paise = ?,
           gst_percent = ?,
           fee_paise = ?
       WHERE id = ?`,
      [feeBasePaise, gstPercent, feePaise, categoryId]
    )

    return NextResponse.json({ success: true, message: 'Fee settings updated successfully.' })
  } catch (error) {
    logServerError('api.admin.categories.fee', error)

    return NextResponse.json({ error: 'Failed to update fee configuration.' }, { status: 500 })
  }
}
