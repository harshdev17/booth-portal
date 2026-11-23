'use server'

import { revalidatePath } from 'next/cache'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import {
  getPaymentForApplication,
  recordAdminReconciled,
  recordAdminReconciledFailure,
  recordPossibleDoublePayment,
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
 *
 * Checks EVERY order_id ever created for the payment (from
 * payment_transactions), not just the current payments.razorpay_order_id —
 * each "Pay Now" click that doesn't immediately succeed creates a brand new
 * Razorpay order and OVERWRITES the payment row's razorpay_order_id
 * (recordOrderCreated()'s ON DUPLICATE KEY UPDATE). If the applicant's
 * browser/payment actually completed against an EARLIER order (slow network,
 * retried the button, reopened the page), the old order is still genuinely
 * captured on Razorpay's side but the current row no longer points to it —
 * confirmed live 2026-11-23 across 4 applicants who paid successfully but
 * stayed "Pending" because reconcile only ever checked the newest order.
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
      // Every order_id ever created for this payment, newest first — the
      // current payments.razorpay_order_id is always included (it was
      // itself created via an order_created transaction), but so is every
      // earlier one that got overwritten.
      const orderIdRows = await query<Array<{ razorpay_order_id: string }>>(
        `SELECT DISTINCT razorpay_order_id FROM payment_transactions
         WHERE payment_id = ? AND type = 'order_created' AND razorpay_order_id IS NOT NULL
         ORDER BY id DESC`,
        [payment.id]
      )

      const orderIds = orderIdRows.length > 0 ? orderIdRows.map(r => r.razorpay_order_id) : [payment.razorpay_order_id]

      let captured: { id: string } | null = null
      let failedAttempt: { id: string } | null = null
      let capturedOrderId: string | null = null
      let latestStatus: string | null = null
      const capturedOnOtherOrders: string[] = []

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
            // More than one order for the SAME payment came back captured —
            // a genuine double payment, not a reconcile artifact. Flagged
            // for the admin to review/refund manually; the first (most
            // recent) captured order found still wins for marking success.
            capturedOnOtherOrders.push(orderId)
          }
        }

        if (!failedAttempt) {
          failedAttempt = razorpayPayments.find(p => p.status === 'failed') ?? null
        }
      }

      // Record the raw Razorpay-side status for the row's current order,
      // regardless of outcome — lets the admin tell "no attempt made" apart
      // from "in progress".
      await recordRazorpayAttemptStatus(payment.id, latestStatus)

      if (capturedOnOtherOrders.length > 0 && capturedOrderId) {
        await recordPossibleDoublePayment(payment.id, [capturedOrderId, ...capturedOnOtherOrders])
      }

      // Re-fetch to guard against a race with a concurrent webhook/client confirmation.
      const current = await getPaymentForApplication(payment.application_id, payment.purpose)

      if (!current || current.status === 'success') {
        continue
      }

      if (captured && capturedOrderId) {
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
            bulk: true,
            checkedOrderIds: orderIds,
            ...(capturedOnOtherOrders.length > 0
              ? { possibleDoublePayment: true, otherCapturedOrderIds: capturedOnOtherOrders }
              : {}),
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
            bulk: true,
            checkedOrderIds: orderIds
          }
        })

        markedFailed += 1
      } else {
        // No attempt recorded yet on Razorpay's side on ANY order created for
        // this payment — leave as pending, nothing to reconcile against.
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
