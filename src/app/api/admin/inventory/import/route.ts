import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query, withTransaction, type TransactionQuery } from '@/lib/db/client'
import { parseShopUnitsCsv, type CsvRowError, type ShopUnitStatus } from '@/lib/inventory/shop-units-csv'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB, matches the reference UI's stated limit

type ResolvedRow = {
  rowNumber: number
  stallNumber: string
  shopType: 'single' | 'double'
  categoryId: number
  direction: string | null
  status: ShopUnitStatus
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

    // Resolve category names to IDs against live data. Matching is
    // case/whitespace-insensitive against both the display name and slug, so
    // "refreshment and ice cream booth/stall" or the slug "refreshment-stalls"
    // both resolve — reduces false "unknown category" mismatches from minor
    // formatting differences.
    //
    // A name that matches NO existing category is no longer a row error —
    // per explicit request (2026-10-28), stalls for a category that isn't
    // one of the public homepage categories must still be importable here.
    // Such a name gets a brand-new `categories` row created with
    // status='draft' (same "create category on the fly" pattern the
    // single-stall Add Unit dialog already uses in
    // src/app/api/admin/inventory/route.ts), so it never appears on the
    // public site or becomes something an applicant can apply under — it
    // exists purely so the imported stalls have a valid category_id to
    // attach to and show up grouped under that name in the inventory table.
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

    // Names needing a new category, deduped (same unmatched name appearing
    // on multiple rows must become ONE new category, not one per row).
    const newCategoryNames = new Map<string, string>() // key (lowercased) -> original-cased name

    for (const row of parsed.rows) {
      const key = row.categoryName.trim().toLowerCase()
      const categoryId = categoryByKey.get(key)

      if (!categoryId && !newCategoryNames.has(key)) {
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
          `INSERT INTO categories (event_id, slug, name, selection_method, status, fee_paise, display_order)
           VALUES (?, ?, ?, 'manual', 'draft', 0, 9999)`,
          [eventId, slug, name]
        )

        categoryByKey.set(key, created.insertId)

        await logAudit({
          actorUserId: session.userId,
          actorRoleKey: session.role.key,
          action: 'category.created',
          module: 'inventory',
          entityType: 'category',
          entityId: String(created.insertId),
          newValue: { name, slug, status: 'draft', source: 'inventory_import' }
        })
      }
    }

    // In 'import' mode every name now has a categoryId (existing or just
    // created above). In 'validate' mode a genuinely-new name has none yet —
    // that's fine, nothing is written on this path; placeholder 0 is only
    // ever read by the import branch below, which runs after creation.
    //
    // A row whose category was just auto-created (non-public/draft) is
    // always forced to 'reserved_for_direct_allotment' regardless of what
    // the CSV's own Status column said — per explicit request (2026-10-28):
    // a custom category's stalls are, by definition, for admin direct
    // allotment, not public "Available" inventory, since the category
    // itself was never set up with the fees/guidelines/schedule a public
    // application needs.
    for (const row of parsed.rows) {
      const key = row.categoryName.trim().toLowerCase()
      const categoryId = categoryByKey.get(key) ?? 0
      const status = newCategoryNames.has(key) ? 'reserved_for_direct_allotment' : row.status

      resolvedRows.push({
        rowNumber: row.rowNumber,
        stallNumber: row.stallNumber,
        shopType: row.shopType,
        categoryId,
        direction: row.direction,
        status
      })
    }

    if (rowErrors.length > 0) {
      return NextResponse.json({ errors: rowErrors, rowCount: 0 }, { status: 200 })
    }

    if (mode === 'validate') {
      return NextResponse.json({ errors: [], rowCount: resolvedRows.length, newCategoryCount: newCategoryNames.size })
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
        // emd_amount_paise is not set here — import no longer carries a stall
        // amount at all (per explicit request, 2026-10-28); it's always set
        // afterward via the admin table's own Add/Edit form.
        const placeholders = toInsert.map(() => '(?, ?, ?, ?, NULL, ?)').join(', ')
        const flatValues = toInsert.flatMap(r => [r.categoryId, r.stallNumber, r.shopType, r.direction, r.status])

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
      //
      // emd_amount_paise is deliberately NOT touched here — re-importing a
      // stall (upsert) must not wipe out an amount that was already set via
      // the admin table's Add/Edit form, since import no longer carries that
      // value at all.
      for (const row of toUpdate) {
        const existing = existingByStallNumber.get(row.stallNumber)!

        await txQuery(`UPDATE shop_units SET category_id = ?, shop_type = ?, direction = ?, status = ? WHERE id = ?`, [
          row.categoryId,
          row.shopType,
          row.direction,
          row.status,
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
