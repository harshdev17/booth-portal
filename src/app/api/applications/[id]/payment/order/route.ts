import { NextResponse } from 'next/server'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { getCategoryById } from '@/lib/applications/categories'
import { query } from '@/lib/db/client'
import { createRazorpayOrder, getRazorpayKeyId, RazorpayApiError } from '@/lib/payments/razorpay'
import { recordOrderCreated } from '@/lib/payments/payment-records'
import { logAudit } from '@/lib/audit/log'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

type ApplicationRow = {
  id: number
  category_id: number
  access_token_hash: string
  status: string
  application_number: string
}

/**
 * Creates (or re-creates, on retry) a Razorpay order for an application's
 * registration fee. Ownership is proven with the same access token issued
 * at finalize (this call happens moments later, in the same browser
 * session, from the Payment page — see .ai/DECISIONS.md, same trust
 * boundary as /api/applications/summary). The fee amount is always read
 * fresh from the category's configuration here — never accepted from the
 * client (.ai/PAYMENT.md Section 8).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ipAddress } = getRequestMeta(request)
  const rateLimitKey = ipAddress ?? 'unknown'

  if (isRateLimited('applications.payment.order', rateLimitKey, RATE_LIMITS.paymentOrder)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  const { id } = await params
  const applicationId = Number(id)

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: 'Invalid application.' }, { status: 400 })
  }

  const authHeader = request.headers.get('authorization')
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
  }

  try {
    const rows = await query<ApplicationRow[]>(
      `SELECT id, category_id, access_token_hash, status, application_number FROM applications WHERE id = ? LIMIT 1`,
      [applicationId]
    )

    const application = rows[0]

    if (!application || !verifyAccessToken(accessToken, application.access_token_hash)) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    if (application.status !== 'payment_pending' && application.status !== 'payment_failed') {
      return NextResponse.json(
        { error: `This application is "${application.status}" and is not awaiting payment.` },
        { status: 409 }
      )
    }

    const category = await getCategoryById(application.category_id)

    if (!category || category.fee_paise === null) {
      return NextResponse.json({ error: 'No fee is configured for this category yet.' }, { status: 409 })
    }

    const order = await createRazorpayOrder({
      amountPaise: category.fee_paise,
      receipt: application.application_number,
      notes: { applicationId: String(applicationId), purpose: 'registration' }
    })

    await recordOrderCreated({
      applicationId,
      purpose: 'registration',
      amountPaise: category.fee_paise,
      razorpayOrderId: order.id
    })

    await logAudit({
      actorUserId: null,
      actorRoleKey: null,
      action: 'payment.order_created',
      module: 'payments',
      entityType: 'application',
      entityId: String(applicationId),
      newValue: { razorpayOrderId: order.id, amountPaise: category.fee_paise },
      ipAddress
    })

    return NextResponse.json({
      orderId: order.id,
      amountPaise: category.fee_paise,
      currency: order.currency,
      keyId: getRazorpayKeyId(),
      applicationNumber: application.application_number,
      categoryName: category.name
    })
  } catch (error) {
    if (error instanceof RazorpayApiError) {
      logServerError('api.applications.payment.order', error, { applicationId })

      return NextResponse.json({ error: 'Could not start the payment. Please try again shortly.' }, { status: 502 })
    }

    logServerError('api.applications.payment.order', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
