import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const updateRowSchema = z.object({
  particular: z.string().trim().min(1).max(500).optional(),
  particularHi: z.string().trim().min(1).max(500).optional(),
  previous: z.string().trim().min(1).max(255).optional(),
  previousHi: z.string().trim().min(1).max(255).optional(),
  revised: z.string().trim().min(1).max(255).optional(),
  revisedHi: z.string().trim().min(1).max(255).optional(),
  displayOrder: z.number().int().min(0).optional(),
  status: z.enum(['active', 'inactive']).optional()
})

const COLUMN_BY_FIELD: Record<string, string> = {
  particular: 'particular',
  particularHi: 'particular_hi',
  previous: 'previous_text',
  previousHi: 'previous_text_hi',
  revised: 'revised_text',
  revisedHi: 'revised_text_hi',
  displayOrder: 'display_order',
  status: 'status'
}

/** Admin: update a Corrigendum popup row's text/order/status (partial — only provided fields change). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('config:manage')

    const { id } = await params
    const rowId = Number(id)

    if (!Number.isInteger(rowId) || rowId <= 0) {
      return NextResponse.json({ error: 'Invalid row id.' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = updateRowSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid row update.' }, { status: 400 })
    }

    const fields: string[] = []
    const values: unknown[] = []

    for (const [key, value] of Object.entries(parsed.data)) {
      if (value === undefined) continue

      fields.push(`${COLUMN_BY_FIELD[key]} = ?`)
      values.push(value)
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
    }

    values.push(rowId)

    await query(`UPDATE corrigendum_notice_rows SET ${fields.join(', ')} WHERE id = ?`, values)

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'corrigendum_notice.row_updated',
      module: 'settings',
      entityType: 'corrigendum_notice_row',
      entityId: String(rowId),
      newValue: parsed.data
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.corrigendum-notice.update', error)

    return NextResponse.json({ error: 'Failed to update row.' }, { status: 500 })
  }
}

/** Admin: permanently delete a Corrigendum popup row. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('config:manage')

    const { id } = await params
    const rowId = Number(id)

    if (!Number.isInteger(rowId) || rowId <= 0) {
      return NextResponse.json({ error: 'Invalid row id.' }, { status: 400 })
    }

    await query(`DELETE FROM corrigendum_notice_rows WHERE id = ?`, [rowId])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'corrigendum_notice.row_deleted',
      module: 'settings',
      entityType: 'corrigendum_notice_row',
      entityId: String(rowId)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.corrigendum-notice.delete', error)

    return NextResponse.json({ error: 'Failed to delete row.' }, { status: 500 })
  }
}
