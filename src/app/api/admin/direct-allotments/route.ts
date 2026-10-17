import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { withTransaction } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'

export async function POST(request: Request) {
  const session = await requirePermission('allotment:perform')
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const categoryId = Number(body?.categoryId)
  const shopUnitId = Number(body?.shopUnitId)
  const allotteeName = typeof body?.allotteeName === 'string' ? body.allotteeName.trim() : ''
  const contactPerson = typeof body?.contactPerson === 'string' ? body.contactPerson.trim() || null : null
  const mobileNumber = typeof body?.mobileNumber === 'string' ? body.mobileNumber.trim() || null : null
  const notes = typeof body?.notes === 'string' ? body.notes.trim() || null : null
  if (!Number.isInteger(categoryId) || !Number.isInteger(shopUnitId) || !allotteeName) return NextResponse.json({ error: 'Category, available stall, and allottee name are required.' }, { status: 400 })

  try {
    const allotted = await withTransaction(async tx => {
      const units = await tx<Array<{ id: number; stall_number: string }>>(
        `SELECT su.id, su.stall_number FROM shop_units su JOIN categories c ON c.id = su.category_id
         WHERE su.id = ? AND su.category_id = ? AND su.status = 'available' AND c.is_direct_allotment = 1 FOR UPDATE`,
        [shopUnitId, categoryId]
      )
      const unit = units[0]
      if (!unit) throw new Error('This stall is no longer available for the selected direct category.')
      const result = await tx<{ insertId: number }>(
        `INSERT INTO direct_allotments (category_id, shop_unit_id, allottee_name, contact_person, mobile_number, notes, allotted_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [categoryId, shopUnitId, allotteeName, contactPerson, mobileNumber, notes, session.userId]
      )
      await tx(`UPDATE shop_units SET status = 'allotted' WHERE id = ?`, [shopUnitId])
      return { id: result.insertId, stallNumber: unit.stall_number }
    })
    await logAudit({ actorUserId: session.userId, actorRoleKey: session.role.key, action: 'direct_allotment.created', module: 'allotment', entityType: 'direct_allotment', entityId: String(allotted.id), newValue: { categoryId, shopUnitId, allotteeName, contactPerson, mobileNumber, notes } })
    return NextResponse.json(allotted, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to allot the stall.' }, { status: 409 })
  }
}
