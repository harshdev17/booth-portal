import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

// Allotment letters are held back from the applicant until an admin
// explicitly releases them (verification step), even after allotment
// payment succeeds — see .ai/CHANGELOG.md. This route is the one place
// that sets applications.allotment_letter_released_at.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('allotment:perform')

  const { id } = await params
  const applicationId = decodeId(id) ?? (Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : null)

  if (applicationId === null) {
    return NextResponse.json({ error: 'Invalid application ID.' }, { status: 400 })
  }

  try {
    const rows = await query<Array<{ id: number; application_number: string; stall_number: string | null; allotment_letter_released_at: string | null }>>(
      `SELECT a.id, a.application_number, a.allotment_letter_released_at,
              COALESCE(su.stall_number, da_su.stall_number) AS stall_number
       FROM applications a
       LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
       LEFT JOIN direct_allotments da ON da.application_id = a.id AND da.status = 'active'
       LEFT JOIN shop_units da_su ON da_su.id = da.shop_unit_id
       WHERE a.id = ?
       LIMIT 1`,
      [applicationId]
    )

    const app = rows[0]

    if (!app) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    if (!app.stall_number) {
      return NextResponse.json(
        { error: 'No booth/stall has been allotted to this application yet.' },
        { status: 400 }
      )
    }

    if (app.allotment_letter_released_at) {
      return NextResponse.json({ success: true, message: 'Allotment letter is already released to the applicant.' })
    }

    await query(`UPDATE applications SET allotment_letter_released_at = NOW() WHERE id = ?`, [applicationId])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application.allotment_letter_released',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId),
      newValue: { applicationNumber: app.application_number, stallNumber: app.stall_number }
    })

    return NextResponse.json({
      success: true,
      message: 'Allotment letter released. The applicant can now download it from the status page.'
    })
  } catch (error) {
    logServerError('api.admin.applications.release-allotment-letter', error, { applicationId })

    return NextResponse.json({ error: 'Failed to release the allotment letter.' }, { status: 500 })
  }
}
