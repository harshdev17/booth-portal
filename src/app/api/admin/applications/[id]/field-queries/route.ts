import { NextResponse } from 'next/server'
import { z } from 'zod'

import { countOpenFieldQueries, resolveQueryableField } from '@/lib/applications/field-queries'
import { logAudit } from '@/lib/audit/log'
import { query, withTransaction } from '@/lib/db/client'
import { notifyFieldQueries } from '@/lib/notifications/document-query'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

// Same review-stage statuses an application-level query may be raised from
// (see queryApplicationAction in src/app/server/document-actions.ts).
const QUERYABLE_STATUSES = ['under_review', 'payment_success', 'query_raised']

// Accepts EITHER the original single-field shape (fieldKey) or a new
// multi-select shape (fieldKeys) — the existing single-field "Raise query"
// buttons on ApplicationFieldRow keep sending the original shape unchanged.
const raiseSchema = z.object({
  fieldKey: z.string().trim().min(1).max(64).optional(),
  fieldKeys: z.array(z.string().trim().min(1).max(64)).min(1).max(30).optional(),
  remarks: z.string().trim().min(1, 'A remark is required.').max(512)
})

type ApplicationRow = {
  status: string
  application_number: string
  mobile_number: string
  email: string
  representative_name: string
}

/**
 * Raises a query on one specific field of an application. The applicant
 * then corrects that field themselves from the Check Application Status
 * page (POST /api/applications/[id]/field-queries). Moves the application
 * to query_raised and notifies the applicant the same way a document query
 * does.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('document:verify')

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

  const parsed = raiseSchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 })
  }

  const { remarks } = parsed.data
  const fieldKeys = parsed.data.fieldKeys ?? (parsed.data.fieldKey ? [parsed.data.fieldKey] : [])
  const isMultiRequest = Array.isArray(parsed.data.fieldKeys)

  if (fieldKeys.length === 0) {
    return NextResponse.json({ error: 'No field specified.' }, { status: 400 })
  }

  try {
    const [application] = await query<ApplicationRow[]>(
      `SELECT status, application_number, mobile_number, email, representative_name
       FROM applications WHERE id = ? LIMIT 1`,
      [applicationId]
    )

    if (!application) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    if (!QUERYABLE_STATUSES.includes(application.status)) {
      return NextResponse.json(
        { error: `This application is "${application.status}" and cannot have a query raised against it.` },
        { status: 409 }
      )
    }

    const raised: Array<{ fieldKey: string; label: string; queryId: number }> = []
    const skipped: Array<{ fieldKey: string; reason: string }> = []

    // Each field is resolved + conflict-checked + inserted inside its own
    // transaction (same pattern as the original single-field flow) — one
    // field failing (already queried, not queryable) never aborts the rest
    // of the batch, it's just reported back as skipped.
    for (const fieldKey of fieldKeys) {
       
      const field = await resolveQueryableField(query, applicationId, fieldKey)

      if (!field) {
        skipped.push({ fieldKey, reason: 'not queryable' })
        continue
      }

       
      const result = await withTransaction(async q => {
        const existing = await q<Array<{ id: number }>>(
          `SELECT id FROM application_field_queries
           WHERE application_id = ? AND field_key = ? AND status = 'open'
           LIMIT 1 FOR UPDATE`,
          [applicationId, fieldKey]
        )

        if (existing.length > 0) return { conflict: true as const }

        const inserted = await q<{ insertId: number }>(
          `INSERT INTO application_field_queries
             (application_id, field_key, field_label, remarks, previous_value, raised_by_user_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [applicationId, fieldKey, field.label, remarks, field.currentValue, session.userId]
        )

        return { conflict: false as const, queryId: inserted.insertId }
      })

      if (result.conflict) {
        skipped.push({ fieldKey, reason: 'already has an open query' })
        continue
      }

      raised.push({ fieldKey, label: field.label, queryId: result.queryId })
    }

    if (raised.length === 0) {
      return NextResponse.json(
        { error: isMultiRequest ? 'No fields could be queried.' : 'There is already an open query on this field.', skipped },
        { status: 409 }
      )
    }

    // Single status update covering the whole batch, regardless of how many
    // fields were queried.
    await query(`UPDATE applications SET status = 'query_raised' WHERE id = ? AND status IN ('under_review', 'payment_success')`, [
      applicationId
    ])

    for (const item of raised) {
       
      await logAudit({
        actorUserId: session.userId,
        actorRoleKey: session.role.key,
        action: 'field.query_raised',
        module: 'applications',
        entityType: 'application',
        entityId: String(applicationId),
        previousValue: { status: application.status },
        newValue: { status: 'query_raised', fieldKey: item.fieldKey, fieldLabel: item.label, remarks }
      })
    }

    // One combined notification for the whole batch (not one per field) —
    // swallows send failures internally and is bounded by provider
    // timeouts, so it never blocks or fails the query action itself.
    await notifyFieldQueries({
      applicationId,
      applicationNumber: application.application_number,
      mobileNumber: application.mobile_number,
      email: application.email,
      representativeName: application.representative_name,
      remarks,
      fields: raised.map(r => ({ label: r.label, remarks }))
    })

    return NextResponse.json(
      isMultiRequest
        ? { success: true, raised, skipped }
        : { success: true, queryId: raised[0].queryId }
    )
  } catch (error) {
    if ((error as { code?: string } | null)?.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json({ error: 'Field queries are not enabled yet (migration 0080 pending).' }, { status: 503 })
    }

    logServerError('api.admin.applications.field_queries.raise', error, { applicationId, fieldKeys })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

/**
 * Withdraws an open field query (e.g. raised by mistake). If nothing else is
 * still waiting on the applicant, the application returns to under_review.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('document:verify')

  const { id } = await params
  const applicationId = decodeId(id)
  const queryId = Number(new URL(request.url).searchParams.get('queryId'))

  if (applicationId === null || !Number.isInteger(queryId) || queryId <= 0) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  try {
    const cancelled = await withTransaction(async q => {
      const rows = await q<Array<{ field_key: string; field_label: string }>>(
        `SELECT field_key, field_label FROM application_field_queries
         WHERE id = ? AND application_id = ? AND status = 'open'
         LIMIT 1 FOR UPDATE`,
        [queryId, applicationId]
      )

      if (rows.length === 0) return null

      await q(`UPDATE application_field_queries SET status = 'cancelled' WHERE id = ?`, [queryId])

      const openFields = await countOpenFieldQueries(applicationId, q)

      const [openDocs] = await q<Array<{ n: number }>>(
        `SELECT COUNT(*) AS n FROM application_documents WHERE application_id = ? AND verification_status = 'query'`,
        [applicationId]
      )

      if (openFields === 0 && Number(openDocs.n) === 0) {
        await q(`UPDATE applications SET status = 'under_review' WHERE id = ? AND status = 'query_raised'`, [applicationId])
      }

      return rows[0]
    })

    if (!cancelled) {
      return NextResponse.json({ error: 'This query is no longer open.' }, { status: 409 })
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'field.query_cancelled',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId),
      newValue: { queryId, fieldKey: cancelled.field_key, fieldLabel: cancelled.field_label }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.applications.field_queries.cancel', error, { applicationId, queryId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
