import { NextResponse } from 'next/server'
import { z } from 'zod'

import { query } from '@/lib/db/client'
import { maskAadhaar } from '@/lib/applications/aadhaar-crypto'
import { requestOtp, verifyOtp } from '@/lib/notifications/otp'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

const printLookupSchema = z.object({
  applicationNumber: z
    .string()
    .trim()
    .min(1)
    .max(32)

    // Accepts both the current "IGM-" prefix and the earlier "KDB-" prefix,
    // so applications created before that naming change remain printable.
    .regex(/^(?:IGM|KDB)-\d{4}-\d{6}$/, 'Enter a valid application number'),

  // Present only on the second call, once the applicant has the WhatsApp code.
  otpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .optional()
})

type PrintRow = {
  id: number
  application_number: string
  status: string
  mobile_number: string
  alternate_mobile: string | null
  email: string
  organisation_name: string
  representative_name: string
  father_name: string
  aadhaar_last4: string
  address: string
  state: string
  district: string
  pin_code: string
  work_purpose: string
  achievement_experience: string
  remarks: string | null
  submitted_at: string | null
  category_name: string
  category_name_hi: string | null
  shop_option_label: string | null
  fee_paise: number | null
}

function maskMobile(mobile: string): string {
  return `XXXXXX${mobile.slice(-4)}`
}

/**
 * Public "Print Application" lookup — same two-phase OTP-gated ownership
 * pattern as /api/applications/status (application number alone only
 * triggers a WhatsApp OTP; the code releases the data), but returns the
 * fuller set of fields needed to render a printable application summary
 * instead of just a status label. Aadhaar is never returned beyond its
 * already-masked last4 form (see aadhaar-crypto.ts) — this is a public,
 * unauthenticated-by-login endpoint, so it must never expose more than the
 * applicant already knows about their own submission.
 */
export async function POST(request: Request) {
  const { ipAddress } = getRequestMeta(request)
  const rateLimitKey = ipAddress ?? 'unknown'

  if (isRateLimited('applications.print', rateLimitKey, RATE_LIMITS.statusLookup)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = printLookupSchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid application number.' }, { status: 400 })
  }

  try {
    const rows = await query<PrintRow[]>(
      `SELECT a.id, a.application_number, a.status, a.mobile_number, a.alternate_mobile, a.email,
              a.organisation_name, a.representative_name, a.father_name, a.aadhaar_last4,
              a.address, a.state, a.district, a.pin_code, a.work_purpose, a.achievement_experience,
              a.remarks, a.submitted_at,
              c.name AS category_name, c.name_hi AS category_name_hi, c.fee_paise,
              cso.label AS shop_option_label
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN category_shop_options cso ON cso.id = a.shop_option_id
       WHERE a.application_number = ? AND a.status != 'draft'
       LIMIT 1`,
      [parsed.data.applicationNumber]
    )

    const application = rows[0]

    // Same generic message whether the application doesn't exist or is still
    // a draft (never submitted) — no enumeration oracle either way.
    if (!application) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    const mobileWithCountryCode = `+91${application.mobile_number}`

    // Phase 1: no OTP code yet — send one and stop. Never reveal application data here.
    if (!parsed.data.otpCode) {
      if (isRateLimited('otp.request.mobile', application.mobile_number, RATE_LIMITS.otpRequest)) {
        return NextResponse.json(
          { error: 'Too many verification codes requested for this application. Please try again later.' },
          { status: 429 }
        )
      }

      const sent = await requestOtp({
        mobileNumber: mobileWithCountryCode,
        purpose: 'print_application',
        applicationId: application.id,
        ipAddress
      })

      if (!sent.ok) {
        return NextResponse.json({ error: sent.error }, { status: 502 })
      }

      return NextResponse.json({ otpRequired: true, maskedMobile: maskMobile(application.mobile_number) })
    }

    // Phase 2: verify the code before releasing any application data.
    if (isRateLimited('otp.verify.mobile', application.mobile_number, RATE_LIMITS.otpVerify)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const verification = await verifyOtp({
      mobileNumber: mobileWithCountryCode,
      purpose: 'print_application',
      code: parsed.data.otpCode
    })

    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: 400 })
    }

    const fieldValues = await query<Array<{ label: string; labelHi: string | null; value: string }>>(
      `SELECT cfd.label, cfd.label_hi AS labelHi, afv.value
       FROM application_field_values afv
       JOIN category_field_definitions cfd ON cfd.id = afv.field_definition_id
       WHERE afv.application_id = ?
       ORDER BY cfd.display_order ASC`,
      [application.id]
    )

    return NextResponse.json({
      applicationNumber: application.application_number,
      status: application.status,
      categoryName: application.category_name,
      categoryNameHi: application.category_name_hi,
      shopOptionLabel: application.shop_option_label,
      feePaise: application.fee_paise,
      submittedAt: application.submitted_at,
      organisationName: application.organisation_name,
      representativeName: application.representative_name,
      fatherName: application.father_name,
      aadhaarMasked: maskAadhaar(application.aadhaar_last4),
      email: application.email,
      mobileNumber: maskMobile(application.mobile_number),
      alternateMobile: application.alternate_mobile ? maskMobile(application.alternate_mobile) : null,
      address: application.address,
      state: application.state,
      district: application.district,
      pinCode: application.pin_code,
      workPurpose: application.work_purpose,
      achievementExperience: application.achievement_experience,
      remarks: application.remarks,
      fieldValues
    })
  } catch (error) {
    logServerError('api.applications.print', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
