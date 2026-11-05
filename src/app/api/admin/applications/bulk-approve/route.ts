import { NextResponse } from 'next/server'

import { query } from '@/lib/db/client'
import { getApprovalChecklist } from '@/lib/applications/approval-checklist'
import { logAudit } from '@/lib/audit/log'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

/**
 * Bulk version of approve/route.ts, for the Applications list page's
 * "select rows via checkbox, approve all" flow — per explicit request
 * (2026-11-05). Re-checks the exact same eligibility per application as the
 * single-application approve button (status must still be under_review/
 * payment_success, all required documents must still be verified) — an id
 * that fails either check is skipped, not treated as a fatal error for the
 * whole batch. No notification of any kind is sent here, same as the
 * single-application route — approval is purely an internal status change,
 * confirmed not to trigger email/WhatsApp (see .ai/CHANGELOG.md 2026-11-05).
 */
export async function POST(request: Request) {
  const session = await requirePermission('application:approve')

  let body: { applicationIds?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rawIds = Array.isArray(body.applicationIds) ? body.applicationIds : []

  if (rawIds.length === 0) {
    return NextResponse.json({ error: 'No applications selected.' }, { status: 400 })
  }

  if (rawIds.length > 200) {
    return NextResponse.json({ error: 'Too many applications selected at once (max 200).' }, { status: 400 })
  }

  const applicationIds = rawIds.map(id => decodeId(id)).filter((id): id is number => id !== null)

  if (applicationIds.length === 0) {
    return NextResponse.json({ error: 'No valid application IDs in selection.' }, { status: 400 })
  }

  let approvedCount = 0
  const skipped: Array<{ applicationId: number; reason: string }> = []

  try {
    for (const applicationId of applicationIds) {
      // eslint-disable-next-line no-await-in-loop
      const checklist = await getApprovalChecklist(applicationId)

      if (!checklist) {
        skipped.push({ applicationId, reason: 'Not found.' })
        continue
      }

      if (!['under_review', 'payment_success'].includes(checklist.status)) {
        skipped.push({ applicationId, reason: `Status is "${checklist.status}", not Under Review.` })
        continue
      }

      if (!checklist.allDocumentsVerified) {
        skipped.push({ applicationId, reason: 'Required documents not yet verified.' })
        continue
      }

      const newlyCheckedKeys = checklist.fields.filter(f => !f.checked).map(f => f.key)

      if (checklist.fields.length > 0) {
        const values = checklist.fields.map(f => [applicationId, f.key, session.userId])

        // eslint-disable-next-line no-await-in-loop
        await query(
          `INSERT INTO application_field_checks (application_id, field_key, checked_by_user_id)
           VALUES ${values.map(() => '(?, ?, ?)').join(', ')}
           ON DUPLICATE KEY UPDATE checked_by_user_id = VALUES(checked_by_user_id)`,
          values.flat()
        )
      }

      // eslint-disable-next-line no-await-in-loop
      await query(`UPDATE applications SET status = 'approved' WHERE id = ? AND status IN ('under_review', 'payment_success')`, [applicationId])

      // eslint-disable-next-line no-await-in-loop
      await logAudit({
        actorUserId: session.userId,
        actorRoleKey: session.role.key,
        action: 'application.approved',
        module: 'applications',
        entityType: 'application',
        entityId: String(applicationId),
        previousValue: { status: checklist.status },
        newValue: { status: 'approved', fieldsMarkedChecked: newlyCheckedKeys, bulk: true }
      })

      approvedCount += 1
    }

    return NextResponse.json({
      success: true,
      approvedCount,
      skippedCount: skipped.length,
      skipped,
      message: `Approved ${approvedCount} application${approvedCount === 1 ? '' : 's'}.${
        skipped.length > 0 ? ` Skipped ${skipped.length} (not eligible).` : ''
      }`
    })
  } catch (error) {
    logServerError('api.admin.applications.bulk-approve', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
