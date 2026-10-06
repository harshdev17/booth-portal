import { NextResponse } from 'next/server'

import { query } from '@/lib/db/client'
import { logAudit } from '@/lib/audit/log'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

const FIELD_KEY_PATTERN = /^(?:[a-z_]+|dynamic:\d+)$/

type Body = {
  fieldKey?: unknown
  checked?: unknown
}

/**
 * Toggles one field's "data verified correct" checkmark on the Application
 * Detail page. A row's existence in application_field_checks IS the
 * checked state (see migration 0020) — checking inserts, unchecking
 * deletes, both idempotent, so there's never a stale true/false column to
 * drift from reality.
 *
 * Gated by document:verify — the same permission that already gates the
 * verify/reject/query actions on this page's uploaded documents. This marks
 * are a plain-data-field counterpart to document verification, performed by
 * the same Verification Staff role; it does not change the application's
 * own status; it is admin judgment ("Admin check kiya to matlab field ka
 * data correct hai"), not a new document.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('document:verify')

  const { id } = await params
  const applicationId = decodeId(id)

  if (applicationId === null) {
    return NextResponse.json({ error: 'Invalid application.' }, { status: 400 })
  }

  let body: Body

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const fieldKey = typeof body.fieldKey === 'string' ? body.fieldKey : ''
  const checked = body.checked === true

  if (!FIELD_KEY_PATTERN.test(fieldKey)) {
    return NextResponse.json({ error: 'Invalid field.' }, { status: 400 })
  }

  try {
    const applicationRows = await query<Array<{ id: number }>>(`SELECT id FROM applications WHERE id = ? LIMIT 1`, [
      applicationId
    ])

    if (applicationRows.length === 0) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    if (checked) {
      await query(
        `INSERT INTO application_field_checks (application_id, field_key, checked_by_user_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE checked_by_user_id = VALUES(checked_by_user_id), checked_at = CURRENT_TIMESTAMP`,
        [applicationId, fieldKey, session.userId]
      )
    } else {
      await query(`DELETE FROM application_field_checks WHERE application_id = ? AND field_key = ?`, [
        applicationId,
        fieldKey
      ])
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: checked ? 'application.field_checked' : 'application.field_unchecked',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId),
      newValue: { fieldKey }
    })

    return NextResponse.json({ checked })
  } catch (error) {
    logServerError('api.admin.applications.field_checks', error, { applicationId, fieldKey })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
