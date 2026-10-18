import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'

const schema = z.object({ categoryId: z.number().int().positive(), enabled: z.boolean(), amountPaise: z.number().int().min(0).nullable(), deadlineAt: z.string().datetime().nullable() })

export async function PATCH(request: Request) {
  const session = await requirePermission('config:manage')
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid allotment payment settings.' }, { status: 400 })
  const value = parsed.data
  if (value.enabled && (value.amountPaise === null || value.deadlineAt === null)) return NextResponse.json({ error: 'Amount and payment deadline are required before enabling.' }, { status: 400 })
  await query('UPDATE categories SET allotment_amount_paise = ?, allotment_payment_enabled = ?, allotment_payment_deadline_at = ? WHERE id = ?', [value.amountPaise, value.enabled ? 1 : 0, value.deadlineAt ? value.deadlineAt.replace('T', ' ').slice(0, 19) : null, value.categoryId])
  await logAudit({ actorUserId: session.userId, actorRoleKey: session.role.key, action: 'category.allotment_payment_updated', module: 'settings', entityType: 'category', entityId: String(value.categoryId), newValue: value })
  return NextResponse.json({ success: true })
}
