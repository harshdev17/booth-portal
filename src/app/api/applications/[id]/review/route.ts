import { NextResponse } from 'next/server'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

type ApplicationRow = {
  id: number
  application_number: string
  access_token_hash: string
  status: string
  category_id: number
  category_name: string
  shop_option_id: number | null
  email: string
  organisation_name: string
  representative_name: string
  father_name: string
  aadhaar_last4: string
  address: string
  state: string
  district: string
  pin_code: string
  mobile_number: string
  alternate_mobile: string | null
  work_purpose: string
  achievement_experience: string
  remarks: string | null
}

/**
 * Full (but still sensitive-value-masked) application data for the Review
 * page — a superset of what GET /api/applications/[id] returns (that
 * endpoint serves the public Status page and intentionally omits most
 * fields). Ownership is proven the same way as every other application
 * endpoint: bearer access token, verified server-side, never by the numeric
 * id alone. Aadhaar is still returned masked only — the Review page never
 * needs, and must never receive, the full number (see .ai/SECURITY.md
 * Section 11).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('applications.review', ipAddress ?? 'unknown', RATE_LIMITS.statusLookup)) {
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
    const rows = await query<ApplicationRow[]>(
      `SELECT a.id, a.application_number, a.access_token_hash, a.status, a.category_id, c.name AS category_name,
              c.selection_method, c.fee_paise, c.fee_base_paise, c.gst_percent,
              a.shop_option_id, a.email, a.organisation_name, a.representative_name, a.father_name,
              a.aadhaar_last4, a.address, a.state, a.district, a.pin_code, a.mobile_number, a.alternate_mobile,
              a.work_purpose, a.achievement_experience, a.remarks
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       WHERE a.id = ?
       LIMIT 1`,
      [applicationId]
    )

    const application = rows[0] as ApplicationRow & {
      selection_method?: string
      fee_paise?: number | null
      fee_base_paise?: number | null
      gst_percent?: number | string | null
    }

    // Same generic response whether not-found or wrong token — avoids
    // confirming which application ids exist to an unauthenticated caller.
    if (!application || !verifyAccessToken(accessToken, application.access_token_hash)) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    if (application.status !== 'draft') {
      return NextResponse.json({ error: 'This application has already been submitted.' }, { status: 409 })
    }

    let shopOptionLabel: string | null = null

    if (application.shop_option_id) {
      const shopRows = await query<Array<{ label: string }>>(
        `SELECT label FROM category_shop_options WHERE id = ? LIMIT 1`,
        [application.shop_option_id]
      )

      shopOptionLabel = shopRows[0]?.label ?? null
    }

    const fieldValueRows = await query<Array<{ label: string; value: string }>>(
      `SELECT d.label, v.value
       FROM application_field_values v
       JOIN category_field_definitions d ON d.id = v.field_definition_id
       WHERE v.application_id = ?
       ORDER BY d.display_order ASC`,
      [applicationId]
    )

    const documentRows = await query<Array<{ label: string; verification_status: string; original_filename: string }>>(
      `SELECT dd.label, doc.verification_status, doc.original_filename
       FROM application_documents doc
       JOIN category_document_definitions dd ON dd.id = doc.document_definition_id
       WHERE doc.application_id = ?
       ORDER BY dd.display_order ASC`,
      [applicationId]
    )

    return NextResponse.json({
      applicationNumber: application.application_number,
      categoryName: application.category_name,
      selectionMethod: application.selection_method,
      feePaise: application.fee_paise,
      feeBasePaise: application.fee_base_paise,
      gstPercent: application.gst_percent ? Number(application.gst_percent) : null,
      common: {
        email: application.email,
        organisationName: application.organisation_name,
        representativeName: application.representative_name,
        fatherName: application.father_name,
        aadhaarMasked: `XXXX-XXXX-${application.aadhaar_last4}`,
        address: application.address,
        state: application.state,
        district: application.district,
        pinCode: application.pin_code,
        mobileNumber: application.mobile_number,
        alternateMobile: application.alternate_mobile,
        workPurpose: application.work_purpose,
        achievementExperience: application.achievement_experience,
        remarks: application.remarks
      },
      shopOptionLabel,
      categoryFields: fieldValueRows,
      documents: documentRows.map(d => ({
        label: d.label,
        uploaded: true,
        verificationStatus: d.verification_status,
        originalFilename: d.original_filename
      }))
    })
  } catch (error) {
    logServerError('api.applications.review', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
