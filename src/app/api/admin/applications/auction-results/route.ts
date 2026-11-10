import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { parseAuctionResultsCsv } from '@/lib/applications/auction-results-csv'
import { query, withTransaction, type TransactionQuery } from '@/lib/db/client'
import { sendNotification } from '@/lib/notifications/service'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB — this is a short results list, not a full inventory import

type SkippedRow = { rowNumber: number; message: string }

/**
 * Admin-only bulk upload recording live-auction results: which application
 * (already in 'auction_won' status — i.e. it already paid the
 * auction_participation_fee, see draw-service.ts) won which stall at what
 * final price. Gated by 'allotment:perform' — this is conceptually an
 * allotment action (assigning a specific stall to a specific winner), not a
 * configuration change, matching the permission already used for the
 * single-application allotment routes.
 *
 * Two-mode endpoint (validate / import) matching the shop-units import
 * wizard's shape (src/app/api/admin/inventory/import/route.ts) — validate
 * resolves and checks every row without writing anything, import commits.
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
      return NextResponse.json({ error: 'File is too large (max 2 MB).' }, { status: 400 })
    }

    const text = await file.text()
    const parsed = parseAuctionResultsCsv(text)

    if (parsed.errors.length > 0) {
      return NextResponse.json({ errors: parsed.errors, rowCount: 0 }, { status: 200 })
    }

    const applicationNumbers = parsed.rows.map(r => r.applicationNumber)
    const stallNumbers = parsed.rows.map(r => r.stallNumber)

    const [applicationRows, stallRows] = await Promise.all([
      applicationNumbers.length > 0
        ? query<
            Array<{
              id: number
              application_number: string
              category_id: number
              status: string
              representative_name: string
              mobile_number: string
              email: string | null
            }>
          >(
            `SELECT id, application_number, category_id, status, representative_name, mobile_number, email
             FROM applications WHERE application_number IN (${applicationNumbers.map(() => '?').join(', ')})`,
            applicationNumbers
          )
        : [],
      stallNumbers.length > 0
        ? query<Array<{ id: number; stall_number: string; category_id: number; status: string }>>(
            `SELECT id, stall_number, category_id, status FROM shop_units WHERE stall_number IN (${stallNumbers.map(() => '?').join(', ')})`,
            stallNumbers
          )
        : []
    ])

    const applicationByNumber = new Map(applicationRows.map(a => [a.application_number, a]))
    const stallByNumber = new Map(stallRows.map(s => [s.stall_number, s]))

    const skipped: SkippedRow[] = []
    const resolvedRows: Array<{
      rowNumber: number
      applicationId: number
      applicationNumber: string
      shopUnitId: number
      stallNumber: string
      finalAmountRupees: number
      representativeName: string
      mobileNumber: string
      email: string | null
    }> = []
    const seenStallIds = new Set<number>()

    for (const row of parsed.rows) {
      const application = applicationByNumber.get(row.applicationNumber)

      if (!application) {
        skipped.push({ rowNumber: row.rowNumber, message: `Application "${row.applicationNumber}" not found.` })
        continue
      }

      if (application.status !== 'auction_won') {
        skipped.push({
          rowNumber: row.rowNumber,
          message: `Application "${row.applicationNumber}" is not in "Auction Won — Payment Pending" status.`
        })
        continue
      }

      const stall = stallByNumber.get(row.stallNumber)

      if (!stall) {
        skipped.push({ rowNumber: row.rowNumber, message: `Booth/Stall "${row.stallNumber}" not found.` })
        continue
      }

      if (stall.category_id !== application.category_id) {
        skipped.push({
          rowNumber: row.rowNumber,
          message: `Booth/Stall "${row.stallNumber}" does not belong to this application's category.`
        })
        continue
      }

      if (stall.status !== 'available') {
        skipped.push({ rowNumber: row.rowNumber, message: `Booth/Stall "${row.stallNumber}" is not available.` })
        continue
      }

      if (seenStallIds.has(stall.id)) {
        skipped.push({ rowNumber: row.rowNumber, message: `Booth/Stall "${row.stallNumber}" is assigned more than once in this file.` })
        continue
      }

      seenStallIds.add(stall.id)
      resolvedRows.push({
        rowNumber: row.rowNumber,
        applicationId: application.id,
        applicationNumber: application.application_number,
        shopUnitId: stall.id,
        stallNumber: stall.stall_number,
        finalAmountRupees: row.finalAmountRupees,
        representativeName: application.representative_name,
        mobileNumber: application.mobile_number,
        email: application.email
      })
    }

    if (mode === 'validate') {
      return NextResponse.json({ errors: [], skipped, rowCount: resolvedRows.length })
    }

    // mode === 'import'
    await withTransaction(async (txQuery: TransactionQuery) => {
      for (const row of resolvedRows) {
        const amountPaise = row.finalAmountRupees * 100

        // eslint-disable-next-line no-await-in-loop
        await txQuery(
          `UPDATE shop_units SET status = 'allotted', allotted_to_application_id = ? WHERE id = ? AND status = 'available'`,
          [row.applicationId, row.shopUnitId]
        )

        // eslint-disable-next-line no-await-in-loop
        await txQuery(`UPDATE applications SET status = 'allotted' WHERE id = ? AND status = 'auction_won'`, [row.applicationId])

        // eslint-disable-next-line no-await-in-loop
        await txQuery(
          `INSERT INTO payments (application_id, purpose, amount_paise, status)
           VALUES (?, 'auction_final', ?, 'not_initiated')
           ON DUPLICATE KEY UPDATE amount_paise = ?, status = IF(status = 'success', 'success', 'not_initiated')`,
          [row.applicationId, amountPaise, amountPaise]
        )
      }
    })

    // Committed before notifications are attempted, so a provider outage
    // can never undo or leave the stall allotment in a half-complete state
    // — same ordering as draw-service.ts's post-draw notifications.
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')

    await Promise.allSettled(
      resolvedRows.map(row => {
        const destination = row.mobileNumber.startsWith('+') ? row.mobileNumber : `+91${row.mobileNumber}`
        const payLink = baseUrl ? `${baseUrl}/status?appNo=${encodeURIComponent(row.applicationNumber)}` : ''

        return sendNotification({
          category: 'auction_final_payment',
          destination,
          userName: row.representativeName,
          templateParams: [row.representativeName, row.applicationNumber, payLink],
          buttonParam: row.applicationNumber,
          applicationId: row.applicationId,
          email: row.email
        })
      })
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'auction.results_uploaded',
      module: 'draw',
      entityType: 'application',
      entityId: 'bulk',
      newValue: {
        resultCount: resolvedRows.length,
        skippedCount: skipped.length,
        applicationNumbers: resolvedRows.map(r => r.applicationNumber)
      }
    })

    return NextResponse.json({
      errors: [],
      skipped,
      rowCount: resolvedRows.length,
      message: `Recorded ${resolvedRows.length} auction result${resolvedRows.length === 1 ? '' : 's'}.${
        skipped.length > 0 ? ` Skipped ${skipped.length} (not eligible).` : ''
      }`
    })
  } catch (error) {
    logServerError('api.admin.applications.auction-results', error)

    return NextResponse.json({ error: 'Something went wrong while processing the file.' }, { status: 500 })
  }
}
