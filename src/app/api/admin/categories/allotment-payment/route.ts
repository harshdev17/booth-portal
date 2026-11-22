import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'

// The admin UI sends a bare <input type="datetime-local"> value
// ("2026-11-22T17:30", no timezone/offset) — this is already the IST
// wall-clock time the admin intends, with no conversion needed (same
// convention as /api/admin/categories/schedule's nullableDateTime). Using
// z.string().datetime() here previously rejected that plain value, and the
// client's own `new Date(...).toISOString()` workaround silently converted
// it to a UTC instant assuming the ADMIN'S BROWSER runs in UTC — for an
// India-based admin that shifted every saved deadline by -5:30 (5:30 PM
// entered, 12:00 PM stored/shown). Confirmed live, 2026-11-22.
const nullableDateTime = z
  .string()
  .trim()
  .refine(value => value === '' || !Number.isNaN(Date.parse(value)), 'Invalid date/time')
  .nullable()
  .transform(value => (value ? `${value.replace('T', ' ').slice(0, 16)}:00` : null))

const schema = z.object({
  categoryId: z.number().int().positive(),
  enabled: z.boolean(),
  amountPaise: z.number().int().min(0).nullable(),
  // Optional per-shop-type overrides (migration 0083) — when either is left
  // null, that shop type just falls back to amountPaise as before, see
  // resolveAllotmentAmountPaise(). A category that never uses Single/Double
  // pricing (most of them) simply never sends these two fields.
  amountSinglePaise: z.number().int().min(0).nullable().optional(),
  amountDoublePaise: z.number().int().min(0).nullable().optional(),
  deadlineAt: nullableDateTime
})

export async function PATCH(request: Request) {
  const session = await requirePermission('config:manage')
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid allotment payment settings.' }, { status: 400 })
  const value = parsed.data
  // Flat amountPaise is required UNLESS both Single and Double overrides are
  // set (every shop_type already covered in that case) — mirrors the client
  // validation in CategoryFeeSettingsClient.tsx.
  const hasBothOverrides =
    (value.amountSinglePaise ?? 0) > 0 && (value.amountDoublePaise ?? 0) > 0
  const hasValidDefault = value.amountPaise !== null && value.amountPaise > 0
  if (value.enabled && (value.deadlineAt === null || (!hasValidDefault && !hasBothOverrides))) {
    return NextResponse.json(
      { error: 'A payment deadline is required, along with either the default amount or both single and double amounts.' },
      { status: 400 }
    )
  }
  await query(
    `UPDATE categories
     SET allotment_amount_paise = ?, allotment_amount_single_paise = ?, allotment_amount_double_paise = ?,
         allotment_payment_enabled = ?, allotment_payment_deadline_at = ?
     WHERE id = ?`,
    [
      value.amountPaise,
      value.amountSinglePaise ?? null,
      value.amountDoublePaise ?? null,
      value.enabled ? 1 : 0,
      value.deadlineAt,
      value.categoryId
    ]
  )
  await logAudit({ actorUserId: session.userId, actorRoleKey: session.role.key, action: 'category.allotment_payment_updated', module: 'settings', entityType: 'category', entityId: String(value.categoryId), newValue: value })
  return NextResponse.json({ success: true })
}
