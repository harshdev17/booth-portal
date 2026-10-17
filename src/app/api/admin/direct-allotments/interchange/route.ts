import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit/log'
import { withTransaction } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'

type Active = { id: number; category_id: number; shop_unit_id: number; allottee_name: string; contact_person: string | null; mobile_number: string | null; notes: string | null; stall_number: string }

export async function POST(request: Request) {
  const session = await requirePermission('allotment:perform')
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const firstId = Number(body?.firstAllotmentId), secondId = Number(body?.secondAllotmentId)
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
  if (!Number.isInteger(firstId) || !Number.isInteger(secondId) || firstId === secondId || !reason) return NextResponse.json({ error: 'Choose two different allotments and enter the interchange reason.' }, { status: 400 })
  try {
    const result = await withTransaction(async tx => {
      const rows = await tx<Active[]>(`SELECT da.id, da.category_id, da.shop_unit_id, da.allottee_name, da.contact_person, da.mobile_number, da.notes, su.stall_number FROM direct_allotments da JOIN shop_units su ON su.id = da.shop_unit_id WHERE da.id IN (?, ?) AND da.status = 'active' ORDER BY da.id FOR UPDATE`, [firstId, secondId])
      if (rows.length !== 2) throw new Error('One of these allotments is no longer active.')
      const [first, second] = rows
      const change = await tx<{ insertId: number }>(`INSERT INTO direct_allotment_changes (change_type, reason, performed_by_user_id) VALUES ('interchange', ?, ?)`, [reason, session.userId])
      const changeId = change.insertId
      await tx(`UPDATE direct_allotments SET status = 'interchanged', change_id = ? WHERE id IN (?, ?)`, [changeId, first.id, second.id])
      const one = await tx<{ insertId: number }>(`INSERT INTO direct_allotments (category_id, shop_unit_id, allottee_name, contact_person, mobile_number, notes, status, change_id, allotted_by_user_id) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`, [first.category_id, second.shop_unit_id, first.allottee_name, first.contact_person, first.mobile_number, first.notes, changeId, session.userId])
      const two = await tx<{ insertId: number }>(`INSERT INTO direct_allotments (category_id, shop_unit_id, allottee_name, contact_person, mobile_number, notes, status, change_id, allotted_by_user_id) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`, [second.category_id, first.shop_unit_id, second.allottee_name, second.contact_person, second.mobile_number, second.notes, changeId, session.userId])
      await tx(`UPDATE direct_allotments SET replaced_by_allotment_id = CASE id WHEN ? THEN ? WHEN ? THEN ? END WHERE id IN (?, ?)`, [first.id, one.insertId, second.id, two.insertId, first.id, second.id])
      return { changeId, before: [{ name: first.allottee_name, stall: first.stall_number }, { name: second.allottee_name, stall: second.stall_number }], after: [{ name: first.allottee_name, stall: second.stall_number }, { name: second.allottee_name, stall: first.stall_number }] }
    })
    await logAudit({ actorUserId: session.userId, actorRoleKey: session.role.key, action: 'direct_allotment.interchanged', module: 'allotment', entityType: 'direct_allotment_change', entityId: String(result.changeId), previousValue: { before: result.before }, newValue: { after: result.after, reason } })
    return NextResponse.json(result)
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not interchange stalls.' }, { status: 409 }) }
}
