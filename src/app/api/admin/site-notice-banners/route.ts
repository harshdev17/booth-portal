import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const schema = z.object({
  paymentPendingText: z.string().trim().min(1).max(1000),
  paymentPendingTextHi: z.string().trim().min(1).max(1000),
  paymentPendingEnabled: z.boolean(),
  letterAvailableText: z.string().trim().min(1).max(1000),
  letterAvailableTextHi: z.string().trim().min(1).max(1000),
  letterAvailableEnabled: z.boolean()
})

/**
 * Admin: edit the shared PaymentPendingNotice / LetterAvailableNotice banner
 * text and on/off switch (migrations 0092/0093) — one singleton row read by
 * all three public surfaces that display them (Corrigendum popup, /status,
 * Allotment Letter page), per explicit request (2026-11-25): "ye bhi admin
 * se hi manage hona chahiye bhai" / "remove ya add kaise hoga".
 */
export async function PATCH(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    await query(
      `UPDATE site_notice_banners
       SET payment_pending_text = ?, payment_pending_text_hi = ?, payment_pending_enabled = ?,
           letter_available_text = ?, letter_available_text_hi = ?, letter_available_enabled = ?,
           updated_by_user_id = ?
       WHERE id = 1`,
      [
        parsed.data.paymentPendingText,
        parsed.data.paymentPendingTextHi,
        parsed.data.paymentPendingEnabled ? 1 : 0,
        parsed.data.letterAvailableText,
        parsed.data.letterAvailableTextHi,
        parsed.data.letterAvailableEnabled ? 1 : 0,
        session.userId
      ]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'site_notice_banners.updated',
      module: 'settings',
      entityType: 'site_notice_banners',
      entityId: '1',
      newValue: parsed.data
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.site-notice-banners', error)

    return NextResponse.json({ error: 'Failed to update.' }, { status: 500 })
  }
}
