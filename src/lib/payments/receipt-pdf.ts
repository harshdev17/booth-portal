import 'server-only'

import { query } from '@/lib/db/client'
import { renderHtmlToPdf } from '@/lib/pdf/browser'
import { receiptHtml } from '@/lib/pdf/templates'

export type ReceiptRow = {
  id: number
  application_number: string
  access_token_hash: string
  mobile_number: string
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

/** Loads the registration-fee payment + application fields a receipt needs. `where` must be a fixed, caller-controlled fragment (never user input). */
export async function findReceiptRow(where: 'a.id = ?' | 'a.application_number = ?', value: number | string) {
  const rows = await query<ReceiptRow[]>(
    `SELECT a.id, a.application_number, a.access_token_hash, a.mobile_number, a.organisation_name, a.representative_name,
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
     WHERE ${where}
     LIMIT 1`,
    [value]
  )

  return rows[0] ?? null
}

export async function renderReceiptPdfResponse(row: ReceiptRow, lang: 'en' | 'hi'): Promise<Response> {
  const html = receiptHtml(
    {
      applicationNumber: row.application_number,
      organisationName: row.organisation_name,
      representativeName: row.representative_name,
      categoryName: row.category_name,
      categoryNameHi: row.category_name_hi,
      amountPaise: row.amount_paise,
      razorpayOrderId: row.razorpay_order_id,
      razorpayPaymentId: row.razorpay_payment_id,
      paidAt: row.paid_at
    },
    lang
  )

  const buffer = await renderHtmlToPdf(html)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Receipt-${row.application_number}.pdf"`,
      'Cache-Control': 'private, no-store'
    }
  })
}
