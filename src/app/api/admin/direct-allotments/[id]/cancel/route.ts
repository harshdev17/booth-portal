import { NextResponse } from 'next/server'

import { cancelStallAllotment } from '@/lib/allotment/cancel-allotment'
import { query } from '@/lib/db/client'
import { requireAnyPermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAnyPermission(['allotment:perform', 'inventory:manage'])
    const { id } = await params
    const directAllotmentId = Number(id)

    if (!Number.isInteger(directAllotmentId) || directAllotmentId <= 0) {
      return NextResponse.json({ error: 'Invalid direct allotment ID.' }, { status: 400 })
    }

    const rows = await query<Array<{ shop_unit_id: number; application_id: number | null }>>(
      `SELECT shop_unit_id, application_id FROM direct_allotments WHERE id = ? LIMIT 1`,
      [directAllotmentId]
    )

    const record = rows[0]
    if (!record) {
      return NextResponse.json({ error: 'Direct allotment not found.' }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const reason = typeof body.reason === 'string' ? body.reason.trim() : undefined
    const sendNotification = body.sendNotification !== false

    const result = await cancelStallAllotment({
      shopUnitId: record.shop_unit_id,
      applicationId: record.application_id ?? undefined,
      reason,
      sendNotification,
      actorUserId: session.userId,
      actorRoleKey: session.role.key
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Something went wrong while cancelling the direct allotment.'
    logServerError('api.admin.direct-allotments.cancel', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
