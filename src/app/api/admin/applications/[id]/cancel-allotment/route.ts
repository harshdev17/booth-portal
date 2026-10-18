import { NextResponse } from 'next/server'

import { cancelStallAllotment } from '@/lib/allotment/cancel-allotment'
import { requireAnyPermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAnyPermission(['allotment:perform', 'inventory:manage', 'application:reject'])
    const { id } = await params

    const applicationId = decodeId(id) ?? (Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : null)

    if (applicationId === null) {
      return NextResponse.json({ error: 'Invalid application ID.' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const reason = typeof body.reason === 'string' ? body.reason.trim() : undefined
    const sendNotification = body.sendNotification !== false

    const result = await cancelStallAllotment({
      applicationId,
      reason,
      sendNotification,
      actorUserId: session.userId,
      actorRoleKey: session.role.key
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Something went wrong while cancelling the allotment.'
    logServerError('api.admin.applications.cancel-allotment', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
