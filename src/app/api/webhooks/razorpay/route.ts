import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import {
  getPaymentByRazorpayOrderId,
  recordWebhookConfirmed,
  recordWebhookFailure,
  webhookEventAlreadyProcessed
} from '@/lib/payments/payment-records'
import { verifyWebhookSignature } from '@/lib/payments/razorpay'
import { logServerError } from '@/lib/security/error-log'

type RazorpayPaymentEntity = {
  id: string
  order_id: string
  status: string
  amount: number
  error_description?: string | null
}

/**
 * Razorpay webhook receiver — the second, independent confirmation path
 * alongside /api/applications/[id]/payment/verify (.ai/PAYMENT.md Section
 * 4). Reaches "payment_success" even if the applicant's browser never calls
 * the verify endpoint (closed tab mid-checkout, network drop, etc). No
 * RBAC/session here by design — this is a server-to-server callback
 * authenticated only by the signature (.ai/SECURITY.md "webhook
 * verification"). The signature is verified against the raw body bytes,
 * before any JSON.parse — a re-serialized body will not match.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature')

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    logServerError('api.webhooks.razorpay', new Error('Invalid webhook signature'))

    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  let body: unknown

  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 })
  }

  const event = (body as { event?: string })?.event

  if (event !== 'payment.captured' && event !== 'payment.failed') {
    // Acknowledge and ignore event types we don't act on (order.paid, refund.*, etc).
    return NextResponse.json({ status: 'ignored' })
  }

  const paymentEntity = (body as { payload?: { payment?: { entity?: RazorpayPaymentEntity } } })?.payload?.payment?.entity

  if (!paymentEntity?.order_id || !paymentEntity?.id) {
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 })
  }

  // Razorpay's webhook payload carries no separate top-level event id across
  // every API version, so idempotency is keyed on (event type, Razorpay
  // payment id) instead — stable across a redelivery of the same event.
  const webhookEventId = `${event}:${paymentEntity.id}`

  try {
    if (await webhookEventAlreadyProcessed(webhookEventId)) {
      return NextResponse.json({ status: 'already_processed' })
    }

    const payment = await getPaymentByRazorpayOrderId(paymentEntity.order_id)

    if (!payment) {
      logServerError('api.webhooks.razorpay', new Error(`No payment found for order ${paymentEntity.order_id}`))

      return NextResponse.json({ status: 'no_matching_payment' })
    }

    if (event === 'payment.captured') {
      if (payment.status !== 'success') {
        await recordWebhookConfirmed({
          paymentId: payment.id,
          applicationId: payment.application_id,
          amountPaise: payment.amount_paise,
          razorpayOrderId: paymentEntity.order_id,
          razorpayPaymentId: paymentEntity.id,
          webhookEventId
        })

        await logAudit({
          actorUserId: null,
          actorRoleKey: null,
          action: 'payment.webhook_confirmed',
          module: 'payments',
          entityType: 'application',
          entityId: String(payment.application_id),
          newValue: { razorpayOrderId: paymentEntity.order_id, razorpayPaymentId: paymentEntity.id }
        })
      }
    } else {
      await recordWebhookFailure({
        paymentId: payment.id,
        applicationId: payment.application_id,
        amountPaise: payment.amount_paise,
        razorpayOrderId: paymentEntity.order_id,
        razorpayPaymentId: paymentEntity.id,
        failureReason: paymentEntity.error_description ?? 'Payment failed.',
        webhookEventId
      })

      await logAudit({
        actorUserId: null,
        actorRoleKey: null,
        action: 'payment.webhook_failed',
        module: 'payments',
        entityType: 'application',
        entityId: String(payment.application_id),
        newValue: { razorpayOrderId: paymentEntity.order_id, razorpayPaymentId: paymentEntity.id }
      })
    }

    return NextResponse.json({ status: 'processed' })
  } catch (error) {
    logServerError('api.webhooks.razorpay', error)

    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
