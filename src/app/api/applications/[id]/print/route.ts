import { NextResponse } from 'next/server'

import { decryptAadhaar } from '@/lib/applications/aadhaar-crypto'
import { verifyAccessToken } from '@/lib/applications/access-token'
import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

type PrintRow = {
  id: number
  application_number: string
  access_token_hash: string
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

/**
 * No-OTP application print summary, for an applicant printing/downloading
 * their own just-submitted application from the Success page within the
 * SAME browser tab. Same bearer-access-token ownership model as
 * /api/applications/[id]/receipt — the OTP-gated /print-application flow
 * exists for a LATER return visit where no access token is available, not
 * for this immediate post-submission moment (reported live: having to
 * verify OTP again here, seconds after submitting, was pure friction since
 * ownership is already proven by the token this page already holds).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('applications.print', ipAddress ?? 'unknown', RATE_LIMITS.statusLookup)) {
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

  try {
    const rows = await query<PrintRow[]>(
      `SELECT a.id, a.application_number, a.access_token_hash, a.status, a.mobile_number, a.alternate_mobile, a.email,
              a.organisation_name, a.representative_name, a.father_name, a.aadhaar_ciphertext,
              a.address, a.state, a.district, a.pin_code, a.work_purpose, a.achievement_experience,
              a.remarks, a.submitted_at,
              c.name AS category_name, c.name_hi AS category_name_hi, c.fee_paise,
              cso.label AS shop_option_label
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN category_shop_options cso ON cso.id = a.shop_option_id
       WHERE a.id = ?
       LIMIT 1`,
      [applicationId]
    )

    const application = rows[0]

    if (!application || !verifyAccessToken(accessToken, application.access_token_hash)) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    if (application.status === 'draft') {
      return NextResponse.json({ error: 'This application has not been submitted yet.' }, { status: 404 })
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
    })
  } catch (error) {
    logServerError('api.applications.print', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
