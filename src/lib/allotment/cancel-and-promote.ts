import 'server-only'

import { cancelStallAllotment } from '@/lib/allotment/cancel-allotment'
import { logAudit } from '@/lib/audit/log'
import { query, withTransaction } from '@/lib/db/client'
import { sendNotification } from '@/lib/notifications/service'

type OverdueStallRow = {
  shop_unit_id: number
}

type WaitlistCandidateRow = {
  allocation_id: number
  application_id: number
  application_number: string
  mobile_number: string
  email: string | null
  representative_name: string
}

type FreedStallRow = {
  id: number
}

type CategoryRow = {
  allotment_payment_enabled: number
  allotment_amount_paise: number | null
}

export type CancelAndPromoteResult = {
  cancelled: number
  promoted: number
}

/**
 * Super-admin-only action: for one category, cancels every overdue unpaid
 * allotment, auto-promotes the same number of waitlisted candidates (in
 * waitlist_position order) into the now-freed stalls, and sets a new
 * payment deadline for the category (category-level deadline, per explicit
 * decision — not per-round/per-application).
 *
 * Each cancellation runs through the existing cancelStallAllotment(), which
 * opens its own transaction and already handles the audit log + applicant
 * notification — called sequentially per overdue stall here rather than
 * refactored into one giant shared transaction, since this is a rare,
 * manually-triggered, super-admin-only batch action: a failure partway
 * through simply leaves already-processed stalls processed, instead of an
 * all-or-nothing rollback that would be confusing to reason about for a
 * batch of independent cancellations.
 */
export async function cancelOverdueAndPromote(
  categoryId: number,
  newDeadline: Date,
  actorUserId: number,
  actorRoleKey: string
): Promise<CancelAndPromoteResult> {
  // 1. Find every overdue, unpaid, currently-reserved stall in this
  // category — scoped to draw-produced allotments only (direct allotments
  // are a separate admin mechanism with no waitlist concept, so they're
  // intentionally excluded here).
  const overdueStalls = await query<OverdueStallRow[]>(
    `SELECT DISTINCT su.id AS shop_unit_id
     FROM shop_units su
     JOIN applications a ON a.id = su.allotted_to_application_id
     LEFT JOIN payments p ON p.application_id = a.id AND p.purpose = 'pay_now'
     JOIN categories c ON c.id = su.category_id
     WHERE su.category_id = ?
       AND su.status = 'reserved'
       AND c.allotment_payment_deadline_at IS NOT NULL
       AND c.allotment_payment_deadline_at < NOW()
       AND COALESCE(p.status, 'not_initiated') NOT IN ('paid', 'success', 'exempt')`,
    [categoryId]
  )

  let cancelledCount = 0

  for (const row of overdueStalls) {
    await cancelStallAllotment({
      shopUnitId: row.shop_unit_id,
      actorUserId,
      actorRoleKey,
      reason: 'Allotment fee not paid before deadline'
    })
    cancelledCount++
  }

  // 2. Freed stalls in this category, available for promotion.
  const freedStalls = await query<FreedStallRow[]>(
    `SELECT id FROM shop_units WHERE category_id = ? AND status = 'available' LIMIT ?`,
    [categoryId, cancelledCount]
  )

  // 3. Next-in-line waitlist candidates for this category's draw(s), oldest
  // round first, lowest waitlist_position first — never a candidate already
  // cancelled or already promoted in an earlier round.
  const waitlistCandidates =
    freedStalls.length > 0
      ? await query<WaitlistCandidateRow[]>(
          `SELECT da.id AS allocation_id, a.id AS application_id, a.application_number,
                  a.mobile_number, a.email, a.representative_name
           FROM draw_allocations da
           JOIN draw_events de ON de.id = da.draw_event_id
           JOIN applications a ON a.id = da.application_id
           WHERE de.category_id = ?
             AND da.allocation_type = 'waitlist'
             AND da.status NOT IN ('cancelled', 'promoted')
           ORDER BY de.round_number ASC, da.waitlist_position ASC
           LIMIT ?`,
          [categoryId, freedStalls.length]
        )
      : []

  const categoryRows = await query<CategoryRow[]>(
    `SELECT allotment_payment_enabled, allotment_amount_paise FROM categories WHERE id = ? LIMIT 1`,
    [categoryId]
  )

  const category = categoryRows[0]

  const isPaymentRequired = Boolean(
    category?.allotment_payment_enabled && category.allotment_amount_paise && Number(category.allotment_amount_paise) > 0
  )

  const promotedForNotification: WaitlistCandidateRow[] = []

  for (let i = 0; i < waitlistCandidates.length; i++) {
    const candidate = waitlistCandidates[i]
    const stall = freedStalls[i]

    await withTransaction(async tx => {
      await tx(
        `UPDATE shop_units SET status = ?, allotted_to_application_id = ? WHERE id = ? AND status = 'available'`,
        [isPaymentRequired ? 'reserved' : 'allotted', candidate.application_id, stall.id]
      )

      await tx(
        `UPDATE draw_allocations SET status = 'promoted', shop_unit_id = ? WHERE id = ?`,
        [stall.id, candidate.allocation_id]
      )

      await tx(`UPDATE applications SET status = ?, updated_at = NOW() WHERE id = ?`, [
        isPaymentRequired ? 'payment_required' : 'allotted',
        candidate.application_id
      ])

      if (isPaymentRequired) {
        const amountPaise = Number(category!.allotment_amount_paise)

        await tx(
          `INSERT INTO payments (application_id, purpose, amount_paise, status)
           VALUES (?, 'pay_now', ?, 'not_initiated')
           ON DUPLICATE KEY UPDATE amount_paise = ?, status = IF(status = 'success', 'success', 'not_initiated')`,
          [candidate.application_id, amountPaise, amountPaise]
        )
      }
    })

    await logAudit({
      actorUserId,
      actorRoleKey,
      action: 'allotment.promoted_from_waitlist',
      module: 'allotment',
      entityType: 'shop_unit',
      entityId: String(stall.id),
      newValue: {
        applicationId: candidate.application_id,
        applicationNumber: candidate.application_number,
        paymentRequired: isPaymentRequired
      }
    })

    promotedForNotification.push(candidate)
  }

  // 4. New category-wide payment deadline (per explicit decision —
  // category-level, not per-round/per-application).
  await query(`UPDATE categories SET allotment_payment_deadline_at = ? WHERE id = ?`, [newDeadline, categoryId])

  await logAudit({
    actorUserId,
    actorRoleKey,
    action: 'category.allotment_deadline_updated',
    module: 'allotment',
    entityType: 'category',
    entityId: String(categoryId),
    newValue: { allotmentPaymentDeadlineAt: newDeadline.toISOString() }
  })

  // 5. Notify promoted candidates with their new payment link, same pattern
  // as the "Send Payment Reminder" feature. Sent AFTER all DB commits — a
  // notification-provider outage must never roll back an already-committed
  // promotion, matching draw-service.ts's own "notify after commit" rule.
  // Cancellation notices were already sent by cancelStallAllotment() above.
  if (isPaymentRequired) {
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
    const campaignOverride = process.env.AISENSY_CAMPAIGN_REGISTRATION_PAYMENT_REMINDER || 'pay_now_activation'

    for (const candidate of promotedForNotification) {
      try {
        const payLink = baseUrl ? `${baseUrl}/status?appNo=${encodeURIComponent(candidate.application_number)}` : ''

        const destination = candidate.mobile_number.startsWith('+')
          ? candidate.mobile_number
          : `+91${candidate.mobile_number.replace(/\D/g, '').slice(-10)}`

        await sendNotification({
          category: 'reminder',
          campaignOverride,
          destination,
          userName: candidate.representative_name,
          templateParams: [candidate.representative_name, candidate.application_number, payLink],
          applicationId: candidate.application_id,
          email: candidate.email
        })
      } catch (error) {
        console.error('[cancelOverdueAndPromote] Failed to send promotion payment-link notification:', error)
      }
    }
  }

  return { cancelled: cancelledCount, promoted: waitlistCandidates.length }
}
