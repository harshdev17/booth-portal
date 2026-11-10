import { NextResponse } from 'next/server'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { getCategoryById } from '@/lib/applications/categories'
import { query } from '@/lib/db/client'
import { parseIstDateTime } from '@/lib/format-date'
import { createRazorpayOrder, getRazorpayKeyId, RazorpayApiError } from '@/lib/payments/razorpay'
import { recordOrderCreated } from '@/lib/payments/payment-records'
import { hasRecentVerifiedOtp } from '@/lib/notifications/otp'
import { logAudit } from '@/lib/audit/log'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

type ApplicationRow = {
  id: number
  category_id: number
  access_token_hash: string
  status: string
  application_number: string
  mobile_number: string
}

/**
 * Creates (or re-creates, on retry) a Razorpay order for an application's
 * registration fee or allotment fee ('pay_now'). Ownership is proven with
 * the access token issued at submission, or a recent verified WhatsApp OTP
 * from the status lookup flow. The amount is always verified and read fresh
 * from the database — never accepted from the client.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ipAddress } = getRequestMeta(request)
  const rateLimitKey = ipAddress ?? 'unknown'

  if (isRateLimited('applications.payment.order', rateLimitKey, RATE_LIMITS.paymentOrder)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  const { id } = await params
  const applicationId = Number(id)

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: 'Invalid application.' }, { status: 400 })
  }

  const authHeader = request.headers.get('authorization')
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  let requestedPurpose: 'registration' | 'pay_now' | 'auction_fee' | 'auction_final' = 'registration'
  try {
    const rawBody = await request.text()
    if (rawBody) {
      const parsedBody = JSON.parse(rawBody)
      if (
        parsedBody?.purpose === 'pay_now' ||
        parsedBody?.purpose === 'auction_fee' ||
        parsedBody?.purpose === 'auction_final'
      ) {
        requestedPurpose = parsedBody.purpose
      }
    }
  } catch {
    // default to registration
  }

  try {
    const rows = await query<ApplicationRow[]>(
      `SELECT id, category_id, access_token_hash, status, application_number, mobile_number
       FROM applications WHERE id = ? LIMIT 1`,
      [applicationId]
    )

    const application = rows[0]

    if (!application) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const tokenValid = accessToken ? verifyAccessToken(accessToken, application.access_token_hash) : false
    const otpValid = !tokenValid && (await hasRecentVerifiedOtp(`+91${application.mobile_number}`, 'status_lookup', 30))

    if (!tokenValid && !otpValid) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    if (requestedPurpose === 'pay_now') {
      if (application.status !== 'payment_required') {
        return NextResponse.json(
          { error: `This application is "${application.status}" and does not require allotment payment.` },
          { status: 409 }
        )
      }

      const categoryRows = await query<Array<{
        name: string
        allotment_payment_enabled: number
        allotment_amount_paise: number | null
        allotment_payment_deadline_at: string | Date | null
      }>>(
        `SELECT name, allotment_payment_enabled, allotment_amount_paise, allotment_payment_deadline_at
         FROM categories WHERE id = ? LIMIT 1`,
        [application.category_id]
      )

      const category = categoryRows[0]

      // Check seeded payment record first (for direct allotments or pre-configured amounts)
      const existingPayments = await query<Array<{ amount_paise: number }>>(
        `SELECT amount_paise FROM payments WHERE application_id = ? AND purpose = 'pay_now' LIMIT 1`,
        [applicationId]
      )

      let amountPaise = existingPayments[0]?.amount_paise ? Number(existingPayments[0].amount_paise) : 0

      if (amountPaise <= 0) {
        if (!category || !category.allotment_payment_enabled || !category.allotment_amount_paise || category.allotment_amount_paise <= 0) {
          return NextResponse.json({ error: 'Allotment payment is not enabled for this category.' }, { status: 409 })
        }

        if (category.allotment_payment_deadline_at) {
          // allotment_payment_deadline_at is a plain DB DATETIME string
          // already representing IST wall-clock time — must go through
          // parseIstDateTime, not a bare `new Date(...)`, which parses it
          // in the server process's own local timezone and was confirmed
          // live to silently shift this deadline by 5.5 hours on a
          // UTC-timezone host (same root cause as isCategoryAcceptingApplications).
          const deadline = parseIstDateTime(category.allotment_payment_deadline_at)
          if (Date.now() > deadline.getTime()) {
            return NextResponse.json(
              { error: 'Allotment payment deadline has passed. Please contact the administration.' },
              { status: 410 }
            )
          }
        }

        amountPaise = Number(category.allotment_amount_paise)
      }

      const order = await createRazorpayOrder({
        amountPaise,
        receipt: `${application.application_number}-ALLOT`,
        notes: { applicationId: String(applicationId), purpose: 'pay_now' }
      })

      await recordOrderCreated({
        applicationId,
        purpose: 'pay_now',
        amountPaise,
        razorpayOrderId: order.id
      })

      await logAudit({
        actorUserId: null,
        actorRoleKey: null,
        action: 'payment.order_created',
        module: 'payments',
        entityType: 'application',
        entityId: String(applicationId),
        newValue: { razorpayOrderId: order.id, amountPaise, purpose: 'pay_now' },
        ipAddress
      })

      return NextResponse.json({
        orderId: order.id,
        amountPaise,
        currency: order.currency,
        keyId: getRazorpayKeyId(),
        applicationNumber: application.application_number,
        categoryName: category?.name ?? 'Stall Allotment',
        purpose: 'pay_now'
      })
    }

    // Auction Payment Flow (migration 0077) — categories with
    // selection_method = 'auction' (currently only Refreshment) skip the
    // normal pay_now path above entirely (draw-service.ts sends them to
    // 'selected_for_auction' instead of 'payment_required'). Two distinct
    // payments here: a fixed-per-category participation fee first, then a
    // variable per-person final amount after the physical auction.
    if (requestedPurpose === 'auction_fee') {
      if (application.status !== 'selected_for_auction') {
        return NextResponse.json(
          { error: `This application is "${application.status}" and does not require an auction participation fee payment.` },
          { status: 409 }
        )
      }

      const categoryRows = await query<Array<{ name: string; auction_participation_fee_paise: number | null }>>(
        `SELECT name, auction_participation_fee_paise FROM categories WHERE id = ? LIMIT 1`,
        [application.category_id]
      )

      const category = categoryRows[0]

      if (!category || !category.auction_participation_fee_paise || category.auction_participation_fee_paise <= 0) {
        return NextResponse.json(
          { error: 'Auction participation fee is not configured for this category yet. Please contact the administration.' },
          { status: 409 }
        )
      }

      const amountPaise = Number(category.auction_participation_fee_paise)

      const order = await createRazorpayOrder({
        amountPaise,
        receipt: `${application.application_number}-AUCFEE`,
        notes: { applicationId: String(applicationId), purpose: 'auction_fee' }
      })

      await recordOrderCreated({
        applicationId,
        purpose: 'auction_fee',
        amountPaise,
        razorpayOrderId: order.id
      })

      await logAudit({
        actorUserId: null,
        actorRoleKey: null,
        action: 'payment.order_created',
        module: 'payments',
        entityType: 'application',
        entityId: String(applicationId),
        newValue: { razorpayOrderId: order.id, amountPaise, purpose: 'auction_fee' },
        ipAddress
      })

      return NextResponse.json({
        orderId: order.id,
        amountPaise,
        currency: order.currency,
        keyId: getRazorpayKeyId(),
        applicationNumber: application.application_number,
        categoryName: category.name,
        purpose: 'auction_fee'
      })
    }

    if (requestedPurpose === 'auction_final') {
      if (application.status !== 'auction_won') {
        return NextResponse.json(
          { error: `This application is "${application.status}" and does not require a final auction payment.` },
          { status: 409 }
        )
      }

      // Amount is NEVER computed here — it is the exact figure the admin
      // supplied in the Auction Results CSV upload (varies per applicant,
      // decided at the physical auction), already seeded into this
      // application's 'auction_final' payments row by that upload
      // (src/app/api/admin/applications/auction-results/route.ts). Same
      // "read the pre-seeded amount, never recompute it" pattern pay_now
      // already uses above for direct-allotment candidates.
      const existingPayments = await query<Array<{ amount_paise: number }>>(
        `SELECT amount_paise FROM payments WHERE application_id = ? AND purpose = 'auction_final' LIMIT 1`,
        [applicationId]
      )

      const amountPaise = existingPayments[0]?.amount_paise ? Number(existingPayments[0].amount_paise) : 0

      if (amountPaise <= 0) {
        return NextResponse.json(
          { error: 'Your final auction amount has not been recorded yet. Please contact the administration.' },
          { status: 409 }
        )
      }

      const categoryRows = await query<Array<{ name: string }>>(`SELECT name FROM categories WHERE id = ? LIMIT 1`, [
        application.category_id
      ])

      const order = await createRazorpayOrder({
        amountPaise,
        receipt: `${application.application_number}-AUCFINAL`,
        notes: { applicationId: String(applicationId), purpose: 'auction_final' }
      })

      await recordOrderCreated({
        applicationId,
        purpose: 'auction_final',
        amountPaise,
        razorpayOrderId: order.id
      })

      await logAudit({
        actorUserId: null,
        actorRoleKey: null,
        action: 'payment.order_created',
        module: 'payments',
        entityType: 'application',
        entityId: String(applicationId),
        newValue: { razorpayOrderId: order.id, amountPaise, purpose: 'auction_final' },
        ipAddress
      })

      return NextResponse.json({
        orderId: order.id,
        amountPaise,
        currency: order.currency,
        keyId: getRazorpayKeyId(),
        applicationNumber: application.application_number,
        categoryName: categoryRows[0]?.name ?? 'Stall Allotment',
        purpose: 'auction_final'
      })
    }

    // Default: registration fee payment
    if (application.status !== 'payment_pending' && application.status !== 'payment_failed') {
      return NextResponse.json(
        { error: `This application is "${application.status}" and is not awaiting payment.` },
        { status: 409 }
      )
    }

    const category = await getCategoryById(application.category_id)

    if (!category || category.fee_paise === null) {
      return NextResponse.json({ error: 'No fee is configured for this category yet.' }, { status: 409 })
    }

    const order = await createRazorpayOrder({
      amountPaise: category.fee_paise,
      receipt: application.application_number,
      notes: { applicationId: String(applicationId), purpose: 'registration' }
    })

    await recordOrderCreated({
      applicationId,
      purpose: 'registration',
      amountPaise: category.fee_paise,
      razorpayOrderId: order.id
    })

    await logAudit({
      actorUserId: null,
      actorRoleKey: null,
      action: 'payment.order_created',
      module: 'payments',
      entityType: 'application',
      entityId: String(applicationId),
      newValue: { razorpayOrderId: order.id, amountPaise: category.fee_paise, purpose: 'registration' },
      ipAddress
    })

    return NextResponse.json({
      orderId: order.id,
      amountPaise: category.fee_paise,
      currency: order.currency,
      keyId: getRazorpayKeyId(),
      applicationNumber: application.application_number,
      categoryName: category.name,
      purpose: 'registration'
    })
  } catch (error) {
    if (error instanceof RazorpayApiError) {
      logServerError('api.applications.payment.order', error, { applicationId })

      return NextResponse.json({ error: 'Could not start the payment. Please try again shortly.' }, { status: 502 })
    }

    logServerError('api.applications.payment.order', error, { applicationId })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
