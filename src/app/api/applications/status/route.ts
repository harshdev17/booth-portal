import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { generateAccessToken, hashAccessToken } from '@/lib/applications/access-token'
import { query } from '@/lib/db/client'
import { requestOtp, verifyOtp } from '@/lib/notifications/otp'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'
import { getNotificationSettings } from '@/lib/settings/notification-settings'

const statusLookupSchema = z.object({
  applicationNumber: z
    .string()
    .trim()
    .min(1)
    .max(32)

    // Accepts both the current "IGM-" prefix and the earlier "KDB-" prefix,
    // so applications created before that naming change remain lookupable.
    .regex(/^(?:IGM|KDB)-\d{4}-\d{6}$/, 'Enter a valid application number'),

  // Present only on the second call, once the applicant has the WhatsApp code.
  otpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .optional()
})

type StatusRow = {
  id: number
  status: string
  mobile_number: string
  representative_name: string
  category_name: string
  category_name_hi: string | null
  category_slug: string
  fee_paise: number | null
  fee_base_paise: number | null
  gst_percent: number | string | null
  allotment_payment_enabled: number
  allotment_amount_paise: number | null
  allotment_payment_deadline_at: string | Date | null
  submitted_at: string | null
  stall_number: string | null
  allotment_payment_status: string | null
  allotment_payment_amount_paise: number | null
  allotment_razorpay_order_id: string | null
  allotment_paid_at: string | null
}

function maskMobile(mobile: string): string {
  return `XXXXXX${mobile.slice(-4)}`
}

/**
 * Public status lookup by application number + WhatsApp OTP.
 * When accessed by an authenticated staff/admin session, OTP is bypassed so admins
 * can view anyone's status & download allotment letters directly.
 */
export async function POST(request: Request) {
  const { ipAddress } = getRequestMeta(request)
  const rateLimitKey = ipAddress ?? 'unknown'

  const session = await getSession().catch(() => null)
  const isAdmin = Boolean(session?.userId)

  if (!isAdmin && isRateLimited('applications.status', rateLimitKey, RATE_LIMITS.statusLookup)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = statusLookupSchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid application number.' }, { status: 400 })
  }

  try {
    const rows = await query<StatusRow[]>(
      `SELECT a.id, a.status, a.mobile_number, a.representative_name,
              c.name AS category_name, c.name_hi AS category_name_hi, c.slug AS category_slug,
              c.fee_paise, c.fee_base_paise, c.gst_percent,
              c.allotment_payment_enabled, c.allotment_amount_paise, c.allotment_payment_deadline_at,
              a.submitted_at,
              COALESCE(su.stall_number, da_su.stall_number) AS stall_number,
              COALESCE(allotment_payment.status, da.payment_status) AS allotment_payment_status,
              COALESCE(allotment_payment.amount_paise, da.payment_amount_paise) AS allotment_payment_amount_paise,
              allotment_payment.razorpay_order_id AS allotment_razorpay_order_id,
              (SELECT pt.created_at FROM payment_transactions pt
                WHERE pt.payment_id = allotment_payment.id AND pt.type IN ('checkout_success', 'webhook_confirmed')
                ORDER BY pt.created_at DESC LIMIT 1) AS allotment_paid_at
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
       LEFT JOIN payments allotment_payment
         ON allotment_payment.application_id = a.id AND allotment_payment.purpose = 'pay_now'
       LEFT JOIN direct_allotments da ON da.application_id = a.id AND da.status = 'active'
       LEFT JOIN shop_units da_su ON da_su.id = da.shop_unit_id
       WHERE a.application_number = ? AND a.status != 'draft'
       LIMIT 1`,
      [parsed.data.applicationNumber]
    )

    const application = rows[0]

    // Same generic message whether the application doesn't exist or is still
    // a draft (never submitted) — no enumeration oracle either way.
    if (!application) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    const mobileWithCountryCode = `+91${application.mobile_number}`

    // Phase 1: If not admin and no OTP code yet — send one and stop. Never reveal status here.
    if (!isAdmin && !parsed.data.otpCode) {
      if (isRateLimited('otp.request.mobile', application.mobile_number, RATE_LIMITS.otpRequest)) {
        return NextResponse.json(
          { error: 'Too many verification codes requested for this application. Please try again later.' },
          { status: 429 }
        )
      }

      const sent = await requestOtp({
        mobileNumber: mobileWithCountryCode,
        purpose: 'status_lookup',
        applicationId: application.id,
        ipAddress
      })

      if (!sent.ok) {
        return NextResponse.json({ error: sent.error }, { status: 502 })
      }

      const { whatsappEnabled } = await getNotificationSettings()

      return NextResponse.json({
        otpRequired: true,
        maskedMobile: maskMobile(application.mobile_number),
        whatsappEnabled
      })
    }

    // Phase 2: verify the code before releasing any status/document data (unless authenticated admin).
    if (!isAdmin) {
      if (!parsed.data.otpCode) {
        return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 })
      }

      if (isRateLimited('otp.verify.mobile', application.mobile_number, RATE_LIMITS.otpVerify)) {
        return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
      }

      const verification = await verifyOtp({
        mobileNumber: mobileWithCountryCode,
        purpose: 'status_lookup',
        code: parsed.data.otpCode
      })

      if (!verification.ok) {
        return NextResponse.json({ error: verification.error }, { status: 400 })
      }
    }

    // Issue a fresh access token for authenticated follow-up operations (document re-uploads, fee payments)
    const freshAccessToken = generateAccessToken()
    await query(`UPDATE applications SET access_token_hash = ? WHERE id = ?`, [
      hashAccessToken(freshAccessToken),
      application.id
    ])

    const documents = await query<
      Array<{
        documentKey: string
        label: string
        labelHi: string | null
        verificationStatus: string
        verificationRemarks: string | null
        originalFilename: string | null
      }>
    >(
      `SELECT cdd.document_key AS documentKey, cdd.label, cdd.label_hi AS labelHi, ad.verification_status AS verificationStatus,
              ad.verification_remarks AS verificationRemarks, ad.original_filename AS originalFilename
       FROM category_document_definitions cdd
       LEFT JOIN application_documents ad
         ON ad.document_definition_id = cdd.id AND ad.application_id = ?
       WHERE cdd.category_id = (SELECT category_id FROM applications WHERE id = ?)
       ORDER BY cdd.display_order ASC`,
      [application.id, application.id]
    )

    return NextResponse.json({
      applicationId: application.id,
      accessToken: freshAccessToken,
      status: application.status,
      stallNumber: application.stall_number ?? null,
      allotmentPaymentEnabled: Boolean(application.allotment_payment_enabled),
      allotmentAmountPaise: application.allotment_payment_amount_paise ?? application.allotment_amount_paise ?? null,
      allotmentPaymentDeadlineAt: application.allotment_payment_deadline_at ?? null,
      allotmentPaymentStatus: application.allotment_payment_status ?? null,
      allotmentPaidAt: application.allotment_paid_at ?? null,
      categoryName: application.category_name,
      categoryNameHi: application.category_name_hi,
      categorySlug: application.category_slug,
      feePaise: application.fee_paise,
      feeBasePaise: application.fee_base_paise,
      gstPercent: application.gst_percent ? Number(application.gst_percent) : null,
      submittedAt: application.submitted_at,
      documents
    })
  } catch (error) {
    logServerError('api.applications.status', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
