import 'server-only'

import { query } from '@/lib/db/client'
import { renderHtmlToPdf } from '@/lib/pdf/browser'
import { allotmentLetterHtml } from '@/lib/pdf/templates'

export type AllotmentLetterRow = {
  id: number
  application_number: string
  access_token_hash: string
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
  stall_direction: string | null
  allotment_amount_paise: number | null
  allotment_payment_status: string | null
  allotment_paid_at: string | null
}

/**
 * Single source of truth for the allotment letter's data, shared by both the
 * admin PDF route and the applicant-facing one, so the two can never drift
 * into showing different fields/content for the same stall.
 * `where` must be a fixed, caller-controlled fragment (never user input).
 */
export async function findAllotmentLetterRow(where: 'a.id = ?' | 'a.application_number = ?', value: number | string) {
  const rows = await query<AllotmentLetterRow[]>(
    `SELECT a.id, a.application_number, a.access_token_hash, a.organisation_name, a.representative_name, a.father_name,
            a.mobile_number, a.email, a.address, a.submitted_at, a.status,
            c.name AS category_name, c.name_hi AS category_name_hi,
            COALESCE(su.stall_number, da_su.stall_number) AS stall_number,
            COALESCE(su.direction, da_su.direction) AS stall_direction,
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
     WHERE ${where}
     LIMIT 1`,
    [value]
  )

  return rows[0] ?? null
}

export async function renderAllotmentLetterPdfResponse(row: AllotmentLetterRow, lang: 'en' | 'hi'): Promise<Response> {
  const html = allotmentLetterHtml(
    {
      applicationNumber: row.application_number,
      organisationName: row.organisation_name,
      representativeName: row.representative_name,
      fatherName: row.father_name,
      categoryName: row.category_name,
      categoryNameHi: row.category_name_hi,
      stallNumber: row.stall_number as string,
      stallDirection: row.stall_direction,
      mobileNumber: row.mobile_number,
      email: row.email,
      address: row.address,
      allotmentAmountPaise: row.allotment_amount_paise,
      allotmentPaidAt: row.allotment_paid_at,
      submittedAt: row.submitted_at
    },
    lang
  )

  try {
    const buffer = await renderHtmlToPdf(html)

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="allotment-order-${row.application_number}.pdf"`,
        'Cache-Control': 'private, no-store'
      }
    })
  } catch {
    // Fallback to HTML if headless Chromium fails on the host
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' }
    })
  }
}
