import 'server-only'

import { randomUUID } from 'node:crypto'

import { resolveAllotmentAmountPaise } from '@/lib/applications/category-amount'
import { logAudit } from '@/lib/audit/log'
import { query, withTransaction } from '@/lib/db/client'
import { buildCsv, parseCsvLine } from '@/lib/inventory/shop-units-csv'
import { getPhysicalBoothCount, stallSpansOverlap } from '@/lib/inventory/stall-range'
import { sendNotification } from '@/lib/notifications/service'
import { logServerError } from '@/lib/security/error-log'

export const RESULT_SHEET_COLUMNS = ['Booth/Stall No.', 'Single/Double', 'Category', 'Direction', 'Application Number'] as const

// Auction Results sheet: same 5 columns as the draw/manual sheet above, plus
// one extra the draw sheet doesn't have — the winning bid actually settled
// at the (offline, in-person) auction, which varies per row and can't be
// known ahead of time the way a draw category's flat allotment amount can.
export const AUCTION_RESULT_SHEET_COLUMNS = [...RESULT_SHEET_COLUMNS, 'Final Auction Amount'] as const

const APPLICATION_NUMBER_PATTERN = /^(?:IGM|KDB)-\d{4}-\d{6}$/
const MAX_ROWS = 2000

export type ResultPurpose = 'draw_allotment' | 'auction_result'

export type ResultSheetRow = {
  rowNumber: number
  stallNumber: string
  shopType: 'single' | 'double'
  categoryName: string | null
  direction: string | null
  applicationNumber: string

  // Only present for an 'auction_result' sheet — see AUCTION_RESULT_SHEET_COLUMNS.
  finalAmountPaise: number | null
}

export type RowError = { rowNumber: number; message: string }

export function buildResultSheetTemplate(): string {
  return buildCsv([
    [...RESULT_SHEET_COLUMNS],
    ['100', 'Single', 'Handicrafts', 'North', 'IGM-2026-123456'],
    ['100-102', 'Double', 'Handicrafts', '', 'IGM-2026-654321']
  ])
}

export function buildAuctionResultSheetTemplate(): string {
  return buildCsv([
    [...AUCTION_RESULT_SHEET_COLUMNS],
    ['S-101', 'Single', 'Refreshment and Ice Cream Booth/Stall', 'North', 'IGM-2026-000123', '55000']
  ])
}

/**
 * Parses the uploaded sheet. Pure — no database access. `purpose` controls
 * whether the "Final Auction Amount" column is required (auction_result) or
 * ignored if present (draw_allotment) — same 5 base columns either way, so
 * one parser serves both upload modes.
 */
export function parseResultSheet(
  text: string,
  purpose: ResultPurpose = 'draw_allotment'
): { rows: ResultSheetRow[]; errors: RowError[] } {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter(line => line.trim() !== '')

  if (lines.length < 2) {
    return { rows: [], errors: [{ rowNumber: 1, message: 'The sheet has no data rows.' }] }
  }

  if (lines.length - 1 > MAX_ROWS) {
    return { rows: [], errors: [{ rowNumber: 1, message: `Too many rows (maximum ${MAX_ROWS}).` }] }
  }

  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase())

  const findCol = (names: string[]) => headers.findIndex(h => names.includes(h))

  const stallCol = findCol(['booth/stall no.', 'booth/stall no', 'stall no.', 'stall no', 'booth no.', 'booth no', 'stall number', 'booth number', 'booth', 'stall'])
  const typeCol = findCol(['single/double', 'type', 'shop type', 'stall type'])
  const categoryCol = findCol(['category', 'category name'])
  const directionCol = findCol(['direction', 'facing'])
  const appCol = findCol(['application number', 'application no.', 'application no', 'app no', 'app number'])
  const amountCol = findCol(['final auction amount', 'final amount', 'auction amount', 'amount'])

  if (stallCol === -1 || appCol === -1) {
    return {
      rows: [],
      errors: [{ rowNumber: 1, message: 'Could not find the "Booth/Stall No." and "Application Number" columns. Use the template.' }]
    }
  }

  if (purpose === 'auction_result' && amountCol === -1) {
    return {
      rows: [],
      errors: [{ rowNumber: 1, message: 'Could not find the "Final Auction Amount" column. Use the auction template.' }]
    }
  }

  const rows: ResultSheetRow[] = []
  const errors: RowError[] = []
  const seenStalls = new Map<string, number>()
  const seenApplications = new Map<string, number>()

  lines.slice(1).forEach((line, idx) => {
    const rowNumber = idx + 2
    const fields = parseCsvLine(line).map(f => f.trim())
    const stallNumber = fields[stallCol] ?? ''
    const applicationNumber = (fields[appCol] ?? '').toUpperCase()
    const typeRaw = typeCol !== -1 ? (fields[typeCol] ?? '').toLowerCase() : ''

    if (!stallNumber) return void errors.push({ rowNumber, message: 'Booth/Stall No. is required.' })
    if (stallNumber.length > 32) return void errors.push({ rowNumber, message: 'Booth/Stall No. is too long (maximum 32 characters).' })

    if (!APPLICATION_NUMBER_PATTERN.test(applicationNumber)) {
      return void errors.push({ rowNumber, message: `Invalid Application Number "${fields[appCol] ?? ''}" (expected e.g. IGM-2026-123456).` })
    }

    const stallKey = stallNumber.toLowerCase()

    if (seenStalls.has(stallKey)) {
      return void errors.push({ rowNumber, message: `Booth/Stall "${stallNumber}" is also on row ${seenStalls.get(stallKey)}.` })
    }

    if (seenApplications.has(applicationNumber)) {
      return void errors.push({
        rowNumber,
        message: `Application ${applicationNumber} is also on row ${seenApplications.get(applicationNumber)} — one booth per application.`
      })
    }

    let finalAmountPaise: number | null = null

    if (purpose === 'auction_result') {
      const amountRaw = fields[amountCol] ?? ''
      const amountRupees = Number(amountRaw)

      if (!amountRaw || !Number.isFinite(amountRupees) || amountRupees <= 0) {
        return void errors.push({ rowNumber, message: 'Final Auction Amount must be a positive number.' })
      }

      finalAmountPaise = Math.round(amountRupees * 100)
    }

    seenStalls.set(stallKey, rowNumber)
    seenApplications.set(applicationNumber, rowNumber)

    rows.push({
      rowNumber,
      stallNumber,
      shopType: typeRaw.includes('double') || typeRaw === 'd' ? 'double' : 'single',
      categoryName: categoryCol !== -1 && fields[categoryCol] ? fields[categoryCol].replace(/\s+/g, ' ') : null,
      direction: directionCol !== -1 && fields[directionCol] ? fields[directionCol].slice(0, 64) : null,
      applicationNumber,
      finalAmountPaise
    })
  })

  return { rows, errors }
}

type ApplicationLookup = {
  id: number
  application_number: string
  status: string
  category_id: number
  category_name: string
  selection_method: string
  existing_stall: string | null
  existing_direct_allotment: number | null
}

type StallLookup = {
  id: number
  stall_number: string
  category_id: number
  status: string
  allotted_to_application_id: number | null
}

/**
 * A sheet row's stall number can numerically overlap an EXISTING, different
 * shop_units row without being an exact string match — e.g. uploading "104"
 * when "103-105" already exists as a combined stall, or uploading "103-105"
 * as a new combined stall when "104" already exists on its own. An exact
 * match is validated separately (category/availability); this only guards
 * against silently creating/allotting a second row for a physical booth
 * that's already accounted for under a different stall_number string
 * (confirmed live 2026-11-28 as a real gap — no warning existed at all).
 */
function findOverlappingStall(stallNumber: string, allStalls: StallLookup[]): StallLookup | null {
  const normalized = stallNumber.trim().toLowerCase()

  for (const other of allStalls) {
    if (other.stall_number.trim().toLowerCase() === normalized) continue
    if (stallSpansOverlap(stallNumber, other.stall_number)) return other
  }

  return null
}

export type ResultPreviewRow = {
  rowNumber: number
  stallNumber: string
  shopType: 'single' | 'double'
  direction: string | null
  categoryName: string
  applicationNumber: string
  applicantName: string | null
  fatherName: string | null
  isPaymentRequired: boolean
  isNewStall: boolean
  isValid: boolean
  issues: string[]
  finalAmountPaise: number | null
}

export type ResultSheetPreview = {
  rows: ResultPreviewRow[]
  totalCount: number
  validCount: number
  errorCount: number
  newStallsCount: number
  canStage: boolean
}

export async function previewResultSheet(
  rows: ResultSheetRow[],
  purpose: ResultPurpose = 'draw_allotment'
): Promise<ResultSheetPreview> {
  if (rows.length === 0) {
    return {
      rows: [],
      totalCount: 0,
      validCount: 0,
      errorCount: 0,
      newStallsCount: 0,
      canStage: false
    }
  }

  const applications = await query<
    Array<{
      id: number
      application_number: string
      status: string
      category_id: number
      category_name: string
      selection_method: string
      representative_name: string
      father_name: string
      allotment_payment_enabled: number
      allotment_amount_paise: number | null
      allotment_amount_single_paise: number | null
      allotment_amount_double_paise: number | null
      existing_stall: string | null
      existing_direct_allotment: number | null
    }>
  >(
    `SELECT a.id, a.application_number, a.status, a.category_id, c.name AS category_name, c.selection_method,
            a.representative_name, a.father_name, c.allotment_payment_enabled, c.allotment_amount_paise,
            c.allotment_amount_single_paise, c.allotment_amount_double_paise,
            (SELECT su.stall_number FROM shop_units su WHERE su.allotted_to_application_id = a.id LIMIT 1) AS existing_stall,
            (SELECT da.id FROM direct_allotments da WHERE da.application_id = a.id AND da.status = 'active' LIMIT 1) AS existing_direct_allotment
     FROM applications a
     JOIN categories c ON c.id = a.category_id
     WHERE a.application_number IN (${rows.map(() => '?').join(', ')})`,
    rows.map(r => r.applicationNumber)
  )

  const stalls = await query<StallLookup[]>(
    `SELECT id, stall_number, category_id, status, allotted_to_application_id
     FROM shop_units WHERE stall_number IN (${rows.map(() => '?').join(', ')})`,
    rows.map(r => r.stallNumber)
  )

  // Every existing shop_unit, not just exact string matches — needed to
  // catch a sheet row whose NUMBER overlaps a different, already-existing
  // stall_number string (see findOverlappingStall above).
  const allStalls = await query<StallLookup[]>(`SELECT id, stall_number, category_id, status, allotted_to_application_id FROM shop_units`)

  const applicationByNumber = new Map(applications.map(a => [a.application_number.toUpperCase(), a]))
  const stallByNumber = new Map(stalls.map(s => [s.stall_number.toLowerCase(), s]))

  const stallCountInSheet = new Map<string, number>()
  const appCountInSheet = new Map<string, number>()

  for (const r of rows) {
    const sKey = r.stallNumber.trim().toLowerCase()
    const aKey = r.applicationNumber.trim().toUpperCase()

    stallCountInSheet.set(sKey, (stallCountInSheet.get(sKey) ?? 0) + 1)
    appCountInSheet.set(aKey, (appCountInSheet.get(aKey) ?? 0) + 1)
  }

  let validCount = 0
  let errorCount = 0
  let newStallsCount = 0

  const previewRows: ResultPreviewRow[] = rows.map(row => {
    const issues: string[] = []
    const app = applicationByNumber.get(row.applicationNumber.trim().toUpperCase())
    const stall = stallByNumber.get(row.stallNumber.trim().toLowerCase())

    const sKey = row.stallNumber.trim().toLowerCase()
    const aKey = row.applicationNumber.trim().toUpperCase()

    if ((stallCountInSheet.get(sKey) ?? 0) > 1) {
      issues.push(`Booth "${row.stallNumber}" appears multiple times in this sheet.`)
    }

    if ((appCountInSheet.get(aKey) ?? 0) > 1) {
      issues.push(`Application "${row.applicationNumber}" appears multiple times in this sheet.`)
    }

    if (!app) {
      issues.push(`Application "${row.applicationNumber}" not found in database.`)
    } else if (purpose === 'auction_result') {
      const alreadyWon = app.status === 'auction_won'

      if (app.status !== 'auction_fee_paid' && !alreadyWon) {
        issues.push(`Application status is "${app.status}" (must be "Auction Fee Paid" before results can be recorded).`)
      }

      if (app.selection_method !== 'auction') {
        issues.push(`Category "${app.category_name}" is not an auction category — use the draw/manual result flow.`)
      }

      if (row.categoryName && row.categoryName.trim().toLowerCase() !== app.category_name.toLowerCase()) {
        issues.push(`Sheet category "${row.categoryName}" does not match applicant category "${app.category_name}".`)
      }

      if (!alreadyWon && (app.existing_stall || app.existing_direct_allotment)) {
        issues.push(`Applicant already allotted a stall (${app.existing_stall ? `Stall #${app.existing_stall}` : 'Direct Allotment'}).`)
      }
    } else {
      if (app.status !== 'approved') {
        issues.push(`Application status is "${app.status}" (must be "approved" to allot).`)
      }

      if (app.selection_method === 'auction') {
        issues.push(`Category "${app.category_name}" uses auction allotment, not result declaration.`)
      }

      if (row.categoryName && row.categoryName.trim().toLowerCase() !== app.category_name.toLowerCase()) {
        issues.push(`Sheet category "${row.categoryName}" does not match applicant category "${app.category_name}".`)
      }

      if (app.existing_stall || app.existing_direct_allotment) {
        issues.push(`Applicant already allotted a stall (${app.existing_stall ? `Stall #${app.existing_stall}` : 'Direct Allotment'}).`)
      }
    }

    let isNewStall = false

    if (stall) {
      if (app && stall.category_id !== app.category_id) {
        issues.push(`Existing booth "${row.stallNumber}" belongs to a different category.`)
      }

      if (stall.status !== 'available' || stall.allotted_to_application_id !== null) {
        issues.push(`Booth "${row.stallNumber}" is currently "${stall.status}" (not available).`)
      }
    } else {
      const overlapping = findOverlappingStall(row.stallNumber, allStalls)

      if (overlapping) {
        issues.push(
          `Booth "${row.stallNumber}" overlaps with existing booth/stall "${overlapping.stall_number}" ` +
            `(currently "${overlapping.status}"${overlapping.allotted_to_application_id ? ', already allotted' : ''}) — ` +
            `it's part of that combined stall, not a separate one.`
        )
      } else {
        isNewStall = true
        newStallsCount++
      }
    }

    const isValid = issues.length === 0

    if (isValid) {
      validCount++
    } else {
      errorCount++
    }

    return {
      rowNumber: row.rowNumber,
      stallNumber: row.stallNumber,
      shopType: row.shopType,
      direction: row.direction,
      categoryName: app?.category_name ?? row.categoryName ?? '—',
      applicationNumber: row.applicationNumber,
      applicantName: app?.representative_name ?? null,
      fatherName: app?.father_name ?? null,
      isPaymentRequired:
        purpose === 'auction_result'
          ? true
          : Boolean(app && app.allotment_payment_enabled && Number(resolveAllotmentAmountPaise(app, row.shopType)) > 0),
      isNewStall,
      isValid,
      issues,
      finalAmountPaise: purpose === 'auction_result' ? row.finalAmountPaise : null
    }
  })

  return {
    rows: previewRows,
    totalCount: rows.length,
    validCount,
    errorCount,
    newStallsCount,
    canStage: errorCount === 0 && previewRows.length > 0
  }
}

/**
 * Validates the sheet against live data and, only if every row is valid,
 * saves it as the pending result: creates any booth/stall that doesn't
 * exist yet (as 'available', under the application's category) and stages
 * one pending row per booth. Nothing is assigned to any application and no
 * one is notified until declareResult() runs.
 *
 * Uploading a new sheet discards the previously pending rows of the SAME
 * purpose only — an auction upload never discards a still-pending draw
 * sheet and vice versa, since the two are independent workflows that happen
 * to share this table (migration 0087).
 */
export async function stageResultSheet(
  rows: ResultSheetRow[],
  uploadedByUserId: number,
  purpose: ResultPurpose = 'draw_allotment'
): Promise<{ ok: true; batchId: string; rowCount: number; createdStalls: number; createdStallNumbers: string[] } | { ok: false; errors: RowError[] }> {
  const applications = await query<ApplicationLookup[]>(
    `SELECT a.id, a.application_number, a.status, a.category_id, c.name AS category_name, c.selection_method,
            (SELECT su.stall_number FROM shop_units su WHERE su.allotted_to_application_id = a.id LIMIT 1) AS existing_stall,
            (SELECT da.id FROM direct_allotments da WHERE da.application_id = a.id AND da.status = 'active' LIMIT 1) AS existing_direct_allotment
     FROM applications a
     JOIN categories c ON c.id = a.category_id
     WHERE a.application_number IN (${rows.map(() => '?').join(', ')})`,
    rows.map(r => r.applicationNumber)
  )

  const stalls = await query<StallLookup[]>(
    `SELECT id, stall_number, category_id, status, allotted_to_application_id
     FROM shop_units WHERE stall_number IN (${rows.map(() => '?').join(', ')})`,
    rows.map(r => r.stallNumber)
  )

  // Every existing shop_unit — same reasoning as previewResultSheet's
  // allStalls: catches a sheet row whose number overlaps a different,
  // already-existing stall_number string before it gets auto-created below.
  const allStalls = await query<StallLookup[]>(`SELECT id, stall_number, category_id, status, allotted_to_application_id FROM shop_units`)

  const applicationByNumber = new Map(applications.map(a => [a.application_number.toUpperCase(), a]))
  const stallByNumber = new Map(stalls.map(s => [s.stall_number.toLowerCase(), s]))
  const errors: RowError[] = []

  for (const row of rows) {
    const app = applicationByNumber.get(row.applicationNumber)
    const stall = stallByNumber.get(row.stallNumber.toLowerCase())
    const fail = (message: string) => errors.push({ rowNumber: row.rowNumber, message })

    if (!app) {
      fail(`Application ${row.applicationNumber} not found.`)
      continue
    }

    if (!stall) {
      const overlapping = findOverlappingStall(row.stallNumber, allStalls)

      if (overlapping) {
        fail(
          `Booth "${row.stallNumber}" overlaps with existing booth/stall "${overlapping.stall_number}" ` +
            `(currently "${overlapping.status}"${overlapping.allotted_to_application_id ? ', already allotted' : ''}) — ` +
            `it's part of that combined stall, not a separate one.`
        )
        continue
      }
    }

    if (purpose === 'auction_result') {
      const alreadyWon = app.status === 'auction_won'

      if (app.status !== 'auction_fee_paid' && !alreadyWon) {
        fail(`Application ${row.applicationNumber} is "${app.status}" — it must be "Auction Fee Paid" before results can be recorded.`)
        continue
      }

      if (app.selection_method !== 'auction') {
        fail(`Application ${row.applicationNumber} is not in an auction category (${app.category_name}) — use the draw/manual result flow.`)
        continue
      }

      if (row.categoryName && row.categoryName.toLowerCase() !== app.category_name.toLowerCase()) {
        fail(`Category "${row.categoryName}" does not match application ${row.applicationNumber}'s category "${app.category_name}".`)
        continue
      }

      if (!alreadyWon && (app.existing_stall || app.existing_direct_allotment)) {
        fail(`Application ${row.applicationNumber} already has a booth${app.existing_stall ? ` (${app.existing_stall})` : ''}.`)
        continue
      }

      if (stall) {
        if (stall.category_id !== app.category_id) {
          fail(`Booth/Stall "${row.stallNumber}" belongs to a different category than application ${row.applicationNumber}.`)
        } else {
          const stallBelongsToThisApplication = stall.allotted_to_application_id === app.id

          if (!stallBelongsToThisApplication && (stall.status !== 'available' || stall.allotted_to_application_id !== null)) {
            fail(`Booth/Stall "${row.stallNumber}" is not available (currently "${stall.status}").`)
          }
        }
      }

      continue
    }

    if (app.status !== 'approved') {
      fail(`Application ${row.applicationNumber} is "${app.status}" — only Approved applications can be given a booth.`)
      continue
    }

    if (app.selection_method === 'auction') {
      fail(`Application ${row.applicationNumber} is in an auction category (${app.category_name}) — use the auction flow.`)
      continue
    }

    if (row.categoryName && row.categoryName.toLowerCase() !== app.category_name.toLowerCase()) {
      fail(`Category "${row.categoryName}" does not match application ${row.applicationNumber}'s category "${app.category_name}".`)
      continue
    }

    if (app.existing_stall || app.existing_direct_allotment) {
      fail(`Application ${row.applicationNumber} already has a booth${app.existing_stall ? ` (${app.existing_stall})` : ''}.`)
      continue
    }

    if (stall) {
      if (stall.category_id !== app.category_id) {
        fail(`Booth/Stall "${row.stallNumber}" belongs to a different category than application ${row.applicationNumber}.`)
      } else if (stall.status !== 'available' || stall.allotted_to_application_id !== null) {
        fail(`Booth/Stall "${row.stallNumber}" is not available (currently "${stall.status}").`)
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors }

  const batchId = randomUUID()

  const createdStallResult = await withTransaction(async q => {
    await q(`UPDATE result_declaration_rows SET status = 'discarded' WHERE status = 'pending' AND purpose = ?`, [purpose])

    const createdStallNumbers: string[] = []

    for (const row of rows) {
      const app = applicationByNumber.get(row.applicationNumber)!
      let stallId = stallByNumber.get(row.stallNumber.toLowerCase())?.id

      if (!stallId) {

        const inserted = await q<{ insertId: number }>(
          `INSERT INTO shop_units (category_id, stall_number, shop_type, direction, status)
           VALUES (?, ?, ?, ?, 'available')`,
          [app.category_id, row.stallNumber, row.shopType, row.direction]
        )

        stallId = inserted.insertId
        createdStallNumbers.push(row.stallNumber)
      }


      await q(
        `INSERT INTO result_declaration_rows (batch_id, purpose, shop_unit_id, application_id, final_amount_paise, uploaded_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [batchId, purpose, stallId, app.id, row.finalAmountPaise, uploadedByUserId]
      )
    }

    return { created: createdStallNumbers.length, createdStallNumbers }
  })

  return {
    ok: true,
    batchId,
    rowCount: rows.length,
    createdStalls: createdStallResult.created,
    createdStallNumbers: createdStallResult.createdStallNumbers
  }
}

export type ResultRowView = {
  id: number
  batchId: string
  purpose: ResultPurpose
  stallNumber: string
  shopType: 'single' | 'double'
  direction: string | null
  categoryName: string
  applicationNumber: string
  applicantName: string
  applicationStatus: string
  paymentRequired: boolean
  allotmentAmountPaise: number | null
  declaredAt: string | null
}

type ResultRowViewQuery = Omit<ResultRowView, 'paymentRequired' | 'allotmentAmountPaise'> & {
  allotmentPaymentEnabled: number
  allotment_amount_paise: number | null
  allotment_amount_single_paise: number | null
  allotment_amount_double_paise: number | null
  final_amount_paise: number | null
}

const ROW_VIEW_SELECT = `
  SELECT r.id, r.batch_id AS batchId, r.purpose, su.stall_number AS stallNumber, su.shop_type AS shopType, su.direction,
         c.name AS categoryName, a.application_number AS applicationNumber, a.representative_name AS applicantName,
         a.status AS applicationStatus,
         c.allotment_payment_enabled AS allotmentPaymentEnabled,
         c.allotment_amount_paise, c.allotment_amount_single_paise, c.allotment_amount_double_paise,
         r.final_amount_paise,
         r.declared_at AS declaredAt
  FROM result_declaration_rows r
  JOIN shop_units su ON su.id = r.shop_unit_id
  JOIN applications a ON a.id = r.application_id
  JOIN categories c ON c.id = a.category_id`

function isMissingTable(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'ER_NO_SUCH_TABLE'
}

function toResultRowView(row: ResultRowViewQuery): ResultRowView {
  const perBoothAmountPaise = resolveAllotmentAmountPaise(row, row.shopType)

  const allotmentAmountPaise =
    row.purpose === 'auction_result'
      ? row.final_amount_paise
      : perBoothAmountPaise !== null
        ? perBoothAmountPaise * getPhysicalBoothCount(row.stallNumber)
        : null

  return {
    id: row.id,
    batchId: row.batchId,
    purpose: row.purpose,
    stallNumber: row.stallNumber,
    shopType: row.shopType,
    direction: row.direction,
    categoryName: row.categoryName,
    applicationNumber: row.applicationNumber,
    applicantName: row.applicantName,
    applicationStatus: row.applicationStatus,
    paymentRequired:
      row.purpose === 'auction_result'
        ? true
        : Boolean(Number(row.allotmentPaymentEnabled) && Number(allotmentAmountPaise) > 0),
    allotmentAmountPaise,
    declaredAt: row.declaredAt
  }
}

export async function listResultRows(
  purpose: ResultPurpose = 'draw_allotment'
): Promise<{ pending: ResultRowView[]; declared: ResultRowView[]; tableMissing: boolean }> {
  try {
    const pending = await query<ResultRowViewQuery[]>(
      `${ROW_VIEW_SELECT} WHERE r.status = 'pending' AND r.purpose = ? ORDER BY c.name, su.stall_number`,
      [purpose]
    )

    const declared = await query<ResultRowViewQuery[]>(
      `${ROW_VIEW_SELECT} WHERE r.status = 'declared' AND r.purpose = ? ORDER BY r.declared_at DESC, su.stall_number LIMIT 500`,
      [purpose]
    )

    return { pending: pending.map(toResultRowView), declared: declared.map(toResultRowView), tableMissing: false }
  } catch (error) {
    if (isMissingTable(error)) return { pending: [], declared: [], tableMissing: true }
    throw error
  }
}

/**
 * Removes one row from the pending (not-yet-declared) sheet — e.g. a booth
 * that should not be given out after all. The row is kept as 'discarded'
 * (never deleted) so the history stays complete. A booth auto-created by
 * the upload stays in inventory as 'available'.
 */
export async function removePendingRow(rowId: number, userId: number, ipAddress?: string | null) {
  const removed = await withTransaction(async q => {
    const rows = await q<Array<{ id: number; stall_number: string; application_number: string; batch_id: string }>>(
      `SELECT r.id, su.stall_number, a.application_number, r.batch_id
       FROM result_declaration_rows r
       JOIN shop_units su ON su.id = r.shop_unit_id
       JOIN applications a ON a.id = r.application_id
       WHERE r.id = ? AND r.status = 'pending'
       LIMIT 1 FOR UPDATE`,
      [rowId]
    )

    if (rows.length === 0) return null

    await q(`UPDATE result_declaration_rows SET status = 'discarded' WHERE id = ?`, [rowId])

    return rows[0]
  })

  if (!removed) return { ok: false as const, error: 'This row is no longer pending — it was already declared, removed or replaced.' }

  await logAudit({
    actorUserId: userId,
    actorRoleKey: null,
    action: 'result.row_removed',
    module: 'allotment',
    entityType: 'result_batch',
    entityId: removed.batch_id,
    ipAddress,
    previousValue: { stall: removed.stall_number, applicationNumber: removed.application_number },
    newValue: { rowId }
  })

  return { ok: true as const }
}

/**
 * Changes which application a pending row's booth goes to, before declaring.
 * The new application is validated with exactly the upload rules (Approved,
 * non-auction, same category as the booth, no booth already, not already on
 * another pending row). The change is audit-logged with old and new values.
 */
export async function updatePendingRowApplication(
  rowId: number,
  newApplicationNumber: string,
  userId: number,
  ipAddress?: string | null
) {
  const applicationNumber = newApplicationNumber.trim().toUpperCase()

  if (!APPLICATION_NUMBER_PATTERN.test(applicationNumber)) {
    return { ok: false as const, error: 'Enter a valid application number, e.g. IGM-2026-123456.' }
  }

  const result = await withTransaction(async q => {
    const rows = await q<
      Array<{
        id: number
        batch_id: string
        purpose: ResultPurpose
        shop_unit_id: number
        stall_number: string
        stall_category_id: number
        old_application_number: string
      }>
    >(
      `SELECT r.id, r.batch_id, r.purpose, r.shop_unit_id, su.stall_number, su.category_id AS stall_category_id,
              a.application_number AS old_application_number
       FROM result_declaration_rows r
       JOIN shop_units su ON su.id = r.shop_unit_id
       JOIN applications a ON a.id = r.application_id
       WHERE r.id = ? AND r.status = 'pending'
       LIMIT 1 FOR UPDATE`,
      [rowId]
    )

    const row = rows[0]

    if (!row) return { error: 'This row is no longer pending — it was already declared, removed or replaced.' }

    // Re-assigning a pending auction row's application isn't supported yet —
    // its eligibility rules (auction_fee_paid, not approved) differ from the
    // draw-only checks below. Safer to require a fresh upload than risk a
    // mismatched check passing a row through incorrectly.
    if (row.purpose === 'auction_result') {
      return { error: 'Editing the application on an auction result row is not supported — remove it and re-upload the sheet instead.' }
    }

    if (row.old_application_number === applicationNumber) return { error: 'This booth already points to that application.' }

    const apps = await q<ApplicationLookup[]>(
      `SELECT a.id, a.application_number, a.status, a.category_id, c.name AS category_name, c.selection_method,
              (SELECT su.stall_number FROM shop_units su WHERE su.allotted_to_application_id = a.id LIMIT 1) AS existing_stall,
              (SELECT da.id FROM direct_allotments da WHERE da.application_id = a.id AND da.status = 'active' LIMIT 1) AS existing_direct_allotment
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       WHERE a.application_number = ? LIMIT 1`,
      [applicationNumber]
    )

    const app = apps[0]

    if (!app) return { error: `Application ${applicationNumber} not found.` }
    if (app.status !== 'approved') return { error: `Application ${applicationNumber} is "${app.status}" — only Approved applications can be given a booth.` }
    if (app.selection_method === 'auction') return { error: `Application ${applicationNumber} is in an auction category — use the auction flow.` }
    if (app.category_id !== row.stall_category_id) return { error: `Booth/Stall "${row.stall_number}" belongs to a different category than ${applicationNumber}.` }

    if (app.existing_stall || app.existing_direct_allotment) {
      return { error: `Application ${applicationNumber} already has a booth${app.existing_stall ? ` (${app.existing_stall})` : ''}.` }
    }

    const duplicate = await q<Array<{ id: number }>>(
      `SELECT id FROM result_declaration_rows WHERE application_id = ? AND status = 'pending' AND id != ? LIMIT 1`,
      [app.id, rowId]
    )

    if (duplicate.length > 0) return { error: `Application ${applicationNumber} is already on another pending row — one booth per application.` }

    await q(`UPDATE result_declaration_rows SET application_id = ? WHERE id = ?`, [app.id, rowId])

    return { row }
  })

  if ('error' in result) return { ok: false as const, error: result.error }

  await logAudit({
    actorUserId: userId,
    actorRoleKey: null,
    action: 'result.row_updated',
    module: 'allotment',
    entityType: 'result_batch',
    entityId: result.row.batch_id,
    ipAddress,
    previousValue: { stall: result.row.stall_number, applicationNumber: result.row.old_application_number },
    newValue: { stall: result.row.stall_number, applicationNumber }
  })

  return { ok: true as const }
}

export type ResultHistoryStallItem = {
  stall: string
  applicationNumber: string
  applicantName?: string
  categoryName?: string
  isPaymentRequired?: boolean
  isNewStall?: boolean
}

export type ResultHistoryDiff = {
  addedBooths?: ResultHistoryStallItem[]
  removedBooths?: ResultHistoryStallItem[]
  changedBooths?: Array<{ stall: string; oldApp: string; newApp: string; oldName?: string; newName?: string }>
  newBoothsCreated?: string[]
}

export type ResultHistoryEntry = {
  id: number
  action: string
  actorName: string | null
  previousValue: unknown
  newValue: unknown
  createdAt: string
  entityId?: string | null
  stalls?: ResultHistoryStallItem[]
  diff?: ResultHistoryDiff
}

/**
 * Every recorded action of this flow (sheet uploads, row edits/removals,
 * declarations), newest first, from the append-only audit log — the full
 * transparent trail shown on the Declare Result page.
 */
export async function listResultHistory(): Promise<ResultHistoryEntry[]> {
  const auditRows = await query<
    Array<{
      id: number
      action: string
      entity_id: string | null
      actor_name: string | null
      previous_value: unknown
      new_value: unknown
      created_at: string
    }>
  >(
    `SELECT al.id, al.action, al.entity_id, u.full_name AS actor_name, al.previous_value, al.new_value, al.created_at
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_user_id
     WHERE al.action IN ('result.sheet_uploaded', 'result.row_updated', 'result.row_removed', 'result.declared')
     ORDER BY al.id DESC
     LIMIT 200`
  )

  const parse = (value: unknown): unknown => {
    if (typeof value !== 'string') return value

    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  // Find all batchIds referenced in audit logs
  const batchIds = Array.from(
    new Set(auditRows.map(r => r.entity_id).filter((id): id is string => typeof id === 'string' && id.length > 10))
  )

  const batchRowsMap = new Map<string, ResultHistoryStallItem[]>()
  const newStallsByBatch = new Map<string, string[]>()

  if (batchIds.length > 0) {
    try {
      const decRows = await query<
        Array<{
          batch_id: string
          stall_number: string
          shop_type: string
          stall_created_at: string
          application_number: string
          representative_name: string
          category_name: string
          allotment_payment_enabled: number
          allotment_amount_paise: number
          staged_at: string
        }>
      >(
        `SELECT r.batch_id, su.stall_number, su.shop_type, su.created_at AS stall_created_at,
                a.application_number, a.representative_name, c.name AS category_name,
                c.allotment_payment_enabled, c.allotment_amount_paise,
                r.created_at AS staged_at
         FROM result_declaration_rows r
         JOIN shop_units su ON su.id = r.shop_unit_id
         JOIN applications a ON a.id = r.application_id
         JOIN categories c ON c.id = a.category_id
         WHERE r.batch_id IN (${batchIds.map(() => '?').join(', ')})
         ORDER BY su.stall_number ASC`,
        batchIds
      )

      for (const row of decRows) {
        const list = batchRowsMap.get(row.batch_id) ?? []
        const isPaymentRequired = Boolean(row.allotment_payment_enabled && Number(row.allotment_amount_paise) > 0)

        const stallCreatedTime = new Date(row.stall_created_at).getTime()
        const stagedTime = new Date(row.staged_at).getTime()
        const isNewStall = Math.abs(stallCreatedTime - stagedTime) < 30000

        if (isNewStall) {
          const newSet = newStallsByBatch.get(row.batch_id) ?? []

          if (!newSet.includes(row.stall_number)) {
            newSet.push(row.stall_number)
            newStallsByBatch.set(row.batch_id, newSet)
          }
        }

        list.push({
          stall: row.stall_number,
          applicationNumber: row.application_number,
          applicantName: row.representative_name,
          categoryName: row.category_name,
          isPaymentRequired,
          isNewStall
        })
        batchRowsMap.set(row.batch_id, list)
      }
    } catch {
      // Safe fallback if table doesn't exist
    }
  }

  // Compute diffs between sheet uploads chronologically (oldest to newest)
  const uploadEntriesChronological = auditRows
    .filter(r => r.action === 'result.sheet_uploaded')
    .sort((a, b) => a.id - b.id)

  const diffByAuditId = new Map<number, ResultHistoryDiff>()

  for (let i = 0; i < uploadEntriesChronological.length; i++) {
    const curr = uploadEntriesChronological[i]
    const currBatchId = curr.entity_id
    const currStalls = currBatchId ? batchRowsMap.get(currBatchId) ?? [] : []
    const parsedNext = (parse(curr.new_value) as Record<string, unknown>) ?? {}

    const createdFromAudit = Array.isArray(parsedNext.createdStallNumbers)
      ? (parsedNext.createdStallNumbers as string[])
      : null

    const newBoothsCreated = createdFromAudit ?? (currBatchId ? newStallsByBatch.get(currBatchId) ?? [] : [])

    if (i === 0) {
      diffByAuditId.set(curr.id, {
        addedBooths: currStalls.length > 0 ? currStalls : undefined,
        newBoothsCreated: newBoothsCreated.length > 0 ? newBoothsCreated : undefined
      })
      continue
    }

    const prev = uploadEntriesChronological[i - 1]
    const prevBatchId = prev.entity_id
    const prevStalls = prevBatchId ? batchRowsMap.get(prevBatchId) ?? [] : []

    const prevMap = new Map(prevStalls.map(s => [s.stall.toLowerCase(), s]))
    const currMap = new Map(currStalls.map(s => [s.stall.toLowerCase(), s]))

    const addedBooths = currStalls.filter(s => !prevMap.has(s.stall.toLowerCase()))
    const removedBooths = prevStalls.filter(s => !currMap.has(s.stall.toLowerCase()))
    const changedBooths: Array<{ stall: string; oldApp: string; newApp: string; oldName?: string; newName?: string }> = []

    for (const currStall of currStalls) {
      const p = prevMap.get(currStall.stall.toLowerCase())

      if (p && p.applicationNumber.toUpperCase() !== currStall.applicationNumber.toUpperCase()) {
        changedBooths.push({
          stall: currStall.stall,
          oldApp: p.applicationNumber,
          newApp: currStall.applicationNumber,
          oldName: p.applicantName,
          newName: currStall.applicantName
        })
      }
    }

    diffByAuditId.set(curr.id, {
      addedBooths: addedBooths.length > 0 ? addedBooths : undefined,
      removedBooths: removedBooths.length > 0 ? removedBooths : undefined,
      changedBooths: changedBooths.length > 0 ? changedBooths : undefined,
      newBoothsCreated: newBoothsCreated.length > 0 ? newBoothsCreated : undefined
    })
  }

  return auditRows.map(r => {
    const prevVal = parse(r.previous_value)
    const nextVal = parse(r.new_value)
    const batchId = r.entity_id
    let stalls = batchId ? batchRowsMap.get(batchId) : undefined

    if ((!stalls || stalls.length === 0) && nextVal && typeof nextVal === 'object' && 'stalls' in (nextVal as object)) {
      const nextStalls = (nextVal as { stalls?: Array<{ stall: string; applicationNumber: string }> }).stalls

      if (Array.isArray(nextStalls)) {
        stalls = nextStalls.map(s => ({
          stall: s.stall,
          applicationNumber: s.applicationNumber
        }))
      }
    }

    return {
      id: r.id,
      action: r.action,
      actorName: r.actor_name,
      previousValue: prevVal,
      newValue: nextVal,
      createdAt: r.created_at,
      entityId: r.entity_id,
      stalls,
      diff: diffByAuditId.get(r.id)
    }
  })
}

type DeclareRow = {
  id: number
  purpose: ResultPurpose
  final_amount_paise: number | null
  shop_unit_id: number
  stall_number: string
  shop_type: 'single' | 'double'
  stall_status: string
  stall_application_id: number | null
  application_id: number
  application_number: string
  application_status: string
  representative_name: string
  mobile_number: string
  email: string
  allotment_payment_enabled: number
  allotment_amount_paise: number | null
  allotment_amount_single_paise: number | null
  allotment_amount_double_paise: number | null
}

export class DeclareResultError extends Error {
  constructor(
    message: string,
    readonly problems: string[] = []
  ) {
    super(message)
  }
}

/**
 * Applies every pending row of the given sheet in one transaction, using
 * the same rules as a completed draw: the booth is assigned to the
 * application; if the category has an allotment payment the booth is
 * 'reserved' and the application goes to 'payment_required' with a Pay Now
 * payment seeded, otherwise both become 'allotted'. If anything changed
 * since the upload (an application is no longer approved, a booth was
 * allotted elsewhere), nothing is applied and the problems are returned.
 * Applicants are notified only after the commit, in the background.
 */
export async function declareResult(batchId: string, declaredByUserId: number, ipAddress?: string | null) {
  const applied = await withTransaction(async q => {
    const rows = await q<DeclareRow[]>(
      `SELECT r.id, r.purpose, r.final_amount_paise, r.shop_unit_id, su.stall_number, su.shop_type, su.status AS stall_status,
              su.allotted_to_application_id AS stall_application_id,
              r.application_id, a.application_number, a.status AS application_status, a.representative_name,
              a.mobile_number, a.email, c.allotment_payment_enabled, c.allotment_amount_paise,
              c.allotment_amount_single_paise, c.allotment_amount_double_paise
       FROM result_declaration_rows r
       JOIN shop_units su ON su.id = r.shop_unit_id
       JOIN applications a ON a.id = r.application_id
       JOIN categories c ON c.id = a.category_id
       WHERE r.batch_id = ? AND r.status = 'pending'
       FOR UPDATE`,
      [batchId]
    )

    if (rows.length === 0) {
      throw new DeclareResultError('There is no pending result for this sheet — it was already declared or replaced by a newer upload.')
    }

    const purpose = rows[0].purpose

    const alreadyHaveStall = await q<Array<{ allotted_to_application_id: number; stall_number: string }>>(
      `SELECT allotted_to_application_id, stall_number FROM shop_units
       WHERE allotted_to_application_id IN (${rows.map(() => '?').join(', ')})`,
      rows.map(r => r.application_id)
    )

    const stallHeldBy = new Map(alreadyHaveStall.map(s => [s.allotted_to_application_id, s.stall_number]))
    const problems: string[] = []

    for (const row of rows) {
      if (purpose === 'auction_result') {
        const alreadyWon = row.application_status === 'auction_won'

        if (row.application_status !== 'auction_fee_paid' && !alreadyWon) {
          problems.push(`${row.application_number} is now "${row.application_status}" (not Auction Fee Paid).`)
        }

        const stallBelongsToThisApplication = row.stall_application_id === row.application_id

        if (!stallBelongsToThisApplication && (row.stall_status !== 'available' || row.stall_application_id !== null)) {
          problems.push(`Booth/Stall ${row.stall_number} is no longer available ("${row.stall_status}").`)
        }

        if (!alreadyWon && stallHeldBy.has(row.application_id)) {
          problems.push(`${row.application_number} already has booth ${stallHeldBy.get(row.application_id)}.`)
        }

        continue
      }

      if (row.application_status !== 'approved') {
        problems.push(`${row.application_number} is now "${row.application_status}" (not Approved).`)
      }

      if (row.stall_status !== 'available' || row.stall_application_id !== null) {
        problems.push(`Booth/Stall ${row.stall_number} is no longer available ("${row.stall_status}").`)
      }

      if (stallHeldBy.has(row.application_id)) {
        problems.push(`${row.application_number} already has booth ${stallHeldBy.get(row.application_id)}.`)
      }
    }

    if (problems.length > 0) {
      throw new DeclareResultError('Some rows changed since the sheet was uploaded. Nothing was declared — fix the sheet and upload it again.', problems)
    }

    for (const row of rows) {
      if (purpose === 'auction_result') {
        const amountPaise = Number(row.final_amount_paise ?? 0)

        await q(`UPDATE shop_units SET status = 'reserved', allotted_to_application_id = ? WHERE id = ?`, [
          row.application_id,
          row.shop_unit_id
        ])

        await q(`UPDATE applications SET status = 'auction_won' WHERE id = ?`, [row.application_id])

        await q(
          `INSERT INTO payments (application_id, purpose, amount_paise, status)
           VALUES (?, 'auction_final', ?, 'not_initiated')
           ON DUPLICATE KEY UPDATE amount_paise = ?, status = IF(status = 'success', 'success', 'not_initiated')`,
          [row.application_id, amountPaise, amountPaise]
        )

        continue
      }

      // A combined stall (e.g. "101-104" = 4 physical single booths given
      // to one applicant) must charge per-booth-type fee × physical booth
      // count, not the flat per-booth fee — per explicit confirmation
      // (2026-11-28): "1 artisan 14k ka hai ... range se 101-104 de diya to
      // 4 ki payment karega, 56000 ho show hoga" (example figures vary by
      // category's own single/double amount, same multiplication rule).
      const perBoothAmountPaise = resolveAllotmentAmountPaise(row, row.shop_type)

      const resolvedAmountPaise =
        perBoothAmountPaise !== null ? perBoothAmountPaise * getPhysicalBoothCount(row.stall_number) : null

      const isPaymentRequired = Boolean(row.allotment_payment_enabled && Number(resolvedAmountPaise) > 0)


      await q(`UPDATE shop_units SET status = ?, allotted_to_application_id = ? WHERE id = ?`, [
        isPaymentRequired ? 'reserved' : 'allotted',
        row.application_id,
        row.shop_unit_id
      ])


      await q(`UPDATE applications SET status = ? WHERE id = ? AND status = 'approved'`, [
        isPaymentRequired ? 'payment_required' : 'allotted',
        row.application_id
      ])

      if (isPaymentRequired) {
        const amountPaise = Number(resolvedAmountPaise)


        await q(
          `INSERT INTO payments (application_id, purpose, amount_paise, status)
           VALUES (?, 'pay_now', ?, 'not_initiated')
           ON DUPLICATE KEY UPDATE amount_paise = ?, status = IF(status = 'success', 'success', 'not_initiated')`,
          [row.application_id, amountPaise, amountPaise]
        )
      }
    }

    await q(
      `UPDATE result_declaration_rows SET status = 'declared', declared_by_user_id = ?, declared_at = NOW()
       WHERE batch_id = ? AND status = 'pending'`,
      [declaredByUserId, batchId]
    )

    return rows.map(row => ({
      ...row,
      isPaymentRequired:
        purpose === 'auction_result'
          ? true
          : Boolean(row.allotment_payment_enabled && Number(resolveAllotmentAmountPaise(row, row.shop_type)) > 0)
    }))
  })

  const paymentRequiredCount = applied.filter(r => r.isPaymentRequired).length

  // Already committed — an audit-write failure must not make the caller
  // report "nothing was declared".
  await logAudit({
    actorUserId: declaredByUserId,
    actorRoleKey: null,
    action: 'result.declared',
    module: 'allotment',
    entityType: 'result_batch',
    entityId: batchId,
    ipAddress,
    newValue: {
      declaredCount: applied.length,
      paymentRequiredCount,
      allottedCount: applied.length - paymentRequiredCount,
      stalls: applied.map(r => ({ stall: r.stall_number, applicationNumber: r.application_number }))
    }
  }).catch(error => logServerError('result.declare.audit', error, { batchId }))

  // Not awaited: the declaration is already committed, and sending to every
  // applicant can take a while. Runs 5 at a time so a large sheet doesn't
  // flood the DB pool (each send writes notification_log rows); every send
  // is bounded by the provider timeouts and logged in notification_log.
  void notifyDeclaredApplicants(applied).catch(error => logServerError('result.declare.notify', error, { batchId }))

  return { declaredCount: applied.length, paymentRequiredCount }
}

async function notifyDeclaredApplicants(rows: Array<DeclareRow & { isPaymentRequired: boolean }>) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
  const queue = [...rows]

  const worker = async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      const destination = row.mobile_number.startsWith('+') ? row.mobile_number : `+91${row.mobile_number}`

      if (row.purpose === 'auction_result') {
        // Template (gita_mahotsav_auction_msg) only has 2 body variables
        // (name, application number) and NO button component at all —
        // confirmed live 2026-11-20: AiSensy rejects every send with
        // "Template does not contain button components, no parameters
        // allowed" when buttonParam is sent. See .ai/CHANGELOG.md for the
        // earlier fix (3rd templateParams entry) this complements.
        await sendNotification({
          category: 'auction_final_payment',
          destination,
          userName: row.representative_name,
          templateParams: [row.representative_name, row.application_number],
          applicationId: row.application_id,
          email: row.email
        }).catch(error => logServerError('result.declare.notify.auction_final', error, { applicationId: row.application_id }))

        continue
      }


      if (row.isPaymentRequired) {
        const payLink = baseUrl ? `${baseUrl}/status?appNo=${encodeURIComponent(row.application_number)}` : ''

        await sendNotification({
          category: 'pay_now_activation',
          campaignOverride: process.env.AISENSY_CAMPAIGN_DRAW_PAYMENT_ACTIVATION || 'gita_mahotsav_draw_payment_dyhmi',
          destination,
          userName: row.representative_name,
          templateParams: [row.representative_name, row.application_number, payLink],
          applicationId: row.application_id,
          email: row.email
        }).catch(error => logServerError('result.declare.notify.pay_now', error, { applicationId: row.application_id }))
      } else {
        const statusLink = baseUrl ? `${baseUrl}/status?appNo=${encodeURIComponent(row.application_number)}` : ''
        const zeroFeeCampaign = process.env.AISENSY_CAMPAIGN_ZERO_FEE_ALLOTMENT || 'zero_fee_allotment'

        await sendNotification({
          category: 'direct_allotment_confirmed',
          campaignOverride: zeroFeeCampaign,
          destination,
          userName: row.representative_name,
          templateParams: [
            row.representative_name,
            row.application_number,
            row.stall_number,
            statusLink
          ],
          applicationId: row.application_id,
          email: row.email
        }).catch(error => logServerError('result.declare.notify.zero_fee', error, { applicationId: row.application_id }))
      }
    }
  }

  await Promise.all(Array.from({ length: 5 }, worker))
}
