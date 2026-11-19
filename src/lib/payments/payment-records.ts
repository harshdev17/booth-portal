import 'server-only'

import { query, withTransaction, type TransactionQuery } from '@/lib/db/client'

// Read/write helpers for the `payments` + `payment_transactions` tables
// (migration 0012). `payments.status` is a derived current-state field;
// every write here also appends a `payment_transactions` row so the full
// attempt history (order created, checkout result, webhook confirmation) is
// never lost — see .ai/DATABASE.md Section 2, .ai/PAYMENT.md Section 5.

export type PaymentPurpose = 'registration' | 'pay_now' | 'auction_fee' | 'auction_final'
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

/**
 * Records the exact raw attempt status Razorpay's own API returned for this
 * payment (migration 0086) — 'created' | 'authorized' | 'captured' |
 * 'failed', or null when Razorpay shows no attempt at all. Separate from
 * `payments.status` (our own derived not_initiated/pending/success/failed/
 * refunded state): this is purely informational, for an admin reviewing the
 * Pending list to tell "no attempt was ever made" apart from "Razorpay shows
 * it authorized/in-progress but not yet captured". Called by both the
 * single-payment and bulk "Reconcile with Razorpay" actions on every check,
 * independent of whether that check also changes payments.status.
 */
export async function recordRazorpayAttemptStatus(paymentId: number, attemptStatus: string | null): Promise<void> {
  await query(
    `UPDATE payments SET razorpay_attempt_status = ?, razorpay_attempt_checked_at = NOW() WHERE id = ?`,
    [attemptStatus, paymentId]
  )
}

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

export type ApplicationStatusTransition = { previousStatus: string; newStatus: string } | null

/**
 * The state transition a successful payment triggers, by purpose — shared
 * by recordCheckoutSuccess/recordWebhookConfirmed/recordAdminReconciled so
 * the 4 purposes' effects are defined in exactly one place. Returns the
 * applications.status transition it actually performed (or null if its
 * conditional UPDATE matched zero rows — e.g. the application was already
 * past this stage), so callers can record the real before/after in their
 * own audit log entry instead of only the Razorpay IDs.
 */
async function applySuccessfulPaymentEffects(
  txQuery: TransactionQuery,
  purpose: PaymentPurpose,
  applicationId: number
): Promise<ApplicationStatusTransition> {
  if (purpose === 'pay_now') {
    const result = await txQuery<{ affectedRows: number }>(
      `UPDATE applications SET status = 'allotted' WHERE id = ? AND status = 'payment_required'`,
      [applicationId]
    )

    await txQuery(`UPDATE shop_units SET status = 'allotted' WHERE allotted_to_application_id = ?`, [applicationId])
    await txQuery(`UPDATE direct_allotments SET payment_status = 'paid' WHERE application_id = ?`, [applicationId])
    await txQuery(
      `UPDATE draw_allocations SET status = 'confirmed' WHERE application_id = ? AND allocation_type = 'allotted'`,
      [applicationId]
    )

    return result.affectedRows > 0 ? { previousStatus: 'payment_required', newStatus: 'allotted' } : null
  } else if (purpose === 'auction_fee') {
    // No stall is touched here — this only confirms the fixed participation
    // fee; a stall is reserved only once the results CSV is uploaded after
    // the physical auction.
    const result = await txQuery<{ affectedRows: number }>(
      `UPDATE applications SET status = 'auction_fee_paid' WHERE id = ? AND status = 'selected_for_auction'`,
      [applicationId]
    )

    return result.affectedRows > 0 ? { previousStatus: 'selected_for_auction', newStatus: 'auction_fee_paid' } : null
  } else if (purpose === 'auction_final') {
    // The results CSV upload already reserved this applicant's specific
    // stall (shop_units.allotted_to_application_id) and set the winning
    // application to 'auction_won' — there's no draw_allocations row to
    // confirm here, since this stall was never part of a draw allocation.
    const result = await txQuery<{ affectedRows: number }>(
      `UPDATE applications SET status = 'allotted' WHERE id = ? AND status = 'auction_won'`,
      [applicationId]
    )

    await txQuery(`UPDATE shop_units SET status = 'allotted' WHERE allotted_to_application_id = ?`, [applicationId])

    return result.affectedRows > 0 ? { previousStatus: 'auction_won', newStatus: 'allotted' } : null
  } else {
    const result = await txQuery<{ affectedRows: number }>(
      `UPDATE applications SET status = 'under_review' WHERE id = ? AND status IN ('payment_pending', 'payment_failed')`,
      [applicationId]
    )

    return result.affectedRows > 0 ? { previousStatus: 'payment_pending', newStatus: 'under_review' } : null
  }
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
}): Promise<ApplicationStatusTransition> {
  return withTransaction(async (txQuery: TransactionQuery) => {
    const paymentRows = await txQuery<Array<{ purpose: PaymentPurpose }>>(
      `SELECT purpose FROM payments WHERE id = ? LIMIT 1`,
      [input.paymentId]
    )

    const purpose = paymentRows[0]?.purpose ?? 'registration'

    await txQuery(`UPDATE payments SET status = 'success' WHERE id = ?`, [input.paymentId])
    const transition = await applySuccessfulPaymentEffects(txQuery, purpose, input.applicationId)

    await insertTransaction(txQuery, {
      paymentId: input.paymentId,
      type: 'checkout_success',
      amountPaise: input.amountPaise,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      signatureValid: true,
      source: 'applicant'
    })

    return transition
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
    const paymentRows = await txQuery<Array<{ purpose: PaymentPurpose }>>(
      `SELECT purpose FROM payments WHERE id = ? LIMIT 1`,
      [input.paymentId]
    )

    const purpose = paymentRows[0]?.purpose ?? 'registration'

    await txQuery(`UPDATE payments SET status = 'failed' WHERE id = ? AND status != 'success'`, [input.paymentId])

    if (purpose === 'registration') {
      await txQuery(`UPDATE applications SET status = 'payment_failed' WHERE id = ? AND status = 'payment_pending'`, [
        input.applicationId
      ])
    }

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
}): Promise<ApplicationStatusTransition> {
  return withTransaction(async (txQuery: TransactionQuery) => {
    const paymentRows = await txQuery<Array<{ purpose: PaymentPurpose }>>(
      `SELECT purpose FROM payments WHERE id = ? LIMIT 1`,
      [input.paymentId]
    )

    const purpose = paymentRows[0]?.purpose ?? 'registration'

    await txQuery(`UPDATE payments SET status = 'success' WHERE id = ?`, [input.paymentId])
    const transition = await applySuccessfulPaymentEffects(txQuery, purpose, input.applicationId)

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

    return transition
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
}): Promise<ApplicationStatusTransition> {
  return withTransaction(async (txQuery: TransactionQuery) => {
    const paymentRows = await txQuery<Array<{ purpose: PaymentPurpose }>>(
      `SELECT purpose FROM payments WHERE id = ? LIMIT 1`,
      [input.paymentId]
    )

    const purpose = paymentRows[0]?.purpose ?? 'registration'

    await txQuery(`UPDATE payments SET status = 'success' WHERE id = ?`, [input.paymentId])
    const transition = await applySuccessfulPaymentEffects(txQuery, purpose, input.applicationId)

    await insertTransaction(txQuery, {
      paymentId: input.paymentId,
      type: 'checkout_success',
      amountPaise: input.amountPaise,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      signatureValid: true,
      source: 'admin'
    })

    return transition
  })
}

/**
 * Marks a payment failed based on an admin-triggered reconciliation against
 * Razorpay's own API (bulk or single), not the checkout callback or webhook
 * paths — used when Razorpay itself reports the order's payment attempt as
 * 'failed' and nothing else ever told this app. See `recordCheckoutFailure`
 * for the client-callback equivalent.
 */
export async function recordAdminReconciledFailure(input: {
  paymentId: number
  applicationId: number
  amountPaise: number
  razorpayOrderId: string
  razorpayPaymentId?: string | null
  failureReason: string
}): Promise<void> {
  await withTransaction(async (txQuery: TransactionQuery) => {
    const paymentRows = await txQuery<Array<{ purpose: PaymentPurpose }>>(
      `SELECT purpose FROM payments WHERE id = ? LIMIT 1`,
      [input.paymentId]
    )

    const purpose = paymentRows[0]?.purpose ?? 'registration'

    await txQuery(`UPDATE payments SET status = 'failed' WHERE id = ? AND status != 'success'`, [input.paymentId])

    if (purpose === 'registration') {
      await txQuery(`UPDATE applications SET status = 'payment_failed' WHERE id = ? AND status = 'payment_pending'`, [
        input.applicationId
      ])
    }

    await insertTransaction(txQuery, {
      paymentId: input.paymentId,
      type: 'checkout_failed',
      amountPaise: input.amountPaise,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId ?? null,
      signatureValid: false,
      failureReason: input.failureReason,
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
    const paymentRows = await txQuery<Array<{ purpose: PaymentPurpose }>>(
      `SELECT purpose FROM payments WHERE id = ? LIMIT 1`,
      [input.paymentId]
    )

    const purpose = paymentRows[0]?.purpose ?? 'registration'

    await txQuery(`UPDATE payments SET status = 'failed' WHERE id = ? AND status != 'success'`, [input.paymentId])

    if (purpose === 'registration') {
      await txQuery(`UPDATE applications SET status = 'payment_failed' WHERE id = ? AND status = 'payment_pending'`, [
        input.applicationId
      ])
    }

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
