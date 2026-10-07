import { NextResponse } from 'next/server'

import { getApprovalChecklist } from '@/lib/applications/approval-checklist'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

/**
 * Feeds the Approve Application dialog (ApproveApplicationDialog.tsx):
 * whether every required document is verified yet (the hard gate — approval
 * is refused server-side while this is false, see the approve route), and
 * the full list of application fields with their current "data verified
 * correct" checkmark, so the dialog can show what approval is about to mark
 * checked.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission('application:approve')

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

    return NextResponse.json(checklist)
  } catch (error) {
    logServerError('api.admin.applications.approval_checklist', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
