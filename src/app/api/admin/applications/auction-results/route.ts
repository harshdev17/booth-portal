import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { parseAuctionResultsCsv, type CsvRowError } from '@/lib/applications/auction-results-csv'
import { query, withTransaction, type TransactionQuery } from '@/lib/db/client'
import { notifyApplicationStatusChange } from '@/lib/notifications/application-status'
import { sendNotification } from '@/lib/notifications/service'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB — this is a short per-winner list, not a full inventory

type ResolvedRow = {
  rowNumber: number
  applicationId: number
  applicationNumber: string
  representativeName: string
  mobileNumber: string
  email: string | null
  shopUnitId: number
  stallNumber: string
  finalAmountPaise: number
  alreadyImported: boolean
}

/**
 * Two-mode endpoint (mirrors /api/admin/inventory/import's "validate then
 * import" wizard) for bulk-recording an auction category's physical-auction
 * results: matches each row by Application Number (must be
 * 'auction_fee_paid', or already 'auction_won' for a safe re-upload) and
 * Stall Number (must belong to the same category, must not already be
 * reserved for someone else). On import, reserves the stall for that
 * winner, moves the application to 'auction_won', seeds the exact
 * 'auction_final' payment amount from the CSV, and sends the Final Auction
 * Payment notification. Gated by 'allotment:perform' (reused, not a new
 * permission) — same class of action as Direct Allotment's own
 * admin-assigns-a-stall flow.
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

    if (parsed.rows.length === 0) {
      return NextResponse.json({ errors: [{ rowNumber: 0, message: 'No data rows found in the file.' }], rowCount: 0 })
    }

    const applicationNumbers = parsed.rows.map(r => r.applicationNumber)
    const stallNumbers = parsed.rows.map(r => r.stallNumber)

    const applications = await query<
      Array<{
        id: number
        application_number: string
        status: string
        category_id: number
        representative_name: string
        mobile_number: string
        email: string | null
      }>
    >(
      `SELECT id, application_number, status, category_id, representative_name, mobile_number, email
       FROM applications WHERE application_number IN (${applicationNumbers.map(() => '?').join(',')})`,
      applicationNumbers
    )

    const applicationByNumber = new Map(applications.map(a => [a.application_number, a]))

    const stalls = await query<Array<{ id: number; stall_number: string; category_id: number; status: string; allotted_to_application_id: number | null }>>(
      `SELECT id, stall_number, category_id, status, allotted_to_application_id
       FROM shop_units WHERE stall_number IN (${stallNumbers.map(() => '?').join(',')})`,
      stallNumbers
    )

    const stallByNumber = new Map(stalls.map(s => [s.stall_number, s]))

    const errors: CsvRowError[] = []
    const resolved: ResolvedRow[] = []

    for (const row of parsed.rows) {
      const application = applicationByNumber.get(row.applicationNumber)

      if (!application) {
        errors.push({ rowNumber: row.rowNumber, message: `Application "${row.applicationNumber}" was not found.` })
        continue
      }

      const alreadyImported = application.status === 'auction_won'

      if (application.status !== 'auction_fee_paid' && !alreadyImported) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `Application "${row.applicationNumber}" is "${application.status}" — it must be "Auction Fee Paid" before results can be recorded.`
        })
        continue
      }

      const stall = stallByNumber.get(row.stallNumber)

      if (!stall) {
        errors.push({ rowNumber: row.rowNumber, message: `Stall "${row.stallNumber}" was not found.` })
        continue
      }

      if (stall.category_id !== application.category_id) {
        errors.push({ rowNumber: row.rowNumber, message: `Stall "${row.stallNumber}" does not belong to this application's category.` })
        continue
      }

      const stallBelongsToThisApplication = stall.allotted_to_application_id === application.id

      if (!stallBelongsToThisApplication && stall.status !== 'available') {
        errors.push({ rowNumber: row.rowNumber, message: `Stall "${row.stallNumber}" is not available — it is already "${stall.status}".` })
        continue
      }

      resolved.push({
        rowNumber: row.rowNumber,
        applicationId: application.id,
        applicationNumber: application.application_number,
        representativeName: application.representative_name,
        mobileNumber: application.mobile_number,
        email: application.email,
        shopUnitId: stall.id,
        stallNumber: stall.stall_number,
        finalAmountPaise: Math.round(row.finalAmountRupees * 100),
        alreadyImported
      })
    }

    if (mode === 'validate') {
      return NextResponse.json({ errors, rowCount: resolved.length })
    }

    if (errors.length > 0) {
      return NextResponse.json({ errors, rowCount: 0 }, { status: 200 })
    }

    await withTransaction(async (txQuery: TransactionQuery) => {
      for (const row of resolved) {
         
        await txQuery(
          `UPDATE shop_units SET status = 'reserved', allotted_to_application_id = ? WHERE id = ?`,
          [row.applicationId, row.shopUnitId]
        )

         
        await txQuery(`UPDATE applications SET status = 'auction_won' WHERE id = ?`, [row.applicationId])

         
        await txQuery(
          `INSERT INTO payments (application_id, purpose, amount_paise, status)
           VALUES (?, 'auction_final', ?, 'not_initiated')
           ON DUPLICATE KEY UPDATE amount_paise = ?, status = IF(status = 'success', 'success', 'not_initiated')`,
          [row.applicationId, row.finalAmountPaise, row.finalAmountPaise]
        )
      }
    })

    await Promise.allSettled(
      resolved.flatMap(row => {
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
        const payLink = baseUrl ? `${baseUrl}/status?appNo=${encodeURIComponent(row.applicationNumber)}` : ''

        return [
          notifyApplicationStatusChange({
            applicationId: row.applicationId,
            applicationNumber: row.applicationNumber,
            mobileNumber: row.mobileNumber,
            email: row.email,
            representativeName: row.representativeName,
            newStatus: 'auction_won'
          }),
          sendNotification({
            category: 'auction_final_payment',
            destination: row.mobileNumber.startsWith('+') ? row.mobileNumber : `+91${row.mobileNumber}`,
            userName: row.representativeName,
            templateParams: [row.representativeName, row.applicationNumber, payLink],
            buttonParam: row.applicationNumber,
            applicationId: row.applicationId,
            email: row.email
          })
        ]
      })
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'auction_results.imported',
      module: 'draw',
      entityType: 'auction_results_upload',
      entityId: String(resolved.length),
      newValue: {
        rows: resolved.map(r => ({
          applicationNumber: r.applicationNumber,
          stallNumber: r.stallNumber,
          finalAmountPaise: r.finalAmountPaise
        }))
      }
    })

    return NextResponse.json({ errors: [], rowCount: resolved.length, imported: true })
  } catch (error) {
    logServerError('api.admin.applications.auction-results', error)

    return NextResponse.json({ error: 'Failed to process the auction results file.' }, { status: 500 })
  }
}
