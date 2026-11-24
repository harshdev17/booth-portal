import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const toggleSchema = z.object({ enabled: z.boolean() })

/** Admin: turn the entire homepage Corrigendum popup on/off, independent of its rows. */
export async function PATCH(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = await request.json()
    const parsed = toggleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    await query(
      `UPDATE corrigendum_notice_settings SET enabled = ?, updated_by_user_id = ? WHERE id = 1`,
      [parsed.data.enabled ? 1 : 0, session.userId]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'corrigendum_notice.toggled',
      module: 'settings',
      entityType: 'corrigendum_notice_settings',
      entityId: '1',
      newValue: { enabled: parsed.data.enabled }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.corrigendum-notice.toggle', error)

    return NextResponse.json({ error: 'Failed to update.' }, { status: 500 })
  }
}
