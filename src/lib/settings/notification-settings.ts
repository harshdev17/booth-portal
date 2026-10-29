import 'server-only'

import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'

export type NotificationSettings = {
  whatsappEnabled: boolean
}

// WhatsApp defaults ON if the single row is somehow missing (migration
// 0071 seeds it, so this is defence in depth, not the expected path) —
// never silently go email-only because of a read failure.
const FALLBACK: NotificationSettings = { whatsappEnabled: true }

let cached: NotificationSettings | null = null
let cachedAt = 0
const TTL_MS = 30_000

export function clearNotificationSettingsCache(): void {
  cached = null
  cachedAt = 0
}

/**
 * The single notification-settings row — see migration 0071. Read by
 * sendNotification() (src/lib/notifications/service.ts) before every
 * WhatsApp send attempt. Cached briefly since this is checked on every
 * single notification send, not just page loads.
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const now = Date.now()

  if (cached && now - cachedAt < TTL_MS) return cached

  try {
    const rows = await query<Array<{ whatsapp_enabled: number }>>(
      `SELECT whatsapp_enabled FROM notification_settings WHERE id = 1 LIMIT 1`
    )

    const row = rows[0]

    if (!row) return FALLBACK

    const result: NotificationSettings = { whatsappEnabled: row.whatsapp_enabled === 1 }

    cached = result
    cachedAt = now

    return result
  } catch (error) {
    logServerError('settings.notifications.read', error)

    return FALLBACK
  }
}
