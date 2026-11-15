import { NextResponse } from 'next/server'
import { z } from 'zod'

import { removePendingRow, updatePendingRowApplication } from '@/lib/allotment/declare-result'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'

const patchSchema = z.object({
  rowId: z.number().int().positive(),
  applicationNumber: z.string().trim().min(1).max(32)
})

/** Reassigns a pending row's booth to a different application, before declaring. */
export async function PATCH(request: Request) {
  const session = await requirePermission('allotment:perform')
  const { ipAddress } = getRequestMeta(request)

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  try {
    const result = await updatePendingRowApplication(parsed.data.rowId, parsed.data.applicationNumber, session.userId, ipAddress)

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.declare_result.row_update', error, { rowId: parsed.data.rowId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

/** Removes one pending row (kept as 'discarded' in the history), before declaring. */
export async function DELETE(request: Request) {
  const session = await requirePermission('allotment:perform')
  const { ipAddress } = getRequestMeta(request)
  const rowId = Number(new URL(request.url).searchParams.get('rowId'))

  if (!Number.isInteger(rowId) || rowId <= 0) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  try {
    const result = await removePendingRow(rowId, session.userId, ipAddress)

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.declare_result.row_remove', error, { rowId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
