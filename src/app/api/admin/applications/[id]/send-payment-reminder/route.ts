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
  organisation_name: string
  mobile_number: string
  email: string
  status: string
  category_name: string
  payment_amount_paise: number | null
  payment_status: string | null
  direct_allotment_id: number | null
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('application:view')

  const { id } = await params
  const applicationId = decodeId(id) ?? (Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : null)

  if (applicationId === null) {
    return NextResponse.json({ error: 'Invalid application ID.' }, { status: 400 })
  }

  try {
    const rows = await query<AppRow[]>(
      `SELECT a.id, a.application_number, a.representative_name, a.organisation_name,
              a.mobile_number, a.email, a.status,
              c.name AS category_name,
              COALESCE(p.amount_paise, da.payment_amount_paise) AS payment_amount_paise,
              COALESCE(p.status, da.payment_status) AS payment_status,
              da.id AS direct_allotment_id
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN payments p ON p.application_id = a.id AND p.purpose = 'pay_now'
       LEFT JOIN direct_allotments da ON da.application_id = a.id AND da.status = 'active'
       WHERE a.id = ?
       LIMIT 1`,
      [applicationId]
    )

    const app = rows[0]
    if (!app) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    const destination = app.mobile_number.startsWith('+') ? app.mobile_number : `+91${app.mobile_number.replace(/\D/g, '').slice(-10)}`

    if (app.payment_status === 'success' || app.status === 'paid') {
      return NextResponse.json({ error: 'Payment is already completed for this application.' }, { status: 400 })
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
    const payLink = baseUrl ? `${baseUrl}/status?appNo=${encodeURIComponent(app.application_number)}` : ''

    const isDirectAllotment = Boolean(app.direct_allotment_id)
    const campaignOverride = isDirectAllotment
      ? (process.env.AISENSY_CAMPAIGN_DIRECT_ALLOTMENT_PAYMENT || 'gita_mahotsav_direct_allotment_pay_iavxd')
      : (process.env.AISENSY_CAMPAIGN_PAY_NOW_ACTIVATION || 'gita_mahotsav_draw_payment')

    // Fire notification in background so admin UI responds instantaneously (<100ms)
    // without waiting for Gmail SMTP and external WhatsApp API handshakes.
    sendNotification({
      category: 'reminder',
      campaignOverride,
      destination,
      userName: app.representative_name,
      templateParams: [app.representative_name, app.application_number, payLink],
      applicationId: app.id,
      email: app.email
    }).catch(err => {
      console.error('[send-payment-reminder] Background send error:', err)
    })

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
        applicationNumber: app.application_number
      }
    })

    return NextResponse.json({
      success: true,
      message: `Payment reminder dispatched to ${app.representative_name} (${destination} & ${app.email}).`
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send reminder notification.' },
      { status: 500 }
    )
  }
}
