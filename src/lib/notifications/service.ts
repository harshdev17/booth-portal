import 'server-only'

import { query } from '@/lib/db/client'
import { AiSensyNotificationService } from '@/lib/notifications/aisensy'
import type { NotificationService, SendTemplateMessageInput } from '@/lib/notifications/types'
import { logServerError } from '@/lib/security/error-log'

// Single entry point business code should call — wraps the configured
// provider adapter with the mandatory notification_log write (see
// .ai/NOTIFICATIONS.md Section 5: "send attempts should be logged for
// operational visibility"). Swapping providers later means changing only
// this factory, never any call site.

let service: NotificationService | null = null

function getService(): NotificationService {
  if (!service) {
    service = new AiSensyNotificationService()
  }

  return service
}

/**
 * Sends a WhatsApp template message and logs the attempt. Never throws —
 * callers that must know whether the message reached the provider (e.g. the
 * OTP flow, which needs to tell the applicant to retry) use the boolean
 * return value; callers that fire-and-forget a notification (e.g. a status
 * change) can safely ignore it, since a notification failure must never
 * block the business action that triggered it.
 */
export async function sendNotification(input: SendTemplateMessageInput): Promise<boolean> {
  const result = await getService()
    .sendTemplateMessage(input)
    .catch(error => ({ ok: false as const, error: error instanceof Error ? error.message : 'Unknown provider error.' }))

  try {
    await query(
      `INSERT INTO notification_log (channel, provider, category, application_id, destination, campaign_name, status, error_message)
       VALUES ('whatsapp', 'aisensy', ?, ?, ?, ?, ?, ?)`,
      [
        input.category,
        input.applicationId ?? null,
        input.destination,
        process.env[`AISENSY_CAMPAIGN_${input.category.toUpperCase()}`] ?? null,
        result.ok ? 'sent' : 'failed',
        result.ok ? null : result.error.slice(0, 512)
      ]
    )
  } catch (error) {
    logServerError('notifications.log-write', error)
  }

  return result.ok
}
