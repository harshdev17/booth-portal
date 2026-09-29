import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const createNoticeSchema = z.object({
  text: z.string().trim().min(1).max(512),
  textHi: z.string().trim().max(512).nullable().transform(v => (v ? v : null))
})

/** Admin: create a new homepage notice, appended to the end of display order. */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = await request.json()
    const parsed = createNoticeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Notice text is required (max 512 characters).' }, { status: 400 })
    }

    const maxOrderRows = await query<Array<{ max_order: number | null }>>(`SELECT MAX(display_order) AS max_order FROM notices`)
    const nextOrder = (maxOrderRows[0]?.max_order ?? 0) + 1

    const result = await query<{ insertId: number }>(
      `INSERT INTO notices (text, text_hi, display_order, status) VALUES (?, ?, ?, 'active')`,
      [parsed.data.text, parsed.data.textHi, nextOrder]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'notice.created',
      module: 'settings',
      entityType: 'notice',
      entityId: String(result.insertId),
      newValue: parsed.data
    })

    return NextResponse.json({ success: true, id: result.insertId })
  } catch (error) {
    logServerError('api.admin.notices.create', error)

    return NextResponse.json({ error: 'Failed to create notice.' }, { status: 500 })
  }
}
