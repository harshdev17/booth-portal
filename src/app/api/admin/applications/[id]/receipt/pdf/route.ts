import { NextResponse } from 'next/server'

import { query } from '@/lib/db/client'
import { logAudit } from '@/lib/audit/log'
import { renderHtmlToPdf } from '@/lib/pdf/browser'
import { receiptHtml } from '@/lib/pdf/templates'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

type ReceiptRow = {
  id: number
  application_number: string
  organisation_name: string
  representative_name: string
  category_name: string
  category_name_hi: string | null
  payment_id: number | null
  amount_paise: number | null
  payment_status: string | null
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  paid_at: string | null
}

/**
 * Admin-side counterpart to GET /api/applications/[id]/receipt/pdf — same
 * data and PDF, but authorized by the admin's own session/RBAC
 * (application:view, the same permission that gates seeing this
 * application at all) instead of the applicant's bearer access token. Lets
 * an admin pull a copy of the receipt without needing the applicant's
 * token, e.g. while handling a support query.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('application:view')

  const { id } = await params
  const applicationId = decodeId(id)

  if (applicationId === null) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  try {
    const rows = await query<ReceiptRow[]>(
      `SELECT a.id, a.application_number, a.organisation_name, a.representative_name,
              c.name AS category_name, c.name_hi AS category_name_hi,
              p.id AS payment_id, p.amount_paise, p.status AS payment_status,
              p.razorpay_order_id,
              (SELECT pt.razorpay_payment_id FROM payment_transactions pt
                WHERE pt.payment_id = p.id AND pt.razorpay_payment_id IS NOT NULL
                ORDER BY pt.created_at DESC LIMIT 1) AS razorpay_payment_id,
              (SELECT pt.created_at FROM payment_transactions pt
                WHERE pt.payment_id = p.id AND pt.type IN ('checkout_success', 'webhook_confirmed')
                ORDER BY pt.created_at DESC LIMIT 1) AS paid_at
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN payments p ON p.application_id = a.id AND p.purpose = 'registration'
       WHERE a.id = ?
       LIMIT 1`,
      [applicationId]
    )

    const application = rows[0]

    if (!application) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    if (!application.payment_id || application.payment_status !== 'success') {
      return NextResponse.json({ error: 'No successful payment found for this application yet.' }, { status: 404 })
    }

    const html = receiptHtml(
      {
        applicationNumber: application.application_number,
        organisationName: application.organisation_name,
        representativeName: application.representative_name,
        categoryName: application.category_name,
        categoryNameHi: application.category_name_hi,
        amountPaise: application.amount_paise,
        razorpayOrderId: application.razorpay_order_id,
        razorpayPaymentId: application.razorpay_payment_id,
        paidAt: application.paid_at
      },
      'en'
    )

    const buffer = await renderHtmlToPdf(html)

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application.receipt_downloaded',
      module: 'applications',
      entityType: 'application',
      entityId: String(applicationId)
    })

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Receipt-${application.application_number}.pdf"`,
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (error) {
    logServerError('api.admin.applications.receipt.pdf', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
