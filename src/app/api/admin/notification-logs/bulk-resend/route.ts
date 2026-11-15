import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { sendNotification } from '@/lib/notifications/service'
import type { NotificationCategory } from '@/lib/notifications/types'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

type NotificationLogRow = {
  id: number
  channel: 'whatsapp' | 'sms' | 'email'
  category: string
  destination: string
  status: 'sent' | 'failed'
  application_id: number | null
}

type ApplicationRow = {
  id: number
  application_number: string
  representative_name: string
  mobile_number: string
  email: string | null
}

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')

const payLinkFor = (applicationNumber: string) =>
  baseUrl ? `${baseUrl}/status?appNo=${encodeURIComponent(applicationNumber)}` : ''

/**
 * Categories whose templateParams are fully derivable from the application's
 * CURRENT state — safe to reconstruct and resend outright.
 */
function buildReconstructableParams(category: string, app: ApplicationRow): string[] | null {
  switch (category) {
    case 'application_confirmation':
      return [app.representative_name, app.application_number]
    case 'reminder':
    case 'pay_now_activation':
    case 'direct_allotment_payment':
      return [app.representative_name, app.application_number, payLinkFor(app.application_number)]
    case 'direct_allotment_confirmed':
    case 'auction_final_payment':
      return [app.representative_name, app.application_number, payLinkFor(app.application_number)]
    default:
      return null
  }
}

/**
 * Categories whose original free-text (a rejection reason, a document query
 * remark) is NOT stored on notification_log — only in the audit_logs entry
 * logged at the moment of the original action. Recovered by finding the
 * CLOSEST-timestamp matching audit_logs row for this application (per
 * explicit request: when an application has multiple such events, use the
 * most recent one relative to the failed notification's own timestamp,
 * accepting the small ambiguity risk rather than skipping it).
 */
async function recoverFreeTextParams(
  category: string,
  app: ApplicationRow,
  applicationId: number,
  failedAt: string
): Promise<string[] | null> {
  if (category === 'application_rejected') {
    const rows = await query<Array<{ new_value: string | null }>>(
      `SELECT new_value FROM audit_logs
       WHERE entity_type = 'application' AND entity_id = ? AND action = 'application.rejected'
       ORDER BY ABS(TIMESTAMPDIFF(SECOND, created_at, ?)) ASC
       LIMIT 1`,
      [String(applicationId), failedAt]
    )

    const value = rows[0]?.new_value as unknown as { reason?: string } | null

    if (!value?.reason) return null

    return [app.representative_name, app.application_number, value.reason]
  }

  if (category === 'document_query') {
    // Logged against entityType 'application_document' (the specific
    // document row), not 'application' — scope the match to documents
    // belonging to THIS application via a join, then pick the closest in time.
    const rows = await query<Array<{ new_value: string | null }>>(
      `SELECT al.new_value
       FROM audit_logs al
       JOIN application_documents ad ON ad.id = al.entity_id AND al.entity_type = 'application_document'
       WHERE ad.application_id = ? AND al.action = 'document.query'
       ORDER BY ABS(TIMESTAMPDIFF(SECOND, al.created_at, ?)) ASC
       LIMIT 1`,
      [applicationId, failedAt]
    )

    const value = rows[0]?.new_value as unknown as { remarks?: string; filename?: string } | null

    if (!value?.remarks) return null

    // The original notifyDocumentQuery() call combines a document LABEL
    // (not filename) with remarks into one param — the label isn't captured
    // in this audit entry, only the filename, so a generic fallback label is
    // used here rather than guessing the wrong document type's name.
    return [app.representative_name, app.application_number, `Document: ${value.remarks}`]
  }

  return null
}

export async function POST(request: Request) {
  const session = await requirePermission('notification:resend')

  let body: { notificationLogIds?: number[] }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rawIds = Array.isArray(body.notificationLogIds) ? body.notificationLogIds : []
  const ids = rawIds.filter((id): id is number => Number.isInteger(id) && id > 0)

  if (ids.length === 0) {
    return NextResponse.json({ error: 'No notifications selected.' }, { status: 400 })
  }

  if (ids.length > 200) {
    return NextResponse.json({ error: 'Too many notifications selected at once (max 200).' }, { status: 400 })
  }

  try {
    const placeholders = ids.map(() => '?').join(', ')

    const logs = await query<Array<NotificationLogRow & { created_at: string }>>(
      `SELECT id, channel, category, destination, status, application_id, created_at
       FROM notification_log WHERE id IN (${placeholders})`,
      ids
    )

    let resentCount = 0
    let skippedOtpCount = 0
    let skippedUnresolvableCount = 0
    let failedCount = 0

    for (const log of logs) {
      // Only ever resend a genuinely failed attempt — never re-sends a
      // successful one, and silently skips a stale client-side selection
      // (e.g. the row changed status between page load and this request).
      if (log.status !== 'failed') continue

      // Resending a literal OTP is impossible by design — only its hash is
      // stored (otp_challenges.code_hash), never the plaintext code.
      if (log.category === 'otp') {
        skippedOtpCount += 1
        continue
      }

      if (!log.application_id) {
        skippedUnresolvableCount += 1
        continue
      }

      try {
         
        const appRows = await query<ApplicationRow[]>(
          `SELECT id, application_number, representative_name, mobile_number, email FROM applications WHERE id = ? LIMIT 1`,
          [log.application_id]
        )

        const app = appRows[0]

        if (!app) {
          skippedUnresolvableCount += 1
          continue
        }

        const reconstructable = buildReconstructableParams(log.category, app)

         
        const templateParams =
          reconstructable ?? (await recoverFreeTextParams(log.category, app, log.application_id, log.created_at))

        if (!templateParams) {
          skippedUnresolvableCount += 1
          continue
        }

        const destination = app.mobile_number.startsWith('+')
          ? app.mobile_number
          : `+91${app.mobile_number.replace(/\D/g, '').slice(-10)}`

        // Sequential, not Promise.all — avoids bursting AiSensy's API with
        // many simultaneous requests from one admin click, same reasoning as
        // bulk-payment-reminder/route.ts.
         
        const ok = await sendNotification({
          category: log.category as NotificationCategory,
          destination,
          userName: app.representative_name,
          templateParams,
          applicationId: app.id,
          email: app.email
        })

        if (ok) resentCount += 1
        else failedCount += 1

         
        await logAudit({
          actorUserId: session.userId,
          actorRoleKey: session.role.key,
          action: 'notification.resent',
          module: 'notifications',
          entityType: 'notification_log',
          entityId: String(log.id),
          newValue: { category: log.category, applicationId: app.id, applicationNumber: app.application_number, ok }
        })
      } catch (err) {
        console.error(`[bulk-resend] Failed for notification_log ${log.id}:`, err)
        failedCount += 1
      }
    }

    return NextResponse.json({ resentCount, skippedOtpCount, skippedUnresolvableCount, failedCount })
  } catch (error) {
    logServerError('api.admin.notification-logs.bulk-resend', error)

    return NextResponse.json({ error: 'Failed to resend notifications.' }, { status: 500 })
  }
}
