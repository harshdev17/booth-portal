import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'

// Admin-configurable Auction Participation Fee for a selection_method =
// 'auction' category (migration 0077's Auction Payment Flow) — kept as its
// own small route rather than folded into /api/admin/categories/
// allotment-payment, since that route's enabled/amountPaise/deadlineAt
// schema models a genuinely different concept (the normal pay_now
// allotment fee, which an auction category never uses — see draw-service.ts's
// isPaymentRequired, forced false for an auction category).
const schema = z.object({ categoryId: z.number().int().positive(), amountPaise: z.number().int().min(0).nullable() })

export async function PATCH(request: Request) {
  const session = await requirePermission('config:manage')
  const parsed = schema.safeParse(await request.json())

  if (!parsed.success) return NextResponse.json({ error: 'Invalid auction participation fee.' }, { status: 400 })

  const { categoryId, amountPaise } = parsed.data

  await query('UPDATE categories SET auction_participation_fee_paise = ? WHERE id = ?', [amountPaise, categoryId])

  await logAudit({
    actorUserId: session.userId,
    actorRoleKey: session.role.key,
    action: 'category.auction_fee_updated',
    module: 'settings',
    entityType: 'category',
    entityId: String(categoryId),
    newValue: { categoryId, amountPaise }
  })

  return NextResponse.json({ success: true })
}
