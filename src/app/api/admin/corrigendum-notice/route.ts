import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const createRowSchema = z.object({
  particular: z.string().trim().min(1).max(500),
  particularHi: z.string().trim().min(1).max(500),
  previous: z.string().trim().min(1).max(255),
  previousHi: z.string().trim().min(1).max(255),
  revised: z.string().trim().min(1).max(255),
  revisedHi: z.string().trim().min(1).max(255)
})

/** Admin: create a new Corrigendum popup row, appended to the end of display order. */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = await request.json()
    const parsed = createRowSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'All six fields (English + Hindi) are required.' }, { status: 400 })
    }

    const maxOrderRows = await query<Array<{ max_order: number | null }>>(
      `SELECT MAX(display_order) AS max_order FROM corrigendum_notice_rows`
    )

    const nextOrder = (maxOrderRows[0]?.max_order ?? 0) + 1

    const result = await query<{ insertId: number }>(
      `INSERT INTO corrigendum_notice_rows
         (particular, particular_hi, previous_text, previous_text_hi, revised_text, revised_text_hi, display_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        parsed.data.particular,
        parsed.data.particularHi,
        parsed.data.previous,
        parsed.data.previousHi,
        parsed.data.revised,
        parsed.data.revisedHi,
        nextOrder
      ]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'corrigendum_notice.row_created',
      module: 'settings',
      entityType: 'corrigendum_notice_row',
      entityId: String(result.insertId),
      newValue: parsed.data
    })

    return NextResponse.json({ success: true, id: result.insertId })
  } catch (error) {
    logServerError('api.admin.corrigendum-notice.create', error)

    return NextResponse.json({ error: 'Failed to create row.' }, { status: 500 })
  }
}
