import { NextResponse } from 'next/server'
import { z } from 'zod'

import { maskAadhaar } from '@/lib/applications/aadhaar-crypto'
import { verifyAccessToken } from '@/lib/applications/access-token'
import { assertOwnsEditableDraft, ApplicationStateError, updateDraftApplication } from '@/lib/applications/create-application'
import { applicationSubmissionSchema } from '@/lib/applications/schema'
import { SubmissionValidationError, validateSubmissionAgainstCategory } from '@/lib/applications/validate-submission'
import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

type ApplicationDetailRow = {
  id: number
  application_number: string
  access_token_hash: string
  status: string
  category_name: string
  organisation_name: string
  representative_name: string
  aadhaar_last4: string
  mobile_number: string
  submitted_at: string | null
  created_at: string
}

/**
 * Retrieves one application for the applicant's own review/confirmation/
 * status view. Ownership is proven by the access token (bearer header),
 * never by the numeric id alone — this is the IDOR defense for this
 * endpoint. Aadhaar is returned masked only; the full value is never sent
 * to any client, applicant or admin, from this endpoint (see
 * .ai/SECURITY.md Section 11 and QR_VERIFICATION.md-style masking).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('applications.detail', ipAddress ?? 'unknown', RATE_LIMITS.statusLookup)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  const { id } = await params
  const applicationId = Number(id)

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const authHeader = request.headers.get('authorization')
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
  }

  try {
    const rows = await query<ApplicationDetailRow[]>(
      `SELECT a.id, a.application_number, a.access_token_hash, a.status,
              c.name AS category_name, a.organisation_name, a.representative_name,
              a.aadhaar_last4, a.mobile_number, a.submitted_at, a.created_at
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       WHERE a.id = ?
       LIMIT 1`,
      [applicationId]
    )

    const application = rows[0]

    // Same generic response whether not-found or wrong token — avoids
    // confirming which application ids exist to an unauthenticated caller.
    if (!application || !verifyAccessToken(accessToken, application.access_token_hash)) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    return NextResponse.json({
      applicationNumber: application.application_number,
      status: application.status,
      categoryName: application.category_name,
      organisationName: application.organisation_name,
      representativeName: application.representative_name,
      aadhaarMasked: maskAadhaar(application.aadhaar_last4),
      mobileMasked: `${application.mobile_number.slice(0, 2)}XXXXXX${application.mobile_number.slice(-2)}`,
      submittedAt: application.submitted_at,
      createdAt: application.created_at
    })
  } catch (error) {
    logServerError('api.applications.detail', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

const updateSchema = applicationSubmissionSchema
  .omit({ declaration: true })
  .extend({ accessToken: z.string().trim().min(1).max(128) })

const MAX_BODY_BYTES = 64 * 1024

/**
 * Overwrites a draft application's placeholder data with the applicant's
 * real entries from the single-page form, immediately before finalize.
 * Re-validates against live category configuration exactly like initial
 * draft creation — never trusts that the earlier draft was already correct.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('applications.update', ipAddress ?? 'unknown', RATE_LIMITS.applicationSubmit)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const { id } = await params
  const applicationId = Number(id)

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: 'Invalid application.' }, { status: 400 })
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0')

  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request too large.' }, { status: 413 })
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(rawBody)

  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))

    return NextResponse.json({ error: 'Validation failed.', fieldErrors }, { status: 400 })
  }

  try {
    // Ownership/state check runs BEFORE any category validation — an
    // unauthenticated or out-of-state request must never cause business
    // logic to execute first (see CLAUDE.md Section 15, .ai/SECURITY.md).
    await assertOwnsEditableDraft(applicationId, parsed.data.accessToken)

    const fullInput = { ...parsed.data, declaration: { informationCorrect: true as const, agreedToTerms: true as const } }
    const validated = await validateSubmissionAgainstCategory(fullInput)

    await updateDraftApplication(applicationId, fullInput, validated)

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof SubmissionValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }

    if (error instanceof ApplicationStateError) {
      const status = error.message === 'Not authorized.' ? 401 : error.message === 'Application not found.' ? 404 : 409

      return NextResponse.json({ error: error.message }, { status })
    }

    logServerError('api.applications.update', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
