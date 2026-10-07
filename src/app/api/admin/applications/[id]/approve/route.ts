import { NextResponse } from 'next/server'

import { query } from '@/lib/db/client'
import { getApprovalChecklist } from '@/lib/applications/approval-checklist'
import { logAudit } from '@/lib/audit/log'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

/**
 * Approves an application (under_review -> selected) from the confirmation
 * popup in ApproveApplicationDialog.tsx. Re-checks everything the dialog
 * already showed — never trusts that the client-side gate held: every
 * required document must still be verified, and the application must still
 * be "Under Review". On success, every field in the checklist (not just the
 * ones the admin had individually ticked on the detail page beforehand) is
 * marked as "data verified correct" in application_field_checks — approving
 * IS the confirmation that all of it was reviewed, per the admin's
 * instruction that the dialog stands in for ticking each field by hand.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('application:approve')

  const { id } = await params
  const applicationId = decodeId(id)

  if (applicationId === null) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  try {
    const checklist = await getApprovalChecklist(applicationId)

    if (!checklist) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    if (checklist.status !== 'under_review') {
      return NextResponse.json(
        { error: `This application is "${checklist.status}", not "Under Review" — it cannot be approved from here.` },
        { status: 409 }
      )
    }

    if (!checklist.allDocumentsVerified) {
      return NextResponse.json(
        {
          error: `All required documents must be verified before this application can be approved. Still pending: ${checklist.missingDocumentLabels.join(', ')}.`
        },
        { status: 409 }
      )
    }

    const newlyCheckedKeys = checklist.fields.filter(f => !f.checked).map(f => f.key)

    if (checklist.fields.length > 0) {
      const values = checklist.fields.map(f => [applicationId, f.key, session.userId])

      await query(
        `INSERT INTO application_field_checks (application_id, field_key, checked_by_user_id)
         VALUES ${values.map(() => '(?, ?, ?)').join(', ')}
         ON DUPLICATE KEY UPDATE checked_by_user_id = VALUES(checked_by_user_id)`,
        values.flat()
      )
    }

    await query(`UPDATE applications SET status = 'selected' WHERE id = ? AND status = 'under_review'`, [applicationId])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application.approved',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId),
      previousValue: { status: 'under_review' },
      newValue: { status: 'selected', fieldsMarkedChecked: newlyCheckedKeys }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.applications.approve', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
