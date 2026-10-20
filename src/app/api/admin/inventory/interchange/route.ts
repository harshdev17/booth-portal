import { NextResponse } from 'next/server'

import { interchangeStalls } from '@/lib/allotment/interchange-stalls'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

export async function POST(request: Request) {
  try {
    const session = await requirePermission('inventory:manage')

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    const rawFirstId = typeof body?.firstShopUnitId === 'string' ? body.firstShopUnitId : null
    const rawSecondId = typeof body?.secondShopUnitId === 'string' ? body.secondShopUnitId : null
    const firstShopUnitId = rawFirstId ? decodeId(rawFirstId) : null
    const secondShopUnitId = rawSecondId ? decodeId(rawSecondId) : null
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
    const sendNotifications = body?.sendNotifications !== false

    if (firstShopUnitId === null || secondShopUnitId === null || !rawFirstId || !rawSecondId) {
      return NextResponse.json({ error: 'Choose two valid booth/stall units.' }, { status: 400 })
    }

    if (!reason) {
      return NextResponse.json({ error: 'A reason for the interchange is required.' }, { status: 400 })
    }

    const result = await interchangeStalls({
      firstShopUnitId,
      secondShopUnitId,
      reason,
      sendNotifications,
      actorUserId: session.userId,
      actorRoleKey: session.role.key
    })

    // Echo back the SAME opaque id strings the client sent, rather than
    // re-encoding the raw numeric id — encodeId() mints a fresh random IV
    // (AES-GCM) on every call, so a freshly re-encoded id is a DIFFERENT
    // opaque string than the one already sitting in the client's row state,
    // and a `row.id === data.first.shopUnitId` comparison there would never
    // match. This was a real bug: the interchange's category_id change was
    // visible (it survived a page reload), but the status/allottee swap
    // looked like it "didn't happen" because the local-state patch silently
    // matched zero rows.
    return NextResponse.json({
      success: true,
      first: { ...result.first, shopUnitId: rawFirstId },
      second: { ...result.second, shopUnitId: rawSecondId }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Something went wrong while interchanging these stalls.'

    logServerError('api.admin.inventory.interchange', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
