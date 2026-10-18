import { NextResponse } from 'next/server'

import { query } from '@/lib/db/client'
import { logAudit } from '@/lib/audit/log'
import { renderHtmlToPdf } from '@/lib/pdf/browser'
import { allotmentLetterHtml } from '@/lib/pdf/templates'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

type AllotmentRow = {
  id: number
  application_number: string
  organisation_name: string
  representative_name: string
  father_name: string
  mobile_number: string
  email: string
  address: string
  submitted_at: string | null
  status: string
  category_name: string
  category_name_hi: string | null
  stall_number: string | null
  allotment_amount_paise: number | null
  allotment_payment_status: string | null
  allotment_paid_at: string | null
}

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
    const rows = await query<AllotmentRow[]>(
      `SELECT a.id, a.application_number, a.organisation_name, a.representative_name, a.father_name,
              a.mobile_number, a.email, a.address, a.submitted_at, a.status,
              c.name AS category_name, c.name_hi AS category_name_hi,
              COALESCE(su.stall_number, da_su.stall_number) AS stall_number,
              COALESCE(p.amount_paise, da.payment_amount_paise) AS allotment_amount_paise,
              COALESCE(p.status, da.payment_status) AS allotment_payment_status,
              (SELECT pt.created_at FROM payment_transactions pt
                WHERE pt.payment_id = p.id AND pt.type IN ('checkout_success', 'webhook_confirmed')
                ORDER BY pt.created_at DESC LIMIT 1) AS allotment_paid_at
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
       LEFT JOIN payments p ON p.application_id = a.id AND p.purpose = 'pay_now'
       LEFT JOIN direct_allotments da ON da.application_id = a.id AND da.status = 'active'
       LEFT JOIN shop_units da_su ON da_su.id = da.shop_unit_id
       WHERE a.id = ?
       LIMIT 1`,
      [applicationId]
    )

    const application = rows[0]

    if (!application) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    if (!application.stall_number) {
      return NextResponse.json(
        { error: 'No booth/stall has been allotted to this application yet.' },
        { status: 400 }
      )
    }

    const html = allotmentLetterHtml(
      {
        applicationNumber: application.application_number,
        organisationName: application.organisation_name,
        representativeName: application.representative_name,
        fatherName: application.father_name,
        categoryName: application.category_name,
        categoryNameHi: application.category_name_hi,
        stallNumber: application.stall_number,
        mobileNumber: application.mobile_number,
        email: application.email,
        address: application.address,
        allotmentAmountPaise: application.allotment_amount_paise,
        allotmentPaidAt: application.allotment_paid_at,
        submittedAt: application.submitted_at
      },
      lang
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application.allotment_letter_downloaded',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId)
    })

    if (wantsHtml) {
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' }
      })
    }

    try {
      const buffer = await renderHtmlToPdf(html)

      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="allotment-order-${application.application_number}.pdf"`,
          'Cache-Control': 'private, no-store'
        }
      })
    } catch {
      // Fallback to HTML if headless Chromium fails on the host
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' }
      })
    }
  } catch (error) {
    logServerError('admin.allotment_letter.pdf', error)

    return NextResponse.json({ error: 'Unable to generate allotment letter.' }, { status: 500 })
  }
}
