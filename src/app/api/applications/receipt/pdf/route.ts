import { NextResponse } from 'next/server'

import { findReceiptRow, renderReceiptPdfResponse } from '@/lib/payments/receipt-pdf'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

const APPLICATION_NUMBER_PATTERN = /^(?:IGM|KDB)-\d{4}-\d{6}$/

/** Last 10 digits only, so "+91 98765-43210" and "9876543210" compare equal. */
function normalizeMobile(raw: string): string {
  return raw.replace(/\D/g, '').slice(-10)
}

/**
 * Receipt download WITHOUT an OTP, for the header "Download Receipt" link
 * (a returning applicant has no session access token). Ownership proof is
 * the application number AND the mobile number registered on it — both must
 * match. Weaker than the OTP flow by design (explicit product request): a
 * receipt holds no Aadhaar/address, only name, firm, category and the fee
 * paid. Mitigations: strict per-IP rate limit, mobile sent in a POST body
 * (never a URL/log line), and ONE generic error for "no such application",
 * "mobile mismatch" and "not paid" alike, so the endpoint cannot be used to
 * discover which application numbers exist or who owns them.
 */
export async function POST(request: Request) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('applications.receipt.lookup', ipAddress ?? 'unknown', RATE_LIMITS.receiptLookup)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  let body: { applicationNumber?: unknown; mobileNumber?: unknown; lang?: unknown }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const applicationNumber = typeof body.applicationNumber === 'string' ? body.applicationNumber.trim().toUpperCase() : ''
  const mobile = typeof body.mobileNumber === 'string' ? normalizeMobile(body.mobileNumber) : ''
  const lang = body.lang === 'hi' ? 'hi' : 'en'

  if (!APPLICATION_NUMBER_PATTERN.test(applicationNumber) || mobile.length !== 10) {
    return NextResponse.json({ error: 'Enter a valid application number and 10-digit mobile number.' }, { status: 400 })
  }

  const notFound = () =>
    NextResponse.json(
      { error: 'No paid application found for these details. Check the application number and registered mobile number.' },
      { status: 404 }
    )

  try {
    const row = await findReceiptRow('a.application_number = ?', applicationNumber)

    if (!row || normalizeMobile(row.mobile_number) !== mobile || !row.payment_id || row.payment_status !== 'success') {
      return notFound()
    }

    return await renderReceiptPdfResponse(row, lang)
  } catch (error) {
    logServerError('api.applications.receipt.lookup', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
