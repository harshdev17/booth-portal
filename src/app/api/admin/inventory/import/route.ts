import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query, withTransaction, type TransactionQuery } from '@/lib/db/client'
import { parseShopUnitsCsv, type CsvRowError, type CsvRowWarning, type ShopUnitStatus } from '@/lib/inventory/shop-units-csv'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { aadhaarLast4, encryptAadhaar, hashAadhaar } from '@/lib/applications/aadhaar-crypto'
import { generateAccessToken, hashAccessToken } from '@/lib/applications/access-token'
import { generateApplicationNumber } from '@/lib/applications/application-number'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

type ResolvedRow = {
  rowNumber: number
  stallNumber: string
  shopType: 'single' | 'double'
  categoryId: number
  direction: string | null
  status: ShopUnitStatus
  emdAmountPaise: number | null
  // Direct Allotment fields
  isDirectAllotment: boolean
  allotteeName?: string | null
  contactPerson?: string | null
  fatherName?: string | null
  mobileNumber?: string | null
  aadhaarNumber?: string | null
  address?: string | null
  policeStationName?: string | null
  email?: string | null
  workPurpose?: string | null
  stallAmountRupees?: number
}

function slugifyCategoryName(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 150) || `cat-${Date.now()}`
  )
}

/**
 * Two-mode endpoint backing the "Download template → select file → validate
 * → import" wizard. Supports standard shop unit imports as well as direct allotment
 * with candidate particulars and custom/main category status rules.
 */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('inventory:manage')

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
      return NextResponse.json({ error: 'File is too large (max 10 MB).' }, { status: 400 })
    }

    const text = await file.text()
    const parsed = parseShopUnitsCsv(text)

    if (parsed.errors.length > 0) {
      return NextResponse.json({ errors: parsed.errors, warnings: [], rowCount: 0 }, { status: 200 })
    }

    const warnings: CsvRowWarning[] = parsed.warnings

    // Resolve category names to IDs against live data
    const categories = await query<Array<{ id: number; name: string; slug: string; is_direct_allotment: number }>>(
      `SELECT id, name, slug, is_direct_allotment FROM categories WHERE status != 'archived'`
    )

    const categoryByKey = new Map<string, { id: number; isDirectAllotment: boolean }>()

    const normalizeKey = (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    for (const cat of categories) {
      const info = { id: cat.id, isDirectAllotment: Boolean(cat.is_direct_allotment) }
      categoryByKey.set(cat.name.trim().toLowerCase(), info)
      categoryByKey.set(cat.slug.trim().toLowerCase(), info)
      categoryByKey.set(normalizeKey(cat.name), info)
      categoryByKey.set(normalizeKey(cat.slug), info)
    }

    const rowErrors: CsvRowError[] = []
    const resolvedRows: ResolvedRow[] = []

    // Names needing a new category, deduped
    const newCategoryNames = new Map<string, string>()

    for (const row of parsed.rows) {
      const key = row.categoryName.trim().toLowerCase()
      const normKey = normalizeKey(row.categoryName)
      const catInfo = categoryByKey.get(key) || categoryByKey.get(normKey)

      if (!catInfo && !newCategoryNames.has(key)) {
        newCategoryNames.set(key, row.categoryName.trim())
      }
    }

    if (mode === 'import' && newCategoryNames.size > 0) {
      const eventRows = await query<Array<{ id: number }>>(
        `SELECT id FROM events WHERE status = 'active' ORDER BY id DESC LIMIT 1`
      )
      const eventId = eventRows[0]?.id ?? 1
      const existingSlugs = new Set(categories.map(c => c.slug))

      for (const [key, name] of newCategoryNames) {
        let slug = slugifyCategoryName(name)
        let suffix = 2

        while (existingSlugs.has(slug)) {
          slug = `${slugifyCategoryName(name)}-${suffix}`
          suffix++
        }

        existingSlugs.add(slug)

        const created = await query<{ insertId: number }>(
          `INSERT INTO categories (event_id, slug, name, selection_method, status, is_direct_allotment, fee_paise, display_order)
           VALUES (?, ?, ?, 'manual', 'closed', 1, 0, 9999)`,
          [eventId, slug, name]
        )

        const newInfo = { id: created.insertId, isDirectAllotment: true }
        categoryByKey.set(key, newInfo)
        categoryByKey.set(normalizeKey(name), newInfo)

        await logAudit({
          actorUserId: session.userId,
          actorRoleKey: session.role.key,
          action: 'category.created',
          module: 'inventory',
          entityType: 'category',
          entityId: String(created.insertId),
          newValue: { name, slug, status: 'closed', is_direct_allotment: 1, source: 'inventory_import' }
        })
      }
    }

    for (const row of parsed.rows) {
      const key = row.categoryName.trim().toLowerCase()
      const normKey = normalizeKey(row.categoryName)
      const catInfo = categoryByKey.get(key) || categoryByKey.get(normKey)
      const categoryId = catInfo?.id ?? 0
      const isCustomCat = newCategoryNames.has(key) || catInfo?.isDirectAllotment === true

      let status: ShopUnitStatus = 'available'
      let emdAmountPaise: number | null = null

      if (row.isDirectAllotment) {
        if ((row.stallAmountRupees ?? 0) > 0) {
          status = 'reserved' // Reserved for Payment
          emdAmountPaise = row.stallAmountRupees! * 100
        } else {
          status = 'allotted' // Free / Confirmed Allotment
          emdAmountPaise = 0
        }
      } else {
        // Unallotted stall
        if (isCustomCat) {
          // Custom categories are strictly direct allotment and can NEVER be 'available'
          status = 'reserved_for_direct_allotment'
        } else {
          // 11 Main Categories: If explicit status indicates reserved / direct allotment, mark as reserved_for_direct_allotment
          const isExplicitReserved =
            row.explicitStatus === 'reserved_for_direct_allotment' || row.explicitStatus === 'reserved'
          status = isExplicitReserved ? 'reserved_for_direct_allotment' : 'available'
        }
        if ((row.stallAmountRupees ?? 0) > 0) {
          emdAmountPaise = row.stallAmountRupees! * 100
        }
      }

      resolvedRows.push({
        rowNumber: row.rowNumber,
        stallNumber: row.stallNumber,
        shopType: row.shopType,
        categoryId,
        direction: row.direction,
        status,
        emdAmountPaise,
        isDirectAllotment: Boolean(row.isDirectAllotment),
        allotteeName: row.allotteeName,
        contactPerson: row.contactPerson,
        fatherName: row.fatherName,
        mobileNumber: row.mobileNumber,
        aadhaarNumber: row.aadhaarNumber,
        address: row.address,
        policeStationName: row.policeStationName,
        email: row.email,
        workPurpose: row.workPurpose,
        stallAmountRupees: row.stallAmountRupees
      })
    }

    if (rowErrors.length > 0) {
      return NextResponse.json({ errors: rowErrors, warnings: [], rowCount: 0 }, { status: 200 })
    }

    const directAllottedCount = resolvedRows.filter(r => r.isDirectAllotment && r.status === 'allotted').length
    const reservedPaymentCount = resolvedRows.filter(r => r.isDirectAllotment && r.status === 'reserved').length
    const availableCount = resolvedRows.filter(r => !r.isDirectAllotment && r.status === 'available').length
    const reservedDirectCount = resolvedRows.filter(r => !r.isDirectAllotment && r.status === 'reserved_for_direct_allotment').length

    if (mode === 'validate') {
      return NextResponse.json({
        errors: [],
        warnings,
        rowCount: resolvedRows.length,
        newCategoryCount: newCategoryNames.size,
        directAllottedCount,
        reservedPaymentCount,
        availableCount,
        reservedDirectCount
      })
    }

    // mode === 'import'
    const stallNumbers = resolvedRows.map(r => r.stallNumber)

    const existingRows =
      stallNumbers.length > 0
        ? await query<Array<{ id: number; stall_number: string; status: string; allotted_to_application_id: number | null }>>(
            `SELECT id, stall_number, status, allotted_to_application_id FROM shop_units WHERE stall_number IN (${stallNumbers.map(() => '?').join(', ')})`,
            stallNumbers
          )
        : []

    const existingByStallNumber = new Map(existingRows.map(r => [r.stall_number, r]))

    let insertedCount = 0
    let updatedCount = 0

    await withTransaction(async (txQuery: TransactionQuery) => {
      for (const row of resolvedRows) {
        const existing = existingByStallNumber.get(row.stallNumber)
        let shopUnitId: number

        if (!existing) {
          // Insert new shop_unit
          const insertRes = await txQuery<{ insertId: number }>(
            `INSERT INTO shop_units (category_id, stall_number, shop_type, direction, emd_amount_paise, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [row.categoryId, row.stallNumber, row.shopType, row.direction, row.emdAmountPaise, row.status]
          )
          shopUnitId = insertRes.insertId
          insertedCount++
        } else {
          shopUnitId = existing.id
          await txQuery(
            `UPDATE shop_units SET category_id = ?, shop_type = ?, direction = ?, emd_amount_paise = ?, status = ?, updated_at = NOW()
             WHERE id = ?`,
            [row.categoryId, row.shopType, row.direction, row.emdAmountPaise, row.status, shopUnitId]
          )
          updatedCount++
        }

        if (row.isDirectAllotment) {
          // Check if active direct_allotment exists for this shop_unit
          const activeDirects = await txQuery<Array<{ id: number; application_id: number | null }>>(
            `SELECT id, application_id FROM direct_allotments WHERE shop_unit_id = ? AND status = 'active' LIMIT 1`,
            [shopUnitId]
          )

          const allotteeName = row.allotteeName!
          const contactPerson = row.contactPerson || allotteeName
          const fatherName = row.fatherName || '—'
          const mobileNumber = row.mobileNumber || '7404302678'
          const email = row.email || 'harshgarg1009@gmail.com'
          const address = row.address || 'Kurukshetra'
          const policeStationName = row.policeStationName || 'City Police Station'
          const workPurpose = row.workPurpose || 'Commercial Stall'
          const rawAadhaar = row.aadhaarNumber || '123456789012'
          const cleanAadhaar = rawAadhaar.length === 12 ? rawAadhaar : `00000000${rawAadhaar}`.slice(-12)
          const isPaymentRequired = (row.stallAmountRupees ?? 0) > 0
          const appStatus = isPaymentRequired ? 'payment_required' : 'allotted'
          const directPaymentStatus = isPaymentRequired ? 'pending' : 'not_required'
          const paymentAmountPaise = isPaymentRequired ? row.stallAmountRupees! * 100 : 0

          if (activeDirects.length > 0) {
            // Update existing direct_allotment record
            const directId = activeDirects[0].id
            const appId = activeDirects[0].application_id

            await txQuery(
              `UPDATE direct_allotments SET
                 category_id = ?, allottee_name = ?, contact_person = ?, father_name = ?,
                 aadhaar_number = ?, address = ?, mobile_number = ?, email = ?,
                 work_purpose = ?, payment_amount_paise = ?, payment_status = ?
               WHERE id = ?`,
              [
                row.categoryId, allotteeName, contactPerson, fatherName,
                cleanAadhaar, address, mobileNumber, email,
                workPurpose, paymentAmountPaise, directPaymentStatus,
                directId
              ]
            )

            if (appId) {
              await txQuery(
                `UPDATE applications SET
                   category_id = ?, organisation_name = ?, representative_name = ?, father_name = ?,
                   police_station_name = ?, address = ?, mobile_number = ?, email = ?,
                   work_purpose = ?, status = ?
                 WHERE id = ?`,
                [
                  row.categoryId, allotteeName, contactPerson, fatherName,
                  policeStationName, address, mobileNumber, email,
                  workPurpose, appStatus,
                  appId
                ]
              )
            }
          } else {
            // Create brand new application & direct_allotment
            const aadhaarCiphertext = encryptAadhaar(cleanAadhaar)
            const last4 = aadhaarLast4(cleanAadhaar)
            const aadhaarHash = hashAadhaar(cleanAadhaar)
            const rawAccessToken = generateAccessToken()
            const accessTokenHash = hashAccessToken(rawAccessToken)

            let applicationNumber = ''
            let appInsertResult: { insertId: number } | null = null

            for (let attempt = 0; attempt < 5; attempt++) {
              try {
                applicationNumber = generateApplicationNumber(new Date().getFullYear())
                appInsertResult = await txQuery<{ insertId: number }>(
                  `INSERT INTO applications (
                     application_number, category_id,
                     email, organisation_name, representative_name, father_name,
                     police_station_name, police_station_address,
                     aadhaar_ciphertext, aadhaar_last4, aadhaar_hash,
                     address, state, district, pin_code, mobile_number,
                     work_purpose, achievement_experience,
                     status, access_token_hash, declaration_accepted_at, submitted_at
                   ) VALUES (
                     ?, ?,
                     ?, ?, ?, ?,
                     ?, NULL,
                     ?, ?, ?,
                     ?, 'Haryana', 'Kurukshetra', '136118', ?,
                     ?, NULL,
                     ?, ?, NOW(), NOW()
                   )`,
                  [
                    applicationNumber, row.categoryId,
                    email, allotteeName, contactPerson, fatherName,
                    policeStationName,
                    aadhaarCiphertext, last4, aadhaarHash,
                    address, mobileNumber,
                    workPurpose,
                    appStatus, accessTokenHash
                  ]
                )
                break
              } catch (e: any) {
                if (attempt === 4 || !e?.message?.includes('Duplicate')) throw e
              }
            }

            if (appInsertResult) {
              const newAppId = appInsertResult.insertId

              await txQuery(
                `INSERT INTO direct_allotments (
                   category_id, shop_unit_id, allottee_name, contact_person,
                   father_name, aadhaar_number, address, mobile_number, email, work_purpose,
                   payment_amount_paise, payment_status, application_id, application_number,
                   notes, status, allotted_by_user_id
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
                [
                  row.categoryId, shopUnitId, allotteeName, contactPerson,
                  fatherName, cleanAadhaar, address, mobileNumber, email, workPurpose,
                  paymentAmountPaise, directPaymentStatus, newAppId, applicationNumber,
                  'Bulk CSV Direct Allotment', session.userId
                ]
              )

              await txQuery(
                `UPDATE shop_units SET allotted_to_application_id = ?, status = ? WHERE id = ?`,
                [newAppId, row.status, shopUnitId]
              )
            }
          }
        }
      }
    })

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'inventory.imported',
      module: 'inventory',
      entityType: 'shop_unit',
      entityId: 'bulk',
      newValue: {
        inserted: insertedCount,
        updated: updatedCount,
        directAllotted: directAllottedCount,
        reservedForPayment: reservedPaymentCount,
        availableCount,
        reservedForDirect: reservedDirectCount,
        totalRows: resolvedRows.length,
        stallNumbers: resolvedRows.map(r => r.stallNumber)
      }
    })

    return NextResponse.json({
      errors: [],
      warnings,
      rowCount: resolvedRows.length,
      inserted: insertedCount,
      updated: updatedCount,
      directAllotted: directAllottedCount,
      reservedForPayment: reservedPaymentCount,
      availableCount,
      reservedDirectCount,
      skippedAllotted: 0
    })
  } catch (error) {
    logServerError('api.admin.inventory.import', error)

    return NextResponse.json({ error: 'Something went wrong while processing the file.' }, { status: 500 })
  }
}
