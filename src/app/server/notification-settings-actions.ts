'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { clearNotificationSettingsCache } from '@/lib/settings/notification-settings'

export type NotificationSettingsActionState = {
  error?: string
  success?: string
}

const toggleSchema = z.object({
  enabled: z.enum(['true', 'false'])
})

/**
 * Turns WhatsApp notifications on/off site-wide (migration 0071). Email is
 * never affected by this — it is always sent in parallel regardless. See
 * sendNotification() (src/lib/notifications/service.ts) for where this
 * flag is actually enforced.
 */
export async function toggleWhatsappNotificationsAction(
  _prevState: NotificationSettingsActionState,
  formData: FormData
): Promise<NotificationSettingsActionState> {
  const parsed = toggleSchema.safeParse({ enabled: formData.get('enabled') })

  if (!parsed.success) {
    return { error: 'Invalid request.' }
  }

  const session = await requirePermission('config:manage')
  const enabled = parsed.data.enabled === 'true'

  await query(
    `INSERT INTO notification_settings (id, whatsapp_enabled, updated_by_user_id)
     VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE whatsapp_enabled = VALUES(whatsapp_enabled), updated_by_user_id = VALUES(updated_by_user_id)`,
    [enabled ? 1 : 0, session.userId]
  )

  await logAudit({
    actorUserId: session.userId,
    actorRoleKey: session.role.key,
    action: 'settings.whatsapp_notifications_toggled',
    module: 'settings',
    entityType: 'notification_settings',
    entityId: '1',
    newValue: { whatsappEnabled: enabled }
  })

  clearNotificationSettingsCache()
  revalidatePath('/admin/settings/notifications')

  return { success: enabled ? 'WhatsApp notifications turned ON.' : 'WhatsApp notifications turned OFF — notifications will be sent by email only.' }
}
