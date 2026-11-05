import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { sendNotification } from '@/lib/notifications/service'
import { requirePermission } from '@/lib/rbac/authorize'
import { decodeId } from '@/lib/security/opaque-id'

type AppRow = {
  id: number
  application_number: string
  representative_name: string
  mobile_number: string
  email: string
  status: string
  payment_status: string | null
  direct_allotment_id: number | null
}

/**
 * Bulk version of send-payment-reminder/route.ts, for the Applications list
 * page's "select rows via checkbox, send reminder to all" flow — per
 * explicit request (2026-11-05). Reuses the exact same eligibility rule and
 * campaign selection as the single-application button (same two dedicated
 * reminder campaigns, "pay_now_activation" / "direct_allotment_payment",
 * confirmed live in AiSensy — see that route's comment for why these are
 * distinct from the auto-sent activation/confirmation campaigns), applied
 * per-row instead of once. IDs with a completed payment are silently
 * skipped (not an error) — this button is explicitly "only send to the ones
 * still pending", not "send to whatever's selected regardless of status".
 */
export async function POST(request: Request) {
  const session = await requirePermission('application:view')

  let body: { applicationIds?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rawIds = Array.isArray(body.applicationIds) ? body.applicationIds : []

  if (rawIds.length === 0) {
    return NextResponse.json({ error: 'No applications selected.' }, { status: 400 })
  }

  if (rawIds.length > 200) {
    return NextResponse.json({ error: 'Too many applications selected at once (max 200).' }, { status: 400 })
  }

  const applicationIds = rawIds
    .map(id => decodeId(id) ?? (Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : null))
    .filter((id): id is number => id !== null)

  if (applicationIds.length === 0) {
    return NextResponse.json({ error: 'No valid application IDs in selection.' }, { status: 400 })
  }

  try {
    const placeholders = applicationIds.map(() => '?').join(', ')

    const rows = await query<AppRow[]>(
      `SELECT a.id, a.application_number, a.representative_name, a.mobile_number, a.email, a.status,
              COALESCE(p.status, da.payment_status) AS payment_status,
              da.id AS direct_allotment_id
       FROM applications a
       LEFT JOIN payments p ON p.application_id = a.id AND p.purpose = 'pay_now'
       LEFT JOIN direct_allotments da ON da.application_id = a.id AND da.status = 'active'
       WHERE a.id IN (${placeholders})`,
      applicationIds
    )

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')

    let sentCount = 0
    let skippedPaidCount = 0
    const failedApplicationNumbers: string[] = []

    for (const app of rows) {
      const isPaid = app.payment_status === 'success' || app.payment_status === 'paid' || app.status === 'paid'

      if (isPaid) {
        skippedPaidCount += 1
        continue
      }

      try {
        const destination = app.mobile_number.startsWith('+')
          ? app.mobile_number
          : `+91${app.mobile_number.replace(/\D/g, '').slice(-10)}`

        const payLink = baseUrl ? `${baseUrl}/status?appNo=${encodeURIComponent(app.application_number)}` : ''
        const isDirectAllotment = Boolean(app.direct_allotment_id)

        const campaignOverride = isDirectAllotment
          ? (process.env.AISENSY_CAMPAIGN_ALLOTMENT_PAYMENT_REMINDER || 'direct_allotment_payment')
          : (process.env.AISENSY_CAMPAIGN_REGISTRATION_PAYMENT_REMINDER || 'pay_now_activation')

        // Sequential, not Promise.all — avoids bursting AiSensy's API with
        // dozens of simultaneous requests from one admin click.
        // eslint-disable-next-line no-await-in-loop
        await sendNotification({
          category: 'reminder',
          campaignOverride,
          destination,
          userName: app.representative_name,
          templateParams: [app.representative_name, app.application_number, payLink],
          applicationId: app.id,
          email: app.email
        })

        sentCount += 1

        // eslint-disable-next-line no-await-in-loop
        await logAudit({
          actorUserId: session.userId,
          actorRoleKey: session.role.key,
          action: 'application.payment_reminder_sent',
          module: 'notifications',
          entityType: 'application',
          entityId: String(app.id),
          newValue: {
            destination,
            email: app.email,
            campaign: campaignOverride,
            isDirectAllotment,
            applicationNumber: app.application_number,
            bulk: true
          }
        })
      } catch (err) {
        console.error(`[bulk-payment-reminder] Failed for application ${app.application_number}:`, err)
        failedApplicationNumbers.push(app.application_number)
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      skippedPaidCount,
      failedApplicationNumbers,
      message: `Reminder sent to ${sentCount} application${sentCount === 1 ? '' : 's'}.${
        skippedPaidCount > 0 ? ` Skipped ${skippedPaidCount} already-paid.` : ''
      }${failedApplicationNumbers.length > 0 ? ` Failed for ${failedApplicationNumbers.length}.` : ''}`
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send bulk reminders.' },
      { status: 500 }
    )
  }
}
