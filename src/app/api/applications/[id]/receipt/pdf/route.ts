import { NextResponse } from 'next/server'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { findReceiptRow, renderReceiptPdfResponse } from '@/lib/payments/receipt-pdf'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

/**
 * Same data and ownership model as GET /api/applications/[id]/receipt
 * (bearer access token, same browser session) — this route renders that
 * same data straight to a downloadable PDF file instead of JSON, so the
 * applicant gets one click to an actual .pdf rather than having to use the
 * browser's own Print → Save as PDF dialog on the on-screen receipt.
 * (A returning visitor without the token uses POST /api/applications/receipt/pdf.)
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('applications.receipt', ipAddress ?? 'unknown', RATE_LIMITS.statusLookup)) {
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
    const application = await findReceiptRow('a.id = ?', applicationId)

    if (!application || !verifyAccessToken(accessToken, application.access_token_hash)) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    if (!application.payment_id || application.payment_status !== 'success') {
      return NextResponse.json({ error: 'No successful payment found for this application yet.' }, { status: 404 })
    }

    return await renderReceiptPdfResponse(application, lang)
  } catch (error) {
    logServerError('api.applications.receipt.pdf', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
