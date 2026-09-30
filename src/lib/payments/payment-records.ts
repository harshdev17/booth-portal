import 'server-only'

import { query, withTransaction, type TransactionQuery } from '@/lib/db/client'

// Read/write helpers for the `payments` + `payment_transactions` tables
// (migration 0012). `payments.status` is a derived current-state field;
// every write here also appends a `payment_transactions` row so the full
// attempt history (order created, checkout result, webhook confirmation) is
// never lost — see .ai/DATABASE.md Section 2, .ai/PAYMENT.md Section 5.

export type PaymentPurpose = 'registration' | 'pay_now'
export type PaymentStatus = 'not_initiated' | 'pending' | 'success' | 'failed' | 'refunded'
export type TransactionType =
  | 'order_created'
  | 'checkout_success'
  | 'checkout_failed'
  | 'webhook_confirmed'
  | 'webhook_failed'
  | 'refund'
export type TransactionSource = 'system' | 'applicant' | 'webhook' | 'admin'

export type PaymentRow = {
  id: number
  application_id: number
  purpose: PaymentPurpose
  amount_paise: number
  status: PaymentStatus
  razorpay_order_id: string | null
}

type QueryFn = <T = unknown>(sql: string, params?: ReadonlyArray<unknown>) => Promise<T>

export async function getPaymentForApplication(applicationId: number, purpose: PaymentPurpose): Promise<PaymentRow | null> {
  const rows = await query<PaymentRow[]>(
    `SELECT id, application_id, purpose, amount_paise, status, razorpay_order_id
     FROM payments WHERE application_id = ? AND purpose = ? LIMIT 1`,
    [applicationId, purpose]
  )

  return rows[0] ?? null
}

export async function getPaymentByRazorpayOrderId(orderId: string): Promise<PaymentRow | null> {
  const rows = await query<PaymentRow[]>(
    `SELECT id, application_id, purpose, amount_paise, status, razorpay_order_id
     FROM payments WHERE razorpay_order_id = ? LIMIT 1`,
    [orderId]
  )

  return rows[0] ?? null
}

export async function webhookEventAlreadyProcessed(webhookEventId: string): Promise<boolean> {
  const rows = await query<Array<{ id: number }>>(
    `SELECT id FROM payment_transactions WHERE webhook_event_id = ? LIMIT 1`,
    [webhookEventId]
  )

  return rows.length > 0
}

async function insertTransaction(
  runner: QueryFn,
  entry: {
    paymentId: number
    type: TransactionType
    amountPaise: number
    razorpayOrderId?: string | null
    razorpayPaymentId?: string | null
    signatureValid?: boolean | null
    failureReason?: string | null
    source: TransactionSource
    webhookEventId?: string | null
  }
): Promise<void> {
  await runner(
    `INSERT INTO payment_transactions
       (payment_id, type, amount_paise, razorpay_order_id, razorpay_payment_id, signature_valid, failure_reason, source, webhook_event_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.paymentId,
      entry.type,
      entry.amountPaise,
      entry.razorpayOrderId ?? null,
      entry.razorpayPaymentId ?? null,
      entry.signatureValid === undefined || entry.signatureValid === null ? null : entry.signatureValid ? 1 : 0,
      entry.failureReason ?? null,
      entry.source,
      entry.webhookEventId ?? null
    ]
  )
}

/**
 * Creates or reuses the one payment row per (application, purpose) with a
 * fresh Razorpay order — a retry after a failure reuses the same row rather
 * than creating a second "registration" obligation, per the table's unique
 * constraint.
 */
export async function recordOrderCreated(input: {
  applicationId: number
  purpose: PaymentPurpose
  amountPaise: number
  razorpayOrderId: string
}): Promise<number> {
  return withTransaction(async (txQuery: TransactionQuery) => {
    await txQuery(
      `INSERT INTO payments (application_id, purpose, amount_paise, status, razorpay_order_id)
       VALUES (?, ?, ?, 'pending', ?)
       ON DUPLICATE KEY UPDATE amount_paise = ?, status = 'pending', razorpay_order_id = ?`,
      [input.applicationId, input.purpose, input.amountPaise, input.razorpayOrderId, input.amountPaise, input.razorpayOrderId]
    )

    const rows = await txQuery<Array<{ id: number }>>(
      `SELECT id FROM payments WHERE application_id = ? AND purpose = ? LIMIT 1`,
      [input.applicationId, input.purpose]
    )

    const paymentId = rows[0].id

    await insertTransaction(txQuery, {
      paymentId,
      type: 'order_created',
      amountPaise: input.amountPaise,
      razorpayOrderId: input.razorpayOrderId,
      source: 'system'
    })

    return paymentId
  })
}

export async function recordCheckoutSuccess(input: {
  paymentId: number
  applicationId: number
  amountPaise: number
  razorpayOrderId: string
  razorpayPaymentId: string
}): Promise<void> {
  await withTransaction(async (txQuery: TransactionQuery) => {
    await txQuery(`UPDATE payments SET status = 'success' WHERE id = ?`, [input.paymentId])
    await txQuery(
      `UPDATE applications SET status = 'payment_success' WHERE id = ? AND status IN ('payment_pending', 'payment_failed')`,
      [input.applicationId]
    )
    await insertTransaction(txQuery, {
      paymentId: input.paymentId,
      type: 'checkout_success',
      amountPaise: input.amountPaise,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      signatureValid: true,
      source: 'applicant'
    })
  })
}

export async function recordCheckoutFailure(input: {
  paymentId: number
  applicationId: number
  amountPaise: number
  razorpayOrderId: string
  razorpayPaymentId?: string | null
  failureReason: string
}): Promise<void> {
  await withTransaction(async (txQuery: TransactionQuery) => {
    await txQuery(`UPDATE payments SET status = 'failed' WHERE id = ? AND status != 'success'`, [input.paymentId])
    await txQuery(`UPDATE applications SET status = 'payment_failed' WHERE id = ? AND status = 'payment_pending'`, [
      input.applicationId
    ])
    await insertTransaction(txQuery, {
      paymentId: input.paymentId,
      type: 'checkout_failed',
      amountPaise: input.amountPaise,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId ?? null,
      signatureValid: false,
      failureReason: input.failureReason,
      source: 'applicant'
    })
  })
}

export async function recordWebhookConfirmed(input: {
  paymentId: number
  applicationId: number
  amountPaise: number
  razorpayOrderId: string
  razorpayPaymentId: string
  webhookEventId: string
}): Promise<void> {
  await withTransaction(async (txQuery: TransactionQuery) => {
    await txQuery(`UPDATE payments SET status = 'success' WHERE id = ?`, [input.paymentId])
    await txQuery(
      `UPDATE applications SET status = 'payment_success' WHERE id = ? AND status IN ('payment_pending', 'payment_failed')`,
      [input.applicationId]
    )
    await insertTransaction(txQuery, {
      paymentId: input.paymentId,
      type: 'webhook_confirmed',
      amountPaise: input.amountPaise,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      signatureValid: true,
      source: 'webhook',
      webhookEventId: input.webhookEventId
    })
  })
}

/**
 * Records a payment as successful based on an admin manually confirming it
 * directly against Razorpay's own records (the "Reconcile with Razorpay"
 * admin action — see /admin/payments/[id]). This is the fallback for the
 * case both the client-side handler() callback and the webhook (still
 * unconfigured as of this writing — see .ai/CHANGELOG.md) can miss: a
 * payment that genuinely succeeded on Razorpay's side but was never
 * reported back to this app by either automated path. Tagged
 * source: 'admin' and audit-logged separately from an automated
 * confirmation, since a human asserted this rather than a cryptographic
 * signature check — callers must have already fetched the real payment
 * from Razorpay's API and confirmed `status === 'captured'` before calling
 * this; it does not re-verify anything itself.
 */
export async function recordAdminReconciled(input: {
  paymentId: number
  applicationId: number
  amountPaise: number
  razorpayOrderId: string
  razorpayPaymentId: string
}): Promise<void> {
  await withTransaction(async (txQuery: TransactionQuery) => {
    await txQuery(`UPDATE payments SET status = 'success' WHERE id = ?`, [input.paymentId])
    await txQuery(
      `UPDATE applications SET status = 'payment_success' WHERE id = ? AND status IN ('payment_pending', 'payment_failed')`,
      [input.applicationId]
    )
    await insertTransaction(txQuery, {
      paymentId: input.paymentId,
      type: 'checkout_success',
      amountPaise: input.amountPaise,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      signatureValid: true,
      source: 'admin'
    })
  })
}

export async function recordWebhookFailure(input: {
  paymentId: number
  applicationId: number
  amountPaise: number
  razorpayOrderId: string
  razorpayPaymentId?: string | null
  failureReason: string
  webhookEventId: string
}): Promise<void> {
  await withTransaction(async (txQuery: TransactionQuery) => {
    await txQuery(`UPDATE payments SET status = 'failed' WHERE id = ? AND status != 'success'`, [input.paymentId])
    await txQuery(`UPDATE applications SET status = 'payment_failed' WHERE id = ? AND status = 'payment_pending'`, [
      input.applicationId
    ])
    await insertTransaction(txQuery, {
      paymentId: input.paymentId,
      type: 'webhook_failed',
      amountPaise: input.amountPaise,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId ?? null,
      signatureValid: false,
      failureReason: input.failureReason,
      source: 'webhook',
      webhookEventId: input.webhookEventId
    })
  })
}
