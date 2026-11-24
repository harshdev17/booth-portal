import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const toggleSchema = z.object({
  enabled: z.boolean().optional(),

  // Popup's own heading/subheading/footer text — admin-editable per explicit
  // request (2026-11-25): "pop mai jo bhi aara hai vo sab admin se manage
  // ho, abhi only table hi manage ho rahi hai bas". Kept on the same
  // singleton-settings route/table as `enabled` (migration 0091) rather than
  // a separate endpoint, since it's the same one-row settings object.
  heading: z.string().trim().min(1).max(255).optional(),
  headingHi: z.string().trim().min(1).max(255).optional(),
  subheading: z.string().trim().min(1).max(255).optional(),
  subheadingHi: z.string().trim().min(1).max(255).optional(),
  footerText: z.string().trim().min(1).max(1000).optional(),
  footerTextHi: z.string().trim().min(1).max(1000).optional()
})

const FIELD_COLUMN_MAP: Record<string, string> = {
  enabled: 'enabled',
  heading: 'heading',
  headingHi: 'heading_hi',
  subheading: 'subheading',
  subheadingHi: 'subheading_hi',
  footerText: 'footer_text',
  footerTextHi: 'footer_text_hi'
}

/**
 * Admin: update the Corrigendum popup's settings singleton — on/off switch
 * and (per migration 0091) its own heading/subheading/footer text. Each
 * field is optional so the enable/disable Switch and the text-editor Save
 * button can each send only what they changed.
 */
export async function PATCH(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = await request.json()
    const parsed = toggleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const entries = Object.entries(parsed.data).filter(([, value]) => value !== undefined)

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
    }

    const setClauses = entries.map(([key]) => `${FIELD_COLUMN_MAP[key]} = ?`)
    const values = entries.map(([key, value]) => (key === 'enabled' ? (value ? 1 : 0) : value))

    await query(
      `UPDATE corrigendum_notice_settings SET ${setClauses.join(', ')}, updated_by_user_id = ? WHERE id = 1`,
      [...values, session.userId]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'corrigendum_notice.toggled',
      module: 'settings',
      entityType: 'corrigendum_notice_settings',
      entityId: '1',
      newValue: parsed.data
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.corrigendum-notice.toggle', error)

    return NextResponse.json({ error: 'Failed to update.' }, { status: 500 })
  }
}
