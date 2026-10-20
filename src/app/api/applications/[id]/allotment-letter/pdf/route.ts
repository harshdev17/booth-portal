import { NextResponse } from 'next/server'

import { findAllotmentLetterRow, renderAllotmentLetterPdfResponse } from '@/lib/allotment/allotment-letter-pdf'
import { verifyAccessToken } from '@/lib/applications/access-token'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

/**
 * Same data and ownership model as the admin allotment-letter PDF route
 * (GET /api/admin/applications/[id]/allotment-letter/pdf) — both call
 * findAllotmentLetterRow()/renderAllotmentLetterPdfResponse() from
 * src/lib/allotment/allotment-letter-pdf.ts, so admin and applicant always
 * see the identical letter content. Ownership here is the bearer access
 * token issued by POST /api/applications/status after OTP verification
 * (same pattern as GET /api/applications/[id]/receipt/pdf).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('applications.allotment-letter', ipAddress ?? 'unknown', RATE_LIMITS.statusLookup)) {
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

  const lang = new URL(request.url).searchParams.get('lang') === 'hi' ? 'hi' : 'en'

  try {
    const application = await findAllotmentLetterRow('a.id = ?', applicationId)

    if (!application || !verifyAccessToken(accessToken, application.access_token_hash)) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    if (!application.stall_number) {
      return NextResponse.json(
        { error: 'No booth/stall has been allotted to this application yet.' },
        { status: 400 }
      )
    }

    return await renderAllotmentLetterPdfResponse(application, lang)
  } catch (error) {
    logServerError('api.applications.allotment-letter.pdf', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
