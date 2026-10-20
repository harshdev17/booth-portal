import 'server-only'

import { logAudit } from '@/lib/audit/log'
import { withTransaction } from '@/lib/db/client'
import { sendNotification } from '@/lib/notifications/service'

export type InterchangeStallsParams = {
  firstShopUnitId: number
  secondShopUnitId: number
  reason: string
  sendNotifications?: boolean
  actorUserId: number
  actorRoleKey: string
}

type UnitRow = {
  id: number
  stall_number: string
  status: 'available' | 'reserved' | 'allotted' | 'cancelled'
  allotted_to_application_id: number | null
  category_id: number
}

type AppContact = {
  id: number
  application_number: string
  mobile_number: string
  email: string | null
  representative_name: string
}

export type InterchangeStallsResult = {
  first: {
    shopUnitId: number
    stallNumber: string
    applicationId: number | null
    applicationNumber: string | null
    categoryId: number
    categoryName: string
  }
  second: {
    shopUnitId: number
    stallNumber: string
    applicationId: number | null
    applicationNumber: string | null
    categoryId: number
    categoryName: string
  }
}

/**
 * General-purpose stall interchange: swaps whatever application link (if
 * any) each of the two stalls currently holds, independent of how each
 * stall was originally allotted (public/draw application, or a
 * direct_allotments row) — unlike POST /api/admin/direct-allotments/interchange,
 * which only works when BOTH sides are active direct_allotments. Covers
 * allotted<->allotted, allotted<->available, and reserved combinations in
 * one shared code path; 'cancelled' stalls are rejected since cancellation
 * already has its own dedicated re-allocate/cancel flow.
 *
 * The physical stall — its `stall_number` and `direction` (location) — is
 * permanent and never moves, per explicit instruction. What swaps between
 * the two stall rows is `allotted_to_application_id` AND `category_id`
 * together: the category designation and whichever applicant holds it both
 * travel to the other physical location. An applicant's own
 * `applications.category_id` never needs to change, because the stall's
 * category now matches wherever that applicant ends up.
 *
 * A stall's status always tracks whether it currently holds an application
 * link: after swapping `allotted_to_application_id`, a stall ends up
 * 'allotted' if (and only if) it now has one, 'available' if it has none
 * and wasn't already 'reserved' on its own account, so the one-active-
 * allotment-per-shop invariant (CLAUDE.md §13) is preserved on both sides.
 * Any active direct_allotments row for either stall is repointed to the
 * other stall's id, same as the shop_units link, so Inventory History and
 * the existing direct-allotment interchange UI keep seeing a consistent
 * current owner.
 */
export async function interchangeStalls(params: InterchangeStallsParams): Promise<InterchangeStallsResult> {
  const { firstShopUnitId, secondShopUnitId, reason, sendNotifications = true, actorUserId, actorRoleKey } = params

  if (firstShopUnitId === secondShopUnitId) {
    throw new Error('Choose two different booth/stall units.')
  }

  if (!reason.trim()) {
    throw new Error('A reason for the interchange is required.')
  }

  const result = await withTransaction(async tx => {
    const units = await tx<UnitRow[]>(
      `SELECT id, stall_number, status, allotted_to_application_id, category_id
       FROM shop_units
       WHERE id IN (?, ?)
       ORDER BY FIELD(id, ?, ?)
       FOR UPDATE`,
      [firstShopUnitId, secondShopUnitId, firstShopUnitId, secondShopUnitId]
    )

    if (units.length !== 2) {
      throw new Error('One of these booth/stall units was not found.')
    }

    const [first, second] = units

    if (first.status === 'cancelled' || second.status === 'cancelled') {
      throw new Error('A withdrawn/cancelled stall unit cannot be interchanged.')
    }

    if (!first.allotted_to_application_id && !second.allotted_to_application_id) {
      throw new Error('Both selected stalls are empty — at least one must currently have an allottee to interchange.')
    }

    const loadApp = async (applicationId: number | null): Promise<AppContact | null> => {
      if (!applicationId) return null

      const apps = await tx<AppContact[]>(
        `SELECT id, application_number, mobile_number, email, representative_name
         FROM applications WHERE id = ? FOR UPDATE`,
        [applicationId]
      )

      return apps[0] ?? null
    }

    const firstApp = await loadApp(first.allotted_to_application_id)
    const secondApp = await loadApp(second.allotted_to_application_id)

    // A stall keeps 'reserved' if it was already reserved independent of
    // having an application (e.g. awaiting an allotment-payment deadline on
    // the SAME application that is about to move with it); otherwise it
    // becomes 'allotted' when it gains a link, 'available' when it loses one.
    const nextStatus = (unit: UnitRow, incomingAppId: number | null): UnitRow['status'] => {
      if (incomingAppId) return unit.status === 'reserved' ? 'reserved' : 'allotted'

      return 'available'
    }

    const firstNextStatus = nextStatus(first, second.allotted_to_application_id)
    const secondNextStatus = nextStatus(second, first.allotted_to_application_id)

    // Two-step swap: `shop_units.allotted_to_application_id` has a UNIQUE
    // constraint (uq_shop_units_allotted_application, enforcing the
    // one-active-allotment-per-shop invariant, CLAUDE.md §13). Setting
    // first's new value directly would momentarily make both rows point at
    // the SAME application id (whichever one originally belonged to
    // `second`) before the second UPDATE runs, which MySQL rejects
    // immediately as a duplicate key — not deferred to end-of-transaction.
    // Nulling both out first, then writing the final values, never creates
    // that intermediate duplicate.
    //
    // The physical stall (its stall_number and direction/location) never
    // moves — only its category and its allottee swap sides, per explicit
    // instruction: "booth no. aur uski location to permanent hi rahegi,
    // cat aur allocation change ho sakti hai bas." So this UPDATE swaps
    // allotted_to_application_id AND category_id together on each row; an
    // applicant's own applications.category_id does not need to change,
    // since the stall's category now matches wherever that applicant ends
    // up (it travelled with them).
    await tx(`UPDATE shop_units SET allotted_to_application_id = NULL WHERE id IN (?, ?)`, [first.id, second.id])
    await tx(
      `UPDATE shop_units SET allotted_to_application_id = ?, category_id = ?, status = ?, updated_at = NOW() WHERE id = ?`,
      [second.allotted_to_application_id, second.category_id, firstNextStatus, first.id]
    )
    await tx(
      `UPDATE shop_units SET allotted_to_application_id = ?, category_id = ?, status = ?, updated_at = NOW() WHERE id = ?`,
      [first.allotted_to_application_id, first.category_id, secondNextStatus, second.id]
    )

    // Repoint any active direct_allotments row so it still tracks its
    // applicant's new physical stall (the row's own category_id does not
    // change — the applicant's category travelled with them to the stall
    // that now carries it, as explained above).
    await tx(`UPDATE direct_allotments SET shop_unit_id = ? WHERE shop_unit_id = ? AND status = 'active'`, [
      second.id,
      first.id
    ])
    await tx(`UPDATE direct_allotments SET shop_unit_id = ? WHERE shop_unit_id = ? AND status = 'active'`, [
      first.id,
      second.id
    ])

    const categoryNames = await tx<Array<{ id: number; name: string }>>(
      `SELECT id, name FROM categories WHERE id IN (?, ?)`,
      [first.category_id, second.category_id]
    )
    const categoryNameById = new Map(categoryNames.map(c => [c.id, c.name]))

    return {
      first: { unit: first, app: firstApp, newStallNumber: second.stall_number, newCategoryId: second.category_id },
      second: { unit: second, app: secondApp, newStallNumber: first.stall_number, newCategoryId: first.category_id },
      categoryNameById
    }
  })

  // One audit entry PER stall (not a single comma-joined entityId): the
  // Inventory History panel's query filters by an exact `entity_id = ?`
  // match against one stall's numeric id (see
  // GET /api/admin/inventory/[id]/history), so a combined "544,546" value
  // would never match either stall's own history lookup — it would be
  // logged but never actually show up on this or any stall's timeline.
  const auditPayload = (stallNumberFor: typeof result.first, otherStallNumber: string, newApplicationNumber: string | null, newCategoryId: number) => ({
    stallNumber: stallNumberFor.unit.stall_number,
    interchangedWithStallNumber: otherStallNumber,
    categoryId: newCategoryId,
    applicationNumber: newApplicationNumber
  })

  await logAudit({
    actorUserId,
    actorRoleKey,
    action: 'inventory.interchanged',
    module: 'inventory',
    entityType: 'shop_unit',
    entityId: String(result.first.unit.id),
    previousValue: auditPayload(result.first, result.second.unit.stall_number, result.first.app?.application_number ?? null, result.first.unit.category_id),
    newValue: {
      ...auditPayload(result.first, result.second.unit.stall_number, result.second.app?.application_number ?? null, result.first.newCategoryId),
      reason
    }
  })

  await logAudit({
    actorUserId,
    actorRoleKey,
    action: 'inventory.interchanged',
    module: 'inventory',
    entityType: 'shop_unit',
    entityId: String(result.second.unit.id),
    previousValue: auditPayload(result.second, result.first.unit.stall_number, result.second.app?.application_number ?? null, result.second.unit.category_id),
    newValue: {
      ...auditPayload(result.second, result.first.unit.stall_number, result.first.app?.application_number ?? null, result.second.newCategoryId),
      reason
    }
  })

  if (sendNotifications) {
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')

    // The applicant who WAS on `first.unit.stall_number` is now on
    // `second.stall_number` (result.first.newStallNumber), and vice versa —
    // a dedicated "your stall changed" message (stall_interchanged), not the
    // generic "confirmed" one, so the applicant isn't confused into
    // thinking this is a brand-new allotment rather than a swap of an
    // existing one.
    for (const { app, oldStallNumber, newStallNumber } of [
      { app: result.first.app, oldStallNumber: result.first.unit.stall_number, newStallNumber: result.first.newStallNumber },
      { app: result.second.app, oldStallNumber: result.second.unit.stall_number, newStallNumber: result.second.newStallNumber }
    ]) {
      if (!app) continue

      const destination = app.mobile_number.startsWith('+') ? app.mobile_number : `+91${app.mobile_number}`
      const letterLink = baseUrl ? `${baseUrl}/allotment-letter?appNo=${encodeURIComponent(app.application_number)}` : ''

      sendNotification({
        category: 'stall_interchanged',
        destination,
        userName: app.representative_name,
        templateParams: [app.representative_name, app.application_number, oldStallNumber, newStallNumber, letterLink],
        applicationId: app.id,
        email: app.email
      }).catch(err => {
        console.error('[interchangeStalls] Notification send failure:', err, { applicationId: app.id, newStallNumber })
      })
    }
  }

  return {
    first: {
      shopUnitId: result.first.unit.id,
      stallNumber: result.first.unit.stall_number,
      applicationId: result.second.app?.id ?? null,
      applicationNumber: result.second.app?.application_number ?? null,
      categoryId: result.first.newCategoryId,
      categoryName: result.categoryNameById.get(result.first.newCategoryId) ?? ''
    },
    second: {
      shopUnitId: result.second.unit.id,
      stallNumber: result.second.unit.stall_number,
      applicationId: result.first.app?.id ?? null,
      applicationNumber: result.first.app?.application_number ?? null,
      categoryId: result.second.newCategoryId,
      categoryName: result.categoryNameById.get(result.second.newCategoryId) ?? ''
    }
  }
}
