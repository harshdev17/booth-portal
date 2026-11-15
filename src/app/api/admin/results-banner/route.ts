import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { getResultsBannerSettings } from '@/lib/draw/results-declared'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

/** Admin: read the current "Results declared" banner text (EN + HI). */
export async function GET() {
  try {
    await requirePermission('config:manage')

    const settings = await getResultsBannerSettings()

    return NextResponse.json(settings)
  } catch (error) {
    logServerError('api.admin.results-banner.get', error)

    return NextResponse.json({ error: 'Failed to load the results banner settings.' }, { status: 500 })
  }
}

/** Admin: update the "Results declared" banner text (EN + HI) — single global row. */
export async function PUT(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = (await request.json().catch(() => ({}))) as { textEn?: unknown; textHi?: unknown }
    const textEn = typeof body.textEn === 'string' ? body.textEn.trim() : ''
    const textHi = typeof body.textHi === 'string' ? body.textHi.trim() : ''

    if (!textEn || !textHi) {
      return NextResponse.json({ error: 'Both English and Hindi text are required.' }, { status: 400 })
    }

    await query(`UPDATE results_banner_settings SET text_en = ?, text_hi = ? WHERE id = 1`, [textEn, textHi])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'results_banner.updated',
      module: 'results',
      entityType: 'results_banner_settings',
      entityId: '1',
      newValue: { textEn, textHi }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.results-banner.put', error)

    return NextResponse.json({ error: 'Failed to update the results banner settings.' }, { status: 500 })
  }
}
