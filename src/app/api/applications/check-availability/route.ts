import { NextResponse } from 'next/server'
import { z } from 'zod'

import { hashAadhaar } from '@/lib/applications/aadhaar-crypto'
import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

const checkSchema = z.object({
  field: z.enum(['mobileNumber', 'aadhaarNumber', 'email']),
  value: z.string().trim().min(1).max(191),

  // Excludes the caller's own in-progress draft from the uniqueness check —
  // otherwise re-blurring a field on your own draft would report itself as
  // a duplicate.
  applicationId: z.coerce.number().int().positive().optional()
})

/**
 * Live "is this already taken" check for the applicant-details step, called
 * on blur — reported live that a duplicate mobile/Aadhaar/email was only
 * ever caught at final submit (after OTP), which wastes the applicant's
 * time filling in the rest of the form first. This is a UX convenience
 * only: hasActiveDuplicateApplication (validate-submission.ts) and
 * finalizeApplication's own re-check remain the authoritative, final gate —
 * this endpoint can say "available" and still have finalize reject it if
 * another application claimed the same value in between (TOCTOU), which is
 * expected and already handled by the real check.
 *
 * Email was never part of the uniqueness check at all before this — see
 * .ai/CHANGELOG.md. Added here as its own independent check (one email, one
 * active application), matching the explicit request ("number, aadhar,
 * email teeno unique").
 */
export async function POST(request: Request) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('applications.check-availability', ipAddress ?? 'unknown', RATE_LIMITS.statusLookup)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = checkSchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  try {
    const { field, value, applicationId } = parsed.data

    let column: string
    let lookupValue: string

    if (field === 'mobileNumber') {
      column = 'mobile_number'
      lookupValue = value.replace(/\D/g, '').slice(-10)
    } else if (field === 'aadhaarNumber') {
      column = 'aadhaar_hash'
      lookupValue = hashAadhaar(value)
    } else {
      column = 'email'
      lookupValue = value.toLowerCase()
    }

    const params: unknown[] = [lookupValue]
    let excludeClause = ''

    if (applicationId) {
      excludeClause = ' AND id != ?'
      params.push(applicationId)
    }

    const sql =
      field === 'email'
        ? `SELECT id FROM applications WHERE LOWER(${column}) = ?${excludeClause} AND status NOT IN ('draft', 'rejected', 'cancelled', 'not_selected') LIMIT 1`
        : `SELECT id FROM applications WHERE ${column} = ?${excludeClause} AND status NOT IN ('draft', 'rejected', 'cancelled', 'not_selected') LIMIT 1`

    const rows = await query<Array<{ id: number }>>(sql, params)

    return NextResponse.json({ available: rows.length === 0 })
  } catch (error) {
    logServerError('api.applications.check-availability', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
