import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const updateAuctionFeeSchema = z.object({
  categoryId: z.number().int().positive().optional(),

  // When provided (and non-empty), the same fee is applied to every listed
  // category in one request — mirrors the bulk-apply pattern used by the
  // existing fee/schedule PATCH routes.
  categoryIds: z.array(z.number().int().positive()).optional(),
  auctionParticipationFeePaise: z.number().int().min(0).nullable()
})

/**
 * Admin API: set the auction participation fee (migration 0077) for one or
 * more categories with selection_method = 'auction'. The draw service
 * refuses to run an auction draw for a category until this is configured
 * (see draw-service.ts). Accessible only to admins with 'config:manage'.
 */
export async function PATCH(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = await request.json()
    const parsed = updateAuctionFeeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid auction fee configuration parameters.' }, { status: 400 })
    }

    const { auctionParticipationFeePaise } = parsed.data
    const targetIds = parsed.data.categoryIds?.length ? parsed.data.categoryIds : parsed.data.categoryId ? [parsed.data.categoryId] : []

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'No category specified.' }, { status: 400 })
    }

    await query(
      `UPDATE categories
       SET auction_participation_fee_paise = ?
       WHERE id IN (${targetIds.map(() => '?').join(',')})`,
      [auctionParticipationFeePaise, ...targetIds]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: targetIds.length > 1 ? 'category.auction_fee_bulk_updated' : 'category.auction_fee_updated',
      module: 'settings',
      entityType: 'category',
      entityId: targetIds.join(','),
      newValue: { auctionParticipationFeePaise, categoryIds: targetIds }
    })

    return NextResponse.json({
      success: true,
      message: targetIds.length > 1 ? `Auction fee applied to ${targetIds.length} categories.` : 'Auction fee updated successfully.'
    })
  } catch (error) {
    logServerError('api.admin.categories.auction-fee', error)

    return NextResponse.json({ error: 'Failed to update auction fee configuration.' }, { status: 500 })
  }
}
