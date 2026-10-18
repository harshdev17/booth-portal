import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { recordOrderCreated } from '@/lib/payments/payment-records'
import { createRazorpayOrder } from '@/lib/payments/razorpay'
import { requirePermission } from '@/lib/rbac/authorize'
import { decodeId } from '@/lib/security/opaque-id'

type AppRow = {
  id: number
  application_number: string
  representative_name: string
  status: string
  category_id: number
  category_allotment_amount_paise: number | null
  direct_payment_amount_paise: number | null
  payment_id: number | null
  payment_amount_paise: number | null
  payment_status: string | null
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('allotment:perform')

  const { id } = await params
  const applicationId = decodeId(id) ?? (Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : null)

  if (applicationId === null) {
    return NextResponse.json({ error: 'Invalid application ID.' }, { status: 400 })
  }

  try {
    const rows = await query<AppRow[]>(
      `SELECT a.id, a.application_number, a.representative_name, a.status, a.category_id,
              c.allotment_amount_paise AS category_allotment_amount_paise,
              da.payment_amount_paise AS direct_payment_amount_paise,
              p.id AS payment_id, p.amount_paise AS payment_amount_paise, p.status AS payment_status
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

    if (app.payment_status === 'success') {
      return NextResponse.json(
        { error: 'Payment has already been successfully received for this application.' },
        { status: 409 }
      )
    }

    const amountPaise = Number(
      app.payment_amount_paise || app.direct_payment_amount_paise || app.category_allotment_amount_paise || 0
    )

    if (amountPaise <= 0) {
      return NextResponse.json(
        { error: 'This application is exempt or has zero allotment fee. No payment link needed.' },
        { status: 400 }
      )
    }

    // Generate fresh Razorpay order
    const order = await createRazorpayOrder({
      amountPaise,
      receipt: `${app.application_number}-R${Date.now().toString().slice(-4)}`,
      notes: { applicationId: String(app.id), purpose: 'pay_now' }
    })

    await query(
      `INSERT INTO payments (application_id, purpose, amount_paise, status, razorpay_order_id)
       VALUES (?, 'pay_now', ?, 'not_initiated', ?)
       ON DUPLICATE KEY UPDATE amount_paise = ?, status = 'not_initiated', razorpay_order_id = ?`,
      [app.id, amountPaise, order.id, amountPaise, order.id]
    )

    await recordOrderCreated({
      applicationId: app.id,
      purpose: 'pay_now',
      amountPaise,
      razorpayOrderId: order.id
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const paymentUrl = `${baseUrl.replace(/\/+$/, '')}/status?appNo=${encodeURIComponent(app.application_number)}`

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'payment_link.regenerated',
      module: 'payments',
      entityType: 'application',
      entityId: String(app.id),
      newValue: {
        razorpayOrderId: order.id,
        amountPaise,
        paymentUrl
      }
    })

    return NextResponse.json({
      success: true,
      paymentUrl,
      razorpayOrderId: order.id,
      amountRupees: amountPaise / 100,
      message: 'New payment order generated successfully.'
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate payment link.' },
      { status: 500 }
    )
  }
}
