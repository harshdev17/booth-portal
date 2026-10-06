import { NextResponse } from 'next/server'

import { query } from '@/lib/db/client'
import { decryptAadhaar } from '@/lib/applications/aadhaar-crypto'
import { logAudit } from '@/lib/audit/log'
import { renderHtmlToPdf } from '@/lib/pdf/browser'
import { applicationHtml } from '@/lib/pdf/templates'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

type ApplicationRow = {
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
  created_at: string
  category_name: string
  category_name_hi: string | null
  shop_option_label: string | null
  fee_paise: number | null
}

/**
 * Admin-side counterpart to GET /api/applications/print/pdf — same
 * application-summary PDF, but keyed by this application's own id and
 * authorized by the admin's session/RBAC (application:view) instead of the
 * applicant's OTP-verified mobile number. This is the exact same data
 * already shown on /admin/applications/[id] for anyone with that
 * permission, so no extra OTP/ownership proof is needed here — just a
 * downloadable copy of what the admin can already see.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('application:view')

  const { id } = await params
  const applicationId = decodeId(id)

  if (applicationId === null) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  try {
    const rows = await query<ApplicationRow[]>(
      `SELECT a.id, a.application_number, a.status, a.mobile_number, a.alternate_mobile, a.email,
              a.organisation_name, a.representative_name, a.father_name, a.aadhaar_ciphertext,
              a.address, a.state, a.district, a.pin_code, a.work_purpose, a.achievement_experience,
              a.remarks, a.submitted_at, a.created_at,
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

    if (!application) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
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
      'en'
    )

    const buffer = await renderHtmlToPdf(html)

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application.summary_downloaded',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId)
    })

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Application-${application.application_number}.pdf"`,
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (error) {
    logServerError('api.admin.applications.summary.pdf', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
