import { NextResponse } from 'next/server'

import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { decodeId } from '@/lib/security/opaque-id'

type ApplicationNumberRow = { application_number: string }

/** Resolves an opaque application URL token for the authenticated admin breadcrumb only. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission('application:view')

  const { id } = await params
  const applicationId = decodeId(id)

  if (applicationId === null) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const rows = await query<ApplicationNumberRow[]>(
    'SELECT application_number FROM applications WHERE id = ? LIMIT 1',
    [applicationId]
  )
  const application = rows[0]

  if (!application) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  return NextResponse.json({ applicationNumber: application.application_number }, { headers: { 'Cache-Control': 'private, no-store' } })
}
