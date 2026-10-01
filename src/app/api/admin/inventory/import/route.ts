import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query, withTransaction, type TransactionQuery } from '@/lib/db/client'
import { parseShopUnitsCsv, type CsvRowError } from '@/lib/inventory/shop-units-csv'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB, matches the reference UI's stated limit

type ResolvedRow = {
  rowNumber: number
  stallNumber: string
  shopType: 'single' | 'double'
  categoryId: number
  direction: string | null
  emdAmountPaise: number | null
}

/**
 * Two-mode endpoint backing the "Download template → select file → validate
 * → import" wizard. `mode: 'validate'` parses and checks the file against
 * live category data WITHOUT writing anything. `mode: 'import'` re-validates
 * (never trusts an earlier validate call still reflects current category
 * data) and then writes.
 *
 * Performance: this previously ran one SELECT + one INSERT/UPDATE per row,
 * sequentially, inside the transaction — for a few hundred rows that's
 * hundreds of awaited round-trips to a remote MySQL server, which is what
 * made a real import feel slow (reported live). Fixed by resolving all
 * existing stall numbers in ONE query up front, then running inserts and
 * updates as two batched multi-row statements instead of per-row queries.
 *
 * A stall number that already exists in `shop_units` is treated as an
 * UPDATE (upsert), not a duplicate error — re-uploading a corrected file for
 * stalls already imported is the expected workflow, not an error case.
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
      return NextResponse.json({ errors: parsed.errors, rowCount: 0 }, { status: 200 })
    }

    // Resolve category names to IDs against live data — a stale category
    // list in an old template, or a typo, must fail clearly per row rather
    // than silently matching the wrong category or inserting a dangling id.
    // Matching is case/whitespace-insensitive against both the display name
    // and slug, so "refreshment & food stalls" or the slug
    // "refreshment-stalls" both resolve — reduces false "unknown category"
    // failures from minor formatting differences without being lax about
    // genuinely unknown names.
    const categories = await query<Array<{ id: number; name: string; slug: string }>>(
      `SELECT id, name, slug FROM categories WHERE status != 'archived'`
    )

    const categoryByKey = new Map<string, number>()

    for (const cat of categories) {
      categoryByKey.set(cat.name.trim().toLowerCase(), cat.id)
      categoryByKey.set(cat.slug.trim().toLowerCase(), cat.id)
    }

    const rowErrors: CsvRowError[] = []
    const resolvedRows: ResolvedRow[] = []

    for (const row of parsed.rows) {
      const categoryId = categoryByKey.get(row.categoryName.trim().toLowerCase())

      if (!categoryId) {
        const validNames = categories.map(c => c.name).join(', ')

        rowErrors.push({
          rowNumber: row.rowNumber,
          message: `Unknown category: "${row.categoryName}". Must match one of: ${validNames}`
        })
        continue
      }

      resolvedRows.push({
        rowNumber: row.rowNumber,
        stallNumber: row.stallNumber,
        shopType: row.shopType,
        categoryId,
        direction: row.direction,
        emdAmountPaise: row.emdAmountPaise
      })
    }

    if (rowErrors.length > 0) {
      return NextResponse.json({ errors: rowErrors, rowCount: 0 }, { status: 200 })
    }

    if (mode === 'validate') {
      return NextResponse.json({ errors: [], rowCount: resolvedRows.length })
    }

    // mode === 'import'. One query to find which stall numbers already
    // exist (and their status), instead of one SELECT per row.
    //
    // Deliberately NOT `WHERE stall_number IN (?)` with an array param: this
    // codebase's query()/withTransaction wrapper uses mysql2's execute()
    // (prepared statements), and prepared statements do not expand an array
    // into a variable-length IN list the way query() does — confirmed by
    // testing directly, execute() with an array param here SILENTLY
    // returns zero rows instead of erroring, which would have made every
    // stall look "new" and turned every re-import into a duplicate-key
    // failure. Manual placeholder expansion (one `?` per value) works
    // correctly with execute() and is the same pattern used elsewhere in
    // this codebase for IN clauses.
    const stallNumbers = resolvedRows.map(r => r.stallNumber)

    const existingRows =
      stallNumbers.length > 0
        ? await query<Array<{ id: number; stall_number: string; status: string }>>(
            `SELECT id, stall_number, status FROM shop_units WHERE stall_number IN (${stallNumbers.map(() => '?').join(', ')})`,
            stallNumbers
          )
        : []

    const existingByStallNumber = new Map(existingRows.map(r => [r.stall_number, r]))

    const toInsert = resolvedRows.filter(r => !existingByStallNumber.has(r.stallNumber))

    const toUpdate = resolvedRows.filter(r => {
      const existing = existingByStallNumber.get(r.stallNumber)

      return existing && existing.status !== 'allotted'
    })

    const skippedAllotted = resolvedRows.filter(r => existingByStallNumber.get(r.stallNumber)?.status === 'allotted').length

    await withTransaction(async (txQuery: TransactionQuery) => {
      if (toInsert.length > 0) {
        // Manual placeholder expansion again, for the same execute()
        // reason as the IN clause above — mysql2's bulk `VALUES ?` shorthand
        // does not work with execute() at all (confirmed: it throws a SQL
        // syntax error, not silently misbehaves like the IN case did).
        const placeholders = toInsert.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')
        const flatValues = toInsert.flatMap(r => [r.categoryId, r.stallNumber, r.shopType, r.direction, r.emdAmountPaise, 'available'])

        await txQuery(
          `INSERT INTO shop_units (category_id, stall_number, shop_type, direction, emd_amount_paise, status) VALUES ${placeholders}`,
          flatValues
        )
      }

      // No bulk UPDATE-with-different-values-per-row in plain SQL without a
      // temp table or CASE expression per column; with import batches
      // capped at MAX_IMPORT_ROWS (2000) and each update a single indexed
      // lookup by primary key, this remains fast in practice — the removed
      // N+1 cost was the SELECT per row, not this per-row UPDATE.
      for (const row of toUpdate) {
        const existing = existingByStallNumber.get(row.stallNumber)!

        await txQuery(`UPDATE shop_units SET category_id = ?, shop_type = ?, direction = ?, emd_amount_paise = ? WHERE id = ?`, [
          row.categoryId,
          row.shopType,
          row.direction,
          row.emdAmountPaise,
          existing.id
        ])
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
        inserted: toInsert.length,
        updated: toUpdate.length,
        skippedAllotted,
        totalRows: resolvedRows.length,
        stallNumbers: resolvedRows.map(r => r.stallNumber)
      }
    })

    return NextResponse.json({
      errors: [],
      rowCount: resolvedRows.length,
      inserted: toInsert.length,
      updated: toUpdate.length,
      skippedAllotted
    })
  } catch (error) {
    logServerError('api.admin.inventory.import', error)

    return NextResponse.json({ error: 'Something went wrong while processing the file.' }, { status: 500 })
  }
}
