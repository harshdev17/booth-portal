import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { notifyApplicationStatusChange } from '@/lib/notifications/application-status'
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
              COALESCE(p.status, da.payment_status) AS payment_status
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
    const isPaymentPending = app.status === 'payment_required' || (app.payment_status && app.payment_status !== 'success' && app.payment_status !== 'exempt')

    if (isPaymentPending) {
      await sendNotification({
        category: 'pay_now_activation',
        destination,
        userName: app.representative_name,
        templateParams: [app.representative_name, app.application_number],
        buttonParam: app.application_number,
        applicationId: app.id,
        email: app.email
      })
    } else {
      await notifyApplicationStatusChange({
        applicationId: app.id,
        applicationNumber: app.application_number,
        mobileNumber: app.mobile_number,
        email: app.email,
        representativeName: app.representative_name,
        newStatus: app.status
      })
    }

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
        isPaymentPending,
        applicationNumber: app.application_number
      }
    })

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${app.representative_name} (${destination} & ${app.email}).`
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send reminder notification.' },
      { status: 500 }
    )
  }
}
