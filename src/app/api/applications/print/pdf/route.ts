import { NextResponse } from 'next/server'

import { decryptAadhaar } from '@/lib/applications/aadhaar-crypto'
import { query } from '@/lib/db/client'
import { hasRecentVerifiedOtp } from '@/lib/notifications/otp'
import { renderHtmlToPdf } from '@/lib/pdf/browser'
import { applicationHtml } from '@/lib/pdf/templates'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

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
  aadhaar_ciphertext: Buffer
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

const APPLICATION_NUMBER_PATTERN = /^(?:IGM|KDB)-\d{4}-\d{6}$/

/**
 * Renders the same application summary as POST /api/applications/print's
 * phase-2 response straight to a downloadable PDF. Authorization reuses
 * hasRecentVerifiedOtp() (same helper as the finalize/document-reupload
 * flows) against the application's own mobile number and the
 * 'print_application' OTP purpose, rather than requiring the OTP code
 * again — the applicant already proved ownership moments earlier on
 * /print-application, and the server independently re-checks that proof
 * instead of trusting any client-supplied application data for what ends
 * up in the PDF.
 */
export async function GET(request: Request) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('applications.print', ipAddress ?? 'unknown', RATE_LIMITS.statusLookup)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  const url = new URL(request.url)
  const applicationNumber = url.searchParams.get('applicationNumber')?.trim() ?? ''
  const lang = url.searchParams.get('lang') === 'hi' ? 'hi' : 'en'

  if (!APPLICATION_NUMBER_PATTERN.test(applicationNumber)) {
    return NextResponse.json({ error: 'Enter a valid application number.' }, { status: 400 })
  }

  try {
    const rows = await query<PrintRow[]>(
      `SELECT a.id, a.application_number, a.status, a.mobile_number, a.alternate_mobile, a.email,
              a.organisation_name, a.representative_name, a.father_name, a.aadhaar_ciphertext,
              a.address, a.state, a.district, a.pin_code, a.work_purpose, a.achievement_experience,
              a.remarks, a.submitted_at,
              c.name AS category_name, c.name_hi AS category_name_hi, c.fee_paise,
              cso.label AS shop_option_label
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN category_shop_options cso ON cso.id = a.shop_option_id
       WHERE a.application_number = ? AND a.status != 'draft'
       LIMIT 1`,
      [applicationNumber]
    )

    const application = rows[0]

    if (!application) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    const mobileWithCountryCode = `+91${application.mobile_number}`

    const verified = await hasRecentVerifiedOtp(mobileWithCountryCode, 'print_application', 20)

    if (!verified) {
      return NextResponse.json(
        { error: 'Please verify your mobile number on the Print Application page first.' },
        { status: 401 }
      )
    }

    const fieldValues = await query<Array<{ label: string; labelHi: string | null; value: string }>>(
      `SELECT cfd.label, cfd.label_hi AS labelHi, afv.value
       FROM application_field_values afv
       JOIN category_field_definitions cfd ON cfd.id = afv.field_definition_id
       WHERE afv.application_id = ?
       ORDER BY cfd.display_order ASC`,
      [application.id]
    )

    const html = applicationHtml(
      {
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
        aadhaarNumber: decryptAadhaar(application.aadhaar_ciphertext),
        email: application.email,
        mobileNumber: `+91${application.mobile_number}`,
        alternateMobile: application.alternate_mobile ? `+91${application.alternate_mobile}` : null,
        address: application.address,
        state: application.state,
        district: application.district,
        pinCode: application.pin_code,
        workPurpose: application.work_purpose,
        achievementExperience: application.achievement_experience,
        remarks: application.remarks,
        fieldValues
      },
      lang
    )

    const buffer = await renderHtmlToPdf(html)

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Application-${application.application_number}.pdf"`,
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (error) {
    logServerError('api.applications.print.pdf', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
