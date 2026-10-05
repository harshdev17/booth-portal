import { NextResponse } from 'next/server'

import { createDraftApplication, DuplicateApplicationError } from '@/lib/applications/create-application'
import { applicationSubmissionSchema } from '@/lib/applications/schema'
import { SubmissionValidationError, validateSubmissionAgainstCategory } from '@/lib/applications/validate-submission'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

// Hard cap on request body size, independent of any platform-level limit —
// see .ai/SECURITY.md "strict request body size limits". This is the JSON
// submission only; file uploads are a separate, larger-but-still-bounded
// endpoint (see src/app/api/applications/[id]/documents/route.ts).
const MAX_BODY_BYTES = 64 * 1024

/**
 * Creates a DRAFT application (status='draft') once the applicant has
 * completed the Applicant Info / Address / Category-Specific steps. This is
 * NOT the final submission — it exists so the client receives an
 * application id + access token to upload documents against (see
 * .ai/DECISIONS.md interim ownership approach). Final submission happens at
 * POST /api/applications/[id]/finalize after the Review + Declaration step.
 */
export async function POST(request: Request) {
  const { ipAddress, userAgent } = getRequestMeta(request)
  const rateLimitKey = ipAddress ?? 'unknown'

  if (isRateLimited('applications.draft', rateLimitKey, RATE_LIMITS.applicationSubmit)) {
    return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
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

  const parsed = applicationSubmissionSchema.safeParse(rawBody)

  if (!parsed.success) {
    // Field-level messages only — never echo back the raw invalid payload
    // (avoids reflecting attacker-controlled content into the response).
    const fieldErrors = parsed.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message
    }))

    return NextResponse.json({ error: 'Validation failed.', fieldErrors }, { status: 400 })
  }

  try {
    // This is the SILENT placeholder-data draft created the instant the
    // apply page loads (see ApplicationFormOrchestrator.tsx createDraft()) —
    // it only exists so document uploads have an application id to attach
    // to, and it deliberately sends empty/placeholder categoryFields. Real
    // category-specific required fields are enforced for real on the
    // PATCH (pre-review save) and finalize steps, which run this same
    // validator WITHOUT this flag.
    const validated = await validateSubmissionAgainstCategory(parsed.data, { skipCategoryFieldRequiredCheck: true })
    const result = await createDraftApplication(parsed.data, validated, { ipAddress })

    return NextResponse.json(
      {
        applicationNumber: result.applicationNumber,
        applicationId: result.applicationId,
        accessToken: result.accessToken
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof SubmissionValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }

    if (error instanceof DuplicateApplicationError) {
      return NextResponse.json({ error: error.message, code: 'duplicate_application' }, { status: 409 })
    }

    logServerError('api.applications.create', error, { userAgent })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
