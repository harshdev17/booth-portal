'use server'

import { revalidatePath } from 'next/cache'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import {
  getPaymentForApplication,
  recordAdminReconciled,
  recordAdminReconciledFailure,
  recordRazorpayAttemptStatus,
  type PaymentPurpose
} from '@/lib/payments/payment-records'
import { fetchRazorpayOrderPayments } from '@/lib/payments/razorpay'
import { requirePermission } from '@/lib/rbac/authorize'

export type BulkReconcileActionState = {
  error?: string
  success?: string
}

/**
 * No Razorpay webhook is configured for this project (see .ai/CHANGELOG.md
 * and ReconcilePaymentButton's per-payment version of this same gap) — so a
 * payment that fails on Razorpay's side (card declined, user cancelled, bank
 * timeout) never gets reported back to this app: the client-side checkout
 * handler() only fires on success, and there is no server-to-server webhook
 * to catch the failure. This bulk action is the only way those payments ever
 * get a real status: it walks every 'pending'/'not_initiated' payment that
 * has a Razorpay order, asks Razorpay's own API what actually happened to
 * that order, and records success/failure accordingly. Never trusts
 * anything other than Razorpay's own response.
 */
export async function bulkReconcilePaymentsAction(
  _prevState: BulkReconcileActionState,
  _formData: FormData
): Promise<BulkReconcileActionState> {
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
    `SELECT id, application_id, purpose, amount_paise, status, razorpay_order_id
     FROM payments
     WHERE status IN ('pending', 'not_initiated') AND razorpay_order_id IS NOT NULL
     ORDER BY id ASC
     LIMIT 200`
  )

  if (rows.length === 0) {
    return { success: 'No pending payments with a Razorpay order to reconcile.' }
  }

  let markedSuccess = 0
  let markedFailed = 0
  let stillPending = 0
  let errors = 0

  for (const payment of rows) {
    if (!payment.razorpay_order_id) continue

    try {
      const razorpayPayments = await fetchRazorpayOrderPayments(payment.razorpay_order_id)

      const captured = razorpayPayments.find(p => p.status === 'captured' && p.captured)
      const failedAttempt = razorpayPayments.find(p => p.status === 'failed')

      // Record the raw Razorpay-side status for every row this pass checks,
      // regardless of whether it ends up captured/failed/still nothing —
      // lets the admin tell "no attempt made" apart from "in progress".
      const latestAttempt = razorpayPayments[razorpayPayments.length - 1] ?? null
      await recordRazorpayAttemptStatus(payment.id, latestAttempt?.status ?? null)

      // Re-fetch to guard against a race with a concurrent webhook/client confirmation.
      const current = await getPaymentForApplication(payment.application_id, payment.purpose)

      if (!current || current.status === 'success') {
        continue
      }

      if (captured) {
        const transition = await recordAdminReconciled({
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
          previousValue: transition ? { status: transition.previousStatus } : undefined,
          newValue: {
            applicationId: payment.application_id,
            razorpayOrderId: payment.razorpay_order_id,
            razorpayPaymentId: captured.id,
            amountPaise: payment.amount_paise,
            bulk: true,
            ...(transition ? { status: transition.newStatus } : {})
          }
        })

        markedSuccess += 1
      } else if (failedAttempt) {
        await recordAdminReconciledFailure({
          paymentId: payment.id,
          applicationId: payment.application_id,
          amountPaise: payment.amount_paise,
          razorpayOrderId: payment.razorpay_order_id,
          razorpayPaymentId: failedAttempt.id,
          failureReason: 'Razorpay reports this payment attempt as failed (bulk reconcile).'
        })

        await logAudit({
          actorUserId: session.userId,
          actorRoleKey: session.role.key,
          action: 'payment.admin_reconciled_failed',
          module: 'payments',
          entityType: 'payment',
          entityId: String(payment.id),
          newValue: {
            applicationId: payment.application_id,
            razorpayOrderId: payment.razorpay_order_id,
            razorpayPaymentId: failedAttempt.id,
            bulk: true
          }
        })

        markedFailed += 1
      } else {
        // No attempt recorded yet on Razorpay's side (order created, checkout
        // never completed) — leave as pending, nothing to reconcile against.
        stillPending += 1
      }
    } catch {
      errors += 1
    }
  }

  revalidatePath('/admin/payments')

  return {
    success: `Reconciled ${rows.length} payment(s): ${markedSuccess} marked successful, ${markedFailed} marked failed, ${stillPending} still pending on Razorpay, ${errors} could not be checked.`
  }
}
