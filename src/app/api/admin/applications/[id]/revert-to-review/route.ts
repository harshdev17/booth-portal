import { NextResponse } from 'next/server'

import { query } from '@/lib/db/client'
import { logAudit } from '@/lib/audit/log'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

/**
 * Reverts a mistakenly-decided application (approved or rejected) back to
 * "Under Review" — a plain undo, distinct from the approve/reject routes'
 * own "undo by re-deciding the other way" symmetry (reject allows
 * 'approved', approve allows 'rejected'). This is for the case the admin
 * doesn't want to re-decide at all, just put it back in the review queue.
 * Gated by application:edit (not :approve/:reject) since this isn't a
 * decision itself, just a correction of one — per explicit request.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('application:edit')

  const { id } = await params
  const applicationId = decodeId(id)

  if (applicationId === null) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  try {
    const rows = await query<Array<{ status: string }>>('SELECT status FROM applications WHERE id = ?', [applicationId])
    const current = rows[0]

    if (!current) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    if (!['approved', 'rejected'].includes(current.status)) {
      return NextResponse.json(
        { error: `This application is "${current.status}" — it can only be reverted to review from Approved or Rejected.` },
        { status: 409 }
      )
    }

    await query(`UPDATE applications SET status = 'under_review' WHERE id = ? AND status IN ('approved', 'rejected')`, [
      applicationId
    ])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application.reverted_to_review',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId),
      previousValue: { status: current.status },
      newValue: { status: 'under_review' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.applications.revert-to-review', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
