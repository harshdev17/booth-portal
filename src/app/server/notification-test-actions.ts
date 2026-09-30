'use server'

import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import type { NotificationCategory } from '@/lib/notifications/types'
import { sendNotification } from '@/lib/notifications/service'
import { requirePermission } from '@/lib/rbac/authorize'

export type SendTestMessageState = {
  error?: string
  success?: string
}

const testMessageSchema = z.object({
  category: z.enum([
    'otp',
    'application_confirmation',
    'payment_confirmation',
    'status_update',
    'document_query',
    'pay_now_activation',
    'reminder'
  ]),
  mobileNumber: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
})

// Realistic sample values matching each category's real call site
// (application-status.ts, document-query.ts, otp.ts) so a test send previews
// what an applicant actually receives — not placeholder text unrelated to
// the approved template's variable count/order.
function buildSampleParams(category: NotificationCategory): { templateParams: string[]; buttonParam?: string } {
  switch (category) {
    case 'otp': {
      const code = '123456'

      return { templateParams: [code], buttonParam: code }
    }

    case 'application_confirmation':
      return { templateParams: ['Test Applicant', 'IGM-2026-000000'] }
    case 'payment_confirmation':
      return { templateParams: ['Test Applicant', 'IGM-2026-000000', '118'] }
    case 'status_update':
      return { templateParams: ['Test Applicant', 'IGM-2026-000000', 'Under Review'] }
    case 'document_query':
      return { templateParams: ['Test Applicant', 'IGM-2026-000000', 'Aadhaar Card', 'Please upload a clearer copy.'] }
    case 'pay_now_activation':
      return { templateParams: ['Test Applicant', 'IGM-2026-000000'] }
    case 'reminder':
      return { templateParams: ['Test Applicant', 'IGM-2026-000000'] }
  }
}

/**
 * Admin-only tool to send a real WhatsApp test message for any configured
 * notification category, to verify a template/campaign actually works end
 * to end (e.g. the "Button at index 0 ... requires a parameter" failure —
 * see CHANGELOG.md 2026-09-29 — was only caught by a real send, not by
 * config alone). Uses the same sendNotification()/notification_log path as
 * every real notification, so a successful test here means the real flow
 * will also work; sends to the admin's own supplied number only, never an
 * applicant's number pulled from the database.
 */
export async function sendTestNotification(_prevState: SendTestMessageState, formData: FormData): Promise<SendTestMessageState> {
  const parsed = testMessageSchema.safeParse({
    category: formData.get('category'),
    mobileNumber: formData.get('mobileNumber')
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  }

  const session = await requirePermission('config:manage')

  const { templateParams, buttonParam } = buildSampleParams(parsed.data.category)
  const destination = `+91${parsed.data.mobileNumber}`

  const sent = await sendNotification({
    category: parsed.data.category,
    destination,
    userName: 'Test Applicant',
    templateParams,
    buttonParam
  })

  await logAudit({
    actorUserId: session.userId,
    actorRoleKey: session.role.key,
    action: 'notification.test_send',
    module: 'settings',
    entityType: 'notification_category',
    entityId: parsed.data.category,
    newValue: { destination, sent }
  })

  if (!sent) {
    return { error: 'Send failed — check notification_log for the reason (e.g. campaign not approved/published yet).' }
  }

  return { success: `Test message sent to +91${parsed.data.mobileNumber}. Check that number's WhatsApp.` }
}
