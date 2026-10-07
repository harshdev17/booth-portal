import { NextResponse } from 'next/server'

import { z } from 'zod'

import { query } from '@/lib/db/client'
import { logAudit } from '@/lib/audit/log'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

const bodySchema = z.object({ reason: z.string().trim().min(1).max(512) })

/**
 * Rejects an application (under_review / query_raised -> rejected). Kept as
 * its own route (rather than the old selectApplicationAction/
 * rejectApplicationAction server-action pair) so it shares the opaque-id +
 * fetch pattern with the new approve route — both are now callable from the
 * same ApplicationDecisionActions component wherever it's rendered (detail
 * page, applications list table), not just from a page with the raw numeric
 * id in scope.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('application:reject')

  const { id } = await params
  const applicationId = decodeId(id)

  if (applicationId === null) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'A reason is required to reject an application.' }, { status: 400 })
  }

  try {
    const rows = await query<Array<{ status: string }>>('SELECT status FROM applications WHERE id = ?', [applicationId])
    const current = rows[0]

    if (!current) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    if (!['under_review', 'payment_success', 'query_raised'].includes(current.status)) {
      return NextResponse.json(
        { error: `This application is "${current.status}", not "Under Review" — it cannot be decided from here.` },
        { status: 409 }
      )
    }

    await query(
      `UPDATE applications SET status = 'rejected' WHERE id = ? AND status IN ('under_review', 'payment_success', 'query_raised')`,
      [applicationId]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application.rejected',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId),
      previousValue: { status: current.status },
      newValue: { status: 'rejected', reason: parsed.data.reason }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.applications.reject', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
