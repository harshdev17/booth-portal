import { NextResponse } from 'next/server'

import { z } from 'zod'

import { query } from '@/lib/db/client'
import { logAudit } from '@/lib/audit/log'
import { notifyApplicationRejected } from '@/lib/notifications/application-status'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

const bodySchema = z.object({
  reason: z.string().trim().min(1).max(512),
  /** Defaults to true (checked) — unchecking in the dialog skips the email/WhatsApp send entirely, per explicit request. */
  notify: z.boolean().optional().default(true)
})

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
    const rows = await query<
      Array<{ status: string; application_number: string; representative_name: string; mobile_number: string; email: string | null }>
    >('SELECT status, application_number, representative_name, mobile_number, email FROM applications WHERE id = ?', [applicationId])
    const current = rows[0]

    if (!current) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    // 'approved' is included so a mistaken approval can be reversed by
    // rejecting — same "undo" symmetry as approve allowing 'rejected'.
    if (!['under_review', 'payment_success', 'query_raised', 'approved'].includes(current.status)) {
      return NextResponse.json(
        { error: `This application is "${current.status}" — it cannot be rejected from here.` },
        { status: 409 }
      )
    }

    await query(
      `UPDATE applications SET status = 'rejected' WHERE id = ? AND status IN ('under_review', 'payment_success', 'query_raised', 'approved')`,
      [applicationId]
    )

    if (parsed.data.notify) {
      await notifyApplicationRejected({
        applicationId,
        applicationNumber: current.application_number,
        mobileNumber: current.mobile_number,
        email: current.email,
        representativeName: current.representative_name,
        reason: parsed.data.reason
      })
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application.rejected',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId),
      previousValue: { status: current.status },
      newValue: { status: 'rejected', reason: parsed.data.reason, notified: parsed.data.notify }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.applications.reject', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
