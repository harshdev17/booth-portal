import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const updateAuctionFeeSchema = z.object({
  categoryId: z.number().int().positive(),
  auctionParticipationFeePaise: z.number().int().min(0).nullable()
})

/**
 * Admin API: set the fixed Auction Participation Fee for a
 * selection_method='auction' category (currently only "Refreshment and Ice
 * Cream Booth/Stall"). Kept separate from /api/admin/categories/allotment-payment,
 * which models the unrelated normal pay_now allotment fee — an auction
 * category's actual final allotment amount is per-winner and only known
 * after the physical auction (set via the results CSV upload, not here).
 */
export async function PATCH(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = await request.json()
    const parsed = updateAuctionFeeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid auction fee configuration.' }, { status: 400 })
    }

    const { categoryId, auctionParticipationFeePaise } = parsed.data

    const categoryRows = await query<Array<{ selection_method: string }>>(
      `SELECT selection_method FROM categories WHERE id = ? LIMIT 1`,
      [categoryId]
    )

    if (!categoryRows[0]) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 })
    }

    if (categoryRows[0].selection_method !== 'auction') {
      return NextResponse.json({ error: 'This setting only applies to auction categories.' }, { status: 400 })
    }

    await query(`UPDATE categories SET auction_participation_fee_paise = ? WHERE id = ?`, [
      auctionParticipationFeePaise,
      categoryId
    ])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'category.auction_fee_updated',
      module: 'settings',
      entityType: 'category',
      entityId: String(categoryId),
      newValue: { auctionParticipationFeePaise }
    })

    return NextResponse.json({ success: true, message: 'Auction participation fee updated successfully.' })
  } catch (error) {
    logServerError('api.admin.categories.auction-fee', error)

    return NextResponse.json({ error: 'Failed to update auction participation fee.' }, { status: 500 })
  }
}
