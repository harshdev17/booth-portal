import { NextResponse } from 'next/server'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { query } from '@/lib/db/client'
import { renderHtmlToPdf } from '@/lib/pdf/browser'
import { receiptHtml } from '@/lib/pdf/templates'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

type ReceiptRow = {
  id: number
  application_number: string
  access_token_hash: string
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
 * Same data and ownership model as GET /api/applications/[id]/receipt
 * (bearer access token, same browser session) — this route renders that
 * same data straight to a downloadable PDF file instead of JSON, so the
 * applicant gets one click to an actual .pdf rather than having to use the
 * browser's own Print → Save as PDF dialog on the on-screen receipt.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('applications.receipt', ipAddress ?? 'unknown', RATE_LIMITS.statusLookup)) {
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

  const lang = new URL(request.url).searchParams.get('lang') === 'hi' ? 'hi' : 'en'

  try {
    const rows = await query<ReceiptRow[]>(
      `SELECT a.id, a.application_number, a.access_token_hash, a.organisation_name, a.representative_name,
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

    if (!application || !verifyAccessToken(accessToken, application.access_token_hash)) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
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
      lang
    )

    const buffer = await renderHtmlToPdf(html)

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Receipt-${application.application_number}.pdf"`,
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (error) {
    logServerError('api.applications.receipt.pdf', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
