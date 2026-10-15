'use server'

import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { isEmailConfigured, sendEmail } from '@/lib/notifications/email'
import { requirePermission } from '@/lib/rbac/authorize'

export type SendTestEmailState = {
  error?: string
  success?: string
}

const schema = z.object({ email: z.string().trim().email('Enter a valid email address.').max(191) })

/**
 * Admin-only: sends one plain email through the configured SMTP settings so
 * the connection can be verified without making an application. Goes only to
 * the address typed here.
 */
export async function sendTestEmail(_prev: SendTestEmailState, formData: FormData): Promise<SendTestEmailState> {
  const parsed = schema.safeParse({ email: formData.get('email') })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  }

  const session = await requirePermission('config:manage')

  if (!isEmailConfigured()) {
    return { error: 'Email is not connected yet. The technical team needs to complete the email setup first.' }
  }

  const result = await sendEmail({
    to: parsed.data.email,
    subject: '[IGM Booth/Stall Portal] Test email',
    text: 'This is a test email from the IGM Booth/Stall Portal. If you can read this, email is working.',
    html: '<p style="font-family:Arial,sans-serif;font-size:15px">This is a test email from the <b>IGM Booth/Stall Portal</b>. If you can read this, email is working.</p>'
  })

  await logAudit({
    actorUserId: session.userId,
    actorRoleKey: session.role.key,
    action: 'notification.test_email',
    module: 'settings',
    entityType: 'email',
    entityId: 'smtp',
    newValue: { to: parsed.data.email, sent: result.ok }
  })

  if (!result.ok) {
    return { error: `Could not send: ${result.error.slice(0, 200)}` }
  }

  return { success: `Test email sent to ${parsed.data.email}. Check the inbox (and spam folder).` }
}
