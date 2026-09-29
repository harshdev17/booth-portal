import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const updateNoticeSchema = z.object({
  text: z.string().trim().min(1).max(512).optional(),
  textHi: z
    .string()
    .trim()
    .max(512)
    .nullable()
    .transform(v => (v ? v : null))
    .optional(),
  displayOrder: z.number().int().min(0).optional(),
  status: z.enum(['active', 'inactive']).optional()
})

/** Admin: update a notice's text/order/status (partial update — only provided fields change). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('config:manage')

    const { id } = await params
    const noticeId = Number(id)

    if (!Number.isInteger(noticeId) || noticeId <= 0) {
      return NextResponse.json({ error: 'Invalid notice id.' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = updateNoticeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid notice update.' }, { status: 400 })
    }

    const fields: string[] = []
    const values: unknown[] = []

    if (parsed.data.text !== undefined) {
      fields.push('text = ?')
      values.push(parsed.data.text)
    }

    if (parsed.data.textHi !== undefined) {
      fields.push('text_hi = ?')
      values.push(parsed.data.textHi)
    }

    if (parsed.data.displayOrder !== undefined) {
      fields.push('display_order = ?')
      values.push(parsed.data.displayOrder)
    }

    if (parsed.data.status !== undefined) {
      fields.push('status = ?')
      values.push(parsed.data.status)
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
    }

    values.push(noticeId)

    await query(`UPDATE notices SET ${fields.join(', ')} WHERE id = ?`, values)

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'notice.updated',
      module: 'settings',
      entityType: 'notice',
      entityId: String(noticeId),
      newValue: parsed.data
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.notices.update', error)

    return NextResponse.json({ error: 'Failed to update notice.' }, { status: 500 })
  }
}

/** Admin: permanently delete a notice. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('config:manage')

    const { id } = await params
    const noticeId = Number(id)

    if (!Number.isInteger(noticeId) || noticeId <= 0) {
      return NextResponse.json({ error: 'Invalid notice id.' }, { status: 400 })
    }

    await query(`DELETE FROM notices WHERE id = ?`, [noticeId])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'notice.deleted',
      module: 'settings',
      entityType: 'notice',
      entityId: String(noticeId)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.notices.delete', error)

    return NextResponse.json({ error: 'Failed to delete notice.' }, { status: 500 })
  }
}
