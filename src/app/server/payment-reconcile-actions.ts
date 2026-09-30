'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { getPaymentForApplication, recordAdminReconciled, type PaymentPurpose } from '@/lib/payments/payment-records'
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

  let razorpayPayments

  try {
    razorpayPayments = await fetchRazorpayOrderPayments(payment.razorpay_order_id)
  } catch {
    return { error: 'Could not reach Razorpay to verify this payment. Please try again.' }
  }

  const captured = razorpayPayments.find(p => p.status === 'captured' && p.captured)

  if (!captured) {
    return { error: 'Razorpay does not show a captured payment for this order. Nothing was changed.' }
  }

  // Re-fetch to guard against a race with a concurrent webhook/client confirmation.
  const current = await getPaymentForApplication(payment.application_id, payment.purpose)

  if (!current || current.status === 'success') {
    return { error: 'This payment is already recorded as successful.' }
  }

  await recordAdminReconciled({
    paymentId: payment.id,
    applicationId: payment.application_id,
    amountPaise: payment.amount_paise,
    razorpayOrderId: payment.razorpay_order_id,
    razorpayPaymentId: captured.id
  })

  await logAudit({
    actorUserId: session.userId,
    actorRoleKey: session.role.key,
    action: 'payment.admin_reconciled',
    module: 'payments',
    entityType: 'payment',
    entityId: String(payment.id),
    newValue: {
      applicationId: payment.application_id,
      razorpayOrderId: payment.razorpay_order_id,
      razorpayPaymentId: captured.id,
      amountPaise: payment.amount_paise
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
