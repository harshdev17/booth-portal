import { NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { notifyPaymentSuccess } from '@/lib/notifications/payment-success'
import { getPaymentForApplication, recordCheckoutFailure, recordCheckoutSuccess } from '@/lib/payments/payment-records'
import { verifyCheckoutSignature } from '@/lib/payments/razorpay'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

const verifySchema = z.object({
  razorpayOrderId: z.string().trim().min(1).max(64),
  razorpayPaymentId: z.string().trim().min(1).max(64),
  razorpaySignature: z.string().trim().min(1).max(256)
})

type ApplicationRow = {
  id: number
  access_token_hash: string
  status: string
  representative_name: string
  application_number: string
  mobile_number: string
}

/**
 * Server-side verification of a Razorpay Checkout.js success callback. A
 * client-reported "success" is never trusted alone — the HMAC signature is
 * recomputed here from the order id + payment id using the secret key
 * (.ai/PAYMENT.md Section 4, .ai/SECURITY.md). The webhook endpoint
 * (/api/webhooks/razorpay) is the second, independent confirmation path and
 * will reach the same state even if this call never happens (browser closed
 * mid-checkout, etc).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ipAddress } = getRequestMeta(request)
  const rateLimitKey = ipAddress ?? 'unknown'

  if (isRateLimited('applications.payment.verify', rateLimitKey, RATE_LIMITS.paymentVerify)) {
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

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = verifySchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Malformed payment confirmation.' }, { status: 400 })
  }

  try {
    const rows = await query<ApplicationRow[]>(
      `SELECT id, access_token_hash, status, representative_name, application_number, mobile_number FROM applications WHERE id = ? LIMIT 1`,
      [applicationId]
    )

    const application = rows[0]

    if (!application || !verifyAccessToken(accessToken, application.access_token_hash)) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const payment = await getPaymentForApplication(applicationId, 'registration')

    if (!payment || payment.razorpay_order_id !== parsed.data.razorpayOrderId) {
      return NextResponse.json({ error: 'This payment does not match an order for this application.' }, { status: 409 })
    }

    if (payment.status === 'success') {
      return NextResponse.json({ status: 'success' })
    }

    const signatureValid = verifyCheckoutSignature({
      razorpayOrderId: parsed.data.razorpayOrderId,
      razorpayPaymentId: parsed.data.razorpayPaymentId,
      razorpaySignature: parsed.data.razorpaySignature
    })

    if (!signatureValid) {
      await recordCheckoutFailure({
        paymentId: payment.id,
        applicationId,
        amountPaise: payment.amount_paise,
        razorpayOrderId: parsed.data.razorpayOrderId,
        razorpayPaymentId: parsed.data.razorpayPaymentId,
        failureReason: 'Signature verification failed.'
      })

      await logAudit({
        actorUserId: null,
        actorRoleKey: null,
        action: 'payment.verification_failed',
        module: 'payments',
        entityType: 'application',
        entityId: String(applicationId),
        newValue: { razorpayOrderId: parsed.data.razorpayOrderId, razorpayPaymentId: parsed.data.razorpayPaymentId },
        ipAddress
      })

      return NextResponse.json({ error: 'Payment verification failed. Please contact support if you were charged.' }, { status: 400 })
    }

    await recordCheckoutSuccess({
      paymentId: payment.id,
      applicationId,
      amountPaise: payment.amount_paise,
      razorpayOrderId: parsed.data.razorpayOrderId,
      razorpayPaymentId: parsed.data.razorpayPaymentId
    })

    await logAudit({
      actorUserId: null,
      actorRoleKey: null,
      action: 'payment.success',
      module: 'payments',
      entityType: 'application',
      entityId: String(applicationId),
      newValue: { razorpayOrderId: parsed.data.razorpayOrderId, razorpayPaymentId: parsed.data.razorpayPaymentId, amountPaise: payment.amount_paise },
      ipAddress
    })

    void notifyPaymentSuccess(applicationId, payment.amount_paise)

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    logServerError('api.applications.payment.verify', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
