import { NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { query } from '@/lib/db/client'
import { requestOtp, verifyOtp } from '@/lib/notifications/otp'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

const statusLookupSchema = z.object({
  applicationNumber: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^KDB-\d{4}-\d{6}$/, 'Enter a valid application number'),
  accessToken: z.string().trim().min(1).max(128),

  // Present only on the second call, once the applicant has the WhatsApp code.
  otpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .optional()
})

type StatusRow = {
  id: number
  status: string
  access_token_hash: string
  mobile_number: string
  representative_name: string
  category_name: string
  category_slug: string
  fee_paise: number | null
  fee_base_paise: number | null
  gst_percent: number | string | null
  submitted_at: string | null
}

function maskMobile(mobile: string): string {
  return `XXXXXX${mobile.slice(-4)}`
}

/**
 * Public status lookup by application number, requiring the applicant's own
 * access token — deliberately NOT lookup-by-mobile-number-alone, which
 * would let anyone probe for a mobile number's associated applications.
 *
 * Two-phase, per explicit instruction to add OTP verification on status
 * fetching: (1) app number + access token alone only triggers a WhatsApp OTP
 * to the mobile number already on file for that application — it never
 * returns status data by itself; (2) app number + access token + the 6-digit
 * code returns the actual status (and document list). Knowing the access
 * token is no longer sufficient on its own to read status — this closes the
 * gap where a lost/leaked access token alone would expose it.
 */
export async function POST(request: Request) {
  const { ipAddress } = getRequestMeta(request)
  const rateLimitKey = ipAddress ?? 'unknown'

  if (isRateLimited('applications.status', rateLimitKey, RATE_LIMITS.statusLookup)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = statusLookupSchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid application number and access code.' }, { status: 400 })
  }

  try {
    const rows = await query<StatusRow[]>(
      `SELECT a.id, a.status, a.access_token_hash, a.mobile_number, a.representative_name,
              c.name AS category_name, c.slug AS category_slug,
              c.fee_paise, c.fee_base_paise, c.gst_percent, a.submitted_at
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       WHERE a.application_number = ?
       LIMIT 1`,
      [parsed.data.applicationNumber]
    )

    const application = rows[0]

    if (!application || !verifyAccessToken(parsed.data.accessToken, application.access_token_hash)) {
      return NextResponse.json({ error: 'Application not found or access code incorrect.' }, { status: 404 })
    }

    const mobileWithCountryCode = `+91${application.mobile_number}`

    // Phase 1: no OTP code yet — send one and stop. Never reveal status here.
    if (!parsed.data.otpCode) {
      if (isRateLimited('otp.request.mobile', application.mobile_number, RATE_LIMITS.otpRequest)) {
        return NextResponse.json(
          { error: 'Too many verification codes requested for this application. Please try again later.' },
          { status: 429 }
        )
      }

      const sent = await requestOtp({
        mobileNumber: mobileWithCountryCode,
        purpose: 'status_lookup',
        applicationId: application.id,
        ipAddress
      })

      if (!sent.ok) {
        return NextResponse.json({ error: sent.error }, { status: 502 })
      }

      return NextResponse.json({ otpRequired: true, maskedMobile: maskMobile(application.mobile_number) })
    }

    // Phase 2: verify the code before releasing any status/document data.
    if (isRateLimited('otp.verify.mobile', application.mobile_number, RATE_LIMITS.otpVerify)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const verification = await verifyOtp({
      mobileNumber: mobileWithCountryCode,
      purpose: 'status_lookup',
      code: parsed.data.otpCode
    })

    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: 400 })
    }

    const documents = await query<
      Array<{
        documentKey: string
        label: string
        verificationStatus: string
        verificationRemarks: string | null
        originalFilename: string | null
      }>
    >(
      `SELECT cdd.document_key AS documentKey, cdd.label, ad.verification_status AS verificationStatus,
              ad.verification_remarks AS verificationRemarks, ad.original_filename AS originalFilename
       FROM category_document_definitions cdd
       LEFT JOIN application_documents ad
         ON ad.document_definition_id = cdd.id AND ad.application_id = ?
       WHERE cdd.category_id = (SELECT category_id FROM applications WHERE id = ?)
       ORDER BY cdd.display_order ASC`,
      [application.id, application.id]
    )

    return NextResponse.json({
      applicationId: application.id,
      status: application.status,
      categoryName: application.category_name,
      categorySlug: application.category_slug,
      feePaise: application.fee_paise,
      feeBasePaise: application.fee_base_paise,
      gstPercent: application.gst_percent ? Number(application.gst_percent) : null,
      submittedAt: application.submitted_at,
      documents
    })
  } catch (error) {
    logServerError('api.applications.status', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
