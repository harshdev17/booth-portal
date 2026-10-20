import { NextResponse } from 'next/server'

import { findAllotmentLetterRow, renderAllotmentLetterPdfResponse } from '@/lib/allotment/allotment-letter-pdf'
import { allotmentLetterHtml } from '@/lib/pdf/templates'
import { logAudit } from '@/lib/audit/log'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('application:view')

  const { searchParams } = new URL(request.url)
  const wantsHtml = searchParams.get('format') === 'html'
  const lang = searchParams.get('lang') === 'hi' ? 'hi' : 'en'

  const { id } = await params
  const applicationId = decodeId(id) ?? (Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : null)

  if (applicationId === null) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  try {
    const application = await findAllotmentLetterRow('a.id = ?', applicationId)

    if (!application) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    if (!application.stall_number) {
      return NextResponse.json(
        { error: 'No booth/stall has been allotted to this application yet.' },
        { status: 400 }
      )
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application.allotment_letter_downloaded',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId)
    })

    if (wantsHtml) {
      const html = allotmentLetterHtml(
        {
          applicationNumber: application.application_number,
          organisationName: application.organisation_name,
          representativeName: application.representative_name,
          fatherName: application.father_name,
          categoryName: application.category_name,
          categoryNameHi: application.category_name_hi,
          stallNumber: application.stall_number,
          stallDirection: application.stall_direction,
          mobileNumber: application.mobile_number,
          email: application.email,
          address: application.address,
          allotmentAmountPaise: application.allotment_amount_paise,
          allotmentPaidAt: application.allotment_paid_at,
          submittedAt: application.submitted_at
        },
        lang
      )

      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' }
      })
    }

    return await renderAllotmentLetterPdfResponse(application, lang)
  } catch (error) {
    logServerError('admin.allotment_letter.pdf', error)

    return NextResponse.json({ error: 'Unable to generate allotment letter.' }, { status: 500 })
  }
}
