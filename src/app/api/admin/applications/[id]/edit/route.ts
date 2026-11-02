import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { decodeId } from '@/lib/security/opaque-id'

// Only the applicant-supplied text fields an admin would plausibly need to
// correct (typos, a misheard phone number, an address the applicant typed
// wrong) — deliberately excludes: status/access_token_hash (changed only
// through the dedicated approve/reject/draw/allotment flows, never a raw
// field edit), category_id/shop_option_id (changing these would invalidate
// the category-specific field/document definitions already on this
// application), and the Aadhaar columns (encrypted; correcting it needs a
// re-encrypt, not a plain text update — out of scope here, see
// .ai/SECURITY.md on Aadhaar handling).
const EDITABLE_COLUMNS = [
  'email',
  'organisation_name',
  'representative_name',
  'father_name',
  'police_station_name',
  'police_station_address',
  'address',
  'state',
  'district',
  'pin_code',
  'mobile_number',
  'alternate_mobile',
  'work_purpose',
  'achievement_experience',
  'remarks'
] as const

const editSchema = z.object({
  fields: z
    .object(Object.fromEntries(EDITABLE_COLUMNS.map(col => [col, z.string().trim().max(2000).nullable().optional()])))
    .partial(),

  // Category-specific fields (application_field_values), keyed by
  // field_definition_id — the admin detail page already renders these from
  // category_field_definitions, so the client sends back exactly the ids
  // it showed.
  categoryFields: z.record(z.string(), z.string().trim().max(2000)).optional()
})

type ApplicationRow = Record<string, string | null>

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('application:edit')
  const { ipAddress } = getRequestMeta(request)

  const { id } = await params
  const applicationId = decodeId(id)

  if (applicationId === null) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = editSchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const fieldEntries = Object.entries(parsed.data.fields ?? {}).filter(
    (entry): entry is [(typeof EDITABLE_COLUMNS)[number], string | null] => entry[1] !== undefined
  )
  const categoryFieldEntries = Object.entries(parsed.data.categoryFields ?? {})

  if (fieldEntries.length === 0 && categoryFieldEntries.length === 0) {
    return NextResponse.json({ error: 'No changes submitted.' }, { status: 400 })
  }

  try {
    const existingRows = await query<ApplicationRow[]>(
      `SELECT id, ${EDITABLE_COLUMNS.join(', ')} FROM applications WHERE id = ? LIMIT 1`,
      [applicationId]
    )

    const existing = existingRows[0]

    if (!existing) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    const previousValues: Record<string, string | null> = {}
    const newValues: Record<string, string | null> = {}
    const setClauses: string[] = []
    const setParams: Array<string | null> = []

    for (const [column, value] of fieldEntries) {
      const normalized = value === undefined ? null : value

      if (existing[column] === normalized) continue

      previousValues[column] = existing[column]
      newValues[column] = normalized
      setClauses.push(`${column} = ?`)
      setParams.push(normalized)
    }

    if (setClauses.length > 0) {
      await query(`UPDATE applications SET ${setClauses.join(', ')} WHERE id = ?`, [...setParams, applicationId])
    }

    // Category-specific fields live in a separate table, one row per
    // (application_id, field_definition_id) — each is updated independently
    // of the applications-table columns above.
    const categoryFieldChanges: Array<{ fieldDefinitionId: number; previous: string | null; next: string }> = []

    for (const [fieldDefinitionIdRaw, value] of categoryFieldEntries) {
      const fieldDefinitionId = Number(fieldDefinitionIdRaw)

      if (!Number.isInteger(fieldDefinitionId) || fieldDefinitionId <= 0) continue

      const [existingFieldRows] = await query<Array<{ value: string }>>(
        `SELECT value FROM application_field_values WHERE application_id = ? AND field_definition_id = ? LIMIT 1`,
        [applicationId, fieldDefinitionId]
      )

      const previousFieldValue = existingFieldRows?.value ?? null

      if (previousFieldValue === value) continue

      await query(
        `INSERT INTO application_field_values (application_id, field_definition_id, value)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
        [applicationId, fieldDefinitionId, value]
      )

      categoryFieldChanges.push({ fieldDefinitionId, previous: previousFieldValue, next: value })
    }

    if (setClauses.length === 0 && categoryFieldChanges.length === 0) {
      return NextResponse.json({ error: 'No changes to apply — submitted values match the current data.' }, { status: 400 })
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application.edited',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId),
      previousValue: { fields: previousValues, categoryFields: categoryFieldChanges.map(c => ({ fieldDefinitionId: c.fieldDefinitionId, value: c.previous })) },
      newValue: { fields: newValues, categoryFields: categoryFieldChanges.map(c => ({ fieldDefinitionId: c.fieldDefinitionId, value: c.next })) },
      ipAddress
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.applications.edit', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
