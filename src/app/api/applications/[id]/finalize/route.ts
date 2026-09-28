import { NextResponse } from 'next/server'
import { z } from 'zod'

import { ApplicationStateError, DuplicateApplicationError, finalizeApplication } from '@/lib/applications/create-application'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

const finalizeSchema = z.object({
  accessToken: z.string().trim().min(1).max(128),
  declaration: z.object({
    informationCorrect: z.literal(true),
    agreedToTerms: z.literal(true)
  })
})

/**
 * Final submission step: transitions a draft application to
 * 'payment_pending'. Requires the declaration checkboxes to be true in the
 * request body itself (not just checked in the UI) — the server refuses to
 * finalize without them, independent of what the client's form state showed.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('applications.finalize', ipAddress ?? 'unknown', RATE_LIMITS.applicationSubmit)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const { id } = await params
  const applicationId = Number(id)

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: 'Invalid application.' }, { status: 400 })
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = finalizeSchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: 'You must confirm the declarations before submitting.' }, { status: 400 })
  }

  try {
    const result = await finalizeApplication(applicationId, parsed.data.accessToken, { ipAddress })

    return NextResponse.json({
      applicationNumber: result.applicationNumber,
      feePaise: result.feePaise,
      feeBasePaise: result.feeBasePaise,
      gstPercent: result.gstPercent
    })
  } catch (error) {
    if (error instanceof ApplicationStateError) {
      const status =
        error.message === 'Not authorized.'
          ? 401
          : error.message === 'Application not found.'
            ? 404
            : error.message.startsWith('Required document missing')
              ? 400
              : 409

      return NextResponse.json({ error: error.message }, { status })
    }

    if (error instanceof DuplicateApplicationError) {
      return NextResponse.json({ error: error.message, code: 'duplicate_application' }, { status: 409 })
    }

    logServerError('api.applications.finalize', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
