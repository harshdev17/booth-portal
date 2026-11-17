import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query, withTransaction } from '@/lib/db/client'
import { sendNotification } from '@/lib/notifications/service'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

type ApplicationRow = {
  id: number
  application_number: string
  status: string
  representative_name: string
  mobile_number: string
  email: string
  category_name: string
  selection_method: string
  auction_participation_fee_paise: number | null
}

/**
 * Manually selects a batch of Approved applications for a physical auction,
 * without running an actual draw — per explicit request (2026-11-17), for
 * when the admin wants to hand-pick which approved applicants move to
 * auction instead of/alongside a random draw. Mirrors exactly what
 * draw-service.ts does for an auction category's winners: status ->
 * 'selected_for_auction', an 'auction_fee' payment record seeded at the
 * category's fixed participation fee, then the same activation
 * notification (WhatsApp/email with the status-check link) draw-service
 * sends. Only works on applications already in an auction-selection-method
 * category — never changes category, never touches booth/stall inventory.
 */
export async function POST(request: Request) {
  const session = await requirePermission('draw:run')

  let body: { applicationIds?: string[] }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rawIds = Array.isArray(body.applicationIds) ? body.applicationIds : []

  if (rawIds.length === 0) {
    return NextResponse.json({ error: 'No applications selected.' }, { status: 400 })
  }

  if (rawIds.length > 200) {
    return NextResponse.json({ error: 'Too many applications selected at once (max 200).' }, { status: 400 })
  }

  const applicationIds = rawIds.map(id => decodeId(id)).filter((id): id is number => id !== null)

  if (applicationIds.length === 0) {
    return NextResponse.json({ error: 'No valid application IDs in selection.' }, { status: 400 })
  }

  let selectedCount = 0
  const skipped: Array<{ applicationId: number; applicationNumber?: string; reason: string }> = []

  const notifyQueue: Array<{
    applicationId: number
    applicationNumber: string
    representativeName: string
    mobileNumber: string
    email: string
  }> = []

  try {
    const placeholders = applicationIds.map(() => '?').join(', ')

    const rows = await query<ApplicationRow[]>(
      `SELECT a.id, a.application_number, a.status, a.representative_name, a.mobile_number, a.email,
              c.name AS category_name, c.selection_method, c.auction_participation_fee_paise
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       WHERE a.id IN (${placeholders})`,
      applicationIds
    )

    const rowsById = new Map(rows.map(r => [r.id, r]))

    for (const applicationId of applicationIds) {
      const row = rowsById.get(applicationId)

      if (!row) {
        skipped.push({ applicationId, reason: 'Not found.' })
        continue
      }

      if (row.status !== 'approved') {
        skipped.push({
          applicationId,
          applicationNumber: row.application_number,
          reason: `Status is "${row.status}", not Approved.`
        })
        continue
      }

      if (row.selection_method !== 'auction') {
        skipped.push({
          applicationId,
          applicationNumber: row.application_number,
          reason: `"${row.category_name}" is not an auction category.`
        })
        continue
      }

      const feePaise = Number(row.auction_participation_fee_paise)

      if (!(feePaise > 0)) {
        skipped.push({
          applicationId,
          applicationNumber: row.application_number,
          reason: `"${row.category_name}" has no Auction Participation Fee configured.`
        })
        continue
      }

       
      const applied = await withTransaction(async q => {
        const updated = await q<{ affectedRows: number }>(
          `UPDATE applications SET status = 'selected_for_auction' WHERE id = ? AND status = 'approved'`,
          [applicationId]
        )

        if (updated.affectedRows === 0) return false

        await q(
          `INSERT INTO payments (application_id, purpose, amount_paise, status)
           VALUES (?, 'auction_fee', ?, 'not_initiated')
           ON DUPLICATE KEY UPDATE amount_paise = ?, status = IF(status = 'success', 'success', 'not_initiated')`,
          [applicationId, feePaise, feePaise]
        )

        return true
      })

      if (!applied) {
        skipped.push({
          applicationId,
          applicationNumber: row.application_number,
          reason: 'Status changed before this could be applied — someone else updated it first.'
        })
        continue
      }

       
      await logAudit({
        actorUserId: session.userId,
        actorRoleKey: session.role.key,
        action: 'application.selected_for_auction_manual',
        module: 'draw',
        entityType: 'application',
        entityId: String(applicationId),
        previousValue: { status: 'approved' },
        newValue: { status: 'selected_for_auction', auctionParticipationFeePaise: feePaise, bulk: true }
      })

      selectedCount += 1
      notifyQueue.push({
        applicationId,
        applicationNumber: row.application_number,
        representativeName: row.representative_name,
        mobileNumber: row.mobile_number,
        email: row.email
      })
    }

    // Already committed per application above — a provider outage here can
    // never undo or leave a selection half-applied. Same activation
    // notification the real draw sends (draw-service.ts).
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')

    void Promise.allSettled(
      notifyQueue.map(candidate => {
        const destination = candidate.mobileNumber.startsWith('+') ? candidate.mobileNumber : `+91${candidate.mobileNumber}`
        const link = baseUrl ? `${baseUrl}/status?appNo=${encodeURIComponent(candidate.applicationNumber)}` : ''

        return sendNotification({
          category: 'auction_fee_activation',
          destination,
          userName: candidate.representativeName,
          templateParams: [candidate.representativeName, candidate.applicationNumber, link],
          applicationId: candidate.applicationId,
          email: candidate.email
        })
      })
    ).catch(error => logServerError('api.admin.applications.bulk-select-for-auction.notify', error))

    return NextResponse.json({
      success: true,
      selectedCount,
      skippedCount: skipped.length,
      skipped,
      message: `Selected ${selectedCount} application${selectedCount === 1 ? '' : 's'} for auction — participation fee link sent.${
        skipped.length > 0 ? ` Skipped ${skipped.length} (not eligible).` : ''
      }`
    })
  } catch (error) {
    logServerError('api.admin.applications.bulk-select-for-auction', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
