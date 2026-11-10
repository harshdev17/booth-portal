import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { parseAuctionResultsCsv, type CsvRowError } from '@/lib/applications/auction-results-csv'
import { query, withTransaction, type TransactionQuery } from '@/lib/db/client'
import { notifyAuctionFinalPayment } from '@/lib/notifications/application-status'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB — this list is small (one physical auction's worth of winners)

type ResolvedRow = {
  rowNumber: number
  applicationId: number
  applicationNumber: string
  representativeName: string
  mobileNumber: string
  email: string
  shopUnitId: number
  stallNumber: string
  finalAmountRupees: number
}

/**
 * Two-mode endpoint (validate / import) for the Admin's "Auction Results"
 * bulk upload — the last manual step in migration 0077's Auction Payment
 * Flow, after KDB's physical auction has happened offline. For every row
 * that matches a real application + a real, available stall in the SAME
 * category as that application:
 *   - the application's status moves to 'auction_won'
 *   - the stall is reserved for them (shop_units.allotted_to_application_id
 *     + status = 'reserved', matching the existing 'pay_now' convention of
 *     "reserved until paid, not yet allotted")
 *   - a 'auction_final' payments row is seeded with the CSV-supplied amount
 *     (read back later by POST /api/applications/[id]/payment/order — see
 *     that route's own comment on "never recompute, always read the
 *     pre-seeded amount")
 *   - the applicant is immediately sent the Final Auction Payment
 *     notification with their specific amount
 *
 * Gated by `allotment:perform` (not a new permission) — this is the exact
 * same class of action as Direct Allotment's own admin-assigns-a-stall
 * flow (src/app/api/admin/inventory/import/route.ts's Direct Allotment
 * rows, src/app/(admin)/admin/allotment/page.tsx), just triggered by a CSV
 * instead of a form, so it reuses that existing permission rather than
 * inventing a narrower one.
 */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('allotment:perform')

    const formData = await request.formData()
    const mode = formData.get('mode')
    const file = formData.get('file')

    if (mode !== 'validate' && mode !== 'import') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 5 MB).' }, { status: 400 })
    }

    const text = await file.text()
    const parsed = parseAuctionResultsCsv(text)

    if (parsed.errors.length > 0) {
      return NextResponse.json({ errors: parsed.errors, rowCount: 0 }, { status: 200 })
    }

    const appNumbers = parsed.rows.map(r => r.applicationNumber)
    const stallNumbers = parsed.rows.map(r => r.stallNumber)

    const [applicationRows, stallRows] = await Promise.all([
      appNumbers.length > 0
        ? query<
            Array<{
              id: number
              application_number: string
              representative_name: string
              mobile_number: string
              email: string
              status: string
              category_id: number
            }>
          >(
            `SELECT id, application_number, representative_name, mobile_number, email, status, category_id
             FROM applications WHERE application_number IN (${appNumbers.map(() => '?').join(', ')})`,
            appNumbers
          )
        : [],
      stallNumbers.length > 0
        ? query<Array<{ id: number; stall_number: string; status: string; category_id: number; allotted_to_application_id: number | null }>>(
            `SELECT id, stall_number, status, category_id, allotted_to_application_id FROM shop_units WHERE stall_number IN (${stallNumbers.map(() => '?').join(', ')})`,
            stallNumbers
          )
        : []
    ])

    const applicationByNumber = new Map(applicationRows.map(a => [a.application_number.toLowerCase(), a]))
    const stallByNumber = new Map(stallRows.map(s => [s.stall_number.toLowerCase(), s]))

    const rowErrors: CsvRowError[] = []
    const resolvedRows: ResolvedRow[] = []

    for (const row of parsed.rows) {
      const application = applicationByNumber.get(row.applicationNumber.toLowerCase())

      if (!application) {
        rowErrors.push({ rowNumber: row.rowNumber, message: `Application "${row.applicationNumber}" not found.` })
        continue
      }

      // Must have already paid the auction participation fee — the physical
      // auction is only open to applicants who completed that step (per
      // the confirmed flow). Also tolerate re-running this upload for a row
      // already marked 'auction_won' (e.g. correcting a typo'd amount),
      // rather than erroring on a re-import.
      if (application.status !== 'auction_fee_paid' && application.status !== 'auction_won') {
        rowErrors.push({
          rowNumber: row.rowNumber,
          message: `Application "${row.applicationNumber}" is "${application.status}", not "Auction Fee Paid" — it cannot be marked as an auction winner.`
        })
        continue
      }

      const stall = stallByNumber.get(row.stallNumber.toLowerCase())

      if (!stall) {
        rowErrors.push({ rowNumber: row.rowNumber, message: `Stall "${row.stallNumber}" not found.` })
        continue
      }

      if (stall.category_id !== application.category_id) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          message: `Stall "${row.stallNumber}" does not belong to application "${row.applicationNumber}"'s category.`
        })
        continue
      }

      // A stall already assigned to a DIFFERENT application is a conflict —
      // but re-assigning to the SAME application (a re-run of this upload)
      // is fine.
      if (stall.allotted_to_application_id && stall.allotted_to_application_id !== application.id) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          message: `Stall "${row.stallNumber}" is already allotted to a different application.`
        })
        continue
      }

      resolvedRows.push({
        rowNumber: row.rowNumber,
        applicationId: application.id,
        applicationNumber: application.application_number,
        representativeName: application.representative_name,
        mobileNumber: application.mobile_number,
        email: application.email,
        shopUnitId: stall.id,
        stallNumber: stall.stall_number,
        finalAmountRupees: row.finalAmountRupees
      })
    }

    if (rowErrors.length > 0) {
      return NextResponse.json({ errors: rowErrors, rowCount: 0 }, { status: 200 })
    }

    if (mode === 'validate') {
      return NextResponse.json({ errors: [], rowCount: resolvedRows.length })
    }

    // mode === 'import'
    await withTransaction(async (txQuery: TransactionQuery) => {
      for (const row of resolvedRows) {
        await txQuery(`UPDATE shop_units SET status = 'reserved', allotted_to_application_id = ? WHERE id = ?`, [
          row.applicationId,
          row.shopUnitId
        ])

        await txQuery(`UPDATE applications SET status = 'auction_won' WHERE id = ?`, [row.applicationId])

        const amountPaise = row.finalAmountRupees * 100

        await txQuery(
          `INSERT INTO payments (application_id, purpose, amount_paise, status)
           VALUES (?, 'auction_final', ?, 'not_initiated')
           ON DUPLICATE KEY UPDATE amount_paise = ?, status = IF(status = 'success', 'success', 'not_initiated')`,
          [row.applicationId, amountPaise, amountPaise]
        )
      }
    })

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'draw.auction_results_uploaded',
      module: 'draw',
      entityType: 'application',
      entityId: 'bulk',
      newValue: {
        source: 'auction_results_csv',
        rowCount: resolvedRows.length,
        applicationNumbers: resolvedRows.map(r => r.applicationNumber),
        stallNumbers: resolvedRows.map(r => r.stallNumber)
      }
    })

    // Notifications sent after commit, same reasoning as draw-service.ts's
    // own draw-completion notifications: a provider outage must never undo
    // or block the already-committed auction result.
    await Promise.allSettled(
      resolvedRows.map(row => {
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
        const payLink = baseUrl ? `${baseUrl}/status?appNo=${encodeURIComponent(row.applicationNumber)}` : ''

        return notifyAuctionFinalPayment({
          applicationId: row.applicationId,
          applicationNumber: row.applicationNumber,
          mobileNumber: row.mobileNumber,
          email: row.email,
          representativeName: row.representativeName,
          amountRupees: row.finalAmountRupees,
          payLink
        })
      })
    )

    return NextResponse.json({
      errors: [],
      rowCount: resolvedRows.length,
      applicationNumbers: resolvedRows.map(r => r.applicationNumber)
    })
  } catch (error) {
    logServerError('api.admin.applications.auction-results', error)

    return NextResponse.json({ error: 'Something went wrong while processing the file.' }, { status: 500 })
  }
}
