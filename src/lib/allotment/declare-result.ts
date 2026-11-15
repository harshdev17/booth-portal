import 'server-only'

import { randomUUID } from 'node:crypto'

import { logAudit } from '@/lib/audit/log'
import { query, withTransaction } from '@/lib/db/client'
import { buildCsv, parseCsvLine } from '@/lib/inventory/shop-units-csv'
import { notifyApplicationStatusChange } from '@/lib/notifications/application-status'
import { sendNotification } from '@/lib/notifications/service'
import { logServerError } from '@/lib/security/error-log'

export const RESULT_SHEET_COLUMNS = ['Booth/Stall No.', 'Single/Double', 'Category', 'Direction', 'Application Number'] as const

const APPLICATION_NUMBER_PATTERN = /^(?:IGM|KDB)-\d{4}-\d{6}$/
const MAX_ROWS = 2000

export type ResultSheetRow = {
  rowNumber: number
  stallNumber: string
  shopType: 'single' | 'double'
  categoryName: string | null
  direction: string | null
  applicationNumber: string
}

export type RowError = { rowNumber: number; message: string }

export function buildResultSheetTemplate(): string {
  return buildCsv([
    [...RESULT_SHEET_COLUMNS],
    ['100', 'Single', 'Handicrafts', 'North', 'IGM-2026-123456'],
    ['100-102', 'Double', 'Handicrafts', '', 'IGM-2026-654321']
  ])
}

/** Parses the uploaded sheet. Pure — no database access. */
export function parseResultSheet(text: string): { rows: ResultSheetRow[]; errors: RowError[] } {
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

  if (stallCol === -1 || appCol === -1) {
    return {
      rows: [],
      errors: [{ rowNumber: 1, message: 'Could not find the "Booth/Stall No." and "Application Number" columns. Use the template.' }]
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

    seenStalls.set(stallKey, rowNumber)
    seenApplications.set(applicationNumber, rowNumber)

    rows.push({
      rowNumber,
      stallNumber,
      shopType: typeRaw.includes('double') || typeRaw === 'd' ? 'double' : 'single',
      categoryName: categoryCol !== -1 && fields[categoryCol] ? fields[categoryCol].replace(/\s+/g, ' ') : null,
      direction: directionCol !== -1 && fields[directionCol] ? fields[directionCol].slice(0, 64) : null,
      applicationNumber
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
}

export type ResultSheetPreview = {
  rows: ResultPreviewRow[]
  totalCount: number
  validCount: number
  errorCount: number
  newStallsCount: number
  canStage: boolean
}

export async function previewResultSheet(rows: ResultSheetRow[]): Promise<ResultSheetPreview> {
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
      allotment_amount_paise: number
      existing_stall: string | null
      existing_direct_allotment: number | null
    }>
  >(
    `SELECT a.id, a.application_number, a.status, a.category_id, c.name AS category_name, c.selection_method,
            a.representative_name, a.father_name, c.allotment_payment_enabled, c.allotment_amount_paise,
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
      isNewStall = true
      newStallsCount++
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
      isPaymentRequired: Boolean(app && app.allotment_payment_enabled && Number(app.allotment_amount_paise) > 0),
      isNewStall,
      isValid,
      issues
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
 */
export async function stageResultSheet(
  rows: ResultSheetRow[],
  uploadedByUserId: number
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
    await q(`UPDATE result_declaration_rows SET status = 'discarded' WHERE status = 'pending'`)

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
        `INSERT INTO result_declaration_rows (batch_id, shop_unit_id, application_id, uploaded_by_user_id)
         VALUES (?, ?, ?, ?)`,
        [batchId, stallId, app.id, uploadedByUserId]
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
  stallNumber: string
  shopType: string
  direction: string | null
  categoryName: string
  applicationNumber: string
  applicantName: string
  applicationStatus: string
  paymentRequired: boolean
  declaredAt: string | null
}

const ROW_VIEW_SELECT = `
  SELECT r.id, r.batch_id AS batchId, su.stall_number AS stallNumber, su.shop_type AS shopType, su.direction,
         c.name AS categoryName, a.application_number AS applicationNumber, a.representative_name AS applicantName,
         a.status AS applicationStatus,
         (c.allotment_payment_enabled = 1 AND COALESCE(c.allotment_amount_paise, 0) > 0) AS paymentRequired,
         r.declared_at AS declaredAt
  FROM result_declaration_rows r
  JOIN shop_units su ON su.id = r.shop_unit_id
  JOIN applications a ON a.id = r.application_id
  JOIN categories c ON c.id = a.category_id`

function isMissingTable(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'ER_NO_SUCH_TABLE'
}

export async function listResultRows(): Promise<{ pending: ResultRowView[]; declared: ResultRowView[]; tableMissing: boolean }> {
  try {
    const pending = await query<ResultRowView[]>(
      `${ROW_VIEW_SELECT} WHERE r.status = 'pending' ORDER BY c.name, su.stall_number`
    )

    const declared = await query<ResultRowView[]>(
      `${ROW_VIEW_SELECT} WHERE r.status = 'declared' ORDER BY r.declared_at DESC, su.stall_number LIMIT 500`
    )

    const toBool = (rows: ResultRowView[]) => rows.map(r => ({ ...r, paymentRequired: Boolean(Number(r.paymentRequired)) }))

    return { pending: toBool(pending), declared: toBool(declared), tableMissing: false }
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
      Array<{ id: number; batch_id: string; shop_unit_id: number; stall_number: string; stall_category_id: number; old_application_number: string }>
    >(
      `SELECT r.id, r.batch_id, r.shop_unit_id, su.stall_number, su.category_id AS stall_category_id,
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
  shop_unit_id: number
  stall_number: string
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
      `SELECT r.id, r.shop_unit_id, su.stall_number, su.status AS stall_status, su.allotted_to_application_id AS stall_application_id,
              r.application_id, a.application_number, a.status AS application_status, a.representative_name,
              a.mobile_number, a.email, c.allotment_payment_enabled, c.allotment_amount_paise
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

    const alreadyHaveStall = await q<Array<{ allotted_to_application_id: number; stall_number: string }>>(
      `SELECT allotted_to_application_id, stall_number FROM shop_units
       WHERE allotted_to_application_id IN (${rows.map(() => '?').join(', ')})`,
      rows.map(r => r.application_id)
    )

    const stallHeldBy = new Map(alreadyHaveStall.map(s => [s.allotted_to_application_id, s.stall_number]))
    const problems: string[] = []

    for (const row of rows) {
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
      const isPaymentRequired = Boolean(row.allotment_payment_enabled && Number(row.allotment_amount_paise) > 0)

       
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
        const amountPaise = Number(row.allotment_amount_paise)

         
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
      isPaymentRequired: Boolean(row.allotment_payment_enabled && Number(row.allotment_amount_paise) > 0)
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

       
      await notifyApplicationStatusChange({
        applicationId: row.application_id,
        applicationNumber: row.application_number,
        mobileNumber: row.mobile_number,
        email: row.email,
        representativeName: row.representative_name,
        newStatus: row.isPaymentRequired ? 'payment_required' : 'allotted'
      }).catch(error => logServerError('result.declare.notify.status', error, { applicationId: row.application_id }))

      if (row.isPaymentRequired) {
        const payLink = baseUrl ? `${baseUrl}/status?appNo=${encodeURIComponent(row.application_number)}` : ''

        await sendNotification({
          category: 'pay_now_activation',
          campaignOverride: process.env.AISENSY_CAMPAIGN_ALLOTMENT_PAYMENT_REMINDER || undefined,
          destination,
          userName: row.representative_name,
          templateParams: [row.representative_name, row.application_number, payLink],
          buttonParam: row.application_number,
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
          buttonParam: row.application_number,
          applicationId: row.application_id,
          email: row.email
        }).catch(error => logServerError('result.declare.notify.zero_fee', error, { applicationId: row.application_id }))
      }
    }
  }

  await Promise.all(Array.from({ length: 5 }, worker))
}
