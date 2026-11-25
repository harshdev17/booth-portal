import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

/** Admin: revoke a previously-generated "apply anyway" link, making it unusable immediately. */
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('config:manage')

    const { id } = await params
    const linkId = Number(id)

    if (!Number.isInteger(linkId) || linkId <= 0) {
      return NextResponse.json({ error: 'Invalid link.' }, { status: 400 })
    }

    const result = await query<{ affectedRows: number }>(
      `UPDATE application_bypass_links SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL`,
      [linkId]
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Link not found or already revoked.' }, { status: 404 })
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application_bypass_link.revoked',
      module: 'applications',
      entityType: 'application_bypass_link',
      entityId: String(linkId)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.apply-links.revoke', error)

    return NextResponse.json({ error: 'Failed to revoke link.' }, { status: 500 })
  }
}
