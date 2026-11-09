import { NextResponse } from 'next/server'

import { z } from 'zod'

import { query } from '@/lib/db/client'
import { logAudit } from '@/lib/audit/log'
import { notifyApplicationRejected } from '@/lib/notifications/application-status'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

const bodySchema = z.object({
  applicationIds: z.array(z.string()).min(1).max(200),
  reason: z.string().trim().min(1).max(512)
})

/**
 * Bulk version of reject/route.ts, for the Applications list page's "select
 * rows via checkbox, reject all" flow — per explicit request (2026-11-05).
 * Same single reason applies to every application in the batch (one prompt,
 * not one per row) — re-checks each id's current status server-side exactly
 * like the single-application route; an id no longer in a rejectable status
 * is skipped, not a fatal error for the whole batch. Sends the same
 * rejection notification (with the shared reason) as the single-application
 * route (added 2026-11-10) per application rejected.
 */
export async function POST(request: Request) {
  const session = await requirePermission('application:reject')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'A reason is required to reject applications.' }, { status: 400 })
  }

  const applicationIds = parsed.data.applicationIds.map(id => decodeId(id)).filter((id): id is number => id !== null)

  if (applicationIds.length === 0) {
    return NextResponse.json({ error: 'No valid application IDs in selection.' }, { status: 400 })
  }

  let rejectedCount = 0
  const skipped: Array<{ applicationId: number; reason: string }> = []

  try {
    for (const applicationId of applicationIds) {
      // eslint-disable-next-line no-await-in-loop
      const rows = await query<
        Array<{ status: string; application_number: string; representative_name: string; mobile_number: string; email: string | null }>
      >('SELECT status, application_number, representative_name, mobile_number, email FROM applications WHERE id = ?', [applicationId])
      const current = rows[0]

      if (!current) {
        skipped.push({ applicationId, reason: 'Not found.' })
        continue
      }

      if (!['under_review', 'payment_success', 'query_raised', 'approved'].includes(current.status)) {
        skipped.push({ applicationId, reason: `Status is "${current.status}", not decidable from here.` })
        continue
      }

      // eslint-disable-next-line no-await-in-loop
      await query(
        `UPDATE applications SET status = 'rejected' WHERE id = ? AND status IN ('under_review', 'payment_success', 'query_raised', 'approved')`,
        [applicationId]
      )

      // eslint-disable-next-line no-await-in-loop
      await notifyApplicationRejected({
        applicationId,
        applicationNumber: current.application_number,
        mobileNumber: current.mobile_number,
        email: current.email,
        representativeName: current.representative_name,
        reason: parsed.data.reason
      })

      // eslint-disable-next-line no-await-in-loop
      await logAudit({
        actorUserId: session.userId,
        actorRoleKey: session.role.key,
        action: 'application.rejected',
        module: 'applications',
        entityType: 'application',
        entityId: String(applicationId),
        previousValue: { status: current.status },
        newValue: { status: 'rejected', reason: parsed.data.reason, bulk: true }
      })

      rejectedCount += 1
    }

    return NextResponse.json({
      success: true,
      rejectedCount,
      skippedCount: skipped.length,
      skipped,
      message: `Rejected ${rejectedCount} application${rejectedCount === 1 ? '' : 's'}.${
        skipped.length > 0 ? ` Skipped ${skipped.length} (not eligible).` : ''
      }`
    })
  } catch (error) {
    logServerError('api.admin.applications.bulk-reject', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
