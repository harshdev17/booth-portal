import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const updateSchema = z.object({
  expiresAt: z.string().trim().min(1).max(32).nullable()
})

/** Admin: change an active "apply anyway" link's expiry, without needing to revoke and regenerate it. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('config:manage')

    const { id } = await params
    const linkId = Number(id)

    if (!Number.isInteger(linkId) || linkId <= 0) {
      return NextResponse.json({ error: 'Invalid link.' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const result = await query<{ affectedRows: number }>(
      `UPDATE application_bypass_links SET expires_at = ? WHERE id = ? AND revoked_at IS NULL`,
      [parsed.data.expiresAt, linkId]
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Link not found or revoked.' }, { status: 404 })
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application_bypass_link.expiry_updated',
      module: 'applications',
      entityType: 'application_bypass_link',
      entityId: String(linkId),
      newValue: { expiresAt: parsed.data.expiresAt }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.apply-links.update', error)

    return NextResponse.json({ error: 'Failed to update link.' }, { status: 500 })
  }
}
