'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import {
  getPaymentForApplication,
  recordAdminReconciled,
  recordPossibleDoublePayment,
  recordRazorpayAttemptStatus,
  type PaymentPurpose
} from '@/lib/payments/payment-records'
import { fetchRazorpayOrderPayments } from '@/lib/payments/razorpay'
import { requirePermission } from '@/lib/rbac/authorize'

export type ReconcileActionState = {
  error?: string
  success?: string
}

const reconcileSchema = z.object({
  paymentId: z.coerce.number().int().positive()
})

/**
 * Admin-triggered fallback for the case where a payment genuinely succeeded
 * on Razorpay's side but neither the client-side checkout handler() nor the
 * webhook (unconfigured as of this writing — see .ai/CHANGELOG.md) ever
 * reported it back to this app. Fetches the real payment state directly from
 * Razorpay's API (never trusts anything the admin or client supplied) and
 * only records success if Razorpay itself reports a captured payment.
 *
 * Checks EVERY order_id ever created for this payment (from
 * payment_transactions), not just the current payments.razorpay_order_id —
 * see bulkReconcilePaymentsAction's doc comment for why: each "Pay Now"
 * retry overwrites the row's order_id, so a payment that actually succeeded
 * on an EARLIER order would otherwise never be found.
 */
export async function reconcilePaymentAction(
  _prevState: ReconcileActionState,
  formData: FormData
): Promise<ReconcileActionState> {
  const parsed = reconcileSchema.safeParse({ paymentId: formData.get('paymentId') })

  if (!parsed.success) {
    return { error: 'Invalid request.' }
  }

  const session = await requirePermission('payment:reconcile')

  const rows = await query<
    Array<{
      id: number
      application_id: number
      purpose: PaymentPurpose
      amount_paise: number
      status: string
      razorpay_order_id: string | null
    }>
  >(
    `SELECT id, application_id, purpose, amount_paise, status, razorpay_order_id FROM payments WHERE id = ? LIMIT 1`,
    [parsed.data.paymentId]
  )

  const payment = rows[0]

  if (!payment) {
    return { error: 'Payment not found.' }
  }

  if (payment.status === 'success') {
    return { error: 'This payment is already recorded as successful.' }
  }

  if (!payment.razorpay_order_id) {
    return { error: 'This payment has no Razorpay order to reconcile against.' }
  }

  const orderIdRows = await query<Array<{ razorpay_order_id: string }>>(
    `SELECT DISTINCT razorpay_order_id FROM payment_transactions
     WHERE payment_id = ? AND type = 'order_created' AND razorpay_order_id IS NOT NULL
     ORDER BY id DESC`,
    [payment.id]
  )

  const orderIds = orderIdRows.length > 0 ? orderIdRows.map(r => r.razorpay_order_id) : [payment.razorpay_order_id]

  let captured: { id: string } | null = null
  let capturedOrderId: string | null = null
  let latestStatus: string | null = null
  const capturedOnOtherOrders: string[] = []

  try {
    for (const orderId of orderIds) {
      const razorpayPayments = await fetchRazorpayOrderPayments(orderId)

      if (orderId === payment.razorpay_order_id) {
        latestStatus = razorpayPayments[razorpayPayments.length - 1]?.status ?? null
      }

      const thisCaptured = razorpayPayments.find(p => p.status === 'captured' && p.captured)

      if (thisCaptured) {
        if (!captured) {
          captured = thisCaptured
          capturedOrderId = orderId
        } else if (orderId !== capturedOrderId) {
          capturedOnOtherOrders.push(orderId)
        }
      }
    }
  } catch {
    return { error: 'Could not reach Razorpay to verify this payment. Please try again.' }
  }

  // Record the raw Razorpay-side status regardless of outcome, so the admin
  // can tell "no attempt made" apart from "in progress" even when nothing
  // was captured/failed this check.
  await recordRazorpayAttemptStatus(payment.id, latestStatus)

  if (capturedOnOtherOrders.length > 0 && capturedOrderId) {
    await recordPossibleDoublePayment(payment.id, [capturedOrderId, ...capturedOnOtherOrders])
  }

  if (!captured || !capturedOrderId) {
    return {
      error:
        orderIds.length > 1
          ? `Razorpay does not show a captured payment on any of the ${orderIds.length} orders created for this payment. Nothing was changed.`
          : 'Razorpay does not show a captured payment for this order. Nothing was changed.'
    }
  }

  // Re-fetch to guard against a race with a concurrent webhook/client confirmation.
  const current = await getPaymentForApplication(payment.application_id, payment.purpose)

  if (!current || current.status === 'success') {
    return { error: 'This payment is already recorded as successful.' }
  }

  const transition = await recordAdminReconciled({
    paymentId: payment.id,
    applicationId: payment.application_id,
    amountPaise: payment.amount_paise,
    razorpayOrderId: capturedOrderId,
    razorpayPaymentId: captured.id
  })

  await logAudit({
    actorUserId: session.userId,
    actorRoleKey: session.role.key,
    action: 'payment.admin_reconciled',
    module: 'payments',
    entityType: 'payment',
    entityId: String(payment.id),
    previousValue: transition ? { status: transition.previousStatus } : undefined,
    newValue: {
      applicationId: payment.application_id,
      razorpayOrderId: capturedOrderId,
      razorpayPaymentId: captured.id,
      amountPaise: payment.amount_paise,
      checkedOrderIds: orderIds,
      ...(capturedOnOtherOrders.length > 0
        ? { possibleDoublePayment: true, otherCapturedOrderIds: capturedOnOtherOrders }
        : {}),
      ...(transition ? { status: transition.newStatus } : {})
    }
  })

  // Payment ids in the URL are opaque, randomly-reencrypted tokens (see
  // src/lib/security/opaque-id.ts) — encodeId() can't reproduce the exact
  // token in the admin's address bar, so a path-specific revalidatePath()
  // can't target it. Not needed anyway: the payment detail page is an
  // uncached server component that queries the DB fresh on every request.
  revalidatePath('/admin/payments')

  return { success: `Payment confirmed as captured on Razorpay (${captured.id}) and marked successful.` }
}
