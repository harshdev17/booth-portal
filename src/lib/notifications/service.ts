import 'server-only'

import { query } from '@/lib/db/client'
import { AiSensyNotificationService } from '@/lib/notifications/aisensy'
import { getContactSettings } from '@/lib/settings/contact-settings'
import { buildEmailContent, isEmailConfigured, sendEmail } from '@/lib/notifications/email'
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
/**
 * TEST MODE (development / staging only). When NOTIFICATION_TEST_MODE=true,
 * every WhatsApp message, OTP and email is redirected to the one test mobile
 * number and email address below instead of the applicant's own — so the whole
 * apply flow can be exercised from the front end with real data shapes and
 * nobody else gets messaged. Never set this in production.
 *   NOTIFICATION_TEST_MOBILE  10-digit number (or with +91)
 *   NOTIFICATION_TEST_EMAIL   email address
 */
function applyTestRedirect(input: SendTemplateMessageInput): { input: SendTemplateMessageInput; redirected: boolean } {
  if (process.env.NOTIFICATION_TEST_MODE !== 'true') return { input, redirected: false }

  const mobile = process.env.NOTIFICATION_TEST_MOBILE?.replace(/\D/g, '').slice(-10)
  const email = process.env.NOTIFICATION_TEST_EMAIL?.trim()

  return {
    redirected: true,
    input: {
      ...input,
      destination: mobile ? `+91${mobile}` : input.destination,
      email: input.email ? (email ?? input.email) : input.email
    }
  }
}

export async function sendNotification(original: SendTemplateMessageInput): Promise<boolean> {
  const { input, redirected } = applyTestRedirect(original)

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

  // Also email the same message. A separate try so an email problem can never
  // change the WhatsApp outcome the caller relies on (e.g. the OTP flow).
  if (input.email) {
    try {
      const contact = await getContactSettings()
      const content = buildEmailContent(input.category, input.templateParams, contact)

      if (content && redirected) {
        content.subject = `[TEST] ${content.subject}`
      }

      const emailResult = content
        ? await sendEmail({ to: input.email, ...content })
        : ({ ok: false, error: 'No email template for this category.' } as const)

      await query(
        `INSERT INTO notification_log (channel, provider, category, application_id, destination, campaign_name, status, error_message)
         VALUES ('email', 'smtp', ?, ?, ?, NULL, ?, ?)`,
        [
          input.category,
          input.applicationId ?? null,
          input.email.slice(0, 191),
          emailResult.ok ? 'sent' : 'failed',
          emailResult.ok ? null : emailResult.error.slice(0, 512)
        ]
      )
    } catch (error) {
      logServerError('notifications.email', error, { configured: isEmailConfigured() })
    }
  }

  return result.ok
}
