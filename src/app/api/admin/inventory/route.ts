import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query, withTransaction } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { encodeId } from '@/lib/security/opaque-id'

type CreateBody = {
  stallNumber?: unknown
  shopType?: unknown
  categoryName?: unknown
  isNewCategory?: unknown
  direction?: unknown
  emdAmountPaise?: unknown
  isDirectAllotment?: unknown
  allotteeName?: unknown
  contactPerson?: unknown
  mobileNumber?: unknown
  notes?: unknown
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150)
}

/**
 * Creates one booth/stall unit directly from the admin UI.
 * Supports:
 * 1. Standard stall creation with status 'available'.
 * 2. Creating a new category on the fly.
 * 3. Direct Allotment mode: instantly marks stall as 'allotted', creates
 *    the active record in `direct_allotments` with allottee details, and ensures
 *    the category is marked as direct allotment (`is_direct_allotment = 1`).
 */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('inventory:manage')

    let body: CreateBody

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
    }

    const stallNumber = typeof body.stallNumber === 'string' ? body.stallNumber.trim() : ''
    const shopType = body.shopType === 'single' || body.shopType === 'double' ? body.shopType : null
    const categoryName = typeof body.categoryName === 'string' ? body.categoryName.trim() : ''
    const direction = typeof body.direction === 'string' && body.direction.trim() ? body.direction.trim() : null
    const emdAmountRaw = body.emdAmountPaise
    const isDirectAllotment = Boolean(body.isDirectAllotment)
    const allotteeName = typeof body.allotteeName === 'string' ? body.allotteeName.trim() : ''
    const contactPerson = typeof body.contactPerson === 'string' && body.contactPerson.trim() ? body.contactPerson.trim() : null
    const mobileNumber = typeof body.mobileNumber === 'string' && body.mobileNumber.trim() ? body.mobileNumber.trim() : null
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null

    const emdAmountPaise =
      emdAmountRaw === null || emdAmountRaw === undefined || emdAmountRaw === '' ? null : Number(emdAmountRaw)

    if (!stallNumber) {
      return NextResponse.json({ error: 'Booth/Stall number is required.' }, { status: 400 })
    }

    if (!shopType) {
      return NextResponse.json({ error: 'Type must be Single or Double.' }, { status: 400 })
    }

    if (!categoryName) {
      return NextResponse.json({ error: 'Category is required.' }, { status: 400 })
    }

    if (isDirectAllotment && !allotteeName) {
      return NextResponse.json({ error: 'Organisation / Allottee name is required for direct allotment.' }, { status: 400 })
    }

    if (emdAmountPaise !== null && (!Number.isFinite(emdAmountPaise) || emdAmountPaise < 0)) {
      return NextResponse.json({ error: 'EMD amount must be a non-negative number.' }, { status: 400 })
    }

    const categoryRows = await query<Array<{ id: number; is_direct_allotment: number }>>(
      `SELECT id, is_direct_allotment FROM categories
       WHERE status != 'archived' AND (LOWER(TRIM(name)) = LOWER(TRIM(?)) OR LOWER(TRIM(slug)) = LOWER(TRIM(?)))
       LIMIT 1`,
      [categoryName, categoryName]
    )

    let categoryId = categoryRows[0]?.id

    if (!categoryId) {
      // Create new category on the fly
      const eventRows = await query<Array<{ id: number }>>(`SELECT id FROM events WHERE status = 'active' ORDER BY id DESC LIMIT 1`)
      const eventId = eventRows[0]?.id ?? 1
      const baseSlug = slugify(categoryName) || `cat-${Date.now()}`
      const taken = await query<Array<{ slug: string }>>(`SELECT slug FROM categories WHERE slug LIKE ?`, [`${baseSlug}%`])
      const slug = taken.some(row => row.slug === baseSlug) ? `${baseSlug}-${taken.length + 1}` : baseSlug

      const newCatResult = await query<{ insertId: number }>(
        `INSERT INTO categories (event_id, slug, name, selection_method, status, is_direct_allotment, display_order)
         VALUES (?, ?, ?, ?, ?, ?, 9999)`,
        [
          eventId,
          slug,
          categoryName,
          isDirectAllotment ? 'manual' : 'lottery',
          isDirectAllotment ? 'closed' : 'active',
          isDirectAllotment ? 1 : 0
        ]
      )

      categoryId = newCatResult.insertId

      await logAudit({
        actorUserId: session.userId,
        actorRoleKey: session.role.key,
        action: isDirectAllotment ? 'direct_category.created' : 'category.created',
        module: 'inventory',
        entityType: 'category',
        entityId: String(categoryId),
        newValue: { name: categoryName, slug, isDirectAllotment }
      })
    } else if (isDirectAllotment && categoryRows[0].is_direct_allotment !== 1) {
      await query(`UPDATE categories SET is_direct_allotment = 1 WHERE id = ?`, [categoryId])
    }

    const existing = await query<Array<{ id: number }>>(
      `SELECT id FROM shop_units WHERE stall_number = ? LIMIT 1`,
      [stallNumber]
    )

    if (existing.length > 0) {
      return NextResponse.json({ error: `Booth/Stall number "${stallNumber}" already exists.` }, { status: 409 })
    }

    if (isDirectAllotment) {
      const created = await withTransaction(async tx => {
        const stallResult = await tx<{ insertId: number }>(
          `INSERT INTO shop_units (category_id, stall_number, shop_type, direction, emd_amount_paise, status)
           VALUES (?, ?, ?, ?, ?, 'allotted')`,
          [categoryId, stallNumber, shopType, direction, emdAmountPaise]
        )

        const unitId = stallResult.insertId

        const allotmentResult = await tx<{ insertId: number }>(
          `INSERT INTO direct_allotments (category_id, shop_unit_id, allottee_name, contact_person, mobile_number, notes, status, allotted_by_user_id)
           VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
          [categoryId, unitId, allotteeName, contactPerson, mobileNumber, notes, session.userId]
        )

        return { unitId, allotmentId: allotmentResult.insertId }
      })

      await logAudit({
        actorUserId: session.userId,
        actorRoleKey: session.role.key,
        action: 'inventory.created',
        module: 'inventory',
        entityType: 'shop_unit',
        entityId: String(created.unitId),
        newValue: { stallNumber, shopType, categoryName, direction, emdAmountPaise, status: 'allotted' }
      })

      await logAudit({
        actorUserId: session.userId,
        actorRoleKey: session.role.key,
        action: 'direct_allotment.created',
        module: 'allotment',
        entityType: 'direct_allotment',
        entityId: String(created.allotmentId),
        newValue: { categoryId, shopUnitId: created.unitId, allotteeName, contactPerson, mobileNumber, notes }
      })

      return NextResponse.json({
        id: encodeId(created.unitId),
        stallNumber,
        categoryName,
        shopType,
        direction,
        emdAmountPaise,
        status: 'allotted',
        applicationNumber: allotteeName,
        isDirectAllotment: true
      }, { status: 201 })
    }

    const result = await query<{ insertId: number }>(
      `INSERT INTO shop_units (category_id, stall_number, shop_type, direction, emd_amount_paise, status)
       VALUES (?, ?, ?, ?, ?, 'available')`,
      [categoryId, stallNumber, shopType, direction, emdAmountPaise]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'inventory.created',
      module: 'inventory',
      entityType: 'shop_unit',
      entityId: String(result.insertId),
      newValue: { stallNumber, shopType, categoryName, direction, emdAmountPaise, status: 'available' }
    })

    return NextResponse.json({
      id: encodeId(result.insertId),
      stallNumber,
      categoryName,
      shopType,
      direction,
      emdAmountPaise,
      status: 'available',
      applicationNumber: null,
      isDirectAllotment: false
    }, { status: 201 })
  } catch (error) {
    logServerError('api.admin.inventory.create', error)

    return NextResponse.json({ error: 'Something went wrong while creating the booth/stall unit.' }, { status: 500 })
  }
}
