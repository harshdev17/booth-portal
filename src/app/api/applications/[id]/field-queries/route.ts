import { NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { countOpenFieldQueries, resolveQueryableField, writeFieldValue } from '@/lib/applications/field-queries'
import { logAudit } from '@/lib/audit/log'
import { query, withTransaction } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

const respondSchema = z.object({
  answers: z
    .array(
      z.object({
        queryId: z.number().int().positive(),
        value: z.string().max(2048)
      })
    )
    .min(1)
    .max(25)
})

class FieldValidationError extends Error {
  constructor(
    readonly queryId: number,
    message: string
  ) {
    super(message)
  }
}

/**
 * The applicant corrects the specific fields an admin raised a query on.
 * Authorized by the same bearer access token issued after OTP verification
 * on the status page (also used for document re-uploads). Only fields with
 * an OPEN query on this application can be changed — never any other
 * field. All answers are applied in one transaction or none are.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const applicationId = Number(id)
  const { ipAddress } = getRequestMeta(request)

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: 'Invalid application.' }, { status: 400 })
  }

  if (isRateLimited('applications.field_queries', ipAddress ?? 'unknown', RATE_LIMITS.documentUpload)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  const authHeader = request.headers.get('authorization')
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = respondSchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  try {
    const [application] = await query<Array<{ status: string; access_token_hash: string | null }>>(
      `SELECT status, access_token_hash FROM applications WHERE id = ? LIMIT 1`,
      [applicationId]
    )

    if (!application || !application.access_token_hash || !verifyAccessToken(accessToken, application.access_token_hash)) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const changes = await withTransaction(async q => {
      const applied: Array<{ queryId: number; fieldKey: string; fieldLabel: string; previous: string; next: string | null }> = []

      for (const answer of parsed.data.answers) {
         
        const [open] = await q<Array<{ field_key: string; field_label: string }>>(
          `SELECT field_key, field_label FROM application_field_queries
           WHERE id = ? AND application_id = ? AND status = 'open'
           LIMIT 1 FOR UPDATE`,
          [answer.queryId, applicationId]
        )

        if (!open) throw new FieldValidationError(answer.queryId, 'This query has already been answered or withdrawn.')

         
        const field = await resolveQueryableField(q, applicationId, open.field_key)

        if (!field) throw new FieldValidationError(answer.queryId, 'This field can no longer be corrected online.')

        const result = field.validate(answer.value)

        if (!result.ok) throw new FieldValidationError(answer.queryId, result.error)

         
        await writeFieldValue(q, applicationId, open.field_key, result.value)

         
        await q(
          `UPDATE application_field_queries
           SET status = 'responded', previous_value = ?, new_value = ?, responded_at = NOW()
           WHERE id = ?`,
          [field.currentValue, result.value, answer.queryId]
        )

        applied.push({
          queryId: answer.queryId,
          fieldKey: open.field_key,
          fieldLabel: open.field_label,
          previous: field.currentValue,
          next: result.value
        })
      }

      // Back to review only once nothing at all is still waiting on the
      // applicant: no open field query, no document under query, and no
      // required document missing (same rule as a document re-upload).
      const openFields = await countOpenFieldQueries(applicationId, q)

      const [docs] = await q<Array<{ open_docs: number; missing_docs: number }>>(
        `SELECT
           (SELECT COUNT(*) FROM application_documents WHERE application_id = ? AND verification_status = 'query') AS open_docs,
           (SELECT COUNT(*)
              FROM category_document_definitions cdd
              JOIN applications a ON a.id = ? AND cdd.category_id = a.category_id
              LEFT JOIN application_documents ad ON ad.document_definition_id = cdd.id AND ad.application_id = a.id
              WHERE cdd.status = 'active' AND ad.id IS NULL) AS missing_docs`,
        [applicationId, applicationId]
      )

      let returnedToReview = false

      if (openFields === 0 && Number(docs.open_docs) === 0 && Number(docs.missing_docs) === 0) {
        const updated = await q<{ affectedRows: number }>(
          `UPDATE applications SET status = 'under_review' WHERE id = ? AND status = 'query_raised'`,
          [applicationId]
        )

        returnedToReview = updated.affectedRows > 0
      }

      return { applied, returnedToReview }
    })

    await logAudit({
      actorUserId: null,
      actorRoleKey: null,
      action: 'field.query_responded',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId),
      previousValue: { fields: changes.applied.map(c => ({ fieldKey: c.fieldKey, value: c.previous })) },
      newValue: {
        fields: changes.applied.map(c => ({ fieldKey: c.fieldKey, fieldLabel: c.fieldLabel, value: c.next })),
        returnedToReview: changes.returnedToReview
      },
      ipAddress
    })

    return NextResponse.json({ success: true, returnedToReview: changes.returnedToReview })
  } catch (error) {
    if (error instanceof FieldValidationError) {
      return NextResponse.json({ error: error.message, queryId: error.queryId }, { status: 400 })
    }

    logServerError('api.applications.field_queries.respond', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
