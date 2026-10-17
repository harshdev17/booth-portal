import { NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

import { decodeApplicationNumber } from '@/lib/security/opaque-id'

const summarySchema = z
  .object({
    applicationNumber: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .regex(/^(?:IGM|KDB)-\d{4}-\d{6}$/, 'Enter a valid application number'),
    accessToken: z.string().trim().min(1).max(128).optional(),
    token: z.string().trim().min(1).max(2048).optional()
  })
  .refine(data => !!data.accessToken || !!data.token, {
    message: 'Either accessToken or encrypted token is required.'
  })

/**
 * Application summary for the pages an applicant lands on immediately after
 * finalizing (Success, Payment) — the SAME browser session that was just
 * issued the access token, or verified via the cryptographically signed
 * encryptedToken parameter.
 */
export async function POST(request: Request) {
  const { ipAddress } = getRequestMeta(request)
  const rateLimitKey = ipAddress ?? 'unknown'

  if (isRateLimited('applications.summary', rateLimitKey, RATE_LIMITS.statusLookup)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = summarySchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid application number and access code.' }, { status: 400 })
  }

  try {
    const rows = await query<
      Array<{
        id: number
        status: string
        access_token_hash: string
        representative_name: string
        organisation_name: string
        mobile_number: string
        category_name: string
        category_name_hi: string | null
        category_slug: string
        fee_paise: number | null
        fee_base_paise: number | null
        gst_percent: number | string | null
        submitted_at: string | null
        payment_id: number | null
        payment_status: string | null
        amount_paise: number | null
        razorpay_payment_id: string | null
        paid_at: string | null
      }>
    >(
      `SELECT a.id, a.status, a.access_token_hash, a.representative_name, a.organisation_name, a.mobile_number,
              c.name AS category_name, c.name_hi AS category_name_hi, c.slug AS category_slug,
              c.fee_paise, c.fee_base_paise, c.gst_percent, a.submitted_at,
              p.id AS payment_id, p.status AS payment_status, p.amount_paise,
              (SELECT pt.razorpay_payment_id FROM payment_transactions pt
               WHERE pt.payment_id = p.id AND pt.razorpay_payment_id IS NOT NULL
               ORDER BY pt.created_at DESC LIMIT 1) AS razorpay_payment_id,
              (SELECT pt.created_at FROM payment_transactions pt
               WHERE pt.payment_id = p.id AND pt.type IN ('checkout_success', 'webhook_confirmed')
               ORDER BY pt.created_at DESC LIMIT 1) AS paid_at
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN payments p ON p.application_id = a.id AND p.purpose = 'registration'
       WHERE a.application_number = ?
       LIMIT 1`,
      [parsed.data.applicationNumber]
    )

    const application = rows[0]

    if (!application) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    let isAuthorized = false

    if (parsed.data.token) {
      const decodedNumber = decodeApplicationNumber(parsed.data.token)

      if (decodedNumber === parsed.data.applicationNumber) {
        isAuthorized = true
      }
    }

    if (!isAuthorized && parsed.data.accessToken) {
      isAuthorized = verifyAccessToken(parsed.data.accessToken, application.access_token_hash)
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Application not found or access code incorrect.' }, { status: 404 })
    }

    return NextResponse.json({
      applicationId: application.id,
      status: application.status,
      categoryName: application.category_name,
      categoryNameHi: application.category_name_hi,
      categorySlug: application.category_slug,
      representativeName: application.representative_name,
      organisationName: application.organisation_name,
      mobileNumber: application.mobile_number,
      feePaise: application.fee_paise,
      feeBasePaise: application.fee_base_paise,
      gstPercent: application.gst_percent ? Number(application.gst_percent) : null,
      submittedAt: application.submitted_at,
      paymentId: application.payment_id,
      paymentStatus: application.payment_status,
      amountPaise: application.amount_paise,
      razorpayPaymentId: application.razorpay_payment_id,
      paidAt: application.paid_at
    })
  } catch (error) {
    logServerError('api.applications.summary', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
