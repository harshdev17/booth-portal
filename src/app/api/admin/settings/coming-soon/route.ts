import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const bodySchema = z.object({ enabled: z.boolean() })

/** Turns the site-wide Coming Soon gate on or off (config:manage). */
export async function PATCH(request: Request) {
  try {
    const session = await requirePermission('config:manage')
    const parsed = bodySchema.safeParse(await request.json().catch(() => null))

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    await query(
      `INSERT INTO site_mode_settings (id, coming_soon_enabled, updated_by_user_id) VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE coming_soon_enabled = VALUES(coming_soon_enabled), updated_by_user_id = VALUES(updated_by_user_id)`,
      [parsed.data.enabled ? 1 : 0, session.userId]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'settings.coming_soon_updated',
      module: 'settings',
      entityType: 'site_mode_settings',
      entityId: '1',
      newValue: { comingSoon: parsed.data.enabled }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.settings.coming-soon', error)

    return NextResponse.json({ error: 'Failed to update Coming Soon mode.' }, { status: 500 })
  }
}
